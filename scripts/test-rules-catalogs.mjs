#!/usr/bin/env node
// Prueba REAL de que database.rules.json restringe cargosCatalog/faenasCatalog
// (extensión de CHK-01 a cargos y faenas) y equiposCatalog (CHK-06 fase 1,
// primer nodo con lectura en vivo real) exclusivamente a Administrador —
// "Configurar cargos/faenas" en la matriz de permisos es Sí/No/No para
// Admin/Planificador/Lector, a diferencia de workers (donde Planificador sí
// puede crear/editar); equipos sigue el mismo patrón. Mismo esqueleto que
// test-rules-workers.mjs, cubriendo los tres catálogos porque comparten
// exactamente la misma regla.
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

  console.log(`[test-rules] [${catalogPath}] Planificador intenta crear (debe RECHAZAR)...`);
  await check(`${catalogPath}: planner no puede crear`, assertFails(ref(plannerDb).set(entry)));

  console.log(`[test-rules] [${catalogPath}] Administrador crea (debe PERMITIR)...`);
  await check(`${catalogPath}: admin puede crear`, assertSucceeds(ref(adminDb).set(entry)));

  console.log(`[test-rules] [${catalogPath}] Planificador intenta editar (debe RECHAZAR)...`);
  await check(`${catalogPath}: planner no puede editar`, assertFails(ref(plannerDb).update({ nombre: `${label} editado` })));

  console.log(`[test-rules] [${catalogPath}] Planificador intenta ELIMINAR (debe RECHAZAR)...`);
  await check(`${catalogPath}: planner NO puede eliminar`, assertFails(ref(plannerDb).remove()));

  console.log(`[test-rules] [${catalogPath}] Verificando que la entrada sigue existiendo...`);
  await check(`${catalogPath}: entrada sigue existiendo`, assertSucceeds(
    ref(adminDb).once('value').then(snap => {
      if (!snap.exists()) throw new Error('La entrada fue borrada; ningún intento de planner debió tener efecto.');
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
    const equipoFailures = await testCatalog({
      label: 'Equipo', catalogPath: 'equiposCatalog', adminDb, plannerDb, viewerDb,
    });

    const allFailures = [...cargoFailures, ...faenaFailures, ...equipoFailures];
    if (allFailures.length) {
      console.error('[test-rules] FALLO en:', allFailures.map(f => f.name));
      allFailures.forEach(f => console.error(`  - ${f.name}:`, f.error?.message || f.error));
      throw new Error(`${allFailures.length} verificación(es) de reglas fallaron.`);
    }

    console.log('[test-rules] ÉXITO: cargosCatalog, faenasCatalog y equiposCatalog son exclusivos de Administrador, como exige la matriz de permisos.');
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
