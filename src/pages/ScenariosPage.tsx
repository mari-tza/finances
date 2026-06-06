import { useMemo, useState } from 'react'
import type { Scenario } from '../types'
import { useApp } from '../store/AppContext'
import { Modal } from '../components/Modal'
import {
  MoneyField,
  PrimaryButton,
  SelectField,
  TextField,
} from '../components/inputs'
import { formatBRL } from '../utils/format'
import { computeIncome } from '../utils/income'

/** Calcula a base atual: renda líquida e gastos típicos por mês. */
function useBaseline() {
  const { incomeSources, expenses, fixedExpenses, cycles } = useApp()
  return useMemo(() => {
    const income = incomeSources
      .filter((s) => s.active)
      .reduce(
        (sum, s) =>
          sum +
          computeIncome(s.amount, s.taxPercent, s.tithePercent, s.discount).net,
        0,
      )

    // Custos fixos mensais
    const fixedTotal = fixedExpenses
      .filter((f) => f.active)
      .reduce((s, f) => s + f.amount, 0)

    // Média dos gastos variáveis (manuais), só dos ciclos que têm dados.
    const byCycle = new Map<string, number>()
    for (const e of expenses) {
      byCycle.set(e.cycleId, (byCycle.get(e.cycleId) ?? 0) + e.amount)
    }
    const cyclesWithData = cycles.filter((c) => byCycle.has(c.id))
    const totalVariable = [...byCycle.values()].reduce((s, v) => s + v, 0)
    const variableAvg =
      cyclesWithData.length > 0 ? totalVariable / cyclesWithData.length : 0

    // Gastos típicos = fixos + média variável (parcelas ficam de fora por serem temporárias).
    const expense = fixedTotal + variableAvg

    return { income, expense }
  }, [incomeSources, expenses, fixedExpenses, cycles])
}

export function ScenariosPage() {
  const { scenarios, addScenario } = useApp()
  const [openId, setOpenId] = useState<string | null>(null)
  const baseline = useBaseline()

  const open = scenarios.find((s) => s.id === openId) ?? null

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Simule propostas de trabalho e veja como ficaria o que sobra por mês.
      </p>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">Situação atual</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Mini label="Renda" value={baseline.income} tone="accent" />
          <Mini label="Gastos" value={baseline.expense} tone="negative" />
          <Mini
            label="Sobra"
            value={baseline.income - baseline.expense}
            tone="positive"
          />
        </div>
      </div>

      <ul className="space-y-2">
        {scenarios.map((s) => {
          const extraIncome = s.items
            .filter((i) => i.kind === 'income')
            .reduce((a, i) => a + i.amount, 0)
          const extraExpense = s.items
            .filter((i) => i.kind === 'expense')
            .reduce((a, i) => a + i.amount, 0)
          const projLeftover =
            baseline.income + extraIncome - (baseline.expense + extraExpense)
          const delta = projLeftover - (baseline.income - baseline.expense)
          return (
            <li
              key={s.id}
              onClick={() => setOpenId(s.id)}
              className="rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-800">{s.name}</p>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {delta >= 0 ? '+' : ''}
                  {formatBRL(delta)}/mês
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Sobraria {formatBRL(projLeftover)} por mês
              </p>
            </li>
          )
        })}
      </ul>

      <PrimaryButton onClick={() => setOpenId(addScenario('Novo cenário'))}>
        + Novo cenário
      </PrimaryButton>

      <Modal
        open={open !== null}
        title={open?.name ?? ''}
        onClose={() => setOpenId(null)}
      >
        {open && (
          <ScenarioDetail
            scenario={open}
            baseline={baseline}
            onClose={() => setOpenId(null)}
          />
        )}
      </Modal>
    </div>
  )
}

function ScenarioDetail({
  scenario,
  baseline,
  onClose,
}: {
  scenario: Scenario
  baseline: { income: number; expense: number }
  onClose: () => void
}) {
  const {
    updateScenario,
    deleteScenario,
    addScenarioItem,
    deleteScenarioItem,
  } = useApp()

  const [itemName, setItemName] = useState('')
  const [itemAmount, setItemAmount] = useState(0)
  const [itemKind, setItemKind] = useState<'income' | 'expense'>('income')

  const extraIncome = scenario.items
    .filter((i) => i.kind === 'income')
    .reduce((a, i) => a + i.amount, 0)
  const extraExpense = scenario.items
    .filter((i) => i.kind === 'expense')
    .reduce((a, i) => a + i.amount, 0)

  const currentLeftover = baseline.income - baseline.expense
  const projIncome = baseline.income + extraIncome
  const projExpense = baseline.expense + extraExpense
  const projLeftover = projIncome - projExpense

  return (
    <div className="space-y-4">
      <TextField
        label="Nome do cenário"
        value={scenario.name}
        onChange={(v) => updateScenario(scenario.id, { name: v })}
      />
      <TextField
        label="Observações"
        value={scenario.notes}
        onChange={(v) => updateScenario(scenario.id, { notes: v })}
        placeholder="Anotações sobre a proposta"
      />

      {/* Comparação lado a lado */}
      <div className="grid grid-cols-2 gap-2">
        <CompareCol
          title="Atual"
          income={baseline.income}
          expense={baseline.expense}
          leftover={currentLeftover}
          highlight={false}
        />
        <CompareCol
          title="Projetado"
          income={projIncome}
          expense={projExpense}
          leftover={projLeftover}
          highlight
        />
      </div>
      <p className="text-center text-sm">
        Diferença no que sobra:{' '}
        <span
          className={`font-bold ${
            projLeftover - currentLeftover >= 0
              ? 'text-emerald-600'
              : 'text-rose-600'
          }`}
        >
          {projLeftover - currentLeftover >= 0 ? '+' : ''}
          {formatBRL(projLeftover - currentLeftover)}/mês
        </span>
      </p>

      {/* Itens do cenário */}
      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">
          Itens do cenário
        </p>
        <ul className="divide-y divide-slate-100 rounded-xl bg-slate-50">
          {scenario.items.map((i) => (
            <li key={i.id} className="flex items-center gap-2 px-3 py-2">
              <span className="text-xs">
                {i.kind === 'income' ? '🟢' : '🔴'}
              </span>
              <span className="flex-1 text-sm text-slate-700">{i.name}</span>
              <span className="text-sm tabular-nums text-slate-600">
                {formatBRL(i.amount)}
              </span>
              <button
                onClick={() => deleteScenarioItem(scenario.id, i.id)}
                className="text-slate-300 hover:text-rose-500"
                aria-label="Remover item"
              >
                ✕
              </button>
            </li>
          ))}
          {scenario.items.length === 0 && (
            <li className="px-3 py-2 text-center text-xs text-slate-400">
              Adicione rendas extras e gastos estimados.
            </li>
          )}
        </ul>
      </div>

      {/* Adicionar item */}
      <div className="space-y-2 rounded-xl border border-dashed border-slate-200 p-3">
        <TextField
          label="Descrição do item"
          value={itemName}
          onChange={setItemName}
          placeholder="Ex.: Novo salário"
        />
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Tipo"
            value={itemKind}
            onChange={setItemKind}
            options={[
              { value: 'income', label: 'Renda extra' },
              { value: 'expense', label: 'Gasto extra' },
            ]}
          />
          <MoneyField label="Valor" value={itemAmount} onChange={setItemAmount} />
        </div>
        <button
          disabled={itemName.trim() === '' || itemAmount <= 0}
          onClick={() => {
            addScenarioItem(scenario.id, {
              kind: itemKind,
              name: itemName.trim(),
              amount: itemAmount,
            })
            setItemName('')
            setItemAmount(0)
          }}
          className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          + Adicionar item
        </button>
      </div>

      <button
        onClick={() => {
          deleteScenario(scenario.id)
          onClose()
        }}
        className="w-full rounded-xl py-2.5 text-sm font-medium text-rose-600"
      >
        Excluir cenário
      </button>
    </div>
  )
}

function CompareCol({
  title,
  income,
  expense,
  leftover,
  highlight,
}: {
  title: string
  income: number
  expense: number
  leftover: number
  highlight: boolean
}) {
  return (
    <div
      className={`rounded-xl p-3 ${
        highlight ? 'bg-teal-50 ring-1 ring-teal-200' : 'bg-slate-50'
      }`}
    >
      <p className="mb-2 text-center text-xs font-semibold text-slate-500">
        {title}
      </p>
      <Line label="Renda" value={income} />
      <Line label="Gastos" value={expense} />
      <div className="my-1 border-t border-slate-200" />
      <Line label="Sobra" value={leftover} bold />
    </div>
  )
}

function Line({
  label,
  value,
  bold,
}: {
  label: string
  value: number
  bold?: boolean
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span
        className={`tabular-nums ${bold ? 'font-bold' : ''} ${
          value < 0 ? 'text-rose-600' : 'text-slate-700'
        }`}
      >
        {formatBRL(value)}
      </span>
    </div>
  )
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'accent' | 'negative' | 'positive'
}) {
  const cls =
    tone === 'accent'
      ? 'text-teal-700'
      : tone === 'negative'
        ? 'text-rose-600'
        : 'text-emerald-600'
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${cls}`}>
        {formatBRL(value)}
      </p>
    </div>
  )
}
