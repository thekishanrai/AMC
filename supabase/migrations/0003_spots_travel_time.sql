alter table public.spots
  add column if not exists time_by_car_minutes integer,
  add column if not exists time_by_bike_minutes integer;
