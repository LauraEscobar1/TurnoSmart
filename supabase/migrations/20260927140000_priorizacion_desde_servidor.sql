-- =============================================================================
-- TurnoSmart · Priorización disparada solo desde el servidor + score privado
--
-- 1. La Edge Function `priorizar-cupo` ya no la invoca la app: la invoca la
--    base, con pg_net, cuando un cupo queda «abierto» (cancelación, rechazo
--    o vencimiento de una oferta). La llamada lleva un secreto compartido
--    guardado en Vault; sin él la función responde 401. Así ningún paciente
--    puede forzar ofertas para un cupo ni provocar llamadas repetidas: solo
--    abre cupos a través de las RPC que validan que la cita/oferta sea suya.
--
--    Configuración (una vez, en el SQL Editor; ver supabase/README.md):
--      select vault.create_secret('https://<proyecto>.supabase.co/functions/v1/priorizar-cupo', 'priorizar_cupo_url');
--      select vault.create_secret('<secreto largo y aleatorio>', 'priorizar_cupo_secreto');
--    y el mismo secreto en la función: PRIORIZAR_CUPO_SECRETO.
--
-- 2. `ofertas.score` es interno: el paciente puede leer sus ofertas pero no
--    esa columna (privilegios por columna).
-- Idempotente.
-- =============================================================================

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Cupo abierto → priorizar-cupo (asíncrono: pg_net envía tras el commit)
-- ---------------------------------------------------------------------------
create or replace function public._solicitar_priorizacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secreto text;
begin
  -- Solo cuando el cupo pasa a «abierto» (o cuando se pide reprocesarlo).
  if new.estado is distinct from 'abierto'
     or (tg_op = 'UPDATE' and old.estado = 'abierto'
         and coalesce(current_setting('turnosmart.reprocesar_cupos', true), '') <> 'on') then
    return new;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'priorizar_cupo_url';
  select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'priorizar_cupo_secreto';
  if v_url is null or v_secreto is null then
    -- Sin configurar: el cupo queda abierto (no se pierde) y se puede reprocesar.
    raise warning 'priorizar-cupo sin configurar en Vault: el cupo % queda abierto', new.id;
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('cupo_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-priorizar-secreto', v_secreto),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke all on function public._solicitar_priorizacion() from public, anon, authenticated;

drop trigger if exists cupos_solicitar_priorizacion on public.cupos;
create trigger cupos_solicitar_priorizacion
  after insert or update of estado on public.cupos
  for each row execute function public._solicitar_priorizacion();

-- Reenvía a priorizar los cupos que siguen abiertos (p. ej. si la función no
-- respondió). Solo para el servidor: pg_cron o el SQL Editor.
create or replace function public.reprocesar_cupos_abiertos()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  -- Reescribir el estado (con la marca de reproceso, solo en esta
  -- transacción) dispara el trigger para cada cupo abierto y futuro.
  perform set_config('turnosmart.reprocesar_cupos', 'on', true);
  update public.cupos set estado = 'abierto' where estado = 'abierto' and fecha_hora > now();
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke all on function public.reprocesar_cupos_abiertos() from public, anon, authenticated;
grant execute on function public.reprocesar_cupos_abiertos() to service_role;

-- ---------------------------------------------------------------------------
-- 2. `ofertas.score` no se expone al paciente
-- ---------------------------------------------------------------------------
revoke select on table public.ofertas from authenticated;
grant select (id, cupo_id, paciente_id, estado, expira_en, creada_en, respondida_en)
  on table public.ofertas to authenticated;
