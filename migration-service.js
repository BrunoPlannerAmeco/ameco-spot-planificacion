import { ref, set } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { db } from "./firebase-service.js";
import { saveWorker } from "./workers-service.js";
import { saveSite } from "./sites-service.js";
import { makeId, normalizeRut, normalizeWorker } from "./worker-utils.js";

function siteIdFromName(name){
  const slug = String(name || "faena")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `site_${slug || makeId("site")}`;
}

function accreditationStatus(value){
  const normalized = String(value || "").toLowerCase();
  if(normalized.includes("acreditado") && !normalized.includes("no ")) return "aprobada";
  if(normalized.includes("trámite") || normalized.includes("tramite")) return "en_revision";
  return "no_iniciada";
}

export async function importLegacyBackup(payload, existingWorkers=[], existingSites=[]){
  const root = Array.isArray(payload) ? {workers:payload} : (payload || {});
  const legacyWorkers = Array.isArray(root.workers) ? root.workers : [];
  const legacySites = Array.isArray(root.faenas) ? root.faenas : [];
  const contacts = Array.isArray(root.llamados) ? root.llamados : [];
  const tickets = Array.isArray(root.pasajes) ? root.pasajes : [];

  const workerByRut = new Map(existingWorkers.map(worker => [normalizeRut(worker.rut), worker]));
  const workerByName = new Map(existingWorkers.map(worker => [String(worker.nombre || "").trim().toLowerCase(), worker]));
  const siteByName = new Map(existingSites.map(site => [String(site.nombre || "").trim().toLowerCase(), site]));

  for(const name of legacySites){
    const key = String(name || "").trim().toLowerCase();
    if(!key || siteByName.has(key)) continue;
    const site = {
      id:siteIdFromName(name), nombre:String(name).trim(), cliente:"", ubicacion:String(name).trim(),
      activa:true, plataforma:{nombre:"",url:""}, contacto:{nombre:"",correo:"",telefono:""},
      requisitos:[], observaciones:"Importada desde Track A", createdAt:Date.now(), updatedAt:Date.now()
    };
    await saveSite(site);
    siteByName.set(key, site);
  }

  let createdWorkers=0, updatedWorkers=0, importedAccreditations=0;
  for(const legacy of legacyWorkers){
    const rutKey = normalizeRut(legacy.rut);
    const nameKey = String(legacy.nombre || "").trim().toLowerCase();
    const existing = (rutKey && workerByRut.get(rutKey)) || (nameKey && workerByName.get(nameKey));
    const worker = normalizeWorker({
      ...legacy,
      id:existing?.id || legacy.id || makeId("worker"),
      createdAt:existing?.createdAt || legacy.createdAt || Date.now(),
      updatedAt:Date.now(),
      estadoLaboral:legacy.estadoLaboral || existing?.estadoLaboral || "activo"
    });
    await saveWorker(worker);
    if(existing) updatedWorkers++; else createdWorkers++;

    for(const legacyAccreditation of (legacy.acreditaciones || [])){
      const siteName = String(legacyAccreditation.faena || "").trim();
      if(!siteName) continue;
      let site = siteByName.get(siteName.toLowerCase());
      if(!site){
        site = {
          id:siteIdFromName(siteName), nombre:siteName, cliente:"", ubicacion:siteName,
          activa:true, plataforma:{nombre:"",url:""}, contacto:{nombre:"",correo:"",telefono:""},
          requisitos:[], observaciones:"Importada desde acreditación Track A", createdAt:Date.now(), updatedAt:Date.now()
        };
        await saveSite(site);
        siteByName.set(siteName.toLowerCase(), site);
      }
      const id = `accr_${worker.id}_${site.id}`.replace(/[^a-zA-Z0-9_-]/g,"_");
      await set(ref(db, `amecoSpotPlanner/accreditations/${id}`), {
        id,
        trabajadorId:worker.id,
        faenaId:site.id,
        plataforma:site.plataforma?.nombre || "",
        estado:accreditationStatus(legacyAccreditation.estado),
        porcentajeAvance:accreditationStatus(legacyAccreditation.estado) === "aprobada" ? 100 : 0,
        ultimaActualizacion:new Date().toISOString().slice(0,10),
        vencimiento:legacyAccreditation.vencimiento || "",
        documentosPendientes:[],
        observaciones:"Migrada desde ficha Track A",
        createdAt:Date.now(), updatedAt:Date.now()
      });
      importedAccreditations++;
    }
  }

  for(const item of contacts){
    const id = item.id || makeId("contact");
    await set(ref(db, `amecoSpotPlanner/contacts/${id}`), {
      id, trabajadorId:item.workerId || "", servicioId:item.servicioId || "",
      fecha:item.fecha || "", hora:item.hora || "", resultado:item.resultado || "pendiente",
      nota:item.nota || "", canal:item.canal || "telefono", createdAt:item.createdAt || Date.now()
    });
  }

  for(const item of tickets){
    const id = item.id || makeId("ticket");
    await set(ref(db, `amecoSpotPlanner/tickets/${id}`), {
      id, trabajadorId:item.workerId || "", faena:item.faena || "", fechaViaje:item.fechaViaje || "",
      origen:item.origen || "", destino:item.destino || "", estado:item.estado || "pendiente",
      nota:item.nota || "", createdAt:item.createdAt || Date.now(), updatedAt:Date.now()
    });
  }

  await set(ref(db, "amecoSpotPlanner/settings/legacyCatalogs"), {
    cargos:Array.isArray(root.cargos) ? root.cargos : [],
    equipos:Array.isArray(root.equipos) ? root.equipos : [],
    importedAt:Date.now()
  });

  return {
    createdWorkers, updatedWorkers, importedSites:legacySites.length,
    importedAccreditations, importedContacts:contacts.length, importedTickets:tickets.length
  };
}
