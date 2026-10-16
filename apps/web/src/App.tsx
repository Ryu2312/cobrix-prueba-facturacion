import { BrowserRouter, Link, Route, Routes } from 'react-router'

import { Shell } from './layouts/AppLayout.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { CustomersPage } from './pages/CustomersPage.tsx'
import { CustomerDetailPage } from './pages/CustomerDetailPage.tsx'
import { InvoicesPage } from './pages/InvoicesPage.tsx'
import { SyncPage } from './pages/SyncPage.tsx'
import { RunsPage } from './pages/RunsPage.tsx'
import { RunDetailPage } from './pages/RunDetailPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'

import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="sync" element={<SyncPage />} />
          <Route path="runs" element={<RunsPage />} />
          <Route path="runs/:id" element={<RunDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="*"
            element={
              <div className="panel">
                <h1>No encontrado</h1>
                <Link to="/">Volver al resumen</Link>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
