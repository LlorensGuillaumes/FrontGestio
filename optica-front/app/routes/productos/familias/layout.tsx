import { Outlet, NavLink, type NavLinkRenderProps, useMatch } from "react-router";

export default function FamiliasLayout() {
  // Detecta si estamos en subFamilias o alguna ruta hija
  const isInSubfamilias = useMatch("/productos/familias/subFamilias/*");

  // Si estamos dentro de subFamilias, no renderizamos el layout de Familias
  if (isInSubfamilias) {
    return <Outlet />;
  }

  const linkStyle = ({ isActive }: NavLinkRenderProps): string =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
    }`;

  return (
    <div className="flex flex-col h-full">
      <header className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 px-8 py-3 flex items-center justify-between">
        {/* Breadcrumb mejorado */}
        <nav className="flex items-center space-x-2 text-sm">
          <span className="text-slate-400 font-medium">Productos</span>

          {/* Separador visual */}
          <svg
            className="w-4 h-4 text-slate-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>

          <span className="text-slate-900 font-bold tracking-tight px-2 py-0.5 bg-slate-200/50 rounded-md">
            Familias
          </span>
        </nav>

        <nav className="flex space-x-1 bg-slate-200/40 p-1 rounded-xl border border-slate-200/50">
          <NavLink to="." end className={linkStyle}>
            Listado
          </NavLink>

          <NavLink to="nuevo" className={linkStyle}>
            + Nueva Familia
          </NavLink>
        </nav>
      </header>

      <main className="bg-white flex-1 overflow-auto">
        <div className="max-w-none mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
