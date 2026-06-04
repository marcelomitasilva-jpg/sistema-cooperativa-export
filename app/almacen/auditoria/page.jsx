"use client";

import { useEffect, useMemo, useState } from "react";
import NavPrincipal from "@/components/NavPrincipal";
import { supabase } from "@/lib/supabase-client";

function normalizarMovimiento(tipo) {
  return String(tipo || "Ingreso").toLowerCase();
}

function cantidadConSigno(movimiento) {
  const cantidad = Number(movimiento.cantidad || 0);
  const tipo = normalizarMovimiento(movimiento.tipo_movimiento);
  if (tipo === "egreso") return -cantidad;
  return cantidad;
}

function descargarCsv(nombreArchivo, filas) {
  const headers = ["Item", "Ingresos", "Egresos", "Traspasos", "Saldo"];
  const csv = [
    headers.join(","),
    ...filas.map((fila) =>
      [fila.item, fila.ingresos, fila.egresos, fila.traspasos, fila.saldo]
        .map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  link.click();
  URL.revokeObjectURL(url);
}

export default function PanelAuditoria() {
  const [movimientos, setMovimientos] = useState([]);
  const [filtroItem, setFiltroItem] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const cargarMovimientos = async () => {
    setCargando(true);
    setMensaje("");
    const { data, error } = await supabase
      .from("almacen_movimientos_auditado")
      .select("*")
      .order("id_movimiento", { ascending: false });

    if (error) {
      setMensaje(`Error al cargar movimientos: ${error.message}`);
      setMovimientos([]);
    } else {
      setMovimientos(data || []);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarMovimientos();
  }, []);

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((movimiento) => {
      const coincideItem = movimiento.item_nombre
        ?.toLowerCase()
        .includes(filtroItem.trim().toLowerCase());
      const coincideTipo =
        filtroTipo === "todos" || normalizarMovimiento(movimiento.tipo_movimiento) === filtroTipo;
      return coincideItem && coincideTipo;
    });
  }, [movimientos, filtroItem, filtroTipo]);

  const kardex = useMemo(() => {
    const mapa = new Map();
    movimientos.forEach((movimiento) => {
      const item = movimiento.item_nombre || "Sin nombre";
      const actual =
        mapa.get(item) || {
          item,
          ingresos: 0,
          egresos: 0,
          traspasos: 0,
          saldo: 0,
        };

      const cantidad = Number(movimiento.cantidad || 0);
      const tipo = normalizarMovimiento(movimiento.tipo_movimiento);

      if (tipo === "egreso") actual.egresos += cantidad;
      else if (tipo === "traspaso") actual.traspasos += cantidad;
      else actual.ingresos += cantidad;

      actual.saldo += cantidadConSigno(movimiento);
      mapa.set(item, actual);
    });

    return Array.from(mapa.values()).sort((a, b) => a.item.localeCompare(b.item));
  }, [movimientos]);

  const totales = useMemo(() => {
    return kardex.reduce(
      (acc, item) => ({
        ingresos: acc.ingresos + item.ingresos,
        egresos: acc.egresos + item.egresos,
        traspasos: acc.traspasos + item.traspasos,
        saldo: acc.saldo + item.saldo,
      }),
      { ingresos: 0, egresos: 0, traspasos: 0, saldo: 0 }
    );
  }, [kardex]);

  return (
    <>
      <NavPrincipal />
      <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Kardex de Almacen</h1>
              <p className="mt-1 text-sm text-slate-500">
                Saldos por item, ingresos, egresos y traspasos auditados.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cargarMovimientos}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                Actualizar
              </button>
              <button
                type="button"
                onClick={() => descargarCsv("kardex-almacen.csv", kardex)}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Exportar CSV
              </button>
            </div>
          </div>

          {mensaje && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {mensaje}
            </div>
          )}

          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Ingresos</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{totales.ingresos}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Egresos</p>
              <p className="mt-1 text-2xl font-bold text-red-700">{totales.egresos}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Traspasos</p>
              <p className="mt-1 text-2xl font-bold text-sky-700">{totales.traspasos}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Saldo neto</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totales.saldo}</p>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row">
              <input
                type="search"
                placeholder="Buscar item..."
                value={filtroItem}
                onChange={(e) => setFiltroItem(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm md:max-w-sm"
              />
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="todos">Todos los movimientos</option>
                <option value="ingreso">Ingresos</option>
                <option value="egreso">Egresos</option>
                <option value="traspaso">Traspasos</option>
              </select>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-3 py-3">Item</th>
                    <th className="px-3 py-3 text-right">Ingresos</th>
                    <th className="px-3 py-3 text-right">Egresos</th>
                    <th className="px-3 py-3 text-right">Traspasos</th>
                    <th className="px-3 py-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {kardex.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-3 py-8 text-center text-slate-500">
                        {cargando ? "Cargando kardex..." : "No hay movimientos registrados."}
                      </td>
                    </tr>
                  ) : (
                    kardex.map((item) => (
                      <tr key={item.item} className="border-b border-slate-100">
                        <td className="px-3 py-3 font-semibold text-slate-900">{item.item}</td>
                        <td className="px-3 py-3 text-right text-emerald-700">{item.ingresos}</td>
                        <td className="px-3 py-3 text-right text-red-700">{item.egresos}</td>
                        <td className="px-3 py-3 text-right text-sky-700">{item.traspasos}</td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900">{item.saldo}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Movimientos auditados</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-3 py-3">ID</th>
                    <th className="px-3 py-3">Item</th>
                    <th className="px-3 py-3">Tipo</th>
                    <th className="px-3 py-3 text-right">Cantidad</th>
                    <th className="px-3 py-3">Recibido por</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosFiltrados.map((movimiento) => (
                    <tr key={movimiento.id_movimiento} className="border-b border-slate-100">
                      <td className="px-3 py-3 text-slate-500">#{movimiento.id_movimiento}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{movimiento.item_nombre}</td>
                      <td className="px-3 py-3">{movimiento.tipo_movimiento || "Ingreso"}</td>
                      <td className="px-3 py-3 text-right font-bold">{movimiento.cantidad}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {Array.isArray(movimiento.recibido_por)
                          ? movimiento.recibido_por.join(", ")
                          : movimiento.recibido_por}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
