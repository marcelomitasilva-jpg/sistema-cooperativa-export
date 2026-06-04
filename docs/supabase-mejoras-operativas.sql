-- Mejoras operativas derivadas de Comision Revisora
-- Ejecutar en Supabase SQL Editor para guardar campos reales de almacen, rendicion y socios.

alter table public.almacen_movimientos_auditado
  add column if not exists fecha_movimiento date,
  add column if not exists unidad text,
  add column if not exists rubro text,
  add column if not exists subrubro text,
  add column if not exists proveedor_nombre text,
  add column if not exists comprado_por text,
  add column if not exists numero_recibo text,
  add column if not exists folio text,
  add column if not exists destino_uso text,
  add column if not exists estado_verificacion text default 'pendiente_verificacion',
  add column if not exists sello_recibo boolean default false,
  add column if not exists observaciones text,
  add column if not exists origen_rendicion_id bigint;

create index if not exists idx_almacen_recibo_folio
  on public.almacen_movimientos_auditado(numero_recibo, folio);

create index if not exists idx_almacen_rubro
  on public.almacen_movimientos_auditado(rubro, subrubro);

alter table public.rendiciones_gastos
  add column if not exists tipo_operacion text default 'gasto_directo',
  add column if not exists folio text,
  add column if not exists numero_recibo text,
  add column if not exists responsable text,
  add column if not exists destino text,
  add column if not exists tarea text,
  add column if not exists monto_entregado numeric(14,2) default 0,
  add column if not exists monto_rendido numeric(14,2) default 0,
  add column if not exists saldo_a_favor numeric(14,2) default 0,
  add column if not exists saldo_en_contra numeric(14,2) default 0,
  add column if not exists requiere_ingreso_almacen boolean default false,
  add column if not exists estado_documental text default 'pendiente_respaldo';

create index if not exists idx_rendiciones_recibo_folio
  on public.rendiciones_gastos(numero_recibo, folio);

alter table public.aportes_deudas_socios
  add column if not exists folio text,
  add column if not exists numero_recibo text,
  add column if not exists destino text,
  add column if not exists tarea text,
  add column if not exists saldo_a_favor numeric(14,2) default 0,
  add column if not exists saldo_en_contra numeric(14,2) default 0,
  add column if not exists origen_documento text;

create index if not exists idx_aportes_recibo_folio
  on public.aportes_deudas_socios(numero_recibo, folio);

insert into public.comision_rubros (nombre, subrubro)
values
  ('Materiales', 'Rodamientos'),
  ('Materiales', 'Electrodos'),
  ('Materiales', 'Madera'),
  ('Materiales', 'Herramientas'),
  ('Materiales', 'Pernos y clavos'),
  ('Combustible', 'Diesel'),
  ('Combustible', 'Gasolina'),
  ('Combustible', 'Aceite'),
  ('Combustible', 'Grasa'),
  ('Explosivos', 'Guia'),
  ('Explosivos', 'Masa'),
  ('Explosivos', 'Fulminante'),
  ('Viaticos', 'Pasaje'),
  ('Viaticos', 'Comida y refrigerio'),
  ('Transporte', 'Encomienda'),
  ('Transporte', 'Taxi'),
  ('Servicios externos', 'Honorarios'),
  ('Servicios externos', 'Serenaje'),
  ('Giros', 'Comision'),
  ('Judicial', 'Licencia municipal'),
  ('Telefono', 'Directorio')
on conflict(nombre, subrubro) do nothing;
