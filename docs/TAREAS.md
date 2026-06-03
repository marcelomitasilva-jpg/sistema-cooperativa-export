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
- [ ] **P1** Reporte o **Kardex** de inventario físico (saldos por ítem)
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
- [ ] **P1** Automatizar **asientos contables** al aprobar rendiciones
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
