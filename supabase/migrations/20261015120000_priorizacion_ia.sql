-- =============================================================================
-- TurnoSmart · Priorización con IA (DeepSeek): ajustes de la base (idempotente)
--
-- La IA corre en la Edge Function `priorizar-cupo`; la base no cambia de
-- flujo. Solo dos ajustes, con la misma firma y la misma lógica:
--
-- 1. `ofrecer_cupo` completa `ofertas_factores.tipo`. En el proyecto real la
--    tabla tiene esa columna (creada a mano antes de las migraciones) como
--    NOT NULL, sin valor por defecto y con el mismo CHECK que `clave`; la
--    versión anterior no la llenaba, así que crear una oferta fallaba con
--    «null value in column "tipo"». Se guarda tipo = clave. En una base
--    creada solo con las migraciones la columna se agrega (nullable).
-- 2. `_solicitar_priorizacion`: el timeout de pg_net hacia la función pasa
--    de 5 s a 15 s, porque la llamada a la IA puede tardar varios segundos
--    (la función espera a la IA como máximo DEEPSEEK_TIMEOUT_MS, 8 s por
--    defecto, y luego usa la estrategia determinista).
--
-- No borra datos ni cambia permisos: las dos funciones conservan sus revoke/grant.
-- =============================================================================

alter table public.ofertas_factores add column if not exists tipo text;

-- ---------------------------------------------------------------------------
-- 1. ofrecer_cupo (20260927130500) + tipo
-- ---------------------------------------------------------------------------
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

  insert into public.ofertas_factores (oferta_id, tipo, clave, etiqueta, valor, valor_numerico, peso, orden)
  select v_oferta, f ->> 'clave', f ->> 'clave', f ->> 'etiqueta', f ->> 'valor', (f ->> 'valor_numerico')::numeric,
         least(1, greatest(0, (f ->> 'peso')::numeric)), n::smallint
  from jsonb_array_elements(coalesce(p_factores, '[]'::jsonb)) with ordinality as t(f, n)
  where n <= 4;

  update public.cupos set estado = 'ofrecido' where id = p_cupo_id;
  perform public._evento_oferta(v_oferta, 'enviada');
  perform public._notificar(p_paciente_id, 'cupo-ultimo-minuto', public._datos_cupo(p_cupo_id), v_oferta);
  return v_oferta;
end;
$$;

revoke all on function public.ofrecer_cupo(uuid, uuid, numeric, jsonb, integer) from public, anon, authenticated;
grant execute on function public.ofrecer_cupo(uuid, uuid, numeric, jsonb, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 2. _solicitar_priorizacion (20260927140000) con timeout de 15 s
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
    timeout_milliseconds := 15000
  );
  return new;
end;
$$;

revoke all on function public._solicitar_priorizacion() from public, anon, authenticated;
