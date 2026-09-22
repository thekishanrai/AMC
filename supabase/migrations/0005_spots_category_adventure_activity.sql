-- Expand the existing category check without changing existing rows.
alter table public.spots drop constraint if exists spots_category_check;
alter table public.spots add constraint spots_category_check
  check (category in ('trek', 'waterfall', 'camping', 'adventure', 'activity'));
