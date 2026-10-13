# LessonMart Supabase setup

The app reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Replit Secrets. These public client credentials are enough for sign-in and RLS-protected app requests; they cannot create database tables or storage buckets.

## Apply the schema

1. Open the Supabase project dashboard and go to **SQL Editor**.
2. Open `migrations/20261013_lessonmart_core.sql` from this folder, paste the full file into a new SQL query, and run it.
3. The migration creates the profile, product, order, and payout tables; enables row-level security; creates the private `lessonmart-files` PDF bucket if it is missing; and inserts the current demo catalog once without overwriting matching product IDs.
4. Create an account in LessonMart using `ndukamoses@gmail.com` and the owner's name. The database trigger assigns the admin role to that email. Existing Supabase users are backfilled when the migration runs. Other new accounts receive seller access.
5. If Supabase email confirmation is enabled, confirm the email before signing in again.

The profile trigger is the source of admin authority. The browser cannot promote itself or update its role. Admin data and approval/payout updates remain protected by database policies.

## Payment and email boundaries

Supabase setup does not configure Paystack or an email provider. Until those are connected, checkout only creates a pending order; no payment or paid download is issued. Payout requests are stored for admin review but do not send an email or transfer funds. Use `ndukamoses@gmail.com` for support contact links.
