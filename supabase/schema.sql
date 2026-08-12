-- Run this once in the Supabase project's SQL editor (Dashboard -> SQL Editor
-- -> New query -> paste -> Run). Safe to re-run: every statement is
-- idempotent.
--
-- Two tables, each holding a single JSON row — a 1:1 port of the two JSON
-- files this app used to keep in Vercel Blob (resume/content.json and
-- analytics/visits-*.json). Row Level Security is enabled with NO policies,
-- so anon/authenticated clients get zero access; the app only ever talks to
-- these tables with the service role key (server-only), which bypasses RLS.

create table if not exists resume_content (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table resume_content enable row level security;

create table if not exists analytics_data (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table analytics_data enable row level security;

-- Public bucket for profile photo / CV uploads: these are linked directly
-- from the site's HTML (img src, CV download links, og:image), so they need
-- to be readable by anyone without a signed URL — same access level the old
-- Vercel Blob uploads had.
insert into storage.buckets (id, name, public)
values ('resume-uploads', 'resume-uploads', true)
on conflict (id) do nothing;
