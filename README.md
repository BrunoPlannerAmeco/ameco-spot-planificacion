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


## v3.6.0 — Servicios y requisiciones

- Se agregó el menú Servicios.
- Se pueden crear, editar y eliminar servicios.
- Cada servicio registra:
  - Nombre.
  - Faena.
  - Cliente o área solicitante.
  - Fechas de inicio y término.
  - Turno día, noche o mixto.
  - Supervisor o responsable.
  - Estado operativo.
  - Descripción.
- Se pueden agregar varios cargos requeridos y su cantidad.
- Se valida que no existan cargos repetidos dentro del servicio.
- Se agregaron filtros por estado, faena y texto.
- El Dashboard muestra los próximos servicios.
- La exportación Excel incluye una hoja Servicios.
- No se pueden eliminar faenas o cargos utilizados por servicios.


## v3.7.0 — Asignación de personal

- Cada servicio muestra cobertura confirmada y cupos pendientes.
- Se agregó Gestión de personal por servicio.
- Cada cargo requerido admite trabajadores asignados.
- El buscador de candidatos evalúa:
  - Coincidencia de cargo.
  - Turno durante las fechas del servicio.
  - Cruces con otros servicios.
  - Acreditación para la faena.
  - Estado de exámenes y documentos.
- Los candidatos se ordenan mediante una recomendación operativa.
- Las advertencias permiten continuar con confirmación, para soportar horas extra y excepciones.
- Estados disponibles:
  - Propuesto.
  - Por contactar.
  - Sin respuesta.
  - Confirmado.
  - Rechazó.
  - Reemplazado.
  - Acreditación pendiente.
  - Listo.
- Solo Confirmado y Listo cubren el cupo requerido.
- La exportación Excel incluye asignados, confirmados, pendientes y detalle de personal.
- Al eliminar trabajadores se limpian también sus asignaciones.


## v3.7.1 — Línea de tiempo de candidatos

- Cada trabajador candidato muestra una línea de tiempo limitada a las fechas del servicio.
- Cada día indica:
  - T: trabajo.
  - D: descanso.
  - HE: hora extra.
  - P: permiso o licencia.
  - Iniciales de la faena cuando existe una asignación diaria.
- La línea de tiempo muestra día, número y mes.
- Los cruces con otros servicios se marcan con un borde rojo y un signo de exclamación.
- Al dejar el cursor sobre un día se muestra la fecha, estado, faena, nota y servicio en conflicto.
- Se agregó un resumen con la cantidad de días de trabajo, descanso, hora extra y permiso.
- La vista se desplaza horizontalmente cuando el servicio abarca muchos días.


## v3.7.2 — Corrección de cargos en importación

- Se revisó la estructura del archivo Book 7.
- El importador ahora revisa todas las hojas del Excel.
- Selecciona automáticamente la hoja con la tabla más completa.
- Se agregó un selector para cambiar manualmente de hoja.
- Se detectan encabezados aunque no estén en la primera fila.
- “NOMBRES” se asigna a Nombre.
- “NOMBRE CARGO” se asigna a Cargo y ya no se confunde con Nombre.
- Cuando un reporte agrupado deja celdas de cargo vacías, se hereda el último cargo válido.
- Los cargos se comparan ignorando mayúsculas, acentos y espacios duplicados.
- El resumen final muestra cuántos cargos fueron modificados.


## v3.7.4 — Orden del menú

El menú lateral quedó ordenado así:

1. Resumen.
2. Servicios.
3. Llamados.
4. Pasajes.
5. Documentos.
6. Acreditaciones.
7. Certificaciones.
8. Turnos 14x14.
9. Trabajadores.
10. Configuración.


## v3.7.5 — Múltiples faenas por trabajador

- El importador permite cargar hasta cinco acreditaciones por trabajador.
- Cada acreditación utiliza tres columnas:
  - Faena.
  - Estado.
  - Vencimiento.
- El RUT sigue siendo la clave para actualizar fichas existentes.
- Si una faena ya existe en la ficha, se actualiza su estado y vencimiento.
- Si no existe, se agrega sin borrar las acreditaciones anteriores.
- Se evita repetir la misma faena dentro de una misma fila.
- La plantilla anterior de una sola faena sigue siendo compatible como Faena 1.
- Se incorporaron colores automáticos y configurables por cargo.


## v3.7.6 — Buscador visible y exportación en Resumen

- El botón Exportar Excel se muestra únicamente en Resumen.
- Se eliminó de Trabajadores, Servicios, Llamados, Pasajes y demás módulos.
- El buscador de Trabajadores ya no se comprime hasta quedar como un botón pequeño.
- El texto escrito permanece visible mientras se actualizan los resultados.
- Se mejoró el foco, cursor, color del texto y visualización del placeholder.
- En pantallas pequeñas, el buscador y el filtro por cargo ocupan una fila completa.
