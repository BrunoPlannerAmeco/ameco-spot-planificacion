#!/usr/bin/env node
// Exporta un nodo de la RTDB de AMECO Spot Planner a un archivo JSON con fecha,
// usando el Admin SDK (lectura server-side, sin pasar por las reglas de cliente).
// Uso: node scripts/backup-rtdb.mjs [--root=amecoSpotPlanner] [--out-dir=backups/rtdb] [--reason=manual]

import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { getDb } from './lib/admin-init.mjs';
import { captureSnapshot } from './lib/snapshot.mjs';

const DAILY_RETENTION = 30;
const MONTHLY_RETENTION = 12;

function parseArgs(argv) {
  const args = { root: 'amecoSpotPlanner', outDir: 'backups/rtdb', reason: 'manual' };
  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, '').split('=');
    if (key === 'root') args.root = value;
    if (key === 'out-dir') args.outDir = value;
    if (key === 'reason') args.reason = value;
  }
  return args;
}

function loadManifest(manifestPath) {
  if (!existsSync(manifestPath)) return [];
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return [];
  }
}

function pruneRetention(manifest, outDir) {
  // Conserva los últimos DAILY_RETENTION respaldos, más uno por mes hasta
  // MONTHLY_RETENTION meses (el más antiguo de cada mes calendario).
  const sorted = [...manifest].sort((a, b) => b.exportedAt.localeCompare(a.exportedAt));
  const keep = new Set(sorted.slice(0, DAILY_RETENTION).map(entry => entry.file));

  const byMonth = new Map();
  for (const entry of sorted) {
    const monthKey = entry.exportedAt.slice(0, 7);
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, entry);
  }
  for (const entry of Array.from(byMonth.values()).slice(0, MONTHLY_RETENTION)) {
    keep.add(entry.file);
  }

  const kept = [];
  const removed = [];
  for (const entry of sorted) {
    if (keep.has(entry.file)) {
      kept.push(entry);
    } else {
      removed.push(entry);
      const filePath = join(outDir, entry.file);
      if (existsSync(filePath)) unlinkSync(filePath);
    }
  }
  return { kept, removed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(args.outDir, { recursive: true });

  console.log(`[backup] Exportando nodo "${args.root}" (motivo: ${args.reason})...`);
  const db = getDb();
  const { envelope, filePath, sizeBytes } = await captureSnapshot(db, {
    root: args.root,
    outDir: args.outDir,
    reason: args.reason,
  });

  if (envelope.data === null) {
    console.warn(`[backup] ADVERTENCIA: el nodo "${args.root}" está vacío o no existe.`);
  }

  const manifestPath = join(args.outDir, 'manifest.json');
  const manifest = loadManifest(manifestPath);
  manifest.push({
    file: filePath.split(/[\\/]/).pop(),
    exportedAt: envelope.exportedAt,
    reason: envelope.reason,
    root: envelope.root,
    sizeBytes,
    counts: envelope.counts,
  });

  const { kept, removed } = pruneRetention(manifest, args.outDir);
  writeFileSync(manifestPath, JSON.stringify(kept, null, 2), 'utf8');

  console.log(`[backup] Respaldo escrito en ${filePath} (${sizeBytes} bytes).`);
  console.log(`[backup] Conteos:`, envelope.counts);
  if (removed.length) {
    console.log(`[backup] Rotación: ${removed.length} respaldo(s) antiguo(s) eliminado(s) por retención.`);
  }
  console.log(`[backup] Respaldos conservados tras rotación: ${kept.length}.`);
}

main().catch(error => {
  console.error('[backup] ERROR:', error.message);
  process.exit(1);
});
