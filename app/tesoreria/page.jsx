"use client";

import { useEffect, useMemo, useState } from "react";
import NavPrincipal from "@/components/NavPrincipal";
import { supabase } from "@/lib/supabase-client";
import { registrarAsientoContable } from "@/lib/asientos-contables";

const TIPOS = {
  ingreso: {
    titulo: "Ingreso de dinero",
    ayuda: "Cuando entra plata a caja o banco: cuotas, multas, otros cobros.",
    accion: "Registrar ingreso",
    color: "bg-emerald-700",
  },
  egreso: {
    titulo: "Gasto o pago",
    ayuda: "Cuando sale plata: diesel, explosivos, repuestos, servicios, telefono, abogado.",
    accion: "Registrar gasto",
    color: "bg-red-700",
  },
  venta_oro: {
    titulo: "Venta de oro",
    ayuda: "Venta realizada por el tesorero con comisionados o directorio.",
    accion: "Registrar venta",
    color: "bg-amber-700",
  },
  entrega_a_cuenta: {
    titulo: "Entrega a cuenta",
    ayuda: "Dinero entregado a un socio/comisionado para comprar, viajar o cumplir una tarea.",
    accion: "Registrar entrega",
    color: "bg-sky-700",
  },
  devolucion_rendicion: {
    titulo: "Devolucion de rendicion",
    ayuda: "Cuando el socio devuelve saldo sobrante de una rendicion o viatico.",
    accion: "Registrar devolucion",
    color: "bg-teal-700",
  },
  prestamo_recibido: {
    titulo: "Prestamo recibido",
    ayuda: "Dinero que entra por prestamo de socio, tercero o entidad.",
    accion: "Registrar prestamo",
    color: "bg-violet-700",
  },
  pago_deuda: {
    titulo: "Pago de deuda",
    ayuda: "Pago de prestamo, interes o deuda pendiente.",
    accion: "Registrar pago",
    color: "bg-slate-800",
  },
};

const CATEGORIAS = [
  ["combustible", "Combustible / diesel / gasolina"],
  ["explosivos", "Explosivos"],
  ["lubricantes", "Aceites / grasas"],
  ["repuestos", "Repuestos / materiales"],
  ["herramientas", "Herramientas"],
  ["viaticos", "Viaticos / viaje"],
  ["telefono", "Telefono / comunicaciones"],
  ["servicios", "Servicios externos"],
  ["empleados", "Pago empleados"],
  ["prestamos", "Prestamos / intereses"],
  ["oro", "Venta de oro"],
  ["aportes", "Aportes / cuotas / multas"],
  ["otros", "Otros"],
];

const FORM_INICIAL = {
  fecha: new Date().toISOString().slice(0, 10),
  tipo_movimiento: "egreso",
  categoria: "combustible",
  detalle: "",
  monto: "",
  forma_pago: "efectivo",
  responsable: "",
  acompanantes: "",
  beneficiario: "",
  comprador_oro: "",
  peso_oro_gramos: "",
  ley_oro: "",
  precio_gramo: "",
  deducciones: "",
  numero_recibo: "",
  folio: "",
  centro_costo_id: "",
  observaciones: "",
  creado_por: "",
};

function moneda(valor) {
  return Number(valor || 0).toLocaleString("es-BO", {
    style: "currency",
    currency: "BOB",
  });
}

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function numero(valor) {
  const n = Number(valor || 0);
  return Number.isFinite(n) ? n : 0;
}

function cuentaPor(cuentas, tipo, palabras) {
  const claves = palabras.map(normalizar);
  return cuentas.find((cuenta) => {
    if (cuenta.tipo_cuenta !== tipo || cuenta.permite_movimiento === false || cuenta.estado === "Inactiva") return false;
    const texto = normalizar(`${cuenta.codigo_cuenta} ${cuenta.nombre_cuenta}`);
    return claves.every((clave) => texto.includes(clave));
  });
}

function cuentaGastoPorCategoria(cuentas, categoria) {
  const reglas = {
    combustible: ["combustible"],
    explosivos: ["herramientas"],
    lubricantes: ["combustible"],
    repuestos: ["repuestos"],
    herramientas: ["herramientas"],
    viaticos: ["viaticos"],
    telefono: ["comunicaciones"],
    servicios: ["administrativos"],
    empleados: ["administrativos"],
    prestamos: ["gastos bancarios"],
    otros: ["administrativos"],
  };
  return cuentaPor(cuentas, "Egreso", reglas[categoria] || reglas.otros) || cuentaPor(cuentas, "Egreso", ["administrativos"]);
}

function resolverCuentas(form, cuentas) {
  const caja = form.forma_pago === "banco"
    ? cuentaPor(cuentas, "Activo", ["banco"])
    : cuentaPor(cuentas, "Activo", ["caja"]);
  const ventaOro = cuentaPor(cuentas, "Ingreso", ["venta", "oro"]) || cuentaPor(cuentas, "Ingreso", ["oro"]);
  const otrosIngresos = cuentaPor(cuentas, "Ingreso", ["otros"]) || cuentaPor(cuentas, "Ingreso", ["servicios"]);
  const cuentasRendir = cuentaPor(cuentas, "Activo", ["cuentas", "rendir"]) || cuentaPor(cuentas, "Activo", ["anticipos"]);
  const prestamos = cuentaPor(cuentas, "Pasivo", ["prestamos"]) || cuentaPor(cuentas, "Pasivo", ["cuentas", "pagar"]);

  if (form.tipo_movimiento === "venta_oro") return { debe: caja, haber: ventaOro };
  if (form.tipo_movimiento === "ingreso") return { debe: caja, haber: form.categoria === "oro" ? ventaOro : otrosIngresos };
  if (form.tipo_movimiento === "egreso") return { debe: cuentaGastoPorCategoria(cuentas, form.categoria), haber: caja };
  if (form.tipo_movimiento === "entrega_a_cuenta") return { debe: cuentasRendir, haber: caja };
  if (form.tipo_movimiento === "devolucion_rendicion") return { debe: caja, haber: cuentasRendir };
  if (form.tipo_movimiento === "prestamo_recibido") return { debe: caja, haber: prestamos };
  if (form.tipo_movimiento === "pago_deuda") return { debe: prestamos, haber: caja };
  return { debe: null, haber: null };
}

function colorEstado(estado) {
  if (estado === "contabilizado") return "bg-emerald-100 text-emerald-800";
  if (estado === "observado") return "bg-amber-100 text-amber-800";
  if (estado === "anulado") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-800";
}

export default function TesoreriaPage() {
  const [form, setForm] = useState(FORM_INICIAL);
  const [movimientos, setMovimientos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [setupPendiente, setSetupPendiente] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    setSetupPendiente(false);

    const [movRes, cuentasRes, centrosRes] = await Promise.all([
      supabase
        .from("tesoreria_movimientos")
        .select("*, contabilidad_centros_costo(nombre,codigo), contabilidad_asientos(id,estado)")
        .order("fecha", { ascending: false })
        .order("id", { ascending: false })
        .limit(80),
      supabase
        .from("plan_cuentas")
        .select("id_cuenta,codigo_cuenta,nombre_cuenta,tipo_cuenta,permite_movimiento,estado")
        .order("codigo_cuenta", { ascending: true }),
      supabase
        .from("contabilidad_centros_costo")
        .select("id,codigo,nombre,activo")
        .eq("activo", true)
        .order("codigo", { ascending: true }),
    ]);

    if (movRes.error) {
      setSetupPendiente(true);
      setMovimientos([]);
    } else {
      setMovimientos(movRes.data || []);
    }

    if (!cuentasRes.error) setCuentas(cuentasRes.data || []);
    if (!centrosRes.error) setCentrosCosto(centrosRes.data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const tipoActual = TIPOS[form.tipo_movimiento];
  const cuentasSugeridas = useMemo(() => resolverCuentas(form, cuentas), [form, cuentas]);
  const montoNetoVenta = Math.max(numero(form.monto) - numero(form.deducciones), 0);

  const resumen = useMemo(() => {
    return movimientos.reduce(
      (acc, item) => {
        const monto = numero(item.monto);
        if (["ingreso", "venta_oro", "prestamo_recibido", "devolucion_rendicion"].includes(item.tipo_movimiento)) {
          acc.ingresos += monto;
        }
        if (["egreso", "entrega_a_cuenta", "pago_deuda"].includes(item.tipo_movimiento)) {
          acc.egresos += monto;
        }
        if (item.tipo_movimiento === "venta_oro") acc.ventasOro += monto;
        if (item.estado === "observado" || item.estado === "registrado") acc.pendientes += 1;
        return acc;
      },
      { ingresos: 0, egresos: 0, ventasOro: 0, pendientes: 0 }
    );
  }, [movimientos]);

  const actualizar = (campo, valor) => setForm((actual) => ({ ...actual, [campo]: valor }));

  const cambiarTipo = (tipo) => {
    setForm((actual) => ({
      ...actual,
      tipo_movimiento: tipo,
      categoria: tipo === "venta_oro" ? "oro" : tipo === "ingreso" ? "aportes" : actual.categoria,
    }));
  };

  const subirRespaldos = async (movimientoId) => {
    if (!archivos.length) return;

    const registros = [];
    for (const archivo of archivos) {
      const limpio = archivo.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const path = `tesoreria/${movimientoId}/${Date.now()}-${limpio}`;
      const { error: uploadError } = await supabase.storage.from("recibos").upload(path, archivo, {
        upsert: false,
      });

      if (uploadError) {
        registros.push({
          movimiento_id: movimientoId,
          tipo_respaldo: "archivo",
          nombre_archivo: archivo.name,
          observaciones: `No se pudo subir al storage: ${uploadError.message}`,
        });
        continue;
      }

      const { data: urlData } = supabase.storage.from("recibos").getPublicUrl(path);
      registros.push({
        movimiento_id: movimientoId,
        tipo_respaldo: "archivo",
        nombre_archivo: archivo.name,
        storage_path: path,
        url_archivo: urlData?.publicUrl || null,
      });
    }

    if (registros.length) {
      await supabase.from("tesoreria_respaldos").insert(registros);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setMensaje("");

    if (setupPendiente) {
      setMensaje("Primero ejecuta docs/supabase-tesoreria.sql en Supabase.");
      return;
    }
    if (!form.detalle.trim() || numero(form.monto) <= 0) {
      setMensaje("Completa el detalle y un monto mayor a cero.");
      return;
    }

    setGuardando(true);
    const debe = cuentasSugeridas.debe;
    const haber = cuentasSugeridas.haber;
    const estadoInicial = debe?.id_cuenta && haber?.id_cuenta ? "registrado" : "observado";
    const observacionesCuenta = estadoInicial === "observado"
      ? "Movimiento guardado, pero falta revisar la cuenta contable sugerida."
      : form.observaciones || null;

    const payload = {
      fecha: form.fecha,
      tipo_movimiento: form.tipo_movimiento,
      categoria: form.categoria,
      detalle: form.detalle.trim(),
      monto: form.tipo_movimiento === "venta_oro" ? montoNetoVenta : numero(form.monto),
      forma_pago: form.forma_pago,
      responsable: form.responsable || null,
      acompanantes: form.acompanantes || null,
      beneficiario: form.beneficiario || null,
      comprador_oro: form.comprador_oro || null,
      peso_oro_gramos: form.peso_oro_gramos ? numero(form.peso_oro_gramos) : null,
      ley_oro: form.ley_oro || null,
      precio_gramo: form.precio_gramo ? numero(form.precio_gramo) : null,
      deducciones: numero(form.deducciones),
      numero_recibo: form.numero_recibo || null,
      folio: form.folio || null,
      centro_costo_id: form.centro_costo_id ? Number(form.centro_costo_id) : null,
      cuenta_debe_id: debe?.id_cuenta || null,
      cuenta_haber_id: haber?.id_cuenta || null,
      estado: estadoInicial,
      observaciones: observacionesCuenta,
      creado_por: form.creado_por || null,
    };

    const { data: movimiento, error } = await supabase
      .from("tesoreria_movimientos")
      .insert([payload])
      .select("id")
      .single();

    if (error) {
      setMensaje(`No se pudo guardar tesoreria: ${error.message}`);
      setGuardando(false);
      return;
    }

    await subirRespaldos(movimiento.id);

    let asiento = { ok: false };
    if (estadoInicial !== "observado") {
      asiento = await registrarAsientoContable(supabase, {
        fecha: form.fecha,
        descripcion: `${TIPOS[form.tipo_movimiento].titulo}: ${form.detalle.trim()}`,
        tipo: form.tipo_movimiento === "egreso" || form.tipo_movimiento === "pago_deuda" ? "egreso" : "ingreso",
        modulo_origen: "tesoreria",
        referencia_id: movimiento.id,
        usuario_nombre: form.creado_por || form.responsable || "Tesorero",
        detalles: [
          {
            cuenta_id: debe.id_cuenta,
            descripcion: form.detalle.trim(),
            debe: payload.monto,
            haber: 0,
          },
          {
            cuenta_id: haber.id_cuenta,
            descripcion: form.detalle.trim(),
            debe: 0,
            haber: payload.monto,
          },
        ],
      });
    }

    if (asiento.ok) {
      await supabase
        .from("tesoreria_movimientos")
        .update({ estado: "contabilizado", asiento_id: asiento.id })
        .eq("id", movimiento.id);
      setMensaje("Movimiento guardado y asiento contable generado automaticamente.");
    } else if (estadoInicial === "observado") {
      setMensaje("Movimiento guardado como observado. Falta configurar o revisar cuentas contables.");
    } else {
      await supabase
        .from("tesoreria_movimientos")
        .update({ estado: "observado", observaciones: asiento.error?.message || "No se pudo generar asiento." })
        .eq("id", movimiento.id);
      setMensaje(`Movimiento guardado, pero contabilidad quedo pendiente: ${asiento.error?.message || "revisar asiento"}`);
    }

    setForm(FORM_INICIAL);
    setArchivos([]);
    setGuardando(false);
    await cargarDatos();
  };

  return (
    <div className="app-shell">
      <NavPrincipal />
      <main>
        <div className="page-wrap space-y-6">
          <section className="module-card p-5">
            <p className="text-sm font-black uppercase tracking-wide text-emerald-800">Tesoreria diaria</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">Caja facil para el tesorero</h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-relaxed text-slate-600">
              Aqui se registra el movimiento diario de plata y venta de oro. Con manzanas: el tesorero llena el recibo
              digital; el sistema arma la contabilidad por detras y avisa si algo queda pendiente.
            </p>
          </section>

          {mensaje ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {mensaje}
            </div>
          ) : null}

          {setupPendiente ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
              Falta crear las tablas de Tesoreria. Ejecuta en Supabase el archivo docs/supabase-tesoreria.sql.
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-4">
            <div className="module-card p-4">
              <p className="text-xs font-black uppercase text-slate-500">Entradas registradas</p>
              <p className="mt-1 text-2xl font-black text-emerald-800">{moneda(resumen.ingresos)}</p>
            </div>
            <div className="module-card p-4">
              <p className="text-xs font-black uppercase text-slate-500">Salidas registradas</p>
              <p className="mt-1 text-2xl font-black text-red-800">{moneda(resumen.egresos)}</p>
            </div>
            <div className="module-card p-4">
              <p className="text-xs font-black uppercase text-slate-500">Venta de oro</p>
              <p className="mt-1 text-2xl font-black text-amber-800">{moneda(resumen.ventasOro)}</p>
            </div>
            <div className="module-card p-4">
              <p className="text-xs font-black uppercase text-slate-500">Por revisar</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{resumen.pendientes}</p>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
            <form onSubmit={guardar} className="module-card p-5">
              <h2 className="text-xl font-black text-slate-950">Nuevo movimiento</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {Object.entries(TIPOS).map(([tipo, config]) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => cambiarTipo(tipo)}
                    className={`rounded-lg px-3 py-3 text-left text-sm font-black transition ${
                      form.tipo_movimiento === tipo
                        ? `${config.color} text-white`
                        : "bg-slate-50 text-slate-800 hover:bg-emerald-50"
                    }`}
                  >
                    {config.titulo}
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                {tipoActual.ayuda}
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label">Fecha</label>
                    <input type="date" value={form.fecha} onChange={(e) => actualizar("fecha", e.target.value)} className="w-full border px-3 py-2" />
                  </div>
                  <div>
                    <label className="field-label">Monto Bs</label>
                    <input type="number" step="0.01" min="0" value={form.monto} onChange={(e) => actualizar("monto", e.target.value)} className="w-full border px-3 py-2" />
                  </div>
                </div>

                <div>
                  <label className="field-label">Detalle sencillo</label>
                  <textarea
                    value={form.detalle}
                    onChange={(e) => actualizar("detalle", e.target.value)}
                    placeholder="Ej. Compra de diesel para trabajo en mina"
                    className="min-h-24 w-full border px-3 py-2"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label">Categoria</label>
                    <select value={form.categoria} onChange={(e) => actualizar("categoria", e.target.value)} className="w-full border px-3 py-2">
                      {CATEGORIAS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Forma de pago</label>
                    <select value={form.forma_pago} onChange={(e) => actualizar("forma_pago", e.target.value)} className="w-full border px-3 py-2">
                      <option value="efectivo">Efectivo</option>
                      <option value="banco">Banco</option>
                      <option value="mixto">Mixto</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label">Nro. recibo</label>
                    <input value={form.numero_recibo} onChange={(e) => actualizar("numero_recibo", e.target.value)} className="w-full border px-3 py-2" />
                  </div>
                  <div>
                    <label className="field-label">Folio</label>
                    <input value={form.folio} onChange={(e) => actualizar("folio", e.target.value)} className="w-full border px-3 py-2" />
                  </div>
                </div>

                <div>
                  <label className="field-label">Lugar de trabajo</label>
                  <select value={form.centro_costo_id} onChange={(e) => actualizar("centro_costo_id", e.target.value)} className="w-full border px-3 py-2">
                    <option value="">General / sin lugar</option>
                    {centrosCosto.map((centro) => (
                      <option key={centro.id} value={centro.id}>{centro.codigo} - {centro.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label">Responsable</label>
                    <input value={form.responsable} onChange={(e) => actualizar("responsable", e.target.value)} placeholder="Tesorero o socio" className="w-full border px-3 py-2" />
                  </div>
                  <div>
                    <label className="field-label">Beneficiario</label>
                    <input value={form.beneficiario} onChange={(e) => actualizar("beneficiario", e.target.value)} placeholder="A quien se pago/entrego" className="w-full border px-3 py-2" />
                  </div>
                </div>

                {form.tipo_movimiento === "venta_oro" ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="font-black text-amber-900">Datos de venta de oro</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input value={form.comprador_oro} onChange={(e) => actualizar("comprador_oro", e.target.value)} placeholder="Comprador / comercializadora" className="border px-3 py-2" />
                      <input value={form.acompanantes} onChange={(e) => actualizar("acompanantes", e.target.value)} placeholder="Comisionados / directorio" className="border px-3 py-2" />
                      <input type="number" step="0.0001" value={form.peso_oro_gramos} onChange={(e) => actualizar("peso_oro_gramos", e.target.value)} placeholder="Peso en gramos" className="border px-3 py-2" />
                      <input value={form.ley_oro} onChange={(e) => actualizar("ley_oro", e.target.value)} placeholder="Ley / pureza" className="border px-3 py-2" />
                      <input type="number" step="0.01" value={form.precio_gramo} onChange={(e) => actualizar("precio_gramo", e.target.value)} placeholder="Precio por gramo" className="border px-3 py-2" />
                      <input type="number" step="0.01" value={form.deducciones} onChange={(e) => actualizar("deducciones", e.target.value)} placeholder="Deducciones" className="border px-3 py-2" />
                    </div>
                    <p className="mt-2 text-sm font-black text-amber-900">Neto a caja: {moneda(montoNetoVenta)}</p>
                  </div>
                ) : null}

                <div>
                  <label className="field-label">Fotos o respaldos</label>
                  <input type="file" multiple onChange={(e) => setArchivos(Array.from(e.target.files || []))} className="w-full border px-3 py-2" />
                  <p className="mt-1 text-xs font-semibold text-slate-500">Puede subir recibo, factura, nota, foto del descargo o comprobante.</p>
                </div>

                <div>
                  <label className="field-label">Quien registra</label>
                  <input value={form.creado_por} onChange={(e) => actualizar("creado_por", e.target.value)} placeholder="Nombre del usuario" className="w-full border px-3 py-2" />
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
                  <p className="font-black">Contabilidad sugerida</p>
                  <p>Debe: {cuentasSugeridas.debe ? `${cuentasSugeridas.debe.codigo_cuenta} - ${cuentasSugeridas.debe.nombre_cuenta}` : "Falta cuenta"}</p>
                  <p>Haber: {cuentasSugeridas.haber ? `${cuentasSugeridas.haber.codigo_cuenta} - ${cuentasSugeridas.haber.nombre_cuenta}` : "Falta cuenta"}</p>
                </div>

                <button type="submit" disabled={guardando} className={`${tipoActual.color} rounded-lg px-5 py-3 font-black text-white disabled:opacity-60`}>
                  {guardando ? "Guardando..." : tipoActual.accion}
                </button>
              </div>
            </form>

            <section className="module-card p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Movimientos recientes</h2>
                  <p className="text-sm font-semibold text-slate-600">Ultimos registros hechos por tesoreria.</p>
                </div>
                <button type="button" onClick={cargarDatos} className="rounded-lg border border-slate-300 px-4 py-2 font-black text-slate-700">
                  Actualizar
                </button>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                      <th className="px-3 py-3">Fecha</th>
                      <th className="px-3 py-3">Tipo</th>
                      <th className="px-3 py-3">Detalle</th>
                      <th className="px-3 py-3">Recibo/Folio</th>
                      <th className="px-3 py-3 text-right">Monto</th>
                      <th className="px-3 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-3 py-3 font-semibold text-slate-700">{item.fecha}</td>
                        <td className="px-3 py-3 font-black text-slate-900">{TIPOS[item.tipo_movimiento]?.titulo || item.tipo_movimiento}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-800">{item.detalle}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {item.contabilidad_centros_costo?.nombre || "General"} {item.beneficiario ? `| ${item.beneficiario}` : ""}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {item.numero_recibo || "s/n"} / {item.folio || "s/f"}
                        </td>
                        <td className="px-3 py-3 text-right font-black">{moneda(item.monto)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-black ${colorEstado(item.estado)}`}>
                            {item.estado}
                          </span>
                          {item.observaciones ? <p className="mt-1 max-w-56 text-xs font-semibold text-amber-700">{item.observaciones}</p> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!movimientos.length && !cargando ? <p className="mt-4 help-text">Todavia no hay movimientos de tesoreria.</p> : null}
                {cargando ? <p className="mt-4 help-text">Cargando tesoreria...</p> : null}
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}
