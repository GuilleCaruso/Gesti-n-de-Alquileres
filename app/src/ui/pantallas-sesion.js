// Pantallas fuera del sistema: falta configurar, ingreso y "sin acceso".
import { esc } from '../domain/formato.js';
import { entrar, recuperarClave, salir } from '../services/sesion.js';

const marco = (contenido) => `<div class="login-wrap"><div class="login-box"><img class="login-logo" src="/logo-caruso.png" alt="Caruso Propiedades">${contenido}</div></div>`;

export function pantallaSinConfigurar(root) {
  root.innerHTML = marco(`
    <div class="section-title" style="margin-bottom:8px;">Falta conectar Firebase</div>
    <div class="page-sub">La app todavía no tiene los datos de conexión. Seguí el Paso 1 del instructivo y pasale a Claude el bloque <b>firebaseConfig</b>.</div>`);
}

export function pantallaIngreso(root) {
  root.innerHTML = marco(`
    <form id="loginForm">
      <div class="field" style="margin-bottom:12px;"><label for="loginEmail">Email</label><input id="loginEmail" type="email" autocomplete="username" required></div>
      <div class="field"><label for="loginClave">Contraseña</label><input id="loginClave" type="password" autocomplete="current-password" required></div>
      <div class="login-error" id="loginError"></div>
      <button class="btn btn-primary btn-block" type="submit" id="loginBtn">Entrar</button>
      <button class="btn btn-ghost btn-block" type="button" id="olvideBtn" style="margin-top:8px;">Olvidé mi contraseña</button>
    </form>`);
  const error = root.querySelector('#loginError');
  root.querySelector('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = root.querySelector('#loginBtn');
    btn.disabled = true; error.textContent = '';
    try {
      await entrar(root.querySelector('#loginEmail').value, root.querySelector('#loginClave').value);
    } catch (err) {
      error.textContent = 'Email o contraseña incorrectos.';
      btn.disabled = false;
    }
  });
  root.querySelector('#olvideBtn').addEventListener('click', async () => {
    const email = root.querySelector('#loginEmail').value;
    if (!email) { error.textContent = 'Escribí tu email y volvé a tocar "Olvidé mi contraseña".'; return; }
    try { await recuperarClave(email); } catch { /* no revelamos si el email existe */ }
    error.textContent = 'Si el email está registrado, te llega un correo para elegir una contraseña nueva.';
  });
}

export function pantallaSinAcceso(root, user) {
  root.innerHTML = marco(`
    <div class="section-title" style="margin-bottom:8px;">Todavía no tenés acceso</div>
    <div class="page-sub" style="margin-bottom:12px;">Tu usuario existe, pero el administrador todavía no te dio acceso (o te lo quitó). Pasale este código para que te habilite desde <b>Usuarios</b>:</div>
    <div class="field" style="margin-bottom:16px;"><label>Tu código (UID)</label><input value="${esc(user.uid)}" readonly onclick="this.select()"></div>
    <button class="btn btn-block" id="salirBtn">Salir</button>`);
  root.querySelector('#salirBtn').addEventListener('click', () => salir());
}
