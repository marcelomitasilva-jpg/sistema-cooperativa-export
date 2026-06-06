-- Corazon contable modular para cooperativas mineras.
-- Ejecutar en Supabase Dashboard > SQL Editor.
--
-- Diseno:
-- - Una sola contabilidad oficial.
-- - Modulos operativos alimentan la contabilidad: rendiciones, almacen, oro, socios, comision revisora.
-- - Adaptable para otras cooperativas mediante cooperativa_id y centros de costo.
-- - Todo asiento confirmado debe cuadrar: Debe = Haber.

create table if not exists public.cooperativas (
  id bigserial primary key,
  nombre text not null,
  municipio text,
  departamento text,
  tipo text not null default 'minera_aurifera',
  activa boolean not null default true,
  created_at timestamp with time zone not null default now()
);

insert into public.cooperativas (nombre, municipio, departamento, tipo)
select 'Cooperativa Minera Aurifera', 'Tipuani', 'La Paz', 'minera_aurifera'
where not exists (select 1 from public.cooperativas);

alter table public.plan_cuentas
add column if not exists cooperativa_id bigint references public.cooperativas(id),
add column if not exists cuenta_padre_id bigint references public.plan_cuentas(id_cuenta),
add column if not exists permite_movimiento boolean not null default true,
add column if not exists activa boolean not null default true;

update public.plan_cuentas
set cooperativa_id = (select id from public.cooperativas order by id limit 1)
where cooperativa_id is null;

update public.plan_cuentas
set activa = case when estado = 'Activa' then true else false end
where estado is not null;

create table if not exists public.contabilidad_centros_costo (
  id bigserial primary key,
  cooperativa_id bigint references public.cooperativas(id),
  codigo text not null,
  nombre text not null,
  tipo text not null default 'operativo'
    check (tipo in ('operativo', 'administrativo', 'produccion', 'comision', 'almacen', 'otro')),
  activo boolean not null default true,
  created_at timestamp with time zone not null default now()
);

create unique index if not exists uq_centros_costo_coop_codigo
on public.contabilidad_centros_costo(cooperativa_id, codigo);

insert into public.contabilidad_centros_costo (cooperativa_id, codigo, nombre, tipo)
select c.id, v.codigo, v.nombre, v.tipo
from (select id from public.cooperativas order by id limit 1) c
cross join (
  values
    ('MINA', 'Interior mina', 'produccion'),
    ('TUJO', 'Tujo / cielo abierto con maquinaria', 'produccion'),
    ('RIO', 'Rio / cielo abierto', 'produccion'),
    ('ADMIN', 'Administracion', 'administrativo'),
    ('ALMACEN', 'Almacen', 'almacen'),
    ('COMISION', 'Comisiones y viajes', 'comision')
) as v(codigo, nombre, tipo)
where not exists (
  select 1
  from public.contabilidad_centros_costo cc
  where cc.cooperativa_id = c.id
    and cc.codigo = v.codigo
);

create table if not exists public.contabilidad_periodos (
  id bigserial primary key,
  cooperativa_id bigint references public.cooperativas(id),
  gestion integer not null,
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null default 'abierto'
    check (estado in ('abierto', 'cerrado')),
  observaciones text,
  cerrado_por text,
  cerrado_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  check (fecha_fin >= fecha_inicio)
);

create unique index if not exists uq_contabilidad_periodos_coop_rango
on public.contabilidad_periodos(cooperativa_id, gestion, fecha_inicio, fecha_fin);

create table if not exists public.contabilidad_asientos (
  id bigserial primary key,
  cooperativa_id bigint references public.cooperativas(id),
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
  tipo_comprobante text,
  numero_comprobante text,
  folio text,
  usuario_nombre text,
  motivo_anulacion text,
  asiento_revertido_id bigint references public.contabilidad_asientos(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.contabilidad_asiento_detalles (
  id bigserial primary key,
  asiento_id bigint not null references public.contabilidad_asientos(id) on delete cascade,
  cuenta_id bigint not null references public.plan_cuentas(id_cuenta),
  centro_costo_id bigint references public.contabilidad_centros_costo(id),
  descripcion text,
  debe numeric(15,2) not null default 0,
  haber numeric(15,2) not null default 0,
  created_at timestamp with time zone not null default now(),
  check (debe >= 0),
  check (haber >= 0),
  check (debe > 0 or haber > 0),
  check (not (debe > 0 and haber > 0))
);

create table if not exists public.contabilidad_auditoria (
  id bigserial primary key,
  tabla text not null,
  registro_id text not null,
  accion text not null,
  usuario_nombre text,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  motivo text,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_plan_cuentas_cooperativa
on public.plan_cuentas(cooperativa_id);

create index if not exists idx_contabilidad_periodos_gestion
on public.contabilidad_periodos(cooperativa_id, gestion);

create index if not exists idx_contabilidad_asientos_fecha
on public.contabilidad_asientos(cooperativa_id, fecha);

create index if not exists idx_contabilidad_asientos_periodo
on public.contabilidad_asientos(periodo_id);

create index if not exists idx_contabilidad_asientos_origen
on public.contabilidad_asientos(modulo_origen, referencia_id);

create index if not exists idx_contabilidad_detalles_asiento
on public.contabilidad_asiento_detalles(asiento_id);

create index if not exists idx_contabilidad_detalles_cuenta
on public.contabilidad_asiento_detalles(cuenta_id);

create index if not exists idx_contabilidad_detalles_centro_costo
on public.contabilidad_asiento_detalles(centro_costo_id);

create or replace function public.contabilidad_periodo_abierto(
  p_fecha date,
  p_periodo_id bigint default null
)
returns boolean
language sql
stable
as $$
  select coalesce((
    select estado = 'abierto'
    from public.contabilidad_periodos
    where (p_periodo_id is not null and id = p_periodo_id)
       or (p_periodo_id is null and p_fecha between fecha_inicio and fecha_fin)
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

create or replace function public.contabilidad_validar_detalle()
returns trigger
language plpgsql
as $$
declare
  v_cuenta record;
  v_asiento record;
  v_tiene_hijos boolean;
begin
  select *
  into v_cuenta
  from public.plan_cuentas
  where id_cuenta = new.cuenta_id;

  if not found then
    raise exception 'La cuenta contable no existe: %', new.cuenta_id;
  end if;

  if coalesce(v_cuenta.activa, true) = false or coalesce(v_cuenta.estado, 'Activa') <> 'Activa' then
    raise exception 'La cuenta contable esta inactiva: %', v_cuenta.nombre_cuenta;
  end if;

  if coalesce(v_cuenta.permite_movimiento, true) = false then
    raise exception 'La cuenta no permite movimientos directos: %', v_cuenta.nombre_cuenta;
  end if;

  select exists (
    select 1
    from public.plan_cuentas hija
    where hija.cuenta_padre_id = new.cuenta_id
      and coalesce(hija.activa, true) = true
  )
  into v_tiene_hijos;

  if v_tiene_hijos then
    raise exception 'No se puede mover una cuenta padre con subcuentas: %', v_cuenta.nombre_cuenta;
  end if;

  select *
  into v_asiento
  from public.contabilidad_asientos
  where id = new.asiento_id;

  if not found then
    raise exception 'El asiento no existe: %', new.asiento_id;
  end if;

  if not public.contabilidad_periodo_abierto(v_asiento.fecha, v_asiento.periodo_id) then
    raise exception 'Periodo cerrado. No se aceptan cambios en fecha %', v_asiento.fecha;
  end if;

  return new;
end $$;

drop trigger if exists trg_contabilidad_validar_detalle on public.contabilidad_asiento_detalles;
create trigger trg_contabilidad_validar_detalle
before insert or update on public.contabilidad_asiento_detalles
for each row execute function public.contabilidad_validar_detalle();

create or replace function public.contabilidad_validar_asiento()
returns trigger
language plpgsql
as $$
declare
  v_debe numeric(15,2);
  v_haber numeric(15,2);
begin
  if new.estado = 'confirmado' then
    if not public.contabilidad_periodo_abierto(new.fecha, new.periodo_id) then
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
  v_periodo_id bigint;
begin
  if tg_table_name = 'contabilidad_asientos' then
    if tg_op = 'DELETE' then
      v_fecha := old.fecha;
      v_periodo_id := old.periodo_id;
    else
      v_fecha := new.fecha;
      v_periodo_id := new.periodo_id;
    end if;
  else
    if tg_op = 'DELETE' then
      select fecha, periodo_id
      into v_fecha, v_periodo_id
      from public.contabilidad_asientos
      where id = old.asiento_id;
    else
      select fecha, periodo_id
      into v_fecha, v_periodo_id
      from public.contabilidad_asientos
      where id = new.asiento_id;
    end if;
  end if;

  if not public.contabilidad_periodo_abierto(v_fecha, v_periodo_id) then
    raise exception 'Periodo cerrado. No se aceptan cambios en fecha %', v_fecha;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

drop trigger if exists trg_contabilidad_bloquear_asientos on public.contabilidad_asientos;
create trigger trg_contabilidad_bloquear_asientos
before insert or update or delete on public.contabilidad_asientos
for each row execute function public.contabilidad_bloquear_periodo_cerrado();

drop trigger if exists trg_contabilidad_bloquear_detalles on public.contabilidad_asiento_detalles;
create trigger trg_contabilidad_bloquear_detalles
before insert or update or delete on public.contabilidad_asiento_detalles
for each row execute function public.contabilidad_bloquear_periodo_cerrado();

create or replace function public.contabilidad_auditar_asiento()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.contabilidad_auditoria(tabla, registro_id, accion, usuario_nombre, datos_nuevos)
    values (tg_table_name, new.id::text, tg_op, new.usuario_nombre, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.contabilidad_auditoria(tabla, registro_id, accion, usuario_nombre, datos_anteriores, datos_nuevos)
    values (tg_table_name, new.id::text, tg_op, new.usuario_nombre, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.contabilidad_auditoria(tabla, registro_id, accion, datos_anteriores)
    values (tg_table_name, old.id::text, tg_op, to_jsonb(old));
    return old;
  end if;
end $$;

drop trigger if exists trg_contabilidad_auditar_asiento on public.contabilidad_asientos;
create trigger trg_contabilidad_auditar_asiento
after insert or update or delete on public.contabilidad_asientos
for each row execute function public.contabilidad_auditar_asiento();

insert into public.contabilidad_periodos (
  cooperativa_id,
  gestion,
  nombre,
  fecha_inicio,
  fecha_fin,
  estado,
  observaciones
)
select c.id, 2026, 'Gestion 2026', '2026-01-01', '2026-12-31', 'abierto', 'Periodo inicial del sistema'
from (select id from public.cooperativas order by id limit 1) c
where not exists (
  select 1
  from public.contabilidad_periodos p
  where p.cooperativa_id = c.id
    and p.gestion = 2026
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.cooperativas to anon, authenticated;
grant select, insert, update, delete on table public.contabilidad_centros_costo to anon, authenticated;
grant select, insert, update, delete on table public.contabilidad_periodos to anon, authenticated;
grant select, insert, update, delete on table public.contabilidad_asientos to anon, authenticated;
grant select, insert, update, delete on table public.contabilidad_asiento_detalles to anon, authenticated;
grant select, insert on table public.contabilidad_auditoria to anon, authenticated;

grant usage, select on sequence public.cooperativas_id_seq to anon, authenticated;
grant usage, select on sequence public.contabilidad_centros_costo_id_seq to anon, authenticated;
grant usage, select on sequence public.contabilidad_periodos_id_seq to anon, authenticated;
grant usage, select on sequence public.contabilidad_asientos_id_seq to anon, authenticated;
grant usage, select on sequence public.contabilidad_asiento_detalles_id_seq to anon, authenticated;
grant usage, select on sequence public.contabilidad_auditoria_id_seq to anon, authenticated;

alter table public.cooperativas enable row level security;
alter table public.contabilidad_centros_costo enable row level security;
alter table public.contabilidad_periodos enable row level security;
alter table public.contabilidad_asientos enable row level security;
alter table public.contabilidad_asiento_detalles enable row level security;
alter table public.contabilidad_auditoria enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'cooperativas',
    'contabilidad_centros_costo',
    'contabilidad_periodos',
    'contabilidad_asientos',
    'contabilidad_asiento_detalles',
    'contabilidad_auditoria'
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

    if t <> 'contabilidad_auditoria' then
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
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
