import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ClipboardList,
  Clock3,
  CreditCard,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PackageOpen,
  PenLine,
  Plus,
  Search,
  Share2,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  activateSellerAccount,
  createPendingOrder,
  createPayoutRequest,
  createSellerProduct,
  getAdminDashboard,
  getSellerDashboard,
  listMarketplaceProducts,
  listPendingPayouts,
  listPendingProducts,
  listProfilesForAdmin,
  setPayoutStatus,
  setProductReviewStatus,
  type ProductRecord,
  type SellerProductInput,
} from '@/lib/supabase-marketplace';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const BUSINESS_NAME = 'LessonMart by Moses Nduka';
const OWNER_NAME = 'Moses Nduka';
const SUPPORT_WHATSAPP = '2348136377571';
const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_WHATSAPP}?text=Hello%20LessonMart%20Support`;
const SUPPORT_EMAIL = 'ndukamoses@gmail.com';
const ADMIN_EMAIL = SUPPORT_EMAIL;
const featuredSeller = { name: OWNER_NAME, role: 'Founder', badge: 'Verified Owner', initials: 'MN' };
const naira = (value: number) => `₦${value.toLocaleString('en-NG')}`;
const compact = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : value.toLocaleString();

function useNotice() {
  const [notice, setNotice] = useState('');
  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3600);
  };
  return { notice, notify };
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm">
        <BookOpen size={20} strokeWidth={2.4} />
      </span>
      <span className="font-display text-xl font-bold tracking-tight">lesson<span className="text-[hsl(var(--accent))]">mart</span></span>
    </Link>
  );
}

function Shell({ children, cartCount, onCart }: { children: ReactNode; cartCount: number; onCart: () => void }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const onMarketplace = location === '/' || location === '/marketplace';
  return (
    <div className="noise app-shell">
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.9)] backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <Brand />
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex" aria-label="Primary navigation">
            <Link href="/" className={onMarketplace ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]'} data-testid="link-marketplace">Marketplace</Link>
            <Link href="/seller" className={location === '/seller' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]'} data-testid="link-sell">Sell on LessonMart</Link>
            <Link href="/admin" className={location === '/admin' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]'} data-testid="link-admin">Admin</Link>
            <Link href="/contact" className={location === '/contact' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]'} data-testid="link-contact">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-semibold text-[hsl(var(--secondary-foreground))] lg:flex" title={isSupabaseConfigured ? 'Supabase credentials configured' : 'Supabase not configured'}>
              <span className={`h-2 w-2 rounded-full ${isSupabaseConfigured ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--accent))]'}`} />
              Lagos · NGN
            </span>
            <Link href="/account" className="hidden rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold md:inline-flex" data-testid="link-account">{user?.email ?? 'Sign in'}</Link>
            {onMarketplace && <button onClick={onCart} className="relative grid h-10 w-10 place-items-center rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary))]" data-testid="button-open-cart" aria-label="Open cart">
              <ShoppingBag size={18} />
              {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[hsl(var(--accent))] px-1 text-[10px] font-extrabold text-[hsl(var(--accent-foreground))]" data-testid="text-cart-count">{cartCount}</span>}
            </button>}
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-[hsl(var(--border))] md:hidden" onClick={() => setMenuOpen((value) => !value)} data-testid="button-toggle-menu" aria-label="Toggle navigation">
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {menuOpen && <nav className="border-t border-[hsl(var(--border))] px-5 py-4 md:hidden">
          <div className="flex flex-col gap-4 text-sm font-semibold">
            <Link href="/" onClick={() => setMenuOpen(false)} data-testid="link-mobile-marketplace">Marketplace</Link>
            <Link href="/seller" onClick={() => setMenuOpen(false)} data-testid="link-mobile-sell">Sell on LessonMart</Link>
            <Link href="/admin" onClick={() => setMenuOpen(false)} data-testid="link-mobile-admin">Admin</Link>
            <Link href="/contact" onClick={() => setMenuOpen(false)} data-testid="link-mobile-contact">Contact</Link>
            <Link href="/account" onClick={() => setMenuOpen(false)} data-testid="link-mobile-account">{user?.email ?? 'Sign in'}</Link>
          </div>
        </nav>}
      </header>
      {children}
      <Footer />
      <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label="Chat with LessonMart Support on WhatsApp" className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-extrabold text-white shadow-xl transition hover:scale-[1.03] hover:brightness-105" data-testid="link-floating-whatsapp">
        <MessageCircle size={19} /> <span className="hidden sm:inline">WhatsApp support</span>
      </a>
    </div>
  );
}

function Footer() {
  return <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
    <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-10 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
      <div>
        <p className="font-display text-xl font-bold">{BUSINESS_NAME}</p>
        <p className="mt-3 max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">A trusted Nigerian marketplace for teacher-made lesson notes, exam preparation and classroom resources.</p>
        <p className="mt-5 text-sm font-semibold">Owned by {OWNER_NAME} | WhatsApp: <a className="text-[hsl(var(--primary))] hover:underline" href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer">08136377571</a> | Email: <a className="text-[hsl(var(--primary))] hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> | Lagos, Nigeria</p>
      </div>
      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:justify-end sm:gap-6 lg:items-start">
        <Link href="/" className="font-bold hover:text-[hsl(var(--primary))]">Marketplace</Link>
        <Link href="/seller" className="font-bold hover:text-[hsl(var(--primary))]">Sell on LessonMart</Link>
        <Link href="/contact" className="font-bold hover:text-[hsl(var(--primary))]">Contact support</Link>
      </div>
    </div>
  </footer>;
}

function Notice({ message }: { message: string }) {
  if (!message) return null;
  return <div className="fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-[hsl(var(--foreground))] px-5 py-3 text-sm font-semibold text-[hsl(var(--background))] shadow-xl fade-up" role="status" data-testid="status-notice">
    <Check size={17} className="text-[hsl(var(--accent))]" /> {message}
  </div>;
}

function Cover({ product, large = false }: { product: ProductRecord; large?: boolean }) {
  return <div className={`relative overflow-hidden ${large ? 'h-64 sm:h-80' : 'h-52'} rounded-[calc(var(--radius)-.2rem)]`} style={{ backgroundColor: product.coverColor }}>
    {product.previewUrl && <img src={product.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
    <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 74% 20%, #fff 0, transparent 26%), linear-gradient(125deg, transparent 42%, rgba(255,255,255,.28) 42%, transparent 61%)' }} />
    <div className="absolute left-5 top-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-white/80"><FileText size={14} /> LessonMart file</div>
    <div className={`absolute bottom-4 left-5 font-display font-bold leading-none tracking-tight text-white ${large ? 'text-5xl' : 'text-4xl'}`}>{product.coverLabel}</div>
  </div>;
}

function ProductCard({ product, onOpen, onAdd, added }: { product: ProductRecord; onOpen: (product: ProductRecord) => void; onAdd: (product: ProductRecord) => void; added: boolean }) {
  return <article className="lift group rounded-[1.15rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5 shadow-[var(--shadow-sm)]" data-testid={`card-product-${product.id}`}>
    <button className="block w-full text-left" onClick={() => onOpen(product)} data-testid={`button-view-product-${product.id}`}>
      <Cover product={product} />
      <div className="px-2 pb-1 pt-4">
        <p className="mb-2 text-xs text-[hsl(var(--muted-foreground))]">{product.subject} · {product.gradeLevel}</p>
        <h3 className="font-display text-[1.1rem] font-bold leading-snug group-hover:text-[hsl(var(--primary))]">{product.title}</h3>
        <div className="mt-4 flex items-end justify-between gap-2">
          <span className="font-display text-xl font-bold">{naira(product.price)}</span>
          <span className="truncate text-xs text-[hsl(var(--muted-foreground))]">By {product.seller.name}</span>
        </div>
      </div>
    </button>
    <button onClick={() => onAdd(product)} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${added ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110'}`} data-testid={`button-add-product-${product.id}`}>
      {added ? <><Check size={16} /> Added to bag</> : <><Plus size={16} /> Add to bag</>}
    </button>
  </article>;
}

function ProductModal({ product, onClose, onAdd, added }: { product: ProductRecord | null; onClose: () => void; onAdd: (product: ProductRecord) => void; added: boolean }) {
  if (!product) return null;
  const detail = product;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.55)] p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} data-testid="dialog-product-detail">
    <div className="max-h-[92dvh] w-full max-w-4xl overflow-auto rounded-t-[1.5rem] bg-[hsl(var(--card))] shadow-2xl sm:rounded-[1.5rem]">
      <div className="grid md:grid-cols-[.85fr_1.15fr]">
        <div className="p-4 sm:p-6"><Cover product={detail} large /></div>
        <div className="relative p-6 sm:p-10">
          <button className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))]" onClick={onClose} aria-label="Close product details" data-testid="button-close-product"><X size={17} /></button>
          <span className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">{detail.subject}</span>
          <h2 id="product-modal-title" className="mt-3 max-w-lg font-display text-3xl font-bold leading-tight sm:text-4xl">{detail.title}</h2>
          <p className="mt-7 leading-7 text-[hsl(var(--muted-foreground))]">{detail.description}</p>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[hsl(var(--secondary))] p-4"><span className="block text-xs text-[hsl(var(--muted-foreground))]">Resource</span><strong className="mt-1 block">{detail.fileUrl ? 'PDF download' : 'Resource file pending'}</strong></div>
            <div className="rounded-xl bg-[hsl(var(--secondary))] p-4"><span className="block text-xs text-[hsl(var(--muted-foreground))]">Grade level</span><strong className="mt-1 block">{detail.gradeLevel}</strong></div>
          </div>
          <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-[hsl(var(--border))] pt-6">
            <span className="font-display text-3xl font-bold">{naira(detail.price)}</span>
            <button onClick={() => onAdd(detail)} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:brightness-110" data-testid="button-modal-add">
              {added ? <><Check size={17} /> In your bag</> : <><ShoppingBag size={17} /> Add to bag</>}
            </button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm"><span className="grid h-9 w-9 place-items-center rounded-full bg-[hsl(var(--accent))] text-xs font-extrabold text-[hsl(var(--accent-foreground))]">{detail.seller.initials}</span><span>By <strong>{detail.seller.name}</strong></span></div>
        </div>
      </div>
    </div>
  </div>;
}

function CheckoutModal({ product, buyerEmail, onClose, onComplete, loading }: { product: ProductRecord | null; buyerEmail: string; onClose: () => void; onComplete: () => void; loading: boolean }) {
  if (!product) return null;
  const submit = (event: FormEvent) => { event.preventDefault(); onComplete(); };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.55)] p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="checkout-title" data-testid="dialog-checkout">
    <div className="w-full max-w-lg rounded-t-[1.5rem] bg-[hsl(var(--card))] p-6 shadow-2xl sm:rounded-[1.5rem] sm:p-9">
      <div className="flex items-start justify-between"><div><span className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Secure handoff</span><h2 id="checkout-title" className="mt-2 font-display text-3xl font-bold">One step from ready.</h2></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-[hsl(var(--border))]" aria-label="Close checkout" data-testid="button-close-checkout"><X size={17} /></button></div>
      <div className="mt-7 flex items-center gap-4 rounded-xl bg-[hsl(var(--secondary))] p-3"><div className="h-14 w-14 rounded-lg" style={{ backgroundColor: product.coverColor }} /><div className="min-w-0"><p className="truncate font-semibold">{product.title}</p><p className="mt-1 font-mono text-sm">{naira(product.price)}</p></div></div>
      <form onSubmit={submit} className="mt-7 space-y-5"><div className="rounded-xl bg-[hsl(var(--secondary))] p-4 text-sm"><span className="block text-xs text-[hsl(var(--muted-foreground))]">Order account</span><strong className="mt-1 block break-all">{buyerEmail || 'Sign in to create an order'}</strong></div><div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-4 text-sm text-[hsl(var(--muted-foreground))]"><CreditCard size={17} className="mb-2 text-[hsl(var(--primary))]" /> This will create a real pending order under your account. Paystack is not connected yet, so no charge or paid download will be issued. Need help? <a className="font-bold text-[hsl(var(--primary))] hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or <a className="font-bold text-[hsl(var(--primary))] hover:underline" href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp support</a>.</div><button disabled={loading || (!buyerEmail && isSupabaseConfigured)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--accent))] py-3.5 font-extrabold text-[hsl(var(--accent-foreground))] hover:brightness-105 disabled:opacity-60" data-testid="button-pay-now">{loading ? <><LoaderCircle size={17} className="spin" /> Creating order...</> : <>Create pending order <ArrowRight size={17} /></>}</button></form>
    </div>
  </div>;
}

function CartSheet({ product, onClose, onCheckout, onRemove }: { product: ProductRecord | null; onClose: () => void; onCheckout: (product: ProductRecord) => void; onRemove: () => void }) {
  if (!product) return null;
  return <div className="fixed inset-0 z-40 bg-[hsl(var(--foreground)/.4)]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} data-testid="dialog-cart">
    <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[hsl(var(--card))] p-6 shadow-2xl fade-up">
      <div className="flex items-center justify-between"><div><span className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Your bag</span><h2 className="mt-1 font-display text-2xl font-bold">Ready when you are.</h2></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-[hsl(var(--border))]" aria-label="Close bag" data-testid="button-close-cart"><X size={17} /></button></div>
      <div className="mt-8 flex-1"><div className="flex gap-4 border-b border-[hsl(var(--border))] pb-5"><div className="h-20 w-20 shrink-0 rounded-xl" style={{ backgroundColor: product.coverColor }} /><div className="min-w-0 flex-1"><p className="font-semibold leading-snug">{product.title}</p><p className="mt-2 font-mono text-sm">{naira(product.price)}</p><button onClick={onRemove} className="mt-2 text-xs font-bold text-[hsl(var(--destructive))]" data-testid="button-remove-cart">Remove</button></div></div></div>
       <div className="border-t border-[hsl(var(--border))] pt-5"><div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Total</span><strong className="font-display text-2xl">{naira(product.price)}</strong></div><button onClick={() => onCheckout(product)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-3.5 font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-checkout">Checkout <ArrowRight size={17} /></button><p className="mt-3 text-center text-xs text-[hsl(var(--muted-foreground))]">Paystack checkout is not connected yet, so this order will remain unpaid. Need help? <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" className="font-bold text-[hsl(var(--primary))] hover:underline">WhatsApp support</a>.</p></div>
    </aside>
  </div>;
}

function Marketplace() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const productsQuery = useQuery({ queryKey: ['supabase', 'marketplace-products'], queryFn: listMarketplaceProducts, enabled: isSupabaseConfigured, retry: false });
  const products = productsQuery.data ?? [];
  const subjects = useMemo(() => [...new Set(products.map((product) => product.subject).filter(Boolean))].sort(), [products]);
  const sellerCount = new Set(products.map((product) => product.sellerId)).size;
  const statsReady = isSupabaseConfigured && !productsQuery.isLoading && !productsQuery.isError;
  const publicStats = [
    ['Live resources', statsReady ? compact(products.length) : '—'],
    ['Listed sellers', statsReady ? compact(sellerCount) : '—'],
    ['Subjects', statsReady ? compact(subjects.length) : '—'],
    ['Currency', 'NGN'],
  ];
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All subjects');
  const [selected, setSelected] = useState<ProductRecord | null>(null);
  const [cart, setCart] = useState<ProductRecord | null>(null);
  const [checkout, setCheckout] = useState<ProductRecord | null>(null);
  const { notice, notify } = useNotice();
  const order = useMutation({ mutationFn: createPendingOrder });
  const filtered = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.title} ${product.subject} ${product.gradeLevel}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (subject === 'All subjects' || product.subject === subject);
  }), [products, search, subject]);
  const addToCart = (product: ProductRecord) => { setCart(product); notify(`${product.title} added to your bag`); };
  const completeOrder = () => {
    if (!checkout) return;
    if (!user) {
      setCheckout(null);
      setLocation('/account');
      notify('Sign in to create an order under your account.');
      return;
    }
    if (!isSupabaseConfigured) {
      notify('Supabase is required to create an order.');
      return;
    }
    order.mutate(checkout.id, {
      onSuccess: () => {
        setCheckout(null);
        setCart(null);
        notify('Pending order saved. Paystack is not connected, so no charge or paid download was issued.');
      },
      onError: (error) => notify(`Could not create order: ${error.message}`),
    });
  };
  return <Shell cartCount={cart ? 1 : 0} onCart={() => setCart(cart ?? products[0] ?? null)}>
    <main>
      {!isSupabaseConfigured ? <div className="mx-auto max-w-[1240px] px-5 pt-6 lg:px-8"><div className="rounded-xl border border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--card))] px-4 py-3 text-sm" role="alert">Supabase is not configured. The marketplace will not show sample products or accept demo orders.</div></div> : productsQuery.isError && <div className="mx-auto max-w-[1240px] px-5 pt-6 lg:px-8"><div className="rounded-xl border border-[hsl(var(--accent)/.5)] bg-[hsl(var(--accent)/.12)] px-4 py-3 text-sm" role="status">Could not load products from Supabase: {productsQuery.error.message}. Apply <span className="font-mono text-xs">artifacts/lessonmart/supabase/migrations/20261014_connect_existing_lessonmart.sql</span> if the seller view or secure policies are not installed.</div></div>}
      <section className="mx-auto max-w-[1240px] px-5 pb-14 pt-12 lg:px-8 lg:pb-20 lg:pt-20">
        <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div className="fade-up"><div className="mb-6 flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /> Built for the Nigerian classroom</div><h1 className="max-w-3xl font-display text-[3.35rem] font-bold leading-[.98] tracking-[-.06em] sm:text-6xl lg:text-[5.7rem]">Good teaching<br /><span className="text-[hsl(var(--primary))]">should pay off.</span></h1><p className="mt-7 max-w-xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">Find the lesson notes, WAEC drills and classroom resources that make tomorrow easier — or turn your hard-won classroom knowledge into income.</p><div className="mt-8 flex flex-wrap gap-3"><a href="#catalog" className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:brightness-110" data-testid="link-browse-catalog">Browse the shelf <ArrowDownIcon /></a><Link href="/seller" className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-5 py-3.5 text-sm font-bold hover:bg-[hsl(var(--secondary))]" data-testid="link-start-selling">Start selling <ArrowRight size={16} /></Link></div></div>
          <div className="relative hidden min-h-[330px] lg:block fade-up-2"><div className="absolute right-2 top-4 h-64 w-64 rounded-full bg-[hsl(var(--accent)/.55)] blur-3xl" /><div className="absolute right-10 top-10 w-80 rotate-[-7deg] rounded-[1.5rem] border border-white/30 bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] shadow-2xl"><div className="flex justify-between text-xs font-bold uppercase tracking-[.2em] text-white/70"><span>Seller desk</span><TrendingUp size={17} /></div><p className="mt-12 font-display text-4xl font-bold">Your lessons</p><p className="mt-2 text-sm text-white/70">On a shelf students can find</p><div className="mt-8 h-2 rounded-full bg-white/20"><div className="h-2 w-4/5 rounded-full bg-[hsl(var(--accent))]" /></div></div><div className="absolute bottom-3 left-10 w-64 rotate-[8deg] rounded-[1.25rem] bg-[hsl(var(--card))] p-5 shadow-xl"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--accent))] text-xs font-bold">MN</span><div><p className="text-sm font-bold">Moses Nduka</p><p className="text-xs text-[hsl(var(--muted-foreground))]">Founder · Verified Owner</p></div><BadgeCheck size={16} className="ml-auto text-[hsl(var(--primary))]" /></div></div></div>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--border))] sm:grid-cols-4 fade-up-3">{publicStats.map(([label, value]) => <div className="bg-[hsl(var(--card))] px-4 py-5 sm:px-6" key={label}><p className="font-display text-2xl font-bold sm:text-3xl">{value}</p><p className="mt-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{label}</p></div>)}</div>
      </section>
      <section id="catalog" className="border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.4)]"><div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8 lg:py-20"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><span className="text-xs font-extrabold uppercase tracking-[.2em] text-[hsl(var(--primary))]">The shelf</span><h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Resources with receipts.</h2><p className="mt-2 text-[hsl(var(--muted-foreground))]">Made in real classrooms. Ready for your next lesson or exam.</p></div><div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" /> Updated daily by Nigerian educators</div></div>
        <div className="mt-9 flex flex-col gap-3 lg:flex-row"><label className="relative flex-1"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, subject or grade level..." className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-3.5 pl-11 pr-4 outline-none focus:border-[hsl(var(--primary))]" data-testid="input-search-products" /></label><div className="flex gap-2 overflow-auto pb-1">{['All subjects', ...subjects].map((item) => <button key={item} onClick={() => setSubject(item)} className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold transition ${subject === item ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))]'}`} data-testid={`button-filter-${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</button>)}</div></div>
        {productsQuery.isLoading && isSupabaseConfigured ? <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div className="h-[390px] animate-pulse rounded-2xl bg-[hsl(var(--muted))]" key={item} />)}</div> : productsQuery.isError && isSupabaseConfigured ? <div className="mt-9 rounded-2xl border border-dashed border-[hsl(var(--destructive)/.4)] bg-[hsl(var(--card))] px-6 py-12 text-center"><PackageOpen className="mx-auto text-[hsl(var(--destructive))]" size={32} /><h3 className="mt-4 font-display text-xl font-bold">Could not load live resources.</h3><p className="mx-auto mt-2 max-w-xl text-sm text-[hsl(var(--muted-foreground))]">{productsQuery.error.message}. Check the Supabase table columns and install the LessonMart security migration.</p></div> : filtered.length ? <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((product) => <ProductCard key={product.id} product={product} onOpen={setSelected} onAdd={addToCart} added={cart?.id === product.id} />)}</div> : <div className="mt-9 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-16 text-center"><PackageOpen className="mx-auto text-[hsl(var(--primary))]" size={32} /><h3 className="mt-4 font-display text-xl font-bold">No approved resources yet.</h3><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{search || subject !== 'All subjects' ? 'Try another subject or clear the search.' : 'Approved products from your Supabase catalog will appear here.'}</p><button onClick={() => { setSearch(''); setSubject('All subjects'); }} className="mt-5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-clear-filters">Clear filters</button></div>}
      </div></section>
      <section className="mx-auto max-w-[1240px] px-5 pb-4 lg:px-8"><div className="grid gap-5 rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-[hsl(var(--accent))] font-display text-xl font-bold text-[hsl(var(--accent-foreground))]">{featuredSeller.initials}</span><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Featured seller</p><h2 className="mt-1 font-display text-2xl font-bold">{featuredSeller.name}</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{featuredSeller.role} · <span className="font-bold text-[hsl(var(--primary))]">{featuredSeller.badge}</span></p></div><a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm font-bold hover:bg-[hsl(var(--secondary))]" data-testid="link-featured-seller-contact"><MessageCircle size={17} /> Contact Moses</a></div></section>
      <section className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8 lg:py-24"><div className="grid items-center gap-10 rounded-[1.5rem] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] sm:p-12 lg:grid-cols-[1.2fr_.8fr]"><div><span className="text-xs font-extrabold uppercase tracking-[.2em] text-[hsl(var(--accent))]">For teachers with a folder full of gold</span><h2 className="mt-4 max-w-xl font-display text-4xl font-bold leading-tight sm:text-5xl">Your best lesson should not disappear after Friday.</h2><p className="mt-5 max-w-lg leading-7 text-white/70">Package what already works, set your price, and get paid when another teacher or student finds it useful.</p><Link href="/seller" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-5 py-3.5 text-sm font-extrabold text-[hsl(var(--accent-foreground))]" data-testid="link-sell-banner">See the seller desk <ArrowRight size={17} /></Link></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-5"><Upload size={21} className="text-[hsl(var(--accent))]" /><p className="mt-10 font-display text-2xl font-bold">12 min</p><p className="mt-1 text-xs text-white/65">to list a resource</p></div><div className="mt-8 rounded-2xl bg-white/10 p-5"><Wallet size={21} className="text-[hsl(var(--accent))]" /><p className="mt-10 font-display text-2xl font-bold">₦0</p><p className="mt-1 text-xs text-white/65">to open your shelf</p></div></div></div></section>
    </main>
    <ProductModal product={selected} onClose={() => setSelected(null)} onAdd={addToCart} added={cart?.id === selected?.id} />
    <CartSheet product={cart} onClose={() => setCart(null)} onCheckout={(product) => { setCheckout(product); }} onRemove={() => setCart(null)} />
    <CheckoutModal product={checkout} buyerEmail={user?.email ?? ''} onClose={() => setCheckout(null)} onComplete={completeOrder} loading={order.isPending} />
    <Notice message={notice} />
  </Shell>;
}

function ArrowDownIcon() { return <ArrowRight size={16} className="rotate-90" />; }

function MetricCard({ label, value, detail, icon: Icon, accent = false }: { label: string; value: string; detail: string; icon: typeof Wallet; accent?: boolean }) {
  return <div className={`rounded-2xl border p-5 ${accent ? 'border-[hsl(var(--accent)/.4)] bg-[hsl(var(--accent)/.15)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'}`}><div className="flex items-start justify-between"><span className={`grid h-9 w-9 place-items-center rounded-xl ${accent ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]'}`}><Icon size={18} /></span><MoreHorizontal size={18} className="text-[hsl(var(--muted-foreground))]" /></div><p className="mt-7 text-sm text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-1 font-display text-3xl font-bold">{value}</p><p className="mt-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{detail}</p></div>;
}

function DashboardFrame({ title, eyebrow, children, nav, onAction }: { title: string; eyebrow: string; children: ReactNode; nav: { label: string; icon: typeof Wallet; active?: boolean }[]; onAction: (label: string) => void }) {
  const [location] = useLocation();
  return <Shell cartCount={0} onCart={() => undefined}><div className="mx-auto flex max-w-[1440px]"><aside className="hidden w-64 shrink-0 border-r border-[hsl(var(--border))] px-5 py-8 lg:block"><div className="mb-10 px-3 text-xs font-extrabold uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">Workspace</div><div className="space-y-1">{nav.map(({ label, icon: Icon, active }) => <button key={label} onClick={() => onAction(label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${active ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'}`} data-testid={`button-dashboard-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} />{label}</button>)}</div><div className="mt-12 rounded-2xl bg-[hsl(var(--secondary))] p-4"><Sparkles size={18} className="text-[hsl(var(--accent))]" /><p className="mt-4 text-sm font-bold">Small moves, steady income.</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Your knowledge can travel further than your timetable.</p></div></aside><main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[hsl(var(--primary))]">{eyebrow}</p><h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1><p className="mt-2 text-[hsl(var(--muted-foreground))]">{location === '/admin' ? 'A clear view of the marketplace, without the spreadsheet fog.' : 'Keep your resources moving and your classroom work earning.'}</p></div><div className="flex gap-2 lg:hidden">{nav.slice(0, 3).map(({ label, icon: Icon, active }) => <button onClick={() => onAction(label)} key={label} className={`grid h-10 w-10 place-items-center rounded-xl border ${active ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))]'}`} aria-label={label} data-testid={`button-mobile-dashboard-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} /></button>)}</div></div>{children}</main></div></Shell>;
}

function Seller() {
  const { user, profile } = useAuth();
  const sellerQuery = useQuery({ queryKey: ['supabase', 'seller-dashboard', user?.id], queryFn: () => getSellerDashboard(user!.id), enabled: Boolean(user), retry: false });
  const seller = sellerQuery.data?.overview ?? { totalEarnings: 0, availablePayout: 0, totalSales: 0, pendingProducts: 0 };
  const products = sellerQuery.data?.products ?? [];
  const client = useQueryClient();
  const { notice, notify } = useNotice();
  const [tab, setTab] = useState('Overview');
  const [showForm, setShowForm] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [form, setForm] = useState<SellerProductInput>({ title: '', description: '', subject: '', gradeLevel: '', price: 2500 });
  const submitProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!user || !profile) { notify('Your account profile is not ready. Apply the Supabase migration, then sign in again.'); return; }
    setSavingProduct(true);
    void createSellerProduct(form, user.id, profile.full_name, file, previewFile).then(() => {
      setShowForm(false);
      setFile(null);
      setPreviewFile(null);
      notify('Your product was saved and is waiting for admin approval.');
      void client.invalidateQueries({ queryKey: ['supabase', 'seller-dashboard', user.id] });
    }).catch((error: Error) => notify(`Product could not be submitted: ${error.message}`)).finally(() => setSavingProduct(false));
  };
  const action = (label: string) => { setTab(label); if (label === 'Upload product') setShowForm(true); else if (label === 'Payouts') setShowPayout(true); else if (label === 'Marketing tools') notify('Marketing links will be available after products are approved.'); };
  const requestPayout = () => {
    if (!user) return;
    void createPayoutRequest(seller.availablePayout).then(() => {
      setShowPayout(false);
      notify(`Payout request saved for admin review. Email ${SUPPORT_EMAIL} for help; no email or bank transfer is sent from this page.`);
      void client.invalidateQueries({ queryKey: ['supabase', 'seller-dashboard', user.id] });
    }).catch((error: Error) => notify(`Payout request could not be saved: ${error.message}`));
  };
  return <><DashboardFrame title={tab === 'Overview' ? `Welcome, ${profile?.full_name ?? 'seller'}.` : tab} eyebrow="Seller desk" nav={[{ label: 'Overview', icon: LayoutDashboard, active: tab === 'Overview' }, { label: 'Products', icon: PackageOpen, active: tab === 'Products' }, { label: 'Upload product', icon: Upload }, { label: 'Marketing tools', icon: Share2 }, { label: 'Payouts', icon: Wallet }]} onAction={action}>
    {sellerQuery.isLoading ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div className="h-36 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" key={item} />)}</div> : sellerQuery.isError ? <div className="rounded-2xl border border-[hsl(var(--destructive)/.4)] bg-[hsl(var(--card))] p-6 text-sm" role="alert">Could not load your seller data: {sellerQuery.error.message}. Check the database migration and sign in again.</div> : <><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total earnings" value={naira(seller.totalEarnings)} detail="Paid orders only" icon={TrendingUp} accent /><MetricCard label="Available to withdraw" value={naira(seller.availablePayout)} detail="After existing payout requests" icon={Wallet} /><MetricCard label="Resource sales" value={seller.totalSales.toLocaleString()} detail="Paid orders" icon={ShoppingBag} /><MetricCard label="Pending review" value={seller.pendingProducts.toLocaleString()} detail="Awaiting admin approval" icon={Clock3} /></div><div className="mt-7 grid gap-7 xl:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Your shelf</p><h2 className="mt-2 font-display text-2xl font-bold">Products that keep teaching.</h2></div><button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-upload-product"><Plus size={16} /> Add product</button></div><div className="mt-7 space-y-3">{products.length ? products.slice(0, 5).map((product) => <div key={product.id} className="flex items-center gap-4 rounded-xl border border-[hsl(var(--border))] p-3"><div className="h-12 w-12 shrink-0 rounded-lg" style={{ backgroundColor: product.coverColor }} /><div className="min-w-0 flex-1"><p className="truncate font-bold">{product.title}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{product.subject} · {product.gradeLevel} · {naira(product.price)}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${product.status === 'approved' ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent-foreground))]'}`}>{product.status}</span></div>) : <p className="rounded-xl border border-dashed border-[hsl(var(--border))] p-6 text-sm text-[hsl(var(--muted-foreground))]">Your submitted products will appear here.</p>}</div></section><section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Seller account</p><h2 className="mt-2 font-display text-2xl font-bold">Payouts and resources</h2><p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">PDF uploads are private until a buyer has a paid order. Product listings go to admin review before they appear in the marketplace.</p><button onClick={() => setShowPayout(true)} disabled={seller.availablePayout <= 0} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50"><Wallet size={17} /> Request available payout</button></section></div></>}</DashboardFrame>;
    {showForm && <ProductForm form={form} setForm={setForm} file={file} setFile={setFile} previewFile={previewFile} setPreviewFile={setPreviewFile} onClose={() => setShowForm(false)} onSubmit={submitProduct} loading={savingProduct} />}{showPayout && <PayoutModal amount={seller.availablePayout} onClose={() => setShowPayout(false)} onSubmit={requestPayout} />}{notice && <Notice message={notice} />}</>;
}

function ProductForm({ form, setForm, file, setFile, previewFile, setPreviewFile, onClose, onSubmit, loading }: { form: SellerProductInput; setForm: (form: SellerProductInput) => void; file: File | null; setFile: (file: File | null) => void; previewFile: File | null; setPreviewFile: (file: File | null) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; loading: boolean }) {
  const update = (key: keyof SellerProductInput, value: string) => setForm({ ...form, [key]: key === 'price' ? Number(value) : value });
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.55)] p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="max-h-[94dvh] w-full max-w-2xl overflow-auto rounded-t-[1.5rem] bg-[hsl(var(--card))] p-6 shadow-2xl sm:rounded-[1.5rem] sm:p-9"><div className="flex justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">New resource</p><h2 className="mt-2 font-display text-3xl font-bold">Put your best work on the shelf.</h2></div><button onClick={onClose} aria-label="Close upload form" data-testid="button-close-upload"><X /></button></div><form onSubmit={onSubmit} className="mt-8 grid gap-5 sm:grid-cols-2"><label className="sm:col-span-2 text-sm font-bold">Product title<input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. SS2 Physics: Electricity Notes" className="field" data-testid="input-product-title" /></label><label className="sm:col-span-2 text-sm font-bold">What will buyers get?<textarea required rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Tell students and teachers what makes this useful." className="field resize-none" data-testid="input-product-description" /></label><label className="text-sm font-bold">Subject<input required value={form.subject} onChange={(e) => update('subject', e.target.value)} className="field" data-testid="input-product-subject" /></label><label className="text-sm font-bold">Grade level<input required value={form.gradeLevel} onChange={(e) => update('gradeLevel', e.target.value)} placeholder="e.g. SS2" className="field" data-testid="input-product-level" /></label><label className="text-sm font-bold">Price in naira<input required min="500" type="number" value={form.price} onChange={(e) => update('price', e.target.value)} className="field" data-testid="input-product-price" /></label><label className="sm:col-span-2 text-sm font-bold">Resource PDF<input required type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-[hsl(var(--secondary))] file:px-3 file:py-2" data-testid="input-product-file" /><span className="mt-1 block text-xs font-normal text-[hsl(var(--muted-foreground))]">Required PDF, up to 50 MB. Stored privately in Supabase until a buyer has a paid order.</span></label><label className="sm:col-span-2 text-sm font-bold">Preview image (optional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPreviewFile(event.target.files?.[0] ?? null)} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-[hsl(var(--secondary))] file:px-3 file:py-2" data-testid="input-product-preview" /><span className="mt-1 block text-xs font-normal text-[hsl(var(--muted-foreground))]">JPG, PNG or WebP, up to 5 MB. Preview images are public.</span></label><div className="sm:col-span-2 flex justify-end gap-3 border-t border-[hsl(var(--border))] pt-5"><button type="button" onClick={onClose} className="rounded-xl px-5 py-3 text-sm font-bold" data-testid="button-cancel-upload">Cancel</button><button disabled={loading || !file} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-submit-product">{loading && <LoaderCircle size={16} className="spin" />} Submit for review</button></div></form></div></div>;
}

function PayoutModal({ amount, onClose, onSubmit }: { amount: number; onClose: () => void; onSubmit: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/.55)] p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-[1.5rem] bg-[hsl(var(--card))] p-7 shadow-2xl"><div className="flex justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Payouts</p><h2 className="mt-2 font-display text-3xl font-bold">Take your work home.</h2></div><button onClick={onClose} aria-label="Close payout modal" data-testid="button-close-payout"><X /></button></div><p className="mt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Save a payout request for admin review. This does not initiate a bank transfer or send an email notification. For help, contact <a className="font-bold text-[hsl(var(--primary))] hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p><div className="mt-6 rounded-xl bg-[hsl(var(--secondary))] p-5"><span className="text-xs text-[hsl(var(--muted-foreground))]">Available</span><p className="mt-1 font-display text-3xl font-bold">{naira(amount)}</p></div><button onClick={onSubmit} disabled={amount <= 0} className="mt-6 w-full rounded-xl bg-[hsl(var(--accent))] py-3.5 font-extrabold text-[hsl(var(--accent-foreground))] disabled:opacity-50" data-testid="button-request-payout">Request payout</button></div></div>;
}

function Admin({ adminEmail }: { adminEmail: string }) {
  const client = useQueryClient();
  const [tab, setTab] = useState('Overview');
  const { notice, notify } = useNotice();
  const overview = useQuery({ queryKey: ['supabase', 'admin-overview'], queryFn: getAdminDashboard, retry: false });
  const approvals = useQuery({ queryKey: ['supabase', 'admin-pending-products'], queryFn: listPendingProducts, retry: false });
  const payouts = useQuery({ queryKey: ['supabase', 'admin-pending-payouts'], queryFn: listPendingPayouts, retry: false });
  const users = useQuery({ queryKey: ['supabase', 'admin-profiles'], queryFn: listProfilesForAdmin, retry: false });
  const invalidateAdmin = () => {
    void client.invalidateQueries({ queryKey: ['supabase', 'admin-overview'] });
    void client.invalidateQueries({ queryKey: ['supabase', 'admin-pending-products'] });
    void client.invalidateQueries({ queryKey: ['supabase', 'admin-pending-payouts'] });
    void client.invalidateQueries({ queryKey: ['supabase', 'admin-profiles'] });
  };
  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => setProductReviewStatus(id, status),
    onSuccess: () => { invalidateAdmin(); notify('Product review was saved.'); },
    onError: (error) => notify(`Could not save product review: ${error.message}`),
  });
  const updatePayout = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'paid' | 'rejected' }) => setPayoutStatus(id, status),
    onSuccess: () => { invalidateAdmin(); notify('Payout status updated. Marking paid records an external transfer; it does not send one.'); },
    onError: (error) => notify(`Could not update payout: ${error.message}`),
  });
  const admin = overview.data ?? { totalRevenue: 0, paidOrders: 0, pendingApprovals: 0, payouts: 0 };
  const nav = [
    { label: 'Overview', icon: LayoutDashboard, active: tab === 'Overview' },
    { label: 'Approvals', icon: ClipboardList, active: tab === 'Approvals' },
    { label: 'Payouts', icon: Wallet, active: tab === 'Payouts' },
    { label: 'Revenue', icon: BarChart3, active: tab === 'Revenue' },
  ];
  return <><DashboardFrame title="Marketplace control room" eyebrow="Admin desk" nav={nav} onAction={setTab}>
    <div className="mb-7 flex flex-col gap-2 rounded-2xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--secondary))] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Administrator</p><p className="mt-1 font-bold">{adminEmail}</p></div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-extrabold text-[hsl(var(--primary-foreground))]"><BadgeCheck size={14} /> Full access</span>
      <p className="text-xs text-[hsl(var(--muted-foreground))] sm:max-w-xs">Approve products, see paid-order revenue and manage payout requests for {BUSINESS_NAME}.</p>
    </div>
    {(overview.isError || approvals.isError || payouts.isError || users.isError) && <p className="mb-5 rounded-xl border border-[hsl(var(--destructive)/.4)] p-4 text-sm" role="alert">Some admin data could not be loaded: {[overview.error, approvals.error, payouts.error, users.error].filter(Boolean).map((error) => error?.message).join(' · ')}. Apply the schema-matched LessonMart migration in Supabase and confirm this profile has role `admin`.</p>}
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total revenue" value={naira(admin.totalRevenue)} detail="Paid orders only" icon={BarChart3} accent />
      <MetricCard label="Paid orders" value={String(admin.paidOrders)} detail="Confirmed paid status" icon={TrendingUp} />
      <MetricCard label="Pending approvals" value={String(admin.pendingApprovals)} detail="Products awaiting review" icon={Clock3} />
      <MetricCard label="Payout requests" value={naira(admin.payouts)} detail="Pending or approved amounts" icon={Wallet} />
    </div>
    <div className="mt-7 grid gap-7 xl:grid-cols-2">
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
        <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Product approval queue</p><h2 className="mt-2 font-display text-2xl font-bold">Review seller submissions.</h2></div><button onClick={() => setTab('Approvals')} className="text-sm font-bold text-[hsl(var(--primary))]">Approvals</button></div>
        {approvals.isError && <p className="mt-5 text-sm text-[hsl(var(--destructive))]">{approvals.error.message}</p>}
        <div className="mt-6 space-y-3">{(approvals.data ?? []).length ? (approvals.data ?? []).map((product) => <div key={product.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-3"><div className="h-11 w-11 shrink-0 rounded-lg" style={{ backgroundColor: product.coverColor }} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{product.title}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{product.seller.name} · {naira(product.price)}</p></div><button disabled={review.isPending} onClick={() => review.mutate({ id: product.id, status: 'approved' })} className="rounded-lg bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary))] disabled:opacity-50">Approve</button><button disabled={review.isPending} onClick={() => review.mutate({ id: product.id, status: 'rejected' })} className="rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold disabled:opacity-50">Reject</button></div>) : <p className="rounded-xl border border-dashed border-[hsl(var(--border))] p-5 text-sm text-[hsl(var(--muted-foreground))]">No products are waiting for review.</p>}</div>
      </section>
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
        <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Payout requests</p><h2 className="mt-2 font-display text-2xl font-bold">Review seller payouts.</h2></div>
        {payouts.isError && <p className="mt-5 text-sm text-[hsl(var(--destructive))]">{payouts.error.message}</p>}
        <div className="mt-6 space-y-3">{(payouts.data ?? []).length ? (payouts.data ?? []).map((payout) => <div key={payout.id} className="rounded-xl border border-[hsl(var(--border))] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{payout.seller?.full_name ?? 'Seller'}</p><p className="mt-1 break-all text-xs text-[hsl(var(--muted-foreground))]">{payout.seller?.email ?? payout.seller_id}</p></div><span className="font-display text-lg font-bold">{naira(Number(payout.amount))}</span></div><div className="mt-4 flex items-center justify-between"><span className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">{payout.status}</span><div className="flex gap-2">{payout.status === 'pending' && <button disabled={updatePayout.isPending} onClick={() => updatePayout.mutate({ id: payout.id, status: 'approved' })} className="rounded-lg bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary))]">Approve</button>}{payout.status === 'approved' && <button disabled={updatePayout.isPending} onClick={() => updatePayout.mutate({ id: payout.id, status: 'paid' })} className="rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]">Mark paid</button>}{payout.status === 'pending' && <button disabled={updatePayout.isPending} onClick={() => updatePayout.mutate({ id: payout.id, status: 'rejected' })} className="rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold">Reject</button>}</div></div></div>) : <p className="rounded-xl border border-dashed border-[hsl(var(--border))] p-5 text-sm text-[hsl(var(--muted-foreground))]">No payout requests are waiting.</p>}</div>
      </section>
    </div>
    <section className="mt-7 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Accounts</p><h2 className="mt-2 font-display text-2xl font-bold">Registered users</h2></div><span className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-xs font-bold">{users.data?.length ?? 0} profiles</span></div>
      {users.isLoading ? <p className="mt-5 text-sm text-[hsl(var(--muted-foreground))]">Loading profiles…</p> : users.isError ? <p className="mt-5 text-sm text-[hsl(var(--destructive))]">Profile list unavailable: {users.error.message}</p> : (users.data ?? []).length ? <div className="mt-5 divide-y divide-[hsl(var(--border))]">{(users.data ?? []).map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="truncate font-bold">{account.full_name || 'Unnamed user'}</p><p className="mt-1 break-all text-xs text-[hsl(var(--muted-foreground))]">{account.email}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${account.role === 'admin' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--secondary))]'}`}>{account.role}</span></div>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-[hsl(var(--border))] p-5 text-sm text-[hsl(var(--muted-foreground))]">No profiles were returned. Check the admin SELECT policy on public.profiles.</p>}
    </section>
    <div className="mt-7 rounded-2xl bg-[hsl(var(--secondary))] p-5 text-sm text-[hsl(var(--muted-foreground))]">Payout approval only records status. A real bank transfer must be made and confirmed separately. Paystack settlement webhooks are not configured by this Supabase setup.</div>
  </DashboardFrame>{notice && <Notice message={notice} />}</>;
}

function AccountPage({ redirectTo = '/account' }: { redirectTo?: string }) {
  const { user, profile, loading, profileLoading, error, signIn, signUp, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setMessage('');
    try {
      if (mode === 'sign-in') {
        await signIn(email.trim(), password);
        setLocation(redirectTo);
      } else {
        const hasSession = await signUp(email.trim(), password, displayName.trim());
        if (hasSession) setLocation(redirectTo);
        else setMessage('Account created. Check your email to confirm the address, then sign in.');
      }
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Could not complete the request.');
    } finally {
      setSaving(false);
    }
  };

  return <Shell cartCount={0} onCart={() => undefined}><main className="mx-auto max-w-[1240px] px-5 py-12 lg:px-8 lg:py-20">
    <div className="mx-auto max-w-xl rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm sm:p-9">
      {user ? <>
        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[hsl(var(--primary))]">LessonMart account</p>
        <h1 className="mt-3 font-display text-3xl font-bold">You’re signed in.</h1>
        <p className="mt-3 break-all text-sm text-[hsl(var(--muted-foreground))]">{user.email}</p>
        {profileLoading || loading ? <p className="mt-5 text-sm">Loading account permissions…</p> : profile ? <div className="mt-5 rounded-xl bg-[hsl(var(--secondary))] p-4 text-sm"><span className="text-[hsl(var(--muted-foreground))]">Access level</span><strong className="mt-1 block capitalize">{profile.role}</strong>{profile.role === 'admin' && <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Owner administrator access is enabled.</p>}</div> : <p className="mt-5 rounded-xl border border-[hsl(var(--destructive)/.4)] p-4 text-sm">Your profile is missing. Apply the LessonMart migration in Supabase before using seller or admin tools.{error ? ` (${error})` : ''}</p>}
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/" className="rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Browse marketplace</Link><button onClick={() => void signOut().catch((signOutError: Error) => setFormError(signOutError.message))} className="rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm font-bold">Sign out</button></div>
        {formError && <p className="mt-4 text-sm text-[hsl(var(--destructive))]" role="alert">{formError}</p>}
      </> : <>
        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[hsl(var(--primary))]">{mode === 'sign-in' ? 'Welcome back' : 'Create your LessonMart account'}</p>
        <h1 className="mt-3 font-display text-3xl font-bold">{mode === 'sign-in' ? 'Sign in to LessonMart.' : 'Start selling on LessonMart.'}</h1>
        <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Use your email and password. Seller submissions and orders are saved to your Supabase account.</p>
        {!isSupabaseConfigured ? <p className="mt-6 rounded-xl border border-[hsl(var(--destructive)/.4)] p-4 text-sm">Supabase credentials are not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Replit Secrets.</p> : <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === 'sign-up' && <label className="block text-sm font-bold">Your name<input required minLength={2} maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" className="field" data-testid="input-account-name" /></label>}
          <label className="block text-sm font-bold">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="field" data-testid="input-account-email" /></label>
          <label className="block text-sm font-bold">Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} className="field" data-testid="input-account-password" /></label>
          {formError && <p className="text-sm text-[hsl(var(--destructive))]" role="alert">{formError}</p>}
          {message && <p className="rounded-xl bg-[hsl(var(--secondary))] p-3 text-sm" role="status">{message}</p>}
          <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3.5 text-sm font-extrabold text-[hsl(var(--primary-foreground))] disabled:opacity-60" data-testid="button-account-submit">{saving && <LoaderCircle size={16} className="spin" />}{mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
        </form>}
        <button onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setFormError(''); setMessage(''); }} className="mt-5 text-sm font-bold text-[hsl(var(--primary))]">{mode === 'sign-in' ? 'New to LessonMart? Create an account' : 'Already have an account? Sign in'}</button>
        {mode === 'sign-up' && <p className="mt-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">The owner account receives admin access only through the database migration and only for {ADMIN_EMAIL}. Access cannot be self-assigned from this form.</p>}
      </>}
    </div>
  </main></Shell>;
}

function AccessGate() {
  const { user, profile, loading, profileLoading, error } = useAuth();
  const path = '/seller';
  if (loading || (user && profileLoading)) return <Shell cartCount={0} onCart={() => undefined}><main className="mx-auto max-w-2xl px-5 py-24 text-center"><LoaderCircle className="mx-auto spin text-[hsl(var(--primary))]" size={28} /><p className="mt-4">Checking your LessonMart account…</p></main></Shell>;
  if (!user) return <AccountPage redirectTo={path} />;
  if (!profile) return <Shell cartCount={0} onCart={() => undefined}><main className="mx-auto max-w-2xl px-5 py-24"><div className="rounded-2xl border border-[hsl(var(--destructive)/.4)] bg-[hsl(var(--card))] p-6"><h1 className="font-display text-2xl font-bold">Account setup is incomplete.</h1><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Your Supabase login succeeded, but its LessonMart profile is not available. Apply the migration file in the Supabase SQL Editor and sign in again.{error ? ` Details: ${error}` : ''}</p><Link href="/account" className="mt-5 inline-flex rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Account settings</Link></div></main></Shell>;
  return <Seller />;
}

function Contact() {
  return <Shell cartCount={0} onCart={() => undefined}>
    <main className="mx-auto max-w-[1240px] px-5 py-12 lg:px-8 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[hsl(var(--primary))]">Contact LessonMart</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-6xl">Talk to the owner.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">Need help with a resource, checkout, seller payout or product approval? Moses Nduka and the LessonMart team can help.</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/.45)]" data-testid="link-contact-whatsapp">
          <MessageCircle className="text-[#25D366]" size={28} />
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">WhatsApp support</p>
          <h2 className="mt-2 font-display text-2xl font-bold">08136377571</h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Start a chat with Hello LessonMart Support.</p>
        </a>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/.45)]" data-testid="link-contact-email">
          <BriefcaseBusiness className="text-[hsl(var(--primary))]" size={28} />
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Support email</p>
          <h2 className="mt-2 break-all font-display text-2xl font-bold">{SUPPORT_EMAIL}</h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">For receipts, payout notifications and marketplace support.</p>
        </a>
      </div>
      <div className="mt-8 rounded-2xl bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] sm:p-9">
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--accent))]">Business details</p>
        <h2 className="mt-3 font-display text-3xl font-bold">{BUSINESS_NAME}</h2>
        <p className="mt-3 text-white/75">Owned by {OWNER_NAME} · Lagos, Nigeria</p>
      </div>
    </main>
  </Shell>;
}

function SellerAccess() {
  return <AccessGate />;
}

function AdminAccess() {
  const [, navigate] = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState(ADMIN_EMAIL);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    const checkAdmin = async () => {
      try {
        if (!supabase) {
          navigate('/login');
          setLoading(false);
          return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!isMounted.current) return;
        if (userError || !user) {
          navigate('/login');
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, email')
          .eq('id', user.id)
          .maybeSingle();
        if (!isMounted.current) return;
        if (profileError) console.error('Could not load admin profile:', profileError.message);

        console.log('Current role:', profile?.role);
        const role = String(profile?.role ?? '').toLowerCase();
        const email = String(profile?.email || user.email || '').trim().toLowerCase();
        if (role !== 'admin' && email !== ADMIN_EMAIL.toLowerCase()) {
          navigate('/');
          setLoading(false);
          return;
        }

        setAdminEmail(email || ADMIN_EMAIL);
        setIsAdmin(true);
        setLoading(false);
      } catch (authError) {
        if (!isMounted.current) return;
        console.error('Admin access check failed:', authError);
        navigate('/');
        setLoading(false);
      }
    };

    void checkAdmin();
    return () => {
      isMounted.current = false;
    };
  }, []);

  if (loading) return <Shell cartCount={0} onCart={() => undefined}><main className="mx-auto max-w-2xl px-5 py-24 text-center"><LoaderCircle className="mx-auto spin text-[hsl(var(--primary))]" size={28} /><p className="mt-4">Checking your LessonMart account…</p></main></Shell>;
  return isAdmin ? <Admin adminEmail={adminEmail} /> : null;
}

function DashboardRoute() {
  const { user, profile, loading, profileLoading } = useAuth();
  if (loading || (user && profileLoading)) return <Shell cartCount={0} onCart={() => undefined}><main className="mx-auto max-w-2xl px-5 py-24 text-center"><LoaderCircle className="mx-auto spin text-[hsl(var(--primary))]" size={28} /><p className="mt-4">Checking your LessonMart account…</p></main></Shell>;
  if (!user) return <AccountPage redirectTo="/dashboard" />;
  if (!profile) return <AccountPage redirectTo="/dashboard" />;
  if (profile.role === 'admin') return <Admin adminEmail={profile.email || ADMIN_EMAIL} />;
  if (profile.role === 'seller') return <Seller />;
  return <AccountPage redirectTo="/dashboard" />;
}

function AccountRoute() {
  return <AccountPage />;
}

function LoginRoute() {
  return <AccountPage redirectTo="/admin" />;
}

function AppRouter() {
  return <AuthProvider><ErrorBoundary resetKey={window.location.pathname}><Switch><Route path="/" component={Marketplace} /><Route path="/marketplace" component={Marketplace} /><Route path="/dashboard" component={DashboardRoute} /><Route path="/seller" component={SellerAccess} /><Route path="/admin" component={AdminAccess} /><Route path="/login" component={LoginRoute} /><Route path="/account" component={AccountRoute} /><Route path="/contact" component={Contact} /><Route component={NotFound} /></Switch></ErrorBoundary></AuthProvider>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><AppRouter /><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;