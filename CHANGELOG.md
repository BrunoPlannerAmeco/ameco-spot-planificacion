# CHANGELOG

## [Sin versión] — CHK-02: adjuntos de trabajadores en Firebase Storage

Los documentos de trabajadores (exámenes, certificaciones) ya no se guardan
como Base64 dentro de Realtime Database — pesaban hasta 3.5MB por archivo
dentro de un blob JSON, con el costo y límite de tamaño que eso implica.

- `storage.rules` (nuevo) + SDK de Storage cargado en `index.html`.
  Limitación conocida y documentada: las reglas de Storage no pueden
  consultar el rol en RTDB (a diferencia de `database.rules.json`), así
  que el control es `auth != null` en vez de por rol — cerrar esto del
  todo requiere custom claims, mismo pendiente ya anotado en CHK-01.
- `window.amecoAccessApi.uploadWorkerDocument/getWorkerDocumentUrl/deleteWorkerDocument`:
  misma capa de API que ya se usa para el resto de operaciones con Firebase.
- `saveWorkerFromForm`, `viewDocument`, `removeWorkerDocuments`: documentos
  nuevos van a Storage; documentos existentes (formato Base64 anterior)
  se siguen leyendo exactamente igual — sin migración forzada de golpe.
  Probado en producción real: subir, ver y borrar un documento nuevo,
  confirmado en Firebase Console → Storage.
- `scripts/migrate-worker-documents-to-storage.mjs`: migra lo que quedó en
  formato Base64 hacia Storage. Dry-run por defecto, `--limit=N` para
  probar con pocos documentos antes de migrar todo. Requiere backup previo
  y un permiso IAM adicional y temporal (ver `CONFIGURAR_SERVICE_ACCOUNT.md`).
  **No se ejecutó todavía contra producción** — queda como decisión del
  Product Owner.
- Bug real encontrado probando en el navegador (no algo que el chequeo de
  sintaxis en CI pudiera atrapar): `nowIso()` estaba definida en un scope
  de `<script>` distinto al de `saveWorkerFromForm`, causando un
  `ReferenceError` en tiempo de ejecución. Corregido.

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
