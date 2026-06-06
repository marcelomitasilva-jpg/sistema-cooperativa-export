-- Corazon contable para la cooperativa minera.
-- Ejecutar en Supabase Dashboard > SQL Editor.
--
-- Idea simple:
-- 1. Un periodo es una gestion o rango de fechas.
-- 2. Un asiento es el comprobante contable.
-- 3. El detalle del asiento dice que cuenta va al Debe y que cuenta va al Haber.
-- 4. Un asiento confirmado debe cuadrar: total Debe = total Haber.

alter table public.plan_cuentas
add column if not exists cuenta_padre_id bigint references public.plan_cuentas(id_cuenta),
add column if not exists permite_movimiento boolean not null default true,
add column if not exists activa boolean not null default true;

update public.plan_cuentas
set activa = case when estado = 'Activa' then true else false end
where estado is not null;

create table if not exists public.contabilidad_periodos (
  id bigserial primary key,
  gestion integer not null,
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null default 'abierto'
    check (estado in ('abierto', 'cerrado')),
  observaciones text,
  created_at timestamp with time zone not null default now(),
  unique (gestion, fecha_inicio, fecha_fin),
  check (fecha_fin >= fecha_inicio)
);

create table if not exists public.contabilidad_asientos (
  id bigserial primary key,
  periodo_id bigint references public.contabilidad_periodos(id),
  fecha date not null default current_date,
  numero text,
  glosa text not null,
  tipo text not null default 'diario'
    check (tipo in ('diario', 'ingreso', 'egreso', 'ajuste', 'apertura', 'cierre', 'reversion')),
  estado text not null default 'borrador'
    check (estado in ('borrador', 'confirmado', 'anulado')),
  modulo_origen text,
  referencia_id text,
  usuario_nombre text,
  asiento_revertido_id bigint references public.contabilidad_asientos(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.contabilidad_asiento_detalles (
  id bigserial primary key,
  asiento_id bigint not null references public.contabilidad_asientos(id) on delete cascade,
  cuenta_id bigint not null references public.plan_cuentas(id_cuenta),
  descripcion text,
  debe numeric(15,2) not null default 0,
  haber numeric(15,2) not null default 0,
  created_at timestamp with time zone not null default now(),
  check (debe >= 0),
  check (haber >= 0),
  check (debe > 0 or haber > 0),
  check (not (debe > 0 and haber > 0))
);

create index if not exists idx_contabilidad_periodos_gestion
on public.contabilidad_periodos(gestion);

create index if not exists idx_contabilidad_asientos_fecha
on public.contabilidad_asientos(fecha);

create index if not exists idx_contabilidad_asientos_periodo
on public.contabilidad_asientos(periodo_id);

create index if not exists idx_contabilidad_detalles_asiento
on public.contabilidad_asiento_detalles(asiento_id);

create index if not exists idx_contabilidad_detalles_cuenta
on public.contabilidad_asiento_detalles(cuenta_id);

create or replace function public.contabilidad_periodo_abierto(p_fecha date)
returns boolean
language sql
stable
as $$
  select coalesce((
    select estado = 'abierto'
    from public.contabilidad_periodos
    where p_fecha between fecha_inicio and fecha_fin
    order by fecha_inicio desc
    limit 1
  ), true);
$$;

create or replace function public.contabilidad_total_debe(p_asiento_id bigint)
returns numeric
language sql
stable
as $$
  select coalesce(sum(debe), 0)
  from public.contabilidad_asiento_detalles
  where asiento_id = p_asiento_id;
$$;

create or replace function public.contabilidad_total_haber(p_asiento_id bigint)
returns numeric
language sql
stable
as $$
  select coalesce(sum(haber), 0)
  from public.contabilidad_asiento_detalles
  where asiento_id = p_asiento_id;
$$;

create or replace function public.contabilidad_validar_asiento()
returns trigger
language plpgsql
as $$
declare
  v_debe numeric(15,2);
  v_haber numeric(15,2);
begin
  if new.estado = 'confirmado' then
    if not public.contabilidad_periodo_abierto(new.fecha) then
      raise exception 'No se puede confirmar asiento en periodo cerrado: %', new.fecha;
    end if;

    select public.contabilidad_total_debe(new.id), public.contabilidad_total_haber(new.id)
    into v_debe, v_haber;

    if v_debe <= 0 or v_haber <= 0 or round(v_debe, 2) <> round(v_haber, 2) then
      raise exception 'Asiento descuadrado. Debe: %, Haber: %', v_debe, v_haber;
    end if;
  end if;

  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_contabilidad_validar_asiento on public.contabilidad_asientos;
create trigger trg_contabilidad_validar_asiento
before insert or update on public.contabilidad_asientos
for each row execute function public.contabilidad_validar_asiento();

create or replace function public.contabilidad_bloquear_periodo_cerrado()
returns trigger
language plpgsql
as $$
declare
  v_fecha date;
begin
  if tg_table_name = 'contabilidad_asientos' then
    v_fecha := coalesce(new.fecha, old.fecha);
  else
    select fecha into v_fecha
    from public.contabilidad_asientos
    where id = coalesce(new.asiento_id, old.asiento_id);
  end if;

  if not public.contabilidad_periodo_abierto(v_fecha) then
    raise exception 'Periodo cerrado. No se aceptan cambios en fecha %', v_fecha;
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists trg_contabilidad_bloquear_asientos on public.contabilidad_asientos;
create trigger trg_contabilidad_bloquear_asientos
before insert or update or delete on public.contabilidad_asientos
for each row execute function public.contabilidad_bloquear_periodo_cerrado();

drop trigger if exists trg_contabilidad_bloquear_detalles on public.contabilidad_asiento_detalles;
create trigger trg_contabilidad_bloquear_detalles
before insert or update or delete on public.contabilidad_asiento_detalles
for each row execute function public.contabilidad_bloquear_periodo_cerrado();

insert into public.contabilidad_periodos (gestion, nombre, fecha_inicio, fecha_fin, estado, observaciones)
select 2026, 'Gestion 2026', '2026-01-01', '2026-12-31', 'abierto', 'Periodo inicial del sistema'
where not exists (
  select 1 from public.contabilidad_periodos where gestion = 2026
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.contabilidad_periodos to anon, authenticated;
grant select, insert, update, delete on table public.contabilidad_asientos to anon, authenticated;
grant select, insert, update, delete on table public.contabilidad_asiento_detalles to anon, authenticated;
grant usage, select on sequence public.contabilidad_periodos_id_seq to anon, authenticated;
grant usage, select on sequence public.contabilidad_asientos_id_seq to anon, authenticated;
grant usage, select on sequence public.contabilidad_asiento_detalles_id_seq to anon, authenticated;

alter table public.contabilidad_periodos enable row level security;
alter table public.contabilidad_asientos enable row level security;
alter table public.contabilidad_asiento_detalles enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'contabilidad_periodos',
    'contabilidad_asientos',
    'contabilidad_asiento_detalles'
  ]
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = t
        and policyname = 'dev_select_all'
    ) then
      execute format('create policy dev_select_all on public.%I for select to anon, authenticated using (true)', t);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = t
        and policyname = 'dev_insert_all'
    ) then
      execute format('create policy dev_insert_all on public.%I for insert to anon, authenticated with check (true)', t);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = t
        and policyname = 'dev_update_all'
    ) then
      execute format('create policy dev_update_all on public.%I for update to anon, authenticated using (true) with check (true)', t);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = t
        and policyname = 'dev_delete_all'
    ) then
      execute format('create policy dev_delete_all on public.%I for delete to anon, authenticated using (true)', t);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
