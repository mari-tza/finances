import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBRL } from '../utils/format'

export interface CategoryDatum {
  name: string
  value: number
  color: string
  icon: string
}

export function CategoryCharts({ data }: { data: CategoryDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
        Sem gastos neste ciclo ainda.
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
      {/* Rosca */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">
          Gastos por categoria
        </p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => formatBRL(v)}
                contentStyle={{ borderRadius: 12, fontSize: 13 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legenda */}
        <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-1.5 text-slate-600">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              {d.icon} {d.name}
              <span className="ml-auto tabular-nums text-slate-400">
                {Math.round((d.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Barras horizontais */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">
          Comparativo por valor
        </p>
        <div style={{ height: data.length * 38 + 20 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 8, right: 16 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 12, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v: number) => formatBRL(v)}
                contentStyle={{ borderRadius: 12, fontSize: 13 }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
