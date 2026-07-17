#!/usr/bin/env node
// Compara las reglas realmente publicadas en Firebase (producción) contra
// database.rules.json en el repo. Publicar desde GitHub no publica las
// reglas (ver ROLE_SETUP_GUIDE.md) — hay que copiarlas manualmente en
// Firebase Console. Este script confirma que ese paso manual se hizo bien,
// sin escribir ni modificar ningún dato.

import { readFileSync } from 'node:fs';
import { getAdminApp } from './lib/admin-init.mjs';
import { deepEqual } from './lib/deep-equal.mjs';

async function main() {
  const app = getAdminApp();
  const { access_token: accessToken } = await app.options.credential.getAccessToken
    ? await app.options.credential.getAccessToken()
    : {};

  if (!accessToken) {
    throw new Error('No se pudo obtener un access token del service account.');
  }

  const databaseURL = app.options.databaseURL;
  console.log(`[verify-rules] Consultando reglas activas en ${databaseURL}...`);

  const response = await fetch(`${databaseURL}/.settings/rules.json`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`No se pudieron leer las reglas desplegadas: HTTP ${response.status} ${await response.text()}`);
  }

  const deployed = await response.json();
  const local = JSON.parse(readFileSync('database.rules.json', 'utf8'));

  if (!deepEqual(deployed, local)) {
    console.error('[verify-rules] DESALINEADAS: las reglas publicadas en Firebase NO coinciden con database.rules.json.');
    console.error('[verify-rules] Publicadas:', JSON.stringify(deployed, null, 2));
    console.error('[verify-rules] Repo:', JSON.stringify(local, null, 2));
    process.exit(1);
  }

  console.log('[verify-rules] OK: las reglas publicadas en Firebase coinciden exactamente con database.rules.json.');

  const workersRule = deployed?.rules?.amecoSpotPlanner?.workers?.['$workerId']?.['.write'];
  if (workersRule && workersRule.includes("newData.exists()")) {
    console.log('[verify-rules] Confirmado: la regla de amecoSpotPlanner/workers/{id} con restricción de borrado para Planificador está activa.');
  } else {
    console.warn('[verify-rules] ADVERTENCIA: no se encontró la regla esperada en workers/{id}; revisar manualmente.');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[verify-rules] ERROR:', error.message);
    process.exit(1);
  });
