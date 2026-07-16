# CHANGELOG

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
