// app/routes/productos/layout.tsx
import React, { useMemo, useState } from "react";
import { Outlet, NavLink, type NavLinkRenderProps, useSearchParams } from "react-router";
import { GestionarFamiliasProductoModal } from "~/modales/familiasProductoModal";
import ProductoModal from "~/modales/productoModal";

export type ProductoModalMode = "new" | "view" | "edit";

export type ProductosOutletContext = {
  openProductoModal: (mode: ProductoModalMode, id?: string) => void;
  refreshToken: number;
};

type ModalType = "producto" | "familias" | null;

export default function ProductosLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshToken, setRefreshToken] = useState(0);

  const modal = (searchParams.get("modal") as ModalType) ?? null;
  const mode = (searchParams.get("mode") ?? "view") as ProductoModalMode;
  const id = searchParams.get("id") ?? undefined;

  const linkStyle = ({ isActive }: NavLinkRenderProps): string =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
    }`;

  const openProductoModal = (newMode: ProductoModalMode, newId?: string) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("modal", "producto");
    sp.set("mode", newMode);
    if (newId) sp.set("id", newId);
    else sp.delete("id");
    setSearchParams(sp, { replace: true });
  };

  const openGestionarFamiliasModal = () => {
    const sp = new URLSearchParams(searchParams);
    sp.set("modal", "familias");
    sp.delete("mode");
    sp.delete("id");
    setSearchParams(sp, { replace: true });
  };

  const closeModal = () => {
    const sp = new URLSearchParams(searchParams);
    sp.delete("modal");
    sp.delete("mode");
    sp.delete("id");
    setSearchParams(sp, { replace: true });
  };

  const onSaved = () => {
    setRefreshToken((v) => v + 1);
    closeModal();
  };

  const outletCtx = useMemo<ProductosOutletContext>(
    () => ({
      openProductoModal,
      refreshToken,
    }),
    [refreshToken, searchParams]
  );

  return (
    <div className="flex flex-col h-full">
      <header className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 px-8 py-3 flex items-center justify-between">
        <nav className="flex items-center space-x-2 text-sm">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-slate-900 font-bold tracking-tight px-2 py-0.5 bg-slate-200/50 rounded-md">
            Productos
          </span>
        </nav>

        <nav className="flex space-x-1 bg-slate-200/40 p-1 rounded-xl border border-slate-200/50">
          <NavLink to="." end className={linkStyle}>
            Listado
          </NavLink>

          <button
            type="button"
            onClick={openGestionarFamiliasModal}
            className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          >
            Gestionar familias
          </button>
        </nav>
      </header>

      <main className="bg-white flex-1 overflow-auto">
        <div className="max-w-none mx-auto">
          <Outlet context={outletCtx} />
        </div>
      </main>

      {modal === "producto" && (
        <ProductoModal
          mode={mode}
          id={id}
          onClose={closeModal}
          onSaved={onSaved}
          onEdit={() => openProductoModal("edit", id)}
          onView={() => openProductoModal("view", id)}
        />
      )}

      {modal === "familias" && (
        <GestionarFamiliasProductoModal
          open
          onClose={closeModal}
          onChanged={() => setRefreshToken((v) => v + 1)}
        />
      )}
    </div>
  );
}
