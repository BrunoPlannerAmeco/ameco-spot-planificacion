import { EXAM_TYPES } from "./catalogs.js";

export function makeId(prefix="id"){
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}

export function todayString(){
  return new Date().toISOString().slice(0,10);
}

export function normalizeRut(rut){
  return String(rut || "")
    .replace(/\./g, "")
    .replace(/\s/g, "")
    .toUpperCase();
}

export function escapeHtml(value=""){
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  })[char]);
}

function parseLocalDate(value){
  if(!value) return null;
  const [year,month,day] = String(value).split("-").map(Number);
  if(!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function dateDiffDays(from, to){
  const a = from instanceof Date ? from : parseLocalDate(from);
  const b = to instanceof Date ? to : parseLocalDate(to);
  if(!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function defaultExams(){
  return EXAM_TYPES.map(tipo => ({
    tipo,
    fecha:"",
    vencimiento:"",
    archivoNombre:"",
    archivoTipo:""
  }));
}

export function emptyWorker(){
  return {
    id: makeId("worker"),
    nombre:"",
    rut:"",
    telefono:"",
    correo:"",
    ciudad:"",
    cargo:"Supervisor",
    cargosSecundarios:[],
    empresa:"AMECO",
    estadoLaboral:"activo",
    turno:{
      fechaInicioCiclo:todayString(),
      diasTrabajo:14,
      diasDescanso:14
    },
    overrides:{},
    examenes:defaultExams(),
    examenesExtra:[],
    certificaciones:[],
    observaciones:"",
    createdAt:Date.now(),
    updatedAt:Date.now()
  };
}

function normalizeTurn(turno={}){
  let work = Number(turno.diasTrabajo);
  let rest = Number(turno.diasDescanso);
  if(!work || !rest){
    const regimen = String(turno.regimen || "14x14").toLowerCase();
    if(regimen === "7x7"){ work=7; rest=7; }
    else if(regimen === "5x2"){ work=5; rest=2; }
    else { work=14; rest=14; }
  }
  return {
    fechaInicioCiclo:turno.fechaInicioCiclo || todayString(),
    diasTrabajo:work,
    diasDescanso:rest
  };
}

function normalizeExams(items=[]){
  return EXAM_TYPES.map(tipo => {
    const found = items.find(item => item?.tipo === tipo) || {};
    return {
      tipo,
      fecha:found.fecha || "",
      vencimiento:found.vencimiento || "",
      archivoNombre:found.archivoNombre || "",
      archivoTipo:found.archivoTipo || ""
    };
  });
}

function normalizeCertifications(items=[]){
  return items.map(item => {
    let archivos = Array.isArray(item?.archivos) ? item.archivos : [];
    if(!archivos.length && item?.archivoNombre){
      archivos = [{ id:"", nombre:item.archivoNombre, mime:item.archivoTipo || "" }];
    }
    return {
      id:item?.id || makeId("cert"),
      equipo:item?.equipo || "Otro",
      fecha:item?.fecha || "",
      vencimiento:item?.vencimiento || "",
      archivos
    };
  });
}

export function normalizeWorker(worker={}){
  const base = emptyWorker();
  const secondary = Array.isArray(worker.cargosSecundarios)
    ? worker.cargosSecundarios.filter(Boolean)
    : [];
  return {
    ...base,
    ...worker,
    id:worker.id || base.id,
    cargo:worker.cargo || base.cargo,
    cargosSecundarios:secondary.filter(value => value !== worker.cargo),
    estadoLaboral:worker.estadoLaboral || "activo",
    turno:normalizeTurn(worker.turno || {}),
    overrides:worker.overrides && typeof worker.overrides === "object" ? worker.overrides : {},
    examenes:normalizeExams(Array.isArray(worker.examenes) ? worker.examenes : []),
    examenesExtra:(Array.isArray(worker.examenesExtra) ? worker.examenesExtra : []).map(item => ({
      id:item?.id || makeId("exam"),
      nombre:item?.nombre || "",
      fecha:item?.fecha || "",
      vencimiento:item?.vencimiento || "",
      archivoNombre:item?.archivoNombre || "",
      archivoTipo:item?.archivoTipo || ""
    })),
    certificaciones:normalizeCertifications(Array.isArray(worker.certificaciones) ? worker.certificaciones : []),
    createdAt:worker.createdAt || Date.now(),
    updatedAt:worker.updatedAt || Date.now()
  };
}

export function baseShiftType(worker, dateValue=todayString()){
  const normalized = normalizeWorker(worker);
  const start = parseLocalDate(normalized.turno.fechaInicioCiclo);
  const date = parseLocalDate(dateValue);
  if(!start || !date) return "descanso";
  const cycle = normalized.turno.diasTrabajo + normalized.turno.diasDescanso;
  if(cycle <= 0) return "descanso";
  let diff = dateDiffDays(start, date) % cycle;
  if(diff < 0) diff += cycle;
  return diff < normalized.turno.diasTrabajo ? "trabajo" : "descanso";
}

export function dayShift(worker, dateValue=todayString()){
  const normalized = normalizeWorker(worker);
  const base = baseShiftType(normalized, dateValue);
  const override = normalized.overrides?.[dateValue];
  if(override?.tipo){
    return {
      tipo:override.tipo,
      faena:override.faena || "",
      nota:override.nota || "",
      base
    };
  }
  return { tipo:base, faena:"", nota:"", base };
}

export function examStatus(expiry){
  if(!expiry) return { code:"sin_dato", label:"Sin vencimiento", className:"" };
  const diff = dateDiffDays(new Date(new Date().toDateString()), expiry);
  if(diff === null) return { code:"sin_dato", label:"Sin vencimiento", className:"" };
  if(diff < 0) return { code:"vencido", label:"Vencido", className:"danger", days:diff };
  if(diff <= 30) return { code:"por_vencer", label:"Por vencer", className:"warning", days:diff };
  return { code:"vigente", label:"Vigente", className:"success", days:diff };
}

export function workerDocumentSummary(worker){
  const normalized = normalizeWorker(worker);
  const items = [
    ...normalized.examenes.map(item => ({...item, nombre:item.tipo, categoria:"Examen"})),
    ...normalized.examenesExtra.map(item => ({...item, categoria:"Documento adicional"})),
    ...normalized.certificaciones.map(item => ({
      ...item,
      nombre:`Certificación: ${item.equipo}`,
      categoria:"Certificación",
      archivoNombre:(item.archivos || []).map(file => file.nombre).filter(Boolean).join(", ")
    }))
  ];
  const alerts = items.filter(item => ["vencido","por_vencer"].includes(examStatus(item.vencimiento).code));
  return { items, alerts };
}

export function shiftLabel(type){
  return ({ trabajo:"Turno", descanso:"Descanso", extra:"Hora extra", permiso:"Permiso" })[type] || type;
}
