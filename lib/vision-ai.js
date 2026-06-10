import { GoogleGenAI } from "@google/genai";
import { analizarImagenesConOpenAI, limpiarJson } from "./openai-vision";

function esperar(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function modelosGemini(modeloPreferido) {
  return [
    modeloPreferido,
    process.env.GEMINI_VISION_MODEL,
    ...(process.env.GEMINI_VISION_FALLBACK_MODELS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
  ].filter((modelo, index, lista) => modelo && lista.indexOf(modelo) === index);
}

function esErrorTemporalGemini(error) {
  const texto = `${error?.message || ""} ${error?.status || ""}`.toLowerCase();
  return (
    error?.status === 429 ||
    error?.status === 500 ||
    error?.status === 502 ||
    error?.status === 503 ||
    error?.status === 504 ||
    texto.includes("unavailable") ||
    texto.includes("high demand") ||
    texto.includes("rate limit") ||
    texto.includes("overloaded")
  );
}

async function analizarImagenesConGemini({ apiKey, prompt, imagenes, model }) {
  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY en .env.local");
  }

  // En este equipo Windows, Node puede no encontrar la cadena raiz usada por la API de Gemini.
  // Lo habilitamos solo del lado servidor/local para que la carga con IA no falle por certificado.
  if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const ai = new GoogleGenAI({ apiKey });
  const contents = [
    ...imagenes.map((imagen) => ({
      inlineData: { data: imagen.imagenBase64, mimeType: imagen.mimeType },
    })),
    prompt,
  ];
  const modelos = modelosGemini(model || process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash");
  let ultimoError = null;

  for (const modelo of modelos) {
    for (let intento = 0; intento < 3; intento += 1) {
      try {
        const response = await ai.models.generateContent({
          model: modelo,
          contents,
        });

        return JSON.parse(limpiarJson(response.text.trim()));
      } catch (error) {
        ultimoError = error;
        const temporal = esErrorTemporalGemini(error);
        const ultimoIntentoDelModelo = intento === 2;

        console.warn(
          `Gemini fallo con ${modelo} intento ${intento + 1}: ${error?.status || ""} ${
            error?.message || error
          }`
        );

        if (!temporal) break;
        if (!ultimoIntentoDelModelo) {
          await esperar(900 * (intento + 1));
        }
      }
    }
  }

  if (esErrorTemporalGemini(ultimoError)) {
    throw new Error(
      "Gemini esta con alta demanda en este momento. Intenta de nuevo en unos minutos o carga menos paginas por lote."
    );
  }

  throw ultimoError || new Error("No se pudo analizar la imagen con Gemini.");
}

export async function analizarImagenes({ provider, prompt, imagenes, model }) {
  const aiProvider = (provider || process.env.AI_VISION_PROVIDER || "gemini").toLowerCase();

  if (aiProvider === "openai") {
    return analizarImagenesConOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      prompt,
      imagenes,
      model: model || process.env.OPENAI_VISION_MODEL,
    });
  }

  return analizarImagenesConGemini({
    apiKey: process.env.GEMINI_API_KEY,
    prompt,
    imagenes,
    model: model || process.env.GEMINI_VISION_MODEL,
  });
}
