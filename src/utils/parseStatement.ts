// Leitor de extrato bancário: OFX (padrão) e CSV (best-effort, formato BR).
// Devolve transações com data ISO, descrição e valor COM sinal.

export interface ParsedTxn {
  dateISO: string
  description: string
  value: number // mantém o sinal do arquivo
  // Campos opcionais (vêm de um CSV "rico" com cabeçalhos):
  categoryName?: string
  accountName?: string
  installmentCurrent?: number
  installmentTotal?: number
}

/** Converte "1.234,56" / "1234,56" / "-150.00" / "R$ 90" em número. */
export function parseAmount(raw: string): number {
  let s = raw.trim().replace(/R\$/gi, '').replace(/\s/g, '')
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) {
    // "." é milhar, "," é decimal
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

/** "20260805" -> "2026-08-05" */
function ofxDateToISO(d: string): string {
  const m = d.match(/^(\d{4})(\d{2})(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}

/** "05/08/2026" ou "2026-08-05" -> ISO; "" se não bater. */
function csvDateToISO(d: string): string {
  const t = d.trim()
  let m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = t.match(/^(\d{2})\/(\d{2})\/(\d{2})$/) // ano com 2 dígitos
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return ''
}

function parseOFX(text: string): ParsedTxn[] {
  const out: ParsedTxn[] = []
  // Cada transação fica em um bloco <STMTTRN> ... (com ou sem fechamento).
  const blocks = text.split(/<STMTTRN>/i).slice(1)
  for (const block of blocks) {
    const date = block.match(/<DTPOSTED>\s*([0-9]{8,})/i)?.[1]
    const amt = block.match(/<TRNAMT>\s*(-?[\d.,]+)/i)?.[1]
    const memo =
      block.match(/<MEMO>\s*([^\r\n<]+)/i)?.[1] ??
      block.match(/<NAME>\s*([^\r\n<]+)/i)?.[1] ??
      'Lançamento'
    if (!date || !amt) continue
    const dateISO = ofxDateToISO(date)
    if (!dateISO) continue
    out.push({
      dateISO,
      description: memo.trim(),
      value: parseAmount(amt),
    })
  }
  return out
}

function parseCSV(text: string): ParsedTxn[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return []
  // Delimitador: BR costuma usar ";" porque "," é decimal.
  const semi = (text.match(/;/g) ?? []).length
  const comma = (text.match(/,/g) ?? []).length
  const delim = semi >= comma ? ';' : ','

  const out: ParsedTxn[] = []
  for (const line of lines) {
    const cols = line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ''))
    // acha a coluna de data
    let dateISO = ''
    let dateIdx = -1
    cols.forEach((c, i) => {
      if (!dateISO) {
        const iso = csvDateToISO(c)
        if (iso) {
          dateISO = iso
          dateIdx = i
        }
      }
    })
    if (!dateISO) continue // provavelmente o cabeçalho

    // acha a coluna de valor (número), preferindo a última que pareça dinheiro
    let valueIdx = -1
    cols.forEach((c, i) => {
      if (i === dateIdx) return
      if (/^-?\s*R?\$?\s*[\d.]*\d(,\d{1,2}|\.\d{1,2})?$/.test(c.replace(/\s/g, ''))) {
        valueIdx = i
      }
    })
    if (valueIdx < 0) continue

    // descrição = maior texto que não seja data nem valor
    let description = 'Lançamento'
    let best = 0
    cols.forEach((c, i) => {
      if (i === dateIdx || i === valueIdx) return
      if (c.length > best && /[a-zA-Z]/.test(c)) {
        best = c.length
        description = c
      }
    })

    out.push({
      dateISO,
      description,
      value: parseAmount(cols[valueIdx]),
    })
  }
  return out
}

// Linhas que claramente não são lançamentos (cabeçalhos/totais da fatura).
const SKIP_LINE =
  /total da fatura|total dos lan|vencimento|limite|saldo anterior|^demonstrativo|^lan[çc]amentos|encargos|^ita[uú]|^fatura/i

/**
 * Leitor de texto livre de fatura (PDF colado ou extraído): cada lançamento é
 * uma linha com data (dd/mm), descrição e valor. O ano é inferido do ciclo de
 * referência, já que a fatura traz só dia/mês.
 */
export function parseFaturaText(text: string, refDateISO: string): ParsedTxn[] {
  const ref = refDateISO.match(/^(\d{4})-(\d{2})/)
  const refYear = ref ? Number(ref[1]) : new Date().getFullYear()
  const refMonth = ref ? Number(ref[2]) : 1

  const dateRe = /(\d{2})\/(\d{2})(?:\/(\d{2,4}))?/
  // dinheiro BR, com sinal opcional antes ou depois: "1.234,56", "-39,90", "39,90-"
  const moneyRe = /(-)?\s*R?\$?\s*((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})\s*(-)?/g

  const out: ParsedTxn[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || SKIP_LINE.test(line)) continue

    const dm = line.match(dateRe)
    if (!dm) continue

    // último valor monetário da linha (em fatura com USD + R$, o R$ é o último)
    let last: RegExpExecArray | null = null
    let m: RegExpExecArray | null
    moneyRe.lastIndex = 0
    while ((m = moneyRe.exec(line))) last = m
    if (!last) continue

    const day = dm[1]
    const month = dm[2]
    let year: number
    if (dm[3]) {
      year = dm[3].length === 2 ? 2000 + Number(dm[3]) : Number(dm[3])
    } else {
      year = Number(month) > refMonth ? refYear - 1 : refYear
    }
    const dateISO = `${year}-${month}-${day}`

    const neg = last[1] === '-' || last[3] === '-'
    const value = (neg ? -1 : 1) * parseAmount(last[2])

    const descStart = (dm.index ?? 0) + dm[0].length
    const descEnd = last.index ?? line.length
    const description =
      line.slice(descStart, descEnd).replace(/\s{2,}/g, ' ').trim() ||
      'Lançamento'

    out.push({ dateISO, description, value })
  }
  return out
}

/**
 * CSV "rico" com cabeçalhos (gerado p/ ex. pelo Claude a partir do PDF):
 * data;descricao;valor;categoria;parcela;cartao
 * Usa o nome da categoria/cartão e a parcela (NN/MM) como dicas.
 */
export function parseCsvWithHeaders(text: string): ParsedTxn[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) return []

  const header = lines[0]
  const delim =
    (header.match(/;/g)?.length ?? 0) >= (header.match(/,/g)?.length ?? 0)
      ? ';'
      : ','
  const norm = (s: string) =>
    s.trim().toLowerCase()
  const cols = header.split(delim).map(norm)
  const find = (re: RegExp) => cols.findIndex((h) => re.test(h))
  const iDate = find(/data|date/)
  const iDesc = find(/descr|estabelec|lan[cç]/)
  const iVal = find(/valor|value|amount/)
  const iCat = find(/categor/)
  const iParc = find(/parcel/)
  const iAcc = find(/cart|conta|banco|account/)
  if (iDate < 0 || iVal < 0) return [] // não é o formato esperado

  const out: ParsedTxn[] = []
  for (let r = 1; r < lines.length; r++) {
    const c = lines[r].split(delim).map((v) => v.trim().replace(/^"|"$/g, ''))
    const dateISO = csvDateToISO(c[iDate] ?? '')
    if (!dateISO) continue
    let installmentCurrent: number | undefined
    let installmentTotal: number | undefined
    if (iParc >= 0 && c[iParc]) {
      const m = c[iParc].match(/(\d{1,2})\s*\/\s*(\d{1,2})/)
      if (m) {
        installmentCurrent = Number(m[1])
        installmentTotal = Number(m[2])
      }
    }
    out.push({
      dateISO,
      description: (iDesc >= 0 ? c[iDesc] : '') || 'Lançamento',
      value: parseAmount(c[iVal] ?? ''),
      categoryName: iCat >= 0 ? c[iCat] || undefined : undefined,
      accountName: iAcc >= 0 ? c[iAcc] || undefined : undefined,
      installmentCurrent,
      installmentTotal,
    })
  }
  return out
}

/** Detecta o formato e devolve as transações. */
export function parseStatement(text: string): ParsedTxn[] {
  if (/<OFX|<STMTTRN/i.test(text)) return parseOFX(text)
  const first = (text.split(/\r?\n/)[0] ?? '').toLowerCase()
  // CSV com cabeçalhos (data;descricao;valor;categoria;...)
  if (!/\d{2}\/\d{2}/.test(first) && /(descr|valor|categor)/.test(first)) {
    return parseCsvWithHeaders(text)
  }
  return parseCSV(text)
}

/**
 * Numa fatura/extrato, os gastos são a maioria; pagamentos/estornos são poucos
 * e têm o sinal oposto. Retornamos o sinal que representa "gasto" neste arquivo.
 */
export function expenseSign(txns: ParsedTxn[]): number {
  let neg = 0
  let pos = 0
  for (const t of txns) {
    if (t.value < 0) neg++
    else if (t.value > 0) pos++
  }
  return neg >= pos ? -1 : 1
}
