import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const gestionId = "e6af1319-658a-4f00-bea6-4561957da807";

const correcciones = [
  {
    pagina: 1,
    folio: "24",
    buscarRecibo: "3548",
    numero_recibo: "3548",
    monto_egreso: 2321.04,
    motivo: "Usuario confirma pagina 1 recibo 3548 folio 24 = Bs 2321.04",
  },
  {
    pagina: 16,
    folio: "204",
    buscarRecibo: "432",
    numero_recibo: "432",
    monto_egreso: 500,
    motivo: "Usuario confirma pagina 16 recibo 432 folio 204 = Bs 500",
  },
  {
    pagina: 16,
    folio: "198",
    buscarRecibo: "630",
    numero_recibo: "630",
    monto_egreso: 2550,
    motivo: "Usuario confirma pagina 16 recibo 630 folio 198 = Bs 2550; Excel y sistema estaban mal",
  },
  {
    pagina: 2,
    folio: "10",
    buscarRecibo: null,
    numero_recibo: "117",
    monto_egreso: 136,
    motivo: "Usuario confirma pagina 2 folio 10 = recibo 117 por Bs 136",
  },
];

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

function paginaDesdeDocumento(doc) {
  const observaciones = doc.observaciones || "";
  const match = observaciones.match(/Pagina\s+(\d+)\s+fila/i);
  if (match) return Number(match[1]);

  try {
    const parsed = JSON.parse(doc.texto_extraido || "{}");
    return Number(parsed.pagina || 0);
  } catch {
    return 0;
  }
}

function normalizar(value) {
  return String(value ?? "").trim().replace(/\.0$/, "");
}

function actualizarTextoExtraido(texto, correccion) {
  let parsed = {};
  try {
    parsed = JSON.parse(texto || "{}");
  } catch {
    parsed = {};
  }

  parsed.numero_recibo = correccion.numero_recibo;
  parsed.folio = correccion.folio;
  parsed.monto_bs = correccion.monto_egreso;
  parsed.correccion = correccion.motivo;

  return JSON.stringify(parsed);
}

const env = loadEnv(path.join(projectRoot, ".env.local"));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const resultados = [];

for (const correccion of correcciones) {
  let query = supabase
    .from("comision_documentos")
    .select("id,numero_recibo,folio,monto_egreso,observaciones,texto_extraido")
    .eq("gestion_id", gestionId)
    .eq("tipo_documento", "cuaderno_egresos_revisora")
    .eq("folio", correccion.folio);

  if (correccion.buscarRecibo) {
    query = query.eq("numero_recibo", correccion.buscarRecibo);
  }

  const { data, error } = await query;
  if (error) throw error;

  const candidatos = (data || []).filter((doc) => paginaDesdeDocumento(doc) === correccion.pagina);
  if (candidatos.length !== 1) {
    throw new Error(
      `Correccion pagina ${correccion.pagina} folio ${correccion.folio}: se esperaban 1 registro y se encontraron ${candidatos.length}`
    );
  }

  const doc = candidatos[0];
  const { error: updateError } = await supabase
    .from("comision_documentos")
    .update({
      numero_recibo: correccion.numero_recibo,
      folio: correccion.folio,
      monto_egreso: correccion.monto_egreso,
      estado_revision: "pendiente_revision",
      texto_extraido: actualizarTextoExtraido(doc.texto_extraido, correccion),
      observaciones: `${doc.observaciones || ""} | Correccion usuario: ${correccion.motivo}`,
    })
    .eq("id", doc.id);

  if (updateError) throw updateError;

  resultados.push({
    id: doc.id,
    pagina: correccion.pagina,
    folio: correccion.folio,
    recibo_anterior: normalizar(doc.numero_recibo),
    recibo_nuevo: correccion.numero_recibo,
    monto_anterior: Number(doc.monto_egreso || 0),
    monto_nuevo: correccion.monto_egreso,
  });
}

console.log(JSON.stringify(resultados, null, 2));
