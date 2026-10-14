-- LessonMart security and app support migration.
-- Run this against the existing profiles, products, and orders tables described
-- in the Supabase project. It does not seed, delete, or change product/order data.

create extension if not exists pgcrypto;

alter table public.profiles alter column role set default 'buyer';
alter table public.products alter column id set default gen_random_uuid();
alter table public.products alter column created_at set default now();
alter table public.products alter column status set default 'pending';
alter table public.orders alter column id set default gen_random_uuid();
alter table public.orders alter column created_at set default now();
alter table public.orders alter column status set default 'pending';
alter table public.orders alter column paystack_reference drop not null;

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists products_status_created_idx
  on public.products(status, created_at desc);
create index if not exists products_seller_created_idx
  on public.products(seller_id, created_at desc);
create index if not exists orders_buyer_created_idx
  on public.orders(buyer_id, created_at desc);
create index if not exists orders_product_status_idx
  on public.orders(product_id, status);
create index if not exists payout_requests_seller_status_idx
  on public.payout_requests(seller_id, status);

create or replace function public.is_lessonmart_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and lower(btrim(p.role)) = 'admin'
  );
$$;

create or replace function public.is_lessonmart_seller()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and lower(btrim(p.role)) in ('seller', 'admin')
  );
$$;

revoke all on function public.is_lessonmart_admin() from public;
revoke all on function public.is_lessonmart_seller() from public, anon;
grant execute on function public.is_lessonmart_admin() to anon, authenticated;
grant execute on function public.is_lessonmart_seller() to authenticated;

create or replace function public.handle_lessonmart_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), ''),
    case when lower(coalesce(new.email, '')) = 'ndukamoses@gmail.com' then 'admin' else 'buyer' end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    role = case
      when lower(excluded.email) = 'ndukamoses@gmail.com' then 'admin'
      else public.profiles.role
    end;
  return new;
end;
$$;

drop trigger if exists on_lessonmart_auth_user_created on auth.users;
drop trigger if exists on_lessonmart_auth_user_updated on auth.users;
create trigger on_lessonmart_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_lessonmart_auth_user();
create trigger on_lessonmart_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_lessonmart_auth_user();

-- Create missing profiles for existing Supabase Auth users and promote only the owner email.
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), ''),
  case when lower(coalesce(u.email, '')) = 'ndukamoses@gmail.com' then 'admin' else 'buyer' end
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
  role = case
    when lower(excluded.email) = 'ndukamoses@gmail.com' then 'admin'
    else public.profiles.role
  end;

-- Remove permissive temporary policies before installing the role-based rules below.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'products', 'orders', 'payout_requests')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.payout_requests enable row level security;

revoke all on public.profiles from public, anon, authenticated;
revoke all on public.products from public, anon, authenticated;
revoke all on public.orders from public, anon, authenticated;
revoke all on public.payout_requests from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.orders to authenticated;
grant select on public.payout_requests to authenticated;
grant update (status) on public.payout_requests to authenticated;

create policy profiles_read_self
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update_self
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy profiles_admin_read_all
  on public.profiles for select to authenticated
  using (public.is_lessonmart_admin());

create policy products_read_approved_owner_admin
  on public.products for select to anon, authenticated
  using (
    status = 'approved'
    or seller_id = (select auth.uid())
    or public.is_lessonmart_admin()
  );
create policy products_insert_pending_for_seller
  on public.products for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and status in ('pending', 'draft')
    and public.is_lessonmart_seller()
  );
create policy products_update_own_unapproved
  on public.products for update to authenticated
  using (
    seller_id = (select auth.uid())
    and status in ('pending', 'rejected', 'draft')
    and public.is_lessonmart_seller()
  )
  with check (
    seller_id = (select auth.uid())
    and status in ('pending', 'rejected', 'draft')
    and public.is_lessonmart_seller()
  );
create policy products_admin_manage
  on public.products for all to authenticated
  using (public.is_lessonmart_admin())
  with check (public.is_lessonmart_admin());

create policy orders_read_buyer_product_seller_admin
  on public.orders for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or public.is_lessonmart_admin()
    or exists (
      select 1
      from public.products p
      where p.id = orders.product_id
        and p.seller_id = (select auth.uid())
    )
  );

create policy payouts_read_owner_or_admin
  on public.payout_requests for select to authenticated
  using (seller_id = (select auth.uid()) or public.is_lessonmart_admin());
create policy payouts_admin_update
  on public.payout_requests for update to authenticated
  using (public.is_lessonmart_admin())
  with check (public.is_lessonmart_admin());

-- Public seller cards expose no email or private profile fields.
create or replace view public.seller_public_profiles as
select p.id, p.full_name, p.avatar_url
from public.profiles p
where exists (
  select 1
  from public.products product
  where product.seller_id = p.id
    and product.status = 'approved'
);
revoke all on public.seller_public_profiles from public;
grant select on public.seller_public_profiles to anon, authenticated;

create or replace function public.activate_lessonmart_seller()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_role text;
begin
  if current_user_id is null then
    raise exception 'Sign in before opening a seller account.';
  end if;
  update public.profiles
  set role = 'seller'
  where id = current_user_id and role = 'buyer';
  if found then return; end if;

  select role into current_role
  from public.profiles
  where id = current_user_id;
  if current_role in ('seller', 'admin') then return; end if;
  raise exception 'No buyer profile is available to activate.';
end;
$$;
revoke all on function public.activate_lessonmart_seller() from public, anon;
grant execute on function public.activate_lessonmart_seller() to authenticated;

create or replace function public.create_lessonmart_order(requested_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  chosen_product public.products%rowtype;
  new_order_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before creating an order.';
  end if;
  select * into chosen_product
  from public.products
  where id = requested_product_id and status = 'approved';
  if not found then
    raise exception 'This resource is no longer available.';
  end if;
  insert into public.orders (buyer_id, product_id, amount, paystack_reference, status)
  values (current_user_id, chosen_product.id, chosen_product.price, null, 'pending')
  returning id into new_order_id;
  return new_order_id;
end;
$$;
revoke all on function public.create_lessonmart_order(uuid) from public, anon;
grant execute on function public.create_lessonmart_order(uuid) to authenticated;

create or replace function public.request_lessonmart_payout(requested_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  earned numeric;
  reserved numeric;
  new_payout_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before requesting a payout.';
  end if;
  select coalesce(sum(o.amount), 0) into earned
  from public.orders o
  join public.products p on p.id = o.product_id
  where p.seller_id = current_user_id and o.status = 'paid';
  select coalesce(sum(amount), 0) into reserved
  from public.payout_requests
  where seller_id = current_user_id and status in ('pending', 'approved', 'paid');
  if requested_amount <= 0 or requested_amount > earned - reserved then
    raise exception 'The requested amount exceeds your available payout balance.';
  end if;
  insert into public.payout_requests (seller_id, amount, status)
  values (current_user_id, requested_amount, 'pending')
  returning id into new_payout_id;
  return new_payout_id;
end;
$$;
revoke all on function public.request_lessonmart_payout(numeric) from public, anon;
grant execute on function public.request_lessonmart_payout(numeric) to authenticated;

-- Ensure the expected buckets exist and have the requested visibility.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-files', 'lesson-files', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = false;
insert into storage.buckets (id, name, public)
values ('previews', 'previews', true), ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Drop temporary broad storage policies (e.g. "Allow all for now") so they cannot override these rules.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        lower(coalesce(qual, '')) in ('true', '(true)')
        or lower(coalesce(with_check, '')) in ('true', '(true)')
      )
  loop
    execute format('drop policy if exists %I on storage.objects', existing_policy.policyname);
  end loop;
end;
$$;

drop policy if exists lesson_files_upload_own on storage.objects;
create policy lesson_files_upload_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lesson-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists lesson_files_read_owner_admin_buyer on storage.objects;
create policy lesson_files_read_owner_admin_buyer
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lesson-files'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_lessonmart_admin()
      or exists (
        select 1
        from public.products p
        join public.orders o on o.product_id = p.id
        where p.file_url = storage.objects.name
          and o.buyer_id = (select auth.uid())
          and o.status = 'paid'
      )
    )
  );
drop policy if exists lesson_files_update_own_admin on storage.objects;
create policy lesson_files_update_own_admin
  on storage.objects for update to authenticated
  using (
    bucket_id = 'lesson-files'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_lessonmart_admin())
  )
  with check (
    bucket_id = 'lesson-files'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_lessonmart_admin())
  );
drop policy if exists lesson_files_delete_own_admin on storage.objects;
create policy lesson_files_delete_own_admin
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'lesson-files'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_lessonmart_admin())
  );

drop policy if exists previews_public_read on storage.objects;
create policy previews_public_read
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'previews');
drop policy if exists previews_upload_own on storage.objects;
create policy previews_upload_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'previews'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists previews_update_own_admin on storage.objects;
create policy previews_update_own_admin
  on storage.objects for update to authenticated
  using (
    bucket_id = 'previews'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_lessonmart_admin())
  )
  with check (
    bucket_id = 'previews'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_lessonmart_admin())
  );
drop policy if exists previews_delete_own_admin on storage.objects;
create policy previews_delete_own_admin
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'previews'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_lessonmart_admin())
  );

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');
drop policy if exists avatars_upload_own on storage.objects;
create policy avatars_upload_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists avatars_update_own_admin on storage.objects;
create policy avatars_update_own_admin
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_lessonmart_admin())
  )
  with check (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_lessonmart_admin())
  );
drop policy if exists avatars_delete_own_admin on storage.objects;
create policy avatars_delete_own_admin
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_lessonmart_admin())
  );
