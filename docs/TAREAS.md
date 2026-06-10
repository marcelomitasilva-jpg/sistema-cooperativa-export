# Tareas — Sistema Cooperativa

Lista maestra del proyecto (antes en Google Keep).  
**Última revisión:** mayo 2026

---

## Leyenda

- `[x]` Hecho (o parcial — ver nota)
- `[ ]` Pendiente
- **P0** = urgente · **P1** = importante · **P2** = después

---

## Estado actual del software (resumen)

| Módulo | Ruta | Estado |
|--------|------|--------|
| Bienvenida + Login + Panel | `/`, `/login`, `/panel` | ✅ Operativo |
| Rendiciones + IA (recibos) | `/rendicion` | 🟡 Parcial |
| Finanzas (aprobar gastos) | `/admin` | ✅ Básico |
| Almacén + Auditoría | `/almacen`, `/almacen/auditoria` | ✅ Mejorado |
| Socios (CRUD) | `/admin/usuarios` | 🟡 Parcial |
| Contabilidad (Plan de Cuentas) | `/contabilidad` | ✅ **NUEVO - Operativo** |
| Comercialización (liquidaciones) | `/comercializacion` | ✅ **NUEVO - Operativo** |
| Asistencias / multas | `/socios/asistencias`, `/socios/sanciones` | ✅ **NUEVO - Operativo** |
| Seguridad y Credenciales | — | ✅ **MEJORADO - En .env.local** |

---

## Fase 1 — Completar lo ya empezado (P0)

### Rendición (`/rendicion`)

- [ ] **P0** Cargar saldo inicial dinámicamente desde la base de datos (hoy fijo en 1500 Bs.)
- [x] **P0** Tabla de historial de gastos en frontend leyendo `rendiciones_gastos` *(existe; mejorar diseño/filtros)*
- [x] **P0** Cálculo de saldo disponible al guardar gasto *(existe; falta saldo inicial desde BD)*
- [ ] **P1** Mejorar UI del historial (filtros por estado, fecha, categoría)

### Almacén (`/almacen`, `/almacen/auditoria`)

- [x] **P0** Corregir selector de movimiento: **Ingreso**, **Egreso**, **Traspaso** ✅ HECHO
- [x] **P1** Reporte o **Kardex** de inventario físico (saldos por ítem)
- [x] Registro de movimientos en `almacen_movimientos_auditado` *(básico)*
- [x] Vista de auditoría de movimientos *(básico)*

### Socios (`/admin/usuarios`)

- [x] CRUD de socios en `personal_socios`
- [ ] **P0** Confirmar carga de lista (37 socios en BD; revisar columnas extra y RLS)
- [ ] **P1** Vincular socio logueado con su registro en `personal_socios`

### Seguridad y acceso

- [x] Pantalla de Login con Supabase Auth
- [x] Modo invitado (solo desarrollo)
- [x] Menú de navegación en todos los módulos
- [ ] **P0** Configurar políticas **RLS** definitivas por rol
- [ ] **P1** Proteger rutas: sin sesión → login (excepto invitado en dev)
- [ ] **P1** Quitar modo invitado antes de producción
- [x] **P0** Mover claves Supabase/Gemini a `.env.local` ✅ HECHO

### Marca y UX

- [ ] **P1** Nombre oficial y logo de la cooperativa
- [ ] **P2** Unificar estilos (rendición/admin usan CSS inline; resto Tailwind)

---

## Fase 2 — Contabilidad (P1) ✅ COMPLETADA

- [x] **P1** Pantalla para visualizar y gestionar el **Plan de Cuentas** ✅ NUEVO módulo `/contabilidad`
- [x] **P1** Automatizar **asientos contables** al aprobar rendiciones
- [ ] **P2** Automatizar asientos al registrar ventas de mineral

---

## Fase 3 — Comercialización (P1) ✅ COMPLETADA

- [x] **P1** Formulario de **venta de mineral**: peso bruto, ley, humedad, deducciones ✅ NUEVO en `/comercializacion`
- [x] **P1** Módulo de **liquidaciones** para socios o frentes de trabajo ✅ OPERATIVO
- [ ] **P2** Enlace liquidaciones ↔ socios ↔ contabilidad

---

## Fase 4 — Socios: operaciones en faena (P2) ✅ COMPLETADA

- [x] **P2** Control de **asistencia** a asambleas, faenas o turnos en las puntas ✅ NUEVO en `/socios/asistencias`
- [x] **P2** **Multas** y memorándums por inasistencias ✅ NUEVO en `/socios/sanciones`
- [x] **P2** Reportes de asistencia por socio / período ✅ INTEGRADO

---

## Fase 5 — Reportes y cierre (P2)

- [ ] Exportar gastos del mes (PDF / Excel)
- [ ] Resumen por categoría y por socio
- [ ] Informe o acta para la comisión
- [ ] Dashboard con gráficos (gastos, inventario, liquidaciones)

---

## Fase 6 — Ideas futuras

- [ ] PWA o app móvil para fotografiar recibos en ruta
- [ ] Notificaciones por correo (gasto aprobado / rechazado)
- [ ] Cada socio solo ve sus propias rendiciones (definir regla de negocio)
- [ ] Topes de monto, plazos y reglas por categoría

---

## Fase 7 — Modelo operativo Tipuani/Yungas

- [x] Crear SQL base para puntas, asociados, turnos, lugares de trabajo, producción aurífera, aportes/deudas, liquidaciones por punta y actas
- [x] Módulo de puntas (`/puntas`)
- [x] Módulo de producción aurífera por punta/lugar/turno (`/produccion`)
- [x] Módulo de aportes y deudas de socios (`/socios/aportes`)
- [ ] Ejecutar `docs/supabase-modelo-operativo-minero.sql` en Supabase
- [ ] Adaptar liquidaciones al reparto real por punta
- [ ] Conectar almacén con entrega de insumos a punta/socio
- [ ] Crear actas de asamblea y decisiones aprobadas
- [ ] Definir reglas locales de acciones, socios titulares, herederos y representantes

---

## Tablas Supabase referenciadas

| Tabla | Uso en el sistema |
|-------|-------------------|
| `rendiciones_gastos` | Rendiciones y aprobación |
| `personal_socios` | Socios y selectores de almacén |
| `distribuidores` | Almacén |
| `almacen_movimientos_auditado` | Movimientos de almacén |
| `comercializacion_oro` | Liquidaciones (por crear UI) |
| `asistencias_fallas` | Asistencia en faenas (por crear UI) |
| `sanciones_memorandums` | Multas / memorándums (por crear UI) |
| Plan de cuentas / asientos | Contabilidad (por crear UI) |

---

## Próximos 3 pasos recomendados

1. **RLS + Roles en Supabase** - CRÍTICO PARA SEGURIDAD (comisión vs socio vs admin)
2. **Saldo Dinámico en Rendición** - Crear tabla `configuracion_rendicion` y cargar desde BD
3. **Crear Tablas en Supabase** - Si no existen: `plan_cuentas`, `comercializacion_oro`, `asistencias_fallas`, `sanciones_memorandums`

---

## ✅ TAREAS COMPLETADAS EN ESTE SPRINT

- ✅ Mover credenciales a `.env.local` + `.env.example`
- ✅ Crear utilidad centralizada `lib/supabase-client.js`
- ✅ Actualizar todas las páginas para usar la utilidad
- ✅ Crear módulo **Plan de Cuentas** (`/contabilidad`)
- ✅ Crear módulo **Liquidaciones** (`/comercializacion`)
- ✅ Crear módulo **Asistencias** (`/socios/asistencias`)
- ✅ Crear módulo **Sanciones/Multas** (`/socios/sanciones`)
- ✅ Mejorar validación en formulario de **Almacén** (distribuidor obligatorio)
- ✅ Actualizar navegación con los nuevos módulos
- ✅ Documentar cambios en TAREAS.md  

---

## Notas sueltas

_(Agregar ideas nuevas aquí)_

- 

---

## Fase 8 - Comision revisora de gestiones anteriores

- [x] Crear SQL base para gestiones revisadas, documentos fisicos y anomalias.
- [x] Crear modulo `/comision-revisora`.
- [x] Crear OCR especializado para libros, recibos, folios, caja, almacen, alzas y ventas de oro.
- [x] Crear cruces iniciales: recibos duplicados, folios repetidos, documentos sin referencia y rendiciones descuadradas.
- [x] Ejecutar `docs/supabase-comision-revisora.sql` en Supabase.
- [x] Crear primera version de extraccion dinamica por lotes: deteccion automatica de tipo de tabla, columnas variables y revision editable antes de guardar.
- [ ] Probar extraccion dinamica con lotes reales de ingresos: alzas, ventas de oro, prestamos/pagos y otros ingresos.
- [ ] **P1** Crear ficha de revision por movimiento: documento principal, respaldo fisico, caja, almacen, socio/proveedor, oro/produccion, observaciones y conclusion.
- [ ] **P1** Crear configuracion inicial de cooperativa: areas/lugares de trabajo configurables (Mina, Tujo, Rio u otros), unidades usadas, rubros principales y nombres locales.
- [ ] **P1** Separar libros por flujo: caja, egresos, ingresos, almacen, alzas/produccion, ventas de oro, prestamos y rendiciones.
- [ ] **P1** Crear matriz de cruce documental: libro contra respaldo fisico, caja, almacen, socio/proveedor y oro/produccion.
- [ ] **P1** Crear conciliacion mensual de caja: saldo inicial, ingresos, egresos, saldo final calculado, saldo segun libro y diferencia.
- [ ] **P1** Crear submodulo de prestamos revisora: acreedor, tipo de prestamo, monto, oro, interes, plazo, devolucion, pagos, saldo, autorizacion y justificacion.
- [ ] **P1** Mejorar revision de venta de oro: peso bruto, ley/pureza, oro fino, merma, comprador, precio unitario, precio referencia, comisionados y entrada a caja.
- [ ] **P1** Crear cruce almacen: compra segun caja, respaldo fisico, ingreso fisico, salida, saldo final, responsable y lugar de uso Mina/Tujo/Rio.
- [ ] **P1** Crear flujo formal de observaciones: pendiente, en revision, requiere respaldo, requiere aclaracion, subsanado, observado final y sin observacion.
- [ ] **P1** Crear informe imprimible para comision revisora/asamblea: resumen, diferencias, respaldos faltantes, prestamos, oro, almacen, rendiciones y recomendaciones.
- [ ] **P1** Guardar historial de correcciones IA: lectura original, correccion del usuario, fecha, usuario y motivo.
- [ ] **P2** Mejorar duplicados avanzados: mismo monto/proveedor/fecha cercana, texto parecido, respaldo reutilizado por hash y recibos sin numero comparados por fecha-folio-monto.
- [ ] **P2** Crear tablero de anomalias por severidad, rubro, persona, mes, libro y estado de revision.
- [ ] **P2** Crear cuenta corriente de rendiciones/viaticos dentro de revisora: recibido, rendido, saldo, destino, acompanantes y dias sin rendir.
- [ ] **P2** Crear expediente digital por movimiento con todos los respaldos, cambios, observaciones y conclusion final.
- [ ] **P3** Implementar respaldo externo/inmutable para recibos importantes: Supabase Storage como trabajo y copia tipo Object Lock cuando haya presupuesto.

### Procedimiento propuesto para completar Comision Revisora

1. **Base de datos primero:** ampliar SQL para fichas de revision, observaciones, conciliaciones mensuales, prestamos, ventas de oro y cruces de almacen.
2. **Pantalla de trabajo:** convertir `/comision-revisora` en una mesa de revision con pestañas: Cargar, Fichas, Caja, Prestamos, Oro, Almacen, Observaciones e Informe.
3. **Cruces automaticos:** calcular alertas por caja, duplicados, respaldos, oro, prestamos, almacen y rendiciones.
4. **Revision humana:** permitir que la comision confirme, corrija, justifique o deje observado cada hallazgo.
5. **Informe final:** generar reporte imprimible para asamblea con anexos y respaldos visibles.
6. **Respaldo documental:** asegurar hash, ruta de archivo, usuario, fecha y copia externa para documentos importantes.

---

## Fase 9 - Ajustes operativos desde egresos reales

- [x] Adaptar almacen al flujo real: compra, descargo, verificacion fisica y sello del recibo.
- [x] Crear SQL para campos reales de almacen, rendiciones y cuenta corriente de socios.
- [x] Ejecutar `docs/supabase-mejoras-operativas.sql` en Supabase.
- [x] Conectar rendiciones aprobadas con ingreso a almacen cuando corresponda.
- [x] Crear cuenta corriente de socio para entregas, giros, viaticos, saldos a favor y saldos en contra.
- [x] Crear reporte de compras que deberian tener ingreso a almacen.

---

## Fase 10 - Tesoreria, deudas y control operativo minero

- [x] **P1** Crear modulo de Tesoreria diaria (`/tesoreria`) para ingresos, egresos, venta de oro, prestamos, fiados, pagos a cuenta y saldos pendientes.
- [x] **P1** Crear modulo de Cuentas pendientes (`/cuentas`) para cuentas por pagar, cuentas por cobrar y busqueda rapida por socio, proveedor, recibo, folio o detalle.
- [x] **P1** Agregar alertas de vencimiento en Tesoreria cuando ingrese efectivo u oro: deudas vencidas, por vencer y compromisos de venta de oro.
- [x] **P1** Agregar consulta DELAPAZ en Tesoreria: codigo consumidor, deuda, meses pendientes, seleccion de meses y preparacion de gasto.
- [x] **P1** Conectar Tesoreria con Almacen: compra registrada por tesorero -> ingreso fisico confirmado por almacenero -> stock actualizado -> respaldo unido por recibo/folio. *(Codigo listo; ejecutar `docs/supabase-tesoreria-almacen.sql` para vinculo formal por `origen_tesoreria_id`.)*
- [ ] **P1** Completar flujo DELAPAZ: registrar QR generado, subir comprobante, marcar pagado y dejar historial por periodo/factura.
- [ ] **P1** Crear modulo de compromisos de oro: prestamos en Bs/oro, devolucion en oro, compromiso de vender oro, gramos comprometidos, venta que cancela el compromiso.
- [ ] **P1** Crear tablero del Directorio: caja, saldos por pagar, saldos por cobrar, oro vendido, produccion, rendiciones pendientes, almacen critico y deudas vencidas.
- [ ] **P2** Crear modulo de maquinaria y mantenimiento: maquinaria, combustible usado, repuestos, horas de trabajo, lugar Mina/Tujo/Rio y costo por equipo.
- [ ] **P2** Crear reporte para asamblea: ingresos, egresos, deudas, oro vendido, almacen, socios con pendientes, observaciones y respaldos disponibles.
- [ ] **P2** Mejorar interfaz general despues de completar los puntos anteriores: pantallas mas limpias, mejores tarjetas, busquedas visibles, botones grandes, alertas claras y diseño mas profesional.

---

## Fase 11 - App modular para socios y comisionados

- [ ] **P1** Disenar PWA/app ligera conectada al mismo Supabase para que socios/comisionados suban rendiciones, viaticos y respaldos desde celular.
- [ ] **P1** Modulo comisionado: destino, acompanantes, fecha ida/vuelta, tarea realizada, compras, cotizaciones, comida, hotel, transporte, gastos de representacion y observaciones.
- [ ] **P1** Modulo socio: ver saldos, rendiciones pendientes, entregas a cuenta, deudas, viaticos y comprobantes cargados.
- [ ] **P1** Flujo de captura movil: foto recibo/factura -> IA extrae -> usuario corrige -> guarda -> respaldo visible para tesorero/comision revisora.
- [ ] **P2** Notificaciones simples para rendiciones pendientes, deudas vencidas, pagos observados y solicitudes de correccion.
