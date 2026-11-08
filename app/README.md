# TurnoSmart — App de pacientes (Mobile)

App móvil (React Native + Expo + TypeScript) para el caso de estudio TurnoSmart.
Implementa el flujo de **recibir y aceptar cupos liberados por cancelaciones/inasistencias**
y el **panel del staff** del consultorio. Visión general, arquitectura e IA: [`../README.md`](../README.md).

Esta estructura sigue directamente los documentos de diseño en `../docs/`:

- `../docs/01-arquitectura-informacion.md` → entidades en `src/types/domain.ts` y datos mock en `src/data/mockData.ts`.
- `../docs/02-jerarquia.md` → organización de `src/screens/` por sección de Nivel 1.
- `../docs/03-navegacion.md` → `src/navigation/` (tab bar + stacks + deep link de ofertas).

## Cómo correrla

Requisitos: Node.js 20+ y npm. No requiere Mac/Xcode para probar (usa la app Expo Go en tu celular).

```bash
cd app
npm install
cp .env.example .env      # solo la clave PÚBLICA de Supabase
npx expo start --tunnel   # o `npm start` si el celular está en la misma red
```

Luego escanea el código QR con la app **Expo Go** (iOS/Android) o presiona `i`/`a` en la terminal para abrir un simulador, si lo tienes instalado.

Verificación: `npm run typecheck`, `npm test` y `npx expo-doctor`.

### Notificaciones

Son **locales** (expo-notifications), así funcionan en Expo Go también en
Android: Supabase Realtime avisa cada fila nueva de `notificaciones` y la app
muestra el aviso del sistema (`src/services/notificacionesLocales.ts`,
`src/components/AvisosLocales.tsx`). Llegan con la app abierta o recién pasada
a segundo plano; lo demás queda en la pestaña Notificaciones. Push remotas
requerirían un development build.

### Ingreso con Face ID (biometría)

Tras el primer ingreso con correo y contraseña, la app pregunta una sola vez
si quieres ingresar con Face ID la próxima vez. Si aceptas, guarda en el
llavero del teléfono (`expo-secure-store`) el **refresh token** de Supabase,
nunca la contraseña, y lo actualiza cada vez que Supabase lo renueva. Desde
entonces la app abre en Iniciar sesión y entra con la biometría
(`expo-local-authentication`). Se activa o desactiva en Perfil, y se borra al
cerrar sesión o si el token vence (ahí pide correo y contraseña).
Código: `src/services/biometriaService.ts`.

- **Expo Go (iOS):** Expo Go no tiene permiso de Face ID, así que el sistema
  pide el **código del teléfono** y el botón dice «Ingresar con el código del
  teléfono».
- **Face ID real:** requiere un development build (`npx expo run:ios` o EAS
  Build), que incluye el permiso `faceIDPermission` del plugin de
  `expo-local-authentication` en `app.json`.

## Estructura de carpetas

```
app/
├── App.tsx                        # Punto de entrada
├── app.json                       # Configuración de Expo
├── package.json
├── tsconfig.json
├── babel.config.js
└── src/
    ├── navigation/                 # Ver docs/03-navegacion.md
    │   ├── types.ts                 # Tipos de rutas y parámetros
    │   ├── RootNavigator.tsx        # Stack raíz: Tabs + OfferDetail (modal) + OfferConfirmation
    │   ├── TabNavigator.tsx         # Tab bar primaria (5 destinos, Nivel 1)
    │   ├── OffersNavigator.tsx      # Stack de "Ofertas"
    │   ├── AppointmentsNavigator.tsx# Stack de "Mis citas"
    │   └── ProfileNavigator.tsx     # Stack de "Perfil"
    │
    ├── screens/                    # Ver docs/02-jerarquia.md — una carpeta por sección de Nivel 1
    │   ├── Home/HomeScreen.tsx
    │   ├── Offers/
    │   │   ├── OffersListScreen.tsx
    │   │   ├── OfferDetailScreen.tsx
    │   │   └── OfferConfirmationScreen.tsx
    │   ├── Appointments/
    │   │   ├── AppointmentsListScreen.tsx
    │   │   └── AppointmentDetailScreen.tsx
    │   ├── Notifications/NotificationsScreen.tsx
    │   └── Profile/
    │       ├── ProfileHomeScreen.tsx
    │       ├── PersonalDataScreen.tsx
    │       └── PreferencesScreen.tsx
    │
    ├── components/                 # Piezas de UI reutilizables entre pantallas
    │   ├── OfferCard.tsx            # Tarjeta de mayor prioridad visual (docs/02-jerarquia.md §4)
    │   ├── AppointmentCard.tsx
    │   ├── PrimaryButton.tsx
    │   ├── Badge.tsx
    │   └── EmptyState.tsx
    │
    ├── types/domain.ts             # Entidades: Cita, OfertaCupo, Paciente, Notificacion
    ├── data/mockData.ts            # Datos de ejemplo (los usan las pruebas)
    ├── services/                   # Capa de datos sobre Supabase (RPC, RLS, Realtime)
    │   ├── offersService.ts
    │   ├── appointmentsService.ts
    │   └── notificationsService.ts
    └── theme/                      # Colores y espaciados centralizados
        ├── colors.ts
        └── spacing.ts
```

## Decisiones de arquitectura

- **Separación pantalla / servicio**: ninguna pantalla llama datos "a mano"; todas pasan por `src/services/*`, que hablan con Supabase. Las pruebas reemplazan el cliente por un Supabase falso en memoria (`src/test-utils/supabaseFalso.ts`).
- **`OfferDetail` vive en el stack raíz, no dentro del tab de Ofertas**: se llega a ella desde tres lugares distintos (Home, Ofertas, notificación push), tal como exige el flujo crítico de `docs/03-navegacion.md §2.4`.
- **Vocabulario controlado**: los nombres de tipos y variables (`OfertaCupo`, `Cita`, `cupo`, `oferta`) respetan el glosario de `docs/01-arquitectura-informacion.md §5`, para que el código hable el mismo idioma que los documentos de diseño.

## Próximos pasos sugeridos

1. Push remotas (development build + Expo Push) para avisar con la app cerrada.
2. Agenda real de profesionales para reprogramar (hoy se proponen horarios fijos).
