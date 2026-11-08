// Importación de contratos desde un CSV (ej.: exportación de Arcomercial guardada como CSV desde Excel).
// Una fila = un contrato, con su propiedad, propietario, inquilino y garante. Funciones puras.

import { addMonths } from './consultas.js';

// Campos que se pueden importar. `claves`: palabras para adivinar la columna por su título.
export const CAMPOS = [
  { k: 'numero', l: 'N° de contrato', claves: ['contrato', 'nro', 'numero', 'n°', 'codigo'] },
  { k: 'direccion', l: 'Dirección de la propiedad', req: true, claves: ['direccion', 'domicilio inmueble', 'inmueble', 'propiedad', 'calle'] },
  { k: 'localidad', l: 'Localidad', claves: ['localidad', 'ciudad', 'partido'] },
  { k: 'tipo', l: 'Tipo de propiedad', claves: ['tipo'] },
  { k: 'propNombre', l: 'Propietario: nombre', req: true, claves: ['propietario', 'locador', 'dueño', 'dueno'] },
  { k: 'propDni', l: 'Propietario: DNI/CUIT', claves: ['dni propietario', 'cuit propietario', 'dni locador', 'cuit locador'] },
  { k: 'propTel', l: 'Propietario: teléfono', claves: ['tel propietario', 'telefono propietario', 'tel locador', 'telefono locador', 'celular propietario'] },
  { k: 'inqNombre', l: 'Inquilino: nombre', req: true, claves: ['inquilino', 'locatario'] },
  { k: 'inqDni', l: 'Inquilino: DNI/CUIT', claves: ['dni inquilino', 'cuit inquilino', 'dni locatario', 'cuit locatario'] },
  { k: 'inqTel', l: 'Inquilino: teléfono', claves: ['tel inquilino', 'telefono inquilino', 'tel locatario', 'telefono locatario', 'celular inquilino', 'celular'] },
  { k: 'inqEmail', l: 'Inquilino: email', claves: ['mail inquilino', 'email inquilino', 'mail locatario', 'email', 'mail'] },
  { k: 'garNombre', l: 'Garante: nombre', claves: ['garante', 'fiador'] },
  { k: 'garDni', l: 'Garante: DNI', claves: ['dni garante'] },
  { k: 'garTel', l: 'Garante: teléfono', claves: ['tel garante', 'telefono garante'] },
  { k: 'inicio', l: 'Fecha de inicio', req: true, claves: ['inicio', 'desde', 'comienzo'] },
  { k: 'fin', l: 'Fecha de fin', req: true, claves: ['fin', 'vencimiento', 'hasta', 'finalizacion'] },
  { k: 'alquiler', l: 'Alquiler actual ($)', req: true, claves: ['alquiler actual', 'importe actual', 'monto actual', 'alquiler', 'importe', 'monto', 'canon'] },
  { k: 'deposito', l: 'Depósito ($)', claves: ['deposito', 'garantia'] },
  { k: 'tipoAumento', l: 'Tipo de aumento (ICL/IPC/%)', claves: ['indice', 'ajuste', 'actualizacion', 'aumento'] },
  { k: 'frecuencia', l: 'Cada cuántos meses aumenta', claves: ['frecuencia', 'periodicidad', 'cada'] },
  { k: 'proxAct', l: 'Próxima actualización', claves: ['proxima', 'prox'] },
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
export function adivinarMapeo(encabezados) {
  const usadas = new Set();
  const mapeo = {};
  const norm = encabezados.map(sinAcentos);
  // primero las claves más largas (más específicas): "dni inquilino" antes que "inquilino"
  const pares = CAMPOS.flatMap((c) => c.claves.map((clave) => ({ k: c.k, clave: sinAcentos(clave) }))).sort((a, b) => b.clave.length - a.clave.length);
  for (const { k, clave } of pares) {
    if (mapeo[k] != null) continue;
    const i = norm.findIndex((h, idx) => !usadas.has(idx) && h.includes(clave));
    if (i >= 0) { mapeo[k] = i; usadas.add(i); }
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
  if (pct || s.includes('fijo')) return { tipoAumento: 'Fijo', pctFijo: pct ? parseFloat(pct[1].replace(',', '.')) : null };
  return { tipoAumento: s ? 'Personalizado' : 'ICL' };
}

export function normalizarFrecuencia(v) {
  const s = sinAcentos(v);
  if (s.includes('trimes')) return 3;
  if (s.includes('cuatrimes')) return 4;
  if (s.includes('semes')) return 6;
  if (s.includes('anual')) return 12;
  const n = parseInt(s, 10);
  return [3, 4, 6, 12].includes(n) ? n : 3;
}

// "Pérez, Juan" siempre es Apellido, Nombre. Sin coma, depende del formato elegido.
export function separarNombre(v, formato) {
  const s = String(v || '').trim().replace(/\s+/g, ' ');
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
export function armarImportacion({ filas, mapeo, formatoNombre, existentes, generarId, hoy }) {
  const val = (fila, k) => (mapeo[k] != null ? fila[mapeo[k]] ?? '' : '');
  const personas = []; const propiedades = []; const contratos = []; const errores = []; const avisos = [];
  const personasPorClave = new Map();
  existentes.personas.forEach((p) => { if (claveDni(p.dni)) personasPorClave.set('dni:' + claveDni(p.dni), p.id); personasPorClave.set('nom:' + claveNombre(p), p.id); });
  const propsPorClave = new Map(existentes.propiedades.map((pr) => [claveDireccion(pr.direccion, pr.localidad), pr.id]));
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

  filas.forEach((fila, i) => {
    const n = i + 2; // fila del archivo (la 1 son los títulos)
    const falta = CAMPOS.filter((c) => c.req && !String(val(fila, c.k)).trim()).map((c) => c.l);
    if (falta.length) { errores.push({ fila: n, msg: 'Falta: ' + falta.join(', ') }); return; }
    const inicio = normalizarFecha(val(fila, 'inicio'));
    const fin = normalizarFecha(val(fila, 'fin'));
    const alquiler = normalizarMonto(val(fila, 'alquiler'));
    if (!inicio || !fin) { errores.push({ fila: n, msg: 'Fecha de inicio o fin con formato no reconocido' }); return; }
    if (fin <= inicio) { errores.push({ fila: n, msg: 'La fecha de fin es anterior al inicio' }); return; }
    if (alquiler <= 0) { errores.push({ fila: n, msg: 'Alquiler en cero o no reconocido' }); return; }
    const numero = String(val(fila, 'numero')).trim();
    if (numero && numeros.has(numero)) { avisos.push({ fila: n, msg: `El contrato N° ${numero} ya estaba cargado: se omite` }); return; }

    const ownerId = persona(val(fila, 'propNombre'), val(fila, 'propDni'), val(fila, 'propTel'), '', 'Propietario');
    const tenantId = persona(val(fila, 'inqNombre'), val(fila, 'inqDni'), val(fila, 'inqTel'), val(fila, 'inqEmail'), 'Inquilino');
    const guarantorId = val(fila, 'garNombre') ? persona(val(fila, 'garNombre'), val(fila, 'garDni'), val(fila, 'garTel'), '', 'Garante') : null;

    const direccion = String(val(fila, 'direccion')).trim();
    const localidad = String(val(fila, 'localidad')).trim() || 'Paso del Rey';
    const kp = claveDireccion(direccion, localidad);
    let propertyId = propsPorClave.get(kp);
    if (!propertyId) {
      propertyId = generarId('propiedades');
      propsPorClave.set(kp, propertyId);
      propiedades.push({ id: propertyId, data: { direccion, localidad, tipo: String(val(fila, 'tipo')).trim() || 'Casa', ownerId, estado: 'Disponible' } });
    }

    const frecuencia = normalizarFrecuencia(val(fila, 'frecuencia'));
    const expensas = normalizarMonto(val(fila, 'expensas'));
    const hon = normalizarMonto(val(fila, 'honorarios'));
    const prox = normalizarFecha(val(fila, 'proxAct'));
    const activo = fin >= hoy;
    if (!activo) avisos.push({ fila: n, msg: `Contrato vencido el ${fin}: se importa como Finalizado` });
    if (!prox) avisos.push({ fila: n, msg: 'Sin fecha de próxima actualización: se calculó desde el inicio' });
    if (numero) numeros.add(numero);
    contratos.push({
      id: generarId('contratos'),
      data: {
        numero, propertyId, ownerId, tenantId, tenantId2: null, guarantorId, inicio, fin,
        alquilerInicial: alquiler, alquilerActual: alquiler, deposito: normalizarMonto(val(fila, 'deposito')) || null,
        ...normalizarTipoAumento(val(fila, 'tipoAumento')), frecuencia,
        proxAct: prox || proximaDesde(inicio, frecuencia, hoy),
        expensas: { aplica: expensas > 0, monto: expensas }, honorarios: { tipo: 'porcentaje', valor: hon || 5 },
        diaVencimiento: 10, historial: [], estado: activo ? 'Activo' : 'Finalizado', obs: String(val(fila, 'obs')).trim(),
      },
    });
  });
  return { personas, propiedades, contratos, errores, avisos };
}
