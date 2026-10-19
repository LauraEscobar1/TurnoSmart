-- =============================================================================
-- TurnoSmart · Notificaciones: completar oferta_id / cita_id (idempotente)
--
-- En el proyecto real `notificaciones` tiene, desde antes de las migraciones,
-- las columnas `oferta_id` y `cita_id` (con FK) y el CHECK
-- `chk_notificacion_referencia`: un «recordatorio» exige cita_id, y los
-- demás tipos (cupo-ultimo-minuto, confirmacion, expiracion) exigen
-- oferta_id. Las RPC guardan la referencia solo en `referencia_id`, así que
-- cada notificación de una oferta violaba el CHECK y hacía fallar la
-- transacción completa de `ofrecer_cupo` (la oferta no se creaba),
-- `_expirar_oferta` y `aceptar_oferta`.
--
-- Este trigger completa la columna que exige el CHECK a partir de
-- `referencia_id`, sin cambiar las RPC ni los permisos. En una base creada
-- solo con las migraciones agrega las columnas si faltan (sin el CHECK).
-- =============================================================================

alter table public.notificaciones add column if not exists oferta_id uuid references public.ofertas (id) on delete cascade;
alter table public.notificaciones add column if not exists cita_id uuid references public.citas (id) on delete cascade;

create or replace function public._completar_referencia_notificacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.referencia_id is not null and new.oferta_id is null and new.cita_id is null then
    if new.tipo = 'recordatorio' then
      new.cita_id := new.referencia_id;
    else
      new.oferta_id := new.referencia_id;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public._completar_referencia_notificacion() from public, anon, authenticated;

drop trigger if exists notificaciones_completar_referencia on public.notificaciones;
create trigger notificaciones_completar_referencia
  before insert on public.notificaciones
  for each row execute function public._completar_referencia_notificacion();
