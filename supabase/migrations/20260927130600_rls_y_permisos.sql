-- =============================================================================
-- TurnoSmart · RLS y permisos
--
-- Regla general: `anon` no accede a nada. Un paciente autenticado solo LEE
-- sus propias filas (y los catálogos) y solo ESCRIBE directamente las
-- columnas editables de su perfil. Todo lo demás (lista de espera, citas,
-- ofertas, notificaciones) se modifica con las RPC `security definer`, que
-- validan auth.uid() y hacen los cambios en una transacción.
-- Idempotente: cada política se borra (por nombre) y se vuelve a crear.
-- =============================================================================

-- RLS en todas las tablas.
alter table public.especialidades   enable row level security;
alter table public.consultorios     enable row level security;
alter table public.profesionales    enable row level security;
alter table public.pacientes        enable row level security;
alter table public.solicitudes_espera enable row level security;
alter table public.citas            enable row level security;
alter table public.cupos            enable row level security;
alter table public.ofertas          enable row level security;
alter table public.ofertas_factores enable row level security;
alter table public.ofertas_eventos  enable row level security;
alter table public.notificaciones   enable row level security;

-- Sin acceso para anon, y sin escrituras directas para authenticated.
revoke all on table
  public.especialidades, public.consultorios, public.profesionales, public.pacientes,
  public.solicitudes_espera, public.citas, public.cupos, public.ofertas,
  public.ofertas_factores, public.ofertas_eventos, public.notificaciones
from anon, authenticated;

grant select on table
  public.especialidades, public.consultorios, public.profesionales, public.pacientes,
  public.solicitudes_espera, public.citas, public.cupos, public.ofertas,
  public.ofertas_factores, public.ofertas_eventos, public.notificaciones
to authenticated;

-- El perfil: solo las columnas que el paciente puede editar desde la app.
grant update (
  franja_preferida, distancia_max_km, notificaciones_activas, fecha_nacimiento,
  ciudad, eps, contacto_emergencia_nombre, contacto_emergencia_telefono
) on public.pacientes to authenticated;

-- Catálogos: legibles para cualquier paciente autenticado.
drop policy if exists "catalogo_especialidades_lectura" on public.especialidades;
create policy "catalogo_especialidades_lectura" on public.especialidades
  for select to authenticated using (true);

drop policy if exists "catalogo_consultorios_lectura" on public.consultorios;
create policy "catalogo_consultorios_lectura" on public.consultorios
  for select to authenticated using (true);

drop policy if exists "catalogo_profesionales_lectura" on public.profesionales;
create policy "catalogo_profesionales_lectura" on public.profesionales
  for select to authenticated using (true);

-- Pacientes: su propia fila.
drop policy if exists "pacientes_lectura_propia" on public.pacientes;
create policy "pacientes_lectura_propia" on public.pacientes
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "pacientes_actualizacion_propia" on public.pacientes;
create policy "pacientes_actualizacion_propia" on public.pacientes
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Lista de espera, citas, ofertas y notificaciones: solo las propias.
drop policy if exists "solicitudes_espera_lectura_propia" on public.solicitudes_espera;
create policy "solicitudes_espera_lectura_propia" on public.solicitudes_espera
  for select to authenticated using (paciente_id = (select auth.uid()));

drop policy if exists "citas_lectura_propia" on public.citas;
create policy "citas_lectura_propia" on public.citas
  for select to authenticated using (paciente_id = (select auth.uid()));

drop policy if exists "ofertas_lectura_propia" on public.ofertas;
create policy "ofertas_lectura_propia" on public.ofertas
  for select to authenticated using (paciente_id = (select auth.uid()));

drop policy if exists "notificaciones_lectura_propia" on public.notificaciones;
create policy "notificaciones_lectura_propia" on public.notificaciones
  for select to authenticated using (paciente_id = (select auth.uid()));

-- Cupos: solo los que se le ofrecieron al paciente o que liberó una cita suya.
drop policy if exists "cupos_lectura_relacionada" on public.cupos;
create policy "cupos_lectura_relacionada" on public.cupos
  for select to authenticated using (
    exists (select 1 from public.ofertas o where o.cupo_id = cupos.id and o.paciente_id = (select auth.uid()))
    or exists (select 1 from public.citas c where c.id = cupos.cita_origen_id and c.paciente_id = (select auth.uid()))
  );

-- Factores y eventos: los de sus ofertas.
drop policy if exists "ofertas_factores_lectura_propia" on public.ofertas_factores;
create policy "ofertas_factores_lectura_propia" on public.ofertas_factores
  for select to authenticated using (
    exists (select 1 from public.ofertas o where o.id = ofertas_factores.oferta_id and o.paciente_id = (select auth.uid()))
  );

drop policy if exists "ofertas_eventos_lectura_propia" on public.ofertas_eventos;
create policy "ofertas_eventos_lectura_propia" on public.ofertas_eventos
  for select to authenticated using (
    exists (select 1 from public.ofertas o where o.id = ofertas_eventos.oferta_id and o.paciente_id = (select auth.uid()))
  );
