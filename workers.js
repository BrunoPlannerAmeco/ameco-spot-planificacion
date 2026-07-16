import { observeWorkers, saveWorker, deleteWorker } from "./workers-service.js";
import { observeSites } from "./sites-service.js";
import { importLegacyBackup } from "./migration-service.js";
import { DEFAULT_CARGOS, DEFAULT_EQUIPOS, EXAM_TYPES } from "./catalogs.js";
import {
  emptyWorker, normalizeWorker, normalizeRut, escapeHtml, makeId,
  dayShift, shiftLabel, examStatus, workerDocumentSummary
} from "./worker-utils.js";

let workers=[];
let sites=[];
let started=false;
let refresh=null;
let query="";
let cargoFilter="all";

function statusLabel(status){
  return ({activo:"Activo",descanso:"Descanso",licencia:"Licencia",vacaciones:"Vacaciones",desvinculado:"Desvinculado"})[status] || status;
}
function statusClass(status){
  return ({activo:"success",descanso:"warning",licencia:"danger",vacaciones:"warning",desvinculado:"danger"})[status] || "";
}
function shiftClass(type){ return type === "trabajo" ? "success" : type === "extra" ? "warning" : type === "permiso" ? "danger" : ""; }

function workerCard(worker){
  const shift = dayShift(worker);
  const docs = workerDocumentSummary(worker);
  const worst = docs.alerts.some(item => examStatus(item.vencimiento).code === "vencido") ? "danger" : docs.alerts.length ? "warning" : "success";
  const roles = [worker.cargo, ...(worker.cargosSecundarios || [])].filter(Boolean);
  return `
    <article class="worker-card">
      <div class="worker-card-head">
        <div>
          <div class="worker-name">${escapeHtml(worker.nombre || "Sin nombre")}</div>
          <div class="worker-role">${escapeHtml(roles.join(" · ") || "Sin cargo")}</div>
        </div>
        <span class="status-pill ${statusClass(worker.estadoLaboral)}">${escapeHtml(statusLabel(worker.estadoLaboral))}</span>
      </div>
      <div class="worker-details worker-details-4">
        <div><span>RUT</span><strong>${escapeHtml(worker.rut || "Sin registrar")}</strong></div>
        <div><span>Ciudad</span><strong>${escapeHtml(worker.ciudad || "Sin registrar")}</strong></div>
        <div><span>Hoy</span><strong class="text-${shiftClass(shift.tipo)}">${escapeHtml(shiftLabel(shift.tipo))}</strong></div>
        <div><span>Alertas doc.</span><strong class="text-${worst}">${docs.alerts.length}</strong></div>
      </div>
      <div class="worker-actions">
        <button class="btn btn-soft" data-edit-worker="${worker.id}">Editar ficha</button>
        <button class="btn btn-danger" data-delete-worker="${worker.id}">Eliminar</button>
      </div>
    </article>`;
}

function renderList(){
  const root=document.getElementById("workersList");
  if(!root) return;
  const q=query.trim().toLowerCase();
  const filtered=workers.filter(worker => {
    const roles=[worker.cargo,...(worker.cargosSecundarios||[])];
    if(cargoFilter !== "all" && !roles.includes(cargoFilter)) return false;
    if(!q) return true;
    return [worker.nombre,worker.rut,worker.empresa,worker.ciudad,...roles]
      .some(value => String(value||"").toLowerCase().includes(q));
  });
  root.innerHTML=filtered.length ? filtered.map(workerCard).join("") : `<div class="empty">No hay trabajadores que coincidan.</div>`;
  root.querySelectorAll("[data-edit-worker]").forEach(button => button.addEventListener("click",()=>{
    const worker=workers.find(item=>item.id===button.dataset.editWorker); if(worker) openWorkerModal(worker);
  }));
  root.querySelectorAll("[data-delete-worker]").forEach(button => button.addEventListener("click",async()=>{
    const worker=workers.find(item=>item.id===button.dataset.deleteWorker); if(!worker) return;
    if(confirm(`¿Eliminar a ${worker.nombre}?`)) await deleteWorker(worker.id);
  }));
}

function fixedExamHtml(exam){
  const status=examStatus(exam.vencimiento);
  return `<div class="exam-editor" data-fixed-exam="${escapeHtml(exam.tipo)}">
    <div class="exam-editor-title"><strong>${escapeHtml(exam.tipo)}</strong><span class="status-pill ${status.className}">${status.label}</span></div>
    <div class="form-grid compact-grid">
      <div class="field"><label>Fecha realizado</label><input class="exam-date" type="date" value="${escapeHtml(exam.fecha||"")}"></div>
      <div class="field"><label>Vencimiento</label><input class="exam-expiry" type="date" value="${escapeHtml(exam.vencimiento||"")}"></div>
    </div>
    ${exam.archivoNombre ? `<div class="metadata-note">Archivo legado: ${escapeHtml(exam.archivoNombre)}. El contenido se cargará cuando Firebase Storage esté habilitado.</div>` : ""}
  </div>`;
}

function extraRows(items){
  return items.map(item=>`<div class="dynamic-row extra-row" data-extra-id="${item.id}">
    <input class="extra-name" value="${escapeHtml(item.nombre||"")}" placeholder="Ej: Examen de altura física">
    <input class="extra-date" type="date" value="${escapeHtml(item.fecha||"")}">
    <input class="extra-expiry" type="date" value="${escapeHtml(item.vencimiento||"")}">
    <button class="btn btn-danger" type="button" data-remove-extra="${item.id}">Quitar</button>
    ${item.archivoNombre ? `<div class="metadata-note span-all">Archivo legado: ${escapeHtml(item.archivoNombre)}</div>` : ""}
  </div>`).join("");
}

function certRows(items){
  return items.map(item=>`<div class="dynamic-row cert-row" data-cert-id="${item.id}">
    <select class="cert-equipment">${DEFAULT_EQUIPOS.map(value=>`<option value="${escapeHtml(value)}" ${item.equipo===value?"selected":""}>${escapeHtml(value)}</option>`).join("")}</select>
    <input class="cert-date" type="date" value="${escapeHtml(item.fecha||"")}">
    <input class="cert-expiry" type="date" value="${escapeHtml(item.vencimiento||"")}">
    <button class="btn btn-danger" type="button" data-remove-cert="${item.id}">Quitar</button>
    ${(item.archivos||[]).length ? `<div class="metadata-note span-all">${item.archivos.length} archivo(s) legado(s): ${escapeHtml(item.archivos.map(file=>file.nombre).join(", "))}</div>` : ""}
  </div>`).join("");
}

function openWorkerModal(existing=null){
  const worker=normalizeWorker(existing || emptyWorker());
  let extras=worker.examenesExtra.map(item=>({...item}));
  let certs=worker.certificaciones.map(item=>({...item,archivos:[...(item.archivos||[])]}));
  const modalRoot=document.getElementById("modalRoot");
  modalRoot.innerHTML=`<div class="modal-backdrop" id="workerBackdrop"><section class="modal-card modal-xl">
    <header class="modal-header"><div><h2>${existing?"Ficha de trabajador":"Nuevo trabajador"}</h2><p>Modelo completo migrado desde el checkpoint operativo.</p></div><button class="modal-close" id="closeWorker" type="button">✕</button></header>
    <form id="workerForm"><div class="modal-body">
      <h3 class="form-section-title">Datos personales</h3>
      <div class="form-grid">
        <div class="field span-2"><label>Nombre completo</label><input name="nombre" value="${escapeHtml(worker.nombre)}" placeholder="Ej: Juan Pérez Soto" required></div>
        <div class="field"><label>RUT</label><input name="rut" value="${escapeHtml(worker.rut)}" placeholder="Ej: 20.910.828-3"></div>
        <div class="field"><label>Empresa</label><input name="empresa" value="${escapeHtml(worker.empresa)}" placeholder="Ej: AMECO"></div>
        <div class="field"><label>Teléfono</label><input name="telefono" value="${escapeHtml(worker.telefono)}" placeholder="Ej: +56 9 1234 5678"></div>
        <div class="field"><label>Correo</label><input name="correo" type="email" value="${escapeHtml(worker.correo)}" placeholder="correo@empresa.cl"></div>
        <div class="field"><label>Ciudad</label><input name="ciudad" value="${escapeHtml(worker.ciudad)}" placeholder="Ej: Antofagasta"></div>
        <div class="field"><label>Estado laboral</label><select name="estadoLaboral">${[["activo","Activo"],["descanso","Descanso"],["licencia","Licencia"],["vacaciones","Vacaciones"],["desvinculado","Desvinculado"]].map(([value,label])=>`<option value="${value}" ${worker.estadoLaboral===value?"selected":""}>${label}</option>`).join("")}</select></div>
      </div>
      <h3 class="form-section-title">Cargos y competencias</h3>
      <div class="field"><label>Cargo principal</label><select name="cargo">${DEFAULT_CARGOS.map(value=>`<option value="${escapeHtml(value)}" ${worker.cargo===value?"selected":""}>${escapeHtml(value)}</option>`).join("")}</select></div>
      <div class="multi-choice-grid">${DEFAULT_CARGOS.filter(value=>value!==worker.cargo).map(value=>`<label><input type="checkbox" name="secondaryRole" value="${escapeHtml(value)}" ${(worker.cargosSecundarios||[]).includes(value)?"checked":""}> ${escapeHtml(value)}</label>`).join("")}</div>
      <h3 class="form-section-title">Ciclo de turno</h3>
      <div class="form-grid three-grid">
        <div class="field"><label>Inicio del ciclo</label><input name="fechaInicioCiclo" type="date" value="${escapeHtml(worker.turno.fechaInicioCiclo)}"></div>
        <div class="field"><label>Días de trabajo</label><input name="diasTrabajo" type="number" min="1" max="60" value="${worker.turno.diasTrabajo}"></div>
        <div class="field"><label>Días de descanso</label><input name="diasDescanso" type="number" min="1" max="60" value="${worker.turno.diasDescanso}"></div>
      </div>
      <div class="metadata-note">Los cambios diarios especiales se guardan en <code>overrides</code> y se administran desde Turnos.</div>
      <h3 class="form-section-title">Exámenes obligatorios</h3>
      <div id="fixedExams">${worker.examenes.map(fixedExamHtml).join("")}</div>
      <h3 class="form-section-title action-title"><span>Otros exámenes o documentos</span><button class="btn btn-soft" id="addExtra" type="button">+ Agregar</button></h3>
      <div id="extraRows">${extraRows(extras)}</div>
      <h3 class="form-section-title action-title"><span>Certificaciones de equipos</span><button class="btn btn-soft" id="addCert" type="button">+ Agregar</button></h3>
      <div id="certRows">${certRows(certs)}</div>
      <div class="storage-warning"><strong>Adjuntos:</strong> se conserva la metadata del HTML anterior, pero el contenido de archivos no se sube aún. Para eso habilitaremos Firebase Storage en una versión posterior.</div>
      <h3 class="form-section-title">Observaciones</h3>
      <div class="field"><textarea name="observaciones" rows="4" placeholder="Disponibilidad, restricciones o información relevante">${escapeHtml(worker.observaciones||"")}</textarea></div>
    </div><footer class="modal-footer"><button class="btn btn-soft" id="cancelWorker" type="button">Cancelar</button><button class="btn btn-primary" type="submit">Guardar trabajador</button></footer></form>
  </section></div>`;

  const extraRoot=document.getElementById("extraRows"), certRoot=document.getElementById("certRows");
  function syncExtras(){
    extras=[...extraRoot.querySelectorAll("[data-extra-id]")].map(row=>{
      const old=extras.find(item=>item.id===row.dataset.extraId)||{};
      return {...old,id:row.dataset.extraId,nombre:row.querySelector(".extra-name").value.trim(),fecha:row.querySelector(".extra-date").value,vencimiento:row.querySelector(".extra-expiry").value};
    }).filter(item=>item.nombre);
  }
  function syncCerts(){
    certs=[...certRoot.querySelectorAll("[data-cert-id]")].map(row=>{
      const old=certs.find(item=>item.id===row.dataset.certId)||{};
      return {...old,id:row.dataset.certId,equipo:row.querySelector(".cert-equipment").value,fecha:row.querySelector(".cert-date").value,vencimiento:row.querySelector(".cert-expiry").value,archivos:old.archivos||[]};
    });
  }
  function syncAll(){ syncExtras(); syncCerts(); }
  function repaint(){
    extraRoot.innerHTML=extraRows(extras); certRoot.innerHTML=certRows(certs);
    extraRoot.querySelectorAll("[data-remove-extra]").forEach(btn=>btn.addEventListener("click",()=>{syncAll();extras=extras.filter(item=>item.id!==btn.dataset.removeExtra);repaint();}));
    certRoot.querySelectorAll("[data-remove-cert]").forEach(btn=>btn.addEventListener("click",()=>{syncAll();certs=certs.filter(item=>item.id!==btn.dataset.removeCert);repaint();}));
  }
  repaint();
  document.getElementById("addExtra").addEventListener("click",()=>{syncAll();extras.push({id:makeId("exam"),nombre:"",fecha:"",vencimiento:"",archivoNombre:"",archivoTipo:""});repaint();});
  document.getElementById("addCert").addEventListener("click",()=>{syncAll();certs.push({id:makeId("cert"),equipo:DEFAULT_EQUIPOS[0],fecha:"",vencimiento:"",archivos:[]});repaint();});
  const close=()=>modalRoot.innerHTML="";
  document.getElementById("closeWorker").addEventListener("click",close); document.getElementById("cancelWorker").addEventListener("click",close);
  document.getElementById("workerBackdrop").addEventListener("click",event=>{if(event.target===event.currentTarget) close();});
  document.getElementById("workerForm").addEventListener("submit",async event=>{
    event.preventDefault(); syncExtras(); syncCerts();
    const data=new FormData(event.currentTarget);
    const fixed=[...document.querySelectorAll("[data-fixed-exam]")].map(row=>{
      const old=worker.examenes.find(item=>item.tipo===row.dataset.fixedExam)||{};
      return {...old,tipo:row.dataset.fixedExam,fecha:row.querySelector(".exam-date").value,vencimiento:row.querySelector(".exam-expiry").value};
    });
    await saveWorker({...worker,nombre:String(data.get("nombre")||"").trim(),rut:String(data.get("rut")||"").trim(),empresa:String(data.get("empresa")||"").trim(),telefono:String(data.get("telefono")||"").trim(),correo:String(data.get("correo")||"").trim(),ciudad:String(data.get("ciudad")||"").trim(),estadoLaboral:String(data.get("estadoLaboral")||"activo"),cargo:String(data.get("cargo")||DEFAULT_CARGOS[0]),cargosSecundarios:data.getAll("secondaryRole").map(String),turno:{fechaInicioCiclo:String(data.get("fechaInicioCiclo")||""),diasTrabajo:Number(data.get("diasTrabajo")||14),diasDescanso:Number(data.get("diasDescanso")||14)},examenes:fixed,examenesExtra:extras,certificaciones:certs,observaciones:String(data.get("observaciones")||"").trim(),updatedAt:Date.now()});
    close();
  });
}

function guessMapping(headers){
  const lc=headers.map(value=>String(value||"").toLowerCase());
  const find=words=>lc.findIndex(header=>words.some(word=>header.includes(word)));
  return {nombre:find(["nombre","trabajador"]),rut:find(["rut"]),telefono:find(["tel","fono","celular"]),correo:find(["correo","email","mail"]),ciudad:find(["ciudad"]),cargo:find(["cargo","puesto","funcion","función"]),empresa:find(["empresa","contratista","razon"])};
}

function openExcelImport(){
  const modalRoot=document.getElementById("modalRoot");
  modalRoot.innerHTML=`<div class="modal-backdrop" id="importBackdrop"><section class="modal-card"><header class="modal-header"><div><h2>Importar desde Excel</h2><p>Detecta columnas y actualiza por RUT sin duplicar.</p></div><button class="modal-close" id="closeImport" type="button">✕</button></header><div class="modal-body"><div class="field"><label>Archivo .xlsx o .csv</label><input id="excelFile" type="file" accept=".xlsx,.xls,.csv"></div><div id="importPreview" class="metadata-note">Selecciona un archivo para continuar.</div></div><footer class="modal-footer"><button class="btn btn-soft" id="cancelImport" type="button">Cancelar</button><button class="btn btn-primary" id="confirmExcelImport" type="button" disabled>Importar</button></footer></section></div>`;
  let parsed=null;
  const close=()=>modalRoot.innerHTML=""; document.getElementById("closeImport").addEventListener("click",close);document.getElementById("cancelImport").addEventListener("click",close);
  document.getElementById("excelFile").addEventListener("change",async event=>{
    const file=event.target.files?.[0]; if(!file) return;
    if(!window.XLSX){alert("No se pudo cargar el lector de Excel.");return;}
    const book=window.XLSX.read(await file.arrayBuffer(),{type:"array"});
    const rows=window.XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,defval:""});
    const headers=(rows.shift()||[]).map(String); const mapping=guessMapping(headers);
    if(mapping.nombre<0){alert("No pude identificar una columna de nombre.");return;}
    parsed={headers,rows,mapping};
    document.getElementById("importPreview").innerHTML=`Se detectaron <strong>${rows.length}</strong> filas. Columnas: ${escapeHtml(headers.join(", "))}. Se actualizará por RUT y, si no existe, por nombre exacto.`;
    document.getElementById("confirmExcelImport").disabled=false;
  });
  document.getElementById("confirmExcelImport").addEventListener("click",async()=>{
    if(!parsed) return; let created=0,updated=0;
    for(const row of parsed.rows){
      const get=key=>parsed.mapping[key]>=0?String(row[parsed.mapping[key]]||"").trim():"";
      const nombre=get("nombre"); if(!nombre) continue; const rut=get("rut");
      const existing=(rut&&workers.find(item=>normalizeRut(item.rut)===normalizeRut(rut)))||workers.find(item=>String(item.nombre||"").trim().toLowerCase()===nombre.toLowerCase());
      const worker=normalizeWorker(existing||emptyWorker());
      await saveWorker({...worker,nombre,rut:rut||worker.rut,telefono:get("telefono")||worker.telefono,correo:get("correo")||worker.correo,ciudad:get("ciudad")||worker.ciudad,cargo:get("cargo")||worker.cargo,empresa:get("empresa")||worker.empresa,updatedAt:Date.now()});
      existing?updated++:created++;
    }
    alert(`Importación terminada: ${created} creados y ${updated} actualizados.`); close();
  });
}

function openLegacyImport(){
  const modalRoot=document.getElementById("modalRoot");
  modalRoot.innerHTML=`<div class="modal-backdrop" id="legacyBackdrop"><section class="modal-card"><header class="modal-header"><div><h2>Migrar respaldo Track A</h2><p>Importa el JSON raíz faena_personal_db_v1.</p></div><button class="modal-close" id="closeLegacy" type="button">✕</button></header><div class="modal-body"><div class="field"><label>Archivo JSON</label><input id="legacyFile" type="file" accept=".json,application/json"></div><div id="legacyPreview" class="metadata-note">Se migrarán trabajadores, faenas, acreditaciones, llamados y pasajes. Los adjuntos solo conservarán su nombre y tipo.</div></div><footer class="modal-footer"><button class="btn btn-soft" id="cancelLegacy" type="button">Cancelar</button><button class="btn btn-primary" id="confirmLegacy" type="button" disabled>Migrar</button></footer></section></div>`;
  let payload=null; const close=()=>modalRoot.innerHTML="";document.getElementById("closeLegacy").addEventListener("click",close);document.getElementById("cancelLegacy").addEventListener("click",close);
  document.getElementById("legacyFile").addEventListener("change",async event=>{
    try{payload=JSON.parse(await event.target.files[0].text());const root=Array.isArray(payload)?{workers:payload}:payload;document.getElementById("legacyPreview").innerHTML=`Trabajadores: <strong>${root.workers?.length||0}</strong> · Faenas: <strong>${root.faenas?.length||0}</strong> · Llamados: <strong>${root.llamados?.length||0}</strong> · Pasajes: <strong>${root.pasajes?.length||0}</strong>`;document.getElementById("confirmLegacy").disabled=false;}catch(error){alert("El archivo no contiene JSON válido.");}
  });
  document.getElementById("confirmLegacy").addEventListener("click",async()=>{if(!payload)return;const result=await importLegacyBackup(payload,workers,sites);alert(`Migración terminada. Trabajadores creados: ${result.createdWorkers}; actualizados: ${result.updatedWorkers}; acreditaciones: ${result.importedAccreditations}; llamados: ${result.importedContacts}; pasajes: ${result.importedTickets}.`);close();});
}

function exportWorkers(){
  const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),workers},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`ameco-personal-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

export function initWorkersModule(onChange){
  refresh=onChange;if(started)return;started=true;
  observeWorkers(data=>{workers=data;if(refresh)refresh();});observeSites(data=>{sites=data;if(refresh)refresh();});
}

export function renderWorkers(){
  const active=workers.filter(item=>item.estadoLaboral==="activo").length;
  const onShift=workers.filter(item=>["trabajo","extra"].includes(dayShift(item).tipo)).length;
  const alerts=workers.reduce((total,item)=>total+workerDocumentSummary(item).alerts.length,0);
  return `<section class="module-header"><div><h2>Personal</h2><p>Ficha completa: cargos, ciclo, exámenes, documentos y certificaciones.</p></div><div class="header-actions"><button class="btn btn-soft" id="excelImport">Importar Excel</button><button class="btn btn-soft" id="legacyImport">Migrar Track A</button><button class="btn btn-soft" id="exportWorkers">Exportar JSON</button><button class="btn btn-primary" id="newWorker">+ Nuevo trabajador</button></div></section>
  <section class="kpi-grid worker-kpis"><article class="kpi-card"><div class="kpi-value">${workers.length}</div><div class="kpi-label">Registrados</div></article><article class="kpi-card success"><div class="kpi-value">${active}</div><div class="kpi-label">Activos</div></article><article class="kpi-card success"><div class="kpi-value">${onShift}</div><div class="kpi-label">En turno hoy</div></article><article class="kpi-card warning"><div class="kpi-value">${alerts}</div><div class="kpi-label">Alertas documentales</div></article></section>
  <section class="workers-toolbar"><div class="search-control"><span>🔎</span><input id="workersSearch" value="${escapeHtml(query)}" placeholder="Buscar por nombre, RUT, cargo, empresa o ciudad"></div><select id="cargoFilter"><option value="all">Todos los cargos</option>${DEFAULT_CARGOS.map(value=>`<option value="${escapeHtml(value)}" ${cargoFilter===value?"selected":""}>${escapeHtml(value)}</option>`).join("")}</select></section><section class="workers-grid" id="workersList"></section>`;
}

export function bindWorkersEvents(){
  document.getElementById("newWorker")?.addEventListener("click",()=>openWorkerModal());
  document.getElementById("excelImport")?.addEventListener("click",openExcelImport);
  document.getElementById("legacyImport")?.addEventListener("click",openLegacyImport);
  document.getElementById("exportWorkers")?.addEventListener("click",exportWorkers);
  document.getElementById("workersSearch")?.addEventListener("input",event=>{query=event.target.value;renderList();});
  document.getElementById("cargoFilter")?.addEventListener("change",event=>{cargoFilter=event.target.value;renderList();});
  renderList();
}
