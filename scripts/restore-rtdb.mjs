#!/usr/bin/env node
// Restaura un respaldo JSON de la RTDB de AMECO Spot Planner usando el Admin SDK.
// Por defecto corre en modo dry-run (no escribe nada). Requiere --confirm para
// ejecutar la restauración real, y siempre toma un snapshot de seguridad del
// estado actual ANTES de sobrescribir (igual que hace la app para el usuario).
//
// Uso:
//   node scripts/restore-rtdb.mjs <archivo-de-respaldo.json> [--confirm] [--root=amecoSpotPlanner]

import { readFileSync } from 'node:fs';
import { getDb } from './lib/admin-init.mjs';
import { captureSnapshot, countEntities } from './lib/snapshot.mjs';

function parseArgs(argv) {
  const positional = argv.filter(a => !a.startsWith('--'));
  const args = { file: positional[0], confirm: false, root: null, outDir: 'backups/rtdb/pre-restore' };
  for (const raw of argv) {
    if (raw === '--confirm') args.confirm = true;
    const [key, value] = raw.replace(/^--/, '').split('=');
    if (key === 'root') args.root = value;
    if (key === 'out-dir') args.outDir = value;
  }
  return args;
}

function diffCounts(expected, actual) {
  const keys = new Set([...Object.keys(expected || {}), ...Object.keys(actual || {})]);
  const mismatches = [];
  for (const key of keys) {
    const expectedCount = expected?.[key] ?? 0;
    const actualCount = actual?.[key] ?? 0;
    if (expectedCount !== actualCount) {
      mismatches.push({ key, expectedCount, actualCount });
    }
  }
  return mismatches;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    throw new Error('Falta el archivo de respaldo a restaurar. Uso: node scripts/restore-rtdb.mjs <archivo.json> [--confirm]');
  }

  const backupContent = readFileSync(args.file, 'utf8');
  const envelope = JSON.parse(backupContent);
  const root = args.root || envelope.root;

  if (!root) {
    throw new Error('El respaldo no especifica "root" y no se indicó --root=<nodo>.');
  }

  console.log(`[restore] Archivo: ${args.file}`);
  console.log(`[restore] Nodo destino: ${root}`);
  console.log(`[restore] Respaldo generado: ${envelope.exportedAt} (motivo: ${envelope.reason})`);
  console.log(`[restore] Conteos en el respaldo:`, envelope.counts);

  const db = getDb();

  console.log('[restore] Tomando snapshot de seguridad del estado ANTES de restaurar...');
  const preRestore = await captureSnapshot(db, {
    root,
    outDir: args.outDir,
    reason: 'pre-restore-safety-net',
    filenamePrefix: `${root}_pre-restore`,
  });
  console.log(`[restore] Snapshot de seguridad guardado en ${preRestore.filePath}.`);

  if (!args.confirm) {
    console.log('[restore] MODO DRY-RUN: no se escribió nada. Vuelve a ejecutar con --confirm para restaurar de verdad.');
    return;
  }

  console.log('[restore] Escribiendo respaldo en la RTDB (sobrescribe el nodo completo)...');
  await db.ref(root).set(envelope.data);

  console.log('[restore] Verificando datos escritos...');
  const verifySnapshot = await db.ref(root).once('value');
  const actualCounts = countEntities(verifySnapshot.val());
  const mismatches = diffCounts(envelope.counts, actualCounts);

  if (mismatches.length) {
    console.error('[restore] VERIFICACIÓN FALLIDA. Diferencias encontradas:', mismatches);
    console.error(`[restore] El estado previo a la restauración quedó respaldado en ${preRestore.filePath} por si se necesita revertir.`);
    process.exit(1);
  }

  console.log('[restore] Verificación OK: los conteos post-restauración coinciden con el respaldo.');
  console.log(`[restore] Restauración completada. Snapshot pre-restauración disponible en ${preRestore.filePath}.`);
}

main()
  .then(() => process.exit(0)) // el Admin SDK mantiene el socket de RTDB abierto; sin esto el proceso nunca termina.
  .catch(error => {
    console.error('[restore] ERROR:', error.message);
    process.exit(1);
  });
