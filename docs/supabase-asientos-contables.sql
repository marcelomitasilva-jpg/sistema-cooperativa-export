-- Tabla para asientos contables automaticos.
-- Ejecutar en Supabase Dashboard > SQL Editor.

create table if not exists public.asientos_contables (
  id bigserial primary key,
  fecha date not null default current_date,
  modulo_origen text not null,
  referencia_id text,
  descripcion text not null,
  debe numeric(15,2) not null default 0,
  haber numeric(15,2) not null default 0,
  estado text not null default 'registrado',
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_asientos_fecha on public.asientos_contables(fecha);
create index if not exists idx_asientos_modulo on public.asientos_contables(modulo_origen);
create index if not exists idx_asientos_referencia on public.asientos_contables(referencia_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.asientos_contables to anon, authenticated;
grant usage, select on sequence public.asientos_contables_id_seq to anon, authenticated;

alter table public.asientos_contables enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'asientos_contables'
      and policyname = 'dev_asientos_select_all'
  ) then
    create policy dev_asientos_select_all
    on public.asientos_contables
    for select to anon, authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'asientos_contables'
      and policyname = 'dev_asientos_insert_all'
  ) then
    create policy dev_asientos_insert_all
    on public.asientos_contables
    for insert to anon, authenticated
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'asientos_contables'
      and policyname = 'dev_asientos_update_all'
  ) then
    create policy dev_asientos_update_all
    on public.asientos_contables
    for update to anon, authenticated
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'asientos_contables'
      and policyname = 'dev_asientos_delete_all'
  ) then
    create policy dev_asientos_delete_all
    on public.asientos_contables
    for delete to anon, authenticated
    using (true);
  end if;
end $$;

notify pgrst, 'reload schema';
