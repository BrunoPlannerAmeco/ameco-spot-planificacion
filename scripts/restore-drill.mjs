#!/usr/bin/env node
// Simulacro automático de restauración: siembra datos de ejemplo en el
// EMULADOR de RTDB, corre backup-rtdb.mjs y restore-rtdb.mjs como los
// ejecutaría un operador real, borra el nodo y verifica que la restauración
// deja los datos exactamente como estaban. Es la prueba real (no teórica)
// que exige CHK-07: si este script falla, el procedimiento de restauración
// está roto.
//
// Requiere FIREBASE_DATABASE_EMULATOR_HOST (nunca corre contra producción).
// Uso local: npm run drill:emulator

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb } from './lib/admin-init.mjs';
import { countEntities } from './lib/snapshot.mjs';

const ROOT = 'amecoSpotPlanner';

function buildSeedData() {
  return {
    accessMeta: { initialized: true, initializedAt: '2026-01-01T00:00:00.000Z', initializedBy: 'drill-seed' },
    users: {
      'uid-admin-drill': {
        uid: 'uid-admin-drill', email: 'admin-drill@example.com',
        role: 'admin', active: true,
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      },
    },
    auditLogs: {
      'log-1': {
        id: 'log-1', uid: 'uid-admin-drill', email: 'admin-drill@example.com',
        role: 'admin', action: 'seed', entity: 'drill', summary: 'Datos de prueba del drill',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    },
    legacyStorage: {
      'faena_personal_db_v1': JSON.stringify({
        workers: [{ id: 'w1', nombre: 'Ana', apellido: 'Soto', rut: '11111111-1' }],
        servicios: [{ id: 's1', nombre: 'Servicio Drill' }],
        cargos: [{ id: 'c1', nombre: 'Guardia' }],
        faenas: [{ id: 'f1', nombre: 'Faena Drill' }],
        examplesSeeded: true,
      }),
    },
  };
}

function assertEmulator() {
  if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    throw new Error(
      'FIREBASE_DATABASE_EMULATOR_HOST no está definido. Este drill NUNCA debe correr ' +
      'contra la base de datos real; usa "npm run drill:emulator".'
    );
  }
}

function runScript(scriptPath, args) {
  return execFileSync('node', [scriptPath, ...args], {
    env: process.env,
    encoding: 'utf8',
  });
}

function deepCountsEqual(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? 0) !== (b[key] ?? 0)) return false;
  }
  return true;
}

// RTDB no conserva el orden de inserción de claves de un objeto (las
// reordena, típicamente alfabéticamente) al guardar y volver a leer, así que
// comparar con JSON.stringify da falsos negativos. Se necesita una
// comparación estructural real, indiferente al orden de las claves.
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return a === b;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(key => deepEqual(a[key], b[key]));
}

async function main() {
  assertEmulator();

  const timings = {};
  const tmpDir = mkdtempSync(join(tmpdir(), 'ameco-restore-drill-'));
  const db = getDb();

  console.log(`[drill] Directorio temporal: ${tmpDir}`);
  console.log('[drill] 1/6 Sembrando datos de ejemplo en el emulador...');
  let t0 = Date.now();
  const seedData = buildSeedData();
  await db.ref(ROOT).set(seedData);
  const seedCounts = countEntities(seedData);
  timings.seed = Date.now() - t0;

  console.log('[drill] 2/6 Ejecutando backup-rtdb.mjs (script real, no un mock)...');
  t0 = Date.now();
  runScript('scripts/backup-rtdb.mjs', [`--root=${ROOT}`, `--out-dir=${tmpDir}`, '--reason=drill']);
  timings.backup = Date.now() - t0;

  const manifest = JSON.parse(readFileSync(join(tmpDir, 'manifest.json'), 'utf8'));
  const lastEntry = manifest[manifest.length - 1];
  if (!lastEntry) throw new Error('El backup no generó una entrada en el manifest.');
  const backupFile = join(tmpDir, lastEntry.file);
  console.log(`[drill] Respaldo generado: ${backupFile}`);

  console.log('[drill] 3/6 Borrando el nodo para simular pérdida de datos...');
  t0 = Date.now();
  await db.ref(ROOT).set(null);
  timings.wipe = Date.now() - t0;

  const afterWipe = (await db.ref(ROOT).once('value')).val();
  if (afterWipe !== null) throw new Error('El nodo no quedó vacío tras el borrado simulado.');

  console.log('[drill] 4/6 Ejecutando restore-rtdb.mjs --confirm (script real)...');
  t0 = Date.now();
  const restoreOutput = runScript('scripts/restore-rtdb.mjs', [
    backupFile, '--confirm', `--root=${ROOT}`, `--out-dir=${join(tmpDir, 'pre-restore')}`,
  ]);
  timings.restore = Date.now() - t0;
  console.log(restoreOutput);

  console.log('[drill] 5/6 Verificando que los datos restaurados coinciden con el original...');
  const restored = (await db.ref(ROOT).once('value')).val();
  const restoredCounts = countEntities(restored);

  const countsMatch = deepCountsEqual(seedCounts, restoredCounts);
  const dataMatches = deepEqual(restored, seedData);

  console.log('[drill] 6/6 Limpiando...');
  rmSync(tmpDir, { recursive: true, force: true });

  const totalMs = Object.values(timings).reduce((a, b) => a + b, 0);
  console.log('[drill] Tiempos (ms):', timings, `total=${totalMs}`);

  if (!countsMatch || !dataMatches) {
    console.error('[drill] FALLO: los datos restaurados NO coinciden con el respaldo original.');
    console.error('[drill] Conteos esperados:', seedCounts, 'Conteos obtenidos:', restoredCounts);
    process.exit(1);
  }

  console.log('[drill] ÉXITO: ciclo completo de backup + restore verificado contra el emulador.');
}

main()
  .then(() => process.exit(0)) // el Admin SDK mantiene el socket de RTDB abierto; sin esto el proceso nunca termina.
  .catch(error => {
    console.error('[drill] ERROR:', error.message);
    process.exit(1);
  });
