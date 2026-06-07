// Modelo de dados do app — espelha as tabelas que criaremos no Supabase (Fase 2).

/** Cartão/banco usado em um gasto (ex.: Itaú, Nubank). */
export interface Account {
  id: string
  name: string
}

/** A casa compartilhada pelo casal. */
export interface Household {
  id: string
  name: string
  /** Dia de fechamento da fatura do cartão (1–28). Define a virada dos ciclos. */
  closingDay: number
}

/** Renda recorrente (template). Vira lançamentos em cada ciclo. */
export interface IncomeSource {
  id: string
  name: string
  /** Valor BRUTO mensal (antes de imposto e dízimo). */
  amount: number
  /** Dia do mês em que costuma cair (1–31). */
  payDay: number
  active: boolean
  /** Imposto em %, descontado primeiro. Opcional. */
  taxPercent?: number
  /** Desconto fixo em R$, aplicado DEPOIS do imposto e ANTES do dízimo. Opcional. */
  discount?: number
  /** Dízimo em %, sobre o valor já com imposto e desconto. Opcional. */
  tithePercent?: number
}

/** Renda lançada dentro de um ciclo específico (snapshot). */
export interface CycleIncome {
  id: string
  cycleId: string
  /** Origem no template, se veio de uma IncomeSource. */
  sourceId: string | null
  name: string
  /** Valor LÍQUIDO (já com imposto e dízimo descontados). */
  amount: number
  /** Snapshot do bruto e dos descontos, para exibição. */
  gross?: number
  taxPercent?: number
  discount?: number
  tithePercent?: number
}

/** Categoria de gasto. */
export interface Category {
  id: string
  name: string
  color: string
  icon: string
}

/** Um gasto lançado em um ciclo. */
export interface Expense {
  id: string
  cycleId: string
  description: string
  amount: number
  categoryId: string
  date: string // ISO yyyy-mm-dd
  /** Cartão/banco usado, se informado. */
  accountId?: string
  /** Bem (terreno/imóvel) ao qual este custo variável está vinculado, se houver. */
  assetId?: string
}

/** De onde vem um gasto exibido em um ciclo. */
export type ExpenseKind =
  | 'manual'
  | 'fixed'
  | 'installment'
  | 'cardbill'
  | 'outlay'

/** Quanto foi investido num bem/empreendimento num ciclo (preenchido à mão). */
export interface AssetOutlay {
  id: string
  cycleId: string
  assetId: string
  amount: number
}

/** Fatura parcial de um cartão num ciclo (valor atualizado à mão no mês). */
export interface CardBill {
  id: string
  cycleId: string
  accountId: string
  amount: number
}

/** Gasto exibido em um ciclo (manual, fixo ou parcela), já com a origem marcada. */
export interface DisplayExpense extends Expense {
  kind: ExpenseKind
  /** Texto auxiliar, ex.: "Parcela 3/10". */
  note?: string
  /** Id da origem (ex.: do custo fixo), para ações como marcar pago. */
  sourceId?: string
  /** Para custos fixos: se já foi pago neste ciclo. */
  paid?: boolean
  /** True se é um aporte (consórcio) — conta como "Investido", não "Gasto". */
  investment?: boolean
}

/** Custo fixo recorrente (template). Entra automaticamente em cada ciclo. */
export interface FixedExpense {
  id: string
  name: string
  amount: number
  categoryId: string
  active: boolean
  /** Se true, além de sair do caixa, acumula no Patrimônio (ex.: consórcio). */
  isInvestment?: boolean
  /** Total já aportado até hoje (informado pelo usuário) — base do acumulado. */
  investedSoFar?: number
  /** Bem (terreno/imóvel) ao qual este custo fixo está vinculado, se houver. */
  assetId?: string
}

/** Compra parcelada. Gera uma parcela por ciclo, a partir do ciclo inicial. */
export interface Installment {
  id: string
  description: string
  /** Valor de cada parcela. */
  installmentAmount: number
  /** Quantas parcelas este registro gera (a partir do ciclo inicial). */
  count: number
  /** Ciclo em que cai a 1ª parcela deste registro. */
  firstCycleId: string
  categoryId: string
  /** Cartão/banco usado, se informado. */
  accountId?: string
  /** Nº da 1ª parcela gerada (ex.: 4, quando importada já no meio). Padrão 1. */
  startNumber?: number
  /** Total original de parcelas, para exibição (ex.: 10). Padrão = count. */
  totalParcelas?: number
}

/** Uma "página" de ciclo mensal (do dia seguinte ao fechamento até o próximo fechamento). */
export interface Cycle {
  id: string
  label: string // ex.: "Jun/2026"
  startDate: string // ISO yyyy-mm-dd
  endDate: string // ISO yyyy-mm-dd
  closingDay: number
}

/**
 * Item de patrimônio.
 * - 'yield': renda fixa que rende % ao mês (reinvestido).
 * - 'bem': bem físico (terreno/imóvel/construção) com um valor; pode ter custos
 *   fixos e variáveis vinculados (não rende sozinho).
 * (Aportes como consórcio são modelados como custo fixo com isInvestment.)
 */
export interface Investment {
  id: string
  name: string
  kind: 'yield' | 'bem'
  /** 'yield': saldo aplicado · 'bem': valor do bem. Em R$. */
  balance: number
  /** Rendimento em % ao mês (só 'yield'). */
  monthlyRatePercent?: number
  /** Custo mensal base do empreendimento (só 'bem'): replica em todo ciclo. */
  monthlyCost?: number
  /** Datas do empreendimento (só 'bem'), ISO yyyy-mm-dd, opcionais. */
  startDate?: string
  endDate?: string
}

/** Item de um cenário de projeção (renda extra ou gasto estimado). */
export interface ScenarioItem {
  id: string
  kind: 'income' | 'expense'
  name: string
  amount: number
}

/** Cenário de projeção (ex.: simular uma proposta de trabalho). */
export interface Scenario {
  id: string
  name: string
  notes: string
  items: ScenarioItem[]
}
