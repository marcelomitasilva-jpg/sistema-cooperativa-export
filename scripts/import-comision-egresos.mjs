import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const csvPath =
  process.argv[2] ||
  path.join(
    projectRoot,
    "imports",
    "comision-revisora",
    "egresos-manuscritos-extraidos-parcial-paginas-01-06.csv"
  );
const gestion = Number(process.argv.find((arg) => arg.startsWith("--gestion="))?.split("=")[1] || 2019);
const force = process.argv.includes("--force");
const loteDescripcion = `Importacion cuaderno egresos paginas 1-6 gestion ${gestion}`;

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

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (quoted && ch === '"' && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (!quoted && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift();
  return rows
    .filter((item) => item.length === headers.length)
    .map((item) => Object.fromEntries(headers.map((header, index) => [header, item[index]])));
}

function numero(valor) {
  const n = Number(String(valor || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function normalizarRecibo(valor) {
  const limpio = String(valor || "").trim();
  if (!limpio) return null;
  if (/^(s\/n|sn|sin numero|sin nro)$/i.test(limpio)) return null;
  return limpio;
}

function limpiar(valor) {
  const texto = String(valor || "").trim();
  return texto || null;
}

function observacionesFila(row) {
  const partes = [`Pagina ${row.pagina || "s/p"} fila ${row.fila || "s/f"}`];
  if (row.observaciones) partes.push(`Obs: ${row.observaciones}`);
  if (row.dudas) partes.push(`Dudas IA: ${row.dudas}`);
  if (!normalizarRecibo(row.numero_recibo)) partes.push("Recibo sin numero visible; revisar por fecha y folio.");
  return partes.join(" | ");
}

const env = loadEnv(path.join(projectRoot, ".env.local"));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));

if (!rows.length) {
  throw new Error(`El CSV no tiene filas: ${csvPath}`);
}

const { data: existingGestion, error: gestionReadError } = await supabase
  .from("comision_gestiones")
  .select("*")
  .eq("gestion", gestion)
  .ilike("nombre", `%${gestion}%`)
  .limit(1)
  .maybeSingle();

if (gestionReadError) throw gestionReadError;

let gestionRow = existingGestion;
if (!gestionRow) {
  const { data, error } = await supabase
    .from("comision_gestiones")
    .insert([
      {
        gestion,
        nombre: `Comision revisora gestion ${gestion}`,
        observaciones: "Creada automaticamente desde importacion de cuaderno manuscrito.",
      },
    ])
    .select("*")
    .single();
  if (error) throw error;
  gestionRow = data;
}

const { data: existingLote, error: loteReadError } = await supabase
  .from("comision_lotes_carga")
  .select("*")
  .eq("gestion_id", gestionRow.id)
  .eq("descripcion", loteDescripcion)
  .limit(1)
  .maybeSingle();

if (loteReadError) throw loteReadError;
if (existingLote && !force) {
  throw new Error(
    `El lote ya existe (${existingLote.id}). Usa --force solo si quieres duplicar/importar nuevamente.`
  );
}

const { data: lote, error: loteError } = await supabase
  .from("comision_lotes_carga")
  .insert([
    {
      gestion_id: gestionRow.id,
      tipo_fuente: "cuaderno_egresos_revisora",
      descripcion: loteDescripcion,
      cantidad_imagenes: 6,
      estado: "pendiente_revision",
    },
  ])
  .select("*")
  .single();

if (loteError) throw loteError;

const payload = rows.map((row) => ({
  gestion_id: gestionRow.id,
  lote_carga_id: lote.id,
  tipo_documento: "cuaderno_egresos_revisora",
  tipo_movimiento: "egreso",
  fuente: "importacion_csv_ia",
  fecha_documento: limpiar(row.fecha),
  folio: limpiar(row.folio),
  numero_recibo: normalizarRecibo(row.numero_recibo),
  concepto: limpiar(row.detalle) || "Sin detalle",
  categoria: limpiar(row.rubro),
  rubro: limpiar(row.rubro),
  subrubro: limpiar(row.subrubro),
  monto_ingreso: 0,
  monto_egreso: numero(row.monto_bs),
  estado_revision: normalizarRecibo(row.numero_recibo)
    ? "pendiente_revision"
    : "sin_numero_recibo_pendiente",
  texto_extraido: JSON.stringify(row),
  confianza: row.confianza === "" ? null : numero(row.confianza),
  observaciones: observacionesFila(row),
}));

for (let i = 0; i < payload.length; i += 100) {
  const chunk = payload.slice(i, i + 100);
  const { error } = await supabase.from("comision_documentos").insert(chunk);
  if (error) throw error;
}

const total = payload.reduce((sum, item) => sum + Number(item.monto_egreso || 0), 0);
const sinRecibo = payload.filter((item) => !item.numero_recibo).length;

console.log(`Gestion: ${gestionRow.gestion} (${gestionRow.id})`);
console.log(`Lote: ${lote.id}`);
console.log(`Filas importadas: ${payload.length}`);
console.log(`Total egresos: ${total.toFixed(2)}`);
console.log(`Sin numero de recibo: ${sinRecibo}`);
