import { login } from "../services/firebase-service.js";

function friendlyError(code){
  const map = {
    "auth/invalid-credential":"Correo o contraseña incorrectos.",
    "auth/user-disabled":"El usuario está deshabilitado.",
    "auth/too-many-requests":"Demasiados intentos. Espera unos minutos.",
    "auth/network-request-failed":"No fue posible conectarse a Firebase."
  };
  return map[code] || "No fue posible iniciar sesión.";
}

export function renderLogin(){
  const app = document.getElementById("app");

  app.innerHTML = `
    <main class="login-page">
      <section class="login-card">
        <div class="brand-title">AMECO Spot Planner</div>
        <div class="brand-subtitle">Centro de operaciones para planificación de personal</div>

        <form class="form" id="loginForm">
          <div class="field">
            <label for="email">Correo electrónico</label>
            <input id="email" name="email" type="email" autocomplete="username" required>
          </div>
          <div class="field">
            <label for="password">Contraseña</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required>
          </div>
          <div class="login-error" id="loginError"></div>
          <button class="btn btn-primary" id="loginButton" type="submit">Iniciar sesión</button>
        </form>

        <div class="login-note">Acceso exclusivo para usuarios autorizados.</div>
      </section>
    </main>
  `;

  document.getElementById("loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    const button = document.getElementById("loginButton");
    const error = document.getElementById("loginError");
    const data = new FormData(event.currentTarget);

    button.disabled = true;
    button.textContent = "Ingresando…";
    error.textContent = "";

    try{
      await login(
        String(data.get("email") || "").trim(),
        String(data.get("password") || "")
      );
    }catch(err){
      error.textContent = friendlyError(err.code);
      button.disabled = false;
      button.textContent = "Iniciar sesión";
    }
  });
}
