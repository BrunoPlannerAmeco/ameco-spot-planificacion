# CLAUDE.md — AMECO Spot Planner

Instrucciones para Claude Code al trabajar en este repositorio. La fuente única de verdad es la Wiki Maestra v3.7.8. Responde siempre en español.

## Contexto del proyecto

- Plataforma web interna de planificación de personal, servicios, turnos, acreditaciones, llamados y pasajes.
- Frontend: un único `index.html` estático publicado en GitHub Pages.
- Backend: Firebase (proyecto `ameco-spot-planificacion`) — Auth por correo/contraseña, Realtime Database con estado JSON unificado, adjuntos en Base64 (pendiente migrar a Storage).
- Rama de recuperación oficial: `v3.7.8-menu-plegable-columna-ajustable`.
- Detalle completo de arquitectura, gobierno, backlog y runbooks: ver la skill en `.claude/skills/ameco-spot-planner/`.

## Flujo de trabajo obligatorio (PR, nunca push directo a producción)

1. NUNCA hacer push directo a la rama de publicación de GitHub Pages.
2. Para cada cambio: crear rama desde la versión estable con la convención:
   - `feature/<descripcion>` · `fix/<descripcion>` · `security/<descripcion>` · `hotfix/vX.Y.Z`
3. Implementar el cambio de forma incremental y reversible.
4. Validar sintaxis JavaScript y probar manualmente antes de commitear.
5. Commit con mensaje descriptivo en español.
6. Push de la rama y abrir Pull Request con `gh pr create`, incluyendo en la descripción:
   - Qué cambia y por qué (valor operacional).
   - Impacto en datos / migración.
   - Impacto en seguridad y permisos.
   - Pruebas realizadas.
   - Plan de rollback.
7. NO fusionar el PR: el merge lo hace siempre el humano tras revisar. El merge a la rama de Pages despliega automáticamente.

## Regla de prioridad (advertir y confirmar)

Mientras CHK-01 (roles), CHK-02 (Storage) y CHK-07 (backups) estén pendientes, no priorizar personalizaciones visuales salvo usabilidad crítica. Si el usuario pide algo que contradiga esta u otra regla de la wiki: advertir qué regla se contradice, ofrecer la alternativa alineada, y pedir confirmación. Si confirma, proceder y sugerir registrar la excepción.

## Reglas de integridad de datos (aplicar en todo código)

- RUT normalizado (sin puntos, con guion, DV en mayúscula) como índice único de trabajador.
- Nunca dos trabajadores con el mismo RUT; nunca el nombre como identificador.
- Fechas siempre `AAAA-MM-DD`.
- Estados solo desde catálogos controlados.
- No eliminar faenas/cargos con referencias activas.
- No borrar acreditaciones existentes en importaciones parciales.
- No eliminar asignaciones confirmadas sin confirmación explícita.
- Máximo 5 acreditaciones importadas por trabajador desde Excel.

## Seguridad

- La seguridad se valida en servidor (reglas RTDB/Storage); ocultar botones en la UI no es control de acceso.
- Sin secretos privados en el cliente; la API key pública de Firebase no reemplaza las reglas.
- Cambios que toquen reglas de Firebase o datos requieren respaldo previo verificado (runbook de respaldo pre-release).

## Definition of Done (resumen)

Un cambio está terminado solo si: cumple criterios de aceptación y casos negativos, no pierde ni duplica datos, la seguridad fue verificada con usuario no autorizado, no degrada el rendimiento, y README/CHANGELOG/wiki quedan actualizados con rama, versión, respaldo y rollback definidos.
