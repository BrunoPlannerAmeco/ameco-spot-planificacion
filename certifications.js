import {
  getDatabase,
  ref,
  get,
  set,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { firebaseApp } from "./auth-service.js";

const db = getDatabase(firebaseApp);
const storageRoot = "amecoSpotPlanner/storage";

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

window.storage = {
  async get(key) {
    const snapshot = await get(keyRef(key));
    if (!snapshot.exists()) return null;
    return { value: snapshot.val() };
  },

  async set(key, value) {
    await set(keyRef(key), value);
    return { key, value };
  },

  async delete(key) {
    await remove(keyRef(key));
    return { key };
  }
};

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

export function loadLegacyApp() {
  if (document.querySelector('script[data-ameco-app="true"]')) return;

  const script = document.createElement("script");
  script.src = "js/app.js";
  script.defer = true;
  script.dataset.amecoApp = "true";
  script.onerror = () => {
    console.error("No se pudo cargar js/app.js");
    alert("No se pudo iniciar AMECO Spot Planner.");
  };
  document.body.appendChild(script);
}
