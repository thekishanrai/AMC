-- Add categories requested by the owner; retain every existing category.
alter table public.spots drop constraint if exists spots_category_check;
alter table public.spots add constraint spots_category_check
  check (category in ('trek', 'waterfall', 'camping', 'adventure', 'activity', 'sunset-point', 'view-point', 'dam', 'bike-ride-trail'));
