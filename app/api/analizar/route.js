import { NextResponse } from "next/server";
import { crearPromptExtraccionRendicionCuenta } from "@/lib/documentacion-prompts";
import { analizarImagenes } from "@/lib/vision-ai";

export async function POST(request) {
  try {
    const { imagenBase64, mimeType } = await request.json();

    if (!imagenBase64) {
      return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });
    }

    const resultado = await analizarImagenes({
      prompt: crearPromptExtraccionRendicionCuenta(),
      imagenes: [{ imagenBase64, mimeType }],
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error en API de IA:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
