"use client";

import { useEffect, useMemo, useState } from "react";
import NavPrincipal from "@/components/NavPrincipal";
import { supabase } from "@/lib/supabase-client";

const FORM_INICIAL = {
  socio_id: "",
  fecha: new Date().toISOString().slice(0, 10),
  tipo: "Aporte ordinario",
  concepto: "",
  monto: "",
  estado: "Pendiente",
  referencia: "",
};

function monto(value) {
  return Number(value || 0);
}

export default function AportesSociosPage() {
  const [socios, setSocios] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [filtroSocio, setFiltroSocio] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    setMensaje("");

    const [sociosRes, movRes] = await Promise.all([
      supabase.from("personal_socios").select("id, nombre").order("nombre", { ascending: true }),
      supabase
        .from("aportes_deudas_socios")
        .select("*, personal_socios(nombre)")
        .order("fecha", { ascending: false }),
    ]);

    if (!sociosRes.error) setSocios(sociosRes.data || []);

    if (movRes.error) {
      setMensaje(
        `Falta configurar aportes_deudas_socios en Supabase: ${movRes.error.message}. Ejecuta docs/supabase-modelo-operativo-minero.sql`
      );
      setMovimientos([]);
    } else {
      setMovimientos(movRes.data || []);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const filtrados = useMemo(() => {
    if (!filtroSocio) return movimientos;
    return movimientos.filter((item) => String(item.socio_id) === filtroSocio);
  }, [movimientos, filtroSocio]);

  const resumen = useMemo(() => {
    return filtrados.reduce(
      (acc, item) => {
        const valor = monto(item.monto);
        if (item.estado === "Pagado") acc.pagado += valor;
        else acc.pendiente += valor;
        if (item.tipo?.toLowerCase().includes("deuda") || item.tipo?.toLowerCase().includes("adelanto")) {
          acc.deudas += valor;
        } else {
          acc.aportes += valor;
        }
        return acc;
      },
      { aportes: 0, deudas: 0, pagado: 0, pendiente: 0 }
    );
  }, [filtrados]);

  const guardarMovimiento = async (e) => {
    e.preventDefault();
    if (!form.socio_id || !form.concepto || !form.monto) {
      setMensaje("Selecciona socio, concepto y monto.");
      return;
    }

    setCargando(true);
    const payload = {
      ...form,
      socio_id: Number(form.socio_id),
      monto: monto(form.monto),
    };

    const { error } = await supabase.from("aportes_deudas_socios").insert([payload]);
    if (error) {
      setMensaje(`Error al guardar aporte/deuda: ${error.message}`);
    } else {
      setMensaje("Movimiento registrado correctamente.");
      setForm(FORM_INICIAL);
      await cargarDatos();
    }
    setCargando(false);
  };

  const cambiarEstado = async (id, estado) => {
    const { error } = await supabase.from("aportes_deudas_socios").update({ estado }).eq("id", id);
    if (error) setMensaje(`Error al actualizar estado: ${error.message}`);
    else cargarDatos();
  };

  return (
    <>
      <NavPrincipal />
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Aportes y Deudas de Socios</h1>
            <p className="mt-1 text-slate-600">
              Control de cuotas, multas, adelantos, aportes extraordinarios y saldos pendientes.
            </p>
          </div>

          {mensaje && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {mensaje}
            </div>
          )}

          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Aportes</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{resumen.aportes.toFixed(2)} Bs</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Deudas/adelantos</p>
              <p className="mt-1 text-2xl font-bold text-red-700">{resumen.deudas.toFixed(2)} Bs</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Pagado</p>
              <p className="mt-1 text-2xl font-bold text-sky-700">{resumen.pagado.toFixed(2)} Bs</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Pendiente</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{resumen.pendiente.toFixed(2)} Bs</p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <form onSubmit={guardarMovimiento} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Nuevo movimiento</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Socio</label>
                  <select
                    value={form.socio_id}
                    onChange={(e) => setForm({ ...form, socio_id: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">Seleccionar socio</option>
                    {socios.map((socio) => (
                      <option key={socio.id} value={socio.id}>
                        {socio.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Fecha</label>
                    <input
                      type="date"
                      value={form.fecha}
                      onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Estado</label>
                    <select
                      value={form.estado}
                      onChange={(e) => setForm({ ...form, estado: e.target.value })}
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                    >
                      <option>Pendiente</option>
                      <option>Pagado</option>
                      <option>Anulado</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option>Aporte ordinario</option>
                    <option>Aporte extraordinario</option>
                    <option>Cuota de socio</option>
                    <option>Multa</option>
                    <option>Deuda</option>
                    <option>Adelanto</option>
                    <option>Descuento de liquidacion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Concepto</label>
                  <input
                    value={form.concepto}
                    onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Monto</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.monto}
                      onChange={(e) => setForm({ ...form, monto: e.target.value })}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Referencia</label>
                    <input
                      value={form.referencia}
                      onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full rounded-md bg-blue-700 px-4 py-3 font-semibold text-white disabled:bg-slate-400"
                >
                  {cargando ? "Guardando..." : "Registrar movimiento"}
                </button>
              </div>
            </form>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Historial</h2>
                  <p className="text-sm text-slate-500">{filtrados.length} movimientos</p>
                </div>
                <select
                  value={filtroSocio}
                  onChange={(e) => setFiltroSocio(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Todos los socios</option>
                  {socios.map((socio) => (
                    <option key={socio.id} value={socio.id}>
                      {socio.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                      <th className="px-3 py-3">Fecha</th>
                      <th className="px-3 py-3">Socio</th>
                      <th className="px-3 py-3">Tipo</th>
                      <th className="px-3 py-3 text-right">Monto</th>
                      <th className="px-3 py-3">Estado</th>
                      <th className="px-3 py-3 text-right">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-3 py-3">{item.fecha}</td>
                        <td className="px-3 py-3">{item.personal_socios?.nombre}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold">{item.tipo}</p>
                          <p className="text-xs text-slate-500">{item.concepto}</p>
                        </td>
                        <td className="px-3 py-3 text-right font-bold">{monto(item.monto).toFixed(2)} Bs</td>
                        <td className="px-3 py-3">{item.estado}</td>
                        <td className="px-3 py-3 text-right">
                          {item.estado !== "Pagado" && (
                            <button
                              type="button"
                              onClick={() => cambiarEstado(item.id, "Pagado")}
                              className="font-semibold text-emerald-700"
                            >
                              Marcar pagado
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filtrados.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-3 py-8 text-center text-slate-500">
                          No hay movimientos registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </div>
      </main>
    </>
  );
}
