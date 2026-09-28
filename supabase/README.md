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
4. **Publicar la Edge Function:**
   `supabase functions deploy priorizar-cupo`
5. **IA (opcional):** `supabase secrets set ANTHROPIC_API_KEY=...`
   Sin la clave, la función prioriza con la estrategia determinista (misma
   explicación, sin el factor «Compatibilidad»). `MINUTOS_OFERTA` (opcional,
   10 por defecto) define cuánto dura cada oferta.
6. **Vencimiento en segundo plano (recomendado):** la app vence las ofertas
   propias al abrirlas; para que venzan aunque nadie abra la app, programar
   `select public.expirar_ofertas_vencidas();` con pg_cron (cada minuto) y
   volver a invocar `priorizar-cupo` para los cupos que quedan abiertos.
7. **Correo de recuperación:** la plantilla «Reset password» debe incluir
   `{{ .Token }}` (la app pide el código de 6 dígitos).
8. **Datos de la clínica:** `profesionales`, `consultorios` y las citas de
   reserva directa los carga la clínica (SQL, panel o integración); la app
   no crea citas, solo las recibe al aceptar un cupo.

## IA

`priorizar-cupo` pide los candidatos (`candidatos_cupo`), los ordena con
una estrategia determinista y, si hay `ANTHROPIC_API_KEY`, le pide a Claude
(`claude-opus-5`, salida estructurada) que los reordene y califique su
compatibilidad. A la IA solo le llegan alias y señales (días de espera,
puesto, franja, alertas), nunca nombres, cédulas ni ids. Ante cualquier
error o rechazo de la IA se usa la estrategia determinista. La lógica
compartida está en `functions/_shared/priorizacion.ts` y la prueban los
tests de la app.
