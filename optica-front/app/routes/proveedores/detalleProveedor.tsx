import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

export default function DetalleProveedorPage() {
  const { t } = useTranslation("proveedores");
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    tipo: "empresa",
    razonSocial: "",
    nombreComercial: "",
    nombre: "",
    apellido1: "",
    apellido2: "",
    email: "",
    telefono: "",
    telefonoMovil: "",
    nif: "",
    direccion: "",
    cp: "",
    poblacion: "",
    provincia: "",
    pais: "",
  });

  // Cambiamos handleClose para hacer "back"
  const handleClose = () => navigate(-1);

  useEffect(() => {
    if (id && id !== "nuevo") {
      setFormData({
        tipo: "empresa",
        razonSocial: "Suministros Tech S.L.",
        nombreComercial: "Tech-Pro",
        nombre: "Carlos",
        apellido1: "Ruiz",
        apellido2: "Sanz",
        email: "contacto@techpro.com",
        telefono: "912345678",
        telefonoMovil: "611222333",
        nif: "B12345678",
        direccion: "Polígono Industrial Norte, Nave 4",
        cp: "28001",
        poblacion: "Madrid",
        provincia: "Madrid",
        pais: "España",
      });
      setIsEditing(false);
    } else {
      setFormData({
        tipo: "empresa",
        razonSocial: "",
        nombreComercial: "",
        nombre: "",
        apellido1: "",
        apellido2: "",
        email: "",
        telefono: "",
        telefonoMovil: "",
        nif: "",
        direccion: "",
        cp: "",
        poblacion: "",
        provincia: "",
        pais: "",
      });
      setIsEditing(true);
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const inputClass =
    "w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all bg-white";
  const labelClass = "text-sm font-semibold text-slate-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-black">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">
            {id === "nuevo"
              ? t("detalle.newTitle")
              : isEditing
              ? t("detalle.editTitle")
              : t("detalle.viewTitle")}
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>

        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-4">
          {/* Selector de Tipo */}
          <div className="flex space-x-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="tipo"
                value="empresa"
                disabled={!isEditing}
                checked={formData.tipo === "empresa"}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">{t("detalle.typeCompany")}</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="tipo"
                value="persona"
                disabled={!isEditing}
                checked={formData.tipo === "persona"}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">{t("detalle.typePerson")}</span>
            </label>
          </div>

          {/* Campos específicos de Empresa */}
          {formData.tipo === "empresa" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
              <div className="space-y-1">
                <label className={labelClass}>{t("detalle.legalName")}</label>
                <input
                  type="text"
                  name="razonSocial"
                  disabled={!isEditing}
                  value={formData.razonSocial}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>{t("detalle.commercialName")}</label>
                <input
                  type="text"
                  name="nombreComercial"
                  disabled={!isEditing}
                  value={formData.nombreComercial}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Datos de contacto / Persona */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>
                {formData.tipo === "empresa" ? t("detalle.contact") : t("detalle.name")}
              </label>
              <input
                type="text"
                name="nombre"
                disabled={!isEditing}
                value={formData.nombre}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>{t("detalle.firstSurname")}</label>
              <input
                type="text"
                name="apellido1"
                disabled={!isEditing}
                value={formData.apellido1}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>{t("detalle.secondSurname")}</label>
              <input
                type="text"
                name="apellido2"
                disabled={!isEditing}
                value={formData.apellido2}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>{t("detalle.nif")}</label>
              <input
                type="text"
                name="nif"
                disabled={!isEditing}
                value={formData.nif}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className={labelClass}>{t("detalle.email")}</label>
              <input
                type="email"
                name="email"
                disabled={!isEditing}
                value={formData.email}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>{t("detalle.phone")}</label>
              <input
                type="text"
                name="telefono"
                disabled={!isEditing}
                value={formData.telefono}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>{t("detalle.mobile")}</label>
              <input
                type="text"
                name="telefonoMovil"
                disabled={!isEditing}
                value={formData.telefonoMovil}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>{t("detalle.address")}</label>
            <input
              type="text"
              name="direccion"
              disabled={!isEditing}
              value={formData.direccion}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>{t("detalle.postalCode")}</label>
              <input
                type="text"
                name="cp"
                disabled={!isEditing}
                value={formData.cp}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <label className={labelClass}>{t("detalle.city")}</label>
              <input
                type="text"
                name="poblacion"
                disabled={!isEditing}
                value={formData.poblacion}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>{t("detalle.province")}</label>
              <input
                type="text"
                name="provincia"
                disabled={!isEditing}
                value={formData.provincia}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>{t("detalle.country")}</label>
              <input
                type="text"
                name="pais"
                disabled={!isEditing}
                value={formData.pais}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <footer className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            {t("detalle.close")}
          </button>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t("detalle.editButton")}
            </button>
          ) : (
            <button className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">
              {t("detalle.saveChanges")}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
