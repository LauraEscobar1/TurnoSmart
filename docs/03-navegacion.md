# TurnoSmart — Sistema de Navegación

**Proyecto:** TurnoSmart (Mobile)
**Documento:** 3 de 3 — Navegación
**Fecha:** 2026-09-21
**Relacionados:** `01-arquitectura-informacion.md`, `02-jerarquia.md`

---

## 1. Principios de navegación

1. **La oferta de cupo interrumpe el flujo normal.** Es la única notificación que debe poder llevar al usuario directamente a una pantalla de acción (deep link), saltándose la navegación estándar.
2. **Máximo 5 destinos en la navegación primaria** (regla de usabilidad móvil), reflejando las secciones de Nivel 1 definidas en `02-jerarquia.md`.
3. **Reversibilidad:** toda acción (aceptar/rechazar cupo) debe poder revisarse después desde "Mis citas" o "Historial de ofertas"; nada es una navegación de un solo sentido sin registro.
4. **Consistencia de etiquetas** con el glosario de `01-arquitectura-informacion.md` §5 (usar siempre "cupo", "oferta", "cita" con el mismo significado en toda la app).

---

## 2. App para pacientes

### 2.1 Navegación primaria (Tab Bar, siempre visible)

| Ícono/Tab | Etiqueta | Destino (Nivel 1) | Badge |
|---|---|---|---|
| 🏠 | Inicio | Home | — |
| 🎯 | Ofertas | Ofertas de cupo | Nº de ofertas pendientes |
| 📅 | Mis citas | Mis citas | — |
| 🔔 | Notificaciones | Notificaciones | Nº no leídas |
| 👤 | Perfil | Perfil | — |

### 2.2 Navegación secundaria

- **Dentro de "Ofertas"**: tabs internos *Pendiente* / *Historial*.
- **Dentro de "Mis citas"**: tabs internos *Próximas* / *Pasadas*.
- **Dentro de "Perfil"**: lista simple (stack navigation) hacia Datos personales / Preferencias / Ajustes de notificaciones.

### 2.3 Navegación contextual y deep links

| Origen | Trigger | Destino directo |
|---|---|---|
| Push notification "Cupo de último minuto" | Tap en notificación | Detalle de oferta de cupo (salta el tab bar) |
| Push "Recordatorio de cita" | Tap en notificación | Detalle de cita en "Mis citas" |
| Banner in-app de oferta activa (en Home) | Tap en banner | Detalle de oferta de cupo |
| Confirmación de aceptación | Tap en "Ver cita" | Detalle en "Mis citas → Próximas" |

### 2.4 Flujo de navegación crítico (aceptar cupo de última hora)

```
[Notificación push]
      │ tap
      ▼
[Detalle de oferta] ── (temporizador visible: tiempo restante para responder)
      │
      ├── Aceptar ──► [Confirmación] ──► [Mis citas › Próximas] (auto-navegación tras 2s)
      │
      └── Rechazar ──► [Confirmación de rechazo] ──► [Home]
```

- El temporizador de expiración es un elemento de navegación implícito: si el usuario no actúa, el sistema navega automáticamente a un estado "Oferta expirada" y libera el cupo para el siguiente candidato (esto ocurre server-side / vía IA, pero debe reflejarse visualmente si el usuario reabre la app).

### 2.5 Navegación de retroceso (back)

- Back desde "Detalle de oferta" (llegando por deep link) → Home, no a una pantalla intermedia inexistente.
- Back desde cualquier detalle dentro de un tab → regresa al listado de ese mismo tab (nunca cruza a otro tab).
- Gesto de "swipe back" habilitado en toda navegación tipo stack (iOS/Android estándar).

---

## 3. Panel (personal de consultorio)

### 3.1 Navegación primaria (Sidebar, siempre visible en desktop/tablet)

| Sección | Destino |
|---|---|
| Dashboard | Home del panel |
| Cupos | Abiertos / Recuperados / Perdidos |
| Agenda | Por profesional / Por especialidad |
| Pacientes | Buscador + fichas |
| Reportes | Tasa de recuperación / Inasistencias evitadas |
| Configuración | Reglas de priorización IA |

### 3.2 Navegación contextual

| Origen | Acción | Destino |
|---|---|---|
| Dashboard → alerta de cancelación | Click | Detalle del cupo abierto generado por esa cancelación |
| Dashboard → alerta de riesgo de inasistencia | Click | Ficha del paciente + detalle de la cita en riesgo |
| Listado de cupos abiertos | Click en fila | Detalle: pacientes contactados, estado, tiempo de respuesta |
| Ficha de paciente | Click en cita histórica | Detalle de esa cita |

### 3.3 Breadcrumbs

El panel usa breadcrumbs para reforzar profundidad (regla de máximo 3 clics de `02-jerarquia.md` §5):

```
Dashboard › Cupos › Abiertos › Detalle #A234
```

---

## 4. Notificaciones como capa de navegación transversal

Las notificaciones no son solo contenido (ver `01-arquitectura-informacion.md` §3.4): son **puntos de entrada a la navegación**. Reglas:

- Toda notificación de "cupo disponible" lleva a un deep link accionable, nunca solo informativo.
- Toda notificación debe poder rastrearse después en "Notificaciones → Listado", incluso si ya fue atendida.
- El panel recibe notificaciones internas (ej. "cupo a punto de expirar sin respuesta") que navegan directo al detalle del cupo en cuestión.

---

## 5. Consistencia de etiquetas de navegación

| Etiqueta usada en nav | No usar como sinónimo |
|---|---|
| Ofertas | "Cupos" (ese término es solo del panel) |
| Mis citas | "Agenda" (ese término es solo del panel) |
| Cupo | "Turno", "Espacio", "Slot" |

Esto asegura que un mismo concepto (definido en el glosario de `01-arquitectura-informacion.md`) tenga una sola etiqueta de navegación en cada producto, evitando ambigüedad para el usuario.
