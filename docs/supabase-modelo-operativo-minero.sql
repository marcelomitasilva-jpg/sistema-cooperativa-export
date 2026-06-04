-- Modelo operativo Tipuani/Yungas: puntas, turnos y lugares de trabajo.
-- Ejecutar en Supabase Dashboard > SQL Editor.
--
-- Conceptos locales:
-- - No se usa "frente"; se usa "punta".
-- - Cada punta tiene 12 a 13 asociados.
-- - Cada punta tiene un delegado y un jefe de punta.
-- - Hay 3 turnos de 8 horas:
--   08:00 a 16:00, 16:00 a 00:00, 00:00 a 08:00.
-- - Hay 3 lugares de trabajo actuales: Mina, Tujo y Rio.
-- - Las puntas rotan por lugares de trabajo, no por socios individuales.

create table if not exists public.puntas (
  id bigserial primary key,
  nombre text not null unique,
  delegado_socio_id bigint references public.personal_socios(id) on delete set null,
  jefe_punta_socio_id bigint references public.personal_socios(id) on delete set null,
  estado text not null default 'Activa',
  observaciones text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.punta_asociados (
  id bigserial primary key,
  punta_id bigint not null references public.puntas(id) on delete cascade,
  socio_id bigint not null references public.personal_socios(id) on delete cascade,
  rol text not null default 'Asociado',
  estado text not null default 'Activo',
  created_at timestamp with time zone not null default now(),
  unique (punta_id, socio_id)
);

create table if not exists public.lugares_trabajo (
  id bigserial primary key,
  nombre text not null unique,
  descripcion text,
  tipo_trabajo text not null,
  estado text not null default 'Activo',
  created_at timestamp with time zone not null default now()
);

create table if not exists public.turnos_trabajo (
  id bigserial primary key,
  nombre text not null unique,
  hora_inicio time not null,
  hora_fin time not null,
  orden integer not null unique,
  estado text not null default 'Activo'
);

create table if not exists public.rotaciones_punta (
  id bigserial primary key,
  fecha date not null,
  punta_id bigint not null references public.puntas(id) on delete cascade,
  lugar_trabajo_id bigint not null references public.lugares_trabajo(id) on delete cascade,
  turno_id bigint not null references public.turnos_trabajo(id) on delete cascade,
  observaciones text,
  created_at timestamp with time zone not null default now(),
  unique (fecha, punta_id, lugar_trabajo_id, turno_id)
);

create table if not exists public.directorio_cooperativa (
  id bigserial primary key,
  socio_id bigint not null references public.personal_socios(id) on delete cascade,
  cargo text not null,
  fecha_inicio date default current_date,
  fecha_fin date,
  estado text not null default 'Activo',
  observaciones text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.coordinadores_lugar (
  id bigserial primary key,
  lugar_trabajo_id bigint not null references public.lugares_trabajo(id) on delete cascade,
  socio_id bigint not null references public.personal_socios(id) on delete cascade,
  turno_id bigint references public.turnos_trabajo(id) on delete set null,
  estado text not null default 'Activo',
  observaciones text,
  created_at timestamp with time zone not null default now(),
  unique (lugar_trabajo_id, socio_id, turno_id)
);

create table if not exists public.produccion_aurifera (
  id bigserial primary key,
  fecha date not null default current_date,
  punta_id bigint references public.puntas(id) on delete set null,
  lugar_trabajo_id bigint references public.lugares_trabajo(id) on delete set null,
  turno_id bigint references public.turnos_trabajo(id) on delete set null,
  socio_id bigint references public.personal_socios(id) on delete set null,
  peso_bruto numeric(12,3) not null default 0,
  ley_oro numeric(8,3),
  oro_fino numeric(12,3),
  unidad text not null default 'gramos',
  metodo text,
  comprador text,
  precio_unitario numeric(15,2),
  valor_bruto numeric(15,2),
  regalia numeric(15,2) not null default 0,
  aporte_cooperativa numeric(15,2) not null default 0,
  deducciones numeric(15,2) not null default 0,
  valor_neto numeric(15,2),
  observaciones text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.aportes_deudas_socios (
  id bigserial primary key,
  socio_id bigint not null references public.personal_socios(id) on delete cascade,
  fecha date not null default current_date,
  tipo text not null,
  concepto text not null,
  monto numeric(15,2) not null default 0,
  estado text not null default 'Pendiente',
  referencia text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.liquidaciones_punta (
  id bigserial primary key,
  produccion_id bigint references public.produccion_aurifera(id) on delete set null,
  punta_id bigint references public.puntas(id) on delete set null,
  fecha date not null default current_date,
  total_venta numeric(15,2) not null default 0,
  combustible numeric(15,2) not null default 0,
  maquinaria numeric(15,2) not null default 0,
  alimentacion numeric(15,2) not null default 0,
  adelantos numeric(15,2) not null default 0,
  aporte_cooperativa numeric(15,2) not null default 0,
  otros_descuentos numeric(15,2) not null default 0,
  saldo_repartir numeric(15,2) not null default 0,
  observaciones text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.actas_asamblea (
  id bigserial primary key,
  fecha date not null default current_date,
  tipo text not null default 'Ordinaria',
  tema text not null,
  decisiones text,
  monto_aprobado numeric(15,2),
  estado text not null default 'Aprobada',
  archivo_url text,
  created_at timestamp with time zone not null default now()
);

insert into public.lugares_trabajo (nombre, descripcion, tipo_trabajo)
select *
from (
  values
    ('Mina', 'Trabajo interior mina', 'Interior mina'),
    ('Tujo', 'Trabajo en cerro con maquinaria a cielo abierto', 'Cielo abierto'),
    ('Rio', 'Trabajo en rio a cielo abierto', 'Cielo abierto')
) as data(nombre, descripcion, tipo_trabajo)
where not exists (
  select 1 from public.lugares_trabajo l where l.nombre = data.nombre
);

insert into public.turnos_trabajo (nombre, hora_inicio, hora_fin, orden)
select *
from (
  values
    ('08:00 - 16:00', '08:00'::time, '16:00'::time, 1),
    ('16:00 - 00:00', '16:00'::time, '00:00'::time, 2),
    ('00:00 - 08:00', '00:00'::time, '08:00'::time, 3)
) as data(nombre, hora_inicio, hora_fin, orden)
where not exists (
  select 1 from public.turnos_trabajo t where t.nombre = data.nombre
);

create index if not exists idx_puntas_delegado on public.puntas(delegado_socio_id);
create index if not exists idx_puntas_jefe on public.puntas(jefe_punta_socio_id);
create index if not exists idx_punta_asociados_punta on public.punta_asociados(punta_id);
create index if not exists idx_punta_asociados_socio on public.punta_asociados(socio_id);
create index if not exists idx_rotaciones_fecha on public.rotaciones_punta(fecha);
create index if not exists idx_rotaciones_punta on public.rotaciones_punta(punta_id);
create index if not exists idx_directorio_socio on public.directorio_cooperativa(socio_id);
create index if not exists idx_directorio_cargo on public.directorio_cooperativa(cargo);
create index if not exists idx_coordinadores_lugar on public.coordinadores_lugar(lugar_trabajo_id);
create index if not exists idx_coordinadores_socio on public.coordinadores_lugar(socio_id);
create index if not exists idx_produccion_fecha on public.produccion_aurifera(fecha);
create index if not exists idx_produccion_punta on public.produccion_aurifera(punta_id);
create index if not exists idx_produccion_lugar on public.produccion_aurifera(lugar_trabajo_id);
create index if not exists idx_aportes_socio on public.aportes_deudas_socios(socio_id);
create index if not exists idx_aportes_estado on public.aportes_deudas_socios(estado);
create index if not exists idx_liquidaciones_punta on public.liquidaciones_punta(punta_id);
create index if not exists idx_actas_fecha on public.actas_asamblea(fecha);

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table
  public.puntas,
  public.punta_asociados,
  public.lugares_trabajo,
  public.turnos_trabajo,
  public.rotaciones_punta,
  public.directorio_cooperativa,
  public.coordinadores_lugar,
  public.produccion_aurifera,
  public.aportes_deudas_socios,
  public.liquidaciones_punta,
  public.actas_asamblea
to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

alter table public.puntas enable row level security;
alter table public.punta_asociados enable row level security;
alter table public.lugares_trabajo enable row level security;
alter table public.turnos_trabajo enable row level security;
alter table public.rotaciones_punta enable row level security;
alter table public.directorio_cooperativa enable row level security;
alter table public.coordinadores_lugar enable row level security;
alter table public.produccion_aurifera enable row level security;
alter table public.aportes_deudas_socios enable row level security;
alter table public.liquidaciones_punta enable row level security;
alter table public.actas_asamblea enable row level security;

do $$
declare
  tbl text;
  target_tables text[] := array[
    'puntas',
    'punta_asociados',
    'lugares_trabajo',
    'turnos_trabajo',
    'rotaciones_punta',
    'directorio_cooperativa',
    'coordinadores_lugar',
    'produccion_aurifera',
    'aportes_deudas_socios',
    'liquidaciones_punta',
    'actas_asamblea'
  ];
begin
  foreach tbl in array target_tables loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = 'dev_select_all'
    ) then
      execute format('create policy dev_select_all on public.%I for select to anon, authenticated using (true)', tbl);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = 'dev_insert_all'
    ) then
      execute format('create policy dev_insert_all on public.%I for insert to anon, authenticated with check (true)', tbl);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = 'dev_update_all'
    ) then
      execute format('create policy dev_update_all on public.%I for update to anon, authenticated using (true) with check (true)', tbl);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = 'dev_delete_all'
    ) then
      execute format('create policy dev_delete_all on public.%I for delete to anon, authenticated using (true)', tbl);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
