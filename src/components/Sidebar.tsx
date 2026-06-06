import { NavLink } from 'react-router-dom'
import { useApp } from '../store/AppContext'

const mainLinks = [
  { to: '/', label: 'Início', icon: '🏠', end: true },
  { to: '/ciclo', label: 'Ciclo', icon: '📅', end: false },
  { to: '/rendas', label: 'Rendas', icon: '💰', end: false },
  { to: '/fixos', label: 'Fixos & Parcelas', icon: '📌', end: false },
  { to: '/patrimonio', label: 'Patrimônio', icon: '📈', end: false },
  { to: '/cenarios', label: 'Cenários', icon: '📊', end: false },
]

const bottomLinks = [
  { to: '/importar', label: 'Importar extrato', icon: '⬇️', end: false },
  { to: '/config', label: 'Configurações', icon: '⚙️', end: false },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/15 text-white' : 'text-teal-100 hover:bg-white/10'
  }`

/** Navegação lateral — visível só em telas grandes (notebook/desktop). */
export function Sidebar() {
  const { household } = useApp()
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-teal-700 p-4 text-white md:flex">
      <div className="px-2 py-3">
        <p className="text-xs text-teal-200">Finanças</p>
        <p className="text-lg font-semibold">{household.name}</p>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1">
        {mainLinks.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
            <span className="text-lg">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-white/15 pt-2">
        {bottomLinks.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
            <span className="text-lg">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </div>
    </aside>
  )
}
