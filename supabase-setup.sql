-- ============================================================
-- Mama Picks Kenya: Supabase setup (run ONCE)
--
-- 1. Change the email on the line marked  <<< CHANGE THIS  to your own.
-- 2. Supabase dashboard > SQL Editor > New query > paste everything > Run.
--
-- It is safe to run again if something goes wrong.
-- ============================================================

-- ---------- Who is the admin? ----------
-- Only the account with this email can add, edit or delete anything.
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = lower('namisiron@gmail.com')   -- <<< CHANGE THIS
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- Products ----------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  category    text not null default '',
  image_url   text not null default '',
  link        text not null default '',
  price       text not null default '',
  trending    boolean not null default false,
  published   boolean not null default true,
  sort_order  integer not null default 0,     -- lower numbers show first
  created_at  timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "public can read published products" on public.products;
create policy "public can read published products" on public.products
  for select using (published = true or public.is_admin());

drop policy if exists "admin can add products" on public.products;
create policy "admin can add products" on public.products
  for insert with check (public.is_admin());

drop policy if exists "admin can edit products" on public.products;
create policy "admin can edit products" on public.products
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin can delete products" on public.products;
create policy "admin can delete products" on public.products
  for delete using (public.is_admin());

-- ---------- Heart (wishlist) counts ----------
create table if not exists public.wishlist_counts (
  product_id text primary key,             -- the product's id
  clicks     integer not null default 0,   -- real taps from visitors
  adjust     integer not null default 0    -- you can change this from the dashboard
);

alter table public.wishlist_counts enable row level security;

drop policy if exists "anyone can read counts" on public.wishlist_counts;
create policy "anyone can read counts" on public.wishlist_counts
  for select using (true);

drop policy if exists "admin can add counts" on public.wishlist_counts;
create policy "admin can add counts" on public.wishlist_counts
  for insert with check (public.is_admin());

drop policy if exists "admin can edit counts" on public.wishlist_counts;
create policy "admin can edit counts" on public.wishlist_counts
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin can delete counts" on public.wishlist_counts;
create policy "admin can delete counts" on public.wishlist_counts
  for delete using (public.is_admin());

-- Visitors add or remove one heart at a time through these two functions only.
create or replace function public.add_wish(pid text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if pid is null or length(pid) = 0 or length(pid) > 80 then return; end if;
  insert into public.wishlist_counts (product_id, clicks) values (pid, 1)
  on conflict (product_id) do update set clicks = public.wishlist_counts.clicks + 1;
end;
$$;

create or replace function public.remove_wish(pid text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.wishlist_counts set clicks = greatest(clicks - 1, 0) where product_id = pid;
end;
$$;

grant execute on function public.add_wish(text), public.remove_wish(text) to anon, authenticated;

-- ---------- Image storage ----------
-- A public bucket: anyone can VIEW the photos, only the admin can upload or delete.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "anyone can view product images" on storage.objects;
create policy "anyone can view product images" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "admin can upload product images" on storage.objects;
create policy "admin can upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin can replace product images" on storage.objects;
create policy "admin can replace product images" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin can delete product images" on storage.objects;
create policy "admin can delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());
