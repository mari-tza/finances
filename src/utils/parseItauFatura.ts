// Parser estruturado da fatura Itaú Personnalité (PDF -> texto por linhas).
// Best-effort: segue a estrutura descrita na spec (seções, cartões, parcelas,
// internacional, estornos, checksums). Pode precisar de ajuste fino contra o
// texto real extraído — por isso devolvemos `recognized` e os `checks`.

import { parseAmount } from './parseStatement'
import { cleanMerchantName } from './categoryRules'

export type ItauSection =
  | 'national'
  | 'international'
  | 'services'
  | 'others'
  | 'future'
  | 'ignore'
  | 'none'

export interface ItauItem {
  dateISO: string
  rawName: string
  cleanName: string
  value: number // R$ com sinal (negativo = estorno/crédito)
  itauCategory?: string
  cardFinal?: string
  cardHolder?: string
  installmentCurrent?: number
  installmentTotal?: number
  section: 'national' | 'international' | 'services' | 'others'
  hash: string
}

export interface FutureInstallment {
  rawName: string
  cleanName: string
  value: number
  installmentCurrent?: number
  installmentTotal?: number
}

export interface ItauMeta {
  dueDate?: string
  totalThis?: number
  totalPrev?: number
  paymentMade?: number
}

export interface ItauCheck {
  label: string
  expected: number
  got: number
  ok: boolean
}

export interface ItauFatura {
  recognized: boolean
  meta: ItauMeta
  items: ItauItem[]
  future: FutureInstallment[]
  checks: ItauCheck[]
}

const MONEY = /(?:R\$\s*)?(-\s*)?((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})\s*(-)?/g
const DATE = /(\d{2})\/(\d{2})/

function lastMoney(line: string): { value: number; index: number } | null {
  let m: RegExpExecArray | null
  let last: RegExpExecArray | null = null
  MONEY.lastIndex = 0
  while ((m = MONEY.exec(line))) last = m
  if (!last) return null
  const neg = last[1]?.includes('-') || last[3] === '-'
  return { value: (neg ? -1 : 1) * parseAmount(last[2]), index: last.index }
}

function firstMoneyValue(line: string): number | null {
  MONEY.lastIndex = 0
  const m = MONEY.exec(line)
  if (!m) return null
  const neg = m[1]?.includes('-') || m[3] === '-'
  return (neg ? -1 : 1) * parseAmount(m[2])
}

function inferYear(month: number, refYear: number, refMonth: number): number {
  return month > refMonth ? refYear - 1 : refYear
}

/** Detecta parcela "NN/MM" no fim do nome. */
function extractInstallment(name: string): {
  clean: string
  current?: number
  total?: number
} {
  const m = name.match(/(\d{2})\/(\d{2})\s*$/)
  if (!m) return { clean: name.trim() }
  return {
    clean: name.slice(0, m.index).trim(),
    current: Number(m[1]),
    total: Number(m[2]),
  }
}

function sectionOf(line: string): ItauSection | null {
  if (/compras parceladas\s*[-–]\s*pr[óo]xim/i.test(line)) return 'future'
  if (/lan[çc]amentos internacionais/i.test(line)) return 'international'
  if (/lan[çc]amentos:?\s*produtos e servi[çc]os/i.test(line)) return 'services'
  if (/lan[çc]amentos:?\s*compras e saques/i.test(line)) return 'national'
  if (/outros lan[çc]amentos/i.test(line)) return 'others'
  if (/limites de cr[ée]dito|simula[çc]|taxas? de juros|seguros e servi/i.test(line))
    return 'ignore'
  return null
}

function looksLikeCategoryLine(line: string): boolean {
  // ex.: "ALIMENTAÇÃO .RIO DE JANEIR" — sem data, sem dinheiro, com ' .'
  return (
    !DATE.test(line) &&
    !/\d,\d{2}/.test(line) &&
    /\.[A-Za-zÀ-ý]/.test(line) &&
    line.length < 60
  )
}

export function parseItauFatura(text: string, refDateISO: string): ItauFatura {
  const ref = refDateISO.match(/^(\d{4})-(\d{2})/)
  const refYear = ref ? Number(ref[1]) : new Date().getFullYear()
  const refMonth = ref ? Number(ref[2]) : 12

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  const meta: ItauMeta = {}
  const items: ItauItem[] = []
  const future: FutureInstallment[] = []
  const checks: ItauCheck[] = []

  let section: ItauSection = 'none'
  let card: { holder: string; final: string } | null = null
  let recognized = false

  // ---- metadados (varre tudo) ----
  for (const line of lines) {
    if (/vencimento/i.test(line)) {
      const d = line.match(/(\d{2})\/(\d{2})\/(\d{4})/)
      if (d) meta.dueDate = `${d[3]}-${d[2]}-${d[1]}`
    }
    if (/total desta fatura/i.test(line)) {
      const v = lastMoney(line)
      if (v) meta.totalThis = v.value
    }
    if (/total da fatura anterior/i.test(line)) {
      const v = lastMoney(line)
      if (v) meta.totalPrev = v.value
    }
    if (/pagamento(s)? efetuad/i.test(line)) {
      const v = lastMoney(line)
      if (v) meta.paymentMade = Math.abs(v.value)
    }
  }

  const pushItem = (
    dateISO: string,
    rawName: string,
    value: number,
    sec: ItauItem['section'],
    itauCategory?: string,
  ) => {
    const inst = extractInstallment(rawName)
    const clean = cleanMerchantName(inst.clean)
    items.push({
      dateISO,
      rawName,
      cleanName: clean,
      value,
      itauCategory,
      cardFinal: card?.final,
      cardHolder: card?.holder,
      installmentCurrent: inst.current,
      installmentTotal: inst.total,
      section: sec,
      hash: `${dateISO}|${clean}|${value.toFixed(2)}|${card?.final ?? ''}`,
    })
  }

  // ---- lançamentos ----
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const sec = sectionOf(line)
    if (sec) {
      section = sec
      if (sec !== 'ignore') recognized = true
      continue
    }
    if (section === 'ignore' || section === 'none') continue

    // cabeçalho de cartão: "NOME (final 1941)"
    const cardHead = line.match(/^(.+?)\(final\s*(\d{4})\)/i)
    if (cardHead && !DATE.test(line.slice(0, 6))) {
      card = { holder: cardHead[1].trim(), final: cardHead[2] }
      // total do cartão (checksum) costuma vir na linha "Lançamentos no cartão..."
      if (/lan[çc]amentos no cart[ãa]o/i.test(line)) {
        const v = lastMoney(line)
        if (v) {
          const got = items
            .filter((it) => it.cardFinal === cardHead[2])
            .reduce((s, it) => s + it.value, 0)
          checks.push({
            label: `Cartão final ${cardHead[2]}`,
            expected: v.value,
            got: Math.round(got * 100) / 100,
            ok: Math.abs(got - v.value) < 0.05,
          })
        }
      }
      continue
    }
    if (/lan[çc]amentos no cart[ãa]o/i.test(line)) {
      const fin = line.match(/\(final\s*(\d{4})\)/i)?.[1]
      const v = lastMoney(line)
      if (fin && v) {
        const got = items
          .filter((it) => it.cardFinal === fin)
          .reduce((s, it) => s + it.value, 0)
        checks.push({
          label: `Cartão final ${fin}`,
          expected: v.value,
          got: Math.round(got * 100) / 100,
          ok: Math.abs(got - v.value) < 0.05,
        })
      }
      continue
    }

    // linha de item precisa ter data e dinheiro
    const dm = line.match(DATE)
    const money = lastMoney(line)
    if (!dm || !money) continue

    const day = dm[1]
    const month = dm[2]
    const dateISO = `${inferYear(Number(month), refYear, refMonth)}-${month}-${day}`
    const name = line.slice((dm.index ?? 0) + dm[0].length, money.index).trim()
    if (!name) continue

    // categoria do Itaú: próxima linha, se parecer com "CATEGORIA .CIDADE"
    let itauCategory: string | undefined
    const next = lines[i + 1]
    if (next && looksLikeCategoryLine(next)) {
      itauCategory = next.split(/\s*\./)[0].trim()
    }

    if (section === 'future') {
      const inst = extractInstallment(name)
      future.push({
        rawName: name,
        cleanName: cleanMerchantName(inst.clean),
        value: Math.abs(money.value),
        installmentCurrent: inst.current,
        installmentTotal: inst.total,
      })
      continue
    }

    if (section === 'international') {
      // valor em R$ costuma vir 1–3 linhas adiante (após "Dólar de Conversão")
      let brl = money.value
      for (let k = 1; k <= 3 && i + k < lines.length; k++) {
        const l2 = lines[i + k]
        if (/d[óo]lar de convers/i.test(l2)) continue
        if (DATE.test(l2)) break
        const v = firstMoneyValue(l2)
        if (v != null) {
          brl = v
          break
        }
      }
      pushItem(dateISO, name, brl, 'international', itauCategory)
      continue
    }

    pushItem(dateISO, name, money.value, section as ItauItem['section'], itauCategory)
  }

  // ---- validação geral ----
  if (meta.totalThis != null) {
    const sumItems = items.reduce((s, it) => s + it.value, 0)
    const expected = meta.totalThis
    // total atual ≈ soma dos lançamentos desta fatura
    checks.push({
      label: 'Soma dos lançamentos × Total desta fatura',
      expected: Math.round(expected * 100) / 100,
      got: Math.round(sumItems * 100) / 100,
      ok: Math.abs(sumItems - expected) < Math.max(1, expected * 0.02),
    })
  }

  return { recognized, meta, items, future, checks }
}
