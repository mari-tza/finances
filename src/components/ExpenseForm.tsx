import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { MoneyField, PrimaryButton, SelectField, TextField } from './inputs'
import { formatBRL } from '../utils/format'

interface ExpenseFormProps {
  cycleId: string
  defaultDate: string
  onDone: () => void
}

export function ExpenseForm({ cycleId, defaultDate, onDone }: ExpenseFormProps) {
  const { categories, accounts, investments, addExpense, addInstallment } =
    useApp()
  const bens = investments.filter((i) => i.kind === 'bem')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(0)
  const [categoryId, setCategoryId] = useState(categories[0].id)
  const [date, setDate] = useState(defaultDate)
  const [parcelasText, setParcelasText] = useState('1')
  const [assetId, setAssetId] = useState('')
  const [accountId, setAccountId] = useState('')

  const count = Math.max(1, Math.floor(Number(parcelasText) || 1))
  const isInstallment = count > 1
  // Valor é o TOTAL; dividimos em parcelas iguais (centavos arredondados).
  const parcela = isInstallment ? Math.round((amount / count) * 100) / 100 : amount

  const canSave = description.trim() !== '' && amount > 0

  const submit = () => {
    if (!canSave) return
    if (isInstallment) {
      addInstallment({
        description: description.trim(),
        installmentAmount: parcela,
        count,
        firstCycleId: cycleId, // começa no ciclo que está aberto
        categoryId,
        accountId: accountId || undefined,
      })
    } else {
      addExpense({
        cycleId,
        description: description.trim(),
        amount,
        categoryId,
        date,
        accountId: accountId || undefined,
        assetId: assetId || undefined,
      })
    }
    onDone()
  }

  return (
    <div className="space-y-3">
      <TextField
        label="Descrição"
        value={description}
        onChange={setDescription}
        placeholder="Ex.: IPVA"
      />

      <div className="grid grid-cols-2 gap-2">
        <MoneyField
          label={isInstallment ? 'Valor total' : 'Valor'}
          value={amount}
          onChange={setAmount}
        />
        <TextField
          label="Parcelas"
          type="number"
          value={parcelasText}
          onChange={setParcelasText}
        />
      </div>

      {isInstallment && amount > 0 && (
        <p className="rounded-xl bg-amber-50 p-2.5 text-center text-xs text-amber-700">
          {count}x de{' '}
          <span className="font-semibold">{formatBRL(parcela)}</span> · 1ª
          parcela neste ciclo
        </p>
      )}

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

      {/* A data só importa para gasto à vista; parcela usa o ciclo. */}
      {!isInstallment && (
        <TextField label="Data" type="date" value={date} onChange={setDate} />
      )}

      {!isInstallment && bens.length > 0 && (
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

      <div className="pt-1">
        <PrimaryButton onClick={submit} disabled={!canSave}>
          {isInstallment ? `Adicionar em ${count}x` : 'Adicionar gasto'}
        </PrimaryButton>
      </div>
    </div>
  )
}
