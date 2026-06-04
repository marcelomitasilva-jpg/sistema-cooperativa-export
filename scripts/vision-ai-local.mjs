import { GoogleGenAI } from "@google/genai";
import { analizarImagenesConOpenAI, limpiarJson } from "../lib/openai-vision.js";

async function analizarImagenesConGemini({ apiKey, prompt, imagenes, model }) {
  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY en .env.local");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: model || "gemini-2.5-flash",
    contents: [
      ...imagenes.map((imagen) => ({
        inlineData: { data: imagen.imagenBase64, mimeType: imagen.mimeType },
      })),
      prompt,
    ],
  });

  return JSON.parse(limpiarJson(response.text.trim()));
}

export async function analizarImagenesLocal({ env, prompt, imagenes }) {
  const provider = (env.AI_VISION_PROVIDER || "gemini").toLowerCase();

  if (provider === "openai") {
    return analizarImagenesConOpenAI({
      apiKey: env.OPENAI_API_KEY,
      prompt,
      imagenes,
      model: env.OPENAI_VISION_MODEL,
    });
  }

  return analizarImagenesConGemini({
    apiKey: env.GEMINI_API_KEY,
    prompt,
    imagenes,
    model: env.GEMINI_VISION_MODEL,
  });
}
