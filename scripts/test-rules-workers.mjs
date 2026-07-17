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

import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { setupRulesTestEnv, createSequentialChecker } from './lib/rules-test-env.mjs';

const WORKER_ID = 'w-rules-test-1';

async function main() {
  const { testEnv, adminDb, plannerDb, viewerDb } = await setupRulesTestEnv();

  try {
    const workerRef = (db) => db.ref(`amecoSpotPlanner/workers/${WORKER_ID}`);
    const sampleWorker = { id: WORKER_ID, rut: '11111111-1', nombre: 'Trabajador de Prueba', cargo: 'Guardia' };

    const { check, failures } = createSequentialChecker();

    console.log('[test-rules] 1/6 Viewer intenta crear un trabajador (debe RECHAZAR)...');
    await check('viewer no puede crear', assertFails(workerRef(viewerDb).set(sampleWorker)));

    console.log('[test-rules] 2/6 Planificador crea un trabajador (debe PERMITIR)...');
    await check('planner puede crear', assertSucceeds(workerRef(plannerDb).set(sampleWorker)));

    console.log('[test-rules] 3/6 Planificador edita ese trabajador (debe PERMITIR)...');
    await check('planner puede editar', assertSucceeds(workerRef(plannerDb).update({ cargo: 'Supervisor' })));

    console.log('[test-rules] 4/6 Planificador intenta ELIMINAR ese trabajador (debe RECHAZAR)...');
    await check('planner NO puede eliminar', assertFails(workerRef(plannerDb).remove()));

    console.log('[test-rules] 5/6 Verificando que el trabajador sigue existiendo tras el intento de borrado...');
    await check('worker sigue existiendo', assertSucceeds(
      workerRef(adminDb).once('value').then(snap => {
        if (!snap.exists()) throw new Error('El trabajador fue borrado; el intento de planner debió fallar.');
      })
    ));

    console.log('[test-rules] 6/6 Administrador elimina ese trabajador (debe PERMITIR)...');
    await check('admin puede eliminar', assertSucceeds(workerRef(adminDb).remove()));

    if (failures.length) {
      console.error('[test-rules] FALLO en:', failures.map(f => f.name));
      failures.forEach(f => console.error(`  - ${f.name}:`, f.error?.message || f.error));
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
