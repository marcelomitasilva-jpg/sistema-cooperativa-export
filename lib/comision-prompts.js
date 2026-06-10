export function crearPromptExtraccionCuadernoEgresos({
  pagina = null,
  tipoFuente = "cuaderno_egresos_revisora",
} = {}) {
  const paginaJson = pagina === null ? '"NO IDENTIFICADA"' : JSON.stringify(pagina);
  const modoAutomatico = tipoFuente === "auto" || tipoFuente === "detectar_auto";

  return `Actua como auditor contable de una comision revisora de una cooperativa minera aurifera de Tipuani, Bolivia.

Tu tarea es extraer informacion manuscrita de una o varias imagenes de un cuaderno contable. Las paginas pueden pertenecer al mismo lote y tener columnas variables.

Contexto de fuente principal: ${tipoFuente}.

CONTEXTO OPERATIVO:
- La cooperativa puede tener varias areas o lugares de trabajo. Actualmente son comunes: Mina, Tujo y Rio.
- Otra cooperativa, o la misma cooperativa en otra gestion, puede usar otros nombres de area. No limites la lectura a Mina/Tujo/Rio.
- Si ves una columna o dato de area/lugar/frente/trabajo, guarda ese valor en "destino" y conserva el texto visible.
- Si aparecen areas nuevas, no las corrijas ni las reemplaces por Mina/Tujo/Rio; extraelas como estan escritas.
- Si las areas aparecen como ENCABEZADOS DE COLUMNA con cantidad, por ejemplo "Tujo (gr)" y "Mina (gr)", mantenlas como columnas separadas. No las conviertas en una sola columna "Area/Lugar".

${
  modoAutomatico
    ? `MODO AUTOMATICO:
Antes de extraer, identifica el tipo de lote principal. Elige uno:
- alzas_produccion: produccion/alza de oro, gramos, latas, sacos, punta, lugar de trabajo.
- ventas_oro: venta de oro, comprador, peso, ley, precio, total, recibo, folio.
- ingresos_prestamos_pagos: prestamos recibidos, pagos, devoluciones, intereses, deuda, acreedor/deudor.
- otros_ingresos: otros ingresos de caja, cuotas, aportes, multas, devoluciones, cobros varios.
- egresos_generales: gastos generales, compras, pagos, servicios, honorarios, empleados.
- combustible: diesel, gasolina, aceite, grasa, lubricantes.
- explosivos: guia, masa, fulminante, dinamita, explosivos.
- almacen: ingresos/salidas de almacen, saldos, item, cantidad, unidad.
- rendiciones_viaticos: entregas a cuenta, viaticos, viajes, descargos, saldos.
- otro: si no encaja.

Si varias paginas parecen del mismo tipo, tratalas como un solo lote. Si una pagina parece de otro tipo, marcala en observaciones_pagina y extrae igual sin inventar.`
    : `TIPO DE LOTE INDICADO POR EL USUARIO:
Usa "${tipoFuente}" como tipo principal, pero si ves que la imagen claramente pertenece a otro tipo, indicalo en tipo_lote_detectado y en observaciones_generales.`
}

INSTRUCCIONES IMPORTANTES:
1. Lee la imagen con maximo cuidado.
2. No inventes datos. Si un dato no se ve claro, escribe "NO LEGIBLE" en campos de texto o null en campos numericos/identificadores.
3. Si tienes duda entre dos valores, escribe el valor mas probable y marca confianza como "baja".
4. Respeta los datos visibles en la imagen.
5. No corrijas ortografia del detalle si eso puede cambiar el significado.
6. Convierte los montos a numero decimal en bolivianos.
7. Interpreta montos segun uso boliviano: "2.321,04" es 2321.04, "2,321.04" es 2321.04, "2321" es 2321.00.
7.1 Si la imagen esta girada, de costado o cabeza abajo, primero orienta mentalmente la hoja y lee la tabla desde su cabecera real antes de extraer filas.
8. Si no existe numero de recibo, usa null.
9. Si no existe numero de folio, usa null.
10. Si una misma fila continua en otra linea, unela como una sola operacion.
11. Si hay tachaduras, borrones o correcciones manuales, anotalo en observaciones.
12. Si hay totales al final de la pagina, separalos y no los mezcles como egresos normales.
13. No agrupes filas. Cada movimiento debe ser una fila independiente.
14. Manten el orden exacto en que aparecen las filas en la imagen.
15. Si una celda parece vacia pero puede inferirse por repeticion de arriba, no la infieras salvo que este claramente indicado por continuidad.
16. Recibo y folio son campos distintos. Revisa dos veces que no esten intercambiados.
17. Un folio repetido puede ser normal, sobre todo si la gestion foliaba por mes.
18. Un recibo sin numero no es error, pero debe quedar marcado para revision.
19. Clasifica rubro y subrubro segun el detalle visible, sin forzar clasificaciones.
20. Si el lote es alzas_produccion, la cantidad de oro/material es mas importante que el monto.
21. Si el lote es ventas_oro, registra peso/cantidad, unidad, ley, precio_unitario, monto_total y comprador.
22. Si el lote es prestamos/pagos, separa capital, interes, pago, saldo a favor/saldo en contra si aparecen.
23. Si el lote es combustible/almacen, registra item, cantidad, unidad, ingreso/salida y saldo si aparecen.
24. Si una columna no existe en la tabla, devuelve null o texto vacio para ese campo.
25. Usa las unidades reales de la cooperativa:
   - "Bs" significa bolivianos. Usalo solo para dinero/montos, no para peso.
   - "gr", "g", "gramo" o "gramos" significa peso de oro. Normaliza unidad como "gramos".
   - "mita" significa una jornada/dia de trabajo. Normaliza unidad como "mita".
   - "lt", "lts", "litro" o "litros" significa combustible o liquidos. Normaliza unidad como "litros".
   - "unidad", "unidades", "pza", "pieza" o "piezas" significa conteo de items. Normaliza segun corresponda.
26. En alzas_produccion y ventas_oro, si ves "gr" manuscrito, interpretalo como gramos. No lo confundas con "QR".
27. "QR" no es una unidad valida para alza/produccion de oro. Si parece QR en una alza, revisa nuevamente: probablemente es "gr" o el dato esta mal leido. Marca campo dudoso si no estas seguro.
28. No uses "QR" como unidad salvo que el documento hable claramente de codigo QR de pago, que no corresponde a tablas de alza de oro.
29. Analiza a fondo la estructura de la tabla antes de extraer filas: encabezados, columnas, subcolumnas, totales y notas.
30. La pantalla de revision debe reflejar solo las columnas visibles en la imagen. Por eso, en "columnas_detectadas" devuelve solamente columnas que realmente existen en la tabla manuscrita.
31. No agregues columnas solo porque el sistema las conoce. Si no ves "recibo", no agregues columna recibo. Si no ves "folio", no agregues folio. Si no ves "precio", no agregues precio.
32. Para cada columna detectada, devuelve key, label y original. Usa key tecnica cuando se pueda mapear, pero conserva el nombre original escrito en la imagen.
33. Si hay una columna de area, lugar, frente o trabajo donde cada fila contiene el nombre del area, usa key "destino" y label "Area/Lugar".
34. Si el nombre del area es el encabezado de una columna de cantidad, usa una key dinamica por area. Ejemplo: "Tujo (gr)" -> key "tujo_gr", label "Tujo (gr)"; "Mina (gr)" -> key "mina_gr", label "Mina (gr)".
35. No devuelvas columna "N", "No", "Nro", "Fila" o numero de renglon como columna de revision. Ese dato va solo en "numero_fila_visual".
36. Si ves "Bs" repetido por separacion de la rayadura o por doble linea del encabezado, unificalo en una sola columna "Bs" con key "monto_ingreso" si es alza/ingreso, o "monto_egreso" si es gasto.
37. En cada fila, ademas de los campos normalizados, incluye las keys dinamicas que hayas declarado en "columnas_detectadas". Ejemplo: si declaras "tujo_gr" y "mina_gr", cada fila debe traer "tujo_gr": 220.10, "mina_gr": null, etc.
38. Para tablas de alza como "Libro de Alza Gestion 2019", la estructura esperada puede ser: Fecha, Tujo (gr), Mina (gr), Bs, Observaciones. Extrae exactamente esas columnas si son las visibles.

PROCESO OBLIGATORIO ANTES DE EXTRAER:
Haz este analisis mentalmente y reflejalo resumido en "analisis_tabla":
1. Orientacion: confirma si la hoja esta derecha, girada, de lado o cabeza abajo. Lee siempre desde la cabecera real.
2. Limites de tabla: identifica donde empieza la cabecera, donde empiezan las filas reales y donde terminan. No incluyas titulos, subtitulos, totales ni notas como filas normales.
3. Columnas reales: enumera solo las columnas visibles. Si una columna se ve partida por lineas del cuaderno, no la dupliques.
4. Tipo de dato por columna: decide si cada columna es fecha, dinero Bs, peso gramos, cantidad, texto, recibo, folio, area/lugar, saldo u observacion.
5. Relacion entre columnas: si "Tujo (gr)" y "Mina (gr)" son columnas de produccion por area, conserva ambas columnas y no crees una columna adicional "Area".
6. Validacion fila por fila: antes de devolver filas, revisa que cada valor este en la columna correcta. Un monto de Bs no debe entrar en gramos; un peso en gramos no debe entrar en Bs.
7. Filas vacias o parciales: si una fila solo tiene fecha y no tiene movimiento, marcala como dudosa o no la incluyas si claramente no es un movimiento.
8. Totales: si hay total escrito, guardalo en resumen, no como fila.
9. Coherencia: compara cantidad de filas visibles contra filas devueltas. Si hay diferencia, explicala en observaciones_pagina.
10. Dudas: registra en alertas cualquier columna o fila que pueda estar mal leida.

DEVUELVE SOLO JSON VALIDO, sin markdown ni explicacion adicional.

Formato esperado:
{
  "pagina": ${paginaJson},
  "tipo_lote_detectado": "alzas_produccion | ventas_oro | ingresos_prestamos_pagos | otros_ingresos | egresos_generales | combustible | explosivos | almacen | rendiciones_viaticos | otro",
  "tipo_documento": "${tipoFuente}",
  "confianza_tipo_lote": "alta | media | baja",
  "analisis_tabla": {
    "orientacion_imagen": "derecha | girada | de_lado | cabeza_abajo | dudosa",
    "lectura_desde_cabecera": true,
    "cabecera_detectada": "texto visible de la cabecera o NO LEGIBLE",
    "columnas_reales_visibles": ["Fecha", "Tujo (gr)", "Mina (gr)", "Bs", "Observaciones"],
    "columnas_descartadas": ["N/No/Fila si solo es numeracion"],
    "tipos_por_columna": {
      "Fecha": "fecha",
      "Tujo (gr)": "peso_gramos",
      "Mina (gr)": "peso_gramos",
      "Bs": "dinero_bolivianos",
      "Observaciones": "texto"
    },
    "filas_visibles_estimadas": 0,
    "filas_extraidas": 0,
    "totales_detectados": "texto o vacio",
    "criterio_extraccion": "explicacion breve de como se leyo la tabla",
    "riesgos_lectura": ["riesgos o dudas principales"]
  },
  "columnas_detectadas": [
    { "key": "fecha_documento", "label": "Fecha", "original": "Fecha" },
    { "key": "concepto", "label": "Detalle", "original": "Detalle" },
    { "key": "cantidad", "label": "Cantidad", "original": "Peso" },
    { "key": "unidad", "label": "Unidad", "original": "Unidad" },
    { "key": "tujo_gr", "label": "Tujo (gr)", "original": "Tujo (gr)" },
    { "key": "mina_gr", "label": "Mina (gr)", "original": "Mina (gr)" },
    { "key": "monto_ingreso", "label": "Bs", "original": "Bs" },
    { "key": "observaciones", "label": "Observaciones", "original": "Observaciones" }
  ],
  "titulo": "titulo visible de la pagina o NO LEGIBLE",
  "resumen": {
    "cantidad_filas_detectadas": 0,
    "total_montos_detectado": 0,
    "hay_total_en_imagen": false,
    "total_escrito_en_imagen": null,
    "diferencia_total": null,
    "observaciones_generales": ""
  },
  "filas": [
    {
      "fila": 1,
      "numero_fila_visual": 1,
      "fecha": "YYYY-MM-DD o NO LEGIBLE",
      "fecha_original": "fecha tal como esta escrita o NO LEGIBLE",
      "detalle": "texto exacto del detalle",
      "concepto": "concepto limpio sin cambiar el sentido",
      "monto_bs": 0,
      "monto_egreso": 0,
      "monto_ingreso": 0,
      "monto_rendido": 0,
      "numero_recibo": "texto o null",
      "folio": "texto o null",
      "numero_folio": "texto o null",
      "persona": "socio, proveedor, comprador, acreedor, empleado o vacio",
      "observaciones": "",
      "rubro": "Combustible | Explosivos | Prestamos | Telefono | Giros | Empleados | Servicios externos | Viaticos | Materiales | Judicial | Transporte | Gastos generales | otro",
      "subrubro": "Diesel, Gasolina, Aceite, Grasa, Guia, Masa, Fulminante, Capital, Interes, Pasaje, Encomienda, Repuesto, etc.",
      "responsable": "asociado, socio, tercero, proveedor o vacio",
      "destino": "destino de viaje, giro o dinero o vacio",
      "tarea": "tarea o motivo de la comision o vacio",
      "cantidad": null,
      "tujo_gr": null,
      "mina_gr": null,
      "unidad": "Bs | gramos | mita | litros | kilos | unidades | piezas | bolsas | null",
      "item": "oro, diesel, gasolina, aceite, repuesto, herramienta, explosivo u otro item o vacio",
      "contraparte": "comprador, proveedor, acreedor, deudor o vacio",
      "precio_unitario": null,
      "precio_referencia": null,
      "ley_oro": "ley/pureza/calidad si aparece o vacio",
      "interes_porcentaje": null,
      "saldo_libro": null,
      "saldo_a_favor": 0,
      "saldo_en_contra": 0,
      "tipo_movimiento": "ingreso | egreso | neutro",
      "confianza": "alta | media | baja",
      "confianza_numerica": 0.0,
      "dudas": "datos dudosos o ilegibles",
      "campos_dudosos": ["fecha", "monto_bs", "numero_recibo", "folio", "detalle"]
    }
  ],
  "alertas": [
    {
      "tipo": "monto_dudoso | recibo_dudoso | folio_dudoso | fecha_dudosa | fila_no_legible | posible_total | posible_duplicado | otro",
      "descripcion": ""
    }
  ],
  "observaciones_pagina": "problemas de lectura de esta pagina"
}

CRITERIOS DE CONFIANZA:
- "alta": el dato se ve claro y completo.
- "media": el dato se entiende, pero hay alguna dificultad visual menor.
- "baja": el dato es dudoso, borroso, tachado, cortado o puede confundirse con otro numero/letra.

Antes de responder, revisa nuevamente:
- Que no falte ninguna fila visible.
- Que los montos esten correctamente convertidos.
- Que "Bs" quede solo como moneda de bolivianos.
- Que "gr/g/gramos" en alzas o ventas de oro quede como "gramos", nunca como "QR".
- Que "mita" quede como jornada o dia de trabajo.
- Que "litros" se use para combustible/liquidos.
- Que "N/No/Fila" no aparezca como columna de revision, solo como numero_fila_visual.
- Que columnas de areas como "Tujo (gr)" y "Mina (gr)" se mantengan separadas y con sus valores en cada fila.
- Que un encabezado "Bs" repetido se muestre una sola vez.
- Que recibo y folio no esten intercambiados.
- Que el total calculado coincida con el total escrito si existe.
- Que no hayas incluido encabezados o totales como si fueran egresos.`;
}

export function crearPromptRevisionExtraccionCuaderno({ extraccion }) {
  return `Actua como segundo revisor contable.

Te dare una imagen manuscrita y un JSON extraido previamente. Tu tarea es auditar la extraccion contra la imagen.

JSON extraido previamente:
${JSON.stringify(extraccion, null, 2)}

Revisa fila por fila y detecta:
- filas faltantes,
- filas agregadas que no existen,
- montos mal leidos,
- recibos mal leidos,
- folios mal leidos,
- fechas mal leidas,
- detalles incompletos,
- totales incluidos incorrectamente como egresos.

No rehagas todo si esta bien. Devuelve solo JSON valido con las correcciones necesarias.

Formato:
{
  "resultado_revision": "sin_observaciones | con_observaciones",
  "correcciones": [
    {
      "numero_fila_visual": 1,
      "campo": "fecha | detalle | monto_bs | numero_recibo | folio | observaciones",
      "valor_extraido": "",
      "valor_corregido": "",
      "motivo": "",
      "confianza_revision": "alta | media | baja"
    }
  ],
  "filas_faltantes": [],
  "filas_sobrantes": [],
  "observaciones_generales": ""
}`;
}
