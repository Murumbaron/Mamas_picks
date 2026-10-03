-- ============================================================
-- Mama Picks Kenya: optional upgrade (run ONCE, after supabase-setup.sql)
--
-- Adds:
--   * an "Extra badge" field for products (Staff pick, Mum tested)
--   * anonymous click and share counting, shown on the dashboard's Insights tab
--
-- Supabase dashboard > SQL Editor > New query > paste everything > Run.
-- Safe to run again. It does not change your existing products, photos or login.
-- ============================================================

-- ---------- Extra badge on products ----------
alter table public.products add column if not exists badge text not null default '';

-- ---------- Click and share events ----------
create table if not exists public.click_events (
  id         bigint generated always as identity primary key,
  product_id text not null,
  kind       text not null default 'click',     -- 'click' or 'share'
  created_at timestamptz not null default now()
);

alter table public.click_events enable row level security;

-- Visitors can only ADD a record (nothing identifying), never read or change them.
drop policy if exists "visitors can log a click" on public.click_events;
create policy "visitors can log a click" on public.click_events
  for insert with check (
    length(product_id) between 1 and 80
    and kind in ('click', 'share')
  );

drop policy if exists "admin can read clicks" on public.click_events;
create policy "admin can read clicks" on public.click_events
  for select using (public.is_admin());

drop policy if exists "admin can delete clicks" on public.click_events;
create policy "admin can delete clicks" on public.click_events
  for delete using (public.is_admin());

grant insert on public.click_events to anon, authenticated;
grant select, delete on public.click_events to authenticated;

-- ---------- Summary used by the Insights tab (admin only) ----------
create or replace function public.click_summary(days integer default 30)
returns table (product_id text, clicks bigint, shares bigint, last_click timestamptz)
language sql stable security definer set search_path = public as $$
  select e.product_id,
         count(*) filter (where e.kind = 'click'),
         count(*) filter (where e.kind = 'share'),
         max(e.created_at)
  from public.click_events e
  where public.is_admin()
    and e.created_at >= now() - make_interval(days => days)
  group by e.product_id;
$$;

grant execute on function public.click_summary(integer) to authenticated;
