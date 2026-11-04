-- =============================================================================
-- TurnoSmart · Preparar la demo de la fase 5 (docs/DEMO.md)
--
-- Solo toca cuentas de PRUEBA y datos demo ficticios; no es un respaldo ni un
-- dump. Idempotente: se puede ejecutar antes de cada ensayo.
--   · Paciente A: turnosmart.e2e.a@example.com (cancela su cita en la app)
--   · Paciente B: turnosmart.e2e.b@example.com (recibe la oferta y la acepta)
--   · Staff:      staff.demo@turnosmart.test  (panel del consultorio demo)
-- Requisito: haber aplicado supabase/pruebas/datos_demo_fase4.sql.
--
-- Qué deja listo (todo en Cardiología, consultorio «Consultorio Demo
-- TurnoSmart (ficticio)», «Dra. Demo Ficticia»):
--   1. Los pacientes demo (@turnosmart.test) fuera de la lista de espera de
--      Cardiología, así la IA elige entre A y B y la oferta es predecible.
--   2. A y B en la lista de espera de Cardiología (B primero). Al cancelar A,
--      el único candidato es B (quien cancela no recibe su propio cupo); para
--      el extra (cancelación telefónica del staff) el candidato es A.
--   3. Una cita confirmada de A pasado mañana por la tarde (si no tiene una).
--   4. Una cita confirmada de un paciente demo (Julián) en 3 días, para el
--      extra «Registrar cancelación» (si no hay una).
--
-- Aplicar: supabase db query --linked -f supabase/pruebas/preparar_demo_fase5.sql
-- =============================================================================
begin;

create or replace function pg_temp.bogota(p_dias integer, p_hora text)
returns timestamptz language sql as $$
  select ((now() at time zone 'America/Bogota')::date + p_dias + p_hora::time) at time zone 'America/Bogota';
$$;

-- Primer horario libre de la profesional demo ese día, desde p_hora, cada 30 min.
create or replace function pg_temp.libre(p_dias integer, p_hora text)
returns timestamptz language sql as $$
  select h from generate_series(pg_temp.bogota(p_dias, p_hora), pg_temp.bogota(p_dias, p_hora) + interval '3 hours', interval '30 minutes') h
  where not exists (
    select 1 from public.citas c
    where c.profesional_id = 'de300000-0000-4000-8000-000000000102' and c.fecha_hora = h and c.estado = 'confirmada'
  )
  order by h limit 1;
$$;

-- 1. Pacientes demo fuera de la lista de Cardiología.
update public.solicitudes_espera s
   set estado = 'retirada', finalizada_en = now()
 where s.estado = 'activa'
   and s.especialidad_id = (select id from public.especialidades where nombre = 'Cardiología')
   and s.paciente_id in (select id from public.pacientes where email like '%@turnosmart.test');

-- 2. B y A en la lista de espera de Cardiología (B primero).
insert into public.solicitudes_espera (paciente_id, especialidad_id, creada_en)
select p.id, e.id, now() - make_interval(days => x.dias)
from (values ('turnosmart.e2e.b@example.com', 20), ('turnosmart.e2e.a@example.com', 5)) as x(email, dias)
join public.pacientes p on p.email = x.email
cross join public.especialidades e
where e.nombre = 'Cardiología'
  and not exists (
    select 1 from public.solicitudes_espera s
    where s.paciente_id = p.id and s.especialidad_id = e.id and s.estado = 'activa'
  );

-- Con las alertas activas (factor «disponibilidad» de la priorización).
update public.pacientes set notificaciones_activas = true
 where email in ('turnosmart.e2e.a@example.com', 'turnosmart.e2e.b@example.com') and not notificaciones_activas;

-- 3. Cita confirmada de A (pasado mañana, desde las 15:00).
insert into public.citas (paciente_id, especialidad_id, profesional_id, consultorio_id, fecha_hora, estado, origen, creada_en)
select p.id, pr.especialidad_id, pr.id, pr.consultorio_id, pg_temp.libre(2, '15:00'), 'confirmada', 'reserva-directa', now() - interval '10 days'
from public.pacientes p
join public.profesionales pr on pr.id = 'de300000-0000-4000-8000-000000000102'
where p.email = 'turnosmart.e2e.a@example.com'
  and not exists (
    select 1 from public.citas c
    where c.paciente_id = p.id and c.consultorio_id = pr.consultorio_id and c.estado = 'confirmada' and c.fecha_hora > now()
  );

-- 4. Cita confirmada de Julián (demo) en 3 días, desde las 10:00.
insert into public.citas (paciente_id, especialidad_id, profesional_id, consultorio_id, fecha_hora, estado, origen, creada_en)
select 'de300000-0000-4000-8000-000000000013', pr.especialidad_id, pr.id, pr.consultorio_id, pg_temp.libre(3, '10:00'),
       'confirmada', 'reserva-directa', now() - interval '25 days'
from public.profesionales pr
where pr.id = 'de300000-0000-4000-8000-000000000102'
  and not exists (
    select 1 from public.citas c
    where c.paciente_id = 'de300000-0000-4000-8000-000000000013' and c.estado = 'confirmada'
      and c.fecha_hora > now() + interval '2 hours'
  );

commit;

-- Resumen (sin datos personales: solo estados y horarios)
select
  (select count(*) from public.solicitudes_espera s join public.pacientes p on p.id = s.paciente_id
    join public.especialidades e on e.id = s.especialidad_id
    where e.nombre = 'Cardiología' and s.estado = 'activa') as en_espera_cardiologia,
  (select min(c.fecha_hora) from public.citas c join public.pacientes p on p.id = c.paciente_id
    where p.email = 'turnosmart.e2e.a@example.com' and c.estado = 'confirmada' and c.fecha_hora > now()) as cita_paciente_a,
  (select count(*) from public.citas c where c.consultorio_id = 'de300000-0000-4000-8000-000000000101'
    and c.estado = 'confirmada' and c.fecha_hora > now()) as agenda_demo_futura;
