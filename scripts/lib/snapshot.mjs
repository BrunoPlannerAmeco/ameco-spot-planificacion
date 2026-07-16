import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BACKUP_FORMAT = 'ameco-spot-planner-rtdb-backup';
const BACKUP_SCHEMA_VERSION = 1;

export function safeTimestamp(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function countEntities(data) {
  if (!data || typeof data !== 'object') return {};
  const counts = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object') {
      counts[key] = Array.isArray(value) ? value.length : Object.keys(value).length;
    }
  }
  return counts;
}

// Lee un nodo de la RTDB y lo guarda como archivo de respaldo con el mismo
// formato de envelope que usa el Centro de respaldos del cliente (BACKUP_GUIDE.md).
export async function captureSnapshot(db, { root, outDir, reason, filenamePrefix }) {
  mkdirSync(outDir, { recursive: true });

  const snapshot = await db.ref(root).once('value');
  const data = snapshot.val();
  const exportedAt = new Date();

  const envelope = {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    reason,
    projectId: process.env.FIREBASE_PROJECT_ID || 'ameco-spot-planificacion',
    root,
    counts: countEntities(data),
    data,
  };

  const filename = `${filenamePrefix || root}_${safeTimestamp(exportedAt)}.json`;
  const filePath = join(outDir, filename);
  const content = JSON.stringify(envelope, null, 2);
  writeFileSync(filePath, content, 'utf8');

  return { envelope, filePath, sizeBytes: Buffer.byteLength(content, 'utf8') };
}
