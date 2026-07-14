import { state, updateState } from "./state.js";

export const routes = [
  { id:"dashboard", label:"Centro de Operaciones", icon:"◆" },
  { id:"workers", label:"Personal", icon:"●" },
  { id:"sites", label:"Faenas", icon:"⛏" },
  { id:"services", label:"Servicios", icon:"▣" },
  { id:"accreditations", label:"Acreditaciones", icon:"✓" },
  { id:"shifts", label:"Turnos", icon:"▦" },
  { id:"calls", label:"Llamados", icon:"☎" },
  { id:"tickets", label:"Pasajes", icon:"↗" },
  { id:"documents", label:"Documentos", icon:"▤" },
  { id:"reports", label:"Reportes", icon:"▥" }
];

export function navigate(route){
  if(!routes.some(item => item.id === route)) route = "dashboard";
  updateState({ route });
  history.replaceState(null, "", `#${route}`);
}

export function initialRoute(){
  return location.hash.replace("#","") || "dashboard";
}
