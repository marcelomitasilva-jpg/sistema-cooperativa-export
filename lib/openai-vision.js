export function limpiarJson(texto) {
  return texto.replace(/```json/g, "").replace(/```/g, "").trim();
}

function extraerTextoRespuesta(data) {
  if (typeof data.output_text === "string") return data.output_text;

  const partes = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        partes.push(content.text);
      }
    }
  }

  return partes.join("\n");
}

export async function analizarImagenesConOpenAI({ apiKey, prompt, imagenes, model }) {
  if (!apiKey) {
    throw new Error("Falta OPENAI_API_KEY en .env.local");
  }

  const input = [
    {
      role: "user",
      content: [
        { type: "input_text", text: prompt },
        ...imagenes.map((imagen) => ({
          type: "input_image",
          image_url: `data:${imagen.mimeType};base64,${imagen.imagenBase64}`,
        })),
      ],
    },
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
      input,
      temperature: 0,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Error llamando a OpenAI");
  }

  const texto = extraerTextoRespuesta(data);
  if (!texto) {
    throw new Error("OpenAI no devolvio texto para analizar");
  }

  return JSON.parse(limpiarJson(texto));
}
