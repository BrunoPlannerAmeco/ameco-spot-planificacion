# AMECO Spot Planner

Versión: **v1.5.0-trabajadores**

## Módulo funcional agregado

- Listado de trabajadores.
- Búsqueda por nombre, RUT, cargo, empresa, faena o ciudad.
- Alta de trabajadores.
- Edición de fichas.
- Eliminación.
- Estado activo, pendiente o inactivo.
- Configuración inicial del turno 14×14.
- Guardado directo en Firebase Realtime Database.
- Sincronización entre usuarios conectados.

## Ruta de datos

```text
amecoSpotPlanner/workers/{workerId}
```

## Acceso

Solo usuarios autenticados pueden leer o modificar trabajadores.
