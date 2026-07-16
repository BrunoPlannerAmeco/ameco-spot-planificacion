# Propuesta de RPO/RTO — CHK-07

## Meta actual de la wiki

`references/backlog-riesgos.md` define como objetivo de continuidad:

| Objetivo | Meta |
|---|---|
| RPO | Máximo 24 horas de pérdida aceptable |
| RTO | Restauración de servicio crítico en menos de 4 horas |
| Backups | Diarios automáticos, 30 diarios y 12 mensuales |
| Prueba de restauración | Trimestral y antes de migraciones mayores |

Esta propuesta evalúa si esas metas son alcanzables **con lo que existe hoy**
(un único `index.html`, sin roles server-side completos, sin monitoreo — CHK-09
sigue abierto — y con una sola persona operando el proyecto, riesgo R-10).

## RPO: 24 horas — SÍ alcanzable con esta automatización

El workflow `.github/workflows/backup-rtdb.yml` corre un respaldo automático
una vez al día (cron `0 9 * * *` UTC). Mientras ese job se ejecute con éxito,
la pérdida máxima de datos ante un incidente es de ~24 horas por diseño.

Condiciones para que esto se sostenga en la práctica:

- **El job debe fallar de forma visible.** Hoy la única señal de fallo es el
  correo que GitHub envía por defecto a quienes observan el repositorio
  cuando un workflow programado falla. Es un mecanismo débil (depende de que
  alguien lea el correo) pero existe sin trabajo adicional. Cuando se cierre
  CHK-09 (monitoreo), este punto debería reforzarse con una alerta explícita.
- **El dataset es pequeño.** Según `arquitectura-datos.md`, todo vive bajo
  `amecoSpotPlanner/legacyStorage` como un JSON unificado; para el volumen
  actual (decenas/cientos de trabajadores, no miles), un export completo
  tarda segundos y no hay riesgo de que el job exceda el tiempo disponible.
- **Retención 30 diarios + 12 mensuales**: implementada en
  `scripts/backup-rtdb.mjs` (`pruneRetention`), igual que pide la wiki.

**Veredicto: RPO ≤ 24 h es alcanzable y queda cerrado con este cambio**,
condicionado a vigilar que el cron no falle silenciosamente por semanas (ver
recomendación de monitoreo abajo).

## RTO: 4 horas — alcanzable en horario hábil, NO garantizado 24/7 todavía

Desglose realista de las fases de una restauración (no solo el tiempo de
`restore-rtdb.mjs`, que toma segundos):

| Fase | Tiempo estimado | Depende de |
|---|---|---|
| Detección del incidente | Minutos a **horas** | No hay monitoreo (CHK-09 abierto); si ocurre fuera de horario, nadie lo nota hasta que alguien abre la app |
| Decisión de restaurar | Minutos | Según RACI (`gobierno.md`), el Administrador aprueba; si es la misma persona que detecta, es rápido |
| Ejecución técnica (`restore-rtdb.mjs --confirm`) | Segundos a minutos | Ya automatizado y probado (ver `restore-drill.yml`) |
| Verificación de datos | Minutos | El script ya compara conteos automáticamente |
| Confirmación y reapertura | Minutos | Un solo responsable hoy |

La ejecución técnica **ya no es el cuello de botella** gracias a este cambio.
El riesgo real está en la **detección** y en la **disponibilidad de la
persona que ejecuta la restauración** (R-10, "dependencia de una
persona/IA"): si el incidente ocurre un fin de semana o de noche y esa
persona no está disponible, 4 horas es optimista.

**Veredicto:**
- **En horario hábil, con la persona responsable disponible: 4 horas es
  alcanzable** — de hecho probablemente sobra margen, porque la restauración
  en sí toma minutos.
- **Fuera de horario hábil o si la persona responsable no está disponible:
  NO está garantizado**, porque no existe detección automática de incidentes
  (CHK-09) ni un segundo responsable designado (R-10).

## Recomendación concreta

1. **Mantener la meta de RPO ≤ 24 h tal cual** — ya se cumple con este cambio.
2. **Adoptar un RTO de 4 horas hábiles** como meta oficial por ahora, en vez
   de 4 horas absolutas 24/7. Proponer explícitamente en la wiki:
   > "RTO: 4 horas hábiles (horario de oficina). Fuera de horario hábil,
   > el objetivo interino es restaurar antes del siguiente día hábil,
   > hasta que CHK-09 (monitoreo/alertas) y un segundo responsable de
   > guardia estén definidos."
3. **No cerrar CHK-07 como 100% resuelto todavía.** Este cambio resuelve la
   parte de automatización (backup diario, runbook, restauración probada).
   Queda abierta la parte de detección/guardia, que depende de CHK-09 y de
   una decisión de gobierno (nombrar un segundo responsable), no de más
   ingeniería de scripts.
4. Cuando se aborde CHK-06 (normalización de la RTDB por módulos), evaluar si
   conviene mover a respaldos incrementales por módulo — reduciría aún más el
   RPO real sin necesidad de bajar la frecuencia del cron.

## Qué evidencia respalda esto

- `restore-drill.yml` corre el ciclo completo (sembrar → respaldar → borrar →
  restaurar → verificar) contra el emulador de RTDB en cada Pull Request que
  toque los scripts, y mensualmente por calendario — superando el mínimo
  trimestral que pide la wiki.
- Los tiempos de cada fase del drill quedan impresos en el log de ese
  workflow (`scripts/restore-drill.mjs` imprime un objeto `timings`), lo que
  da una medición empírica real del tiempo de ejecución técnica, no una
  estimación teórica.
