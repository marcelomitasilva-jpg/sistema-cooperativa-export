"use client";

import { useEffect, useMemo, useState } from "react";
import NavPrincipal from "@/components/NavPrincipal";
import { supabase } from "@/lib/supabase-client";

const CATEGORIAS = [
  "Compra de Repuestos",
  "Combustible / Diesel",
  "Alimentacion y Viaticos",
  "Gastos Generales",
];

const ESTADOS = ["todos", "pendiente", "aprobado", "rechazado"];

function fechaLocal(fecha) {
  if (!fecha) return "Sin fecha";
  return new Date(fecha).toLocaleDateString("es-BO");
}

function descargarCsv(nombreArchivo, filas) {
  const encabezados = ["ID", "Fecha", "Categoria", "Concepto", "Estado", "Monto"];
  const csv = [
    encabezados.join(","),
    ...filas.map((g) =>
      [
        g.id_gasto,
        g.created_at || "",
        g.categoria || "",
        g.concepto || "",
        g.estado || "pendiente",
        Number(g.monto || 0).toFixed(2),
      ]
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

export default function RendicionPage() {
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [foto, setFoto] = useState(null);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [cargando, setCargando] = useState(false);
  const [analizandoIA, setAnalizandoIA] = useState(false);
  const [gastos, setGastos] = useState([]);
  const [saldoInicial, setSaldoInicial] = useState(1500);
  const [filtros, setFiltros] = useState({
    estado: "todos",
    categoria: "todas",
    desde: "",
    hasta: "",
  });

  const obtenerConfiguracion = async () => {
    const { data, error } = await supabase
      .from("configuracion_rendicion")
      .select("saldo_inicial")
      .order("fecha_vigencia", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.saldo_inicial !== undefined) {
      setSaldoInicial(Number(data.saldo_inicial || 1500));
    }
  };

  const obtenerGastos = async () => {
    try {
      const { data, error } = await supabase
        .from("rendiciones_gastos")
        .select("*")
        .order("id_gasto", { ascending: false });
      if (error) throw error;
      setGastos(data || []);
    } catch (error) {
      setMensaje({
        texto: `Error al cargar rendiciones: ${error.message}`,
        tipo: "error",
      });
    }
  };

  useEffect(() => {
    obtenerConfiguracion();
    obtenerGastos();
  }, []);

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((gasto) => {
      const estado = gasto.estado || "pendiente";
      const fecha = gasto.created_at ? gasto.created_at.slice(0, 10) : "";

      if (filtros.estado !== "todos" && estado !== filtros.estado) return false;
      if (filtros.categoria !== "todas" && gasto.categoria !== filtros.categoria) return false;
      if (filtros.desde && fecha && fecha < filtros.desde) return false;
      if (filtros.hasta && fecha && fecha > filtros.hasta) return false;
      return true;
    });
  }, [gastos, filtros]);

  const resumen = useMemo(() => {
    const totalRegistrado = gastos.reduce((total, gasto) => total + Number(gasto.monto || 0), 0);
    const totalAprobado = gastos
      .filter((gasto) => gasto.estado === "aprobado")
      .reduce((total, gasto) => total + Number(gasto.monto || 0), 0);
    const totalPendiente = gastos
      .filter((gasto) => !gasto.estado || gasto.estado === "pendiente")
      .reduce((total, gasto) => total + Number(gasto.monto || 0), 0);
    const porCategoria = CATEGORIAS.map((item) => ({
      categoria: item,
      total: gastosFiltrados
        .filter((gasto) => gasto.categoria === item)
        .reduce((total, gasto) => total + Number(gasto.monto || 0), 0),
    })).filter((item) => item.total > 0);

    return {
      totalRegistrado,
      totalAprobado,
      totalPendiente,
      saldoRestante: saldoInicial - totalAprobado,
      porCategoria,
    };
  }, [gastos, gastosFiltrados, saldoInicial]);

  const archivoABase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });

  const analizarReciboConIA = async () => {
    if (!foto) {
      setMensaje({
        texto: "Primero selecciona o toma una foto de un recibo.",
        tipo: "advertencia",
      });
      return;
    }

    setAnalizandoIA(true);
    setMensaje({ texto: "La IA esta analizando el comprobante...", tipo: "info" });

    try {
      const base64Data = await archivoABase64(foto);
      const res = await fetch("/api/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenBase64: base64Data, mimeType: foto.type }),
      });

      const resultado = await res.json();
      if (resultado.error) throw new Error(resultado.error);

      if (resultado.monto) setMonto(resultado.monto);
      if (resultado.concepto) setConcepto(resultado.concepto);
      if (resultado.categoria) setCategoria(resultado.categoria);

      setMensaje({
        texto: "Comprobante escaneado. Revisa los campos antes de guardar.",
        tipo: "exito",
      });
    } catch (error) {
      setMensaje({
        texto: `La IA no pudo procesar el comprobante: ${error.message}`,
        tipo: "error",
      });
    } finally {
      setAnalizandoIA(false);
    }
  };

  const handleGuardarGasto = async (e) => {
    e.preventDefault();
    if (!monto || !concepto) {
      setMensaje({ texto: "Completa monto y concepto.", tipo: "advertencia" });
      return;
    }

    setCargando(true);
    setMensaje({ texto: "", tipo: "" });
    let urlFotoPublica = null;

    try {
      if (foto) {
        const nombreArchivo = `${Date.now()}_${foto.name.replace(/\s+/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("recibos")
          .upload(nombreArchivo, foto);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("recibos").getPublicUrl(nombreArchivo);
        urlFotoPublica = urlData.publicUrl;
      }

      const { error } = await supabase.from("rendiciones_gastos").insert([
        {
          monto: Number(monto),
          categoria,
          concepto,
          estado: "pendiente",
          url_foto: urlFotoPublica,
        },
      ]);

      if (error) throw error;

      setMensaje({ texto: "Rendicion registrada correctamente.", tipo: "exito" });
      setMonto("");
      setConcepto("");
      setFoto(null);
      const input = document.getElementById("input-foto");
      if (input) input.value = "";
      obtenerGastos();
    } catch (error) {
      setMensaje({ texto: `Error al guardar: ${error.message}`, tipo: "error" });
    } finally {
      setCargando(false);
    }
  };

  const mensajeClase = {
    exito: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
    advertencia: "border-amber-200 bg-amber-50 text-amber-800",
  }[mensaje.tipo || "info"];

  return (
    <>
      <NavPrincipal />
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-200 pb-5">
              <h1 className="text-2xl font-bold text-slate-900">Sistema de Rendiciones</h1>
              <p className="mt-1 text-sm font-medium uppercase tracking-wide text-slate-500">
                Registro de gastos con soporte documental
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Fondo asignado</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{saldoInicial.toFixed(2)} Bs</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase text-emerald-700">Saldo disponible</p>
                <p className="mt-1 text-xl font-bold text-emerald-800">
                  {resumen.saldoRestante.toFixed(2)} Bs
                </p>
              </div>
            </div>

            {mensaje.texto && (
              <div className={`mt-5 rounded-lg border px-4 py-3 text-sm font-medium ${mensajeClase}`}>
                {mensaje.texto}
              </div>
            )}

            <form onSubmit={handleGuardarGasto} className="mt-6 space-y-4">
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Adjuntar recibo o factura digital
                </label>
                <input
                  id="input-foto"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFoto(e.target.files[0])}
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 text-sm"
                />
                {foto && (
                  <button
                    type="button"
                    onClick={analizarReciboConIA}
                    disabled={analizandoIA}
                    className="mt-3 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
                  >
                    {analizandoIA ? "Procesando documento..." : "Autocompletar datos con IA"}
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Monto declarado (Bs.)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Categoria</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                >
                  {CATEGORIAS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Concepto</label>
                <textarea
                  rows="3"
                  placeholder="Detalle del gasto..."
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={cargando || analizandoIA}
                className="w-full rounded-md bg-sky-700 px-4 py-3 text-sm font-bold text-white disabled:bg-slate-400"
              >
                {cargando ? "Registrando..." : "Enviar rendicion"}
              </button>
            </form>
          </section>

          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-500">Total registrado</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {resumen.totalRegistrado.toFixed(2)} Bs
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-emerald-700">Aprobado</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {resumen.totalAprobado.toFixed(2)} Bs
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-amber-700">Pendiente</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">
                  {resumen.totalPendiente.toFixed(2)} Bs
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Historial de rendiciones</h2>
                  <p className="text-sm text-slate-500">{gastosFiltrados.length} registros filtrados</p>
                </div>
                <button
                  type="button"
                  onClick={() => descargarCsv("rendiciones.csv", gastosFiltrados)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Exportar CSV
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <select
                  value={filtros.estado}
                  onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado === "todos" ? "Todos los estados" : estado}
                    </option>
                  ))}
                </select>
                <select
                  value={filtros.categoria}
                  onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="todas">Todas las categorias</option>
                  {CATEGORIAS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={filtros.desde}
                  onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={filtros.hasta}
                  onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              {resumen.porCategoria.length > 0 && (
                <div className="mt-5 grid gap-2 md:grid-cols-2">
                  {resumen.porCategoria.map((item) => (
                    <div key={item.categoria} className="rounded-md bg-slate-50 p-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-slate-700">{item.categoria}</span>
                        <span className="font-bold text-slate-900">{item.total.toFixed(2)} Bs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                      <th className="px-3 py-3">Fecha</th>
                      <th className="px-3 py-3">Detalle</th>
                      <th className="px-3 py-3">Estado</th>
                      <th className="px-3 py-3 text-center">Soporte</th>
                      <th className="px-3 py-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-3 py-8 text-center text-slate-500">
                          No hay rendiciones para los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      gastosFiltrados.map((gasto) => (
                        <tr key={gasto.id_gasto} className="border-b border-slate-100">
                          <td className="px-3 py-3 text-slate-600">{fechaLocal(gasto.created_at)}</td>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-slate-900">{gasto.categoria}</p>
                            <p className="text-slate-500">{gasto.concepto}</p>
                          </td>
                          <td className="px-3 py-3">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-700">
                              {gasto.estado || "pendiente"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {gasto.url_foto ? (
                              <a
                                href={gasto.url_foto}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-sky-700"
                              >
                                Ver
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-900">
                            {Number(gasto.monto || 0).toFixed(2)} Bs
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
      </main>
    </>
  );
}
