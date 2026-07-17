import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-ameco-spot-planificacion';
export const ADMIN_UID = 'test-admin-uid';
export const PLANNER_UID = 'test-planner-uid';
export const VIEWER_UID = 'test-viewer-uid';

export function assertEmulator() {
  if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    throw new Error(
      'FIREBASE_DATABASE_EMULATOR_HOST no está definido. Esta prueba NUNCA debe ' +
      'correr contra la base de datos real; usa el script *:emulator correspondiente.'
    );
  }
}

// Levanta el entorno de prueba de reglas y siembra accessMeta + los tres
// roles (admin/planner/viewer), que casi toda prueba de reglas necesita
// como punto de partida. Devuelve los tres contextos autenticados ya
// listos para usar.
export async function setupRulesTestEnv() {
  assertEmulator();

  const rules = readFileSync('database.rules.json', 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: {
      rules,
      host: process.env.FIREBASE_DATABASE_EMULATOR_HOST.split(':')[0],
      port: Number(process.env.FIREBASE_DATABASE_EMULATOR_HOST.split(':')[1]),
    },
  });

  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.database();
    await db.ref('amecoSpotPlanner/accessMeta').set({
      initialized: true,
      initializedAt: new Date().toISOString(),
      initializedBy: ADMIN_UID,
    });
    await db.ref(`amecoSpotPlanner/users/${ADMIN_UID}`).set({
      uid: ADMIN_UID, email: 'admin@example.com', role: 'admin', active: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    await db.ref(`amecoSpotPlanner/users/${PLANNER_UID}`).set({
      uid: PLANNER_UID, email: 'planner@example.com', role: 'planner', active: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    await db.ref(`amecoSpotPlanner/users/${VIEWER_UID}`).set({
      uid: VIEWER_UID, email: 'viewer@example.com', role: 'viewer', active: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  });

  return {
    testEnv,
    adminDb: testEnv.authenticatedContext(ADMIN_UID, { email: 'admin@example.com' }).database(),
    plannerDb: testEnv.authenticatedContext(PLANNER_UID, { email: 'planner@example.com' }).database(),
    viewerDb: testEnv.authenticatedContext(VIEWER_UID, { email: 'viewer@example.com' }).database(),
  };
}

// Cada paso de una prueba de reglas suele depender del estado que dejó el
// anterior (crear -> editar -> intentar borrar -> verificar), así que deben
// esperarse en orden estricto — lanzarlas todas juntas sin await hace que
// lleguen desordenadas al emulador y la prueba da falsos negativos.
export function createSequentialChecker() {
  const failures = [];
  async function check(name, promise) {
    try {
      await promise;
    } catch (error) {
      failures.push({ name, error });
    }
  }
  return { check, failures };
}
