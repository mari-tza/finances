-- =====================================================================
-- Cria uma NOVA casa isolada (ex.: a dos sogros), separada das demais.
--
-- ANTES: em Authentication > Users, crie os 2 logins (Auto Confirm) e
-- copie os UIDs. Depois preencha os campos <...> abaixo e rode no SQL Editor.
-- (Pode ser 1 pessoa só: deixe apenas uma linha em household_members.)
-- =====================================================================
do $$
declare hid uuid;
begin
  insert into households (name, closing_day)
  values ('<NOME DA CASA>', 5)          -- ex.: 'Casa dos Sogros' / dia de fechamento
  returning id into hid;

  insert into household_members (household_id, user_id, display_name) values
    (hid, '<UID_PESSOA_1>', '<NOME 1>'),
    (hid, '<UID_PESSOA_2>', '<NOME 2>');

  -- Cartões iniciais (eles podem editar depois nas Configurações)
  insert into accounts (household_id, name) values
    (hid, 'Itaú'), (hid, 'Nubank');

  -- Categorias padrão
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
