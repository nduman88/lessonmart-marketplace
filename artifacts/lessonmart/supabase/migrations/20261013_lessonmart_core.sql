-- LEGACY ONLY: this migration uses an older LessonMart schema and inserts demo products.
-- Do not run it against the existing profiles/products/orders tables.
-- For the current Supabase project use 20261014_connect_existing_lessonmart.sql.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default 'LessonMart Seller',
  role text not null default 'seller' check (role in ('seller', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  description text not null,
  category text not null,
  subject text not null,
  class_level text not null,
  price integer not null check (price >= 0),
  rating numeric(3, 2) not null default 0,
  sales integer not null default 0,
  badge text,
  cover_color text not null default '#0D7A5F',
  cover_label text not null default 'LESSON',
  seller_id uuid references public.profiles(id) on delete set null,
  seller_name text not null,
  seller_initials text not null default 'LM',
  seller_verified boolean not null default false,
  is_demo_seller boolean not null default false,
  file_path text,
  status text not null default 'pending' check (status in ('draft', 'pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid references public.profiles(id) on delete set null,
  buyer_email text not null,
  amount integer not null check (amount >= 0),
  commission integer not null check (commission >= 0),
  seller_amount integer not null check (seller_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  payment_reference text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.lock_lessonmart_product_seller()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actual_seller_name text;
begin
  if new.seller_id is not null then
    select display_name into actual_seller_name from public.profiles where id = new.seller_id;
    if actual_seller_name is null then
      raise exception 'The product seller must have a LessonMart profile.';
    end if;
    new.seller_name := actual_seller_name;
    new.seller_initials := upper(
      left(actual_seller_name, 1) ||
      coalesce(nullif(left(split_part(actual_seller_name, ' ', 2), 1), ''), left(actual_seller_name, 1))
    );
    new.seller_verified := false;
    new.is_demo_seller := false;
  end if;
  return new;
end;
$$;

drop trigger if exists lock_lessonmart_product_seller on public.products;
create trigger lock_lessonmart_product_seller
  before insert or update on public.products
  for each row execute function public.lock_lessonmart_product_seller();

create index if not exists products_status_sales_idx on public.products(status, sales desc);
create index if not exists products_seller_created_idx on public.products(seller_id, created_at desc);
create index if not exists orders_buyer_created_idx on public.orders(buyer_id, created_at desc);
create index if not exists orders_seller_status_idx on public.orders(seller_id, status);
create index if not exists payouts_seller_status_idx on public.payout_requests(seller_id, status);

create or replace function public.is_lessonmart_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.handle_lessonmart_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'LessonMart Seller'),
    case when lower(coalesce(new.email, '')) = 'ndukamoses@gmail.com' then 'admin' else 'seller' end
  )
  on conflict (id) do update set
    email = excluded.email,
    role = case
      when lower(excluded.email) = 'ndukamoses@gmail.com' then 'admin'
      when lower(public.profiles.email) = 'ndukamoses@gmail.com' then 'seller'
      else public.profiles.role
    end;
  return new;
end;
$$;

drop trigger if exists on_lessonmart_user_created on auth.users;
drop trigger if exists on_lessonmart_user_email_updated on auth.users;
create trigger on_lessonmart_user_created
  after insert on auth.users
  for each row execute function public.handle_lessonmart_user();
create trigger on_lessonmart_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_lessonmart_user();

-- Backfill users that already existed before the migration.
insert into public.profiles (id, email, display_name, role)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), 'LessonMart Seller'),
  case when lower(coalesce(u.email, '')) = 'ndukamoses@gmail.com' then 'admin' else 'seller' end
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  role = case
    when lower(excluded.email) = 'ndukamoses@gmail.com' then 'admin'
    when lower(public.profiles.email) = 'ndukamoses@gmail.com' then 'seller'
    else public.profiles.role
  end;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.payout_requests enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.orders to authenticated;
grant select on public.payout_requests to authenticated;
grant update on public.payout_requests to authenticated;

drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_lessonmart_admin());
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_lessonmart_admin())
  with check (id = (select auth.uid()) or public.is_lessonmart_admin());

drop policy if exists "products_read_approved_or_owned" on public.products;
create policy "products_read_approved_or_owned" on public.products
  for select to anon, authenticated
  using (status = 'approved' or seller_id = (select auth.uid()) or public.is_lessonmart_admin());
drop policy if exists "products_insert_for_self" on public.products;
create policy "products_insert_for_self" on public.products
  for insert to authenticated
  with check (seller_id = (select auth.uid()) and status = 'pending');
drop policy if exists "products_update_own_pending" on public.products;
create policy "products_update_own_pending" on public.products
  for update to authenticated
  using (seller_id = (select auth.uid()) and status in ('pending', 'rejected'))
  with check (seller_id = (select auth.uid()) and status in ('pending', 'rejected'));
drop policy if exists "products_admin_manage" on public.products;
create policy "products_admin_manage" on public.products
  for all to authenticated
  using (public.is_lessonmart_admin())
  with check (public.is_lessonmart_admin());

drop policy if exists "orders_read_buyer_seller_admin" on public.orders;
create policy "orders_read_buyer_seller_admin" on public.orders
  for select to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or public.is_lessonmart_admin());

drop policy if exists "payouts_read_owner_admin" on public.payout_requests;
create policy "payouts_read_owner_admin" on public.payout_requests
  for select to authenticated
  using (seller_id = (select auth.uid()) or public.is_lessonmart_admin());
drop policy if exists "payouts_admin_update" on public.payout_requests;
create policy "payouts_admin_update" on public.payout_requests
  for update to authenticated
  using (public.is_lessonmart_admin())
  with check (public.is_lessonmart_admin());

create or replace function public.create_order_for_product(requested_product_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  buyer_email text;
  chosen_product public.products%rowtype;
  new_order_id uuid;
  fee integer;
begin
  if current_user_id is null then
    raise exception 'Sign in before placing an order.';
  end if;
  select email into buyer_email from auth.users where id = current_user_id;
  select * into chosen_product from public.products
    where id = requested_product_id and status = 'approved';
  if not found then
    raise exception 'This resource is no longer available.';
  end if;
  fee := round(chosen_product.price * 0.20);
  insert into public.orders (product_id, buyer_id, seller_id, buyer_email, amount, commission, seller_amount, status)
  values (chosen_product.id, current_user_id, chosen_product.seller_id, coalesce(buyer_email, ''), chosen_product.price, fee, chosen_product.price - fee, 'pending')
  returning id into new_order_id;
  return new_order_id;
end;
$$;
revoke all on function public.create_order_for_product(text) from public, anon;
grant execute on function public.create_order_for_product(text) to authenticated;

create or replace function public.request_seller_payout(requested_amount integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  earned integer;
  reserved integer;
  payout_id uuid;
begin
  if current_user_id is null then raise exception 'Sign in before requesting a payout.'; end if;
  select coalesce(sum(seller_amount), 0)::integer into earned
    from public.orders where seller_id = current_user_id and status = 'paid';
  select coalesce(sum(amount), 0)::integer into reserved
    from public.payout_requests where seller_id = current_user_id and status in ('pending', 'approved', 'paid');
  if requested_amount <= 0 or requested_amount > earned - reserved then
    raise exception 'The requested amount exceeds your available payout balance.';
  end if;
  insert into public.payout_requests (seller_id, amount) values (current_user_id, requested_amount)
    returning id into payout_id;
  return payout_id;
end;
$$;
revoke all on function public.request_seller_payout(integer) from public, anon;
grant execute on function public.request_seller_payout(integer) to authenticated;

create or replace function public.marketplace_summary()
returns table (notes bigint, sellers bigint, paid bigint, buyers_today bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.products where status = 'approved'),
    (select count(distinct seller_name) from public.products where status = 'approved'),
    (select coalesce(sum(amount), 0)::bigint from public.orders where status = 'paid'),
    (select count(distinct buyer_id) from public.orders where status = 'paid' and created_at >= date_trunc('day', now()));
$$;
grant execute on function public.marketplace_summary() to anon, authenticated;

-- Keep the resource bucket private, including when it already exists.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lessonmart-files', 'lessonmart-files', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = false;

drop policy if exists "lessonmart_files_upload_own" on storage.objects;
create policy "lessonmart_files_upload_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lessonmart-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "lessonmart_files_read_owner_admin_paid_buyer" on storage.objects;
create policy "lessonmart_files_read_owner_admin_paid_buyer" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lessonmart-files'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_lessonmart_admin()
      or exists (
        select 1
        from public.products p
        join public.orders o on o.product_id = p.id
        where p.file_path = storage.objects.name
          and o.buyer_id = (select auth.uid())
          and o.status = 'paid'
      )
    )
  );
drop policy if exists "lessonmart_files_update_own" on storage.objects;
create policy "lessonmart_files_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'lessonmart-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'lessonmart-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "lessonmart_files_delete_own_or_admin" on storage.objects;
create policy "lessonmart_files_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lessonmart-files' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_lessonmart_admin()));

-- Launch examples remain clearly labeled demo sellers and retain their listed prices/categories.
insert into public.products
  (id, title, description, category, subject, class_level, price, rating, sales, badge, cover_color, cover_label, seller_name, seller_initials, seller_verified, is_demo_seller, status)
values
  ('math-jss2-complete', 'JSS2 Mathematics: Complete Lesson Notes', 'A comprehensive, classroom-ready collection of JSS2 Mathematics notes with worked examples, exercises, and revision checkpoints.', 'JSS 1-3', 'Mathematics', 'JSS 2', 1800, 4.9, 184, 'BESTSELLER', '#0D7A5F', E'JSS2\nMATH', 'Mrs. Adebayo', 'MA', true, true, 'approved'),
  ('waec-english-2024', 'WAEC English Language Past Questions 2014–2024', 'Ten years of WAEC English Language past questions with clear answers and examiner-style explanations.', 'WAEC Past Q&A', 'English', 'SSS 3', 1200, 4.8, 231, 'VERIFIED', '#213B70', E'WAEC\nENGLISH', 'Mr. Chukwu', 'MC', true, true, 'approved'),
  ('basic-science-primary5', 'Basic Science Primary 5 — 3rd Term', 'Engaging Basic Science lesson notes for Primary 5 with diagrams and age-appropriate activities.', 'Primary 1-6', 'Science', 'Primary 5', 900, 4.7, 96, null, '#D97706', E'BASIC\nSCIENCE', 'Mrs. Okafor', 'MO', false, true, 'approved'),
  ('jamb-maths-crash', 'JAMB Mathematics Crash Revision Pack', 'Focused JAMB Mathematics revision with high-frequency topics, shortcuts, and timed practice.', 'JAMB Past Q&A', 'Mathematics', 'UTME', 1500, 4.9, 142, 'VERIFIED', '#7C3AED', E'JAMB\nMATHS', 'Miss Ibrahim', 'MI', true, true, 'approved'),
  ('sss1-physics-notes', 'SSS1 Physics Notes & Practical Guide', 'A clear, visual introduction to SSS1 Physics with practical activities and exam tips.', 'SSS 1-3', 'Science', 'SSS 1', 2000, 4.6, 73, null, '#0E7490', E'SSS1\nPHYSICS', 'Mr. Ade', 'MA', true, true, 'approved'),
  ('primary-3-english', 'Primary 3 English Language Notes', 'Simple, fun, and complete English Language notes for Primary 3 teachers.', 'Primary 1-6', 'English', 'Primary 3', 700, 4.8, 119, 'BESTSELLER', '#BE185D', E'PRIMARY 3\nENGLISH', 'Mrs. Adebayo', 'MA', true, true, 'approved'),
  ('jss1-basic-tech', 'JSS1 Basic Technology Scheme of Work', 'Full term-by-term scheme of work and lesson notes for JSS1 Basic Technology.', 'Scheme of Work', 'Science', 'JSS 1', 1000, 4.5, 61, null, '#166534', E'BASIC\nTECH', 'Mr. Ade', 'MA', true, true, 'approved'),
  ('sss2-commerce', 'SSS2 Commerce Lesson Notes', 'Structured SSS2 Commerce notes with Nigerian business examples, review questions, and activities.', 'SSS 1-3', 'Commercial', 'SSS 2', 1600, 4.7, 88, 'VERIFIED', '#92400E', E'SSS2\nCOMMERCE', 'Mr. Chukwu', 'MC', true, true, 'approved'),
  ('waec-biology', 'WAEC Biology Practical Questions & Answers', 'Practical biology revision with specimen notes, diagrams, and answers to likely questions.', 'WAEC Past Q&A', 'Science', 'SSS 3', 2200, 4.9, 167, 'BESTSELLER', '#166534', E'WAEC\nBIOLOGY', 'Miss Ibrahim', 'MI', true, true, 'approved'),
  ('nursery-counting', 'Nursery 2 Number Work Activity Pack', 'Printable number work activities designed for Nigeria''s Nursery 2 classroom.', 'Nursery', 'Mathematics', 'Nursery 2', 500, 4.8, 76, null, '#C2410C', E'NURSERY 2\nNUMBER', 'Mrs. Okafor', 'MO', false, true, 'approved'),
  ('jss3-chemistry', 'JSS3 Introductory Chemistry Notes', 'A friendly introduction to chemistry concepts with classroom demonstrations and tests.', 'JSS 1-3', 'Science', 'JSS 3', 1400, 4.6, 54, null, '#4338CA', E'JSS3\nCHEMISTRY', 'Mr. Chukwu', 'MC', true, true, 'approved'),
  ('ss3-government', 'SSS3 Government — Complete Revision Notes', 'Exam-focused Government notes covering every major topic in the senior secondary curriculum.', 'SSS 1-3', 'Arts', 'SSS 3', 1700, 4.8, 132, 'VERIFIED', '#9F1239', E'SSS3\nGOVT', 'Mrs. Adebayo', 'MA', true, true, 'approved'),
  ('primary-scheme-all', 'Primary 1–6 Scheme of Work Bundle', 'A complete year-round scheme of work bundle for core primary subjects.', 'Scheme of Work', 'Commercial', 'Primary 1-6', 2500, 4.9, 203, 'BESTSELLER', '#166534', E'PRIMARY\nBUNDLE', 'Mr. Ade', 'MA', true, true, 'approved'),
  ('jamb-english', 'JAMB Use of English Past Questions', 'Curated JAMB Use of English practice questions with answers and pacing guidance.', 'JAMB Past Q&A', 'English', 'UTME', 1100, 4.7, 148, null, '#0369A1', E'JAMB\nENGLISH', 'Miss Ibrahim', 'MI', true, true, 'approved'),
  ('lesson-plan-basic4', 'Basic 4 Weekly Lesson Plan Bundle', 'Ready-to-use weekly lesson plans for Basic 4 classroom teachers.', 'Lesson Plans', 'Commercial', 'Primary 4', 1300, 4.8, 101, 'VERIFIED', '#B45309', E'BASIC 4\nPLANS', 'Mrs. Okafor', 'MO', false, true, 'approved'),
  ('cbt-physics', 'SSCE Physics CBT Practice — 300 Questions', 'Three hundred CBT-style Physics questions to build confidence before exam day.', 'CBT Practice', 'Science', 'SSS 3', 1000, 4.6, 65, null, '#0F766E', E'PHYSICS\nCBT', 'Mr. Chukwu', 'MC', true, true, 'approved'),
  ('jss2-social-studies', 'JSS2 Social Studies Lesson Notes', 'Thoughtful Social Studies notes with Nigerian examples, classwork, and homework.', 'JSS 1-3', 'Arts', 'JSS 2', 800, 4.5, 47, null, '#7E22CE', E'JSS2\nSOCIAL', 'Mrs. Adebayo', 'MA', true, true, 'approved'),
  ('ss1-accounting', 'SSS1 Financial Accounting Made Simple', 'Practical Accounting notes that make ledgers, journals, and trial balances easier to teach.', 'SSS 1-3', 'Commercial', 'SSS 1', 1900, 4.9, 92, 'BESTSELLER', '#1D4ED8', E'SSS1\nACCOUNTS', 'Mr. Ade', 'MA', true, true, 'approved')
on conflict (id) do nothing;
