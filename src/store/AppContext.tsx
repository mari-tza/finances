import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Account,
  AssetOutlay,
  CardBill,
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
import * as db from '../lib/db'

const uid = () => crypto.randomUUID()

function persist(p: Promise<void>) {
  p.catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Erro ao salvar no Supabase:', msg)
  })
}

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
        amount: net,
        gross: s.amount,
        taxPercent: s.taxPercent,
        discount: s.discount,
        tithePercent: s.tithePercent,
      }
    })
}

/** Monta a lista de ciclos: 6 passados, o atual e 12 futuros (projeção). */
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

function deriveFixed(
  cycle: Cycle,
  fixed: FixedExpense[],
  paidSet: Set<string>,
): DisplayExpense[] {
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
      sourceId: f.id,
      paid: paidSet.has(`${cycle.id}|${f.id}`),
      investment: f.isInvestment === true,
    }))
}

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
  accounts: Account[]
  incomeSources: IncomeSource[]
  cycles: Cycle[]
  cycleIncomes: Record<string, CycleIncome[]>
  expenses: Expense[]
  fixedExpenses: FixedExpense[]
  installments: Installment[]
  investments: Investment[]
  scenarios: Scenario[]
  selectedCycleId: string

  selectCycle: (id: string) => void
  goPrevCycle: () => void
  goNextCycle: () => void

  getCycleExpenses: (cycleId: string) => DisplayExpense[]

  cardBills: CardBill[]
  setCardBill: (cycleId: string, accountId: string, amount: number) => void

  /** Gasto/aporte de um bem (empreendimento) num ciclo. */
  assetOutlays: AssetOutlay[]
  setAssetOutlay: (cycleId: string, assetId: string, amount: number) => void

  /** Marca/desmarca um custo fixo como pago naquele ciclo. */
  toggleFixedPaid: (cycleId: string, fixedExpenseId: string) => void

  addExpense: (e: Omit<Expense, 'id'>) => void
  deleteExpense: (id: string) => void

  addFixedExpense: (f: Omit<FixedExpense, 'id'>) => void
  updateFixedExpense: (f: FixedExpense) => void
  deleteFixedExpense: (id: string) => void

  addInstallment: (i: Omit<Installment, 'id'>) => void
  deleteInstallment: (id: string) => void

  addInvestment: (i: Omit<Investment, 'id'>) => void
  updateInvestment: (i: Investment) => void
  deleteInvestment: (id: string) => void

  addIncomeSource: (s: Omit<IncomeSource, 'id'>) => void
  updateIncomeSource: (s: IncomeSource) => void
  deleteIncomeSource: (id: string) => void

  addScenario: (name: string) => string
  updateScenario: (id: string, patch: Partial<Pick<Scenario, 'name' | 'notes'>>) => void
  deleteScenario: (id: string) => void
  addScenarioItem: (scenarioId: string, item: Omit<ScenarioItem, 'id'>) => void
  deleteScenarioItem: (scenarioId: string, itemId: string) => void

  updateHousehold: (patch: Partial<Household>) => void

  addAccount: (name: string) => void
  updateAccount: (a: Account) => void
  deleteAccount: (id: string) => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [householdId, setHouseholdId] = useState<string | null>(null)

  const [household, setHousehold] = useState<Household | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [cardBills, setCardBills] = useState<CardBill[]>([])
  const [assetOutlays, setAssetOutlays] = useState<AssetOutlay[]>([])
  const [paidFixed, setPaidFixed] = useState<Set<string>>(new Set())
  const [selectedCycleId, setSelectedCycleId] = useState<string>('')

  // ---- carga inicial ----
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const hid = await db.getHouseholdId()
        if (!hid) {
          setError(
            'Seu login não está ligado a nenhuma casa. Rode o supabase/seed.sql.',
          )
          setLoading(false)
          return
        }
        const data = await db.loadEverything(hid)
        if (cancelled) return
        setHouseholdId(hid)
        setHousehold(data.household)
        setCategories(data.categories)
        setAccounts(data.accounts)
        setIncomeSources(data.incomeSources)
        setFixedExpenses(data.fixedExpenses)
        setInstallments(data.installments)
        setInvestments(data.investments)
        setScenarios(data.scenarios)
        setExpenses(data.expenses)
        setCardBills(data.cardBills)
        setAssetOutlays(data.assetOutlays)
        setPaidFixed(
          new Set(
            data.fixedPayments.map((p) => `${p.cycleId}|${p.fixedExpenseId}`),
          ),
        )
        setLoading(false)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('Erro ao carregar:', msg)
        if (!cancelled) {
          setError('Não consegui carregar os dados do Supabase.')
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const cycles = useMemo(
    () => (household ? buildInitialCycles(household.closingDay) : []),
    [household],
  )
  const currentCycleId = useMemo(
    () => (household ? buildCycleForDate(new Date(), household.closingDay).id : ''),
    [household],
  )
  useEffect(() => {
    if (currentCycleId && !selectedCycleId) setSelectedCycleId(currentCycleId)
  }, [currentCycleId, selectedCycleId])

  const cycleIncomes = useMemo(() => {
    const map: Record<string, CycleIncome[]> = {}
    for (const c of cycles) map[c.id] = seedIncomesForCycle(c, incomeSources)
    return map
  }, [cycles, incomeSources])

  const api = useMemo<AppState>(() => {
    const hid = householdId ?? ''

    const selectCycle = (id: string) => setSelectedCycleId(id)
    const goPrevCycle = () => {
      const idx = cycles.findIndex((c) => c.id === selectedCycleId)
      if (idx > 0) setSelectedCycleId(cycles[idx - 1].id)
    }
    const goNextCycle = () => {
      const idx = cycles.findIndex((c) => c.id === selectedCycleId)
      if (idx >= 0 && idx < cycles.length - 1) setSelectedCycleId(cycles[idx + 1].id)
    }

    const getCycleExpenses = (cycleId: string): DisplayExpense[] => {
      const idx = cycles.findIndex((c) => c.id === cycleId)
      if (idx < 0) return []
      const cycle = cycles[idx]
      const manual: DisplayExpense[] = expenses
        .filter((e) => e.cycleId === cycleId)
        .map((e) => ({ ...e, kind: 'manual' }))
      const bills: DisplayExpense[] = cardBills
        .filter((b) => b.cycleId === cycleId)
        .map((b) => ({
          id: `${cycleId}-cardbill-${b.id}`,
          cycleId,
          description: `${accounts.find((a) => a.id === b.accountId)?.name ?? 'Cartão'} (fatura parcial)`,
          amount: b.amount,
          categoryId: 'cat-card-proj', // categoria virtual "Projeção de cartões"
          date: cycle.startDate,
          accountId: b.accountId,
          kind: 'cardbill' as const,
        }))
      // Empreendimentos (bens): custo base mensal (replica) + adicional do ciclo
      const empreendimentos: DisplayExpense[] = investments
        .filter((i) => i.kind === 'bem')
        .map((b) => {
          const base = b.monthlyCost ?? 0
          const add =
            assetOutlays.find(
              (o) => o.cycleId === cycleId && o.assetId === b.id,
            )?.amount ?? 0
          return { b, total: base + add }
        })
        .filter((x) => x.total > 0)
        .map((x) => ({
          id: `${cycleId}-emp-${x.b.id}`,
          cycleId,
          description: x.b.name,
          amount: x.total,
          categoryId: 'cat-empreendimento',
          date: cycle.startDate,
          kind: 'outlay' as const,
          investment: true, // entra como "Investido", não gasto
        }))
      return [
        ...manual,
        ...deriveFixed(cycle, fixedExpenses, paidFixed),
        ...deriveInstallments(cycle, idx, cycles, installments),
        ...bills,
        ...empreendimentos,
      ]
    }

    const setAssetOutlay = (
      cycleId: string,
      assetId: string,
      amount: number,
    ) => {
      const existing = assetOutlays.find(
        (o) => o.cycleId === cycleId && o.assetId === assetId,
      )
      if (amount <= 0) {
        if (existing) {
          setAssetOutlays((p) => p.filter((o) => o.id !== existing.id))
          persist(db.deleteAssetOutlay(existing.id))
        }
        return
      }
      if (existing) {
        setAssetOutlays((p) =>
          p.map((o) => (o.id === existing.id ? { ...o, amount } : o)),
        )
        persist(db.updateAssetOutlayAmount(existing.id, amount))
      } else {
        const row: AssetOutlay = { id: uid(), cycleId, assetId, amount }
        setAssetOutlays((p) => [...p, row])
        persist(db.insertAssetOutlay(row, hid))
      }
    }

    const toggleFixedPaid = (cycleId: string, fixedExpenseId: string) => {
      const key = `${cycleId}|${fixedExpenseId}`
      const willPay = !paidFixed.has(key)
      setPaidFixed((prev) => {
        const next = new Set(prev)
        if (willPay) next.add(key)
        else next.delete(key)
        return next
      })
      persist(db.setFixedPaid(hid, cycleId, fixedExpenseId, willPay))
    }

    const setCardBill = (
      cycleId: string,
      accountId: string,
      amount: number,
    ) => {
      const existing = cardBills.find(
        (b) => b.cycleId === cycleId && b.accountId === accountId,
      )
      if (amount <= 0) {
        if (existing) {
          setCardBills((p) => p.filter((b) => b.id !== existing.id))
          persist(db.deleteCardBill(existing.id))
        }
        return
      }
      if (existing) {
        setCardBills((p) =>
          p.map((b) => (b.id === existing.id ? { ...b, amount } : b)),
        )
        persist(db.updateCardBillAmount(existing.id, amount))
      } else {
        const row: CardBill = { id: uid(), cycleId, accountId, amount }
        setCardBills((p) => [...p, row])
        persist(db.insertCardBill(row, hid))
      }
    }

    const addExpense = (e: Omit<Expense, 'id'>) => {
      const row = { ...e, id: uid() }
      setExpenses((p) => [...p, row])
      persist(db.insertExpense(row, hid))
    }
    const deleteExpense = (id: string) => {
      setExpenses((p) => p.filter((x) => x.id !== id))
      persist(db.deleteExpense(id))
    }

    const addFixedExpense = (f: Omit<FixedExpense, 'id'>) => {
      const row = { ...f, id: uid() }
      setFixedExpenses((p) => [...p, row])
      persist(db.insertFixed(row, hid))
    }
    const updateFixedExpense = (f: FixedExpense) => {
      setFixedExpenses((p) => p.map((x) => (x.id === f.id ? f : x)))
      persist(db.updateFixed(f))
    }
    const deleteFixedExpense = (id: string) => {
      setFixedExpenses((p) => p.filter((x) => x.id !== id))
      persist(db.deleteFixed(id))
    }

    const addInstallment = (i: Omit<Installment, 'id'>) => {
      const row = { ...i, id: uid() }
      setInstallments((p) => [...p, row])
      persist(db.insertInstallment(row, hid))
    }
    const deleteInstallment = (id: string) => {
      setInstallments((p) => p.filter((x) => x.id !== id))
      persist(db.deleteInstallment(id))
    }

    const addInvestment = (i: Omit<Investment, 'id'>) => {
      const row = { ...i, id: uid() }
      setInvestments((p) => [...p, row])
      persist(db.insertInvestment(row, hid))
    }
    const updateInvestment = (i: Investment) => {
      setInvestments((p) => p.map((x) => (x.id === i.id ? i : x)))
      persist(db.updateInvestment(i))
    }
    const deleteInvestment = (id: string) => {
      setInvestments((p) => p.filter((x) => x.id !== id))
      persist(db.deleteInvestment(id))
    }

    const addIncomeSource = (s: Omit<IncomeSource, 'id'>) => {
      const row = { ...s, id: uid() }
      setIncomeSources((p) => [...p, row])
      persist(db.insertIncome(row, hid))
    }
    const updateIncomeSource = (s: IncomeSource) => {
      setIncomeSources((p) => p.map((x) => (x.id === s.id ? s : x)))
      persist(db.updateIncome(s))
    }
    const deleteIncomeSource = (id: string) => {
      setIncomeSources((p) => p.filter((x) => x.id !== id))
      persist(db.deleteIncome(id))
    }

    const addScenario = (name: string) => {
      const row: Scenario = { id: uid(), name, notes: '', items: [] }
      setScenarios((p) => [...p, row])
      persist(db.insertScenario(row, hid))
      return row.id
    }
    const updateScenario = (
      id: string,
      patch: Partial<Pick<Scenario, 'name' | 'notes'>>,
    ) => {
      setScenarios((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)))
      persist(db.updateScenario(id, patch))
    }
    const deleteScenario = (id: string) => {
      setScenarios((p) => p.filter((s) => s.id !== id))
      persist(db.deleteScenario(id))
    }
    const addScenarioItem = (
      scenarioId: string,
      item: Omit<ScenarioItem, 'id'>,
    ) => {
      const full: ScenarioItem = { ...item, id: uid() }
      setScenarios((p) =>
        p.map((s) =>
          s.id === scenarioId ? { ...s, items: [...s.items, full] } : s,
        ),
      )
      persist(db.insertScenarioItem(scenarioId, full))
    }
    const deleteScenarioItem = (scenarioId: string, itemId: string) => {
      setScenarios((p) =>
        p.map((s) =>
          s.id === scenarioId
            ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
            : s,
        ),
      )
      persist(db.deleteScenarioItem(itemId))
    }

    const updateHousehold = (patch: Partial<Household>) => {
      setHousehold((prev) => (prev ? { ...prev, ...patch } : prev))
      persist(db.updateHousehold(hid, patch))
    }

    const addAccount = (name: string) => {
      const row: Account = { id: uid(), name }
      setAccounts((p) => [...p, row])
      persist(db.insertAccount(row, hid))
    }
    const updateAccount = (a: Account) => {
      setAccounts((p) => p.map((x) => (x.id === a.id ? a : x)))
      persist(db.updateAccount(a))
    }
    const deleteAccount = (id: string) => {
      setAccounts((p) => p.filter((x) => x.id !== id))
      persist(db.deleteAccount(id))
    }

    return {
      household: household!,
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
      cardBills,
      setCardBill,
      assetOutlays,
      setAssetOutlay,
      toggleFixedPaid,
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
    householdId,
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
    cardBills,
    assetOutlays,
    paidFixed,
    selectedCycleId,
  ])

  if (loading) {
    return (
      <div className="grid min-h-full place-items-center text-slate-400">
        Carregando seus dados…
      </div>
    )
  }
  if (error || !household) {
    return (
      <div className="mx-auto grid min-h-full max-w-sm place-items-center px-6 text-center">
        <div>
          <p className="text-3xl">⚠️</p>
          <p className="mt-2 text-sm text-slate-600">{error ?? 'Erro.'}</p>
        </div>
      </div>
    )
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>')
  return ctx
}

export function useSelectedCycle(): Cycle {
  const { cycles, selectedCycleId } = useApp()
  return cycles.find((c) => c.id === selectedCycleId) ?? cycles[0]
}

// Categorias virtuais (não ficam no banco): projeção de cartão e empreendimentos.
const VIRTUAL_CATEGORIES: Category[] = [
  { id: 'cat-card-proj', name: 'Projeção de cartões', color: '#0ea5e9', icon: '💳' },
  { id: 'cat-empreendimento', name: 'Empreendimentos', color: '#0d9488', icon: '🏗️' },
]

export function useCategoryMap(): Record<string, Category> {
  const { categories } = useApp()
  return useMemo(() => {
    const m = Object.fromEntries(categories.map((c) => [c.id, c]))
    for (const v of VIRTUAL_CATEGORIES) m[v.id] = v
    return m
  }, [categories])
}

export function useAccountMap(): Record<string, Account> {
  const { accounts } = useApp()
  return useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts],
  )
}
