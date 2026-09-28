-- =============================================================================
-- TurnoSmart · Catálogo de especialidades (idempotente)
--
-- Las 15 especialidades que muestra la app (registro, Preferencias y
-- «Buscar especialista»). Los nombres son exactamente los de la app: la
-- traducción al inglés se hace en la app (i18n › datos.especialidades).
-- No duplica: uq_especialidades_nombre + on conflict do nothing.
-- =============================================================================
insert into public.especialidades (nombre)
values
  ('Cardiología'),
  ('Dermatología'),
  ('Traumatología'),
  ('Nutrición'),
  ('Clínica médica'),
  ('Pediatría'),
  ('Ginecología'),
  ('Oftalmología'),
  ('Neurología'),
  ('Endocrinología'),
  ('Gastroenterología'),
  ('Otorrinolaringología'),
  ('Psiquiatría'),
  ('Urología'),
  ('Kinesiología')
on conflict (nombre) do nothing;
