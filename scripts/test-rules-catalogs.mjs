#!/usr/bin/env node
// Prueba REAL de que database.rules.json impide a un Planificador eliminar
// entradas de cargosCatalog/faenasCatalog (extensión de CHK-01 a cargos y
// faenas), mientras que sí puede crear/editar, y un Administrador puede
// todo. Mismo patrón que test-rules-workers.mjs, cubriendo ambos catálogos
// porque comparten exactamente la misma regla.
//
// Requiere FIREBASE_DATABASE_EMULATOR_HOST (nunca corre contra producción).

import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { setupRulesTestEnv, createSequentialChecker } from './lib/rules-test-env.mjs';

async function testCatalog({ label, catalogPath, adminDb, plannerDb, viewerDb }) {
  const key = `${catalogPath}-test-1`;
  const ref = (db) => db.ref(`amecoSpotPlanner/${catalogPath}/${key}`);
  const entry = { nombre: `${label} de prueba` };

  const { check, failures } = createSequentialChecker();

  console.log(`[test-rules] [${catalogPath}] Viewer intenta crear (debe RECHAZAR)...`);
  await check(`${catalogPath}: viewer no puede crear`, assertFails(ref(viewerDb).set(entry)));

  console.log(`[test-rules] [${catalogPath}] Planificador crea (debe PERMITIR)...`);
  await check(`${catalogPath}: planner puede crear`, assertSucceeds(ref(plannerDb).set(entry)));

  console.log(`[test-rules] [${catalogPath}] Planificador edita (debe PERMITIR)...`);
  await check(`${catalogPath}: planner puede editar`, assertSucceeds(ref(plannerDb).update({ nombre: `${label} editado` })));

  console.log(`[test-rules] [${catalogPath}] Planificador intenta ELIMINAR (debe RECHAZAR)...`);
  await check(`${catalogPath}: planner NO puede eliminar`, assertFails(ref(plannerDb).remove()));

  console.log(`[test-rules] [${catalogPath}] Verificando que la entrada sigue existiendo...`);
  await check(`${catalogPath}: entrada sigue existiendo`, assertSucceeds(
    ref(adminDb).once('value').then(snap => {
      if (!snap.exists()) throw new Error('La entrada fue borrada; el intento de planner debió fallar.');
    })
  ));

  console.log(`[test-rules] [${catalogPath}] Administrador elimina (debe PERMITIR)...`);
  await check(`${catalogPath}: admin puede eliminar`, assertSucceeds(ref(adminDb).remove()));

  return failures;
}

async function main() {
  const { testEnv, adminDb, plannerDb, viewerDb } = await setupRulesTestEnv();

  try {
    const cargoFailures = await testCatalog({
      label: 'Cargo', catalogPath: 'cargosCatalog', adminDb, plannerDb, viewerDb,
    });
    const faenaFailures = await testCatalog({
      label: 'Faena', catalogPath: 'faenasCatalog', adminDb, plannerDb, viewerDb,
    });

    const allFailures = [...cargoFailures, ...faenaFailures];
    if (allFailures.length) {
      console.error('[test-rules] FALLO en:', allFailures.map(f => f.name));
      allFailures.forEach(f => console.error(`  - ${f.name}:`, f.error?.message || f.error));
      throw new Error(`${allFailures.length} verificación(es) de reglas fallaron.`);
    }

    console.log('[test-rules] ÉXITO: cargosCatalog y faenasCatalog se comportan como exige la matriz de permisos.');
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
