do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'spots_name_key'
  ) then
    alter table public.spots add constraint spots_name_key unique (name);
  end if;
end $$;
