-- Vinculo formal Tesoreria -> Almacen
-- Ejecutar en Supabase SQL Editor.
-- Objetivo:
-- 1. El tesorero marca una compra como "debe pasar por almacen".
-- 2. El sistema crea un ingreso pendiente en almacen.
-- 3. El almacenero verifica cantidad real, sello fisico y observaciones.
-- 4. Recibo/folio y origen_tesoreria_id conectan ambos lados.

alter table public.tesoreria_movimientos
  add column if not exists requiere_ingreso_almacen boolean not null default false;

alter table public.almacen_movimientos_auditado
  add column if not exists origen_tesoreria_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'almacen_movimientos_origen_tesoreria_fk'
      and conrelid = 'public.almacen_movimientos_auditado'::regclass
  ) then
    alter table public.almacen_movimientos_auditado
      add constraint almacen_movimientos_origen_tesoreria_fk
      foreign key (origen_tesoreria_id)
      references public.tesoreria_movimientos(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_tesoreria_requiere_almacen
  on public.tesoreria_movimientos(requiere_ingreso_almacen)
  where requiere_ingreso_almacen = true;

create index if not exists idx_almacen_origen_tesoreria
  on public.almacen_movimientos_auditado(origen_tesoreria_id);

create index if not exists idx_almacen_pendientes_verificacion
  on public.almacen_movimientos_auditado(estado_verificacion)
  where estado_verificacion = 'pendiente_verificacion';
