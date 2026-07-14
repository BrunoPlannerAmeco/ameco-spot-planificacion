import {
  observeAuth,
  loginWithEmail,
  logout
} from "../services/auth-service.js";
import { loadLegacyApp } from "../services/storage-adapter.js";

const shell = document.getElementById("shell");
const modalRoot = document.getElementById("modalRoot");
const loginRoot = document.getElementById("loginRoot");

function friendlyError(code) {
  const errors = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/user-disabled": "Este usuario está deshabilitado.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
    "auth/network-request-failed": "No se pudo conectar. Revisa tu conexión."
  };
  return errors[code] || "No fue posible iniciar sesión.";
}

function renderLogin() {
  shell.hidden = true;
  modalRoot.innerHTML = "";
  loginRoot.hidden = false;
  loginRoot.innerHTML = `
    <main class="login-page">
      <section class="login-card">
        <div class="login-brand">AMECO Spot Planner</div>
        <div class="login-subtitle">Gestión de personal y faenas</div>

        <form id="loginForm" class="login-form">
          <div class="field">
            <label for="loginEmail">Correo electrónico</label>
            <input id="loginEmail" name="email" type="email"
              autocomplete="username" required>
          </div>

          <div class="field">
            <label for="loginPassword">Contraseña</label>
            <input id="loginPassword" name="password" type="password"
              autocomplete="current-password" required>
          </div>

          <div id="loginError" class="login-error" role="alert"></div>

          <button id="loginButton" class="btn btn-accent login-button" type="submit">
            Iniciar sesión
          </button>
        </form>

        <div class="login-foot">
          Acceso exclusivo para usuarios autorizados.
        </div>
      </section>
    </main>
  `;

  const form = document.getElementById("loginForm");
  const button = document.getElementById("loginButton");
  const errorBox = document.getElementById("loginError");

  form.addEventListener("submit", async event => {
    event.preventDefault();
    errorBox.textContent = "";
    button.disabled = true;
    button.textContent = "Ingresando…";

    const data = new FormData(form);
    try {
      await loginWithEmail(
        String(data.get("email")).trim(),
        String(data.get("password"))
      );
    } catch (error) {
      errorBox.textContent = friendlyError(error.code);
      button.disabled = false;
      button.textContent = "Iniciar sesión";
    }
  });
}

function addSessionControls(user) {
  window.amecoSession = {
    email: user.email || "",
    logout
  };

  window.addEventListener("ameco-app-rendered", () => {
    const topbar = document.getElementById("topbar");
    if (!topbar || document.getElementById("sessionControls")) return;

    const controls = document.createElement("div");
    controls.id = "sessionControls";
    controls.className = "session-controls";
    controls.innerHTML = `
      <span class="session-email">${user.email || "Usuario"}</span>
      <button class="btn btn-ghost btn-sm" id="logoutButton">Cerrar sesión</button>
    `;
    topbar.appendChild(controls);

    document.getElementById("logoutButton").addEventListener("click", logout);
  });
}

function showApplication(user) {
  loginRoot.hidden = true;
  loginRoot.innerHTML = "";
  shell.hidden = false;
  addSessionControls(user);
  loadLegacyApp();

  const observer = new MutationObserver(() => {
    if (document.getElementById("topbar")?.children.length) {
      window.dispatchEvent(new CustomEvent("ameco-app-rendered"));
    }
  });
  observer.observe(document.getElementById("topbar"), {
    childList: true,
    subtree: true
  });
}

observeAuth(user => {
  if (user) showApplication(user);
  else renderLogin();
});
