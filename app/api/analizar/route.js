import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imagenBase64, mimeType } = await request.json();

    if (!imagenBase64) {
      return NextResponse.json({ error: 'Falta la imagen' }, { status: 400 });
    }

    // El servidor lee automáticamente la clave desde .env.local
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const promptText = `Analiza detalladamente esta foto de recibo o factura de gastos de transporte/cooperativa.
    Extrae los siguientes datos de forma ultra precisa y devuélvelos estrictamente en formato JSON plano, sin bloques de código markdown ni decoraciones, con esta estructura exacta:
    {
      "monto": 0.0,
      "concepto": "Descripción breve y limpia de lo comprado",
      "categoria": "Una de estas 4 opciones exactas: 'Compra de Repuestos', 'Combustible / Diésel', 'Alimentación y Viáticos', 'Gastos Generales'"
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { inlineData: { data: imagenBase64, mimeType: mimeType } },
        promptText
      ]
    });

    const textoRespuesta = response.text.trim();
    // Limpieza profunda de formato markdown por seguridad
    const jsonLimpio = textoRespuesta.replace(/```json/g, "").replace(/```/g, "").trim();
    const resultado = JSON.parse(jsonLimpio);

    return NextResponse.json(resultado);

  } catch (error) {
    console.error('Error en API de IA:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}