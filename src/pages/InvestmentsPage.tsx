import { useEffect, useMemo, useState } from 'react'
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
import {
  MoneyField,
  PrimaryButton,
  SelectField,
  TextField,
} from '../components/inputs'
import type { AssetOutlay, Cycle } from '../types'
import { formatBRL } from '../utils/format'

const MONTHS = 12

export function InvestmentsPage() {
  const {
    investments,
    fixedExpenses,
    expenses,
    assetOutlays,
    setAssetOutlay,
    cycles,
    selectedCycleId,
    addInvestment,
    updateInvestment,
    deleteInvestment,
  } = useApp()
  const [editing, setEditing] = useState<
    Investment | { kind: 'yield' | 'bem' } | null
  >(null)
  const [bemDetail, setBemDetail] = useState<Investment | null>(null)

  const yields = investments.filter((i) => i.kind === 'yield')
  const bens = investments.filter((i) => i.kind === 'bem')
  const aportes = fixedExpenses.filter((f) => f.isInvestment && f.active)

  const totalYield = yields.reduce((s, i) => s + i.balance, 0)
  const totalBem = bens.reduce((s, i) => s + i.balance, 0)
  // Patrimônio = só o que rende + bens. Consórcio NÃO entra (dinheiro "preso").
  const total = totalYield + totalBem

  const monthlyYield = yields.reduce(
    (s, i) => s + i.balance * ((i.monthlyRatePercent ?? 0) / 100),
    0,
  )
  // Consórcio e afins: custo mensal e total já pago (só informativo).
  const investCostMonthly = aportes.reduce((s, a) => s + a.amount, 0)
  const investCostPaid = aportes.reduce((s, a) => s + (a.investedSoFar ?? 0), 0)

  // Custos vinculados a um bem
  const bemFixed = (id: string) =>
    fixedExpenses
      .filter((f) => f.active && f.assetId === id)
      .reduce((s, f) => s + f.amount, 0)
  const bemVariable = (id: string) =>
    expenses.filter((e) => e.assetId === id).reduce((s, e) => s + e.amount, 0)
  // Total já investido no bem via lançamentos mensais (outlays)
  const bemInvested = (id: string) =>
    assetOutlays.filter((o) => o.assetId === id).reduce((s, o) => s + o.amount, 0)

  // Projeção do patrimônio total
  const projection = useMemo(() => {
    const data: { label: string; total: number }[] = []
    for (let m = 0; m <= MONTHS; m++) {
      const y = yields.reduce(
        (s, i) => s + i.balance * Math.pow(1 + (i.monthlyRatePercent ?? 0) / 100, m),
        0,
      )
      const label =
        m === 0 ? 'Hoje' : format(addMonths(new Date(), m), 'MMM/yy', { locale: ptBR })
      data.push({ label, total: Math.round(y + totalBem) })
    }
    return data
  }, [yields, totalBem])

  const in12 = projection[projection.length - 1]?.total ?? total
  const growth = in12 - total

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="rounded-2xl bg-teal-700 p-4 text-white shadow-sm">
        <p className="text-xs text-teal-100">Patrimônio total</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{formatBRL(total)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs text-teal-50">
          <div>
            <p className="opacity-80">Rende</p>
            <p className="font-semibold">{formatBRL(totalYield)}</p>
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
          {formatBRL(monthlyYield)}/mês
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

      {/* Custos de investimento (consórcio etc.) — fora da projeção */}
      <Section title="💸 Custos de investimento">
        {aportes.map((a) => (
          <Row key={a.id} title={a.name}
            subtitle={`${formatBRL(a.amount)}/mês · já pago ${formatBRL(a.investedSoFar ?? 0)}`}
            value={`${formatBRL(a.amount)}/mês`} />
        ))}
        {aportes.length > 0 && (
          <p className="px-1 text-xs text-slate-400">
            Total {formatBRL(investCostMonthly)}/mês · já pago{' '}
            {formatBRL(investCostPaid)}. Não entra na projeção do patrimônio
            (dinheiro “preso”, ex.: consórcio).
          </p>
        )}
        {aportes.length === 0 && (
          <Empty text="Nenhum custo de investimento (consórcio etc.)." />
        )}
        <p className="px-1 text-center text-xs text-slate-400">
          Criados na aba <strong>Fixos</strong> (toggle “é aporte de
          investimento”).
        </p>
      </Section>

      {/* Bens */}
      <Section title="🏞️ Bens (imóveis/terrenos)">
        {bens.map((b) => {
          const base = b.monthlyCost ?? 0
          const fx = bemFixed(b.id)
          return (
            <Row key={b.id} onClick={() => setBemDetail(b)} title={b.name}
              subtitle={`custo ${formatBRL(base)}/mês${fx ? ` + fixo ${formatBRL(fx)}/mês` : ''}${b.balance > 0 ? ` · valor ${formatBRL(b.balance)}` : ''}`}
              value={formatBRL(base)} />
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

      <Modal
        open={bemDetail !== null}
        title={bemDetail?.name ?? 'Bem'}
        onClose={() => setBemDetail(null)}
      >
        {bemDetail && (
          <BemDetail
            bem={bemDetail}
            cycles={cycles}
            defaultCycleId={selectedCycleId}
            invested={bemInvested(bemDetail.id)}
            fixedMonthly={bemFixed(bemDetail.id)}
            variableLinked={bemVariable(bemDetail.id)}
            outlays={assetOutlays.filter((o) => o.assetId === bemDetail.id)}
            cycleLabel={(id) =>
              cycles.find((c) => c.id === id)?.label ?? id
            }
            onSave={(data) => updateInvestment({ ...bemDetail, ...data })}
            onSetOutlay={(cycleId, amount) =>
              setAssetOutlay(cycleId, bemDetail.id, amount)
            }
            onDelete={() => {
              deleteInvestment(bemDetail.id)
              setBemDetail(null)
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
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [monthlyCost, setMonthlyCost] = useState(initial?.monthlyCost ?? 0)
  const rate = Number(rateText.replace(',', '.')) || 0
  const isBem = kind === 'bem'
  const canSave = name.trim() !== '' && (isBem || balance > 0)

  return (
    <div className="space-y-3">
      <TextField
        label="Nome"
        value={name}
        onChange={setName}
        placeholder={isBem ? 'Ex.: Terreno Bairro Verde' : 'Ex.: Tesouro Selic'}
      />
      {!isBem && (
        <MoneyField label="Saldo atual" value={balance} onChange={setBalance} />
      )}
      {!isBem && (
        <TextField
          label="Rendimento (% ao mês)"
          type="number"
          value={rateText}
          onChange={setRateText}
          placeholder="ex.: 0,9"
        />
      )}
      {isBem && (
        <>
          <MoneyField
            label="Custo mensal (replica em todos os ciclos)"
            value={monthlyCost}
            onChange={setMonthlyCost}
          />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Início (opcional)" type="date" value={startDate} onChange={setStartDate} />
            <TextField label="Fim previsto (opcional)" type="date" value={endDate} onChange={setEndDate} />
          </div>
          <MoneyField
            label="Valor do bem (opcional)"
            value={balance}
            onChange={setBalance}
          />
        </>
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
              monthlyCost: isBem ? monthlyCost : undefined,
              startDate: isBem ? startDate || undefined : undefined,
              endDate: isBem ? endDate || undefined : undefined,
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

function BemDetail({
  bem,
  cycles,
  defaultCycleId,
  invested,
  fixedMonthly,
  variableLinked,
  outlays,
  cycleLabel,
  onSave,
  onSetOutlay,
  onDelete,
}: {
  bem: Investment
  cycles: Cycle[]
  defaultCycleId: string
  invested: number
  fixedMonthly: number
  variableLinked: number
  outlays: AssetOutlay[]
  cycleLabel: (id: string) => string
  onSave: (data: Partial<Investment>) => void
  onSetOutlay: (cycleId: string, amount: number) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(bem.name)
  const [monthlyCost, setMonthlyCost] = useState(bem.monthlyCost ?? 0)
  const [balance, setBalance] = useState(bem.balance)
  const [startDate, setStartDate] = useState(bem.startDate ?? '')
  const [endDate, setEndDate] = useState(bem.endDate ?? '')

  const [cycleId, setCycleId] = useState(defaultCycleId)
  const cycleOutlay = outlays.find((o) => o.cycleId === cycleId)?.amount ?? 0
  const [outlay, setOutlay] = useState(cycleOutlay)
  // ao trocar o ciclo, mostra o adicional já lançado naquele ciclo
  useEffect(() => setOutlay(cycleOutlay), [cycleId, cycleOutlay])

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[11px] text-slate-400">Custo mensal (base)</p>
          <p className="text-sm font-bold tabular-nums text-slate-700">
            {formatBRL(monthlyCost)}
          </p>
        </div>
        <div className="rounded-xl bg-teal-50 p-2">
          <p className="text-[11px] text-slate-400">Neste ciclo (base + adic.)</p>
          <p className="text-sm font-bold tabular-nums text-teal-700">
            {formatBRL(monthlyCost + outlay)}
          </p>
        </div>
      </div>

      <TextField label="Nome" value={name} onChange={setName} />
      <MoneyField
        label="Custo mensal (replica em todos os ciclos)"
        value={monthlyCost}
        onChange={setMonthlyCost}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Início" type="date" value={startDate} onChange={setStartDate} />
        <TextField label="Fim previsto" type="date" value={endDate} onChange={setEndDate} />
      </div>
      <MoneyField
        label="Valor do bem (opcional)"
        value={balance}
        onChange={setBalance}
      />
      <PrimaryButton
        onClick={() =>
          onSave({
            name: name.trim(),
            monthlyCost,
            balance,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          })
        }
      >
        Salvar dados
      </PrimaryButton>

      {/* Custos adicionais do ciclo (zeram a cada mês) */}
      <div className="space-y-2 rounded-xl border border-dashed border-slate-200 p-3">
        <p className="text-xs font-medium text-slate-500">
          Custos adicionais deste ciclo (só neste mês)
        </p>
        <SelectField
          label="Ciclo"
          value={cycleId}
          onChange={setCycleId}
          options={cycles.map((c) => ({ value: c.id, label: c.label }))}
        />
        <MoneyField
          label="Adicional neste ciclo"
          value={outlay}
          onChange={setOutlay}
        />
        <button
          onClick={() => onSetOutlay(cycleId, outlay)}
          className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-white"
        >
          Salvar adicional do ciclo
        </button>
        <p className="text-[11px] text-slate-400">
          Soma ao custo mensal só neste ciclo (não replica). Entra como
          “Investido”.
        </p>
      </div>

      {/* Histórico */}
      {outlays.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">
            Adicionais por ciclo (total {formatBRL(invested)})
          </p>
          <ul className="divide-y divide-slate-100 rounded-xl bg-slate-50">
            {[...outlays]
              .sort((a, b) => b.cycleId.localeCompare(a.cycleId))
              .map((o) => (
                <li key={o.id} className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-slate-600">{cycleLabel(o.cycleId)}</span>
                  <span className="tabular-nums text-slate-700">
                    {formatBRL(o.amount)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {(fixedMonthly > 0 || variableLinked > 0) && (
        <p className="text-xs text-slate-400">
          {fixedMonthly > 0 && `Custo fixo vinculado: ${formatBRL(fixedMonthly)}/mês. `}
          {variableLinked > 0 &&
            `Gastos variáveis vinculados: ${formatBRL(variableLinked)}.`}
        </p>
      )}

      <button
        onClick={onDelete}
        className="w-full rounded-xl py-2.5 text-sm font-medium text-rose-600"
      >
        Excluir bem
      </button>
    </div>
  )
}
