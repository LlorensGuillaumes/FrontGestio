import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  getCitas,
  createCita,
  updateCita,
  deleteCita,
  buscarClientes,
  TIPOS_CITA,
  ESTADOS_CITA,
  COLORES_CITA,
  type Cita,
  type ClienteBusqueda,
} from "~/lib/agendaRest";

type ViewType = "month" | "week" | "day";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIAS_SEMANA_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const HORAS = Array.from({ length: 24 }, (_, i) => i);

export default function AgendaCalendario() {
  const { t } = useTranslation("agenda");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("month");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCita, setEditingCita] = useState<Cita | null>(null);

  // Form
  const [formData, setFormData] = useState({
    IdCliente: null as number | null,
    NombreContacto: "",
    TelefonoContacto: "",
    EmailContacto: "",
    FechaHoraInicio: "",
    FechaHoraFin: "",
    TodoElDia: false,
    MotivoVisita: "",
    TipoCita: "GENERAL",
    Observaciones: "",
    Estado: "PROGRAMADA",
    Color: "#3b82f6",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Búsqueda de clientes - nuevo diseño
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteResults, setClienteResults] = useState<ClienteBusqueda[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<ClienteBusqueda | null>(null);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [searchingClientes, setSearchingClientes] = useState(false);
  const [modoManual, setModoManual] = useState(false); // true = contacto no registrado
  const searchRef = useRef<HTMLDivElement>(null);

  // Calcular rango de fechas según la vista
  const getDateRange = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();

    if (view === "month") {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startOffset = (firstDay.getDay() + 6) % 7;
      const endOffset = 6 - ((lastDay.getDay() + 6) % 7);
      const start = new Date(firstDay);
      start.setDate(start.getDate() - startOffset);
      const end = new Date(lastDay);
      end.setDate(end.getDate() + endOffset);
      return { start, end };
    } else if (view === "week") {
      const dayOfWeek = (currentDate.getDay() + 6) % 7;
      const start = new Date(year, month, day - dayOfWeek);
      const end = new Date(year, month, day - dayOfWeek + 6);
      return { start, end };
    } else {
      return { start: new Date(year, month, day), end: new Date(year, month, day) };
    }
  }, [currentDate, view]);

  const loadCitas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getDateRange();
      const inicio = start.toISOString();
      const fin = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString();
      const data = await getCitas(inicio, fin);
      setCitas(data);
    } catch (e: any) {
      setError(e.message ?? "Error cargando citas");
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    loadCitas();
  }, [loadCitas]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowClienteDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Búsqueda de clientes con debounce
  useEffect(() => {
    if (modoManual) {
      setClienteResults([]);
      setShowClienteDropdown(false);
      return;
    }

    const searchClientes = async () => {
      if (clienteSearch.length >= 2) {
        setSearchingClientes(true);
        try {
          const results = await buscarClientes(clienteSearch);
          setClienteResults(results);
          setShowClienteDropdown(true);
        } catch (e) {
          console.error(e);
        } finally {
          setSearchingClientes(false);
        }
      } else {
        setClienteResults([]);
        setShowClienteDropdown(false);
      }
    };
    const timer = setTimeout(searchClientes, 300);
    return () => clearTimeout(timer);
  }, [clienteSearch, modoManual]);

  // Navegación
  const goToday = () => setCurrentDate(new Date());

  const goPrev = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const goNext = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const getDaysForView = () => {
    const { start, end } = getDateRange();
    const days: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const getCitasDelDia = (date: Date) => {
    return citas.filter((c) => {
      const citaDate = new Date(c.FechaHoraInicio);
      return (
        citaDate.getFullYear() === date.getFullYear() &&
        citaDate.getMonth() === date.getMonth() &&
        citaDate.getDate() === date.getDate()
      );
    });
  };

  const getCitasDeHora = (date: Date, hora: number) => {
    return citas.filter((c) => {
      const citaDate = new Date(c.FechaHoraInicio);
      return (
        citaDate.getFullYear() === date.getFullYear() &&
        citaDate.getMonth() === date.getMonth() &&
        citaDate.getDate() === date.getDate() &&
        citaDate.getHours() === hora
      );
    });
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      IdCliente: null,
      NombreContacto: "",
      TelefonoContacto: "",
      EmailContacto: "",
      FechaHoraInicio: "",
      FechaHoraFin: "",
      TodoElDia: false,
      MotivoVisita: "",
      TipoCita: "GENERAL",
      Observaciones: "",
      Estado: "PROGRAMADA",
      Color: "#3b82f6",
    });
    setSelectedCliente(null);
    setClienteSearch("");
    setClienteResults([]);
    setModoManual(false);
    setShowClienteDropdown(false);
  };

  // Abrir modal para nueva cita
  const openNewCita = (date: Date, hora?: number) => {
    const horaInicio = hora ?? 9;
    const fechaInicio = new Date(date);
    fechaInicio.setHours(horaInicio, 0, 0, 0);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setHours(horaInicio + 1);

    resetForm();
    setFormData((prev) => ({
      ...prev,
      FechaHoraInicio: fechaInicio.toISOString().slice(0, 16),
      FechaHoraFin: fechaFin.toISOString().slice(0, 16),
    }));
    setEditingCita(null);
    setFormError(null);
    setShowModal(true);
  };

  // Abrir modal para editar cita
  const openEditCita = (cita: Cita) => {
    setFormData({
      IdCliente: cita.IdCliente,
      NombreContacto: cita.NombreContacto ?? "",
      TelefonoContacto: cita.TelefonoContacto ?? "",
      EmailContacto: cita.EmailContacto ?? "",
      FechaHoraInicio: cita.FechaHoraInicio.slice(0, 16),
      FechaHoraFin: cita.FechaHoraFin.slice(0, 16),
      TodoElDia: cita.TodoElDia,
      MotivoVisita: cita.MotivoVisita ?? "",
      TipoCita: cita.TipoCita,
      Observaciones: cita.Observaciones ?? "",
      Estado: cita.Estado,
      Color: cita.Color,
    });

    if (cita.IdCliente) {
      setSelectedCliente({
        id: cita.IdCliente,
        nombre: cita.NombreCompleto ?? cita.NombreCliente ?? "",
        telefono: cita.clienteTelefono ?? null,
        email: cita.clienteEmail ?? null,
      });
      setClienteSearch(cita.NombreCompleto ?? cita.NombreCliente ?? "");
      setModoManual(false);
    } else {
      setSelectedCliente(null);
      setClienteSearch("");
      setModoManual(true);
    }

    setEditingCita(cita);
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCita(null);
    setFormError(null);
    resetForm();
  };

  // Seleccionar cliente del dropdown
  const selectCliente = (cliente: ClienteBusqueda) => {
    setSelectedCliente(cliente);
    setClienteSearch(cliente.nombre);
    setFormData({
      ...formData,
      IdCliente: cliente.id,
      NombreContacto: cliente.nombre,
      TelefonoContacto: cliente.telefono ?? "",
      EmailContacto: cliente.email ?? "",
    });
    setShowClienteDropdown(false);
    setModoManual(false);
  };

  // Cambiar a modo manual (contacto no registrado)
  const activarModoManual = () => {
    setModoManual(true);
    setSelectedCliente(null);
    setFormData({
      ...formData,
      IdCliente: null,
      NombreContacto: clienteSearch, // Mantener lo que escribió como nombre
    });
    setShowClienteDropdown(false);
  };

  // Volver a búsqueda
  const volverABusqueda = () => {
    setModoManual(false);
    setClienteSearch("");
    setFormData({
      ...formData,
      IdCliente: null,
      NombreContacto: "",
      TelefonoContacto: "",
      EmailContacto: "",
    });
  };

  // Guardar cita
  const handleSave = async () => {
    // Validación
    if (!modoManual && !selectedCliente) {
      setFormError(t("selectClientOrManual", "Seleccione un cliente o use 'Contacto no registrado'"));
      return;
    }
    if (modoManual && !formData.NombreContacto.trim()) {
      setFormError(t("nameRequired", "El nombre es obligatorio"));
      return;
    }
    if (!formData.FechaHoraInicio || !formData.FechaHoraFin) {
      setFormError(t("datesRequired", "Las fechas son obligatorias"));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        ...formData,
        IdCliente: modoManual ? null : formData.IdCliente,
        NombreContacto: modoManual ? formData.NombreContacto : selectedCliente?.nombre ?? "",
      };

      if (editingCita) {
        await updateCita(editingCita.IdCita, payload);
      } else {
        await createCita(payload);
      }
      closeModal();
      loadCitas();
    } catch (e: any) {
      setFormError(e.message ?? "Error guardando cita");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar cita
  const handleDelete = async () => {
    if (!editingCita) return;
    const confirmed = window.confirm(t("confirmDelete", "¿Cancelar esta cita?"));
    if (!confirmed) return;

    try {
      await deleteCita(editingCita.IdCita);
      closeModal();
      loadCitas();
    } catch (e: any) {
      setFormError(e.message ?? "Error cancelando cita");
    }
  };

  const formatHora = (date: string) => {
    return new Date(date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  };

  const renderTitle = () => {
    if (view === "month") {
      return `${MESES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (view === "week") {
      const { start, end } = getDateRange();
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} - ${end.getDate()} ${MESES[start.getMonth()]} ${start.getFullYear()}`;
      }
      return `${start.getDate()} ${MESES[start.getMonth()]} - ${end.getDate()} ${MESES[end.getMonth()]} ${start.getFullYear()}`;
    } else {
      return `${currentDate.getDate()} ${MESES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  };

  const days = getDaysForView();
  const today = new Date();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            {t("today", "Hoy")}
          </button>

          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-slate-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-slate-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <h2 className="text-xl font-semibold text-slate-900">{renderTitle()}</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            {(["month", "week", "day"] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium ${
                  view === v ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {v === "month" ? t("month", "Mes") : v === "week" ? t("week", "Semana") : t("day", "Día")}
              </button>
            ))}
          </div>

          <button
            onClick={() => openNewCita(new Date())}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            {t("newAppointment", "Nueva cita")}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-2 p-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {/* Calendario */}
      <div className="flex-1 overflow-auto">
        {view === "month" && (
          <div className="h-full flex flex-col">
            <div className="grid grid-cols-7 border-b border-slate-200">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="py-2 text-center text-sm font-medium text-slate-500">{d}</div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-6">
              {days.map((day, idx) => {
                const isToday = day.toDateString() === today.toDateString();
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const citasDelDia = getCitasDelDia(day);

                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] border-b border-r border-slate-200 p-1 cursor-pointer hover:bg-slate-50 ${
                      !isCurrentMonth ? "bg-slate-50" : ""
                    }`}
                    onClick={() => openNewCita(day)}
                  >
                    <div
                      className={`w-7 h-7 flex items-center justify-center text-sm rounded-full ${
                        isToday ? "bg-blue-600 text-white" : isCurrentMonth ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    <div className="mt-1 space-y-1">
                      {citasDelDia.slice(0, 3).map((cita) => (
                        <div
                          key={cita.IdCita}
                          onClick={(e) => { e.stopPropagation(); openEditCita(cita); }}
                          className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: cita.Color + "20", color: cita.Color, borderLeft: `3px solid ${cita.Color}` }}
                        >
                          <span className="font-medium">{formatHora(cita.FechaHoraInicio)}</span>{" "}
                          {cita.NombreCompleto ?? cita.NombreContacto}
                        </div>
                      ))}
                      {citasDelDia.length > 3 && (
                        <div className="text-xs text-slate-500 px-1.5">+{citasDelDia.length - 3} más</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "week" && (
          <div className="h-full flex flex-col">
            <div className="grid grid-cols-8 border-b border-slate-200">
              <div className="w-16" />
              {days.map((day, idx) => {
                const isToday = day.toDateString() === today.toDateString();
                return (
                  <div key={idx} className="py-2 text-center border-l border-slate-200">
                    <div className="text-sm font-medium text-slate-500">{DIAS_SEMANA[idx]}</div>
                    <div className={`w-8 h-8 mx-auto flex items-center justify-center text-lg rounded-full ${isToday ? "bg-blue-600 text-white" : "text-slate-900"}`}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex-1 overflow-auto">
              {HORAS.map((hora) => (
                <div key={hora} className="grid grid-cols-8 border-b border-slate-100" style={{ minHeight: "60px" }}>
                  <div className="w-16 pr-2 text-right text-xs text-slate-400 py-1">{hora.toString().padStart(2, "0")}:00</div>
                  {days.map((day, idx) => {
                    const citasHora = getCitasDeHora(day, hora);
                    return (
                      <div key={idx} className="border-l border-slate-200 p-0.5 cursor-pointer hover:bg-slate-50" onClick={() => openNewCita(day, hora)}>
                        {citasHora.map((cita) => (
                          <div
                            key={cita.IdCita}
                            onClick={(e) => { e.stopPropagation(); openEditCita(cita); }}
                            className="text-xs p-1 rounded cursor-pointer hover:opacity-80 mb-0.5"
                            style={{ backgroundColor: cita.Color, color: "white" }}
                          >
                            <div className="font-medium truncate">{cita.NombreCompleto ?? cita.NombreContacto}</div>
                            <div className="opacity-80">{formatHora(cita.FechaHoraInicio)} - {formatHora(cita.FechaHoraFin)}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "day" && (
          <div className="h-full flex flex-col">
            <div className="py-3 text-center border-b border-slate-200">
              <div className="text-sm font-medium text-slate-500">{DIAS_SEMANA_FULL[(currentDate.getDay() + 6) % 7]}</div>
              <div className={`w-10 h-10 mx-auto flex items-center justify-center text-xl rounded-full ${currentDate.toDateString() === today.toDateString() ? "bg-blue-600 text-white" : "text-slate-900"}`}>
                {currentDate.getDate()}
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {HORAS.map((hora) => {
                const citasHora = getCitasDeHora(currentDate, hora);
                return (
                  <div key={hora} className="flex border-b border-slate-100" style={{ minHeight: "60px" }}>
                    <div className="w-20 pr-3 text-right text-sm text-slate-400 py-2">{hora.toString().padStart(2, "0")}:00</div>
                    <div className="flex-1 border-l border-slate-200 p-1 cursor-pointer hover:bg-slate-50" onClick={() => openNewCita(currentDate, hora)}>
                      {citasHora.map((cita) => (
                        <div
                          key={cita.IdCita}
                          onClick={(e) => { e.stopPropagation(); openEditCita(cita); }}
                          className="p-2 rounded cursor-pointer hover:opacity-90 mb-1"
                          style={{ backgroundColor: cita.Color, color: "white" }}
                        >
                          <div className="font-medium">{cita.NombreCompleto ?? cita.NombreContacto}</div>
                          <div className="text-sm opacity-90">{formatHora(cita.FechaHoraInicio)} - {formatHora(cita.FechaHoraFin)}</div>
                          {cita.MotivoVisita && <div className="text-sm opacity-80 mt-1">{cita.MotivoVisita}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Cita */}
      {showModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingCita ? t("editAppointment", "Editar cita") : t("newAppointment", "Nueva cita")}
                </h2>
                <button onClick={closeModal} className="p-1 hover:bg-slate-100 rounded">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{formError}</div>
                )}

                {/* SECCIÓN CLIENTE - Diseño mejorado */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <label className="text-sm font-semibold text-slate-700 block mb-3">
                    {t("client", "Cliente")}
                  </label>

                  {!modoManual ? (
                    <>
                      {/* Buscador de clientes */}
                      <div ref={searchRef} className="relative">
                        <div className="relative">
                          <input
                            type="text"
                            value={clienteSearch}
                            onChange={(e) => {
                              setClienteSearch(e.target.value);
                              if (selectedCliente) {
                                setSelectedCliente(null);
                                setFormData({ ...formData, IdCliente: null });
                              }
                            }}
                            placeholder={t("searchClientPlaceholder", "Buscar por nombre, teléfono o email...")}
                            className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          {searchingClientes && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>

                        {/* Dropdown de resultados */}
                        {showClienteDropdown && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {clienteResults.length > 0 ? (
                              <>
                                {clienteResults.map((c) => (
                                  <div
                                    key={c.id}
                                    onClick={() => selectCliente(c)}
                                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                                  >
                                    <div className="font-medium text-slate-900">{c.nombre}</div>
                                    <div className="text-sm text-slate-500 flex gap-3 mt-0.5">
                                      {c.telefono && <span>{c.telefono}</span>}
                                      {c.email && <span>{c.email}</span>}
                                    </div>
                                  </div>
                                ))}
                                <div
                                  onClick={activarModoManual}
                                  className="px-4 py-3 hover:bg-amber-50 cursor-pointer text-amber-700 font-medium flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                  </svg>
                                  {t("notFoundAddManual", "No lo encuentro, añadir manualmente")}
                                </div>
                              </>
                            ) : clienteSearch.length >= 2 ? (
                              <div className="p-4">
                                <div className="text-slate-500 text-sm mb-3">{t("noResults", "No se encontraron resultados")}</div>
                                <button
                                  onClick={activarModoManual}
                                  className="w-full py-2 px-3 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                  </svg>
                                  {t("addAsContact", "Añadir como contacto no registrado")}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Cliente seleccionado */}
                      {selectedCliente && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                          <div>
                            <div className="font-medium text-green-900">{selectedCliente.nombre}</div>
                            <div className="text-sm text-green-700">
                              {selectedCliente.telefono && <span>{selectedCliente.telefono}</span>}
                              {selectedCliente.telefono && selectedCliente.email && <span> · </span>}
                              {selectedCliente.email && <span>{selectedCliente.email}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedCliente(null);
                              setClienteSearch("");
                              setFormData({ ...formData, IdCliente: null });
                            }}
                            className="p-1 hover:bg-green-100 rounded"
                          >
                            <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Opción de añadir manualmente */}
                      {!selectedCliente && clienteSearch.length < 2 && (
                        <button
                          onClick={activarModoManual}
                          className="mt-3 w-full py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {t("orAddManually", "o añadir contacto no registrado")}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Modo manual - Formulario de contacto */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-amber-700 font-medium flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {t("unregisteredContact", "Contacto no registrado")}
                          </span>
                          <button
                            onClick={volverABusqueda}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {t("backToSearch", "Volver a buscar")}
                          </button>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-slate-700">{t("name", "Nombre")} *</label>
                          <input
                            type="text"
                            value={formData.NombreContacto}
                            onChange={(e) => setFormData({ ...formData, NombreContacto: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder={t("contactName", "Nombre del contacto")}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-slate-700">{t("phone", "Teléfono")}</label>
                            <input
                              type="tel"
                              value={formData.TelefonoContacto}
                              onChange={(e) => setFormData({ ...formData, TelefonoContacto: e.target.value })}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700">Email</label>
                            <input
                              type="email"
                              value={formData.EmailContacto}
                              onChange={(e) => setFormData({ ...formData, EmailContacto: e.target.value })}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("start", "Inicio")}</label>
                    <input
                      type="datetime-local"
                      value={formData.FechaHoraInicio}
                      onChange={(e) => setFormData({ ...formData, FechaHoraInicio: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("end", "Fin")}</label>
                    <input
                      type="datetime-local"
                      value={formData.FechaHoraFin}
                      onChange={(e) => setFormData({ ...formData, FechaHoraFin: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Tipo y Motivo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("type", "Tipo")}</label>
                    <select
                      value={formData.TipoCita}
                      onChange={(e) => {
                        const tipo = TIPOS_CITA.find((t) => t.value === e.target.value);
                        setFormData({ ...formData, TipoCita: e.target.value, Color: tipo?.color ?? formData.Color });
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      {TIPOS_CITA.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("reason", "Motivo")}</label>
                    <input
                      type="text"
                      value={formData.MotivoVisita}
                      onChange={(e) => setFormData({ ...formData, MotivoVisita: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder={t("visitReason", "Motivo de la visita")}
                    />
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="text-sm font-medium text-slate-700">{t("color", "Color")}</label>
                  <div className="mt-2 flex gap-2">
                    {COLORES_CITA.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, Color: color })}
                        className={`w-7 h-7 rounded-full ${formData.Color === color ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Estado (solo en edición) */}
                {editingCita && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("status", "Estado")}</label>
                    <select
                      value={formData.Estado}
                      onChange={(e) => setFormData({ ...formData, Estado: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      {ESTADOS_CITA.map((e) => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Observaciones */}
                <div>
                  <label className="text-sm font-medium text-slate-700">{t("notes", "Observaciones")}</label>
                  <textarea
                    value={formData.Observaciones}
                    onChange={(e) => setFormData({ ...formData, Observaciones: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex justify-between">
                <div>
                  {editingCita && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                    >
                      {t("cancelAppointment", "Cancelar cita")}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                    disabled={saving}
                  >
                    {t("close", "Cerrar")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
                    disabled={saving}
                  >
                    {saving ? t("saving", "Guardando...") : t("save", "Guardar")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
