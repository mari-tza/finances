import { useApp, useSelectedCycle } from '../store/AppContext'
import { formatFullDate } from '../utils/format'

export function CycleSelector() {
  const { cycles, selectedCycleId, goPrevCycle, goNextCycle } = useApp()
  const cycle = useSelectedCycle()
  const idx = cycles.findIndex((c) => c.id === selectedCycleId)

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
      <button
        onClick={goPrevCycle}
        disabled={idx <= 0}
        className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 disabled:opacity-30"
        aria-label="Ciclo anterior"
      >
        ‹
      </button>
      <div className="text-center">
        <p className="text-base font-semibold text-slate-800">{cycle.label}</p>
        <p className="text-xs text-slate-500">
          {formatFullDate(cycle.startDate)} – {formatFullDate(cycle.endDate)}
        </p>
      </div>
      <button
        onClick={goNextCycle}
        disabled={idx >= cycles.length - 1}
        className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 disabled:opacity-30"
        aria-label="Próximo ciclo"
      >
        ›
      </button>
    </div>
  )
}
