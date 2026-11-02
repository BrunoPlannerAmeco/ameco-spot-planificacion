/* Lectura y planificación pura de la matriz Personal Spot. No realiza escrituras. */
(function(root){
  'use strict';
  const text=v=>String(v==null?'':v).trim();
  const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
  const codeKey=v=>norm(v).replace(/[.]/g,'').replace(/\s+/g,'');
  const rutKey=v=>norm(v).replace(/[.\s]/g,'');
  function validDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||'')) return false;
    const d=new Date(value+'T12:00:00Z');
    return Number.isFinite(+d)&&d.toISOString().slice(0,10)===value;
  }
  function dateKey(value,date1904=false){
    if(Object.prototype.toString.call(value)==='[object Date]'){
      return Number.isFinite(+value)?value.toISOString().slice(0,10):'';
    }
    if(typeof value==='number'&&Number.isInteger(value)&&value>=30000&&value<=80000){
      return new Date(Date.UTC(1899,11,30)+(value+(date1904?1462:0))*86400000).toISOString().slice(0,10);
    }
    const str=text(value); if(validDate(str)) return str;
    const m=str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if(!m) return '';
    const iso=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
    return validDate(iso)?iso:'';
  }
  function parseMatrix(grid,options={}){
    let dateRow=-1,dates=[];
    grid.slice(0,12).forEach((row,index)=>{
      const found=[];row.forEach((v,column)=>{const date=dateKey(v,options.date1904);if(date)found.push({column,date});});
      if(found.length>dates.length){dates=found;dateRow=index;}
    });
    if(dates.length<2) throw Error('No se encontró una fila con fechas completas del calendario.');
    if(new Set(dates.map(x=>x.date)).size!==dates.length) throw Error('Hay fechas duplicadas en el encabezado. Corrige la planilla antes de importar.');
    const firstDateColumn=Math.min(...dates.map(x=>x.column));
    let header=-1,nameColumn=-1,rutColumn=-1;
    grid.slice(0,16).forEach((row,index)=>{
      const fields=row.slice(0,firstDateColumn).map(norm);
      const n=fields.findIndex(v=>['NOMBRE','NOMBRES','NOMBRE COMPLETO','TRABAJADOR'].includes(v));
      const r=fields.findIndex(v=>v==='RUT'||v==='R.U.T.');
      if(n>=0&&r>=0&&index>=dateRow){header=index;nameColumn=n;rutColumn=r;}
    });
    if(header<0) throw Error('No se encontraron las columnas Nombre y RUT junto al calendario.');
    const records=grid.slice(header+1).flatMap((row,index)=>{
      const name=text(row[nameColumn]),rut=rutKey(row[rutColumn]);
      if(!name) return [];
      return [{row:header+index+2,name,rut,cells:dates.map(x=>({date:x.date,code:text(row[x.column])}))}];
    });
    if(!records.length) throw Error('La hoja no contiene trabajadores con nombre.');
    dates.sort((a,b)=>a.date.localeCompare(b.date));
    return {records,firstDate:dates[0].date,lastDate:dates[dates.length-1].date,dateCount:dates.length,headerRow:header+1};
  }
  function codesFor(matrix,from,to){
    const counts=new Map();
    matrix.records.forEach(row=>row.cells.forEach(cell=>{
      if(cell.date<from||cell.date>to||!cell.code) return;
      const key=codeKey(cell.code);if(!counts.has(key))counts.set(key,{key,label:cell.code,count:0});
      counts.get(key).count++;
    }));
    return [...counts.values()].sort((a,b)=>b.count-a.count);
  }
  function defaultMapping(code,sites){
    const key=codeKey(code);
    if(key==='D')return {tipo:'descanso',faena:''};
    if(key==='T')return {tipo:'trabajo',faena:''};
    if(key==='HE')return {tipo:'extra',faena:''};
    if(['LM','V','P'].includes(key))return {tipo:'permiso',faena:''};
    const aliases={CENT:'Centinela',CEN:'Centinela',CENTINELA:'Centinela',CENTT:'Centinela',PMCENT:'Centinela',ANTU:'Antucoya',ANT:'Antucoya',ANTUCOYA:'Antucoya',ZALD:'Zaldívar',ZAL:'Zaldívar',ZALDIVAR:'Zaldívar',SG:'Sierra Gorda',SIERRAGORDA:'Sierra Gorda',SPENCE:'Spence',SPE:'Spence',SPEN:'Spence',SPENC:'Spence',DGM:'Gabriela Mistral'};
    const target=aliases[key]||code;
    const site=sites.find(s=>codeKey(s)===codeKey(target));
    return site?{tipo:'trabajo',faena:site}:null;
  }
  function buildPlan(matrix,workers,options){
    const {from,to,mapping={},replaceExisting=false,sites=[]}=options;
    if(!validDate(from)||!validDate(to)||from>to)throw Error('Selecciona un rango de fechas válido.');
    if(from<matrix.firstDate||to>matrix.lastDate)throw Error('El período debe estar dentro de las fechas de la planilla.');
    const byRut=new Map(),counts=new Map();
    workers.forEach(w=>{const key=rutKey(w.rut);if(key){if(!byRut.has(key))byRut.set(key,[]);byRut.get(key).push(w);}});
    matrix.records.forEach(r=>{if(r.rut)counts.set(r.rut,(counts.get(r.rut)||0)+1);});
    const changes=[],issues=[],summaries=[],conflicts=[];
    let blanks=0,unknown=0,unchanged=0;
    for(const row of matrix.records){
      let reason='';const matches=byRut.get(row.rut)||[];
      if(!row.rut)reason='Sin RUT';
      else if(!/^\d{7,8}-[0-9K]$/.test(row.rut))reason='Formato de RUT inválido';
      else if(counts.get(row.rut)>1)reason='RUT repetido en la planilla';
      else if(matches.length>1)reason='RUT repetido en la página';
      else if(!matches.length)reason='RUT no encontrado en la página';
      if(reason){issues.push({row:row.row,name:row.name,rut:row.rut,reason});continue;}
      const worker=matches[0];let changed=0,skipped=0;
      for(const cell of row.cells){
        if(cell.date<from||cell.date>to)continue;
        if(!cell.code){blanks++;continue;}
        const entry=mapping[codeKey(cell.code)];
        if(!entry){unknown++;skipped++;continue;}
        if(!['trabajo','descanso','extra','permiso'].includes(entry.tipo)||entry.faena&&!sites.includes(entry.faena))throw Error('Hay un código con estado o faena no válido. Revisa la correspondencia.');
        const previous=(worker.overrides||{})[cell.date]||null;
        const next={tipo:entry.tipo,faena:entry.faena||'',nota:'Excel Personal Spot · '+cell.code};
        const equivalent=previous&&previous.tipo===next.tipo&&(previous.faena||'')===next.faena&&(previous.nota||'')===next.nota;
        if(equivalent){unchanged++;continue;}
        if(previous){
          conflicts.push({workerId:worker.id,name:worker.nombre,rut:row.rut,date:cell.date,code:cell.code,previous,next,replaced:replaceExisting});
          if(!replaceExisting){skipped++;continue;}
        }
        changes.push({workerId:worker.id,rut:row.rut,date:cell.date,previous,next});changed++;
      }
      summaries.push({workerId:worker.id,name:worker.nombre,rut:row.rut,changed,skipped});
    }
    return {from,to,changes,issues,summaries,conflicts,blanks,unknown,unchanged,replaceExisting};
  }
  function applyPlan(workers,plan){
    const byId=new Map(workers.map(w=>[w.id,w]));
    const patches=new Map();
    for(const change of plan.changes){
      const w=byId.get(change.workerId);
      if(!w||rutKey(w.rut)!==change.rut)throw Error('Cambió la identidad del trabajador. Genera otra vista previa.');
      const now=(w.overrides||{})[change.date]||null;
      if(JSON.stringify(now)!==JSON.stringify(change.previous))throw Error('Los turnos cambiaron después de la vista previa. Vuelve a revisar.');
      if(!patches.has(w.id))patches.set(w.id,{...(w.overrides||{})});
      patches.get(w.id)[change.date]={...change.next};
    }
    return workers.map(w=>patches.has(w.id)?{...w,overrides:patches.get(w.id)}:w);
  }
  root.SpotShiftImport={parseMatrix,codesFor,defaultMapping,buildPlan,applyPlan,codeKey,rutKey,validDate,dateKey};
})(typeof window!=='undefined'?window:globalThis);
