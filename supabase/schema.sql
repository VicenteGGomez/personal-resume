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

-- Documents signed from /admin/firmas (see lib/signed-docs-store.ts). One row
-- per document: the record as JSON, plus its two hashes as columns so
-- /verify can find a document from the file alone. Same lockdown as the
-- tables above: RLS on, no policies, service role only.
create table if not exists signed_documents (
  id text primary key,
  data jsonb not null,
  original_sha256 text not null,
  signed_sha256 text not null,
  created_at timestamptz not null default now()
);
alter table signed_documents enable row level security;
create index if not exists signed_documents_signed_sha256 on signed_documents (signed_sha256);
create index if not exists signed_documents_original_sha256 on signed_documents (original_sha256);

-- PRIVATE bucket for the PDFs (original + signed) and your signature image.
-- Unlike resume-uploads, nothing here is linked directly: /verify hands
-- out a one-minute signed URL, and only for documents marked public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('signed-documents', 'signed-documents', false, 26214400,
        array['application/pdf', 'image/png'])
on conflict (id) do nothing;

-- Documents sent to others for signing (see lib/envelopes.ts). The status
-- column lets exactly one request claim the right to build the final PDF
-- when two people sign at the same moment; each signer is its own row for
-- the same reason. Rows saved before this existed are complete documents.
alter table signed_documents add column if not exists status text not null default 'completed';

create table if not exists document_signers (
  id text primary key,
  doc_id text not null references signed_documents (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table document_signers enable row level security;
create index if not exists document_signers_doc_id on document_signers (doc_id);
