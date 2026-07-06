// app/modales/proveedorModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchProveedor,
  createProveedor,
  updateProveedor,
  fetchFamiliasProveedores,
  fetchSubfamiliasProveedores,
} from "~/lib/proveedoresRest";
import { SubfamiliasProveedoresPicker } from "~/components/recuadros/subFamiliasProveedoresPicker";
import { useAuth } from "~/contexts/AuthContext";

export type ProveedorModalMode = "new" | "view" | "edit";

type Props = {
  mode: ProveedorModalMode;
  id?: string;
  onClose: () => void;
  onSaved: () => void;
  onEdit: () => void;
  onView: () => void;
};

type Telefono = { id?: number; Telefono: string; Tipo: string };
type Contacto = { id?: number; Nombre: string; Cargo?: string; Telefono?: string; Email?: string };
type SubfamiliaRel = { id?: number; id_subfamilia: number; descripcion?: string };

export default function ProveedorModal({ mode, id, onClose, onSaved, onEdit, onView }: Props) {
  const { t } = useTranslation(["proveedores", "common"]);
  const { canAccess } = useAuth();
  const verBancarios = canAccess("proveedores.datos_bancarios", "ver");
  const isNew = mode === "new";
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos del formulario
  const [nombre, setNombre] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [nif, setNif] = useState("");
  const [direccion, setDireccion] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [poblacion, setPoblacion] = useState("");
  const [provincia, setProvincia] = useState("");
  const [pais, setPais] = useState("");
  const [email, setEmail] = useState("");
  const [web, setWeb] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Datos bancarios (SEPA pago)
  const [iban, setIban] = useState("");
  const [titularCuenta, setTitularCuenta] = useState("");
  const [bic, setBic] = useState("");

  const [telefonos, setTelefonos] = useState<Telefono[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [subfamiliasRel, setSubfamiliasRel] = useState<SubfamiliaRel[]>([]);

  // Catálogos
  const [familias, setFamilias] = useState<any[]>([]);
  const [subfamilias, setSubfamilias] = useState<any[]>([]);

  const title = useMemo(() => {
    if (isNew) return t("newSupplier");
    if (isEdit) return t("editSupplier");
    return t("supplierDetail");
  }, [isNew, isEdit, t]);

  // Cargar catálogos
  useEffect(() => {
    Promise.all([fetchFamiliasProveedores(), fetchSubfamiliasProveedores()])
      .then(([famRes, subRes]) => {
        const fam = famRes ?? [];
        const sub = subRes ?? [];
        setFamilias(fam);
        setSubfamilias(sub);
      })
      .catch(console.error);
  }, []);

  // Cargar proveedor
  useEffect(() => {
    if (isNew) {
      setNombre("");
      setNombreComercial("");
      setNif("");
      setDireccion("");
      setCodigoPostal("");
      setPoblacion("");
      setProvincia("");
      setPais("");
      setEmail("");
      setWeb("");
      setObservaciones("");
      setIban("");
      setTitularCuenta("");
      setBic("");
      setTelefonos([]);
      setContactos([]);
      setSubfamiliasRel([]);
      return;
    }

    if (!id) return;

    setLoading(true);
    setError(null);

    fetchProveedor(id)
      .then((data) => {
        setNombre(data.Nombre ?? "");
        setNombreComercial(data.NombreComercial ?? "");
        setNif(data.NIF ?? "");
        setDireccion(data.Direccion ?? "");
        setCodigoPostal(data.CodigoPostal ?? "");
        setPoblacion(data.Poblacion ?? "");
        setProvincia(data.Provincia ?? "");
        setPais(data.Pais ?? "");
        setEmail(data.Email ?? "");
        setWeb(data.Web ?? "");
        setObservaciones(data.Observaciones ?? "");
        setIban((data as any).Iban ?? "");
        setTitularCuenta((data as any).TitularCuenta ?? "");
        setBic((data as any).Bic ?? "");
        setTelefonos(
          (data.telefonos ?? []).map((t: any) => ({
            id: t.id,
            Telefono: t.Telefono ?? t.telefono ?? "",
            Tipo: t.Tipo ?? t.tipo ?? "",
          }))
        );
        setContactos(data.contactos ?? []);
        setSubfamiliasRel(
          (data.subfamilias ?? []).map((s: any) => ({
            id: s.id,
            id_subfamilia: s.IdSubFamilia || s.id_subfamilia,
            descripcion: s.Descripcion || s.descripcion,
          }))
        );
      })
      .catch((e) => setError(e.message ?? t("messages.errorLoading")))
      .finally(() => setLoading(false));
  }, [mode, id, isNew, t]);

  const canSave = useMemo(() => {
    return nombre.trim().length > 0;
  }, [nombre]);

  const handleSave = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    setError(null);

    try {
      const input = {
        nombre: nombre.trim(),
        nombreComercial: nombreComercial.trim() || null,
        nif: nif.trim() || null,
        direccion: direccion.trim() || null,
        codigoPostal: codigoPostal.trim() || null,
        poblacion: poblacion.trim() || null,
        provincia: provincia.trim() || null,
        pais: pais.trim() || null,
        email: email.trim() || null,
        web: web.trim() || null,
        observaciones: observaciones.trim() || null,
        iban: iban.trim() || null,
        titularCuenta: titularCuenta.trim() || null,
        bic: bic.trim() || null,
        telefonos: telefonos.filter((t) => t.Telefono.trim()),
        contactos: contactos.filter((c) => c.Nombre.trim()),
        subfamilias: subfamiliasRel.map((s) => ({ id_subfamilia: s.id_subfamilia })),
      };

      if (isNew) {
        await createProveedor(input);
      } else if (id) {
        await updateProveedor(id, input);
      }

      onSaved();
    } catch (e: any) {
      setError(e.message ?? t("messages.errorSaving"));
    } finally {
      setSaving(false);
    }
  };

  // Helpers para teléfonos
  const addTelefono = () => setTelefonos([...telefonos, { Telefono: "", Tipo: "Principal" }]);
  const removeTelefono = (idx: number) => setTelefonos(telefonos.filter((_, i) => i !== idx));
  const updateTelefono = (idx: number, field: string, value: string) => {
    setTelefonos(telefonos.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };

  // Helpers para contactos
  const addContacto = () => setContactos([...contactos, { Nombre: "", Cargo: "", Telefono: "", Email: "" }]);
  const removeContacto = (idx: number) => setContactos(contactos.filter((_, i) => i !== idx));
  const updateContacto = (idx: number, field: string, value: string) => {
    setContactos(contactos.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  // Handler para cambios en subfamilias desde el picker
  const handleSubfamiliasChange = (ids: number[]) => {
    setSubfamiliasRel(
      ids.map((id) => {
        const lookup = subfamilias.find((s: any) => s.IdSubFamiliaProveedor === id);
        return {
          id_subfamilia: id,
          descripcion: lookup?.Descripcion ?? "",
        };
      })
    );
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-slate-900">{title}</div>
              {!isNew && id && <div className="text-xs text-slate-500">ID: {id}</div>}
            </div>

            <div className="flex items-center gap-2">
              {!isNew && isView && (
                <button onClick={onEdit} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">
                  {t("common:buttons.edit")}
                </button>
              )}
              {!isNew && isEdit && (
                <button onClick={onView} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">
                  {t("common:modes.reading")}
                </button>
              )}
              <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">
                {t("common:buttons.close")}
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-auto">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

            {loading ? (
              <div className="text-center py-8 text-slate-500">{t("messages.loading")}</div>
            ) : (
              <>
                {/* Datos básicos */}
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-6">
                    <label className="text-xs font-bold text-slate-500">{t("fields.nameRequired")}</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      disabled={isView}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="text-xs font-bold text-slate-500">{t("fields.commercialName")}</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={nombreComercial}
                      onChange={(e) => setNombreComercial(e.target.value)}
                      disabled={isView}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs font-bold text-slate-500">{t("fields.nif")}</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={nif}
                      onChange={(e) => setNif(e.target.value)}
                      disabled={isView}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs font-bold text-slate-500">{t("fields.email")}</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isView}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs font-bold text-slate-500">{t("fields.web")}</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={web}
                      onChange={(e) => setWeb(e.target.value)}
                      disabled={isView}
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12">
                    <label className="text-xs font-bold text-slate-500">{t("fields.address")}</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      disabled={isView}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <label className="text-xs font-bold text-slate-500">{t("fields.postalCode")}</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={codigoPostal}
                      onChange={(e) => setCodigoPostal(e.target.value)}
                      disabled={isView}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <label className="text-xs font-bold text-slate-500">{t("fields.city")}</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={poblacion}
                      onChange={(e) => setPoblacion(e.target.value)}
                      disabled={isView}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <label className="text-xs font-bold text-slate-500">{t("fields.province")}</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={provincia}
                      onChange={(e) => setProvincia(e.target.value)}
                      disabled={isView}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <label className="text-xs font-bold text-slate-500">{t("fields.country")}</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={pais}
                      onChange={(e) => setPais(e.target.value)}
                      disabled={isView}
                    />
                  </div>
                </div>

                {/* Datos bancarios (SEPA) — requiere permiso */}
                {verBancarios && (
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="text-sm font-bold text-slate-700 mb-1">{t("modal.bankDataTitle")}</div>
                  <p className="text-xs text-slate-500 mb-3">
                    {t("modal.bankDataHelp")}
                  </p>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-7">
                      <label className="text-xs font-bold text-slate-500">IBAN</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                        value={iban}
                        onChange={(e) => setIban(e.target.value.toUpperCase())}
                        placeholder="ES00 0000 0000 0000 0000 0000"
                        disabled={isView}
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500">BIC</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                        value={bic}
                        onChange={(e) => setBic(e.target.value.toUpperCase())}
                        placeholder="XXXXESMMXXX"
                        disabled={isView}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <label className="text-xs font-bold text-slate-500">{t("modal.accountHolder")}</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={titularCuenta}
                        onChange={(e) => setTitularCuenta(e.target.value)}
                        placeholder={t("modal.accountHolderPlaceholder")}
                        disabled={isView}
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* Teléfonos */}
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-slate-700">{t("fields.phones")}</div>
                    {!isView && (
                      <button onClick={addTelefono} className="px-3 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50">
                        + {t("common:buttons.add")}
                      </button>
                    )}
                  </div>
                  {telefonos.length === 0 ? (
                    <div className="text-sm text-slate-500">{t("empty.noPhones")}</div>
                  ) : (
                    <div className="space-y-2">
                      {telefonos.map((tel, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder={t("fields.phone")}
                            value={tel.Telefono}
                            onChange={(e) => updateTelefono(idx, "Telefono", e.target.value)}
                            disabled={isView}
                          />
                          <select
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            value={tel.Tipo}
                            onChange={(e) => updateTelefono(idx, "Tipo", e.target.value)}
                            disabled={isView}
                          >
                            <option value="Principal">{t("phoneTypes.main")}</option>
                            <option value="Móvil">{t("phoneTypes.mobile")}</option>
                            <option value="Fax">{t("phoneTypes.fax")}</option>
                          </select>
                          {!isView && (
                            <button onClick={() => removeTelefono(idx)} className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50">
                              X
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contactos */}
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-slate-700">{t("fields.contacts")}</div>
                    {!isView && (
                      <button onClick={addContacto} className="px-3 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50">
                        + {t("common:buttons.add")}
                      </button>
                    )}
                  </div>
                  {contactos.length === 0 ? (
                    <div className="text-sm text-slate-500">{t("empty.noContacts")}</div>
                  ) : (
                    <div className="space-y-2">
                      {contactos.map((c, idx) => (
                        <div key={idx} className="flex gap-2 items-center flex-wrap">
                          <input
                            className="flex-1 min-w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder={t("fields.contactName")}
                            value={c.Nombre}
                            onChange={(e) => updateContacto(idx, "Nombre", e.target.value)}
                            disabled={isView}
                          />
                          <input
                            className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder={t("fields.contactPosition")}
                            value={c.Cargo ?? ""}
                            onChange={(e) => updateContacto(idx, "Cargo", e.target.value)}
                            disabled={isView}
                          />
                          <input
                            className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder={t("fields.phone")}
                            value={c.Telefono ?? ""}
                            onChange={(e) => updateContacto(idx, "Telefono", e.target.value)}
                            disabled={isView}
                          />
                          <input
                            className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder={t("fields.email")}
                            value={c.Email ?? ""}
                            onChange={(e) => updateContacto(idx, "Email", e.target.value)}
                            disabled={isView}
                          />
                          {!isView && (
                            <button onClick={() => removeContacto(idx)} className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50">
                              X
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subfamilias Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{t("fields.families")}</label>
                  <SubfamiliasProveedoresPicker
                    disabled={isView}
                    familias={familias.map((f: any) => ({
                      IdFamiliaProveedor: f.IdFamiliaProveedor,
                      Descripcion: f.Descripcion,
                    }))}
                    subfamilias={subfamilias.map((s: any) => ({
                      IdSubFamiliaProveedor: s.IdSubFamiliaProveedor,
                      IdFamiliaProveedor: s.IdFamiliaProveedor,
                      Descripcion: s.Descripcion,
                    }))}
                    selected={subfamiliasRel.map((s) => s.id_subfamilia)}
                    onChangeSelected={handleSubfamiliasChange}
                    mode={isView ? "view" : "edit"}
                  />
                </div>

                {/* Observaciones */}
                <div>
                  <label className="text-xs font-bold text-slate-500">{t("fields.observations")}</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    disabled={isView}
                  />
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm" disabled={saving}>
              {t("common:buttons.cancel")}
            </button>
            {!isView && (
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
                disabled={!canSave || saving}
              >
                {saving ? t("common:buttons.saving") : t("common:buttons.save")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
