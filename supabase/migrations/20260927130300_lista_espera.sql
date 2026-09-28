-- =============================================================================
-- TurnoSmart · Lista de espera (RPC)
--
-- La tabla no tiene INSERT/UPDATE/DELETE para el cliente: el paciente solo
-- gestiona SU lista mediante estas funciones `security definer`, que usan
-- siempre auth.uid() (nunca un paciente_id recibido) y search_path vacío.
-- Retirar no borra: estado = 'retirada', finalizada_en = now(). Volver a
-- entrar crea una solicitud nueva (el historial se conserva).
-- =============================================================================

-- Paciente autenticado; error si no hay sesión o no tiene fila en pacientes.
create or replace function public._paciente_actual()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'no_autenticado' using errcode = '42501';
  end if;
  if not exists (select 1 from public.pacientes where id = v_uid) then
    raise exception 'paciente_inexistente' using errcode = 'P0002';
  end if;
  return v_uid;
end;
$$;

-- Deja activas exactamente las especialidades indicadas (atómico).
create or replace function public.sincronizar_lista_espera(p_especialidades smallint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._paciente_actual();
  v_ids smallint[] := coalesce(p_especialidades, '{}');
begin
  update public.solicitudes_espera
     set estado = 'retirada', finalizada_en = now()
   where paciente_id = v_uid
     and estado = 'activa'
     and not (especialidad_id = any (v_ids));

  insert into public.solicitudes_espera (paciente_id, especialidad_id)
  select v_uid, e.id
  from public.especialidades e
  where e.id = any (v_ids)
  on conflict do nothing; -- uq_solicitud_espera_activa: sin duplicados
end;
$$;

create or replace function public.unirse_lista_espera(p_especialidad_id smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._paciente_actual();
begin
  if not exists (select 1 from public.especialidades where id = p_especialidad_id) then
    raise exception 'especialidad_inexistente' using errcode = 'P0002';
  end if;
  insert into public.solicitudes_espera (paciente_id, especialidad_id)
  values (v_uid, p_especialidad_id)
  on conflict do nothing;
end;
$$;

create or replace function public.retirar_lista_espera(p_especialidad_id smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._paciente_actual();
begin
  update public.solicitudes_espera
     set estado = 'retirada', finalizada_en = now()
   where paciente_id = v_uid and especialidad_id = p_especialidad_id and estado = 'activa';
end;
$$;

-- Puesto del paciente autenticado en una especialidad (1 = primero), o NULL
-- si no está en esa lista. Solo cuenta; nunca devuelve datos de otros.
create or replace function public.mi_puesto_espera(p_especialidad_id smallint)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (
    select count(*)
    from public.solicitudes_espera o
    where o.especialidad_id = s.especialidad_id
      and o.estado = 'activa'
      and (o.creada_en < s.creada_en or (o.creada_en = s.creada_en and o.id < s.id))
  )::integer + 1
  from public.solicitudes_espera s
  where s.paciente_id = auth.uid() and s.especialidad_id = p_especialidad_id and s.estado = 'activa';
$$;

-- Puesto en cada una de las listas activas del paciente autenticado.
create or replace function public.mis_puestos_espera()
returns table (especialidad_id smallint, puesto integer, creada_en timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.especialidad_id,
    (
      select count(*)
      from public.solicitudes_espera o
      where o.especialidad_id = s.especialidad_id
        and o.estado = 'activa'
        and (o.creada_en < s.creada_en or (o.creada_en = s.creada_en and o.id < s.id))
    )::integer + 1,
    s.creada_en
  from public.solicitudes_espera s
  where s.paciente_id = auth.uid() and s.estado = 'activa';
$$;

revoke all on function public._paciente_actual() from public, anon, authenticated;
revoke all on function public.sincronizar_lista_espera(smallint[]) from public, anon;
revoke all on function public.unirse_lista_espera(smallint) from public, anon;
revoke all on function public.retirar_lista_espera(smallint) from public, anon;
revoke all on function public.mi_puesto_espera(smallint) from public, anon;
revoke all on function public.mis_puestos_espera() from public, anon;
grant execute on function public.sincronizar_lista_espera(smallint[]) to authenticated;
grant execute on function public.unirse_lista_espera(smallint) to authenticated;
grant execute on function public.retirar_lista_espera(smallint) to authenticated;
grant execute on function public.mi_puesto_espera(smallint) to authenticated;
grant execute on function public.mis_puestos_espera() to authenticated;
