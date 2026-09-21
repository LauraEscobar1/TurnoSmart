# TurnoSmart — Arquitectura de Información (AI)

**Proyecto:** TurnoSmart (Mobile)
**Documento:** 1 de 3 — Arquitectura de Información
**Fecha:** 2026-09-21
**Relacionados:** `02-jerarquia.md`, `03-navegacion.md`

---

## 1. Contexto del producto

TurnoSmart resuelve la pérdida de cupos médicos por cancelaciones e inasistencias, conectando esos espacios liberados con pacientes en lista de espera mediante priorización asistida por IA.

| Elemento | Descripción |
|---|---|
| Problema | Cancelaciones/inasistencias generan huecos en la agenda que no se recuperan; otros pacientes no encuentran disponibilidad. |
| Solución | Detectar cupos libres y ofrecerlos activamente a pacientes con alta probabilidad de aceptarlos. |
| Rol de la IA | Prioriza pacientes según disponibilidad, especialidad, horario y tiempo de espera; predice inasistencias. |
| Componentes a construir | App paciente · Panel administrativo/clínico · Motor de IA · Notificaciones |

---

## 2. Usuarios y objetos de dominio

### 2.1 Tipos de usuario

1. **Paciente** — usa la app móvil para recibir y aceptar cupos.
2. **Personal de consultorio / administrador** — usa el panel web para gestionar cancelaciones y cupos recuperados.
3. **Sistema de IA** — actor no humano que prioriza y predice, pero cuyas decisiones deben ser visibles y auditables por el usuario administrador.

### 2.2 Entidades principales (content inventory)

| Entidad | Atributos clave | Dónde vive |
|---|---|---|
| **Cita/Turno** | id, especialidad, profesional, fecha/hora, estado (activa, cancelada, reasignada, no-show), origen | App paciente, Panel |
| **Cupo liberado** | id, cita origen, motivo de liberación, ventana de tiempo disponible, estado (abierto, ofrecido, tomado, expirado) | Panel, motor IA |
| **Paciente** | id, historial de citas, especialidades de interés, preferencias de horario, tiempo de espera actual, score de probabilidad de aceptación/inasistencia | App paciente, IA |
| **Notificación** | tipo (cupo disponible, recordatorio, confirmación), canal, estado de lectura, cita asociada | App paciente |
| **Predicción de inasistencia** | cita asociada, score de riesgo, factores considerados | Panel, IA |
| **Especialidad/Profesional** | nombre, consultorio, horarios de atención | Panel, App paciente |

---

## 3. Inventario de contenido y funcionalidades por módulo

### 3.1 App para pacientes
- Listado de citas propias (próximas / pasadas)
- Recepción de oferta de cupo (push/in-app)
- Detalle de cupo ofrecido (especialidad, profesional, fecha/hora, ubicación)
- Acción: aceptar / rechazar cupo
- Confirmación de cita
- Preferencias del paciente (especialidades, horarios, radio de disponibilidad)
- Historial de citas
- Perfil y datos de contacto

### 3.2 Panel (personal de consultorio)
- Dashboard de cancelaciones en tiempo real
- Listado de cupos recuperados vs. perdidos (KPI)
- Detalle de cada cupo: a quién se ofreció, estado, tiempo de respuesta
- Configuración de reglas de priorización (parámetros visibles al staff)
- Reportes/analítica (tasa de recuperación, inasistencias evitadas)
- Gestión de agenda por profesional/especialidad

### 3.3 Motor de IA (no es una pantalla, pero produce contenido visible)
- Score de priorización por paciente-cupo
- Predicción de inasistencia por cita
- Explicabilidad mínima (qué factores influyeron) visible en el panel

### 3.4 Notificaciones
- Notificación de cupo de último minuto (push)
- Recordatorio de cita próxima
- Confirmación de aceptación/rechazo
- Alerta de expiración de oferta

---

## 4. Organización de la información (esquema de clasificación)

Se aplica un esquema **híbrido**:

- **Por tarea** en la app de pacientes (ver mis citas → aceptar cupo → confirmar), porque el paciente llega con una intención puntual.
- **Por audiencia** entre app y panel, ya que son dos productos con objetivos distintos sobre los mismos datos.
- **Cronológico** dentro de listados de citas (próximas primero, luego historial).
- **Por prioridad/urgencia** en las ofertas de cupos y en las alertas del panel (los cupos con ventana de expiración corta se destacan primero).

## 5. Vocabulario controlado (etiquetado)

Para mantener consistencia entre app y panel, se define el mismo lenguaje en ambos productos:

| Término | Uso |
|---|---|
| **Cupo disponible** | Espacio liberado por cancelación/inasistencia, aún no tomado |
| **Oferta** | Cupo enviado a un paciente específico, pendiente de respuesta |
| **Cupo recuperado** | Cupo que fue aceptado y confirmado por un paciente |
| **Cupo perdido** | Cupo que expiró sin ser tomado por nadie |
| **Riesgo de inasistencia** | Score de IA sobre probabilidad de no-show de una cita ya agendada |

Mantener este glosario evita que la app diga "turno" y el panel diga "cita" para el mismo concepto (ver `03-navegacion.md` §5 para etiquetas de navegación).

---

## 6. Modelo mental y flujos críticos

```
Cancelación/inasistencia detectada
        │
        ▼
IA calcula prioridad de pacientes candidatos
        │
        ▼
Oferta enviada (notificación push) al paciente top-N
        │
   ┌────┴────┐
   ▼         ▼
Acepta     Rechaza / no responde (timeout)
   │              │
   ▼              ▼
Cita confirmada   IA reasigna al siguiente candidato
   │
   ▼
Panel actualiza cupo como "recuperado"
```

Este flujo es el eje que organiza tanto la app (todo gira en torno a "recibir y responder ofertas") como el panel (todo gira en torno a "monitorear y auditar ese ciclo").

---

## 7. Alcance de este documento

Este documento define **qué información existe y cómo se agrupa**. La estructura jerárquica de pantallas está en `02-jerarquia.md` y los patrones de navegación entre ellas están en `03-navegacion.md`.
