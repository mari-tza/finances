// Camada de acesso ao Supabase: traduz entre as colunas do banco (snake_case)
// e os tipos do app (camelCase), e faz insert/update/delete por entidade.
import { supabase } from './supabase'
import type {
  Account,
  CardBill,
  Category,
  Expense,
  FixedExpense,
  Household,
  IncomeSource,
  Installment,
  Investment,
  Scenario,
  ScenarioItem,
} from '../types'

// ---------- helpers ----------
async function run(p: PromiseLike<{ error: unknown }>) {
  const { error } = await p
  if (error) throw error
}

const undefIfNull = <T>(v: T | null): T | undefined => (v == null ? undefined : v)

// ---------- household do usuário logado ----------
export async function getHouseholdId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.household_id ?? null
}

// ---------- carga inicial ----------
export interface LoadedData {
  household: Household
  categories: Category[]
  accounts: Account[]
  incomeSources: IncomeSource[]
  fixedExpenses: FixedExpense[]
  installments: Installment[]
  investments: Investment[]
  scenarios: Scenario[]
  expenses: Expense[]
  cardBills: CardBill[]
  fixedPayments: { cycleId: string; fixedExpenseId: string }[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function loadEverything(hid: string): Promise<LoadedData> {
  const q = (t: string) => supabase.from(t).select('*').eq('household_id', hid)
  const [hh, cats, accs, incs, fixs, insts, invs, scns, scis, exps, cbs, fps] =
    await Promise.all([
      supabase.from('households').select('*').eq('id', hid).single(),
      q('categories'),
      q('accounts'),
      q('income_sources'),
      q('fixed_expenses'),
      q('installments'),
      q('investments'),
      q('scenarios'),
      supabase.from('scenario_items').select('*'),
      q('expenses'),
      q('card_bills'),
      q('fixed_payments'),
    ])
  for (const r of [hh, cats, accs, incs, fixs, insts, invs, scns, scis, exps, cbs, fps]) {
    if (r.error) throw r.error
  }

  const itemsByScenario: Record<string, ScenarioItem[]> = {}
  for (const s of (scis.data ?? []) as any[]) {
    ;(itemsByScenario[s.scenario_id] ??= []).push({
      id: s.id,
      kind: s.kind,
      name: s.name,
      amount: Number(s.amount),
    })
  }

  return {
    household: {
      id: hh.data.id,
      name: hh.data.name,
      closingDay: hh.data.closing_day,
    },
    categories: (cats.data ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
    })),
    accounts: (accs.data ?? []).map((a: any) => ({ id: a.id, name: a.name })),
    incomeSources: (incs.data ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      amount: Number(s.amount),
      payDay: s.pay_day,
      active: s.active,
      taxPercent: undefIfNull(s.tax_percent),
      discount: undefIfNull(s.discount),
      tithePercent: undefIfNull(s.tithe_percent),
    })),
    fixedExpenses: (fixs.data ?? []).map((f: any) => ({
      id: f.id,
      name: f.name,
      amount: Number(f.amount),
      categoryId: f.category_id,
      active: f.active,
      isInvestment: f.is_investment,
      investedSoFar: undefIfNull(f.invested_so_far),
      assetId: undefIfNull(f.asset_id),
    })),
    installments: (insts.data ?? []).map((i: any) => ({
      id: i.id,
      description: i.description,
      installmentAmount: Number(i.installment_amount),
      count: i.installments_count,
      firstCycleId: i.first_cycle_id,
      categoryId: i.category_id,
      accountId: undefIfNull(i.account_id),
      startNumber: undefIfNull(i.start_number),
      totalParcelas: undefIfNull(i.total_parcelas),
    })),
    investments: (invs.data ?? []).map((v: any) => ({
      id: v.id,
      name: v.name,
      kind: v.kind,
      balance: Number(v.balance),
      monthlyRatePercent: undefIfNull(v.monthly_rate_percent),
    })),
    scenarios: (scns.data ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      notes: s.notes ?? '',
      items: itemsByScenario[s.id] ?? [],
    })),
    expenses: (exps.data ?? []).map((e: any) => ({
      id: e.id,
      cycleId: e.cycle_id,
      description: e.description,
      amount: Number(e.amount),
      categoryId: e.category_id,
      date: e.date,
      accountId: undefIfNull(e.account_id),
      assetId: undefIfNull(e.asset_id),
    })),
    cardBills: (cbs.data ?? []).map((b: any) => ({
      id: b.id,
      cycleId: b.cycle_id,
      accountId: b.account_id,
      amount: Number(b.amount),
    })),
    fixedPayments: (fps.data ?? []).map((p: any) => ({
      cycleId: p.cycle_id,
      fixedExpenseId: p.fixed_expense_id,
    })),
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------- inserts/updates/deletes ----------
const del = (table: string, id: string) =>
  run(supabase.from(table).delete().eq('id', id))

export const insertExpense = (e: Expense, hid: string) =>
  run(
    supabase.from('expenses').insert({
      id: e.id,
      household_id: hid,
      cycle_id: e.cycleId,
      description: e.description,
      amount: e.amount,
      category_id: e.categoryId,
      date: e.date,
      account_id: e.accountId ?? null,
      asset_id: e.assetId ?? null,
    }),
  )
export const deleteExpense = (id: string) => del('expenses', id)

export const insertIncome = (s: IncomeSource, hid: string) =>
  run(supabase.from('income_sources').insert(incomeRow(s, hid)))
export const updateIncome = (s: IncomeSource) =>
  run(supabase.from('income_sources').update(incomeRow(s)).eq('id', s.id))
export const deleteIncome = (id: string) => del('income_sources', id)
function incomeRow(s: IncomeSource, hid?: string) {
  return {
    ...(hid ? { id: s.id, household_id: hid } : {}),
    name: s.name,
    amount: s.amount,
    pay_day: s.payDay,
    active: s.active,
    tax_percent: s.taxPercent ?? null,
    discount: s.discount ?? null,
    tithe_percent: s.tithePercent ?? null,
  }
}

export const insertFixed = (f: FixedExpense, hid: string) =>
  run(supabase.from('fixed_expenses').insert(fixedRow(f, hid)))
export const updateFixed = (f: FixedExpense) =>
  run(supabase.from('fixed_expenses').update(fixedRow(f)).eq('id', f.id))
export const deleteFixed = (id: string) => del('fixed_expenses', id)
function fixedRow(f: FixedExpense, hid?: string) {
  return {
    ...(hid ? { id: f.id, household_id: hid } : {}),
    name: f.name,
    amount: f.amount,
    category_id: f.categoryId,
    active: f.active,
    is_investment: f.isInvestment ?? false,
    invested_so_far: f.investedSoFar ?? null,
    asset_id: f.assetId ?? null,
  }
}

export const insertInstallment = (i: Installment, hid: string) =>
  run(
    supabase.from('installments').insert({
      id: i.id,
      household_id: hid,
      description: i.description,
      installment_amount: i.installmentAmount,
      installments_count: i.count,
      first_cycle_id: i.firstCycleId,
      category_id: i.categoryId,
      account_id: i.accountId ?? null,
      start_number: i.startNumber ?? 1,
      total_parcelas: i.totalParcelas ?? null,
    }),
  )
export const deleteInstallment = (id: string) => del('installments', id)

export const insertInvestment = (v: Investment, hid: string) =>
  run(supabase.from('investments').insert(investmentRow(v, hid)))
export const updateInvestment = (v: Investment) =>
  run(supabase.from('investments').update(investmentRow(v)).eq('id', v.id))
export const deleteInvestment = (id: string) => del('investments', id)
function investmentRow(v: Investment, hid?: string) {
  return {
    ...(hid ? { id: v.id, household_id: hid } : {}),
    name: v.name,
    kind: v.kind,
    balance: v.balance,
    monthly_rate_percent: v.monthlyRatePercent ?? null,
  }
}

export const setFixedPaid = (
  hid: string,
  cycleId: string,
  fixedExpenseId: string,
  paid: boolean,
) =>
  paid
    ? run(
        supabase.from('fixed_payments').insert({
          household_id: hid,
          cycle_id: cycleId,
          fixed_expense_id: fixedExpenseId,
        }),
      )
    : run(
        supabase
          .from('fixed_payments')
          .delete()
          .eq('household_id', hid)
          .eq('cycle_id', cycleId)
          .eq('fixed_expense_id', fixedExpenseId),
      )

export const insertCardBill = (b: CardBill, hid: string) =>
  run(
    supabase.from('card_bills').insert({
      id: b.id,
      household_id: hid,
      cycle_id: b.cycleId,
      account_id: b.accountId,
      amount: b.amount,
    }),
  )
export const updateCardBillAmount = (id: string, amount: number) =>
  run(supabase.from('card_bills').update({ amount }).eq('id', id))
export const deleteCardBill = (id: string) => del('card_bills', id)

export const insertAccount = (a: Account, hid: string) =>
  run(supabase.from('accounts').insert({ id: a.id, household_id: hid, name: a.name }))
export const updateAccount = (a: Account) =>
  run(supabase.from('accounts').update({ name: a.name }).eq('id', a.id))
export const deleteAccount = (id: string) => del('accounts', id)

export const insertScenario = (s: Scenario, hid: string) =>
  run(
    supabase
      .from('scenarios')
      .insert({ id: s.id, household_id: hid, name: s.name, notes: s.notes }),
  )
export const updateScenario = (
  id: string,
  patch: Partial<Pick<Scenario, 'name' | 'notes'>>,
) => run(supabase.from('scenarios').update(patch).eq('id', id))
export const deleteScenario = (id: string) => del('scenarios', id)

export const insertScenarioItem = (scenarioId: string, item: ScenarioItem) =>
  run(
    supabase.from('scenario_items').insert({
      id: item.id,
      scenario_id: scenarioId,
      kind: item.kind,
      name: item.name,
      amount: item.amount,
    }),
  )
export const deleteScenarioItem = (id: string) => del('scenario_items', id)

export const updateHousehold = (
  id: string,
  patch: Partial<Household>,
) =>
  run(
    supabase
      .from('households')
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.closingDay !== undefined
          ? { closing_day: patch.closingDay }
          : {}),
      })
      .eq('id', id),
  )
