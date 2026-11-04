-- =============================================================================
-- TurnoSmart · Riesgo de inasistencia automático y «Confirma tu asistencia»
-- (idempotente, aditiva)
--
-- 1. `citas.asistencia_confirmada_en`: el paciente confirma que irá a su cita
--    (RPC `confirmar_asistencia`, solo citas propias, confirmadas y futuras).
-- 2. Riesgo automático con pg_cron (job `turnosmart-riesgo-inasistencia`, cada
--    30 minutos): `solicitar_riesgo_programado()` llama con pg_net a la Edge
--    Function `predecir-inasistencia` para las citas de los próximos 3 días
--    sin riesgo calculado en las últimas 6 horas (si no hay ninguna, no llama).
--    La llamada lleva el mismo secreto compartido de `priorizar-cupo` (Vault:
--    `priorizar_cupo_url` y `priorizar_cupo_secreto`); la URL de la función se
--    deriva de `priorizar_cupo_url`. No crea ni cambia secretos.
--    `datos_riesgo_programado` (solo service_role) da las señales, sin datos
--    clínicos ni identificadores, igual que `staff_datos_riesgo`.
-- 3. Aviso al paciente: cuando una cita de los próximos 3 días queda con
--    riesgo «alto» y el paciente no confirmó, se crea UNA notificación
--    `recordatorio` con `datos.accion = 'confirmar-asistencia'` (la app la
--    muestra como «Confirma tu asistencia»). El paciente nunca ve el nivel de
--    riesgo ni la explicación: solo la invitación a confirmar o cancelar.
-- 4. `staff_agenda` devuelve además `asistencia_confirmada_en` (se recrea:
--    cambia la forma del resultado; mismos permisos y mismos filtros).
--
-- No borra datos, no hace DROP de tablas ni modifica migraciones anteriores.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Confirmación de asistencia
-- ---------------------------------------------------------------------------
alter table public.citas add column if not exists asistencia_confirmada_en timestamptz;

-- El paciente confirma una cita propia, confirmada y futura (idempotente).
-- También marca como leídos sus avisos de «Confirma tu asistencia» de esa cita.
create or replace function public.confirmar_asistencia(p_cita_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._paciente_actual();
  v_confirmada timestamptz;
begin
  update public.citas
     set asistencia_confirmada_en = coalesce(asistencia_confirmada_en, now())
   where id = p_cita_id and paciente_id = v_uid and estado = 'confirmada' and fecha_hora > now()
  returning asistencia_confirmada_en into v_confirmada;
  if v_confirmada is null then
    raise exception 'cita_no_confirmable' using errcode = '22023';
  end if;

  update public.notificaciones set leida = true, leida_en = now()
   where paciente_id = v_uid and cita_id = p_cita_id and not leida
     and datos ->> 'accion' = 'confirmar-asistencia';
  return v_confirmada;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Aviso «Confirma tu asistencia» ante riesgo alto
-- ---------------------------------------------------------------------------

-- Datos con que la app redacta el aviso de una cita (como `_datos_cupo`).
create or replace function public._datos_cita(p_cita_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'especialidad', e.nombre,
    'profesional', p.nombre,
    'consultorio', co.nombre,
    'fechaHoraISO', to_char(c.fecha_hora at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ))
  from public.citas c
  left join public.especialidades e on e.id = c.especialidad_id
  left join public.profesionales p on p.id = c.profesional_id
  left join public.consultorios co on co.id = c.consultorio_id
  where c.id = p_cita_id;
$$;

create or replace function public._avisar_riesgo_alto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cita public.citas;
begin
  if new.nivel <> 'alto' then
    return new;
  end if;
  select * into v_cita from public.citas where id = new.cita_id;
  if not found
     or v_cita.estado <> 'confirmada'
     or v_cita.asistencia_confirmada_en is not null
     or v_cita.fecha_hora <= now()
     or v_cita.fecha_hora > now() + interval '3 days' then
    return new;
  end if;
  -- Un solo aviso por cita, aunque el riesgo se recalcule.
  if exists (
    select 1 from public.notificaciones n
    where n.cita_id = new.cita_id and n.datos ->> 'accion' = 'confirmar-asistencia'
  ) then
    return new;
  end if;
  perform public._notificar(
    v_cita.paciente_id,
    'recordatorio',
    coalesce(public._datos_cita(v_cita.id), '{}'::jsonb) || jsonb_build_object('accion', 'confirmar-asistencia'),
    v_cita.id
  );
  return new;
end;
$$;

drop trigger if exists riesgo_avisar_paciente on public.riesgo_inasistencia;
create trigger riesgo_avisar_paciente
  after insert or update of nivel, calculado_en on public.riesgo_inasistencia
  for each row execute function public._avisar_riesgo_alto();

-- ---------------------------------------------------------------------------
-- 2. Riesgo automático (pg_cron → pg_net → predecir-inasistencia)
-- ---------------------------------------------------------------------------

-- Señales de las citas confirmadas de los próximos p_dias días (todos los
-- consultorios) cuyo riesgo falta o tiene más de p_horas horas. Mismos
-- conteos que `staff_datos_riesgo`. Solo service_role (la Edge Function).
create or replace function public.datos_riesgo_programado(p_dias integer default 3, p_horas integer default 6)
returns table (
  cita_id uuid,
  consultorio_id uuid,
  fecha_hora timestamptz,
  creada_en timestamptz,
  asistidas integer,
  inasistencias integer,
  canceladas integer,
  ofertas_aceptadas integer,
  ofertas_rechazadas integer,
  ofertas_expiradas integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.consultorio_id, c.fecha_hora, c.creada_en,
         (select count(*)::integer from public.citas h
           where h.paciente_id = c.paciente_id and h.id <> c.id
             and (h.estado = 'asistida' or (h.estado = 'confirmada' and h.fecha_hora < now() - interval '1 day'))),
         (select count(*)::integer from public.citas h
           where h.paciente_id = c.paciente_id and h.id <> c.id and h.estado = 'no-show'),
         (select count(*)::integer from public.citas h
           where h.paciente_id = c.paciente_id and h.id <> c.id and h.estado = 'cancelada'),
         (select count(*)::integer from public.ofertas o where o.paciente_id = c.paciente_id and o.estado = 'aceptada'),
         (select count(*)::integer from public.ofertas o where o.paciente_id = c.paciente_id and o.estado = 'rechazada'),
         (select count(*)::integer from public.ofertas o where o.paciente_id = c.paciente_id and o.estado = 'expirada')
  from public.citas c
  left join public.riesgo_inasistencia r on r.cita_id = c.id
  where c.estado = 'confirmada'
    and c.fecha_hora > now()
    and c.fecha_hora <= now() + make_interval(days => least(14, greatest(1, coalesce(p_dias, 3))))
    and (r.cita_id is null or r.calculado_en < now() - make_interval(hours => least(48, greatest(1, coalesce(p_horas, 6)))))
  order by c.fecha_hora
  limit 100;
$$;

-- Pide a predecir-inasistencia el riesgo de las citas pendientes (asíncrono).
-- Sin citas pendientes o sin Vault configurado, no llama. Solo servidor.
create or replace function public.solicitar_riesgo_programado()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secreto text;
begin
  if not exists (select 1 from public.datos_riesgo_programado(3, 6)) then
    return null;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'priorizar_cupo_url';
  select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'priorizar_cupo_secreto';
  if v_url is null or v_secreto is null or v_url !~ '/priorizar-cupo/?$' then
    raise warning 'predecir-inasistencia sin configurar en Vault: el riesgo se calcula solo desde el panel';
    return null;
  end if;
  return net.http_post(
    url := regexp_replace(v_url, '/priorizar-cupo/?$', '/predecir-inasistencia'),
    body := jsonb_build_object('programado', true, 'dias', 3),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-servidor-secreto', v_secreto),
    timeout_milliseconds := 30000
  );
end;
$$;

select cron.schedule('turnosmart-riesgo-inasistencia', '*/30 * * * *', 'select public.solicitar_riesgo_programado()');

-- ---------------------------------------------------------------------------
-- 4. Agenda del staff con la confirmación del paciente
-- ---------------------------------------------------------------------------
drop function if exists public.staff_agenda(integer);
create function public.staff_agenda(p_dias integer default 14)
returns table (
  cita_id uuid,
  fecha_hora timestamptz,
  especialidad text,
  profesional text,
  consultorio text,
  origen text,
  paciente_iniciales text,
  paciente_codigo text,
  riesgo_nivel text,
  riesgo_puntaje numeric,
  riesgo_estrategia text,
  riesgo_explicacion_es text,
  riesgo_explicacion_en text,
  riesgo_calculado_en timestamptz,
  asistencia_confirmada_en timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.fecha_hora, e.nombre, p.nombre, co.nombre, c.origen,
         public._iniciales_paciente(c.paciente_id), public._codigo_paciente(c.paciente_id),
         r.nivel, r.puntaje, r.estrategia, r.explicacion_es, r.explicacion_en, r.calculado_en,
         c.asistencia_confirmada_en
  from public.citas c
  left join public.especialidades e on e.id = c.especialidad_id
  left join public.profesionales p on p.id = c.profesional_id
  left join public.consultorios co on co.id = c.consultorio_id
  left join public.riesgo_inasistencia r on r.cita_id = c.id
  where c.consultorio_id in (select public._consultorios_staff())
    and c.estado = 'confirmada'
    and c.fecha_hora >= now() - interval '1 day'
    and c.fecha_hora <= now() + make_interval(days => least(60, greatest(1, coalesce(p_dias, 14))))
  order by c.fecha_hora
  limit 200;
$$;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
revoke all on function public.confirmar_asistencia(uuid) from public, anon;
grant execute on function public.confirmar_asistencia(uuid) to authenticated;

revoke all on function public._datos_cita(uuid) from public, anon, authenticated;
revoke all on function public._avisar_riesgo_alto() from public, anon, authenticated;

revoke all on function public.datos_riesgo_programado(integer, integer) from public, anon, authenticated;
grant execute on function public.datos_riesgo_programado(integer, integer) to service_role;
revoke all on function public.solicitar_riesgo_programado() from public, anon, authenticated;
grant execute on function public.solicitar_riesgo_programado() to service_role;

revoke all on function public.staff_agenda(integer) from public, anon;
grant execute on function public.staff_agenda(integer) to authenticated;
