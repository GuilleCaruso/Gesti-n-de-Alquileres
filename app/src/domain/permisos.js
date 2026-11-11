// Qué puede ver y hacer cada rol en pantalla.
// Ojo: esto solo ordena la interfaz. La seguridad real está en firestore.rules.

export const esAdmin = (usuario) => !!usuario && usuario.rol === 'admin' && usuario.activo === true;

// El empleado no ve la caja grande (cuentas soloAdmin).
export const cuentasVisibles = (cuentas, usuario) => cuentas.filter((c) => esAdmin(usuario) || !c.soloAdmin);

// Cuentas que se ofrecen al cobrar (ingreso) o pagar (egreso): el empleado no paga en efectivo.
export const cuentasPara = (cuentas, usuario, modo) =>
  cuentasVisibles(cuentas, usuario).filter((c) => modo === 'ingreso' || esAdmin(usuario) || !c.efectivo);

// Secciones del menú (solo lo que ya está construido; el resto se suma en próximas entregas).
export const SECCIONES = [
  { key: 'inicio', label: 'Inicio', icon: 'dashboard' },
  { key: 'cobranzas', label: 'Cobranzas y recibos', icon: 'cobranzas' },
  { key: 'deudores', label: 'Deudores', icon: 'deudores' },
  { key: 'aumentos', label: 'Aumentos', icon: 'bolt' },
  { key: 'contratos', label: 'Contratos', icon: 'contratos' },
  { key: 'propiedades', label: 'Propiedades', icon: 'propiedades' },
  { key: 'personas', label: 'Personas', icon: 'personas' },
];

// Secciones del bloque "Sistema": Usuarios solo para el administrador.
export const seccionesSistema = (usuario) =>
  [{ key: 'importar', label: 'Importar datos', icon: 'inbox', soloAdmin: true }, { key: 'usuarios', label: 'Usuarios', icon: 'personas', soloAdmin: true }, { key: 'configuracion', label: 'Configuración', icon: 'configuracion' }]
    .filter((s) => !s.soloAdmin || esAdmin(usuario));

export const puedeEntrar = (key, usuario) =>
  SECCIONES.some((s) => s.key === key) || seccionesSistema(usuario).some((s) => s.key === key);
