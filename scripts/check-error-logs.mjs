#!/usr/bin/env node
// CHK-09: revisa amecoSpotPlanner/errorLogs y falla (exit 1) si hay al menos
// un registro "critical" dentro de la ventana consultada. Pensado para
// correr en un workflow programado: un job que falla dispara la notificación
// por correo que GitHub ya manda por defecto al dueño del repo, sin agregar
// un servicio de alertas nuevo. No escribe ni borra nada (solo lectura).
//
// Uso: node scripts/check-error-logs.mjs [--hours=6]

import { getDb } from './lib/admin-init.mjs';

function parseArgs(argv) {
  const args = { hours: 6 };
  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, '').split('=');
    if (key === 'hours') args.hours = Math.max(1, Number(value) || 6);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = getDb();

  const sinceMs = Date.now() - args.hours * 60 * 60 * 1000;

  const snapshot = await db.ref('amecoSpotPlanner/errorLogs').once('value');
  const allLogs = Object.values(snapshot.val() || {});
  const logs = allLogs
    .filter(log => {
      const createdAtMs = Date.parse(log.createdAt || '');
      return Number.isFinite(createdAtMs) && createdAtMs >= sinceMs;
    })
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  const criticals = logs.filter(log => log.severity === 'critical');
  const errors = logs.filter(log => log.severity !== 'critical');

  console.log(`[check-error-logs] Ventana: últimas ${args.hours}h. ${logs.length} registro(s) (${allLogs.length} en total histórico).`);
  logs.forEach(log => {
    console.log(`  - [${log.severity}] ${log.createdAt}  ${log.email||log.uid}  ${log.source||''}  "${log.message}"`);
  });

  if (!logs.length) {
    console.log('[check-error-logs] Sin registros en la ventana consultada.');
  }

  if (criticals.length) {
    console.error(`[check-error-logs] ALERTA: ${criticals.length} error(es) crítico(s) en las últimas ${args.hours}h (${errors.length} error(es) no críticos adicionales).`);
    process.exit(1);
  }

  console.log(`[check-error-logs] OK: sin errores críticos en las últimas ${args.hours}h (${errors.length} error(es) no críticos, sin acción requerida).`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[check-error-logs] ERROR:', error.message);
    process.exit(1);
  });
