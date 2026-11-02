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


## v3.7.7 — Turnos en dos meses

- Turnos 14x14 abre de manera predeterminada dos meses consecutivos.
- Se agregó un selector para alternar entre 1 mes y 2 meses.
- La tabla muestra un encabezado independiente para cada mes.
- El inicio del segundo mes se marca con una línea naranja.
- Los botones de navegación avanzan o retroceden dos meses cuando la vista doble está activa.
- Los filtros por cargo y faena consideran todo el período visible.
- Se mantiene la edición individual, edición masiva, arrastre y función Deshacer.
- La tabla utiliza desplazamiento horizontal para mantener legibles los días.


## v3.7.8 — Menú plegable y columna ajustable

- Se agregó un botón para plegar y desplegar el menú lateral.
- Al plegarlo se muestran únicamente los íconos y los contadores.
- El área principal gana espacio horizontal automáticamente.
- La preferencia del menú queda guardada en el navegador.
- En Turnos 14x14, la columna Trabajador puede ajustarse entre 120 y 380 px.
- Se puede ajustar mediante:
  - Botón reducir.
  - Botón ampliar.
  - Botón restablecer.
  - Arrastre del borde derecho, como una columna de Excel.
- El ancho elegido queda guardado en el navegador.


## v3.8.0 — Centro de respaldos e integridad

La sección Configuración incorpora un Centro de respaldos e integridad.

### Respaldo completo

- Descarga un archivo JSON versionado.
- Incluye el estado principal y todas las claves almacenadas por la aplicación.
- Incluye los archivos adjuntos guardados en Realtime Database.
- Registra versión, fecha, usuario, conteos e informe de integridad.
- Advierte que el archivo contiene información confidencial.

### Restauración

- Acepta respaldos completos v3.8.0.
- Mantiene compatibilidad con JSON antiguos que solo contienen los datos principales.
- Muestra una vista previa con cantidades y hallazgos.
- Solicita confirmación antes de reemplazar los datos.
- Descarga automáticamente un respaldo previo.
- Intenta volver al estado anterior si la restauración falla.

### Auditoría de integridad

Revisa:

- RUT e identificadores duplicados.
- Trabajadores sin RUT, nombre o cargo.
- Fechas inválidas.
- Faenas y cargos no configurados.
- Asignaciones huérfanas.
- Llamados y pasajes asociados a trabajadores eliminados.
- Metadata de archivos sin contenido.
- Archivos almacenados sin referencia.
- Servicios con fechas o cantidades inválidas.

### Seguridad

Los respaldos pueden contener datos personales, exámenes y documentos. Deben guardarse en una ubicación protegida.


## v3.9.0 — Roles, permisos y auditoría

### Roles

- Administrador:
  - Acceso completo.
  - Administración de perfiles.
  - Restauración de respaldos.
  - Eliminación de trabajadores, servicios, cargos y faenas.
  - Configuración crítica.
  - Lectura de auditoría.
- Planificador:
  - Gestión operacional.
  - Importación y edición de trabajadores.
  - Servicios, asignaciones, turnos, llamados y pasajes.
  - Exportación, respaldos e integridad.
  - Sin administración de accesos ni restauración.
- Lector:
  - Consulta de todos los módulos.
  - Sin escritura, importación, exportación ni respaldos — única excepción:
    reporta sus propios errores de cliente (ver "Monitoreo de errores").

### Primer Administrador

La primera cuenta que inicia sesión después de publicar la versión crea automáticamente el perfil Administrador inicial.

### Agregar otros usuarios

1. Crea primero la cuenta en Firebase Authentication.
2. Copia el UID de la cuenta.
3. Entra como Administrador.
4. Abre Configuración → Usuarios, roles y auditoría.
5. Registra UID, correo exacto, rol y estado.

### Auditoría

Se registran acciones críticas como:

- Creación o modificación de perfiles.
- Descarga y restauración de respaldos.
- Importación de trabajadores.
- Eliminación de trabajadores y servicios.
- Eliminación de cargos y faenas.

### Limitación de la arquitectura actual

La regla de Firebase bloquea completamente la escritura del rol Lector y de cuentas desactivadas, salvo la excepción descrita en "Monitoreo de errores". Administrador y Planificador pueden escribir en `legacyStorage`.

Como la información operacional todavía está guardada dentro de un único JSON, las reglas de Firebase no pueden distinguir en el servidor una edición normal de una eliminación realizada por un Planificador. La interfaz reserva las acciones destructivas al Administrador, pero la protección fina entre Administrador y Planificador requiere la futura normalización de la base por módulos.

### Monitoreo de errores

La app captura automáticamente errores no controlados y promesas
rechazadas sin manejar (`amecoSpotPlanner/errorLogs`), incluidos los del rol
Lector — es la única escritura que tiene ese rol, y es de solo anexado
(no puede leer ni editar el nodo). Un workflow programado
(`check-error-logs.yml`) revisa cada 6 horas si hubo errores críticos
recientes y falla el job cuando corresponde, lo que dispara la notificación
por correo estándar de GitHub Actions. Solo Administrador puede leer los
registros (Firebase Console o `npm run check:error-logs`).

## v3.9.1 — Hotfix de publicación

- Se corrigió el error de empaquetado de la v3.9.0.
- El `index.html` ahora incluye realmente los roles, permisos y auditoría.
- Se agregó una etiqueta visible `v3.9.1` en la barra superior.
- Se agregó una guía de recuperación.
- Se agregó un archivo de reglas temporales para recuperar el guardado cuando las reglas nuevas fueron publicadas antes del frontend.

## Consulta de turnos y disponibilidad (rama de revisión)

En Turnos, busca por nombre o RUT y selecciona **Estado al día** para consultar trabajo/HE,
descanso, permiso, trabajo sin faena o personal sin ciclo registrado. Combina estos filtros
con cargo y faena; el filtro de faena sigue refiriéndose al período del calendario visible.
Los contadores respetan nombre, cargo y faena, antes del filtro de estado. La fecha consultada
puede ser distinta al mes visible. **Ir al mes actual** devuelve el calendario y la consulta a hoy.

Trabajo sin faena significa trabajo/HE sin faena registrada ese día en el calendario.
Revisa servicios, acreditaciones y confirma con el trabajador antes de asignar.
Descanso y ausencia de ciclo no equivalen a disponibilidad.

No requiere instalar Node en el equipo de uso: la página sigue siendo HTML estático.
Validación de desarrollo: `npm run check:syntax` y `npm run test:turnos`.
Evidencia y reversión: [release-evidence/turnos-consulta.md](release-evidence/turnos-consulta.md).

## Importar calendario desde Personal Spot (en revisión)

1. En Turnos pulsa **Importar turnos Excel** y elige tu .xlsx o .xlsm.
2. Selecciona el período. Por defecto abarca el mes actual hasta hoy.
3. Revisa qué estado/faena corresponde a cada código. Se usan las faenas ya existentes;
   no se crean nuevos catálogos. Los códigos desconocidos se omiten hasta que elijas su correspondencia.
4. Genera la vista previa y revisa los RUT omitidos y los conflictos. Cambiar período,
   correspondencias o reemplazo invalida la vista previa y requiere generarla otra vez.
5. Por defecto se conservan las excepciones ya registradas. Para reemplazarlas debes marcar
   la casilla, revisar los conflictos y confirmar la aplicación.
6. **Respaldar y aplicar** descarga un respaldo completo antes de guardar. Si está incompleto
   o alguien modificó el servidor, se detiene el proceso. Conserva el JSON descargado.

La hoja debe llamarse Personal Spot (se ignoran mayúsculas y espacios exteriores), tener
una fila de fechas completas y encabezados Nombre y RUT. Los trabajadores deben existir
con RUT único en la página y la planilla. Las filas sin RUT se omiten; corrige el Excel y vuelve
a cargarlo. No se infieren identidades a partir del nombre.

Los turnos se guardan como excepciones diarias con el código original en la nota. D → descanso,
T → trabajo, HE → extra, LM/V/P → permiso o ausencia. Las variantes conocidas de faena se
asocian únicamente si existe la faena correspondiente. Las celdas vacías no borran nada.
Se mantienen las fichas, los ciclos, acreditaciones, documentos y servicios. Si existen cambios
locales pendientes, guarda y recarga antes de importar. No se ejecutan macros.

Disponible para Administrador/Planificador. El rol Lector no puede importar.
Pruebas: `npm run test:spot-import`. Evidencia: `release-evidence/importar-turnos-spot.md`.
