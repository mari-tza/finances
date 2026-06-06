import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppProvider } from './store/AppContext'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { CyclePage } from './pages/CyclePage'
import { IncomesPage } from './pages/IncomesPage'
import { FixedPage } from './pages/FixedPage'
import { ImportPage } from './pages/ImportPage'
import { InvestmentsPage } from './pages/InvestmentsPage'
import { ScenariosPage } from './pages/ScenariosPage'
import { ConfigPage } from './pages/ConfigPage'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ciclo" element={<CyclePage />} />
            <Route path="/rendas" element={<IncomesPage />} />
            <Route path="/fixos" element={<FixedPage />} />
            <Route path="/importar" element={<ImportPage />} />
            <Route path="/patrimonio" element={<InvestmentsPage />} />
            <Route path="/cenarios" element={<ScenariosPage />} />
            <Route path="/config" element={<ConfigPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  )
}
