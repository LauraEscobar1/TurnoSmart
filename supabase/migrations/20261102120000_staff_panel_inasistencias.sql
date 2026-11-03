-- =============================================================================
-- TurnoSmart · Panel del staff y riesgo de inasistencia (idempotente, aditiva)
--
-- 1. `staff`: usuario de Auth ↔ consultorio. El rol se marca en
--    `auth.users.raw_app_meta_data.rol = 'staff'` (solo lo puede escribir el
--    servidor, nunca la app) y el trigger de registro ya no crea un paciente
--    para esos usuarios. La validación de cédula de `pacientes` no cambia.
-- 2. RLS: el staff lee su fila de `staff`, los cupos y el riesgo de SU
--    consultorio. No tiene acceso directo a `pacientes`, `citas` ni `ofertas`:
--    los ve solo por las RPC de abajo, con el paciente reducido a iniciales y
--    un código opaco (P-XXXXXX).
-- 3. RPC del staff (security definer, validan que la cita/cupo sea de un
--    consultorio suyo): `cancelar_cita_staff` (libera el cupo con el mismo
--    flujo que `cancelar_cita` → trigger → priorizar-cupo),
--    `registrar_inasistencia`, `staff_metricas`, `staff_agenda`,
--    `staff_cupos`, `mi_perfil_staff` y `staff_datos_riesgo` (la usa la Edge
--    Function predecir-inasistencia con el JWT del staff).
-- 4. `riesgo_inasistencia`: último cálculo por cita, con la estrategia usada
--    (ai | fallback). Solo la escribe el servidor (`guardar_riesgo_inasistencia`,
--    service_role).
--
-- No borra datos, no hace DROP de tablas ni modifica migraciones anteriores.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Staff
-- ---------------------------------------------------------------------------
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  consultorio_id uuid not null references public.consultorios (id),
  nombre text not null default '',
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  constraint uq_staff_usuario_consultorio unique (usuario_id, consultorio_id)
);
create index if not exists idx_staff_consultorio on public.staff (consultorio_id);

-- Registro (20260927130200) + una sola condición nueva: un usuario marcado
-- como staff por el servidor no es paciente. El resto es idéntico.
create or replace function public.crear_paciente_desde_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_franja text := m ->> 'franjaPreferida';
  v_distancia numeric := case when m ->> 'distanciaMaxKm' in ('3', '10') then (m ->> 'distanciaMaxKm')::numeric end;
begin
  if coalesce(new.raw_app_meta_data ->> 'rol', '') = 'staff' then
    return new;
  end if;

  insert into public.pacientes (
    id, nombre, apellido, cedula, email, telefono, franja_preferida, distancia_max_km,
    notificaciones_activas, registrado_en, acepto_terminos_en
  )
  values (
    new.id,
    coalesce(m ->> 'nombre', ''),
    coalesce(m ->> 'apellido', ''),
    regexp_replace(coalesce(m ->> 'cedula', ''), '\D', '', 'g'),
    new.email,
    coalesce(m ->> 'telefono', ''),
    case when v_franja in ('Mañana', 'Tarde', 'Indistinto') then v_franja else 'Indistinto' end,
    v_distancia,
    coalesce((m ->> 'notificacionesActivas')::boolean, false),
    now(),
    now()
  )
  on conflict (id) do nothing;

  insert into public.solicitudes_espera (paciente_id, especialidad_id)
  select new.id, e.id
  from public.especialidades e
  where e.nombre in (select jsonb_array_elements_text(coalesce(m -> 'especialidadesInteres', '[]'::jsonb)))
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.crear_paciente_desde_auth() from public, anon, authenticated;

-- Consultorios del staff autenticado (vacío si no es staff).
create or replace function public._consultorios_staff()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.consultorio_id from public.staff s where s.usuario_id = auth.uid() and s.activo;
$$;

-- Paciente visto por el staff: solo iniciales y un código estable y opaco.
create or replace function public._iniciales_paciente(p_paciente_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select upper(left(btrim(p.nombre), 1) || left(btrim(p.apellido), 1))
  from public.pacientes p where p.id = p_paciente_id;
$$;

create or replace function public._codigo_paciente(p_paciente_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'P-' || upper(substr(md5('turnosmart:' || p_paciente_id::text), 1, 6));
$$;

-- ---------------------------------------------------------------------------
-- 4. Riesgo de inasistencia (la tabla va antes de las RPC que la leen)
-- ---------------------------------------------------------------------------
create table if not exists public.riesgo_inasistencia (
  cita_id uuid primary key references public.citas (id) on delete cascade,
  consultorio_id uuid not null references public.consultorios (id),
  -- Puntaje determinista 0-1 (factores sin datos clínicos).
  puntaje numeric not null check (puntaje >= 0 and puntaje <= 1),
  nivel text not null check (nivel in ('bajo', 'medio', 'alto')),
  estrategia text not null check (estrategia in ('ai', 'fallback')),
  motivo_fallback text,
  modelo text,
  explicacion_es text not null check (char_length(explicacion_es) between 1 and 300),
  explicacion_en text not null check (char_length(explicacion_en) between 1 and 300),
  factores jsonb not null default '{}'::jsonb,
  calculado_en timestamptz not null default now()
);
create index if not exists idx_riesgo_consultorio on public.riesgo_inasistencia (consultorio_id);

-- ---------------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------------
alter table public.staff enable row level security;
alter table public.riesgo_inasistencia enable row level security;

revoke all on table public.staff, public.riesgo_inasistencia from anon, authenticated;
grant select on table public.staff, public.riesgo_inasistencia to authenticated;

drop policy if exists "staff_lectura_propia" on public.staff;
create policy "staff_lectura_propia" on public.staff
  for select to authenticated using (usuario_id = (select auth.uid()));

drop policy if exists "riesgo_lectura_staff" on public.riesgo_inasistencia;
create policy "riesgo_lectura_staff" on public.riesgo_inasistencia
  for select to authenticated using (consultorio_id in (select public._consultorios_staff()));

-- Se suma (OR) a la política del paciente: el staff ve los cupos de su consultorio.
drop policy if exists "cupos_lectura_staff" on public.cupos;
create policy "cupos_lectura_staff" on public.cupos
  for select to authenticated using (consultorio_id in (select public._consultorios_staff()));

-- ---------------------------------------------------------------------------
-- 3. RPC del staff
-- ---------------------------------------------------------------------------

-- Perfil del staff autenticado: nombre y consultorios; NULL si no es staff.
create or replace function public.mi_perfil_staff()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nombre', max(s.nombre),
    'consultorios', jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre) order by c.nombre)
  )
  from public.staff s
  join public.consultorios c on c.id = s.consultorio_id
  where s.usuario_id = auth.uid() and s.activo
  having count(*) > 0;
$$;

-- Cancela una cita confirmada y futura de un consultorio del staff y libera
-- el cupo igual que `cancelar_cita` (el trigger lo ofrece a la lista de espera).
create or replace function public.cancelar_cita_staff(p_cita_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cita public.citas;
  v_cupo uuid;
begin
  select * into v_cita from public.citas where id = p_cita_id for update;
  if not found or not exists (select 1 from public._consultorios_staff() m where m = v_cita.consultorio_id) then
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

-- Marca como inasistencia (no-show) una cita confirmada cuya hora ya pasó.
-- No libera cupo: el horario ya transcurrió. Alimenta el historial de riesgo.
create or replace function public.registrar_inasistencia(p_cita_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cita public.citas;
begin
  select * into v_cita from public.citas where id = p_cita_id for update;
  if not found or not exists (select 1 from public._consultorios_staff() m where m = v_cita.consultorio_id) then
    raise exception 'cita_no_encontrada' using errcode = 'P0002';
  end if;
  if v_cita.estado <> 'confirmada' or v_cita.fecha_hora > now() then
    raise exception 'inasistencia_no_registrable' using errcode = '22023';
  end if;
  update public.citas set estado = 'no-show' where id = p_cita_id;
end;
$$;

-- Métricas de los consultorios del staff en los últimos p_dias días.
create or replace function public.staff_metricas(p_dias integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select now() - make_interval(days => least(365, greatest(1, coalesce(p_dias, 30)))) as desde
  ),
  mios as (select public._consultorios_staff() as id),
  liberados as (
    select cu.* from public.cupos cu, params
    where cu.consultorio_id in (select id from mios) and cu.creado_en >= params.desde
  )
  select jsonb_build_object(
    'dias', least(365, greatest(1, coalesce(p_dias, 30))),
    'cancelaciones', (
      select count(*) from public.citas c, params
      where c.consultorio_id in (select id from mios) and c.estado = 'cancelada' and c.cancelada_en >= params.desde
    ),
    'inasistencias', (
      select count(*) from public.citas c, params
      where c.consultorio_id in (select id from mios) and c.estado = 'no-show' and c.fecha_hora >= params.desde
    ),
    'cupos_liberados', (select count(*) from liberados),
    'cupos_recuperados', (select count(*) from liberados where estado = 'tomado'),
    'tasa_recuperacion', (
      select case when count(*) = 0 then null
                  else round(count(*) filter (where estado = 'tomado')::numeric / count(*), 4) end
      from liberados
    )
  );
$$;

-- Agenda: citas confirmadas desde hace 1 día (las que pasaron sin registrar
-- asistencia) hasta p_dias días adelante, con el último riesgo calculado.
create or replace function public.staff_agenda(p_dias integer default 14)
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
  riesgo_calculado_en timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.fecha_hora, e.nombre, p.nombre, co.nombre, c.origen,
         public._iniciales_paciente(c.paciente_id), public._codigo_paciente(c.paciente_id),
         r.nivel, r.puntaje, r.estrategia, r.explicacion_es, r.explicacion_en, r.calculado_en
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

-- Cupos de los consultorios del staff con el estado de sus ofertas (en orden).
create or replace function public.staff_cupos(p_limite integer default 30)
returns table (
  cupo_id uuid,
  fecha_hora timestamptz,
  especialidad text,
  profesional text,
  motivo text,
  estado text,
  creado_en timestamptz,
  ofertas jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select cu.id, cu.fecha_hora, e.nombre, p.nombre, cu.motivo, cu.estado, cu.creado_en,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'estado', o.estado,
                    'creada_en', o.creada_en,
                    'expira_en', o.expira_en,
                    'respondida_en', o.respondida_en,
                    'paciente_iniciales', public._iniciales_paciente(o.paciente_id),
                    'paciente_codigo', public._codigo_paciente(o.paciente_id)
                  ) order by o.creada_en)
           from public.ofertas o where o.cupo_id = cu.id
         ), '[]'::jsonb)
  from public.cupos cu
  left join public.especialidades e on e.id = cu.especialidad_id
  left join public.profesionales p on p.id = cu.profesional_id
  where cu.consultorio_id in (select public._consultorios_staff())
  order by cu.creado_en desc
  limit least(100, greatest(1, coalesce(p_limite, 30)));
$$;

-- Señales para predecir la inasistencia de las próximas citas (una o toda la
-- agenda). Sin datos clínicos ni identificadores del paciente: solo conteos.
-- Las citas pasadas que siguen «confirmadas» (sin inasistencia registrada) se
-- cuentan como asistidas pasado un día.
create or replace function public.staff_datos_riesgo(p_cita_id uuid default null)
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
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public._consultorios_staff()) then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;
  return query
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
  where c.consultorio_id in (select public._consultorios_staff())
    and c.estado = 'confirmada'
    and c.fecha_hora > now()
    and (p_cita_id is null or c.id = p_cita_id)
    and (p_cita_id is not null or c.fecha_hora <= now() + interval '14 days')
  order by c.fecha_hora
  limit 100;
end;
$$;

-- Guarda (o reemplaza) el riesgo calculado. Solo service_role (Edge Function).
-- p_resultados: [{cita_id, puntaje, nivel, estrategia, motivo_fallback, modelo,
--                 explicacion_es, explicacion_en, factores}]
create or replace function public.guardar_riesgo_inasistencia(p_resultados jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  insert into public.riesgo_inasistencia as r (
    cita_id, consultorio_id, puntaje, nivel, estrategia, motivo_fallback, modelo,
    explicacion_es, explicacion_en, factores, calculado_en
  )
  select x.cita_id, c.consultorio_id, x.puntaje, x.nivel, x.estrategia, x.motivo_fallback, x.modelo,
         x.explicacion_es, x.explicacion_en, coalesce(x.factores, '{}'::jsonb), now()
  from jsonb_to_recordset(coalesce(p_resultados, '[]'::jsonb)) as x(
    cita_id uuid, puntaje numeric, nivel text, estrategia text, motivo_fallback text, modelo text,
    explicacion_es text, explicacion_en text, factores jsonb
  )
  join public.citas c on c.id = x.cita_id
  on conflict (cita_id) do update set
    puntaje = excluded.puntaje,
    nivel = excluded.nivel,
    estrategia = excluded.estrategia,
    motivo_fallback = excluded.motivo_fallback,
    modelo = excluded.modelo,
    explicacion_es = excluded.explicacion_es,
    explicacion_en = excluded.explicacion_en,
    factores = excluded.factores,
    calculado_en = excluded.calculado_en;
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
revoke all on function public._consultorios_staff() from public, anon;
revoke all on function public._iniciales_paciente(uuid) from public, anon, authenticated;
revoke all on function public._codigo_paciente(uuid) from public, anon, authenticated;
-- Lo usan las políticas RLS evaluadas como authenticated.
grant execute on function public._consultorios_staff() to authenticated;

revoke all on function public.mi_perfil_staff() from public, anon;
revoke all on function public.cancelar_cita_staff(uuid) from public, anon;
revoke all on function public.registrar_inasistencia(uuid) from public, anon;
revoke all on function public.staff_metricas(integer) from public, anon;
revoke all on function public.staff_agenda(integer) from public, anon;
revoke all on function public.staff_cupos(integer) from public, anon;
revoke all on function public.staff_datos_riesgo(uuid) from public, anon;
grant execute on function public.mi_perfil_staff() to authenticated;
grant execute on function public.cancelar_cita_staff(uuid) to authenticated;
grant execute on function public.registrar_inasistencia(uuid) to authenticated;
grant execute on function public.staff_metricas(integer) to authenticated;
grant execute on function public.staff_agenda(integer) to authenticated;
grant execute on function public.staff_cupos(integer) to authenticated;
grant execute on function public.staff_datos_riesgo(uuid) to authenticated;

revoke all on function public.guardar_riesgo_inasistencia(jsonb) from public, anon, authenticated;
grant execute on function public.guardar_riesgo_inasistencia(jsonb) to service_role;
