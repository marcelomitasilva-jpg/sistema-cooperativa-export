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
  const [filtroVerificacion, setFiltroVerificacion] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [verificandoId, setVerificandoId] = useState(null);
  const [guardandoId, setGuardandoId] = useState(null);
  const [formVerificacion, setFormVerificacion] = useState({
    cantidad: "",
    unidad: "",
    recibido_por: "",
    sello_recibo: true,
    observaciones: "",
  });

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
      const coincideVerificacion =
        filtroVerificacion === "todos" ||
        String(movimiento.estado_verificacion || "sin_estado") === filtroVerificacion;
      return coincideItem && coincideTipo && coincideVerificacion;
    });
  }, [movimientos, filtroItem, filtroTipo, filtroVerificacion]);

  const pendientesVerificacion = useMemo(() => {
    return movimientos.filter(
      (movimiento) =>
        String(movimiento.estado_verificacion || "") === "pendiente_verificacion"
    );
  }, [movimientos]);

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

  const iniciarVerificacion = (movimiento) => {
    const recibidoPor = Array.isArray(movimiento.recibido_por)
      ? movimiento.recibido_por.join(", ")
      : movimiento.recibido_por || "";
    setVerificandoId(movimiento.id_movimiento);
    setFormVerificacion({
      cantidad: String(movimiento.cantidad || ""),
      unidad: movimiento.unidad || "",
      recibido_por: recibidoPor,
      sello_recibo: Boolean(movimiento.sello_recibo),
      observaciones: movimiento.observaciones || "",
    });
  };

  const actualizarVerificacion = (campo, valor) => {
    setFormVerificacion((actual) => ({ ...actual, [campo]: valor }));
  };

  const guardarVerificacion = async (movimiento, estadoFinal) => {
    const cantidad = Number(formVerificacion.cantidad);
    if (!cantidad || cantidad <= 0) {
      setMensaje("La cantidad verificada debe ser mayor a 0.");
      return;
    }
    if (!formVerificacion.unidad.trim()) {
      setMensaje("Indica la unidad real verificada por almacen.");
      return;
    }
    if (!formVerificacion.recibido_por.trim()) {
      setMensaje("Indica quien verifico fisicamente el ingreso.");
      return;
    }

    setGuardandoId(movimiento.id_movimiento);
    setMensaje("");

    const observacionBase = formVerificacion.observaciones.trim();
    const observacionVerificacion =
      estadoFinal === "observado"
        ? "Movimiento observado por almacen."
        : "Ingreso verificado fisicamente por almacen.";

    const { error } = await supabase
      .from("almacen_movimientos_auditado")
      .update({
        cantidad,
        unidad: formVerificacion.unidad.trim(),
        recibido_por: [formVerificacion.recibido_por.trim()],
        sello_recibo: Boolean(formVerificacion.sello_recibo),
        estado_verificacion: estadoFinal,
        observaciones: observacionBase
          ? `${observacionBase}\n${observacionVerificacion}`
          : observacionVerificacion,
      })
      .eq("id_movimiento", movimiento.id_movimiento);

    if (error) {
      setMensaje(`Error al guardar verificacion: ${error.message}`);
    } else {
      setMensaje(
        estadoFinal === "observado"
          ? `Movimiento #${movimiento.id_movimiento} marcado como observado.`
          : `Movimiento #${movimiento.id_movimiento} verificado fisicamente.`
      );
      setVerificandoId(null);
      await cargarMovimientos();
    }

    setGuardandoId(null);
  };

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
            <div
              className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                mensaje.startsWith("Error") || mensaje.startsWith("La ") || mensaje.startsWith("Indica")
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {mensaje}
            </div>
          )}

          <section className="grid gap-4 md:grid-cols-5">
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
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-amber-700">Por verificar</p>
              <p className="mt-1 text-2xl font-bold text-amber-800">{pendientesVerificacion.length}</p>
            </div>
          </section>

          <section className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pendientes de verificacion fisica</h2>
                <p className="text-sm text-slate-500">
                  Ingresos generados desde rendiciones o descargos que aun deben ser confirmados por almacen.
                </p>
              </div>
              <button
                type="button"
                onClick={cargarMovimientos}
                className="rounded-md border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
              >
                Actualizar pendientes
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {pendientesVerificacion.length === 0 ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No hay movimientos pendientes de verificacion.
                </div>
              ) : (
                pendientesVerificacion.map((movimiento) => {
                  const editando = verificandoId === movimiento.id_movimiento;
                  return (
                    <div
                      key={movimiento.id_movimiento}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-900">
                            #{movimiento.id_movimiento} - {movimiento.item_nombre}
                          </p>
                          <p className="text-xs text-slate-600">
                            Recibo: {movimiento.numero_recibo || "s/n"} | Folio:{" "}
                            {movimiento.folio || "s/f"} | Origen:{" "}
                            {movimiento.origen_tesoreria_id
                              ? `Tesoreria #${movimiento.origen_tesoreria_id}`
                              : movimiento.origen_rendicion_id
                              ? `Rendicion #${movimiento.origen_rendicion_id}`
                              : "sin vinculo"}
                          </p>
                          <p className="text-xs text-slate-600">
                            Cantidad registrada: {movimiento.cantidad || 0} {movimiento.unidad || ""}
                          </p>
                          {movimiento.observaciones ? (
                            <p className="max-w-3xl whitespace-pre-line text-xs text-slate-500">
                              {movimiento.observaciones}
                            </p>
                          ) : null}
                        </div>
                        {!editando ? (
                          <button
                            type="button"
                            onClick={() => iniciarVerificacion(movimiento)}
                            className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                          >
                            Verificar ingreso
                          </button>
                        ) : null}
                      </div>

                      {editando ? (
                        <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-5">
                          <div>
                            <label className="block text-xs font-bold uppercase text-slate-500">
                              Cantidad real
                            </label>
                            <input
                              type="number"
                              step="0.0001"
                              value={formVerificacion.cantidad}
                              onChange={(e) => actualizarVerificacion("cantidad", e.target.value)}
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-slate-500">
                              Unidad
                            </label>
                            <input
                              value={formVerificacion.unidad}
                              onChange={(e) => actualizarVerificacion("unidad", e.target.value)}
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                              placeholder="pza, lt, kg, lote"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase text-slate-500">
                              Verificado por
                            </label>
                            <input
                              value={formVerificacion.recibido_por}
                              onChange={(e) =>
                                actualizarVerificacion("recibido_por", e.target.value)
                              }
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                              placeholder="Almacenero o responsable"
                            />
                          </div>
                          <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              checked={formVerificacion.sello_recibo}
                              onChange={(e) =>
                                actualizarVerificacion("sello_recibo", e.target.checked)
                              }
                            />
                            Recibo sellado
                          </label>
                          <div className="md:col-span-5">
                            <label className="block text-xs font-bold uppercase text-slate-500">
                              Observaciones de verificacion
                            </label>
                            <textarea
                              value={formVerificacion.observaciones}
                              onChange={(e) =>
                                actualizarVerificacion("observaciones", e.target.value)
                              }
                              className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                              placeholder="Diferencias, faltantes, estado fisico, documento original..."
                            />
                          </div>
                          <div className="flex flex-col gap-2 md:col-span-5 sm:flex-row">
                            <button
                              type="button"
                              disabled={guardandoId === movimiento.id_movimiento}
                              onClick={() => guardarVerificacion(movimiento, "verificado_fisicamente")}
                              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:bg-slate-400"
                            >
                              Confirmar ingreso fisico
                            </button>
                            <button
                              type="button"
                              disabled={guardandoId === movimiento.id_movimiento}
                              onClick={() => guardarVerificacion(movimiento, "observado")}
                              className="rounded-md bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:bg-slate-400"
                            >
                              Marcar observado
                            </button>
                            <button
                              type="button"
                              onClick={() => setVerificandoId(null)}
                              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
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
              <select
                value={filtroVerificacion}
                onChange={(e) => setFiltroVerificacion(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="todos">Todos los estados</option>
                <option value="verificado_fisicamente">Verificado fisicamente</option>
                <option value="pendiente_verificacion">Pendiente verificacion</option>
                <option value="observado">Observado</option>
                <option value="sin_estado">Sin estado</option>
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
                    <th className="px-3 py-3">Recibo / Folio</th>
                    <th className="px-3 py-3">Verificacion</th>
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
                        <p>Recibo: {movimiento.numero_recibo || "s/n"}</p>
                        <p>Folio: {movimiento.folio || "s/f"}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <p className="font-semibold">
                          {movimiento.estado_verificacion || "sin_estado"}
                        </p>
                        <p className="text-xs">
                          Sello: {movimiento.sello_recibo ? "si" : "no"}
                        </p>
                      </td>
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
