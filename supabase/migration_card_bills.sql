-- =====================================================================
-- Aba "Cartão": fatura parcial do cartão num ciclo (valor atualizado à mão).
-- Rode UMA vez no SQL Editor.
-- =====================================================================
create table if not exists card_bills (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  cycle_id     text not null,
  account_id   uuid references accounts(id) on delete cascade,
  amount       numeric(12,2) not null,
  unique (household_id, cycle_id, account_id)
);

alter table card_bills enable row level security;

create policy card_bills_access on card_bills
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));
