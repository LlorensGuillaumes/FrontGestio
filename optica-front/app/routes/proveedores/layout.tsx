import React, { useMemo, useState } from "react";
import { Outlet, NavLink, type NavLinkRenderProps, useSearchParams } from "react-router";
import { GestionarFamiliasProveedorModal } from "~/modales/familiasProveedorModal";
import ProveedorModal from "~/modales/proveedorModal";

export type ProveedorModalMode = "new" | "view" | "edit";

export type ProveedoresOutletContext = {
  openProveedorModal: (mode: ProveedorModalMode, id?: string) => void;
  refreshToken: number;
};

type ModalType = "proveedor" | "familias" | null;

export default function ProveedoresLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshToken, setRefreshToken] = useState(0);

  const modal = (searchParams.get("modal") as ModalType) ?? null;
  const mode = (searchParams.get("mode") ?? "view") as ProveedorModalMode;
  const id = searchParams.get("id") ?? undefined;

  const linkStyle = ({ isActive }: NavLinkRenderProps): string =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
    }`;

  const openProveedorModal = (newMode: ProveedorModalMode, newId?: string) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("modal", "proveedor");
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

  const outletCtx = useMemo<ProveedoresOutletContext>(
    () => ({
      openProveedorModal,
      refreshToken,
    }),
    [refreshToken, searchParams]
  );

  return (
    <div className="flex flex-col h-full">
      <header className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 px-8 py-3 flex items-center justify-between">
        <nav className="flex items-center space-x-2 text-sm">
          <span className="text-slate-400 font-medium">Compras</span>
          <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-bold tracking-tight px-2 py-0.5 bg-slate-200/50 rounded-md">
            Proveedores
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

      {modal === "proveedor" && (
        <ProveedorModal
          mode={mode}
          id={id}
          onClose={closeModal}
          onSaved={onSaved}
          onEdit={() => openProveedorModal("edit", id)}
          onView={() => openProveedorModal("view", id)}
        />
      )}

      {modal === "familias" && (
        <GestionarFamiliasProveedorModal
          open
          onClose={closeModal}
          onChanged={() => setRefreshToken((v) => v + 1)}
        />
      )}
    </div>
  );
}
