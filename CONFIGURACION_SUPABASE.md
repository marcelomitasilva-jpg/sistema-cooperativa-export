# 🔧 GUÍA DE CONFIGURACIÓN - SUPABASE

**Último actualizado:** 29 de mayo de 2026

## 📋 Paso 1: Crear Tablas

Ve a **Supabase → SQL Editor** y ejecuta los siguientes scripts:

### Tabla: `plan_cuentas`
```sql
CREATE TABLE plan_cuentas (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  tipo_cuenta VARCHAR(50) NOT NULL CHECK (tipo_cuenta IN ('Activo', 'Pasivo', 'Capital', 'Ingresos', 'Gastos')),
  descripcion TEXT,
  saldo_inicial NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_plan_cuentas_codigo ON plan_cuentas(codigo);
CREATE INDEX idx_plan_cuentas_tipo ON plan_cuentas(tipo_cuenta);
```

### Tabla: `comercializacion_oro`
```sql
CREATE TABLE comercializacion_oro (
  id BIGSERIAL PRIMARY KEY,
  socio_id BIGINT NOT NULL REFERENCES personal_socios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  peso_bruto NUMERIC(10,2) NOT NULL,
  ley_oro NUMERIC(5,2) NOT NULL,
  humedad NUMERIC(5,2) DEFAULT 0,
  deducciones NUMERIC(15,2) DEFAULT 0,
  valor_final NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comercializacion_socio ON comercializacion_oro(socio_id);
CREATE INDEX idx_comercializacion_fecha ON comercializacion_oro(fecha);
```

### Tabla: `asistencias_fallas`
```sql
CREATE TABLE asistencias_fallas (
  id BIGSERIAL PRIMARY KEY,
  socio_id BIGINT NOT NULL REFERENCES personal_socios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  evento VARCHAR(100) NOT NULL CHECK (evento IN ('Faena', 'Asamblea', 'Turno en Puntas', 'Reunion Directiva')),
  presente BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_asistencias_socio ON asistencias_fallas(socio_id);
CREATE INDEX idx_asistencias_fecha ON asistencias_fallas(fecha);
CREATE INDEX idx_asistencias_evento ON asistencias_fallas(evento);
```

### Tabla: `sanciones_memorandums`
```sql
CREATE TABLE sanciones_memorandums (
  id BIGSERIAL PRIMARY KEY,
  socio_id BIGINT NOT NULL REFERENCES personal_socios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  tipo_sancion VARCHAR(100) NOT NULL,
  monto NUMERIC(15,2) DEFAULT 0,
  motivo TEXT NOT NULL,
  estado VARCHAR(50) NOT NULL CHECK (estado IN ('Pendiente', 'Comunicado', 'Apelada', 'Resuelta')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sanciones_socio ON sanciones_memorandums(socio_id);
CREATE INDEX idx_sanciones_fecha ON sanciones_memorandums(fecha);
CREATE INDEX idx_sanciones_estado ON sanciones_memorandums(estado);
```

### Tabla: `configuracion_rendicion` (Para saldo dinámico)
```sql
CREATE TABLE configuracion_rendicion (
  id BIGSERIAL PRIMARY KEY,
  saldo_inicial NUMERIC(15,2) DEFAULT 1500.00,
  comision_id BIGINT,
  fecha_vigencia DATE DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO configuracion_rendicion (saldo_inicial) VALUES (1500.00);
```

---

## 🔐 Paso 2: Configurar Row Level Security (RLS)

### CRÍTICO: Habilitar RLS en todas las tablas

Para cada tabla, ve a **Authentication → Policies** y habilita RLS:

```sql
-- Habilitar RLS
ALTER TABLE plan_cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercializacion_oro ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias_fallas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanciones_memorandums ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_rendicion ENABLE ROW LEVEL SECURITY;
```

### Política 1: Comisión (Acceso Total)
```sql
CREATE POLICY "Comisión acceso total"
ON plan_cuentas FOR ALL
USING (auth.jwt() ->> 'role' = 'comisión' OR auth.jwt() ->> 'role' = 'admin');

-- Aplicar a todas las tablas nuevas...
```

### Política 2: Socio (Solo Ver Sus Datos)
```sql
CREATE POLICY "Socio ve solo sus liquidaciones"
ON comercializacion_oro FOR SELECT
USING (socio_id = (SELECT id FROM personal_socios WHERE auth.uid() = usuario_id));
```

### Política 3: Admin (Acceso Total)
```sql
-- El admin puede hacer todo
-- Solo revisar en Usuarios de Supabase que tenga role = 'admin'
```

---

## 👥 Paso 3: Crear Roles en Supabase

### En Authentication → Users, para cada usuario establece:

| Usuario | Role | Permisos |
|---------|------|----------|
| admin@coop.com | `admin` | Acceso total a todo |
| jefe@coop.com | `comisión` | Ver/editar todo |
| socio1@coop.com | `socio` | Solo sus rendiciones + liquidaciones |
| socio2@coop.com | `socio` | Solo sus rendiciones + liquidaciones |

### Script para actualizar roles (SQL):
```sql
-- Ir a: SQL Editor → New Query
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
WHERE email = 'admin@coop.com';

UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"comisión"')
WHERE email = 'jefe@coop.com';

UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"socio"')
WHERE email LIKE 'socio%@coop.com';
```

---

## 🔑 Paso 4: Verificar Credenciales

### En el proyecto Local:

1. Abre `.env.local`
2. Verifica que tenga:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_publica
   GEMINI_API_KEY=tu_clave_gemini
   ```

3. Si falta algo, cópialo de Supabase:
   - **URL:** Project Settings → API → Project URL
   - **Anon Key:** Project Settings → API → Anon Public Key

4. **NUNCA** commities `.env.local` a Git

---

## ✅ Paso 5: Verificar Funcionamiento

### Test 1: Tablas Creadas
```
En Supabase → Database → Tables
Deberías ver:
- ✅ plan_cuentas
- ✅ comercializacion_oro
- ✅ asistencias_fallas
- ✅ sanciones_memorandums
- ✅ configuracion_rendicion
```

### Test 2: Permisos RLS
```
En Supabase → Authentication → Policies
- Cada tabla debe tener 3+ policies
- Estados: "Enabled" en verde
```

### Test 3: Aplicación Local
```bash
npm run dev
# Visitar http://localhost:3000

# Probar navegación:
- Contabilidad → Plan de Cuentas → Crear cuenta
- Comercialización → Liquidaciones → Registrar venta
- Socios → Asistencias → Marcar presentes
- Socios → Sanciones → Aplicar sanción
```

### Test 4: Crear Datos
```
1. Ir a /contabilidad
2. Crear cuenta: Código 1000, Nombre "Caja", Tipo "Activo"
3. Verificar que aparezca en tabla
4. Editar y Eliminar para probar CRUD completo
```

---

## 🚨 Troubleshooting

### Problema: "Error: No rows returned"
**Solución:** RLS está activado pero sin políticas. Crea las políticas de arriba.

### Problema: "Permission denied"
**Solución:** 
1. Verifica que el usuario tenga el role correcto
2. Revisa las políticas RLS en la tabla
3. Prueba primero SIN RLS (DISABLE RLS) para debugging

### Problema: "Foreign key constraint failed"
**Solución:** El `socio_id` debe existir en `personal_socios`. Verifica:
```sql
SELECT COUNT(*) FROM personal_socios; -- Debe haber datos
```

### Problema: "Módulo no carga datos"
**Solución:**
1. Abre DevTools (F12) → Console
2. Busca errores de Supabase
3. Verifica `.env.local` con las credenciales correctas
4. Reinicia: `npm run dev`

---

## 📊 SQL Útiles para Debugging

```sql
-- Ver todas las tablas
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Ver datos en tabla
SELECT * FROM plan_cuentas LIMIT 10;

-- Contar registros
SELECT COUNT(*) FROM comercializacion_oro;

-- Ver RLS habilitado
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Ver políticas de una tabla
SELECT * FROM pg_policies WHERE tablename = 'plan_cuentas';
```

---

## 🎯 Próximas Mejoras Recomendadas

1. **Agregar Trigger** para `updated_at`:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plan_cuentas_updated_at BEFORE UPDATE ON plan_cuentas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

2. **Soft Delete** (marcas borrado sin eliminar):
```sql
ALTER TABLE plan_cuentas ADD COLUMN deleted_at TIMESTAMP;
-- Luego filtrar: WHERE deleted_at IS NULL
```

3. **Auditoría** (quién hizo qué cuándo):
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  tabla VARCHAR(50),
  accion VARCHAR(50),
  usuario_id UUID,
  datos_antes JSONB,
  datos_despues JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

**¡Listo! El sistema está configurado. Ahora prueba todas las funciones.** 🚀
