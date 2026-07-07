// app/modales/productoModal.tsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchProducto,
  createProducto,
  updateProducto,
  fetchFamiliasProductos,
  fetchMarcas,
  type ProductoFull,
} from "~/lib/productosFullRest";
import { fetchProveedoresFullPage } from "~/lib/proveedoresRest";
import { SubfamiliasProductosPicker } from "~/components/recuadros/subFamiliasProductosPicker";

type Mode = "new" | "view" | "edit";

type Props = {
  mode: Mode;
  id?: string;
  onClose: () => void;
  onSaved: () => void;
  onEdit?: () => void;
  onView?: () => void;
};

type Familia = { IdFamiliaProducto: number; Descripcion: string };
type Subfamilia = { IdSubFamiliaProducto: number; IdFamiliaProducto: number; Descripcion: string };
type Marca = { IdMarca: number; Descripcion: string };
type Proveedor = { id: number; Nombre: string };

type SubfamiliaRel = { id?: number; id_subfamilia: number; descripcion?: string };
type ProveedorRel = { id?: number; id_proveedor: number; nombre_proveedor?: string; referencia?: string; precio?: number };

const emptyForm = {
  Codigo: "",
  Nombre: "",
  Descripcion: "",
  PVP: "",
  Stock: "",
  StockMinimo: "",
  IdMarca: "",
  IdTipoIva: "1",
  Ubicacion: "",
  Observaciones: "",
  Activo: 1,
};

export default function ProductoModal({ mode, id, onClose, onSaved, onEdit, onView }: Props) {
  const { t } = useTranslation("productos");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [subfamilias, setSubfamilias] = useState<SubfamiliaRel[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorRel[]>([]);

  // Lookups
  const [familiasLookup, setFamiliasLookup] = useState<Familia[]>([]);
  const [subfamiliasLookup, setSubfamiliasLookup] = useState<Subfamilia[]>([]);
  const [marcasLookup, setMarcasLookup] = useState<Marca[]>([]);
  const [proveedoresLookup, setProveedoresLookup] = useState<Proveedor[]>([]);

  // New proveedor form
  const [newProveedorId, setNewProveedorId] = useState("");
  const [newProveedorRef, setNewProveedorRef] = useState("");
  const [newProveedorPrecio, setNewProveedorPrecio] = useState("");

  const isReadOnly = mode === "view";

  useEffect(() => {
    loadLookups();
    if (mode !== "new" && id) {
      loadProducto(id);
    }
  }, [mode, id]);

  const loadLookups = async () => {
    try {
      const [famRes, marcRes, prov] = await Promise.all([
        fetchFamiliasProductos(),
        fetchMarcas(),
        fetchProveedoresFullPage(1000, 0, { soloActivos: true }),
      ]);

      // El nuevo endpoint devuelve familias con subfamilias embebidas
      const familias = famRes ?? [];
      setFamiliasLookup(familias);

      // Extraer subfamilias de las familias para mantener compatibilidad
      const allSubfamilias: Subfamilia[] = [];
      familias.forEach((f: any) => {
        (f.subfamilias ?? []).forEach((sf: any) => {
          allSubfamilias.push({
            IdSubFamiliaProducto: sf.IdSubFamiliaProducto,
            IdFamiliaProducto: f.IdFamiliaProducto,
            Descripcion: sf.Descripcion,
          });
        });
      });
      setSubfamiliasLookup(allSubfamilias);

      setMarcasLookup(marcRes ?? []);
      setProveedoresLookup(prov.data?.map((p: any) => ({ id: p.id, Nombre: p.Nombre })) ?? []);
    } catch (e) {
      console.error("Error loading lookups", e);
    }
  };

  const loadProducto = async (prodId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducto(prodId);
      setForm({
        Codigo: data.Codigo ?? "",
        Nombre: data.Nombre ?? "",
        Descripcion: data.Descripcion ?? "",
        PVP: data.PVP != null ? String(data.PVP) : "",
        Stock: data.Stock != null ? String(data.Stock) : "",
        StockMinimo: data.StockMinimo != null ? String(data.StockMinimo) : "",
        IdMarca: data.IdMarca != null ? String(data.IdMarca) : "",
        IdTipoIva: data.IdTipoIva != null ? String(data.IdTipoIva) : "1",
        Ubicacion: data.Ubicacion ?? "",
        Observaciones: data.Observaciones ?? "",
        Activo: data.Activo ?? 1,
      });
      setSubfamilias(
        data.subfamilias?.map((s: any) => ({
          id: s.id,
          id_subfamilia: s.IdSubFamilia || s.id_subfamilia,
          descripcion: s.Descripcion || s.descripcion,
        })) ?? []
      );
      setProveedores(
        data.proveedores?.map((p: any) => ({
          id: p.id,
          id_proveedor: p.IdProveedor || p.id_proveedor,
          nombre_proveedor: p.NombreProveedor || p.nombre_proveedor,
          referencia: p.ReferenciaProveedor || p.referencia,
          precio: p.PrecioProveedor ?? p.precio,
        })) ?? []
      );
    } catch (e: any) {
      setError(e?.message ?? "Error cargando producto");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked ? 1 : 0 }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddProveedor = () => {
    if (!newProveedorId) return;
    const provId = Number(newProveedorId);
    if (proveedores.some((p) => p.id_proveedor === provId)) return;
    const lookup = proveedoresLookup.find((p) => p.id === provId);
    setProveedores((prev) => [
      ...prev,
      {
        id_proveedor: provId,
        nombre_proveedor: lookup?.Nombre ?? "",
        referencia: newProveedorRef || undefined,
        precio: newProveedorPrecio ? parseFloat(newProveedorPrecio) : undefined,
      },
    ]);
    setNewProveedorId("");
    setNewProveedorRef("");
    setNewProveedorPrecio("");
  };

  const handleRemoveProveedor = (idx: number) => {
    setProveedores((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.Nombre.trim()) {
      setError(t("messages.nameRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      Codigo: form.Codigo || null,
      Nombre: form.Nombre.trim(),
      Descripcion: form.Descripcion || null,
      PVP: form.PVP ? parseFloat(form.PVP) : null,
      Stock: form.Stock ? parseInt(form.Stock, 10) : 0,
      StockMinimo: form.StockMinimo ? parseInt(form.StockMinimo, 10) : 0,
      IdMarca: form.IdMarca ? parseInt(form.IdMarca, 10) : null,
      IdTipoIva: form.IdTipoIva ? parseInt(form.IdTipoIva, 10) : 1,
      Ubicacion: form.Ubicacion || null,
      Observaciones: form.Observaciones || null,
      Activo: form.Activo,
      subfamilias: subfamilias.map((s) => ({
        id_subfamilia: s.id_subfamilia,
      })),
      proveedores: proveedores.map((p) => ({
        id_proveedor: p.id_proveedor,
        referencia: p.referencia || null,
        precio: p.precio ?? null,
      })),
    };

    try {
      if (mode === "new") {
        await createProducto(payload);
      } else {
        await updateProducto(id!, payload);
      }
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Error guardando producto");
    } finally {
      setSaving(false);
    }
  };

  // Handler para cambios en subfamilias desde el picker
  const handleSubfamiliasChange = (ids: number[]) => {
    setSubfamilias(
      ids.map((id) => {
        const lookup = subfamiliasLookup.find((s) => s.IdSubFamiliaProducto === id);
        return {
          id_subfamilia: id,
          descripcion: lookup?.Descripcion ?? "",
        };
      })
    );
  };

  const title =
    mode === "new" ? t("newProduct") : mode === "edit" ? t("editProduct") : t("detailProduct");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              {id && <p className="text-xs text-slate-500">ID: {id}</p>}
            </div>
            <div className="flex items-center gap-2">
              {mode === "view" && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  {t("common:buttons.edit", { ns: "common" })}
                </button>
              )}
              {mode === "edit" && onView && (
                <button
                  type="button"
                  onClick={onView}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  {t("common:buttons.cancel", { ns: "common" })}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                {t("common:buttons.close", { ns: "common" })}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-auto flex-1">
            {loading ? (
              <div className="text-center py-8 text-slate-500">{t("common:messages.loading", { ns: "common" })}</div>
            ) : (
              <div className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                    {error}
                    <button className="ml-2 underline" onClick={() => setError(null)}>
                      {t("common:buttons.close", { ns: "common" })}
                    </button>
                  </div>
                )}

                {/* Datos basicos */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.code")}</label>
                    <input
                      type="text"
                      name="Codigo"
                      value={form.Codigo}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      {t("fields.name")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="Nombre"
                      value={form.Nombre}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.description")}</label>
                  <textarea
                    name="Descripcion"
                    value={form.Descripcion}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </div>

                {/* PVP y Stock */}
                <div className={`grid gap-4 ${mode === "new" ? "grid-cols-3" : "grid-cols-2"}`}>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.pvp")}</label>
                    <input
                      type="number"
                      step="0.01"
                      name="PVP"
                      value={form.PVP}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </div>
                  {mode === "new" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {t("fields.initialStock")}
                        <span className="text-slate-400 font-normal ml-1">({t("common:fields.optional", { ns: "common" })})</span>
                      </label>
                      <input
                        type="number"
                        name="Stock"
                        value={form.Stock}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.minStock")}</label>
                    <input
                      type="number"
                      name="StockMinimo"
                      value={form.StockMinimo}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {/* Marca, IVA, Ubicacion */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.brand")}</label>
                    <select
                      name="IdMarca"
                      value={form.IdMarca}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    >
                      <option value="">{t("fields.noBrand")}</option>
                      {marcasLookup.map((m) => (
                        <option key={m.IdMarca} value={m.IdMarca}>
                          {m.Descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.vatType")}</label>
                    <select
                      name="IdTipoIva"
                      value={form.IdTipoIva}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    >
                      <option value="1">{t("vat.general")}</option>
                      <option value="2">{t("vat.reduced")}</option>
                      <option value="3">{t("vat.superReduced")}</option>
                      <option value="4">{t("vat.exempt")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.location")}</label>
                    <input
                      type="text"
                      name="Ubicacion"
                      value={form.Ubicacion}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {/* Activo */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="Activo"
                    checked={form.Activo === 1}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <label className="text-sm text-slate-700">{t("fields.activeProduct")}</label>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.observations")}</label>
                  <textarea
                    name="Observaciones"
                    value={form.Observaciones}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </div>

                {/* Subfamilias Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">{t("fields.familiesSubfamilies")}</label>
                  <SubfamiliasProductosPicker
                    disabled={isReadOnly}
                    familias={familiasLookup}
                    subfamilias={subfamiliasLookup}
                    selected={subfamilias.map((s) => s.id_subfamilia)}
                    onChangeSelected={handleSubfamiliasChange}
                    mode={isReadOnly ? "view" : "edit"}
                  />
                </div>

                {/* Proveedores */}
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="text-sm font-bold text-slate-700 mb-3">{t("suppliers.title")}</div>

                  {!isReadOnly && (
                    <div className="flex gap-2 mb-3">
                      <select
                        value={newProveedorId}
                        onChange={(e) => setNewProveedorId(e.target.value)}
                        className="w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">{t("suppliers.selectSupplier")}</option>
                        {proveedoresLookup.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.Nombre}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder={t("suppliers.reference")}
                        value={newProveedorRef}
                        onChange={(e) => setNewProveedorRef(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder={t("suppliers.price")}
                        value={newProveedorPrecio}
                        onChange={(e) => setNewProveedorPrecio(e.target.value)}
                        className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddProveedor}
                        className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {t("common:buttons.add", { ns: "common" })}
                      </button>
                    </div>
                  )}

                  <div className="space-y-1">
                    {proveedores.length === 0 ? (
                      <div className="text-sm text-slate-400 py-2">{t("suppliers.noSuppliers")}</div>
                    ) : (
                      proveedores.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50"
                        >
                          <div className="flex-1">
                            <span className="text-sm text-slate-700 font-medium">
                              {p.nombre_proveedor || `ID: ${p.id_proveedor}`}
                            </span>
                            {p.referencia && (
                              <span className="text-xs text-slate-500 ml-2">Ref: {p.referencia}</span>
                            )}
                            {p.precio != null && (
                              <span className="text-xs text-slate-500 ml-2">{p.precio.toFixed(2)} EUR</span>
                            )}
                          </div>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleRemoveProveedor(idx)}
                              className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              X
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!isReadOnly && (
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                {t("common:buttons.cancel", { ns: "common" })}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? t("common:buttons.saving", { ns: "common" }) : t("common:buttons.save", { ns: "common" })}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
