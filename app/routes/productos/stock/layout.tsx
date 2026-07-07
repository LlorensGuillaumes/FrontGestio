// app/routes/productos/stock/layout.tsx
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, NavLink, type NavLinkRenderProps, useSearchParams } from "react-router";
import HistorialMovimientosModal from "~/modales/historialMovimientosModal";

export type StockOutletContext = {
  openHistorialModal: (idProducto: number, nombreProducto: string) => void;
  refreshToken: number;
};

export default function StockLayout() {
  const { t } = useTranslation(["productos", "common"]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshToken, setRefreshToken] = useState(0);

  const modal = searchParams.get("modal");
  const idProducto = searchParams.get("idProducto");
  const nombreProducto = searchParams.get("nombreProducto");

  const linkStyle = ({ isActive }: NavLinkRenderProps): string =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
    }`;

  const openHistorialModal = (id: number, nombre: string) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("modal", "historial");
    sp.set("idProducto", String(id));
    sp.set("nombreProducto", nombre);
    setSearchParams(sp, { replace: true });
  };

  const closeModal = () => {
    const sp = new URLSearchParams(searchParams);
    sp.delete("modal");
    sp.delete("idProducto");
    sp.delete("nombreProducto");
    setSearchParams(sp, { replace: true });
  };

  const outletCtx = useMemo<StockOutletContext>(
    () => ({
      openHistorialModal,
      refreshToken,
    }),
    [refreshToken, searchParams]
  );

  return (
    <div className="flex flex-col h-full">
      <header className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 px-8 py-3 flex items-center justify-between">
        <nav className="flex items-center space-x-2 text-sm">
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <NavLink to="/productos" className="text-slate-500 hover:text-slate-700">
            {t("common:breadcrumb.productos")}
          </NavLink>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 font-bold tracking-tight px-2 py-0.5 bg-slate-200/50 rounded-md">
            {t("common:breadcrumb.stock")}
          </span>
        </nav>

        <nav className="flex space-x-1 bg-slate-200/40 p-1 rounded-xl border border-slate-200/50">
          <NavLink to="." end className={linkStyle}>
            {t("common:breadcrumb.listado")}
          </NavLink>
        </nav>
      </header>

      <main className="bg-white flex-1 overflow-auto">
        <div className="max-w-none mx-auto">
          <Outlet context={outletCtx} />
        </div>
      </main>

      {modal === "historial" && idProducto && (
        <HistorialMovimientosModal
          idProducto={Number(idProducto)}
          nombreProducto={nombreProducto ?? t("common:breadcrumb.productos")}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
