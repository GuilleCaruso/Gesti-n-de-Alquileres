// Importar datos (solo administrador): CSV → asignar columnas → vista previa con errores → importar.
import { esc, fdate, money } from '../../domain/formato.js';
import { adivinarMapeo, armarImportacion, CAMPOS, parseCSV } from '../../domain/importar.js';
import { guardarLote, nuevoId } from '../../services/datos.js';
import { aviso, confirmar, hoyIso } from '../base.js';
import { readSheet } from 'read-excel-file/browser';
import { icon } from '../icons.js';

// estado de la pantalla mientras se importa (no va a la base hasta confirmar)
let archivo = null; // {nombre, encabezados, filas}
let mapeo = {};
let formatoNombre = 'apellido-nombre';
let frecuenciaDefecto = 3;
let incluirVencidos = false;

function resultado(d) {
  if (!archivo) return null;
  let n = 0;
  return armarImportacion({ filas: archivo.filas, mapeo, formatoNombre, existentes: d, generarId: (col) => `${col}-previa-${++n}`, hoy: hoyIso(), frecuenciaDefecto, incluirVencidos });
}

export function vista({ d }) {
  const r = resultado(d);
  const paso1 = `
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:6px;">1. Elegí el archivo</div>
      <div class="page-sub" style="margin-bottom:12px;">El Excel (.xlsx) que exporta Arcomercial, tal cual, o un CSV. Una fila por contrato, con su propiedad, propietario e inquilino. Antes de importar, borrá del Excel los contratos de prueba y los repetidos.</div>
      <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
        <input type="file" id="impArchivo" accept=".xlsx,.csv,.txt">
        ${archivo ? `<span class="badge badge-ok">${icon('check')}${esc(archivo.nombre)} · ${archivo.filas.length} filas</span>` : ''}
      </div>
    </div>`;
  if (!archivo) return cabecera() + paso1;
  const opciones = (k) => `<option value="">— no está —</option>` + archivo.encabezados.map((h, i) => `<option value="${i}" ${mapeo[k] === i ? 'selected' : ''}>${esc(h || 'Columna ' + (i + 1))}</option>`).join('');
  const ejemplo = (k) => (mapeo[k] != null && archivo.filas[0] ? esc(archivo.filas[0][mapeo[k]] || '') : '');
  const paso2 = `
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:6px;">2. Revisá qué columna es cada dato</div>
      <div class="page-sub" style="margin-bottom:12px;">La app propone las columnas por el título. Corregí las que estén mal. Los marcados con * son obligatorios.</div>
      <div class="field" style="max-width:340px; margin-bottom:14px;"><label for="impFormato">Los nombres sin coma vienen como</label>
        <select id="impFormato"><option value="apellido-nombre" ${formatoNombre === 'apellido-nombre' ? 'selected' : ''}>Apellido Nombre (Pérez Juan)</option><option value="nombre-apellido" ${formatoNombre === 'nombre-apellido' ? 'selected' : ''}>Nombre Apellido (Juan Pérez)</option></select></div>
      <label style="display:flex; gap:8px; align-items:center; font-weight:600; margin-bottom:14px;"><input type="checkbox" id="impVencidos" ${incluirVencidos ? 'checked' : ''}> Importar también los contratos vencidos (como historial)</label>
      ${mapeo.frecuencia == null ? `<div class="field" style="max-width:340px; margin-bottom:14px;"><label for="impFrec">El archivo no dice cada cuántos meses aumentan. Cargarlos cada</label>
        <select id="impFrec">${[3, 4, 6, 12].map((m) => `<option value="${m}" ${Number(frecuenciaDefecto) === m ? 'selected' : ''}>${m} meses</option>`).join('')}</select>
        <span class="cell-sub">Quedan marcados "Revisar aumento" para confirmarlos uno por uno.</span></div>` : ''}
      <div class="table-wrap"><table><thead><tr><th>Dato</th><th>Columna del archivo</th><th>Ejemplo (fila 2)</th></tr></thead><tbody>
        ${CAMPOS.map((c) => `<tr><td class="cell-title">${esc(c.l)}${c.req ? ' *' : ''}</td><td><select data-mapeo="${c.k}">${opciones(c.k)}</select></td><td class="cell-sub">${ejemplo(c.k)}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
  const nuevosC = r.contratos;
  const todas = [...r.personas.map((p) => ({ id: p.id, ...p.data })), ...d.personas];
  const nombreDe = (id) => { const p = todas.find((x) => x.id === id); return p ? `${p.apellido}, ${p.nombre}` : '—'; };
  const paso3 = `
    <div class="card card-pad">
      <div class="section-title" style="margin-bottom:10px;">3. Vista previa</div>
      <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);">
        <div class="stat-tile"><div class="stat-value tnum">${nuevosC.length}</div><div class="stat-label">Contratos a importar</div></div>
        <div class="stat-tile"><div class="stat-value tnum">${r.propiedades.length}</div><div class="stat-label">Propiedades nuevas</div></div>
        <div class="stat-tile"><div class="stat-value tnum">${r.personas.length}</div><div class="stat-label">Personas nuevas</div></div>
        <div class="stat-tile"><div class="stat-value tnum" style="color:var(--${r.errores.length ? 'danger' : 'ok'}-600);">${r.errores.length}</div><div class="stat-label">Filas con error (no se importan)</div></div>
      </div>
      ${r.errores.length ? `<div class="note-banner" style="margin-bottom:10px; max-height:260px; overflow-y:auto;">${icon('alert')}<div>${r.errores.map((e) => `Fila ${e.fila}: ${esc(e.msg)}`).join('<br>')}</div></div>` : ''}
      ${r.avisos.length ? `<div class="note-banner info" style="margin-bottom:10px; max-height:260px; overflow-y:auto;">${icon('alert')}<div>${r.avisos.map((e) => `${e.fila ? 'Fila ' + e.fila + ': ' : ''}${esc(e.msg)}`).join('<br>')}</div></div>` : ''}
      ${nuevosC.length ? `<div class="table-wrap" style="margin-bottom:14px;"><table><thead><tr><th>N°</th><th>Inquilino</th><th>Inicio</th><th>Fin</th><th class="num">Alquiler</th><th>Aumento</th><th>Próx. act.</th><th>Estado</th></tr></thead><tbody>
        ${nuevosC.slice(0, 8).map(({ data: c }) => `<tr><td>${esc(c.numero || '—')}</td><td>${esc(nombreDe(c.tenantId))}${c.tenantId2 ? ' y ' + esc(nombreDe(c.tenantId2)) : ''}</td><td>${fdate(c.inicio)}</td><td>${fdate(c.fin)}</td><td class="num">${money(c.alquilerActual)}</td><td>${esc(c.tipoAumento)}${c.pctFijo ? ' ' + c.pctFijo + '%' : ''} · ${c.frecuencia}m</td><td>${fdate(c.proxAct)}</td><td>${esc(c.estado)}</td></tr>`).join('')}
      </tbody></table></div><div class="page-sub" style="margin-bottom:14px;">Primeros ${Math.min(8, nuevosC.length)} de ${nuevosC.length}. Revisá que montos y fechas se vean bien antes de importar.</div>` : ''}
      <div style="display:flex; gap:10px;">
        <button class="btn" data-accion="importar-cancelar">Cancelar</button>
        <button class="btn btn-primary" data-accion="importar-confirmar" ${nuevosC.length ? '' : 'disabled'}>${icon('check')}Importar ${nuevosC.length} contratos</button>
      </div>
    </div>`;
  return cabecera() + paso1 + paso2 + paso3;
}

const cabecera = () => `<div class="page-head"><div><h1 class="page-title">Importar datos</h1><div class="page-sub">Carga masiva de contratos, propiedades y personas desde Arcomercial (o cualquier planilla)</div></div></div>`;

async function leerCSV(f) {
  let texto = await f.text();
  // archivos de Excel viejos vienen en Windows-1252: si hay caracteres rotos, se relee
  if (texto.includes('\uFFFD')) texto = new TextDecoder('windows-1252').decode(await f.arrayBuffer());
  return parseCSV(texto);
}

// Excel: primera hoja, primera fila = títulos. Las fechas se pasan a dd/mm/aaaa y los números a texto.
async function leerExcel(f) {
  const hoja = await readSheet(f);
  const celda = (v) => {
    if (v == null) return '';
    if (v instanceof Date) return `${String(v.getUTCDate()).padStart(2, '0')}/${String(v.getUTCMonth() + 1).padStart(2, '0')}/${v.getUTCFullYear()}`;
    return String(v).trim();
  };
  const filas = hoja.map((f) => f.map(celda)).filter((f) => f.some((c) => c !== ''));
  const [encabezados = [], ...datos] = filas;
  return { encabezados, filas: datos };
}

// se conecta después de dibujar: el selector de archivo y los desplegables
export function montar() {
  const input = document.getElementById('impArchivo');
  if (input) input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    let encabezados, filas;
    try {
      ({ encabezados, filas } = /\.xlsx$/i.test(f.name) ? await leerExcel(f) : await leerCSV(f));
    } catch (e) {
      console.error(e);
      aviso('No se pudo leer el archivo. Si es un Excel viejo (.xls), abrilo y guardalo como .xlsx');
      return;
    }
    if (!encabezados.length || !filas.length) { aviso('El archivo está vacío'); return; }
    archivo = { nombre: f.name, encabezados, filas };
    mapeo = adivinarMapeo(encabezados);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  document.querySelectorAll('[data-mapeo]').forEach((sel) => {
    sel.onchange = () => { mapeo[sel.dataset.mapeo] = sel.value === '' ? undefined : Number(sel.value); window.dispatchEvent(new HashChangeEvent('hashchange')); };
  });
  const venc = document.getElementById('impVencidos');
  if (venc) venc.onchange = () => { incluirVencidos = venc.checked; window.dispatchEvent(new HashChangeEvent('hashchange')); };
  const frec = document.getElementById('impFrec');
  if (frec) frec.onchange = () => { frecuenciaDefecto = Number(frec.value); window.dispatchEvent(new HashChangeEvent('hashchange')); };
  const fmt = document.getElementById('impFormato');
  if (fmt) fmt.onchange = () => { formatoNombre = fmt.value; window.dispatchEvent(new HashChangeEvent('hashchange')); };
}

export const acciones = {
  'importar-cancelar': () => { archivo = null; mapeo = {}; window.dispatchEvent(new HashChangeEvent('hashchange')); },
  'importar-confirmar': ({ d }) => {
    const r = armarImportacion({ filas: archivo.filas, mapeo, formatoNombre, existentes: d, generarId: nuevoId, hoy: hoyIso(), frecuenciaDefecto, incluirVencidos });
    confirmar(`Se van a crear ${r.contratos.length} contratos, ${r.propiedades.length} propiedades y ${r.personas.length} personas. ${r.errores.length} filas con error quedan afuera. ¿Importar?`, async () => {
      const items = [
        ...r.personas.map((x) => ({ coleccion: 'personas', ...x })),
        ...r.propiedades.map((x) => ({ coleccion: 'propiedades', ...x })),
        ...r.contratos.map((x) => ({ coleccion: 'contratos', ...x })),
      ];
      try {
        aviso('Importando…');
        await guardarLote(items);
        archivo = null; mapeo = {};
        aviso(`Listo: ${r.contratos.length} contratos importados`);
        location.hash = '#/contratos';
      } catch (e) {
        console.error(e);
        aviso('Falló la importación. Revisá la conexión; lo ya guardado queda cargado.');
      }
    });
  },
};
