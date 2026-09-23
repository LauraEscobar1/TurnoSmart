# TurnoSmart — App de pacientes (Mobile)

App móvil (React Native + Expo + TypeScript) para el caso de estudio TurnoSmart.
Implementa el flujo de **recibir y aceptar cupos liberados por cancelaciones/inasistencias**.

Esta estructura sigue directamente los documentos de diseño en `../docs/`:

- `../docs/01-arquitectura-informacion.md` → entidades en `src/types/domain.ts` y datos mock en `src/data/mockData.ts`.
- `../docs/02-jerarquia.md` → organización de `src/screens/` por sección de Nivel 1.
- `../docs/03-navegacion.md` → `src/navigation/` (tab bar + stacks + deep link de ofertas).

## Cómo correrla

Requisitos: Node.js 18+ y npm. No requiere Mac/Xcode para probar (usa la app Expo Go en tu celular).

```bash
cd app
npm install
npm start
```

Luego escanea el código QR con la app **Expo Go** (iOS/Android) o presiona `i`/`a` en la terminal para abrir un simulador, si lo tienes instalado.

> Nota: este scaffold se generó sin conexión de terminal al equipo, así que `npm install` aún no se ha ejecutado. Es el primer paso pendiente antes de correr la app.

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
    ├── data/mockData.ts            # Datos de ejemplo para desarrollar sin backend
    ├── services/                   # Capa de datos — hoy usa mocks, mañana la API real
    │   ├── offersService.ts
    │   ├── appointmentsService.ts
    │   └── notificationsService.ts
    └── theme/                      # Colores y espaciados centralizados
        ├── colors.ts
        └── spacing.ts
```

## Decisiones de arquitectura

- **Separación pantalla / servicio**: ninguna pantalla llama datos "a mano"; todas pasan por `src/services/*`. Cuando exista el backend real, solo se reescribe el contenido de esos archivos — las pantallas no cambian.
- **`OfferDetail` vive en el stack raíz, no dentro del tab de Ofertas**: se llega a ella desde tres lugares distintos (Home, Ofertas, notificación push), tal como exige el flujo crítico de `docs/03-navegacion.md §2.4`.
- **Vocabulario controlado**: los nombres de tipos y variables (`OfertaCupo`, `Cita`, `cupo`, `oferta`) respetan el glosario de `docs/01-arquitectura-informacion.md §5`, para que el código hable el mismo idioma que los documentos de diseño.

## Próximos pasos sugeridos

1. `npm install` y correr en Expo Go para validar la navegación.
2. Reemplazar `src/data/mockData.ts` y los `services/*` por llamadas reales cuando exista la API/backend.
3. Conectar notificaciones push reales (Expo Notifications) para el deep link de "cupo de último minuto".
4. Diseño visual (Design System) — cuando esté listo, migrar los estilos inline de `theme/` a los tokens definitivos de marca.
