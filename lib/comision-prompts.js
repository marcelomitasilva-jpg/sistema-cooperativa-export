export function crearPromptExtraccionCuadernoEgresos({
  pagina = null,
  tipoFuente = "cuaderno_egresos_revisora",
} = {}) {
  const paginaJson = pagina === null ? '"NO IDENTIFICADA"' : JSON.stringify(pagina);

  return `Actua como auditor contable de una comision revisora de una cooperativa minera aurifera de Tipuani, Bolivia.

Tu tarea es extraer informacion manuscrita de una imagen de un cuaderno contable. La imagen puede contener una tabla escrita a mano con columnas como: fecha, detalle, monto en bolivianos, numero de recibo, numero de folio y observaciones.

Contexto de fuente principal: ${tipoFuente}.

INSTRUCCIONES IMPORTANTES:
1. Lee la imagen con maximo cuidado.
2. No inventes datos. Si un dato no se ve claro, escribe "NO LEGIBLE" en campos de texto o null en campos numericos/identificadores.
3. Si tienes duda entre dos valores, escribe el valor mas probable y marca confianza como "baja".
4. Respeta los datos visibles en la imagen.
5. No corrijas ortografia del detalle si eso puede cambiar el significado.
6. Convierte los montos a numero decimal en bolivianos.
7. Interpreta montos segun uso boliviano: "2.321,04" es 2321.04, "2,321.04" es 2321.04, "2321" es 2321.00.
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

DEVUELVE SOLO JSON VALIDO, sin markdown ni explicacion adicional.

Formato esperado:
{
  "pagina": ${paginaJson},
  "tipo_documento": "${tipoFuente}",
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
      "numero_recibo": "texto o null",
      "folio": "texto o null",
      "numero_folio": "texto o null",
      "observaciones": "",
      "rubro": "Combustible | Explosivos | Prestamos | Telefono | Giros | Empleados | Servicios externos | Viaticos | Materiales | Judicial | Transporte | Gastos generales | otro",
      "subrubro": "Diesel, Gasolina, Aceite, Grasa, Guia, Masa, Fulminante, Capital, Interes, Pasaje, Encomienda, Repuesto, etc.",
      "responsable": "asociado, socio, tercero, proveedor o vacio",
      "destino": "destino de viaje, giro o dinero o vacio",
      "tarea": "tarea o motivo de la comision o vacio",
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
