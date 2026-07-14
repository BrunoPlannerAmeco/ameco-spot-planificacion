# AMECO Spot Planner

Versión: **v1.1.0-refactor**

## Objetivo de esta versión

Reorganizar el sistema original sin alterar su funcionamiento:

- `index.html`: estructura principal.
- `css/styles.css`: estilos visuales.
- `js/app.js`: lógica completa de la aplicación.

## Importante

Esta versión todavía utiliza `window.storage`, igual que el archivo original.  
La conexión definitiva con Firebase se realizará en la versión `v1.2.0`.

## Probar localmente

No abras `index.html` directamente si el entorno donde lo pruebes no proporciona `window.storage`.

Para revisar la estructura puedes usar un servidor local, aunque las funciones de guardado seguirán dependiendo del almacenamiento original hasta la migración a Firebase.

## Siguiente versión

**v1.2.0 — Integración Firebase**

- Realtime Database.
- Authentication.
- Sincronización entre usuarios.
- Migración de la capa de almacenamiento.
