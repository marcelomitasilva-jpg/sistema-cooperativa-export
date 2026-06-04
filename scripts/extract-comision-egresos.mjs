import fs from "node:fs";
import path from "node:path";
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

  const prompt = `Analiza esta imagen de un cuaderno manuscrito de egresos de una comision revisora.
No hagas una transcripcion general: extrae cada fila de la tabla.

La tabla puede tener columnas como:
- Fecha
- Detalle
- Monto en bolivianos
- Nro recibo
- Nro folio
- Observaciones

Devuelve solo JSON plano, sin markdown:
{
  "pagina": ${pagina},
  "titulo": "titulo visible de la pagina",
  "filas": [
    {
      "fila": 1,
      "fecha": "YYYY-MM-DD o vacio si no se lee",
      "fecha_original": "fecha tal como esta escrita",
      "detalle": "detalle del gasto",
      "monto_bs": 0,
      "numero_recibo": "numero de recibo o vacio",
      "folio": "numero de folio o vacio",
      "observaciones": "observacion escrita",
      "rubro": "Combustible | Explosivos | Prestamos | Telefono | Giros | Empleados | Servicios externos | Viaticos | Materiales | Judicial | Transporte | Gastos generales | otro",
      "subrubro": "Diesel, Gasolina, Aceite, Grasa, Guia, Masa, Fulminante, Capital, Interes, Pasaje, Encomienda, Repuesto, etc.",
      "confianza": 0.0,
      "dudas": "datos dudosos o ilegibles"
    }
  ],
  "observaciones_pagina": "problemas de lectura de esta pagina"
}

Reglas:
- No inventes recibos, folios, fechas ni montos.
- Si un recibo esta vacio, deja el campo vacio.
- Si un folio se repite en varias filas, mantenlo igual.
- Si una fecha esta repetida por comillas o marcas, infiere solo cuando sea claro por continuidad.
- Si un monto tiene decimales o fracciones, conserva el valor decimal.
- Si no estas seguro, pon el mejor dato y explica en dudas.
- Usa punto decimal, no coma decimal.`;

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
      fecha: row.fecha || "",
      fecha_original: row.fecha_original || "",
      detalle: row.detalle || "",
      monto_bs: row.monto_bs ?? "",
      numero_recibo: row.numero_recibo || "",
      folio: row.folio || "",
      observaciones: row.observaciones || "",
      rubro: row.rubro || "",
      subrubro: row.subrubro || "",
      confianza: row.confianza ?? "",
      dudas: row.dudas || "",
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
