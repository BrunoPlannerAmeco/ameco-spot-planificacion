# Arquitectura y modelo de datos — AMECO Spot Planner v3.7.8

## Arquitectura actual (v3.7.8)

| Componente | Estado | Riesgo |
|---|---|---|
| Hosting | GitHub Pages, aplicación estática | Código cliente y configuración pública visibles |
| Frontend | Un único `index.html` | Acoplamiento y riesgo de regresión |
| Autenticación | Firebase Auth correo/contraseña | No diferencia privilegios |
| Datos | RTDB mediante `window.storage` | Sobrescritura del estado completo |
| Persistencia | Objeto JSON unificado | Concurrencia, tamaño y recuperación |
| Archivos | Base64 dentro de RTDB | Costo, límite de tamaño y rendimiento |
| Preferencias UI | localStorage del navegador | No se sincronizan entre dispositivos |
| Dependencias | CDN para Firebase, XLSX y ExcelJS | Fallo si la CDN no está disponible |

## Arquitectura objetivo

- Separar datos por módulos y entidades estables.
- Identificadores internos + RUT normalizado como índice único.
- Archivos en Firebase Storage; solo metadata en RTDB.
- Roles mediante custom claims y reglas de servidor.
- `auditLogs` de solo anexado (append-only).
- Copias automáticas, restauración y ambientes dev/test/prod.
- Listeners por colección para sincronización en tiempo real.

## Modelo de datos actual

```
amecoSpotPlanner/
├── legacyStorage/
│   └── <clave codificada de faena_personal_db_v1>
│       ├── workers[]
│       ├── servicios[]
│       ├── llamados[]
│       ├── pasajes[]
│       ├── cargos[] / cargoColores{}
│       ├── faenas[] / equipos[]  (equipos: espejo redundante, ya no es la fuente real — ver equiposCatalog)
│       └── examplesSeeded
├── workers/{workerId}         (espejo de solo escritura: solo gate de borrado server-side, CHK-01; la UI nunca lo lee)
├── cargosCatalog/{key}        (espejo de solo escritura: doble escritura real, pero la UI sigue leyendo cargos desde legacyStorage)
├── faenasCatalog/{key}        (mismo patrón que cargosCatalog)
├── equiposCatalog/{key}       (CHK-06 fase 1: PRIMER nodo con lectura en vivo real — la UI lee de acá, no de legacyStorage)
├── users/{uid}
├── auditLogs/{logId}
└── errorLogs/{logId}
```

`equiposCatalog` es el primer caso donde el nodo normalizado es la fuente de
verdad real (listener `.on('value')` + escritura granular por clave), a
diferencia de `workers`/`cargosCatalog`/`faenasCatalog`, que siguen siendo
espejos de solo escritura usados únicamente para que la regla de RTDB pueda
exigir un rol en servidor (la UI jamás los vuelve a leer). Las próximas
fases de CHK-06 deben aplicar el mismo patrón de `equiposCatalog` a
`llamados`, `pasajes`, y voltear la lectura de `cargosCatalog`/`faenasCatalog`
hacia el nodo real en vez de `legacyStorage`.

## Modelo objetivo normalizado

```
amecoSpotPlanner/
├── workers/{workerId}
├── workerRutIndex/{rutNormalizado}: workerId
├── shifts/{workerId}/{yyyy-mm-dd}
├── accreditations/{workerId}/{siteId}
├── certifications/{workerId}/{certificationId}
├── exams/{workerId}/{examId}
├── services/{serviceId}
├── requirements/{serviceId}/{requirementId}
├── assignments/{serviceId}/{assignmentId}
├── contacts/{contactId}
├── tickets/{ticketId}
├── settings/{cargos, sites, equipment}
├── users/{uid}/{role, active}
├── auditLogs/{logId}
├── errorLogs/{logId}
└── backups/{backupId}
```

## Relaciones lógicas

| Origen | Relación | Destino | Regla |
|---|---|---|---|
| Trabajador | N:1 | Cargo | Un cargo principal por ficha |
| Trabajador | 1:N | Acreditación | Una por faena; estado y vencimiento |
| Trabajador | 1:N | Turno diario | Una excepción por fecha |
| Servicio | 1:N | Requisición | Cargo y cantidad requerida |
| Requisición | 1:N | Asignación | Un trabajador por asignación |
| Trabajador | 1:N | Asignación | Varios servicios sin traslape |
| Servicio | 1:N | Llamado/Pasaje | Relación objetivo para trazabilidad |

## Clasificación de datos

| Tipo | Ejemplos | Clasificación | Control mínimo |
|---|---|---|---|
| Identificación | Nombre, RUT, correo, teléfono | Confidencial | Rol, cifrado en tránsito, mínimo acceso |
| Salud ocupacional | Exámenes y vencimientos | Sensible | Acceso restringido, auditoría, retención |
| Operación | Turnos, faenas y servicios | Interno | Control por rol y respaldo |
| Logística | Pasajes, origen y destino | Confidencial | Acceso de planificación y administración |
| Técnico | Logs, configuración y errores | Interno restringido | Solo administración/desarrollo |

## Roles objetivo (matriz de permisos)

| Permiso | Administrador | Planificador | Lector |
|---|---|---|---|
| Ver información | Sí | Sí | Sí |
| Crear/editar trabajadores | Sí | Sí | No |
| Eliminar trabajadores | Sí | No por defecto | No |
| Editar turnos | Sí | Sí | No |
| Crear servicios/asignar | Sí | Sí | No |
| Gestionar documentos sensibles | Sí | Limitado | No |
| Configurar cargos/faenas | Sí | No | No |
| Gestionar usuarios/roles | Sí | No | No |
| Ver auditoría | Sí | Lectura limitada | No |
| Exportar datos | Sí | Sí | No |

## Controles de seguridad obligatorios

- Custom claims de Firebase para `role` y `active`.
- Reglas de RTDB que validen rol en servidor; ocultar botones NO es suficiente.
- Reglas de Storage alineadas con tipo de documento y rol.
- Audit log append-only con uid, correo, fecha, operación, entidad y resumen.
- `errorLogs` (CHK-09) es append-only y de lectura exclusiva de Administrador,
  igual que `auditLogs`. **Única excepción documentada** a "Lector no puede
  escribir nada" (CHK-01): el Lector puede hacer `push` de sus propios
  errores de cliente (sin poder leer ni editar el nodo), para que la
  telemetría cubra los 3 roles.
- Cierre de sesión y revocación de usuarios inactivos.
- Sin secretos privados en el cliente; la API key pública de Firebase no reemplaza las reglas.
- Principio de mínimo privilegio y revisión mensual de usuarios y accesos.

## Privacidad y retención (objetivo técnico, no interpretación legal)

| Información | Retención propuesta | Eliminación |
|---|---|---|
| Ficha activa | Mientras exista relación operacional | Baja lógica y revisión administrativa |
| Exámenes vencidos | Según política laboral/legal aplicable | Solo administrador y con auditoría |
| Audit logs | Mínimo 24 meses | No editable por usuarios operativos |
| Backups | 30 diarios + 12 mensuales | Rotación automatizada |
| Datos de ejemplo | Solo ambientes de prueba | No mezclar con producción |

Las reglas de retención definitivas deben ser aprobadas por RR.HH., Legal y Seguridad de la Información.

## Ambientes

| Ambiente | Objetivo | Datos | Publicación |
|---|---|---|---|
| Desarrollo | Cambios locales y pruebas unitarias | Ficticios | Rama `feature/*` |
| Pruebas | Integración y UAT | Copia anonimizada | Rama `test` o proyecto Firebase separado |
| Producción | Operación real | Vigentes | Rama `release` y GitHub Pages |

## Motor de recomendación de candidatos

| Validación | Comportamiento | Resultado |
|---|---|---|
| Cargo | Compara cargo principal con requisito | Mayor puntaje si coincide |
| Turno | Evalúa cada día del servicio | Trabajo/HE favorece; permiso penaliza |
| Cruce | Busca asignaciones activas superpuestas | Alerta roja y menor prioridad |
| Acreditación | Compara faena y vencimiento | Acreditado vigente favorece |
| Exámenes | Evalúa vigencia documental | Vencido genera alerta crítica |
| Excepción | Permite forzar con confirmación | Debe registrarse en audit log futuro |

## Importación Excel (reglas)

1. Revisar todas las hojas y detectar encabezados.
2. Mapear Nombre, Apellido y RUT obligatorios.
3. Omitir filas incompletas o RUT repetidos dentro del archivo.
4. Actualizar fichas existentes exclusivamente por RUT.
5. Actualizar cargo y hasta cinco acreditaciones por fila.
6. Entregar resumen de creados, actualizados, omitidos y acreditaciones.
7. Ejecutar en ambiente de prueba antes de producción cuando cambie la plantilla.

## Inventario funcional v3.7.8

Implementados: Resumen (KPIs/alertas/export), Servicios, Asignaciones (candidatos/scoring), Línea de tiempo, Llamados, Pasajes, Documentos, Acreditaciones (hasta 5 faenas), Certificaciones, Turnos 14x14 (vista 1/2 meses), Trabajadores, Configuración, Autenticación.
Pendientes: Roles y permisos, Firebase Storage, Auditoría, Backups. Parcial: Pruebas automáticas.

Orden de navegación: Resumen > Servicios > Llamados > Pasajes > Documentos > Acreditaciones > Certificaciones > Turnos 14x14 > Trabajadores > Configuración.
