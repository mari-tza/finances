import { useMemo, useState } from 'react'
import { addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Investment } from '../types'
import { useApp } from '../store/AppContext'
import { Modal } from '../components/Modal'
import { MoneyField, PrimaryButton, TextField } from '../components/inputs'
import { formatBRL } from '../utils/format'

const MONTHS = 12

export function InvestmentsPage() {
  const {
    investments,
    fixedExpenses,
    expenses,
    addInvestment,
    updateInvestment,
    deleteInvestment,
  } = useApp()
  const [editing, setEditing] = useState<
    Investment | { kind: 'yield' | 'bem' } | null
  >(null)

  const yields = investments.filter((i) => i.kind === 'yield')
  const bens = investments.filter((i) => i.kind === 'bem')
  const aportes = fixedExpenses.filter((f) => f.isInvestment && f.active)

  const totalYield = yields.reduce((s, i) => s + i.balance, 0)
  const totalBem = bens.reduce((s, i) => s + i.balance, 0)
  const totalAporte = aportes.reduce((s, a) => s + (a.investedSoFar ?? 0), 0)
  const total = totalYield + totalBem + totalAporte

  const monthlyYield = yields.reduce(
    (s, i) => s + i.balance * ((i.monthlyRatePercent ?? 0) / 100),
    0,
  )
  const monthlyAporte = aportes.reduce((s, a) => s + a.amount, 0)

  // Custos vinculados a um bem
  const bemFixed = (id: string) =>
    fixedExpenses
      .filter((f) => f.active && f.assetId === id)
      .reduce((s, f) => s + f.amount, 0)
  const bemVariable = (id: string) =>
    expenses.filter((e) => e.assetId === id).reduce((s, e) => s + e.amount, 0)

  // Projeção do patrimônio total
  const projection = useMemo(() => {
    const data: { label: string; total: number }[] = []
    for (let m = 0; m <= MONTHS; m++) {
      const y = yields.reduce(
        (s, i) => s + i.balance * Math.pow(1 + (i.monthlyRatePercent ?? 0) / 100, m),
        0,
      )
      const a = aportes.reduce((s, ap) => s + (ap.investedSoFar ?? 0) + ap.amount * m, 0)
      const label =
        m === 0 ? 'Hoje' : format(addMonths(new Date(), m), 'MMM/yy', { locale: ptBR })
      data.push({ label, total: Math.round(y + totalBem + a) })
    }
    return data
  }, [yields, aportes, totalBem])

  const in12 = projection[projection.length - 1]?.total ?? total
  const growth = in12 - total

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="rounded-2xl bg-teal-700 p-4 text-white shadow-sm">
        <p className="text-xs text-teal-100">Patrimônio total</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{formatBRL(total)}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-teal-50">
          <div>
            <p className="opacity-80">Rende</p>
            <p className="font-semibold">{formatBRL(totalYield)}</p>
          </div>
          <div>
            <p className="opacity-80">Aportes</p>
            <p className="font-semibold">{formatBRL(totalAporte)}</p>
          </div>
          <div>
            <p className="opacity-80">Bens</p>
            <p className="font-semibold">{formatBRL(totalBem)}</p>
          </div>
        </div>
      </div>

      {/* Projeção */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-700">
          Projeção do patrimônio
        </p>
        <p className="mb-2 text-xs text-slate-400">
          Em 12 meses: <strong>{formatBRL(in12)}</strong> (
          <span className="text-emerald-600">+{formatBRL(growth)}</span>) · rende{' '}
          {formatBRL(monthlyYield)}/mês + aportes {formatBRL(monthlyAporte)}/mês
        </p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projection} margin={{ left: 4, right: 8, top: 4 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                interval={2}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Tooltip
                formatter={(v: number) => formatBRL(v)}
                contentStyle={{ borderRadius: 12, fontSize: 13 }}
              />
              <Line type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rende mensal */}
      <Section title="📈 Rende mensal">
        {yields.map((i) => (
          <Row key={i.id} onClick={() => setEditing(i)} title={i.name}
            subtitle={`${i.monthlyRatePercent}%/mês · rende ${formatBRL(i.balance * ((i.monthlyRatePercent ?? 0) / 100))}/mês`}
            value={formatBRL(i.balance)} />
        ))}
        <PrimaryButton onClick={() => setEditing({ kind: 'yield' })}>
          + Investimento que rende
        </PrimaryButton>
      </Section>

      {/* Aportes */}
      <Section title="🤝 Aportes (consórcio)">
        {aportes.map((a) => (
          <Row key={a.id} title={a.name}
            subtitle={`+${formatBRL(a.amount)}/mês · já aportado`}
            value={formatBRL(a.investedSoFar ?? 0)} />
        ))}
        {aportes.length === 0 && <Empty text="Nenhum aporte." />}
        <p className="px-1 text-center text-xs text-slate-400">
          Aportes são criados na aba <strong>Fixos</strong> (toggle “é aporte”).
        </p>
      </Section>

      {/* Bens */}
      <Section title="🏞️ Bens (imóveis/terrenos)">
        {bens.map((b) => {
          const fx = bemFixed(b.id)
          const vr = bemVariable(b.id)
          return (
            <Row key={b.id} onClick={() => setEditing(b)} title={b.name}
              subtitle={`${fx ? `custo fixo ${formatBRL(fx)}/mês` : 'sem custo fixo'}${vr ? ` · variável já lançado ${formatBRL(vr)}` : ''}`}
              value={formatBRL(b.balance)} />
          )
        })}
        {bens.length === 0 && <Empty text="Nenhum bem cadastrado." />}
        <PrimaryButton onClick={() => setEditing({ kind: 'bem' })}>
          + Bem (terreno/imóvel)
        </PrimaryButton>
      </Section>

      <Modal
        open={editing !== null}
        title={
          editing && 'id' in editing
            ? 'Editar'
            : (editing as { kind: string })?.kind === 'bem'
              ? 'Novo bem'
              : 'Novo investimento'
        }
        onClose={() => setEditing(null)}
      >
        {editing !== null && (
          <AssetForm
            initial={'id' in editing ? editing : null}
            kind={'id' in editing ? editing.kind : editing.kind}
            onDelete={
              'id' in editing
                ? () => {
                    deleteInvestment(editing.id)
                    setEditing(null)
                  }
                : undefined
            }
            onSave={(data) => {
              if (editing && 'id' in editing) updateInvestment({ ...editing, ...data })
              else addInvestment(data)
              setEditing(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </section>
  )
}

function Row({
  title,
  subtitle,
  value,
  onClick,
}: {
  title: string
  subtitle: string
  value: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      <span className="text-sm font-semibold tabular-nums text-slate-700">{value}</span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-400 shadow-sm">
      {text}
    </p>
  )
}

function AssetForm({
  initial,
  kind,
  onSave,
  onDelete,
}: {
  initial: Investment | null
  kind: 'yield' | 'bem'
  onSave: (data: Omit<Investment, 'id'>) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [balance, setBalance] = useState(initial?.balance ?? 0)
  const [rateText, setRateText] = useState(
    initial?.monthlyRatePercent != null ? String(initial.monthlyRatePercent) : '',
  )
  const rate = Number(rateText.replace(',', '.')) || 0
  const isBem = kind === 'bem'
  const canSave = name.trim() !== '' && balance > 0

  return (
    <div className="space-y-3">
      <TextField
        label="Nome"
        value={name}
        onChange={setName}
        placeholder={isBem ? 'Ex.: Terreno Bairro Verde' : 'Ex.: Tesouro Selic'}
      />
      <MoneyField
        label={isBem ? 'Valor do bem' : 'Saldo atual'}
        value={balance}
        onChange={setBalance}
      />
      {!isBem && (
        <TextField
          label="Rendimento (% ao mês)"
          type="number"
          value={rateText}
          onChange={setRateText}
          placeholder="ex.: 0,9"
        />
      )}
      <div className="space-y-2 pt-1">
        <PrimaryButton
          disabled={!canSave}
          onClick={() =>
            onSave({
              name: name.trim(),
              kind,
              balance,
              monthlyRatePercent: isBem ? undefined : rate,
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
            Excluir
          </button>
        )}
      </div>
    </div>
  )
}
