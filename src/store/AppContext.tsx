import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Account,
  Category,
  Cycle,
  CycleIncome,
  DisplayExpense,
  Expense,
  FixedExpense,
  Household,
  IncomeSource,
  Installment,
  Investment,
  Scenario,
  ScenarioItem,
} from '../types'
import {
  buildCycleForDate,
  nextCycle as buildNext,
  previousCycle as buildPrev,
} from '../utils/cycles'
import { computeIncome } from '../utils/income'
import {
  accounts as mockAccounts,
  categories as mockCategories,
  fixedExpenses as mockFixedExpenses,
  household as mockHousehold,
  incomeSources as mockIncomeSources,
  investments as mockInvestments,
  makeSampleInstallments,
  sampleExpensesFor,
  scenarios as mockScenarios,
} from '../data/mockData'

const uid = () => crypto.randomUUID()

/** Converte as rendas recorrentes ativas em lançamentos de um ciclo (snapshot). */
function seedIncomesForCycle(
  cycle: Cycle,
  sources: IncomeSource[],
): CycleIncome[] {
  return sources
    .filter((s) => s.active)
    .map((s) => {
      const { net } = computeIncome(
        s.amount,
        s.taxPercent,
        s.tithePercent,
        s.discount,
      )
      return {
        id: `${cycle.id}-${s.id}`,
        cycleId: cycle.id,
        sourceId: s.id,
        name: s.name,
        amount: net, // renda do ciclo = líquido
        gross: s.amount,
        taxPercent: s.taxPercent,
        discount: s.discount,
        tithePercent: s.tithePercent,
      }
    })
}

/** Monta a lista inicial de ciclos: 6 passados, o atual e 12 futuros (projeção). */
function buildInitialCycles(closingDay: number): Cycle[] {
  const current = buildCycleForDate(new Date(), closingDay)
  const cycles: Cycle[] = [current]

  let prev = current
  for (let i = 0; i < 6; i++) {
    prev = buildPrev(prev)
    cycles.unshift(prev)
  }
  let nxt = current
  for (let i = 0; i < 12; i++) {
    nxt = buildNext(nxt)
    cycles.push(nxt)
  }

  return cycles
}

/** Converte os custos fixos ativos em gastos do ciclo. */
function deriveFixed(cycle: Cycle, fixed: FixedExpense[]): DisplayExpense[] {
  return fixed
    .filter((f) => f.active)
    .map((f) => ({
      id: `${cycle.id}-fixed-${f.id}`,
      cycleId: cycle.id,
      description: f.name,
      amount: f.amount,
      categoryId: f.categoryId,
      date: cycle.startDate,
      kind: 'fixed' as const,
    }))
}

/** Gera as parcelas que caem neste ciclo. */
function deriveInstallments(
  cycle: Cycle,
  cycleIndex: number,
  cycles: Cycle[],
  installments: Installment[],
): DisplayExpense[] {
  const out: DisplayExpense[] = []
  for (const inst of installments) {
    const firstIndex = cycles.findIndex((c) => c.id === inst.firstCycleId)
    if (firstIndex < 0) continue
    const p = cycleIndex - firstIndex
    if (p >= 0 && p < inst.count) {
      const start = inst.startNumber ?? 1
      const total = inst.totalParcelas ?? inst.count
      out.push({
        id: `${cycle.id}-inst-${inst.id}`,
        cycleId: cycle.id,
        description: inst.description,
        note: `Parcela ${start + p}/${total}`,
        amount: inst.installmentAmount,
        categoryId: inst.categoryId,
        date: cycle.startDate,
        accountId: inst.accountId,
        kind: 'installment' as const,
      })
    }
  }
  return out
}

interface AppState {
  household: Household
  categories: Category[]
  incomeSources: IncomeSource[]
  cycles: Cycle[]
  cycleIncomes: Record<string, CycleIncome[]>
  expenses: Expense[]
  fixedExpenses: FixedExpense[]
  installments: Installment[]
  investments: Investment[]
  scenarios: Scenario[]
  selectedCycleId: string

  // navegação de ciclos
  selectCycle: (id: string) => void
  goPrevCycle: () => void
  goNextCycle: () => void

  /** Gastos exibidos de um ciclo: manuais + fixos + parcelas. */
  getCycleExpenses: (cycleId: string) => DisplayExpense[]

  // gastos manuais
  addExpense: (e: Omit<Expense, 'id'>) => void
  deleteExpense: (id: string) => void

  // custos fixos
  addFixedExpense: (f: Omit<FixedExpense, 'id'>) => void
  updateFixedExpense: (f: FixedExpense) => void
  deleteFixedExpense: (id: string) => void

  // compras parceladas
  addInstallment: (i: Omit<Installment, 'id'>) => void
  deleteInstallment: (id: string) => void

  // investimentos
  addInvestment: (i: Omit<Investment, 'id'>) => void
  updateInvestment: (i: Investment) => void
  deleteInvestment: (id: string) => void

  // rendas do ciclo
  addCycleIncome: (cycleId: string, income: Omit<CycleIncome, 'id' | 'cycleId'>) => void
  deleteCycleIncome: (cycleId: string, id: string) => void

  // rendas recorrentes (template)
  addIncomeSource: (s: Omit<IncomeSource, 'id'>) => void
  updateIncomeSource: (s: IncomeSource) => void
  deleteIncomeSource: (id: string) => void

  // cenários
  addScenario: (name: string) => string
  updateScenario: (id: string, patch: Partial<Pick<Scenario, 'name' | 'notes'>>) => void
  deleteScenario: (id: string) => void
  addScenarioItem: (scenarioId: string, item: Omit<ScenarioItem, 'id'>) => void
  deleteScenarioItem: (scenarioId: string, itemId: string) => void

  // configurações da casa
  updateHousehold: (patch: Partial<Household>) => void

  // cartões/bancos
  accounts: Account[]
  addAccount: (name: string) => void
  updateAccount: (a: Account) => void
  deleteAccount: (id: string) => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [household, setHousehold] = useState<Household>(mockHousehold)
  const [categories] = useState<Category[]>(mockCategories)
  const [accounts, setAccounts] = useState<Account[]>(mockAccounts)
  const [incomeSources, setIncomeSources] =
    useState<IncomeSource[]>(mockIncomeSources)

  const [cycles] = useState<Cycle[]>(() =>
    buildInitialCycles(mockHousehold.closingDay),
  )

  // Id e índice do ciclo atual (o que contém a data de hoje).
  const currentCycleId = useMemo(
    () => buildCycleForDate(new Date(), mockHousehold.closingDay).id,
    [],
  )
  const currentIndex = cycles.findIndex((c) => c.id === currentCycleId)

  // Rendas de cada ciclo: todas já vêm "lançadas" a partir do template (virada automática).
  const [cycleIncomes, setCycleIncomes] = useState<
    Record<string, CycleIncome[]>
  >(() => {
    const map: Record<string, CycleIncome[]> = {}
    for (const c of cycles) map[c.id] = seedIncomesForCycle(c, mockIncomeSources)
    return map
  })

  // Gastos manuais de exemplo: no ciclo atual e nos 2 anteriores.
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const start = Math.max(0, currentIndex - 2)
    const recent = cycles.slice(start, currentIndex + 1)
    return recent.flatMap((c, i) => sampleExpensesFor(c.id, c.startDate, i + 1))
  })

  const [fixedExpenses, setFixedExpenses] =
    useState<FixedExpense[]>(mockFixedExpenses)

  const [installments, setInstallments] = useState<Installment[]>(() =>
    makeSampleInstallments(
      cycles[currentIndex].id,
      cycles[currentIndex + 1]?.id ?? cycles[currentIndex].id,
    ),
  )

  const [investments, setInvestments] =
    useState<Investment[]>(mockInvestments)

  const [scenarios, setScenarios] = useState<Scenario[]>(mockScenarios)

  // Por padrão seleciona o ciclo atual.
  const [selectedCycleId, setSelectedCycleId] =
    useState<string>(currentCycleId)

  const api = useMemo<AppState>(() => {
    const selectCycle = (id: string) => setSelectedCycleId(id)

    const goPrevCycle = () => {
      const idx = cycles.findIndex((c) => c.id === selectedCycleId)
      if (idx > 0) setSelectedCycleId(cycles[idx - 1].id)
    }
    const goNextCycle = () => {
      const idx = cycles.findIndex((c) => c.id === selectedCycleId)
      if (idx < cycles.length - 1) setSelectedCycleId(cycles[idx + 1].id)
    }

    const addExpense = (e: Omit<Expense, 'id'>) =>
      setExpenses((prev) => [...prev, { ...e, id: uid() }])
    const deleteExpense = (id: string) =>
      setExpenses((prev) => prev.filter((x) => x.id !== id))

    const getCycleExpenses = (cycleId: string): DisplayExpense[] => {
      const idx = cycles.findIndex((c) => c.id === cycleId)
      if (idx < 0) return []
      const cycle = cycles[idx]
      const manual: DisplayExpense[] = expenses
        .filter((e) => e.cycleId === cycleId)
        .map((e) => ({ ...e, kind: 'manual' }))
      return [
        ...manual,
        ...deriveFixed(cycle, fixedExpenses),
        ...deriveInstallments(cycle, idx, cycles, installments),
      ]
    }

    const addFixedExpense = (f: Omit<FixedExpense, 'id'>) =>
      setFixedExpenses((prev) => [...prev, { ...f, id: uid() }])
    const updateFixedExpense = (f: FixedExpense) =>
      setFixedExpenses((prev) => prev.map((x) => (x.id === f.id ? f : x)))
    const deleteFixedExpense = (id: string) =>
      setFixedExpenses((prev) => prev.filter((x) => x.id !== id))

    const addInstallment = (i: Omit<Installment, 'id'>) =>
      setInstallments((prev) => [...prev, { ...i, id: uid() }])
    const deleteInstallment = (id: string) =>
      setInstallments((prev) => prev.filter((x) => x.id !== id))

    const addInvestment = (i: Omit<Investment, 'id'>) =>
      setInvestments((prev) => [...prev, { ...i, id: uid() }])
    const updateInvestment = (i: Investment) =>
      setInvestments((prev) => prev.map((x) => (x.id === i.id ? i : x)))
    const deleteInvestment = (id: string) =>
      setInvestments((prev) => prev.filter((x) => x.id !== id))

    const addCycleIncome = (
      cycleId: string,
      income: Omit<CycleIncome, 'id' | 'cycleId'>,
    ) =>
      setCycleIncomes((prev) => ({
        ...prev,
        [cycleId]: [
          ...(prev[cycleId] ?? []),
          { ...income, id: uid(), cycleId },
        ],
      }))
    const deleteCycleIncome = (cycleId: string, id: string) =>
      setCycleIncomes((prev) => ({
        ...prev,
        [cycleId]: (prev[cycleId] ?? []).filter((x) => x.id !== id),
      }))

    const addIncomeSource = (s: Omit<IncomeSource, 'id'>) =>
      setIncomeSources((prev) => [...prev, { ...s, id: uid() }])
    const updateIncomeSource = (s: IncomeSource) =>
      setIncomeSources((prev) => prev.map((x) => (x.id === s.id ? s : x)))
    const deleteIncomeSource = (id: string) =>
      setIncomeSources((prev) => prev.filter((x) => x.id !== id))

    const addScenario = (name: string) => {
      const id = uid()
      setScenarios((prev) => [...prev, { id, name, notes: '', items: [] }])
      return id
    }
    const updateScenario = (
      id: string,
      patch: Partial<Pick<Scenario, 'name' | 'notes'>>,
    ) =>
      setScenarios((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      )
    const deleteScenario = (id: string) =>
      setScenarios((prev) => prev.filter((s) => s.id !== id))
    const addScenarioItem = (
      scenarioId: string,
      item: Omit<ScenarioItem, 'id'>,
    ) =>
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === scenarioId
            ? { ...s, items: [...s.items, { ...item, id: uid() }] }
            : s,
        ),
      )
    const deleteScenarioItem = (scenarioId: string, itemId: string) =>
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === scenarioId
            ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
            : s,
        ),
      )

    const updateHousehold = (patch: Partial<Household>) =>
      setHousehold((prev) => ({ ...prev, ...patch }))

    const addAccount = (name: string) =>
      setAccounts((prev) => [...prev, { id: uid(), name }])
    const updateAccount = (a: Account) =>
      setAccounts((prev) => prev.map((x) => (x.id === a.id ? a : x)))
    const deleteAccount = (id: string) =>
      setAccounts((prev) => prev.filter((x) => x.id !== id))

    return {
      household,
      categories,
      accounts,
      incomeSources,
      cycles,
      cycleIncomes,
      expenses,
      fixedExpenses,
      installments,
      investments,
      scenarios,
      selectedCycleId,
      selectCycle,
      goPrevCycle,
      goNextCycle,
      getCycleExpenses,
      addExpense,
      deleteExpense,
      addFixedExpense,
      updateFixedExpense,
      deleteFixedExpense,
      addInstallment,
      deleteInstallment,
      addInvestment,
      updateInvestment,
      deleteInvestment,
      addCycleIncome,
      deleteCycleIncome,
      addIncomeSource,
      updateIncomeSource,
      deleteIncomeSource,
      addScenario,
      updateScenario,
      deleteScenario,
      addScenarioItem,
      deleteScenarioItem,
      updateHousehold,
      addAccount,
      updateAccount,
      deleteAccount,
    }
  }, [
    household,
    categories,
    accounts,
    incomeSources,
    cycles,
    cycleIncomes,
    expenses,
    fixedExpenses,
    installments,
    investments,
    scenarios,
    selectedCycleId,
  ])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>')
  return ctx
}

// ---- Seletores utilitários ----

export function useSelectedCycle(): Cycle {
  const { cycles, selectedCycleId } = useApp()
  return cycles.find((c) => c.id === selectedCycleId) ?? cycles[0]
}

export function useCategoryMap(): Record<string, Category> {
  const { categories } = useApp()
  return useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  )
}

export function useAccountMap(): Record<string, Account> {
  const { accounts } = useApp()
  return useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts],
  )
}
