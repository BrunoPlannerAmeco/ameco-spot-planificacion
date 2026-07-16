import {
  ref,
  onValue,
  set,
  remove
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { db } from "./firebase-service.js";

const basePath = "amecoSpotPlanner/sites";

export function observeSites(callback){
  return onValue(ref(db, basePath), snapshot => {
    const value = snapshot.val() || {};
    callback(
      Object.values(value).sort((a,b) =>
        String(a.nombre || "").localeCompare(String(b.nombre || ""), "es")
      )
    );
  });
}

export function saveSite(site){
  return set(ref(db, `${basePath}/${site.id}`), site);
}

export function deleteSite(id){
  return remove(ref(db, `${basePath}/${id}`));
}
