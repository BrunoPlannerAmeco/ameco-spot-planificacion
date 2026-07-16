# Guía de respaldo y restauración

## Crear un respaldo

1. Abre Configuración.
2. Entra al Centro de respaldos e integridad.
3. Presiona Descargar respaldo completo.
4. Guarda el JSON en una ubicación protegida.
5. No lo compartas por canales públicos.

## Restaurar

1. Presiona Restaurar respaldo.
2. Selecciona el JSON.
3. Revisa los conteos y hallazgos.
4. Confirma la restauración.
5. La plataforma descargará primero una copia del estado actual.
6. Verifica trabajadores, servicios, turnos y documentos.

## Cuándo respaldar

- Antes de importar un Excel masivo.
- Antes de eliminar trabajadores.
- Antes de publicar una nueva versión.
- Antes de modificar reglas o estructura de Firebase.
- Después de completar cambios operacionales importantes.

## Alcance

Los respaldos v3.8.0 incluyen todas las claves gestionadas dentro de `amecoSpotPlanner/legacyStorage`, incluyendo adjuntos Base64.
