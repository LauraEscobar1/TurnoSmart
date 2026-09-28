-- =============================================================================
-- TurnoSmart · Verificación del esquema (solo lectura)
--
-- Ejecutar en el SQL Editor de Supabase ANTES y DESPUÉS de aplicar las
-- migraciones. Muestra columnas, restricciones, políticas, triggers de
-- auth.users y funciones, para confirmar que coinciden con lo que la app usa.
-- =============================================================================
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('especialidades', 'consultorios', 'profesionales', 'pacientes', 'solicitudes_espera',
                     'citas', 'cupos', 'ofertas', 'ofertas_factores', 'ofertas_eventos', 'notificaciones')
order by table_name, ordinal_position;

select conrelid::regclass as tabla, conname, pg_get_constraintdef(oid) as definicion
from pg_constraint
where connamespace = 'public'::regnamespace
order by 1, 2;

select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' order by 1, 2;

-- Debe haber UN solo trigger que cree el paciente (on_auth_user_created_crear_paciente).
select tgname, pg_get_triggerdef(oid) from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;

select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as security_definer
from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1;

select id, nombre from public.especialidades order by id;
