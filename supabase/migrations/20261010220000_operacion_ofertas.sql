-- =============================================================================
-- TurnoSmart · Operación automática de las ofertas (idempotente)
--
-- 1. `candidatos_cupo` no devuelve candidatos para un cupo cuya hora ya pasó,
--    ni a quien ya tiene una cita confirmada a esa misma hora. Sin candidatos,
--    la Edge Function cierra el cupo (`cerrar_cupo`); `ofrecer_cupo` valida
--    contra esta misma función, así que tampoco puede ofrecer un cupo vencido.
-- 2. `cerrar_cupos_vencidos()`: cierra los cupos que siguen abiertos con la
--    hora ya pasada (p. ej. si la priorización no respondió a tiempo).
-- 3. Tareas programadas (pg_cron). `cron.schedule` reemplaza el job si ya
--    existe uno con el mismo nombre, así que se puede volver a ejecutar:
--    · turnosmart-mantenimiento-ofertas (cada minuto): vence las ofertas cuyo
--      plazo terminó —el cupo se vuelve a abrir y el trigger
--      `cupos_solicitar_priorizacion` lo ofrece al siguiente candidato— y
--      cierra los cupos vencidos. Así vencen aunque el paciente no abra la app.
--    · turnosmart-reprocesar-cupos (cada 5 minutos): reenvía a priorizar los
--      cupos futuros que siguen abiertos (la llamada de pg_net no reintenta).
-- 4. Realtime: `notificaciones` entra en la publicación `supabase_realtime`.
--    Cada oferta nueva, vencimiento o confirmación crea una notificación, así
--    la app se entera al instante y recarga con sus servicios. RLS aplica
--    igual: cada paciente solo recibe las suyas. `ofertas` no se publica
--    (su `score` es privado).
--
-- No borra datos ni cambia las migraciones anteriores.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Candidatos: solo cupos futuros y pacientes libres a esa hora
-- ---------------------------------------------------------------------------
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
      and cu.fecha_hora > now()
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
    and not exists (
      select 1 from public.citas c
      where c.paciente_id = cola.paciente_id and c.estado = 'confirmada' and c.fecha_hora = cupo.fecha_hora
    )
  order by cola.puesto;
$$;

revoke all on function public.candidatos_cupo(uuid) from public, anon, authenticated;
grant execute on function public.candidatos_cupo(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Cupos abiertos con la hora ya pasada → expirado
-- ---------------------------------------------------------------------------
create or replace function public.cerrar_cupos_vencidos()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  update public.cupos set estado = 'expirado' where estado = 'abierto' and fecha_hora <= now();
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke all on function public.cerrar_cupos_vencidos() from public, anon, authenticated;
grant execute on function public.cerrar_cupos_vencidos() to service_role;

-- Lo que corre cada minuto, en una sola llamada (solo servidor).
create or replace function public.mantenimiento_ofertas()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.expirar_ofertas_vencidas();
  perform public.cerrar_cupos_vencidos();
end;
$$;

revoke all on function public.mantenimiento_ofertas() from public, anon, authenticated;
grant execute on function public.mantenimiento_ofertas() to service_role;

-- ---------------------------------------------------------------------------
-- 3. Tareas programadas
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;

select cron.schedule('turnosmart-mantenimiento-ofertas', '* * * * *', 'select public.mantenimiento_ofertas()');
select cron.schedule('turnosmart-reprocesar-cupos', '*/5 * * * *', 'select public.reprocesar_cupos_abiertos()');

-- ---------------------------------------------------------------------------
-- 4. Realtime sobre las notificaciones del paciente
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificaciones'
     ) then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end $$;
