import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "~/components/LanguageSwitcher";
import { TopBar } from "~/components/TopBar";
import { RequireAuth } from "~/components/ProtectedRoute";
import { PermissionGate, AdminOnly, MasterOnly } from "~/components/PermissionGate";
import { useAuth } from "~/contexts/AuthContext";

// Iconos del menu
const Icons = {
  sales: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  purchases: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  products: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  services: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  accounting: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  agenda: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  school: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  hr: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  inventory: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  communication: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  collapse: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  ),
  expand: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  ),
};

function DashboardContent() {
  const { t } = useTranslation("menu");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Sidebar collapsed state - persist in localStorage
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  // Flyout menu for collapsed state
  const [flyoutMenu, setFlyoutMenu] = useState<string | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  const [productosOpen, setProductosOpen] = useState(false);
  const [ventasOpen, setVentasOpen] = useState(false);
  const [comprasOpen, setComprasOpen] = useState(false);
  const [serviciosOpen, setServiciosOpen] = useState(false);
  const [escuelaOpen, setEscuelaOpen] = useState(false);
  const [contabilidadOpen, setContabilidadOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [rrhhOpen, setRrhhOpen] = useState(false);
  const [comunicacionOpen, setComunicacionOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
    if (collapsed) {
      setProductosOpen(false);
      setVentasOpen(false);
      setComprasOpen(false);
      setServiciosOpen(false);
      setEscuelaOpen(false);
      setContabilidadOpen(false);
      setConfigOpen(false);
      setRrhhOpen(false);
      setComunicacionOpen(false);
    }
  }, [collapsed]);

  // Close flyout when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking on a menu button (has data-menu-button attribute)
      if (target.closest("[data-menu-button]")) {
        return;
      }
      if (flyoutRef.current && !flyoutRef.current.contains(target)) {
        setFlyoutMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleCollapse = () => setCollapsed(!collapsed);

  const Arrow = ({ isOpen }: { isOpen: boolean }) => (
    <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  );

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const getRoleBadge = () => {
    if (!user) return null;
    const roleColors = {
      master: "bg-purple-500/20 text-purple-400",
      admin: "bg-amber-500/20 text-amber-400",
      user: "bg-slate-600 text-slate-400",
    };
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded ${roleColors[user.role]}`}>
        {{ master: "Master", admin: "Admin", user: "Usuario" }[user.role]}
      </span>
    );
  };

  // Handle menu click - toggle submenu or auto-expand when collapsed
  const handleMenuClick = (menuId: string, setOpen: React.Dispatch<React.SetStateAction<boolean>>, isOpen: boolean) => {
    if (collapsed) {
      // Auto-expand sidebar and open submenu when clicking a menu with submenus
      setCollapsed(false);
      setOpen(true);
    } else {
      setOpen(!isOpen);
    }
  };

  // Submenu link styles
  const subLinkStyle = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 text-sm rounded transition-colors ${isActive ? "text-blue-400 font-medium bg-slate-700/50" : "text-slate-300 hover:text-white hover:bg-slate-700/30"}`;

  // Flyout submenu component
  const FlyoutMenu = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => {
    if (flyoutMenu !== id) return null;
    return (
      <div
        ref={flyoutRef}
        className="absolute left-full top-0 ml-2 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 min-w-[200px] z-50"
      >
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase border-b border-slate-700 mb-1">
          {title}
        </div>
        {children}
      </div>
    );
  };

  // Menu item component
  const MenuItem = ({
    icon,
    label,
    menuId,
    isOpen,
    setOpen,
    children,
  }: {
    icon: React.ReactNode;
    label: string;
    menuId: string;
    isOpen: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    children: React.ReactNode;
  }) => {
    const isActive = isOpen || flyoutMenu === menuId;

    return (
      <div className="relative">
        <button
          onClick={() => handleMenuClick(menuId, setOpen, isOpen)}
          className={`w-full flex items-center gap-3 p-2 rounded transition-colors ${
            isActive ? "bg-slate-800 text-blue-400" : "hover:bg-slate-800 text-slate-300"
          }`}
          title={collapsed ? label : undefined}
          data-menu-button={menuId}
        >
          {icon}
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{label}</span>
              <Arrow isOpen={isOpen} />
            </>
          )}
        </button>

        {/* Expanded submenu */}
        {!collapsed && isOpen && (
          <div className="mt-1 ml-4 space-y-0.5 border-l border-slate-700 pl-2">
            {children}
          </div>
        )}

        {/* Collapsed flyout */}
        {collapsed && (
          <FlyoutMenu id={menuId} title={label}>
            {children}
          </FlyoutMenu>
        )}
      </div>
    );
  };

  // Direct link (no submenu)
  const DirectLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 p-2 rounded transition-colors ${
          isActive ? "bg-slate-800 text-blue-400 font-semibold" : "hover:bg-slate-800 text-slate-300"
        }`
      }
      title={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`${collapsed ? "w-16" : "w-64"} bg-slate-900 text-white flex flex-col shadow-xl transition-all duration-300`}>
        {/* Header */}
        <div className="border-b border-slate-800">
          {/* Collapse toggle - separate row when collapsed */}
          {collapsed ? (
            <>
              <div className="p-2 flex justify-center border-b border-slate-800">
                <button
                  onClick={toggleCollapse}
                  className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                  title="Expandir menu"
                >
                  {Icons.expand}
                </button>
              </div>
              <div className="p-2 flex justify-center">
                <button
                  onClick={() => navigate("/")}
                  className="p-2 rounded hover:bg-slate-800 transition-colors"
                  title="Ir al inicio"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20"></div>
                </button>
              </div>
            </>
          ) : (
            <div className="p-2 flex items-center gap-1">
              {/* Logo + Title - clickable to home */}
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 transition-colors flex-1 min-w-0"
                title="Ir al inicio"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20 flex-shrink-0"></div>
                <span className="text-lg font-bold truncate">{t("title")}</span>
              </button>

              {/* Collapse toggle */}
              <button
                onClick={toggleCollapse}
                className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors flex-shrink-0"
                title="Contraer menu"
              >
                {Icons.collapse}
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {/* VENTAS */}
          <PermissionGate menuCode="ventas.clientes">
            <MenuItem icon={Icons.sales} label={t("sales")} menuId="ventas" isOpen={ventasOpen} setOpen={setVentasOpen}>
              <PermissionGate menuCode="ventas.clientes">
                <NavLink to="/clientes" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("clients")}</NavLink>
              </PermissionGate>
              <PermissionGate menuCode="ventas.caja">
                <NavLink to="/contabilidad/caja" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("cashRegister")}</NavLink>
              </PermissionGate>
            </MenuItem>
          </PermissionGate>

          {/* COMPRAS */}
          <PermissionGate menuCode="compras.proveedores">
            <MenuItem icon={Icons.purchases} label={t("purchases")} menuId="compras" isOpen={comprasOpen} setOpen={setComprasOpen}>
              <PermissionGate menuCode="compras.proveedores">
                <NavLink to="/proveedores" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("suppliers")}</NavLink>
              </PermissionGate>
              <PermissionGate menuCode="compras.ordenes">
                <NavLink to="/compras/ordenes" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("purchaseOrders")}</NavLink>
              </PermissionGate>
              <PermissionGate menuCode="compras.recepciones">
                <NavLink to="/compras/recepciones" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("receptions")}</NavLink>
              </PermissionGate>
              <PermissionGate menuCode="compras.facturas">
                <NavLink to="/compras/facturas" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("invoices")}</NavLink>
              </PermissionGate>
            </MenuItem>
          </PermissionGate>

          {/* PRODUCTOS */}
          <PermissionGate menuCode="productos.listado">
            <MenuItem icon={Icons.products} label={t("products")} menuId="productos" isOpen={productosOpen} setOpen={setProductosOpen}>
              <NavLink to="/productos" end className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("list")}</NavLink>
              <NavLink to="/productos/stock" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("stock")}</NavLink>
            </MenuItem>
          </PermissionGate>

          {/* SERVICIOS */}
          <PermissionGate menuCode="servicios.listado">
            <MenuItem icon={Icons.services} label={t("services")} menuId="servicios" isOpen={serviciosOpen} setOpen={setServiciosOpen}>
              <NavLink to="/configuracion/servicios" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("list")}</NavLink>
            </MenuItem>
          </PermissionGate>

          {/* CONTABILIDAD */}
          <PermissionGate menuCode="contabilidad.caja">
            <MenuItem icon={Icons.accounting} label={t("accounting")} menuId="contabilidad" isOpen={contabilidadOpen} setOpen={setContabilidadOpen}>
              <PermissionGate menuCode="contabilidad.ventas">
                <NavLink to="/contabilidad/ventas" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("salesInvoices")}</NavLink>
              </PermissionGate>
              <PermissionGate menuCode="contabilidad.compras">
                <NavLink to="/compras/facturas" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("purchaseInvoices")}</NavLink>
              </PermissionGate>
            </MenuItem>
          </PermissionGate>

          {/* AGENDA */}
          <PermissionGate menuCode="agenda">
            <DirectLink to="/agenda" icon={Icons.agenda} label={t("agenda", "Agenda")} />
          </PermissionGate>

          {/* ESCUELA */}
          <PermissionGate menuCode="escuela.clases">
            <MenuItem icon={Icons.school} label={t("school", "Escuela")} menuId="escuela" isOpen={escuelaOpen} setOpen={setEscuelaOpen}>
              <PermissionGate menuCode="escuela.clases">
                <NavLink to="/escuela/clases-recurrentes" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("recurringClasses", "Clases recurrentes")}</NavLink>
              </PermissionGate>
              <PermissionGate menuCode="escuela.matriculas">
                <NavLink to="/escuela/matriculas" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("enrollments", "Matrículas")}</NavLink>
              </PermissionGate>
              <PermissionGate menuCode="escuela.contactos">
                <NavLink to="/escuela/contactos" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("contacts", "Contactos")}</NavLink>
              </PermissionGate>
              <NavLink to="/escuela/descuentos" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("discounts", "Descuentos")}</NavLink>
              <NavLink to="/escuela/aulas" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("classrooms", "Aulas")}</NavLink>
            </MenuItem>
          </PermissionGate>

          {/* RECURSOS HUMANOS */}
          <PermissionGate menuCode="rrhh.trabajadores">
            <MenuItem icon={Icons.hr} label={t("humanResources", "RRHH")} menuId="rrhh" isOpen={rrhhOpen} setOpen={setRrhhOpen}>
              <PermissionGate menuCode="rrhh.trabajadores">
                <NavLink to="/rrhh/trabajadores" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("workers", "Trabajadores")}</NavLink>
              </PermissionGate>
              <NavLink to="/rrhh/nominas" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("payrolls", "Nóminas")}</NavLink>
              <PermissionGate menuCode="rrhh.fichajes">
                <NavLink to="/rrhh/fichajes" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("clockInOut", "Fichajes")}</NavLink>
              </PermissionGate>
              <PermissionGate menuCode="rrhh.festivos">
                <NavLink to="/rrhh/festivos" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("holidays", "Festivos")}</NavLink>
              </PermissionGate>
              <PermissionGate menuCode="rrhh.convenios">
                <NavLink to="/rrhh/convenios" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("agreements", "Convenios")}</NavLink>
              </PermissionGate>
              <PermissionGate menuCode="rrhh.control_horario">
                <NavLink to="/rrhh/control-horario/resumen" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("timeTracking", "Control Horario")}</NavLink>
              </PermissionGate>
            </MenuItem>
          </PermissionGate>

          {/* COMUNICACION */}
          <MenuItem icon={Icons.communication} label={t("communication", "Comunicacion")} menuId="comunicacion" isOpen={comunicacionOpen} setOpen={setComunicacionOpen}>
            <NavLink to="/comunicacion/notificaciones" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("notifications", "Notificaciones")}</NavLink>
            <NavLink to="/comunicacion/mensajes" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("messages", "Mensajes")}</NavLink>
            <NavLink to="/comunicacion/chat" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("chat", "Chat")}</NavLink>
          </MenuItem>

          {/* Separador */}
          {!collapsed && <div className="pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">{t("others")}</div>}
          {collapsed && <div className="border-t border-slate-700 my-2"></div>}

          {/* INVENTARIO */}
          <PermissionGate menuCode="inventario">
            <DirectLink to="/inventario" icon={Icons.inventory} label={t("inventory")} />
          </PermissionGate>

          {/* CONFIGURACION */}
          <MenuItem icon={Icons.settings} label={t("settings")} menuId="config" isOpen={configOpen} setOpen={setConfigOpen}>
            <PermissionGate menuCode="configuracion.profesionales">
              <NavLink to="/configuracion/profesionales" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("professionals")}</NavLink>
            </PermissionGate>
            <PermissionGate menuCode="configuracion.servicios">
              <NavLink to="/configuracion/servicios" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("services")}</NavLink>
            </PermissionGate>
            <AdminOnly>
              <NavLink to="/configuracion/usuarios" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("users")}</NavLink>
            </AdminOnly>
            <PermissionGate menuCode="configuracion.modos_pago">
              <NavLink to="/configuracion/modos-pago" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("paymentMethods")}</NavLink>
            </PermissionGate>
            <PermissionGate menuCode="configuracion.empresa">
              <NavLink to="/configuracion/empresa" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("companyData")}</NavLink>
            </PermissionGate>
            <PermissionGate menuCode="configuracion.aeat">
              <NavLink to="/configuracion/aeat" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("aeat")}</NavLink>
            </PermissionGate>
            <AdminOnly>
              <NavLink to="/configuracion/departamentos" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("departments", "Departamentos")}</NavLink>
            </AdminOnly>
            <MasterOnly>
              <NavLink to="/configuracion/bases-datos" className={subLinkStyle} onClick={() => setFlyoutMenu(null)}>{t("databases", "Bases de Datos")}</NavLink>
            </MasterOnly>
          </MenuItem>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-slate-800">
          {/* Language switcher - only when expanded */}
          {!collapsed && (
            <div className="p-3 border-b border-slate-800">
              <LanguageSwitcher />
            </div>
          )}

          {/* User menu */}
          <div className="p-2 relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-3"} p-2 hover:bg-slate-800 rounded-lg transition-colors`}
              title={collapsed ? user?.nombre || "Usuario" : undefined}
            >
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                {user?.nombre?.charAt(0).toUpperCase() || "U"}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user?.nombre || "Usuario"}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.username}</p>
                  </div>
                  {getRoleBadge()}
                </>
              )}
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className={`absolute bottom-full ${collapsed ? "left-full ml-2" : "left-2 right-2"} mb-2 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-20 overflow-hidden min-w-[180px]`}>
                  <NavLink
                    to="/perfil"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mi perfil
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar sesion
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
