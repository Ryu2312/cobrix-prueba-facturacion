import { Link, NavLink, Outlet } from 'react-router'

const menu = [
  { to: '/', label: 'Resumen', short: '01' },
  { to: '/customers', label: 'Clientes', short: '02' },
  { to: '/invoices', label: 'Facturas', short: '03' },
  { to: '/sync', label: 'Sincronización', short: '04' },
  { to: '/runs', label: 'Historial', short: '05' },
  { to: '/settings', label: 'Configuración', short: '06' },
]

export function Shell() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark">C</span>
          <span>
            <strong>cobrix</strong>
            <small>PAYMENTS OPERATIONS</small>
          </span>
        </Link>
        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <nav aria-label="Navegación principal">
          {menu.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              <span className="nav-number">{item.short}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" />
          <span>
            <strong>Entorno de prueba</strong>
            <small>API local conectada por HTTP</small>
          </span>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumbs">
            COBRIX <span>/</span> OPERACIONES
          </div>
          <div className="topbar-right">
            <span className="environment">SANDBOX</span>
            <span className="avatar">CO</span>
          </div>
        </header>
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
