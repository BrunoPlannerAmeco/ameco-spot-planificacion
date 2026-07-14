import {
  observeWorkers,
  saveWorker,
  deleteWorker
} from "./workers-service.js";

let workers = [];
let listenerStarted = false;
let refresh = null;

function uid(){
  return `worker_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
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

function emptyWorker(){
  return {
    id: uid(),
    nombre: "",
    rut: "",
    cargo: "",
    empresa: "AMECO",
    telefono: "",
    correo: "",
    ciudad: "",
    estadoLaboral: "activo",
    turno: {
      regimen: "14x14",
      fechaInicioCiclo: new Date().toISOString().slice(0,10)
    },
    observaciones: "",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function normalize(worker){
  const base = emptyWorker();
  return {
    ...base,
    ...worker,
    turno: {
      ...base.turno,
      ...(worker.turno || {})
    }
  };
}

function statusLabel(status){
  return {
    activo:"Activo",
    descanso:"Descanso",
    licencia:"Licencia",
    vacaciones:"Vacaciones",
    desvinculado:"Desvinculado"
  }[status] || status;
}

function statusClass(status){
  return {
    activo:"success",
    descanso:"warning",
    licencia:"danger",
    vacaciones:"warning",
    desvinculado:"danger"
  }[status] || "";
}

function card(worker){
  return `
    <article class="worker-card">
      <div class="worker-card-head">
        <div>
          <div class="worker-name">${escapeHtml(worker.nombre || "Sin nombre")}</div>
          <div class="worker-role">${escapeHtml(worker.cargo || "Sin cargo")}</div>
        </div>
        <span class="status-pill ${statusClass(worker.estadoLaboral)}">
          ${escapeHtml(statusLabel(worker.estadoLaboral))}
        </span>
      </div>

      <div class="worker-details">
        <div>
          <span>RUT</span>
          <strong>${escapeHtml(worker.rut || "Sin registrar")}</strong>
        </div>
        <div>
          <span>Ciudad</span>
          <strong>${escapeHtml(worker.ciudad || "Sin registrar")}</strong>
        </div>
        <div>
          <span>Turno</span>
          <strong>${escapeHtml(worker.turno?.regimen || "Sin definir")}</strong>
        </div>
      </div>

      <div class="worker-actions">
        <button class="btn btn-soft" data-edit-worker="${worker.id}">Editar</button>
        <button class="btn btn-danger" data-delete-worker="${worker.id}">Eliminar</button>
      </div>
    </article>
  `;
}

function renderList(query=""){
  const root = document.getElementById("workersList");
  if(!root) return;

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = workers.filter(worker => {
    if(!normalizedQuery) return true;
    return [
      worker.nombre,
      worker.rut,
      worker.cargo,
      worker.empresa,
      worker.ciudad
    ].some(value =>
      String(value || "").toLowerCase().includes(normalizedQuery)
    );
  });

  root.innerHTML = filtered.length
    ? filtered.map(card).join("")
    : `<div class="empty">No hay trabajadores que coincidan con la búsqueda.</div>`;

  root.querySelectorAll("[data-edit-worker]").forEach(button => {
    button.addEventListener("click", () => {
      const worker = workers.find(item => item.id === button.dataset.editWorker);
      if(worker) openWorkerModal(worker);
    });
  });

  root.querySelectorAll("[data-delete-worker]").forEach(button => {
    button.addEventListener("click", async () => {
      const worker = workers.find(item => item.id === button.dataset.deleteWorker);
      if(!worker) return;
      if(!confirm(`¿Eliminar a ${worker.nombre}?`)) return;
      await deleteWorker(worker.id);
    });
  });
}

function openWorkerModal(existing=null){
  const worker = normalize(existing || emptyWorker());
  const modalRoot = document.getElementById("modalRoot");

  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="workerModalBackdrop">
      <section class="modal-card">
        <header class="modal-header">
          <div>
            <h2>${existing ? "Editar trabajador" : "Nuevo trabajador"}</h2>
            <p>Ficha base de personal para turnos, acreditaciones y servicios.</p>
          </div>
          <button class="modal-close" id="closeWorkerModal" type="button">✕</button>
        </header>

        <form id="workerForm">
          <div class="modal-body">
            <div class="form-grid">
              <div class="field span-2">
                <label>Nombre completo</label>
                <input name="nombre" value="${escapeHtml(worker.nombre)}" placeholder="Ej: Alan González" required>
              </div>

              <div class="field">
                <label>RUT</label>
                <input name="rut" value="${escapeHtml(worker.rut)}" placeholder="Ej: 20.910.828-3">
              </div>

              <div class="field">
                <label>Cargo</label>
                <input name="cargo" value="${escapeHtml(worker.cargo)}" placeholder="Ej: Operador de grúa">
              </div>

              <div class="field">
                <label>Empresa</label>
                <input name="empresa" value="${escapeHtml(worker.empresa)}" placeholder="Ej: AMECO">
              </div>

              <div class="field">
                <label>Ciudad</label>
                <input name="ciudad" value="${escapeHtml(worker.ciudad)}" placeholder="Ej: Antofagasta">
              </div>

              <div class="field">
                <label>Teléfono</label>
                <input name="telefono" value="${escapeHtml(worker.telefono)}" placeholder="Ej: +56 9 1234 5678">
              </div>

              <div class="field">
                <label>Correo</label>
                <input name="correo" type="email" value="${escapeHtml(worker.correo)}" placeholder="correo@empresa.cl">
              </div>

              <div class="field">
                <label>Estado laboral</label>
                <select name="estadoLaboral">
                  ${[
                    ["activo","Activo"],
                    ["descanso","Descanso"],
                    ["licencia","Licencia"],
                    ["vacaciones","Vacaciones"],
                    ["desvinculado","Desvinculado"]
                  ].map(([value,label]) =>
                    `<option value="${value}" ${worker.estadoLaboral === value ? "selected" : ""}>${label}</option>`
                  ).join("")}
                </select>
              </div>

              <div class="field">
                <label>Régimen</label>
                <select name="regimen">
                  <option value="14x14" ${worker.turno?.regimen === "14x14" ? "selected" : ""}>14 × 14</option>
                  <option value="7x7" ${worker.turno?.regimen === "7x7" ? "selected" : ""}>7 × 7</option>
                  <option value="5x2" ${worker.turno?.regimen === "5x2" ? "selected" : ""}>5 × 2</option>
                  <option value="otro" ${worker.turno?.regimen === "otro" ? "selected" : ""}>Otro</option>
                </select>
              </div>

              <div class="field">
                <label>Inicio del ciclo</label>
                <input name="fechaInicioCiclo" type="date" value="${escapeHtml(worker.turno?.fechaInicioCiclo || "")}">
              </div>

              <div class="field span-2">
                <label>Observaciones</label>
                <textarea name="observaciones" rows="4" placeholder="Disponibilidad, restricciones o información relevante">${escapeHtml(worker.observaciones)}</textarea>
              </div>
            </div>
          </div>

          <footer class="modal-footer">
            <button class="btn btn-soft" id="cancelWorkerModal" type="button">Cancelar</button>
            <button class="btn btn-primary" type="submit">Guardar trabajador</button>
          </footer>
        </form>
      </section>
    </div>
  `;

  const close = () => modalRoot.innerHTML = "";
  document.getElementById("closeWorkerModal").addEventListener("click", close);
  document.getElementById("cancelWorkerModal").addEventListener("click", close);
  document.getElementById("workerModalBackdrop").addEventListener("click", event => {
    if(event.target === event.currentTarget) close();
  });

  document.getElementById("workerForm").addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    await saveWorker({
      ...worker,
      nombre: String(data.get("nombre") || "").trim(),
      rut: String(data.get("rut") || "").trim(),
      cargo: String(data.get("cargo") || "").trim(),
      empresa: String(data.get("empresa") || "").trim(),
      ciudad: String(data.get("ciudad") || "").trim(),
      telefono: String(data.get("telefono") || "").trim(),
      correo: String(data.get("correo") || "").trim(),
      estadoLaboral: String(data.get("estadoLaboral") || "activo"),
      turno: {
        regimen: String(data.get("regimen") || "14x14"),
        fechaInicioCiclo: String(data.get("fechaInicioCiclo") || "")
      },
      observaciones: String(data.get("observaciones") || "").trim(),
      updatedAt: Date.now()
    });

    close();
  });
}

export function initWorkersModule(onChange){
  refresh = onChange;
  if(listenerStarted) return;

  listenerStarted = true;
  observeWorkers(data => {
    workers = data;
    if(refresh) refresh();
  });
}

export function renderWorkers(){
  const active = workers.filter(worker => worker.estadoLaboral === "activo").length;
  const rest = workers.filter(worker => worker.estadoLaboral === "descanso").length;

  return `
    <section class="module-header">
      <div>
        <h2>Personal</h2>
        <p>Base única de trabajadores para turnos, servicios, acreditaciones y pasajes.</p>
      </div>
      <button class="btn btn-primary" id="newWorkerButton">+ Nuevo trabajador</button>
    </section>

    <section class="kpi-grid worker-kpis">
      <article class="kpi-card">
        <div class="kpi-value">${workers.length}</div>
        <div class="kpi-label">Trabajadores registrados</div>
      </article>
      <article class="kpi-card success">
        <div class="kpi-value">${active}</div>
        <div class="kpi-label">Activos</div>
      </article>
      <article class="kpi-card warning">
        <div class="kpi-value">${rest}</div>
        <div class="kpi-label">En descanso</div>
      </article>
    </section>

    <section class="workers-toolbar">
      <div class="search-control">
        <span>🔎</span>
        <input id="workersSearch" placeholder="Buscar por nombre, RUT, cargo, empresa o ciudad">
      </div>
    </section>

    <section class="workers-grid" id="workersList"></section>
  `;
}

export function bindWorkersEvents(){
  document.getElementById("newWorkerButton")?.addEventListener("click", () => openWorkerModal());

  const search = document.getElementById("workersSearch");
  search?.addEventListener("input", event => renderList(event.target.value));

  renderList();
}
