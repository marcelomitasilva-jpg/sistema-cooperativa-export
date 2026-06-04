"use client";

import { useEffect, useMemo, useState } from "react";
import NavPrincipal from "@/components/NavPrincipal";
import { supabase } from "@/lib/supabase-client";

const FORM_INICIAL = {
  fecha: new Date().toISOString().slice(0, 10),
  punta_id: "",
  lugar_trabajo_id: "",
  turno_id: "",
  peso_bruto: "",
  ley_oro: "",
  metodo: "Operacion regular",
  comprador: "",
  precio_unitario: "",
  regalia: "",
  aporte_cooperativa: "",
  deducciones: "",
  observaciones: "",
};

function numero(value) {
  return Number(value || 0);
}

function calcularValores(form) {
  const peso = numero(form.peso_bruto);
  const ley = numero(form.ley_oro);
  const precio = numero(form.precio_unitario);
  const oroFino = ley > 0 ? peso * (ley / 100) : peso;
  const valorBruto = oroFino * precio;
  const valorNeto =
    valorBruto - numero(form.regalia) - numero(form.aporte_cooperativa) - numero(form.deducciones);
  return { oroFino, valorBruto, valorNeto };
}

export default function ProduccionPage() {
  const [produccion, setProduccion] = useState([]);
  const [puntas, setPuntas] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const valores = useMemo(() => calcularValores(form), [form]);

  const cargarDatos = async () => {
    setCargando(true);
    setMensaje("");

    const [prodRes, puntasRes, lugaresRes, turnosRes] = await Promise.all([
      supabase
        .from("produccion_aurifera")
        .select("*, puntas(nombre), lugares_trabajo(nombre), turnos_trabajo(nombre)")
        .order("fecha", { ascending: false }),
      supabase.from("puntas").select("id, nombre").order("nombre", { ascending: true }),
      supabase.from("lugares_trabajo").select("id, nombre, tipo_trabajo").order("id", { ascending: true }),
      supabase.from("turnos_trabajo").select("id, nombre, orden").order("orden", { ascending: true }),
    ]);

    if (prodRes.error) {
      setMensaje(
        `Falta configurar produccion_aurifera en Supabase: ${prodRes.error.message}. Ejecuta docs/supabase-modelo-operativo-minero.sql`
      );
      setProduccion([]);
    } else {
      setProduccion(prodRes.data || []);
    }

    if (!puntasRes.error) setPuntas(puntasRes.data || []);
    if (!lugaresRes.error) setLugares(lugaresRes.data || []);
    if (!turnosRes.error) setTurnos(turnosRes.data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const totales = useMemo(() => {
    return produccion.reduce(
      (acc, item) => ({
        peso: acc.peso + numero(item.peso_bruto),
        oroFino: acc.oroFino + numero(item.oro_fino),
        valorNeto: acc.valorNeto + numero(item.valor_neto),
      }),
      { peso: 0, oroFino: 0, valorNeto: 0 }
    );
  }, [produccion]);

  const guardarProduccion = async (e) => {
    e.preventDefault();
    if (!form.punta_id || !form.lugar_trabajo_id || !form.turno_id) {
      setMensaje("Selecciona punta, lugar de trabajo y turno.");
      return;
    }
    if (!form.peso_bruto) {
      setMensaje("Registra el peso bruto.");
      return;
    }

    setCargando(true);
    const payload = {
      fecha: form.fecha,
      punta_id: Number(form.punta_id),
      lugar_trabajo_id: Number(form.lugar_trabajo_id),
      turno_id: Number(form.turno_id),
      peso_bruto: numero(form.peso_bruto),
      ley_oro: form.ley_oro ? numero(form.ley_oro) : null,
      oro_fino: valores.oroFino,
      metodo: form.metodo,
      comprador: form.comprador || null,
      precio_unitario: numero(form.precio_unitario),
      valor_bruto: valores.valorBruto,
      regalia: numero(form.regalia),
      aporte_cooperativa: numero(form.aporte_cooperativa),
      deducciones: numero(form.deducciones),
      valor_neto: valores.valorNeto,
      observaciones: form.observaciones || null,
    };

    const { error } = await supabase.from("produccion_aurifera").insert([payload]);
    if (error) setMensaje(`Error al registrar produccion: ${error.message}`);
    else {
      setMensaje("Produccion registrada correctamente.");
      setForm(FORM_INICIAL);
      await cargarDatos();
    }
    setCargando(false);
  };

  return (
    <>
      <NavPrincipal />
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Produccion Aurifera</h1>
            <p className="mt-1 text-slate-600">
              Registro por punta, lugar de trabajo y turno de 8 horas.
            </p>
          </div>

          {mensaje && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {mensaje}
            </div>
          )}

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Peso bruto</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totales.peso.toFixed(3)} g</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Oro fino estimado</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{totales.oroFino.toFixed(3)} g</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Valor neto</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{totales.valorNeto.toFixed(2)} Bs</p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[460px_1fr]">
            <form onSubmit={guardarProduccion} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Nuevo registro</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                  <label className="block text-sm font-semibold text-slate-700">Metodo</label>
                  <input
                    value={form.metodo}
                    onChange={(e) => setForm({ ...form, metodo: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Punta</label>
                  <select
                    value={form.punta_id}
                    onChange={(e) => setForm({ ...form, punta_id: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">Seleccionar punta</option>
                    {puntas.map((punta) => (
                      <option key={punta.id} value={punta.id}>
                        {punta.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Lugar</label>
                  <select
                    value={form.lugar_trabajo_id}
                    onChange={(e) => setForm({ ...form, lugar_trabajo_id: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">Seleccionar lugar</option>
                    {lugares.map((lugar) => (
                      <option key={lugar.id} value={lugar.id}>
                        {lugar.nombre} - {lugar.tipo_trabajo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Turno</label>
                  <select
                    value={form.turno_id}
                    onChange={(e) => setForm({ ...form, turno_id: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">Seleccionar turno</option>
                    {turnos.map((turno) => (
                      <option key={turno.id} value={turno.id}>
                        {turno.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Comprador</label>
                  <input
                    value={form.comprador}
                    onChange={(e) => setForm({ ...form, comprador: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Peso bruto</label>
                  <input
                    type="number"
                    step="0.001"
                    value={form.peso_bruto}
                    onChange={(e) => setForm({ ...form, peso_bruto: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Ley oro (%)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={form.ley_oro}
                    onChange={(e) => setForm({ ...form, ley_oro: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Precio unitario</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precio_unitario}
                    onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Regalia</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.regalia}
                    onChange={(e) => setForm({ ...form, regalia: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Aporte cooperativa</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.aporte_cooperativa}
                    onChange={(e) => setForm({ ...form, aporte_cooperativa: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Deducciones</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.deducciones}
                    onChange={(e) => setForm({ ...form, deducciones: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
                <div className="rounded-md bg-slate-50 p-3 text-sm sm:col-span-2">
                  <p className="font-semibold text-slate-700">Oro fino: {valores.oroFino.toFixed(3)} g</p>
                  <p className="font-semibold text-slate-700">Valor bruto: {valores.valorBruto.toFixed(2)} Bs</p>
                  <p className="font-bold text-emerald-700">Valor neto: {valores.valorNeto.toFixed(2)} Bs</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">Observaciones</label>
                  <textarea
                    rows="3"
                    value={form.observaciones}
                    onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={cargando}
                className="mt-5 w-full rounded-md bg-amber-700 px-4 py-3 font-semibold text-white disabled:bg-slate-400"
              >
                {cargando ? "Guardando..." : "Registrar produccion"}
              </button>
            </form>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Historial</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                      <th className="px-3 py-3">Fecha</th>
                      <th className="px-3 py-3">Punta</th>
                      <th className="px-3 py-3">Lugar</th>
                      <th className="px-3 py-3">Turno</th>
                      <th className="px-3 py-3 text-right">Valor neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produccion.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-3 py-3">{item.fecha}</td>
                        <td className="px-3 py-3">{item.puntas?.nombre || "-"}</td>
                        <td className="px-3 py-3">{item.lugares_trabajo?.nombre || "-"}</td>
                        <td className="px-3 py-3">{item.turnos_trabajo?.nombre || "-"}</td>
                        <td className="px-3 py-3 text-right font-bold">
                          {numero(item.valor_neto).toFixed(2)} Bs
                        </td>
                      </tr>
                    ))}
                    {produccion.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-3 py-8 text-center text-slate-500">
                          No hay produccion registrada.
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
