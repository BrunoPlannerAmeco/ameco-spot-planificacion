# CHANGELOG

## [Sin versión] — CHK-01: enforcement server-side para eliminar trabajadores

Cierra el gap de seguridad real que dejó abierta la auditoría anterior (ver
entrada de más abajo): la matriz de permisos ("solo Admin elimina
trabajadores") pasa de aplicarse solo en el cliente a aplicarse también en
el servidor.

- `database.rules.json`: `amecoSpotPlanner/workers/{id}` ahora es un nodo
  real con regla propia — Planificador puede crear/editar, no eliminar;
  Admin puede todo. No fue necesario esperar a la normalización completa de
  CHK-06: se resolvió con una migración puntual de una sola entidad.
- `scripts/test-rules-workers.mjs`: prueba las reglas con usuarios
  simulados (admin/planner/viewer) contra el emulador — corre en CI en
  cada PR relevante.
- `scripts/verify-deployed-rules.mjs`: confirma que lo publicado en
  Firebase Console coincide con el repo (publicar reglas es un paso manual,
  no lo hace el push a GitHub).
- `index.html`: `window.amecoAccessApi.deleteWorkerNode()` + cableado en
  "eliminar trabajador" (individual y masivo) — intenta el borrado en el
  nodo real antes de tocar el estado local; si Firebase lo rechaza, no se
  modifica nada. Probado en producción real: Planificador rechazado
  (`PERMISSION_DENIED`), Admin permitido.
- `scripts/check-html-syntax.mjs` + workflow: valida con el parser de V8
  que los `<script>` inline de `index.html` sigan siendo JS válido en cada
  PR, como exige la wiki.
- Bonus: se encontró y corrigió un build roto de GitHub Pages (faltaba
  `.nojekyll`) descubierto al verificar qué veían los usuarios en vivo.

Pendiente, no bloqueante: el mismo patrón no se replicó para cargos/faenas;
tampoco hay custom claims ni desactivación de usuario en tiempo real.

## [Sin versión] — Corrección de estado real: CHK-01 y CHK-04

Auditoría del código real (no solo de la wiki) de roles/permisos y auditoría.
`backlog-riesgos.md` estaba desactualizado:

- CHK-01 pasa de "Solo login general" a "Implementado desde v3.9.0/v3.9.1,
  con gap real": el split admin/planner/viewer es server-side (RTDB rechaza
  escritura de Lector), pero la matriz fina (ej. eliminar trabajadores
  reservado a Admin) solo se aplica en el cliente — las reglas no pueden
  restringirlo porque `legacyStorage` es un blob JSON único. Depende de
  CHK-06. Tampoco hay custom claims ni desactivación de usuario en tiempo
  real (sigue con sesión activa hasta refresh de token).
- CHK-04 pasa de "No existe" a "Parcial": 9 tipos de acción se auditan
  (backups, eliminaciones, importación Excel, altas de usuario), pero no se
  audita crear/editar trabajadores, servicios, turnos ni asignaciones.

## [Sin versión] — Automatización de respaldos RTDB (CHK-07)

- Script `scripts/backup-rtdb.mjs`: respaldo diario de la RTDB completa vía
  Admin SDK, con rotación 30 diarios + 12 mensuales.
- Script `scripts/restore-rtdb.mjs`: restauración con snapshot de seguridad
  previo y verificación automática de conteos post-restauración.
- Script `scripts/restore-drill.mjs` + workflow `restore-drill.yml`: simulacro
  automático de backup+restore contra el emulador de RTDB, en cada Pull
  Request relevante y mensualmente.
- Workflow `backup-rtdb.yml`: respaldo diario programado, publicado en la
  rama `data-backups`.
- Documentación: `docs/CONFIGURAR_SERVICE_ACCOUNT.md` y
  `docs/RPO_RTO_PROPUESTA.md`.
- CHK-07 pasa de "no automatizado" a "automatizado"; queda pendiente la
  detección de incidentes (CHK-09) y un segundo responsable de guardia
  (R-10) para garantizar RTO 24/7 en vez de solo en horario hábil.

## v3.9.1

- Se corrigió el ZIP v3.9.0, que conservaba accidentalmente el index.html de v3.8.0.
- Se publicó el frontend real de roles, permisos y auditoría.
- Se agregó un indicador visible de versión.
- Se agregó una secuencia segura de recuperación de reglas.

## v3.9.0

- Roles Administrador, Planificador y Lector.
- Perfiles activos e inactivos.
- Reglas Firebase por rol.
- Auditoría de acciones críticas.
