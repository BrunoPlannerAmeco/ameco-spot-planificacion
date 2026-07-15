import {
  ref,
  onValue,
  set,
  remove
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { db } from "./firebase-service.js";
import { normalizeWorker } from "./worker-utils.js";

const basePath = "amecoSpotPlanner/workers";

export function observeWorkers(callback){
  return onValue(ref(db, basePath), snapshot => {
    const value = snapshot.val() || {};
    callback(
      Object.values(value)
        .map(normalizeWorker)
        .sort((a,b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"))
    );
  });
}

export function saveWorker(worker){
  const normalized = normalizeWorker({...worker, updatedAt:Date.now()});
  return set(ref(db, `${basePath}/${normalized.id}`), normalized);
}

export function deleteWorker(id){
  return remove(ref(db, `${basePath}/${id}`));
}
