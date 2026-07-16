# Gobierno, desarrollo ágil y gestión de cambios — AMECO Spot Planner

## Roles de desarrollo

| Rol | Responsabilidad |
|---|---|
| Product Owner | Prioriza valor, define aceptación y aprueba releases |
| Desarrollador | Diseña, implementa, prueba, migra y documenta |
| Facilitador Scrum | Foco, visibilidad, impedimentos y retrospectiva |
| Administrador TI | Aprueba seguridad, datos, reglas y despliegue productivo |
| Usuario validador | Ejecuta pruebas operacionales con datos representativos |

## Matriz RACI resumida

| Actividad | Product Owner | Desarrollo | TI/Admin | Operaciones |
|---|---|---|---|---|
| Priorizar backlog | A/R | C | C | C |
| Diseño técnico | C | A/R | C | I |
| Reglas de seguridad | C | R | A | I |
| Pruebas funcionales | A/R | R | C | C |
| Despliegue | C | R | A | I |
| Aceptación de release | A/R | C | C | C |
| Respuesta a incidente | I | R | A | C |
| Actualización de la wiki | A | R | C | I |

## Cadencia recomendada

Sprint de 1 semana (ajustable). Refinamiento semanal, planificación al inicio, seguimiento breve según necesidad, revisión y retrospectiva al cierre (1-3 mejoras concretas).

## Definition of Ready

- Problema y usuario afectado identificados.
- Valor esperado y prioridad definidos.
- Historia sin ambigüedad, con criterios de aceptación verificables.
- Impacto en datos y migración evaluado.
- Impacto en seguridad y permisos evaluado.
- Dependencias y archivos de prueba disponibles.
- Rollback posible o riesgo explícitamente aceptado.

## Definition of Done global

| Dimensión | Criterio |
|---|---|
| Función | Cumple criterios de aceptación y casos negativos |
| Calidad | Sin errores de sintaxis; pruebas automáticas y manuales exitosas |
| Datos | No pierde ni duplica información; migración probada |
| Seguridad | Reglas y permisos verificados con usuario no autorizado |
| Rendimiento | No degrada el tiempo de carga sobre el umbral |
| Compatibilidad | Probado en navegador objetivo y pantalla común |
| Documentación | README, CHANGELOG, wiki y runbook actualizados |
| Release | Rama, versión, commit, respaldo y rollback definidos |
| Aceptación | Product Owner valida el incremento |

## Plantilla de historia de usuario

```
Como [rol]
quiero [capacidad]
para [valor operacional].

Criterios de aceptación:
- Dado...
- Cuando...
- Entonces...

Impacto en datos:
Impacto en seguridad:
Pruebas requeridas:
Rollback:
```

## Flujo de cambio

1. Registrar solicitud y beneficio.
2. Clasificar impacto, urgencia, riesgo y datos afectados.
3. Aprobar o rechazar.
4. Crear rama desde la versión estable.
5. Implementar y probar.
6. Ejecutar UAT y respaldo.
7. Publicar release versionada.
8. Verificar y cerrar el cambio.
9. Actualizar wiki, changelog y lecciones aprendidas.

## Clasificación de cambios

| Tipo | Definición | Aprobación |
|---|---|---|
| Estándar | Repetible, bajo riesgo, preaprobado | Custodio técnico |
| Normal | Nueva función o modificación de datos | Product Owner + TI según impacto |
| Emergencia | Restaura servicio o corrige riesgo crítico | Administrador; revisión posterior |

## Versionado y ramas

```
Versión: MAJOR.MINOR.PATCH
feature/<descripcion>
fix/<descripcion>
security/<descripcion>
release/vX.Y.Z
hotfix/vX.Y.Z
```

Cada release debe incluir: `index.html`, `README.md`, `CHANGELOG.md`, `ROADMAP.md`, reglas Firebase, evidencia de pruebas y plan de rollback.

## Configuración controlada

| Elemento | Fuente de verdad | Responsable |
|---|---|---|
| Código | Repositorio GitHub | Desarrollo |
| Versión publicada | GitHub Pages / Release | Administrador |
| Reglas RTDB | Archivo versionado + Firebase Console | TI/Admin |
| Reglas Storage | Archivo versionado + Firebase Console | TI/Admin |
| Usuarios y roles | Firebase Auth / users | Administrador |
| Datos maestros | Configuración de la aplicación | Product Owner/Admin |
| Wiki y runbooks | GitHub Wiki + PDF/DOCX | Custodio técnico |

## Gate de estabilidad

Una función nueva solo entra al sprint si:
- Los checkpoints críticos no empeoran.
- Existe respaldo.
- La historia cumple Definition of Ready.
- El release anterior no mantiene incidentes P1/P2 abiertos.

## Interesados clave

| Interesado | Necesidad |
|---|---|
| Planificador Spot | Rapidez, exactitud y visión diaria (Product Owner y usuario principal) |
| Supervisión de Operaciones | Cobertura y estado de servicios |
| Acreditación / RR.HH. | Documentos y vigencias |
| Coordinación de pasajes | Traslados confirmados y oportunos |
| Trabajadores | Asignaciones correctas y trazables |
| TI / Seguridad | Acceso, respaldo, auditoría y continuidad |

## Fuera de alcance actual

Liquidación de remuneraciones, integración automática con MyPass/WebControl, firma electrónica avanzada, app móvil nativa, gestión documental con validez legal certificada, alta disponibilidad 24x7.
