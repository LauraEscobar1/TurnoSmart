-- =============================================================================
-- TurnoSmart · Citas, cupos, ofertas y notificaciones (RPC)
--
-- Todo lo que modifica datos pasa por funciones `security definer` que:
--   · usan siempre auth.uid() (el paciente no puede actuar sobre filas ajenas),
--   · hacen en UNA transacción los cambios de varias tablas,
--   · bloquean las filas involucradas (FOR UPDATE) para evitar carreras,
--   · son idempotentes donde tiene sentido (eventos únicos, un cupo por cita).
-- =============================================================================

-- Cambió el tipo de retorno respecto de versiones previas: se recrean.
drop function if exists public.expirar_mis_ofertas();
drop function if exists public.rechazar_oferta(uuid);

-- ---------------------------------------------------------------------------
-- Notificación (interna)
-- ---------------------------------------------------------------------------
create or replace function public._notificar(p_paciente uuid, p_tipo text, p_datos jsonb, p_referencia uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notificaciones (paciente_id, tipo, datos, referencia_id)
  values (p_paciente, p_tipo, coalesce(p_datos, '{}'::jsonb), p_referencia);
$$;

-- Datos que la app usa para redactar la notificación de un cupo.
create or replace function public._datos_cupo(p_cupo_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'especialidad', e.nombre,
    'profesional', p.nombre,
    'consultorio', c.nombre,
    'fechaHoraISO', to_char(cu.fecha_hora at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ))
  from public.cupos cu
  left join public.especialidades e on e.id = cu.especialidad_id
  left join public.profesionales p on p.id = cu.profesional_id
  left join public.consultorios c on c.id = cu.consultorio_id
  where cu.id = p_cupo_id;
$$;

-- ---------------------------------------------------------------------------
-- Citas
-- ---------------------------------------------------------------------------

-- Cancela una cita propia, confirmada y futura. Libera el cupo (uno solo por
-- cita) para ofrecerlo a la lista de espera. Devuelve el id del cupo.
create or replace function public.cancelar_cita(p_cita_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._paciente_actual();
  v_cita public.citas;
  v_cupo uuid;
begin
  select * into v_cita from public.citas where id = p_cita_id and paciente_id = v_uid for update;
  if not found then
    raise exception 'cita_no_encontrada' using errcode = 'P0002';
  end if;
  if v_cita.estado <> 'confirmada' or v_cita.fecha_hora <= now() then
    raise exception 'cita_no_cancelable' using errcode = '22023';
  end if;

  update public.citas set estado = 'cancelada', cancelada_en = now() where id = p_cita_id;

  insert into public.cupos (cita_origen_id, especialidad_id, profesional_id, consultorio_id, fecha_hora, motivo, estado)
  values (v_cita.id, v_cita.especialidad_id, v_cita.profesional_id, v_cita.consultorio_id, v_cita.fecha_hora, 'cancelacion', 'abierto')
  on conflict do nothing
  returning id into v_cupo;

  if v_cupo is null then
    select id into v_cupo from public.cupos where cita_origen_id = v_cita.id;
  end if;
  return v_cupo;
end;
$$;

-- Cambia la fecha de una cita propia, confirmada y futura, a otra futura.
create or replace function public.reprogramar_cita(p_cita_id uuid, p_fecha_hora timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._paciente_actual();
begin
  if p_fecha_hora <= now() then
    raise exception 'fecha_invalida' using errcode = '22023';
  end if;
  update public.citas
     set fecha_hora = p_fecha_hora
   where id = p_cita_id and paciente_id = v_uid and estado = 'confirmada' and fecha_hora > now();
  if not found then
    raise exception 'cita_no_reprogramable' using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ofertas
-- ---------------------------------------------------------------------------

-- Registra un evento de la oferta una sola vez.
create or replace function public._evento_oferta(p_oferta_id uuid, p_tipo text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ofertas_eventos (oferta_id, tipo) values (p_oferta_id, p_tipo)
  on conflict do nothing;
$$;

-- Expira una oferta pendiente (interna): el cupo vuelve a estar abierto para
-- el siguiente candidato y el paciente recibe la notificación.
create or replace function public._expirar_oferta(p_oferta_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_oferta public.ofertas;
begin
  update public.ofertas
     set estado = 'expirada', respondida_en = now()
   where id = p_oferta_id and estado = 'pendiente'
  returning * into v_oferta;
  if not found then
    return;
  end if;
  update public.cupos set estado = 'abierto' where id = v_oferta.cupo_id and estado = 'ofrecido';
  perform public._evento_oferta(p_oferta_id, 'expirada');
  update public.notificaciones set leida = true, leida_en = now()
   where referencia_id = p_oferta_id and tipo = 'cupo-ultimo-minuto' and not leida;
  perform public._notificar(v_oferta.paciente_id, 'expiracion', public._datos_cupo(v_oferta.cupo_id), p_oferta_id);
end;
$$;

-- Expira las ofertas vencidas del paciente autenticado (la app lo llama al
-- leerlas). Devuelve los cupos que volvieron a quedar abiertos, para que la
-- app pida ofrecerlos al siguiente candidato (Edge Function priorizar-cupo).
create or replace function public.expirar_mis_ofertas()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._paciente_actual();
  v_oferta record;
begin
  for v_oferta in
    select id, cupo_id from public.ofertas
    where paciente_id = v_uid and estado = 'pendiente' and expira_en <= now()
    for update
  loop
    perform public._expirar_oferta(v_oferta.id);
    return next v_oferta.cupo_id;
  end loop;
end;
$$;

-- Expira TODAS las ofertas vencidas (para un cron del servidor, no para la app).
create or replace function public.expirar_ofertas_vencidas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_total integer := 0;
begin
  for v_id in
    select id from public.ofertas where estado = 'pendiente' and expira_en <= now() for update
  loop
    perform public._expirar_oferta(v_id);
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$$;

-- El paciente abrió la oferta (evento «vista», una sola vez).
create or replace function public.marcar_oferta_vista(p_oferta_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._paciente_actual();
begin
  if exists (select 1 from public.ofertas where id = p_oferta_id and paciente_id = v_uid) then
    perform public._evento_oferta(p_oferta_id, 'vista');
  end if;
end;
$$;

-- Acepta una oferta propia y vigente. En una transacción: oferta aceptada,
-- cupo tomado, cita confirmada (origen cupo-recuperado), solicitud de espera
-- atendida, evento y notificación de confirmación. Devuelve el id de la cita;
-- NULL si la oferta ya había vencido (queda expirada).
create or replace function public.aceptar_oferta(p_oferta_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._paciente_actual();
  v_oferta public.ofertas;
  v_cupo public.cupos;
  v_cita uuid;
begin
  select * into v_oferta from public.ofertas where id = p_oferta_id and paciente_id = v_uid for update;
  if not found then
    raise exception 'oferta_no_encontrada' using errcode = 'P0002';
  end if;
  if v_oferta.estado = 'aceptada' then
    -- Idempotente: aceptar dos veces devuelve la misma cita.
    select id into v_cita from public.citas where oferta_id = p_oferta_id;
    return v_cita;
  end if;
  if v_oferta.estado <> 'pendiente' then
    raise exception 'oferta_no_disponible' using errcode = '22023';
  end if;
  if v_oferta.expira_en <= now() then
    perform public._expirar_oferta(p_oferta_id);
    return null;
  end if;

  select * into v_cupo from public.cupos where id = v_oferta.cupo_id for update;
  if v_cupo.estado <> 'ofrecido' then
    raise exception 'cupo_no_disponible' using errcode = '22023';
  end if;

  update public.ofertas set estado = 'aceptada', respondida_en = now() where id = p_oferta_id;
  update public.cupos set estado = 'tomado' where id = v_cupo.id;

  insert into public.citas (paciente_id, especialidad_id, profesional_id, consultorio_id, fecha_hora, estado, origen, oferta_id)
  values (v_uid, v_cupo.especialidad_id, v_cupo.profesional_id, v_cupo.consultorio_id, v_cupo.fecha_hora,
          'confirmada', 'cupo-recuperado', p_oferta_id)
  returning id into v_cita;

  update public.solicitudes_espera
     set estado = 'atendida', finalizada_en = now()
   where paciente_id = v_uid and especialidad_id = v_cupo.especialidad_id and estado = 'activa';

  perform public._evento_oferta(p_oferta_id, 'aceptada');
  update public.notificaciones set leida = true, leida_en = now()
   where referencia_id = p_oferta_id and tipo = 'cupo-ultimo-minuto' and not leida;
  -- Queda en la bandeja como registro, ya leída: el paciente acaba de confirmar en la app.
  insert into public.notificaciones (paciente_id, tipo, datos, referencia_id, leida, leida_en)
  values (v_uid, 'confirmacion', coalesce(public._datos_cupo(v_cupo.id), '{}'::jsonb), p_oferta_id, true, now());
  return v_cita;
end;
$$;

-- Rechaza una oferta propia pendiente; el cupo vuelve a estar abierto y se
-- devuelve su id (la app pide ofrecerlo al siguiente candidato).
create or replace function public.rechazar_oferta(p_oferta_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._paciente_actual();
  v_oferta public.ofertas;
begin
  select * into v_oferta from public.ofertas where id = p_oferta_id and paciente_id = v_uid for update;
  if not found then
    raise exception 'oferta_no_encontrada' using errcode = 'P0002';
  end if;
  if v_oferta.estado = 'rechazada' then
    return v_oferta.cupo_id;
  end if;
  if v_oferta.estado <> 'pendiente' then
    raise exception 'oferta_no_disponible' using errcode = '22023';
  end if;
  update public.ofertas set estado = 'rechazada', respondida_en = now() where id = p_oferta_id;
  update public.cupos set estado = 'abierto' where id = v_oferta.cupo_id and estado = 'ofrecido';
  perform public._evento_oferta(p_oferta_id, 'rechazada');
  update public.notificaciones set leida = true, leida_en = now()
   where referencia_id = p_oferta_id and tipo = 'cupo-ultimo-minuto' and not leida;
  return v_oferta.cupo_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notificaciones
-- ---------------------------------------------------------------------------
create or replace function public.marcar_notificacion_leida(p_notificacion_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._paciente_actual();
begin
  update public.notificaciones set leida = true, leida_en = now()
   where id = p_notificacion_id and paciente_id = v_uid and not leida;
end;
$$;

create or replace function public.marcar_todas_notificaciones_leidas()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._paciente_actual();
begin
  update public.notificaciones set leida = true, leida_en = now() where paciente_id = v_uid and not leida;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: las internas (_*) y el cron, sin acceso desde la app.
-- ---------------------------------------------------------------------------
revoke all on function public._notificar(uuid, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public._datos_cupo(uuid) from public, anon, authenticated;
revoke all on function public._evento_oferta(uuid, text) from public, anon, authenticated;
revoke all on function public._expirar_oferta(uuid) from public, anon, authenticated;
revoke all on function public.expirar_ofertas_vencidas() from public, anon, authenticated;
grant execute on function public.expirar_ofertas_vencidas() to service_role;

revoke all on function public.cancelar_cita(uuid) from public, anon;
revoke all on function public.reprogramar_cita(uuid, timestamptz) from public, anon;
revoke all on function public.expirar_mis_ofertas() from public, anon;
revoke all on function public.marcar_oferta_vista(uuid) from public, anon;
revoke all on function public.aceptar_oferta(uuid) from public, anon;
revoke all on function public.rechazar_oferta(uuid) from public, anon;
revoke all on function public.marcar_notificacion_leida(uuid) from public, anon;
revoke all on function public.marcar_todas_notificaciones_leidas() from public, anon;
grant execute on function public.cancelar_cita(uuid) to authenticated;
grant execute on function public.reprogramar_cita(uuid, timestamptz) to authenticated;
grant execute on function public.expirar_mis_ofertas() to authenticated;
grant execute on function public.marcar_oferta_vista(uuid) to authenticated;
grant execute on function public.aceptar_oferta(uuid) to authenticated;
grant execute on function public.rechazar_oferta(uuid) to authenticated;
grant execute on function public.marcar_notificacion_leida(uuid) to authenticated;
grant execute on function public.marcar_todas_notificaciones_leidas() to authenticated;
