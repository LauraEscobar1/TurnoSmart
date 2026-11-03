-- =============================================================================
-- TurnoSmart · Datos DEMO de la fase 4 (panel del staff + riesgo de inasistencia)
--
-- TODO es ficticio y queda marcado como demo:
--   · usuarios con correo @turnosmart.test y `raw_app_meta_data.demo = true`;
--   · ids fijos con el prefijo de300000-0000-4000-8000-…;
--   · «Consultorio Demo TurnoSmart (ficticio)» y «Dra. Demo Ficticia».
-- Especialidad: Cardiología (sin lista de espera activa al crear la demo, así
-- una cancelación demo no genera ofertas para pacientes reales).
--
-- Los usuarios demo no pueden iniciar sesión: su contraseña es aleatoria y
-- nadie la conoce. Para usar el staff demo, definir la contraseña en el SQL
-- Editor (no la guardes en el repositorio):
--   update auth.users set encrypted_password = extensions.crypt('<contraseña>', extensions.gen_salt('bf'))
--   where email = 'staff.demo@turnosmart.test';
--
-- Idempotente (on conflict do nothing). Las fechas son relativas a now().
-- Aplicar: supabase db query --linked -f supabase/pruebas/datos_demo_fase4.sql
-- =============================================================================
begin;

-- Fecha en hora de Colombia: hoy + p_dias, a la hora p_hora ('HH24:MI').
create or replace function pg_temp.bogota(p_dias integer, p_hora text)
returns timestamptz language sql as $$
  select ((now() at time zone 'America/Bogota')::date + p_dias + p_hora::time) at time zone 'America/Bogota';
$$;

-- Próximo día de la semana p_dow (0 = domingo) a partir de mañana, + p_semanas, a la hora p_hora.
create or replace function pg_temp.proximo(p_dow integer, p_semanas integer, p_hora text)
returns timestamptz language sql as $$
  select pg_temp.bogota(
    1 + ((p_dow - extract(dow from (now() at time zone 'America/Bogota')::date + 1)::integer + 7) % 7) + 7 * p_semanas,
    p_hora);
$$;

create or replace function pg_temp.demo(p_n integer)
returns uuid language sql immutable as $$
  select ('de300000-0000-4000-8000-' || lpad(p_n::text, 12, '0'))::uuid;
$$;

-- ---------------------------------------------------------------------------
-- Consultorio, profesional
-- ---------------------------------------------------------------------------
insert into public.consultorios (id, nombre, direccion, ciudad)
values (pg_temp.demo(101), 'Consultorio Demo TurnoSmart (ficticio)', 'Dirección ficticia', 'Bogotá')
on conflict do nothing;

insert into public.profesionales (id, nombre, especialidad_id, consultorio_id, activo)
select pg_temp.demo(102), 'Dra. Demo Ficticia', e.id, pg_temp.demo(101), true
from public.especialidades e where e.nombre = 'Cardiología'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Usuarios demo (staff + 6 pacientes). El trigger crea los pacientes desde
-- raw_user_meta_data y omite al staff (raw_app_meta_data.rol = 'staff').
-- ---------------------------------------------------------------------------
with nuevos (n, email, app_meta, user_meta) as (
  values
    (1,  'staff.demo@turnosmart.test',      '{"provider":"email","providers":["email"],"rol":"staff","demo":true}',
         '{"nombre":"Staff","apellido":"Demo","demo":true}'),
    (11, 'demo.paciente1@turnosmart.test', '{"provider":"email","providers":["email"],"demo":true}',
         '{"nombre":"Andrés","apellido":"Rojas","cedula":"9990000011","telefono":"3000000011","franjaPreferida":"Mañana","demo":true}'),
    (12, 'demo.paciente2@turnosmart.test', '{"provider":"email","providers":["email"],"demo":true}',
         '{"nombre":"Camila","apellido":"Torres","cedula":"9990000012","telefono":"3000000012","franjaPreferida":"Tarde","demo":true}'),
    (13, 'demo.paciente3@turnosmart.test', '{"provider":"email","providers":["email"],"demo":true}',
         '{"nombre":"Julián","apellido":"Pérez","cedula":"9990000013","telefono":"3000000013","franjaPreferida":"Indistinto","demo":true}'),
    (14, 'demo.paciente4@turnosmart.test', '{"provider":"email","providers":["email"],"demo":true}',
         '{"nombre":"Valentina","apellido":"Ríos","cedula":"9990000014","telefono":"3000000014","franjaPreferida":"Mañana","demo":true}'),
    (15, 'demo.paciente5@turnosmart.test', '{"provider":"email","providers":["email"],"demo":true}',
         '{"nombre":"Santiago","apellido":"Mejía","cedula":"9990000015","telefono":"3000000015","franjaPreferida":"Tarde","demo":true}'),
    (16, 'demo.paciente6@turnosmart.test', '{"provider":"email","providers":["email"],"demo":true}',
         '{"nombre":"Daniela","apellido":"Castro","cedula":"9990000016","telefono":"3000000016","franjaPreferida":"Indistinto","demo":true}')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
)
select '00000000-0000-0000-0000-000000000000', pg_temp.demo(n), 'authenticated', 'authenticated', email,
       extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
       '', '', '', '', app_meta::jsonb, user_meta::jsonb, false, now(), now()
from nuevos
where not exists (select 1 from auth.users u where u.email = nuevos.email)
on conflict (id) do nothing;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
select gen_random_uuid(), u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now()
from auth.users u
where u.id in (pg_temp.demo(1), pg_temp.demo(11), pg_temp.demo(12), pg_temp.demo(13), pg_temp.demo(14), pg_temp.demo(15), pg_temp.demo(16))
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

insert into public.staff (id, usuario_id, consultorio_id, nombre)
values (pg_temp.demo(103), pg_temp.demo(1), pg_temp.demo(101), 'Staff Demo')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Citas: historial (pasadas) y agenda (futuras)
-- ---------------------------------------------------------------------------
insert into public.citas (id, paciente_id, especialidad_id, profesional_id, consultorio_id, fecha_hora, estado, origen, creada_en, cancelada_en)
select pg_temp.demo(c.n), pg_temp.demo(c.p), pr.especialidad_id, pr.id, pr.consultorio_id, c.fecha, c.estado, 'reserva-directa',
       least(now(), c.fecha - make_interval(days => c.antelacion)), c.cancelada
from public.profesionales pr,
(values
  -- Andrés (P1): cumplido
  (201, 11, pg_temp.bogota(-120, '09:00'), 'asistida', 10, null::timestamptz),
  (202, 11, pg_temp.bogota(-90,  '09:00'), 'asistida', 10, null),
  (203, 11, pg_temp.bogota(-60,  '09:00'), 'asistida', 10, null),
  (204, 11, pg_temp.bogota(-30,  '09:00'), 'asistida', 10, null),
  (205, 11, pg_temp.bogota(-6,   '15:00'), 'cancelada', 12, pg_temp.bogota(-8, '10:00')),
  -- Camila (P2): varias inasistencias
  (211, 12, pg_temp.bogota(-100, '07:00'), 'asistida', 20, null),
  (212, 12, pg_temp.bogota(-80,  '07:00'), 'no-show', 30, null),
  (213, 12, pg_temp.bogota(-70,  '16:30'), 'asistida', 20, null),
  (214, 12, pg_temp.bogota(-50,  '07:00'), 'no-show', 35, null),
  (215, 12, pg_temp.bogota(-25,  '17:00'), 'no-show', 30, null),
  -- Valentina (P4): una inasistencia y una cancelación
  (241, 14, pg_temp.bogota(-110, '11:00'), 'asistida', 15, null),
  (242, 14, pg_temp.bogota(-75,  '11:00'), 'asistida', 15, null),
  (243, 14, pg_temp.bogota(-55,  '11:00'), 'no-show', 15, null),
  (244, 14, pg_temp.bogota(-40,  '11:00'), 'asistida', 15, null),
  (245, 14, pg_temp.bogota(-20,  '10:00'), 'cancelada', 15, pg_temp.bogota(-22, '08:00')),
  -- Santiago (P5): cumplido, una cancelación
  (251, 15, pg_temp.bogota(-95,  '14:00'), 'asistida', 7, null),
  (252, 15, pg_temp.bogota(-65,  '14:00'), 'asistida', 7, null),
  (253, 15, pg_temp.bogota(-35,  '14:00'), 'asistida', 7, null),
  (254, 15, pg_temp.bogota(-10,  '14:00'), 'cancelada', 7, pg_temp.bogota(-12, '09:00')),
  -- Daniela (P6): inasistencias
  (261, 16, pg_temp.bogota(-90,  '09:00'), 'no-show', 20, null),
  (262, 16, pg_temp.bogota(-60,  '09:00'), 'asistida', 20, null),
  (263, 16, pg_temp.bogota(-45,  '16:00'), 'no-show', 25, null),
  (264, 16, pg_temp.bogota(3,    '10:00'), 'cancelada', 9, now() - interval '1 hour'),
  -- Agenda (confirmadas)
  (301, 11, pg_temp.proximo(3, 0, '10:00'), 'confirmada', 3,  null),  -- miércoles 10:00
  (302, 12, pg_temp.proximo(1, 0, '07:00'), 'confirmada', 40, null),  -- lunes 7:00
  (303, 13, pg_temp.proximo(5, 0, '16:30'), 'confirmada', 20, null),  -- viernes 16:30
  (304, 16, pg_temp.proximo(6, 0, '09:00'), 'confirmada', 10, null),  -- sábado 9:00
  (305, 14, pg_temp.proximo(2, 0, '11:00'), 'confirmada', 15, null),  -- martes 11:00
  (306, 15, pg_temp.proximo(4, 0, '14:00'), 'confirmada', 2,  null),  -- jueves 14:00
  (307, 12, pg_temp.proximo(4, 1, '16:00'), 'confirmada', 5,  null),  -- jueves 16:00 (+1 semana)
  (308, 13, pg_temp.proximo(3, 1, '08:30'), 'confirmada', 30, null),  -- miércoles 8:30 (+1 semana)
  -- Hoy, ya pasó la hora y no se registró asistencia (para «Marcar inasistencia»)
  (309, 14, now() - interval '2 hours', 'confirmada', 12, null)
) as c(n, p, fecha, estado, antelacion, cancelada)
where pr.id = pg_temp.demo(102)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Cupos liberados por las cancelaciones y sus ofertas (insertados ya en su
-- estado final: el trigger de priorización solo actúa con estado «abierto»).
-- ---------------------------------------------------------------------------
insert into public.cupos (id, cita_origen_id, especialidad_id, profesional_id, consultorio_id, fecha_hora, motivo, estado, creado_en)
select pg_temp.demo(k.n), ci.id, ci.especialidad_id, ci.profesional_id, ci.consultorio_id, ci.fecha_hora, 'cancelacion', k.estado, ci.cancelada_en
from (values (401, 245, 'tomado'), (402, 254, 'expirado'), (403, 205, 'tomado'), (404, 264, 'ofrecido')) as k(n, cita, estado)
join public.citas ci on ci.id = pg_temp.demo(k.cita)
on conflict do nothing;

insert into public.ofertas (id, cupo_id, paciente_id, estado, score, enviada_en, creada_en, expira_en, respondida_en)
select pg_temp.demo(o.n), cu.id, pg_temp.demo(o.p), o.estado, 0.5,
       cu.creado_en + make_interval(mins => o.min), cu.creado_en + make_interval(mins => o.min),
       case when o.estado = 'pendiente' then now() + interval '10 minutes' else cu.creado_en + make_interval(mins => o.min + 10) end,
       case when o.estado in ('aceptada', 'rechazada') then cu.creado_en + make_interval(mins => o.min + 3)
            when o.estado = 'expirada' then cu.creado_en + make_interval(mins => o.min + 10) end
from (values
  (501, 401, 12, 'expirada', 0), (502, 401, 11, 'aceptada', 11),
  (511, 402, 16, 'expirada', 0), (512, 402, 14, 'rechazada', 11), (513, 402, 12, 'expirada', 22),
  (521, 403, 16, 'rechazada', 0), (522, 403, 15, 'aceptada', 11),
  (531, 404, 13, 'pendiente', 0)
) as o(n, cupo, p, estado, min)
join public.cupos cu on cu.id = pg_temp.demo(o.cupo)
on conflict do nothing;

-- Citas recuperadas (cupo tomado) y ya atendidas.
insert into public.citas (id, paciente_id, especialidad_id, profesional_id, consultorio_id, fecha_hora, estado, origen, oferta_id, creada_en)
select pg_temp.demo(r.n), o.paciente_id, cu.especialidad_id, cu.profesional_id, cu.consultorio_id, cu.fecha_hora,
       'asistida', 'cupo-recuperado', o.id, o.respondida_en
from (values (206, 502), (255, 522)) as r(n, oferta)
join public.ofertas o on o.id = pg_temp.demo(r.oferta)
join public.cupos cu on cu.id = o.cupo_id
on conflict do nothing;

commit;

-- Resumen
select
  (select count(*) from auth.users where email like '%@turnosmart.test') as usuarios_demo,
  (select count(*) from public.pacientes where email like '%@turnosmart.test') as pacientes_demo,
  (select count(*) from public.staff where consultorio_id = 'de300000-0000-4000-8000-000000000101') as staff_demo,
  (select count(*) from public.citas where consultorio_id = 'de300000-0000-4000-8000-000000000101') as citas_demo,
  (select count(*) from public.cupos where consultorio_id = 'de300000-0000-4000-8000-000000000101') as cupos_demo,
  (select count(*) from public.ofertas o join public.cupos c on c.id = o.cupo_id
    where c.consultorio_id = 'de300000-0000-4000-8000-000000000101') as ofertas_demo;
