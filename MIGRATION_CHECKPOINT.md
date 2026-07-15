# Migración desde Track A

## Qué se porta en esta versión

- workers con turno, overrides, exámenes, exámenes extra y certificaciones;
- faenas;
- acreditaciones anidadas convertidas a la colección cloud;
- llamados a contacts;
- pasajes a tickets;
- catálogos de cargos y equipos a settings/legacyCatalogs.

## Qué no se puede migrar automáticamente

Los contenidos Base64 guardados en window.storage no forman parte del JSON raíz. Solo se conserva nombre y tipo. Para subir documentos reales se debe habilitar Firebase Storage.
