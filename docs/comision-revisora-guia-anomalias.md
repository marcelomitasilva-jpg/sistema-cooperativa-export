# Comision Revisora: guia de anomalias y respaldos

Esta guia orienta la revision de gestiones anteriores en una cooperativa minera aurifera. La idea es reconstruir una sola verdad: cada movimiento debe poder explicarse con libro, recibo/folio, respaldo fisico y efecto en caja, almacen u oro.

## Aspectos que debe revisar el sistema

1. Caja y prestamos

- Reconstruir caja por fecha: saldo inicial + ingresos - egresos.
- Alertar caja negativa cuando ya exista saldo inicial o ingresos cargados.
- Alertar prestamo posiblemente innecesario cuando antes del prestamo habia caja suficiente.
- Pedir justificacion del prestamo: motivo, autorizacion, plazo, interes y si se devuelve en oro o bolivianos.
- Separar capital e interes para no mezclar deuda real con costo financiero.

2. Venta de oro

- Registrar fecha, comprador, peso/cantidad, unidad, ley o pureza, monto total y precio unitario.
- Cargar precio de referencia de la fecha cuando exista.
- Alertar si el precio unitario esta por debajo de la referencia mas de 2%.
- Alertar como alto si esta por debajo de la referencia mas de 5%.
- Verificar que toda venta de oro tenga respaldo fisico: recibo, liquidacion, comprobante o constancia firmada.

3. Recibos y folios

- Detectar recibo repetido con misma fecha y folio.
- Detectar recibo repetido con mismo detalle y monto.
- Permitir folios repetidos por mes cuando esa era la forma real de trabajo, pero alertar si se repite mismo contenido.
- Alertar saltos grandes en numeracion de recibos para revisar hojas faltantes.
- Para recibos sin numero, usar fecha + folio + monto + detalle como llave de busqueda.

4. Respaldos fisicos

- Cada movimiento importante debe tener foto original: recibo, factura, nota, vale, comprobante, liquidacion de oro o planilla.
- El sistema debe guardar ruta del archivo, nombre original, tipo, tamano y hash SHA-256.
- La IA debe comparar respaldo contra movimiento: fecha, monto, persona, detalle, folio y recibo.
- Cuando el respaldo no coincide, debe quedar como alerta hasta que la comision lo justifique o corrija.

5. Almacen

- Toda compra de insumo debe conectarse con ingreso a almacen o sello/firma del almacenero.
- Combustible, aceites, grasas, explosivos, repuestos, herramientas y materiales deben poder seguirse desde compra hasta uso/salida.
- Alertar compras grandes sin ingreso a almacen.

6. Rendiciones y viaticos

- Cada entrega a cuenta debe tener responsable, destino, tarea, fechas de ida/vuelta y descargos.
- El sistema debe calcular si quedo saldo a favor o en contra.
- Viaticos y comisiones deben indicar a donde fueron, con quien y para que.

## Recomendacion para guardar recibos en la nube

Para la aplicacion diaria, usar Supabase Storage porque ya esta conectado al sistema y a la IA. Estructura recomendada:

`gestion-2019/originales/recibo/2019-01-10_folio-24_recibo-3548_1234567890.jpg`

Para respaldo serio, no confiar en una sola nube. Usar regla 3-2-1:

- 1 copia de trabajo en Supabase Storage.
- 1 copia en otro servicio, por ejemplo Google Drive, Dropbox, OneDrive o disco externo.
- 1 copia fuera de la computadora de la cooperativa.

Cuando haya presupuesto, conviene una copia inmutable tipo S3 Object Lock, Wasabi Object Lock o Backblaze B2 con retencion. Eso evita que alguien borre o modifique respaldos sin dejar rastro.

## Explicacion con manzanas

Si un egreso dice "compra de diesel Bs 2.000", el sistema no debe quedarse con esa frase. Debe preguntar:

- Donde esta el recibo?
- El recibo dice Bs 2.000?
- Entro diesel a almacen?
- Quien compro?
- En que fecha?
- Habia caja para pagar?
- Si se pidio prestamo, por que se pidio?

Cuando esas respuestas coinciden, el movimiento esta fuerte. Cuando una respuesta falta o no coincide, aparece una anomalia para que la comision revise.
