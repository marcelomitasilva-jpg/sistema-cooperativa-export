import { NextResponse } from "next/server";
import { analizarImagenes } from "@/lib/vision-ai";

export async function POST(request) {
  try {
    const { imagenes, tipoFuente } = await request.json();

    if (!Array.isArray(imagenes) || imagenes.length === 0) {
      return NextResponse.json({ error: "Faltan imagenes" }, { status: 400 });
    }

    const promptText = `Analiza imagenes de cuadernos manuscritos de una comision revisora minera.
El formato de tabla puede variar. Extrae filas completas aunque el orden de columnas cambie.
La fuente principal es: ${tipoFuente || "cuaderno_egresos_revisora"}.

Devuelve solo JSON plano:
{
  "filas": [
    {
      "tipo_documento": "cuaderno_egresos_revisora",
      "tipo_movimiento": "egreso",
      "fecha_documento": "YYYY-MM-DD o vacio",
      "detalle": "texto exacto o resumido del detalle",
      "concepto": "concepto limpio",
      "monto_egreso": 0,
      "monto_ingreso": 0,
      "numero_recibo": "",
      "folio": "",
      "observaciones": "",
      "rubro": "Combustible | Explosivos | Prestamos | Telefono | Giros | Empleados | Servicios externos | Viaticos | Gastos generales | otro",
      "subrubro": "Diesel, Gasolina, Aceite, Grasa, Guia, Masa, Fulminante, Capital, Interes, etc.",
      "responsable": "asociado, socio, tercero o proveedor",
      "destino": "destino de viaje, giro o dinero",
      "tarea": "tarea o motivo de la comision",
      "confianza": 0.0,
      "dudas": "celdas ilegibles o datos dudosos"
    }
  ],
  "observaciones_generales": "problemas de lectura, paginas cortadas o columnas ambiguas"
}

Reglas:
- No inventes fechas, recibos, folios ni montos.
- Si no existe numero de recibo deja vacio, no lo marques como error.
- Un folio repetido puede ser normal.
- Clasifica rubro y subrubro segun el detalle manuscrito.
- Si un monto esta dudoso, coloca el mejor valor y explica en dudas.`;

    const resultado = await analizarImagenes({
      prompt: promptText,
      imagenes,
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error analizando tabla manuscrita:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
