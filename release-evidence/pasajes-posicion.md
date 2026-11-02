# Panel de pasajes y posición — evidencia

Fecha: 2026-11-02. Rama feature/pasajes-pendientes-conservar-posicion.
Base main posterior al PR #20. Propuesta sin publicar; no se modificó producción.

## Comportamiento

Panel de solicitudes pendientes, compra por confirmar, envío por verificar, próximos siete
 días y fecha pasada sin emitir. Filtros combinados. Nuevos campos opcionales conservan
los pasajes existentes y sus metadatos desconocidos mediante spread previo a la edición.
El borrador no envía mensajes ni marca enviado. La acción Marcar enviado requiere escritura;
preparar/copiar texto usa el permiso export vigente. No se cambian reglas de servidor.

Conservación de scroll del documento, contenedor y tablas, foco/selección de campos con ID.
Reconstrucciones de búsqueda vuelven a enlazar los listeners. Cambio de módulo inicia arriba;
si disminuye el número de filas, la posición se limita al espacio existente.

## Validación

- Sintaxis JS inline y pruebas previas de turnos/importador: pasan.
- test-pasajes-panel: conteos, siete días inclusivos, fechas pasadas, cancelados, emisión/envío,
  registros históricos sin registro, búsqueda con tildes/RUT, filtros combinados, vacío, escape
  HTML y borradores sin mutación de datos: pasan.
- test-ui-position: desplazamiento vertical/horizontal, tablas, foco y selección, callbacks
  obsoletos, campos eliminados y navegación entre módulos: pasan.
- Chrome con 45 pasajes ficticios, dos trabajadores de ejemplo y persistencia simulada:
  editar Referencia 035, cambiar nota y guardar conservó window.scrollY=3144 antes/después;
  se verificó el texto modificado en la fila. Marcar enviado redujo pendientes de 45 a 44.
  Preparar texto abre borrador. Búsqueda continua conservó foco/cursor y valor Operador.
  Limpiar filtros recuperó los 45 registros históricos. Captura con datos ficticios.
- No se enviaron mensajes ni se usó Firebase de producción. Pendiente UAT de permisos y
  guardado con usuarios representativos antes de fusión/publicación.

## Datos, límites y reversión

Sin migraciones ni cambios de ruta. Nuevos campos opcionales de ticket: horaViaje,
movimiento y envioTrabajador. No altera trabajadores, turnos, acreditaciones ni servicios.
Persistencia usa la API existente. No implementa hospedajes ni notificaciones automáticas.
Verificar respaldo pre-release según runbook. Revertir el PR restaura la interfaz anterior;
los campos opcionales pueden permanecer en los datos, sin restauración masiva de Firebase.
