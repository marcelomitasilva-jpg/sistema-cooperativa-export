import { NextResponse } from "next/server";
import { analizarImagenes } from "@/lib/vision-ai";

export async function POST(request) {
  try {
    const { imagenBase64, mimeType } = await request.json();

    if (!imagenBase64) {
      return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });
    }

    const promptText = `Analiza esta imagen de documento fisico de una cooperativa minera aurifera.
Puede ser cuaderno de egresos de la comision revisora, libro de caja, respaldo de tesoreria,
prestamo, entrega a cuenta/rendicion, libro de almacen, cuaderno de alzas/produccion,
libro de ventas de oro o respaldo fisico.

Extrae datos utiles para una comision revisora de una gestion anterior.
Devuelve solo JSON plano, sin markdown, con esta estructura exacta:
{
  "tipo_documento": "cuaderno_egresos_revisora | caja_hacienda | respaldo_tesoreria | prestamo_cooperativa | entrega_cuenta_rendicion | almacen | alzas_produccion | ventas_oro | respaldo_fisico | otro",
  "tipo_movimiento": "ingreso | egreso | neutro",
  "fecha_documento": "YYYY-MM-DD o vacio",
  "folio": "folio o pagina visible",
  "numero_recibo": "numero de recibo/comprobante si existe",
  "persona": "nombre de socio, proveedor, prestamista o responsable",
  "concepto": "descripcion breve del movimiento",
  "categoria": "caja | tesoreria | prestamo | rendicion | almacen | produccion | venta_oro | respaldo | otro",
  "rubro": "Combustible | Explosivos | Prestamos | Telefono | Giros | Empleados | Servicios externos | Viaticos | Gastos generales | otro",
  "subrubro": "Diesel, Gasolina, Aceite, Grasa, Guia, Masa, Fulminante, Capital, Interes, etc.",
  "responsable": "persona que recibio, gasto, viajo o rindio el dinero",
  "destino": "lugar de viaje, giro o destino del dinero si corresponde",
  "tarea": "tarea realizada, comision de trabajo o motivo si corresponde",
  "monto_ingreso": 0,
  "monto_egreso": 0,
  "monto_rendido": 0,
  "saldo_libro": null,
  "cantidad": null,
  "unidad": "",
  "item": "material, articulo o mineral si corresponde",
  "contraparte": "comprador, proveedor o acreedor si corresponde",
  "interes_porcentaje": null,
  "saldo_a_favor": 0,
  "saldo_en_contra": 0,
  "texto_extraido": "transcripcion resumida de lo visible",
  "confianza": 0.0,
  "observaciones": "dudas, borrones, partes ilegibles o datos que necesitan revision"
}

Reglas:
- Si es egreso de caja, usa monto_egreso.
- Si es ingreso a caja o venta de oro, usa monto_ingreso.
- Si aparecen ambos debe ser porque el documento realmente muestra ambos.
- No inventes folio, recibo, fecha ni montos. Si no se ve, deja vacio o null.`;

    const resultado = await analizarImagenes({
      prompt: promptText,
      imagenes: [{ imagenBase64, mimeType }],
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error en IA comision revisora:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
