-- Correccion de permisos y tabla faltante para desarrollo local.
-- Ejecutar en Supabase Dashboard > SQL Editor.
--
-- Objetivo:
-- 1. Crear configuracion_rendicion si falta.
-- 2. Dar permisos REST a anon/authenticated para las tablas que usa la app.
-- 3. Crear politicas RLS permisivas para desarrollo.
-- 4. Recargar el schema cache de PostgREST.
--
-- Nota: estas politicas son amplias para que el sistema funcione localmente.
-- Luego conviene reemplazarlas por politicas por rol/usuario.

create table if not exists public.configuracion_rendicion (
  id bigserial primary key,
  saldo_inicial numeric(15,2) default 1500.00,
  comision_id bigint,
  fecha_vigencia date default current_date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

insert into public.configuracion_rendicion (saldo_inicial)
select 1500.00
where not exists (select 1 from public.configuracion_rendicion);

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table
  public.personal_socios,
  public.rendiciones_gastos,
  public.plan_cuentas,
  public.comercializacion_oro,
  public.asistencias_fallas,
  public.sanciones_memorandums,
  public.almacen_movimientos_auditado,
  public.distribuidores,
  public.configuracion_rendicion
to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

alter table public.plan_cuentas enable row level security;
alter table public.comercializacion_oro enable row level security;
alter table public.asistencias_fallas enable row level security;
alter table public.sanciones_memorandums enable row level security;
alter table public.configuracion_rendicion enable row level security;

do $$
declare
  tbl text;
  target_tables text[] := array[
    'plan_cuentas',
    'comercializacion_oro',
    'asistencias_fallas',
    'sanciones_memorandums',
    'configuracion_rendicion'
  ];
begin
  foreach tbl in array target_tables loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = 'dev_select_all'
    ) then
      execute format(
        'create policy dev_select_all on public.%I for select to anon, authenticated using (true)',
        tbl
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = 'dev_insert_all'
    ) then
      execute format(
        'create policy dev_insert_all on public.%I for insert to anon, authenticated with check (true)',
        tbl
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = 'dev_update_all'
    ) then
      execute format(
        'create policy dev_update_all on public.%I for update to anon, authenticated using (true) with check (true)',
        tbl
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = 'dev_delete_all'
    ) then
      execute format(
        'create policy dev_delete_all on public.%I for delete to anon, authenticated using (true)',
        tbl
      );
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
