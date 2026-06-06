export function crearPromptExtraccionRendicionCuenta({
  contexto = "rendicion_cuenta",
} = {}) {
  return `Actua como auditor documental de una cooperativa minera aurifera de Tipuani, Bolivia.

Tu tarea es extraer informacion de una imagen de respaldo fisico usado para rendicion de cuenta. Puede ser recibo, factura, nota de venta, comprobante manuscrito, comprobante de giro, vale, planilla simple u otro documento de descargo.

Contexto del sistema: ${contexto}.

INSTRUCCIONES IMPORTANTES:
1. Lee el documento completo con maximo cuidado.
2. No inventes datos. Si un dato no se ve claro, usa null o deja texto vacio segun corresponda.
3. Si tienes duda entre dos valores, coloca el valor mas probable y marca confianza como "baja".
4. Extrae el monto total pagado o rendido, no subtotales parciales, salvo que el documento no tenga total claro.
5. Convierte montos a numero decimal en bolivianos.
6. Interpreta montos segun uso boliviano: "2.321,04" es 2321.04, "2,321.04" es 2321.04, "2321" es 2321.00.
7. Si hay varios items, resume el concepto sin perder los items importantes.
8. Si el documento muestra diesel, gasolina, aceite, grasa, explosivos, herramientas, repuestos, materiales o insumos, marca requiere_ingreso_almacen como true.
9. Si el documento es de pasajes, viaticos, alimentacion, servicios externos, honorarios, giro, telefono, deuda o gasto general, clasifica la categoria correctamente.
10. Si no existe numero de recibo/factura/comprobante, usa null.
11. Si no existe folio, usa null.
12. Si hay sello de almacen, sello de la cooperativa, firma o aclaracion, anotalo en observaciones.
13. Si la imagen esta borrosa, cortada o con partes ilegibles, marca campos_dudosos y explica.
14. No corrijas nombres propios si no estas seguro.
15. Devuelve solo JSON valido, sin markdown ni explicacion adicional.

Formato esperado:
{
  "tipo_documento": "recibo | factura | nota_venta | comprobante | giro | vale | planilla | manuscrito | otro",
  "fecha_documento": "YYYY-MM-DD o null",
  "monto": 0,
  "monto_total": 0,
  "concepto": "descripcion breve y clara del descargo",
  "detalle_items": "items visibles importantes separados por coma",
  "categoria": "Compra de Repuestos | Combustible / Diesel | Explosivos | Herramientas / Materiales | Viaticos / Pasajes | Giros / Comisiones | Servicios externos | Alimentacion y Viaticos | Gastos Generales",
  "subcategoria": "Diesel, Gasolina, Aceite, Grasa, Guia, Masa, Fulminante, Repuesto, Herramienta, Pasaje, Alimentacion, Honorario, Telefono, etc.",
  "numero_recibo": "texto o null",
  "numero_factura": "texto o null",
  "numero_comprobante": "texto o null",
  "folio": "texto o null",
  "proveedor": "nombre del proveedor, vendedor o entidad o null",
  "responsable": "persona que recibe, paga o rinde si aparece o null",
  "destino": "lugar o destino del gasto/viaje/giro si aparece o null",
  "tarea": "motivo de la comision o trabajo si aparece o null",
  "requiere_ingreso_almacen": false,
  "cantidad": null,
  "unidad": "litros | unidades | kilos | bolsas | piezas | null",
  "sello_almacen_visible": false,
  "firma_visible": false,
  "confianza": "alta | media | baja",
  "confianza_numerica": 0.0,
  "campos_dudosos": ["fecha_documento", "monto", "numero_recibo", "folio", "concepto"],
  "observaciones": "dudas, borrones, tachaduras, sellos, partes ilegibles o recomendaciones para revisar"
}

CRITERIOS DE CONFIANZA:
- "alta": los datos principales se ven claros y completos.
- "media": el documento se entiende, pero algun dato secundario esta poco claro.
- "baja": monto, fecha, numero, concepto o proveedor estan borrosos, cortados o pueden confundirse.

Antes de responder, revisa nuevamente:
- Que el monto sea el total correcto.
- Que numero de recibo, factura o comprobante no este confundido con NIT, autorizacion, telefono o folio.
- Que la categoria coincida con el gasto real.
- Que los insumos que deben entrar a almacen queden marcados con requiere_ingreso_almacen true.
- Que no hayas inventado datos que no aparecen en la imagen.`;
}

export function crearPromptExtraccionDocumentoComisionRevisora({
  contexto = "comision_revisora",
} = {}) {
  return `Actua como auditor documental de una comision revisora de una cooperativa minera aurifera de Tipuani, Bolivia.

Tu tarea es extraer informacion de una imagen de documento fisico de gestiones anteriores. Puede ser cuaderno de egresos, libro de caja de hacienda, respaldo de tesoreria, prestamo, entrega a cuenta/rendicion, libro de almacen, cuaderno de alzas/produccion, libro de ventas de oro, factura, recibo, nota, vale o comprobante manuscrito.

Contexto del sistema: ${contexto}.

INSTRUCCIONES IMPORTANTES:
1. Lee el documento completo con maximo cuidado.
2. No inventes folio, recibo, fecha, persona, cantidad ni monto.
3. Si un dato no se ve claro, usa null o texto vacio segun corresponda.
4. Si tienes duda entre dos valores, coloca el valor mas probable y marca confianza como "baja".
5. Identifica si el movimiento es ingreso, egreso o neutro/control.
6. Si es egreso de caja o tesoreria, usa monto_egreso.
7. Si es ingreso de caja, prestamo recibido o venta de oro, usa monto_ingreso.
8. Si es rendicion, usa monto_rendido cuando el documento muestre dinero rendido.
9. Si el documento es de almacen o inventario, extrae cantidad, unidad e item.
10. Si el documento es de produccion o venta de oro, extrae cantidad y unidad si aparecen.
11. Si hay sello, firma, tachadura, borron, dato ilegible o correccion manual, anotalo en observaciones.
12. Convierte montos a decimal en bolivianos.
13. Interpreta montos segun uso boliviano: "2.321,04" es 2321.04, "2,321.04" es 2321.04, "2321" es 2321.00.
14. Clasifica rubro y subrubro sin forzar si el documento no da suficiente informacion.
15. Devuelve solo JSON valido, sin markdown ni explicacion adicional.

Formato esperado:
{
  "tipo_documento": "cuaderno_egresos_revisora | caja_hacienda | respaldo_tesoreria | prestamo_cooperativa | entrega_cuenta_rendicion | almacen | alzas_produccion | ventas_oro | respaldo_fisico | otro",
  "tipo_movimiento": "ingreso | egreso | neutro",
  "fecha_documento": "YYYY-MM-DD o null",
  "folio": "texto o null",
  "numero_recibo": "texto o null",
  "persona": "socio, proveedor, prestamista, comprador o responsable o null",
  "concepto": "descripcion breve del movimiento",
  "categoria": "caja | tesoreria | prestamo | rendicion | almacen | produccion | venta_oro | respaldo | otro",
  "rubro": "Combustible | Explosivos | Prestamos | Telefono | Giros | Empleados | Servicios externos | Viaticos | Gastos generales | otro",
  "subrubro": "Diesel, Gasolina, Aceite, Grasa, Guia, Masa, Fulminante, Capital, Interes, Pasaje, Encomienda, Repuesto, etc.",
  "responsable": "persona que recibio, gasto, viajo, rindio o entrego dinero o null",
  "destino": "lugar de viaje, giro o destino del dinero si corresponde o null",
  "tarea": "tarea realizada, comision de trabajo o motivo si corresponde o null",
  "monto_ingreso": 0,
  "monto_egreso": 0,
  "monto_rendido": 0,
  "saldo_libro": null,
  "cantidad": null,
  "unidad": "litros | gramos | unidades | kilos | bolsas | piezas | null",
  "item": "material, articulo, insumo o mineral si corresponde o null",
  "contraparte": "comprador, proveedor, acreedor o deudor si corresponde o null",
  "interes_porcentaje": null,
  "saldo_a_favor": 0,
  "saldo_en_contra": 0,
  "texto_extraido": "transcripcion resumida de lo visible",
  "confianza": "alta | media | baja",
  "confianza_numerica": 0.0,
  "campos_dudosos": ["fecha_documento", "monto_egreso", "numero_recibo", "folio", "concepto"],
  "observaciones": "dudas, borrones, partes ilegibles o datos que necesitan revision"
}

Antes de responder, revisa nuevamente:
- Que el monto este en el campo correcto.
- Que recibo y folio no esten intercambiados.
- Que no confundas NIT, telefono, autorizacion o codigo de control con numero de recibo.
- Que los datos dudosos queden marcados en campos_dudosos y observaciones.
- Que no hayas incluido informacion inventada.`;
}
