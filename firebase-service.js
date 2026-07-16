import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getDatabase(firebaseApp);

export function observeAuth(callback){
  return onAuthStateChanged(auth, callback);
}

export function login(email, password){
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout(){
  return signOut(auth);
}

export function observeCollection(path, callback){
  return onValue(ref(db, path), snapshot => callback(snapshot.val() || {}));
}
