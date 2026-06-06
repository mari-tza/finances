import { Link, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { useApp } from '../store/AppContext'

const titles: Record<string, string> = {
  '/': 'Início',
  '/ciclo': 'Ciclo',
  '/rendas': 'Rendas',
  '/fixos': 'Fixos & Parcelas',
  '/patrimonio': 'Patrimônio',
  '/importar': 'Importar extrato',
  '/config': 'Configurações',
  '/cenarios': 'Cenários',
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { household } = useApp()
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'Finanças'

  return (
    <div className="min-h-full bg-slate-50 md:flex">
      <Sidebar />

      <div className="flex min-h-full flex-1 flex-col">
        <header className="sticky top-0 z-40 bg-teal-700 text-white safe-top">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 md:px-8">
            <div>
              <p className="text-xs text-teal-100 md:hidden">{household.name}</p>
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            {/* No desktop a engrenagem fica na barra lateral */}
            <Link
              to="/config"
              className="grid h-9 w-9 place-items-center rounded-full bg-teal-600/60 text-lg md:hidden"
              aria-label="Configurações"
            >
              ⚙️
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md flex-1 px-4 py-4 md:max-w-3xl md:px-8 md:py-6">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
