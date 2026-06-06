import { formatBRL } from '../utils/format'

interface StatCardProps {
  label: string
  value: number
  tone?: 'neutral' | 'positive' | 'negative' | 'accent'
  hint?: string
}

const tones: Record<NonNullable<StatCardProps['tone']>, string> = {
  neutral: 'text-slate-800',
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
  accent: 'text-teal-700',
}

export function StatCard({ label, value, tone = 'neutral', hint }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tones[tone]}`}>
        {formatBRL(value)}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
