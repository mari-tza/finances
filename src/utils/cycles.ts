import { addDays, addMonths, format, parseISO, set } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Cycle } from '../types'

/**
 * Lógica dos ciclos pelo dia de fechamento do cartão.
 *
 * Um ciclo vai do dia SEGUINTE ao fechamento até o PRÓXIMO fechamento.
 * Ex.: fechamento dia 5 -> ciclo de 06/05 a 05/06, rotulado "Jun/2026"
 * (rotulamos pelo mês em que o ciclo termina/é pago).
 */

function iso(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Constrói o ciclo que CONTÉM a data de referência, dado o dia de fechamento. */
export function buildCycleForDate(reference: Date, closingDay: number): Cycle {
  const day = reference.getDate()

  // Fechamento do mês de referência.
  const thisClosing = set(reference, {
    date: closingDay,
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  })

  let start: Date
  let end: Date

  if (day <= closingDay) {
    // Ainda dentro do ciclo que termina neste mês.
    end = thisClosing
    start = addDays(set(addMonths(reference, -1), { date: closingDay }), 1)
  } else {
    // Já passou o fechamento -> ciclo termina no próximo mês.
    start = addDays(thisClosing, 1)
    end = set(addMonths(reference, 1), { date: closingDay })
  }

  return {
    id: `cycle-${iso(end)}`,
    label: capitalize(format(end, 'MMM/yyyy', { locale: ptBR })),
    startDate: iso(start),
    endDate: iso(end),
    closingDay,
  }
}

/** Ciclo imediatamente anterior ao informado. */
export function previousCycle(cycle: Cycle): Cycle {
  const beforeStart = addDays(parseISO(cycle.startDate), -1)
  return buildCycleForDate(beforeStart, cycle.closingDay)
}

/** Ciclo imediatamente seguinte ao informado. */
export function nextCycle(cycle: Cycle): Cycle {
  const afterEnd = addDays(parseISO(cycle.endDate), 1)
  return buildCycleForDate(afterEnd, cycle.closingDay)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
