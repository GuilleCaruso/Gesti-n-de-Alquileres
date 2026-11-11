// Importación de contratos desde un CSV (ej.: exportación de Arcomercial guardada como CSV desde Excel).
// Una fila = un contrato, con su propiedad, propietario, inquilino y garante. Funciones puras.

import { addMonths } from './consultas.js';

// Campos que se pueden importar. `claves`: palabras para adivinar la columna por su título.
export const CAMPOS = [
  { k: 'numero', l: 'N° de contrato', claves: ['carpeta', 'nro contrato', 'nro de contrato', 'numero de contrato', 'n° de contrato', 'n° contrato', 'nro', 'numero', 'n°', 'codigo', 'contrato'] },
  { k: 'direccion', l: 'Dirección de la propiedad', req: true, claves: ['direccion', 'domicilio inmueble', 'inmueble', 'propiedad', 'calle'] },
  { k: 'localidad', l: 'Localidad', claves: ['localidad', 'ciudad', 'partido'] },
  { k: 'tipo', l: 'Tipo de propiedad', claves: ['tipo'] },
  { k: 'propNombre', l: 'Propietario: nombre', req: true, claves: ['propietario', 'locador', 'dueño', 'dueno'] },
  { k: 'propDni', l: 'Propietario: DNI/CUIT', claves: ['dni propietario', 'cuit propietario', 'dni locador', 'cuit locador'] },
  { k: 'propTel', l: 'Propietario: teléfono', claves: ['tel propietario', 'telefono propietario', 'tel locador', 'telefono locador', 'celular propietario', 'celular prop', 'tel prop'] },
  { k: 'inqNombre', l: 'Inquilino: nombre', req: true, claves: ['inquilino', 'locatario'] },
  { k: 'inqDni', l: 'Inquilino: DNI/CUIT', claves: ['dni inquilino', 'cuit inquilino', 'dni locatario', 'cuit locatario'] },
  { k: 'inqTel', l: 'Inquilino: teléfono', claves: ['tel inquilino', 'telefono inquilino', 'tel locatario', 'telefono locatario', 'celular inquilino', 'celular inq', 'tel inq', 'celular'] },
  { k: 'inqEmail', l: 'Inquilino: email', claves: ['mail inquilino', 'email inquilino', 'mail locatario', 'email', 'mail'] },
  { k: 'garNombre', l: 'Garante: nombre', claves: ['garante', 'fiador'] },
  { k: 'garDni', l: 'Garante: DNI', claves: ['dni garante'] },
  { k: 'garTel', l: 'Garante: teléfono', claves: ['tel garante', 'telefono garante'] },
  { k: 'inicio', l: 'Fecha de inicio', req: true, claves: ['inicio', 'desde', 'comienzo'] },
  { k: 'fin', l: 'Fecha de fin', req: true, claves: ['fin', 'vencimiento', 'hasta', 'finalizacion'] },
  { k: 'alquiler', l: 'Alquiler actual ($)', req: true, claves: ['alquiler actual', 'importe actual', 'monto actual', 'alquiler', 'importe', 'monto', 'canon'] },
  { k: 'deposito', l: 'Depósito ($)', claves: ['deposito', 'garantia'] },
  { k: 'tipoAumento', l: 'Tipo de aumento (ICL/IPC/%)', claves: ['tipo de ajuste', 'tipo de aumento', 'indice', 'ajuste', 'actualizacion', 'aumento'] },
  { k: 'frecuencia', l: 'Cada cuántos meses aumenta', claves: ['frecuencia', 'periodicidad', 'cada'] },
  { k: 'proxAct', l: 'Próxima actualización', claves: ['proxima actualizacion', 'proximo aumento', 'proxima', 'prox'] },
  { k: 'expensas', l: 'Expensas ($)', claves: ['expensas'] },
  { k: 'honorarios', l: 'Honorarios (%)', claves: ['honorarios', 'comision'] },
  { k: 'obs', l: 'Observaciones', claves: ['observ', 'nota', 'comentario'] },
];

const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// ---------- CSV ----------
export function parseCSV(texto) {
  const t = texto.replace(/^﻿/, '');
  const primera = t.split(/\r?\n/)[0] || '';
  const sep = [';', ',', '\t'].sort((a, b) => primera.split(b).length - primera.split(a).length)[0];
  const filas = []; let fila = []; let celda = ''; let comillas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (comillas) {
      if (ch === '"' && t[i + 1] === '"') { celda += '"'; i++; } else if (ch === '"') comillas = false; else celda += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(celda); celda = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      fila.push(celda); celda = '';
      if (fila.some((c) => c.trim() !== '')) filas.push(fila);
      fila = [];
    } else celda += ch;
  }
  fila.push(celda);
  if (fila.some((c) => c.trim() !== '')) filas.push(fila);
  const [encabezados = [], ...datos] = filas;
  return { encabezados: encabezados.map((h) => h.trim()), filas: datos.map((f) => f.map((c) => c.trim())) };
}

// Propone qué columna corresponde a cada campo, por el título.
export function adivinarMapeo(encabezados, campos = CAMPOS) {
  const usadas = new Set();
  const mapeo = {};
  const norm = encabezados.map(sinAcentos);
  // primero las claves más largas (más específicas): "dni inquilino" antes que "inquilino"
  const pares = campos.flatMap((c) => c.claves.map((clave) => ({ k: c.k, clave: sinAcentos(clave) }))).sort((a, b) => b.clave.length - a.clave.length);
  // 1° pasada: título idéntico ("Carpeta", "Contrato"); 2° pasada: título que contiene la palabra
  for (const exacto of [true, false]) {
    for (const { k, clave } of pares) {
      if (mapeo[k] != null) continue;
      const i = norm.findIndex((h, idx) => !usadas.has(idx) && (exacto ? h.replace(/[.:]/g, '').trim() === clave : h.includes(clave)));
      if (i >= 0) { mapeo[k] = i; usadas.add(i); }
    }
  }
  return mapeo;
}

// ---------- normalizadores ----------
export function normalizarMonto(v) {
  let s = String(v || '').replace(/[^\d.,-]/g, '');
  if (!s) return 0;
  const coma = s.lastIndexOf(','), punto = s.lastIndexOf('.');
  if (coma >= 0 && punto >= 0) {
    const dec = coma > punto ? ',' : '.';
    s = s.split(dec === ',' ? '.' : ',').join('').replace(dec, '.');
  } else if (coma >= 0) {
    s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (punto >= 0 && /\.\d{3}(\.|$)/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function normalizarFecha(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/))) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  if (/^\d{5}$/.test(s)) { // número de serie de Excel
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

export function normalizarTipoAumento(v) {
  const s = sinAcentos(v);
  if (s.includes('icl')) return { tipoAumento: 'ICL' };
  if (s.includes('ipc')) return { tipoAumento: 'IPC' };
  const pct = s.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pct || s.includes('fijo') || s.includes('%') || s.includes('porcentaje')) return { tipoAumento: 'Fijo', pctFijo: pct ? parseFloat(pct[1].replace(',', '.')) : null };
  return { tipoAumento: s ? 'Personalizado' : 'ICL' };
}

export function normalizarFrecuencia(v) {
  const s = sinAcentos(v);
  if (s.includes('cuatrimes')) return 4; // antes que "trimes": "cuatrimestral" contiene "trimestral"
  if (s.includes('trimes')) return 3;
  if (s.includes('semes')) return 6;
  if (s.includes('anual')) return 12;
  const n = parseInt(s, 10);
  return [3, 4, 6, 12].includes(n) ? n : 3;
}

// Nombres en mayúsculas (como los exporta Arcomercial) → "Pérez Juan". Si ya vienen mezclados, no se tocan.
export function nombrePropio(s) {
  const t = String(s || '').trim().replace(/\s+/g, ' ');
  if (!t || t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s\-'´’.])(\p{L})/gu, (_, sep, l) => sep + l.toUpperCase());
}

// "PÉREZ JUAN / GÓMEZ ANA" → dos personas (Arcomercial separa con "/" a los titulares).
export const separarVarios = (v) => String(v || '').split('/').map((x) => x.trim()).filter(Boolean);

// "Pérez, Juan" siempre es Apellido, Nombre. Sin coma, depende del formato elegido.
export function separarNombre(v, formato) {
  const s = nombrePropio(v);
  if (!s) return null;
  if (s.includes(',')) { const [ap, ...no] = s.split(','); return { apellido: ap.trim(), nombre: no.join(',').trim() || ap.trim() }; }
  const partes = s.split(' ');
  if (partes.length === 1) return { nombre: s, apellido: s };
  return formato === 'apellido-nombre'
    ? { apellido: partes[0], nombre: partes.slice(1).join(' ') }
    : { nombre: partes.slice(0, -1).join(' '), apellido: partes.at(-1) };
}

const claveDni = (dni) => String(dni || '').replace(/\D/g, '');
const claveNombre = (p) => sinAcentos(`${p.nombre} ${p.apellido}`);
const claveDireccion = (dir, loc) => sinAcentos(dir).replace(/\s+/g, ' ') + '|' + sinAcentos(loc);

// Primera actualización todavía no aplicada: inicio + n × frecuencia, la primera desde hoy.
export function proximaDesde(inicio, frecuencia, hoy) {
  let fecha = addMonths(inicio, frecuencia);
  for (let i = 0; i < 200 && fecha < hoy; i++) fecha = addMonths(fecha, frecuencia);
  return fecha;
}

// Arma lo que se va a guardar. `existentes` = datos ya cargados (para no duplicar personas, propiedades ni contratos).
export function armarImportacion({ filas, mapeo, formatoNombre, existentes, generarId, hoy, frecuenciaDefecto = 3, incluirVencidos = false }) {
  const val = (fila, k) => (mapeo[k] != null ? fila[mapeo[k]] ?? '' : '');
  const personas = []; const propiedades = []; const contratos = []; const errores = []; const avisos = [];
  const personasPorClave = new Map();
  existentes.personas.forEach((p) => { if (claveDni(p.dni)) personasPorClave.set('dni:' + claveDni(p.dni), p.id); personasPorClave.set('nom:' + claveNombre(p), p.id); });
  const propsPorClave = new Map(existentes.propiedades.map((pr) => [claveDireccion(pr.direccion, pr.localidad), pr.id]));
  const enArchivo = new Set();
  const propsOcupadas = new Set(existentes.contratos.filter((c) => c.estado === 'Activo').map((c) => c.propertyId));
  const numeros = new Set(existentes.contratos.map((c) => String(c.numero || '')).filter(Boolean));

  const persona = (nombreTxt, dni, tel, email, rol) => {
    const n = separarNombre(nombreTxt, formatoNombre);
    if (!n) return null;
    const kd = claveDni(dni) ? 'dni:' + claveDni(dni) : null;
    const kn = 'nom:' + claveNombre(n);
    const ya = (kd && personasPorClave.get(kd)) || personasPorClave.get(kn);
    if (ya) {
      const nueva = personas.find((p) => p.id === ya);
      if (nueva && !nueva.data.roles.includes(rol)) nueva.data.roles.push(rol);
      return ya;
    }
    const id = generarId('personas');
    personas.push({ id, data: { ...n, dni: String(dni || '').trim(), telefono: String(tel || '').trim(), email: String(email || '').trim(), roles: [rol] } });
    if (kd) personasPorClave.set(kd, id);
    personasPorClave.set(kn, id);
    return id;
  };

  // misma carpeta en varias filas (renovaciones en Arcomercial): vale la de inicio más reciente
  const mejorFila = new Map();
  filas.forEach((f, i) => {
    const num = String(val(f, 'numero')).trim();
    const ini = normalizarFecha(val(f, 'inicio'));
    if (!num || !ini) return;
    const prev = mejorFila.get(num);
    if (!prev || ini > prev.ini) mejorFila.set(num, { i, ini });
  });
  const ddmm = (iso) => iso.split('-').reverse().join('/');
  let vencidosOmitidos = 0;

  filas.forEach((fila, i) => {
    const n = i + 2; // fila del archivo (la 1 son los títulos)
    const num0 = String(val(fila, 'numero')).trim();
    if (num0 && mejorFila.has(num0) && mejorFila.get(num0).i !== i) {
      avisos.push({ fila: n, msg: `El N° ${num0} aparece más de una vez (renovación): se importa el más reciente, que empieza el ${ddmm(mejorFila.get(num0).ini)}` });
      return;
    }
    const fin00 = normalizarFecha(val(fila, 'fin'));
    if (fin00 && fin00 < hoy && !incluirVencidos) { vencidosOmitidos++; return; }
    const falta = CAMPOS.filter((c) => c.req && !String(val(fila, c.k)).trim()).map((c) => c.l);
    if (falta.length) { errores.push({ fila: n, msg: 'Falta: ' + falta.join(', ') }); return; }
    const inicio = normalizarFecha(val(fila, 'inicio'));
    const fin = normalizarFecha(val(fila, 'fin'));
    const alquiler = normalizarMonto(val(fila, 'alquiler'));
    if (!inicio || !fin) { errores.push({ fila: n, msg: 'Fecha de inicio o fin con formato no reconocido' }); return; }
    if (fin <= inicio) { errores.push({ fila: n, msg: 'La fecha de fin es anterior al inicio' }); return; }
    const montoTxt = String(val(fila, 'alquiler')).trim();
    // un contrato ya terminado entra igual (es historial); uno vigente necesita el monto
    if (alquiler <= 0 && fin >= hoy) { errores.push({ fila: n, msg: `Contrato vigente${String(val(fila, 'numero')).trim() ? ' N° ' + String(val(fila, 'numero')).trim() : ''} con alquiler en cero o no reconocido (dice "${montoTxt || 'vacío'}")` }); return; }
    if (alquiler > 0 && alquiler < 10000 && fin >= hoy) avisos.push({ fila: n, msg: `Alquiler de ${montoTxt}: revisá el monto después de importar` });
    const numero = String(val(fila, 'numero')).trim();
    if (numero && numeros.has(numero)) { avisos.push({ fila: n, msg: enArchivo.has(numero) ? `El N° ${numero} está repetido en el archivo: se importa solo la primera fila` : `El contrato N° ${numero} ya estaba cargado: se omite` }); return; }

    const [propPrincipal, ...copropietarios] = separarVarios(val(fila, 'propNombre'));
    const [inq1, inq2] = separarVarios(val(fila, 'inqNombre'));
    const ownerId = persona(propPrincipal, val(fila, 'propDni'), val(fila, 'propTel'), '', 'Propietario');
    const tenantId = persona(inq1, val(fila, 'inqDni'), val(fila, 'inqTel'), val(fila, 'inqEmail'), 'Inquilino');
    const tenantId2 = inq2 ? persona(inq2, '', '', '', 'Inquilino') : null;
    const guarantorId = val(fila, 'garNombre') ? persona(val(fila, 'garNombre'), val(fila, 'garDni'), val(fila, 'garTel'), '', 'Garante') : null;

    const direccion = nombrePropio(val(fila, 'direccion'));
    const localidad = nombrePropio(val(fila, 'localidad')) || 'Paso del Rey';
    const kp = claveDireccion(direccion, localidad);
    let propertyId = propsPorClave.get(kp);
    const fin0 = normalizarFecha(val(fila, 'fin'));
    // misma dirección con otro contrato vigente: son unidades distintas (falta el depto en el archivo)
    if (propertyId && fin0 >= hoy && propsOcupadas.has(propertyId)) {
      avisos.push({ fila: n, msg: `${direccion}: ya hay otro contrato vigente en esa dirección, se carga como otra propiedad (completale el depto)` });
      propertyId = null;
    }
    if (!propertyId) {
      propertyId = generarId('propiedades');
      propsPorClave.set(kp, propertyId);
      propiedades.push({ id: propertyId, data: { direccion, localidad, tipo: String(val(fila, 'tipo')).trim() || 'Casa', ownerId, estado: 'Disponible' } });
    }

    const frecTxt = String(val(fila, 'frecuencia')).trim();
    const frecuencia = frecTxt ? normalizarFrecuencia(frecTxt) : Number(frecuenciaDefecto) || 3;
    const expensas = normalizarMonto(val(fila, 'expensas'));
    const hon = normalizarMonto(val(fila, 'honorarios'));
    const prox = normalizarFecha(val(fila, 'proxAct'));
    const activo = fin >= hoy;
    if (!activo) avisos.push({ fila: n, msg: `Contrato vencido el ${fin}: se importa como Finalizado` });
    const revisarAumento = activo && (!frecTxt || !prox);
    if (activo) propsOcupadas.add(propertyId);
    if (numero) { numeros.add(numero); enArchivo.add(numero); }
    contratos.push({
      id: generarId('contratos'),
      data: {
        numero, propertyId, ownerId, tenantId, tenantId2, guarantorId, inicio, fin, revisarAumento,
        moneda: /u\$s|us\$|usd|u\$d|dolar|dólar/i.test(montoTxt) ? 'USD' : 'ARS',
        alquilerInicial: alquiler, alquilerActual: alquiler, deposito: normalizarMonto(val(fila, 'deposito')) || null,
        ...normalizarTipoAumento(val(fila, 'tipoAumento')), frecuencia,
        proxAct: prox || proximaDesde(inicio, frecuencia, hoy),
        expensas: { aplica: expensas > 0, monto: expensas }, honorarios: { tipo: 'porcentaje', valor: hon || 5 },
        diaVencimiento: 10, historial: [], estado: activo ? 'Activo' : 'Finalizado',
        obs: [String(val(fila, 'obs')).trim(), copropietarios.length ? 'Copropietarios: ' + copropietarios.map(nombrePropio).join(', ') : ''].filter(Boolean).join(' · '),
      },
    });
  });
  if (vencidosOmitidos) avisos.unshift({ fila: null, msg: `${vencidosOmitidos} contrato(s) ya vencidos no se importan (tildá "Importar también los vencidos" si los querés como historial).` });
  const aRevisar = contratos.filter((c) => c.data.revisarAumento).length;
  if (aRevisar) avisos.unshift({ fila: null, msg: `${aRevisar} contrato(s) vigentes sin "cada cuántos meses" o sin "próxima actualización": se cargan cada ${Number(frecuenciaDefecto) || 3} meses desde el inicio y quedan marcados "Revisar aumento" para que los confirmen a mano.` });
  return { personas, propiedades, contratos, errores, avisos };
}

// ---------- actualizar contratos ya cargados ----------
// Planilla corta: N° de carpeta + lo que se quiera corregir (monto, último aumento, tipo, frecuencia).
export const CAMPOS_ACT = [
  { k: 'numero', l: 'N° de carpeta / contrato', req: true, claves: ['carpeta', 'contrato', 'nro', 'numero', 'n°'] },
  { k: 'alquiler', l: 'Monto actual', claves: ['monto actual', 'alquiler actual', 'monto', 'alquiler', 'importe'] },
  { k: 'ultimaAct', l: 'Última actualización (fecha)', claves: ['ultima actualizacion', 'ultimo aumento', 'ultima act', 'ultima', 'ultimo'] },
  { k: 'tipoAumento', l: 'Tipo de aumento (ICL/IPC/8%/Personalizado)', claves: ['tipo de aumento', 'tipo de ajuste', 'indice', 'ajuste', 'tipo'] },
  { k: 'frecuencia', l: 'Cada cuántos meses', claves: ['cada cuantos meses', 'cada', 'frecuencia', 'periodicidad', 'meses'] },
  { k: 'moneda', l: 'Moneda (pesos / dólares)', claves: ['moneda', 'divisa'] },
];

const TIPOS_TEXTO = { ICL: 'ICL', IPC: 'IPC', Fijo: '% fijo', Personalizado: 'Personalizado' };
const etiquetaAumento = (c) => (c.tipoAumento === 'Fijo' ? `${c.pctFijo ?? '?'}% fijo` : TIPOS_TEXTO[c.tipoAumento] || c.tipoAumento || '—') + ` · cada ${c.frecuencia || 3}m`;

// Devuelve los cambios a aplicar a contratos existentes, sin tocar la base.
// `sinFecha`: qué hacer con las filas que no traen "última actualización":
//   'no' = no tocar la fecha · 'inicio' = próximo aumento contado desde el inicio del contrato (el primero desde hoy)
//   'inicio-mes-aplicado' = igual, pero los aumentos del mes en curso ya están aplicados (el próximo cae después).
export function armarActualizacion({ filas, mapeo, contratos, hoy, sinFecha = 'no' }) {
  const [anio, mes] = hoy.split('-').map(Number);
  const corte = sinFecha === 'inicio-mes-aplicado' ? (mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, '0')}-01`) : hoy;
  const val = (fila, k) => (mapeo[k] != null ? String(fila[mapeo[k]] ?? '').trim() : '');
  const cambios = []; const errores = []; const avisos = [];
  const vistos = new Set();
  filas.forEach((fila, i) => {
    const n = i + 2;
    const numero = val(fila, 'numero');
    if (!numero) { if (fila.some((x) => String(x || '').trim())) errores.push({ fila: n, msg: 'Falta el N° de carpeta' }); return; }
    const delNumero = contratos.filter((c) => String(c.numero || '') === numero);
    const c = delNumero.find((x) => x.estado === 'Activo') || delNumero[0];
    if (!c) { errores.push({ fila: n, msg: `No hay ningún contrato cargado con el N° ${numero}` }); return; }
    if (vistos.has(c.id)) { avisos.push({ fila: n, msg: `El N° ${numero} está repetido en la planilla: vale la primera fila` }); return; }
    vistos.add(c.id);
    const nuevo = {};
    const montoTxt = val(fila, 'alquiler');
    if (montoTxt) {
      const m = normalizarMonto(montoTxt);
      if (m <= 0) { errores.push({ fila: n, msg: `N° ${numero}: monto no reconocido ("${montoTxt}")` }); return; }
      if (m !== c.alquilerActual) nuevo.alquilerActual = m;
    }
    const monTxt = sinAcentos(val(fila, 'moneda'));
    if (monTxt) {
      const mon = /dol|usd|u\$s|us\$/.test(monTxt) ? 'USD' : 'ARS';
      if (mon !== (c.moneda || 'ARS')) nuevo.moneda = mon;
    }
    const tipoTxt = val(fila, 'tipoAumento');
    if (tipoTxt) {
      const t = normalizarTipoAumento(tipoTxt);
      if (t.tipoAumento === 'Fijo' && !t.pctFijo) {
        if (c.tipoAumento === 'Fijo' && c.pctFijo) t.pctFijo = c.pctFijo;
        else { errores.push({ fila: n, msg: `N° ${numero}: falta el porcentaje (escribí por ejemplo "8%")` }); return; }
      }
      if (t.tipoAumento !== c.tipoAumento) nuevo.tipoAumento = t.tipoAumento;
      if (t.tipoAumento === 'Fijo' && t.pctFijo !== c.pctFijo) nuevo.pctFijo = t.pctFijo;
    }
    const frecTxt = val(fila, 'frecuencia');
    const frecuencia = frecTxt ? normalizarFrecuencia(frecTxt) : c.frecuencia || 3;
    if (frecTxt && frecuencia !== c.frecuencia) nuevo.frecuencia = frecuencia;
    const ultTxt = val(fila, 'ultimaAct');
    if (ultTxt) {
      const ult = normalizarFecha(ultTxt);
      if (!ult) { errores.push({ fila: n, msg: `N° ${numero}: fecha de última actualización no reconocida ("${ultTxt}")` }); return; }
      const prox = addMonths(ult, frecuencia);
      if (prox !== c.proxAct) nuevo.proxAct = prox;
      if (prox <= hoy) avisos.push({ fila: n, msg: `N° ${numero}: el próximo aumento (${prox.split('-').reverse().join('/')}) ya venció, va a aparecer como pendiente en Aumentos` });
    } else if (sinFecha !== 'no' && c.inicio) {
      const prox = proximaDesde(c.inicio, frecuencia, corte);
      if (prox !== c.proxAct) nuevo.proxAct = prox;
    } else if (nuevo.frecuencia && c.proxAct) {
      avisos.push({ fila: n, msg: `N° ${numero}: cambió la frecuencia pero sin "última actualización" la fecha del próximo aumento no se recalcula` });
    }
    // con la fecha confirmada (escrita o calculada), el contrato deja de estar "a revisar"
    if ((ultTxt || sinFecha !== 'no') && c.revisarAumento) nuevo.revisarAumento = false;
    if (!Object.keys(nuevo).length) return;
    const despues = { ...c, ...nuevo };
    const antes = {};
    Object.keys(nuevo).forEach((k) => { antes[k] = c[k] ?? null; });
    cambios.push({ id: c.id, numero, nuevo, antes, resumen: {
      alquiler: [c.alquilerActual, despues.alquilerActual], moneda: [c.moneda || 'ARS', despues.moneda || 'ARS'],
      aumento: [etiquetaAumento(c), etiquetaAumento(despues)], proxAct: [c.proxAct, despues.proxAct],
    } });
  });
  return { cambios, errores, avisos };
}

// Planilla para completar: los contratos activos con las columnas que entiende "actualizar".
export function planillaContratos(contratos, propiedades, personas) {
  const PR = (id) => propiedades.find((x) => x.id === id) || {};
  const P = (id) => personas.find((x) => x.id === id);
  const fila = (cols) => cols.map((v) => { const t = String(v ?? ''); return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }).join(';');
  const tipo = (c) => (c.tipoAumento === 'Fijo' ? `${c.pctFijo ?? ''}%` : c.tipoAumento || '');
  const lineas = [fila(['N° carpeta', 'Dirección', 'Inquilino', 'Monto actual', 'Moneda', 'Última actualización', 'Tipo de aumento', 'Cada cuántos meses'])];
  contratos.filter((c) => c.estado === 'Activo')
    .sort((a, b) => String(a.numero || '').localeCompare(String(b.numero || ''), undefined, { numeric: true }))
    .forEach((c) => {
      const t = P(c.tenantId);
      lineas.push(fila([c.numero || '', PR(c.propertyId).direccion || '', t ? `${t.apellido}, ${t.nombre}` : '', c.alquilerActual || '',
        c.moneda === 'USD' ? 'Dólares' : 'Pesos', '', tipo(c), c.frecuencia || 3]));
    });
  return '\uFEFF' + lineas.join('\r\n');
}
