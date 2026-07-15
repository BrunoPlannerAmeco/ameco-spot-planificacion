import { routes, navigate } from "./router.js";
import { state } from "./state.js";
import { logout } from "./firebase-service.js";
import { renderDashboard } from "./dashboard.js";
import { initWorkersModule, renderWorkers, bindWorkersEvents } from "./workers.js";
import { initSitesModule, renderSites, bindSitesEvents } from "./sites.js";
import { initAccreditationsModule, renderAccreditations, bindAccreditationsEvents } from "./accreditations.js";

const titles = Object.fromEntries(routes.map(route => [route.id, route.label]));

function placeholder(route){
  return `
    <section class="module-placeholder">
      <h2>${titles[route]}</h2>
      <p>Este módulo ya está reservado dentro de la arquitectura v2.0. Se implementará sin duplicar datos y compartiendo la misma base de Firebase.</p>
    </section>
  `;
}

let workersInitialized = false;
let sitesInitialized = false;
let accreditationsInitialized = false;

export function renderApp(){
  if(!workersInitialized){
    workersInitialized = true;
    initWorkersModule(() => {
      if(state.route === "workers") renderApp();
    });
  }

  if(!sitesInitialized){
    sitesInitialized = true;
    initSitesModule(() => {
      if(state.route === "sites") renderApp();
    });
  }
  if(!accreditationsInitialized){
    accreditationsInitialized = true;
    initAccreditationsModule(() => {
      if(state.route === "accreditations") renderApp();
    });
  }
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="title">AMECO Spot Planner</div>
          <div class="sub">Centro de operaciones</div>
        </div>
        <nav class="nav">
          ${routes.map(route => `
            <button class="nav-button ${state.route === route.id ? "active" : ""}" data-route="${route.id}">
              <span class="nav-icon">${route.icon}</span>
              <span>${route.label}</span>
            </button>
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          Gestión centralizada de personal, faenas, servicios, acreditaciones, llamados y pasajes.
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <h1>${titles[state.route]}</h1>
          <div class="topbar-spacer"></div>
          <div class="sync"><span class="sync-dot"></span>Sincronizado</div>
          <div class="user-email">${state.user?.email || "Usuario"}</div>
          <button class="btn btn-soft" id="logoutButton">Cerrar sesión</button>
        </header>
        <div class="content" id="content"></div>
      </main>
    </div>
  `;

  const content = document.getElementById("content");
  if(state.route === "dashboard"){
    content.innerHTML = renderDashboard();
  }else if(state.route === "workers"){
    content.innerHTML = renderWorkers();
    bindWorkersEvents();
  }else if(state.route === "sites"){
    content.innerHTML = renderSites();
    bindSitesEvents();
  }else if(state.route === "accreditations"){
    content.innerHTML = renderAccreditations();
    bindAccreditationsEvents();
  }else{
    content.innerHTML = placeholder(state.route);
  }

  app.querySelectorAll("[data-route]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.route));
  });

  app.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.go));
  });

  document.getElementById("logoutButton").addEventListener("click", logout);
}
