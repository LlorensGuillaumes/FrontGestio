// app/modales/clienteModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListEditorModal } from "./listEditorModal";
import { apiGet, apiPost, apiPut } from "~/lib/apiClient";
import { SubfamiliasPicker } from "~/components/recuadros";
import ResponsablesSection from "~/components/ResponsablesSection";
import ClasesAlumnoSection from "~/components/ClasesAlumnoSection";
import { useAuth } from "~/contexts/AuthContext";
import type {
  Familia,
  Subfamilia,
  Cliente,
  TipoCliente,
  Telefono,
  ClienteSubfamiliaRow,
  Props,
} from "~/types/clientes/maestros";

// ✅ endpoints nuevos
const CLIENTE_POST_EP = "/clientes-post";
const CLIENTE_PUT_EP = "/clientes-put"; // se usa como `${CLIENTE_PUT_EP}/${id}`

// ✅ relación cliente-subfamilia
const REL_EP = "/clientes-subfamilias";

function isoDateToday() {
  return new Date().toISOString().slice(0, 10);
}

// Normalizador: acepta snake_case/camel/Pascal y lo deja en Cliente (Pascal)
function normalizeCliente(raw: any): Cliente {
  const tipo = (raw?.TipoCliente ?? raw?.tipo_cliente ?? "P") as TipoCliente;

  return {
    IdCliente: Number(raw?.IdCliente ?? raw?.id ?? 0),

    TipoCliente: tipo,
    DocumentoFiscal: raw?.DocumentoFiscal ?? raw?.documento_fiscal ?? "",
    NombreComercial: raw?.NombreComercial ?? raw?.nombre_comercial ?? null,
    EsSimplificada: Boolean(
      raw?.EsSimplificada ?? raw?.es_cliente_factura_simplificada ?? false
    ),

    // Persona (viene en raw.persona)
    P_Nombre: raw?.P_Nombre ?? raw?.persona?.nombre ?? "",
    P_Apellido1: raw?.P_Apellido1 ?? raw?.persona?.primerApellido ?? "",
    P_Apellido2: raw?.P_Apellido2 ?? raw?.persona?.segundoApellido ?? "",
    P_FechaNac: raw?.P_FechaNac ?? raw?.persona?.fechaNacimiento ?? "",

    // Empresa (viene en raw.empresa)
    E_RazonSocial: raw?.E_RazonSocial ?? raw?.empresa?.razonSocial ?? "",
    E_NombreFiscal: raw?.E_NombreFiscal ?? raw?.empresa?.nombreFiscal ?? "",
    E_Contacto: raw?.E_Contacto ?? raw?.empresa?.contacto ?? "",
    E_Email: raw?.E_Email ?? raw?.empresa?.email ?? "",

    Direccion: raw?.Direccion ?? raw?.direccion ?? "",
    CodigoPostal: raw?.CodigoPostal ?? raw?.codigo_postal ?? "",
    Poblacion: raw?.Poblacion ?? raw?.poblacion ?? "",
    Pais: raw?.Pais ?? raw?.pais ?? "España",

    telefonos: Array.isArray(raw?.telefonos)
      ? raw.telefonos.map((t: any) => ({
          telefono: String(t?.telefono ?? ""),
          extension: t?.extension != null ? String(t.extension) : null,
        }))
      : [],
  };
}

export function ClienteModal({ mode, id, onClose, onSaved, onEdit, onView }: Props) {
  const { t } = useTranslation("clientes");

  const isNew = mode === "new";
  const isEdit = mode === "edit";
  const isView = mode === "view";

  const clienteId = id ? Number(id) : undefined;

  const [loading, setLoading] = useState(false);
  const disabled = isView || loading;

  const [error, setError] = useState<string | null>(null);

  const [cliente, setCliente] = useState<Cliente | null>(null);

  // catálogos
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [subfamilias, setSubfamilias] = useState<Subfamilia[]>([]);

  // relación cliente-subfamilias (lo que hay en BD)
  const [relSubRows, setRelSubRows] = useState<ClienteSubfamiliaRow[]>([]);
  // selección UI (ids subfamilia activos)
  const [selectedSubfamilias, setSelectedSubfamilias] = useState<number[]>([]);

  // general
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>("P");
  const [documentoFiscal, setDocumentoFiscal] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [esSimplificada, setEsSimplificada] = useState(false);

  // persona
  const [pNombre, setPNombre] = useState("");
  const [pApellido1, setPApellido1] = useState("");
  const [pApellido2, setPApellido2] = useState("");
  const [pFechaNac, setPFechaNac] = useState("");

  // datos bancarios (SEPA) del alumno
  const [iban, setIban] = useState("");
  const [titularCuenta, setTitularCuenta] = useState("");
  const [bic, setBic] = useState("");

  const { canAccess } = useAuth();
  const verBancarios = canAccess("clientes.datos_bancarios", "ver");

  // empresa
  const [eRazonSocial, setERazonSocial] = useState("");
  const [eNombreFiscal, setENombreFiscal] = useState("");
  const [eContacto, setEContacto] = useState("");
  const [eEmail, setEEmail] = useState("");

  // dirección
  const [direccion, setDireccion] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [poblacion, setPoblacion] = useState("");
  const [pais, setPais] = useState("España");

  // teléfonos
  const [telefonos, setTelefonos] = useState<Telefono[]>([{ telefono: "", extension: "" }]);
  const [phonesModalOpen, setPhonesModalOpen] = useState(false);

  const title = useMemo(() => {
    if (isNew) return t("newClient");
    if (isEdit) return t("editClient");
    return t("clientFile");
  }, [isNew, isEdit, t]);

  const headerSubtitle = useMemo(() => {
    if (isNew) return t("createSubtitle");
    if (isEdit) return t("editSubtitle");
    return t("viewSubtitle");
  }, [isNew, isEdit, t]);

  const nombreTitulo = useMemo(() => {
    if (tipoCliente === "P") {
      return [pNombre, pApellido1, pApellido2].filter(Boolean).join(" ").trim() || t("info.noName");
    }
    return eRazonSocial || t("info.noCompanyName");
  }, [tipoCliente, pNombre, pApellido1, pApellido2, eRazonSocial, t]);

  const telefonosView = useMemo(
    () => (isView ? (cliente?.telefonos ?? []) : telefonos),
    [isView, cliente, telefonos]
  );

  const normalizePhones = (items: Telefono[]) =>
    items
      .map((t) => ({
        telefono: String(t.telefono ?? "").trim(),
        extension: String(t.extension ?? "").trim() || null,
      }))
      .filter((t) => t.telefono.length > 0);

  const canSave = useMemo(() => {
    if (disabled) return false;
    if (tipoCliente === "P") return (pNombre.trim() || pApellido1.trim()) && documentoFiscal.trim();
    return eRazonSocial.trim() && documentoFiscal.trim();
  }, [disabled, tipoCliente, pNombre, pApellido1, eRazonSocial, documentoFiscal]);

  async function loadClienteSubfamilias(idCli: number) {
    const rel = await apiGet<{ rows: ClienteSubfamiliaRow[] }>(
      `${REL_EP}?take=5000&offset=0&id_cliente=${idCli}`
    );

    const rows = rel?.rows ?? [];
    setRelSubRows(rows);

    const activeIds = rows
      .filter((r) => !r.fecha_hasta)
      .map((r) => Number(r.id_subfamilia));

    setSelectedSubfamilias(activeIds);
  }

  // ✅ crea SOLO las relaciones que faltan (evita 500 por duplicados)
  async function syncClienteSubfamilias(idCli: number, selected: number[]) {
    const rel = await apiGet<{ rows: ClienteSubfamiliaRow[] }>(
      `${REL_EP}?take=5000&offset=0&id_cliente=${idCli}`
    );
    const rows = rel?.rows ?? [];

    const activeRows = rows.filter((r) => !r.fecha_hasta);
    const activeSet = new Set(activeRows.map((r) => Number(r.id_subfamilia)));

    const toAdd = selected.filter((idSub) => !activeSet.has(idSub));

    for (const idSub of toAdd) {
      await apiPost(REL_EP, {
        id_cliente: idCli,
        id_subfamilia: idSub,
        fecha_desde: null,
        fecha_hasta: null,
      });
    }

    // 🔥 Si luego quieres cerrar/quitarlas, dime si existe PUT y cómo.
    /*
    const selectedSet = new Set(selected);
    const toClose = activeRows.filter((r) => !selectedSet.has(Number(r.id_subfamilia)));
    for (const r of toClose) {
      if (!r.id) continue;
      await apiPut(`${REL_EP}/${r.id}`, { ...r, fecha_hasta: isoDateToday() });
    }
    */
  }

  // Cargar combos + cliente + relaciones
  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);

      try {
        const [fam, sub] = await Promise.all([
          apiGet<{ rows: Familia[] }>("/familias-clientes?take=5000&offset=0"),
          apiGet<{ rows: Subfamilia[] }>("/subfamilias-clientes?take=5000&offset=0"),
        ]);

        setFamilias(fam.rows ?? []);
        setSubfamilias(sub.rows ?? []);

        if (!isNew) {
          if (!clienteId) throw new Error("Falta id del cliente para cargar la ficha.");

          const raw = await apiGet<any>(`/clientes/${clienteId}?soloActivos=1`);
          const c = normalizeCliente(raw);

          setCliente(c);

          setTipoCliente(c.TipoCliente ?? "P");
          setDocumentoFiscal(c.DocumentoFiscal ?? "");
          setNombreComercial(c.NombreComercial ?? "");
          setEsSimplificada(Boolean(c.EsSimplificada));

          setPNombre(c.P_Nombre ?? "");
          setPApellido1(c.P_Apellido1 ?? "");
          setPApellido2(c.P_Apellido2 ?? "");
          setPFechaNac(c.P_FechaNac ?? "");

          setIban(raw?.iban ?? "");
          setTitularCuenta(raw?.titular_cuenta ?? "");
          setBic(raw?.bic ?? "");

          setERazonSocial(c.E_RazonSocial ?? "");
          setENombreFiscal(c.E_NombreFiscal ?? "");
          setEContacto(c.E_Contacto ?? "");
          setEEmail(c.E_Email ?? "");

          setDireccion(c.Direccion ?? "");
          setCodigoPostal(c.CodigoPostal ?? "");
          setPoblacion(c.Poblacion ?? "");
          setPais(c.Pais ?? "España");

          const fromApiPhones = (c.telefonos ?? []).map((t: Telefono) => ({
            telefono: String(t.telefono ?? ""),
            extension: t.extension ? String(t.extension) : "",
          }));
          setTelefonos(fromApiPhones.length ? fromApiPhones : [{ telefono: "", extension: "" }]);

          await loadClienteSubfamilias(clienteId);
        } else {
          setCliente(null);
          setRelSubRows([]);
          setSelectedSubfamilias([]);

          setTipoCliente("P");
          setDocumentoFiscal("");
          setNombreComercial("");
          setEsSimplificada(false);

          setPNombre("");
          setPApellido1("");
          setPApellido2("");
          setPFechaNac("");

          setIban("");
          setTitularCuenta("");
          setBic("");

          setERazonSocial("");
          setENombreFiscal("");
          setEContacto("");
          setEEmail("");

          setDireccion("");
          setCodigoPostal("");
          setPoblacion("");
          setPais("España");

          setTelefonos([{ telefono: "", extension: "" }]);
        }
      } catch (e: any) {
        setError(e?.message ?? "Error cargando datos");
      } finally {
        setLoading(false);
      }
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id]);

  const onSave = async () => {
    if (!canSave) return;

    setError(null);
    setLoading(true);

    try {
      const phones = normalizePhones(telefonos);

      const payload: any = {
        tipo_cliente: tipoCliente,
        documento_fiscal: documentoFiscal.trim(),
        nombre_comercial: nombreComercial.trim() || null,
        es_cliente_factura_simplificada: Boolean(esSimplificada),

        direccion: direccion.trim() || null,
        codigo_postal: codigoPostal.trim() || null,
        poblacion: poblacion.trim() || null,
        pais: (pais.trim() || "España") ?? "España",

        iban: iban.trim() || null,
        titular_cuenta: titularCuenta.trim() || null,
        bic: bic.trim() || null,

        persona:
          tipoCliente === "P"
            ? {
                nombre: pNombre.trim() || null,
                primerApellido: pApellido1.trim() || null,
                segundoApellido: pApellido2.trim() || null,
                fechaNacimiento: pFechaNac || null,
              }
            : null,

        empresa:
          tipoCliente === "E"
            ? {
                razonSocial: eRazonSocial.trim() || null,
                nombreFiscal: eNombreFiscal.trim() || null,
                contacto: eContacto.trim() || null,
                email: eEmail.trim() || null,
              }
            : null,

        telefonos: phones.map((t, idx) => ({
          telefono: t.telefono,
          extension: t.extension ?? null,
          es_principal: idx === 0 ? 1 : 0,
        })),
        subfamilias: subfamilias.map((s)=>({
          idSubfamilia: s.id
        }))
      };

      let savedId = clienteId ?? 0;

      if (isNew) {
        const created = await apiPost<any>(CLIENTE_POST_EP, payload);
        savedId = Number(created?.id ?? created?.IdCliente ?? created?.id_cliente ?? 0);
        if (!savedId) throw new Error("No se recibió el id del cliente creado.");
      } else {
        if (!clienteId) throw new Error("Falta id para actualizar.");
        // ✅ PUT nuevo con /:id
        await apiPut(`${CLIENTE_PUT_EP}/${clienteId}`, payload);
        savedId = clienteId;
      }

      // ✅ asignación de subfamilias por endpoint aparte
      await syncClienteSubfamilias(savedId, selectedSubfamilias);

      onSaved?.(savedId);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Error guardando");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => !loading && onClose()} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="w-[96vw] max-w-6xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold text-slate-900">{title}</div>
              <div className="text-sm text-slate-500">{headerSubtitle}</div>

              {!isNew ? (
                <div className="mt-2 text-xs text-slate-400">
                  <span className="font-medium text-slate-700">{nombreTitulo}</span>
                  {documentoFiscal ? <span> · {documentoFiscal}</span> : null}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {isView ? (
                <button
                  type="button"
                  onClick={onEdit}
                  className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                  disabled={loading}
                >
                  {t("common:buttons.modify", { ns: "common" })}
                </button>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                disabled={loading}
              >
                {t("common:buttons.close", { ns: "common" })}
              </button>
            </div>
          </div>

          {/* body */}
          <div className="px-6 py-5 space-y-4 max-h-[80vh] overflow-auto">
            {error ? (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                {error}
              </div>
            ) : null}

            {loading && !isNew ? (
              <div className="p-3 rounded-lg bg-slate-50 text-slate-600 text-sm border border-slate-200">
                {t("common:messages.loading", { ns: "common" })}
              </div>
            ) : null}

            {/* Datos generales */}
            <section className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="font-medium text-slate-900">{t("fields.generalData")}</div>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("fields.type")}</label>
                  <select
                    value={tipoCliente}
                    onChange={(e) => setTipoCliente(e.target.value as TipoCliente)}
                    disabled={disabled}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="P">{t("common:person.person", { ns: "common" })}</option>
                    <option value="E">{t("common:person.company", { ns: "common" })}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("fields.fiscalDocument")}</label>
                  <input
                    value={documentoFiscal}
                    onChange={(e) => setDocumentoFiscal(e.target.value)}
                    disabled={disabled}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder={t("fields.fiscalDocumentPlaceholder")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("fields.commercialName")}</label>
                  <input
                    value={nombreComercial}
                    onChange={(e) => setNombreComercial(e.target.value)}
                    disabled={disabled}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder={t("common:fields.optional", { ns: "common" })}
                  />
                </div>

                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={esSimplificada}
                      onChange={(e) => setEsSimplificada(e.target.checked)}
                      disabled={disabled}
                      className="rounded border-slate-300"
                    />
                    {t("fields.simplifiedInvoice")}
                  </label>
                </div>
              </div>
            </section>

            {/* Persona / Empresa */}
            {tipoCliente === "P" ? (
              <section className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="font-medium text-slate-900">{t("fields.person")}</div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("fields.firstName")}</label>
                    <input
                      value={pNombre}
                      onChange={(e) => setPNombre(e.target.value)}
                      disabled={disabled}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("fields.firstSurname")}</label>
                    <input
                      value={pApellido1}
                      onChange={(e) => setPApellido1(e.target.value)}
                      disabled={disabled}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("fields.secondSurname")}</label>
                    <input
                      value={pApellido2}
                      onChange={(e) => setPApellido2(e.target.value)}
                      disabled={disabled}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder={t("common:fields.optional", { ns: "common" })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("fields.birthDate")}</label>
                    <input
                      type="date"
                      value={pFechaNac}
                      onChange={(e) => setPFechaNac(e.target.value)}
                      disabled={disabled}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="font-medium text-slate-900">{t("fields.company")}</div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("fields.companyName")}</label>
                    <input
                      value={eRazonSocial}
                      onChange={(e) => setERazonSocial(e.target.value)}
                      disabled={disabled}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("fields.fiscalName")}</label>
                    <input
                      value={eNombreFiscal}
                      onChange={(e) => setENombreFiscal(e.target.value)}
                      disabled={disabled}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder={t("common:fields.optional", { ns: "common" })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("fields.contactPerson")}</label>
                    <input
                      value={eContacto}
                      onChange={(e) => setEContacto(e.target.value)}
                      disabled={disabled}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder={t("common:fields.optional", { ns: "common" })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("fields.contactEmail")}</label>
                    <input
                      value={eEmail}
                      onChange={(e) => setEEmail(e.target.value)}
                      disabled={disabled}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder={t("filters.emailPlaceholder")}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Subfamilias */}
            <section className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="font-medium text-slate-900">{t("fields.familiesSubfamilies")}</div>
              </div>

              <div className="p-4">
                <SubfamiliasPicker
                  disabled={disabled}
                  familias={familias}
                  subfamilias={subfamilias}
                  selected={selectedSubfamilias}
                  onChangeSelected={setSelectedSubfamilias}
                  mode={isView ? "view" : "edit"}
                />
              </div>
            </section>

            {/* Telefonos */}
            <section className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                <div className="font-medium text-slate-900">{t("common:fields.phones", { ns: "common" })}</div>

                {!isView ? (
                  <button
                    type="button"
                    onClick={() => setPhonesModalOpen(true)}
                    className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                    disabled={disabled}
                  >
                    {t("fields.managePhones")}
                  </button>
                ) : null}
              </div>

              <div className="p-4">
                {telefonosView.length ? (
                  <ul className="space-y-1 text-sm text-slate-700">
                    {telefonosView.map((tel: Telefono, i: number) => (
                      <li key={`${tel.telefono}-${i}`} className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-700 text-xs">
                          {i + 1}
                        </span>
                        <span className="font-medium">{tel.telefono}</span>
                        {tel.extension ? <span className="text-slate-500">(ext {tel.extension})</span> : null}
                        {i === 0 ? <span className="text-xs text-slate-500">· {t("common:fields.main", { ns: "common" })}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-slate-500">{t("fields.noPhones")}</div>
                )}
              </div>
            </section>

            {/* Datos bancarios (SEPA) — requiere permiso */}
            {verBancarios && (
            <section className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="font-medium text-slate-900">{t("modal.bankDataTitle")}</div>
              </div>
              <div className="p-4 space-y-3">
                {(() => {
                  const edad = pFechaNac ? Math.floor((Date.now() - new Date(pFechaNac).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;
                  return edad !== null && edad < 18 ? (
                    <div className="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm border border-amber-100">
                      {t("modal.minorWarning")}
                    </div>
                  ) : null;
                })()}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">IBAN</label>
                    <input value={iban} onChange={(e) => setIban(e.target.value)} disabled={disabled}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="ES.." />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">BIC</label>
                    <input value={bic} onChange={(e) => setBic(e.target.value)} disabled={disabled}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">{t("modal.accountHolder")}</label>
                  <input value={titularCuenta} onChange={(e) => setTitularCuenta(e.target.value)} disabled={disabled}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>
            </section>
            )}

            {/* Clases matriculadas (solo personas existentes) */}
            {tipoCliente === "P" && !isNew && clienteId ? (
              <ClasesAlumnoSection idCliente={clienteId} disabled={disabled} />
            ) : null}

            {/* Responsables (solo personas existentes) */}
            {tipoCliente === "P" && !isNew && clienteId ? (
              <ResponsablesSection idCliente={clienteId} disabled={disabled} />
            ) : null}
          </div>

          {/* footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {isView ? t("common:modes.reading", { ns: "common" }) : isEdit ? t("common:modes.editing", { ns: "common" }) : t("common:modes.creating", { ns: "common" })}
            </div>

            <div className="flex items-center gap-2">
              {isEdit ? (
                <button
                  type="button"
                  onClick={onView}
                  className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                  disabled={loading}
                >
                  {t("common:buttons.cancel", { ns: "common" })}
                </button>
              ) : null}

              {isNew || isEdit ? (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!canSave || loading}
                  className="px-4 py-2 rounded-lg text-sm text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? t("common:buttons.saving", { ns: "common" }) : t("common:buttons.save", { ns: "common" })}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modal telefonos */}
      <ListEditorModal<Telefono>
        open={phonesModalOpen}
        title={t("fields.phonesTitle")}
        subtitle={t("fields.phonesSubtitle")}
        value={telefonos}
        onChange={(next) => setTelefonos(next)}
        createEmpty={() => ({ telefono: "", extension: "" })}
        normalize={normalizePhones}
        disabled={disabled}
        maxWidthClassName="max-w-4xl"
        onClose={() => setPhonesModalOpen(false)}
        renderRow={(item, _idx, update, isDisabled) => (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8">
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("common:fields.phone", { ns: "common" })}</label>
              <input
                value={item.telefono ?? ""}
                onChange={(e) => update({ telefono: e.target.value })}
                disabled={isDisabled}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="600000000"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("common:fields.extension", { ns: "common" })}</label>
              <input
                value={(item.extension ?? "") as any}
                onChange={(e) => update({ extension: e.target.value })}
                disabled={isDisabled}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder={t("common:fields.optional", { ns: "common" })}
              />
            </div>
          </div>
        )}
      />
    </div>
  );
}
