# Benchmark de software para cooperativa minera

Fecha de revision: 2026-06-06

## Objetivo

Revisar soluciones de software minero, ERP empresarial y gestion cooperativa para tomar buenas ideas y adaptar el sistema a la realidad de una cooperativa aurifera de Tipuani/Yungas.

No se busca copiar una solucion empresarial grande. Se busca aprender que modulos existen, que controles usan y como simplificarlo para usuarios mineros que no siempre manejan contabilidad o computadora.

## Referencias revisadas

### Roca ERP

Enfoque: comercializadores mineros, trazabilidad, tesoreria, compras, proveedores, inventario, ventas y contabilidad automatica.

Ideas utiles:
- Trazabilidad de minerales.
- Tesoreria ordenada con pagos agendados.
- Proveedores y compras conectados.
- Contabilidad automatica por operacion.
- Validaciones de identidad y cumplimiento.

Aplicacion para nuestro sistema:
- Fortalecer venta de oro con acompanantes, pesaje, ley, precio, comprador y respaldo.
- Mantener Tesoreria como pantalla simple, pero con contabilidad interna.
- Crear alertas de deudas, compromisos de venta de oro y vencimientos.

### OSPOST ERP

Enfoque: ERP minero, industrial y transporte. Modulos de inventario, produccion, bascula, trazabilidad, mantenimiento, CRM, facturacion, nomina y contabilidad.

Ideas utiles:
- Produccion con trazabilidad.
- Inventario conectado a compras y consumo.
- Modulo de bascula/pesaje.
- Mantenimiento de maquinaria.
- Trabajo en la nube.

Aplicacion para nuestro sistema:
- Crear un flujo completo: compra -> almacen -> consumo en mina/tujo/rio -> costo.
- Agregar mantenimiento de maquinaria y consumo de combustible/repuestos.
- Registrar produccion por alza, punta, lugar de trabajo y venta.

### ORIX Cubo

Enfoque: sistema boliviano modular multiusuario, contabilidad automatica, centros/subcentros de costo, inventario con imagenes, roles y permisos.

Ideas utiles:
- Asientos contables automaticos por transaccion.
- Reportes financieros por centros de costo.
- Imagenes asociadas al inventario.
- Reglas por usuario/rol.

Aplicacion para nuestro sistema:
- Mantener el centro de costo Mina, Tujo, Rio, Administracion, Almacen y Comision.
- Usar respaldos con imagen en compras, rendiciones, comision revisora y almacen.
- Separar permisos: tesorero, almacenero, comision revisora, directorio, socio.

### TR4 ERP

Enfoque: ERP boliviano con gerencia, contabilidad, tesoreria, clientes, productos y reportes en tiempo real.

Ideas utiles:
- Gerencia necesita informes rapidos.
- Tesoreria y contabilidad deben estar integradas.
- Productos e inventario deben estar disponibles para reportes.

Aplicacion para nuestro sistema:
- Crear tablero del directorio: caja, deudas, oro vendido, almacen, rendiciones pendientes, socios con saldo.
- Reportes simples para asamblea.

### K-MINE

Enfoque: software minero tecnico: geologia, topografia, diseno de mina, tajo abierto, subterraneo, reservas, 3D y analisis.

Ideas utiles:
- No es el foco administrativo, pero muestra que la mineria necesita datos por lugar y operacion.
- Diferencia cielo abierto/subterraneo.
- Gestion por tajo, mina, caminos, botaderos y estructuras.

Aplicacion para nuestro sistema:
- Mantener lugares de trabajo separados: Mina, Tujo y Rio.
- En el futuro, registrar ubicacion o sector del trabajo, aunque sea con nombres simples.

### Gobernanzza

Enfoque: gestion societaria de cooperativas: miembros, roles y participacion.

Ideas utiles:
- La parte societaria de una cooperativa es tan importante como la contable.
- Se deben gestionar miembros y roles.

Aplicacion para nuestro sistema:
- Mejorar socios, acciones, directorio, delegados, jefes de punta, coordinadores, sanciones y aportes.

### SICC PLUS / ERPs contables bolivianos

Enfoque: gestion empresarial contable modular.

Ideas utiles:
- Contabilidad debe ser flexible.
- Los reportes contables son importantes, pero deben nacer de operaciones reales.

Aplicacion para nuestro sistema:
- No hacer que el usuario comun registre Debe/Haber.
- Que Tesoreria, Almacen, Rendicion y Venta de oro generen contabilidad por detras.

## Modulos que deberia tener nuestro sistema

### 1. Tesoreria diaria

Ya iniciado.

Debe cubrir:
- Ingresos.
- Egresos.
- Pagos a cuenta.
- Saldos pendientes.
- Prestamos en Bs.
- Prestamos en oro.
- Fiado de proveedores.
- Compromiso de venta de oro.
- Intereses.
- Consulta rapida de deudas.
- Respaldos fisicos.

### 2. Contabilidad interna

Ya iniciado.

Debe cubrir:
- Plan de cuentas.
- Asientos automaticos.
- Libro diario.
- Libro mayor.
- Balance.
- Periodos cerrados.
- Auditoria de cambios.

### 3. Almacen real

Debe cubrir:
- Compra o ingreso fisico.
- Verificacion del almacenero.
- Sello en recibo fisico.
- Stock por item.
- Salidas por Mina, Tujo, Rio.
- Combustible, aceites, grasa, explosivos, herramientas, repuestos.
- Relacion con proveedor y Tesoreria.
- Imagen del respaldo.

### 4. Produccion aurifera

Debe cubrir:
- Alzas.
- Produccion por fecha.
- Lugar: Mina, Tujo, Rio.
- Punta o responsables.
- Peso, ley, merma, observaciones.
- Relacion con venta de oro.

### 5. Venta de oro

Debe cubrir:
- Tesorero.
- Comisionados/acompanantes.
- Comprador.
- Peso.
- Ley.
- Precio.
- Deducciones.
- Recibo/respaldo.
- Compromisos con prestamistas.
- Contabilidad automatica.

### 6. Rendiciones y viaticos

Debe cubrir:
- Entrega a cuenta.
- Responsable.
- Destino del viaje.
- Motivo o tarea.
- Personas que viajaron.
- Fecha ida/vuelta.
- Gastos de comida, hospedaje, transporte, representacion.
- Cotizaciones y compras.
- Saldo a favor o en contra.
- Respaldos por imagen.

### 7. Comision revisora

Ya iniciado.

Debe cubrir:
- Carga de libros fisicos.
- Recibos y folios.
- Ingresos, egresos, almacen, produccion, ventas.
- Cruce automatico entre libros.
- Anomalias.
- Reporte para asamblea.

### 8. Socios y gobierno cooperativo

Debe cubrir:
- Socios.
- Puntas.
- Delegados.
- Jefes de punta.
- Directorio.
- Coordinadores por frente.
- Asistencia.
- Multas.
- Aportes.
- Deudas de socios.

### 9. Maquinaria y mantenimiento

Debe cubrir:
- Maquinaria.
- Responsable.
- Combustible consumido.
- Repuestos.
- Mantenimiento.
- Horas de trabajo.
- Lugar de trabajo.

### 10. Reportes para asamblea

Debe cubrir:
- Caja.
- Deudas por pagar.
- Deudas por cobrar.
- Oro vendido.
- Produccion.
- Gastos por categoria.
- Gastos por Mina/Tujo/Rio.
- Almacen.
- Rendiciones pendientes.
- Observaciones de comision revisora.

## Ideas de interfaz que debemos adoptar

### Para usuarios mineros

- Botones grandes por tarea.
- Palabras simples: "Pago de hoy", "Saldo pendiente", "Quien cobra", "Recibo", "Folio".
- Evitar Debe/Haber en pantallas operativas.
- Mostrar advertencias claras: "Falta respaldo", "Tiene saldo", "Vence hoy".
- Busqueda rapida en cada modulo.
- Listas desplegables de socios, proveedores y lugares.
- Resumen antes de guardar.

### Para directorio y contabilidad

- Reportes mas tecnicos.
- Trazabilidad completa.
- Estados: registrado, observado, aprobado, contabilizado, anulado.
- Historial de cambios.
- Filtros por fecha, socio, proveedor, lugar, modulo.

## Mejoras prioritarias para nuestro sistema

1. Completar SQL de Tesoreria en Supabase.
2. Agregar una pantalla de "Cuentas por pagar" conectada a Tesoreria.
3. Conectar Tesoreria con Almacen: si se compra insumo, debe poder registrar ingreso fisico.
4. Crear tablero de Directorio con caja, saldos, deudas y oro.
5. Mejorar Venta de Oro con compromisos de prestamo.
6. Crear modulo de Maquinaria y mantenimiento.
7. Mejorar permisos por rol.
8. Crear reportes imprimibles para asamblea.

## Fuentes consultadas

- Roca ERP: https://rocaerp.com/
- OSPOST ERP: https://www.ospost.co/
- ORIX Cubo: https://sispro.com.bo/orix-cubo/
- TR4 ERP: https://tr4srl.com/
- K-MINE: https://software.com.bo/produto/k-mine/
- Gobernanzza: https://gobernanzza.app/
- SICC PLUS: https://www.dte.com.bo/sicc-plus/
