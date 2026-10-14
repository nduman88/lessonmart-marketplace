# LessonMart Supabase setup

The app uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Replit Secrets. These are public client credentials; database access is controlled by Supabase row-level security.

## Existing database

The project already has `profiles`, `products`, and `orders`. Keep those tables and their rows. The app expects:

- `profiles`: `id`, `email`, `full_name`, `role`, `avatar_url`, `created_at`
- `products`: `id`, `seller_id`, `title`, `description`, `subject`, `grade_level`, `price`, `preview_url`, `file_url`, `watermarked_file_url`, `status`, `created_at`
- `orders`: `id`, `buyer_id`, `product_id`, `amount`, `paystack_reference`, `status`, `created_at`

To add the app's policies, auth-profile trigger, secure order/payout functions, public seller-card view, and storage rules:

1. Open the Supabase project dashboard and go to **SQL Editor**.
2. Paste and run `migrations/20261014_connect_existing_lessonmart.sql`.
3. This migration is safe to rerun. It does not seed or delete products/orders or alter their prices or subjects. It creates `payout_requests` only if missing and ensures the `lesson-files`, `previews`, and `avatars` buckets exist.
4. Sign in with the existing `ndukamoses@gmail.com` account. The admin guard and database policy check `profiles.role = 'admin'`; the migration also promotes the owner email and leaves other existing role values unchanged.

The migration replaces existing policies on these four LessonMart tables, including temporary “allow all” rules. Admins can read all profiles. Other users can read only their own profiles; public seller cards expose only the seller name and avatar. Browser clients cannot update their own email or role.

`migrations/20261013_lessonmart_core.sql` is a legacy starter migration for a different column layout and contains demo product inserts. Do not run it against the existing tables described above.

## Payment and email boundaries

Supabase setup does not configure Paystack or an email provider. Until those are connected, checkout creates a pending order only; no payment or paid download is issued. Payout requests are stored for admin review but do not send a notification email or transfer funds. Support email: `ndukamoses@gmail.com`.
