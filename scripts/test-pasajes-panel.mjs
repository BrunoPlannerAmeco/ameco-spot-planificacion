import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
const section=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
const ctx=vm.createContext({Date,Intl,console});
vm.runInContext(`
const state={ui:{},faenas:['Centinela','Spence'],workers:[{id:'w1',nombre:'José Pérez',rut:'12345678-5',cargo:'Operador',telefono:'555',correo:'ejemplo@example.test'},{id:'w2',nombre:'Ana Silva',rut:'11111111-1',cargo:'Rigger'}],pasajes:[]};
function turnoLocalDate(date=new Date()){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
${section('function normalizeImportText(value){','const IMPORT_HEADER_ALIASES')}
${section('function escAttr(s){','/* ============================= VIEW: DASHBOARD')}
${section('const PASAJE_STATUS =','function pasajeModalHtml(')}
`,ctx);
const run=s=>vm.runInContext(s,ctx);
run(`state.pasajes=[
{id:'p1',workerId:'w1',fechaViaje:'2026-11-02',estado:'pendiente',faena:'Centinela',origen:'Antofagasta',destino:'Sierra Gorda'},
{id:'p2',workerId:'w2',fechaViaje:'2026-11-08',estado:'solicitado',faena:'Spence'},
{id:'p3',workerId:'w1',fechaViaje:'2026-11-03',estado:'emitido',envioTrabajador:'pendiente'},
{id:'p4',workerId:'w1',fechaViaje:'2026-11-04',estado:'emitido'},
{id:'p5',workerId:'w2',fechaViaje:'2026-11-02',estado:'emitido',envioTrabajador:'enviado'},
{id:'p6',workerId:'w2',fechaViaje:'2026-11-02',estado:'cancelado'},
{id:'p7',workerId:'w2',fechaViaje:'2026-11-01',estado:'pendiente'},
{id:'p8',workerId:'w1',fechaViaje:'2026-11-09',estado:'solicitado'},
{id:'p9',workerId:'w1',estado:'pendiente'}];`);
const before=run('JSON.stringify(state.pasajes)');
assert.equal(run("ticketPanelData('2026-11-02').counts.proximos"),5);
assert.equal(run("ticketPanelData('2026-11-02').counts.enviar"),2);
assert.equal(run("ticketPanelData('2026-11-02').counts.atrasados"),1);
assert.equal(run("ticketPanelData('2026-11-02').list.length"),7);
run("state.ui.pasajeVista='proximos'");assert.equal(run("ticketPanelData('2026-11-02').list.length"),5);
run("state.ui.pasajeVista='todos';state.ui.pasajeSearch='jose'");assert.equal(run("ticketPanelData('2026-11-02').base.length"),5);
run("state.ui.pasajeSearch='12.345.678-5'");assert.equal(run("ticketPanelData('2026-11-02').base.length"),5);
run("state.ui.pasajeSearch='Sierra Gorda'");assert.equal(run("ticketPanelData('2026-11-02').base.length"),1);
run("state.ui.pasajeSearch='';state.ui.pasajeFaenaFilter='Spence';state.ui.pasajeFilter='solicitado'");assert.equal(run("ticketPanelData('2026-11-02').list.length"),1);
run("state.ui.pasajeFaenaFilter='all';state.ui.pasajeFilter='all';state.ui.pasajeVista='enviar'");assert.equal(run("ticketPanelData('2026-11-02').list.length"),2);
assert.match(run('viewPasajes()'),/Sin registro de envío/);
assert.match(run('ticketEmailText(state.pasajes[0],state.workers[0])'),/Solicitud de pasaje/);
assert.match(run('ticketEmailText(state.pasajes[2],state.workers[0])'),/Información de viaje/);
assert.match(run('ticketEmailText(state.pasajes[0],state.workers[0])'),/12345678-5/);
assert.equal(run('JSON.stringify(state.pasajes)'),before);
run("state.workers[0].nombre='<img src=x onerror=alert(1)>';state.ui.pasajeVista='todos'");
assert.doesNotMatch(run('viewPasajes()'),/<img src=x/);
run("state.ui.pasajeSearch='sin coincidencias'");assert.match(run('viewPasajes()'),/No hay pasajes en esta vista/);
console.log('OK: pendientes, próximos siete días, fecha pasada, cancelados, envío histórico desconocido, filtros, RUT con formato, borradores y escape HTML.');
