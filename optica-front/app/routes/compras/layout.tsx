// app/routes/compras/layout.tsx
import { Outlet, NavLink, type NavLinkRenderProps } from "react-router";

export default function ComprasLayout() {
  const linkStyle = ({ isActive }: NavLinkRenderProps): string =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? "bg-blue-600 text-white shadow-sm"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    }`;

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-slate-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Compras</h1>
            <p className="text-sm text-slate-500">Gestiona ordenes, recepciones y facturas de proveedores</p>
          </div>

          <nav className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <NavLink to="ordenes" className={linkStyle}>
              Ordenes
            </NavLink>
            <NavLink to="recepciones" className={linkStyle}>
              Recepciones
            </NavLink>
            <NavLink to="facturas" className={linkStyle}>
              Facturas
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="bg-slate-50 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
