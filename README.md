# AMECO Spot Planner v3.0.0 — HTML Rebuild

Esta versión reinicia el desarrollo tomando como referencia directa el diseño
y los módulos de `control_personal (15)(1).html`.

## Conservado

- Diseño lateral oscuro y acento naranja.
- Dashboard con indicadores y alertas.
- Trabajadores y ficha completa.
- Importación desde Excel.
- Exportación profesional a Excel.
- Llamados.
- Pasajes.
- Documentos y exámenes.
- Acreditaciones por faena.
- Certificaciones de equipos.
- Turnos configurables y matriz interactiva.
- Edición masiva, arrastre y deshacer.

## Cambiado

- Marca visible: AMECO Spot Planner.
- Login con Firebase Authentication.
- Datos compartidos mediante Firebase Realtime Database.
- Migración automática de datos existentes desde las colecciones v2 cuando
  todavía no existe el respaldo unificado.
- Se eliminaron los trabajadores de demostración.
- Se agregó cierre de sesión.
- Se mantiene un único `index.html` para evitar problemas de rutas al subir
  desde el navegador a GitHub.

## Datos

La aplicación usa temporalmente:

```text
amecoSpotPlanner/legacyStorage/
```

El objetivo de las siguientes versiones será separar internamente cada módulo
sin cambiar el diseño ni perder funciones.
