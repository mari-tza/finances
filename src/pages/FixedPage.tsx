import { useState } from 'react'
import type { FixedExpense, Installment } from '../types'
import { useApp, useCategoryMap } from '../store/AppContext'
import { Modal } from '../components/Modal'
import {
  MoneyField,
  PrimaryButton,
  SelectField,
  TextField,
} from '../components/inputs'
import { formatBRL } from '../utils/format'

export function FixedPage() {
  const {
    fixedExpenses,
    installments,
    investments,
    accounts,
    cycles,
    selectedCycleId,
    categories,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    addInstallment,
    deleteInstallment,
  } = useApp()
  const catMap = useCategoryMap()
  const bens = investments.filter((i) => i.kind === 'bem')

  const [editingFixed, setEditingFixed] = useState<FixedExpense | 'new' | null>(
    null,
  )
  const [addingInstallment, setAddingInstallment] = useState(false)

  const fixedTotal = fixedExpenses
    .filter((f) => f.active)
    .reduce((s, f) => s + f.amount, 0)

  const cycleLabel = (id: string) =>
    cycles.find((c) => c.id === id)?.label ?? '—'

  return (
    <div className="space-y-5">
      {/* ---- Custos fixos ---- */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Custos fixos</h2>
          <span className="text-sm font-bold tabular-nums text-slate-700">
            {formatBRL(fixedTotal)}/mês
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Entram automaticamente em todos os ciclos.
        </p>

        <ul className="space-y-2">
          {fixedExpenses.map((f) => {
            const c = catMap[f.categoryId]
            return (
              <li
                key={f.id}
                onClick={() => setEditingFixed(f)}
                className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ${
                  f.active ? '' : 'opacity-50'
                }`}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg"
                  style={{ backgroundColor: (c?.color ?? '#64748b') + '22' }}
                >
                  {c?.icon ?? '📦'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {f.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {c?.name ?? 'Outros'}
                    {f.active ? '' : ' · inativo'}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-slate-700">
                  {formatBRL(f.amount)}
                </span>
              </li>
            )
          })}
        </ul>

        <PrimaryButton onClick={() => setEditingFixed('new')}>
          + Novo custo fixo
        </PrimaryButton>
      </section>

      {/* ---- Compras parceladas ---- */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">
          Compras parceladas
        </h2>
        <p className="text-xs text-slate-400">
          Cada parcela aparece no ciclo correspondente.
        </p>

        <ul className="space-y-2">
          {installments.map((i) => {
            const c = catMap[i.categoryId]
            return (
              <li
                key={i.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg"
                  style={{ backgroundColor: (c?.color ?? '#64748b') + '22' }}
                >
                  {c?.icon ?? '📦'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {i.description}
                  </p>
                  <p className="text-xs text-slate-400">
                    {i.count}x de {formatBRL(i.installmentAmount)} · começa em{' '}
                    {cycleLabel(i.firstCycleId)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-slate-700">
                    {formatBRL(i.installmentAmount * i.count)}
                  </p>
                  <button
                    onClick={() => deleteInstallment(i.id)}
                    className="text-xs text-rose-500"
                  >
                    excluir
                  </button>
                </div>
              </li>
            )
          })}
          {installments.length === 0 && (
            <li className="rounded-2xl bg-white p-4 text-center text-sm text-slate-400 shadow-sm">
              Nenhuma compra parcelada.
            </li>
          )}
        </ul>

        <PrimaryButton onClick={() => setAddingInstallment(true)}>
          + Nova compra parcelada
        </PrimaryButton>
      </section>

      {/* ---- Modais ---- */}
      <Modal
        open={editingFixed !== null}
        title={editingFixed === 'new' ? 'Novo custo fixo' : 'Editar custo fixo'}
        onClose={() => setEditingFixed(null)}
      >
        {editingFixed !== null && (
          <FixedForm
            initial={editingFixed === 'new' ? null : editingFixed}
            categories={categories}
            bens={bens}
            onDelete={
              editingFixed !== 'new'
                ? () => {
                    deleteFixedExpense(editingFixed.id)
                    setEditingFixed(null)
                  }
                : undefined
            }
            onSave={(data) => {
              if (editingFixed === 'new') addFixedExpense(data)
              else updateFixedExpense({ ...editingFixed, ...data })
              setEditingFixed(null)
            }}
          />
        )}
      </Modal>

      <Modal
        open={addingInstallment}
        title="Nova compra parcelada"
        onClose={() => setAddingInstallment(false)}
      >
        <InstallmentForm
          categories={categories}
          accounts={accounts}
          cycles={cycles}
          defaultCycleId={selectedCycleId}
          onSave={(data) => {
            addInstallment(data)
            setAddingInstallment(false)
          }}
        />
      </Modal>
    </div>
  )
}

function FixedForm({
  initial,
  categories,
  bens,
  onSave,
  onDelete,
}: {
  initial: FixedExpense | null
  categories: { id: string; name: string; icon: string }[]
  bens: { id: string; name: string }[]
  onSave: (data: Omit<FixedExpense, 'id'>) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? 0)
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0].id,
  )
  const [active, setActive] = useState(initial?.active ?? true)
  const [isInvestment, setIsInvestment] = useState(initial?.isInvestment ?? false)
  const [investedSoFar, setInvestedSoFar] = useState(initial?.investedSoFar ?? 0)
  const [assetId, setAssetId] = useState(initial?.assetId ?? '')

  const canSave = name.trim() !== '' && amount > 0

  return (
    <div className="space-y-3">
      <TextField
        label="Nome"
        value={name}
        onChange={setName}
        placeholder="Ex.: Aluguel"
      />
      <MoneyField label="Valor mensal" value={amount} onChange={setAmount} />
      <SelectField
        label="Categoria"
        value={categoryId}
        onChange={setCategoryId}
        options={categories.map((c) => ({
          value: c.id,
          label: `${c.icon} ${c.name}`,
        }))}
      />
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 accent-teal-600"
        />
        Ativo (entra nos ciclos)
      </label>

      {/* É aporte de investimento? (ex.: consórcio) */}
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={isInvestment}
          onChange={(e) => setIsInvestment(e.target.checked)}
          className="h-4 w-4 accent-teal-600"
        />
        É um aporte de investimento? (consórcio, etc.)
      </label>
      {isInvestment && (
        <MoneyField
          label="Total já aportado até hoje"
          value={investedSoFar}
          onChange={setInvestedSoFar}
        />
      )}

      {/* Vincular a um bem (terreno/imóvel) */}
      {bens.length > 0 && (
        <SelectField
          label="Vincular a um bem (opcional)"
          value={assetId}
          onChange={setAssetId}
          options={[
            { value: '', label: '— nenhum —' },
            ...bens.map((b) => ({ value: b.id, label: b.name })),
          ]}
        />
      )}

      <div className="space-y-2 pt-1">
        <PrimaryButton
          disabled={!canSave}
          onClick={() =>
            onSave({
              name: name.trim(),
              amount,
              categoryId,
              active,
              isInvestment,
              investedSoFar: isInvestment ? investedSoFar : undefined,
              assetId: assetId || undefined,
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
            Excluir custo fixo
          </button>
        )}
      </div>
    </div>
  )
}

function InstallmentForm({
  categories,
  accounts,
  cycles,
  defaultCycleId,
  onSave,
}: {
  categories: { id: string; name: string; icon: string }[]
  accounts: { id: string; name: string }[]
  cycles: { id: string; label: string }[]
  defaultCycleId: string
  onSave: (data: Omit<Installment, 'id'>) => void
}) {
  const [description, setDescription] = useState('')
  const [installmentAmount, setInstallmentAmount] = useState(0)
  const [countText, setCountText] = useState('2')
  const [firstCycleId, setFirstCycleId] = useState(defaultCycleId)
  const [categoryId, setCategoryId] = useState(categories[0].id)
  const [accountId, setAccountId] = useState('')

  const count = Math.max(1, Number(countText) || 1)
  const total = installmentAmount * count
  const canSave =
    description.trim() !== '' && installmentAmount > 0 && count >= 1

  return (
    <div className="space-y-3">
      <TextField
        label="Descrição"
        value={description}
        onChange={setDescription}
        placeholder="Ex.: Geladeira"
      />
      <div className="grid grid-cols-2 gap-2">
        <MoneyField
          label="Valor da parcela"
          value={installmentAmount}
          onChange={setInstallmentAmount}
        />
        <TextField
          label="Nº de parcelas"
          type="number"
          value={countText}
          onChange={setCountText}
        />
      </div>

      {installmentAmount > 0 && (
        <p className="rounded-xl bg-slate-50 p-2.5 text-center text-xs text-slate-500">
          {count}x de {formatBRL(installmentAmount)} ={' '}
          <span className="font-semibold text-slate-700">
            {formatBRL(total)}
          </span>
        </p>
      )}

      <SelectField
        label="1ª parcela cai em"
        value={firstCycleId}
        onChange={setFirstCycleId}
        options={cycles.map((c) => ({ value: c.id, label: c.label }))}
      />
      <SelectField
        label="Categoria"
        value={categoryId}
        onChange={setCategoryId}
        options={categories.map((c) => ({
          value: c.id,
          label: `${c.icon} ${c.name}`,
        }))}
      />
      {accounts.length > 0 && (
        <SelectField
          label="Cartão / banco (opcional)"
          value={accountId}
          onChange={setAccountId}
          options={[
            { value: '', label: '— nenhum —' },
            ...accounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
      )}

      <div className="pt-1">
        <PrimaryButton
          disabled={!canSave}
          onClick={() =>
            onSave({
              description: description.trim(),
              installmentAmount,
              count,
              firstCycleId,
              categoryId,
              accountId: accountId || undefined,
            })
          }
        >
          Adicionar parcelamento
        </PrimaryButton>
      </div>
    </div>
  )
}
