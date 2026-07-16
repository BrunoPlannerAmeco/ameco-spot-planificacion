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

## Respaldo automatizado (CHK-07)

Además del respaldo manual desde la app (arriba), existe un respaldo
**automático diario** vía Admin SDK que no depende de que una persona lo
recuerde:

- `scripts/backup-rtdb.mjs` exporta el nodo completo `amecoSpotPlanner` a un
  archivo JSON con fecha, con rotación de 30 diarios + 12 mensuales.
- `.github/workflows/backup-rtdb.yml` lo ejecuta todos los días a las 09:00
  UTC y publica el resultado en la rama `data-backups` del repositorio
  (nunca en `main`).
- Configuración de credenciales: ver `docs/CONFIGURAR_SERVICE_ACCOUNT.md`.
- Objetivos de continuidad (RPO/RTO) y su factibilidad real: ver
  `docs/RPO_RTO_PROPUESTA.md`.

El respaldo manual desde la UI sigue siendo válido y recomendado antes de
operaciones puntuales de riesgo (import masivo, eliminar trabajadores,
publicar versión), como ya indica esta guía. El respaldo automático cubre el
caso general de "¿cuál es el peor caso si nadie hizo un respaldo manual hoy?".

## Restauración con Admin SDK (procedimiento probado, no solo teórico)

Para restaurar directamente en la RTDB (sin pasar por la UI, por ejemplo en
un incidente donde la app misma no carga):

1. Ubica el respaldo a restaurar en la rama `data-backups` (`rtdb/manifest.json`
   lista todos los disponibles con fecha y conteos).
2. Configura las credenciales según `docs/CONFIGURAR_SERVICE_ACCOUNT.md`.
3. Corre primero en modo dry-run (por defecto, sin `--confirm`):
   ```bash
   node scripts/restore-rtdb.mjs ruta/al/respaldo.json
   ```
   Esto ya toma un snapshot de seguridad del estado actual antes de mostrar
   qué haría, sin escribir nada todavía.
4. Si el resumen se ve correcto, ejecuta la restauración real:
   ```bash
   node scripts/restore-rtdb.mjs ruta/al/respaldo.json --confirm
   ```
5. El script verifica automáticamente que los conteos post-restauración
   coincidan con los del respaldo, y falla (exit code distinto de cero) si no
   coinciden.
6. Registra el incidente y el cambio de emergencia (`references/runbooks.md`).

**Por qué esto no es solo teórico:** `scripts/restore-drill.mjs` ejecuta este
mismo procedimiento (los mismos scripts, no una simulación aparte) contra el
emulador de Firebase — siembra datos, respalda, borra, restaura y verifica
que el resultado sea idéntico al original. `.github/workflows/restore-drill.yml`
corre este drill automáticamente en cada Pull Request que toque los scripts
de respaldo, y una vez al mes por calendario. El resultado (éxito o fallo)
queda en el historial de Actions de GitHub como evidencia verificable, no
como una afirmación sin respaldo.
