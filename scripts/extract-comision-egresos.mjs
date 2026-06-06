import fs from "node:fs";
import path from "node:path";
import { crearPromptExtraccionCuadernoEgresos } from "../lib/comision-prompts.js";
import { analizarImagenesLocal } from "./vision-ai-local.mjs";

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env.local");
const imagesDir =
  process.argv[2] ||
  path.join(projectRoot, "..", "fotos para importar egresos");
const outputDir = path.join(projectRoot, "imports", "comision-revisora");
const startPageArg = Number(process.argv.find((arg) => arg.startsWith("--start="))?.split("=")[1] || 0);
const endPageArg = Number(process.argv.find((arg) => arg.startsWith("--end="))?.split("=")[1] || 0);

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

function pageNumber(fileName) {
  const match = fileName.match(/pagina\s*(\d+)/i) || fileName.match(/(\d+)/);
  return match ? Number(match[1]) : 9999;
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function limpiarDatoIa(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return text.toUpperCase() === "NO LEGIBLE" ? "" : text;
}

function confianzaIaANumero(value, fallback) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;

  const text = String(value || "").trim().toLowerCase();
  if (text === "alta") return 0.95;
  if (text === "media") return 0.7;
  if (text === "baja") return 0.4;

  const fallbackNumeric = Number(fallback);
  return Number.isFinite(fallbackNumeric) ? fallbackNumeric : "";
}

function toCsv(rows) {
  const headers = [
    "pagina",
    "fila",
    "fecha",
    "fecha_original",
    "detalle",
    "monto_bs",
    "numero_recibo",
    "folio",
    "observaciones",
    "rubro",
    "subrubro",
    "confianza",
    "dudas",
  ];

  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(",")
    ),
  ].join("\n");
}

const env = loadEnv(envPath);
const provider = (env.AI_VISION_PROVIDER || "gemini").toLowerCase();
if (provider === "openai" && !env.OPENAI_API_KEY) {
  throw new Error("Falta OPENAI_API_KEY en .env.local");
}
if (provider !== "openai" && !env.GEMINI_API_KEY) {
  throw new Error("Falta GEMINI_API_KEY en .env.local");
}

const files = fs
  .readdirSync(imagesDir)
  .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
  .sort((a, b) => pageNumber(a) - pageNumber(b));

if (!files.length) {
  throw new Error(`No se encontraron imagenes en ${imagesDir}`);
}

const allRows = [];
const pageResults = [];

function writeOutputs(filesCount) {
  fs.mkdirSync(outputDir, { recursive: true });

  const suffix =
    startPageArg || endPageArg
      ? `-paginas-${String(startPageArg || pageNumber(selectedFiles[0] || "")).padStart(2, "0")}-${String(
          endPageArg || pageNumber(selectedFiles[selectedFiles.length - 1] || "")
        ).padStart(2, "0")}`
      : "";
  const jsonPath = path.join(outputDir, `egresos-manuscritos-extraidos${suffix}.json`);
  const csvPath = path.join(outputDir, `egresos-manuscritos-extraidos${suffix}.csv`);

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        fuente: imagesDir,
        total_paginas: filesCount,
        total_filas: allRows.length,
        paginas: pageResults,
        filas: allRows,
      },
      null,
      2
    ),
    "utf8"
  );

  fs.writeFileSync(csvPath, toCsv(allRows), "utf8");

  return { jsonPath, csvPath };
}

const selectedFiles = files.filter((fileName) => {
  const pagina = pageNumber(fileName);
  if (startPageArg && pagina < startPageArg) return false;
  if (endPageArg && pagina > endPageArg) return false;
  return true;
});

for (const fileName of selectedFiles) {
  const filePath = path.join(imagesDir, fileName);
  const ext = path.extname(fileName).toLowerCase();
  const mimeType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const data = fs.readFileSync(filePath).toString("base64");
  const pagina = pageNumber(fileName);

  const prompt = crearPromptExtraccionCuadernoEgresos({
    pagina,
    tipoFuente: "cuaderno_egresos_revisora",
  });

  console.log(`Analizando pagina ${pagina}: ${fileName}`);

  try {
    const parsed = await analizarImagenesLocal({
      env,
      prompt,
      imagenes: [{ imagenBase64: data, mimeType }],
    });
    const filas = (parsed.filas || []).map((row, index) => ({
      pagina,
      archivo: fileName,
      fila: row.fila || index + 1,
      fecha: limpiarDatoIa(row.fecha || row.fecha_documento),
      fecha_original: limpiarDatoIa(row.fecha_original),
      detalle: limpiarDatoIa(row.detalle || row.concepto),
      monto_bs: row.monto_bs ?? row.monto_egreso ?? "",
      numero_recibo: limpiarDatoIa(row.numero_recibo),
      folio: limpiarDatoIa(row.folio || row.numero_folio),
      observaciones: limpiarDatoIa(row.observaciones),
      rubro: limpiarDatoIa(row.rubro),
      subrubro: limpiarDatoIa(row.subrubro),
      confianza: confianzaIaANumero(row.confianza, row.confianza_numerica),
      dudas: [
        row.dudas,
        row.confianza && typeof row.confianza === "string" ? `Confianza IA: ${row.confianza}` : "",
        Array.isArray(row.campos_dudosos) && row.campos_dudosos.length
          ? `Campos dudosos: ${row.campos_dudosos.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join(" | "),
    }));

    allRows.push(...filas);
    pageResults.push({ ...parsed, archivo: fileName, filas });
    writeOutputs(selectedFiles.length);
  } catch (error) {
    pageResults.push({
      pagina,
      archivo: fileName,
      filas: [],
      error: error.message,
    });
    console.error(`Error en pagina ${pagina}: ${error.message}`);
    writeOutputs(selectedFiles.length);
    if (
      /api key|authentication|incorrect api key|invalid_api_key|quota|billing|exceeded/i.test(
        error.message
      )
    ) {
      break;
    }
  }
}

const { jsonPath, csvPath } = writeOutputs(selectedFiles.length);

console.log(`\nExtraccion terminada`);
console.log(`Paginas: ${selectedFiles.length}`);
console.log(`Filas: ${allRows.length}`);
console.log(`JSON: ${jsonPath}`);
console.log(`CSV: ${csvPath}`);
