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


## v3.1.0 — Eliminación masiva

- Modo de selección dentro de Trabajadores.
- Selección individual mediante tarjetas.
- Seleccionar o desmarcar todos los resultados visibles.
- Compatible con búsqueda y filtro por cargo.
- Eliminación grupal con confirmación.
- Limpieza de llamados, pasajes y archivos asociados.
- La eliminación individual ahora también limpia datos relacionados.


## v3.2.0 — Cargos y filtros

- La barra de Trabajadores muestra solo:
  - Importar desde Excel.
  - Nuevo trabajador.
  - Eliminar varios.
  - Exportar Excel.
- Se ocultaron Guardar, Firebase, correo, Cerrar sesión y el indicador Guardado en la vista Trabajadores.
- Turnos 14×14 permite filtrar trabajadores por cargo.
- El filtro de cargo puede combinarse con el filtro por faena.
- Se agregó el menú Configuración.
- Configuración permite crear cargos y eliminar cargos sin trabajadores asignados.
- Los cargos nuevos aparecen automáticamente en fichas y filtros.


## v3.3.0 — Gestión de faenas

- Se agregó la sección Faenas dentro de Configuración.
- Se pueden crear nuevas faenas.
- Se pueden eliminar faenas sin información asociada.
- Se muestra el uso de cada faena en acreditaciones, turnos y pasajes.
- Se impide eliminar una faena que esté siendo utilizada.
- Las faenas creadas aparecen en fichas, acreditaciones, pasajes y turnos.


## v3.4.0 — Validación de importación por RUT

- Nombre completo y RUT son obligatorios para importar.
- Las filas sin nombre o sin RUT se omiten automáticamente.
- La actualización de trabajadores existentes se realiza únicamente por RUT.
- Ya no se actualizan trabajadores solo porque coincida el nombre.
- Los RUT repetidos dentro del mismo Excel se omiten.
- El importador muestra antes de confirmar:
  - Filas válidas.
  - Filas omitidas.
  - Filas sin nombre.
  - Filas sin RUT.
- Al terminar se entrega un resumen detallado.


## v3.5.0 — Nombre, apellido y datos de ejemplo

- El importador ahora muestra columnas separadas para:
  - Nombre.
  - Apellido.
  - RUT.
- Los tres campos son obligatorios.
- Nombre y apellido se guardan por separado y se combinan para mostrar el nombre completo.
- Se agregan una sola vez tres trabajadores de ejemplo:
  - Carlos Andrés Muñoz Rojas.
  - Daniela Andrea Soto Pérez.
  - Miguel Ángel Contreras Díaz.
- Las tarjetas de demostración muestran la etiqueta “Ejemplo”.
- En Configuración se pueden eliminar o volver a cargar los trabajadores de ejemplo.
