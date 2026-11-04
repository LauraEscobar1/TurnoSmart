-- =============================================================================
-- TurnoSmart · Estrategia de cada oferta visible para el paciente (idempotente)
--
-- Hasta ahora `priorizar-cupo` solo dejaba en los logs si la priorización
-- fue de la IA ("ai") o de la estrategia determinista ("fallback"). La app
-- necesita saberlo para ser honesta: muestra «Recomendado por IA» SOLO
-- cuando la IA ordenó a los candidatos, y «Recomendado por TurnoSmart» en
-- el respaldo determinista.
--
-- 1. `ofertas.estrategia` ('ai' | 'fallback'), legible por el paciente (sus
--    propias ofertas, por RLS). Las ofertas anteriores quedan en 'fallback':
--    no consta que las haya priorizado la IA.
-- 2. `ofrecer_cupo` recibe `p_estrategia` (por defecto 'fallback'), la guarda
--    en la oferta y en `datos.estrategia` de la notificación «cupo de último
--    minuto», para que el aviso diga «La IA de TurnoSmart encontró un cupo
--    para ti» solo cuando corresponde.
--
-- El score sigue sin exponerse. No borra datos.
-- =============================================================================

alter table public.ofertas add column if not exists estrategia text not null default 'fallback';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_ofertas_estrategia') then
    alter table public.ofertas
      add constraint chk_ofertas_estrategia check (estrategia in ('ai', 'fallback'));
  end if;
end;
$$;

grant select (estrategia) on table public.ofertas to authenticated;

-- ---------------------------------------------------------------------------
-- ofrecer_cupo (20261015120000) + estrategia
-- ---------------------------------------------------------------------------
-- La firma cambia (parámetro nuevo): se elimina la anterior para que no
-- queden dos versiones sobrecargadas.
drop function if exists public.ofrecer_cupo(uuid, uuid, numeric, jsonb, integer);

create or replace function public.ofrecer_cupo(
  p_cupo_id uuid,
  p_paciente_id uuid,
  p_score numeric,
  p_factores jsonb,
  p_minutos integer default 10,
  p_estrategia text default 'fallback'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo public.cupos;
  v_oferta uuid;
  v_estrategia text := case when p_estrategia = 'ai' then 'ai' else 'fallback' end;
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

  insert into public.ofertas (cupo_id, paciente_id, estado, score, expira_en, estrategia)
  values (p_cupo_id, p_paciente_id, 'pendiente', least(1, greatest(0, p_score)),
          now() + make_interval(mins => greatest(1, p_minutos)), v_estrategia)
  returning id into v_oferta;

  insert into public.ofertas_factores (oferta_id, tipo, clave, etiqueta, valor, valor_numerico, peso, orden)
  select v_oferta, f ->> 'clave', f ->> 'clave', f ->> 'etiqueta', f ->> 'valor', (f ->> 'valor_numerico')::numeric,
         least(1, greatest(0, (f ->> 'peso')::numeric)), n::smallint
  from jsonb_array_elements(coalesce(p_factores, '[]'::jsonb)) with ordinality as t(f, n)
  where n <= 4;

  update public.cupos set estado = 'ofrecido' where id = p_cupo_id;
  perform public._evento_oferta(v_oferta, 'enviada');
  perform public._notificar(
    p_paciente_id,
    'cupo-ultimo-minuto',
    public._datos_cupo(p_cupo_id) || jsonb_build_object('estrategia', v_estrategia),
    v_oferta
  );
  return v_oferta;
end;
$$;
revoke all on function public.ofrecer_cupo(uuid, uuid, numeric, jsonb, integer, text) from public, anon, authenticated;
grant execute on function public.ofrecer_cupo(uuid, uuid, numeric, jsonb, integer, text) to service_role;
