import { useState } from 'react'
import type { IncomeSource } from '../types'
import { useApp } from '../store/AppContext'
import { Modal } from '../components/Modal'
import { MoneyField, PrimaryButton, TextField } from '../components/inputs'
import { formatBRL } from '../utils/format'
import { computeIncome, hasDeductions } from '../utils/income'

export function IncomesPage() {
  const {
    incomeSources,
    addIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
  } = useApp()
  const [editing, setEditing] = useState<IncomeSource | 'new' | null>(null)

  // Total pelo valor LÍQUIDO (após imposto, desconto e dízimo).
  const active = incomeSources.filter((s) => s.active)
  const netOf = (s: IncomeSource) =>
    computeIncome(s.amount, s.taxPercent, s.tithePercent, s.discount).net
  const total = active.reduce((sum, s) => sum + netOf(s), 0)

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="rounded-2xl bg-teal-700 p-4 text-white shadow-sm">
        <p className="text-xs text-teal-100">Renda líquida do casal</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {formatBRL(total)}
        </p>
      </div>

      {/* Lista */}
      <ul className="space-y-2">
        {incomeSources.map((s) => {
          const b = computeIncome(
            s.amount,
            s.taxPercent,
            s.tithePercent,
            s.discount,
          )
          const withDeductions = hasDeductions(
            s.taxPercent,
            s.tithePercent,
            s.discount,
          )
          return (
            <li
              key={s.id}
              className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ${
                s.active ? '' : 'opacity-50'
              }`}
              onClick={() => setEditing(s)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {s.name}
                </p>
                <p className="text-xs text-slate-400">
                  todo dia {s.payDay}
                  {s.active ? '' : ' · inativa'}
                </p>
                {withDeductions && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    Bruto {formatBRL(b.gross)}
                    {s.taxPercent ? ` · imposto ${s.taxPercent}%` : ''}
                    {s.discount ? ` · desc. fixo ${formatBRL(s.discount)}` : ''}
                    {s.tithePercent ? ` · descontos ${s.tithePercent}%` : ''}
                  </p>
                )}
              </div>
              <span className="text-right text-sm font-semibold tabular-nums text-slate-700">
                {formatBRL(b.net)}
              </span>
            </li>
          )
        })}
      </ul>

      <PrimaryButton onClick={() => setEditing('new')}>
        + Nova fonte de renda
      </PrimaryButton>

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Nova renda' : 'Editar renda'}
        onClose={() => setEditing(null)}
      >
        {editing !== null && (
          <IncomeForm
            initial={editing === 'new' ? null : editing}
            onDelete={
              editing !== 'new'
                ? () => {
                    deleteIncomeSource(editing.id)
                    setEditing(null)
                  }
                : undefined
            }
            onSave={(data) => {
              if (editing === 'new') addIncomeSource(data)
              else updateIncomeSource({ ...editing, ...data })
              setEditing(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}

function IncomeForm({
  initial,
  onSave,
  onDelete,
}: {
  initial: IncomeSource | null
  onSave: (data: Omit<IncomeSource, 'id'>) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? 0)
  const [payDay, setPayDay] = useState(String(initial?.payDay ?? 5))
  const [active, setActive] = useState(initial?.active ?? true)
  const [taxText, setTaxText] = useState(
    initial?.taxPercent != null ? String(initial.taxPercent) : '',
  )
  const [titheText, setTitheText] = useState(
    initial?.tithePercent != null ? String(initial.tithePercent) : '',
  )
  const [discount, setDiscount] = useState(initial?.discount ?? 0)

  // "" -> undefined (campo opcional); senão número entre 0 e 100.
  const parsePercent = (t: string): number | undefined => {
    if (t.trim() === '') return undefined
    const n = Number(t.replace(',', '.'))
    if (!Number.isFinite(n)) return undefined
    return Math.min(100, Math.max(0, n))
  }
  const taxPercent = parsePercent(taxText)
  const tithePercent = parsePercent(titheText)
  const preview = computeIncome(amount, taxPercent, tithePercent, discount)
  const showPreview =
    amount > 0 && hasDeductions(taxPercent, tithePercent, discount)

  const canSave = name.trim() !== '' && amount > 0

  return (
    <div className="space-y-3">
      <TextField
        label="Nome"
        value={name}
        onChange={setName}
        placeholder="Ex.: Salário CLT"
      />
      <MoneyField label="Valor bruto mensal" value={amount} onChange={setAmount} />

      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="Imposto (%) — opcional"
          type="number"
          value={taxText}
          onChange={setTaxText}
          placeholder="ex.: 11"
        />
        <TextField
          label="Descontos (%) — opcional"
          type="number"
          value={titheText}
          onChange={setTitheText}
          placeholder="ex.: 10"
        />
      </div>

      <MoneyField
        label="Desconto fixo (R$) — opcional"
        value={discount}
        onChange={setDiscount}
      />

      {showPreview && (
        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>Bruto</span>
            <span className="tabular-nums">{formatBRL(preview.gross)}</span>
          </div>
          {taxPercent ? (
            <div className="flex justify-between text-rose-500">
              <span>− Imposto ({taxPercent}%)</span>
              <span className="tabular-nums">−{formatBRL(preview.tax)}</span>
            </div>
          ) : null}
          {discount > 0 ? (
            <div className="flex justify-between text-rose-500">
              <span>− Desconto fixo</span>
              <span className="tabular-nums">−{formatBRL(preview.discount)}</span>
            </div>
          ) : null}
          {tithePercent ? (
            <div className="flex justify-between text-rose-500">
              <span>− Descontos ({tithePercent}%)</span>
              <span className="tabular-nums">−{formatBRL(preview.tithe)}</span>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-700">
            <span>Líquido</span>
            <span className="tabular-nums">{formatBRL(preview.net)}</span>
          </div>
        </div>
      )}

      <TextField
        label="Dia do recebimento"
        type="number"
        value={payDay}
        onChange={setPayDay}
      />
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 accent-teal-600"
        />
        Renda ativa (entra nos ciclos)
      </label>

      <div className="space-y-2 pt-1">
        <PrimaryButton
          disabled={!canSave}
          onClick={() =>
            onSave({
              name: name.trim(),
              amount,
              payDay: Number(payDay) || 1,
              active,
              taxPercent,
              tithePercent,
              discount: discount > 0 ? discount : undefined,
            })
          }
        >
          Salvar
        </PrimaryButton>
        {onDelete && (
          <button
            onClick={onDelete}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-rose-600"
          >
            Excluir renda
          </button>
        )}
      </div>
    </div>
  )
}
