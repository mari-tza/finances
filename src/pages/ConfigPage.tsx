import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { TextField } from '../components/inputs'

export function ConfigPage() {
  const {
    household,
    updateHousehold,
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
  } = useApp()
  const [newAccount, setNewAccount] = useState('')

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">A casa</h2>
        <TextField
          label="Nome da casa"
          value={household.name}
          onChange={(v) => updateHousehold({ name: v })}
        />
        <TextField
          label="Dia de fechamento da fatura"
          type="number"
          value={String(household.closingDay)}
          onChange={(v) =>
            updateHousehold({
              closingDay: Math.min(28, Math.max(1, Number(v) || 1)),
            })
          }
        />
        <p className="text-xs text-slate-400">
          Os ciclos viram automaticamente neste dia. (No app real, mudar isto
          recriará os próximos ciclos.)
        </p>
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">
          Cartões / bancos
        </h2>
        <p className="text-xs text-slate-400">
          Use como etiqueta nos gastos (ex.: Itaú, Nubank).
        </p>
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <input
                value={a.name}
                onChange={(e) => updateAccount({ ...a, name: e.target.value })}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:bg-white"
              />
              <button
                onClick={() => deleteAccount(a.id)}
                className="text-slate-300 hover:text-rose-500"
                aria-label="Excluir"
              >
                🗑️
              </button>
            </li>
          ))}
          {accounts.length === 0 && (
            <li className="text-center text-xs text-slate-400">
              Nenhum cartão cadastrado.
            </li>
          )}
        </ul>
        <div className="flex gap-2">
          <input
            value={newAccount}
            onChange={(e) => setNewAccount(e.target.value)}
            placeholder="Ex.: Nubank"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:bg-white"
          />
          <button
            onClick={() => {
              if (newAccount.trim()) {
                addAccount(newAccount.trim())
                setNewAccount('')
              }
            }}
            className="rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white"
          >
            Adicionar
          </button>
        </div>
      </div>

      <p className="px-2 text-center text-xs text-slate-400">
        Dados de exemplo em memória · Fase 1. Tudo volta ao recarregar a página.
      </p>
    </div>
  )
}
