import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const gestionId = "e6af1319-658a-4f00-bea6-4561957da807";
const loteId = "a65ae0f9-ccd3-404e-a256-f36cd6e6f424";
const correccionesPath = path.join(
  projectRoot,
  "imports",
  "comision-revisora",
  "correccion_excel_paginas_10_11.json"
);

function loadEnv(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    env[line.slice(0, index)] = line.slice(index + 1);
  }
  return env;
}

function clean(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizarRecibo(value) {
  const text = String(value ?? "").trim();
  if (!text || /^(s\/n|sn|sin numero|sin nro)$/i.test(text)) return null;
  return text;
}

function normalizarTexto(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function rubro(detalle) {
  const text = normalizarTexto(detalle);
  if (/giro/.test(text)) return "Giros";
  if (/pasaje|viaje/.test(text)) return "Viaticos";
  if (/transporte|encomienda|guia encomienda/.test(text)) return "Transporte";
  if (/judicial|tramite|notaria/.test(text)) return "Judicial";
  if (/telefono|telefonia/.test(text)) return "Telefono";
  if (/comida|bebida|refrigerio|consumo|colaboracion|central/.test(text)) {
    return "Gastos generales";
  }
  if (/servicio|basico/.test(text)) return "Servicios externos";
  if (/material|repuesto|suministro|escritorio/.test(text)) return "Materiales";
  return "Gastos generales";
}

function subrubro(detalle) {
  const text = normalizarTexto(detalle);
  if (/giro/.test(text)) return "Comision";
  if (/pasaje/.test(text)) return "Pasaje";
  if (/viaje/.test(text)) return "Viaje";
  if (/encomienda/.test(text)) return "Encomienda";
  if (/repuesto/.test(text)) return "Repuesto";
  if (/escritorio/.test(text)) return "Escritorio";
  if (/judicial/.test(text)) return "Judicial";
  return null;
}

const env = loadEnv(path.join(projectRoot, ".env.local"));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const rows = JSON.parse(fs.readFileSync(correccionesPath, "utf8"));

const { data: actuales, error: readError } = await supabase
  .from("comision_documentos")
  .select("id,observaciones")
  .eq("lote_carga_id", loteId);

if (readError) throw readError;

const idsEliminar = (actuales || [])
  .filter((row) => /^Pagina (10|11) fila /i.test(row.observaciones || ""))
  .map((row) => row.id);

for (let i = 0; i < idsEliminar.length; i += 100) {
  const { error } = await supabase
    .from("comision_documentos")
    .delete()
    .in("id", idsEliminar.slice(i, i + 100));
  if (error) throw error;
}

const payload = rows.map((row) => {
  const numeroRecibo = normalizarRecibo(row.numero_recibo);
  return {
    gestion_id: gestionId,
    lote_carga_id: loteId,
    tipo_documento: "cuaderno_egresos_revisora",
    tipo_movimiento: "egreso",
    fuente: "correccion_excel_control",
    fecha_documento: clean(row.fecha),
    folio: clean(row.folio),
    numero_recibo: numeroRecibo,
    concepto: clean(row.detalle) || "Sin detalle",
    categoria: rubro(row.detalle),
    rubro: rubro(row.detalle),
    subrubro: subrubro(row.detalle),
    monto_ingreso: 0,
    monto_egreso: Number(row.monto_bs || 0),
    estado_revision: numeroRecibo ? "pendiente_revision" : "sin_numero_recibo_pendiente",
    texto_extraido: JSON.stringify(row),
    confianza: 1,
    observaciones: `Pagina ${row.pagina} fila ${row.fila} | Corregido desde Excel de control | Obs: ${
      row.observaciones || ""
    }`,
  };
});

for (let i = 0; i < payload.length; i += 100) {
  const { error } = await supabase.from("comision_documentos").insert(payload.slice(i, i + 100));
  if (error) throw error;
}

const { data: target, error: targetError } = await supabase
  .from("comision_documentos")
  .select("id,observaciones,texto_extraido")
  .eq("lote_carga_id", loteId)
  .eq("numero_recibo", "4462")
  .eq("folio", "59");

if (targetError) throw targetError;
if (!target?.length) {
  throw new Error("No se encontro recibo 4462 folio 59 en el lote 7-16.");
}

for (const doc of target) {
  let parsed = {};
  try {
    parsed = JSON.parse(doc.texto_extraido || "{}");
  } catch {
    parsed = {};
  }
  parsed.monto_bs = 340;
  parsed.correccion = "Monto corregido por usuario desde Excel: recibo 4462 folio 59";

  const { error } = await supabase
    .from("comision_documentos")
    .update({
      monto_egreso: 340,
      texto_extraido: JSON.stringify(parsed),
      observaciones: `${doc.observaciones || ""} | Correccion usuario: monto Bs 340`,
    })
    .eq("id", doc.id);
  if (error) throw error;
}

console.log(
  JSON.stringify(
    {
      deleted_pages_10_11: idsEliminar.length,
      inserted_pages_10_11: payload.length,
      updated_4462_59: target.length,
    },
    null,
    2
  )
);
