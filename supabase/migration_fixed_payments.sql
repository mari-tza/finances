-- =====================================================================
-- Marcar custos fixos como pagos por ciclo (presença na tabela = pago).
-- Rode UMA vez no SQL Editor.
-- =====================================================================
create table if not exists fixed_payments (
  household_id     uuid not null references households(id) on delete cascade,
  cycle_id         text not null,
  fixed_expense_id uuid not null references fixed_expenses(id) on delete cascade,
  primary key (household_id, cycle_id, fixed_expense_id)
);

alter table fixed_payments enable row level security;

create policy fixed_payments_access on fixed_payments
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));
