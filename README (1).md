import {
  observeSites,
  saveSite,
  deleteSite
} from "../services/sites-service.js";

let sites = [];
let unsubscribe = null;

const DEFAULT_REQUIREMENTS = [
  "Contrato de trabajo",
  "Anexo de traslado",
  "Cédula de identidad",
  "Foto de funcionario",
  "Examen preocupacional"
];

function uid() {
  return "site_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function blankSite() {
  return {
    id: uid(),
    nombre: "",
    cliente: "",
    ubicacion: "",
    plataforma: {
      nombre: "",
      url: ""
    },
    contacto: {
      nombre: "",
      correo: "",
      telefono: ""
    },
    requisitos: [...DEFAULT_REQUIREMENTS],
    activa: true,
    observaciones: "",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function normalize(site) {
  const base = blankSite();
  return {
    ...base,
    ...site,
    plataforma: { ...base.plataforma, ...(site.plataforma || {}) },
    contacto: { ...base.contacto, ...(site.contacto || {}) },
    requisitos: Array.isArray(site.requisitos) ? site.requisitos : []
  };
}

function card(site) {
  return `
    <article class="site-card">
      <div class="site-card-head">
        <div>
          <div class="site-title">${esc(site.nombre || "Faena sin nombre")}</div>
          <div class="site-client">${esc(site.cliente || "Cliente no definido")}</div>
        </div>
        <span class="chip ${site.activa ? "good" : "bad"}">
          ${site.activa ? "Activa" : "Inactiva"}
        </span>
      </div>

      <div class="site-grid">
        <div>
          <span class="site-label">Plataforma externa</span>
          <strong>${esc(site.plataforma?.nombre || "Sin definir")}</strong>
        </div>
        <div>
          <span class="site-label">Ubicación</span>
          <strong>${esc(site.ubicacion || "Sin definir")}</strong>
        </div>
        <div>
          <span class="site-label">Requisitos</span>
          <strong>${site.requisitos?.length || 0}</strong>
        </div>
      </div>

      <div class="site-card-actions">
        ${site.plataforma?.url ? `
          <a class="btn btn-ghost btn-sm" href="${esc(site.plataforma.url)}"
             target="_blank" rel="noopener noreferrer">Abrir plataforma</a>
        ` : ""}
        <button class="btn btn-ghost btn-sm" data-site-edit="${site.id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-site-delete="${site.id}">Eliminar</button>
      </div>
    </article>
  `;
}

function renderCards(filter = "") {
  const root = document.getElementById("sitesModuleList");
  if (!root) return;

  const q = filter.toLowerCase().trim();
  const filtered = sites.filter(site => {
    if (!q) return true;
    return [
      site.nombre,
      site.cliente,
      site.ubicacion,
      site.plataforma?.nombre
    ].some(value => String(value || "").toLowerCase().includes(q));
  });

  root.innerHTML = filtered.length
    ? filtered.map(card).join("")
    : `<div class="panel empty">No hay faenas que coincidan.</div>`;

  root.querySelectorAll("[data-site-edit]").forEach(button => {
    button.addEventListener("click", () => {
      const site = sites.find(item => item.id === button.dataset.siteEdit);
      if (site) openForm(site);
    });
  });

  root.querySelectorAll("[data-site-delete]").forEach(button => {
    button.addEventListener("click", async () => {
      const site = sites.find(item => item.id === button.dataset.siteDelete);
      if (!site) return;
      if (!confirm(`¿Eliminar la faena ${site.nombre}?`)) return;
      await deleteSite(site.id);
    });
  });
}

function requirementRows(requirements) {
  return requirements.map((item, index) => `
    <div class="site-requirement-row">
      <input data-requirement-index="${index}" value="${esc(item)}">
      <button type="button" class="btn btn-danger btn-sm"
        data-remove-requirement="${index}">Quitar</button>
    </div>
  `).join("");
}

function openForm(existing = null) {
  const site = normalize(existing || blankSite());
  const modalRoot = document.getElementById("modalRoot");

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="siteOverlay">
      <div class="modal modal-wide">
        <div class="modal-head">
          <h2>${existing ? "Editar faena" : "Nueva faena"}</h2>
          <button class="modal-close" id="closeSiteForm" type="button">✕</button>
        </div>

        <form id="siteForm">
          <div class="modal-body">
            <div class="field-row">
              <div class="field">
                <label>Nombre de la faena</label>
                <input name="nombre" value="${esc(site.nombre)}" required>
              </div>
              <div class="field">
                <label>Cliente</label>
                <input name="cliente" value="${esc(site.cliente)}">
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label>Ubicación</label>
                <input name="ubicacion" value="${esc(site.ubicacion)}">
              </div>
              <div class="field">
                <label>Estado</label>
                <select name="activa">
                  <option value="true" ${site.activa ? "selected" : ""}>Activa</option>
                  <option value="false" ${!site.activa ? "selected" : ""}>Inactiva</option>
                </select>
              </div>
            </div>

            <div class="panel site-form-section">
              <div class="panel-title">Plataforma externa de acreditación</div>
              <div class="field-row">
                <div class="field">
                  <label>Nombre</label>
                  <input name="plataformaNombre"
                    placeholder="MyPass, WebControl u otra"
                    value="${esc(site.plataforma.nombre)}">
                </div>
                <div class="field">
                  <label>URL</label>
                  <input name="plataformaUrl" type="url"
                    placeholder="https://..."
                    value="${esc(site.plataforma.url)}">
                </div>
              </div>
            </div>

            <div class="panel site-form-section">
              <div class="panel-title">Contacto de la faena</div>
              <div class="field-row">
                <div class="field">
                  <label>Nombre</label>
                  <input name="contactoNombre" value="${esc(site.contacto.nombre)}">
                </div>
                <div class="field">
                  <label>Correo</label>
                  <input name="contactoCorreo" type="email"
                    value="${esc(site.contacto.correo)}">
                </div>
              </div>
              <div class="field">
                <label>Teléfono</label>
                <input name="contactoTelefono" value="${esc(site.contacto.telefono)}">
              </div>
            </div>

            <div class="panel site-form-section">
              <div class="panel-title site-requirements-title">
                <span>Requisitos básicos</span>
                <button class="btn btn-ghost btn-sm" id="addRequirement" type="button">
                  + Agregar requisito
                </button>
              </div>
              <div id="requirementsRoot">
                ${requirementRows(site.requisitos)}
              </div>
            </div>

            <div class="field">
              <label>Observaciones</label>
              <textarea name="observaciones" rows="3">${esc(site.observaciones)}</textarea>
            </div>
          </div>

          <div class="modal-foot">
            <button class="btn btn-ghost" id="cancelSiteForm" type="button">Cancelar</button>
            <button class="btn btn-accent" type="submit">Guardar faena</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const requirements = [...site.requisitos];
  const root = document.getElementById("requirementsRoot");

  function syncRequirementsFromInputs() {
    root.querySelectorAll("[data-requirement-index]").forEach(input => {
      requirements[Number(input.dataset.requirementIndex)] = input.value;
    });
  }

  function refreshRequirements() {
    root.innerHTML = requirementRows(requirements);
    root.querySelectorAll("[data-remove-requirement]").forEach(button => {
      button.addEventListener("click", () => {
        syncRequirementsFromInputs();
        requirements.splice(Number(button.dataset.removeRequirement), 1);
        refreshRequirements();
      });
    });
  }

  refreshRequirements();

  document.getElementById("addRequirement").addEventListener("click", () => {
    syncRequirementsFromInputs();
    requirements.push("");
    refreshRequirements();
  });

  const close = () => modalRoot.innerHTML = "";
  document.getElementById("closeSiteForm").addEventListener("click", close);
  document.getElementById("cancelSiteForm").addEventListener("click", close);
  document.getElementById("siteOverlay").addEventListener("click", event => {
    if (event.target === event.currentTarget) close();
  });

  document.getElementById("siteForm").addEventListener("submit", async event => {
    event.preventDefault();
    syncRequirementsFromInputs();
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

function renderSitesModule() {
  const content = document.getElementById("content");
  const topbar = document.getElementById("topbar");

  topbar.innerHTML = `
    <h1>Faenas</h1>
    <div class="search-box">
      <span class="ic">🔎</span>
      <input id="sitesSearch"
        placeholder="Buscar por faena, cliente, ubicación o plataforma">
    </div>
    <button class="btn btn-accent" id="newSiteButton">+ Nueva faena</button>
    <span class="save-pill"><span class="dot-live"></span> Sincronizado</span>
  `;

  content.innerHTML = `
    <div class="workers-module-summary">
      <div class="kpi">
        <div class="num">${sites.length}</div>
        <div class="lbl">Faenas registradas</div>
      </div>
      <div class="kpi">
        <div class="num">${sites.filter(site => site.activa).length}</div>
        <div class="lbl">Faenas activas</div>
      </div>
      <div class="kpi warn">
        <div class="num">${sites.filter(site => !site.plataforma?.nombre).length}</div>
        <div class="lbl">Sin plataforma definida</div>
      </div>
    </div>

    <div id="sitesModuleList" class="sites-grid"></div>
  `;

  renderCards();
  window.dispatchEvent(new CustomEvent("ameco-app-rendered"));

  document.getElementById("newSiteButton").addEventListener("click", () => openForm());
  document.getElementById("sitesSearch").addEventListener("input", event => {
    renderCards(event.target.value);
  });
}

export function initializeSitesModule() {
  if (unsubscribe) return;

  unsubscribe = observeSites(data => {
    sites = data;
    if (window.amecoCurrentModule === "sites") renderSitesModule();
  });

  window.amecoOpenSites = () => {
    window.amecoCurrentModule = "sites";
    renderSitesModule();
  };
}
