-- =============================================================================
-- TurnoSmart · Priorización de candidatos para un cupo (IA)
--
-- Flujo: un cupo queda «abierto» (cancelación, rechazo o vencimiento de una
-- oferta) → la Edge Function `priorizar-cupo` (con service_role, fuera de la
-- app) pide los candidatos con `candidatos_cupo`, los prioriza (IA o
-- estrategia determinista de respaldo) y crea la oferta con `ofrecer_cupo`.
--
-- Ambas funciones son SOLO para service_role: la app nunca ve candidatos ni
-- datos de otros pacientes, ni decide a quién se ofrece un cupo.
-- =============================================================================

-- Candidatos: pacientes con solicitud activa en la especialidad del cupo,
-- sin la persona que liberó el cupo y sin quienes ya recibieron ese cupo.
-- Devuelve señales reales para explicar la priorización.
create or replace function public.candidatos_cupo(p_cupo_id uuid)
returns table (
  paciente_id uuid,
  especialidad text,
  solicitud_creada_en timestamptz,
  dias_espera integer,
  puesto integer,
  franja_preferida text,
  notificaciones_activas boolean,
  distancia_max_km numeric,
  cupo_fecha_hora timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with cupo as (
    select cu.*, ci.paciente_id as paciente_origen
    from public.cupos cu
    left join public.citas ci on ci.id = cu.cita_origen_id
    where cu.id = p_cupo_id
  ),
  cola as (
    select s.*, row_number() over (order by s.creada_en, s.id)::integer as puesto
    from public.solicitudes_espera s, cupo
    where s.especialidad_id = cupo.especialidad_id and s.estado = 'activa'
  )
  select
    cola.paciente_id,
    e.nombre,
    cola.creada_en,
    greatest(0, extract(day from now() - cola.creada_en))::integer,
    cola.puesto,
    p.franja_preferida,
    p.notificaciones_activas,
    p.distancia_max_km,
    cupo.fecha_hora
  from cola
  join cupo on true
  join public.pacientes p on p.id = cola.paciente_id
  join public.especialidades e on e.id = cupo.especialidad_id
  where cola.paciente_id is distinct from cupo.paciente_origen
    and not exists (select 1 from public.ofertas o where o.cupo_id = p_cupo_id and o.paciente_id = cola.paciente_id)
  order by cola.puesto;
$$;

-- Crea la oferta para el candidato elegido, en una transacción: oferta
-- pendiente (vence en p_minutos), factores de la explicación (máx. 4, en
-- orden), evento «enviada», notificación «cupo-ultimo-minuto» y cupo
-- «ofrecido». p_factores: [{clave, etiqueta, valor, valor_numerico, peso}].
create or replace function public.ofrecer_cupo(
  p_cupo_id uuid,
  p_paciente_id uuid,
  p_score numeric,
  p_factores jsonb,
  p_minutos integer default 10
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo public.cupos;
  v_oferta uuid;
begin
  select * into v_cupo from public.cupos where id = p_cupo_id for update;
  if not found or v_cupo.estado <> 'abierto' then
    raise exception 'cupo_no_disponible' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.candidatos_cupo(p_cupo_id) c where c.paciente_id = p_paciente_id
  ) then
    raise exception 'candidato_invalido' using errcode = '22023';
  end if;

  insert into public.ofertas (cupo_id, paciente_id, estado, score, expira_en)
  values (p_cupo_id, p_paciente_id, 'pendiente', least(1, greatest(0, p_score)), now() + make_interval(mins => greatest(1, p_minutos)))
  returning id into v_oferta;

  insert into public.ofertas_factores (oferta_id, clave, etiqueta, valor, valor_numerico, peso, orden)
  select v_oferta, f ->> 'clave', f ->> 'etiqueta', f ->> 'valor', (f ->> 'valor_numerico')::numeric,
         least(1, greatest(0, (f ->> 'peso')::numeric)), n::smallint
  from jsonb_array_elements(coalesce(p_factores, '[]'::jsonb)) with ordinality as t(f, n)
  where n <= 4;

  update public.cupos set estado = 'ofrecido' where id = p_cupo_id;
  perform public._evento_oferta(v_oferta, 'enviada');
  perform public._notificar(p_paciente_id, 'cupo-ultimo-minuto', public._datos_cupo(p_cupo_id), v_oferta);
  return v_oferta;
end;
$$;

-- Un cupo sin candidatos (o cuya fecha ya pasó) deja de estar disponible.
create or replace function public.cerrar_cupo(p_cupo_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.cupos set estado = 'expirado' where id = p_cupo_id and estado = 'abierto';
$$;

revoke all on function public.candidatos_cupo(uuid) from public, anon, authenticated;
revoke all on function public.ofrecer_cupo(uuid, uuid, numeric, jsonb, integer) from public, anon, authenticated;
revoke all on function public.cerrar_cupo(uuid) from public, anon, authenticated;
grant execute on function public.candidatos_cupo(uuid) to service_role;
grant execute on function public.ofrecer_cupo(uuid, uuid, numeric, jsonb, integer) to service_role;
grant execute on function public.cerrar_cupo(uuid) to service_role;
