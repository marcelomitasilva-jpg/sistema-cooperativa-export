"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";
import NavPrincipal from "@/components/NavPrincipal";

const ESTADO_INICIAL = {
  nombre: "",
  cedula: "",
  telefono: "",
  email: "",
  cargo: "",
  estado: "activo",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

const labelClass = "block text-xs font-semibold uppercase tracking-wide text-slate-500";

export default function UsuariosAdminPage() {
  const [socios, setSocios] = useState([]);
  const [formData, setFormData] = useState(ESTADO_INICIAL);
  const [socioEnEdicion, setSocioEnEdicion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 5000);
  };

  const cargarSocios = useCallback(async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from("personal_socios")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;
      setSocios(data || []);
    } catch (error) {
      mostrarMensaje("error", `No se pudo cargar la lista: ${error.message}`);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarSocios();
  }, [cargarSocios]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);

    const payload = {
      nombre: formData.nombre.trim(),
      cedula: formData.cedula.trim() || null,
      telefono: formData.telefono.trim() || null,
      email: formData.email.trim() || null,
      cargo: formData.cargo.trim() || null,
      estado: formData.estado,
    };

    try {
      const query = socioEnEdicion
        ? supabase.from("personal_socios").update(payload).eq("id", socioEnEdicion.id)
        : supabase.from("personal_socios").insert([payload]);

      const { error } = await query;
      if (error) throw error;

      setFormData(ESTADO_INICIAL);
      setSocioEnEdicion(null);
      mostrarMensaje(
        "exito",
        socioEnEdicion
          ? "Socio actualizado correctamente."
          : "Socio registrado correctamente."
      );
      await cargarSocios();
    } catch (error) {
      mostrarMensaje("error", `Error al guardar: ${error.message}`);
    } finally {
      setEnviando(false);
    }
  };

  const editarSocio = (socio) => {
    setSocioEnEdicion(socio);
    setFormData({
      nombre: socio.nombre || "",
      cedula: socio.cedula || "",
      telefono: socio.telefono || "",
      email: socio.email || "",
      cargo: socio.cargo || "",
      estado: socio.estado || "activo",
    });
  };

  const cancelarEdicion = () => {
    setSocioEnEdicion(null);
    setFormData(ESTADO_INICIAL);
  };

  const eliminarSocio = async (socio) => {
    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar al socio "${socio.nombre}"? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    setProcesandoId(socio.id);
    try {
      const { error } = await supabase
        .from("personal_socios")
        .delete()
        .eq("id", socio.id);
      if (error) throw error;

      if (socioEnEdicion?.id === socio.id) {
        cancelarEdicion();
      }
      mostrarMensaje("exito", "Socio eliminado correctamente.");
      await cargarSocios();
    } catch (error) {
      mostrarMensaje("error", `No se pudo eliminar: ${error.message}`);
    } finally {
      setProcesandoId(null);
    }
  };

  const totalActivos = socios.filter(
    (s) => (s.estado || "activo").toLowerCase() === "activo"
  ).length;

  const badgeEstado = (estado) => {
    const valor = (estado || "activo").toLowerCase();
    const activo = valor === "activo";
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          activo
            ? "bg-emerald-100 text-emerald-800"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {valor}
      </span>
    );
  };

  return (
    <>
      <NavPrincipal />
      <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Encabezado */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Gestión de Socios
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Registro y consulta del personal de la cooperativa
            </p>
          </div>
          <button
            type="button"
            onClick={cargarSocios}
            disabled={cargando}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            Actualizar lista
          </button>
        </div>

        {/* Alertas */}
        {mensaje.texto && (
          <div
            role="alert"
            className={`mb-6 rounded-lg border px-4 py-3 text-sm font-medium ${
              mensaje.tipo === "exito"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* KPIs */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total de socios
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{socios.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Socios activos
            </p>
            <p className="mt-1 text-3xl font-bold text-emerald-800">{totalActivos}</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Formulario */}
          <section className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Nuevo socio</h2>
              <p className="mt-1 text-sm text-slate-500">
                {socioEnEdicion
                  ? "Edite los datos del socio seleccionado."
                  : "Complete los datos para dar de alta un miembro."}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="nombre" className={labelClass}>
                    Nombre completo *
                  </label>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                <div>
                  <label htmlFor="cedula" className={labelClass}>
                    Cédula de identidad
                  </label>
                  <input
                    id="cedula"
                    name="cedula"
                    type="text"
                    value={formData.cedula}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Ej. 12345678"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="telefono" className={labelClass}>
                      Teléfono
                    </label>
                    <input
                      id="telefono"
                      name="telefono"
                      type="tel"
                      value={formData.telefono}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="70000000"
                    />
                  </div>
                  <div>
                    <label htmlFor="cargo" className={labelClass}>
                      Cargo / rol
                    </label>
                    <input
                      id="cargo"
                      name="cargo"
                      type="text"
                      value={formData.cargo}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Ej. Comisionado"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className={labelClass}>
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="socio@cooperativa.bo"
                  />
                </div>

                <div>
                  <label htmlFor="estado" className={labelClass}>
                    Estado
                  </label>
                  <select
                    id="estado"
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={enviando}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enviando
                      ? "Guardando…"
                      : socioEnEdicion
                      ? "Actualizar socio"
                      : "Registrar socio"}
                  </button>
                  {socioEnEdicion && (
                    <button
                      type="button"
                      onClick={cancelarEdicion}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </section>

          {/* Tabla */}
          <section className="lg:col-span-3">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Socios registrados
                </h2>
                <p className="text-sm text-slate-500">
                  {cargando
                    ? "Cargando datos…"
                    : `${socios.length} registro(s) en el sistema`}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Nombre
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">
                        Cédula
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">
                        Contacto
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell">
                        Cargo
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {cargando ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-12 text-center text-slate-400"
                        >
                          Cargando socios…
                        </td>
                      </tr>
                    ) : socios.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-12 text-center text-slate-400"
                        >
                          No hay socios registrados. Use el formulario para
                          agregar el primero.
                        </td>
                      </tr>
                    ) : (
                      socios.map((socio) => (
                        <tr
                          key={socio.id}
                          className={`transition hover:bg-slate-50/80 ${
                            procesandoId === socio.id ? "opacity-60" : ""
                          }`}
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-500">
                            #{socio.id}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900">
                              {socio.nombre}
                            </span>
                            {socio.email && (
                              <span className="mt-0.5 block text-xs text-slate-500 sm:hidden">
                                {socio.email}
                              </span>
                            )}
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 sm:table-cell">
                            {socio.cedula || "—"}
                          </td>
                          <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                            <div>{socio.telefono || "—"}</div>
                            {socio.email && (
                              <div className="text-xs text-slate-400">
                                {socio.email}
                              </div>
                            )}
                          </td>
                          <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                            {socio.cargo || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {badgeEstado(socio.estado)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => editarSocio(socio)}
                                disabled={procesandoId === socio.id}
                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => eliminarSocio(socio)}
                                disabled={procesandoId === socio.id}
                                className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
      </div>
    </>
  );
}
