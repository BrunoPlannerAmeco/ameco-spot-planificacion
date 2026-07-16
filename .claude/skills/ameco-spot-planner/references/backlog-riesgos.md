# Backlog técnico, riesgos, roadmap y KPIs — AMECO Spot Planner

## Backlog priorizado (checkpoints CHK)

| ID | Entregable | Estado actual | Trabajo requerido | Definition of Done | Prioridad |
|---|---|---|---|---|---|
| CHK-01 | Roles y reglas | Solo login general | Custom claims, UI y reglas RTDB/Storage | Lector no puede escribir; Admin/Planificador según matriz | Crítica |
| CHK-02 | Firebase Storage | Adjuntos Base64 | Subir archivos; guardar URL y metadata | Ningún archivo pesado queda en RTDB | Alta |
| CHK-03 | Centro de operaciones | Dashboard básico | Pendientes diarios y links directos | Alertas de acreditación, examen, cobertura, llamado y pasaje | Alta |
| CHK-04 | Audit logs | No existe | Registro append-only por escritura | Turnos, servicios y eliminaciones generan evidencia | Alta |
| CHK-05 | Regresión Excel | Manual | Fixtures y pruebas de integración | Plantillas válidas e inválidas no corrompen producción | Alta |
| CHK-06 | Normalizar RTDB | JSON unificado | Separar workers, services, shifts y settings | Ediciones concurrentes no sobrescriben módulos | Crítica |
| CHK-07 | Backups y restore | No automatizado | Respaldo diario y runbook | Restauración probada con RPO/RTO documentado | Crítica |
| CHK-08 | Ambientes | Producción directa | Dev, test y prod separados | Pruebas no usan datos reales | Alta |
| CHK-09 | Monitoreo | Sin telemetría | Captura de errores y métricas | Errores críticos generan alerta y contexto | Media |
| CHK-10 | CI de release | ZIP y carga manual | Validar sintaxis, pruebas y artefactos | No se publica si falla el pipeline | Media |
| CHK-11 | Privacidad | Sin política técnica | Clasificación, retención y baja lógica | Acceso y eliminación quedan auditados | Alta |
| CHK-12 | Llamados por servicio | Solo trabajador | Relacionar servicio/asignación | Historial visible desde el servicio | Media |
| CHK-13 | Pasajes por servicio | Registro independiente | Crear desde asignación confirmada | No duplicar y mostrar estado en servicio | Media |
| CHK-14 | Performance turnos | Tabla completa | Medición y virtualización si aplica | Cumple umbral con volumen objetivo | Media |
| CHK-15 | Accesibilidad | Parcial | Teclado, contraste, etiquetas y foco | Flujos críticos operables sin mouse | Baja |

## Orden de dependencias críticas (respetar al priorizar)

1. **CHK-07 Backups** — bloquea migraciones y cambios destructivos.
2. **CHK-01 Roles** — bloquea uso seguro por más usuarios.
3. **CHK-02 Storage** — bloquea crecimiento documental.
4. **CHK-06 Normalización** — bloquea sincronización y escalabilidad.
5. **CHK-04 Auditoría** — bloquea gobierno y trazabilidad.
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
| RPO | Máximo 24 horas de pérdida aceptable mientras no exista respaldo continuo |
| RTO | Restauración de servicio crítico en menos de 4 horas |
| Backups | Diarios automáticos, 30 diarios y 12 mensuales |
| Prueba de restauración | Trimestral y antes de migraciones mayores |
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
