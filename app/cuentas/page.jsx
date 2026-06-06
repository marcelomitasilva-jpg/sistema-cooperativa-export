"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import NavPrincipal from "@/components/NavPrincipal";
import { supabase } from "@/lib/supabase-client";

function moneda(valor) {
  return Number(valor || 0).toLocaleString("es-BO", {
    style: "currency",
    currency: "BOB",
  });
}

function numero(valor) {
  const n = Number(valor || 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function fechaCorta(valor) {
  if (!valor) return "Sin fecha";
  return String(valor).slice(0, 10);
}

function estadoColor(estado) {
  if (estado === "vencido") return "bg-red-100 text-red-800";
  if (estado === "por_vencer") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function estadoVencimiento(fecha) {
  if (!fecha) return "sin_fecha";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(`${fecha}T00:00:00`);
  const dias = Math.round((vencimiento.getTime() - hoy.getTime()) / 86400000);
  if (dias < 0) return "vencido";
  if (dias <= 3) return "por_vencer";
  return "vigente";
}

export default function CuentasPage() {
  const [tab, setTab] = useState("pagar");
  const [busqueda, setBusqueda] = useState("");
  const [tesoreria, setTesoreria] = useState([]);
  const [rendiciones, setRendiciones] = useState([]);
  const [socios, setSocios] = useState([]);
  const [distribuidores, setDistribuidores] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [faltaTesoreria, setFaltaTesoreria] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    setMensaje("");
    setFaltaTesoreria(false);

    const [tesoreriaRes, rendicionesRes, sociosRes, distribuidoresRes] = await Promise.all([
      supabase.from("tesoreria_movimientos").select("*").order("fecha", { ascending: false }).limit(400),
      supabase.from("rendiciones_gastos").select("*").order("fecha_gasto", { ascending: false }).limit(400),
      supabase.from("personal_socios").select("id,nombre").order("nombre", { ascending: true }),
      supabase.from("distribuidores").select("id,nombre").order("nombre", { ascending: true }),
    ]);

    if (tesoreriaRes.error) {
      setFaltaTesoreria(true);
      setTesoreria([]);
    } else {
      setTesoreria(tesoreriaRes.data || []);
    }

    if (!rendicionesRes.error) setRendiciones(rendicionesRes.data || []);
    if (!sociosRes.error) setSocios(sociosRes.data || []);
    if (!distribuidoresRes.error) setDistribuidores(distribuidoresRes.data || []);

    if (rendicionesRes.error || sociosRes.error || distribuidoresRes.error) {
      setMensaje("Algunos datos no cargaron completos. Revise conexion o permisos de Supabase.");
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const sociosPorId = useMemo(() => new Map(socios.map((socio) => [String(socio.id), socio])), [socios]);
  const distribuidoresPorId = useMemo(
    () => new Map(distribuidores.map((distribuidor) => [String(distribuidor.id), distribuidor])),
    [distribuidores]
  );

  const nombreContraparte = useCallback(
    (item) =>
      sociosPorId.get(String(item.socio_id))?.nombre ||
      distribuidoresPorId.get(String(item.distribuidor_id))?.nombre ||
      item.contraparte_nombre ||
      item.beneficiario ||
      item.responsable ||
      "Sin nombre",
    [distribuidoresPorId, sociosPorId]
  );

  const cuentasPorPagar = useMemo(() => {
    const deTesoreria = tesoreria
      .filter((item) => numero(item.saldo_pendiente) > 0)
      .map((item) => ({
        id: `tes-${item.id}`,
        origen: "Tesoreria",
        persona: nombreContraparte(item),
        detalle: item.detalle,
        fecha: item.fecha,
        vencimiento: item.fecha_compromiso,
        monto: numero(item.saldo_pendiente),
        recibo: item.numero_recibo,
        folio: item.folio,
        estado: estadoVencimiento(item.fecha_compromiso),
        etiquetas: [item.modalidad_operacion, item.estado_pago, item.tiene_interes ? "con interes" : null, item.compromiso_venta_oro ? "compromiso oro" : null].filter(Boolean),
      }));

    const deRendiciones = rendiciones
      .filter((item) => numero(item.saldo_a_favor) > 0)
      .map((item) => ({
        id: `ren-favor-${item.id_gasto}`,
        origen: "Rendicion",
        persona: item.responsable || "Responsable no registrado",
        detalle: item.concepto || item.tarea || item.categoria || "Saldo a favor en rendicion",
        fecha: fechaCorta(item.fecha_gasto),
        vencimiento: null,
        monto: numero(item.saldo_a_favor),
        recibo: item.numero_recibo,
        folio: item.folio,
        estado: "sin_fecha",
        etiquetas: ["saldo a favor"],
      }));

    return [...deTesoreria, ...deRendiciones];
  }, [tesoreria, rendiciones, nombreContraparte]);

  const cuentasPorCobrar = useMemo(() => {
    return rendiciones
      .filter((item) => numero(item.saldo_en_contra) > 0)
      .map((item) => ({
        id: `ren-contra-${item.id_gasto}`,
        origen: "Rendicion",
        persona: item.responsable || "Responsable no registrado",
        detalle: item.concepto || item.tarea || item.categoria || "Saldo en contra en rendicion",
        fecha: fechaCorta(item.fecha_gasto),
        vencimiento: null,
        monto: numero(item.saldo_en_contra),
        recibo: item.numero_recibo,
        folio: item.folio,
        estado: "sin_fecha",
        etiquetas: ["por cobrar", item.estado],
      }));
  }, [rendiciones]);

  const listaActual = tab === "pagar" ? cuentasPorPagar : cuentasPorCobrar;
  const listaFiltrada = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    if (!texto) return listaActual;
    return listaActual.filter((item) =>
      normalizar([item.persona, item.detalle, item.recibo, item.folio, item.origen, item.etiquetas.join(" ")].join(" ")).includes(texto)
    );
  }, [busqueda, listaActual]);

  const totalPagar = useMemo(() => cuentasPorPagar.reduce((total, item) => total + item.monto, 0), [cuentasPorPagar]);
  const totalCobrar = useMemo(() => cuentasPorCobrar.reduce((total, item) => total + item.monto, 0), [cuentasPorCobrar]);
  const totalFiltrado = useMemo(() => listaFiltrada.reduce((total, item) => total + item.monto, 0), [listaFiltrada]);
  const vencidas = useMemo(() => cuentasPorPagar.filter((item) => item.estado === "vencido").length, [cuentasPorPagar]);

  return (
    <div className="app-shell">
      <NavPrincipal />
      <main>
        <div className="page-wrap space-y-6">
          <section className="module-card p-5">
            <p className="text-sm font-black uppercase tracking-wide text-emerald-800">Cuentas pendientes</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">A quien debemos y quien debe rendir</h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-relaxed text-slate-600">
              Consulta rapida para tesorero y directorio. Con manzanas: aqui se ve quien viene a cobrar,
              cuanto se le debe, de que recibo viene y si ya vencio.
            </p>
          </section>

          {mensaje ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {mensaje}
            </div>
          ) : null}

          {faltaTesoreria ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
              Falta ejecutar el SQL de Tesoreria para leer saldos por pagar. Ejecute docs/supabase-tesoreria.sql.
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-4">
            <div className="module-card p-4">
              <p className="text-xs font-black uppercase text-slate-500">Por pagar</p>
              <p className="mt-1 text-2xl font-black text-amber-800">{moneda(totalPagar)}</p>
            </div>
            <div className="module-card p-4">
              <p className="text-xs font-black uppercase text-slate-500">Por cobrar / rendir</p>
              <p className="mt-1 text-2xl font-black text-sky-800">{moneda(totalCobrar)}</p>
            </div>
            <div className="module-card p-4">
              <p className="text-xs font-black uppercase text-slate-500">Vencidas</p>
              <p className="mt-1 text-2xl font-black text-red-800">{vencidas}</p>
            </div>
            <div className="module-card p-4">
              <p className="text-xs font-black uppercase text-slate-500">Resultado busqueda</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{moneda(totalFiltrado)}</p>
            </div>
          </section>

          <section className="module-card p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="text-xl font-black text-slate-950">Buscar rapido</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Escriba nombre, proveedor, cooperativa, recibo, folio o detalle.
                </p>
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Ej. VELRAM, ARANCIBIA, recibo 120, diesel, folio 8"
                  className="mt-3 w-full border px-3 py-3 text-base font-semibold"
                />
              </div>
              <div className="flex gap-2 rounded-lg bg-slate-50 p-2">
                <button
                  type="button"
                  onClick={() => setTab("pagar")}
                  className={`rounded-lg px-4 py-2 font-black ${tab === "pagar" ? "bg-amber-700 text-white" : "bg-white text-slate-700"}`}
                >
                  Por pagar
                </button>
                <button
                  type="button"
                  onClick={() => setTab("cobrar")}
                  className={`rounded-lg px-4 py-2 font-black ${tab === "cobrar" ? "bg-sky-700 text-white" : "bg-white text-slate-700"}`}
                >
                  Por cobrar
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {listaFiltrada.map((item) => (
                <article key={item.id} className="module-card p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-950">{item.persona}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
                          {item.origen}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-xs font-black ${estadoColor(item.estado)}`}>
                          {item.estado === "sin_fecha" ? "sin vencimiento" : item.estado.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-700">{item.detalle}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        Fecha {fechaCorta(item.fecha)} | Recibo {item.recibo || "s/n"} | Folio {item.folio || "s/f"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.etiquetas.map((etiqueta) => (
                          <span key={etiqueta} className="rounded-full bg-slate-50 px-2 py-1 text-xs font-black text-slate-600">
                            {etiqueta}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                      <p className="text-xs font-black uppercase text-slate-500">{tab === "pagar" ? "Se debe" : "Debe rendir/pagar"}</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{moneda(item.monto)}</p>
                      {item.vencimiento ? <p className="text-xs font-bold text-amber-700">Vence {item.vencimiento}</p> : null}
                    </div>
                  </div>
                </article>
              ))}

              {!listaFiltrada.length ? (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm font-bold text-slate-600">
                  No hay registros con esa busqueda.
                </div>
              ) : null}
            </div>

            <aside className="module-card h-fit p-5">
              <h2 className="text-lg font-black text-slate-950">Que hacer desde aqui</h2>
              <div className="mt-4 space-y-3 text-sm font-semibold text-slate-700">
                <p>Si alguien viene a cobrar, busque su nombre y revise recibo, folio, saldo e interes.</p>
                <p>Para registrar un pago parcial o cancelar deuda, use Tesoreria como movimiento de pago.</p>
                <p>Para saldos de rendicion, revise el modulo de rendicion y los respaldos.</p>
              </div>
              <div className="mt-5 grid gap-2">
                <Link href="/tesoreria" className="rounded-lg bg-emerald-700 px-4 py-3 text-center font-black text-white">
                  Ir a Tesoreria
                </Link>
                <Link href="/rendicion" className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-center font-black text-slate-700">
                  Ir a Rendicion
                </Link>
              </div>
            </aside>
          </section>

          {cargando ? <p className="help-text">Cargando cuentas pendientes...</p> : null}
        </div>
      </main>
    </div>
  );
}
