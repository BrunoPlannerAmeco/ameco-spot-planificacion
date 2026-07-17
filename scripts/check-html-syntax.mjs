#!/usr/bin/env node
// Extrae los <script> inline de index.html (sin atributo src) y valida que
// cada uno sea JavaScript sintácticamente correcto, usando el parser real
// de V8 (vm.Script), no una revisión visual. La wiki exige "validar sintaxis
// JavaScript... antes de commitear"; esto lo hace de forma verificable en CI
// en vez de confiar en que quien edita el archivo (humano o IA) no se
// equivocó en un archivo de más de 9000 líneas.

import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const FILE = 'index.html';

function extractInlineScripts(html) {
  const scripts = [];
  const regex = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;
    const body = match[2];
    if (!body.trim()) continue;
    const lineNumber = html.slice(0, match.index).split('\n').length;
    scripts.push({ body, lineNumber });
  }
  return scripts;
}

function main() {
  const html = readFileSync(FILE, 'utf8');
  const scripts = extractInlineScripts(html);

  console.log(`[check-syntax] ${scripts.length} bloque(s) <script> inline encontrados en ${FILE}.`);

  const errors = [];
  scripts.forEach(({ body, lineNumber }, index) => {
    try {
      new Script(body, { filename: `${FILE}:inline-script-${index + 1}` });
    } catch (error) {
      errors.push({ index: index + 1, lineNumber, message: error.message });
    }
  });

  if (errors.length) {
    console.error('[check-syntax] ERRORES DE SINTAXIS ENCONTRADOS:');
    errors.forEach(e => {
      console.error(`  - Bloque #${e.index} (empieza cerca de la línea ${e.lineNumber}): ${e.message}`);
    });
    process.exit(1);
  }

  console.log('[check-syntax] OK: todos los bloques <script> inline son sintácticamente válidos.');
}

main();
