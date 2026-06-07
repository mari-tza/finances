import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Início', icon: '🏠', end: true },
  { to: '/ciclo', label: 'Ciclo', icon: '📅', end: false },
  { to: '/cartao', label: 'Cartão', icon: '💳', end: false },
  { to: '/rendas', label: 'Rendas', icon: '💰', end: false },
  { to: '/fixos', label: 'Fixos', icon: '📌', end: false },
  { to: '/cenarios', label: 'Cenários', icon: '📊', end: false },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur safe-bottom md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-teal-600' : 'text-slate-400'
              }`
            }
          >
            <span className="text-xl">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
