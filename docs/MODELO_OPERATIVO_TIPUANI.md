# Modelo operativo Tipuani/Yungas

Este sistema debe reflejar la forma real de trabajo de una cooperativa minera aurifera de la zona de Tipuani/Yungas.

## Conceptos corregidos

- El modulo no se llama frente; se llama **punta**.
- Cada punta tiene normalmente **12 a 13 asociados**.
- Cada punta tiene:
  - **Delegado**
  - **Jefe de punta**
- La cooperativa tiene un **directorio**: presidente, vicepresidente, secretario, tesorero, vocales/fiscal u otros cargos que definan localmente.
- Cada lugar de trabajo puede tener **coordinadores**.
- Los socios rotan por areas/lugares de trabajo, no por puntas individuales.
- Las puntas trabajan en turnos asignados de **8 horas**.

## Turnos actuales

- 08:00 a 16:00
- 16:00 a 00:00
- 00:00 a 08:00

## Lugares de trabajo actuales

- **Mina**: trabajo interior mina.
- **Tujo**: trabajo en cerro con maquinaria a cielo abierto.
- **Rio**: trabajo en rio a cielo abierto.

## Modulos actualizados

- `/puntas`: registra puntas, delegado, jefe de punta y asociados.
- `/puntas`: tambien registra el directorio y coordinadores por lugar de trabajo.
- `/produccion`: registra produccion por punta, lugar de trabajo y turno.
- `/socios/aportes`: registra aportes, multas, deudas, adelantos y pagos.
- `/reportes`: consolida gastos, liquidaciones, inventario y contabilidad.
- `/comision-revisora`: reconstruye gestiones anteriores desde libros fisicos, recibos y respaldos.

## Comision revisora

La comision revisora trabaja sobre gestiones pasadas. Su objetivo principal no es registrar la operacion diaria, sino reconstruir una gestion con documentos fisicos y verificar que todo cuadre.

Fuentes de informacion:

- Libro de caja de hacienda.
- Respaldos originales de ingresos y egresos de tesoreria.
- Prestamos a la cooperativa, con o sin interes.
- Entregas a cuenta y rendiciones a socios para comisiones de trabajo.
- Libro de almacen con saldos iniciales, ingresos, salidas y saldos.
- Cuaderno de alzas o produccion de material aurifero.
- Libro de ventas de oro.

Cruces necesarios:

- Folio y numero de recibo como referencias principales.
- Si un recibo manuscrito no tiene numero, se revisa usando fecha y folio como guia.
- Un numero de recibo repetido no siempre es anomalia. Es sospechoso si aparece con la misma fecha y el mismo folio, o si repite el mismo detalle/monto.
- Los folios se reinician por mes en gestiones anteriores. Por eso un folio repetido entre meses distintos no debe marcarse como anomalia.
- Caja vs respaldos fisicos.
- Entrega a cuenta vs rendicion.
- Compra de insumos vs ingreso a almacen.
- Salida de almacen vs trabajo o consumo declarado.
- Alzas/produccion vs ventas de oro.
- Prestamos recibidos vs pagos, saldos e intereses.

## SQL requerido

Ejecutar en Supabase:

- `docs/supabase-modelo-operativo-minero.sql`
- `docs/supabase-asientos-contables.sql`
- `docs/supabase-plan-cuentas-patrimonio.sql`
- `docs/supabase-comision-revisora.sql`

## Siguiente ajuste recomendado

Adaptar liquidaciones al reparto real por punta:

```text
venta de oro
- combustible
- maquinaria
- alimentacion
- adelantos
- aporte cooperativa
- otros descuentos
= saldo a repartir
```

Ese reparto debe asociarse a una punta y, si corresponde, distribuirse entre sus asociados.
