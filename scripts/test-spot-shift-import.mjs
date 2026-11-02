import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context=vm.createContext({console,Date});
vm.runInContext(readFileSync('spot-shift-import.js','utf8'),context);
const imp=context.SpotShiftImport;
const dates=['2026-11-01','2026-11-02','2026-11-03','2026-11-04'];
const sites=['Centinela','Antucoya','Sierra Gorda','Spence','Zaldívar'];
const grid=[['Título'],['','','',...dates],['CARGO','NOMBRE','Rut'],
['Operador','Trabajador uno','12.345.678-5','T','D','CENT','LM'],
['Rigger','Trabajador dos','11111111-1','V','SG','XYZ',''],
['Operador','Sin RUT','','T','T','T','T'],
['Rigger','No existe','22222222-2','T','T','T','T']];
const matrix=imp.parseMatrix(grid);
assert.equal(matrix.records.length,4);assert.equal(matrix.firstDate,dates[0]);
assert.equal(imp.dateKey(46327),'2026-11-01');
assert.equal(imp.dateKey('31/02/2026'),'');assert.equal(imp.dateKey('2/11/2026'),'2026-11-02');
assert.equal(imp.dateKey(new Date('2026-11-01T00:00:00Z')),'2026-11-01');
assert.equal(imp.defaultMapping('CEN T',sites).faena,'Centinela');
assert.equal(imp.defaultMapping('ANT U',sites).faena,'Antucoya');
assert.equal(imp.defaultMapping('cent',[]),null);
assert.equal(imp.defaultMapping('ACRE SG',sites),null);
assert.equal(imp.defaultMapping('V',sites).tipo,'permiso');
assert.equal(imp.defaultMapping('LM',sites).tipo,'permiso');
const workers=[{id:'w1',rut:'12345678-5',nombre:'Uno',turno:{fechaInicioCiclo:'2026-10-01'},acreditaciones:[{faena:'Spence'}],overrides:{'2026-11-01':{tipo:'trabajo',faena:'Antucoya',nota:'Confirmado'},'2026-12-01':{tipo:'descanso'}}},{id:'w2',rut:'11111111-1',nombre:'Dos',overrides:{}}];
const original=JSON.stringify(workers);
const mapping=Object.fromEntries(imp.codesFor(matrix,dates[0],dates[3]).map(c=>[c.key,imp.defaultMapping(c.key,sites)]));
const options={from:dates[0],to:dates[3],mapping,sites};
let plan=imp.buildPlan(matrix,workers,options);
assert.equal(plan.changes.length,5);assert.equal(plan.issues.length,2);assert.equal(plan.conflicts.length,1);assert.equal(plan.unknown,1);assert.equal(plan.blanks,1);
assert.equal(plan.changes.some(c=>c.date===dates[0]&&c.workerId==='w1'),false);
const updated=imp.applyPlan(workers,plan);assert.equal(JSON.stringify(workers),original);
assert.equal(updated[0].overrides['2026-11-01'].nota,'Confirmado');assert.equal(updated[0].overrides['2026-12-01'].tipo,'descanso');
assert.equal(updated[0].overrides['2026-11-04'].nota,'Excel Personal Spot · LM');
assert.equal(updated[0].acreditaciones,workers[0].acreditaciones);
assert.equal(updated[0].turno,workers[0].turno);
const repeated=imp.buildPlan(matrix,updated,options);assert.equal(repeated.changes.length,0);assert.equal(repeated.unchanged,5);
const overwrite=imp.buildPlan(matrix,workers,{...options,replaceExisting:true});assert.equal(overwrite.changes.length,6);
assert.equal(imp.applyPlan(workers,overwrite)[0].overrides[dates[0]].faena,'');
const stale=structuredClone(workers);stale[0].overrides[dates[1]]={tipo:'permiso'};
assert.throws(()=>imp.applyPlan(stale,plan),/cambiaron/);
const renamed=structuredClone(workers);renamed[0].rut='99999999-9';assert.throws(()=>imp.applyPlan(renamed,plan),/identidad/);
assert.throws(()=>imp.buildPlan(matrix,workers,{...options,from:dates[3],to:dates[0]}),/válido/);
assert.throws(()=>imp.buildPlan(matrix,workers,{...options,to:'2027-01-01'}),/dentro/);
assert.throws(()=>imp.parseMatrix([['Nombre','RUT'],['A','11111111-1']]),/fechas/);
assert.throws(()=>imp.parseMatrix([['','','',dates[0],dates[0]],['Cargo','Nombre','RUT']]),/duplicadas/);
const duplicate=structuredClone(grid);duplicate.push(['Rigger','RUT repetido','12345678-5','T','T','T','T']);
assert.equal(imp.buildPlan(imp.parseMatrix(duplicate),workers,options).issues.filter(x=>/repetido/.test(x.reason)).length,2);
assert.equal(imp.buildPlan(matrix,[...workers,{...workers[0],id:'otro'}],options).issues.filter(x=>x.reason==='RUT repetido en la página').length,1);
assert.equal(imp.buildPlan(matrix,workers,{...options,mapping:{...mapping,XYZ:{tipo:'trabajo',faena:'Centinela'}}}).changes.length,6);
assert.throws(()=>imp.buildPlan(matrix,workers,{...options,mapping:{T:{tipo:'inventado'}}}),/válido/);
console.log('OK: calendario, fechas Excel, identidad por RUT, códigos, duplicados, excepciones conservadas/reemplazadas, vacíos, idempotencia y concurrencia.');

// Método de persistencia real, aislado con RTDB simulado: ningún acceso de red.
const html=readFileSync('index.html','utf8');
const method=html.slice(html.indexOf('    async compareAndSavePlannerState('),html.indexOf('    async deleteWorkerNode('));
let databaseValue='anterior',writes=0,allowed=true;
const ctx=vm.createContext({authReady:Promise.resolve(),requireWriterAccess(){if(!allowed)throw Error('Sin permiso');},keyRef(){return {async transaction(fn){const next=fn(databaseValue);if(next===undefined)return {committed:false};databaseValue=next;writes++;return {committed:true};}};}});
const api=vm.runInContext('({'+method+'})',ctx);
await api.compareAndSavePlannerState('anterior','nuevo');assert.equal(databaseValue,'nuevo');assert.equal(writes,1);
await assert.rejects(api.compareAndSavePlannerState('anterior','obsoleto'),/Otro usuario/);assert.equal(databaseValue,'nuevo');
allowed=false;await assert.rejects(api.compareAndSavePlannerState('nuevo','rechazado'),/Sin permiso/);assert.equal(writes,1);
console.log('OK: compare-and-set guarda una vez, aborta estado obsoleto y rechaza usuario sin permisos.');
