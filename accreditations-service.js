import { ref, onValue, set, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { db } from "./firebase-service.js";
const basePath="amecoSpotPlanner/accreditations";
export function observeAccreditations(callback){return onValue(ref(db,basePath),s=>callback(Object.values(s.val()||{})));}
export function saveAccreditation(item){return set(ref(db,`${basePath}/${item.id}`),item);}
export function deleteAccreditation(id){return remove(ref(db,`${basePath}/${id}`));}
