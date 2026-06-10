import { NextResponse } from "next/server";
import { analizarImagenes } from "@/lib/vision-ai";
import { crearPromptExtraccionCuadernoEgresos } from "@/lib/comision-prompts";

export async function POST(request) {
  try {
    const { imagenes, tipoFuente } = await request.json();
    const tipoLote = tipoFuente || "auto";

    if (!Array.isArray(imagenes) || imagenes.length === 0) {
      return NextResponse.json({ error: "Faltan imagenes" }, { status: 400 });
    }

    const promptText = crearPromptExtraccionCuadernoEgresos({
      tipoFuente: tipoLote,
    });

    const resultado = await analizarImagenes({
      prompt: promptText,
      imagenes,
    });

    return NextResponse.json({
      ...resultado,
      tipo_lote_solicitado: tipoLote,
      tipo_lote_detectado: resultado.tipo_lote_detectado || resultado.tipo_documento || tipoLote,
      columnas_detectadas: Array.isArray(resultado.columnas_detectadas) ? resultado.columnas_detectadas : [],
    });
  } catch (error) {
    console.error("Error analizando tabla manuscrita:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
