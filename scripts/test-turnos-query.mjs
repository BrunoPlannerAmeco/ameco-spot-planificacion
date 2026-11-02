import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=readFileSync('index.html','utf8');
const section=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
const sandbox={console,Date,Intl};
vm.createContext(sandbox);
vm.runInContext(`
const state={workers:[],faenas:['Centinela'],cargos:['Operador','Rigger'],ui:{calYear:2026,calMonth:10,turnoMonthSpan:1}};
const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_CORTO=['D','L','M','M','J','V','S'];
function parseDate(value){return new Date(value+'T12:00:00Z');}
function daysBetween(a,b){return Math.round((b-a)/86400000);}
function todayStr(){return '2026-11-02';}
function clampTurnoNameWidth(value){return value||190;}
function hasPermission(){return false;}
function cargoColor(){return '#2f6f9e';}
function faenaColor(){return '#e2571f';}
function faenaAbbrev(){return 'CEN';}
${section('function normalizeImportText(value){','const IMPORT_HEADER_ALIASES')}
${section('function escAttr(s){','/* ============================= VIEW: DASHBOARD')}
${section('function shiftBaseStatus(worker, dateStr){','/* ============================= DRAG-FILL')}
${section('function turnoLocalDate(date=new Date()){','/* ============================= MODALS')}
`,sandbox);
const run=code=>vm.runInContext(code,sandbox);
run(`state.workers=[
{id:'a',nombre:'José Pérez',rut:'12.345.678-5',cargo:'Operador',turno:{fechaInicioCiclo:'2026-11-01',diasTrabajo:14,diasDescanso:14},overrides:{}},
{id:'b',nombre:'Ana Silva',rut:'11.111.111-1',cargo:'Rigger',turno:{fechaInicioCiclo:'2026-11-01'},overrides:{'2026-11-02':{tipo:'permiso'}}},
{id:'c',nombre:'Luis Soto',rut:'22.222.222-2',cargo:'Operador',overrides:{}},
{id:'d',nombre:'Carlos Díaz',rut:'33.333.333-3',cargo:'Operador',turno:{fechaInicioCiclo:'2026-10-18'},overrides:{}},
{id:'e',nombre:'Pedro Muñoz',rut:'44.444.444-4',cargo:'Rigger',overrides:{'2026-11-02':{tipo:'extra',faena:'Centinela'}}}
]; state.ui.turnoQueryDate='2026-11-02';`);
assert.equal(run("turnoQueryStatus(state.workers[0],'2026-11-14').tipo"),'trabajo');
assert.equal(run("turnoQueryStatus(state.workers[0],'2026-11-15').tipo"),'descanso');
assert.equal(run("turnoQueryStatus(state.workers[0],'2026-11-29').tipo"),'trabajo');
assert.equal(run("turnoQueryStatus(state.workers[2],'2026-11-02').tipo"),'sin-ciclo');
assert.equal(run("turnoQueryStatus(state.workers[4],'2026-11-02').tipo"),'extra');
assert.equal(run("turnoSearchMatches(state.workers[0],'jose')"),true);
assert.equal(run("turnoSearchMatches(state.workers[0],'12.345.678-5')"),true);
assert.equal(run("turnoSearchMatches(state.workers[0],'123456785')"),true);
assert.equal(run("turnoMatchesStatus({tipo:'descanso'},'sin-faena')"),false);
assert.equal(run("turnoMatchesStatus({tipo:'permiso'},'sin-faena')"),false);
assert.equal(run("turnoMatchesStatus({tipo:'sin-ciclo'},'sin-faena')"),false);
assert.equal(run("turnoMatchesStatus({tipo:'extra',faena:'Centinela'},'sin-faena')"),false);
const before=run('JSON.stringify(state.workers)');
let rendered=run('viewTurnos()');
assert.doesNotMatch(rendered,/data-action="edit-day"/);
assert.match(rendered,/5 de 5 trabajador/);
run('hasPermission=()=>true');
assert.match(run('viewTurnos()'),/data-action="edit-day"/);
run('hasPermission=()=>false');
assert.match(rendered,/1 sin ciclo registrado/);
assert.match(rendered,/Sin ciclo registrado/);
run("state.ui.turnoQueryStatus='sin-faena'");
rendered=run('viewTurnos()');
assert.match(rendered,/1 de 5 trabajador/);
assert.match(rendered,/José Pérez/); assert.doesNotMatch(rendered,/Ana Silva/);
run("state.ui.turnoQueryStatus='trabajo';state.ui.turnoCargoFilter='Rigger';state.ui.turnoFaenaFilter='Centinela'");
rendered=run('viewTurnos()');assert.match(rendered,/Pedro Muñoz/); assert.doesNotMatch(rendered,/José Pérez/);
run("state.ui.turnoQuerySearch='no existe'");assert.match(run('viewTurnos()'),/No hay trabajadores que coincidan/);
run("state.ui.turnoQuerySearch='<img src=x onerror=alert(1)>'");assert.doesNotMatch(run('viewTurnos()'),/<img src=x/);
run("state.ui.calMonth=11;state.ui.turnoMonthSpan=2;state.ui.turnoQuerySearch=''");
rendered=run('viewTurnos()');assert.match(rendered,/Enero 2027/);
assert.equal(run('JSON.stringify(state.workers)'),before);
console.log('OK: ciclos 14x14, excepciones, sin ciclo, búsqueda, filtros combinados, vacío, escape HTML, cambio de año y ausencia de escrituras.');
