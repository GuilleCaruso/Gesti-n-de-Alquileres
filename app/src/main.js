// Punto de entrada: decide qué pantalla mostrar según la sesión.
import './ui/styles.css';
import { configurado } from './services/firebase.js';
import { pantallaIngreso, pantallaSinAcceso, pantallaSinConfigurar } from './ui/pantallas-sesion.js';
import { montarShell } from './ui/shell.js';

const root = document.getElementById('app');

if (!configurado) {
  pantallaSinConfigurar(root);
} else {
  const { escucharSesion } = await import('./services/sesion.js');
  escucharSesion((s) => {
    if (s.estado === 'fuera') pantallaIngreso(root);
    else if (s.estado === 'sinAcceso') pantallaSinAcceso(root, s.user);
    else montarShell(root, s.perfil);
  });
}
