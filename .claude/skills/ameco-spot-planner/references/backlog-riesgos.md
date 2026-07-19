# Backlog técnico, riesgos, roadmap y KPIs — AMECO Spot Planner

## Backlog priorizado (checkpoints CHK)

| ID | Entregable | Estado actual | Trabajo requerido | Definition of Done | Prioridad |
|---|---|---|---|---|---|
| CHK-01 | Roles y reglas | **Gap de seguridad real cerrado, incluyendo cargos/faenas** (verificado en código y probado en producción): 3 roles (admin/planner/viewer) con enforcement server-side. Lector no puede escribir nada. Trabajadores: `amecoSpotPlanner/workers/{id}` — Planificador crea/edita, no elimina (nodo real, ya no solo gate de cliente). Cargos/faenas: `cargosCatalog/{key}` y `faenasCatalog/{key}` — exclusivo de Admin en todo (crear/editar/eliminar), matriz distinta a trabajadores (arquitectura-datos.md: "Configurar cargos/faenas: Sí/No/No"). Ambos probados con `@firebase/rules-unit-testing` en CI y en vivo contra producción. No fue necesario esperar a CHK-06 completo: se resolvió con una "cuña" (nodos normalizados por entidad, no todo el modelo). **Pendiente, no bloqueante**: no hay custom claims (rol se lee de RTDB, no del token) ni desactivación en tiempo real (el usuario desactivado sigue con sesión activa hasta reload/refresh de token) | Listener en vivo de `active` para forzar logout inmediato; evaluar migración a custom claims (cerraría también el gap de rol en Storage, ver CHK-02) | Lector no puede escribir (cumplido, server-side); Admin/Planificador según matriz para trabajadores y cargos/faenas (cumplido, server-side) | Crítica |
| CHK-02 | Firebase Storage | **Documentos nuevos ya van a Storage** (en producción, probado en vivo): subir/ver/borrar documentos de trabajador pasa por `workerDocuments/` en Storage, RTDB solo guarda metadata (`nombre, mime, storagePath, sizeBytes, uploadedAt`). Compatibilidad hacia atrás: documentos viejos (Base64 directo en RTDB) se siguen leyendo igual. Existe `scripts/migrate-worker-documents-to-storage.mjs` (dry-run por defecto, `--limit` para probar de a pocos) para migrar lo que quedó en formato viejo — **todavía no se corrió contra producción**, es una decisión pendiente del Product Owner (requiere ampliar temporalmente el rol IAM del service account, ver `CONFIGURAR_SERVICE_ACCOUNT.md` sección 7). **Limitación conocida**: `storage.rules` solo exige `auth != null` (no distingue rol) porque las reglas de Storage no pueden consultar RTDB — mismo gap ya documentado en CHK-01 para custom claims | Ejecutar la migración de documentos existentes cuando el Product Owner lo priorice; evaluar subir `MAX_FILE_BYTES` (hoy 3.5MB, atado al límite viejo de RTDB) | Ningún archivo **nuevo** pesado queda en RTDB (cumplido); documentos viejos aún pendientes de migrar | Alta |
| CHK-03 | Centro de operaciones | Dashboard básico | Pendientes diarios y links directos | Alertas de acreditación, examen, cobertura, llamado y pasaje | Alta |
| CHK-04 | Audit logs | **Extendido a la operación diaria** (probado en producción): además de los 9 tipos originales (backups, eliminaciones, importar Excel, gestión de usuarios), ahora audita crear/editar trabajadores, servicios, turnos (individual y masivo), asignaciones, llamados y pasajes (11 acciones nuevas). Acreditaciones/certificaciones quedan cubiertas indirectamente vía `WORKER_UPDATED` (son parte del mismo formulario), sin acción dedicada propia. Panel "Usuarios, roles y auditoría" ahora plegable con detalle expandido | Evaluar si acreditaciones/certificaciones necesitan su propia acción de auditoría (hoy indirecta vía WORKER_UPDATED) | Turnos, servicios y eliminaciones generan evidencia — cumplido | Alta |
| CHK-05 | Regresión Excel | Manual | Fixtures y pruebas de integración | Plantillas válidas e inválidas no corrompen producción | Alta |
| CHK-06 | Normalizar RTDB | JSON unificado | Separar workers, services, shifts y settings | Ediciones concurrentes no sobrescriben módulos | Crítica |
| CHK-07 | Backups y restore | Automatizado (rama `feature/backup-automatizado`): backup diario + restore con Admin SDK, drill de restauración probado en CI. **Detección de incidentes ya no bloquea** (CHK-09 monitorea cada 6 h); pendiente: segundo responsable de guardia fuera de horario hábil (R-10, decisión organizacional, no técnica) | Definir guardia humana para RTO 24/7 fuera de horario | Restauración probada con RPO/RTO documentado — ver `RPO_RTO_PROPUESTA.md` | Crítica |
| CHK-08 | Ambientes | Producción directa | Dev, test y prod separados | Pruebas no usan datos reales | Alta |
| CHK-09 | Monitoreo | **Captura de errores de cliente automatizada** (en producción): `window.onerror`/`unhandledrejection` escriben a `amecoSpotPlanner/errorLogs` (append-only, con uid, rol, mensaje, stack truncado, URL, versión de app). **Excepción puntual a CHK-01**: el Lector puede escribir en este nodo (solo push de su propio uid, sin poder leer nada) para que sus errores también queden registrados — es la única escritura que tiene ese rol. Lectura exclusiva de Administrador. Workflow `check-error-logs.yml` corre cada 6 h (Admin SDK, sin secretos en el cliente) y falla el job si hay errores `critical` en la ventana, lo que dispara la notificación por correo que GitHub ya manda por defecto al fallar un workflow programado — no se agregó un servicio de alertas nuevo | No hay métricas de rendimiento ni dashboard visual (fuera de alcance de esta fase); evaluar panel de solo lectura en el Admin panel si el volumen de errores lo justifica | Errores críticos generan alerta (cumplido, vía CI) y contexto (cumplido: stack, rol, versión, URL) | Media |
| CHK-10 | CI de release | ZIP y carga manual | Validar sintaxis, pruebas y artefactos | No se publica si falla el pipeline | Media |
| CHK-11 | Privacidad | Sin política técnica | Clasificación, retención y baja lógica | Acceso y eliminación quedan auditados | Alta |
| CHK-12 | Llamados por servicio | Solo trabajador | Relacionar servicio/asignación | Historial visible desde el servicio | Media |
| CHK-13 | Pasajes por servicio | Registro independiente | Crear desde asignación confirmada | No duplicar y mostrar estado en servicio | Media |
| CHK-14 | Performance turnos | Tabla completa | Medición y virtualización si aplica | Cumple umbral con volumen objetivo | Media |
| CHK-15 | Accesibilidad | Parcial | Teclado, contraste, etiquetas y foco | Flujos críticos operables sin mouse | Baja |

## Orden de dependencias críticas (respetar al priorizar)

1. **CHK-07 Backups** — automatizado (ver `RPO_RTO_PROPUESTA.md`); CHK-09 ya cubre la detección automática, resta solo definir guardia humana fuera de horario (R-10) para RTO 24/7.
2. **CHK-01 Roles** — gap de seguridad real cerrado (eliminar trabajadores ya es server-side); no bloquea nada más. Extender el mismo patrón a cargos/faenas es opcional, no depende de CHK-06.
3. **CHK-02 Storage** — bloquea crecimiento documental.
4. **CHK-06 Normalización** — bloquea sincronización y escalabilidad general (ya no bloquea CHK-01: se resolvió con una cuña puntual en `workers/{id}` sin esperar la normalización completa).
5. **CHK-04 Auditoría** — parcial (9 acciones cubiertas); bloquea gobierno y trazabilidad completa.
6. **CHK-05/10 Pruebas y CI** — bloquean release repetible.

## Matriz de riesgos

| ID | Riesgo | Prioridad | Causa | Respuesta |
|---|---|---|---|---|
| R-01 | Acceso excesivo | Crítica | Todos los usuarios escriben | Roles y reglas server-side |
| R-02 | Sobrescritura concurrente | Crítica | Estado JSON unificado | Separar módulos y usar transacciones |
| R-03 | Pérdida de datos | Alta | Sin backup automatizado | Backups diarios y restauración probada |
| R-04 | Adjuntos pesados | Alta | Base64 en RTDB | Firebase Storage y metadata |
| R-05 | Regresión Excel | Alta | Formatos variables | Fixtures y pruebas automatizadas |
| R-06 | Exposición de datos sensibles | Crítica | PII y salud | Mínimo privilegio y auditoría |
| R-07 | Dependencia de CDN | Media | Librerías externas | Versiones fijadas y plan de contingencia |
| R-08 | Sin trazabilidad | Alta | Cambios no auditados | Audit log inmutable |
| R-09 | Deuda del archivo único | Media | Acoplamiento | Refactor incremental |
| R-10 | Conocimiento concentrado | Media | Dependencia de una persona/IA | Wiki, runbooks y pruebas |
| R-11 | Scope creep | Alta | Cambios UI desplazan infraestructura | Backlog y control de cambios |
| R-12 | Desempeño de turnos | Media | Vista de dos meses y muchos datos | Medición, virtualización y paginación |

## Objetivos de continuidad

| Objetivo | Meta |
|---|---|
| RPO | Máximo 24 horas de pérdida aceptable — **cumplido** con el backup diario automatizado (`backup-rtdb.yml`) |
| RTO | 4 horas hábiles (horario de oficina). Fuera de horario, meta interina: antes del siguiente día hábil, hasta definir guardia humana (CHK-09 ya detecta automáticamente cada 6 h) — ver `RPO_RTO_PROPUESTA.md` |
| Backups | Diarios automáticos, 30 diarios y 12 mensuales — implementado |
| Prueba de restauración | Trimestral y antes de migraciones mayores — automatizada mensualmente vía `restore-drill.yml` (excede el mínimo) |
| Rollback release | Volver a la versión anterior en menos de 30 minutos |

## Roadmap de estabilización

| Sprint | Objetivo | Resultado esperado |
|---|---|---|
| 1 | Seguridad base | Backup manual probado, roles, reglas y matriz de permisos |
| 2 | Archivos | Firebase Storage, metadata y migración de adjuntos |
| 3 | Datos | Separación por módulos y listeners de tiempo real |
| 4 | Gobierno | Audit logs, registro de cambios y runbooks |
| 5 | Calidad | Pruebas Excel, reglas, E2E y pipeline de release |
| 6 | Operación | Centro de operaciones y métricas técnicas |
| 7 | Flujo integral | Llamados y pasajes ligados a servicios |
| 8 | Optimización | Rendimiento, accesibilidad y reducción de deuda |

## KPIs operacionales

| Indicador | Fórmula / criterio | Meta inicial |
|---|---|---|
| Cobertura de servicio | Confirmados o Listos / requeridos | >95% a 48 h del inicio |
| Acreditaciones próximas | Vencen en <=15 días | 0 sin plan de acción |
| Exámenes vencidos | Trabajadores con un examen vencido | 0 asignados a servicio |
| Pasajes urgentes | Viaje <=7 días sin emitir | 0 |
| Llamados sin respuesta | Pendientes + no contesta | Seguimiento diario |
| Excepciones forzadas | Asignaciones con advertencia aceptada | Tendencia controlada |

## KPIs técnicos

| Indicador | Meta |
|---|---|
| Tiempo de carga turnos 2 meses | <1,5 s en volumen objetivo |
| Errores no justificados de importación | <2% |
| Cambios exitosos | >95% sin rollback |
| Cobertura de pruebas crítica | 100% de importación, roles y migración |
| Antigüedad del backup | <24 h |
| MTTR P1 | <4 h |
| Errores JavaScript en producción | 0 críticos |

## KPIs de proyecto

Lead time (solicitud → release), cumplimiento de sprint (terminado/comprometido), defectos escapados, edad del backlog, valor entregado (horas manuales o riesgos reducidos), deuda técnica (CHK pendientes acumulados).
