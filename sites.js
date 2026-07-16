import {
  observeSites,
  saveSite,
  deleteSite
} from "./sites-service.js";

let sites = [];
let listenerStarted = false;
let refresh = null;

const defaultRequirements = [
  "Contrato de trabajo",
  "Anexo de traslado",
  "Cédula de identidad",
  "Foto de funcionario",
  "Examen preocupacional"
];

function uid(){
  return `site_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}

function escapeHtml(value=""){
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  })[char]);
}

function emptySite(){
  return {
    id: uid(),
    nombre: "",
    cliente: "",
    ubicacion: "",
    activa: true,
    plataforma: {
      nombre: "",
      url: ""
    },
    contacto: {
      nombre: "",
      correo: "",
      telefono: ""
    },
    requisitos: [...defaultRequirements],
    observaciones: "",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function normalize(site){
  const base = emptySite();
  return {
    ...base,
    ...site,
    plataforma: { ...base.plataforma, ...(site.plataforma || {}) },
    contacto: { ...base.contacto, ...(site.contacto || {}) },
    requisitos: Array.isArray(site.requisitos) ? site.requisitos : []
  };
}

function siteCard(site){
  return `
    <article class="site-card">
      <div class="site-card-head">
        <div>
          <div class="site-name">${escapeHtml(site.nombre || "Faena sin nombre")}</div>
          <div class="site-client">${escapeHtml(site.cliente || "Cliente no definido")}</div>
        </div>
        <span class="status-pill ${site.activa ? "success" : "danger"}">
          ${site.activa ? "Activa" : "Inactiva"}
        </span>
      </div>

      <div class="site-details">
        <div>
          <span>Plataforma</span>
          <strong>${escapeHtml(site.plataforma?.nombre || "Sin definir")}</strong>
        </div>
        <div>
          <span>Ubicación</span>
          <strong>${escapeHtml(site.ubicacion || "Sin definir")}</strong>
        </div>
        <div>
          <span>Requisitos</span>
          <strong>${site.requisitos?.length || 0}</strong>
        </div>
      </div>

      <div class="site-actions">
        ${site.plataforma?.url ? `
          <a class="btn btn-soft" href="${escapeHtml(site.plataforma.url)}"
             target="_blank" rel="noopener noreferrer">Abrir plataforma</a>
        ` : ""}
        <button class="btn btn-soft" data-edit-site="${site.id}">Editar</button>
        <button class="btn btn-danger" data-delete-site="${site.id}">Eliminar</button>
      </div>
    </article>
  `;
}

function renderList(query=""){
  const root = document.getElementById("sitesList");
  if(!root) return;

  const q = query.trim().toLowerCase();
  const filtered = sites.filter(site => {
    if(!q) return true;
    return [
      site.nombre,
      site.cliente,
      site.ubicacion,
      site.plataforma?.nombre
    ].some(value => String(value || "").toLowerCase().includes(q));
  });

  root.innerHTML = filtered.length
    ? filtered.map(siteCard).join("")
    : `<div class="empty">No hay faenas que coincidan con la búsqueda.</div>`;

  root.querySelectorAll("[data-edit-site]").forEach(button => {
    button.addEventListener("click", () => {
      const site = sites.find(item => item.id === button.dataset.editSite);
      if(site) openSiteModal(site);
    });
  });

  root.querySelectorAll("[data-delete-site]").forEach(button => {
    button.addEventListener("click", async () => {
      const site = sites.find(item => item.id === button.dataset.deleteSite);
      if(!site) return;
      if(!confirm(`¿Eliminar la faena ${site.nombre}?`)) return;
      await deleteSite(site.id);
    });
  });
}

function requirementRows(requirements){
  return requirements.map((item,index) => `
    <div class="requirement-row">
      <input data-requirement-index="${index}" value="${escapeHtml(item)}">
      <button class="btn btn-danger" type="button" data-remove-requirement="${index}">
        Quitar
      </button>
    </div>
  `).join("");
}

function openSiteModal(existing=null){
  const site = normalize(existing || emptySite());
  const modalRoot = document.getElementById("modalRoot");
  const requirements = [...site.requisitos];

  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="siteModalBackdrop">
      <section class="modal-card">
        <header class="modal-header">
          <div>
            <h2>${existing ? "Editar faena" : "Nueva faena"}</h2>
            <p>Configura cliente, plataforma externa, contacto y requisitos.</p>
          </div>
          <button class="modal-close" id="closeSiteModal" type="button">✕</button>
        </header>

        <form id="siteForm">
          <div class="modal-body">
            <div class="form-grid">
              <div class="field">
                <label>Nombre de la faena</label>
                <input name="nombre" value="${escapeHtml(site.nombre)}" placeholder="Ej: Sierra Gorda" required>
              </div>

              <div class="field">
                <label>Cliente</label>
                <input name="cliente" value="${escapeHtml(site.cliente)}" placeholder="Ej: KGHM">
              </div>

              <div class="field">
                <label>Ubicación</label>
                <input name="ubicacion" value="${escapeHtml(site.ubicacion)}" placeholder="Ej: Sierra Gorda">
              </div>

              <div class="field">
                <label>Estado</label>
                <select name="activa">
                  <option value="true" ${site.activa ? "selected" : ""}>Activa</option>
                  <option value="false" ${!site.activa ? "selected" : ""}>Inactiva</option>
                </select>
              </div>

              <div class="field">
                <label>Plataforma externa</label>
                <input name="plataformaNombre"
                  value="${escapeHtml(site.plataforma.nombre)}"
                  placeholder="Ej: WebControl o MyPass">
              </div>

              <div class="field">
                <label>Enlace de plataforma</label>
                <input name="plataformaUrl" type="url"
                  value="${escapeHtml(site.plataforma.url)}"
                  placeholder="https://...">
              </div>

              <div class="field">
                <label>Contacto</label>
                <input name="contactoNombre"
                  value="${escapeHtml(site.contacto.nombre)}"
                  placeholder="Nombre del contacto">
              </div>

              <div class="field">
                <label>Correo de contacto</label>
                <input name="contactoCorreo" type="email"
                  value="${escapeHtml(site.contacto.correo)}"
                  placeholder="correo@faena.cl">
              </div>

              <div class="field span-2">
                <label>Teléfono de contacto</label>
                <input name="contactoTelefono"
                  value="${escapeHtml(site.contacto.telefono)}"
                  placeholder="+56 9 ...">
              </div>

              <div class="field span-2">
                <div class="requirements-header">
                  <label>Requisitos básicos</label>
                  <button class="btn btn-soft" id="addRequirement" type="button">
                    + Agregar requisito
                  </button>
                </div>
                <div id="requirementsRoot">
                  ${requirementRows(requirements)}
                </div>
              </div>

              <div class="field span-2">
                <label>Observaciones</label>
                <textarea name="observaciones" rows="4"
                  placeholder="Información operativa relevante">${escapeHtml(site.observaciones)}</textarea>
              </div>
            </div>
          </div>

          <footer class="modal-footer">
            <button class="btn btn-soft" id="cancelSiteModal" type="button">Cancelar</button>
            <button class="btn btn-primary" type="submit">Guardar faena</button>
          </footer>
        </form>
      </section>
    </div>
  `;

  const requirementsRoot = document.getElementById("requirementsRoot");

  function syncRequirements(){
    requirementsRoot.querySelectorAll("[data-requirement-index]").forEach(input => {
      requirements[Number(input.dataset.requirementIndex)] = input.value;
    });
  }

  function refreshRequirements(){
    requirementsRoot.innerHTML = requirementRows(requirements);
    requirementsRoot.querySelectorAll("[data-remove-requirement]").forEach(button => {
      button.addEventListener("click", () => {
        syncRequirements();
        requirements.splice(Number(button.dataset.removeRequirement),1);
        refreshRequirements();
      });
    });
  }

  refreshRequirements();

  document.getElementById("addRequirement").addEventListener("click", () => {
    syncRequirements();
    requirements.push("");
    refreshRequirements();
  });

  const close = () => modalRoot.innerHTML = "";
  document.getElementById("closeSiteModal").addEventListener("click", close);
  document.getElementById("cancelSiteModal").addEventListener("click", close);
  document.getElementById("siteModalBackdrop").addEventListener("click", event => {
    if(event.target === event.currentTarget) close();
  });

  document.getElementById("siteForm").addEventListener("submit", async event => {
    event.preventDefault();
    syncRequirements();

    const data = new FormData(event.currentTarget);

    await saveSite({
      ...site,
      nombre: String(data.get("nombre") || "").trim(),
      cliente: String(data.get("cliente") || "").trim(),
      ubicacion: String(data.get("ubicacion") || "").trim(),
      activa: String(data.get("activa")) === "true",
      plataforma: {
        nombre: String(data.get("plataformaNombre") || "").trim(),
        url: String(data.get("plataformaUrl") || "").trim()
      },
      contacto: {
        nombre: String(data.get("contactoNombre") || "").trim(),
        correo: String(data.get("contactoCorreo") || "").trim(),
        telefono: String(data.get("contactoTelefono") || "").trim()
      },
      requisitos: requirements.map(item => item.trim()).filter(Boolean),
      observaciones: String(data.get("observaciones") || "").trim(),
      updatedAt: Date.now()
    });

    close();
  });
}

export function initSitesModule(onChange){
  refresh = onChange;
  if(listenerStarted) return;

  listenerStarted = true;
  observeSites(data => {
    sites = data;
    if(refresh) refresh();
  });
}

export function renderSites(){
  const active = sites.filter(site => site.activa).length;
  const withoutPlatform = sites.filter(site => !site.plataforma?.nombre).length;

  return `
    <section class="module-header">
      <div>
        <h2>Faenas</h2>
        <p>Configura clientes, plataformas externas y requisitos operativos.</p>
      </div>
      <button class="btn btn-primary" id="newSiteButton">+ Nueva faena</button>
    </section>

    <section class="kpi-grid worker-kpis">
      <article class="kpi-card">
        <div class="kpi-value">${sites.length}</div>
        <div class="kpi-label">Faenas registradas</div>
      </article>
      <article class="kpi-card success">
        <div class="kpi-value">${active}</div>
        <div class="kpi-label">Faenas activas</div>
      </article>
      <article class="kpi-card warning">
        <div class="kpi-value">${withoutPlatform}</div>
        <div class="kpi-label">Sin plataforma definida</div>
      </article>
    </section>

    <section class="workers-toolbar">
      <div class="search-control">
        <span>🔎</span>
        <input id="sitesSearch" placeholder="Buscar por faena, cliente, ubicación o plataforma">
      </div>
    </section>

    <section class="sites-grid" id="sitesList"></section>
  `;
}

export function bindSitesEvents(){
  document.getElementById("newSiteButton")?.addEventListener("click", () => openSiteModal());

  const search = document.getElementById("sitesSearch");
  search?.addEventListener("input", event => renderList(event.target.value));

  renderList();
}
