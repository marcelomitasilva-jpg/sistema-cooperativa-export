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
  monto numeric(14,2) not null check (monto > 0),
  forma_pago text not null default 'efectivo' check (forma_pago in ('efectivo', 'banco', 'mixto', 'otro')),
  responsable text,
  acompanantes text,
  beneficiario text,
  comprador_oro text,
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
