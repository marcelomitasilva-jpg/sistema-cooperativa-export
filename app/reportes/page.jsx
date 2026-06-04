"use client";

import { useEffect, useMemo, useState } from "react";
import NavPrincipal from "@/components/NavPrincipal";
import { supabase } from "@/lib/supabase-client";

function descargarCsv(nombreArchivo, headers, rows) {
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")
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

function monto(value) {
  return Number(value || 0).toFixed(2);
}

function Bar({ label, value, max, tone = "bg-sky-600" }) {
  const width = max > 0 ? Math.max((value / max) * 100, 3) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">{monto(value)} Bs</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function ReportesPage() {
  const [datos, setDatos] = useState({
    rendiciones: [],
    socios: [],
    almacen: [],
    liquidaciones: [],
    asistencias: [],
    sanciones: [],
    asientos: [],
  });
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const cargarDatos = async () => {
    setCargando(true);
    setMensaje("");

    const consultas = await Promise.allSettled([
      supabase.from("rendiciones_gastos").select("*").order("id_gasto", { ascending: false }),
      supabase.from("personal_socios").select("id, nombre").order("nombre", { ascending: true }),
      supabase.from("almacen_movimientos_auditado").select("*"),
      supabase.from("comercializacion_oro").select("*, personal_socios(nombre)"),
      supabase.from("asistencias_fallas").select("*, personal_socios(nombre)"),
      supabase.from("sanciones_memorandums").select("*, personal_socios(nombre)"),
      supabase.from("asientos_contables").select("*").order("fecha", { ascending: false }),
    ]);

    const [rendiciones, socios, almacen, liquidaciones, asistencias, sanciones, asientos] =
      consultas.map((resultado) => {
        if (resultado.status === "fulfilled" && !resultado.value.error) {
          return resultado.value.data || [];
        }
        return [];
      });

    const errores = consultas
      .map((resultado) =>
        resultado.status === "fulfilled" ? resultado.value.error?.message : resultado.reason?.message
      )
      .filter(Boolean);

    if (errores.length > 0) {
      setMensaje(`Algunos reportes no pudieron cargar: ${errores.join(" | ")}`);
    }

    setDatos({ rendiciones, socios, almacen, liquidaciones, asistencias, sanciones, asientos });
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const resumen = useMemo(() => {
    const totalGastos = datos.rendiciones.reduce((acc, item) => acc + Number(item.monto || 0), 0);
    const gastosAprobados = datos.rendiciones
      .filter((item) => item.estado === "aprobado")
      .reduce((acc, item) => acc + Number(item.monto || 0), 0);
    const gastosPendientes = datos.rendiciones
      .filter((item) => !item.estado || item.estado === "pendiente")
      .reduce((acc, item) => acc + Number(item.monto || 0), 0);
    const totalLiquidaciones = datos.liquidaciones.reduce(
      (acc, item) => acc + Number(item.valor_final || 0),
      0
    );
    const sancionesPendientes = datos.sanciones.filter((item) => item.estado === "Pendiente");

    const gastosPorCategoria = Object.values(
      datos.rendiciones.reduce((acc, item) => {
        const key = item.categoria || "Sin categoria";
        acc[key] ||= { label: key, total: 0 };
        acc[key].total += Number(item.monto || 0);
        return acc;
      }, {})
    ).sort((a, b) => b.total - a.total);

    const liquidacionesPorSocio = Object.values(
      datos.liquidaciones.reduce((acc, item) => {
        const key = item.personal_socios?.nombre || `Socio #${item.socio_id}`;
        acc[key] ||= { label: key, total: 0 };
        acc[key].total += Number(item.valor_final || 0);
        return acc;
      }, {})
    ).sort((a, b) => b.total - a.total);

    const almacenPorItem = Object.values(
      datos.almacen.reduce((acc, item) => {
        const key = item.item_nombre || "Sin nombre";
        const tipo = String(item.tipo_movimiento || "Ingreso").toLowerCase();
        const cantidad = Number(item.cantidad || 0);
        acc[key] ||= { label: key, total: 0 };
        acc[key].total += tipo === "egreso" ? -cantidad : cantidad;
        return acc;
      }, {})
    ).sort((a, b) => b.total - a.total);

    return {
      totalGastos,
      gastosAprobados,
      gastosPendientes,
      totalLiquidaciones,
      sancionesPendientes,
      gastosPorCategoria,
      liquidacionesPorSocio,
      almacenPorItem,
      totalDebe: datos.asientos.reduce((acc, item) => acc + Number(item.debe || 0), 0),
      totalHaber: datos.asientos.reduce((acc, item) => acc + Number(item.haber || 0), 0),
    };
  }, [datos]);

  const maxGasto = Math.max(...resumen.gastosPorCategoria.map((item) => item.total), 0);
  const maxLiquidacion = Math.max(...resumen.liquidacionesPorSocio.map((item) => item.total), 0);
  const maxAlmacen = Math.max(...resumen.almacenPorItem.map((item) => Math.abs(item.total)), 0);

  const exportarGastos = () => {
    descargarCsv(
      "reporte-gastos.csv",
      ["ID", "Categoria", "Concepto", "Estado", "Monto"],
      datos.rendiciones.map((item) => [
        item.id_gasto,
        item.categoria,
        item.concepto,
        item.estado || "pendiente",
        monto(item.monto),
      ])
    );
  };

  const exportarLiquidaciones = () => {
    descargarCsv(
      "reporte-liquidaciones.csv",
      ["ID", "Socio", "Fecha", "Peso bruto", "Ley oro", "Valor final"],
      datos.liquidaciones.map((item) => [
        item.id,
        item.personal_socios?.nombre || item.socio_id,
        item.fecha,
        item.peso_bruto,
        item.ley_oro,
        monto(item.valor_final),
      ])
    );
  };

  return (
    <>
      <NavPrincipal />
      <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Reportes y Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">
                Resumen ejecutivo de gastos, inventario, liquidaciones y contabilidad.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={cargarDatos}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                Actualizar
              </button>
              <button
                type="button"
                onClick={exportarGastos}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                CSV gastos
              </button>
              <button
                type="button"
                onClick={exportarLiquidaciones}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                CSV liquidaciones
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Imprimir informe
              </button>
            </div>
          </div>

          {mensaje && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {mensaje}
            </div>
          )}

          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Gastos registrados</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{monto(resumen.totalGastos)} Bs</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-emerald-700">Gastos aprobados</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {monto(resumen.gastosAprobados)} Bs
              </p>
            </div>
            <div className="rounded-lg border border-sky-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-sky-700">Liquidaciones</p>
              <p className="mt-1 text-2xl font-bold text-sky-700">
                {monto(resumen.totalLiquidaciones)} Bs
              </p>
            </div>
            <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-red-700">Sanciones pendientes</p>
              <p className="mt-1 text-2xl font-bold text-red-700">
                {resumen.sancionesPendientes.length}
              </p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Gastos por categoria</h2>
              <div className="mt-4 space-y-4">
                {resumen.gastosPorCategoria.length === 0 ? (
                  <p className="text-sm text-slate-500">{cargando ? "Cargando..." : "Sin gastos."}</p>
                ) : (
                  resumen.gastosPorCategoria.map((item) => (
                    <Bar key={item.label} label={item.label} value={item.total} max={maxGasto} />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Liquidaciones por socio</h2>
              <div className="mt-4 space-y-4">
                {resumen.liquidacionesPorSocio.length === 0 ? (
                  <p className="text-sm text-slate-500">Sin liquidaciones registradas.</p>
                ) : (
                  resumen.liquidacionesPorSocio.slice(0, 8).map((item) => (
                    <Bar
                      key={item.label}
                      label={item.label}
                      value={item.total}
                      max={maxLiquidacion}
                      tone="bg-emerald-600"
                    />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Inventario por item</h2>
              <div className="mt-4 space-y-4">
                {resumen.almacenPorItem.length === 0 ? (
                  <p className="text-sm text-slate-500">Sin movimientos de almacen.</p>
                ) : (
                  resumen.almacenPorItem.slice(0, 8).map((item) => (
                    <Bar
                      key={item.label}
                      label={item.label}
                      value={Math.abs(item.total)}
                      max={maxAlmacen}
                      tone={item.total < 0 ? "bg-red-600" : "bg-sky-600"}
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Informe para la comision</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p>
                  Se registraron {datos.rendiciones.length} rendiciones por un total de{" "}
                  <strong>{monto(resumen.totalGastos)} Bs</strong>. De ese monto,{" "}
                  <strong>{monto(resumen.gastosAprobados)} Bs</strong> se encuentran aprobados y{" "}
                  <strong>{monto(resumen.gastosPendientes)} Bs</strong> siguen pendientes.
                </p>
                <p>
                  Las liquidaciones de mineral suman{" "}
                  <strong>{monto(resumen.totalLiquidaciones)} Bs</strong> distribuidos en{" "}
                  {datos.liquidaciones.length} registros.
                </p>
                <p>
                  La contabilidad automatica registra debe por{" "}
                  <strong>{monto(resumen.totalDebe)} Bs</strong> y haber por{" "}
                  <strong>{monto(resumen.totalHaber)} Bs</strong>.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Ultimos asientos contables</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Origen</th>
                      <th className="py-2 pr-3 text-right">Debe</th>
                      <th className="py-2 text-right">Haber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.asientos.slice(0, 8).map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3">{item.fecha}</td>
                        <td className="py-2 pr-3">{item.modulo_origen}</td>
                        <td className="py-2 pr-3 text-right">{monto(item.debe)}</td>
                        <td className="py-2 text-right">{monto(item.haber)}</td>
                      </tr>
                    ))}
                    {datos.asientos.length === 0 && (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-slate-500">
                          Sin asientos registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
