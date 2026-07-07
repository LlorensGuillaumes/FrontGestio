import { Outlet, NavLink } from "react-router";

export default function ComunicacionLayout() {
  const linkStyle = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? "bg-blue-100 text-blue-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <div className="flex flex-col h-full">
      <header className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 px-8 py-3">
        <div className="flex items-center justify-between">
          <nav className="flex items-center space-x-2 text-sm">
            <span className="text-slate-400 font-medium">Comunicacion</span>
          </nav>

          <nav className="flex items-center gap-2">
            <NavLink to="/comunicacion" end className={linkStyle}>
              Centro
            </NavLink>
            <NavLink to="/comunicacion/notificaciones" className={linkStyle}>
              Notificaciones
            </NavLink>
            <NavLink to="/comunicacion/mensajes" className={linkStyle}>
              Mensajes
            </NavLink>
            <NavLink to="/comunicacion/chat" className={linkStyle}>
              Chat
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="bg-white flex-1 overflow-auto">
        <div className="max-w-none mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
