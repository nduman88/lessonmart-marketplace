import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, requireSupabase, supabase } from '@/lib/supabase';

export type LessonMartProfile = {
  id: string;
  email: string;
  display_name: string;
  role: 'seller' | 'admin';
};

type AuthState = {
  user: User | null;
  profile: LessonMartProfile | null;
  loading: boolean;
  profileLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<LessonMartProfile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setLoading(false);
    }).catch((sessionError: unknown) => {
      if (!active) return;
      setError(friendlyError(sessionError));
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProfile(null);
      setError(null);
      setLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const userId = session?.user.id;
    if (!userId || !supabase) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    void (async () => {
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id,email,display_name,role')
          .eq('id', userId)
          .maybeSingle();
        if (!active) return;
        setProfile(data as LessonMartProfile | null);
        setError(profileError?.message ?? null);
        setProfileLoading(false);
      } catch (profileError) {
        if (!active) return;
        setProfile(null);
        setError(friendlyError(profileError));
        setProfileLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session?.user.id]);

  const value = useMemo<AuthState>(() => ({
    user: session?.user ?? null,
    profile,
    loading,
    profileLoading,
    error,
    signIn: async (email, password) => {
      const { error: signInError } = await requireSupabase().auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    },
    signUp: async (email, password, displayName) => {
      const { data, error: signUpError } = await requireSupabase().auth.signUp({
        email,
        password,
        options: { data: { full_name: displayName } },
      });
      if (signUpError) throw signUpError;
      return Boolean(data.session);
    },
    signOut: async () => {
      const { error: signOutError } = await requireSupabase().auth.signOut();
      if (signOutError) throw signOutError;
    },
  }), [session, profile, loading, profileLoading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
