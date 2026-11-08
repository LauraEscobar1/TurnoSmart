-- =============================================================================
-- TurnoSmart · Preparar la demo de la fase 5 (docs/DEMO.md)
--
-- Ejecutar ANTES DE CADA ENSAYO O PRESENTACIÓN: todas las fechas son relativas
-- a now() en hora de Bogotá, así la demo nunca queda con citas vencidas.
--
-- Solo toca cuentas de PRUEBA y datos demo ficticios; no es un respaldo ni un
-- dump. Idempotente: se puede ejecutar varias veces sin duplicar nada.
--   · Paciente A: turnosmart.e2e.a@example.com (cancela su cita en la app)
--   · Paciente B: turnosmart.e2e.b@example.com (recibe la oferta y la acepta)
--   · Staff:      staff.demo@turnosmart.test  (panel del consultorio demo)
-- Requisito: haber aplicado supabase/pruebas/datos_demo_fase4.sql.
--
-- Qué deja listo (todo en Cardiología, consultorio «Consultorio Demo
-- TurnoSmart (ficticio)», «Dra. Demo Ficticia»):
--   1. Limpieza de A y B: borra sus ofertas, notificaciones y citas de
--      ensayos anteriores (y los cupos que liberaron sus cancelaciones, salvo
--      que tengan ofertas a pacientes reales). La demo arranca desde cero.
--   2. Una cita confirmada de A MAÑANA a las 10:00 (o el siguiente día hábil;
--      si esa hora está ocupada, la siguiente media hora libre).
--   3. La lista de espera de Cardiología con tres candidatos para el cupo de
--      A (A no recibe su propio cupo), así la priorización compara varios
--      candidatos con la IA y B es el mejor sin discusión:
--        B          45 días en espera, puesto 1, franja Mañana, alertas activas
--        A          15 días, puesto 2 (candidato del extra del staff)
--        paciente5  10 días, franja Tarde, sin alertas (ficticio)
--        paciente6   4 días, franja Indistinto, sin alertas (ficticio)
--   4. Una cita confirmada de un paciente demo (Julián) en 3 días hábiles a
--      las 10:00, para el extra «Registrar cancelación» (si no hay una).
--      Ahí los candidatos son A y los dos ficticios: A es el mejor.
--
-- Nota: la Edge Function usa la IA con cualquier número de candidatos; si
-- DeepSeek falla o tarda más de 8 s, la oferta igual llega por el respaldo.
--
-- Aplicar: supabase db query --linked -f supabase/pruebas/preparar_demo_fase5.sql
-- =============================================================================
begin;

-- Hoy (Bogotá) + p_dias, a la hora p_hora ('HH24:MI').
create or replace function pg_temp.bogota(p_dias integer, p_hora text)
returns timestamptz language sql as $$
  select ((now() at time zone 'America/Bogota')::date + p_dias + p_hora::time) at time zone 'America/Bogota';
$$;

-- Primer día hábil (lunes a viernes) desde hoy + p_dias, a la hora p_hora.
create or replace function pg_temp.habil(p_dias integer, p_hora text)
returns timestamptz language sql as $$
  select pg_temp.bogota(d, p_hora)
  from generate_series(p_dias, p_dias + 7) d
  where extract(isodow from (now() at time zone 'America/Bogota')::date + d) < 6
  order by d limit 1;
$$;

-- Primer horario libre de la profesional demo desde p_desde, cada 30 min (3 horas).
create or replace function pg_temp.libre(p_desde timestamptz)
returns timestamptz language sql as $$
  select h from generate_series(p_desde, p_desde + interval '3 hours', interval '30 minutes') h
  where not exists (
    select 1 from public.citas c
    where c.profesional_id = 'de300000-0000-4000-8000-000000000102' and c.fecha_hora = h and c.estado = 'confirmada'
  )
  order by h limit 1;
$$;

create temp table demo_ab on commit drop as
  select id from public.pacientes
  where email in ('turnosmart.e2e.a@example.com', 'turnosmart.e2e.b@example.com');

-- Candidatos ficticios de la demo (datos_demo_fase4.sql).
create temp table demo_ficticios on commit drop as
  select * from (values
    ('de300000-0000-4000-8000-000000000015'::uuid, 10, 'Tarde'),
    ('de300000-0000-4000-8000-000000000016'::uuid, 4, 'Indistinto')
  ) as x(id, dias, franja);

-- -----------------------------------------------------------------------------
-- 1. Limpieza de A y B (solo cuentas de prueba)
-- -----------------------------------------------------------------------------
delete from public.notificaciones where paciente_id in (select id from demo_ab);

-- Cupos liberados por citas de A o B, salvo que tengan ofertas a pacientes
-- reales (sus ofertas, factores, eventos y avisos se borran en cascada).
create temp table demo_cupos on commit drop as
  select cu.id from public.cupos cu join public.citas ci on ci.id = cu.cita_origen_id
  where ci.paciente_id in (select id from demo_ab)
    and not exists (
      select 1 from public.ofertas o join public.pacientes p on p.id = o.paciente_id
      where o.cupo_id = cu.id
        and p.id not in (select id from demo_ab)
        and p.email not like '%@turnosmart.test'
    );

-- Las citas recuperadas apuntan a su oferta: se suelta esa referencia antes
-- de borrar las ofertas (las citas de A y B se borran justo después).
update public.citas set oferta_id = null
 where oferta_id in (
   select id from public.ofertas
   where paciente_id in (select id from demo_ab) or cupo_id in (select id from demo_cupos)
 );

delete from public.cupos where id in (select id from demo_cupos);

-- Citas de A y B (su riesgo de inasistencia se borra en cascada).
delete from public.citas c
 where c.paciente_id in (select id from demo_ab)
   and not exists (select 1 from public.cupos cu where cu.cita_origen_id = c.id);

delete from public.ofertas where paciente_id in (select id from demo_ab);

-- -----------------------------------------------------------------------------
-- 2. Lista de espera de Cardiología: B, A y dos candidatos ficticios
-- -----------------------------------------------------------------------------
-- Se borra y se vuelve a crear (sin historial y sin duplicar) solo para A, B y
-- los pacientes ficticios; las solicitudes de pacientes reales no se tocan.
delete from public.solicitudes_espera s
 where s.especialidad_id = (select id from public.especialidades where nombre = 'Cardiología')
   and (s.paciente_id in (select id from demo_ab)
        or s.paciente_id in (select id from public.pacientes where email like '%@turnosmart.test'));

insert into public.solicitudes_espera (paciente_id, especialidad_id, creada_en)
select x.id, e.id, now() - make_interval(days => x.dias)
from (
  select p.id, 45 as dias from public.pacientes p where p.email = 'turnosmart.e2e.b@example.com'
  union all
  select p.id, 15 from public.pacientes p where p.email = 'turnosmart.e2e.a@example.com'
  union all
  select f.id, f.dias from demo_ficticios f join public.pacientes p on p.id = f.id
) as x
cross join public.especialidades e
where e.nombre = 'Cardiología';

-- B: franja Mañana (la de la cita de A) y alertas activas. A: alertas activas.
update public.pacientes set franja_preferida = 'Mañana', notificaciones_activas = true
 where email = 'turnosmart.e2e.b@example.com';
update public.pacientes set notificaciones_activas = true
 where email = 'turnosmart.e2e.a@example.com';
-- Ficticios: franja fija y sin alertas, para que B quede claramente primero.
update public.pacientes p set franja_preferida = f.franja, notificaciones_activas = false
  from demo_ficticios f where p.id = f.id;

-- -----------------------------------------------------------------------------
-- 3. Cita confirmada de A: mañana (o el siguiente día hábil) a las 10:00
-- -----------------------------------------------------------------------------
insert into public.citas (paciente_id, especialidad_id, profesional_id, consultorio_id, fecha_hora, estado, origen, creada_en)
select p.id, pr.especialidad_id, pr.id, pr.consultorio_id, pg_temp.libre(pg_temp.habil(1, '10:00')),
       'confirmada', 'reserva-directa', now() - interval '10 days'
from public.pacientes p
join public.profesionales pr on pr.id = 'de300000-0000-4000-8000-000000000102'
where p.email = 'turnosmart.e2e.a@example.com';

-- -----------------------------------------------------------------------------
-- 4. Cita confirmada de Julián (demo) en 3 días hábiles a las 10:00 (extra)
-- -----------------------------------------------------------------------------
insert into public.citas (paciente_id, especialidad_id, profesional_id, consultorio_id, fecha_hora, estado, origen, creada_en)
select 'de300000-0000-4000-8000-000000000013', pr.especialidad_id, pr.id, pr.consultorio_id,
       pg_temp.libre(pg_temp.habil(3, '10:00')), 'confirmada', 'reserva-directa', now() - interval '25 days'
from public.profesionales pr
where pr.id = 'de300000-0000-4000-8000-000000000102'
  and not exists (
    select 1 from public.citas c
    where c.paciente_id = 'de300000-0000-4000-8000-000000000013' and c.estado = 'confirmada'
      and c.fecha_hora > now() + interval '2 hours'
  );

commit;

-- -----------------------------------------------------------------------------
-- Resumen (sin datos personales: alias, estados y horarios)
-- -----------------------------------------------------------------------------
with cardio as (select id from public.especialidades where nombre = 'Cardiología'),
cola as (
  select case p.email
           when 'turnosmart.e2e.a@example.com' then 'A'
           when 'turnosmart.e2e.b@example.com' then 'B'
           else case when p.email like '%@turnosmart.test' then split_part(p.email, '@', 1) else 'REAL' end
         end as alias,
         row_number() over (order by s.creada_en, s.id) as puesto,
         extract(day from now() - s.creada_en)::int as dias, p.franja_preferida, p.notificaciones_activas
  from public.solicitudes_espera s join public.pacientes p on p.id = s.paciente_id
  where s.especialidad_id = (select id from cardio) and s.estado = 'activa'
)
select
  (select to_char(min(c.fecha_hora) at time zone 'America/Bogota', 'YYYY-MM-DD HH24:MI') from public.citas c
    join public.pacientes p on p.id = c.paciente_id
    where p.email = 'turnosmart.e2e.a@example.com' and c.estado = 'confirmada' and c.fecha_hora > now()) as cita_paciente_a_bogota,
  (select count(*) from public.citas c join public.pacientes p on p.id = c.paciente_id
    where p.email = 'turnosmart.e2e.a@example.com') as citas_paciente_a,
  (select string_agg(format('%s:%s %sd %s%s', puesto, alias, dias, franja_preferida,
                            case when notificaciones_activas then ' alertas' else '' end), ' | ' order by puesto)
     from cola) as lista_espera_cardiologia,
  (select count(*) from cola where alias <> 'A') as candidatos_cupo_a,
  (select count(*) from cola where alias = 'REAL') as reales_en_cardiologia,
  (select (select count(*) from public.ofertas o where o.paciente_id = p.id)
        + (select count(*) from public.notificaciones n where n.paciente_id = p.id)
        + (select count(*) from public.citas c where c.paciente_id = p.id)
     from public.pacientes p where p.email = 'turnosmart.e2e.b@example.com') as historial_paciente_b,
  (select to_char(min(c.fecha_hora) at time zone 'America/Bogota', 'YYYY-MM-DD HH24:MI') from public.citas c
    where c.paciente_id = 'de300000-0000-4000-8000-000000000013' and c.estado = 'confirmada' and c.fecha_hora > now()) as cita_julian_bogota;
