import {
  getDatabase,
  ref,
  onValue,
  set,
  remove,
  update
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { firebaseApp } from "./auth-service.js";

const db = getDatabase(firebaseApp);
const workersRef = ref(db, "amecoSpotPlanner/workers");

export function observeWorkers(callback) {
  return onValue(workersRef, snapshot => {
    const data = snapshot.val() || {};
    const workers = Object.values(data).sort((a, b) =>
      (a.nombre || "").localeCompare(b.nombre || "", "es")
    );
    callback(workers);
  });
}

export async function saveWorker(worker) {
  const workerRef = ref(db, `amecoSpotPlanner/workers/${worker.id}`);
  await set(workerRef, worker);
}

export async function updateWorker(id, changes) {
  const workerRef = ref(db, `amecoSpotPlanner/workers/${id}`);
  await update(workerRef, changes);
}

export async function deleteWorker(id) {
  const workerRef = ref(db, `amecoSpotPlanner/workers/${id}`);
  await remove(workerRef);
}
