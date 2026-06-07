import { useState } from 'react'
import { CycleSelector } from '../components/CycleSelector'
import { useApp, useSelectedCycle } from '../store/AppContext'
import { MoneyField, PrimaryButton } from '../components/inputs'
import { formatBRL } from '../utils/format'

export function CardPage() {
  const { accounts, cardBills, setCardBill, addAccount } = useApp()
  const cycle = useSelectedCycle()
  const [newCard, setNewCard] = useState('')

  const billFor = (accountId: string) =>
    cardBills.find((b) => b.cycleId === cycle.id && b.accountId === accountId)
      ?.amount ?? 0
  const total = accounts.reduce((s, a) => s + billFor(a.id), 0)

  return (
    <div className="space-y-4">
      <CycleSelector />

      <div className="rounded-2xl bg-teal-700 p-4 text-white shadow-sm">
        <p className="text-xs text-teal-100">
          Fatura parcial do cartão · {cycle.label}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {formatBRL(total)}
        </p>
      </div>

      <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
        Atualize o valor atual de cada cartão ao longo do mês. Ele entra no
        total do ciclo (no Início) pra você ter noção do mês atual. Quando a
        fatura fechar e você importar os gastos, <strong>zere aqui</strong> pra
        não contar duas vezes.
      </p>

      {accounts.map((a) => (
        <CardBillRow
          key={`${cycle.id}-${a.id}`}
          name={a.name}
          initial={billFor(a.id)}
          onSave={(v) => setCardBill(cycle.id, a.id, v)}
        />
      ))}

      {accounts.length === 0 && (
        <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-400 shadow-sm">
          Adicione um cartão abaixo para começar.
        </p>
      )}

      {/* Adicionar cartão */}
      <div className="flex gap-2">
        <input
          value={newCard}
          onChange={(e) => setNewCard(e.target.value)}
          placeholder="Novo cartão (ex.: Nubank)"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
        <button
          onClick={() => {
            if (newCard.trim()) {
              addAccount(newCard.trim())
              setNewCard('')
            }
          }}
          className="rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white"
        >
          + Cartão
        </button>
      </div>
    </div>
  )
}

function CardBillRow({
  name,
  initial,
  onSave,
}: {
  name: string
  initial: number
  onSave: (v: number) => void
}) {
  const [amount, setAmount] = useState(initial)
  const [saved, setSaved] = useState(false)

  return (
    <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
      <p className="text-sm font-medium text-slate-800">{name}</p>
      <MoneyField
        label="Valor atual da fatura"
        value={amount}
        onChange={(v) => {
          setAmount(v)
          setSaved(false)
        }}
      />
      <PrimaryButton
        onClick={() => {
          onSave(amount)
          setSaved(true)
        }}
      >
        {saved ? 'Salvo ✓' : 'Salvar'}
      </PrimaryButton>
    </div>
  )
}
