# TurnoSmart · Backend en Supabase

Todo el SQL del backend está versionado en `supabase/migrations/` (aplicar en
orden por nombre) y la priorización de cupos vive en la Edge Function
`supabase/functions/priorizar-cupo`. La app móvil solo usa la clave pública
(`EXPO_PUBLIC_SUPABASE_ANON_KEY`); nunca la service_role ni claves de IA.

## Migraciones

| Archivo | Qué hace |
|---|---|
| `20260927130000_esquema_base.sql` | Tablas, columnas, restricciones e índices (idempotente: `if not exists`, restricciones `NOT VALID`; no borra datos). |
| `20260927130100_catalogo_especialidades.sql` | Las 15 especialidades de la app (sin duplicar). |
| `20260927130200_registro_pacientes.sql` | Trigger sobre `auth.users`: crea `pacientes` y las solicitudes de espera elegidas al registrarse. |
| `20260927130300_lista_espera.sql` | RPC: `sincronizar_lista_espera`, `unirse_lista_espera`, `retirar_lista_espera`, `mi_puesto_espera`, `mis_puestos_espera`. |
| `20260927130400_citas_ofertas_notificaciones.sql` | RPC: `cancelar_cita`, `reprogramar_cita`, `aceptar_oferta`, `rechazar_oferta`, `marcar_oferta_vista`, `expirar_mis_ofertas`, `marcar_notificacion_leida`, `marcar_todas_notificaciones_leidas`; `expirar_ofertas_vencidas` (solo servidor). |
| `20260927130500_priorizacion_cupos.sql` | Solo service_role: `candidatos_cupo`, `ofrecer_cupo`, `cerrar_cupo` (las usa la Edge Function). |
| `20260927130600_rls_y_permisos.sql` | RLS en las 11 tablas: `anon` sin acceso; cada paciente lee solo lo suyo; escritura directa solo en las columnas editables de su perfil; lo demás, por RPC. |
| `20260927140000_priorizacion_desde_servidor.sql` | Trigger `cupos_solicitar_priorizacion`: cuando un cupo queda abierto, la base llama a `priorizar-cupo` (pg_net + secreto en Vault). `reprocesar_cupos_abiertos()` (solo servidor). `ofertas.score` deja de ser legible para el paciente. |
| `20261010220000_operacion_ofertas.sql` | Sin candidatos para cupos ya pasados ni para quien tiene cita a esa hora; `cerrar_cupos_vencidos()`; pg_cron: vencimiento de ofertas cada minuto y reproceso de cupos abiertos cada 5 minutos; `notificaciones` en Realtime. |
| `20261015120000_priorizacion_ia.sql` | `ofrecer_cupo` completa `ofertas_factores.tipo` (columna NOT NULL del proyecto real); timeout de pg_net hacia la función de 5 s a 15 s (la IA puede tardar). |
| `20261019120000_notificaciones_referencia.sql` | Trigger que completa `notificaciones.oferta_id` / `cita_id` desde `referencia_id`: el CHECK `chk_notificacion_referencia` del proyecto real hacía fallar `ofrecer_cupo`, `_expirar_oferta` y `aceptar_oferta`. |
| `20261102120000_staff_panel_inasistencias.sql` | Rol staff (`staff`: usuario ↔ consultorio; el trigger de registro no crea paciente si `raw_app_meta_data.rol = 'staff'`), RLS del staff (solo su consultorio; pacientes por iniciales y código), RPC del panel (`cancelar_cita_staff`, `registrar_inasistencia`, `staff_metricas`, `staff_agenda`, `staff_cupos`, `mi_perfil_staff`, `staff_datos_riesgo`) y `riesgo_inasistencia` (escribe solo `guardar_riesgo_inasistencia`, service_role). |
| `20261104120000_riesgo_programado_confirmacion.sql` | Riesgo automático: pg_cron `turnosmart-riesgo-inasistencia` (cada 30 min) → `solicitar_riesgo_programado()` → `predecir-inasistencia` para las citas de los próximos 3 días sin riesgo reciente (`datos_riesgo_programado`, solo service_role). `citas.asistencia_confirmada_en` + RPC `confirmar_asistencia` (paciente). Trigger `riesgo_avisar_paciente`: riesgo «alto» → una notificación «Confirma tu asistencia» (`recordatorio` con `datos.accion`). `staff_agenda` devuelve además la confirmación. |

Todas las funciones son `security definer` con `search_path = ''` y usan
`auth.uid()`; nunca reciben el id del paciente desde la app.

## Pasos manuales en el proyecto (una sola vez)

1. **Revisar el esquema actual.** Las tablas se crearon a mano y la clave
   pública no permite leer su estructura, así que las migraciones asumen
   los tipos de la app (ids `uuid`, `especialidades.id smallint`). Ejecutar
   `supabase/verificar_esquema.sql` en el SQL Editor y comparar. Si alguna
   columna existente tiene otro tipo, ajustar la migración antes de aplicarla.
2. **Un solo trigger de registro.** Si ya existe otro trigger en
   `auth.users` que crea el paciente, borrarlo: el nuevo
   (`on_auth_user_created_crear_paciente`) lo reemplaza.
3. **Aplicar las migraciones**, en orden:
   - con la CLI: `supabase link --project-ref uyxyuqhcmekxjtauieqv` y `supabase db push`, o
   - pegando cada archivo, en orden, en el SQL Editor.
4. **Publicar la Edge Function** (la autentica el secreto compartido, no el JWT del usuario):
   `supabase functions deploy priorizar-cupo --no-verify-jwt`
5. **Secreto compartido entre la base y la función** (un valor largo y aleatorio):
   - en la función: `supabase secrets set PRIORIZAR_CUPO_SECRETO=<secreto>`
   - en la base (SQL Editor):
     ```sql
     select vault.create_secret('https://uyxyuqhcmekxjtauieqv.supabase.co/functions/v1/priorizar-cupo', 'priorizar_cupo_url');
     select vault.create_secret('<secreto>', 'priorizar_cupo_secreto');
     ```
   Sin esta configuración los cupos quedan abiertos (no se pierden) y se
   pueden reprocesar después con `select public.reprocesar_cupos_abiertos();`.
   `MINUTOS_OFERTA` (secret opcional, 10 por defecto) define cuánto dura cada oferta.
6. **Vencimiento en segundo plano (recomendado):** la app vence las ofertas
   propias al abrirlas; para que venzan aunque nadie abra la app, programar
   `select public.expirar_ofertas_vencidas();` con pg_cron (cada minuto). Los
   cupos que quedan abiertos se vuelven a ofrecer solos (trigger).
7. **Correo de recuperación:** la plantilla «Reset password» debe incluir
   `{{ .Token }}` (la app pide el código de 6 dígitos).
8. **Datos de la clínica:** `profesionales`, `consultorios` y las citas de
   reserva directa los carga la clínica (SQL, panel o integración); la app
   no crea citas, solo las recibe al aceptar un cupo.

## Priorización de cupos

La priorización usa IA (DeepSeek) cuando está configurada, con la
estrategia determinista como respaldo: si falta la clave o la IA falla, el
cupo se ofrece igual.

Flujo: un cupo queda abierto (cancelación, rechazo o vencimiento de una
oferta) → el trigger `cupos_solicitar_priorizacion` llama a `priorizar-cupo`
con el secreto compartido → la función obtiene los candidatos
(`candidatos_cupo`), los ordena con la estrategia activa y crea la oferta con
`ofrecer_cupo` (oferta, factores de la explicación, evento «enviada» y
notificación, en una transacción).

- **Quién la invoca:** solo la base de datos. Sin el secreto la función
  responde 401; la app nunca la llama, así que un paciente no puede forzar
  ofertas ni provocar llamadas repetidas.
- **IA (DeepSeek):** pondera disponibilidad (alertas activas), especialidad,
  compatibilidad de horario (franja preferida vs. franja del cupo) y tiempo
  de espera (días y puesto). Es una priorización heurística sobre esos
  datos, no una predicción ni una decisión médica.
  - Una sola solicitud por cupo (máx. 20 candidatos), modelo
    `deepseek-flash` sin razonamiento, temperatura 0 y respuesta en modo JSON.
  - Solo recibe alias (`c1`, `c2`…) y esas señales: nunca ids, nombres,
    cédulas, contacto, especialidad ni datos clínicos.
  - Solo devuelve un score y un peso por factor. La función valida todo
    (alias conocidos y sin repetir, score y pesos entre 0 y 1, exactamente
    los cuatro factores); cualquier dato inválido descarta la respuesta.
    Etiquetas y valores de la explicación los arma el servidor con datos
    reales, así la IA no puede inventar información.
  - No ejecuta SQL ni toca la base: `ofrecer_cupo` crea la oferta y vuelve a
    validar al candidato, el cupo (abierto y futuro) y que no haya duplicados.
  - Cada priorización queda en los logs de la función como
    `{"evento":"priorizacion","estrategia":"ai"|"fallback","motivo":...}`.
- **Estrategia determinista (respaldo):** tiempo en espera, puesto en la
  lista, franja horaria preferida y alertas activas. Toda la lógica está en
  `functions/_shared/priorizacion.ts` y la prueban los tests de la app.
- **Secrets de la IA** (solo en la función; nunca en `app/.env` ni en
  variables `EXPO_PUBLIC_*`):
  - `supabase secrets set DEEPSEEK_API_KEY=<clave>`: sin ella, determinista.
  - Opcionales: `DEEPSEEK_MODEL` (por defecto `deepseek-flash`) y
    `DEEPSEEK_TIMEOUT_MS` (por defecto 8000).
  - Modelo verificado el 2026-11-02 en la documentación oficial
    (api-docs.deepseek.com, «Models & Pricing»): los nombres vigentes son
    `deepseek-flash` (DeepSeek-V4.1-Flash) y `deepseek-v4-pro`. El nombre
    antiguo `deepseek-v4-flash` todavía se acepta, pero ese modelo está
    retirado: no usarlo en `DEEPSEEK_MODEL`. El razonamiento viene activo por
    defecto; la función lo desactiva con `thinking: {"type": "disabled"}`.
- **Probar una oferta real:** procedimiento controlado, con cuentas de
  prueba y limpieza, en [`pruebas/prueba_oferta_real.md`](pruebas/prueba_oferta_real.md).
- **Desplegar:** `supabase db push` y luego
  `supabase functions deploy priorizar-cupo --no-verify-jwt` (la carpeta
  `_shared` se publica junto con la función).
- **Privacidad:** el paciente ve los factores que explican la oferta, nunca
  el score interno (`ofertas.score` no es legible para `authenticated`).
- **Errores:** la función responde mensajes controlados; el detalle técnico
  queda solo en los logs de Supabase.

## Panel del staff y riesgo de inasistencia

- **Rol staff:** un usuario es staff si `auth.users.raw_app_meta_data.rol = 'staff'`
  (solo lo asigna el servidor) y tiene filas activas en `staff`. La app lo
  detecta al iniciar sesión y muestra el panel en lugar de la app del paciente.
- **Privacidad:** el staff no lee `pacientes`, `citas` ni `ofertas`
  directamente; las RPC del panel devuelven al paciente solo con iniciales y
  un código opaco (`P-XXXXXX`) y solo de sus consultorios. Prueba:
  `supabase db query --linked -f supabase/pruebas/rls_staff.sql` (termina en ROLLBACK).
- **Acciones:** «Registrar cancelación» (el paciente avisó por teléfono o en
  recepción) usa `cancelar_cita_staff`, que libera el cupo igual que
  `cancelar_cita` desde la app del paciente (trigger → `priorizar-cupo` con
  IA); el panel sigue el cupo y muestra a quién se ofreció.
  `registrar_inasistencia` marca `no-show` una cita confirmada cuya hora ya
  pasó (no libera cupo: el horario ya transcurrió).
- **Edge Function `predecir-inasistencia`**: se ejecuta **sola** cada 30
  minutos (pg_cron → pg_net, con el secreto compartido de `priorizar-cupo` en
  `x-servidor-secreto`; la URL se deriva de `priorizar_cupo_url`, no hay
  secretos nuevos) para las citas confirmadas de los próximos 3 días sin
  riesgo de las últimas 6 horas; si no hay ninguna, no se llama. El botón
  «Actualizar riesgo» del panel la llama con la sesión del staff (una cita o
  toda la agenda de 14 días). Al tocar el nivel de riesgo se ve la
  explicación. Factores sin datos clínicos:
  historial de asistencia, días de antelación, día y hora (Colombia) y
  respuesta a ofertas previas. El puntaje es determinista
  (`functions/_shared/riesgo.ts`); DeepSeek recibe alias y señales y devuelve
  nivel y explicación breve (es/en) con la misma llamada compartida de
  `functions/_shared/deepseek.ts` (timeout, modo JSON, sin razonamiento). La
  respuesta se valida estrictamente (alias, nivel a ≤ 1 escalón del
  determinista, explicaciones de 10-220 caracteres sin enlaces); si algo
  falla, ese lote usa el nivel y la explicación deterministas. Cada resultado
  queda en `riesgo_inasistencia` con `estrategia` = `ai` o `fallback`.
  - **Aviso al paciente:** si una cita de los próximos 3 días queda en riesgo
    «alto» y el paciente no confirmó, el trigger `riesgo_avisar_paciente`
    crea una sola notificación «Confirma tu asistencia» (Confirmar / Cancelar
    cita). El paciente nunca ve el nivel de riesgo ni la explicación.
  - Comprobar la tarea: `select jobname, schedule, active from cron.job;` y
    `select status_code, content from net._http_response order by created desc limit 5;`
  - Desplegar: `supabase functions deploy predecir-inasistencia --no-verify-jwt`
    (desde el panel valida el token con `auth.getUser` y la RPC exige ser
    staff; en el modo programado exige el secreto compartido).
  - Pruebas: `cd supabase/functions && deno test tests/` y los tests de la app.
- **Preparar la demo en vivo:** `supabase/pruebas/preparar_demo_fase5.sql`
  (cuentas de prueba E2E A/B en la lista de Cardiología y sus citas; guion en
  [`docs/DEMO.md`](../docs/DEMO.md)).
- **Datos demo:** `supabase/pruebas/datos_demo_fase4.sql` (ficticios, correos
  `@turnosmart.test`, consultorio «Consultorio Demo TurnoSmart (ficticio)»).
  Staff demo: `staff.demo@turnosmart.test`; su contraseña se define en el SQL
  Editor (ver el encabezado del archivo).
