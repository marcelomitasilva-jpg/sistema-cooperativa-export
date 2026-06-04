import { NextResponse } from "next/server";
import { analizarImagenes } from "@/lib/vision-ai";

export async function POST(request) {
  try {
    const { imagenBase64, mimeType, movimiento } = await request.json();

    if (!imagenBase64 || !movimiento) {
      return NextResponse.json({ error: "Falta imagen o movimiento" }, { status: 400 });
    }

    const promptText = `Compara este respaldo fisico con el movimiento registrado en cuaderno.

Movimiento registrado:
${JSON.stringify(movimiento, null, 2)}

Devuelve solo JSON plano:
{
  "resultado_verificacion": "coincide | requiere_revision | monto_diferente | fecha_diferente | detalle_no_coincide | recibo_no_visible | respaldo_ilegible",
  "tipo_respaldo": "recibo | factura | nota | comprobante | otro",
  "fecha_respaldo": "YYYY-MM-DD o vacio",
  "numero_recibo": "",
  "folio": "",
  "persona": "",
  "detalle": "",
  "monto": 0,
  "texto_extraido": "transcripcion resumida del respaldo",
  "diferencias": [
    { "campo": "monto", "movimiento": "350", "respaldo": "320", "detalle": "explicacion breve" }
  ],
  "confianza": 0.0,
  "observaciones": "recomendacion para la comision revisora"
}

Reglas:
- Verifica fecha, monto, detalle, numero de recibo, folio y persona si son visibles.
- Si el recibo no muestra un dato, no lo inventes.
- Si coincide por monto y detalle aunque falte recibo, usa requiere_revision y explica.
- Si es ilegible, usa respaldo_ilegible.`;

    const resultado = await analizarImagenes({
      prompt: promptText,
      imagenes: [{ imagenBase64, mimeType }],
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error verificando respaldo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
