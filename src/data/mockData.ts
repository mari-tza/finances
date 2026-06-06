import type {
  Account,
  Category,
  Expense,
  FixedExpense,
  Household,
  IncomeSource,
  Installment,
  Investment,
  Scenario,
} from '../types'

// ⚠️ DADOS DE EXEMPLO (em memória) — só para validar o visual e o fluxo.
// Na Fase 2 isto será substituído pelos dados reais do Supabase.

export const household: Household = {
  id: 'house-1',
  name: 'Nossa Casa',
  closingDay: 5, // dia de fechamento da fatura do cartão
}

// Cartões/bancos usados (tag opcional nos gastos).
export const accounts: Account[] = [
  { id: 'acc-itau', name: 'Itaú' },
  { id: 'acc-nubank', name: 'Nubank' },
]

export const categories: Category[] = [
  { id: 'cat-mercado', name: 'Mercado', color: '#0d9488', icon: '🛒' },
  { id: 'cat-restaurante', name: 'Restaurantes & Delivery', color: '#ea580c', icon: '🍽️' },
  { id: 'cat-transporte', name: 'Transporte', color: '#7c3aed', icon: '🚗' },
  { id: 'cat-viagens', name: 'Viagens', color: '#0284c7', icon: '✈️' },
  { id: 'cat-assinaturas', name: 'Assinaturas', color: '#6366f1', icon: '🔁' },
  { id: 'cat-lazer', name: 'Lazer & Entretenimento', color: '#db2777', icon: '🎉' },
  { id: 'cat-esporte', name: 'Esporte & Hobby', color: '#16a34a', icon: '🏋️' },
  { id: 'cat-vestuario', name: 'Vestuário', color: '#e11d48', icon: '👗' },
  { id: 'cat-saude', name: 'Saúde & Beleza', color: '#dc2626', icon: '💊' },
  { id: 'cat-pets', name: 'Pets', color: '#ca8a04', icon: '🐾' },
  { id: 'cat-casa', name: 'Casa & Utilidades', color: '#2563eb', icon: '🏠' },
  { id: 'cat-seguros', name: 'Seguros', color: '#0891b2', icon: '🛡️' },
  { id: 'cat-doacoes', name: 'Doações', color: '#9333ea', icon: '❤️' },
  { id: 'cat-investimentos', name: 'Investimentos', color: '#0d9488', icon: '💎' },
  { id: 'cat-tarifas', name: 'Tarifas & Encargos', color: '#64748b', icon: '🏦' },
  { id: 'cat-trabalho', name: 'Trabalho', color: '#475569', icon: '💼' },
  { id: 'cat-outros', name: 'Outros', color: '#94a3b8', icon: '📦' },
]

export const incomeSources: IncomeSource[] = [
  {
    id: 'inc-1',
    name: 'Salário CLT',
    amount: 6500,
    payDay: 5,
    active: true,
    taxPercent: 11,
    discount: 250, // ex.: plano de saúde / consignado (após imposto, antes do dízimo)
    tithePercent: 10,
  },
  {
    id: 'inc-2',
    name: 'Salário 2',
    amount: 5200,
    payDay: 10,
    active: true,
    taxPercent: 8,
    tithePercent: 10,
  },
  {
    id: 'inc-3',
    name: 'Freelas (média)',
    amount: 1200,
    payDay: 20,
    active: true,
    tithePercent: 10, // só dízimo, sem imposto
  },
]

/** Gera gastos de exemplo para um dado ciclo (descrições variam por ciclo). */
export function sampleExpensesFor(
  cycleId: string,
  startDate: string,
  seed: number,
): Expense[] {
  const base = startDate.slice(0, 7) // yyyy-mm
  const mk = (
    n: number,
    description: string,
    amount: number,
    categoryId: string,
    day: string,
    accountId?: string,
  ): Expense => ({
    id: `${cycleId}-exp-${n}`,
    cycleId,
    description,
    amount,
    categoryId,
    date: `${base}-${day}`,
    accountId,
  })

  const wobble = (v: number) => Math.round(v * (1 + (seed % 5) * 0.04))

  return [
    mk(1, 'Compra do mês', wobble(820), 'cat-mercado', '08', 'acc-itau'),
    mk(3, 'Gasolina', wobble(260), 'cat-transporte', '12', 'acc-itau'),
    mk(4, 'Cinema + jantar', wobble(180), 'cat-lazer', '15', 'acc-itau'),
    mk(5, 'Farmácia', wobble(95), 'cat-saude', '17', 'acc-nubank'),
    mk(6, 'iFood', wobble(140), 'cat-restaurante', '19', 'acc-itau'),
    mk(7, 'Feira', wobble(110), 'cat-mercado', '22', 'acc-nubank'),
    mk(8, 'Uber', wobble(75), 'cat-transporte', '25', 'acc-itau'),
  ]
}

// Custos fixos recorrentes — entram em todo ciclo automaticamente.
export const fixedExpenses: FixedExpense[] = [
  { id: 'fix-1', name: 'Aluguel', amount: 2200, categoryId: 'cat-casa', active: true },
  { id: 'fix-2', name: 'Internet', amount: 120, categoryId: 'cat-casa', active: true },
  { id: 'fix-3', name: 'Academia', amount: 180, categoryId: 'cat-esporte', active: true },
  { id: 'fix-4', name: 'Streamings', amount: 75, categoryId: 'cat-assinaturas', active: true },
  // Consórcio: aporte mensal (sai do caixa) que acumula no Patrimônio.
  {
    id: 'fix-consorcio',
    name: 'Consórcio',
    amount: 5000,
    categoryId: 'cat-investimentos',
    active: true,
    isInvestment: true,
    investedSoFar: 45000,
  },
  // IPTU vinculado ao terreno (custo fixo de um bem).
  {
    id: 'fix-iptu-terreno',
    name: 'IPTU Terreno',
    amount: 150,
    categoryId: 'cat-casa',
    active: true,
    assetId: 'bem-1',
  },
]

// Compras parceladas de exemplo. Recebe os ids dos ciclos pois eles são
// gerados em tempo de execução (a 1ª parcela cai num ciclo específico).
export function makeSampleInstallments(
  currentCycleId: string,
  nextCycleId: string,
): Installment[] {
  return [
    {
      id: 'inst-1',
      description: 'Geladeira',
      installmentAmount: 320,
      count: 10,
      firstCycleId: currentCycleId,
      categoryId: 'cat-casa',
      accountId: 'acc-itau',
    },
    {
      id: 'inst-2',
      description: 'Notebook',
      installmentAmount: 500,
      count: 6,
      firstCycleId: nextCycleId,
      categoryId: 'cat-casa',
      accountId: 'acc-itau',
    },
  ]
}

export const investments: Investment[] = [
  { id: 'inv-1', name: 'Tesouro Selic', kind: 'yield', balance: 25000, monthlyRatePercent: 0.9 },
  { id: 'inv-2', name: 'CDB Banco X', kind: 'yield', balance: 18000, monthlyRatePercent: 1.0 },
  { id: 'inv-3', name: 'Reserva de emergência', kind: 'yield', balance: 12000, monthlyRatePercent: 0.8 },
  // Bens (terrenos/construção): valor no patrimônio + custos vinculados
  { id: 'bem-1', name: 'Terreno Bairro Verde', kind: 'bem', balance: 120000 },
  { id: 'bem-2', name: 'Construção da casa', kind: 'bem', balance: 80000 },
]

export const scenarios: Scenario[] = [
  {
    id: 'scn-1',
    name: 'Proposta — Empresa X',
    notes: 'Salário maior, mas teria custo de transporte e almoço fora.',
    items: [
      { id: 'si-1', kind: 'income', name: 'Novo salário (diferença)', amount: 2500 },
      { id: 'si-2', kind: 'expense', name: 'Transporte extra', amount: 350 },
      { id: 'si-3', kind: 'expense', name: 'Almoços', amount: 600 },
    ],
  },
]
