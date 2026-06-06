import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** Formata um número como moeda brasileira: 1234.5 -> "R$ 1.234,50". */
export function formatBRL(value: number): string {
  return brl.format(value)
}

/** Versão compacta sem o símbolo, para inputs/labels: 1234.5 -> "1.234,50". */
export function formatNumberBR(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Converte texto digitado em pt-BR ("1.234,56" ou "1234,56") para número. */
export function parseBRLInput(input: string): number {
  if (!input) return 0
  const normalized = input
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

/** "2026-06-05" -> "05 jun" */
export function formatDayMonth(iso: string): string {
  return format(parseISO(iso), "dd MMM", { locale: ptBR })
}

/** "2026-06-05" -> "05/06/2026" */
export function formatFullDate(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR })
}
