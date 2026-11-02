# Consulta de turnos — evidencia de revisión

Fecha: 2026-11-02. Rama: `feature/turnos-consulta-disponibilidad`, basada en `main`.
Estado: propuesta sin publicar, conserva APP_VERSION productiva v3.9.1.

## Resultado

Búsqueda por nombre/RUT, consulta por fecha y estado, contadores, día actual,
estado desconocido sin ciclo y diseño del módulo Turnos. Todos los controles nuevos
son de consulta. No hay escrituras, migraciones ni cambios de reglas/permisos.
Para Lector la matriz es visible sin acción de editar; se conserva guardAction.

## Validación

- `npm run check:syntax`: pasa.
- `npm run test:turnos`: pasa. Casos: límites 14x14, excepción explícita,
  ausencia de ciclo, búsqueda sin tildes y RUT con/sin formato, estados excluyentes,
  filtros combinados, cero resultados, escape HTML, diciembre/enero y no mutación de trabajadores.
- Navegador Chrome: misma aplicación con carga inicial reemplazada por cinco fichas
  ficticias y Firebase desconectado. Perfil Lector, sin API de persistencia disponible.
  Búsqueda “jose”, tarjetas Trabajo sin faena, selector Sin ciclo, Limpiar filtros y
  cambio a un mes verificados. Las celdas de Lector permanecen visibles sin edición.
- Captura: `turnos-consulta.jpg` (datos ficticios).
- No se accedió a la base real ni se ejecutaron pruebas de autenticación/servidor.
- Pendiente UAT con datos representativos y revisión de pantallas pequeñas antes de fusionar.

## Riesgos y alcance

Trabajo sin faena revisa el calendario, no los cruces de servicios ni acreditaciones.
La interfaz lo comunica y no permite concluir disponibilidad confirmada.
Filtro de faena: conserva la búsqueda dentro del período visible; estado: día consultado.
No se agregaron índices, exports ni tratamientos nuevos de datos personales.

## Publicación y rollback

El humano revisa y fusiona el PR según CLAUDE.md. Antes de desplegar debe verificar
el respaldo previo a release según el runbook existente. No se creó respaldo de datos
porque esta revisión no toca producción. Reversión: revertir el commit/PR para recuperar
el HTML anterior; no se necesita restaurar datos porque no hay migración.
