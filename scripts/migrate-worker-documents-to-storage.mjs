#!/usr/bin/env node
// CHK-02 Fase 3: migra documentos de trabajadores que todavía guardan el
// archivo como Base64 dentro de legacyStorage (formato anterior a la Fase 2)
// hacia Firebase Storage, dejando en RTDB solo metadata — igual que ya
// hacen los documentos nuevos desde la Fase 2.
//
// Idempotente: una clave que ya tenga storagePath se salta. Por defecto
// corre en dry-run (no sube ni modifica nada); usa --confirm para migrar
// de verdad. Antes de correr con --confirm, asegúrate de tener un backup
// reciente (scripts/backup-rtdb.mjs o el workflow diario de CHK-07) — si
// algo sale mal, restore-rtdb.mjs devuelve legacyStorage a como estaba.
//
// El modo dry-run solo lee RTDB y no necesita permisos de Storage. Subir
// de verdad (--confirm) requiere que el service account tenga además un
// rol IAM de Storage (ej. "Storage Object Admin") — el rol
// "Firebase Realtime Database Admin" que ya usan los otros scripts no
// alcanza. Ver docs/CONFIGURAR_SERVICE_ACCOUNT.md.
//
// Uso: node scripts/migrate-worker-documents-to-storage.mjs [--confirm]

import { getDb, getBucket } from './lib/admin-init.mjs';

const LEGACY_STORAGE_ROOT = 'amecoSpotPlanner/legacyStorage';

// Misma codificación/decodificación que encodeKey()/decodeKey() en
// index.html (base64 URL-safe).
function decodeStorageKey(encoded) {
  let value = encoded.replaceAll('_', '/').replaceAll('-', '+');
  while (value.length % 4) value += '=';
  return Buffer.from(value, 'base64').toString('utf8');
}

function parseArgs(argv) {
  const args = { confirm: argv.includes('--confirm'), limit: null };
  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, '').split('=');
    if (key === 'limit') args.limit = Math.max(1, Number(value) || 0) || null;
  }
  return args;
}

function findMigrationCandidates(entries) {
  const candidates = [];

  for (const [encodedKey, rawValue] of Object.entries(entries)) {
    const key = decodeStorageKey(encodedKey);
    if (!key.startsWith('doc__')) continue;

    let parsed;
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      continue; // no es un documento JSON válido, se ignora
    }

    if (parsed.storagePath) continue; // ya migrado (Fase 2 o corrida anterior)
    if (typeof parsed.data !== 'string' || !parsed.data) continue; // formato desconocido, se ignora por seguridad

    candidates.push({ encodedKey, key, parsed });
  }

  return candidates;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = getDb();

  console.log('[migrate-docs] Leyendo legacyStorage...');
  const snapshot = await db.ref(LEGACY_STORAGE_ROOT).once('value');
  const entries = snapshot.val() || {};
  console.log(`[migrate-docs] ${Object.keys(entries).length} clave(s) en legacyStorage.`);

  const allCandidates = findMigrationCandidates(entries);
  const totalBytes = allCandidates.reduce(
    (sum, c) => sum + Buffer.byteLength(c.parsed.data, 'base64'),
    0
  );

  console.log(
    `[migrate-docs] ${allCandidates.length} documento(s) en formato Base64 para migrar ` +
    `(~${(totalBytes / 1024 / 1024).toFixed(2)} MB en total).`
  );

  if (!allCandidates.length) {
    console.log('[migrate-docs] Nada que migrar.');
    return;
  }

  const candidates = args.limit ? allCandidates.slice(0, args.limit) : allCandidates;
  if (args.limit) {
    console.log(`[migrate-docs] --limit=${args.limit}: se procesarán solo ${candidates.length} de ${allCandidates.length}.`);
  }

  if (!args.confirm) {
    console.log('[migrate-docs] MODO DRY-RUN: no se subió ni modificó nada.');
    candidates.slice(0, 20).forEach(c => {
      console.log(`  - ${c.key} (${c.parsed.nombre || 'sin nombre'})`);
    });
    if (candidates.length > 20) {
      console.log(`  ... y ${candidates.length - 20} más.`);
    }
    console.log('[migrate-docs] Usa --confirm para migrar de verdad (requiere backup previo). Agrega --limit=N para probar con pocos documentos primero.');
    return;
  }

  const bucket = getBucket();
  let migrated = 0;
  let failed = 0;

  for (const { encodedKey, key, parsed } of candidates) {
    try {
      const storagePath = `workerDocuments/${key}`;
      const buffer = Buffer.from(parsed.data, 'base64');

      await bucket.file(storagePath).save(buffer, {
        contentType: parsed.mime || 'application/octet-stream',
        resumable: false,
      });

      const metadata = {
        nombre: parsed.nombre || '',
        mime: parsed.mime || '',
        storagePath,
        sizeBytes: buffer.length,
        uploadedAt: new Date().toISOString(),
      };

      await db.ref(`${LEGACY_STORAGE_ROOT}/${encodedKey}`).set(JSON.stringify(metadata));

      migrated++;
      console.log(`[migrate-docs] OK: ${key} (${buffer.length} bytes)`);
    } catch (error) {
      failed++;
      console.error(`[migrate-docs] ERROR migrando ${key}:`, error.message);
    }
  }

  console.log(`[migrate-docs] Migrados: ${migrated}. Fallidos: ${failed}.`);
  if (failed > 0) {
    console.error('[migrate-docs] Algunos documentos no se pudieron migrar; quedaron en su formato anterior (siguen funcionando, viewDocument los sigue leyendo).');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[migrate-docs] ERROR:', error.message);
    process.exit(1);
  });
