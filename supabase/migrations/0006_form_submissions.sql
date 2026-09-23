-- Four focused tables mirror the four public forms, so submissions are browsable
-- without filtering a generic JSON payload. Server route only; no client policies.

create table if not exists public.location_requests (
  id uuid primary key default gen_random_uuid(),
  place_name text not null,
  map_link_or_area text not null,
  place_type text not null,
  reason text not null,
  contact text not null,
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size integer,
  page_path text,
  user_agent text,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  surface text not null,
  feeling text not null,
  feedback text not null,
  page_link text,
  contact text,
  page_path text,
  user_agent text,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  broken_area text not null,
  actual_behavior text not null,
  expected_behavior text,
  device_browser text,
  contact text,
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size integer,
  page_path text,
  user_agent text,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  reason text not null,
  sender_name text not null,
  contact text not null,
  subject text not null,
  message text not null,
  page_path text,
  user_agent text,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists location_requests_rate_idx on public.location_requests (ip_hash, created_at desc);
create index if not exists feedback_submissions_rate_idx on public.feedback_submissions (ip_hash, created_at desc);
create index if not exists bug_reports_rate_idx on public.bug_reports (ip_hash, created_at desc);
create index if not exists contact_messages_rate_idx on public.contact_messages (ip_hash, created_at desc);

alter table public.location_requests enable row level security;
alter table public.feedback_submissions enable row level security;
alter table public.bug_reports enable row level security;
alter table public.contact_messages enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('form-attachments', 'form-attachments', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
