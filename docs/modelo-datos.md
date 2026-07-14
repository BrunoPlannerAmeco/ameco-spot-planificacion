# Modelo de datos — AMECO Spot Planner

## Entidades principales

- Trabajadores
- Faenas
- Plataformas externas de acreditación
- Requisitos por faena
- Acreditaciones
- Documentos
- Servicios
- Requerimientos de personal
- Asignaciones
- Llamados
- Pasajes
- Tareas diarias
- Usuarios y auditoría

## Relaciones

```text
Trabajador
 ├─ Documentos
 ├─ Acreditaciones ─ Faena ─ Plataforma externa
 ├─ Turno y disponibilidad
 ├─ Asignaciones ─ Servicio
 ├─ Llamados
 └─ Pasajes
```

MyPass, WebControl y otros portales se registran como plataformas externas.
AMECO Spot Planner centraliza el seguimiento interno, pero no reemplaza esos sistemas.
