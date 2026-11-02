# Importar turnos Personal Spot — evidencia y reversión

Fecha: 2026-11-02. Rama: feature/importar-turnos-personal-spot, base origin/main posterior al PR #19.
Estado: propuesta sin publicar. APP_VERSION se mantiene hasta aceptación operativa.

## Cambios

Lector puro spot-shift-import.js, modal de importación en index.html y método de guardado
compareAndSavePlannerState que usa transacción en la misma ruta legacyStorage existente.
Sin nuevas reglas, rutas, catálogos ni migración. Las modificaciones solo afectan overrides
con RUT único, fechas elegidas y códigos reconocidos/seleccionados.

## Pruebas

- node scripts/check-html-syntax.mjs: pasa.
- node --check spot-shift-import.js: pasa.
- node scripts/test-spot-shift-import.mjs: pasa.
  Fechas ISO/Excel, rango inválido, fechas duplicadas, RUT faltantes/duplicados/no encontrados,
  estado/faena inválidos, códigos desconocidos, vacíos, preservación/reemplazo explícito de
  conflictos, idempotencia, conservación de ciclos/acreditaciones y cambios concurrentes.
  Método de guardado real extraído del HTML y probado con RTDB simulado: éxito, aborto por
  estado obsoleto y rechazo sin permisos; sin red.
- node scripts/test-turnos-query.mjs: pasa (regresión del PR #19).
- Chrome, fixture OOXML anónima con tres filas, dos trabajadores de ejemplo:
  lectura real con XLSX, vista previa con fila sin RUT, código omitido, conflicto conservado;
  cambio de correspondencia CODZ, nueva vista previa, descarga de respaldo y aplicación
  mediante API simulada. Calendario actualizado, excepción original conservada.
- Inspección local del archivo enviado: se reconocieron 787 fechas entre 2025-01-01 y
  2027-02-26 y 20 filas con nombre sin RUT. El XLSM original no se modificó ni publicó.
- Captura importar-turnos-spot.jpg contiene únicamente datos ficticios.

## Límites y aceptación pendiente

No se probó la transacción contra Firebase de producción ni se importaron turnos reales.
Se requieren pruebas con roles Administrador/Planificador/Lector en ambiente de prueba,
respaldo vigente pre-release y UAT con el archivo real antes de publicación/aplicación.
Los códigos ambiguos no tienen inferencia automática: el usuario selecciona correspondencia
u omisión. LM/V se registran como permiso/ausencia, preservando el código como nota.
Los trabajadores sin RUT deben corregirse antes de importar. No se crean fichas nuevas.
La descarga no prueba por sí sola la restauración: se usa el runbook de backups existente.

## Rollback

Antes de aplicar la importación se exige respaldo completo y se valida la consistencia del
estado. Si cambia el servidor, la transacción aborta sin escribir. Para revertir el código,
revertir este PR. Para revertir turnos ya importados, conservar y revisar el respaldo JSON;
restauración administrativa según runbook (afecta información compartida, no hacerla si
reemplazaría cambios posteriores sin revisar). La importación no usa Deshacer de un día.
