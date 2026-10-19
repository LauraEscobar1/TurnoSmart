# Prueba controlada: una oferta real de punta a punta

Demuestra en el proyecto real el flujo completo: cancelación → cupo →
priorización con DeepSeek → oferta → aceptación → cita. Usa **dos cuentas de
prueba** identificables y la especialidad **Medicina general**, donde hoy no
espera ningún paciente real (así ninguna oferta de prueba llega a un paciente
real). No reactiva cupos expirados ni toca datos de otros pacientes.

Quien la ejecuta: una persona con acceso al proyecto (SQL Editor) y la app
corriendo en el celular (`cd app && npx expo start`).

## 0. Requisitos (verificar antes)

```sql
-- Migraciones hasta 20261019120000 aplicadas
select max(version) from supabase_migrations.schema_migrations;
-- Vault configurado (solo nombres)
select name from vault.secrets where name in ('priorizar_cupo_url', 'priorizar_cupo_secreto');
-- Cron activo
select jobname, schedule, active from cron.job;
-- Nadie real espera en Medicina general (debe dar 0 antes de empezar)
select count(*) from public.solicitudes_espera s
join public.especialidades e on e.id = s.especialidad_id
where e.nombre = 'Medicina general' and s.estado = 'activa';
```

El secreto de Vault y `PRIORIZAR_CUPO_SECRETO` de la función deben ser el
mismo valor: si `net._http_response` muestra `401 no_autorizado`, no coinciden.

## 1. Cuentas de prueba (desde la app)

Registra dos cuentas en la app, con nombre «Prueba» y apellido «E2E A» /
«E2E B» y cédulas distintas que no sean reales (p. ej. `9999000001` y
`9999000002`):

- **Paciente A** (quien cancela): cualquier especialidad *excepto* Medicina general.
- **Paciente B** (quien recibe la oferta): **Medicina general**, franja y
  alertas a gusto.

Si el correo de confirmación no llega (sin SMTP propio, Supabase solo envía a
los miembros del equipo), confirma **solo esas dos cuentas**:

```sql
update auth.users set email_confirmed_at = now()
where email in ('<correo-prueba-A>', '<correo-prueba-B>') and email_confirmed_at is null;
```

Comprueba que B está en la lista de espera:

```sql
select e.nombre, s.estado, s.creada_en
from public.solicitudes_espera s
join public.especialidades e on e.id = s.especialidad_id
join auth.users u on u.id = s.paciente_id
where u.email = '<correo-prueba-B>';
```

## 2. La clínica agenda una cita para A

Una cita confirmada de A en Medicina general con el profesional y el
consultorio existentes, dentro de 2 días a las 15:00 (Colombia). Si ese
horario ya está ocupado para el profesional, cambia la hora
(`uq_cita_profesional_hora_confirmada`).

```sql
insert into public.citas (paciente_id, especialidad_id, profesional_id, consultorio_id, fecha_hora, estado, origen)
select u.id, p.especialidad_id, p.id, p.consultorio_id,
       (date_trunc('day', now() at time zone 'America/Bogota') + interval '2 days 15 hours') at time zone 'America/Bogota',
       'confirmada', 'reserva-directa'
from auth.users u
cross join public.profesionales p
join public.especialidades e on e.id = p.especialidad_id
where u.email = '<correo-prueba-A>' and e.nombre = 'Medicina general'
limit 1
returning id, fecha_hora;
```

## 3. A cancela desde la app

Ingresa como A → Mis citas → la cita de Medicina general → **Cancelar cita**.
La RPC `cancelar_cita` libera el cupo, el trigger llama a `priorizar-cupo`,
DeepSeek prioriza y `ofrecer_cupo` crea la oferta para B (el único
candidato). Comprueba, a los pocos segundos:

```sql
-- Respuesta de la función: 200 con oferta_id y "estrategia":"ai"
select status_code, content, created from net._http_response order by created desc limit 3;
```

En Supabase › Edge Functions › `priorizar-cupo` › Logs debe aparecer
`{"evento":"priorizacion",...,"estrategia":"ai","motivo":null,...}`. Si dice
`"fallback"`, el motivo indica por qué (p. ej. `http_402` = sin saldo en
DeepSeek); la oferta se crea igual con la estrategia determinista.

## 4. B ve la oferta y la acepta

Ingresa como B: la oferta aparece en Inicio y en Ofertas (en vivo, por
Realtime), con el contador y «Por qué te lo ofrecemos». Tócala → **Aceptar
cupo**. Comprueba:

```sql
select o.estado oferta, cu.estado cupo, c.estado cita, c.origen,
       (select count(*) from public.ofertas_factores f where f.oferta_id = o.id) factores,
       (select count(*) from public.notificaciones n where n.oferta_id = o.id) notificaciones
from public.ofertas o
join public.cupos cu on cu.id = o.cupo_id
left join public.citas c on c.oferta_id = o.id
join auth.users u on u.id = o.paciente_id
where u.email = '<correo-prueba-B>'
order by o.creada_en desc limit 1;
-- Esperado: aceptada | tomado | confirmada | cupo-recuperado | 3-4 | 2
```

## 5. Rechazo y vencimiento (opcional)

Repite el paso 2 con otra hora y el paso 3. Luego, como B:

- **Rechazar**: la oferta queda `rechazada`; sin otro candidato en Medicina
  general, el cupo se cierra (`expirado`).
- **Dejar vencer**: no respondas durante 10 minutos; el cron
  `turnosmart-mantenimiento-ofertas` la marca `expirada`, B recibe la
  notificación de vencimiento y el cupo se cierra por falta de candidatos.

B debe volver a estar en la lista de Medicina general para esta parte (al
aceptar, su solicitud quedó «atendida»): en la app, Perfil › Preferencias.

## 6. Limpieza

Como B, quita Medicina general de sus preferencias (la solicitud queda
«retirada»). Las cuentas de prueba pueden quedar identificadas como «Prueba
E2E» o borrarse en Authentication › Users (comprueba antes qué filas
dependen de ellas).
