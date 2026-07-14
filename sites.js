import {
  getDatabase,
  ref,
  onValue,
  set,
  remove
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { firebaseApp } from "./auth-service.js";

const db = getDatabase(firebaseApp);
const sitesRef = ref(db, "amecoSpotPlanner/sites");

export function observeSites(callback) {
  return onValue(sitesRef, snapshot => {
    const values = snapshot.val() || {};
    const sites = Object.values(values).sort((a, b) =>
      (a.nombre || "").localeCompare(b.nombre || "", "es")
    );
    callback(sites);
  });
}

export async function saveSite(site) {
  await set(ref(db, `amecoSpotPlanner/sites/${site.id}`), site);
}

export async function deleteSite(id) {
  await remove(ref(db, `amecoSpotPlanner/sites/${id}`));
}
