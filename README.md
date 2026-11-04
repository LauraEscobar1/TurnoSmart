# TurnoSmart

App móvil para pacientes en Colombia que **recupera las citas médicas que se
liberan** por cancelaciones de último minuto o inasistencias. Cuando alguien
cancela, el servidor ofrece ese cupo al paciente de la lista de espera que
mejor encaja, con una explicación de por qué; el paciente lo acepta en dos
toques. El consultorio tiene un panel con las métricas de recuperación y el
riesgo de inasistencia de sus próximas citas.

## Arquitectura

```
┌───────────────────────┐        ┌─────────────────────────────────────────────┐
│ App (Expo / React     │  RPC   │ Supabase                                    │
│ Native, TypeScript)   │───────▶│  Postgres + RLS (cada paciente ve lo suyo;  │
│  · paciente: ofertas, │◀───────│  el staff, su consultorio, con iniciales)   │
│    citas, avisos      │Realtime│  · cancelar_cita / cancelar_cita_staff      │
│  · staff: panel       │        │      → cupo «abierto» → trigger (pg_net)    │
│  · notificaciones     │        │  · pg_cron: vence ofertas (1 min), reofrece │
│    locales            │        │    cupos (5 min), riesgo automático (30 min)│
└───────────────────────┘        │                                             │
         ▲ invoke (JWT staff)    │  Edge Functions (Deno)                      │
         └──────────────────────▶│  · priorizar-cupo ──────┐                   │
                                 │  · predecir-inasistencia┤──▶ DeepSeek API   │
                                 └─────────────────────────┴───────────────────┘
```

- **La app solo usa la clave pública** (`EXPO_PUBLIC_SUPABASE_ANON_KEY`). Las
  claves de servicio y de DeepSeek viven solo en los secrets de las Edge
  Functions.
- Toda escritura pasa por RPC `security definer` que validan con
  `auth.uid()`; nunca reciben el id del paciente desde la app.
- **Notificaciones:** la base crea filas en `notificaciones`, Realtime las
  publica (RLS: cada paciente recibe las suyas) y la app muestra un aviso
  **local** del sistema (expo-notifications, compatible con Expo Go): «¡Cita
  de último minuto disponible!» abre la oferta; «Confirma tu asistencia»
  (Confirmar / Cancelar cita) abre la cita.

## Dónde está la IA

| Qué | Dónde | Cómo |
|---|---|---|
| Priorizar a quién se ofrece un cupo | `supabase/functions/priorizar-cupo` + `_shared/priorizacion.ts` | La invoca solo la base (trigger + secreto compartido). DeepSeek recibe alias y señales (días en espera, puesto, franja, alertas), sin nombres, cédulas ni datos clínicos, y devuelve un puntaje y pesos por factor. La respuesta se valida estrictamente; si falla o no hay clave, se usa la estrategia determinista. Cada priorización queda como `"ai"` o `"fallback"`. |
| Riesgo de inasistencia | `supabase/functions/predecir-inasistencia` + `_shared/riesgo.ts` | Automático cada 30 min (pg_cron) para las citas de los próximos 3 días, y a pedido desde el panel. El puntaje es determinista; DeepSeek da el nivel (máx. un escalón de diferencia) y una explicación breve es/en. Se guarda con su estrategia (`ai`/`fallback`). Riesgo alto → el paciente recibe «Confirma tu asistencia», sin ver su riesgo. |
| Llamada compartida | `supabase/functions/_shared/deepseek.ts` | Una solicitud en modo JSON, sin razonamiento, temperatura 0 y timeout de 8 s. |

Es una priorización y una estimación para organizar la agenda, no una
decisión médica. Detalles: [`supabase/README.md`](supabase/README.md).

## Estructura

```
app/        App móvil (Expo SDK 58). Pantallas en src/screens, datos en src/services.
supabase/   migrations/ (SQL versionado), functions/ (Edge Functions), pruebas/ (SQL de prueba y demo).
docs/       Arquitectura de información, jerarquía, navegación y DEMO.md (guion de la demo).
```

## Cómo correr el proyecto

**App** (Node.js 20+ y la app Expo Go en el teléfono):

```bash
cd app
npm install
cp .env.example .env      # completar EXPO_PUBLIC_SUPABASE_ANON_KEY (clave pública)
npx expo start --tunnel   # escanear el QR con Expo Go (o --lan en la misma red)
```

**Backend** (Supabase CLI, proyecto ya vinculado):

```bash
supabase db push                                                   # migraciones nuevas
supabase functions deploy priorizar-cupo --no-verify-jwt
supabase functions deploy predecir-inasistencia --no-verify-jwt
```

Secrets y pasos manuales (Vault, DeepSeek): [`supabase/README.md`](supabase/README.md).

**Pruebas:**

```bash
cd app && npm run typecheck && npm test && npx expo-doctor
cd supabase/functions && deno test tests/
```

**Demo:** [`docs/DEMO.md`](docs/DEMO.md).
