# Backlog técnico, riesgos, roadmap y KPIs — AMECO Spot Planner

## Backlog priorizado (checkpoints CHK)

| ID | Entregable | Estado actual | Trabajo requerido | Definition of Done | Prioridad |
|---|---|---|---|---|---|
| CHK-01 | Roles y reglas | Implementado desde v3.9.0/v3.9.1 (verificado en código, no solo wiki): 3 roles (admin/planner/viewer) con enforcement doble para el split grueso — RTDB rechaza escritura de Lector a nivel servidor, no solo UI. Panel de gestión de usuarios funcional. **Gap real**: la matriz fina (ej. "Planificador no puede eliminar trabajadores") solo se aplica en el cliente (`ADMIN_ONLY_ACTIONS`/`guardAction`); las reglas RTDB no pueden restringirla porque `legacyStorage` es un blob JSON único — depende de CHK-06. Tampoco hay custom claims (rol se lee de RTDB, no del token) ni desactivación en tiempo real (el usuario desactivado sigue con sesión activa hasta reload/refresh de token) | Enforcement server-side de la matriz fina (post CHK-06); listener en vivo de `active` para forzar logout inmediato; evaluar migración a custom claims | Lector no puede escribir (cumplido, server-side); Admin/Planificador según matriz (cumplido solo en cliente, falta server-side) | Crítica |
| CHK-02 | Firebase Storage | Adjuntos Base64 | Subir archivos; guardar URL y metadata | Ningún archivo pesado queda en RTDB | Alta |
| CHK-03 | Centro de operaciones | Dashboard básico | Pendientes diarios y links directos | Alertas de acreditación, examen, cobertura, llamado y pasaje | Alta |
| CHK-04 | Audit logs | Parcial (verificado en código): existe `auditLogs` append-only y se usa en 9 tipos de acción (backup descargado/restaurado, eliminar trabajador/servicio/cargo/faena, eliminación masiva, importar Excel, altas/ediciones de perfil de acceso). **No cubre** crear/editar trabajadores, servicios, turnos, asignaciones, llamados, pasajes, acreditaciones ni certificaciones — la mayoría de la operación diaria no deja rastro | Extender `recordAudit` a las acciones de escritura no cubiertas | Turnos, servicios y eliminaciones generan evidencia (eliminaciones sí; turnos y servicios en creación/edición, no) | Alta |
| CHK-05 | Regresión Excel | Manual | Fixtures y pruebas de integración | Plantillas válidas e inválidas no corrompen producción | Alta |
| CHK-06 | Normalizar RTDB | JSON unificado | Separar workers, services, shifts y settings | Ediciones concurrentes no sobrescriben módulos | Crítica |
| CHK-07 | Backups y restore | Automatizado (rama `feature/backup-automatizado`): backup diario + restore con Admin SDK, drill de restauración probado en CI. Pendiente: detección de incidentes (depende de CHK-09) y segundo responsable de guardia (R-10) | Cerrar CHK-09 y definir guardia para RTO 24/7 | Restauración probada con RPO/RTO documentado — ver `RPO_RTO_PROPUESTA.md` | Crítica |
| CHK-08 | Ambientes | Producción directa | Dev, test y prod separados | Pruebas no usan datos reales | Alta |
| CHK-09 | Monitoreo | Sin telemetría | Captura de errores y métricas | Errores críticos generan alerta y contexto | Media |
| CHK-10 | CI de release | ZIP y carga manual | Validar sintaxis, pruebas y artefactos | No se publica si falla el pipeline | Media |
| CHK-11 | Privacidad | Sin política técnica | Clasificación, retención y baja lógica | Acceso y eliminación quedan auditados | Alta |
| CHK-12 | Llamados por servicio | Solo trabajador | Relacionar servicio/asignación | Historial visible desde el servicio | Media |
| CHK-13 | Pasajes por servicio | Registro independiente | Crear desde asignación confirmada | No duplicar y mostrar estado en servicio | Media |
| CHK-14 | Performance turnos | Tabla completa | Medición y virtualización si aplica | Cumple umbral con volumen objetivo | Media |
| CHK-15 | Accesibilidad | Parcial | Teclado, contraste, etiquetas y foco | Flujos críticos operables sin mouse | Baja |

## Orden de dependencias críticas (respetar al priorizar)

1. **CHK-07 Backups** — automatizado (ver `RPO_RTO_PROPUESTA.md`); resta CHK-09 para RTO 24/7.
2. **CHK-01 Roles** — split grueso (admin/planner/viewer) implementado y server-side; el gap restante (matriz fina) queda bloqueado por CHK-06.
3. **CHK-02 Storage** — bloquea crecimiento documental.
4. **CHK-06 Normalización** — bloquea sincronización, escalabilidad, y el cierre completo de CHK-01.
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
| RTO | 4 horas hábiles (horario de oficina). Fuera de horario, meta interina: antes del siguiente día hábil, hasta cerrar CHK-09 y definir guardia — ver `RPO_RTO_PROPUESTA.md` |
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
