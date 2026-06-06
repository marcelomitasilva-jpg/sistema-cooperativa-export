import { GoogleGenAI } from "@google/genai";
import { analizarImagenesConOpenAI, limpiarJson } from "./openai-vision";

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
  const response = await ai.models.generateContent({
    model: model || process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash",
    contents: [
      ...imagenes.map((imagen) => ({
        inlineData: { data: imagen.imagenBase64, mimeType: imagen.mimeType },
      })),
      prompt,
    ],
  });

  return JSON.parse(limpiarJson(response.text.trim()));
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
