import { NextResponse } from "next/server";
import { analizarImagenes } from "@/lib/vision-ai";
import {
  crearPromptAnalisisEstructuraTabla,
  crearPromptExtraccionConEstructura,
} from "@/lib/comision-prompts";

export async function POST(request) {
  try {
    const { imagenes, tipoFuente, orientacion } = await request.json();
    const tipoLote = tipoFuente || "auto";

    if (!Array.isArray(imagenes) || imagenes.length === 0) {
      return NextResponse.json({ error: "Faltan imagenes" }, { status: 400 });
    }

    const promptEstructura = crearPromptAnalisisEstructuraTabla({
      tipoFuente: tipoLote,
      orientacion: orientacion || "normal",
    });

    const estructura = await analizarImagenes({
      prompt: promptEstructura,
      imagenes,
    });

    const promptExtraccion = crearPromptExtraccionConEstructura({
      tipoFuente: tipoLote,
      orientacion: orientacion || "normal",
      estructura,
    });

    const resultado = await analizarImagenes({
      prompt: promptExtraccion,
      imagenes,
    });

    return NextResponse.json({
      ...resultado,
      tipo_lote_solicitado: tipoLote,
      tipo_lote_detectado:
        resultado.tipo_lote_detectado || estructura.tipo_lote_detectado || resultado.tipo_documento || tipoLote,
      confianza_tipo_lote: resultado.confianza_tipo_lote || estructura.confianza_tipo_lote || "media",
      analisis_tabla: resultado.analisis_tabla || estructura.analisis_tabla || null,
      columnas_detectadas: Array.isArray(resultado.columnas_detectadas)
        ? resultado.columnas_detectadas
        : Array.isArray(estructura.columnas_detectadas)
          ? estructura.columnas_detectadas
          : [],
      estructura_tabla: estructura,
    });
  } catch (error) {
    console.error("Error analizando tabla manuscrita:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
