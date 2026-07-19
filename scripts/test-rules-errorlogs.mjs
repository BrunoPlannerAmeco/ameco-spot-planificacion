#!/usr/bin/env node
// Prueba REAL de que database.rules.json permite al Lector escribir (solo
// push append-only, sin poder leer) en errorLogs — la única excepción a
// "Lector no puede escribir nada" (CHK-01), confirmada para CHK-09 porque
// los errores de cliente también deben quedar registrados cuando le pasan
// a un Lector. Lectura sigue exclusiva de Administrador, igual que
// auditLogs (clasificación "Técnico: interno restringido").
//
// Requiere FIREBASE_DATABASE_EMULATOR_HOST (nunca corre contra producción).

import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  setupRulesTestEnv,
  createSequentialChecker,
  ADMIN_UID,
  PLANNER_UID,
  VIEWER_UID,
} from './lib/rules-test-env.mjs';

function buildEntry(uid, overrides = {}) {
  return {
    uid,
    severity: 'critical',
    message: 'Error de prueba',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

async function main() {
  const { testEnv, adminDb, plannerDb, viewerDb } = await setupRulesTestEnv();
  const { check, failures } = createSequentialChecker();

  try {
    console.log('[test-rules] [errorLogs] Lector escribe su propio registro (debe PERMITIR)...');
    const viewerRef = viewerDb.ref('amecoSpotPlanner/errorLogs').push();
    await check('errorLogs: viewer puede crear su propio registro', assertSucceeds(
      viewerRef.set({ id: viewerRef.key, ...buildEntry(VIEWER_UID) })
    ));

    console.log('[test-rules] [errorLogs] Planificador escribe su propio registro (debe PERMITIR)...');
    const plannerRef = plannerDb.ref('amecoSpotPlanner/errorLogs').push();
    await check('errorLogs: planner puede crear su propio registro', assertSucceeds(
      plannerRef.set({ id: plannerRef.key, ...buildEntry(PLANNER_UID, { severity: 'error' }) })
    ));

    console.log('[test-rules] [errorLogs] Administrador escribe su propio registro (debe PERMITIR)...');
    const adminRef = adminDb.ref('amecoSpotPlanner/errorLogs').push();
    await check('errorLogs: admin puede crear su propio registro', assertSucceeds(
      adminRef.set({ id: adminRef.key, ...buildEntry(ADMIN_UID) })
    ));

    console.log('[test-rules] [errorLogs] Lector intenta escribir con uid ajeno (debe RECHAZAR)...');
    const spoofRef = viewerDb.ref('amecoSpotPlanner/errorLogs').push();
    await check('errorLogs: viewer no puede falsificar el uid', assertFails(
      spoofRef.set({ id: spoofRef.key, ...buildEntry(ADMIN_UID) })
    ));

    console.log('[test-rules] [errorLogs] Severidad inválida (debe RECHAZAR)...');
    const badSeverityRef = viewerDb.ref('amecoSpotPlanner/errorLogs').push();
    await check('errorLogs: severidad debe ser critical o error', assertFails(
      badSeverityRef.set({ id: badSeverityRef.key, ...buildEntry(VIEWER_UID, { severity: 'info' }) })
    ));

    console.log('[test-rules] [errorLogs] Administrador intenta SOBRESCRIBIR un registro existente (debe RECHAZAR)...');
    await check('errorLogs: nadie puede sobrescribir un registro existente', assertFails(
      adminDb.ref(`amecoSpotPlanner/errorLogs/${viewerRef.key}`).set({
        id: viewerRef.key, ...buildEntry(VIEWER_UID, { message: 'editado' }),
      })
    ));

    console.log('[test-rules] [errorLogs] Lector intenta leer (debe RECHAZAR)...');
    await check('errorLogs: viewer no puede leer', assertFails(
      viewerDb.ref('amecoSpotPlanner/errorLogs').once('value')
    ));

    console.log('[test-rules] [errorLogs] Planificador intenta leer (debe RECHAZAR)...');
    await check('errorLogs: planner no puede leer', assertFails(
      plannerDb.ref('amecoSpotPlanner/errorLogs').once('value')
    ));

    console.log('[test-rules] [errorLogs] Administrador lee (debe PERMITIR)...');
    await check('errorLogs: admin puede leer', assertSucceeds(
      adminDb.ref('amecoSpotPlanner/errorLogs').once('value')
    ));

    if (failures.length) {
      console.error('[test-rules] FALLO en:', failures.map(f => f.name));
      failures.forEach(f => console.error(`  - ${f.name}:`, f.error?.message || f.error));
      throw new Error(`${failures.length} verificación(es) de reglas fallaron.`);
    }

    console.log('[test-rules] ÉXITO: errorLogs acepta la excepción de escritura del Lector, es append-only y solo Admin puede leerlo.');
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
