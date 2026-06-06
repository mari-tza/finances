-- =====================================================================
-- Finanças da Casa — esquema do banco + Row Level Security (RLS)
-- Fase 2: cole isto no SQL Editor do Supabase e rode (Run).
-- =====================================================================

-- ---- Tabelas -------------------------------------------------------

create table households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  closing_day int  not null check (closing_day between 1 and 28),
  created_at  timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  primary key (household_id, user_id)
);

create table income_sources (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,
  amount        numeric(12,2) not null,            -- valor BRUTO mensal
  pay_day       int  not null check (pay_day between 1 and 31),
  active        boolean not null default true,
  -- Descontos opcionais. Ordem no app: 1º imposto (% do bruto),
  -- 2º desconto (R$ fixo), 3º dízimo (% do valor já com imposto e desconto).
  tax_percent   numeric(5,2) check (tax_percent between 0 and 100),    -- imposto %, opcional
  discount      numeric(12,2),                                          -- desconto R$ fixo, opcional
  tithe_percent numeric(5,2) check (tithe_percent between 0 and 100)   -- dízimo %, opcional
);

create table categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  color        text not null default '#64748b',
  icon         text not null default '📦'
);

-- Cartões/bancos usados como etiqueta nos gastos (ex.: Itaú, Nubank).
create table accounts (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null
);

create table cycles (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  label        text not null,
  start_date   date not null,
  end_date     date not null,
  closing_day  int  not null,
  unique (household_id, start_date)
);

create table cycle_incomes (
  id        uuid primary key default gen_random_uuid(),
  cycle_id  uuid not null references cycles(id) on delete cascade,
  source_id uuid references income_sources(id) on delete set null,
  name      text not null,
  amount    numeric(12,2) not null
);

create table expenses (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  cycle_id     text not null,              -- id do ciclo (calculado no app), ex.: 'cycle-2026-08-05'
  description  text not null,
  amount       numeric(12,2) not null,
  category_id  uuid references categories(id) on delete set null,
  date         date not null,
  account_id   uuid references accounts(id) on delete set null,   -- cartão/banco
  import_hash  text,                       -- dedupe de fatura importada (data+nome+valor+cartão)
  asset_id     uuid,                       -- bem vinculado (FK adicionada após 'investments')
  created_at   timestamptz not null default now()
);

create table scenarios (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  notes        text not null default '',
  created_at   timestamptz not null default now()
);

create table scenario_items (
  id          uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references scenarios(id) on delete cascade,
  kind        text not null check (kind in ('income','expense')),
  name        text not null,
  amount      numeric(12,2) not null
);

-- Custos fixos recorrentes: entram automaticamente em todo ciclo.
create table fixed_expenses (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,
  amount        numeric(12,2) not null,
  category_id   uuid references categories(id) on delete set null,
  active        boolean not null default true,
  is_investment boolean not null default false,     -- aporte (ex.: consórcio): acumula no patrimônio
  invested_so_far numeric(14,2),                     -- total já aportado até hoje
  asset_id      uuid                                 -- vínculo a um bem (FK adicionada após 'investments')
);

-- Compras parceladas: geram uma parcela por ciclo a partir do ciclo inicial.
create table installments (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null references households(id) on delete cascade,
  description        text not null,
  installment_amount numeric(12,2) not null,        -- valor de cada parcela
  installments_count int  not null check (installments_count >= 1),  -- parcelas que ESTE registro gera
  first_cycle_id     text,                          -- id do ciclo da 1ª parcela (calculado no app)
  category_id        uuid references categories(id) on delete set null,
  account_id         uuid references accounts(id) on delete set null,   -- cartão/banco
  start_number       int not null default 1,        -- nº da 1ª parcela (ex.: 4, quando importada no meio)
  total_parcelas     int                            -- total original p/ exibição (ex.: 10)
);

-- Patrimônio: 'yield' = renda fixa que rende % ao mês; 'bem' = imóvel/terreno
-- (valor, sem render). Aportes (consórcio) ficam em fixed_expenses.is_investment.
create table investments (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references households(id) on delete cascade,
  name                text not null,
  kind                text not null default 'yield' check (kind in ('yield','bem')),
  balance             numeric(14,2) not null,       -- 'yield': saldo · 'bem': valor
  monthly_rate_percent numeric(6,3)                 -- rendimento % ao mês (só 'yield')
);

-- Vínculos de custos a um bem (criados aqui pois referenciam 'investments').
alter table expenses
  add constraint expenses_asset_fk
  foreign key (asset_id) references investments(id) on delete set null;
alter table fixed_expenses
  add constraint fixed_expenses_asset_fk
  foreign key (asset_id) references investments(id) on delete set null;

-- Dicionário aprendido de categorização: estabelecimento -> categoria.
-- O app preenche conforme você recategoriza manualmente na importação.
create table merchant_rules (
  household_id uuid not null references households(id) on delete cascade,
  merchant_key text not null,                                    -- nome normalizado (MAIÚSCULAS, sem parcela/cidade)
  category_id  uuid references categories(id) on delete set null,
  primary key (household_id, merchant_key)
);

-- ---- Helper: a quais casas o usuário logado pertence ---------------

create or replace function my_household_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select household_id from household_members where user_id = auth.uid()
$$;

-- ---- Row Level Security -------------------------------------------
-- Regra geral: só acessa linhas cuja household_id é uma das suas casas.
-- Como só vocês dois serão membros, só vocês acessam os dados.

alter table households        enable row level security;
alter table household_members enable row level security;
alter table income_sources    enable row level security;
alter table categories        enable row level security;
alter table accounts          enable row level security;
alter table cycles            enable row level security;
alter table cycle_incomes     enable row level security;
alter table expenses          enable row level security;
alter table scenarios         enable row level security;
alter table scenario_items    enable row level security;
alter table fixed_expenses    enable row level security;
alter table installments      enable row level security;
alter table investments       enable row level security;
alter table merchant_rules    enable row level security;

-- households: vê/edita as casas das quais é membro
create policy households_access on households
  for all using (id in (select my_household_ids()))
  with check (id in (select my_household_ids()));

-- household_members: vê os membros das suas casas
create policy members_access on household_members
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

-- Tabelas com household_id direto
create policy income_sources_access on income_sources
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy categories_access on categories
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy accounts_access on accounts
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy cycles_access on cycles
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy scenarios_access on scenarios
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy fixed_expenses_access on fixed_expenses
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy installments_access on installments
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy investments_access on investments
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy merchant_rules_access on merchant_rules
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

-- Tabelas filhas: herdam o acesso via o pai
create policy cycle_incomes_access on cycle_incomes
  for all using (
    cycle_id in (select id from cycles where household_id in (select my_household_ids()))
  )
  with check (
    cycle_id in (select id from cycles where household_id in (select my_household_ids()))
  );

create policy expenses_access on expenses
  for all using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy scenario_items_access on scenario_items
  for all using (
    scenario_id in (select id from scenarios where household_id in (select my_household_ids()))
  )
  with check (
    scenario_id in (select id from scenarios where household_id in (select my_household_ids()))
  );

-- =====================================================================
-- Depois de criar os 2 usuários (Authentication → Users), rode algo como:
--
--   insert into households (name, closing_day) values ('Nossa Casa', 5)
--     returning id;   -- copie o id
--
--   insert into household_members (household_id, user_id, display_name)
--   values
--     ('<household_id>', '<seu_user_id>',      'Maritza'),
--     ('<household_id>', '<user_id_vinicius>', 'Vinicius');
--
--   insert into accounts (household_id, name)
--   values ('<household_id>', 'Itaú'), ('<household_id>', 'Nubank');
-- =====================================================================
