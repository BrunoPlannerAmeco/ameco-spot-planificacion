import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const DEFAULT_PROJECT_ID = 'ameco-spot-planificacion';
const DEFAULT_STORAGE_BUCKET = 'ameco-spot-planificacion.firebasestorage.app';

function loadCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    return admin.credential.cert(JSON.parse(json));
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const json = readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8');
    return admin.credential.cert(JSON.parse(json));
  }

  throw new Error(
    'No se encontró credencial de service account. Define FIREBASE_SERVICE_ACCOUNT_BASE64 ' +
    'o GOOGLE_APPLICATION_CREDENTIALS (ver docs/CONFIGURAR_SERVICE_ACCOUNT.md).'
  );
}

let appInstance = null;

export function getAdminApp() {
  if (appInstance) return appInstance;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || DEFAULT_PROJECT_ID;
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    `https://${projectId}-default-rtdb.firebaseio.com`;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;

  // Contra el emulador (FIREBASE_DATABASE_EMULATOR_HOST) el Admin SDK no
  // valida credenciales reales: se omite el campo `credential` a propósito.
  const config = process.env.FIREBASE_DATABASE_EMULATOR_HOST
    ? { databaseURL, projectId, storageBucket }
    : { credential: loadCredential(), databaseURL, projectId, storageBucket };

  appInstance = admin.initializeApp(config);

  return appInstance;
}

export function getDb() {
  return getAdminApp().database();
}

export function getBucket() {
  return getAdminApp().storage().bucket();
}
