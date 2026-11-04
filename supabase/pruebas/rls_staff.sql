-- =============================================================================
-- TurnoSmart · Prueba de RLS y RPC del staff (no deja cambios: ROLLBACK)
--
-- Requiere los datos de datos_demo_fase4.sql. Se hace pasar por cada usuario
-- con request.jwt.claims + role authenticated, como lo hace PostgREST.
-- Si una comprobación falla, lanza «FALLO: …» y la transacción se descarta.
--   supabase db query --linked -f supabase/pruebas/rls_staff.sql
-- =============================================================================
begin;

-- Un segundo staff, de OTRO consultorio (solo dentro de esta transacción).
insert into public.consultorios (id, nombre) values ('de300000-0000-4000-8000-000000000901', 'Consultorio prueba RLS (temporal)');
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'de300000-0000-4000-8000-000000000902', 'authenticated', 'authenticated',
        'staff.otro.rls@turnosmart.test', '{"rol":"staff"}', '{}', now(), now());
insert into public.staff (usuario_id, consultorio_id) values ('de300000-0000-4000-8000-000000000902', 'de300000-0000-4000-8000-000000000901');

-- ---------------------------------------------------------------------------
-- 1. Staff demo
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"de300000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  v_agenda record;
  v_error text;
begin
  if exists (select 1 from public.pacientes where email = 'staff.demo@turnosmart.test') then
    raise exception 'FALLO: el trigger creó un paciente para el staff';
  end if;
  if (select count(*) from public.pacientes) <> 0 then raise exception 'FALLO: el staff lee pacientes'; end if;
  if (select count(*) from public.citas) <> 0 then raise exception 'FALLO: el staff lee citas directamente'; end if;
  if (select count(*) from public.ofertas) <> 0 then raise exception 'FALLO: el staff lee ofertas directamente'; end if;
  if (select count(*) from public.cupos) <> 4
     or exists (select 1 from public.cupos where consultorio_id <> 'de300000-0000-4000-8000-000000000101') then
    raise exception 'FALLO: el staff no ve exactamente los 4 cupos de su consultorio';
  end if;
  if (select count(*) from public.staff) <> 1 then raise exception 'FALLO: el staff ve filas de staff ajenas'; end if;
  if public.mi_perfil_staff() ->> 'nombre' is distinct from 'Staff Demo' then raise exception 'FALLO: mi_perfil_staff'; end if;

  if (select count(*) from public.staff_agenda(14)) < 9 then raise exception 'FALLO: agenda incompleta'; end if;
  for v_agenda in select * from public.staff_agenda(14) loop
    if v_agenda.consultorio <> 'Consultorio Demo TurnoSmart (ficticio)'
       or v_agenda.paciente_iniciales !~ '^[[:upper:]]{2}$'
       or v_agenda.paciente_codigo !~ '^P-[0-9A-F]{6}$' then
      raise exception 'FALLO: agenda con datos fuera de iniciales/código o de otro consultorio';
    end if;
  end loop;
  if (select (public.staff_metricas(30) ->> 'cupos_liberados')::int) <> 4 then raise exception 'FALLO: métricas'; end if;
  if (select count(*) from public.staff_datos_riesgo(null)) <> 8 then raise exception 'FALLO: staff_datos_riesgo'; end if;

  -- Inasistencia: no en una cita futura; sí en la de hoy que ya pasó.
  begin
    perform public.registrar_inasistencia('de300000-0000-4000-8000-000000000301');
    raise exception 'FALLO: registró inasistencia en una cita futura';
  exception when sqlstate '22023' then null;
  end;
  perform public.registrar_inasistencia('de300000-0000-4000-8000-000000000309');
  begin
    perform public.guardar_riesgo_inasistencia('[]');
    raise exception 'FALLO: el staff puede escribir riesgo_inasistencia';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 2. Staff de otro consultorio: no ve nada del consultorio demo
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"de300000-0000-4000-8000-000000000902","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.cupos) <> 0 then raise exception 'FALLO: otro staff ve cupos ajenos'; end if;
  if (select count(*) from public.staff_agenda(14)) <> 0 then raise exception 'FALLO: otro staff ve la agenda ajena'; end if;
  if (select count(*) from public.riesgo_inasistencia) <> 0 then raise exception 'FALLO: otro staff ve riesgos ajenos'; end if;
  begin
    perform public.cancelar_cita_staff('de300000-0000-4000-8000-000000000301');
    raise exception 'FALLO: otro staff canceló una cita ajena';
  exception when sqlstate 'P0002' then null;
  end;
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 3. Paciente demo: sin acceso a las funciones ni tablas del staff
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"de300000-0000-4000-8000-000000000011","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.staff) <> 0 then raise exception 'FALLO: el paciente lee staff'; end if;
  if (select count(*) from public.riesgo_inasistencia) <> 0 then raise exception 'FALLO: el paciente lee riesgos'; end if;
  if (select count(*) from public.staff_agenda(14)) <> 0 then raise exception 'FALLO: el paciente ve la agenda'; end if;
  if public.mi_perfil_staff() is not null then raise exception 'FALLO: el paciente tiene perfil de staff'; end if;
  begin
    perform public.staff_datos_riesgo(null);
    raise exception 'FALLO: el paciente pidió datos de riesgo';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.cancelar_cita_staff('de300000-0000-4000-8000-000000000301');
    raise exception 'FALLO: el paciente canceló como staff';
  exception when sqlstate 'P0002' then null;
  end;
end $$;
reset role;

rollback;

select 'RLS staff: todas las comprobaciones pasaron (sin cambios: rollback)' as resultado;
