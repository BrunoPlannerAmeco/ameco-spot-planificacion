import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { firebaseConfig } from "../config/firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storageRoot = "amecoSpotPlanner/storage";

let authReadyResolve;
const authReady = new Promise(resolve => {
  authReadyResolve = resolve;
});

function encodeKey(key) {
  return btoa(unescape(encodeURIComponent(String(key))))
    .replaceAll("/", "_")
    .replaceAll("+", "-")
    .replaceAll("=", "");
}

function decodeKey(encoded) {
  let value = encoded.replaceAll("_", "/").replaceAll("-", "+");
  while (value.length % 4) value += "=";
  return decodeURIComponent(escape(atob(value)));
}

function keyRef(key) {
  return ref(db, `${storageRoot}/${encodeKey(key)}`);
}

onAuthStateChanged(auth, user => {
  if (user) {
    authReadyResolve(user);
    document.documentElement.dataset.firebase = "connected";
    window.dispatchEvent(new CustomEvent("ameco-firebase-ready"));
  }
});

await signInAnonymously(auth);
await authReady;

/**
 * Adaptador compatible con la API window.storage utilizada por el sistema
 * original. El segundo parámetro ("shared") se conserva por compatibilidad.
 */
window.storage = {
  async get(key, shared = true) {
    await authReady;
    const snapshot = await get(keyRef(key));
    if (!snapshot.exists()) return null;
    return { value: snapshot.val() };
  },

  async set(key, value, shared = true) {
    await authReady;
    await set(keyRef(key), value);
    return { key, value };
  },

  async delete(key, shared = true) {
    await authReady;
    await remove(keyRef(key));
    return { key };
  }
};

// Sincronización entre equipos y pestañas.
onValue(ref(db, storageRoot), snapshot => {
  const values = snapshot.val() || {};
  for (const [encodedKey, value] of Object.entries(values)) {
    try {
      window.dispatchEvent(new CustomEvent("ameco-storage-changed", {
        detail: { key: decodeKey(encodedKey), value }
      }));
    } catch (error) {
      console.warn("No se pudo interpretar una clave sincronizada.", error);
    }
  }
});

// app.js es clásico y espera window.storage disponible al iniciar.
const script = document.createElement("script");
script.src = "js/app.js";
script.defer = true;
script.onerror = () => {
  console.error("No se pudo cargar js/app.js");
  alert("No se pudo iniciar AMECO Spot Planner.");
};
document.body.appendChild(script);
