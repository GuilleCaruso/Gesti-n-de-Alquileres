// Qué puede ver y hacer cada rol en pantalla.
// Ojo: esto solo ordena la interfaz. La seguridad real está en firestore.rules.

export const esAdmin = (usuario) => !!usuario && usuario.rol === 'admin' && usuario.activo === true;

// El empleado no ve la caja grande (cuentas soloAdmin).
export const cuentasVisibles = (cuentas, usuario) => cuentas.filter((c) => esAdmin(usuario) || !c.soloAdmin);

// Cuentas que se ofrecen al cobrar (ingreso) o pagar (egreso): el empleado no paga en efectivo.
export const cuentasPara = (cuentas, usuario, modo) =>
  cuentasVisibles(cuentas, usuario).filter((c) => modo === 'ingreso' || esAdmin(usuario) || !c.efectivo);

// Secciones del menú. `etapa` = en qué etapa de construcción se habilita.
export const SECCIONES = [
  { key: 'inicio', label: 'Inicio', icon: 'dashboard', etapa: 1 },
  { key: 'cobranzas', label: 'Cobranzas', icon: 'cobranzas', etapa: 5 },
  { key: 'deudores', label: 'Deudores', icon: 'deudores', etapa: 6 },
  { key: 'arreglos', label: 'Arreglos', icon: 'arreglos', etapa: 6 },
  { key: 'liquidaciones', label: 'Liquidaciones', icon: 'liquidaciones', etapa: 7 },
  { key: 'caja', label: 'Caja y bancos', icon: 'bank', etapa: 8 },
  { key: 'contratos', label: 'Contratos', icon: 'contratos', etapa: 3 },
  { key: 'propiedades', label: 'Propiedades', icon: 'propiedades', etapa: 2 },
  { key: 'personas', label: 'Personas', icon: 'personas', etapa: 2 },
  { key: 'servicios', label: 'Servicios', icon: 'servicios', etapa: 6 },
];

// Secciones del bloque "Sistema": Usuarios solo para el administrador.
export const seccionesSistema = (usuario) =>
  [{ key: 'usuarios', label: 'Usuarios', icon: 'personas', soloAdmin: true }, { key: 'configuracion', label: 'Configuración', icon: 'configuracion' }]
    .filter((s) => !s.soloAdmin || esAdmin(usuario));

export const puedeEntrar = (key, usuario) =>
  SECCIONES.some((s) => s.key === key) || seccionesSistema(usuario).some((s) => s.key === key);
