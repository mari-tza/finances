import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import {
  parseStatement,
  parseFaturaText,
  expenseSign,
  type ParsedTxn,
} from '../utils/parseStatement'
import {
  parseItauFatura,
  type ItauCheck,
  type FutureInstallment,
} from '../utils/parseItauFatura'
import { categorize, learnMerchant } from '../utils/categoryRules'
import { extractPdfText } from '../utils/pdf'
import { formatBRL, formatDayMonth } from '../utils/format'

interface Row {
  id: string
  include: boolean
  date: string
  description: string
  amount: number
  categoryId: string
  cycleId: string
  cycleLabel: string
  itauCategory?: string
  note?: string
  hash?: string
  duplicate?: boolean
  installmentCurrent?: number
  installmentTotal?: number
}

const HASH_KEY = 'importedHashes.v1'

function loadHashes(): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(HASH_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}
function saveHashes(set: Set<string>) {
  try {
    localStorage.setItem(HASH_KEY, JSON.stringify([...set]))
  } catch {
    /* ignora */
  }
}

export function ImportPage() {
  const { categories, accounts, cycles, addExpense, addInstallment, selectedCycleId } =
    useApp()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const [importedCount, setImportedCount] = useState(0)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [checks, setChecks] = useState<ItauCheck[]>([])
  const [future, setFuture] = useState<FutureInstallment[]>([])
  // Cartão/banco desta fatura (aplicado a todos os lançamentos importados).
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')

  const validIds = new Set(categories.map((c) => c.id))
  const selectedCycle =
    cycles.find((c) => c.id === selectedCycleId) ?? cycles[0]
  const importedHashes = loadHashes()

  const assignCycle = (dateISO: string) => {
    const c = cycles.find((c) => dateISO >= c.startDate && dateISO <= c.endDate)
    return c ?? selectedCycle
  }

  // ---- Caminho genérico (OFX/CSV/texto colado) ----
  const buildRowsGeneric = (txns: ParsedTxn[]) => {
    if (txns.length === 0) {
      setRows(null)
      setError(
        'Não consegui identificar lançamentos. Me cole 3-4 linhas da fatura que eu ajusto o leitor.',
      )
      return
    }
    setError('')
    setChecks([])
    setFuture([])
    const sign = expenseSign(txns)
    setRows(
      txns.map((t, i) => {
        const cyc = assignCycle(t.dateISO)
        return {
          id: `row-${i}`,
          include: Math.sign(t.value) === sign,
          date: t.dateISO,
          description: t.description,
          amount: Math.abs(t.value),
          categoryId: categorize(t.description, undefined, validIds),
          cycleId: cyc.id,
          cycleLabel: cyc.label,
        }
      }),
    )
  }

  // ---- Caminho Itaú (PDF reconhecido) ----
  const buildRowsItau = (text: string) => {
    const fatura = parseItauFatura(text, selectedCycle.endDate)
    if (!fatura.recognized || fatura.items.length === 0) {
      // não parece Personnalité → tenta como texto de fatura genérico
      buildRowsGeneric(parseFaturaText(text, selectedCycle.endDate))
      return
    }
    setError('')
    setChecks(fatura.checks)
    setFuture(fatura.future)
    setRows(
      fatura.items.map((it, i) => {
        const isParcela = it.installmentTotal != null
        const cyc = isParcela ? selectedCycle : assignCycle(it.dateISO)
        const dup = it.hash ? importedHashes.has(it.hash) : false
        return {
          id: `row-${i}`,
          include: it.value >= 0 && !dup,
          date: it.dateISO,
          description: it.cleanName,
          amount: Math.abs(it.value),
          categoryId: categorize(it.cleanName, it.itauCategory, validIds),
          cycleId: cyc.id,
          cycleLabel: cyc.label,
          itauCategory: it.itauCategory,
          note: isParcela
            ? `Parcela ${it.installmentCurrent}/${it.installmentTotal}`
            : it.value < 0
              ? 'estorno'
              : undefined,
          hash: it.hash,
          duplicate: dup,
          installmentCurrent: it.installmentCurrent,
          installmentTotal: it.installmentTotal,
        }
      }),
    )
  }

  async function handleFile(file: File) {
    setError('')
    setImportedCount(0)
    setFileName(file.name)
    setLoading(true)
    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      if (isPdf) {
        buildRowsItau(await extractPdfText(file))
      } else {
        const text = await file.text()
        const txns = parseStatement(text)
        if (txns.length > 0) buildRowsGeneric(txns)
        else buildRowsItau(text)
      }
    } catch {
      setError('Erro ao ler o arquivo.')
      setRows(null)
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = () => {
    setError('')
    setImportedCount(0)
    setFileName('texto colado')
    buildRowsItau(pasteText)
  }

  const patch = (id: string, p: Partial<Row>) =>
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, ...p } : r)) ?? prev)

  const included = rows?.filter((r) => r.include) ?? []
  const total = included.reduce((s, r) => s + r.amount, 0)
  const failedChecks = checks.filter((c) => !c.ok)

  const confirmImport = () => {
    const hashes = loadHashes()
    for (const r of included) {
      learnMerchant(r.description, r.categoryId)
      const desc = r.description.trim() || 'Lançamento'

      // Parcela detectada → cria/garante o parcelamento (projeta as próximas).
      if (r.installmentTotal && r.installmentCurrent) {
        const total = r.installmentTotal
        const current = r.installmentCurrent
        // dedup por compra (mesmo nome+total+valor) — evita duplicar em faturas seguidas
        const instHash = `inst:${desc.toUpperCase()}|${total}|${r.amount.toFixed(2)}`
        if (!hashes.has(instHash)) {
          addInstallment({
            description: desc,
            installmentAmount: r.amount,
            count: total - current + 1, // desta parcela até a última
            firstCycleId: r.cycleId, // ciclo da fatura atual
            categoryId: r.categoryId,
            accountId: accountId || undefined,
            startNumber: current,
            totalParcelas: total,
          })
          hashes.add(instHash)
        }
        continue // não lança como gasto avulso (a parcela vem do parcelamento)
      }

      addExpense({
        cycleId: r.cycleId,
        description: desc,
        amount: r.amount,
        categoryId: r.categoryId,
        date: r.date,
        accountId: accountId || undefined,
      })
      if (r.hash) hashes.add(r.hash)
    }
    saveHashes(hashes)
    setImportedCount(included.length)
    setRows(null)
  }

  // ----- Sucesso -----
  if (importedCount > 0) {
    return (
      <div className="space-y-4 py-6 text-center">
        <p className="text-5xl">✅</p>
        <p className="text-lg font-semibold text-slate-800">
          {importedCount} gasto(s) importado(s)!
        </p>
        <p className="text-sm text-slate-500">
          Distribuídos nos ciclos pela data. O app aprendeu as categorias dos
          estabelecimentos pra próxima vez.
        </p>
        <Link
          to="/ciclo"
          className="inline-block rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white"
        >
          Ver gastos do ciclo
        </Link>
        <button
          onClick={() => setImportedCount(0)}
          className="block w-full text-sm font-medium text-slate-500"
        >
          Importar outro arquivo
        </button>
      </div>
    )
  }

  // ----- Seleção de arquivo -----
  if (!rows) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">
            Selecione a <strong>fatura</strong> ou o <strong>extrato</strong> do
            Itaú. Aceita <strong>PDF</strong> (fatura Personnalité), OFX ou CSV.
          </p>
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 p-8 text-center">
            <span className="text-3xl">{loading ? '⏳' : '📄'}</span>
            <span className="text-sm font-medium text-teal-700">
              {loading ? 'Lendo arquivo…' : 'Escolher arquivo (.pdf, .ofx, .csv)'}
            </span>
            <input
              type="file"
              accept=".pdf,.ofx,.csv,.txt,application/pdf,text/*,application/x-ofx"
              className="hidden"
              disabled={loading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </label>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-teal-700">
              ou cole o texto da fatura
            </summary>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={5}
              placeholder={'05/08  SUPERMERCADO X  150,00\n10/08  NETFLIX  39,90'}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm outline-none focus:border-teal-500"
            />
            <button
              onClick={handlePaste}
              disabled={pasteText.trim() === ''}
              className="mt-2 w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Ler texto colado
            </button>
          </details>

          {fileName && !loading && (
            <p className="mt-2 text-center text-xs text-slate-400">{fileName}</p>
          )}
          {error && (
            <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
              {error}
            </p>
          )}
        </div>
        <p className="px-2 text-center text-xs text-slate-400">
          Os dados são lidos no seu próprio aparelho — nada é enviado para
          servidores nesta fase.
        </p>
      </div>
    )
  }

  // ----- Revisão -----
  return (
    <div className="space-y-3 pb-4">
      <div className="sticky top-[60px] z-10 space-y-2 rounded-2xl bg-white p-3 shadow-sm">
        <p className="text-sm text-slate-700">
          <strong>{rows.length}</strong> lançamentos lidos ·{' '}
          <strong>{included.length}</strong> selecionados ·{' '}
          <strong>{formatBRL(total)}</strong>
        </p>

        {/* Checksums */}
        {checks.length > 0 && (
          <div
            className={`rounded-xl p-2 text-xs ${
              failedChecks.length === 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {failedChecks.length === 0 ? (
              <span>✓ Todos os totais bateram (checksum ok)</span>
            ) : (
              <div>
                <p className="font-semibold">
                  ⚠️ {failedChecks.length} total não bateu — confira antes de
                  importar:
                </p>
                {failedChecks.map((c, i) => (
                  <p key={i}>
                    {c.label}: fatura {formatBRL(c.expected)} × lido{' '}
                    {formatBRL(c.got)}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {future.length > 0 && (
          <p className="rounded-xl bg-slate-50 p-2 text-xs text-slate-500">
            📅 {future.length} parcela(s) futura(s) detectada(s) — ainda não
            importadas (entram nas próximas faturas).
          </p>
        )}

        {accounts.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Cartão / banco desta fatura:
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"
            >
              <option value="">— nenhum —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          onClick={confirmImport}
          disabled={included.length === 0}
          className="w-full rounded-xl bg-teal-600 py-2.5 font-semibold text-white disabled:opacity-40"
        >
          Importar {included.length} gasto(s)
        </button>
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className={`rounded-2xl bg-white p-3 shadow-sm ${
              r.include ? '' : 'opacity-50'
            }`}
          >
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={r.include}
                onChange={(e) => patch(r.id, { include: e.target.checked })}
                className="mt-1 h-4 w-4 accent-teal-600"
              />
              <div className="min-w-0 flex-1">
                <input
                  value={r.description}
                  onChange={(e) => patch(r.id, { description: e.target.value })}
                  className="w-full rounded-lg border border-transparent bg-transparent text-sm text-slate-800 focus:border-slate-200 focus:bg-slate-50"
                />
                <p className="text-xs text-slate-400">
                  {formatDayMonth(r.date)} · ciclo {r.cycleLabel}
                  {r.note ? ` · ${r.note}` : ''}
                  {r.duplicate ? ' · já importado' : ''}
                  {r.itauCategory ? ` · Itaú: ${r.itauCategory}` : ''}
                </p>
                <div className="mt-2">
                  <select
                    value={r.categoryId}
                    onChange={(e) => patch(r.id, { categoryId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700">
                {formatBRL(r.amount)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <button
        onClick={() => {
          setRows(null)
          setFileName('')
          setChecks([])
          setFuture([])
        }}
        className="w-full rounded-xl py-2.5 text-sm font-medium text-slate-500"
      >
        Cancelar / escolher outro arquivo
      </button>
    </div>
  )
}
