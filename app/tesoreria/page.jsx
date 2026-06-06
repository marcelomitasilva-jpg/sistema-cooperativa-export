"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  total_operacion: "",
  pago_a_cuenta: "",
  forma_pago: "efectivo",
  modalidad_operacion: "contado",
  contraparte_tipo: "ninguna",
  socio_id: "",
  distribuidor_id: "",
  nuevo_distribuidor: "",
  contraparte_nombre: "",
  responsable: "",
  acompanantes: "",
  beneficiario: "",
  comprador_oro: "",
  moneda_origen: "BOB",
  moneda_devolucion: "BOB",
  monto_prestamo: "",
  gramos_prestamo: "",
  fecha_compromiso: "",
  tiene_interes: false,
  interes_detalle: "",
  compromiso_venta_oro: false,
  condiciones_prestamo: "",
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
  const cuentaPorPagar = cuentaPor(cuentas, "Pasivo", ["proveedores"]) || cuentaPor(cuentas, "Pasivo", ["cuentas", "pagar"]);

  if (form.tipo_movimiento === "venta_oro") return { debe: caja, haber: ventaOro, saldo: cuentaPorPagar };
  if (form.tipo_movimiento === "ingreso") return { debe: caja, haber: form.categoria === "oro" ? ventaOro : otrosIngresos, saldo: cuentaPorPagar };
  if (form.tipo_movimiento === "egreso") return { debe: cuentaGastoPorCategoria(cuentas, form.categoria), haber: caja, saldo: cuentaPorPagar };
  if (form.tipo_movimiento === "entrega_a_cuenta") return { debe: cuentasRendir, haber: caja, saldo: cuentaPorPagar };
  if (form.tipo_movimiento === "devolucion_rendicion") return { debe: caja, haber: cuentasRendir, saldo: cuentaPorPagar };
  if (form.tipo_movimiento === "prestamo_recibido") return { debe: caja, haber: prestamos, saldo: prestamos };
  if (form.tipo_movimiento === "pago_deuda") return { debe: prestamos, haber: caja, saldo: cuentaPorPagar };
  return { debe: null, haber: null };
}

function requiereCondiciones(form) {
  return [
    "fiado_proveedor",
    "prestamo_efectivo",
    "prestamo_oro",
    "compromiso_venta_oro",
    "canje_oro",
  ].includes(form.modalidad_operacion);
}

function colorEstado(estado) {
  if (estado === "contabilizado") return "bg-emerald-100 text-emerald-800";
  if (estado === "observado") return "bg-amber-100 text-amber-800";
  if (estado === "anulado") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-800";
}

function calcularPago(form) {
  const total = numero(form.total_operacion || form.monto);
  const pago = form.pago_a_cuenta === "" ? numero(form.monto) : numero(form.pago_a_cuenta);
  const saldo = Math.max(total - pago, 0);
  const estadoPago = saldo <= 0.009 ? "pagado_completo" : pago <= 0.009 ? "sin_pago" : "pago_parcial";
  return { total, pago, saldo, estadoPago };
}

function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(`${fecha}T00:00:00`);
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86400000);
}

function textoVencimiento(fecha) {
  const dias = diasHasta(fecha);
  if (dias === null) return "Sin fecha compromiso";
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return "Vence hoy";
  return `Vence en ${dias} dia(s)`;
}

export default function TesoreriaPage() {
  const [form, setForm] = useState(FORM_INICIAL);
  const [movimientos, setMovimientos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [socios, setSocios] = useState([]);
  const [distribuidores, setDistribuidores] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [consultaDeuda, setConsultaDeuda] = useState("");
  const [setupPendiente, setSetupPendiente] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    setSetupPendiente(false);

    const [movRes, cuentasRes, centrosRes, sociosRes, distribuidoresRes] = await Promise.all([
      supabase
        .from("tesoreria_movimientos")
        .select("*")
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
      supabase.from("personal_socios").select("id,nombre").order("nombre", { ascending: true }),
      supabase.from("distribuidores").select("id,nombre").order("nombre", { ascending: true }),
    ]);

    if (movRes.error) {
      setSetupPendiente(true);
      setMovimientos([]);
    } else {
      setMovimientos(movRes.data || []);
    }

    if (!cuentasRes.error) setCuentas(cuentasRes.data || []);
    if (!centrosRes.error) setCentrosCosto(centrosRes.data || []);
    if (!sociosRes.error) setSocios(sociosRes.data || []);
    if (!distribuidoresRes.error) setDistribuidores(distribuidoresRes.data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const tipoActual = TIPOS[form.tipo_movimiento];
  const cuentasSugeridas = useMemo(() => resolverCuentas(form, cuentas), [form, cuentas]);
  const montoNetoVenta = Math.max(numero(form.monto) - numero(form.deducciones), 0);
  const pagoCalculado = useMemo(() => calcularPago(form), [form]);
  const sociosPorId = useMemo(() => new Map(socios.map((socio) => [String(socio.id), socio])), [socios]);
  const distribuidoresPorId = useMemo(
    () => new Map(distribuidores.map((distribuidor) => [String(distribuidor.id), distribuidor])),
    [distribuidores]
  );
  const centrosPorId = useMemo(() => new Map(centrosCosto.map((centro) => [String(centro.id), centro])), [centrosCosto]);

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

  const deudasPendientes = useMemo(() => {
    const busqueda = normalizar(consultaDeuda.trim());
    return movimientos
      .filter((item) => numero(item.saldo_pendiente) > 0)
      .filter((item) => {
        if (!busqueda) return true;
        const texto = normalizar(
          [
            nombreContraparte(item),
            item.detalle,
            item.numero_recibo,
            item.folio,
            item.modalidad_operacion,
            item.categoria,
            item.condiciones_prestamo,
          ].join(" ")
        );
        return texto.includes(busqueda);
      })
      .sort((a, b) => {
        const fechaA = a.fecha_compromiso || a.fecha || "";
        const fechaB = b.fecha_compromiso || b.fecha || "";
        return String(fechaA).localeCompare(String(fechaB));
      });
  }, [consultaDeuda, movimientos, nombreContraparte]);

  const totalConsultaDeuda = useMemo(
    () => deudasPendientes.reduce((total, item) => total + numero(item.saldo_pendiente), 0),
    [deudasPendientes]
  );

  const alarmasVencimiento = useMemo(() => {
    const pendientes = movimientos
      .filter((item) => numero(item.saldo_pendiente) > 0)
      .map((item) => {
        const dias = diasHasta(item.fecha_compromiso);
        let nivel = "normal";
        if (dias !== null && dias < 0) nivel = "vencido";
        else if (dias !== null && dias <= 3) nivel = "por_vencer";
        else if (item.compromiso_venta_oro) nivel = "oro";

        return {
          ...item,
          dias,
          nivel,
          persona: nombreContraparte(item),
        };
      });

    return {
      vencidas: pendientes.filter((item) => item.nivel === "vencido"),
      porVencer: pendientes.filter((item) => item.nivel === "por_vencer"),
      compromisoOro: pendientes.filter((item) => item.compromiso_venta_oro),
      todas: pendientes
        .filter((item) => item.nivel !== "normal" || item.compromiso_venta_oro)
        .sort((a, b) => {
          const prioridad = { vencido: 0, por_vencer: 1, oro: 2, normal: 3 };
          const porNivel = prioridad[a.nivel] - prioridad[b.nivel];
          if (porNivel !== 0) return porNivel;
          return (a.dias ?? 9999) - (b.dias ?? 9999);
        }),
    };
  }, [movimientos, nombreContraparte]);

  const movimientoDisparaAlarma = ["ingreso", "venta_oro", "prestamo_recibido", "devolucion_rendicion"].includes(
    form.tipo_movimiento
  );

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
        acc.saldos += numero(item.saldo_pendiente);
        return acc;
      },
      { ingresos: 0, egresos: 0, ventasOro: 0, pendientes: 0, saldos: 0 }
    );
  }, [movimientos]);

  const actualizar = (campo, valor) => setForm((actual) => ({ ...actual, [campo]: valor }));

  const cambiarTipo = (tipo) => {
    setForm((actual) => ({
      ...actual,
      tipo_movimiento: tipo,
      categoria: tipo === "venta_oro" ? "oro" : tipo === "ingreso" ? "aportes" : actual.categoria,
      modalidad_operacion: tipo === "prestamo_recibido" ? "prestamo_efectivo" : tipo === "venta_oro" ? "contado" : actual.modalidad_operacion,
      contraparte_tipo: tipo === "prestamo_recibido" ? "socio" : actual.contraparte_tipo,
    }));
  };

  const crearDistribuidorSiHaceFalta = async () => {
    if (form.contraparte_tipo !== "distribuidor") return form.distribuidor_id || "";
    if (form.distribuidor_id) return form.distribuidor_id;
    const nombre = form.nuevo_distribuidor.trim();
    if (!nombre) return "";

    const { data, error } = await supabase
      .from("distribuidores")
      .insert([{ nombre }])
      .select("id,nombre")
      .single();

    if (error) {
      setMensaje(`No se pudo registrar el distribuidor: ${error.message}`);
      return "";
    }

    setDistribuidores((actual) => [...actual, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return data.id;
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
    const pago = calcularPago(form);

    if (!form.detalle.trim() || pago.total <= 0) {
      setMensaje("Completa el detalle y el total de la operacion.");
      return;
    }
    if (pago.pago > pago.total) {
      setMensaje("El pago a cuenta no puede ser mayor que el total.");
      return;
    }
    if (requiereCondiciones(form) && !form.condiciones_prestamo.trim()) {
      setMensaje("Anota las condiciones del prestamo, fiado o compromiso. Esto evita problemas despues.");
      return;
    }

    setGuardando(true);
    const distribuidorId = await crearDistribuidorSiHaceFalta();
    if (form.contraparte_tipo === "distribuidor" && form.nuevo_distribuidor.trim() && !distribuidorId) {
      setGuardando(false);
      return;
    }

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
      monto: form.tipo_movimiento === "venta_oro" ? montoNetoVenta : pago.pago,
      total_operacion: form.tipo_movimiento === "venta_oro" ? montoNetoVenta : pago.total,
      pago_a_cuenta: form.tipo_movimiento === "venta_oro" ? montoNetoVenta : pago.pago,
      saldo_pendiente: form.tipo_movimiento === "venta_oro" ? 0 : pago.saldo,
      estado_pago: form.tipo_movimiento === "venta_oro" ? "pagado_completo" : pago.estadoPago,
      forma_pago: form.forma_pago,
      modalidad_operacion: form.modalidad_operacion,
      contraparte_tipo: form.contraparte_tipo,
      socio_id: form.contraparte_tipo === "socio" && form.socio_id ? Number(form.socio_id) : null,
      distribuidor_id: form.contraparte_tipo === "distribuidor" && distribuidorId ? Number(distribuidorId) : null,
      contraparte_nombre: form.contraparte_nombre || form.nuevo_distribuidor || null,
      responsable: form.responsable || null,
      acompanantes: form.acompanantes || null,
      beneficiario: form.beneficiario || null,
      comprador_oro: form.comprador_oro || null,
      moneda_origen: form.moneda_origen,
      moneda_devolucion: form.moneda_devolucion,
      monto_prestamo: form.monto_prestamo ? numero(form.monto_prestamo) : null,
      gramos_prestamo: form.gramos_prestamo ? numero(form.gramos_prestamo) : null,
      fecha_compromiso: form.fecha_compromiso || null,
      tiene_interes: Boolean(form.tiene_interes),
      interes_detalle: form.interes_detalle || null,
      compromiso_venta_oro: Boolean(form.compromiso_venta_oro),
      condiciones_prestamo: form.condiciones_prestamo || null,
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

    const insertarMovimiento = async (datos) => supabase
      .from("tesoreria_movimientos")
      .insert([datos])
      .select("id")
      .single();

    let { data: movimiento, error } = await insertarMovimiento(payload);

    if (error && /schema cache|column|Could not find/i.test(`${error.message || ""} ${error.details || ""}`)) {
      const {
        modalidad_operacion,
        contraparte_tipo,
        socio_id,
        distribuidor_id,
        contraparte_nombre,
        moneda_origen,
        moneda_devolucion,
        monto_prestamo,
        gramos_prestamo,
        fecha_compromiso,
        tiene_interes,
        interes_detalle,
        compromiso_venta_oro,
        condiciones_prestamo,
        total_operacion,
        pago_a_cuenta,
        saldo_pendiente,
        estado_pago,
        ...payloadBasico
      } = payload;
      ({ data: movimiento, error } = await insertarMovimiento({
        ...payloadBasico,
        observaciones: [
          payload.observaciones,
          `Condiciones no guardadas por falta de SQL actualizado: modalidad ${modalidad_operacion}, contraparte ${contraparte_tipo}, socio ${socio_id || ""}, distribuidor ${distribuidor_id || ""}, nombre ${contraparte_nombre || ""}, origen ${moneda_origen}, devolucion ${moneda_devolucion}, monto prestamo ${monto_prestamo || ""}, gramos ${gramos_prestamo || ""}, fecha compromiso ${fecha_compromiso || ""}, interes ${tiene_interes ? interes_detalle || "si" : "no"}, compromiso oro ${compromiso_venta_oro ? "si" : "no"}, total ${total_operacion || ""}, pago a cuenta ${pago_a_cuenta || ""}, saldo ${saldo_pendiente || ""}, estado pago ${estado_pago || ""}, condiciones ${condiciones_prestamo || ""}`,
        ].filter(Boolean).join(" | "),
      }));
    }

    if (error) {
      setMensaje(`No se pudo guardar tesoreria: ${error.message}`);
      setGuardando(false);
      return;
    }

    await subirRespaldos(movimiento.id);

    let asiento = { ok: false };
    if (estadoInicial !== "observado") {
      const detallesAsiento = [
        {
          cuenta_id: debe.id_cuenta,
          descripcion: form.detalle.trim(),
          debe: payload.total_operacion || payload.monto,
          haber: 0,
        },
      ];

      if (payload.monto > 0) {
        detallesAsiento.push({
          cuenta_id: haber.id_cuenta,
          descripcion: form.detalle.trim(),
          debe: 0,
          haber: payload.monto,
        });
      }

      if (payload.saldo_pendiente > 0 && cuentasSugeridas.saldo?.id_cuenta) {
        detallesAsiento.push({
          cuenta_id: cuentasSugeridas.saldo.id_cuenta,
          descripcion: `Saldo pendiente: ${form.detalle.trim()}`,
          debe: 0,
          haber: payload.saldo_pendiente,
        });
      }

      asiento = await registrarAsientoContable(supabase, {
        fecha: form.fecha,
        descripcion: `${TIPOS[form.tipo_movimiento].titulo}: ${form.detalle.trim()}`,
        tipo: form.tipo_movimiento === "egreso" || form.tipo_movimiento === "pago_deuda" ? "egreso" : "ingreso",
        modulo_origen: "tesoreria",
        referencia_id: movimiento.id,
        usuario_nombre: form.creado_por || form.responsable || "Tesorero",
        detalles: detallesAsiento,
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

          <section className="grid gap-4 md:grid-cols-5">
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
            <div className="module-card p-4">
              <p className="text-xs font-black uppercase text-slate-500">Saldos pendientes</p>
              <p className="mt-1 text-2xl font-black text-amber-800">{moneda(resumen.saldos)}</p>
            </div>
          </section>

          <section className="module-card p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_240px] lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-amber-700">Consulta rapida</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Buscar deuda o pago pendiente</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Escriba nombre de socio, proveedor, cooperativa, recibo, folio o detalle para saber cuanto se adeuda.
                </p>
                <input
                  value={consultaDeuda}
                  onChange={(e) => setConsultaDeuda(e.target.value)}
                  placeholder="Ej. VELRAM, ARANCIBIA, recibo 120, diesel, folio 8"
                  className="mt-4 w-full border px-3 py-3 text-base font-semibold"
                />
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-black uppercase text-amber-700">Total encontrado</p>
                <p className="mt-1 text-3xl font-black text-amber-900">{moneda(totalConsultaDeuda)}</p>
                <p className="mt-1 text-sm font-bold text-amber-800">{deudasPendientes.length} pendiente(s)</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-black uppercase text-red-700">Pagos vencidos</p>
                <p className="mt-1 text-2xl font-black text-red-900">{alarmasVencimiento.vencidas.length}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-black uppercase text-amber-700">Por vencer en 3 dias</p>
                <p className="mt-1 text-2xl font-black text-amber-900">{alarmasVencimiento.porVencer.length}</p>
              </div>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-xs font-black uppercase text-yellow-700">Compromisos de oro</p>
                <p className="mt-1 text-2xl font-black text-yellow-900">{alarmasVencimiento.compromisoOro.length}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {deudasPendientes.slice(0, 8).map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-black text-slate-950">{nombreContraparte(item)}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{item.detalle}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {item.fecha} | Recibo {item.numero_recibo || "s/n"} | Folio {item.folio || "s/f"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white px-3 py-2 text-right">
                      <p className="text-xs font-black uppercase text-amber-700">Debe</p>
                      <p className="text-xl font-black text-amber-900">{moneda(item.saldo_pendiente)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full bg-white px-2 py-1 text-slate-700">{item.modalidad_operacion || "contado"}</span>
                    <span className="rounded-full bg-white px-2 py-1 text-slate-700">{item.estado_pago || "pago_pendiente"}</span>
                    {item.fecha_compromiso ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">Vence {item.fecha_compromiso}</span>
                    ) : null}
                    {item.tiene_interes ? <span className="rounded-full bg-red-100 px-2 py-1 text-red-800">Con interes</span> : null}
                    {item.compromiso_venta_oro ? (
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-800">Compromiso oro</span>
                    ) : null}
                  </div>
                  {item.condiciones_prestamo ? (
                    <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      {item.condiciones_prestamo}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>

            {!deudasPendientes.length ? (
              <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                No hay saldos pendientes con esa busqueda.
              </p>
            ) : null}
            {deudasPendientes.length > 8 ? (
              <p className="mt-4 text-sm font-bold text-slate-600">
                Mostrando 8 de {deudasPendientes.length}. Escriba mas datos para afinar la busqueda.
              </p>
            ) : null}
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

              {movimientoDisparaAlarma ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-wide text-red-700">Alarma antes de usar este ingreso</p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">Revise pagos vencidos y compromisos</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        Cuando entra efectivo u oro, el sistema recuerda lo que podria pagarse o apartarse.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-white px-3 py-2">
                        <p className="text-xs font-black uppercase text-red-700">Vencidas</p>
                        <p className="text-xl font-black text-red-900">{alarmasVencimiento.vencidas.length}</p>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-2">
                        <p className="text-xs font-black uppercase text-amber-700">Por vencer</p>
                        <p className="text-xl font-black text-amber-900">{alarmasVencimiento.porVencer.length}</p>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-2">
                        <p className="text-xs font-black uppercase text-yellow-700">Oro</p>
                        <p className="text-xl font-black text-yellow-900">{alarmasVencimiento.compromisoOro.length}</p>
                      </div>
                    </div>
                  </div>

                  {alarmasVencimiento.todas.length ? (
                    <div className="mt-4 space-y-2">
                      {alarmasVencimiento.todas.slice(0, 5).map((item) => (
                        <div key={item.id} className="rounded-lg border border-red-100 bg-white p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-black text-slate-950">{item.persona}</p>
                              <p className="text-sm font-semibold text-slate-700">{item.detalle}</p>
                              <p className="mt-1 text-xs font-bold text-slate-500">
                                Recibo {item.numero_recibo || "s/n"} | Folio {item.folio || "s/f"}
                              </p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-lg font-black text-red-800">{moneda(item.saldo_pendiente)}</p>
                              <p className="text-xs font-black uppercase text-red-700">{textoVencimiento(item.fecha_compromiso)}</p>
                              {item.compromiso_venta_oro ? (
                                <p className="text-xs font-black uppercase text-yellow-700">Compromiso de oro</p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                      {alarmasVencimiento.todas.length > 5 ? (
                        <p className="text-sm font-bold text-red-700">
                          Hay {alarmasVencimiento.todas.length - 5} alarma(s) mas. Revise el modulo Cuentas.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm font-bold text-emerald-800">
                      No hay pagos vencidos ni compromisos de oro pendientes.
                    </p>
                  )}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label">Fecha</label>
                    <input type="date" value={form.fecha} onChange={(e) => actualizar("fecha", e.target.value)} className="w-full border px-3 py-2" />
                  </div>
                  <div>
                    <label className="field-label">Pago de hoy Bs</label>
                    <input type="number" step="0.01" min="0" value={form.monto} onChange={(e) => actualizar("monto", e.target.value)} className="w-full border px-3 py-2" />
                  </div>
                </div>

                {form.tipo_movimiento !== "venta_oro" ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="font-black text-amber-900">Pago a cuenta o saldo pendiente</p>
                    <p className="mt-1 text-xs font-semibold text-amber-800">
                      Si no se paga completo, anote el total y cuanto se paga hoy. El sistema calcula lo que queda debiendo.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="field-label">Total compra/deuda Bs</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.total_operacion}
                          onChange={(e) => actualizar("total_operacion", e.target.value)}
                          placeholder="Si queda vacio usa pago de hoy"
                          className="w-full border px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="field-label">Pago a cuenta Bs</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.pago_a_cuenta}
                          onChange={(e) => {
                            actualizar("pago_a_cuenta", e.target.value);
                            actualizar("monto", e.target.value);
                          }}
                          placeholder="Puede ser 0"
                          className="w-full border px-3 py-2"
                        />
                      </div>
                      <div className="rounded-lg border border-amber-300 bg-white px-3 py-2">
                        <p className="text-xs font-black uppercase text-amber-700">Saldo pendiente</p>
                        <p className="mt-1 text-lg font-black text-amber-900">{moneda(pagoCalculado.saldo)}</p>
                        <p className="text-xs font-semibold text-amber-700">{pagoCalculado.estadoPago.replace("_", " ")}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

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

                <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                  <p className="font-black text-sky-950">Forma real de la operacion</p>
                  <p className="mt-1 text-xs font-semibold text-sky-900">
                    Use esto cuando la compra no fue simple: prestamo, fiado, oro por devolver o compromiso de venta.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="field-label">Modalidad</label>
                      <select
                        value={form.modalidad_operacion}
                        onChange={(e) => actualizar("modalidad_operacion", e.target.value)}
                        className="w-full border px-3 py-2"
                      >
                        <option value="contado">Contado normal</option>
                        <option value="fiado_proveedor">Fiado de proveedor/almacen</option>
                        <option value="prestamo_efectivo">Prestamo en bolivianos</option>
                        <option value="prestamo_oro">Prestamo en oro</option>
                        <option value="compromiso_venta_oro">Prestamo con compromiso de vender oro</option>
                        <option value="canje_oro">Canje o devolucion con oro</option>
                        <option value="otro">Otra forma</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Quien es la contraparte</label>
                      <select
                        value={form.contraparte_tipo}
                        onChange={(e) => actualizar("contraparte_tipo", e.target.value)}
                        className="w-full border px-3 py-2"
                      >
                        <option value="ninguna">No aplica</option>
                        <option value="socio">Socio de la cooperativa</option>
                        <option value="distribuidor">Distribuidor / almacen proveedor</option>
                        <option value="cooperativa">Otra cooperativa</option>
                        <option value="persona_externa">Persona externa</option>
                        <option value="empresa">Empresa</option>
                      </select>
                    </div>

                    {form.contraparte_tipo === "socio" ? (
                      <div className="sm:col-span-2">
                        <label className="field-label">Socio</label>
                        <select value={form.socio_id} onChange={(e) => actualizar("socio_id", e.target.value)} className="w-full border px-3 py-2">
                          <option value="">Elegir socio</option>
                          {socios.map((socio) => (
                            <option key={socio.id} value={socio.id}>{socio.nombre}</option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {form.contraparte_tipo === "distribuidor" ? (
                      <>
                        <div>
                          <label className="field-label">Distribuidor registrado</label>
                          <select value={form.distribuidor_id} onChange={(e) => actualizar("distribuidor_id", e.target.value)} className="w-full border px-3 py-2">
                            <option value="">Elegir o registrar nuevo</option>
                            {distribuidores.map((distribuidor) => (
                              <option key={distribuidor.id} value={distribuidor.id}>{distribuidor.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="field-label">Nuevo proveedor</label>
                          <input
                            value={form.nuevo_distribuidor}
                            onChange={(e) => actualizar("nuevo_distribuidor", e.target.value)}
                            placeholder="Ej. Almacen San Jose"
                            className="w-full border px-3 py-2"
                          />
                        </div>
                      </>
                    ) : null}

                    {["cooperativa", "persona_externa", "empresa"].includes(form.contraparte_tipo) ? (
                      <div className="sm:col-span-2">
                        <label className="field-label">Nombre de la contraparte</label>
                        <input
                          value={form.contraparte_nombre}
                          onChange={(e) => actualizar("contraparte_nombre", e.target.value)}
                          placeholder="Nombre de cooperativa, persona o empresa"
                          className="w-full border px-3 py-2"
                        />
                      </div>
                    ) : null}

                    {requiereCondiciones(form) ? (
                      <>
                        <div>
                          <label className="field-label">Nos presto en</label>
                          <select value={form.moneda_origen} onChange={(e) => actualizar("moneda_origen", e.target.value)} className="w-full border px-3 py-2">
                            <option value="BOB">Bolivianos</option>
                            <option value="ORO">Oro</option>
                            <option value="MIXTO">Mixto</option>
                          </select>
                        </div>
                        <div>
                          <label className="field-label">Devolveremos en</label>
                          <select value={form.moneda_devolucion} onChange={(e) => actualizar("moneda_devolucion", e.target.value)} className="w-full border px-3 py-2">
                            <option value="BOB">Bolivianos</option>
                            <option value="ORO">Oro</option>
                            <option value="MIXTO">Mixto</option>
                          </select>
                        </div>
                        <div>
                          <label className="field-label">Monto prestado Bs</label>
                          <input type="number" step="0.01" value={form.monto_prestamo} onChange={(e) => actualizar("monto_prestamo", e.target.value)} className="w-full border px-3 py-2" />
                        </div>
                        <div>
                          <label className="field-label">Gramos de oro</label>
                          <input type="number" step="0.0001" value={form.gramos_prestamo} onChange={(e) => actualizar("gramos_prestamo", e.target.value)} className="w-full border px-3 py-2" />
                        </div>
                        <div>
                          <label className="field-label">Fecha compromiso</label>
                          <input type="date" value={form.fecha_compromiso} onChange={(e) => actualizar("fecha_compromiso", e.target.value)} className="w-full border px-3 py-2" />
                        </div>
                        <label className="flex items-center gap-3 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                          <input type="checkbox" checked={form.tiene_interes} onChange={(e) => actualizar("tiene_interes", e.target.checked)} />
                          Tiene interes
                        </label>
                        {form.tiene_interes ? (
                          <div className="sm:col-span-2">
                            <label className="field-label">Detalle del interes</label>
                            <input value={form.interes_detalle} onChange={(e) => actualizar("interes_detalle", e.target.value)} placeholder="Ej. 2% mensual, Bs 500, sin interes" className="w-full border px-3 py-2" />
                          </div>
                        ) : null}
                        <label className="flex items-center gap-3 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 sm:col-span-2">
                          <input type="checkbox" checked={form.compromiso_venta_oro} onChange={(e) => actualizar("compromiso_venta_oro", e.target.checked)} />
                          Hay compromiso de vender oro a esta persona/proveedor
                        </label>
                        <div className="sm:col-span-2">
                          <label className="field-label">Condiciones claras</label>
                          <textarea
                            value={form.condiciones_prestamo}
                            onChange={(e) => actualizar("condiciones_prestamo", e.target.value)}
                            placeholder="Ej. Almacen presto diesel por Bs 12.000, se paga en 15 dias o con venta de oro de la siguiente alza."
                            className="min-h-24 w-full border px-3 py-2"
                          />
                        </div>
                      </>
                    ) : null}
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
                    <input
                      list="tesoreria-socios-lista"
                      value={form.responsable}
                      onChange={(e) => actualizar("responsable", e.target.value)}
                      placeholder="Tesorero o socio"
                      className="w-full border px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="field-label">Beneficiario</label>
                    <input
                      list="tesoreria-socios-lista"
                      value={form.beneficiario}
                      onChange={(e) => actualizar("beneficiario", e.target.value)}
                      placeholder="A quien se pago/entrego"
                      className="w-full border px-3 py-2"
                    />
                  </div>
                </div>

                <datalist id="tesoreria-socios-lista">
                  {socios.map((socio) => (
                    <option key={socio.id} value={socio.nombre} />
                  ))}
                </datalist>

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
                  {pagoCalculado.saldo > 0 ? (
                    <p>Saldo por pagar: {cuentasSugeridas.saldo ? `${cuentasSugeridas.saldo.codigo_cuenta} - ${cuentasSugeridas.saldo.nombre_cuenta}` : "Falta cuenta"}</p>
                  ) : null}
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
                <table className="min-w-[1240px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                      <th className="px-3 py-3">Fecha</th>
                      <th className="px-3 py-3">Tipo</th>
                      <th className="px-3 py-3">Detalle</th>
                      <th className="px-3 py-3">Modalidad</th>
                      <th className="px-3 py-3">Contraparte</th>
                      <th className="px-3 py-3">Recibo/Folio</th>
                      <th className="px-3 py-3 text-right">Monto</th>
                      <th className="px-3 py-3 text-right">Saldo</th>
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
                            {centrosPorId.get(String(item.centro_costo_id))?.nombre || "General"} {item.beneficiario ? `| ${item.beneficiario}` : ""}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          <p className="font-black">{item.modalidad_operacion || "contado"}</p>
                          {item.fecha_compromiso ? <p className="text-xs font-semibold text-amber-700">Vence: {item.fecha_compromiso}</p> : null}
                          {item.compromiso_venta_oro ? <p className="text-xs font-semibold text-amber-700">Compromiso oro</p> : null}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          <p className="font-semibold">{nombreContraparte(item)}</p>
                          {item.tiene_interes ? <p className="text-xs font-semibold text-red-700">Con interes</p> : null}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {item.numero_recibo || "s/n"} / {item.folio || "s/f"}
                        </td>
                        <td className="px-3 py-3 text-right font-black">{moneda(item.monto)}</td>
                        <td className="px-3 py-3 text-right">
                          <p className="font-black text-amber-800">{moneda(item.saldo_pendiente)}</p>
                          {item.estado_pago ? <p className="text-xs font-semibold text-slate-500">{item.estado_pago.replace("_", " ")}</p> : null}
                        </td>
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
