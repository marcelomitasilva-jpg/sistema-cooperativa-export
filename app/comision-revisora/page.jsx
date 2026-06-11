"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NavPrincipal from "@/components/NavPrincipal";
import { supabase } from "@/lib/supabase-client";

const TIPOS_DOCUMENTO = [
  { value: "cuaderno_egresos_revisora", label: "Cuaderno de egresos revisora" },
  { value: "caja_hacienda", label: "Libro de caja hacienda" },
  { value: "respaldo_tesoreria", label: "Respaldo tesoreria" },
  { value: "prestamo_cooperativa", label: "Prestamo a cooperativa" },
  { value: "entrega_cuenta_rendicion", label: "Entrega a cuenta / rendicion" },
  { value: "almacen", label: "Libro de almacen" },
  { value: "alzas_produccion", label: "Cuaderno de alzas / produccion" },
  { value: "ventas_oro", label: "Libro de ventas de oro" },
  { value: "otro", label: "Otro documento" },
];

const RUBROS = [
  "Combustible",
  "Explosivos",
  "Prestamos",
  "Telefono",
  "Giros",
  "Empleados",
  "Servicios externos",
  "Viaticos",
  "Gastos generales",
  "otro",
];

const TIPOS_LOTE_TABLA = [
  { value: "auto", label: "Detectar automaticamente" },
  { value: "alzas_produccion", label: "Alzas / produccion de oro" },
  { value: "ventas_oro", label: "Ventas de oro" },
  { value: "ingresos_prestamos_pagos", label: "Ingresos por prestamos y pagos" },
  { value: "otros_ingresos", label: "Otros ingresos" },
  { value: "egresos_generales", label: "Egresos generales" },
  { value: "combustible", label: "Combustible / diesel / gasolina" },
  { value: "explosivos", label: "Explosivos" },
  { value: "almacen", label: "Almacen" },
  { value: "rendiciones_viaticos", label: "Rendiciones / viaticos" },
  { value: "cuaderno_egresos_revisora", label: "Cuaderno de egresos revisora" },
  { value: "otro", label: "Otro formato manuscrito" },
];

const ORIENTACIONES_TABLA = [
  { value: "auto", label: "Automatico recomendado" },
  { value: "normal", label: "Foto normal" },
  { value: "rotar_180", label: "Girar 180 grados" },
  { value: "rotar_90_derecha", label: "Girar 90 grados derecha" },
  { value: "rotar_90_izquierda", label: "Girar 90 grados izquierda" },
];

const TIPOS_DATO_COLUMNA = [
  { value: "texto", label: "Texto" },
  { value: "fecha", label: "Fecha" },
  { value: "dinero_bolivianos", label: "Dinero Bs" },
  { value: "peso_gramos", label: "Peso gramos" },
  { value: "cantidad", label: "Cantidad" },
  { value: "recibo", label: "Recibo" },
  { value: "folio", label: "Folio" },
  { value: "persona", label: "Persona" },
  { value: "item", label: "Item" },
  { value: "saldo", label: "Saldo" },
  { value: "observacion", label: "Observacion" },
];

const COLUMNAS_BASE_LOTE = [
  { key: "fecha_documento", label: "Fecha", type: "date", width: "w-36" },
  { key: "concepto", label: "Detalle", type: "text", width: "w-72" },
  { key: "numero_recibo", label: "Recibo", type: "text", width: "w-24" },
  { key: "folio", label: "Folio", type: "text", width: "w-24" },
  { key: "observaciones", label: "Obs.", type: "text", width: "w-64" },
];

const COLUMNAS_POR_LOTE = {
  alzas_produccion: [
    { key: "cantidad", label: "Cantidad", type: "number", width: "w-28", step: "0.0001" },
    { key: "unidad", label: "Unidad", type: "text", width: "w-24" },
    { key: "ley_oro", label: "Ley", type: "text", width: "w-24" },
    { key: "responsable", label: "Responsable", type: "text", width: "w-40" },
    { key: "destino", label: "Lugar", type: "text", width: "w-32" },
  ],
  ventas_oro: [
    { key: "monto_ingreso", label: "Ingreso Bs", type: "number", width: "w-28", step: "0.01" },
    { key: "cantidad", label: "Peso", type: "number", width: "w-28", step: "0.0001" },
    { key: "unidad", label: "Unidad", type: "text", width: "w-24" },
    { key: "ley_oro", label: "Ley", type: "text", width: "w-24" },
    { key: "precio_unitario", label: "Precio", type: "number", width: "w-28", step: "0.0001" },
    { key: "contraparte", label: "Comprador", type: "text", width: "w-44" },
  ],
  ingresos_prestamos_pagos: [
    { key: "monto_ingreso", label: "Ingreso Bs", type: "number", width: "w-28", step: "0.01" },
    { key: "persona", label: "Persona", type: "text", width: "w-44" },
    { key: "contraparte", label: "Acreedor/deudor", type: "text", width: "w-44" },
    { key: "interes_porcentaje", label: "Interes %", type: "number", width: "w-24", step: "0.0001" },
    { key: "saldo_a_favor", label: "A favor", type: "number", width: "w-28", step: "0.01" },
    { key: "saldo_en_contra", label: "En contra", type: "number", width: "w-28", step: "0.01" },
  ],
  otros_ingresos: [
    { key: "monto_ingreso", label: "Ingreso Bs", type: "number", width: "w-28", step: "0.01" },
    { key: "persona", label: "Persona", type: "text", width: "w-44" },
    { key: "rubro", label: "Rubro", type: "select-rubro", width: "w-40" },
    { key: "subrubro", label: "Subrubro", type: "text", width: "w-36" },
  ],
  egresos_generales: [
    { key: "monto_egreso", label: "Egreso Bs", type: "number", width: "w-28", step: "0.01" },
    { key: "persona", label: "Persona/proveedor", type: "text", width: "w-44" },
    { key: "rubro", label: "Rubro", type: "select-rubro", width: "w-40" },
    { key: "subrubro", label: "Subrubro", type: "text", width: "w-36" },
  ],
  combustible: [
    { key: "monto_egreso", label: "Egreso Bs", type: "number", width: "w-28", step: "0.01" },
    { key: "item", label: "Item", type: "text", width: "w-36" },
    { key: "cantidad", label: "Cantidad", type: "number", width: "w-28", step: "0.0001" },
    { key: "unidad", label: "Unidad", type: "text", width: "w-24" },
    { key: "persona", label: "Proveedor", type: "text", width: "w-44" },
  ],
  explosivos: [
    { key: "monto_egreso", label: "Egreso Bs", type: "number", width: "w-28", step: "0.01" },
    { key: "item", label: "Item", type: "text", width: "w-36" },
    { key: "cantidad", label: "Cantidad", type: "number", width: "w-28", step: "0.0001" },
    { key: "unidad", label: "Unidad", type: "text", width: "w-24" },
    { key: "persona", label: "Proveedor", type: "text", width: "w-44" },
  ],
  almacen: [
    { key: "item", label: "Item", type: "text", width: "w-40" },
    { key: "cantidad", label: "Cantidad", type: "number", width: "w-28", step: "0.0001" },
    { key: "unidad", label: "Unidad", type: "text", width: "w-24" },
    { key: "saldo_libro", label: "Saldo", type: "number", width: "w-28", step: "0.0001" },
    { key: "responsable", label: "Responsable", type: "text", width: "w-40" },
  ],
  rendiciones_viaticos: [
    { key: "monto_egreso", label: "Entregado Bs", type: "number", width: "w-28", step: "0.01" },
    { key: "monto_rendido", label: "Rendido Bs", type: "number", width: "w-28", step: "0.01" },
    { key: "persona", label: "Responsable", type: "text", width: "w-44" },
    { key: "destino", label: "Destino", type: "text", width: "w-36" },
    { key: "tarea", label: "Tarea", type: "text", width: "w-44" },
  ],
};

const COLUMNAS_FALLBACK_LOTE = [
  { key: "monto_egreso", label: "Egreso Bs", type: "number", width: "w-28", step: "0.01" },
  { key: "monto_ingreso", label: "Ingreso Bs", type: "number", width: "w-28", step: "0.01" },
  { key: "rubro", label: "Rubro", type: "select-rubro", width: "w-40" },
  { key: "subrubro", label: "Subrubro", type: "text", width: "w-36" },
];

const FORM_INICIAL = {
  tipo_documento: "caja_hacienda",
  tipo_movimiento: "egreso",
  fuente: "manual",
  fecha_documento: "",
  folio: "",
  numero_recibo: "",
  persona: "",
  concepto: "",
  categoria: "",
  rubro: "",
  subrubro: "",
  responsable: "",
  destino: "",
  tarea: "",
  monto_ingreso: "",
  monto_egreso: "",
  monto_rendido: "",
  saldo_libro: "",
  cantidad: "",
  unidad: "",
  item: "",
  contraparte: "",
  interes_porcentaje: "",
  precio_unitario: "",
  precio_referencia: "",
  diferencia_precio: "",
  porcentaje_diferencia_precio: "",
  ley_oro: "",
  moneda: "BOB",
  tipo_cambio: "",
  saldo_caja_antes: "",
  justificacion_prestamo: "",
  requiere_respaldo: true,
  saldo_a_favor: "",
  saldo_en_contra: "",
  texto_extraido: "",
  confianza: "",
  observaciones: "",
};

const CAMPOS_REVISION_DOCUMENTO = [
  { key: "tipo_documento", label: "Tipo de documento" },
  { key: "tipo_movimiento", label: "Movimiento" },
  { key: "fecha_documento", label: "Fecha" },
  { key: "folio", label: "Folio" },
  { key: "numero_recibo", label: "Recibo" },
  { key: "persona", label: "Persona/proveedor" },
  { key: "concepto", label: "Concepto" },
  { key: "monto_ingreso", label: "Ingreso" },
  { key: "monto_egreso", label: "Egreso" },
  { key: "monto_rendido", label: "Rendido" },
  { key: "cantidad", label: "Cantidad/peso" },
  { key: "precio_unitario", label: "Precio unitario" },
  { key: "precio_referencia", label: "Precio referencia" },
  { key: "saldo_caja_antes", label: "Caja antes" },
  { key: "rubro", label: "Rubro" },
  { key: "subrubro", label: "Subrubro" },
];

const RESPALDO_INICIAL = {
  documento_id: "",
  tipo_respaldo: "recibo",
  folio: "",
  numero_recibo: "",
  fecha_respaldo: "",
  persona: "",
  detalle: "",
  monto: "",
  texto_extraido: "",
  resultado_verificacion: "pendiente",
  diferencias: [],
  confianza: "",
  observaciones: "",
};

const UMBRAL_RESPALDO_ALTO = 1000;
const UMBRAL_CAJA_PRESTAMO_INNECESARIO = 1000;
const TOLERANCIA_PRECIO_ORO_MEDIA = 2;
const TOLERANCIA_PRECIO_ORO_ALTA = 5;

function numero(valor) {
  const n = Number(valor || 0);
  return Number.isFinite(n) ? n : 0;
}

function opcionalNumero(valor) {
  if (valor === "" || valor === null || valor === undefined) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function limpiarDatoIa(valor) {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor).trim();
  return texto.toUpperCase() === "NO LEGIBLE" ? "" : texto;
}

function confianzaIaANumero(valor, alternativa) {
  const valorNumerico = opcionalNumero(valor);
  if (valorNumerico !== null) return valorNumerico;

  const texto = String(valor || "").trim().toLowerCase();
  if (texto === "alta") return 0.95;
  if (texto === "media") return 0.7;
  if (texto === "baja") return 0.4;

  return opcionalNumero(alternativa);
}

function moneda(valor) {
  return Number(valor || 0).toLocaleString("es-BO", {
    style: "currency",
    currency: "BOB",
  });
}

function fechaLocal(fecha) {
  if (!fecha) return "Sin fecha";
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-BO");
}

function etiquetaTipo(tipo) {
  return TIPOS_DOCUMENTO.find((item) => item.value === tipo)?.label || tipo;
}

function etiquetaLote(tipo) {
  return TIPOS_LOTE_TABLA.find((item) => item.value === tipo)?.label || tipo || "No detectado";
}

function tipoDocumentoDesdeLote(tipoLote) {
  const mapa = {
    auto: "cuaderno_egresos_revisora",
    alzas_produccion: "alzas_produccion",
    ventas_oro: "ventas_oro",
    ingresos_prestamos_pagos: "prestamo_cooperativa",
    otros_ingresos: "caja_hacienda",
    egresos_generales: "cuaderno_egresos_revisora",
    combustible: "cuaderno_egresos_revisora",
    explosivos: "cuaderno_egresos_revisora",
    almacen: "almacen",
    rendiciones_viaticos: "entrega_cuenta_rendicion",
    cuaderno_egresos_revisora: "cuaderno_egresos_revisora",
  };
  return mapa[tipoLote] || "otro";
}

function movimientoDesdeLote(tipoLote) {
  if (["alzas_produccion", "almacen"].includes(tipoLote)) return "neutro";
  if (["ventas_oro", "ingresos_prestamos_pagos", "otros_ingresos"].includes(tipoLote)) return "ingreso";
  return "egreso";
}

function rubroDesdeLote(tipoLote, fila = {}) {
  const mapa = {
    combustible: "Combustible",
    explosivos: "Explosivos",
    ingresos_prestamos_pagos: "Prestamos",
    ventas_oro: "Gastos generales",
    rendiciones_viaticos: "Viaticos",
    egresos_generales: "Gastos generales",
  };
  return fila.rubro || mapa[tipoLote] || "";
}

function normalizarClaveColumna(valor) {
  const texto = normalizarTexto(valor).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (/^(n|no|nro|num|numero|fila|renglon|row)$/.test(texto)) return "";
  if (texto.includes("tujo") && (texto.includes("gr") || texto.includes("gram"))) return "tujo_gr";
  if (texto.includes("mina") && (texto.includes("gr") || texto.includes("gram"))) return "mina_gr";
  if (texto === "bs_bs") return "monto_ingreso";
  const mapa = {
    fecha: "fecha_documento",
    dia: "fecha_documento",
    detalle: "concepto",
    descripcion: "concepto",
    concepto: "concepto",
    monto: "monto_egreso",
    monto_bs: "monto_egreso",
    bs: "monto_egreso",
    ingreso: "monto_ingreso",
    ingresos: "monto_ingreso",
    egreso: "monto_egreso",
    egresos: "monto_egreso",
    rendido: "monto_rendido",
    recibo: "numero_recibo",
    nro_recibo: "numero_recibo",
    numero_recibo: "numero_recibo",
    num_recibo: "numero_recibo",
    folio: "folio",
    nro_folio: "folio",
    numero_folio: "folio",
    peso: "cantidad",
    cantidad: "cantidad",
    gr: "cantidad",
    gramos: "cantidad",
    unidad: "unidad",
    area: "destino",
    areas: "destino",
    lugar: "destino",
    frente: "destino",
    trabajo: "destino",
    destino: "destino",
    mina: "destino",
    tujo: "destino",
    rio: "destino",
    responsable: "responsable",
    socio: "persona",
    persona: "persona",
    proveedor: "persona",
    comprador: "contraparte",
    precio: "precio_unitario",
    precio_unitario: "precio_unitario",
    ley: "ley_oro",
    pureza: "ley_oro",
    interes: "interes_porcentaje",
    saldo: "saldo_libro",
    observacion: "observaciones",
    observaciones: "observaciones",
    tujo_gr: "tujo_gr",
    mina_gr: "mina_gr",
  };
  return mapa[texto] || texto;
}

function columnaPorClave(key, label) {
  const catalogo = [
    ...COLUMNAS_BASE_LOTE,
    ...COLUMNAS_FALLBACK_LOTE,
    ...Object.values(COLUMNAS_POR_LOTE).flat(),
    { key: "persona", label: "Persona", type: "text", width: "w-44" },
    { key: "responsable", label: "Responsable", type: "text", width: "w-40" },
    { key: "contraparte", label: "Contraparte", type: "text", width: "w-44" },
    { key: "ley_oro", label: "Ley", type: "text", width: "w-24" },
    { key: "interes_porcentaje", label: "Interes %", type: "number", width: "w-24", step: "0.0001" },
    { key: "saldo_a_favor", label: "A favor", type: "number", width: "w-28", step: "0.01" },
    { key: "saldo_en_contra", label: "En contra", type: "number", width: "w-28", step: "0.01" },
    { key: "tujo_gr", label: "Tujo (gr)", type: "number", width: "w-28", step: "0.0001" },
    { key: "mina_gr", label: "Mina (gr)", type: "number", width: "w-28", step: "0.0001" },
  ];
  const encontrada = catalogo.find((columna) => columna.key === key);
  return {
    ...(encontrada || { key, type: "text", width: "w-36" }),
    label: label || encontrada?.label || key,
  };
}

function columnasDesdeDetectadas(columnasDetectadas) {
  if (!Array.isArray(columnasDetectadas) || !columnasDetectadas.length) return [];

  const vistas = new Set();
  return columnasDetectadas
    .map((columna) => {
      const original =
        typeof columna === "string"
          ? columna
          : columna.original || columna.label || columna.key || columna.nombre || columna.titulo;
      const key = normalizarClaveColumna(typeof columna === "string" ? columna : columna.key || original);
      const label = typeof columna === "string" ? columna : columna.label || original || key;
      return columnaPorClave(key, label);
    })
    .filter((columna) => {
      if (!columna.key || vistas.has(columna.key)) return false;
      vistas.add(columna.key);
      return true;
    });
}

function columnaEditableDesdeIa(columna, index) {
  const original =
    typeof columna === "string"
      ? columna
      : columna.original || columna.label || columna.key || columna.nombre || columna.titulo || `Columna ${index + 1}`;
  const key = normalizarClaveColumna(typeof columna === "string" ? original : columna.key || original);
  return {
    key: key || `columna_${index + 1}`,
    label: typeof columna === "string" ? original : columna.label || original,
    original,
    tipo_dato: typeof columna === "string" ? "texto" : columna.tipo_dato || "texto",
    obligatoria: typeof columna === "string" ? false : Boolean(columna.obligatoria),
    descartada: typeof columna === "string" ? false : Boolean(columna.descartada),
    motivo: typeof columna === "string" ? "" : columna.motivo || "",
  };
}

function normalizarEstructuraTabla(estructura, tipoFuente = "auto") {
  const columnas = Array.isArray(estructura?.columnas_detectadas)
    ? estructura.columnas_detectadas.map(columnaEditableDesdeIa)
    : [];

  return {
    tipo_lote_detectado: estructura?.tipo_lote_detectado || tipoFuente,
    confianza_tipo_lote: estructura?.confianza_tipo_lote || "media",
    analisis_tabla: estructura?.analisis_tabla || null,
    columnas_detectadas: columnas,
    columnas_descartadas: Array.isArray(estructura?.columnas_descartadas) ? estructura.columnas_descartadas : [],
    observaciones_pagina: estructura?.observaciones_pagina || "",
  };
}

function camposDinamicosFila(fila, columnasDetectadas = []) {
  const camposReservados = new Set([
    "fila",
    "numero_fila_visual",
    "fecha",
    "fecha_original",
    "detalle",
    "concepto",
    "monto_bs",
    "monto_egreso",
    "monto_ingreso",
    "monto_rendido",
    "numero_recibo",
    "folio",
    "numero_folio",
    "persona",
    "observaciones",
    "rubro",
    "subrubro",
    "responsable",
    "destino",
    "tarea",
    "cantidad",
    "unidad",
    "item",
    "contraparte",
    "precio_unitario",
    "precio_referencia",
    "ley_oro",
    "interes_porcentaje",
    "saldo_libro",
    "saldo_a_favor",
    "saldo_en_contra",
    "tipo_movimiento",
    "confianza",
    "confianza_numerica",
    "dudas",
    "campos_dudosos",
  ]);
  const dinamicos = {};

  columnasDetectadas.forEach((columna) => {
    const original =
      typeof columna === "string"
        ? columna
        : columna.original || columna.label || columna.key || columna.nombre || columna.titulo;
    const key = normalizarClaveColumna(typeof columna === "string" ? columna : columna.key || original);
    if (key && fila[key] !== undefined) dinamicos[key] = fila[key];
  });

  Object.entries(fila).forEach(([key, value]) => {
    const keyNormalizada = normalizarClaveColumna(key);
    if (!keyNormalizada || camposReservados.has(keyNormalizada) || value === undefined) return;
    dinamicos[keyNormalizada] = value;
  });

  return dinamicos;
}

function camposDinamicosParaGuardar(fila, columnasRevision = []) {
  const dinamicos = camposDinamicosFila(fila, columnasRevision);
  return Object.fromEntries(
    Object.entries(dinamicos).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

function resumenCamposDinamicos(fila, columnasRevision = []) {
  const dinamicos = camposDinamicosParaGuardar(fila, columnasRevision);
  const etiquetas = new Map(columnasRevision.map((columna) => [columna.key, columna.label || columna.key]));
  return Object.entries(dinamicos)
    .map(([key, value]) => `${etiquetas.get(key) || key}: ${value}`)
    .join(" | ");
}

function cantidadDesdeFilaExtraida(fila) {
  const directa = opcionalNumero(fila.cantidad);
  if (directa !== null) return directa;

  const cantidadesPorArea = Object.entries(camposDinamicosParaGuardar(fila))
    .filter(([key]) => key.endsWith("_gr") || key.endsWith("_gramos"))
    .map(([, value]) => opcionalNumero(value))
    .filter((value) => value !== null);

  if (!cantidadesPorArea.length) return null;
  return cantidadesPorArea.reduce((total, value) => total + value, 0);
}

function separarNumerosPegadosEnObservaciones(fila, tipoLote) {
  if (tipoLote !== "alzas_produccion") return fila;

  const observaciones = limpiarDatoIa(fila.observaciones);
  const inicioNumerico = observaciones.match(/^([\d\s.,:-]+)(?:\s*\|\s*)?(.*)$/);
  if (!inicioNumerico || !/\d/.test(inicioNumerico[1]) || /[a-z]/i.test(inicioNumerico[1])) return fila;

  const valoresDetectados = inicioNumerico[1].match(/\d+(?:[.,:]\d+)?/g) || [];
  if (!valoresDetectados.length) return fila;

  const camposDudosos = Array.isArray(fila.campos_dudosos) ? fila.campos_dudosos : [];
  const valoresSinUbicar = [
    ...(Array.isArray(fila.valores_sin_ubicar) ? fila.valores_sin_ubicar : []),
    ...valoresDetectados.map((valor) => valor.replace(",", ".").replace(":", ".")),
  ];

  return {
    ...fila,
    observaciones: limpiarDatoIa(inicioNumerico[2]),
    valores_sin_ubicar: valoresSinUbicar,
    campos_dudosos: [...new Set([...camposDudosos, "tujo_gr", "mina_gr", "monto_ingreso"])],
    dudas: [
      fila.dudas,
      `Numeros detectados dentro de Observaciones y separados para revisar: ${valoresSinUbicar.join(", ")}`,
    ]
      .filter(Boolean)
      .join(" | "),
  };
}

function columnasParaLote(tipoLote) {
  const especiales = COLUMNAS_POR_LOTE[tipoLote] || COLUMNAS_FALLBACK_LOTE;
  const combinadas = [...COLUMNAS_BASE_LOTE.slice(0, 2), ...especiales, ...COLUMNAS_BASE_LOTE.slice(2)];
  const vistas = new Set();
  return combinadas.filter((columna) => {
    if (vistas.has(columna.key)) return false;
    vistas.add(columna.key);
    return true;
  });
}

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function mesGestion(fecha) {
  return fecha ? fecha.slice(0, 7) : "sin_mes";
}

function referenciaAlternativa(doc) {
  return [doc.fecha_documento || "s/f", `Folio ${doc.folio || "s/f"}`, moneda(doc.monto_egreso || doc.monto_ingreso)]
    .filter(Boolean)
    .join(" / ");
}

function montoPrincipal(doc) {
  return numero(doc.monto_egreso) || numero(doc.monto_ingreso) || numero(doc.monto_rendido);
}

function textoDocumento(doc) {
  return normalizarTexto(
    [
      doc.tipo_documento,
      doc.tipo_movimiento,
      doc.rubro,
      doc.subrubro,
      doc.categoria,
      doc.concepto,
      doc.item,
      doc.contraparte,
      doc.observaciones,
    ].join(" ")
  );
}

function esPrestamo(doc) {
  const texto = textoDocumento(doc);
  return doc.tipo_documento === "prestamo_cooperativa" || texto.includes("prestamo");
}

function esVentaOro(doc) {
  const texto = textoDocumento(doc);
  return doc.tipo_documento === "ventas_oro" || texto.includes("venta oro") || texto.includes("oro");
}

function necesitaRespaldo(doc) {
  if (doc.requiere_respaldo === false) return false;
  return montoPrincipal(doc) >= UMBRAL_RESPALDO_ALTO || esPrestamo(doc) || esVentaOro(doc);
}

function tieneRespaldoValido(doc, respaldosPorDocumento) {
  const respaldosDoc = respaldosPorDocumento.get(doc.id) || [];
  return respaldosDoc.some(
    (respaldo) =>
      respaldo.resultado_verificacion === "coincide" ||
      respaldo.resultado_verificacion === "requiere_revision" ||
      respaldo.url_archivo
  );
}

function montosIguales(a, b) {
  return Math.abs(montoPrincipal(a) - montoPrincipal(b)) < 0.01;
}

function descripcionCoincidencia(doc) {
  return [
    doc.fecha_documento || "s/f",
    `Rec. ${doc.numero_recibo || "s/n"}`,
    `Folio ${doc.folio || "s/f"}`,
    moneda(montoPrincipal(doc)),
    doc.concepto || "Sin detalle",
  ].join(" | ");
}

function encontrarCoincidenciasDocumento(nuevo, documentos) {
  const recibo = normalizarTexto(nuevo.numero_recibo);
  const folio = normalizarTexto(nuevo.folio);
  const fecha = nuevo.fecha_documento || "";
  const concepto = normalizarTexto(nuevo.concepto);

  return documentos
    .map((doc) => {
      let puntaje = 0;
      const motivos = [];
      const docRecibo = normalizarTexto(doc.numero_recibo);
      const docFolio = normalizarTexto(doc.folio);
      const docConcepto = normalizarTexto(doc.concepto);

      if (fecha && doc.fecha_documento === fecha) {
        puntaje += 2;
        motivos.push("misma fecha");
      }
      if (recibo && docRecibo === recibo) {
        puntaje += 4;
        motivos.push("mismo recibo");
      }
      if (folio && docFolio === folio) {
        puntaje += 3;
        motivos.push("mismo folio");
      }
      if (montosIguales(nuevo, doc) && montoPrincipal(nuevo) > 0) {
        puntaje += 3;
        motivos.push("mismo monto");
      }
      if (concepto && docConcepto && (docConcepto.includes(concepto) || concepto.includes(docConcepto))) {
        puntaje += 2;
        motivos.push("detalle parecido");
      }

      return { doc, puntaje, motivos };
    })
    .filter((item) => item.puntaje >= 7)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, 5);
}

async function calcularSha256Archivo(file) {
  if (!file || !window.crypto?.subtle) return null;
  const buffer = await file.arrayBuffer();
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function insertarConFallback(tabla, payload, camposOpcionales = []) {
  const { error } = await supabase.from(tabla).insert([payload]);
  if (!error) return;

  const textoError = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  const pareceColumnaFaltante =
    textoError.includes("schema cache") ||
    textoError.includes("column") ||
    textoError.includes("could not find");

  if (!pareceColumnaFaltante || !camposOpcionales.length) throw error;

  const payloadCompatible = { ...payload };
  camposOpcionales.forEach((campo) => delete payloadCompatible[campo]);
  const { error: fallbackError } = await supabase.from(tabla).insert([payloadCompatible]);
  if (fallbackError) throw fallbackError;
}

async function insertarMuchosConFallback(tabla, payload, camposOpcionales = []) {
  const { error } = await supabase.from(tabla).insert(payload);
  if (!error) return;

  const textoError = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  const pareceColumnaFaltante =
    textoError.includes("schema cache") ||
    textoError.includes("column") ||
    textoError.includes("could not find");

  if (!pareceColumnaFaltante || !camposOpcionales.length) throw error;

  const payloadCompatible = payload.map((item) => {
    const limpio = { ...item };
    camposOpcionales.forEach((campo) => delete limpio[campo]);
    return limpio;
  });
  const { error: fallbackError } = await supabase.from(tabla).insert(payloadCompatible);
  if (fallbackError) throw fallbackError;
}

function descargarCsv(nombreArchivo, filas) {
  const encabezados = [
    "Tipo",
    "Fecha",
    "Folio",
    "Recibo",
    "Persona",
    "Rubro",
    "Subrubro",
    "Concepto",
    "Ingreso",
    "Egreso",
    "Rendido",
    "Saldo libro",
    "Cantidad",
    "Unidad",
  ];
  const csv = [
    encabezados.join(","),
    ...filas.map((doc) =>
      [
        etiquetaTipo(doc.tipo_documento),
        doc.fecha_documento || "",
        doc.folio || "",
        doc.numero_recibo || "",
        doc.persona || "",
        doc.rubro || "",
        doc.subrubro || "",
        doc.concepto || "",
        doc.monto_ingreso || 0,
        doc.monto_egreso || 0,
        doc.monto_rendido || 0,
        doc.saldo_libro ?? "",
        doc.cantidad ?? "",
        doc.unidad || "",
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

function detectarAnomalias(documentos, respaldos = []) {
  const hallazgos = [];
  const porRecibo = new Map();
  const porFolioMes = new Map();
  const porTipoMes = new Map();
  const respaldosPorDocumento = new Map();

  respaldos.forEach((respaldo) => {
    if (!respaldo.documento_id) return;
    respaldosPorDocumento.set(respaldo.documento_id, [
      ...(respaldosPorDocumento.get(respaldo.documento_id) || []),
      respaldo,
    ]);
  });

  documentos.forEach((doc) => {
    const recibo = (doc.numero_recibo || "").trim().toLowerCase();
    const folio = (doc.folio || "").trim().toLowerCase();
    const ingreso = numero(doc.monto_ingreso);
    const egreso = numero(doc.monto_egreso);
    const rendido = numero(doc.monto_rendido);

    if (!recibo && !folio) {
      hallazgos.push({
        severidad: "alta",
        tipo: "Sin referencia",
        descripcion: `${etiquetaTipo(doc.tipo_documento)} sin folio ni numero de recibo: ${doc.concepto}`,
      });
    } else if (!recibo && folio && doc.fecha_documento) {
      hallazgos.push({
        severidad: "media",
        tipo: "Recibo pendiente de asignar",
        descripcion: `Movimiento del ${fechaLocal(doc.fecha_documento)} con folio ${
          doc.folio
        } no tiene numero de recibo. Usar fecha y folio como guia de busqueda.`,
      });
    }

    if (ingreso > 0 && egreso > 0) {
      hallazgos.push({
        severidad: "media",
        tipo: "Ingreso y egreso en el mismo documento",
        descripcion: `Revisar recibo ${doc.numero_recibo || "s/n"}: tiene ingreso ${moneda(
          ingreso
        )} y egreso ${moneda(egreso)}.`,
      });
    }

    if (ingreso === 0 && egreso === 0 && rendido === 0 && !doc.cantidad) {
      hallazgos.push({
        severidad: "media",
        tipo: "Sin importe ni cantidad",
        descripcion: `${etiquetaTipo(doc.tipo_documento)} folio ${doc.folio || "s/f"} no tiene monto ni cantidad.`,
      });
    }

    if (necesitaRespaldo(doc) && !tieneRespaldoValido(doc, respaldosPorDocumento)) {
      hallazgos.push({
        severidad: montoPrincipal(doc) >= UMBRAL_RESPALDO_ALTO || esVentaOro(doc) ? "alta" : "media",
        tipo: "Falta respaldo fisico",
        descripcion: `${referenciaAlternativa(doc)} necesita foto de recibo, factura, nota o respaldo original para comprobar ${doc.concepto}.`,
      });
    }

    (respaldosPorDocumento.get(doc.id) || []).forEach((respaldo) => {
      const resultado = respaldo.resultado_verificacion || "pendiente";
      if (!["coincide", "pendiente", "requiere_revision"].includes(resultado)) {
        hallazgos.push({
          severidad: "alta",
          tipo: "Respaldo no cuadra",
          descripcion: `El respaldo de ${referenciaAlternativa(doc)} quedo como "${resultado}". Revisar imagen original y movimiento.`,
        });
      }
      if (Array.isArray(respaldo.diferencias) && respaldo.diferencias.length) {
        hallazgos.push({
          severidad: resultado === "requiere_revision" ? "media" : "alta",
          tipo: "Diferencias en respaldo",
          descripcion: `El respaldo de ${referenciaAlternativa(doc)} tiene diferencias: ${respaldo.diferencias
            .map((dif) => dif.detalle || dif.campo)
            .filter(Boolean)
            .slice(0, 3)
            .join("; ")}.`,
        });
      }
    });

    if (doc.tipo_documento === "entrega_cuenta_rendicion" && egreso > 0 && rendido > 0) {
      const diferencia = egreso - rendido;
      if (Math.abs(diferencia) > 0.01) {
        hallazgos.push({
          severidad: "alta",
          tipo: "Rendicion descuadrada",
          descripcion: `${doc.persona || "Responsable"} recibio ${moneda(egreso)} y rindio ${moneda(
            rendido
          )}. Diferencia: ${moneda(diferencia)}.`,
        });
      }
    }

    if (esPrestamo(doc)) {
      if (!doc.contraparte && !doc.persona) {
        hallazgos.push({
          severidad: "media",
          tipo: "Prestamo sin acreedor claro",
          descripcion: `${referenciaAlternativa(doc)} no indica claramente quien presto el dinero u oro.`,
        });
      }
      if (!doc.justificacion_prestamo && !normalizarTexto(doc.observaciones).includes("justific")) {
        hallazgos.push({
          severidad: "media",
          tipo: "Prestamo sin justificacion",
          descripcion: `${referenciaAlternativa(doc)} es prestamo, pero no explica para que se pidio ni por que era necesario.`,
        });
      }
      if (numero(doc.interes_porcentaje) > 5) {
        hallazgos.push({
          severidad: "alta",
          tipo: "Interes alto",
          descripcion: `${referenciaAlternativa(doc)} registra interes de ${doc.interes_porcentaje}%. Revisar acuerdo aprobado y respaldo.`,
        });
      }
    }

    if (esVentaOro(doc)) {
      const cantidad = numero(doc.cantidad);
      const ingresoVenta = ingreso || numero(doc.monto_ingreso);
      const precioUnitario = numero(doc.precio_unitario) || (cantidad > 0 ? ingresoVenta / cantidad : 0);
      const precioReferencia = numero(doc.precio_referencia);

      if (cantidad <= 0) {
        hallazgos.push({
          severidad: "alta",
          tipo: "Venta de oro sin peso",
          descripcion: `${referenciaAlternativa(doc)} parece venta de oro, pero no tiene cantidad/peso registrado.`,
        });
      }
      if (!doc.contraparte && !doc.persona) {
        hallazgos.push({
          severidad: "media",
          tipo: "Venta de oro sin comprador",
          descripcion: `${referenciaAlternativa(doc)} no indica comprador o contraparte.`,
        });
      }
      if (precioUnitario <= 0) {
        hallazgos.push({
          severidad: "media",
          tipo: "Venta de oro sin precio unitario",
          descripcion: `${referenciaAlternativa(doc)} no permite saber a cuanto se vendio cada unidad de oro.`,
        });
      }
      if (precioReferencia > 0 && precioUnitario > 0) {
        const diferenciaPorcentaje = ((precioUnitario - precioReferencia) / precioReferencia) * 100;
        if (diferenciaPorcentaje < -TOLERANCIA_PRECIO_ORO_ALTA) {
          hallazgos.push({
            severidad: "alta",
            tipo: "Precio de oro bajo",
            descripcion: `${referenciaAlternativa(doc)} se vendio a ${moneda(precioUnitario)} por unidad, ${Math.abs(
              diferenciaPorcentaje
            ).toFixed(2)}% por debajo de la referencia ${moneda(precioReferencia)}.`,
          });
        } else if (diferenciaPorcentaje < -TOLERANCIA_PRECIO_ORO_MEDIA) {
          hallazgos.push({
            severidad: "media",
            tipo: "Precio de oro por revisar",
            descripcion: `${referenciaAlternativa(doc)} esta ${Math.abs(diferenciaPorcentaje).toFixed(
              2
            )}% por debajo de la referencia cargada.`,
          });
        }
      }
    }

    if (recibo) {
      porRecibo.set(recibo, [...(porRecibo.get(recibo) || []), doc]);
    }
    if (folio) {
      const clave = `${doc.tipo_documento}:${mesGestion(doc.fecha_documento)}:${folio}`;
      porFolioMes.set(clave, [...(porFolioMes.get(clave) || []), doc]);
    }
    const reciboNumero = Number.parseInt(recibo, 10);
    if (Number.isInteger(reciboNumero) && reciboNumero > 0) {
      const claveTipoMes = `${doc.tipo_documento}:${mesGestion(doc.fecha_documento)}`;
      porTipoMes.set(claveTipoMes, [...(porTipoMes.get(claveTipoMes) || []), reciboNumero]);
    }
  });

  porRecibo.forEach((items, recibo) => {
    if (items.length <= 1 || recibo === "s/n" || recibo === "sn") return;

    const porFechaFolio = new Map();
    const porContenido = new Map();

    items.forEach((doc) => {
      const claveFechaFolio = `${doc.fecha_documento || "sin_fecha"}:${doc.folio || "sin_folio"}`;
      const claveContenido = `${normalizarTexto(doc.concepto)}:${numero(doc.monto_ingreso)}:${numero(
        doc.monto_egreso
      )}`;
      porFechaFolio.set(claveFechaFolio, [...(porFechaFolio.get(claveFechaFolio) || []), doc]);
      porContenido.set(claveContenido, [...(porContenido.get(claveContenido) || []), doc]);
    });

    porFechaFolio.forEach((grupo) => {
      if (grupo.length > 1) {
        hallazgos.push({
          severidad: "alta",
          tipo: "Recibo repetido con misma fecha y folio",
          descripcion: `Recibo ${recibo} aparece ${grupo.length} veces con fecha ${
            grupo[0].fecha_documento || "s/f"
          } y folio ${grupo[0].folio || "s/f"}.`,
        });
      }
    });

    porContenido.forEach((grupo) => {
      if (grupo.length > 1) {
        hallazgos.push({
          severidad: "media",
          tipo: "Recibo repetido con mismo contenido",
          descripcion: `Recibo ${recibo} aparece ${grupo.length} veces con detalle y monto similares: ${
            grupo[0].concepto
          }.`,
        });
      }
    });
  });

  porFolioMes.forEach((items) => {
    if (items.length <= 1) return;

    const conMismoContenido = new Map();
    items.forEach((doc) => {
      const clave = `${normalizarTexto(doc.concepto)}:${numero(doc.monto_ingreso)}:${numero(
        doc.monto_egreso
      )}`;
      conMismoContenido.set(clave, [...(conMismoContenido.get(clave) || []), doc]);
    });

    conMismoContenido.forEach((grupo) => {
      if (grupo.length > 1) {
        hallazgos.push({
          severidad: "media",
          tipo: "Folio mensual con contenido repetido",
          descripcion: `Folio ${grupo[0].folio} del mes ${mesGestion(
            grupo[0].fecha_documento
          )} tiene ${grupo.length} movimientos con detalle y monto similares.`,
        });
      }
    });
  });

  porTipoMes.forEach((numeros, clave) => {
    const unicos = [...new Set(numeros)].sort((a, b) => a - b);
    if (unicos.length < 5) return;

    const saltos = [];
    for (let i = 1; i < unicos.length; i += 1) {
      const diferencia = unicos[i] - unicos[i - 1];
      if (diferencia > 10) saltos.push(`${unicos[i - 1]} a ${unicos[i]}`);
    }

    if (saltos.length) {
      hallazgos.push({
        severidad: "media",
        tipo: "Saltos en recibos",
        descripcion: `${clave.replaceAll(":", " / ")} tiene saltos grandes en numeracion: ${saltos
          .slice(0, 4)
          .join(", ")}. Revisar si faltan hojas o recibos no cargados.`,
      });
    }
  });

  const ordenados = [...documentos].sort((a, b) => {
    const fechaA = a.fecha_documento || "9999-12-31";
    const fechaB = b.fecha_documento || "9999-12-31";
    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
    return String(a.created_at || "").localeCompare(String(b.created_at || ""));
  });

  let saldoCaja = 0;
  let cajaReconstruible = ordenados.some((doc) => numero(doc.monto_ingreso) > 0 || opcionalNumero(doc.saldo_caja_antes) !== null);
  let cajaNegativaReportada = false;
  if (!cajaReconstruible && ordenados.some((doc) => numero(doc.monto_egreso) > 0)) {
    hallazgos.push({
      severidad: "media",
      tipo: "Caja incompleta",
      descripcion:
        "Hay egresos cargados, pero faltan ingresos o saldo inicial para saber si la caja tenia efectivo suficiente.",
    });
  }

  ordenados.forEach((doc) => {
    const ingreso = numero(doc.monto_ingreso);
    const egreso = numero(doc.monto_egreso);
    const saldoInformado = opcionalNumero(doc.saldo_caja_antes);
    if (saldoInformado !== null) {
      saldoCaja = saldoInformado;
      cajaReconstruible = true;
    }
    const saldoAntes = saldoCaja;

    if (esPrestamo(doc) && ingreso > 0) {
      const saldoParaEvaluar = saldoInformado ?? saldoAntes;
      if (saldoParaEvaluar >= ingreso || saldoParaEvaluar >= UMBRAL_CAJA_PRESTAMO_INNECESARIO) {
        hallazgos.push({
          severidad: "alta",
          tipo: "Prestamo posiblemente innecesario",
          descripcion: `${referenciaAlternativa(doc)} pidio prestamo por ${moneda(
            ingreso
          )}, pero la caja antes figuraba con ${moneda(
            saldoParaEvaluar
          )}. Revisar si habia deuda urgente, compra aprobada o motivo real.`,
        });
      }
    }

    saldoCaja += ingreso - egreso;

    if (cajaReconstruible && saldoCaja < -0.01 && !cajaNegativaReportada) {
      cajaNegativaReportada = true;
      hallazgos.push({
        severidad: "alta",
        tipo: "Caja negativa",
        descripcion: `Despues de ${referenciaAlternativa(doc)} la caja calculada queda en ${moneda(
          saldoCaja
        )}. Falta ingreso, saldo inicial o hay egreso mal registrado.`,
      });
    }
  });

  porFolioMes.forEach((items) => {
    const fechas = new Set(items.map((item) => item.fecha_documento || ""));
    if (items.length > 1 && fechas.size === 1) {
      const recibos = new Set(items.map((item) => item.numero_recibo || ""));
      if (recibos.size === 1 && !recibos.has("")) {
        hallazgos.push({
          severidad: "alta",
          tipo: "Mismo folio, fecha y recibo",
          descripcion: `Folio ${items[0].folio} del ${fechaLocal(items[0].fecha_documento)} repite el recibo ${
            items[0].numero_recibo
          }.`,
        });
      }
    }
  });

  const alzas = documentos
    .filter((doc) => doc.tipo_documento === "alzas_produccion")
    .reduce((total, doc) => total + numero(doc.cantidad), 0);
  const ventas = documentos
    .filter((doc) => doc.tipo_documento === "ventas_oro")
    .reduce((total, doc) => total + numero(doc.cantidad), 0);

  if (alzas > 0 && ventas > 0 && Math.abs(alzas - ventas) > 0.0001) {
    hallazgos.push({
      severidad: "media",
      tipo: "Produccion vs ventas",
      descripcion: `Cantidad registrada en alzas: ${alzas}. Cantidad vendida: ${ventas}. Revisar unidad y mermas.`,
    });
  }

  return hallazgos;
}

export default function ComisionRevisoraPage() {
  const [gestiones, setGestiones] = useState([]);
  const [gestionSeleccionada, setGestionSeleccionada] = useState("");
  const [documentos, setDocumentos] = useState([]);
  const [respaldos, setRespaldos] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [revisionDocumento, setRevisionDocumento] = useState(null);
  const [permitirDuplicadoDocumento, setPermitirDuplicadoDocumento] = useState(false);
  const [filasExtraidas, setFilasExtraidas] = useState([]);
  const [guardarDuplicadosTabla, setGuardarDuplicadosTabla] = useState(false);
  const [fotosTabla, setFotosTabla] = useState([]);
  const [tipoFuenteTabla, setTipoFuenteTabla] = useState("auto");
  const [orientacionTabla, setOrientacionTabla] = useState("auto");
  const [estructuraTabla, setEstructuraTabla] = useState(null);
  const [loteTablaDetectado, setLoteTablaDetectado] = useState(null);
  const [respaldoForm, setRespaldoForm] = useState(RESPALDO_INICIAL);
  const [fotoRespaldo, setFotoRespaldo] = useState(null);
  const [nuevaGestion, setNuevaGestion] = useState({
    gestion: "2019",
    nombre: "Comision revisora gestion 2019",
    observaciones: "",
  });
  const [foto, setFoto] = useState(null);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [guardando, setGuardando] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [analizandoEstructura, setAnalizandoEstructura] = useState(false);
  const [analizandoTabla, setAnalizandoTabla] = useState(false);
  const [verificandoRespaldo, setVerificandoRespaldo] = useState(false);

  const obtenerGestiones = useCallback(async () => {
    const { data, error } = await supabase
      .from("comision_gestiones")
      .select("*")
      .order("gestion", { ascending: false });

    if (error) {
      setMensaje({
        texto: `Falta ejecutar docs/supabase-comision-revisora.sql o revisar permisos: ${error.message}`,
        tipo: "error",
      });
      return;
    }

    setGestiones(data || []);
    setGestionSeleccionada((actual) => actual || data?.[0]?.id || "");
  }, []);

  const obtenerDocumentos = useCallback(async (gestionId) => {
    if (!gestionId) {
      setDocumentos([]);
      return;
    }

    const { data, error } = await supabase
      .from("comision_documentos")
      .select("*")
      .eq("gestion_id", gestionId)
      .order("fecha_documento", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      setMensaje({ texto: `No se pudieron cargar documentos: ${error.message}`, tipo: "error" });
      return;
    }

    setDocumentos(data || []);
  }, []);

  const obtenerRespaldos = useCallback(async (gestionId) => {
    if (!gestionId) {
      setRespaldos([]);
      return;
    }

    const { data, error } = await supabase
      .from("comision_respaldos")
      .select("*")
      .eq("gestion_id", gestionId)
      .order("created_at", { ascending: false });

    if (error) {
      setRespaldos([]);
      return;
    }

    setRespaldos(data || []);
  }, []);

  useEffect(() => {
    obtenerGestiones();
  }, [obtenerGestiones]);

  useEffect(() => {
    obtenerDocumentos(gestionSeleccionada);
    obtenerRespaldos(gestionSeleccionada);
  }, [gestionSeleccionada, obtenerDocumentos, obtenerRespaldos]);

  const resumen = useMemo(() => {
    const ingresos = documentos.reduce((total, doc) => total + numero(doc.monto_ingreso), 0);
    const egresos = documentos.reduce((total, doc) => total + numero(doc.monto_egreso), 0);
    const rendido = documentos.reduce((total, doc) => total + numero(doc.monto_rendido), 0);
    const prestamos = documentos
      .filter((doc) => esPrestamo(doc))
      .reduce((total, doc) => total + montoPrincipal(doc), 0);
    const ventasOro = documentos
      .filter((doc) => esVentaOro(doc))
      .reduce((total, doc) => total + numero(doc.monto_ingreso), 0);
    const respaldosPorDocumento = new Set(respaldos.map((respaldo) => respaldo.documento_id).filter(Boolean));
    const sinRespaldo = documentos.filter(
      (doc) => necesitaRespaldo(doc) && !respaldosPorDocumento.has(doc.id)
    ).length;

    return {
      ingresos,
      egresos,
      rendido,
      saldoCaja: ingresos - egresos,
      documentos: documentos.length,
      respaldos: respaldos.length,
      prestamos,
      ventasOro,
      sinRespaldo,
    };
  }, [documentos, respaldos]);

  const anomalias = useMemo(() => detectarAnomalias(documentos, respaldos), [documentos, respaldos]);
  const alertasAltas = useMemo(
    () => anomalias.filter((anomalia) => anomalia.severidad === "alta").length,
    [anomalias]
  );

  const avisosRevisionDocumento = useMemo(() => {
    if (!revisionDocumento) return [];

    const avisos = [];
    const montoTotal = numero(form.monto_ingreso) + numero(form.monto_egreso) + numero(form.monto_rendido);

    if (!form.concepto.trim()) avisos.push("Falta concepto o detalle del documento.");
    if (montoTotal <= 0 && form.tipo_movimiento !== "neutro") {
      avisos.push("Falta monto en ingreso, egreso o rendido.");
    }
    if (!form.numero_recibo.trim() && !form.folio.trim()) {
      avisos.push("No hay numero de recibo ni folio. Usa fecha, concepto y monto como guia.");
    }
    if (revisionDocumento.camposDudosos.length) {
      avisos.push(`Campos dudosos marcados por IA: ${revisionDocumento.camposDudosos.join(", ")}.`);
    }
    if (revisionDocumento.confianzaTexto === "baja") {
      avisos.push("La IA marco confianza baja. Conviene revisar con mas cuidado antes de guardar.");
    }

    return avisos;
  }, [form, revisionDocumento]);

  const correccionesRevisionDocumento = useMemo(() => {
    if (!revisionDocumento) return [];

    return CAMPOS_REVISION_DOCUMENTO.filter((campo) => {
      const original = revisionDocumento.original[campo.key] ?? "";
      const actual = form[campo.key] ?? "";
      return String(original).trim() !== String(actual).trim();
    }).map((campo) => ({
      ...campo,
      original: revisionDocumento.original[campo.key] ?? "",
      actual: form[campo.key] ?? "",
    }));
  }, [form, revisionDocumento]);

  const coincidenciasDocumentoActual = useMemo(
    () => (revisionDocumento ? encontrarCoincidenciasDocumento(form, documentos) : []),
    [documentos, form, revisionDocumento]
  );

  const filasConDuplicados = useMemo(
    () =>
      filasExtraidas.map((fila) => ({
        ...fila,
        coincidencias: encontrarCoincidenciasDocumento(fila, documentos),
      })),
    [documentos, filasExtraidas]
  );

  const filasDuplicadas = useMemo(
    () => filasConDuplicados.filter((fila) => fila.coincidencias.length),
    [filasConDuplicados]
  );

  const filasNuevas = useMemo(
    () => filasConDuplicados.filter((fila) => !fila.coincidencias.length),
    [filasConDuplicados]
  );

  const tipoLoteRevision = loteTablaDetectado?.tipo_lote_detectado || tipoFuenteTabla;
  const columnasRevisionLote = useMemo(() => {
    const columnasDetectadas = columnasDesdeDetectadas(loteTablaDetectado?.columnas_detectadas);
    return columnasDetectadas.length ? columnasDetectadas : columnasParaLote(tipoLoteRevision);
  }, [loteTablaDetectado?.columnas_detectadas, tipoLoteRevision]);

  const archivoABase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });

  const imagenRotadaABase64 = (file, grados) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const normalizado = ((grados % 360) + 360) % 360;
          const canvas = document.createElement("canvas");
          const contexto = canvas.getContext("2d");
          const cambiaDimension = normalizado === 90 || normalizado === 270;

          canvas.width = cambiaDimension ? image.height : image.width;
          canvas.height = cambiaDimension ? image.width : image.height;

          contexto.translate(canvas.width / 2, canvas.height / 2);
          contexto.rotate((normalizado * Math.PI) / 180);
          contexto.drawImage(image, -image.width / 2, -image.height / 2);

          resolve(canvas.toDataURL("image/jpeg", 0.92).split(",")[1]);
        };
        image.onerror = reject;
        image.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const orientacionDesdeEstructura = (estructura) => {
    if (orientacionTabla !== "auto") return orientacionTabla;

    const version = normalizarTexto(estructura?.analisis_tabla?.version_elegida);
    if (version.includes("180")) return "rotar_180";
    if (version.includes("izquierda") || version.includes("left") || version.includes("270")) {
      return "rotar_90_izquierda";
    }
    if (version.includes("derecha") || version.includes("right")) {
      return "rotar_90_derecha";
    }
    return "normal";
  };

  const prepararImagenesTabla = async (file, orientacion = orientacionTabla, etapa = "estructura") => {
    if (orientacion === "normal") {
      return [{ imagenBase64: await archivoABase64(file), mimeType: file.type }];
    }
    if (orientacion === "rotar_180") {
      return [{ imagenBase64: await imagenRotadaABase64(file, 180), mimeType: "image/jpeg" }];
    }
    if (orientacion === "rotar_90_derecha") {
      return [{ imagenBase64: await imagenRotadaABase64(file, 90), mimeType: "image/jpeg" }];
    }
    if (orientacion === "rotar_90_izquierda") {
      return [{ imagenBase64: await imagenRotadaABase64(file, 270), mimeType: "image/jpeg" }];
    }

    if (etapa === "extraccion") {
      return [{ imagenBase64: await archivoABase64(file), mimeType: file.type }];
    }

    return [
      { imagenBase64: await archivoABase64(file), mimeType: file.type },
      { imagenBase64: await imagenRotadaABase64(file, 180), mimeType: "image/jpeg" },
      { imagenBase64: await imagenRotadaABase64(file, 90), mimeType: "image/jpeg" },
      { imagenBase64: await imagenRotadaABase64(file, 270), mimeType: "image/jpeg" },
    ];
  };

  const crearGestion = async (e) => {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });

    const { data, error } = await supabase
      .from("comision_gestiones")
      .insert([
        {
          gestion: Number(nuevaGestion.gestion),
          nombre: nuevaGestion.nombre,
          observaciones: nuevaGestion.observaciones,
        },
      ])
      .select("*")
      .single();

    if (error) {
      setMensaje({ texto: `No se pudo crear la gestion: ${error.message}`, tipo: "error" });
      return;
    }

    setGestiones((actual) => [data, ...actual]);
    setGestionSeleccionada(data.id);
    setMensaje({ texto: "Gestion de comision revisora creada.", tipo: "exito" });
  };

  const analizarConIA = async () => {
    if (!foto) {
      setMensaje({ texto: "Primero selecciona una foto del documento.", tipo: "advertencia" });
      return;
    }

    setAnalizando(true);
    setMensaje({ texto: "La IA esta leyendo folios, recibos y montos...", tipo: "info" });

    try {
      const base64Data = await archivoABase64(foto);
      const res = await fetch("/api/comision-revisora/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenBase64: base64Data, mimeType: foto.type }),
      });
      const resultado = await res.json();
      if (resultado.error) throw new Error(resultado.error);

      const confianzaTexto =
        typeof resultado.confianza === "string" ? resultado.confianza.trim().toLowerCase() : "";
      const siguienteForm = {
        ...form,
        fuente: "foto_ia",
        tipo_documento: limpiarDatoIa(resultado.tipo_documento) || form.tipo_documento,
        tipo_movimiento: limpiarDatoIa(resultado.tipo_movimiento) || form.tipo_movimiento,
        fecha_documento: limpiarDatoIa(resultado.fecha_documento) || form.fecha_documento,
        folio: limpiarDatoIa(resultado.folio) || form.folio,
        numero_recibo: limpiarDatoIa(resultado.numero_recibo) || form.numero_recibo,
        persona: limpiarDatoIa(resultado.persona) || form.persona,
        concepto: limpiarDatoIa(resultado.concepto) || form.concepto,
        categoria: limpiarDatoIa(resultado.categoria) || form.categoria,
        rubro: limpiarDatoIa(resultado.rubro) || form.rubro,
        subrubro: limpiarDatoIa(resultado.subrubro) || form.subrubro,
        responsable: limpiarDatoIa(resultado.responsable) || form.responsable,
        destino: limpiarDatoIa(resultado.destino) || form.destino,
        tarea: limpiarDatoIa(resultado.tarea) || form.tarea,
        monto_ingreso: resultado.monto_ingreso ?? form.monto_ingreso,
        monto_egreso: resultado.monto_egreso ?? form.monto_egreso,
        monto_rendido: resultado.monto_rendido ?? form.monto_rendido,
        saldo_libro: resultado.saldo_libro ?? form.saldo_libro,
        cantidad: resultado.cantidad ?? form.cantidad,
        unidad: limpiarDatoIa(resultado.unidad) || form.unidad,
        item: limpiarDatoIa(resultado.item) || form.item,
        contraparte: limpiarDatoIa(resultado.contraparte) || form.contraparte,
        interes_porcentaje: resultado.interes_porcentaje ?? form.interes_porcentaje,
        precio_unitario: resultado.precio_unitario ?? form.precio_unitario,
        precio_referencia: resultado.precio_referencia ?? form.precio_referencia,
        diferencia_precio: resultado.diferencia_precio ?? form.diferencia_precio,
        porcentaje_diferencia_precio:
          resultado.porcentaje_diferencia_precio ?? form.porcentaje_diferencia_precio,
        ley_oro: limpiarDatoIa(resultado.ley_oro) || form.ley_oro,
        moneda: limpiarDatoIa(resultado.moneda) || form.moneda,
        tipo_cambio: resultado.tipo_cambio ?? form.tipo_cambio,
        saldo_caja_antes: resultado.saldo_caja_antes ?? form.saldo_caja_antes,
        justificacion_prestamo: limpiarDatoIa(resultado.justificacion_prestamo) || form.justificacion_prestamo,
        requiere_respaldo:
          typeof resultado.requiere_respaldo === "boolean"
            ? resultado.requiere_respaldo
            : form.requiere_respaldo,
        saldo_a_favor: resultado.saldo_a_favor ?? form.saldo_a_favor,
        saldo_en_contra: resultado.saldo_en_contra ?? form.saldo_en_contra,
        texto_extraido: limpiarDatoIa(resultado.texto_extraido) || form.texto_extraido,
        confianza: confianzaIaANumero(resultado.confianza, resultado.confianza_numerica) ?? form.confianza,
        observaciones: [
          limpiarDatoIa(resultado.observaciones),
          confianzaTexto ? `Confianza IA: ${confianzaTexto}` : "",
          Array.isArray(resultado.campos_dudosos) && resultado.campos_dudosos.length
            ? `Campos dudosos: ${resultado.campos_dudosos.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" | ") || form.observaciones,
      };

      setForm(siguienteForm);
      setRevisionDocumento({
        original: siguienteForm,
        camposDudosos: Array.isArray(resultado.campos_dudosos) ? resultado.campos_dudosos : [],
        confianzaTexto,
        revisado: false,
        coincidencias: encontrarCoincidenciasDocumento(siguienteForm, documentos),
        resultadoBruto: resultado,
      });
      setPermitirDuplicadoDocumento(false);

      setMensaje({ texto: "Documento leido. Corrige y confirma la revision antes de guardar.", tipo: "exito" });
    } catch (error) {
      setMensaje({ texto: `La IA no pudo leer el documento: ${error.message}`, tipo: "error" });
    } finally {
      setAnalizando(false);
    }
  };

  const guardarDocumento = async (e) => {
    e.preventDefault();

    if (!gestionSeleccionada) {
      setMensaje({ texto: "Primero crea o selecciona una gestion.", tipo: "advertencia" });
      return;
    }

    if (revisionDocumento && !revisionDocumento.revisado) {
      setMensaje({
        texto: "Primero confirma la revision de la lectura IA antes de guardar.",
        tipo: "advertencia",
      });
      return;
    }

    if (coincidenciasDocumentoActual.length && !permitirDuplicadoDocumento) {
      setMensaje({
        texto: "Este documento parece ya cargado. Revisa las coincidencias o marca guardar como duplicado justificado.",
        tipo: "advertencia",
      });
      return;
    }

    if (!form.concepto.trim()) {
      setMensaje({ texto: "El concepto es obligatorio.", tipo: "advertencia" });
      return;
    }

    setGuardando(true);
    setMensaje({ texto: "", tipo: "" });

    try {
      let urlImagen = null;
      if (foto) {
        const nombreArchivo = `${gestionSeleccionada}/${Date.now()}_${foto.name.replace(/\s+/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("comision-revisora")
          .upload(nombreArchivo, foto);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("comision-revisora")
          .getPublicUrl(nombreArchivo);
        urlImagen = urlData.publicUrl;
      }

      const payload = {
        gestion_id: gestionSeleccionada,
        tipo_documento: form.tipo_documento,
        tipo_movimiento: form.tipo_movimiento,
        fuente: foto ? form.fuente : "manual",
        fecha_documento: form.fecha_documento || null,
        folio: form.folio.trim() || null,
        numero_recibo: form.numero_recibo.trim() || null,
        persona: form.persona.trim() || null,
        concepto: form.concepto.trim(),
        categoria: form.categoria.trim() || null,
        rubro: form.rubro.trim() || null,
        subrubro: form.subrubro.trim() || null,
        responsable: form.responsable.trim() || null,
        destino: form.destino.trim() || null,
        tarea: form.tarea.trim() || null,
        monto_ingreso: numero(form.monto_ingreso),
        monto_egreso: numero(form.monto_egreso),
        monto_rendido: numero(form.monto_rendido),
        saldo_libro: opcionalNumero(form.saldo_libro),
        cantidad: opcionalNumero(form.cantidad),
        unidad: form.unidad.trim() || null,
        item: form.item.trim() || null,
        contraparte: form.contraparte.trim() || null,
        interes_porcentaje: opcionalNumero(form.interes_porcentaje),
        precio_unitario: opcionalNumero(form.precio_unitario),
        precio_referencia: opcionalNumero(form.precio_referencia),
        diferencia_precio: opcionalNumero(form.diferencia_precio),
        porcentaje_diferencia_precio: opcionalNumero(form.porcentaje_diferencia_precio),
        ley_oro: form.ley_oro.trim() || null,
        moneda: form.moneda.trim() || "BOB",
        tipo_cambio: opcionalNumero(form.tipo_cambio),
        saldo_caja_antes: opcionalNumero(form.saldo_caja_antes),
        justificacion_prestamo: form.justificacion_prestamo.trim() || null,
        requiere_respaldo: Boolean(form.requiere_respaldo),
        saldo_a_favor: numero(form.saldo_a_favor),
        saldo_en_contra: numero(form.saldo_en_contra),
        url_imagen: urlImagen,
        texto_extraido: form.texto_extraido.trim() || null,
        confianza: opcionalNumero(form.confianza),
        observaciones: form.observaciones.trim() || null,
      };

      await insertarConFallback("comision_documentos", payload, [
        "precio_unitario",
        "precio_referencia",
        "diferencia_precio",
        "porcentaje_diferencia_precio",
        "ley_oro",
        "moneda",
        "tipo_cambio",
        "saldo_caja_antes",
        "justificacion_prestamo",
        "requiere_respaldo",
      ]);

      setForm(FORM_INICIAL);
      setFoto(null);
      setRevisionDocumento(null);
      setPermitirDuplicadoDocumento(false);
      await obtenerDocumentos(gestionSeleccionada);
      setMensaje({ texto: "Documento registrado para cruce y revision.", tipo: "exito" });
    } catch (error) {
      setMensaje({ texto: `No se pudo guardar: ${error.message}`, tipo: "error" });
    } finally {
      setGuardando(false);
    }
  };

  const aplicarResultadoTabla = (resultado, estructuraBase = null) => {
    const estructuraNormalizada = estructuraBase || normalizarEstructuraTabla(resultado, tipoFuenteTabla);
    const columnasDetectadas = Array.isArray(resultado.columnas_detectadas) && resultado.columnas_detectadas.length
      ? resultado.columnas_detectadas
      : estructuraNormalizada.columnas_detectadas || [];
    const tipoDetectado =
      resultado.tipo_lote_detectado && resultado.tipo_lote_detectado !== "auto"
        ? resultado.tipo_lote_detectado
        : estructuraNormalizada.tipo_lote_detectado || resultado.tipo_documento || tipoFuenteTabla;
    const tipoParaFilas = tipoFuenteTabla === "auto" ? tipoDetectado : tipoFuenteTabla;
    const tipoDocumentoBase = tipoDocumentoDesdeLote(tipoParaFilas);
    const movimientoBase = movimientoDesdeLote(tipoParaFilas);

    setLoteTablaDetectado({
      tipo_lote_solicitado: resultado.tipo_lote_solicitado || tipoFuenteTabla,
      tipo_lote_detectado: tipoParaFilas,
      confianza_tipo_lote: resultado.confianza_tipo_lote || estructuraNormalizada.confianza_tipo_lote || "media",
      columnas_detectadas: columnasDetectadas,
      titulo: resultado.titulo || "",
      analisis_tabla: resultado.analisis_tabla || estructuraNormalizada.analisis_tabla || null,
      resumen: resultado.resumen || null,
      observaciones:
        resultado.observaciones_pagina ||
        resultado.resumen?.observaciones_generales ||
        estructuraNormalizada.observaciones_pagina ||
        "",
    });

    setFilasExtraidas(
      (resultado.filas || []).map((filaOriginal, index) => {
        const fila = separarNumerosPegadosEnObservaciones(filaOriginal, tipoParaFilas);

        return {
          ...camposDinamicosFila(fila, columnasDetectadas),
          id_temporal: `${Date.now()}-${index}`,
          tipo_lote: tipoParaFilas,
          tipo_documento: fila.tipo_documento || tipoDocumentoBase,
          tipo_movimiento: fila.tipo_movimiento || movimientoBase,
          fecha_documento: limpiarDatoIa(fila.fecha_documento || fila.fecha),
          folio: limpiarDatoIa(fila.folio || fila.numero_folio),
          numero_recibo: limpiarDatoIa(fila.numero_recibo),
          persona: limpiarDatoIa(fila.responsable || fila.persona),
          concepto: limpiarDatoIa(fila.concepto || fila.detalle),
          rubro: limpiarDatoIa(rubroDesdeLote(tipoParaFilas, fila)),
          subrubro: limpiarDatoIa(fila.subrubro),
          responsable: limpiarDatoIa(fila.responsable),
          destino: limpiarDatoIa(fila.destino),
          tarea: limpiarDatoIa(fila.tarea),
          monto_ingreso:
            fila.monto_ingreso ?? (movimientoBase === "ingreso" ? fila.monto_bs ?? fila.monto_total ?? "" : ""),
          monto_egreso:
            fila.monto_egreso ?? (movimientoBase === "egreso" ? fila.monto_bs ?? fila.monto_total ?? "" : ""),
          monto_rendido: fila.monto_rendido ?? "",
          saldo_libro: fila.saldo_libro ?? "",
          cantidad: fila.cantidad ?? "",
          unidad: limpiarDatoIa(fila.unidad),
          item: limpiarDatoIa(fila.item),
          contraparte: limpiarDatoIa(fila.contraparte || fila.comprador || fila.acreedor || fila.deudor),
          precio_unitario: fila.precio_unitario ?? "",
          precio_referencia: fila.precio_referencia ?? "",
          ley_oro: limpiarDatoIa(fila.ley_oro),
          interes_porcentaje: fila.interes_porcentaje ?? "",
          saldo_a_favor: fila.saldo_a_favor ?? "",
          saldo_en_contra: fila.saldo_en_contra ?? "",
          observaciones: [
            fila.observaciones,
            Array.isArray(fila.valores_sin_ubicar) && fila.valores_sin_ubicar.length
              ? `Valores sin ubicar: ${fila.valores_sin_ubicar.join(", ")}`
              : "",
            fila.dudas,
            resultado.tipo_lote_detectado ? `Tipo lote IA: ${etiquetaLote(tipoParaFilas)}` : "",
            fila.confianza && typeof fila.confianza === "string" ? `Confianza IA: ${fila.confianza}` : "",
            Array.isArray(fila.campos_dudosos) && fila.campos_dudosos.length
              ? `Campos dudosos: ${fila.campos_dudosos.join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .join(" | "),
          confianza: confianzaIaANumero(fila.confianza, fila.confianza_numerica) ?? "",
        };
      })
    );
    setGuardarDuplicadosTabla(false);
  };

  const analizarEstructuraTabla = async () => {
    if (!fotosTabla.length) {
      setMensaje({ texto: "Selecciona una o varias fotos del cuaderno manuscrito.", tipo: "advertencia" });
      return;
    }

    setAnalizandoEstructura(true);
    setMensaje({ texto: "La IA esta detectando tipo de tabla, columnas y estructura...", tipo: "info" });

    try {
      const imagenes = (
        await Promise.all(fotosTabla.map((file) => prepararImagenesTabla(file, orientacionTabla, "estructura")))
      ).flat();

      const res = await fetch("/api/comision-revisora/analizar-tabla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagenes,
          tipoFuente: tipoFuenteTabla,
          orientacion: orientacionTabla,
          modo: "estructura",
        }),
      });
      const resultado = await res.json();
      if (resultado.error) throw new Error(resultado.error);

      const estructura = normalizarEstructuraTabla(resultado, tipoFuenteTabla);
      setEstructuraTabla(estructura);
      setFilasExtraidas([]);
      setLoteTablaDetectado({
        tipo_lote_solicitado: resultado.tipo_lote_solicitado || tipoFuenteTabla,
        tipo_lote_detectado: estructura.tipo_lote_detectado,
        confianza_tipo_lote: estructura.confianza_tipo_lote,
        columnas_detectadas: estructura.columnas_detectadas,
        titulo: "",
        analisis_tabla: estructura.analisis_tabla,
        resumen: null,
        observaciones: estructura.observaciones_pagina,
      });

      setMensaje({
        texto: `Estructura detectada: ${etiquetaLote(estructura.tipo_lote_detectado)}. Revisa columnas antes de extraer filas.`,
        tipo: "exito",
      });
    } catch (error) {
      setMensaje({ texto: `No se pudo analizar la estructura: ${error.message}`, tipo: "error" });
    } finally {
      setAnalizandoEstructura(false);
    }
  };

  const analizarTablaManuscrita = async () => {
    if (!fotosTabla.length) {
      setMensaje({ texto: "Selecciona una o varias fotos del cuaderno manuscrito.", tipo: "advertencia" });
      return;
    }
    if (!estructuraTabla?.columnas_detectadas?.length) {
      setMensaje({ texto: "Primero analiza y confirma las columnas de la tabla.", tipo: "advertencia" });
      return;
    }

    setAnalizandoTabla(true);
    setMensaje({ texto: "La IA esta extrayendo filas con las columnas confirmadas...", tipo: "info" });

    try {
      const orientacionExtraccion = orientacionDesdeEstructura(estructuraTabla);
      const imagenes = (
        await Promise.all(
          fotosTabla.map((file) => prepararImagenesTabla(file, orientacionExtraccion, "extraccion"))
        )
      ).flat();

      const res = await fetch("/api/comision-revisora/analizar-tabla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagenes,
          tipoFuente: tipoFuenteTabla,
          orientacion: orientacionExtraccion,
          modo: "filas",
          estructura: estructuraTabla,
        }),
      });
      const resultado = await res.json();
      if (resultado.error) throw new Error(resultado.error);

      aplicarResultadoTabla(resultado, estructuraTabla);

      setMensaje({
        texto: `Filas extraidas con estructura confirmada. Revisa antes de guardar.`,
        tipo: "exito",
      });
    } catch (error) {
      setMensaje({ texto: `No se pudo extraer la tabla: ${error.message}`, tipo: "error" });
    } finally {
      setAnalizandoTabla(false);
    }
  };

  const actualizarFilaExtraida = (idTemporal, campo, valor) => {
    setFilasExtraidas((actual) =>
      actual.map((fila) => (fila.id_temporal === idTemporal ? { ...fila, [campo]: valor } : fila))
    );
  };

  const actualizarEstructuraColumna = (index, campo, valor) => {
    setEstructuraTabla((actual) => {
      if (!actual) return actual;
      return {
        ...actual,
        columnas_detectadas: actual.columnas_detectadas.map((columna, i) =>
          i === index ? { ...columna, [campo]: valor } : columna
        ),
      };
    });
    setFilasExtraidas([]);
  };

  const agregarColumnaEstructura = () => {
    setEstructuraTabla((actual) => {
      const base = actual || normalizarEstructuraTabla({}, tipoFuenteTabla);
      const numeroColumna = (base.columnas_detectadas?.length || 0) + 1;
      return {
        ...base,
        columnas_detectadas: [
          ...(base.columnas_detectadas || []),
          {
            key: `columna_${numeroColumna}`,
            label: `Columna ${numeroColumna}`,
            original: `Columna ${numeroColumna}`,
            tipo_dato: "texto",
            obligatoria: false,
            descartada: false,
            motivo: "Agregada por usuario",
          },
        ],
      };
    });
    setFilasExtraidas([]);
  };

  const guardarFilasExtraidas = async () => {
    if (!gestionSeleccionada) {
      setMensaje({ texto: "Primero selecciona una gestion.", tipo: "advertencia" });
      return;
    }
    if (!filasExtraidas.length) {
      setMensaje({ texto: "No hay filas extraidas para guardar.", tipo: "advertencia" });
      return;
    }

    const filasParaGuardar = guardarDuplicadosTabla ? filasConDuplicados : filasNuevas;
    if (!filasParaGuardar.length) {
      setMensaje({
        texto: "Todas las filas parecen ya cargadas. Puedes volver a analizar, descartar o activar guardar repetidas si corresponde.",
        tipo: "advertencia",
      });
      return;
    }

    setGuardando(true);
    try {
      const payloadLote = {
        gestion_id: gestionSeleccionada,
        tipo_fuente: loteTablaDetectado?.tipo_lote_detectado || tipoFuenteTabla,
        tipo_fuente_solicitada: tipoFuenteTabla,
        tipo_fuente_detectada: loteTablaDetectado?.tipo_lote_detectado || tipoFuenteTabla,
        confianza_tipo_lote: loteTablaDetectado?.confianza_tipo_lote || null,
        columnas_detectadas: loteTablaDetectado?.columnas_detectadas || [],
        descripcion: guardarDuplicadosTabla
          ? `Carga dinamica desde tabla manuscrita (${etiquetaLote(tipoLoteRevision)}) con repetidos autorizados`
          : `Carga dinamica desde tabla manuscrita (${etiquetaLote(tipoLoteRevision)}); repetidos omitidos`,
        cantidad_imagenes: fotosTabla.length,
      };

      let { data: lote, error: loteError } = await supabase
        .from("comision_lotes_carga")
        .insert([payloadLote])
        .select("*")
        .single();

      if (loteError) {
        const payloadCompatible = { ...payloadLote };
        delete payloadCompatible.tipo_fuente_solicitada;
        delete payloadCompatible.tipo_fuente_detectada;
        delete payloadCompatible.confianza_tipo_lote;
        delete payloadCompatible.columnas_detectadas;
        const retry = await supabase
          .from("comision_lotes_carga")
          .insert([payloadCompatible])
          .select("*")
          .single();
        lote = retry.data;
        loteError = retry.error;
      }
      if (loteError) throw loteError;

      const payload = filasParaGuardar.map((fila) => {
        const camposDinamicos = camposDinamicosParaGuardar(fila, columnasRevisionLote);
        const resumenDinamico = resumenCamposDinamicos(fila, columnasRevisionLote);
        const cantidadExtraida = cantidadDesdeFilaExtraida(fila);
        const unidadExtraida =
          fila.unidad || (cantidadExtraida !== null && Object.keys(camposDinamicos).some((key) => key.endsWith("_gr")) ? "gramos" : null);

        return {
          gestion_id: gestionSeleccionada,
          lote_carga_id: lote.id,
          tipo_documento: fila.tipo_documento || tipoFuenteTabla,
          tipo_movimiento: fila.tipo_movimiento || "egreso",
          fuente: "tabla_manuscrita_ia",
          fecha_documento: fila.fecha_documento || null,
          folio: fila.folio || null,
          numero_recibo: fila.numero_recibo || null,
          persona: fila.persona || null,
          concepto: fila.concepto || "Sin detalle",
          rubro: fila.rubro || null,
          subrubro: fila.subrubro || null,
          responsable: fila.responsable || fila.persona || null,
          destino: fila.destino || null,
          tarea: fila.tarea || null,
          monto_ingreso: numero(fila.monto_ingreso),
          monto_egreso: numero(fila.monto_egreso),
          monto_rendido: numero(fila.monto_rendido),
          saldo_libro: opcionalNumero(fila.saldo_libro),
          cantidad: cantidadExtraida,
          unidad: unidadExtraida,
          item: fila.item || null,
          contraparte: fila.contraparte || null,
          precio_unitario: opcionalNumero(fila.precio_unitario),
          precio_referencia: opcionalNumero(fila.precio_referencia),
          ley_oro: fila.ley_oro || null,
          interes_porcentaje: opcionalNumero(fila.interes_porcentaje),
          saldo_a_favor: numero(fila.saldo_a_favor),
          saldo_en_contra: numero(fila.saldo_en_contra),
          requiere_respaldo: true,
          confianza: opcionalNumero(fila.confianza),
          texto_extraido: JSON.stringify({
            tipo_lote: tipoLoteRevision,
            columnas_detectadas: columnasRevisionLote.map((columna) => ({
              key: columna.key,
              label: columna.label,
            })),
            campos_dinamicos: camposDinamicos,
          }),
          observaciones:
            [
              fila.observaciones,
              resumenDinamico ? `Columnas dinamicas: ${resumenDinamico}` : "",
              guardarDuplicadosTabla && fila.coincidencias?.length
                ? "Guardado como repetido justificado por usuario."
                : "",
            ]
              .filter(Boolean)
              .join(" | ") || null,
        };
      });

      await insertarMuchosConFallback("comision_documentos", payload, [
        "precio_unitario",
        "precio_referencia",
        "ley_oro",
        "requiere_respaldo",
      ]);

      setFilasExtraidas([]);
      setFotosTabla([]);
      setGuardarDuplicadosTabla(false);
      setLoteTablaDetectado(null);
      await obtenerDocumentos(gestionSeleccionada);
      setMensaje({
        texto: guardarDuplicadosTabla
          ? "Filas guardadas, incluyendo repetidas autorizadas."
          : `Filas nuevas guardadas. Repetidas omitidas: ${filasDuplicadas.length}.`,
        tipo: "exito",
      });
    } catch (error) {
      setMensaje({ texto: `No se pudieron guardar las filas: ${error.message}`, tipo: "error" });
    } finally {
      setGuardando(false);
    }
  };

  const verificarRespaldo = async () => {
    if (!fotoRespaldo || !respaldoForm.documento_id) {
      setMensaje({ texto: "Selecciona un movimiento y una foto de respaldo.", tipo: "advertencia" });
      return;
    }

    setVerificandoRespaldo(true);
    setMensaje({ texto: "La IA esta comparando respaldo contra el movimiento...", tipo: "info" });

    try {
      const movimiento = documentos.find((doc) => doc.id === respaldoForm.documento_id);
      const base64Data = await archivoABase64(fotoRespaldo);
      const res = await fetch("/api/comision-revisora/verificar-respaldo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenBase64: base64Data, mimeType: fotoRespaldo.type, movimiento }),
      });
      const resultado = await res.json();
      if (resultado.error) throw new Error(resultado.error);

      setRespaldoForm((actual) => ({
        ...actual,
        tipo_respaldo: resultado.tipo_respaldo || actual.tipo_respaldo,
        folio: resultado.folio || movimiento?.folio || actual.folio,
        numero_recibo: resultado.numero_recibo || movimiento?.numero_recibo || actual.numero_recibo,
        fecha_respaldo: resultado.fecha_respaldo || actual.fecha_respaldo,
        persona: resultado.persona || actual.persona,
        detalle: resultado.detalle || actual.detalle,
        monto: resultado.monto ?? actual.monto,
        texto_extraido: resultado.texto_extraido || actual.texto_extraido,
        resultado_verificacion: resultado.resultado_verificacion || "requiere_revision",
        diferencias: resultado.diferencias || [],
        confianza: resultado.confianza ?? actual.confianza,
        observaciones: resultado.observaciones || actual.observaciones,
      }));

      setMensaje({ texto: "Respaldo comparado. Revisa el resultado antes de guardar.", tipo: "exito" });
    } catch (error) {
      setMensaje({ texto: `No se pudo verificar el respaldo: ${error.message}`, tipo: "error" });
    } finally {
      setVerificandoRespaldo(false);
    }
  };

  const guardarRespaldo = async () => {
    if (!gestionSeleccionada || !respaldoForm.documento_id || !fotoRespaldo) {
      setMensaje({ texto: "Selecciona gestion, movimiento y archivo de respaldo.", tipo: "advertencia" });
      return;
    }

    setGuardando(true);
    try {
      const hashArchivo = await calcularSha256Archivo(fotoRespaldo);
      const movimiento = documentos.find((doc) => doc.id === respaldoForm.documento_id);
      const gestionNombre = gestionActual?.gestion || "gestion";
      const fecha = respaldoForm.fecha_respaldo || movimiento?.fecha_documento || "sin-fecha";
      const folio = (respaldoForm.folio || movimiento?.folio || "sin-folio").replace(/[^\w.-]+/g, "_");
      const recibo = (respaldoForm.numero_recibo || movimiento?.numero_recibo || "sin-recibo").replace(
        /[^\w.-]+/g,
        "_"
      );
      const archivoSeguro = fotoRespaldo.name.replace(/[^\w.-]+/g, "_");
      const nombreArchivo = `gestion-${gestionNombre}/originales/${respaldoForm.tipo_respaldo}/${fecha}_folio-${folio}_recibo-${recibo}_${Date.now()}_${archivoSeguro}`;
      const { error: uploadError } = await supabase.storage
        .from("comision-revisora")
        .upload(nombreArchivo, fotoRespaldo);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("comision-revisora").getPublicUrl(nombreArchivo);
      await insertarConFallback(
        "comision_respaldos",
        {
          gestion_id: gestionSeleccionada,
          documento_id: respaldoForm.documento_id,
          tipo_respaldo: respaldoForm.tipo_respaldo,
          folio: respaldoForm.folio || null,
          numero_recibo: respaldoForm.numero_recibo || null,
          fecha_respaldo: respaldoForm.fecha_respaldo || null,
          persona: respaldoForm.persona || null,
          detalle: respaldoForm.detalle || null,
          monto: opcionalNumero(respaldoForm.monto),
          url_archivo: urlData.publicUrl,
          storage_path: nombreArchivo,
          nombre_archivo: fotoRespaldo.name,
          mime_type: fotoRespaldo.type || null,
          tamano_bytes: fotoRespaldo.size || null,
          sha256: hashArchivo,
          estado_custodia: "original_digital",
          subido_por: "comision_revisora",
          texto_extraido: respaldoForm.texto_extraido || null,
          resultado_verificacion: respaldoForm.resultado_verificacion,
          diferencias: respaldoForm.diferencias || [],
          confianza: opcionalNumero(respaldoForm.confianza),
          observaciones: respaldoForm.observaciones || null,
        },
        [
          "storage_path",
          "nombre_archivo",
          "mime_type",
          "tamano_bytes",
          "sha256",
          "estado_custodia",
          "subido_por",
        ]
      );

      setRespaldoForm(RESPALDO_INICIAL);
      setFotoRespaldo(null);
      await obtenerRespaldos(gestionSeleccionada);
      setMensaje({ texto: "Respaldo guardado y vinculado al movimiento.", tipo: "exito" });
    } catch (error) {
      setMensaje({ texto: `No se pudo guardar el respaldo: ${error.message}`, tipo: "error" });
    } finally {
      setGuardando(false);
    }
  };

  const gestionActual = gestiones.find((item) => item.id === gestionSeleccionada);
  const renderInputFila = (fila, columna) => {
    if (columna.type === "select-rubro") {
      return (
        <select
          value={fila[columna.key] || ""}
          onChange={(e) => actualizarFilaExtraida(fila.id_temporal, columna.key, e.target.value)}
          className={`${columna.width} rounded border border-slate-300 px-2 py-1`}
        >
          <option value="">Rubro</option>
          {RUBROS.map((rubro) => (
            <option key={rubro} value={rubro}>
              {rubro}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={columna.type === "number" ? "number" : columna.type === "date" ? "date" : "text"}
        step={columna.step || (columna.type === "number" ? "0.01" : undefined)}
        value={fila[columna.key] || ""}
        onChange={(e) => actualizarFilaExtraida(fila.id_temporal, columna.key, e.target.value)}
        className={`${columna.width} rounded border border-slate-300 px-2 py-1`}
      />
    );
  };

  return (
    <main className="min-h-screen bg-[#edf2e6]">
      <NavPrincipal />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-emerald-800">
              Comision revisora
            </p>
            <h1 className="text-3xl font-black text-slate-950">
              Cargar documentos y encontrar descuadres
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">
              Suba cuadernos, recibos, respaldos, almacen, alzas y ventas. El sistema avisa si algo parece repetido,
              falta respaldo o no cuadra.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={gestionSeleccionada}
              onChange={(e) => setGestionSeleccionada(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Seleccionar gestion</option>
              {gestiones.map((gestion) => (
                <option key={gestion.id} value={gestion.id}>
                  {gestion.gestion} - {gestion.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                descargarCsv(
                  `comision-revisora-${gestionActual?.gestion || "gestion"}.csv`,
                  documentos
                )
              }
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {mensaje.texto ? (
          <div
            className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
              mensaje.tipo === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : mensaje.tipo === "exito"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {mensaje.texto}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Documentos</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{resumen.documentos}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Ingresos revisados</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{moneda(resumen.ingresos)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Egresos revisados</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{moneda(resumen.egresos)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Saldo caja calculado</p>
            <p className="mt-1 text-2xl font-bold text-indigo-700">{moneda(resumen.saldoCaja)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Respaldos fisicos</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{resumen.respaldos}</p>
            <p className="mt-1 text-xs font-semibold text-amber-700">Faltan: {resumen.sinRespaldo}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Prestamos</p>
            <p className="mt-1 text-2xl font-bold text-orange-700">{moneda(resumen.prestamos)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Ventas oro</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{moneda(resumen.ventasOro)}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">Alertas altas</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{alertasAltas}</p>
          </div>
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                Revision experta
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-950">Que debe cuadrar si o si</h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                Caja, oro, prestamos y respaldos deben contar la misma historia desde distintos libros.
              </p>
            </div>
            <ul className="space-y-2 text-sm font-semibold text-slate-700">
              <li>- Venta de oro: peso, ley, comprador, precio unitario y precio de referencia.</li>
              <li>- Caja: saldo antes y despues; si habia plata, justificar por que se pidio prestamo.</li>
              <li>- Prestamos: acreedor, interes, plazo, moneda de devolucion y acta o autorizacion.</li>
            </ul>
            <ul className="space-y-2 text-sm font-semibold text-slate-700">
              <li>- Recibos: sin duplicados raros, sin saltos grandes y con folio/fecha consistentes.</li>
              <li>- Respaldos: foto original vinculada al movimiento y verificada con IA.</li>
              <li>- Almacen: compras de insumos con ingreso fisico o sello del almacenero.</li>
            </ul>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <form onSubmit={crearGestion} className="module-card p-5">
              <h2 className="text-lg font-bold text-slate-900">Crear gestion revisada</h2>
              <div className="mt-4 grid gap-3">
                <input
                  type="number"
                  value={nuevaGestion.gestion}
                  onChange={(e) => setNuevaGestion((g) => ({ ...g, gestion: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Gestion, ej. 2019"
                />
                <input
                  value={nuevaGestion.nombre}
                  onChange={(e) => setNuevaGestion((g) => ({ ...g, nombre: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Nombre de la comision"
                />
                <textarea
                  value={nuevaGestion.observaciones}
                  onChange={(e) =>
                    setNuevaGestion((g) => ({ ...g, observaciones: e.target.value }))
                  }
                  className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Alcance, responsables o notas"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Crear gestion
                </button>
              </div>
            </form>

            <section className="module-card p-5">
              <h2 className="text-lg font-bold text-slate-900">Extraer lote manuscrito dinamico</h2>
              <p className="mt-1 text-sm text-slate-500">
                Suba una o varias paginas del mismo cuaderno. La IA puede detectar si es alzas, ventas de oro,
                prestamos, ingresos, combustible, almacen u otro formato.
              </p>
              <div className="mt-4 grid gap-3">
                <select
                  value={tipoFuenteTabla}
                  onChange={(e) => {
                    setTipoFuenteTabla(e.target.value);
                    setEstructuraTabla(null);
                    setLoteTablaDetectado(null);
                    setFilasExtraidas([]);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {TIPOS_LOTE_TABLA.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                  La orientacion se corrige automaticamente. Solo sube la foto como este.
                </p>
                <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-bold text-slate-700">
                    Opciones avanzadas de orientacion
                  </summary>
                  <select
                    value={orientacionTabla}
                    onChange={(e) => {
                      setOrientacionTabla(e.target.value);
                      setEstructuraTabla(null);
                      setLoteTablaDetectado(null);
                      setFilasExtraidas([]);
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {ORIENTACIONES_TABLA.map((orientacion) => (
                      <option key={orientacion.value} value={orientacion.value}>
                        {orientacion.label}
                      </option>
                    ))}
                  </select>
                </details>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    setFotosTabla(Array.from(e.target.files || []));
                    setEstructuraTabla(null);
                    setLoteTablaDetectado(null);
                    setFilasExtraidas([]);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                {fotosTabla.length ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                    Paginas seleccionadas: {fotosTabla.length}. Tipo: {etiquetaLote(tipoFuenteTabla)}.
                    Orientacion: {ORIENTACIONES_TABLA.find((item) => item.value === orientacionTabla)?.label}.
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={analizarEstructuraTabla}
                  disabled={analizandoEstructura}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {analizandoEstructura ? "Analizando columnas..." : "1. Analizar tipo y columnas"}
                </button>
                {estructuraTabla ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-emerald-950">Estructura detectada</p>
                        <p className="text-xs font-semibold text-emerald-800">
                          Corrige el tipo o columnas antes de extraer. Si una columna no sirve, marcala como descartar.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={agregarColumnaEstructura}
                        className="rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-800"
                      >
                        Agregar columna
                      </button>
                    </div>
                    <select
                      value={estructuraTabla.tipo_lote_detectado}
                      onChange={(e) => {
                        setEstructuraTabla((actual) =>
                          actual ? { ...actual, tipo_lote_detectado: e.target.value } : actual
                        );
                        setFilasExtraidas([]);
                      }}
                      className="mt-3 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm"
                    >
                      {TIPOS_LOTE_TABLA.filter((tipo) => tipo.value !== "auto").map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-3 space-y-2">
                      {estructuraTabla.columnas_detectadas.map((columna, index) => (
                        <div key={`${columna.key}-${index}`} className="rounded-lg border border-emerald-200 bg-white p-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(columna.descartada)}
                              onChange={(e) => actualizarEstructuraColumna(index, "descartada", e.target.checked)}
                            />
                            Descartar esta columna
                          </label>
                          <div className="mt-2 grid gap-2">
                            <input
                              value={columna.label}
                              onChange={(e) => actualizarEstructuraColumna(index, "label", e.target.value)}
                              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                              placeholder="Nombre visible"
                            />
                            <input
                              value={columna.key}
                              onChange={(e) =>
                                actualizarEstructuraColumna(index, "key", normalizarClaveColumna(e.target.value) || e.target.value)
                              }
                              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                              placeholder="Key tecnica"
                            />
                            <select
                              value={columna.tipo_dato}
                              onChange={(e) => actualizarEstructuraColumna(index, "tipo_dato", e.target.value)}
                              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                            >
                              {TIPOS_DATO_COLUMNA.map((tipoDato) => (
                                <option key={tipoDato.value} value={tipoDato.value}>
                                  {tipoDato.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Original: {columna.original || columna.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={analizarTablaManuscrita}
                  disabled={analizandoTabla || !estructuraTabla}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                >
                  {analizandoTabla ? "Extrayendo..." : "2. Extraer filas con columnas confirmadas"}
                </button>
              </div>
            </section>

            <form onSubmit={guardarDocumento} className="module-card p-5">
              <h2 className="text-lg font-black text-slate-950">Cargar un documento fisico</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Suba una foto, revise lo que leyo la IA y confirme antes de guardar.
              </p>
              <div className="mt-4 grid gap-3">
                <select
                  value={form.tipo_documento}
                  onChange={(e) => setForm((f) => ({ ...f, tipo_documento: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {TIPOS_DOCUMENTO.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={form.tipo_movimiento}
                    onChange={(e) => setForm((f) => ({ ...f, tipo_movimiento: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="egreso">Egreso</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="neutro">Neutro / control</option>
                  </select>
                  <select
                    value={form.rubro}
                    onChange={(e) => setForm((f) => ({ ...f, rubro: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Rubro</option>
                    {RUBROS.map((rubro) => (
                      <option key={rubro} value={rubro}>
                        {rubro}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={form.fecha_documento}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_documento: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={form.folio}
                    onChange={(e) => setForm((f) => ({ ...f, folio: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Folio"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={form.numero_recibo}
                    onChange={(e) => setForm((f) => ({ ...f, numero_recibo: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Nro. recibo"
                  />
                  <input
                    value={form.persona}
                    onChange={(e) => setForm((f) => ({ ...f, persona: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Socio/proveedor"
                  />
                  <input
                    value={form.subrubro}
                    onChange={(e) => setForm((f) => ({ ...f, subrubro: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Subrubro"
                  />
                </div>

                <textarea
                  value={form.concepto}
                  onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
                  className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Concepto del documento"
                />

                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    step="0.01"
                    value={form.monto_ingreso}
                    onChange={(e) => setForm((f) => ({ ...f, monto_ingreso: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Ingreso"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={form.monto_egreso}
                    onChange={(e) => setForm((f) => ({ ...f, monto_egreso: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Egreso"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={form.monto_rendido}
                    onChange={(e) => setForm((f) => ({ ...f, monto_rendido: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Rendido"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    step="0.0001"
                    value={form.cantidad}
                    onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Cantidad"
                  />
                  <input
                    value={form.unidad}
                    onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Unidad"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={form.saldo_libro}
                    onChange={(e) => setForm((f) => ({ ...f, saldo_libro: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Saldo libro"
                  />
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-amber-800">
                    Venta de oro, prestamo y caja
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <input
                      type="number"
                      step="0.0001"
                      value={form.precio_unitario}
                      onChange={(e) => setForm((f) => ({ ...f, precio_unitario: e.target.value }))}
                      className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                      placeholder="Precio unitario oro"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      value={form.precio_referencia}
                      onChange={(e) => setForm((f) => ({ ...f, precio_referencia: e.target.value }))}
                      className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                      placeholder="Precio referencia"
                    />
                    <input
                      value={form.ley_oro}
                      onChange={(e) => setForm((f) => ({ ...f, ley_oro: e.target.value }))}
                      className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                      placeholder="Ley/pureza oro"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={form.saldo_caja_antes}
                      onChange={(e) => setForm((f) => ({ ...f, saldo_caja_antes: e.target.value }))}
                      className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                      placeholder="Caja antes del prestamo"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      value={form.interes_porcentaje}
                      onChange={(e) => setForm((f) => ({ ...f, interes_porcentaje: e.target.value }))}
                      className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                      placeholder="Interes %"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      value={form.tipo_cambio}
                      onChange={(e) => setForm((f) => ({ ...f, tipo_cambio: e.target.value }))}
                      className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                      placeholder="Tipo cambio si aplica"
                    />
                  </div>
                  <textarea
                    value={form.justificacion_prestamo}
                    onChange={(e) => setForm((f) => ({ ...f, justificacion_prestamo: e.target.value }))}
                    className="mt-3 min-h-16 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                    placeholder="Justificacion del prestamo o diferencia de precio"
                  />
                  <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <input
                      type="checkbox"
                      checked={form.requiere_respaldo}
                      onChange={(e) => setForm((f) => ({ ...f, requiere_respaldo: e.target.checked }))}
                    />
                    Este movimiento debe tener respaldo fisico
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={form.item}
                    onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Item/material"
                  />
                  <input
                    value={form.contraparte}
                    onChange={(e) => setForm((f) => ({ ...f, contraparte: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Comprador/acreedor"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <input
                    value={form.responsable}
                    onChange={(e) => setForm((f) => ({ ...f, responsable: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Responsable"
                  />
                  <input
                    value={form.destino}
                    onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Destino"
                  />
                  <input
                    value={form.tarea}
                    onChange={(e) => setForm((f) => ({ ...f, tarea: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Tarea"
                  />
                </div>

                <textarea
                  value={form.observaciones}
                  onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                  className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Observaciones o dudas de revision"
                />

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setFoto(e.target.files?.[0] || null);
                    setRevisionDocumento(null);
                    setPermitirDuplicadoDocumento(false);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />

                {revisionDocumento ? (
                  <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-amber-900">
                          Revision de lectura IA
                        </h3>
                        <p className="mt-1 text-sm text-amber-800">
                          Corrige los campos del formulario. Cuando todo este conforme, confirma la revision para
                          habilitar el guardado.
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          revisionDocumento.revisado
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-white text-amber-700"
                        }`}
                      >
                        {revisionDocumento.revisado ? "Revision confirmada" : "Pendiente de confirmar"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {CAMPOS_REVISION_DOCUMENTO.map((campo) => (
                        <div key={campo.key} className="rounded-lg border border-amber-100 bg-white px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {campo.label}
                          </p>
                          <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                            {String(form[campo.key] ?? "").trim() || "Sin dato"}
                          </p>
                        </div>
                      ))}
                    </div>

                    {avisosRevisionDocumento.length ? (
                      <div className="mt-4 rounded-lg border border-amber-300 bg-white px-3 py-2">
                        <p className="text-sm font-bold text-amber-900">Cosas para revisar</p>
                        <ul className="mt-2 space-y-1 text-sm text-amber-800">
                          {avisosRevisionDocumento.map((aviso) => (
                            <li key={aviso}>- {aviso}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700">
                        No hay alertas fuertes. Igual revisa la imagen original antes de confirmar.
                      </p>
                    )}

                    {coincidenciasDocumentoActual.length ? (
                      <div className="mt-4 rounded-lg border border-red-200 bg-white px-3 py-3">
                        <p className="text-sm font-bold text-red-800">Parece que este documento ya fue cargado</p>
                        <div className="mt-2 space-y-2 text-sm text-red-700">
                          {coincidenciasDocumentoActual.map((item) => (
                            <p key={item.doc.id}>
                              {descripcionCoincidencia(item.doc)}. Coincide por: {item.motivos.join(", ")}.
                            </p>
                          ))}
                        </div>
                        <label className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                          <input
                            type="checkbox"
                            checked={permitirDuplicadoDocumento}
                            onChange={(e) => setPermitirDuplicadoDocumento(e.target.checked)}
                          />
                          Guardar como duplicado justificado
                        </label>
                      </div>
                    ) : null}

                    {correccionesRevisionDocumento.length ? (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm font-bold text-slate-900">Correcciones hechas por ti</p>
                        <div className="mt-2 space-y-2 text-sm text-slate-600">
                          {correccionesRevisionDocumento.map((campo) => (
                            <p key={campo.key}>
                              <span className="font-semibold text-slate-800">{campo.label}:</span>{" "}
                              {String(campo.original).trim() || "Sin dato"} {"->"}{" "}
                              {String(campo.actual).trim() || "Sin dato"}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          setRevisionDocumento((actual) =>
                            actual ? { ...actual, revisado: true } : actual
                          )
                        }
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Confirmar revision
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRevisionDocumento(null);
                          setPermitirDuplicadoDocumento(false);
                          setMensaje({
                            texto: "Lectura IA descartada. Puedes ajustar el formulario manualmente.",
                            tipo: "info",
                          });
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Descartar lectura IA
                      </button>
                    </div>
                  </section>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={analizarConIA}
                    disabled={analizando}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                  >
                    {analizando ? "Analizando..." : "Leer con IA"}
                  </button>
                  <button
                    type="submit"
                    disabled={
                      guardando ||
                      (revisionDocumento && !revisionDocumento.revisado) ||
                      (coincidenciasDocumentoActual.length > 0 && !permitirDuplicadoDocumento)
                    }
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {guardando
                      ? "Guardando..."
                      : revisionDocumento && !revisionDocumento.revisado
                        ? "Confirma revision"
                        : coincidenciasDocumentoActual.length > 0 && !permitirDuplicadoDocumento
                          ? "Autoriza duplicado"
                        : "Guardar"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            {filasExtraidas.length > 0 ? (
              <section className="overflow-hidden rounded-lg border border-indigo-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-indigo-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Revision antes de guardar</h2>
                    <p className="text-sm text-slate-500">
                      Corrige las filas extraidas por IA y luego guardalas en la gestion.
                    </p>
                    {loteTablaDetectado ? (
                      <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                        <p className="font-bold">
                          Tipo detectado: {etiquetaLote(loteTablaDetectado.tipo_lote_detectado)} | Confianza:{" "}
                          {loteTablaDetectado.confianza_tipo_lote || "media"}
                        </p>
                        {loteTablaDetectado.columnas_detectadas?.length ? (
                          <p className="mt-1 text-xs font-semibold">
                            Columnas vistas:{" "}
                            {loteTablaDetectado.columnas_detectadas
                              .map((columna) =>
                                typeof columna === "string"
                                  ? columna
                                  : columna.original || columna.label || columna.key
                              )
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        ) : null}
                        {loteTablaDetectado.analisis_tabla ? (
                          <div className="mt-2 rounded-md border border-indigo-200 bg-white/70 p-2 text-xs">
                            <p className="font-bold text-indigo-950">Analisis previo de la IA</p>
                            <p className="mt-1">
                              Orientacion:{" "}
                              {loteTablaDetectado.analisis_tabla.orientacion_imagen || "no indicada"} | Filas
                              visibles: {loteTablaDetectado.analisis_tabla.filas_visibles_estimadas ?? "-"} |
                              Filas extraidas: {loteTablaDetectado.analisis_tabla.filas_extraidas ?? "-"}
                            </p>
                            {loteTablaDetectado.analisis_tabla.criterio_extraccion ? (
                              <p className="mt-1">{loteTablaDetectado.analisis_tabla.criterio_extraccion}</p>
                            ) : null}
                            {Array.isArray(loteTablaDetectado.analisis_tabla.riesgos_lectura) &&
                            loteTablaDetectado.analisis_tabla.riesgos_lectura.length ? (
                              <p className="mt-1 font-semibold text-amber-800">
                                Revisar: {loteTablaDetectado.analisis_tabla.riesgos_lectura.join("; ")}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        {loteTablaDetectado.observaciones ? (
                          <p className="mt-1 text-xs">{loteTablaDetectado.observaciones}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      Nuevas: {filasNuevas.length} | Posibles repetidas: {filasDuplicadas.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={guardarFilasExtraidas}
                    disabled={guardando}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {guardarDuplicadosTabla
                      ? `Guardar ${filasConDuplicados.length} filas`
                      : `Guardar ${filasNuevas.length} nuevas`}
                  </button>
                </div>
                {filasDuplicadas.length ? (
                  <div className="border-b border-amber-100 bg-amber-50 px-5 py-4">
                    <p className="text-sm font-bold text-amber-900">
                      El sistema encontro filas que parecen ya cargadas.
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      Para evitar doble trabajo, por defecto se guardaran solo las filas nuevas.
                    </p>
                    <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
                      <input
                        type="checkbox"
                        checked={guardarDuplicadosTabla}
                        onChange={(e) => setGuardarDuplicadosTabla(e.target.checked)}
                      />
                      Guardar tambien las filas repetidas
                    </label>
                  </div>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="min-w-[1200px] divide-y divide-slate-200 text-sm">
                    <thead className="bg-indigo-50 text-left text-xs uppercase tracking-wide text-indigo-700">
                      <tr>
                        {columnasRevisionLote.map((columna) => (
                          <th key={columna.key} className="px-3 py-2">
                            {columna.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filasConDuplicados.map((fila) => (
                        <tr
                          key={fila.id_temporal}
                          className={fila.coincidencias.length ? "bg-red-50/70" : ""}
                        >
                          {columnasRevisionLote.map((columna) => (
                            <td key={columna.key} className="px-3 py-2 align-top">
                              {columna.key === "concepto" && fila.coincidencias.length ? (
                                <p className="mb-1 rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                                  Ya cargado
                                </p>
                              ) : null}
                              {renderInputFila(fila, columna)}
                              {columna.key === "observaciones" && fila.coincidencias.length ? (
                                <p className="mt-1 text-xs text-red-700">
                                  Coincide con: {descripcionCoincidencia(fila.coincidencias[0].doc)}
                                </p>
                              ) : null}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">Respaldos fisicos</h2>
              <p className="mt-1 text-sm text-slate-500">
                Vincula recibos, facturas, notas o comprobantes al movimiento y verifica diferencias con IA.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <select
                  value={respaldoForm.documento_id}
                  onChange={(e) =>
                    setRespaldoForm((actual) => ({ ...actual, documento_id: e.target.value }))
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                >
                  <option value="">Seleccionar movimiento</option>
                  {documentos.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.fecha_documento || "s/f"} | Rec. {doc.numero_recibo || "s/n"} | Folio{" "}
                      {doc.folio || "s/f"} | {doc.concepto}
                    </option>
                  ))}
                </select>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFotoRespaldo(e.target.files?.[0] || null)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm md:col-span-2"
                />
                <button
                  type="button"
                  onClick={verificarRespaldo}
                  disabled={verificandoRespaldo}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                >
                  {verificandoRespaldo ? "Verificando..." : "Verificar con IA"}
                </button>
                <button
                  type="button"
                  onClick={guardarRespaldo}
                  disabled={guardando}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  Guardar respaldo
                </button>
              </div>

              {respaldoForm.resultado_verificacion !== "pendiente" ? (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-semibold text-slate-900">
                    Resultado: {respaldoForm.resultado_verificacion}
                  </p>
                  <p className="mt-1 text-slate-600">
                    Monto respaldo: {respaldoForm.monto ? moneda(respaldoForm.monto) : "sin monto"} |
                    Recibo: {respaldoForm.numero_recibo || "s/n"} | Folio: {respaldoForm.folio || "s/f"}
                  </p>
                  {respaldoForm.observaciones ? (
                    <p className="mt-2 text-slate-700">{respaldoForm.observaciones}</p>
                  ) : null}
                  {respaldoForm.diferencias?.length ? (
                    <ul className="mt-2 list-disc pl-5 text-red-700">
                      {respaldoForm.diferencias.map((dif, index) => (
                        <li key={`${dif.campo}-${index}`}>{dif.detalle || dif.campo}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Anomalias detectadas</h2>
                  <p className="text-sm text-slate-500">
                    Cruces iniciales por recibo, folio, montos y produccion.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {anomalias.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {anomalias.length === 0 ? (
                  <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Sin anomalias automaticas con los documentos cargados.
                  </p>
                ) : (
                  anomalias.map((anomalia, index) => (
                    <div
                      key={`${anomalia.tipo}-${index}`}
                      className={`rounded-lg border px-4 py-3 text-sm ${
                        anomalia.severidad === "alta"
                          ? "border-red-200 bg-red-50 text-red-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <p className="font-semibold">{anomalia.tipo}</p>
                      <p className="mt-1">{anomalia.descripcion}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">Documentos cargados</h2>
                <p className="text-sm text-slate-500">
                  Base digital reconstruida desde libros, recibos y respaldos fisicos.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Folio / Recibo</th>
                      <th className="px-4 py-3">Rubro</th>
                      <th className="px-4 py-3">Concepto</th>
                      <th className="px-4 py-3">Ingreso</th>
                      <th className="px-4 py-3">Egreso</th>
                      <th className="px-4 py-3">Cantidad</th>
                      <th className="px-4 py-3">Precio oro</th>
                      <th className="px-4 py-3">Respaldos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documentos.map((doc) => (
                      <tr key={doc.id} className="align-top hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {etiquetaTipo(doc.tipo_documento)}
                          <p className="mt-1 text-xs font-normal text-slate-500">
                            {doc.persona || doc.contraparte || "Sin persona"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{fechaLocal(doc.fecha_documento)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>Folio: {doc.folio || "s/f"}</p>
                          <p>Recibo: {doc.numero_recibo || "s/n"}</p>
                          {!doc.numero_recibo ? (
                            <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                              Ref: {referenciaAlternativa(doc)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>{doc.rubro || "Sin rubro"}</p>
                          <p className="text-xs text-slate-500">{doc.subrubro || ""}</p>
                        </td>
                        <td className="max-w-sm px-4 py-3 text-slate-700">
                          <p className="font-medium">{doc.concepto}</p>
                          {doc.destino || doc.tarea ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {[doc.destino, doc.tarea].filter(Boolean).join(" | ")}
                            </p>
                          ) : null}
                          {doc.observaciones ? (
                            <p className="mt-1 text-xs text-slate-500">{doc.observaciones}</p>
                          ) : null}
                          {doc.estado_revision ? (
                            <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                              {doc.estado_revision}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-emerald-700">{moneda(doc.monto_ingreso)}</td>
                        <td className="px-4 py-3 text-red-700">{moneda(doc.monto_egreso)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {doc.cantidad ? `${doc.cantidad} ${doc.unidad || ""}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {doc.precio_unitario || doc.precio_referencia ? (
                            <>
                              <p>Venta: {doc.precio_unitario ? moneda(doc.precio_unitario) : "s/d"}</p>
                              <p className="text-xs text-slate-500">
                                Ref: {doc.precio_referencia ? moneda(doc.precio_referencia) : "s/d"}
                              </p>
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {respaldos.filter((respaldo) => respaldo.documento_id === doc.id).length}
                        </td>
                      </tr>
                    ))}
                    {documentos.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                          Todavia no hay documentos cargados para esta gestion.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
