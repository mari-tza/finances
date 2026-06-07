import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Início', icon: '🏠', end: true },
  { to: '/ciclo', label: 'Ciclo', icon: '📅', end: false },
  { to: '/cartao', label: 'Cartão', icon: '💳', end: false },
  { to: '/rendas', label: 'Rendas', icon: '💰', end: false },
  { to: '/fixos', label: 'Fixos', icon: '📌', end: false },
  { to: '/patrimonio', label: 'Patrim.', icon: '📈', end: false },
  { to: '/cenarios', label: 'Cenários', icon: '📊', end: false },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur safe-bottom md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 transition-colors ${
                isActive ? 'text-teal-600' : 'text-slate-400'
              }`
            }
          >
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="w-full truncate text-center text-[10px] font-medium leading-tight">
              {t.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
