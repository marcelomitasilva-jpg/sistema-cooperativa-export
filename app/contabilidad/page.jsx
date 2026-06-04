"use client";

import { useEffect, useMemo, useState } from "react";
import NavPrincipal from "@/components/NavPrincipal";
import { supabase } from "@/lib/supabase-client";

const TIPOS_CUENTA = ["Activo", "Pasivo", "Patrimonio", "Ingreso", "Egreso"];
const ESTADOS = ["Activa", "Inactiva"];

const FORM_INICIAL = {
  codigo_cuenta: "",
  nombre_cuenta: "",
  nivel: 3,
  tipo_cuenta: "Activo",
  estado: "Activa",
};

function colorTipo(tipo) {
  const colores = {
    Activo: "bg-emerald-100 text-emerald-800",
    Pasivo: "bg-red-100 text-red-800",
    Ingreso: "bg-sky-100 text-sky-800",
    Egreso: "bg-orange-100 text-orange-800",
    Patrimonio: "bg-violet-100 text-violet-800",
  };
  return colores[tipo] || "bg-slate-100 text-slate-800";
}

export default function ContabilidadPage() {
  const [cuentas, setCuentas] = useState([]);
  const [formData, setFormData] = useState(FORM_INICIAL);
  const [editingId, setEditingId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const obtenerCuentas = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from("plan_cuentas")
      .select("*")
      .order("codigo_cuenta", { ascending: true });

    if (error) {
      setMensaje(`Error al cargar plan de cuentas: ${error.message}`);
      setCuentas([]);
    } else {
      setCuentas(data || []);
    }
    setCargando(false);
  };

  useEffect(() => {
    obtenerCuentas();
  }, []);

  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((cuenta) => {
      const texto = `${cuenta.codigo_cuenta} ${cuenta.nombre_cuenta}`.toLowerCase();
      const coincideBusqueda = texto.includes(busqueda.trim().toLowerCase());
      const coincideTipo = filtroTipo === "todos" || cuenta.tipo_cuenta === filtroTipo;
      return coincideBusqueda && coincideTipo;
    });
  }, [cuentas, busqueda, filtroTipo]);

  const resumen = useMemo(() => {
    return cuentas.reduce((acc, cuenta) => {
      acc[cuenta.tipo_cuenta] = (acc[cuenta.tipo_cuenta] || 0) + 1;
      return acc;
    }, {});
  }, [cuentas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");

    if (!formData.codigo_cuenta.trim() || !formData.nombre_cuenta.trim()) {
      setMensaje("Complete codigo y nombre de la cuenta.");
      return;
    }

    setCargando(true);

    const payload = {
      codigo_cuenta: formData.codigo_cuenta.trim(),
      nombre_cuenta: formData.nombre_cuenta.trim(),
      nivel: Number(formData.nivel || 3),
      tipo_cuenta: formData.tipo_cuenta,
      estado: formData.estado,
    };

    const consulta = editingId
      ? supabase.from("plan_cuentas").update(payload).eq("id_cuenta", editingId)
      : supabase.from("plan_cuentas").insert([payload]);

    const { error } = await consulta;

    if (error) {
      setMensaje(`Error: ${error.message}`);
    } else {
      setMensaje(editingId ? "Cuenta actualizada correctamente." : "Cuenta creada correctamente.");
      setFormData(FORM_INICIAL);
      setEditingId(null);
      await obtenerCuentas();
    }

    setCargando(false);
  };

  const editarCuenta = (cuenta) => {
    setFormData({
      codigo_cuenta: cuenta.codigo_cuenta || "",
      nombre_cuenta: cuenta.nombre_cuenta || "",
      nivel: cuenta.nivel || 3,
      tipo_cuenta: cuenta.tipo_cuenta || "Activo",
      estado: cuenta.estado || "Activa",
    });
    setEditingId(cuenta.id_cuenta);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarCuenta = async (cuenta) => {
    if (!confirm(`Eliminar la cuenta ${cuenta.codigo_cuenta} - ${cuenta.nombre_cuenta}?`)) return;

    const { error } = await supabase
      .from("plan_cuentas")
      .delete()
      .eq("id_cuenta", cuenta.id_cuenta);

    if (error) {
      setMensaje(`Error al eliminar: ${error.message}`);
    } else {
      setMensaje("Cuenta eliminada.");
      obtenerCuentas();
    }
  };

  return (
    <>
      <NavPrincipal />
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Plan de Cuentas</h1>
            <p className="mt-1 text-slate-600">
              Estructura contable para una cooperativa minera aurifera.
            </p>
          </div>

          <section className="grid gap-4 md:grid-cols-4">
            {TIPOS_CUENTA.map((tipo) => (
              <div key={tipo} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-500">{tipo}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{resumen[tipo] || 0}</p>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              {editingId ? "Editar cuenta" : "Nueva cuenta"}
            </h2>

            {mensaje && (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                {mensaje}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Codigo</label>
                <input
                  value={formData.codigo_cuenta}
                  onChange={(e) => setFormData({ ...formData, codigo_cuenta: e.target.value })}
                  placeholder="1.1.01"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700">Nombre</label>
                <input
                  value={formData.nombre_cuenta}
                  onChange={(e) => setFormData({ ...formData, nombre_cuenta: e.target.value })}
                  placeholder="Nombre de la cuenta"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Tipo</label>
                <select
                  value={formData.tipo_cuenta}
                  onChange={(e) => setFormData({ ...formData, tipo_cuenta: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  {TIPOS_CUENTA.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Nivel</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.nivel}
                  onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2 md:col-span-4">
                <button
                  type="submit"
                  disabled={cargando}
                  className="rounded-md bg-blue-700 px-4 py-2 font-semibold text-white disabled:bg-slate-400"
                >
                  {cargando ? "Guardando..." : editingId ? "Actualizar cuenta" : "Crear cuenta"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData(FORM_INICIAL);
                    }}
                    className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Cuentas registradas ({cuentasFiltradas.length})
                </h2>
                <p className="text-sm text-slate-500">Total en base de datos: {cuentas.length}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar cuenta..."
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="todos">Todos los tipos</option>
                  {TIPOS_CUENTA.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-3 py-3">Codigo</th>
                    <th className="px-3 py-3">Nombre</th>
                    <th className="px-3 py-3">Nivel</th>
                    <th className="px-3 py-3">Tipo</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentasFiltradas.map((cuenta) => (
                    <tr key={cuenta.id_cuenta} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-bold text-slate-900">{cuenta.codigo_cuenta}</td>
                      <td
                        className="px-3 py-3 text-slate-800"
                        style={{ paddingLeft: `${Math.max(Number(cuenta.nivel || 1) - 1, 0) * 18 + 12}px` }}
                      >
                        {cuenta.nombre_cuenta}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{cuenta.nivel}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${colorTipo(cuenta.tipo_cuenta)}`}>
                          {cuenta.tipo_cuenta}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{cuenta.estado}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => editarCuenta(cuenta)}
                          className="font-semibold text-blue-700 hover:text-blue-900"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarCuenta(cuenta)}
                          className="ml-3 font-semibold text-red-700 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cuentasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-3 py-8 text-center text-slate-500">
                        No hay cuentas para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
