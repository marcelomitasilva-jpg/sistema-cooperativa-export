"use client";

import { useEffect, useMemo, useState } from "react";
import NavPrincipal from "@/components/NavPrincipal";
import { supabase } from "@/lib/supabase-client";

const TIPOS_CUENTA = ["Activo", "Pasivo", "Patrimonio", "Ingreso", "Egreso"];
const ESTADOS = ["Activa", "Inactiva"];
const TABS = [
  ["guia", "Con manzanas"],
  ["plan", "Plan de cuentas"],
  ["asiento", "Nuevo asiento"],
  ["diario", "Libro diario"],
  ["mayor", "Libro mayor"],
  ["balance", "Balance de comprobacion"],
  ["periodos", "Periodos"],
];

const FORM_CUENTA = {
  codigo_cuenta: "",
  nombre_cuenta: "",
  nivel: 3,
  tipo_cuenta: "Activo",
  estado: "Activa",
  permite_movimiento: true,
};

const FORM_PERIODO = {
  gestion: new Date().getFullYear(),
  nombre: `Gestion ${new Date().getFullYear()}`,
  fecha_inicio: `${new Date().getFullYear()}-01-01`,
  fecha_fin: `${new Date().getFullYear()}-12-31`,
  estado: "abierto",
  observaciones: "",
};

function moneda(valor) {
  return Number(valor || 0).toLocaleString("es-BO", {
    style: "currency",
    currency: "BOB",
  });
}

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

function numero(valor) {
  const n = Number(valor || 0);
  return Number.isFinite(n) ? n : 0;
}

function totalDebe(detalles) {
  return detalles.reduce((total, item) => total + numero(item.debe), 0);
}

function totalHaber(detalles) {
  return detalles.reduce((total, item) => total + numero(item.haber), 0);
}

function detalleVacio() {
  return { cuenta_id: "", descripcion: "", debe: "", haber: "" };
}

export default function ContabilidadPage() {
  const [tab, setTab] = useState("guia");
  const [cuentas, setCuentas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [asientos, setAsientos] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [formCuenta, setFormCuenta] = useState(FORM_CUENTA);
  const [formPeriodo, setFormPeriodo] = useState(FORM_PERIODO);
  const [editingId, setEditingId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [cuentaMayor, setCuentaMayor] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [setupPendiente, setSetupPendiente] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [asiento, setAsiento] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    periodo_id: "",
    tipo: "diario",
    glosa: "",
    usuario_nombre: "",
    detalles: [detalleVacio(), detalleVacio()],
  });

  const cargarDatos = async () => {
    setCargando(true);
    setSetupPendiente(false);

    const { data: cuentasData, error: cuentasError } = await supabase
      .from("plan_cuentas")
      .select("*")
      .order("codigo_cuenta", { ascending: true });

    if (cuentasError) {
      setMensaje(`No se pudo cargar plan de cuentas: ${cuentasError.message}`);
      setCargando(false);
      return;
    }

    setCuentas(cuentasData || []);

    const [periodosRes, asientosRes, detallesRes] = await Promise.all([
      supabase.from("contabilidad_periodos").select("*").order("fecha_inicio", { ascending: false }),
      supabase.from("contabilidad_asientos").select("*").order("fecha", { ascending: false }),
      supabase
        .from("contabilidad_asiento_detalles")
        .select("*, plan_cuentas(codigo_cuenta,nombre_cuenta,tipo_cuenta)")
        .order("id", { ascending: true }),
    ]);

    if (periodosRes.error || asientosRes.error || detallesRes.error) {
      setSetupPendiente(true);
      setPeriodos([]);
      setAsientos([]);
      setDetalles([]);
    } else {
      setPeriodos(periodosRes.data || []);
      setAsientos(asientosRes.data || []);
      setDetalles(detallesRes.data || []);
      setAsiento((actual) => ({
        ...actual,
        periodo_id: actual.periodo_id || periodosRes.data?.find((p) => p.estado === "abierto")?.id || "",
      }));
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cuentasMovimiento = useMemo(
    () => cuentas.filter((c) => c.estado !== "Inactiva" && c.activa !== false && c.permite_movimiento !== false),
    [cuentas]
  );

  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((cuenta) => {
      const texto = `${cuenta.codigo_cuenta} ${cuenta.nombre_cuenta}`.toLowerCase();
      const coincideBusqueda = texto.includes(busqueda.trim().toLowerCase());
      const coincideTipo = filtroTipo === "todos" || cuenta.tipo_cuenta === filtroTipo;
      return coincideBusqueda && coincideTipo;
    });
  }, [cuentas, busqueda, filtroTipo]);

  const resumenCuentas = useMemo(() => {
    return cuentas.reduce((acc, cuenta) => {
      acc[cuenta.tipo_cuenta] = (acc[cuenta.tipo_cuenta] || 0) + 1;
      return acc;
    }, {});
  }, [cuentas]);

  const detallesPorAsiento = useMemo(() => {
    return detalles.reduce((acc, detalle) => {
      acc[detalle.asiento_id] = [...(acc[detalle.asiento_id] || []), detalle];
      return acc;
    }, {});
  }, [detalles]);

  const totalAsientoDebe = totalDebe(asiento.detalles);
  const totalAsientoHaber = totalHaber(asiento.detalles);
  const asientoCuadra = Math.abs(totalAsientoDebe - totalAsientoHaber) < 0.01 && totalAsientoDebe > 0;

  const balance = useMemo(() => {
    const porCuenta = new Map();
    detalles.forEach((detalle) => {
      const cuenta = detalle.plan_cuentas;
      if (!cuenta) return;
      const actual = porCuenta.get(detalle.cuenta_id) || {
        cuenta,
        debe: 0,
        haber: 0,
      };
      actual.debe += numero(detalle.debe);
      actual.haber += numero(detalle.haber);
      porCuenta.set(detalle.cuenta_id, actual);
    });

    return Array.from(porCuenta.values()).sort((a, b) =>
      String(a.cuenta.codigo_cuenta).localeCompare(String(b.cuenta.codigo_cuenta))
    );
  }, [detalles]);

  const movimientosMayor = useMemo(() => {
    if (!cuentaMayor) return [];
    return detalles
      .filter((detalle) => String(detalle.cuenta_id) === String(cuentaMayor))
      .map((detalle) => ({
        ...detalle,
        asiento: asientos.find((item) => item.id === detalle.asiento_id),
      }))
      .filter((item) => item.asiento)
      .sort((a, b) => String(a.asiento.fecha).localeCompare(String(b.asiento.fecha)));
  }, [asientos, cuentaMayor, detalles]);

  const guardarCuenta = async (e) => {
    e.preventDefault();
    setMensaje("");

    if (!formCuenta.codigo_cuenta.trim() || !formCuenta.nombre_cuenta.trim()) {
      setMensaje("Complete codigo y nombre de la cuenta.");
      return;
    }

    const payload = {
      codigo_cuenta: formCuenta.codigo_cuenta.trim(),
      nombre_cuenta: formCuenta.nombre_cuenta.trim(),
      nivel: Number(formCuenta.nivel || 3),
      tipo_cuenta: formCuenta.tipo_cuenta,
      estado: formCuenta.estado,
      activa: formCuenta.estado === "Activa",
      permite_movimiento: Boolean(formCuenta.permite_movimiento),
    };

    const consulta = editingId
      ? supabase.from("plan_cuentas").update(payload).eq("id_cuenta", editingId)
      : supabase.from("plan_cuentas").insert([payload]);

    const { error } = await consulta;
    if (error) {
      setMensaje(`Error: ${error.message}`);
      return;
    }

    setMensaje(editingId ? "Cuenta actualizada." : "Cuenta creada.");
    setFormCuenta(FORM_CUENTA);
    setEditingId(null);
    await cargarDatos();
  };

  const guardarPeriodo = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("contabilidad_periodos").insert([
      {
        gestion: Number(formPeriodo.gestion),
        nombre: formPeriodo.nombre,
        fecha_inicio: formPeriodo.fecha_inicio,
        fecha_fin: formPeriodo.fecha_fin,
        estado: formPeriodo.estado,
        observaciones: formPeriodo.observaciones || null,
      },
    ]);

    if (error) {
      setMensaje(`No se pudo crear periodo: ${error.message}`);
      return;
    }

    setMensaje("Periodo creado.");
    setFormPeriodo(FORM_PERIODO);
    await cargarDatos();
  };

  const actualizarDetalle = (index, campo, valor) => {
    setAsiento((actual) => ({
      ...actual,
      detalles: actual.detalles.map((detalle, i) => (i === index ? { ...detalle, [campo]: valor } : detalle)),
    }));
  };

  const guardarAsiento = async (e) => {
    e.preventDefault();
    setMensaje("");

    if (setupPendiente) {
      setMensaje("Primero ejecuta docs/supabase-contabilidad-core.sql en Supabase.");
      return;
    }
    if (!asiento.glosa.trim()) {
      setMensaje("La glosa es obligatoria. Es la explicacion del movimiento.");
      return;
    }
    if (!asientoCuadra) {
      setMensaje("El asiento no cuadra. Total Debe y Total Haber deben ser iguales.");
      return;
    }

    const lineas = asiento.detalles.filter((d) => d.cuenta_id && (numero(d.debe) > 0 || numero(d.haber) > 0));
    if (lineas.length < 2) {
      setMensaje("Necesitas al menos dos lineas: una al Debe y otra al Haber.");
      return;
    }

    const { data: cabecera, error: cabeceraError } = await supabase
      .from("contabilidad_asientos")
      .insert([
        {
          periodo_id: asiento.periodo_id || null,
          fecha: asiento.fecha,
          glosa: asiento.glosa.trim(),
          tipo: asiento.tipo,
          estado: "borrador",
          usuario_nombre: asiento.usuario_nombre || null,
        },
      ])
      .select("id")
      .single();

    if (cabeceraError) {
      setMensaje(`No se pudo crear asiento: ${cabeceraError.message}`);
      return;
    }

    const { error: detalleError } = await supabase.from("contabilidad_asiento_detalles").insert(
      lineas.map((detalle) => ({
        asiento_id: cabecera.id,
        cuenta_id: Number(detalle.cuenta_id),
        descripcion: detalle.descripcion || asiento.glosa,
        debe: numero(detalle.debe),
        haber: numero(detalle.haber),
      }))
    );

    if (detalleError) {
      await supabase.from("contabilidad_asientos").delete().eq("id", cabecera.id);
      setMensaje(`No se pudo crear detalle: ${detalleError.message}`);
      return;
    }

    const { error: confirmarError } = await supabase
      .from("contabilidad_asientos")
      .update({ estado: "confirmado" })
      .eq("id", cabecera.id);

    if (confirmarError) {
      setMensaje(`No se pudo confirmar asiento: ${confirmarError.message}`);
      return;
    }

    setMensaje("Asiento guardado y cuadrado.");
    setAsiento({
      fecha: new Date().toISOString().slice(0, 10),
      periodo_id: periodos.find((p) => p.estado === "abierto")?.id || "",
      tipo: "diario",
      glosa: "",
      usuario_nombre: "",
      detalles: [detalleVacio(), detalleVacio()],
    });
    await cargarDatos();
    setTab("diario");
  };

  const editarCuenta = (cuenta) => {
    setFormCuenta({
      codigo_cuenta: cuenta.codigo_cuenta || "",
      nombre_cuenta: cuenta.nombre_cuenta || "",
      nivel: cuenta.nivel || 3,
      tipo_cuenta: cuenta.tipo_cuenta || "Activo",
      estado: cuenta.estado || "Activa",
      permite_movimiento: cuenta.permite_movimiento !== false,
    });
    setEditingId(cuenta.id_cuenta);
    setTab("plan");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <NavPrincipal />
      <main>
        <div className="page-wrap space-y-6">
          <section className="module-card p-5">
            <p className="text-sm font-black uppercase tracking-wide text-emerald-800">Contabilidad</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">Una sola contabilidad, bien cuadrada</h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-relaxed text-slate-600">
              Cada movimiento importante debe tener un asiento. Con manzanas: si sale una manzana de Caja,
              tiene que aparecer en otra canasta como gasto, almacen, deuda o patrimonio.
            </p>
          </section>

          {mensaje ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {mensaje}
            </div>
          ) : null}

          {setupPendiente ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
              Falta crear las tablas nuevas. Ejecuta en Supabase: docs/supabase-contabilidad-core.sql
            </div>
          ) : null}

          <nav className="flex gap-2 overflow-x-auto rounded-lg bg-white p-2 shadow-sm">
            {TABS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-black ${
                  tab === value ? "bg-emerald-700 text-white" : "bg-slate-50 text-slate-700 hover:bg-emerald-50"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {tab === "guia" ? (
            <section className="grid gap-4 lg:grid-cols-3">
              {[
                ["Plan de cuentas", "Son las canastas: Caja, Banco, Diesel, Prestamos, Ventas de oro."],
                ["Asiento contable", "Es decir: de donde sale y a donde va el dinero o valor."],
                ["Debe y Haber", "No es bueno o malo. Solo son dos lados que siempre deben sumar igual."],
                ["Libro diario", "La lista de movimientos por fecha, como un cuaderno ordenado."],
                ["Libro mayor", "La historia de una sola canasta, por ejemplo solo Caja."],
                ["Balance", "La prueba final: todo lo registrado debe cuadrar."],
              ].map(([titulo, texto]) => (
                <div key={titulo} className="module-card p-5">
                  <h2 className="text-lg font-black text-slate-950">{titulo}</h2>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{texto}</p>
                </div>
              ))}
            </section>
          ) : null}

          {tab === "plan" ? (
            <section className="space-y-5">
              <section className="grid gap-4 md:grid-cols-5">
                {TIPOS_CUENTA.map((tipo) => (
                  <div key={tipo} className="module-card p-4">
                    <p className="text-xs font-black uppercase text-slate-500">{tipo}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{resumenCuentas[tipo] || 0}</p>
                  </div>
                ))}
              </section>

              <section className="module-card p-5">
                <h2 className="text-xl font-black text-slate-950">{editingId ? "Editar cuenta" : "Nueva cuenta"}</h2>
                <form onSubmit={guardarCuenta} className="mt-5 grid gap-4 md:grid-cols-6">
                  <div>
                    <label className="field-label">Codigo</label>
                    <input
                      value={formCuenta.codigo_cuenta}
                      onChange={(e) => setFormCuenta({ ...formCuenta, codigo_cuenta: e.target.value })}
                      placeholder="1.1.01"
                      className="w-full border px-3 py-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="field-label">Nombre</label>
                    <input
                      value={formCuenta.nombre_cuenta}
                      onChange={(e) => setFormCuenta({ ...formCuenta, nombre_cuenta: e.target.value })}
                      placeholder="Caja moneda nacional"
                      className="w-full border px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="field-label">Tipo</label>
                    <select
                      value={formCuenta.tipo_cuenta}
                      onChange={(e) => setFormCuenta({ ...formCuenta, tipo_cuenta: e.target.value })}
                      className="w-full border px-3 py-2"
                    >
                      {TIPOS_CUENTA.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Nivel</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formCuenta.nivel}
                      onChange={(e) => setFormCuenta({ ...formCuenta, nivel: e.target.value })}
                      className="w-full border px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="field-label">Estado</label>
                    <select
                      value={formCuenta.estado}
                      onChange={(e) => setFormCuenta({ ...formCuenta, estado: e.target.value })}
                      className="w-full border px-3 py-2"
                    >
                      {ESTADOS.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={formCuenta.permite_movimiento}
                      onChange={(e) => setFormCuenta({ ...formCuenta, permite_movimiento: e.target.checked })}
                    />
                    Permite movimientos
                  </label>
                  <div className="flex items-end gap-2 md:col-span-4">
                    <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 font-black text-white">
                      {editingId ? "Actualizar cuenta" : "Crear cuenta"}
                    </button>
                    {editingId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setFormCuenta(FORM_CUENTA);
                        }}
                        className="rounded-lg border border-slate-300 px-4 py-2 font-black text-slate-700"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </form>
              </section>

              <section className="module-card p-5">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
                  <h2 className="text-xl font-black text-slate-950">Cuentas registradas ({cuentasFiltradas.length})</h2>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="search"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar cuenta..."
                      className="border px-3 py-2 text-sm"
                    />
                    <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="border px-3 py-2 text-sm">
                      <option value="todos">Todos</option>
                      {TIPOS_CUENTA.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                        <th className="px-3 py-3">Codigo</th>
                        <th className="px-3 py-3">Nombre</th>
                        <th className="px-3 py-3">Tipo</th>
                        <th className="px-3 py-3">Movimiento</th>
                        <th className="px-3 py-3 text-right">Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuentasFiltradas.map((cuenta) => (
                        <tr key={cuenta.id_cuenta} className="border-b border-slate-100">
                          <td className="px-3 py-3 font-black text-slate-900">{cuenta.codigo_cuenta}</td>
                          <td
                            className="px-3 py-3 font-semibold text-slate-800"
                            style={{ paddingLeft: `${Math.max(Number(cuenta.nivel || 1) - 1, 0) * 18 + 12}px` }}
                          >
                            {cuenta.nombre_cuenta}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-black ${colorTipo(cuenta.tipo_cuenta)}`}>
                              {cuenta.tipo_cuenta}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {cuenta.permite_movimiento === false ? "Solo titulo" : "Acepta asiento"}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button type="button" onClick={() => editarCuenta(cuenta)} className="font-black text-emerald-700">
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          ) : null}

          {tab === "asiento" ? (
            <section className="module-card p-5">
              <h2 className="text-xl font-black text-slate-950">Nuevo asiento contable</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Si compras diesel: entra gasto de diesel al Debe y sale plata de Caja al Haber. Ambos lados deben sumar igual.
              </p>
              <form onSubmit={guardarAsiento} className="mt-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-5">
                  <div>
                    <label className="field-label">Fecha</label>
                    <input
                      type="date"
                      value={asiento.fecha}
                      onChange={(e) => setAsiento({ ...asiento, fecha: e.target.value })}
                      className="w-full border px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="field-label">Periodo</label>
                    <select
                      value={asiento.periodo_id}
                      onChange={(e) => setAsiento({ ...asiento, periodo_id: e.target.value })}
                      className="w-full border px-3 py-2"
                    >
                      <option value="">Sin periodo</option>
                      {periodos.map((periodo) => (
                        <option key={periodo.id} value={periodo.id}>
                          {periodo.nombre} ({periodo.estado})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Tipo</label>
                    <select
                      value={asiento.tipo}
                      onChange={(e) => setAsiento({ ...asiento, tipo: e.target.value })}
                      className="w-full border px-3 py-2"
                    >
                      {["diario", "ingreso", "egreso", "ajuste", "apertura", "cierre", "reversion"].map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="field-label">Usuario o responsable</label>
                    <input
                      value={asiento.usuario_nombre}
                      onChange={(e) => setAsiento({ ...asiento, usuario_nombre: e.target.value })}
                      placeholder="Quien registra"
                      className="w-full border px-3 py-2"
                    />
                  </div>
                  <div className="md:col-span-5">
                    <label className="field-label">Glosa</label>
                    <input
                      value={asiento.glosa}
                      onChange={(e) => setAsiento({ ...asiento, glosa: e.target.value })}
                      placeholder="Ej. Compra de diesel para trabajo en mina"
                      className="w-full border px-3 py-2"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                        <th className="px-3 py-3">Cuenta</th>
                        <th className="px-3 py-3">Detalle</th>
                        <th className="px-3 py-3 text-right">Debe</th>
                        <th className="px-3 py-3 text-right">Haber</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asiento.detalles.map((detalle, index) => (
                        <tr key={index} className="border-b border-slate-100">
                          <td className="px-3 py-2">
                            <select
                              value={detalle.cuenta_id}
                              onChange={(e) => actualizarDetalle(index, "cuenta_id", e.target.value)}
                              className="w-72 border px-2 py-1"
                            >
                              <option value="">Elegir cuenta</option>
                              {cuentasMovimiento.map((cuenta) => (
                                <option key={cuenta.id_cuenta} value={cuenta.id_cuenta}>
                                  {cuenta.codigo_cuenta} - {cuenta.nombre_cuenta}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={detalle.descripcion}
                              onChange={(e) => actualizarDetalle(index, "descripcion", e.target.value)}
                              placeholder="Detalle opcional"
                              className="w-72 border px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={detalle.debe}
                              onChange={(e) => actualizarDetalle(index, "debe", e.target.value)}
                              className="w-32 border px-2 py-1 text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={detalle.haber}
                              onChange={(e) => actualizarDetalle(index, "haber", e.target.value)}
                              className="w-32 border px-2 py-1 text-right"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-black">
                        <td colSpan="2" className="px-3 py-3 text-right">
                          Totales
                        </td>
                        <td className="px-3 py-3 text-right">{moneda(totalAsientoDebe)}</td>
                        <td className="px-3 py-3 text-right">{moneda(totalAsientoHaber)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <button
                    type="button"
                    onClick={() => setAsiento((actual) => ({ ...actual, detalles: [...actual.detalles, detalleVacio()] }))}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-black text-slate-700"
                  >
                    Agregar linea
                  </button>
                  <div className={`rounded-lg px-4 py-3 text-sm font-black ${asientoCuadra ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                    {asientoCuadra ? "Cuadra correctamente" : "Debe y Haber no cuadran"}
                  </div>
                  <button type="submit" className="rounded-lg bg-emerald-700 px-5 py-3 font-black text-white">
                    Guardar asiento
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {tab === "diario" ? (
            <section className="module-card p-5">
              <h2 className="text-xl font-black text-slate-950">Libro diario</h2>
              <div className="mt-5 space-y-4">
                {asientos.map((item) => {
                  const lineas = detallesPorAsiento[item.id] || [];
                  return (
                    <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-black text-slate-950">{item.fecha} - {item.glosa}</p>
                          <p className="text-sm font-semibold text-slate-600">Estado: {item.estado} | Tipo: {item.tipo}</p>
                        </div>
                        <p className="font-black text-emerald-800">
                          Debe {moneda(totalDebe(lineas))} / Haber {moneda(totalHaber(lineas))}
                        </p>
                      </div>
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <tbody>
                            {lineas.map((linea) => (
                              <tr key={linea.id} className="border-t border-slate-200">
                                <td className="py-2 pr-3 font-semibold text-slate-800">
                                  {linea.plan_cuentas?.codigo_cuenta} - {linea.plan_cuentas?.nombre_cuenta}
                                </td>
                                <td className="py-2 pr-3 text-slate-600">{linea.descripcion}</td>
                                <td className="py-2 pr-3 text-right">{moneda(linea.debe)}</td>
                                <td className="py-2 text-right">{moneda(linea.haber)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  );
                })}
                {!asientos.length ? <p className="help-text">No hay asientos registrados.</p> : null}
              </div>
            </section>
          ) : null}

          {tab === "mayor" ? (
            <section className="module-card p-5">
              <h2 className="text-xl font-black text-slate-950">Libro mayor</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">Elige una cuenta para ver su historia.</p>
              <select value={cuentaMayor} onChange={(e) => setCuentaMayor(e.target.value)} className="mt-4 w-full max-w-xl border px-3 py-2">
                <option value="">Elegir cuenta</option>
                {cuentas.map((cuenta) => (
                  <option key={cuenta.id_cuenta} value={cuenta.id_cuenta}>
                    {cuenta.codigo_cuenta} - {cuenta.nombre_cuenta}
                  </option>
                ))}
              </select>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left">
                      <th className="px-3 py-3">Fecha</th>
                      <th className="px-3 py-3">Glosa</th>
                      <th className="px-3 py-3 text-right">Debe</th>
                      <th className="px-3 py-3 text-right">Haber</th>
                      <th className="px-3 py-3 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientosMayor.reduce((saldo, mov) => {
                      const nuevoSaldo = saldo + numero(mov.debe) - numero(mov.haber);
                      mov.saldoCalculado = nuevoSaldo;
                      return nuevoSaldo;
                    }, 0) || null}
                    {movimientosMayor.map((mov) => (
                      <tr key={mov.id} className="border-b border-slate-100">
                        <td className="px-3 py-3">{mov.asiento.fecha}</td>
                        <td className="px-3 py-3">{mov.asiento.glosa}</td>
                        <td className="px-3 py-3 text-right">{moneda(mov.debe)}</td>
                        <td className="px-3 py-3 text-right">{moneda(mov.haber)}</td>
                        <td className="px-3 py-3 text-right font-black">{moneda(mov.saldoCalculado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {tab === "balance" ? (
            <section className="module-card p-5">
              <h2 className="text-xl font-black text-slate-950">Balance de comprobacion</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left">
                      <th className="px-3 py-3">Cuenta</th>
                      <th className="px-3 py-3">Tipo</th>
                      <th className="px-3 py-3 text-right">Debe</th>
                      <th className="px-3 py-3 text-right">Haber</th>
                      <th className="px-3 py-3 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balance.map((item) => (
                      <tr key={item.cuenta.codigo_cuenta} className="border-b border-slate-100">
                        <td className="px-3 py-3 font-black">{item.cuenta.codigo_cuenta} - {item.cuenta.nombre_cuenta}</td>
                        <td className="px-3 py-3">{item.cuenta.tipo_cuenta}</td>
                        <td className="px-3 py-3 text-right">{moneda(item.debe)}</td>
                        <td className="px-3 py-3 text-right">{moneda(item.haber)}</td>
                        <td className="px-3 py-3 text-right font-black">{moneda(item.debe - item.haber)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-black">
                      <td colSpan="2" className="px-3 py-3 text-right">Totales</td>
                      <td className="px-3 py-3 text-right">{moneda(balance.reduce((t, i) => t + i.debe, 0))}</td>
                      <td className="px-3 py-3 text-right">{moneda(balance.reduce((t, i) => t + i.haber, 0))}</td>
                      <td className="px-3 py-3 text-right">
                        {Math.abs(balance.reduce((t, i) => t + i.debe - i.haber, 0)) < 0.01 ? "Cuadra" : "No cuadra"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          ) : null}

          {tab === "periodos" ? (
            <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
              <form onSubmit={guardarPeriodo} className="module-card p-5">
                <h2 className="text-xl font-black text-slate-950">Crear periodo</h2>
                <div className="mt-4 grid gap-3">
                  <input type="number" value={formPeriodo.gestion} onChange={(e) => setFormPeriodo({ ...formPeriodo, gestion: e.target.value })} className="border px-3 py-2" />
                  <input value={formPeriodo.nombre} onChange={(e) => setFormPeriodo({ ...formPeriodo, nombre: e.target.value })} className="border px-3 py-2" />
                  <input type="date" value={formPeriodo.fecha_inicio} onChange={(e) => setFormPeriodo({ ...formPeriodo, fecha_inicio: e.target.value })} className="border px-3 py-2" />
                  <input type="date" value={formPeriodo.fecha_fin} onChange={(e) => setFormPeriodo({ ...formPeriodo, fecha_fin: e.target.value })} className="border px-3 py-2" />
                  <select value={formPeriodo.estado} onChange={(e) => setFormPeriodo({ ...formPeriodo, estado: e.target.value })} className="border px-3 py-2">
                    <option value="abierto">abierto</option>
                    <option value="cerrado">cerrado</option>
                  </select>
                  <textarea value={formPeriodo.observaciones} onChange={(e) => setFormPeriodo({ ...formPeriodo, observaciones: e.target.value })} className="border px-3 py-2" placeholder="Observaciones" />
                  <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-3 font-black text-white">Crear periodo</button>
                </div>
              </form>
              <section className="module-card p-5">
                <h2 className="text-xl font-black text-slate-950">Periodos registrados</h2>
                <div className="mt-4 space-y-3">
                  {periodos.map((periodo) => (
                    <div key={periodo.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="font-black">{periodo.nombre} - {periodo.estado}</p>
                      <p className="text-sm font-semibold text-slate-600">{periodo.fecha_inicio} a {periodo.fecha_fin}</p>
                    </div>
                  ))}
                </div>
              </section>
            </section>
          ) : null}

          {cargando ? <p className="help-text">Cargando contabilidad...</p> : null}
        </div>
      </main>
    </div>
  );
}
