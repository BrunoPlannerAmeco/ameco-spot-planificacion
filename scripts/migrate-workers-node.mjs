#!/usr/bin/env node
// Primera cuña de CHK-06 / cierre de CHK-01: copia los trabajadores desde el
// blob legacyStorage hacia nodos individuales amecoSpotPlanner/workers/{id},
// que sí pueden tener reglas de RTDB por-registro (legacyStorage es un JSON
// opaco: las reglas no pueden restringir operaciones dentro de él).
//
// NO DESTRUCTIVO: solo lee legacyStorage y escribe en workers/{id}. No borra
// ni modifica legacyStorage. Es seguro correrlo más de una vez (idempotente).
// Por defecto corre en dry-run; usa --confirm para escribir de verdad.
//
// Uso: node scripts/migrate-workers-node.mjs [--confirm]

import { getDb } from './lib/admin-init.mjs';

const STORAGE_KEY = 'faena_personal_db_v1';

// Misma codificación que encodeKey() en index.html: base64 URL-safe.
function encodeStorageKey(key) {
  return Buffer.from(key, 'utf8')
    .toString('base64')
    .replaceAll('/', '_')
    .replaceAll('+', '-')
    .replaceAll('=', '');
}

// Misma normalización que normalizeRut() en index.html, más el guion que el
// cliente no garantiza (la wiki exige "sin puntos, con guion, DV en mayúscula").
function normalizeRut(rut) {
  const cleaned = String(rut || '').replace(/\./g, '').replace(/\s/g, '').toUpperCase();
  if (!cleaned) return '';
  if (cleaned.includes('-')) return cleaned;
  return cleaned.length > 1 ? `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}` : cleaned;
}

function parseArgs(argv) {
  return { confirm: argv.includes('--confirm') };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = getDb();

  const encodedKey = encodeStorageKey(STORAGE_KEY);
  const snapshot = await db.ref(`amecoSpotPlanner/legacyStorage/${encodedKey}`).once('value');
  const raw = snapshot.val();

  if (!raw) {
    console.log('[migrate-workers] No hay datos en legacyStorage todavía; nada que migrar.');
    return;
  }

  const payload = JSON.parse(raw);
  const workers = Array.isArray(payload.workers) ? payload.workers : [];
  console.log(`[migrate-workers] ${workers.length} trabajador(es) encontrados en legacyStorage.`);

  const seenRuts = new Map();
  const problems = [];
  const records = [];

  for (const worker of workers) {
    if (!worker || typeof worker !== 'object' || !worker.id) {
      problems.push({ worker: worker?.id || worker, reason: 'sin id' });
      continue;
    }
    const rut = normalizeRut(worker.rut);
    if (!/^[0-9]{1,8}-[0-9K]$/.test(rut)) {
      problems.push({ id: worker.id, reason: 'RUT no cumple el formato normalizado' });
      continue;
    }
    if (seenRuts.has(rut)) {
      problems.push({ id: worker.id, reason: `RUT duplicado (también en ${seenRuts.get(rut)})` });
      continue;
    }
    seenRuts.set(rut, worker.id);

    records.push({
      id: worker.id,
      rut,
      nombre: worker.nombre || [worker.nombres, worker.apellidos].filter(Boolean).join(' ') || worker.id,
      cargo: worker.cargo || '',
    });
  }

  console.log(`[migrate-workers] ${records.length} listo(s) para migrar, ${problems.length} con problema(s).`);
  if (problems.length) {
    console.log('[migrate-workers] No se migran (revisar manualmente):', problems);
  }

  if (!args.confirm) {
    console.log('[migrate-workers] MODO DRY-RUN: no se escribió nada. Usa --confirm para migrar de verdad.');
    return;
  }

  const updates = {};
  for (const record of records) {
    updates[`amecoSpotPlanner/workers/${record.id}`] = record;
  }

  await db.ref().update(updates);
  console.log(`[migrate-workers] ${records.length} trabajador(es) escritos en amecoSpotPlanner/workers/{id}.`);
  console.log('[migrate-workers] legacyStorage no fue modificado.');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[migrate-workers] ERROR:', error.message);
    process.exit(1);
  });
