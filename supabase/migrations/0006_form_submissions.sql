create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null check (form_type in ('request-location', 'share-feedback', 'report-bug', 'contact')),
  fields jsonb not null default '{}'::jsonb,
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size integer,
  page_path text,
  user_agent text,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists form_submissions_created_at_idx on public.form_submissions (created_at desc);
create index if not exists form_submissions_rate_idx on public.form_submissions (ip_hash, created_at desc);

alter table public.form_submissions enable row level security;
-- Deliberately no client policies. Reads/writes go through the server route only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('form-attachments', 'form-attachments', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
