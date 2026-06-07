-- =====================================================================
-- Empreendimentos: datas no bem + gasto mensal por bem (asset_outlays).
-- Rode UMA vez no SQL Editor.
-- =====================================================================
alter table investments add column if not exists start_date date;
alter table investments add column if not exists end_date date;
alter table investments add column if not exists monthly_cost numeric(12,2);

create table if not exists asset_outlays (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  cycle_id     text not null,
  asset_id     uuid not null references investments(id) on delete cascade,
  amount       numeric(12,2) not null,
  unique (household_id, cycle_id, asset_id)
);

alter table asset_outlays enable row level security;

create policy asset_outlays_access on asset_outlays
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));
