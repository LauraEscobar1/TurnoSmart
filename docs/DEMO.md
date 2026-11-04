# TurnoSmart — Guion de la demo (5-7 minutos)

**Historia:** un paciente cancela su cita en la app → la IA decide a quién
ofrecer el cupo → otro paciente recibe la notificación y lo acepta → el panel
del consultorio muestra el cupo recuperado y el riesgo de inasistencia de las
próximas citas. **Extra:** el staff registra una cancelación que llegó por
teléfono.

## Cuentas

Las contraseñas no están en el repositorio: las tiene quien presenta.

| Rol | Correo | Dónde |
|---|---|---|
| Paciente A (cancela) | `turnosmart.e2e.a@example.com` | Teléfono 1 |
| Paciente B (recibe la oferta) | `turnosmart.e2e.b@example.com` | Teléfono 2 |
| Staff del consultorio | `staff.demo@turnosmart.test` | Teléfono 1 (después de A) o un tercer teléfono |

Todo ocurre en **Cardiología**, en el «Consultorio Demo TurnoSmart (ficticio)»
con la «Dra. Demo Ficticia». Los demás pacientes de la agenda son ficticios
(`@turnosmart.test`) y aparecen solo con iniciales y código.

## Preparación (15 minutos antes)

1. **Datos de la demo** (cuentas de prueba y datos ficticios; se puede repetir):
   ```bash
   supabase db query --linked -f supabase/pruebas/preparar_demo_fase5.sql
   ```
   Debe responder `en_espera_cardiologia = 2` y una `cita_paciente_a` futura.
   Deja a B (y a A) en la lista de espera de Cardiología, saca de esa lista a
   los pacientes ficticios y crea la cita de A que se va a cancelar.
2. **Comprobar el backend** (SQL Editor o `supabase db query --linked`):
   ```sql
   select jobname, schedule, active from cron.job;  -- 3 tareas turnosmart-*, activas
   select status_code, content from net._http_response order by created desc limit 3;
   ```
3. **Correr la app** (el túnel permite usar teléfonos en otra red):
   ```bash
   cd app && npx expo start --tunnel
   ```
   Escanear el QR con **Expo Go** en los dos teléfonos.
4. **Teléfono 2:** ingresar como **B**, aceptar el permiso de notificaciones
   (la app explica para qué es) y dejar la app **abierta en Inicio**. Las
   notificaciones son locales: llegan mientras la app está abierta o recién
   pasada a segundo plano (no hay push remotas en Expo Go).
5. **Teléfono 1:** ingresar como **A** y abrir *Mis citas*.
6. Subir el volumen y desactivar «No molestar» en ambos teléfonos.

## Guion

| Min | Qué se hace | Qué se dice |
|---|---|---|
| 0:00 | Presentar el problema con la pantalla de Inicio de A. | En Colombia muchos cupos médicos se pierden por cancelaciones de último minuto e inasistencias. TurnoSmart los recupera. |
| 0:45 | **Teléfono 1 (A):** *Mis citas* → la cita de Cardiología → **Cancelar cita** → **Sí, cancelar cita**. | Cancelar libera el cupo al instante; la app no decide a quién va: lo hace el servidor. |
| 1:30 | Esperar 3-8 s. **Teléfono 2 (B):** llega **«La IA de TurnoSmart encontró un cupo para ti»** (si DeepSeek falló, «¡Cita de último minuto disponible!»). | La base dispara la Edge Function `priorizar-cupo`; DeepSeek ordena a los candidatos con datos anónimos (alias, días en espera, puesto, franja horaria, alertas) y el servidor valida la respuesta antes de crear la oferta. |
| 2:15 | **B** toca la notificación → se abre la oferta con su contador, la insignia **«Recomendado por IA»** y **«Por qué la IA te recomienda este turno»**. | La IA no ve nombres, cédulas ni datos clínicos, y el paciente ve los motivos, nunca un puntaje. |
| 2:45 | **B** → **Aceptar cupo** → «Cupo confirmado». | Dos toques: la cita queda creada en una transacción. |
| 3:15 | **Teléfono 1:** cerrar sesión (Perfil) e ingresar como **staff**. | El mismo login: el rol lo asigna el servidor y el staff solo ve su consultorio. |
| 3:45 | Panel: métricas (cancelaciones, cupos liberados, **cupos recuperados**, tasa). Pestaña **Cupos**: el cupo de A en «Recuperado» con la oferta «Aceptada». | Así mide la clínica cuántas citas recupera. |
| 4:30 | Pestaña **Agenda**: badges de riesgo. Tocar un **«Riesgo alto»** para ver la explicación («Estimado con IA»). | El riesgo se calcula solo cada 30 minutos (pg_cron) para los próximos 3 días. Es una estimación para organizar la agenda, no una decisión sobre el paciente. Si el riesgo es alto, el paciente recibe «Confirma tu asistencia», sin ver su nivel de riesgo. |
| 5:15 | **Extra:** en la cita de Julián (demo) → **Registrar cancelación** → Confirmar. | Para cuando el paciente avisa por teléfono o en recepción. |
| 5:30 | Esperar el aviso: «… se ofreció a PE · P-XXXXXX de la lista de espera». | El mismo flujo con IA que la cancelación desde la app: ahora el candidato es A, que seguía en espera. |
| 6:00 | Cierre. | Cupos que se pierden → cupos que se recuperan, con IA explicable y datos mínimos. |

## Plan B

**Si falla DeepSeek** (sin saldo, caída o demora de más de 8 s): no hay que
hacer nada. La función usa la priorización determinista (tiempo en espera,
puesto, franja y alertas) y la oferta llega igual; en el panel el riesgo dice
«Estimado con reglas». Mostrar que el sistema no depende de la IA para
funcionar. Para saber qué estrategia se usó:

```sql
select content from net._http_response order by created desc limit 3;  -- "estrategia":"ai" o "fallback"
select estrategia, count(*) from public.ofertas group by 1;               -- lo que ve el paciente
select estrategia, count(*) from public.riesgo_inasistencia group by 1;
```

**Si falla el túnel o la red del lugar:**

1. Compartir datos desde un teléfono (hotspot), conectar el computador y los
   dos teléfonos a esa red y usar `cd app && npx expo start --lan`.
2. Sin internet no hay Supabase, así que el flujo real no puede correr.
   Mostrar entonces:
   - las pruebas automáticas, que recorren el mismo flujo con un Supabase
     falso: `cd app && npm test -- notificacionesLocales panelStaff operacion`;
   - las pruebas de la IA y su respaldo: `cd supabase/functions && deno test tests/`;
   - la grabación del ensayo (grabar la pantalla de ambos teléfonos durante
     el ensayo general).

**Si la notificación no aparece en B:** la oferta igual se ve en Inicio y en
*Ofertas* (llega en vivo por Realtime). Revisar que B tenga la app abierta y
el permiso concedido (Perfil → alertas activas).

**Si no hay candidatos** (aviso «No hay pacientes en lista de espera…»):
volver a ejecutar `preparar_demo_fase5.sql` (B ya aceptó y salió de la lista).

**Para repetir el ensayo:** ejecutar otra vez `preparar_demo_fase5.sql`; crea
una nueva cita para A y vuelve a poner a A y B en la lista de espera.
