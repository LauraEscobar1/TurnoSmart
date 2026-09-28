-- =============================================================================
-- TurnoSmart · Alta del paciente al registrarse (trigger sobre auth.users)
--
-- La app llama a supabase.auth.signUp con los datos del formulario en
-- `options.data` (nunca la contraseña). Este trigger crea, en la misma
-- transacción, la fila de `public.pacientes` con id = auth.users.id y las
-- solicitudes de la lista de espera de las especialidades elegidas.
-- Si la cédula ya existe (uq_pacientes_cedula) el INSERT falla y Supabase no
-- crea el usuario («Database error saving new user»): la app lo informa.
--
-- Idempotente: `on conflict do nothing` hace que sea seguro aunque exista
-- otro trigger anterior que ya cree la fila del paciente.
-- =============================================================================
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

  -- Especialidades elegidas en el registro → solicitudes activas.
  insert into public.solicitudes_espera (paciente_id, especialidad_id)
  select new.id, e.id
  from public.especialidades e
  where e.nombre in (select jsonb_array_elements_text(coalesce(m -> 'especialidadesInteres', '[]'::jsonb)))
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.crear_paciente_desde_auth() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_crear_paciente on auth.users;
create trigger on_auth_user_created_crear_paciente
  after insert on auth.users
  for each row execute function public.crear_paciente_desde_auth();
