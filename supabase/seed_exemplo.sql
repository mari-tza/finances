-- =====================================================================
-- Conta de EXEMPLO para divulgação. Cria a "Casa Exemplo" cheia de dados
-- e liga ao usuário exemplo@exemplo.com.
-- Rode UMA vez no SQL Editor. (Pode apagar essa casa depois, se quiser.)
-- =====================================================================
do $$
declare
  hid        uuid;
  acc_itau   uuid;
  acc_nubank uuid;
  terreno_id uuid;
  obra_id    uuid;
  aluguel_id uuid;
  internet_id uuid;
  scn_id     uuid;
  cur  text := 'cycle-2026-07-05';  -- ciclo atual (Jul/2026): 06/06 a 05/07
  prev text := 'cycle-2026-06-05';  -- ciclo anterior (Jun/2026)
begin
  -- Casa + membro
  insert into households (name, closing_day) values ('Casa Exemplo', 5)
  returning id into hid;
  insert into household_members (household_id, user_id, display_name)
  values (hid, '5321d354-d190-4f94-b6b5-e668cfa8c166', 'Visitante');

  -- Cartões
  insert into accounts (household_id, name) values (hid, 'Itaú') returning id into acc_itau;
  insert into accounts (household_id, name) values (hid, 'Nubank') returning id into acc_nubank;

  -- Categorias
  insert into categories (household_id, name, color, icon) values
    (hid, 'Mercado', '#0d9488', '🛒'),
    (hid, 'Restaurantes & Delivery', '#ea580c', '🍽️'),
    (hid, 'Transporte', '#7c3aed', '🚗'),
    (hid, 'Viagens', '#0284c7', '✈️'),
    (hid, 'Assinaturas', '#6366f1', '🔁'),
    (hid, 'Lazer & Entretenimento', '#db2777', '🎉'),
    (hid, 'Esporte & Hobby', '#16a34a', '🏋️'),
    (hid, 'Vestuário', '#e11d48', '👗'),
    (hid, 'Saúde & Beleza', '#dc2626', '💊'),
    (hid, 'Pets', '#ca8a04', '🐾'),
    (hid, 'Casa & Utilidades', '#2563eb', '🏠'),
    (hid, 'Seguros', '#0891b2', '🛡️'),
    (hid, 'Doações', '#9333ea', '❤️'),
    (hid, 'Investimentos', '#0d9488', '💎'),
    (hid, 'Tarifas & Encargos', '#64748b', '🏦'),
    (hid, 'Trabalho', '#475569', '💼'),
    (hid, 'Outros', '#94a3b8', '📦');

  -- Rendas (com imposto/desconto/dízimo)
  insert into income_sources (household_id, name, amount, pay_day, active, tax_percent, discount, tithe_percent) values
    (hid, 'Salário', 7000, 5, true, 11, 200, 10),
    (hid, 'Salário 2', 4500, 5, true, 8, null, 10),
    (hid, 'Freela (média)', 900, 20, true, null, null, 10);

  -- Investimentos que rendem
  insert into investments (household_id, name, kind, balance, monthly_rate_percent) values
    (hid, 'Tesouro Selic', 'yield', 15000, 0.9),
    (hid, 'CDB Banco X', 'yield', 8000, 1.0),
    (hid, 'Reserva de emergência', 'yield', 5000, 0.8);

  -- Bens / empreendimentos
  insert into investments (household_id, name, kind, balance, monthly_cost)
  values (hid, 'Terreno Bairro Novo', 'bem', 90000, 0) returning id into terreno_id;
  insert into investments (household_id, name, kind, balance, monthly_cost, start_date)
  values (hid, 'Construção da casa', 'bem', 0, 6000, '2026-05-01') returning id into obra_id;

  -- Custos fixos
  insert into fixed_expenses (household_id, name, amount, category_id, active)
  values (hid, 'Aluguel', 1800, (select id from categories where household_id=hid and name='Casa & Utilidades'), true)
  returning id into aluguel_id;
  insert into fixed_expenses (household_id, name, amount, category_id, active)
  values (hid, 'Internet', 120, (select id from categories where household_id=hid and name='Casa & Utilidades'), true)
  returning id into internet_id;
  insert into fixed_expenses (household_id, name, amount, category_id, active) values
    (hid, 'Academia', 150, (select id from categories where household_id=hid and name='Esporte & Hobby'), true),
    (hid, 'Streamings', 60, (select id from categories where household_id=hid and name='Assinaturas'), true);
  -- Consórcio (aporte que é custo, fora da projeção)
  insert into fixed_expenses (household_id, name, amount, category_id, active, is_investment, invested_so_far)
  values (hid, 'Consórcio', 1500, (select id from categories where household_id=hid and name='Investimentos'), true, true, 18000);
  -- IPTU vinculado ao terreno
  insert into fixed_expenses (household_id, name, amount, category_id, active, asset_id)
  values (hid, 'IPTU Terreno', 90, (select id from categories where household_id=hid and name='Casa & Utilidades'), true, terreno_id);

  -- Gastos do ciclo atual (datas dentro de 06/06–05/07)
  insert into expenses (household_id, cycle_id, description, amount, category_id, date, account_id) values
    (hid, cur, 'Supermercado', 420, (select id from categories where household_id=hid and name='Mercado'), '2026-06-10', acc_itau),
    (hid, cur, 'iFood', 89, (select id from categories where household_id=hid and name='Restaurantes & Delivery'), '2026-06-12', acc_itau),
    (hid, cur, 'Posto Shell', 200, (select id from categories where household_id=hid and name='Transporte'), '2026-06-13', acc_itau),
    (hid, cur, 'Farmácia', 75, (select id from categories where household_id=hid and name='Saúde & Beleza'), '2026-06-15', acc_nubank),
    (hid, cur, 'Cinema', 60, (select id from categories where household_id=hid and name='Lazer & Entretenimento'), '2026-06-18', acc_itau),
    (hid, cur, 'Feira', 95, (select id from categories where household_id=hid and name='Mercado'), '2026-06-20', acc_nubank);
  -- Gastos do ciclo anterior
  insert into expenses (household_id, cycle_id, description, amount, category_id, date, account_id) values
    (hid, prev, 'Supermercado', 380, (select id from categories where household_id=hid and name='Mercado'), '2026-05-20', acc_itau),
    (hid, prev, 'Restaurante', 120, (select id from categories where household_id=hid and name='Restaurantes & Delivery'), '2026-05-25', acc_itau);

  -- Compras parceladas
  insert into installments (household_id, description, installment_amount, installments_count, first_cycle_id, category_id, account_id, start_number, total_parcelas) values
    (hid, 'Geladeira', 320, 10, cur, (select id from categories where household_id=hid and name='Casa & Utilidades'), acc_itau, 1, 10),
    (hid, 'Notebook', 500, 6, prev, (select id from categories where household_id=hid and name='Casa & Utilidades'), acc_itau, 1, 6);

  -- Fatura parcial do cartão (ciclo atual)
  insert into card_bills (household_id, cycle_id, account_id, amount) values
    (hid, cur, acc_itau, 1500),
    (hid, cur, acc_nubank, 350);

  -- Gasto adicional do empreendimento no ciclo atual (balão)
  insert into asset_outlays (household_id, cycle_id, asset_id, amount)
  values (hid, cur, obra_id, 2000);

  -- Custos fixos já pagos neste ciclo (exemplo)
  insert into fixed_payments (household_id, cycle_id, fixed_expense_id) values
    (hid, cur, aluguel_id),
    (hid, cur, internet_id);

  -- Cenário de projeção
  insert into scenarios (household_id, name, notes)
  values (hid, 'Proposta — Empresa X', 'Salário maior, mas com mais custos.')
  returning id into scn_id;
  insert into scenario_items (scenario_id, kind, name, amount) values
    (scn_id, 'income', 'Aumento de salário', 2500),
    (scn_id, 'expense', 'Transporte extra', 300),
    (scn_id, 'expense', 'Almoços', 500);
end $$;
