-- Modulo Comision Revisora
-- Ejecutar en Supabase SQL Editor antes de usar la pantalla /comision-revisora.

create extension if not exists pgcrypto;

create table if not exists public.comision_gestiones (
  id uuid primary key default gen_random_uuid(),
  gestion integer not null,
  nombre text not null,
  estado text not null default 'en_revision',
  fecha_inicio date,
  fecha_cierre date,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gestion, nombre)
);

create table if not exists public.comision_documentos (
  id uuid primary key default gen_random_uuid(),
  gestion_id uuid not null references public.comision_gestiones(id) on delete cascade,
  tipo_documento text not null,
  fuente text not null default 'manual',
  fecha_documento date,
  folio text,
  numero_recibo text,
  persona text,
  socio_id uuid null,
  punta_id uuid null,
  concepto text not null,
  categoria text,
  monto_ingreso numeric(14,2) not null default 0,
  monto_egreso numeric(14,2) not null default 0,
  monto_rendido numeric(14,2) not null default 0,
  saldo_libro numeric(14,2),
  cantidad numeric(14,4),
  unidad text,
  item text,
  contraparte text,
  interes_porcentaje numeric(8,4),
  url_imagen text,
  texto_extraido text,
  confianza numeric(5,2),
  estado_revision text not null default 'pendiente',
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comision_documentos_gestion
  on public.comision_documentos(gestion_id);

create index if not exists idx_comision_documentos_recibo
  on public.comision_documentos(gestion_id, numero_recibo)
  where numero_recibo is not null and numero_recibo <> '';

create index if not exists idx_comision_documentos_folio
  on public.comision_documentos(gestion_id, tipo_documento, folio)
  where folio is not null and folio <> '';

create table if not exists public.comision_anomalias (
  id uuid primary key default gen_random_uuid(),
  gestion_id uuid not null references public.comision_gestiones(id) on delete cascade,
  documento_id uuid references public.comision_documentos(id) on delete set null,
  tipo text not null,
  severidad text not null default 'media',
  descripcion text not null,
  estado text not null default 'pendiente',
  referencia text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comision_anomalias_gestion
  on public.comision_anomalias(gestion_id, estado);

insert into storage.buckets (id, name, public)
values ('comision-revisora', 'comision-revisora', true)
on conflict (id) do nothing;

alter table public.comision_gestiones enable row level security;
alter table public.comision_documentos enable row level security;
alter table public.comision_anomalias enable row level security;

drop policy if exists dev_comision_gestiones_all on public.comision_gestiones;
create policy dev_comision_gestiones_all
  on public.comision_gestiones
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists dev_comision_documentos_all on public.comision_documentos;
create policy dev_comision_documentos_all
  on public.comision_documentos
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists dev_comision_anomalias_all on public.comision_anomalias;
create policy dev_comision_anomalias_all
  on public.comision_anomalias
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists dev_comision_revisora_storage_all on storage.objects;
create policy dev_comision_revisora_storage_all
  on storage.objects
  for all
  to anon, authenticated
  using (bucket_id = 'comision-revisora')
  with check (bucket_id = 'comision-revisora');

grant usage on schema public to anon, authenticated;
grant all on public.comision_gestiones to anon, authenticated;
grant all on public.comision_documentos to anon, authenticated;
grant all on public.comision_anomalias to anon, authenticated;

-- Ampliacion para cuadernos manuscritos variables y respaldos fisicos.

alter table public.comision_documentos
  add column if not exists tipo_movimiento text not null default 'egreso',
  add column if not exists rubro text,
  add column if not exists subrubro text,
  add column if not exists responsable text,
  add column if not exists destino text,
  add column if not exists tarea text,
  add column if not exists precio_unitario numeric(14,4),
  add column if not exists precio_referencia numeric(14,4),
  add column if not exists diferencia_precio numeric(14,4),
  add column if not exists porcentaje_diferencia_precio numeric(8,4),
  add column if not exists ley_oro text,
  add column if not exists moneda text not null default 'BOB',
  add column if not exists tipo_cambio numeric(14,4),
  add column if not exists saldo_caja_antes numeric(14,2),
  add column if not exists justificacion_prestamo text,
  add column if not exists requiere_respaldo boolean not null default true,
  add column if not exists saldo_a_favor numeric(14,2) not null default 0,
  add column if not exists saldo_en_contra numeric(14,2) not null default 0,
  add column if not exists lote_carga_id uuid null;

create table if not exists public.comision_lotes_carga (
  id uuid primary key default gen_random_uuid(),
  gestion_id uuid not null references public.comision_gestiones(id) on delete cascade,
  tipo_fuente text not null default 'cuaderno_egresos_revisora',
  descripcion text,
  cantidad_imagenes integer not null default 0,
  estado text not null default 'extraido',
  created_at timestamptz not null default now()
);

create table if not exists public.comision_respaldos (
  id uuid primary key default gen_random_uuid(),
  gestion_id uuid not null references public.comision_gestiones(id) on delete cascade,
  documento_id uuid references public.comision_documentos(id) on delete set null,
  tipo_respaldo text not null default 'recibo',
  folio text,
  numero_recibo text,
  fecha_respaldo date,
  persona text,
  detalle text,
  monto numeric(14,2),
  url_archivo text not null,
  storage_path text,
  nombre_archivo text,
  mime_type text,
  tamano_bytes bigint,
  sha256 text,
  estado_custodia text not null default 'original_digital',
  subido_por text,
  texto_extraido text,
  resultado_verificacion text not null default 'pendiente',
  diferencias jsonb not null default '[]'::jsonb,
  confianza numeric(5,2),
  observaciones text,
  created_at timestamptz not null default now()
);

alter table public.comision_respaldos
  add column if not exists storage_path text,
  add column if not exists nombre_archivo text,
  add column if not exists mime_type text,
  add column if not exists tamano_bytes bigint,
  add column if not exists sha256 text,
  add column if not exists estado_custodia text not null default 'original_digital',
  add column if not exists subido_por text;

create table if not exists public.comision_precios_oro_referencia (
  id uuid primary key default gen_random_uuid(),
  gestion_id uuid references public.comision_gestiones(id) on delete cascade,
  fecha_precio date not null,
  fuente text not null,
  precio_gramo_bob numeric(14,4),
  precio_onza_usd numeric(14,4),
  tipo_cambio numeric(14,4),
  observaciones text,
  created_at timestamptz not null default now()
);

create table if not exists public.comision_rubros (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  subrubro text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique(nombre, subrubro)
);

insert into public.comision_rubros (nombre, subrubro)
values
  ('Combustible', 'Diesel'),
  ('Combustible', 'Gasolina'),
  ('Combustible', 'Aceite'),
  ('Combustible', 'Grasa'),
  ('Explosivos', 'Guia'),
  ('Explosivos', 'Masa'),
  ('Explosivos', 'Fulminante'),
  ('Prestamos', 'Capital'),
  ('Prestamos', 'Interes'),
  ('Telefono', 'Directorio'),
  ('Giros', 'Asociado'),
  ('Giros', 'Tercero'),
  ('Empleados', 'Jornal'),
  ('Servicios externos', 'Abogado'),
  ('Servicios externos', 'Contador'),
  ('Viaticos', 'Asociado'),
  ('Gastos generales', null)
on conflict(nombre, subrubro) do nothing;

create index if not exists idx_comision_respaldos_documento
  on public.comision_respaldos(documento_id);

create index if not exists idx_comision_respaldos_referencia
  on public.comision_respaldos(gestion_id, folio, numero_recibo);

create index if not exists idx_comision_documentos_lote
  on public.comision_documentos(lote_carga_id);

create index if not exists idx_comision_documentos_oro
  on public.comision_documentos(gestion_id, fecha_documento, tipo_documento)
  where tipo_documento = 'ventas_oro';

create index if not exists idx_comision_precios_oro_fecha
  on public.comision_precios_oro_referencia(gestion_id, fecha_precio);

alter table public.comision_lotes_carga enable row level security;
alter table public.comision_respaldos enable row level security;
alter table public.comision_rubros enable row level security;
alter table public.comision_precios_oro_referencia enable row level security;

drop policy if exists dev_comision_lotes_carga_all on public.comision_lotes_carga;
create policy dev_comision_lotes_carga_all
  on public.comision_lotes_carga
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists dev_comision_respaldos_all on public.comision_respaldos;
create policy dev_comision_respaldos_all
  on public.comision_respaldos
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists dev_comision_rubros_all on public.comision_rubros;
create policy dev_comision_rubros_all
  on public.comision_rubros
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists dev_comision_precios_oro_referencia_all on public.comision_precios_oro_referencia;
create policy dev_comision_precios_oro_referencia_all
  on public.comision_precios_oro_referencia
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant all on public.comision_lotes_carga to anon, authenticated;
grant all on public.comision_respaldos to anon, authenticated;
grant all on public.comision_rubros to anon, authenticated;
grant all on public.comision_precios_oro_referencia to anon, authenticated;
