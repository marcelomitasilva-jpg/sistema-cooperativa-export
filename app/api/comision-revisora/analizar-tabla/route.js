import { NextResponse } from "next/server";
import { analizarImagenes } from "@/lib/vision-ai";
import {
  crearPromptAuditoriaExtraccionTabla,
  crearPromptAnalisisEstructuraTabla,
  crearPromptExtraccionConEstructura,
} from "@/lib/comision-prompts";

export async function POST(request) {
  try {
    const { imagenes, tipoFuente, orientacion, modo = "completo", estructura: estructuraConfirmada } = await request.json();
    const tipoLote = tipoFuente || "auto";

    if (!Array.isArray(imagenes) || imagenes.length === 0) {
      return NextResponse.json({ error: "Faltan imagenes" }, { status: 400 });
    }

    let estructura = estructuraConfirmada;

    if (!estructura) {
      const promptEstructura = crearPromptAnalisisEstructuraTabla({
        tipoFuente: tipoLote,
        orientacion: orientacion || "normal",
      });

      estructura = await analizarImagenes({
        prompt: promptEstructura,
        imagenes,
      });
    }

    if (modo === "estructura") {
      return NextResponse.json({
        ...estructura,
        tipo_lote_solicitado: tipoLote,
        tipo_lote_detectado: estructura.tipo_lote_detectado || tipoLote,
        confianza_tipo_lote: estructura.confianza_tipo_lote || "media",
        columnas_detectadas: Array.isArray(estructura.columnas_detectadas) ? estructura.columnas_detectadas : [],
      });
    }

    const promptExtraccion = crearPromptExtraccionConEstructura({
      tipoFuente: tipoLote,
      orientacion: orientacion || "normal",
      estructura,
    });

    const resultadoInicial = await analizarImagenes({
      prompt: promptExtraccion,
      imagenes,
    });

    const promptAuditoria = crearPromptAuditoriaExtraccionTabla({
      tipoFuente: tipoLote,
      estructura,
      extraccion: resultadoInicial,
    });

    const resultadoAuditado = await analizarImagenes({
      prompt: promptAuditoria,
      imagenes,
    });

    const resultado = {
      ...resultadoInicial,
      ...resultadoAuditado,
      resumen: resultadoAuditado.resumen || resultadoInicial.resumen,
      filas: Array.isArray(resultadoAuditado.filas) ? resultadoAuditado.filas : resultadoInicial.filas,
      alertas: Array.isArray(resultadoAuditado.alertas) ? resultadoAuditado.alertas : resultadoInicial.alertas,
      auditoria_extraccion: resultadoAuditado.auditoria_extraccion || null,
    };

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
