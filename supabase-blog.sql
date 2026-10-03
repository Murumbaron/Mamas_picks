-- ============================================================
-- Mama Picks Kenya: blog setup (run ONCE, after supabase-setup.sql)
--
-- Adds the table for blog posts. It does not change your products,
-- photos, hearts or login. Blog images use the same photo storage you
-- already set up (they live in a "blog" folder).
--
-- Supabase dashboard > SQL Editor > New query > paste everything > Run.
-- Safe to run again.
-- ============================================================

create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,          -- the web address: post.html?slug=this-part
  excerpt         text not null default '',
  content         text not null default '',      -- cleaned HTML written in the dashboard editor
  cover_url       text not null default '',
  category        text not null default '',
  reading_minutes integer not null default 1,
  published       boolean not null default false,
  published_at    timestamptz,                   -- a future date schedules the post
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists posts_published_idx on public.posts (published, published_at desc);

alter table public.posts enable row level security;

-- Visitors see only published posts whose date has arrived. The admin sees everything.
drop policy if exists "public can read published posts" on public.posts;
create policy "public can read published posts" on public.posts
  for select using (
    (published = true and (published_at is null or published_at <= now()))
    or public.is_admin()
  );

drop policy if exists "admin can add posts" on public.posts;
create policy "admin can add posts" on public.posts
  for insert with check (public.is_admin());

drop policy if exists "admin can edit posts" on public.posts;
create policy "admin can edit posts" on public.posts
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin can delete posts" on public.posts;
create policy "admin can delete posts" on public.posts
  for delete using (public.is_admin());

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
