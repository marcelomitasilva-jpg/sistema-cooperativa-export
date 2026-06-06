-- Modulo de Tesoreria diaria
-- Objetivo: que el tesorero registre ingresos, egresos, ventas de oro,
-- prestamos y entregas a cuenta de forma simple, mientras la contabilidad
-- se genera por detras desde contabilidad_asientos.

create table if not exists public.tesoreria_movimientos (
  id bigserial primary key,
  cooperativa_id bigint references public.cooperativas(id),
  fecha date not null default current_date,
  tipo_movimiento text not null check (
    tipo_movimiento in (
      'ingreso',
      'egreso',
      'venta_oro',
      'entrega_a_cuenta',
      'devolucion_rendicion',
      'prestamo_recibido',
      'pago_deuda'
    )
  ),
  categoria text not null default 'otros',
  detalle text not null,
  monto numeric(14,2) not null default 0 check (monto >= 0),
  total_operacion numeric(14,2),
  pago_a_cuenta numeric(14,2),
  saldo_pendiente numeric(14,2),
  estado_pago text not null default 'pagado_completo' check (
    estado_pago in ('pagado_completo', 'pago_parcial', 'sin_pago', 'saldo_cancelado')
  ),
  forma_pago text not null default 'efectivo' check (forma_pago in ('efectivo', 'banco', 'mixto', 'otro')),
  modalidad_operacion text not null default 'contado' check (
    modalidad_operacion in (
      'contado',
      'fiado_proveedor',
      'prestamo_efectivo',
      'prestamo_oro',
      'compromiso_venta_oro',
      'canje_oro',
      'otro'
    )
  ),
  contraparte_tipo text not null default 'ninguna' check (
    contraparte_tipo in ('ninguna', 'socio', 'distribuidor', 'cooperativa', 'persona_externa', 'empresa')
  ),
  socio_id bigint references public.personal_socios(id),
  distribuidor_id bigint references public.distribuidores(id),
  contraparte_nombre text,
  responsable text,
  acompanantes text,
  beneficiario text,
  comprador_oro text,
  moneda_origen text not null default 'BOB' check (moneda_origen in ('BOB', 'ORO', 'MIXTO')),
  moneda_devolucion text not null default 'BOB' check (moneda_devolucion in ('BOB', 'ORO', 'MIXTO')),
  monto_prestamo numeric(14,2),
  gramos_prestamo numeric(14,4),
  fecha_compromiso date,
  tiene_interes boolean not null default false,
  interes_detalle text,
  compromiso_venta_oro boolean not null default false,
  condiciones_prestamo text,
  peso_oro_gramos numeric(14,4),
  ley_oro text,
  precio_gramo numeric(14,2),
  deducciones numeric(14,2) not null default 0,
  numero_recibo text,
  folio text,
  centro_costo_id bigint references public.contabilidad_centros_costo(id),
  cuenta_debe_id bigint references public.plan_cuentas(id_cuenta),
  cuenta_haber_id bigint references public.plan_cuentas(id_cuenta),
  asiento_id bigint references public.contabilidad_asientos(id),
  estado text not null default 'registrado' check (
    estado in ('borrador', 'registrado', 'contabilizado', 'observado', 'anulado')
  ),
  observaciones text,
  creado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tesoreria_respaldos (
  id bigserial primary key,
  movimiento_id bigint not null references public.tesoreria_movimientos(id) on delete cascade,
  tipo_respaldo text not null default 'recibo',
  nombre_archivo text,
  storage_path text,
  url_archivo text,
  texto_extraido text,
  verificacion_ia jsonb not null default '{}'::jsonb,
  observaciones text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tesoreria_movimientos_fecha
  on public.tesoreria_movimientos(fecha desc);

create index if not exists idx_tesoreria_movimientos_tipo
  on public.tesoreria_movimientos(tipo_movimiento);

create index if not exists idx_tesoreria_movimientos_recibo_folio
  on public.tesoreria_movimientos(numero_recibo, folio);

create index if not exists idx_tesoreria_movimientos_asiento
  on public.tesoreria_movimientos(asiento_id);

create index if not exists idx_tesoreria_respaldos_movimiento
  on public.tesoreria_respaldos(movimiento_id);

create or replace function public.tesoreria_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tesoreria_movimientos_updated_at on public.tesoreria_movimientos;
create trigger trg_tesoreria_movimientos_updated_at
before update on public.tesoreria_movimientos
for each row execute function public.tesoreria_set_updated_at();

alter table public.tesoreria_movimientos enable row level security;
alter table public.tesoreria_respaldos enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tesoreria_movimientos'
      and policyname = 'tesoreria_movimientos_dev_all'
  ) then
    create policy tesoreria_movimientos_dev_all
    on public.tesoreria_movimientos
    for all
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tesoreria_respaldos'
      and policyname = 'tesoreria_respaldos_dev_all'
  ) then
    create policy tesoreria_respaldos_dev_all
    on public.tesoreria_respaldos
    for all
    using (true)
    with check (true);
  end if;
end $$;

grant select, insert, update, delete on public.tesoreria_movimientos to anon, authenticated;
grant select, insert, update, delete on public.tesoreria_respaldos to anon, authenticated;
grant usage, select on sequence public.tesoreria_movimientos_id_seq to anon, authenticated;
grant usage, select on sequence public.tesoreria_respaldos_id_seq to anon, authenticated;

-- Si ya creaste la tabla antes, estas lineas agregan los campos nuevos sin borrar datos.
alter table public.tesoreria_movimientos
  add column if not exists total_operacion numeric(14,2),
  add column if not exists pago_a_cuenta numeric(14,2),
  add column if not exists saldo_pendiente numeric(14,2),
  add column if not exists estado_pago text not null default 'pagado_completo',
  add column if not exists modalidad_operacion text not null default 'contado',
  add column if not exists contraparte_tipo text not null default 'ninguna',
  add column if not exists socio_id bigint references public.personal_socios(id),
  add column if not exists distribuidor_id bigint references public.distribuidores(id),
  add column if not exists contraparte_nombre text,
  add column if not exists moneda_origen text not null default 'BOB',
  add column if not exists moneda_devolucion text not null default 'BOB',
  add column if not exists monto_prestamo numeric(14,2),
  add column if not exists gramos_prestamo numeric(14,4),
  add column if not exists fecha_compromiso date,
  add column if not exists tiene_interes boolean not null default false,
  add column if not exists interes_detalle text,
  add column if not exists compromiso_venta_oro boolean not null default false,
  add column if not exists condiciones_prestamo text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'tesoreria_movimientos_monto_check'
      and conrelid = 'public.tesoreria_movimientos'::regclass
  ) then
    alter table public.tesoreria_movimientos
      drop constraint tesoreria_movimientos_monto_check;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tesoreria_movimientos_monto_no_negativo'
      and conrelid = 'public.tesoreria_movimientos'::regclass
  ) then
    alter table public.tesoreria_movimientos
      add constraint tesoreria_movimientos_monto_no_negativo check (monto >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tesoreria_movimientos_estado_pago_check'
      and conrelid = 'public.tesoreria_movimientos'::regclass
  ) then
    alter table public.tesoreria_movimientos
      add constraint tesoreria_movimientos_estado_pago_check
      check (estado_pago in ('pagado_completo', 'pago_parcial', 'sin_pago', 'saldo_cancelado'));
  end if;
end $$;

create index if not exists idx_tesoreria_movimientos_socio
  on public.tesoreria_movimientos(socio_id);

create index if not exists idx_tesoreria_movimientos_distribuidor
  on public.tesoreria_movimientos(distribuidor_id);
