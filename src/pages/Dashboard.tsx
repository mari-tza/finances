import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CycleSelector } from '../components/CycleSelector'
import { StatCard } from '../components/StatCard'
import { CategoryCharts, type CategoryDatum } from '../components/CategoryCharts'
import {
  useApp,
  useCategoryMap,
  useSelectedCycle,
} from '../store/AppContext'
import { formatBRL } from '../utils/format'

const ACCOUNT_COLORS = [
  '#0d9488',
  '#7c3aed',
  '#ea580c',
  '#2563eb',
  '#db2777',
  '#16a34a',
]

export function Dashboard() {
  const { getCycleExpenses, cycleIncomes, accounts, investments } = useApp()
  const cycle = useSelectedCycle()
  const catMap = useCategoryMap()

  const incomes = cycleIncomes[cycle.id] ?? []
  const cycleExpenses = useMemo(
    () => getCycleExpenses(cycle.id),
    [getCycleExpenses, cycle.id],
  )

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0)
  const totalExpense = cycleExpenses.reduce((s, e) => s + e.amount, 0)
  const investido = cycleExpenses
    .filter((e) => e.investment)
    .reduce((s, e) => s + e.amount, 0)
  const gastos = totalExpense - investido // consumo (sem aportes)
  const balance = totalIncome - totalExpense // sobra = renda − gastos − investido

  // Gasto por cartão/banco
  const byAccount = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of cycleExpenses) {
      const key = e.accountId ?? 'none'
      m.set(key, (m.get(key) ?? 0) + e.amount)
    }
    return [...m.entries()]
      .map(([id, value]) => ({
        name:
          id === 'none'
            ? 'Sem cartão'
            : (accounts.find((a) => a.id === id)?.name ?? 'Cartão'),
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .map((r, idx) => ({ ...r, color: ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length] }))
  }, [cycleExpenses, accounts])

  // Patrimônio = investimentos que rendem + bens (consórcio fica de fora).
  const patrimonio = investments.reduce((s, i) => s + i.balance, 0)
  const rendimentoMes = investments.reduce(
    (s, i) => s + i.balance * ((i.monthlyRatePercent ?? 0) / 100),
    0,
  )

  const byCategory: CategoryDatum[] = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of cycleExpenses) {
      if (e.investment) continue // aporte é "investido", não gasto de consumo
      map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amount)
    }
    return [...map.entries()]
      .map(([id, value]) => {
        const c = catMap[id]
        return {
          name: c?.name ?? 'Outros',
          value,
          color: c?.color ?? '#64748b',
          icon: c?.icon ?? '📦',
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [cycleExpenses, catMap])

  return (
    <div className="space-y-4">
      <CycleSelector />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Renda do ciclo" value={totalIncome} tone="accent" />
        <StatCard label="Gastos" value={gastos} tone="negative" />
      </div>

      {investido > 0 && (
        <StatCard
          label="Investido (aportes)"
          value={investido}
          tone="accent"
          hint="poupança — sai do caixa e vira patrimônio"
        />
      )}

      <StatCard
        label="Saldo restante"
        value={balance}
        tone={balance >= 0 ? 'positive' : 'negative'}
        hint={
          balance >= 0
            ? 'No verde 🎉 — sobra neste ciclo'
            : 'Atenção: gastos acima da renda'
        }
      />

      {/* Por cartão / banco */}
      {totalExpense > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-700">Por cartão</p>
          <div className="space-y-2 text-sm">
            {byAccount.map((a) => (
              <PersonRow
                key={a.name}
                name={a.name}
                value={a.value}
                total={totalExpense}
                color={a.color}
              />
            ))}
          </div>
        </div>
      )}

      <CategoryCharts data={byCategory} />

      {/* Patrimônio */}
      <Link
        to="/patrimonio"
        className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
      >
        <div>
          <p className="text-xs font-medium text-slate-500">Patrimônio total</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-teal-700">
            {formatBRL(patrimonio)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Rende ~{formatBRL(rendimentoMes)}/mês · investimentos e bens
          </p>
        </div>
        <span className="text-slate-300">›</span>
      </Link>
    </div>
  )
}

function PersonRow({
  name,
  value,
  total,
  color,
}: {
  name: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex justify-between text-slate-600">
        <span>{name}</span>
        <span className="tabular-nums font-medium">{formatBRL(value)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
