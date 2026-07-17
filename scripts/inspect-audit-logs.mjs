#!/usr/bin/env node
// Diagnóstico de solo lectura: imprime los últimos N registros de
// amecoSpotPlanner/auditLogs tal cual están en la base real. No escribe
// ni modifica nada.
//
// Uso: node scripts/inspect-audit-logs.mjs [--limit=20]

import { getDb } from './lib/admin-init.mjs';

function parseArgs(argv) {
  const args = { limit: 20 };
  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, '').split('=');
    if (key === 'limit') args.limit = Math.max(1, Number(value) || 20);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = getDb();

  const snapshot = await db.ref('amecoSpotPlanner/auditLogs')
    .limitToLast(args.limit)
    .once('value');

  const logs = Object.values(snapshot.val() || {})
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  console.log(`[inspect-audit] ${logs.length} registro(s) (de los últimos ${args.limit} por orden de escritura):`);
  logs.forEach(log => {
    console.log(`  - ${log.createdAt}  ${log.action}  ${log.entity}/${log.entityId}  "${log.summary}"`);
  });

  if (!logs.length) {
    console.log('[inspect-audit] No hay ningún registro en amecoSpotPlanner/auditLogs.');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[inspect-audit] ERROR:', error.message);
    process.exit(1);
  });
