import { routes, navigate } from "../core/router.js";
import { state } from "../core/state.js";
import { logout } from "../services/firebase-service.js";
import { renderDashboard } from "./dashboard.js";

const titles = Object.fromEntries(routes.map(route => [route.id, route.label]));

function placeholder(route){
  return `
    <section class="module-placeholder">
      <h2>${titles[route]}</h2>
      <p>Este módulo ya está reservado dentro de la arquitectura v2.0. Se implementará sin duplicar datos y compartiendo la misma base de Firebase.</p>
    </section>
  `;
}

export function renderApp(){
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
  content.innerHTML = state.route === "dashboard"
    ? renderDashboard()
    : placeholder(state.route);

  app.querySelectorAll("[data-route]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.route));
  });

  app.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.go));
  });

  document.getElementById("logoutButton").addEventListener("click", logout);
}
