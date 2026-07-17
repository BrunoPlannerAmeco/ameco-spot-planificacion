// RTDB reordena las claves de un objeto (alfabéticamente) al guardar y
// volver a leer, así que comparar JSON con JSON.stringify da falsos
// negativos. Comparación estructural real, indiferente al orden de claves.
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return a === b;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(key => deepEqual(a[key], b[key]));
}
