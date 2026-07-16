# Runbooks operativos, incidentes y pruebas — AMECO Spot Planner

## Clasificación de incidentes

| Severidad | Ejemplo | Respuesta objetivo | Restauración objetivo |
|---|---|---|---|
| P1 Crítica | Acceso no autorizado, pérdida masiva o app inutilizable | 30 min | 4 h |
| P2 Alta | Módulo principal bloqueado o datos incorrectos | 2 h | 8 h |
| P3 Media | Función degradada con alternativa manual | 1 día hábil | 3 días hábiles |
| P4 Baja | Cosmética, texto o mejora menor | 3 días hábiles | Próximo sprint |

(SLO propuestos para herramienta interna; ajustar a capacidad real de soporte.)

## Runbook: publicar una versión

1. Confirmar rama base y versión.
2. Crear respaldo de datos y conservar ZIP anterior.
3. Ejecutar pruebas y revisar evidencia.
4. Subir archivos a la rama release.
5. Actualizar GitHub Pages a `/(root)`.
6. Esperar propagación y ejecutar smoke test.
7. Registrar release, responsable y resultado.

## Runbook: rollback

1. Detener cambios operativos.
2. Volver GitHub Pages a la rama estable anterior.
3. Verificar login y carga de datos.
4. Restaurar backup solo si hubo corrupción.
5. Registrar incidente y cambio de emergencia.
6. Ejecutar análisis de causa raíz antes de reintentar.

## Runbook: error de permisos Firebase

1. Confirmar usuario autenticado y rol.
2. Revisar reglas publicadas en Firebase Console, no solo el archivo en GitHub.
3. Revisar ruta exacta de lectura/escritura.
4. Probar con Admin, Planificador y Lector.
5. Registrar la denegación esperada o el defecto.

## Runbook: fallo de importación Excel

1. NO repetir la importación en producción sin revisar el resumen.
2. Guardar copia del archivo problemático anonimizada.
3. Verificar hoja y mapeo detectados.
4. Probar en ambiente de test.
5. Agregar el caso como fixture de regresión.
6. Corregir, documentar y volver a ejecutar.

## Runbook: incidente de datos

1. Suspender escrituras.
2. Identificar hora, módulo, usuario y alcance.
3. Tomar snapshot ANTES de modificar.
4. Comparar con backup.
5. Restaurar solo los nodos afectados.
6. Validar con Product Owner.
7. Cerrar con RCA y acción preventiva.

## Runbook: respaldo previo a release

1. Exportar RTDB o copiar el nodo de producción.
2. Registrar fecha, versión y responsable.
3. Verificar que el respaldo sea legible.
4. Conservar `index.html` y reglas de la versión anterior.
5. Publicar el cambio.
6. Ejecutar smoke tests.
7. Restaurar si falla un criterio crítico.

## Pirámide de pruebas

| Nivel | Qué validar | Ejemplos |
|---|---|---|
| Unitarias | Funciones puras y reglas | RUT, fechas, scoring, cobertura |
| Integración | Módulos y Firebase | CRUD, reglas, migraciones y Storage |
| Regresión Excel | Plantillas y formatos reales | Hoja1/Hoja2, encabezados, 5 faenas |
| E2E | Flujos de usuario | Login > servicio > asignación > confirmación |
| Seguridad | Acceso permitido y denegado | Admin, Planificador y Lector |
| Rendimiento | Carga y edición masiva | Dos meses, cientos de trabajadores |
| UAT | Valor operacional | Casos reales validados por planificación |

## Dataset de pruebas mínimo

- Trabajador nuevo con todos los campos.
- RUT ya existente con cargo actualizado.
- Fila sin nombre, apellido o RUT.
- RUT duplicado dentro del archivo.
- Cargo solo en la primera fila de un grupo.
- Hasta cinco faenas, estados y vencimientos.
- Fecha inválida o término anterior al inicio.
- Servicio con cruce de trabajador.
- Acreditación vencida durante el servicio.
- Usuario Lector intentando escribir.

## Evidencia de pruebas por release

```
release-evidence/
├── test-summary.md
├── screenshots/
├── import-fixtures/
├── migration-result.json
├── security-rules-test.txt
├── performance-results.csv
└── rollback-plan.md
```

## Flujo de servicio (proceso de negocio de punta a punta)

1. Registrar la solicitud con faena, fechas, turno y responsable.
2. Definir cargos y cantidades requeridas.
3. Buscar candidatos y revisar línea de tiempo.
4. Registrar contacto y cambiar el estado de asignación.
5. Verificar acreditaciones, exámenes y certificaciones.
6. Gestionar pasajes cuando corresponda.
7. Confirmar cobertura y cambiar el servicio a Listo.
8. Ejecutar, cerrar y conservar historial y métricas.
