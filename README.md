# AMECO Spot Planner v2.0.0 Dashboard

Primera base limpia de la versión 2.

## Incluye

- Login con Firebase Authentication.
- Arquitectura modular única.
- Navegación centralizada.
- Centro de Operaciones.
- Indicadores conectados a Firebase.
- Acciones rápidas.
- Rutas reservadas para todos los módulos futuros.
- Compatible con GitHub Pages.

## Estructura

```text
index.html
css/styles.css
js/config/firebase-config.js
js/core/bootstrap.js
js/core/router.js
js/core/state.js
js/services/firebase-service.js
js/modules/login.js
js/modules/shell.js
js/modules/dashboard.js
```

## Principio técnico

Todos los módulos comparten:

- una sola sesión;
- una sola navegación;
- un solo estado;
- un solo servicio de Firebase;
- una sola estructura de datos.

No se reutiliza el código heredado de la versión 1 para evitar duplicaciones y conflictos.
