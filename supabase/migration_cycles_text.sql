-- =====================================================================
-- Os ciclos passam a ser CALCULADOS no app. O gasto guarda o "id do ciclo"
-- como TEXTO. Como a segurança (RLS) dos gastos dependia do cycle_id, damos
-- a eles um household_id próprio e trocamos a política para usá-lo.
-- Rode UMA vez no SQL Editor.
-- =====================================================================

-- 1. Remove a política antiga (que dependia do cycle_id)
drop policy if exists expenses_access on expenses;

-- 2. Dá aos gastos um household_id próprio
alter table expenses
  add column if not exists household_id uuid references households(id) on delete cascade;

-- (Se houvesse gastos antigos, daria pra preencher pelo ciclo. Está vazio, ok.)

-- 3. Agora o cycle_id pode virar texto
alter table expenses drop constraint if exists expenses_cycle_id_fkey;
alter table expenses alter column cycle_id type text using cycle_id::text;

-- 4. Recria a política baseada no household_id (igual às outras tabelas)
create policy expenses_access on expenses
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

-- 5. installments: cycle_id da 1ª parcela vira texto
--    (a política de installments já é por household_id, então é direto)
alter table installments drop constraint if exists installments_first_cycle_id_fkey;
alter table installments alter column first_cycle_id type text using first_cycle_id::text;

-- (As tabelas cycles e cycle_incomes ficam sem uso — pode deixar quietas.)
