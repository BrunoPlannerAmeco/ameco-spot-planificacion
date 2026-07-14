# AMECO Spot Planner

Versión: **v1.3.0-arquitectura**

Esta versión reorganiza Firebase y el arranque de la aplicación sin modificar
sus funciones.

```text
js/
  app.js
  config/firebase-config.js
  core/bootstrap.js
  services/storage-adapter.js
  modules/
  utils/
```

La lógica completa continúa en `js/app.js`. Los módulos serán migrados
gradualmente en próximas versiones.
