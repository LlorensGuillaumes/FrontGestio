import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Outlet,
  NavLink,
  type NavLinkRenderProps,
  useNavigate,
  useSearchParams,
} from "react-router";

import { ClienteModal } from "~/modales/clienteModal";
import type { ClienteModalMode } from "~/types/clientes/maestros";
import RevisionesModal, { type RevisionModalMode } from "../../modales/revisionesModal";
import { GestionarFamiliasModal } from "~/modales/subfamiliasClienteModal";
import HistoriaClinicaModal from "~/modales/historiaClinicaModal";
import DocumentoModal, { type DocumentoModalMode } from "~/modales/documentoModal";

export type ClientesOutletContext = {
  openClienteModal: (mode: ClienteModalMode, id?: string) => void;
  openRevisionModal: (
    mode: RevisionModalMode,
    opts: { id?: string; idCliente?: string; nombreCliente?: string }
  ) => void;
  openDocumentoModal: (
    mode: DocumentoModalMode,
    opts: { id?: string; idCliente?: string; nombreCliente?: string }
  ) => void;
  refreshToken: number;
};

type ModalType = "cliente" | "revision" | "familias" | "hc" | "documento" | null;

export default function ClientesLayout() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshToken, setRefreshToken] = useState(0);

  const modal = (searchParams.get("modal") as ModalType) ?? null;
  const mode = (searchParams.get("mode") ?? "view") as string;
  const id = searchParams.get("id") ?? undefined;
  const idCliente = searchParams.get("idCliente") ?? undefined;
  const nombreCliente = searchParams.get("nombreCliente") ?? undefined;

  // Ref para trackear si el modal está abierto (para el evento popstate)
  const modalOpenRef = useRef(false);

  // Interceptar el botón atrás del navegador cuando hay modal abierto
  useEffect(() => {
    if (modal) {
      // Modal se acaba de abrir - añadir entrada al historial
      if (!modalOpenRef.current) {
        window.history.pushState({ modalOpen: true }, "");
        modalOpenRef.current = true;
      }
    } else {
      modalOpenRef.current = false;
    }
  }, [modal]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Si hay un modal abierto, cerrarlo en lugar de navegar
      if (modal) {
        e.preventDefault();
        // Cerrar el modal
        const sp = new URLSearchParams(searchParams);
        sp.delete("modal");
        sp.delete("mode");
        sp.delete("id");
        sp.delete("idCliente");
        sp.delete("nombreCliente");
        setSearchParams(sp, { replace: true });
        modalOpenRef.current = false;
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [modal, searchParams, setSearchParams]);

  const linkStyle = ({ isActive }: NavLinkRenderProps): string =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
    }`;

  const openRevisionModal = (
    newMode: RevisionModalMode,
    opts: { id?: string; idCliente?: string; nombreCliente?: string }
  ) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("modal", "revision");
    sp.set("mode", newMode);

    if (opts.id) sp.set("id", opts.id);
    else sp.delete("id");

    if (opts.idCliente) sp.set("idCliente", opts.idCliente);
    else sp.delete("idCliente");

    if (opts.nombreCliente) sp.set("nombreCliente", opts.nombreCliente);
    else sp.delete("nombreCliente");

    setSearchParams(sp, { replace: true });
  };

  const openDocumentoModal = (
    newMode: DocumentoModalMode,
    opts: { id?: string; idCliente?: string; nombreCliente?: string }
  ) => {
    console.log("openDocumentoModal called", newMode, opts);
    const sp = new URLSearchParams(searchParams);
    sp.set("modal", "documento");
    sp.set("mode", newMode);

    if (opts.id) sp.set("id", opts.id);
    else sp.delete("id");

    if (opts.idCliente) sp.set("idCliente", opts.idCliente);
    else sp.delete("idCliente");

    if (opts.nombreCliente) sp.set("nombreCliente", opts.nombreCliente);
    else sp.delete("nombreCliente");

    setSearchParams(sp, { replace: true });
  };

  const openClienteModal = (newMode: ClienteModalMode, newId?: string) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("modal", "cliente");
    sp.set("mode", newMode);

    if (newId) sp.set("id", newId);
    else sp.delete("id");

    sp.delete("idCliente");
    setSearchParams(sp, { replace: true });
  };

  const openGestionarFamiliasModal = () => {
    const sp = new URLSearchParams(searchParams);
    sp.set("modal", "familias");
    // opcional: por si quieres modos en este modal
    sp.set("mode", "edit");
    sp.delete("id");
    sp.delete("idCliente");
    setSearchParams(sp, { replace: true });
  };

  const openHistoriaClinicaModal = (clienteId: string) => {
    const sp = new URLSearchParams(searchParams);
    // Guardar el modal anterior para volver después
    if (modal) sp.set("prevModal", modal);
    if (mode) sp.set("prevMode", mode);
    sp.set("modal", "hc");
    sp.set("idCliente", clienteId);
    setSearchParams(sp, { replace: true });
  };

  const closeHcModal = () => {
    const sp = new URLSearchParams(searchParams);
    const prevModal = sp.get("prevModal");
    const prevMode = sp.get("prevMode");

    sp.delete("prevModal");
    sp.delete("prevMode");

    if (prevModal) {
      // Volver al modal anterior
      sp.set("modal", prevModal);
      if (prevMode) sp.set("mode", prevMode);
    } else {
      // No había modal anterior, cerrar todo
      sp.delete("modal");
      sp.delete("mode");
      sp.delete("id");
      sp.delete("idCliente");
    }

    setSearchParams(sp, { replace: true });
  };

  const closeModal = () => {
    const sp = new URLSearchParams(searchParams);
    sp.delete("modal");
    sp.delete("mode");
    sp.delete("id");
    sp.delete("idCliente");
    sp.delete("nombreCliente");
    setSearchParams(sp, { replace: true });
  };

  const onSaved = () => {
    setRefreshToken((v) => v + 1);
    closeModal();
  };

  const outletCtx = useMemo<ClientesOutletContext>(
    () => ({
      openClienteModal,
      openRevisionModal,
      openDocumentoModal,
      refreshToken,
    }),
    [refreshToken, searchParams]
  );

  return (
    <div className="flex flex-col h-full">
      <header className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 px-8 py-3 flex items-center justify-between">
        <nav className="flex items-center space-x-2 text-sm">
          <span className="text-slate-400 font-medium">Ventas</span>
          <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-bold tracking-tight px-2 py-0.5 bg-slate-200/50 rounded-md">
            Clientes
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
            title="Gestionar familias y subfamilias"
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

      {modal === "cliente" ? (
        <ClienteModal
          mode={mode as any}
          id={id}
          onClose={closeModal}
          onSaved={onSaved}
          onEdit={() => openClienteModal("edit", id)}
          onView={() => openClienteModal("view", id)}
        />
      ) : null}

      {modal === "revision" ? (
        <RevisionesModal
          mode={mode as RevisionModalMode}
          id={id}
          idCliente={idCliente}
          nombreCliente={nombreCliente}
          onClose={closeModal}
          onSaved={onSaved}
          onEdit={() => openRevisionModal("edit", { id, idCliente, nombreCliente })}
          onView={() => openRevisionModal("view", { id, idCliente, nombreCliente })}
          onOpenHistoriaClinica={openHistoriaClinicaModal}
          hcRefreshToken={refreshToken}
        />
      ) : null}

      {modal === "familias" ? (
        <GestionarFamiliasModal
          open
          mode={(mode === "view" ? "view" : "edit") as "view" | "edit"}
          onClose={closeModal}
          onChanged={() => setRefreshToken((v) => v + 1)}
        />
      ) : null}

      {modal === "hc" && idCliente ? (
        <HistoriaClinicaModal
          idCliente={idCliente}
          onClose={closeHcModal}
          onSaved={() => setRefreshToken((v) => v + 1)}
        />
      ) : null}

      {modal === "documento" ? (
        <DocumentoModal
          mode={mode as DocumentoModalMode}
          id={id}
          idCliente={idCliente}
          nombreCliente={nombreCliente}
          onClose={closeModal}
          onSaved={onSaved}
          onEdit={() => openDocumentoModal("edit", { id, idCliente, nombreCliente })}
          onView={() => openDocumentoModal("view", { id, idCliente, nombreCliente })}
        />
      ) : null}
    </div>
  );
}
