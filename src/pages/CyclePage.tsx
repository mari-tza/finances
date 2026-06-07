import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CycleSelector } from '../components/CycleSelector'
import { Modal } from '../components/Modal'
import { ExpenseForm } from '../components/ExpenseForm'
import {
  useApp,
  useAccountMap,
  useCategoryMap,
  useSelectedCycle,
} from '../store/AppContext'
import { formatBRL, formatDayMonth } from '../utils/format'

export function CyclePage() {
  const { getCycleExpenses, cycleIncomes, deleteExpense, toggleFixedPaid } =
    useApp()
  const cycle = useSelectedCycle()
  const catMap = useCategoryMap()
  const accMap = useAccountMap()
  const [showForm, setShowForm] = useState(false)

  const incomes = cycleIncomes[cycle.id] ?? []
  const cycleExpenses = useMemo(
    () =>
      getCycleExpenses(cycle.id).sort((a, b) => b.date.localeCompare(a.date)),
    [getCycleExpenses, cycle.id],
  )

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0)
  const totalExpense = cycleExpenses.reduce((s, e) => s + e.amount, 0)
  const investido = cycleExpenses
    .filter((e) => e.investment)
    .reduce((s, e) => s + e.amount, 0)
  const gastos = totalExpense - investido

  return (
    <div className="space-y-4">
      <CycleSelector />

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setShowForm(true)}
          className="hidden rounded-full bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm md:inline-flex"
        >
          + Gasto
        </button>
        <Link
          to="/importar"
          className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-teal-700 shadow-sm"
        >
          ⬇️ Importar extrato
        </Link>
      </div>

      {/* Rendas lançadas no ciclo */}
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Rendas do ciclo
          </h2>
          <span className="text-sm font-bold tabular-nums text-teal-700">
            {formatBRL(totalIncome)}
          </span>
        </div>
        <ul className="divide-y divide-slate-100">
          {incomes.map((i) => {
            const withDeductions =
              i.gross != null && (i.taxPercent || i.tithePercent)
            return (
              <li key={i.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-slate-800">{i.name}</p>
                  {withDeductions && (
                    <p className="text-xs text-slate-400">
                      líquido de {formatBRL(i.gross!)}
                      {i.taxPercent ? ` (imp. ${i.taxPercent}%` : ''}
                      {i.taxPercent && i.tithePercent ? ', ' : ''}
                      {!i.taxPercent && i.tithePercent ? ' (' : ''}
                      {i.tithePercent ? `desc. ${i.tithePercent}%` : ''}
                      {i.taxPercent || i.tithePercent ? ')' : ''}
                    </p>
                  )}
                </div>
                <span className="text-sm tabular-nums text-slate-600">
                  {formatBRL(i.amount)}
                </span>
              </li>
            )
          })}
          {incomes.length === 0 && (
            <li className="py-3 text-center text-sm text-slate-400">
              Nenhuma renda lançada.
            </li>
          )}
        </ul>
      </section>

      {/* Gastos */}
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Gastos</h2>
          <span className="text-sm font-bold tabular-nums text-rose-600">
            {formatBRL(gastos)}
            {investido > 0 && (
              <span className="ml-2 font-medium text-teal-700">
                + {formatBRL(investido)} investido
              </span>
            )}
          </span>
        </div>
        <ul className="divide-y divide-slate-100">
          {cycleExpenses.map((e) => {
            const c = catMap[e.categoryId]
            const isManual = e.kind === 'manual'
            return (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg"
                  style={{ backgroundColor: (c?.color ?? '#64748b') + '22' }}
                >
                  {c?.icon ?? '📦'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm text-slate-800">
                    <span className="truncate">{e.description}</span>
                    {e.kind === 'fixed' && e.investment && (
                      <span className="shrink-0 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                        Investido
                      </span>
                    )}
                    {e.kind === 'fixed' && !e.investment && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        Fixo
                      </span>
                    )}
                    {e.kind === 'installment' && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        {e.note}
                      </span>
                    )}
                    {e.kind === 'cardbill' && (
                      <span className="shrink-0 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                        💳 parcial
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isManual ? `${formatDayMonth(e.date)} · ` : ''}
                    {c?.name ?? 'Outros'}
                    {e.accountId && accMap[e.accountId]
                      ? ` · ${accMap[e.accountId].name}`
                      : ''}
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums text-slate-700">
                  {formatBRL(e.amount)}
                </span>
                {isManual ? (
                  <button
                    onClick={() => deleteExpense(e.id)}
                    className="ml-1 text-slate-300 hover:text-rose-500"
                    aria-label="Excluir"
                  >
                    🗑️
                  </button>
                ) : e.kind === 'fixed' && e.sourceId ? (
                  <button
                    onClick={() => toggleFixedPaid(cycle.id, e.sourceId!)}
                    className="ml-1 shrink-0 text-base"
                    title={e.paid ? 'Paga' : 'Marcar como paga'}
                  >
                    {e.paid ? '✅' : '⬜'}
                  </button>
                ) : (
                  <span className="ml-1 w-5 shrink-0" />
                )}
              </li>
            )
          })}
          {cycleExpenses.length === 0 && (
            <li className="py-3 text-center text-sm text-slate-400">
              Nenhum gasto ainda. Toque em + para adicionar.
            </li>
          )}
        </ul>
      </section>

      {/* Botão flutuante (só no mobile; no desktop usa o botão do topo) */}
      <div className="pointer-events-none fixed bottom-20 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 justify-end px-4 md:hidden">
        <button
          onClick={() => setShowForm(true)}
          className="pointer-events-auto rounded-full bg-teal-600 px-5 py-3 font-semibold text-white shadow-lg active:bg-teal-700"
        >
          + Gasto
        </button>
      </div>

      <Modal
        open={showForm}
        title="Novo gasto"
        onClose={() => setShowForm(false)}
      >
        <ExpenseForm
          cycleId={cycle.id}
          defaultDate={defaultDateWithin(cycle.startDate, cycle.endDate)}
          onDone={() => setShowForm(false)}
        />
      </Modal>
    </div>
  )
}

/** Sugere a data de hoje se estiver dentro do ciclo, senão o início do ciclo. */
function defaultDateWithin(start: string, end: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return today >= start && today <= end ? today : start
}
