/* AMECO Spot Planner v1.1.0-refactor
   Lógica extraída del HTML original sin cambios funcionales. */

/* ============================= DATA LAYER ============================= */
const STORAGE_KEY = 'faena_personal_db_v1';
const EXAM_TYPES = ['Preocupacional','Alcohol y Drogas','Psicosensotécnico'];
const DEFAULT_FAENAS = ['Spence','Centinela','Sierra Gorda','Gabriela Mistral','Antucoya'];
const DEFAULT_CARGOS = ['Supervisor','Operador AT','Operador AC','Rigger','Alzahombre','Operador Grúa Horquilla','Otro'];
const DEFAULT_EQUIPOS = ['Grúa Horquilla','Grúa Pluma','Camión Pluma','Manlift / Alzahombre','Minicargador','Grúa Telescópica','Camión Grúa','Otro'];
const FAENA_COLORS = ['#e2571f','#2f6f9e','#2f8f4e','#8a5fc2','#c8342f','#b9790f','#1b8fa0','#7a4a2e'];
const MAX_FILE_BYTES = 3.5 * 1024 * 1024; // 3.5MB por archivo (el sistema de almacenamiento tiene un tope de 5MB por valor; al codificar en base64 el archivo pesa ~35% más, así que 3.5MB es prácticamente el máximo seguro)

let state = {
  workers: [],
  faenas: [...DEFAULT_FAENAS],
  cargos: [...DEFAULT_CARGOS],
  equipos: [...DEFAULT_EQUIPOS],
  ui:{ tab:'dashboard', search:'', modal:null, calMonth: new Date().getMonth(), calYear: new Date().getFullYear(), docFilter:'all', docTypeFilter:'all', acredFaenaFilter:'all', certEquipoFilter:'all', gridSize:'compact', cargoFilter:'all' },
  saving:false
};
let bulkSelected = new Set();

function uid(prefix){ return prefix+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function slugify(s){ return (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase(); }
function examDocKey(workerId, tipo){ return 'doc__'+workerId+'__exam__'+slugify(tipo); }
function certDocKey(workerId, certId, fileId){ return fileId ? ('doc__'+workerId+'__cert__'+certId+'__'+fileId) : ('doc__'+workerId+'__cert__'+certId); }
function examExtraDocKey(workerId, extraId){ return 'doc__'+workerId+'__examextra__'+extraId; }

function seedData(){
  return [
    {
      id: uid('w'), nombre:'Juan Pérez Soto', rut:'12.345.678-9', telefono:'+56 9 1234 5678', correo:'juan.perez@ejemplo.cl', ciudad:'Antofagasta', cargo:'Supervisor', empresa:'',
      turno:{ fechaInicioCiclo: fmt(addDays(new Date(),-3)), diasTrabajo:14, diasDescanso:14 }, overrides:{},
      examenes:[
        {tipo:'Preocupacional', fecha: fmt(addDays(new Date(),-200)), vencimiento: fmt(addDays(new Date(),165))},
        {tipo:'Alcohol y Drogas', fecha: fmt(addDays(new Date(),-350)), vencimiento: fmt(addDays(new Date(),15))},
        {tipo:'Psicosensotécnico', fecha: fmt(addDays(new Date(),-400)), vencimiento: fmt(addDays(new Date(),-10))}
      ],
      acreditaciones:[
        {faena:'Spence', estado:'Acreditado', vencimiento: fmt(addDays(new Date(),120))},
        {faena:'Centinela', estado:'En trámite', vencimiento:''}
      ],
      certificaciones:[
        {id: uid('c'), equipo:'Grúa Horquilla', fecha: fmt(addDays(new Date(),-100)), vencimiento: fmt(addDays(new Date(),260)), archivos:[]}
      ],
      examenesExtra:[]
    },
    {
      id: uid('w'), nombre:'María Contreras Díaz', rut:'15.678.234-1', telefono:'+56 9 8765 4321', correo:'maria.contreras@ejemplo.cl', ciudad:'Calama', cargo:'Operador Grúa Horquilla', empresa:'',
      turno:{ fechaInicioCiclo: fmt(addDays(new Date(),-10)), diasTrabajo:14, diasDescanso:14 }, overrides:{},
      examenes:[
        {tipo:'Preocupacional', fecha: fmt(addDays(new Date(),-100)), vencimiento: fmt(addDays(new Date(),265))},
        {tipo:'Alcohol y Drogas', fecha: fmt(addDays(new Date(),-30)), vencimiento: fmt(addDays(new Date(),335))},
        {tipo:'Psicosensotécnico', fecha: fmt(addDays(new Date(),-60)), vencimiento: fmt(addDays(new Date(),300))}
      ],
      acreditaciones:[ {faena:'Sierra Gorda', estado:'Acreditado', vencimiento: fmt(addDays(new Date(),200))} ],
      certificaciones:[ {id: uid('c'), equipo:'Grúa Horquilla', fecha: fmt(addDays(new Date(),-40)), vencimiento: fmt(addDays(new Date(),320)), archivos:[]} ],
      examenesExtra:[]
    },
    {
      id: uid('w'), nombre:'Pedro Alarcón Muñoz', rut:'9.876.543-2', telefono:'+56 9 5555 1122', correo:'', ciudad:'Antofagasta', cargo:'Rigger', empresa:'',
      turno:{ fechaInicioCiclo: fmt(addDays(new Date(),0)), diasTrabajo:14, diasDescanso:14 }, overrides:{},
      examenes:[
        {tipo:'Preocupacional', fecha: fmt(addDays(new Date(),-20)), vencimiento: fmt(addDays(new Date(),345))},
        {tipo:'Alcohol y Drogas', fecha:'', vencimiento:''},
        {tipo:'Psicosensotécnico', fecha: fmt(addDays(new Date(),-20)), vencimiento: fmt(addDays(new Date(),20))}
      ],
      acreditaciones:[ {faena:'Antucoya', estado:'Acreditado', vencimiento: fmt(addDays(new Date(),40))}, {faena:'Gabriela Mistral', estado:'No acreditado', vencimiento:''} ],
      certificaciones:[],
      examenesExtra:[]
    }
  ];
}

async function loadData(){
  try{
    const res = await window.storage.get(STORAGE_KEY, true);
    if(res && res.value){
      const parsed = JSON.parse(res.value);
      state.workers = parsed.workers || [];
      state.faenas = parsed.faenas && parsed.faenas.length ? parsed.faenas : [...DEFAULT_FAENAS];
      state.cargos = parsed.cargos && parsed.cargos.length ? parsed.cargos : [...DEFAULT_CARGOS];
      state.equipos = parsed.equipos && parsed.equipos.length ? parsed.equipos : [...DEFAULT_EQUIPOS];
      state.workers.forEach(w=>{
        if(!w.certificaciones) w.certificaciones = [];
        w.certificaciones.forEach(c=>{
          if(!c.archivos){
            c.archivos = c.archivoNombre ? [{id:'', nombre:c.archivoNombre, mime:c.archivoTipo||''}] : [];
            delete c.archivoNombre; delete c.archivoTipo;
          }
        });
        if(!w.examenesExtra) w.examenesExtra = [];
      });
    } else {
      state.workers = seedData();
      await persist();
    }
  }catch(e){
    state.workers = seedData();
    try{ await persist(); }catch(e2){}
  }
  render();
}

let saveTimeout=null;
function persist(){
  return new Promise((resolve)=>{
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async ()=>{
      state.saving = true; renderSavePill();
      try{
        await window.storage.set(STORAGE_KEY, JSON.stringify({workers:state.workers, faenas:state.faenas, cargos:state.cargos, equipos:state.equipos}), true);
      }catch(e){ console.error('Error al guardar', e); }
      state.saving = false; renderSavePill();
      resolve();
    }, 350);
  });
}

/* ============================= DATE HELPERS ============================= */
function fmt(d){ return d.toISOString().slice(0,10); }
function addDays(d,n){ const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function parseDate(s){ if(!s) return null; const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function daysBetween(a,b){ return Math.round((b-a)/(1000*60*60*24)); }
function todayStr(){ return fmt(new Date()); }
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS_CORTO = ['D','L','M','M','J','V','S'];

function examStatus(vencStr){
  if(!vencStr) return {status:'sin-dato', label:'Sin dato', cls:'grey'};
  const venc = parseDate(vencStr);
  const diff = daysBetween(new Date(new Date().toDateString()), venc);
  if(diff < 0) return {status:'vencido', label:'Vencido', cls:'bad', diff};
  if(diff <= 30) return {status:'por-vencer', label:'Por vencer', cls:'warn', diff};
  return {status:'vigente', label:'Vigente', cls:'good', diff};
}
function acredStatus(a){
  if(a.estado === 'Acreditado' && a.vencimiento){
    const es = examStatus(a.vencimiento);
    if(es.status==='vencido') return {label:'Vencido', cls:'bad'};
    if(es.status==='por-vencer') return {label:'Por vencer', cls:'warn'};
    return {label:'Acreditado', cls:'good'};
  }
  if(a.estado === 'Acreditado') return {label:'Acreditado', cls:'good'};
  if(a.estado === 'En trámite') return {label:'En trámite', cls:'warn'};
  return {label:'No acreditado', cls:'grey'};
}
function workerWorstExam(w){
  let worst = 'good'; let order = {bad:3,warn:2,'sin-dato':1,good:0};
  (w.examenes||[]).forEach(e=>{
    const s = examStatus(e.vencimiento).status;
    const key = s==='vencido'?'bad':s==='por-vencer'?'warn':s==='sin-dato'?'sin-dato':'good';
    if(order[key] > order[worst]) worst = key;
  });
  return worst;
}
function faenaColor(faena){
  const idx = state.faenas.indexOf(faena);
  return FAENA_COLORS[idx>=0 ? idx % FAENA_COLORS.length : 0];
}
function faenaAbbrev(faena){
  return (faena||'').replace(/\s+/g,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').slice(0,3).toUpperCase();
}

/* ============================= SHIFT (14x14) LOGIC ============================= */
function shiftBaseStatus(worker, dateStr){
  const t = worker.turno || {fechaInicioCiclo: todayStr(), diasTrabajo:14, diasDescanso:14};
  if(!t.fechaInicioCiclo) return 'descanso';
  const start = parseDate(t.fechaInicioCiclo);
  const d = parseDate(dateStr);
  const cycle = (t.diasTrabajo||14) + (t.diasDescanso||14);
  let diff = daysBetween(start, d) % cycle;
  if(diff < 0) diff += cycle;
  return diff < (t.diasTrabajo||14) ? 'trabajo' : 'descanso';
}
function dayStatus(worker, dateStr){
  const ov = (worker.overrides||{})[dateStr];
  const base = shiftBaseStatus(worker, dateStr);
  if(ov && ov.tipo) return {tipo: ov.tipo, base, faena: ov.faena||'', nota: ov.nota||''};
  return {tipo: base, base, faena:'', nota:''};
}

/* ============================= DRAG-FILL (copiar celda como en Excel) ============================= */
let dragState = null; // {workerId, sourceDate, sourceInfo, lastDate, moved}
let justDragged = false;
let lastAction = null; // {workers:[{id, overrides}]} snapshot para "Deshacer"

function snapshotOverrides(workerIds){
  return workerIds.map(id=>{
    const w = state.workers.find(x=>x.id===id);
    return {id, overrides: JSON.parse(JSON.stringify((w && w.overrides) || {}))};
  });
}

async function performUndo(){
  if(!lastAction){ alert('No hay cambios recientes para deshacer.'); return; }
  lastAction.forEach(item=>{
    const w = state.workers.find(x=>x.id===item.id);
    if(w) w.overrides = item.overrides;
  });
  lastAction = null;
  render();
  await persist();
}

document.addEventListener('keydown', (e)=>{
  const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key==='z' || e.key==='Z');
  if(!isUndo) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if(tag==='INPUT' || tag==='TEXTAREA' || tag==='SELECT') return; // deja el undo nativo del campo de texto
  e.preventDefault();
  performUndo();
});

document.addEventListener('mousedown', (e)=>{
  if(e.button !== 0) return;
  const cell = e.target.closest('.daycell');
  if(!cell) return;
  const workerId = cell.dataset.id;
  const date = cell.dataset.date;
  const w = state.workers.find(x=>x.id===workerId);
  if(!w) return;
  const info = dayStatus(w, date);
  dragState = { workerId, sourceDate: date, sourceInfo: {tipo: info.tipo, faena: info.faena, nota: info.nota}, lastDate: date, moved: false };
});

document.addEventListener('mouseover', (e)=>{
  if(!dragState) return;
  const cell = e.target.closest('.daycell');
  if(!cell || cell.dataset.id !== dragState.workerId) return;
  dragState.lastDate = cell.dataset.date;
  dragState.moved = true;
  highlightDragRange(dragState.workerId, dragState.sourceDate, dragState.lastDate);
});

document.addEventListener('mouseup', async ()=>{
  if(!dragState) return;
  if(dragState.moved){
    lastAction = snapshotOverrides([dragState.workerId]);
    applyDragFill(dragState);
    justDragged = true;
    clearDragHighlight();
    render();
    await persist();
  } else {
    clearDragHighlight();
  }
  dragState = null;
});

function highlightDragRange(workerId, d1, d2){
  clearDragHighlight();
  const lo = d1 < d2 ? d1 : d2;
  const hi = d1 < d2 ? d2 : d1;
  document.querySelectorAll('.daycell[data-id="'+workerId+'"]').forEach(td=>{
    const d = td.dataset.date;
    if(d >= lo && d <= hi) td.classList.add('drag-highlight');
  });
}
function clearDragHighlight(){
  document.querySelectorAll('.drag-highlight').forEach(td=>td.classList.remove('drag-highlight'));
}
function applyDragFill(ds){
  const w = state.workers.find(x=>x.id===ds.workerId);
  if(!w) return;
  const lo = ds.sourceDate < ds.lastDate ? ds.sourceDate : ds.lastDate;
  const hi = ds.sourceDate < ds.lastDate ? ds.lastDate : ds.sourceDate;
  w.overrides = w.overrides || {};
  let cur = parseDate(lo);
  const end = parseDate(hi);
  while(cur <= end){
    const dateStr = fmt(cur);
    const base = shiftBaseStatus(w, dateStr);
    const tipo = ds.sourceInfo.tipo, faena = ds.sourceInfo.faena||'', nota = ds.sourceInfo.nota||'';
    if(tipo===base && !faena && !nota) delete w.overrides[dateStr];
    else w.overrides[dateStr] = {tipo, faena, nota};
    cur = addDays(cur, 1);
  }
}

/* ============================= FILE / DOCUMENT HELPERS ============================= */
function readFileAsBase64(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function viewDocument(key, fallbackName){
  try{
    const res = await window.storage.get(key, true);
    if(!res || !res.value){ alert('No se encontró el archivo guardado. Vuelve a subirlo desde la ficha del trabajador.'); return; }
    const parsed = JSON.parse(res.value);
    const byteChars = atob(parsed.data);
    const bytes = new Uint8Array(byteChars.length);
    for(let i=0;i<byteChars.length;i++) bytes[i]=byteChars.charCodeAt(i);
    const blob = new Blob([bytes], {type: parsed.mime || 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel='noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 30000);
  }catch(e){
    console.error(e);
    alert('No se encontró el archivo guardado (puede que la subida haya fallado en su momento). Vuelve a subirlo desde la ficha del trabajador.');
  }
}

/* ============================= RENDER: SHELL ============================= */
const NAV = [
  {id:'dashboard', label:'Resumen', ic:'◆'},
  {id:'trabajadores', label:'Trabajadores', ic:'●'},
  {id:'documentos', label:'Documentos', ic:'▤'},
  {id:'acreditaciones', label:'Acreditaciones', ic:'✓'},
  {id:'certificaciones', label:'Certificaciones equipos', ic:'⚙'},
  {id:'turnos', label:'Turnos 14x14', ic:'▦'}
];
const TAB_TITLES = {dashboard:'Resumen general', trabajadores:'Trabajadores', documentos:'Documentos y exámenes', acreditaciones:'Acreditación por faena', certificaciones:'Certificaciones por equipo', turnos:'Turnos 14x14'};

function renderSidebar(){
  const alertCount = state.workers.filter(w=>{const s=workerWorstExam(w); return s==='bad'||s==='warn';}).length;
  document.getElementById('navList').innerHTML = NAV.map(n=>{
    let count = '';
    if(n.id==='trabajadores') count = '<span class="nav-count">'+state.workers.length+'</span>';
    if(n.id==='documentos' && alertCount>0) count = '<span class="nav-count alert">'+alertCount+'</span>';
    return '<div class="nav-item '+(state.ui.tab===n.id?'active':'')+'" data-nav="'+n.id+'"><span class="ic">'+n.ic+'</span>'+n.label+count+'</div>';
  }).join('');
}

function renderTopbar(){
  const tb = document.getElementById('topbar');
  let searchHtml = '';
  if(state.ui.tab==='trabajadores'){
    searchHtml = '<div class="search-box"><span class="ic">\uD83D\uDD0E</span><input id="searchInput" placeholder="Buscar por nombre, RUT o cargo..." value="'+escAttr(state.ui.search)+'"></div>'+
      '<select id="cargoFilter" style="max-width:190px;">'+
        '<option value="all" '+(state.ui.cargoFilter==='all'?'selected':'')+'>Todos los cargos</option>'+
        state.cargos.map(c=>'<option value="'+c+'" '+(state.ui.cargoFilter===c?'selected':'')+'>'+c+'</option>').join('')+
      '</select>';
  }
  let addBtn = state.ui.tab==='trabajadores' ? '<button class="btn btn-accent" data-action="new-worker">+ Nuevo trabajador</button>' : '';
  tb.innerHTML = '<h1>'+TAB_TITLES[state.ui.tab]+'</h1>'+searchHtml+addBtn+'<span class="save-pill" id="savePill"></span>';
  renderSavePill();
}
function renderSavePill(){
  const el = document.getElementById('savePill');
  if(!el) return;
  el.innerHTML = state.saving ? '<span class="dot-live" style="background:var(--amber)"></span> Guardando...' : '<span class="dot-live"></span> Guardado';
}

function render(){
  renderSidebar();
  renderTopbar();
  const c = document.getElementById('content');
  if(state.ui.tab==='dashboard') c.innerHTML = viewDashboard();
  else if(state.ui.tab==='trabajadores') c.innerHTML = viewTrabajadores();
  else if(state.ui.tab==='documentos') c.innerHTML = viewDocumentos();
  else if(state.ui.tab==='acreditaciones') c.innerHTML = viewAcreditaciones();
  else if(state.ui.tab==='certificaciones') c.innerHTML = viewCertificaciones();
  else if(state.ui.tab==='turnos') c.innerHTML = viewTurnos();
  renderModal();
  attachDynamicListeners();
}

function escAttr(s){ return (s||'').replace(/"/g,'&quot;'); }
function escHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ============================= VIEW: DASHBOARD ============================= */
function viewDashboard(){
  const total = state.workers.length;
  const vencidos = state.workers.filter(w=>workerWorstExam(w)==='bad').length;
  const porVencer = state.workers.filter(w=>workerWorstExam(w)==='warn').length;
  const enFaenaHoy = state.workers.filter(w=>{const t=dayStatus(w, todayStr()).tipo; return t==='trabajo'||t==='extra';}).length;

  const alerts = [];
  state.workers.forEach(w=>{
    (w.examenes||[]).forEach(e=>{
      const st = examStatus(e.vencimiento);
      if(st.status==='vencido' || st.status==='por-vencer'){
        alerts.push({worker:w, label:e.tipo, venc:e.vencimiento, st});
      }
    });
    (w.certificaciones||[]).forEach(c=>{
      const st = examStatus(c.vencimiento);
      if(c.vencimiento && (st.status==='vencido' || st.status==='por-vencer')){
        alerts.push({worker:w, label:'Certificación '+c.equipo, venc:c.vencimiento, st});
      }
    });
  });
  alerts.sort((a,b)=> (a.st.diff??-9999) - (b.st.diff??-9999));

  const alertsHtml = alerts.length ? alerts.slice(0,12).map(a=>
    '<div class="alert-row"><span class="chip '+a.st.cls+'">'+a.st.label+'</span>'+
    '<div style="flex:1"><b>'+escHtml(a.worker.nombre)+'</b> <span style="color:var(--sub)">— '+escHtml(a.label)+'</span></div>'+
    '<div class="mono" style="color:var(--sub)">'+(a.venc ? 'vence '+a.venc : '')+'</div>'+
    '<button class="link-btn" data-action="open-worker" data-id="'+a.worker.id+'">Ver ficha →</button></div>'
  ).join('') : '<div class="empty">No hay exámenes ni certificaciones vencidas o por vencer. Todo al día ✓</div>';

  const faenaCounts = state.faenas.map(f=>{
    const n = state.workers.filter(w=>(w.acreditaciones||[]).some(a=>a.faena===f && a.estado==='Acreditado')).length;
    return {faena:f, n};
  });

  return '<div class="kpi-row">'+
      '<div class="kpi"><div class="num">'+total+'</div><div class="lbl">Trabajadores</div></div>'+
      '<div class="kpi"><div class="num">'+enFaenaHoy+'</div><div class="lbl">En faena hoy</div></div>'+
      '<div class="kpi warn"><div class="num">'+porVencer+'</div><div class="lbl">Exámenes por vencer</div></div>'+
      '<div class="kpi bad"><div class="num">'+vencidos+'</div><div class="lbl">Trabajadores con examen vencido</div></div>'+
    '</div>'+
    '<div class="panel"><div class="panel-head"><h2>Alertas de documentación</h2></div><div class="panel-body">'+alertsHtml+'</div></div>'+
    '<div class="panel"><div class="panel-head"><h2>Acreditados por faena</h2></div>'+
      '<div class="panel-body" style="padding:16px 18px;display:flex;gap:24px;flex-wrap:wrap;">'+
        faenaCounts.map(f=>
          '<div style="min-width:120px;"><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">'+
          '<span class="sticker" style="background:'+faenaColor(f.faena)+'"></span>'+
          '<span style="font-weight:600;font-size:13px;">'+escHtml(f.faena)+'</span></div>'+
          '<div class="disp" style="font-size:24px;color:var(--steel);">'+f.n+'</div></div>'
        ).join('')+
      '</div></div>';
}

/* ============================= VIEW: TRABAJADORES ============================= */
function workerCardHtml(w){
  const worst = workerWorstExam(w);
  const dotColor = worst==='bad'?'var(--bad)':worst==='warn'?'var(--amber)':worst==='sin-dato'?'#c7cac2':'var(--good)';
  const stickers = (w.acreditaciones||[]).filter(a=>a.estado==='Acreditado').map(a=>'<span class="sticker" style="background:'+faenaColor(a.faena)+'" title="'+escAttr(a.faena)+'"></span>').join('');
  return '<div class="wcard" data-action="open-worker" data-id="'+w.id+'">'+
    '<div class="wcard-top"><div><div class="name">'+escHtml(w.nombre)+'</div><div class="cargo">'+escHtml(w.cargo||'—')+'</div></div>'+
    '<span class="status-dot" style="background:'+dotColor+'" title="Estado de documentos"></span></div>'+
    '<div class="rut mono">'+escHtml(w.rut||'Sin RUT')+'</div>'+
    '<div class="sticker-row">'+(stickers || '<span class="sticker-empty">Sin acreditaciones</span>')+'</div></div>';
}

function viewTrabajadores(){
  const q = (state.ui.search||'').toLowerCase();
  const cargoFilter = state.ui.cargoFilter || 'all';
  let list = state.workers.filter(w=> !q || w.nombre.toLowerCase().includes(q) || (w.rut||'').toLowerCase().includes(q) || (w.cargo||'').toLowerCase().includes(q));
  if(cargoFilter!=='all') list = list.filter(w=>w.cargo===cargoFilter);
  if(!list.length) return '<div class="empty panel" style="padding:40px;">No hay trabajadores que coincidan. <button class="btn btn-accent" style="margin-top:10px" data-action="new-worker">+ Agregar trabajador</button></div>';

  // Si hay un cargo específico filtrado, se muestra como una sola grilla (ya viene agrupado de por sí)
  if(cargoFilter!=='all'){
    return '<div class="card-grid">'+list.map(workerCardHtml).join('')+'</div>';
  }

  // Sin filtro: se agrupa por cargo (en el orden definido en Cargos) para facilitar la búsqueda visual
  const groupOrder = [...state.cargos];
  const grouped = {};
  list.forEach(w=>{
    const key = w.cargo && groupOrder.includes(w.cargo) ? w.cargo : (w.cargo || 'Sin cargo asignado');
    if(!grouped[key]) grouped[key] = [];
    grouped[key].push(w);
  });
  const orderedKeys = [...groupOrder.filter(c=>grouped[c]), ...Object.keys(grouped).filter(k=>!groupOrder.includes(k))];

  return orderedKeys.map(key=>
    '<div style="margin-bottom:22px;">'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">'+
        '<h2 style="font-size:15px;color:var(--steel);margin:0;font-weight:700;">'+escHtml(key)+'</h2>'+
        '<span class="nav-count" style="background:var(--grey-bg);color:var(--sub);">'+grouped[key].length+'</span>'+
      '</div>'+
      '<div class="card-grid">'+grouped[key].map(workerCardHtml).join('')+'</div>'+
    '</div>'
  ).join('');
}

/* ============================= VIEW: DOCUMENTOS ============================= */
function viewDocumentos(){
  let rows = state.workers.map(w=>({w, exams: EXAM_TYPES.map(t=> (w.examenes||[]).find(e=>e.tipo===t) || {tipo:t, fecha:'', vencimiento:''}) }));

  if(state.ui.docTypeFilter!=='all' || state.ui.docFilter!=='all'){
    rows = rows.filter(r=> r.exams.some(e=>{
        if(state.ui.docTypeFilter!=='all' && e.tipo!==state.ui.docTypeFilter) return false;
        const st = examStatus(e.vencimiento).status;
        const stKey = st==='vencido'?'vencido':st==='por-vencer'?'por-vencer':st==='sin-dato'?'sin-dato':'vigente';
        if(state.ui.docFilter!=='all' && stKey!==state.ui.docFilter) return false;
        return true;
      })
    );
  }

  const filterBar = '<div class="filter-bar">'+
      '<select id="docTypeFilter"><option value="all" '+(state.ui.docTypeFilter==='all'?'selected':'')+'>Todos los exámenes</option>'+
        EXAM_TYPES.map(t=>'<option value="'+t+'" '+(state.ui.docTypeFilter===t?'selected':'')+'>'+t+'</option>').join('')+
      '</select>'+
      '<select id="docStatusFilter"><option value="all" '+(state.ui.docFilter==='all'?'selected':'')+'>Todos los estados</option>'+
        '<option value="vigente" '+(state.ui.docFilter==='vigente'?'selected':'')+'>Vigente</option>'+
        '<option value="por-vencer" '+(state.ui.docFilter==='por-vencer'?'selected':'')+'>Por vencer (≤30 días)</option>'+
        '<option value="vencido" '+(state.ui.docFilter==='vencido'?'selected':'')+'>Vencido</option>'+
        '<option value="sin-dato" '+(state.ui.docFilter==='sin-dato'?'selected':'')+'>Sin dato</option>'+
      '</select>'+
    '</div>';

  if(!rows.length) return filterBar+'<div class="empty panel" style="padding:40px;">No hay resultados para este filtro.</div>';

  const tableHtml = '<div class="table-wrap"><table>'+
    '<thead><tr><th>Trabajador</th><th>Cargo</th>'+EXAM_TYPES.map(t=>'<th>'+t+'</th>').join('')+'</tr></thead>'+
    '<tbody>'+rows.map(r=>
        '<tr><td><b>'+escHtml(r.w.nombre)+'</b></td><td>'+escHtml(r.w.cargo||'—')+'</td>'+
        r.exams.map(e=>{
            const st = examStatus(e.vencimiento);
            const docLink = e.archivoNombre ? '<span class="doc-cell-link" data-action="view-doc-table" data-key="'+examDocKey(r.w.id, e.tipo)+'">\uD83D\uDCCE Ver archivo</span>' : '<span class="doc-cell-none">Sin archivo</span>';
            return '<td><span class="chip '+st.cls+'">'+st.label+'</span>'+
              '<div class="mono" style="font-size:11px;color:var(--sub);margin-top:3px;">'+(e.vencimiento ? 'vence '+e.vencimiento : 'sin registro')+'</div>'+
              '<div style="margin-top:4px;">'+docLink+'</div></td>';
          }).join('')+
        '</tr>'
    ).join('')+
    '</tbody></table></div>'+
    '<div style="margin-top:10px;"><button class="link-btn" data-action="goto-worker-from-doc">Subir o reemplazar un documento desde la ficha del trabajador →</button></div>';

  // Otros documentos / exámenes adicionales (agregados libremente por cada trabajador)
  const extraRows = state.workers.flatMap(w=>(w.examenesExtra||[]).map(item=>({w, item})));
  let extraHtml = '';
  if(extraRows.length){
    extraHtml = '<div class="panel" style="margin-top:20px;">'+
      '<div class="panel-head"><h2>Otros documentos y exámenes adicionales</h2></div>'+
      '<div class="table-wrap" style="border:none;box-shadow:none;border-radius:0;"><table>'+
        '<thead><tr><th>Trabajador</th><th>Cargo</th><th>Documento</th><th>Fecha</th><th>Vence</th><th>Estado</th><th>Archivo</th></tr></thead>'+
        '<tbody>'+extraRows.map(({w,item})=>{
          const st = examStatus(item.vencimiento);
          const docLink = item.archivoNombre ? '<span class="doc-cell-link" data-action="view-doc-table" data-key="'+examExtraDocKey(w.id, item.id)+'">\uD83D\uDCCE Ver</span>' : '<span class="doc-cell-none">Sin archivo</span>';
          return '<tr><td><b>'+escHtml(w.nombre)+'</b></td><td>'+escHtml(w.cargo||'—')+'</td><td>'+escHtml(item.nombre)+'</td>'+
            '<td class="mono">'+(item.fecha||'—')+'</td><td class="mono">'+(item.vencimiento||'—')+'</td>'+
            '<td><span class="chip '+st.cls+'">'+st.label+'</span></td><td>'+docLink+'</td></tr>';
        }).join('')+
        '</tbody></table></div></div>';
  }

  return filterBar + tableHtml + extraHtml;
}

/* ============================= VIEW: ACREDITACIONES ============================= */
function viewAcreditaciones(){
  const filterBar = '<div class="filter-bar">'+
      '<select id="acredFaenaFilter"><option value="all" '+(state.ui.acredFaenaFilter==='all'?'selected':'')+'>Todas las faenas</option>'+
        state.faenas.map(f=>'<option value="'+f+'" '+(state.ui.acredFaenaFilter===f?'selected':'')+'>'+f+'</option>').join('')+
      '</select>'+
      '<button class="btn btn-ghost btn-sm" data-action="add-faena">+ Agregar faena</button>'+
    '</div>';

  const faenasToShow = state.ui.acredFaenaFilter==='all' ? state.faenas : [state.ui.acredFaenaFilter];
  let rows = state.workers;
  if(state.ui.acredFaenaFilter!=='all'){
    rows = rows.filter(w=>(w.acreditaciones||[]).some(a=>a.faena===state.ui.acredFaenaFilter));
  }
  if(!rows.length) return filterBar+'<div class="empty panel" style="padding:40px;">No hay trabajadores acreditados o en trámite para esta faena.</div>';

  return filterBar+'<div class="table-wrap"><table>'+
    '<thead><tr><th>Trabajador</th><th>Cargo</th>'+faenasToShow.map(f=>'<th><span class="sticker" style="background:'+faenaColor(f)+';display:inline-block;margin-right:5px;"></span>'+f+'</th>').join('')+'</tr></thead>'+
    '<tbody>'+rows.map(w=>
      '<tr><td><b>'+escHtml(w.nombre)+'</b></td><td>'+escHtml(w.cargo||'—')+'</td>'+
      faenasToShow.map(f=>{
        const a = (w.acreditaciones||[]).find(a=>a.faena===f);
        if(!a) return '<td><span class="chip grey">—</span></td>';
        const st = acredStatus(a);
        return '<td><span class="chip '+st.cls+'">'+st.label+'</span>'+(a.vencimiento?'<div class="mono" style="font-size:11px;color:var(--sub);margin-top:3px;">vence '+a.vencimiento+'</div>':'')+'</td>';
      }).join('')+
      '</tr>'
    ).join('')+
    '</tbody></table></div>';
}

/* ============================= VIEW: CERTIFICACIONES ============================= */
function viewCertificaciones(){
  const filterBar = '<div class="filter-bar">'+
      '<select id="certEquipoFilter"><option value="all" '+(state.ui.certEquipoFilter==='all'?'selected':'')+'>Todos los equipos</option>'+
        state.equipos.map(eq=>'<option value="'+eq+'" '+(state.ui.certEquipoFilter===eq?'selected':'')+'>'+eq+'</option>').join('')+
      '</select>'+
      '<button class="btn btn-ghost btn-sm" data-action="add-equipo">+ Agregar equipo</button>'+
    '</div>';

  let rows = state.workers.filter(w=>(w.certificaciones||[]).length>0);
  if(state.ui.certEquipoFilter!=='all'){
    rows = rows.filter(w=>(w.certificaciones||[]).some(c=>c.equipo===state.ui.certEquipoFilter));
  }
  if(!rows.length) return filterBar+'<div class="empty panel" style="padding:40px;">Aún no hay certificaciones de equipos registradas. Agrégalas desde la ficha de cada trabajador.</div>';

  return filterBar+'<div class="table-wrap"><table>'+
    '<thead><tr><th>Trabajador</th><th>Cargo</th><th>Equipo</th><th>Obtenido</th><th>Vence</th><th>Estado</th><th>Documento</th></tr></thead>'+
    '<tbody>'+rows.flatMap(w=>{
      let certs = w.certificaciones||[];
      if(state.ui.certEquipoFilter!=='all') certs = certs.filter(c=>c.equipo===state.ui.certEquipoFilter);
      return certs.map(c=>{
        const st = examStatus(c.vencimiento);
        const files = c.archivos || [];
        const docLink = files.length ? files.map(f=>'<span class="doc-cell-link" data-action="view-doc-table" data-key="'+certDocKey(w.id, c.id, f.id)+'">\uD83D\uDCCE '+escHtml(f.nombre)+'</span>').join('<br>') : '<span class="doc-cell-none">Sin archivos</span>';
        return '<tr><td><b>'+escHtml(w.nombre)+'</b></td><td>'+escHtml(w.cargo||'—')+'</td>'+
          '<td><span class="sticker" style="background:'+faenaColor(c.equipo)+';display:inline-block;margin-right:5px;"></span>'+escHtml(c.equipo)+'</td>'+
          '<td class="mono">'+(c.fecha||'—')+'</td><td class="mono">'+(c.vencimiento||'—')+'</td>'+
          '<td><span class="chip '+st.cls+'">'+st.label+'</span></td><td>'+docLink+'</td></tr>';
      });
    }).join('')+
    '</tbody></table></div>'+
    '<div style="margin-top:10px;"><button class="link-btn" data-action="goto-worker-from-doc">Agregar o editar certificaciones desde la ficha del trabajador →</button></div>';
}

/* ============================= VIEW: TURNOS ============================= */
function viewTurnos(){
  const y = state.ui.calYear, m = state.ui.calMonth;
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const monthLabel = MESES[m] + ' ' + y;
  const size = state.ui.gridSize || 'compact';

  let headerCells = '';
  for(let d=1; d<=daysInMonth; d++){
    const wd = new Date(y,m,d).getDay();
    headerCells += '<th class="'+(wd===0||wd===6?'weekend-col':'')+'">'+d+'<br><span style="font-weight:400;">'+DIAS_CORTO[wd]+'</span></th>';
  }

  const rows = state.workers.map(w=>{
    let cells = '';
    for(let d=1; d<=daysInMonth; d++){
      const dateStr = fmt(new Date(y,m,d));
      const info = dayStatus(w, dateStr);
      let cls = 'daycell';
      let style = '';
      if(info.faena){
        style = 'background:'+faenaColor(info.faena)+';';
        if(info.tipo==='extra') cls += ' ring-extra';
        else if(info.tipo==='permiso') cls += ' ring-permiso';
      } else {
        cls += info.tipo==='trabajo' ? ' st-trabajo' : info.tipo==='extra' ? ' st-extra' : info.tipo==='permiso' ? ' st-permiso' : ' st-descanso';
      }
      const title = dateStr+' — '+info.tipo+(info.faena?(' · '+info.faena):'')+(info.nota?(' · '+info.nota):'');
      let label = '', labelStyle = '';
      if(info.faena){ label = faenaAbbrev(info.faena); }
      else if(info.tipo==='trabajo'){ label = 'T'; }
      else if(info.tipo==='descanso'){ label = 'D'; labelStyle = 'color:#5b5f57;text-shadow:none;'; }
      else if(info.tipo==='extra'){ label = 'HE'; }
      else if(info.tipo==='permiso'){ label = 'P'; labelStyle = 'color:#7a1f1f;text-shadow:none;'; }
      const labelHtml = label ? '<span class="daycell-label" style="'+labelStyle+'">'+label+'</span>' : '';
      cells += '<td class="'+cls+'" style="'+style+'" title="'+escAttr(title)+'" data-action="edit-day" data-id="'+w.id+'" data-date="'+dateStr+'">'+labelHtml+'</td>';
    }
    return '<tr><td class="namecell">'+escHtml(w.nombre)+'<div style="font-weight:400;font-size:11px;color:var(--sub);">'+escHtml(w.cargo||'')+'</div>'+
      '<button type="button" class="link-btn worker-link-btn" data-action="view-worker-month" data-id="'+w.id+'">Ver mes ampliado →</button>'+
      '</td>'+cells+'</tr>';
  }).join('');

  const faenaLegend = state.faenas.map(f=>'<span class="fl-item"><span class="fl-sw" style="background:'+faenaColor(f)+'"></span>'+escHtml(f)+'</span>').join('');

  return '<div class="cal-toolbar">'+
      '<button class="btn btn-ghost btn-sm" data-action="cal-prev">← Mes anterior</button>'+
      '<div class="month-lbl">'+monthLabel+'</div>'+
      '<button class="btn btn-ghost btn-sm" data-action="cal-next">Mes siguiente →</button>'+
      '<div class="size-toggle">'+
        '<button type="button" class="'+(size==='compact'?'active-size':'')+'" data-action="grid-size" data-size="compact">Compacta</button>'+
        '<button type="button" class="'+(size==='comfortable'?'active-size':'')+'" data-action="grid-size" data-size="comfortable">Cómoda</button>'+
        '<button type="button" class="'+(size==='large'?'active-size':'')+'" data-action="grid-size" data-size="large">Grande</button>'+
      '</div>'+
      '<button class="btn btn-accent btn-sm" data-action="open-bulk" style="margin-left:14px;">+ Editar varios días</button>'+
      '<button class="btn btn-ghost btn-sm" data-action="undo-last">↺ Deshacer (Ctrl+Z)</button>'+
      '<div class="legend">'+
        '<span><span class="sw" style="background:#2f3944"></span>T = Trabajo</span>'+
        '<span><span class="sw" style="background:#e7e8e3;border:1px solid #ccc"></span>D = Descanso</span>'+
        '<span><span class="sw" style="background:#fff;box-shadow:inset 0 0 0 2px #999"></span>HE = hora extra</span>'+
        '<span><span class="sw" style="background:#fff;box-shadow:inset 0 0 0 2px var(--bad)"></span>P = permiso</span>'+
      '</div></div>'+
    '<div class="faena-legend">'+faenaLegend+'</div>'+
    '<div class="helptext">Haz clic en un día para editarlo individualmente, o arrastra de un día a otro para copiar el mismo estado a los días intermedios. Usa los botones "Compacta / Cómoda / Grande" para ajustar el tamaño de las celdas, o haz clic en "Ver mes ampliado" bajo el nombre de un trabajador para revisar su planificación en un calendario grande. Si te equivocas, usa "Deshacer" (Ctrl+Z). Para varios trabajadores a la vez, usa "Editar varios días".</div>'+
    '<div class="table-wrap" style="max-height:74vh;"><table class="grid-table size-'+size+'">'+
      '<thead><tr><th class="namecell">Trabajador</th>'+headerCells+'</tr></thead>'+
      '<tbody>'+(rows || '<tr><td class="namecell" style="color:var(--sub)">Sin trabajadores</td></tr>')+'</tbody>'+
    '</table></div>';
}

/* ============================= MODALS ============================= */
function renderModal(){
  const root = document.getElementById('modalRoot');
  if(!state.ui.modal){ root.innerHTML=''; return; }
  if(state.ui.modal.type==='worker') root.innerHTML = workerModalHtml(state.ui.modal.workerId);
  else if(state.ui.modal.type==='day') root.innerHTML = dayModalHtml(state.ui.modal.workerId, state.ui.modal.date);
  else if(state.ui.modal.type==='addFaena') root.innerHTML = addSimpleListModalHtml('Agregar faena','new-faena-name','save-faena');
  else if(state.ui.modal.type==='addEquipo') root.innerHTML = addSimpleListModalHtml('Agregar tipo de equipo','new-equipo-name','save-equipo');
  else if(state.ui.modal.type==='bulk') root.innerHTML = bulkModalHtml();
  else if(state.ui.modal.type==='workerMonth') root.innerHTML = workerMonthModalHtml();
}

function workerMonthModalHtml(){
  const modal = state.ui.modal;
  const w = state.workers.find(x=>x.id===modal.workerId);
  if(!w) return '';
  const y = modal.year, m = modal.month;
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const firstWd = new Date(y, m, 1).getDay();
  const monthLabel = MESES[m] + ' ' + y;

  let cellsHtml = '';
  for(let i=0;i<firstWd;i++) cellsHtml += '<div></div>';
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = fmt(new Date(y,m,d));
    const info = dayStatus(w, dateStr);
    let cls = 'daycell daycell-lg';
    let style = '';
    if(info.faena){
      style = 'background:'+faenaColor(info.faena)+';';
      if(info.tipo==='extra') cls += ' ring-extra';
      else if(info.tipo==='permiso') cls += ' ring-permiso';
    } else {
      cls += info.tipo==='trabajo' ? ' st-trabajo' : info.tipo==='extra' ? ' st-extra' : info.tipo==='permiso' ? ' st-permiso' : ' st-descanso';
    }
    let big = '';
    if(info.faena) big = faenaAbbrev(info.faena);
    else if(info.tipo==='trabajo') big = 'T';
    else if(info.tipo==='descanso') big = 'D';
    else if(info.tipo==='extra') big = 'HE';
    else if(info.tipo==='permiso') big = 'P';
    const title = dateStr+' — '+info.tipo+(info.faena?(' · '+info.faena):'')+(info.nota?(' · '+info.nota):'');
    cellsHtml += '<div class="'+cls+'" style="'+style+'" data-action="edit-day" data-id="'+w.id+'" data-date="'+dateStr+'" title="'+escAttr(title)+'">'+
        '<span class="daynum">'+d+'</span><span class="biglabel">'+big+'</span>'+
        (info.faena ? '<span class="faename">'+escHtml(info.faena)+'</span>' : '')+
        (info.nota ? '<span class="faename" style="opacity:.85;">'+escHtml(info.nota)+'</span>' : '')+
      '</div>';
  }
  const weekdayHeaders = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d=>'<div class="month-cal-weekday">'+d+'</div>').join('');

  return '<div class="modal-overlay" data-action="close-modal-overlay"><div class="modal" style="width:780px;">'+
    '<div class="modal-head"><h2>'+escHtml(w.nombre)+'</h2><button class="modal-close" data-action="close-modal">✕</button></div>'+
    '<div class="modal-body">'+
      '<div class="cal-toolbar" style="margin-bottom:2px;">'+
        '<button class="btn btn-ghost btn-sm" data-action="wm-prev">← Mes anterior</button>'+
        '<div class="month-lbl" style="min-width:150px;">'+monthLabel+'</div>'+
        '<button class="btn btn-ghost btn-sm" data-action="wm-next">Mes siguiente →</button>'+
      '</div>'+
      '<div class="helptext">Haz clic en un día para editarlo, o arrastra de un día a otro para copiar el mismo estado a los días intermedios.</div>'+
      '<div class="month-cal-grid">'+weekdayHeaders+cellsHtml+'</div>'+
    '</div>'+
    '<div class="modal-foot"><div></div><button class="btn btn-ghost" data-action="close-modal">Cerrar</button></div>'+
  '</div></div>';
}

function bulkWorkerListHtml(query){
  const q = (query||'').toLowerCase();
  const list = state.workers.filter(w=> !q || w.nombre.toLowerCase().includes(q) || (w.cargo||'').toLowerCase().includes(q));
  if(!list.length) return '<div class="helptext" style="padding:12px;">Sin resultados.</div>';
  return list.map(w=>
    '<label class="bulk-worker-row"><input type="checkbox" class="bulk-chk" value="'+w.id+'" '+(bulkSelected.has(w.id)?'checked':'')+'>'+
    '<span>'+escHtml(w.nombre)+'</span><span class="w-cargo">'+escHtml(w.cargo||'')+'</span></label>'
  ).join('');
}

function updateBulkCount(){
  const el = document.getElementById('bulkCount');
  if(el) el.textContent = bulkSelected.size + (bulkSelected.size===1 ? ' trabajador seleccionado' : ' trabajadores seleccionados');
}

function bulkModalHtml(){
  return '<div class="modal-overlay" data-action="close-modal-overlay"><div class="modal">'+
    '<div class="modal-head"><h2>Editar varios días</h2><button class="modal-close" data-action="close-modal">✕</button></div>'+
    '<div class="modal-body">'+
      '<div class="helptext">Aplica el mismo estado a un rango de fechas para uno o varios trabajadores a la vez. Esto sobrescribe lo que haya en esos días.</div>'+
      '<div class="field-row">'+
        '<div class="field"><label>Desde</label><input type="date" id="bulk-start" value="'+todayStr()+'"></div>'+
        '<div class="field"><label>Hasta</label><input type="date" id="bulk-end" value="'+todayStr()+'"></div>'+
      '</div>'+
      '<div class="field-row">'+
        '<div class="field"><label>Estado a aplicar</label><select id="bulk-tipo">'+
          '<option value="trabajo">Trabajo</option>'+
          '<option value="descanso">Descanso</option>'+
          '<option value="extra">Trabajó en su descanso (hora extra)</option>'+
          '<option value="permiso">Permiso / licencia</option>'+
        '</select></div>'+
        '<div class="field"><label>Faena (opcional)</label><select id="bulk-faena"><option value="">—</option>'+state.faenas.map(f=>'<option value="'+f+'">'+f+'</option>').join('')+'</select></div>'+
      '</div>'+
      '<div class="field"><label>Nota (opcional)</label><input id="bulk-nota" placeholder="Ej: traslado a faena"></div>'+

      '<div class="section-title">Trabajadores <span class="bulk-count" id="bulkCount">'+bulkSelected.size+' trabajadores seleccionados</span></div>'+
      '<div class="bulk-toolbar">'+
        '<input type="text" id="bulkSearch" placeholder="Buscar por nombre o cargo..." style="flex:1;padding:7px 10px;border:1px solid var(--line);border-radius:7px;">'+
        '<button type="button" class="btn btn-ghost btn-sm" data-action="bulk-select-all">Seleccionar todos (filtrados)</button>'+
        '<button type="button" class="btn btn-ghost btn-sm" data-action="bulk-select-none">Quitar selección</button>'+
      '</div>'+
      '<div class="bulk-list-wrap" id="bulkWorkerList">'+bulkWorkerListHtml('')+'</div>'+
    '</div>'+
    '<div class="modal-foot"><div></div><div style="display:flex;gap:8px;"><button class="btn btn-ghost" data-action="close-modal">Cancelar</button><button class="btn btn-accent" data-action="apply-bulk">Aplicar cambios</button></div></div>'+
  '</div></div>';
}

function certFileChipHtml(workerId, certId, file){
  const key = certDocKey(workerId, certId, file.id);
  return '<span class="file-chip" data-file-id="'+escAttr(file.id)+'">'+
    '<span class="file-chip-name">'+escHtml(file.nombre)+'</span>'+
    '<button type="button" class="link-btn" data-action="view-doc" data-key="'+key+'">Ver</button>'+
    '<button type="button" class="icon-btn" data-action="remove-cert-file" data-certid="'+certId+'" data-fileid="'+escAttr(file.id)+'">✕</button>'+
  '</span>';
}

function certBlockHtml(workerId, c){
  const inputId = 'certfile-'+c.id;
  const files = c.archivos || [];
  const chips = files.map(f=>certFileChipHtml(workerId, c.id, f)).join('');
  return '<div class="cert-block" data-cert-id="'+c.id+'">'+
    '<div class="cert-top-row">'+
      '<select class="cert-equipo">'+state.equipos.map(eq=>'<option value="'+eq+'" '+(c.equipo===eq?'selected':'')+'>'+eq+'</option>').join('')+'</select>'+
      '<input type="date" class="cert-fecha" value="'+(c.fecha||'')+'" title="Fecha obtenido">'+
      '<input type="date" class="cert-venc" value="'+(c.vencimiento||'')+'" title="Fecha vencimiento">'+
      '<button class="icon-btn" data-action="remove-cert" data-certid="'+c.id+'">✕</button>'+
    '</div>'+
    '<div class="file-row">'+
      '<input type="file" id="'+inputId+'" class="cert-file-multi" multiple accept=".pdf,.jpg,.jpeg,.png">'+
      '<label for="'+inputId+'" class="file-pill-label">\uD83D\uDCCE Adjuntar archivo(s)</label>'+
      '<div class="file-chip-list">'+(chips || '<span class="file-name">Sin archivos adjuntos</span>')+'</div>'+
    '</div>'+
    '<div class="helptext" style="margin:6px 0 0;">Puedes adjuntar más de un archivo (por ejemplo, si tiene certificaciones de distintas fechas u organismos para este mismo equipo).</div>'+
  '</div>';
}

function examCardHtml(workerId, tipo, e){
  const key = examDocKey(workerId, tipo);
  const inputId = 'examfile-'+slugify(tipo)+'-'+workerId;
  const hasFile = !!e.archivoNombre;
  return '<div class="exam-card" data-exam-type="'+tipo+'">'+
    '<div class="exam-card-title">'+tipo+'</div>'+
    '<div class="exam-card-fields">'+
      '<div><label>Fecha realizado</label><input type="date" class="exam-fecha" value="'+(e.fecha||'')+'"></div>'+
      '<div><label>Vence</label><input type="date" class="exam-venc" value="'+(e.vencimiento||'')+'"></div>'+
    '</div>'+
    '<div class="file-row" data-doc-key="'+key+'">'+
      '<input type="file" id="'+inputId+'" class="exam-file" accept=".pdf,.jpg,.jpeg,.png">'+
      '<label for="'+inputId+'" class="file-pill-label">\uD83D\uDCCE Adjuntar archivo</label>'+
      '<span class="file-name" data-role="filename">'+(hasFile?escHtml(e.archivoNombre):'Sin archivo adjunto')+'</span>'+
      (hasFile?'<button type="button" class="link-btn" data-action="view-doc" data-key="'+key+'">Ver</button>':'')+
      (hasFile?'<button type="button" class="icon-btn" data-action="remove-doc" data-scope="exam" data-tipo="'+tipo+'" title="Quitar archivo">✕</button>':'')+
    '</div></div>';
}

function examExtraCardHtml(workerId, item){
  const key = examExtraDocKey(workerId, item.id);
  const inputId = 'examextra-'+item.id;
  const hasFile = !!item.archivoNombre;
  return '<div class="exam-card" data-extra-id="'+item.id+'">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">'+
      '<input type="text" class="exam-extra-nombre" value="'+escAttr(item.nombre||'')+'" placeholder="Ej: Examen de altura física, curso IPER, licencia de conducir..." style="font-weight:700;font-size:13px;border:1px solid var(--line);border-radius:6px;padding:7px 9px;flex:1;background:var(--panel);">'+
      '<button class="icon-btn" data-action="remove-exam-extra" data-extraid="'+item.id+'">✕</button>'+
    '</div>'+
    '<div class="exam-card-fields">'+
      '<div><label>Fecha realizado</label><input type="date" class="exam-extra-fecha" value="'+(item.fecha||'')+'"></div>'+
      '<div><label>Vence (opcional)</label><input type="date" class="exam-extra-venc" value="'+(item.vencimiento||'')+'"></div>'+
    '</div>'+
    '<div class="file-row" data-doc-key="'+key+'">'+
      '<input type="file" id="'+inputId+'" class="exam-extra-file" accept=".pdf,.jpg,.jpeg,.png">'+
      '<label for="'+inputId+'" class="file-pill-label">\uD83D\uDCCE Adjuntar archivo</label>'+
      '<span class="file-name" data-role="filename">'+(hasFile?escHtml(item.archivoNombre):'Sin archivo adjunto')+'</span>'+
      (hasFile?'<button type="button" class="link-btn" data-action="view-doc" data-key="'+key+'">Ver</button>':'')+
      (hasFile?'<button type="button" class="icon-btn" data-action="remove-doc" data-scope="examextra" data-extraid="'+item.id+'" title="Quitar archivo">✕</button>':'')+
    '</div></div>';
}

function workerModalHtml(workerId){
  const isNew = !workerId;
  const w = isNew ? {id:uid('w'), nombre:'', rut:'', telefono:'', correo:'', ciudad:'', cargo:state.cargos[0], empresa:'', turno:{fechaInicioCiclo: todayStr(), diasTrabajo:14, diasDescanso:14}, overrides:{}, examenes: EXAM_TYPES.map(t=>({tipo:t, fecha:'', vencimiento:''})), acreditaciones:[], certificaciones:[], examenesExtra:[]} : state.workers.find(x=>x.id===workerId);

  const examCards = EXAM_TYPES.map(t=>{
    const e = (w.examenes||[]).find(x=>x.tipo===t) || {tipo:t, fecha:'', vencimiento:''};
    return examCardHtml(w.id, t, e);
  }).join('');

  const acredRows = (w.acreditaciones||[]).map((a,i)=>
    '<div class="repeat-row2" data-idx="'+i+'">'+
      '<select class="acred-faena">'+state.faenas.map(f=>'<option value="'+f+'" '+(a.faena===f?'selected':'')+'>'+f+'</option>').join('')+'</select>'+
      '<select class="acred-estado">'+['Acreditado','En trámite','No acreditado'].map(s=>'<option value="'+s+'" '+(a.estado===s?'selected':'')+'>'+s+'</option>').join('')+'</select>'+
      '<input type="date" class="acred-venc" value="'+(a.vencimiento||'')+'" title="Vencimiento (opcional)">'+
      '<button class="icon-btn" data-action="remove-acred" data-idx="'+i+'">✕</button>'+
    '</div>'
  ).join('');

  const certBlocks = (w.certificaciones||[]).map(c=>certBlockHtml(w.id, c)).join('');
  const examExtraBlocks = (w.examenesExtra||[]).map(item=>examExtraCardHtml(w.id, item)).join('');

  return '<div class="modal-overlay" data-action="close-modal-overlay"><div class="modal">'+
    '<div class="modal-head"><h2>'+(isNew?'Nuevo trabajador':'Ficha de trabajador')+'</h2><button class="modal-close" data-action="close-modal">✕</button></div>'+
    '<div class="modal-body" id="workerForm" data-worker-id="'+w.id+'" data-is-new="'+isNew+'">'+

      '<div class="section-title">Datos personales</div>'+
      '<div class="field"><label>Nombre completo</label><input id="f-nombre" value="'+escAttr(w.nombre)+'" placeholder="Ej: Juan Pérez Soto"></div>'+
      '<div class="field-row">'+
        '<div class="field"><label>RUT</label><input id="f-rut" class="mono" value="'+escAttr(w.rut)+'" placeholder="12.345.678-9"></div>'+
        '<div class="field"><label>Cargo</label><select id="f-cargo">'+state.cargos.map(c=>'<option value="'+c+'" '+(w.cargo===c?'selected':'')+'>'+c+'</option>').join('')+'</select></div>'+
      '</div>'+
      '<div class="field-row">'+
        '<div class="field"><label>Teléfono</label><input id="f-telefono" value="'+escAttr(w.telefono)+'" placeholder="+56 9 ..."></div>'+
        '<div class="field"><label>Correo</label><input id="f-correo" value="'+escAttr(w.correo)+'" placeholder="correo@ejemplo.cl"></div>'+
      '</div>'+
      '<div class="field-row">'+
        '<div class="field"><label>Ciudad</label><input id="f-ciudad" value="'+escAttr(w.ciudad)+'"></div>'+
        '<div class="field"><label>Empresa / contratista (opcional)</label><input id="f-empresa" value="'+escAttr(w.empresa||'')+'"></div>'+
      '</div>'+

      '<div class="section-title">Turno 14x14</div>'+
      '<div class="helptext" style="margin-bottom:8px;">Define una fecha en que comience un ciclo de trabajo. El sistema calcula automáticamente los días de trabajo/descanso desde esa fecha.</div>'+
      '<div class="field-row">'+
        '<div class="field"><label>Inicio de un ciclo de trabajo</label><input type="date" id="f-cicloinicio" value="'+(w.turno && w.turno.fechaInicioCiclo || todayStr())+'"></div>'+
        '<div class="field"><label>Días trabajo / descanso</label><div style="display:flex;gap:6px;align-items:center;">'+
          '<input type="number" id="f-diastrabajo" value="'+((w.turno && w.turno.diasTrabajo) ?? 14)+'" style="width:70px;padding:8px;border:1px solid var(--line);border-radius:7px;">'+
          '<span style="color:var(--sub)">x</span>'+
          '<input type="number" id="f-diasdescanso" value="'+((w.turno && w.turno.diasDescanso) ?? 14)+'" style="width:70px;padding:8px;border:1px solid var(--line);border-radius:7px;">'+
        '</div></div>'+
      '</div>'+

      '<div class="section-title">Exámenes (adjunta el PDF o foto del documento)</div>'+
      '<div id="examList">'+examCards+'</div>'+

      '<div class="section-title">Otros exámenes o documentos <button class="link-btn" data-action="add-exam-extra">+ Agregar</button></div>'+
      '<div class="helptext" style="margin-bottom:8px;">Agrega cualquier examen o documento adicional que necesites y que no esté en la lista de arriba (por ejemplo, examen de altura física, curso IPER, licencia de conducir, etc.)</div>'+
      '<div id="examExtraList">'+(examExtraBlocks || '<div class="helptext" id="examExtraEmptyMsg">Sin documentos adicionales.</div>')+'</div>'+

      '<div class="section-title">Acreditación por faena <button class="link-btn" data-action="add-acred-row">+ Agregar</button></div>'+
      '<div id="acredList">'+(acredRows || '<div class="helptext">Sin acreditaciones registradas.</div>')+'</div>'+

      '<div class="section-title">Certificaciones de equipos que opera <button class="link-btn" data-action="add-cert-row">+ Agregar</button></div>'+
      '<div class="helptext" style="margin-bottom:8px;">Registra en qué equipos está certificado este trabajador (grúa horquilla, grúa pluma, manlift, etc.). Puedes agregar más de una certificación para el mismo equipo (por ejemplo, de distintos organismos o fechas) y adjuntar varios archivos a cada una.</div>'+
      '<div id="certList">'+(certBlocks || '<div class="helptext" id="certEmptyMsg">Sin certificaciones registradas.</div>')+'</div>'+

    '</div>'+
    '<div class="modal-foot">'+
      '<div>'+(isNew?'':'<button class="btn btn-danger" data-action="delete-worker" data-id="'+w.id+'">Eliminar trabajador</button>')+'</div>'+
      '<div style="display:flex;gap:8px;"><button class="btn btn-ghost" data-action="close-modal">Cancelar</button><button class="btn btn-accent" data-action="save-worker">Guardar</button></div>'+
    '</div></div></div>';
}

function dayModalHtml(workerId, dateStr){
  const w = state.workers.find(x=>x.id===workerId);
  if(!w) return '';
  const info = dayStatus(w, dateStr);
  return '<div class="modal-overlay" data-action="close-modal-overlay"><div class="modal modal-sm">'+
    '<div class="modal-head"><h2>'+escHtml(w.nombre)+'</h2><button class="modal-close" data-action="close-modal">✕</button></div>'+
    '<div class="modal-body">'+
      '<div class="helptext">Día: <b class="mono">'+dateStr+'</b> · Estado base del ciclo: <b>'+info.base+'</b></div>'+
      '<div class="field"><label>Estado de este día</label><select id="day-tipo">'+
        '<option value="trabajo" '+(info.tipo==='trabajo'?'selected':'')+'>Trabajo (turno normal)</option>'+
        '<option value="descanso" '+(info.tipo==='descanso'?'selected':'')+'>Descanso</option>'+
        '<option value="extra" '+(info.tipo==='extra'?'selected':'')+'>Trabajó en su descanso (hora extra)</option>'+
        '<option value="permiso" '+(info.tipo==='permiso'?'selected':'')+'>Permiso / licencia</option>'+
      '</select></div>'+
      '<div class="field"><label>Faena (opcional)</label><select id="day-faena"><option value="">—</option>'+state.faenas.map(f=>'<option value="'+f+'" '+(info.faena===f?'selected':'')+'>'+f+'</option>').join('')+'</select></div>'+
      '<div class="field"><label>Nota (opcional)</label><input id="day-nota" value="'+escAttr(info.nota)+'" placeholder="Ej: reemplazo turno noche"></div>'+
    '</div>'+
    '<div class="modal-foot"><button class="btn btn-ghost" data-action="clear-day" data-id="'+workerId+'" data-date="'+dateStr+'">Volver a estado normal</button>'+
      '<div style="display:flex;gap:8px;"><button class="btn btn-ghost" data-action="close-modal">Cancelar</button><button class="btn btn-accent" data-action="save-day" data-id="'+workerId+'" data-date="'+dateStr+'">Guardar</button></div>'+
    '</div></div></div>';
}

function addSimpleListModalHtml(title, inputId, saveAction){
  return '<div class="modal-overlay" data-action="close-modal-overlay"><div class="modal modal-sm">'+
    '<div class="modal-head"><h2>'+title+'</h2><button class="modal-close" data-action="close-modal">✕</button></div>'+
    '<div class="modal-body"><div class="field"><label>Nombre</label><input id="'+inputId+'" placeholder="Escribe el nombre..."></div></div>'+
    '<div class="modal-foot"><div></div><div style="display:flex;gap:8px;"><button class="btn btn-ghost" data-action="close-modal">Cancelar</button><button class="btn btn-accent" data-action="'+saveAction+'">Agregar</button></div></div>'+
  '</div></div>';
}

/* ============================= FILE INPUT CHANGE HANDLER ============================= */
document.addEventListener('change', async (e)=>{
  const input = e.target;
  if(input.classList && input.classList.contains('bulk-chk')){
    if(input.checked) bulkSelected.add(input.value); else bulkSelected.delete(input.value);
    updateBulkCount();
    return;
  }
  if(input.classList && (input.classList.contains('exam-file') || input.classList.contains('exam-extra-file'))){
    const file = input.files[0];
    if(!file) return;
    if(file.size > MAX_FILE_BYTES){
      alert('El archivo pesa demasiado (máx. 3.5 MB). Comprime el archivo o sube una foto en vez de un escaneo pesado.');
      input.value = '';
      return;
    }
    try{
      const base64 = await readFileAsBase64(file);
      input._pendingFile = {nombre: file.name, mime: file.type || 'application/octet-stream', data: base64};
      input._pendingRemove = false;
      const row = input.closest('.file-row');
      const label = row.querySelector('[data-role="filename"]');
      if(label) label.textContent = file.name + ' (se guardará al confirmar)';
    }catch(err){
      console.error(err);
      alert('No se pudo leer el archivo.');
    }
    return;
  }
  if(input.classList && input.classList.contains('cert-file-multi')){
    const files = Array.from(input.files || []);
    const block = input.closest('.cert-block');
    const chipList = block.querySelector('.file-chip-list');
    for(const file of files){
      if(file.size > MAX_FILE_BYTES){
        alert('El archivo "'+file.name+'" pesa demasiado (máx. 3.5 MB). Comprime el archivo o sube una foto en vez de un escaneo pesado.');
        continue;
      }
      try{
        const base64 = await readFileAsBase64(file);
        const tempId = uid('f');
        block._pendingFiles = block._pendingFiles || [];
        block._pendingFiles.push({id: tempId, nombre: file.name, mime: file.type || 'application/octet-stream', data: base64});
        const emptyMsg = chipList.querySelector('.file-name');
        if(emptyMsg) emptyMsg.remove();
        const chip = document.createElement('span');
        chip.className = 'file-chip';
        chip.dataset.pendingId = tempId;
        chip.innerHTML = '<span class="file-chip-name">'+escHtml(file.name)+' (nuevo)</span><button type="button" class="icon-btn" data-action="remove-pending-cert-file" data-certid="'+block.dataset.certId+'" data-tempid="'+tempId+'">✕</button>';
        chipList.appendChild(chip);
      }catch(err){
        console.error(err);
        alert('No se pudo leer el archivo "'+file.name+'".');
      }
    }
    input.value = '';
  }
});

/* ============================= EVENTS ============================= */
document.addEventListener('click', async (e)=>{
  const el = e.target.closest('[data-action]');
  if(!el){
    const navEl = e.target.closest('[data-nav]');
    if(navEl){ state.ui.tab = navEl.dataset.nav; render(); }
    return;
  }
  const action = el.dataset.action;

  if(action==='new-worker'){ state.ui.modal = {type:'worker', workerId:null}; renderModal(); }
  else if(action==='open-worker'){ state.ui.modal = {type:'worker', workerId: el.dataset.id}; renderModal(); }
  else if(action==='goto-worker-from-doc'){ state.ui.tab='trabajadores'; render(); }
  else if(action==='grid-size'){ state.ui.gridSize = el.dataset.size; render(); }
  else if(action==='close-modal' || action==='close-modal-overlay'){
    if(action==='close-modal-overlay' && e.target!==el) return;
    const cur = state.ui.modal;
    state.ui.modal = (cur && cur.type==='day' && cur.returnModal) ? cur.returnModal : null;
    renderModal();
  }

  else if(action==='add-acred-row'){
    const list = document.getElementById('acredList');
    if(list.querySelector('.helptext')) list.innerHTML='';
    const idx = list.querySelectorAll('.repeat-row2').length;
    const wrap = document.createElement('div');
    wrap.innerHTML = '<div class="repeat-row2" data-idx="'+idx+'">'+
        '<select class="acred-faena">'+state.faenas.map(f=>'<option value="'+f+'">'+f+'</option>').join('')+'</select>'+
        '<select class="acred-estado">'+['Acreditado','En trámite','No acreditado'].map(s=>'<option value="'+s+'">'+s+'</option>').join('')+'</select>'+
        '<input type="date" class="acred-venc">'+
        '<button class="icon-btn" data-action="remove-acred" data-idx="'+idx+'">✕</button>'+
      '</div>';
    list.appendChild(wrap.firstElementChild);
  }
  else if(action==='remove-acred'){ el.closest('.repeat-row2').remove(); }

  else if(action==='add-cert-row'){
    const list = document.getElementById('certList');
    const empty = document.getElementById('certEmptyMsg');
    if(empty) empty.remove();
    const newId = uid('c');
    const wrap = document.createElement('div');
    wrap.innerHTML = certBlockHtml(document.getElementById('workerForm').dataset.workerId, {id:newId, equipo:state.equipos[0], fecha:'', vencimiento:'', archivos:[]});
    list.appendChild(wrap.firstElementChild);
  }
  else if(action==='remove-cert'){ el.closest('.cert-block').remove(); }
  else if(action==='remove-cert-file'){
    const block = document.querySelector('.cert-block[data-cert-id="'+el.dataset.certid+'"]');
    if(block){ block._removedFileIds = block._removedFileIds || new Set(); block._removedFileIds.add(el.dataset.fileid); }
    el.closest('.file-chip').remove();
  }
  else if(action==='remove-pending-cert-file'){
    const block = document.querySelector('.cert-block[data-cert-id="'+el.dataset.certid+'"]');
    if(block && block._pendingFiles){ block._pendingFiles = block._pendingFiles.filter(f=>f.id!==el.dataset.tempid); }
    el.closest('.file-chip').remove();
  }

  else if(action==='add-exam-extra'){
    const list = document.getElementById('examExtraList');
    const empty = document.getElementById('examExtraEmptyMsg');
    if(empty) empty.remove();
    const newId = uid('e');
    const wrap = document.createElement('div');
    wrap.innerHTML = examExtraCardHtml(document.getElementById('workerForm').dataset.workerId, {id:newId, nombre:'', fecha:'', vencimiento:''});
    list.appendChild(wrap.firstElementChild);
  }
  else if(action==='remove-exam-extra'){ el.closest('[data-extra-id]').remove(); }

  else if(action==='view-doc'){ viewDocument(el.dataset.key); }
  else if(action==='view-doc-table'){ viewDocument(el.dataset.key); }

  else if(action==='remove-doc'){
    const row = el.closest('.file-row');
    const fileInput = row.querySelector('input[type=file]');
    fileInput._pendingRemove = true;
    fileInput._pendingFile = null;
    fileInput.value = '';
    const label = row.querySelector('[data-role="filename"]');
    if(label) label.textContent = 'Se eliminará al guardar';
    const viewBtn = row.querySelector('[data-action="view-doc"]');
    if(viewBtn) viewBtn.remove();
    el.remove();
  }

  else if(action==='save-worker'){ saveWorkerFromForm(); }
  else if(action==='delete-worker'){
    if(confirm('¿Eliminar a este trabajador? Esta acción no se puede deshacer.')){
      state.workers = state.workers.filter(w=>w.id!==el.dataset.id);
      state.ui.modal = null; render(); await persist();
    }
  }

  else if(action==='edit-day'){
    if(justDragged){ justDragged = false; return; }
    const prevModal = state.ui.modal;
    state.ui.modal = {type:'day', workerId: el.dataset.id, date: el.dataset.date, returnModal: (prevModal && prevModal.type==='workerMonth') ? prevModal : null};
    renderModal();
  }
  else if(action==='save-day'){
    const w = state.workers.find(x=>x.id===el.dataset.id);
    lastAction = snapshotOverrides([el.dataset.id]);
    const tipo = document.getElementById('day-tipo').value;
    const faena = document.getElementById('day-faena').value;
    const nota = document.getElementById('day-nota').value;
    w.overrides = w.overrides || {};
    const base = shiftBaseStatus(w, el.dataset.date);
    if(tipo===base && !faena && !nota){ delete w.overrides[el.dataset.date]; }
    else { w.overrides[el.dataset.date] = {tipo, faena, nota}; }
    const cur = state.ui.modal;
    state.ui.modal = (cur && cur.returnModal) ? cur.returnModal : null;
    render();
    await persist();
  }
  else if(action==='clear-day'){
    const w = state.workers.find(x=>x.id===el.dataset.id);
    lastAction = snapshotOverrides([el.dataset.id]);
    if(w.overrides) delete w.overrides[el.dataset.date];
    const cur = state.ui.modal;
    state.ui.modal = (cur && cur.returnModal) ? cur.returnModal : null;
    render();
    await persist();
  }
  else if(action==='cal-prev'){ state.ui.calMonth--; if(state.ui.calMonth<0){state.ui.calMonth=11; state.ui.calYear--;} render(); }
  else if(action==='cal-next'){ state.ui.calMonth++; if(state.ui.calMonth>11){state.ui.calMonth=0; state.ui.calYear++;} render(); }
  else if(action==='view-worker-month'){ state.ui.modal = {type:'workerMonth', workerId: el.dataset.id, year: state.ui.calYear, month: state.ui.calMonth}; renderModal(); }
  else if(action==='wm-prev'){ state.ui.modal.month--; if(state.ui.modal.month<0){state.ui.modal.month=11; state.ui.modal.year--;} renderModal(); }
  else if(action==='wm-next'){ state.ui.modal.month++; if(state.ui.modal.month>11){state.ui.modal.month=0; state.ui.modal.year++;} renderModal(); }
  else if(action==='undo-last'){ await performUndo(); }

  else if(action==='open-bulk'){ bulkSelected = new Set(); state.ui.modal = {type:'bulk'}; renderModal(); attachDynamicListeners(); }
  else if(action==='bulk-select-all'){
    const q = (document.getElementById('bulkSearch')||{}).value || '';
    const qlc = q.toLowerCase();
    state.workers.filter(w=> !qlc || w.nombre.toLowerCase().includes(qlc) || (w.cargo||'').toLowerCase().includes(qlc)).forEach(w=>bulkSelected.add(w.id));
    document.getElementById('bulkWorkerList').innerHTML = bulkWorkerListHtml(q);
    updateBulkCount();
  }
  else if(action==='bulk-select-none'){
    bulkSelected.clear();
    const q = (document.getElementById('bulkSearch')||{}).value || '';
    document.getElementById('bulkWorkerList').innerHTML = bulkWorkerListHtml(q);
    updateBulkCount();
  }
  else if(action==='apply-bulk'){
    const startVal = document.getElementById('bulk-start').value;
    const endVal = document.getElementById('bulk-end').value;
    const tipo = document.getElementById('bulk-tipo').value;
    const faena = document.getElementById('bulk-faena').value;
    const nota = document.getElementById('bulk-nota').value;
    if(!startVal || !endVal){ alert('Selecciona la fecha de inicio y de término.'); return; }
    if(bulkSelected.size===0){ alert('Selecciona al menos un trabajador.'); return; }
    let s = parseDate(startVal), en = parseDate(endVal);
    if(s > en){ const tmp = s; s = en; en = tmp; }
    const ids = Array.from(bulkSelected);
    lastAction = snapshotOverrides(ids);
    ids.forEach(id=>{
      const w = state.workers.find(x=>x.id===id);
      if(!w) return;
      w.overrides = w.overrides || {};
      let cur = new Date(s);
      while(cur <= en){
        const dateStr = fmt(cur);
        const base = shiftBaseStatus(w, dateStr);
        if(tipo===base && !faena && !nota) delete w.overrides[dateStr];
        else w.overrides[dateStr] = {tipo, faena, nota};
        cur = addDays(cur, 1);
      }
    });
    state.ui.modal = null;
    render();
    await persist();
  }

  else if(action==='add-faena'){ state.ui.modal = {type:'addFaena'}; renderModal(); }
  else if(action==='save-faena'){
    const name = document.getElementById('new-faena-name').value.trim();
    if(name && !state.faenas.includes(name)){ state.faenas.push(name); await persist(); }
    state.ui.modal=null; render();
  }
  else if(action==='add-equipo'){ state.ui.modal = {type:'addEquipo'}; renderModal(); }
  else if(action==='save-equipo'){
    const name = document.getElementById('new-equipo-name').value.trim();
    if(name && !state.equipos.includes(name)){ state.equipos.push(name); await persist(); }
    state.ui.modal=null; render();
  }
});

function attachDynamicListeners(){
  const search = document.getElementById('searchInput');
  if(search){ search.oninput = (e)=>{ state.ui.search = e.target.value; renderContentOnly(); }; }
  const cargoFilterEl = document.getElementById('cargoFilter');
  if(cargoFilterEl){ cargoFilterEl.onchange = (e)=>{ state.ui.cargoFilter = e.target.value; renderContentOnly(); }; }
  const docType = document.getElementById('docTypeFilter');
  if(docType){ docType.onchange = (e)=>{ state.ui.docTypeFilter = e.target.value; render(); }; }
  const docStatus = document.getElementById('docStatusFilter');
  if(docStatus){ docStatus.onchange = (e)=>{ state.ui.docFilter = e.target.value; render(); }; }
  const acredFaena = document.getElementById('acredFaenaFilter');
  if(acredFaena){ acredFaena.onchange = (e)=>{ state.ui.acredFaenaFilter = e.target.value; render(); }; }
  const certEquipo = document.getElementById('certEquipoFilter');
  if(certEquipo){ certEquipo.onchange = (e)=>{ state.ui.certEquipoFilter = e.target.value; render(); }; }
  const bulkSearch = document.getElementById('bulkSearch');
  if(bulkSearch){ bulkSearch.oninput = (e)=>{ document.getElementById('bulkWorkerList').innerHTML = bulkWorkerListHtml(e.target.value); }; }
}
function renderContentOnly(){
  const c = document.getElementById('content');
  if(state.ui.tab==='trabajadores') c.innerHTML = viewTrabajadores();
}

async function saveWorkerFromForm(){
  const form = document.getElementById('workerForm');
  const id = form.dataset.workerId;
  const isNew = form.dataset.isNew === 'true';
  const nombre = document.getElementById('f-nombre').value.trim();
  if(!nombre){ alert('El nombre es obligatorio.'); return; }

  const saveBtn = document.querySelector('[data-action="save-worker"]');
  const cancelBtn = document.querySelector('.modal-foot [data-action="close-modal"]');
  if(saveBtn){ saveBtn.disabled = true; saveBtn.textContent = 'Guardando...'; }
  if(cancelBtn){ cancelBtn.disabled = true; }

  const existingWorker = isNew ? null : state.workers.find(w=>w.id===id);
  const failedFiles = [];

  // ---- Exámenes: leer campos, y guardar/eliminar archivos ANTES de confirmar el nombre adjunto ----
  const examCardsEls = document.querySelectorAll('#examList .exam-card');
  const examenes = [];
  for(const card of examCardsEls){
    const tipo = card.dataset.examType;
    const fecha = card.querySelector('.exam-fecha').value;
    const vencimiento = card.querySelector('.exam-venc').value;
    const fileInput = card.querySelector('.exam-file');
    const existing = (existingWorker ? (existingWorker.examenes||[]) : []).find(x=>x.tipo===tipo) || {};
    let archivoNombre = existing.archivoNombre || '';
    let archivoTipo = existing.archivoTipo || '';

    if(fileInput && fileInput._pendingRemove){
      try{ await window.storage.delete(examDocKey(id, tipo), true); }catch(e){ /* puede no existir, no es grave */ }
      archivoNombre = ''; archivoTipo = '';
    } else if(fileInput && fileInput._pendingFile){
      const key = examDocKey(id, tipo);
      try{
        await window.storage.set(key, JSON.stringify(fileInput._pendingFile), true);
        archivoNombre = fileInput._pendingFile.nombre;
        archivoTipo = fileInput._pendingFile.mime;
      }catch(err){
        console.error('Error guardando examen', key, err);
        failedFiles.push(tipo+' ('+fileInput._pendingFile.nombre+')');
        // se mantiene el archivo anterior (si había) ya que el nuevo no se pudo guardar
      }
    }
    examenes.push({tipo, fecha, vencimiento, archivoNombre, archivoTipo});
  }

  // Acreditaciones
  const acreditaciones = Array.from(document.querySelectorAll('#acredList .repeat-row2')).map(row=>({
    faena: row.querySelector('.acred-faena').value,
    estado: row.querySelector('.acred-estado').value,
    vencimiento: row.querySelector('.acred-venc').value
  }));

  // ---- Certificaciones de equipos: ahora soportan varios archivos por certificación ----
  const certBlockEls = document.querySelectorAll('#certList .cert-block');
  const certificaciones = [];
  const existingCerts = existingWorker ? (existingWorker.certificaciones||[]) : [];
  for(const block of certBlockEls){
    const certId = block.dataset.certId;
    const equipo = block.querySelector('.cert-equipo').value;
    const fecha = block.querySelector('.cert-fecha').value;
    const vencimiento = block.querySelector('.cert-venc').value;
    const existing = existingCerts.find(c=>c.id===certId) || {};
    const existingFiles = existing.archivos || [];
    const removedIds = block._removedFileIds || new Set();
    const pendingFiles = block._pendingFiles || [];

    for(const fid of removedIds){
      try{ await window.storage.delete(certDocKey(id, certId, fid), true); }catch(e){ /* puede no existir */ }
    }
    let finalFiles = existingFiles.filter(f=>!removedIds.has(f.id));
    for(const pf of pendingFiles){
      const key = certDocKey(id, certId, pf.id);
      try{
        await window.storage.set(key, JSON.stringify({nombre: pf.nombre, mime: pf.mime, data: pf.data}), true);
        finalFiles.push({id: pf.id, nombre: pf.nombre, mime: pf.mime});
      }catch(err){
        console.error('Error guardando archivo de certificación', key, err);
        failedFiles.push(equipo+' ('+pf.nombre+')');
      }
    }
    certificaciones.push({id: certId, equipo, fecha, vencimiento, archivos: finalFiles});
  }

  // ---- Otros exámenes / documentos adicionales (mismo tratamiento que exámenes fijos) ----
  const examExtraEls = document.querySelectorAll('#examExtraList [data-extra-id]');
  const examenesExtra = [];
  const existingExtra = existingWorker ? (existingWorker.examenesExtra||[]) : [];
  for(const card of examExtraEls){
    const extraId = card.dataset.extraId;
    const nombreExtra = card.querySelector('.exam-extra-nombre').value.trim();
    if(!nombreExtra) continue; // se descartan filas vacías sin nombre
    const fecha = card.querySelector('.exam-extra-fecha').value;
    const vencimiento = card.querySelector('.exam-extra-venc').value;
    const fileInput = card.querySelector('.exam-extra-file');
    const existing = existingExtra.find(x=>x.id===extraId) || {};
    let archivoNombre = existing.archivoNombre || '';
    let archivoTipo = existing.archivoTipo || '';

    if(fileInput && fileInput._pendingRemove){
      try{ await window.storage.delete(examExtraDocKey(id, extraId), true); }catch(e){ /* puede no existir */ }
      archivoNombre = ''; archivoTipo = '';
    } else if(fileInput && fileInput._pendingFile){
      const key = examExtraDocKey(id, extraId);
      try{
        await window.storage.set(key, JSON.stringify(fileInput._pendingFile), true);
        archivoNombre = fileInput._pendingFile.nombre;
        archivoTipo = fileInput._pendingFile.mime;
      }catch(err){
        console.error('Error guardando documento adicional', key, err);
        failedFiles.push(nombreExtra+' ('+fileInput._pendingFile.nombre+')');
      }
    }
    examenesExtra.push({id: extraId, nombre: nombreExtra, fecha, vencimiento, archivoNombre, archivoTipo});
  }

  const data = {
    id, nombre,
    rut: document.getElementById('f-rut').value.trim(),
    cargo: document.getElementById('f-cargo').value,
    telefono: document.getElementById('f-telefono').value.trim(),
    correo: document.getElementById('f-correo').value.trim(),
    ciudad: document.getElementById('f-ciudad').value.trim(),
    empresa: document.getElementById('f-empresa').value.trim(),
    turno: {
      fechaInicioCiclo: document.getElementById('f-cicloinicio').value || todayStr(),
      diasTrabajo: parseInt(document.getElementById('f-diastrabajo').value)||14,
      diasDescanso: parseInt(document.getElementById('f-diasdescanso').value)||14
    },
    examenes, acreditaciones, certificaciones, examenesExtra
  };

  if(isNew){
    data.overrides = {};
    state.workers.push(data);
  } else {
    const existing = state.workers.find(w=>w.id===id);
    data.overrides = existing.overrides || {};
    Object.assign(existing, data);
  }
  state.ui.modal = null;
  render();
  await persist();

  if(failedFiles.length){
    alert('Se guardó la ficha, pero estos archivos no se pudieron subir (probablemente pesan demasiado): \n\n'+failedFiles.join('\n')+'\n\nVuelve a abrir la ficha e inténtalo de nuevo, idealmente con un archivo más liviano (menos de 3.5 MB).');
  }
}

/* ============================= INIT ============================= */
loadData();
