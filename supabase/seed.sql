-- =====================================================================
-- Seed inicial: cria a "casa", liga os 2 logins, e cadastra cartões +
-- categorias. Rode UMA vez no SQL Editor depois do schema.sql.
-- =====================================================================
do $$
declare hid uuid;
begin
  -- A casa (dia de fechamento 5)
  insert into households (name, closing_day) values ('Nossa Casa', 5)
  returning id into hid;

  -- Liga os dois usuários à mesma casa
  insert into household_members (household_id, user_id, display_name) values
    (hid, '2845ce6f-2454-416b-8e0e-176601bdeffd', 'Maritza'),
    (hid, '7bbe4aa4-6fcf-4269-a13b-87dc6f9f9f63', 'Vinicius');

  -- Cartões / bancos
  insert into accounts (household_id, name) values
    (hid, 'Itaú'), (hid, 'Nubank');

  -- Categorias (as mesmas do app)
  insert into categories (household_id, name, color, icon) values
    (hid, 'Mercado',                 '#0d9488', '🛒'),
    (hid, 'Restaurantes & Delivery', '#ea580c', '🍽️'),
    (hid, 'Transporte',              '#7c3aed', '🚗'),
    (hid, 'Viagens',                 '#0284c7', '✈️'),
    (hid, 'Assinaturas',             '#6366f1', '🔁'),
    (hid, 'Lazer & Entretenimento',  '#db2777', '🎉'),
    (hid, 'Esporte & Hobby',         '#16a34a', '🏋️'),
    (hid, 'Vestuário',               '#e11d48', '👗'),
    (hid, 'Saúde & Beleza',          '#dc2626', '💊'),
    (hid, 'Pets',                    '#ca8a04', '🐾'),
    (hid, 'Casa & Utilidades',       '#2563eb', '🏠'),
    (hid, 'Seguros',                 '#0891b2', '🛡️'),
    (hid, 'Doações',                 '#9333ea', '❤️'),
    (hid, 'Investimentos',           '#0d9488', '💎'),
    (hid, 'Tarifas & Encargos',      '#64748b', '🏦'),
    (hid, 'Trabalho',                '#475569', '💼'),
    (hid, 'Outros',                  '#94a3b8', '📦');
end $$;

-- Conferência (opcional): deve mostrar 1 casa, 2 membros, 2 cartões, 17 categorias
select
  (select count(*) from households)        as casas,
  (select count(*) from household_members) as membros,
  (select count(*) from accounts)          as cartoes,
  (select count(*) from categories)        as categorias;
