#!/usr/bin/env node
// Prueba REAL (no teórica) de que database.rules.json impide a un
// Planificador eliminar un trabajador en amecoSpotPlanner/workers/{id},
// mientras que sí puede crear/editar, y un Administrador puede todo.
//
// A diferencia del Admin SDK (que siempre ignora las reglas), esto usa
// @firebase/rules-unit-testing para simular usuarios autenticados reales
// sujetos a las reglas, contra el emulador de RTDB. Es la única forma
// honesta de probar reglas de seguridad.
//
// Requiere FIREBASE_DATABASE_EMULATOR_HOST (nunca corre contra producción).

import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-ameco-spot-planificacion';
const ADMIN_UID = 'test-admin-uid';
const PLANNER_UID = 'test-planner-uid';
const VIEWER_UID = 'test-viewer-uid';
const WORKER_ID = 'w-rules-test-1';

function assertEmulator() {
  if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    throw new Error(
      'FIREBASE_DATABASE_EMULATOR_HOST no está definido. Esta prueba NUNCA debe ' +
      'correr contra la base de datos real; usa "npm run test:rules".'
    );
  }
}

async function main() {
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

  try {
    console.log('[test-rules] Sembrando accessMeta y perfiles de usuario (sin reglas)...');
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

    const plannerDb = testEnv.authenticatedContext(PLANNER_UID, { email: 'planner@example.com' }).database();
    const viewerDb = testEnv.authenticatedContext(VIEWER_UID, { email: 'viewer@example.com' }).database();
    const adminDb = testEnv.authenticatedContext(ADMIN_UID, { email: 'admin@example.com' }).database();

    const workerRef = (db) => db.ref(`amecoSpotPlanner/workers/${WORKER_ID}`);
    const sampleWorker = { id: WORKER_ID, rut: '11111111-1', nombre: 'Trabajador de Prueba', cargo: 'Guardia' };

    const checks = [];

    console.log('[test-rules] 1/6 Viewer intenta crear un trabajador (debe RECHAZAR)...');
    checks.push(['viewer no puede crear', assertFails(workerRef(viewerDb).set(sampleWorker))]);

    console.log('[test-rules] 2/6 Planificador crea un trabajador (debe PERMITIR)...');
    checks.push(['planner puede crear', assertSucceeds(workerRef(plannerDb).set(sampleWorker))]);

    console.log('[test-rules] 3/6 Planificador edita ese trabajador (debe PERMITIR)...');
    checks.push(['planner puede editar', assertSucceeds(workerRef(plannerDb).update({ cargo: 'Supervisor' }))]);

    console.log('[test-rules] 4/6 Planificador intenta ELIMINAR ese trabajador (debe RECHAZAR)...');
    checks.push(['planner NO puede eliminar', assertFails(workerRef(plannerDb).remove())]);

    console.log('[test-rules] 5/6 Verificando que el trabajador sigue existiendo tras el intento de borrado...');
    checks.push(['worker sigue existiendo', assertSucceeds(
      workerRef(adminDb).once('value').then(snap => {
        if (!snap.exists()) throw new Error('El trabajador fue borrado; el intento de planner debió fallar.');
      })
    )]);

    console.log('[test-rules] 6/6 Administrador elimina ese trabajador (debe PERMITIR)...');
    checks.push(['admin puede eliminar', assertSucceeds(workerRef(adminDb).remove())]);

    const results = await Promise.allSettled(checks.map(([, promise]) => promise));
    const failures = results
      .map((result, index) => ({ name: checks[index][0], result }))
      .filter(({ result }) => result.status === 'rejected');

    if (failures.length) {
      console.error('[test-rules] FALLO en:', failures.map(f => f.name));
      failures.forEach(f => console.error(`  - ${f.name}:`, f.result.reason?.message || f.result.reason));
      throw new Error(`${failures.length} verificación(es) de reglas fallaron.`);
    }

    console.log('[test-rules] ÉXITO: las reglas de amecoSpotPlanner/workers/{id} se comportan como exige la matriz de permisos.');
  } finally {
    await testEnv.cleanup();
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[test-rules] ERROR:', error.message);
    process.exit(1);
  });
