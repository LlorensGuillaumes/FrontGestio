import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";

export default function DetalleClientePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
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

  const handleClose = () => navigate("/clientes");

  useEffect(() => {
    if (id && id !== "nuevo") {
      // Simulación: En producción usarías un fetch aquí
      setFormData({
        nombre: "Juan",
        apellido1: "Pérez",
        apellido2: "García",
        email: "juan.perez@email.com",
        telefono: "938000000",
        telefonoMovil: "600000000",
        nif: "12345678Z",
        direccion: "Calle Falsa 123",
        cp: "08870",
        poblacion: "Vilafranca",
        provincia: "Barcelona",
        pais: "España"
      });
      setIsEditing(false);
    } else {
      setFormData({ 
        nombre: "", apellido1: "", apellido2: "", email: "", 
        telefono: "", telefonoMovil: "", nif: "", direccion: "", 
        cp: "", poblacion: "", provincia: "", pais: "" 
      });
      setIsEditing(true);
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all bg-white";
  const labelClass = "text-sm font-semibold text-slate-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-black">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">
            {id === "nuevo" ? "Nuevo Cliente" : (isEditing ? "Modificar Cliente" : "Detalle del Cliente")}
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Nombre</label>
              <input type="text" name="nombre" disabled={!isEditing} value={formData.nombre} onChange={handleChange} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>1er Apellido</label>
              <input type="text" name="apellido1" disabled={!isEditing} value={formData.apellido1} onChange={handleChange} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>2do Apellido</label>
              <input type="text" name="apellido2" disabled={!isEditing} value={formData.apellido2} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>NIF / CIF</label>
              <input type="text" name="nif" disabled={!isEditing} value={formData.nif} onChange={handleChange} className={inputClass} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className={labelClass}>Email</label>
              <input type="email" name="email" disabled={!isEditing} value={formData.email} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Teléfono Fijo</label>
              <input type="text" name="telefono" disabled={!isEditing} value={formData.telefono} onChange={handleChange} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Teléfono Móvil</label>
              <input type="text" name="telefonoMovil" disabled={!isEditing} value={formData.telefonoMovil} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Dirección</label>
            <input type="text" name="direccion" disabled={!isEditing} value={formData.direccion} onChange={handleChange} className={inputClass} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>C.P.</label>
              <input type="text" name="cp" disabled={!isEditing} value={formData.cp} onChange={handleChange} className={inputClass} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className={labelClass}>Población</label>
              <input type="text" name="poblacion" disabled={!isEditing} value={formData.poblacion} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Provincia</label>
              <input type="text" name="provincia" disabled={!isEditing} value={formData.provincia} onChange={handleChange} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>País</label>
              <input type="text" name="pais" disabled={!isEditing} value={formData.pais} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        <footer className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
          <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Cerrar</button>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Modificar Datos</button>
          ) : (
            <button className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">Guardar Cambios</button>
          )}
        </footer>
      </div>
    </div>
  );
}
