#!/usr/bin/env node
// Primera migración REAL de CHK-06 (fase 1): copia los tipos de equipo
// desde el blob legacyStorage hacia nodos individuales
// amecoSpotPlanner/equiposCatalog/{key}, que a diferencia de workers/{id}
// SÍ pasan a ser la fuente de lectura en vivo de la app (ver
// amecoAccessApi.subscribeEquiposCatalog en index.html).
//
// NO DESTRUCTIVO: solo lee legacyStorage y escribe en equiposCatalog. No
// borra ni modifica legacyStorage. Es seguro correrlo más de una vez
// (idempotente: sobrescribe cada entrada con el mismo valor).
// Por defecto corre en dry-run; usa --confirm para escribir de verdad.
//
// Uso: node scripts/migrate-equipos-node.mjs [--confirm]

import { getDb } from './lib/admin-init.mjs';

const STORAGE_KEY = 'faena_personal_db_v1';

const DEFAULT_EQUIPOS = [
  'Grúa Horquilla', 'Grúa Pluma', 'Camión Pluma', 'Manlift / Alzahombre',
  'Minicargador', 'Grúa Telescópica', 'Camión Grúa', 'Otro',
];

// Misma codificación que encodeKey()/encodeCatalogKey() en index.html: base64 URL-safe.
function encodeCatalogKey(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replaceAll('/', '_')
    .replaceAll('+', '-')
    .replaceAll('=', '');
}

function parseArgs(argv) {
  return { confirm: argv.includes('--confirm') };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = getDb();

  const encodedKey = encodeCatalogKey(STORAGE_KEY);
  const snapshot = await db.ref(`amecoSpotPlanner/legacyStorage/${encodedKey}`).once('value');
  const raw = snapshot.val();
  const payload = raw ? JSON.parse(raw) : {};

  const equipos = Array.isArray(payload.equipos) && payload.equipos.length
    ? payload.equipos
    : DEFAULT_EQUIPOS;

  const names = [...new Set(equipos.filter(name => typeof name === 'string' && name.trim()))];
  console.log(`[migrate-equipos] ${names.length} tipo(s) de equipo listo(s) para migrar (${raw ? 'desde legacyStorage' : 'DEFAULT_EQUIPOS, legacyStorage vacío'}).`);
  names.forEach(name => console.log(`  - ${name}`));

  if (!args.confirm) {
    console.log('[migrate-equipos] MODO DRY-RUN: no se escribió nada. Usa --confirm para migrar de verdad.');
    return;
  }

  const updates = {};
  for (const name of names) {
    updates[`amecoSpotPlanner/equiposCatalog/${encodeCatalogKey(name)}`] = { nombre: name };
  }

  await db.ref().update(updates);
  console.log(`[migrate-equipos] ${names.length} tipo(s) de equipo escritos en amecoSpotPlanner/equiposCatalog.`);
  console.log('[migrate-equipos] legacyStorage no fue modificado.');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[migrate-equipos] ERROR:', error.message);
    process.exit(1);
  });
