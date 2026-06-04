-- Completar el plan de cuentas con Patrimonio cooperativo.
-- Ejecutar en Supabase Dashboard > SQL Editor.
--
-- La tabla actual rechaza tipo_cuenta = 'Capital' o 'Patrimonio' por su
-- restriccion CHECK. Este script cambia la restriccion para aceptar Patrimonio
-- e inserta las cuentas patrimoniales de una cooperativa minera aurifera.

alter table public.plan_cuentas
drop constraint if exists plan_cuentas_tipo_cuenta_check;

alter table public.plan_cuentas
add constraint plan_cuentas_tipo_cuenta_check
check (tipo_cuenta in ('Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Egreso'));

insert into public.plan_cuentas (codigo_cuenta, nombre_cuenta, nivel, tipo_cuenta, estado)
select codigo_cuenta, nombre_cuenta, nivel, tipo_cuenta, estado
from (
  values
    ('3', 'PATRIMONIO', 1, 'Patrimonio', 'Activa'),
    ('3.1', 'PATRIMONIO COOPERATIVO', 2, 'Patrimonio', 'Activa'),
    ('3.1.01', 'Aportes de Socios Cooperativistas', 3, 'Patrimonio', 'Activa'),
    ('3.1.02', 'Certificados de Aportacion', 3, 'Patrimonio', 'Activa'),
    ('3.1.03', 'Reservas Cooperativas', 3, 'Patrimonio', 'Activa'),
    ('3.1.04', 'Excedentes Acumulados', 3, 'Patrimonio', 'Activa'),
    ('3.1.05', 'Resultado del Ejercicio', 3, 'Patrimonio', 'Activa')
) as nuevas(codigo_cuenta, nombre_cuenta, nivel, tipo_cuenta, estado)
where not exists (
  select 1
  from public.plan_cuentas existentes
  where existentes.codigo_cuenta = nuevas.codigo_cuenta
);

notify pgrst, 'reload schema';
