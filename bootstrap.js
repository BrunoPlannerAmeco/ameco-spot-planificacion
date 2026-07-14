import { observeAuth, observeCollection } from "./firebase-service.js";
import { state, updateState, updateCounts, subscribe } from "./state.js";
import { initialRoute } from "./router.js";
import { renderLogin } from "./login.js";
import { renderApp } from "./shell.js";

let subscriptionsStarted = false;

function countValues(value){
  return value && typeof value === "object" ? Object.keys(value).length : 0;
}

function startDataSubscriptions(){
  if(subscriptionsStarted) return;
  subscriptionsStarted = true;

  observeCollection("amecoSpotPlanner/workers", value => {
    updateCounts({ workers: countValues(value) });
  });

  observeCollection("amecoSpotPlanner/sites", value => {
    const active = Object.values(value || {}).filter(site => site?.activa !== false).length;
    updateCounts({ sites: active });
  });

  observeCollection("amecoSpotPlanner/accreditations", value => {
    const pending = Object.values(value || {}).filter(item =>
      !["aprobada","vigente"].includes(item?.estado)
    ).length;
    updateCounts({ pendingAccreditations: pending });
  });

  observeCollection("amecoSpotPlanner/tickets", value => {
    const pending = Object.values(value || {}).filter(item =>
      !["emitido","informado","cancelado"].includes(item?.estado)
    ).length;
    updateCounts({ pendingTickets: pending });
  });

  observeCollection("amecoSpotPlanner/contacts", value => {
    const pending = Object.values(value || {}).filter(item =>
      ["por_contactar","sin_respuesta"].includes(item?.resultado)
    ).length;
    updateCounts({ pendingCalls: pending });
  });
}

subscribe(() => {
  if(state.user) renderApp();
});

observeAuth(user => {
  if(user){
    updateState({ user, route: initialRoute() });
    startDataSubscriptions();
    renderApp();
  }else{
    state.user = null;
    renderLogin();
  }
});

window.addEventListener("hashchange", () => {
  if(state.user) updateState({ route: initialRoute() });
});
