import {
  observeWorkers,
  saveWorker,
  deleteWorker
} from "../services/workers-service.js";

let workers = [];
let unsubscribe = null;

function uid() {
  return "w_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function emptyWorker() {
  return {
    id: uid(),
    nombre: "",
    rut: "",
    cargo: "",
    empresa: "",
    telefono: "",
    correo: "",
    ciudad: "",
    faenaPrincipal: "",
    estado: "Activo",
    turno: {
      fechaInicioCiclo: new Date().toISOString().slice(0, 10),
      diasTrabajo: 14,
      diasDescanso: 14
    },
    observaciones: "",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function normalizeWorker(worker) {
  return {
    ...emptyWorker(),
    ...worker,
    turno: {
      ...emptyWorker().turno,
      ...(worker.turno || {})
    }
  };
}

function workerCard(worker) {
  const stateClass = worker.estado === "Activo" ? "good" :
    worker.estado === "Inactivo" ? "bad" : "warn";

  return `
    <article class="wcard worker-module-card">
      <div class="wcard-top">
        <div>
          <div class="name">${escapeHtml(worker.nombre || "Sin nombre")}</div>
          <div class="cargo">${escapeHtml(worker.cargo || "Sin cargo")}</div>
        </div>
        <span class="chip ${stateClass}">${escapeHtml(worker.estado || "Activo")}</span>
      </div>

      <div class="rut mono">${escapeHtml(worker.rut || "Sin RUT")}</div>

      <div class="worker-module-meta">
        <span>${escapeHtml(worker.faenaPrincipal || "Sin faena")}</span>
        <span>${escapeHtml(worker.ciudad || "Sin ciudad")}</span>
      </div>

      <div class="worker-module-actions">
        <button class="btn btn-ghost btn-sm" data-worker-action="edit"
          data-id="${worker.id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-worker-action="delete"
          data-id="${worker.id}">Eliminar</button>
      </div>
    </article>
  `;
}

function renderList(filter = "") {
  const root = document.getElementById("workersModuleList");
  if (!root) return;

  const q = filter.trim().toLowerCase();
  const filtered = workers.filter(worker => {
    if (!q) return true;
    return [
      worker.nombre,
      worker.rut,
      worker.cargo,
      worker.empresa,
      worker.faenaPrincipal,
      worker.ciudad
    ].some(value => String(value || "").toLowerCase().includes(q));
  });

  root.innerHTML = filtered.length
    ? filtered.map(workerCard).join("")
    : `<div class="panel empty">No hay trabajadores que coincidan.</div>`;

  root.querySelectorAll("[data-worker-action='edit']").forEach(button => {
    button.addEventListener("click", () => {
      const worker = workers.find(item => item.id === button.dataset.id);
      if (worker) openWorkerForm(worker);
    });
  });

  root.querySelectorAll("[data-worker-action='delete']").forEach(button => {
    button.addEventListener("click", async () => {
      const worker = workers.find(item => item.id === button.dataset.id);
      if (!worker) return;
      if (!confirm(`¿Eliminar a ${worker.nombre}?`)) return;
      await deleteWorker(worker.id);
    });
  });
}

function openWorkerForm(existing = null) {
  const worker = normalizeWorker(existing || emptyWorker());
  const modalRoot = document.getElementById("modalRoot");

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="workerModuleOverlay">
      <div class="modal">
        <div class="modal-head">
          <h2>${existing ? "Editar trabajador" : "Nuevo trabajador"}</h2>
          <button class="modal-close" type="button" id="closeWorkerModule">✕</button>
        </div>

        <form id="workerModuleForm">
          <div class="modal-body">
            <div class="field">
              <label>Nombre completo</label>
              <input name="nombre" value="${escapeHtml(worker.nombre)}" required>
            </div>

            <div class="field-row">
              <div class="field">
                <label>RUT</label>
                <input name="rut" value="${escapeHtml(worker.rut)}">
              </div>
              <div class="field">
                <label>Cargo</label>
                <input name="cargo" value="${escapeHtml(worker.cargo)}">
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label>Empresa</label>
                <input name="empresa" value="${escapeHtml(worker.empresa)}">
              </div>
              <div class="field">
                <label>Faena principal</label>
                <input name="faenaPrincipal" value="${escapeHtml(worker.faenaPrincipal)}">
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label>Teléfono</label>
                <input name="telefono" value="${escapeHtml(worker.telefono)}">
              </div>
              <div class="field">
                <label>Correo</label>
                <input type="email" name="correo" value="${escapeHtml(worker.correo)}">
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label>Ciudad</label>
                <input name="ciudad" value="${escapeHtml(worker.ciudad)}">
              </div>
              <div class="field">
                <label>Estado</label>
                <select name="estado">
                  ${["Activo", "Pendiente", "Inactivo"].map(state =>
                    `<option value="${state}" ${worker.estado === state ? "selected" : ""}>${state}</option>`
                  ).join("")}
                </select>
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label>Inicio ciclo</label>
                <input type="date" name="fechaInicioCiclo"
                  value="${escapeHtml(worker.turno.fechaInicioCiclo)}">
              </div>
              <div class="field">
                <label>Régimen</label>
                <select disabled>
                  <option>14 × 14</option>
                </select>
              </div>
            </div>

            <div class="field">
              <label>Observaciones</label>
              <textarea name="observaciones" rows="3">${escapeHtml(worker.observaciones)}</textarea>
            </div>
          </div>

          <div class="modal-foot">
            <button class="btn btn-ghost" type="button" id="cancelWorkerModule">Cancelar</button>
            <button class="btn btn-accent" type="submit">Guardar trabajador</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const close = () => {
    modalRoot.innerHTML = "";
  };

  document.getElementById("closeWorkerModule").addEventListener("click", close);
  document.getElementById("cancelWorkerModule").addEventListener("click", close);
  document.getElementById("workerModuleOverlay").addEventListener("click", event => {
    if (event.target === event.currentTarget) close();
  });

  document.getElementById("workerModuleForm").addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const payload = {
      ...worker,
      nombre: String(data.get("nombre") || "").trim(),
      rut: String(data.get("rut") || "").trim(),
      cargo: String(data.get("cargo") || "").trim(),
      empresa: String(data.get("empresa") || "").trim(),
      faenaPrincipal: String(data.get("faenaPrincipal") || "").trim(),
      telefono: String(data.get("telefono") || "").trim(),
      correo: String(data.get("correo") || "").trim(),
      ciudad: String(data.get("ciudad") || "").trim(),
      estado: String(data.get("estado") || "Activo"),
      observaciones: String(data.get("observaciones") || "").trim(),
      turno: {
        fechaInicioCiclo: String(data.get("fechaInicioCiclo") || ""),
        diasTrabajo: 14,
        diasDescanso: 14
      },
      updatedAt: Date.now()
    };

    await saveWorker(payload);
    close();
  });
}

function renderWorkersModule() {
  const content = document.getElementById("content");
  const topbar = document.getElementById("topbar");

  topbar.innerHTML = `
    <h1>Trabajadores</h1>
    <div class="search-box">
      <span class="ic">🔎</span>
      <input id="workersModuleSearch"
        placeholder="Buscar por nombre, RUT, cargo, empresa o faena">
    </div>
    <button class="btn btn-accent" id="newWorkerModule">+ Nuevo trabajador</button>
    <span class="save-pill"><span class="dot-live"></span> Sincronizado</span>
  `;

  content.innerHTML = `
    <div class="workers-module-summary">
      <div class="kpi">
        <div class="num" id="workersTotal">${workers.length}</div>
        <div class="lbl">Trabajadores registrados</div>
      </div>
      <div class="kpi">
        <div class="num" id="workersActive">${workers.filter(w => w.estado === "Activo").length}</div>
        <div class="lbl">Activos</div>
      </div>
      <div class="kpi warn">
        <div class="num" id="workersPending">${workers.filter(w => w.estado === "Pendiente").length}</div>
        <div class="lbl">Pendientes</div>
      </div>
    </div>

    <div id="workersModuleList" class="card-grid"></div>
  `;

  renderList();

  document.getElementById("newWorkerModule").addEventListener("click", () => {
    openWorkerForm();
  });

  document.getElementById("workersModuleSearch").addEventListener("input", event => {
    renderList(event.target.value);
  });
}

export function initializeWorkersModule() {
  if (unsubscribe) return;

  unsubscribe = observeWorkers(data => {
    workers = data;
    if (window.amecoCurrentModule === "workers") {
      renderWorkersModule();
    }
  });

  window.amecoOpenWorkers = () => {
    window.amecoCurrentModule = "workers";
    renderWorkersModule();
  };
}
