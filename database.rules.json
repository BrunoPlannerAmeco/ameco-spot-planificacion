import { state } from "../core/state.js";

function kpi(value, label, modifier=""){
  return `
    <article class="kpi-card ${modifier}">
      <div class="kpi-value">${value}</div>
      <div class="kpi-label">${label}</div>
    </article>
  `;
}

export function renderDashboard(){
  const today = new Intl.DateTimeFormat("es-CL", {
    weekday:"long", day:"2-digit", month:"long", year:"numeric"
  }).format(new Date());

  return `
    <section class="welcome">
      <div>
        <h2>Buenos días</h2>
        <p>${today.charAt(0).toUpperCase() + today.slice(1)} · Revisa primero lo que requiere atención.</p>
      </div>
    </section>

    <section class="kpi-grid">
      ${kpi(state.counts.workers, "Trabajadores registrados")}
      ${kpi(state.counts.sites, "Faenas activas", "success")}
      ${kpi(state.counts.pendingAccreditations, "Acreditaciones pendientes", "warning")}
      ${kpi(state.counts.pendingTickets, "Pasajes por gestionar", "danger")}
    </section>

    <section class="dashboard-grid">
      <article class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">Prioridades del día</div>
            <div class="panel-subtitle">Decisiones y pendientes que requieren seguimiento</div>
          </div>
        </div>
        <div class="panel-body task-list">
          <div class="task">
            <span class="task-priority critical"></span>
            <div>
              <div class="task-title">Acreditaciones pendientes</div>
              <div class="task-meta">Personal observado, en revisión o con documentos faltantes</div>
            </div>
            <div class="task-count">${state.counts.pendingAccreditations}</div>
          </div>
          <div class="task">
            <span class="task-priority"></span>
            <div>
              <div class="task-title">Pasajes por gestionar</div>
              <div class="task-meta">Asignaciones confirmadas que todavía requieren traslado</div>
            </div>
            <div class="task-count">${state.counts.pendingTickets}</div>
          </div>
          <div class="task">
            <span class="task-priority"></span>
            <div>
              <div class="task-title">Llamados pendientes</div>
              <div class="task-meta">Trabajadores por contactar o sin respuesta</div>
            </div>
            <div class="task-count">${state.counts.pendingCalls}</div>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">Acciones rápidas</div>
            <div class="panel-subtitle">Atajos para comenzar la jornada</div>
          </div>
        </div>
        <div class="panel-body quick-actions">
          <button class="quick-action" data-go="workers">
            <strong>Agregar trabajador</strong>
            <span>Registrar una nueva ficha de personal</span>
          </button>
          <button class="quick-action" data-go="services">
            <strong>Crear servicio</strong>
            <span>Registrar una nueva solicitud de personal</span>
          </button>
          <button class="quick-action" data-go="accreditations">
            <strong>Revisar acreditaciones</strong>
            <span>Ver pendientes por faena y plataforma</span>
          </button>
          <button class="quick-action" data-go="tickets">
            <strong>Gestionar pasajes</strong>
            <span>Revisar traslados pendientes</span>
          </button>
        </div>
      </article>
    </section>
  `;
}
