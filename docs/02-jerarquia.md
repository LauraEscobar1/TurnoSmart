# TurnoSmart — Jerarquía de Contenidos y Pantallas

**Proyecto:** TurnoSmart (Mobile)
**Documento:** 2 de 3 — Jerarquía
**Fecha:** 2026-09-21
**Relacionados:** `01-arquitectura-informacion.md`, `03-navegacion.md`

---

## 1. Criterio de jerarquización

La jerarquía prioriza **la acción de mayor valor de negocio primero**: aceptar un cupo ofrecido. Todo lo demás (historial, preferencias, perfil) es secundario y vive un nivel más abajo. Se aplica el mismo criterio en el panel: recuperar cupos visibles antes que configuración.

Niveles definidos:
- **Nivel 0** — Producto (App Paciente / Panel)
- **Nivel 1** — Secciones principales (accesibles desde navegación primaria)
- **Nivel 2** — Sub-secciones o listados
- **Nivel 3** — Detalle / acción puntual
- **Nivel 4** — Confirmaciones y estados terminales

---

## 2. App para pacientes — Mapa jerárquico

```
Nivel 0 — TurnoSmart App
│
├── Nivel 1 — Inicio (Home)
│   ├── Nivel 2 — Oferta de cupo activa (si existe) [prioridad máxima, siempre visible]
│   └── Nivel 2 — Próxima cita confirmada
│
├── Nivel 1 — Ofertas de cupo
│   ├── Nivel 2 — Oferta pendiente (detalle)
│   │   ├── Nivel 3 — Aceptar
│   │   │   └── Nivel 4 — Confirmación de cita
│   │   └── Nivel 3 — Rechazar
│   │       └── Nivel 4 — Confirmación de rechazo
│   └── Nivel 2 — Historial de ofertas (aceptadas/expiradas/rechazadas)
│
├── Nivel 1 — Mis citas
│   ├── Nivel 2 — Próximas
│   │   └── Nivel 3 — Detalle de cita (reprogramar / cancelar)
│   └── Nivel 2 — Pasadas
│       └── Nivel 3 — Detalle de cita pasada
│
├── Nivel 1 — Notificaciones
│   └── Nivel 2 — Listado (cupo último minuto, recordatorio, confirmación)
│
└── Nivel 1 — Perfil
    ├── Nivel 2 — Datos personales
    ├── Nivel 2 — Preferencias (especialidades, horarios, radio)
    └── Nivel 2 — Ajustes de notificaciones
```

### 2.1 Justificación de niveles clave

| Elemento | Nivel | Por qué |
|---|---|---|
| Oferta de cupo activa | 2, pero **expuesta desde Nivel 1 (Home)** | Es la razón de ser de la app; debe verse sin navegar. |
| Mis citas | 1 | Segunda necesidad más frecuente (ver lo que ya tengo confirmado). |
| Perfil / preferencias | 1 pero al final | Configuración de baja frecuencia de uso, no compite con la acción principal. |

---

## 3. Panel (personal de consultorio) — Mapa jerárquico

```
Nivel 0 — TurnoSmart Panel
│
├── Nivel 1 — Dashboard
│   ├── Nivel 2 — Cancelaciones recientes (tiempo real)
│   ├── Nivel 2 — Cupos recuperados vs. perdidos (KPI)
│   └── Nivel 2 — Alertas de inasistencia predicha
│
├── Nivel 1 — Cupos
│   ├── Nivel 2 — Cupos abiertos
│   │   └── Nivel 3 — Detalle (a quién se ofreció, estado, tiempo de respuesta)
│   ├── Nivel 2 — Cupos recuperados
│   └── Nivel 2 — Cupos perdidos (expirados)
│
├── Nivel 1 — Agenda
│   ├── Nivel 2 — Por profesional
│   └── Nivel 2 — Por especialidad
│
├── Nivel 1 — Pacientes
│   └── Nivel 2 — Ficha de paciente (historial, score, preferencias)
│
├── Nivel 1 — Reportes
│   ├── Nivel 2 — Tasa de recuperación de cupos
│   └── Nivel 2 — Inasistencias evitadas
│
└── Nivel 1 — Configuración
    └── Nivel 2 — Reglas de priorización de IA (parámetros visibles)
```

---

## 4. Jerarquía visual (peso relativo en pantalla)

Para cada nivel se define el peso visual esperado, de forma que el diseño visual respete esta jerarquía de información:

| Prioridad | App Paciente | Panel |
|---|---|---|
| 1 (máxima) | Tarjeta de oferta de cupo activa | KPI de cupos en riesgo de perderse hoy |
| 2 | Próxima cita confirmada | Cancelaciones recientes sin cupo asignado |
| 3 | Notificaciones no leídas | Cupos recuperados (histórico corto) |
| 4 | Historial / perfil | Reportes y configuración |

---

## 5. Reglas de profundidad

- Ninguna acción crítica (aceptar/rechazar cupo) debe requerir más de **2 toques** desde que se abre la notificación.
- El panel no debe requerir más de **3 clics** desde el Dashboard para llegar al detalle de un cupo específico.
- La configuración de reglas de IA se aísla deliberadamente en el nivel más profundo del panel: es de uso infrecuente y de alto riesgo si se edita por error.
