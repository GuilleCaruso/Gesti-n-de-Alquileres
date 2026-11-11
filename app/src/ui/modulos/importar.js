// Importar datos (solo administrador): CSV → asignar columnas → vista previa con errores → importar.
import { esc, fdate, money } from '../../domain/formato.js';
import { adivinarMapeo, armarActualizacion, armarImportacion, CAMPOS, CAMPOS_ACT, parseCSV, planillaContratos } from '../../domain/importar.js';
import { actualizarLote, guardarLote, nuevoId } from '../../services/datos.js';
import { aviso, confirmar, hoyIso } from '../base.js';
import { readSheet } from 'read-excel-file/browser';
import { icon } from '../icons.js';

// estado de la pantalla mientras se importa (no va a la base hasta confirmar)
let archivo = null; // {nombre, encabezados, filas}
let mapeo = {};
let formatoNombre = 'apellido-nombre';
let frecuenciaDefecto = 3;
let incluirVencidos = false;
let modo = 'nuevos'; // 'nuevos' (alta desde Arcomercial) o 'actualizar' (corregir contratos ya cargados)
let archivoAct = null;
let mapeoAct = {};
let sinFecha = ''; // hay que elegirlo antes de aplicar

function resultado(d) {
  if (!archivo) return null;
  let n = 0;
  return armarImportacion({ filas: archivo.filas, mapeo, formatoNombre, existentes: d, generarId: (col) => `${col}-previa-${++n}`, hoy: hoyIso(), frecuenciaDefecto, incluirVencidos });
}

const refrescar = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
const pestanas = () => `<div class="pill-row" style="margin-bottom:16px;">
  <button class="pill ${modo === 'nuevos' ? 'active' : ''}" data-accion="importar-modo" data-modo="nuevos">Contratos nuevos (desde Arcomercial)</button>
  <button class="pill ${modo === 'actualizar' ? 'active' : ''}" data-accion="importar-modo" data-modo="actualizar">Actualizar contratos ya cargados</button></div>`;

export function vista(ctx) {
  return cabecera() + pestanas() + (modo === 'actualizar' ? vistaActualizar(ctx) : vistaNuevos(ctx));
}

function vistaActualizar({ d }) {
  const paso1 = `
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:6px;">1. Planilla con los datos a corregir</div>
      <div class="page-sub" style="margin-bottom:12px;">Una fila por contrato, con su <b>N° de carpeta</b> y lo que quieras corregir: <b>monto actual</b>, <b>última actualización</b> (fecha del último aumento), <b>tipo de aumento</b> (ICL, IPC, 8%, Personalizado) y, si querés, <b>cada cuántos meses</b> y <b>moneda</b>. Lo que dejes vacío no se toca. El próximo aumento se calcula como última actualización + frecuencia.</div>
      <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
        <button class="btn" data-accion="importar-planilla">${icon('doc')}Descargar planilla con mis contratos</button>
        <input type="file" id="actArchivo" accept=".xlsx,.csv,.txt">
        ${archivoAct ? `<span class="badge badge-ok">${icon('check')}${esc(archivoAct.nombre)} · ${archivoAct.filas.length} filas</span>` : ''}
      </div>
    </div>`;
  if (!archivoAct) return paso1;
  const opciones = (k) => `<option value="">— no está —</option>` + archivoAct.encabezados.map((h, i) => `<option value="${i}" ${mapeoAct[k] === i ? 'selected' : ''}>${esc(h || 'Columna ' + (i + 1))}</option>`).join('');
  const ejemplo = (k) => (mapeoAct[k] != null && archivoAct.filas[0] ? esc(archivoAct.filas[0][mapeoAct[k]] || '') : '');
  const paso2 = `
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:10px;">2. Revisá qué columna es cada dato</div>
      <div class="table-wrap"><table><thead><tr><th>Dato</th><th>Columna del archivo</th><th>Ejemplo (fila 2)</th></tr></thead><tbody>
        ${CAMPOS_ACT.map((c) => `<tr><td class="cell-title">${esc(c.l)}${c.req ? ' *' : ''}</td><td><select data-mapeo-act="${c.k}">${opciones(c.k)}</select></td><td class="cell-sub">${ejemplo(c.k)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="field" style="max-width:640px; margin-top:14px;"><label for="actSinFecha">Para los contratos de la planilla sin "última actualización"</label>
        <select id="actSinFecha">
          <option value="" ${sinFecha === '' ? 'selected' : ''}>Elegí una opción…</option>
          <option value="inicio-mes-aplicado" ${sinFecha === 'inicio-mes-aplicado' ? 'selected' : ''}>Calcular el próximo aumento desde el inicio del contrato — los de ${esc(new Date().toLocaleDateString('es-AR', { month: 'long' }))} ya están aplicados</option>
          <option value="inicio" ${sinFecha === 'inicio' ? 'selected' : ''}>Calcular el próximo aumento desde el inicio del contrato — los de este mes que todavía no llegaron quedan pendientes</option>
          <option value="no" ${sinFecha === 'no' ? 'selected' : ''}>No tocar la fecha del próximo aumento</option>
        </select>
        <span class="cell-sub">Ejemplo: contrato que empezó el 1/8/2025 y aumenta cada 3 meses → 1/11/2025, 1/2/2026… Se toma la primera fecha que todavía no pasó. Al calcularla, el contrato deja de figurar en "Revisar aumento".</span></div>
    </div>`;
  if (mapeoAct.numero == null) return paso1 + paso2;
  const r = armarActualizacion({ filas: archivoAct.filas, mapeo: mapeoAct, contratos: d.contratos, hoy: hoyIso(), sinFecha: sinFecha || 'no' });
  const flecha = (a, b, fmt = (x) => esc(x ?? '—')) => (a === b ? `<span class="cell-sub">${fmt(a)}</span>` : `<span class="cell-sub" style="text-decoration:line-through;">${fmt(a)}</span> → <b>${fmt(b)}</b>`);
  const lista = (items, clase) => (items.length ? `<div class="note-banner ${clase}" style="margin-bottom:10px; max-height:220px; overflow-y:auto;">${icon('alert')}<div>${items.map((e) => `Fila ${e.fila}: ${esc(e.msg)}`).join('<br>')}</div></div>` : '');
  const paso3 = `
    <div class="card card-pad">
      <div class="section-title" style="margin-bottom:10px;">3. Vista previa de los cambios</div>
      <div class="stat-grid" style="grid-template-columns:repeat(2,1fr);">
        <div class="stat-tile"><div class="stat-value tnum">${r.cambios.length}</div><div class="stat-label">Contratos que cambian</div></div>
        <div class="stat-tile"><div class="stat-value tnum" style="color:var(--${r.errores.length ? 'danger' : 'ok'}-600);">${r.errores.length}</div><div class="stat-label">Filas con error (no se aplican)</div></div>
      </div>
      ${lista(r.errores, '')}${lista(r.avisos, 'info')}
      ${r.cambios.length ? `<div class="table-wrap" style="margin-bottom:14px; max-height:420px; overflow-y:auto;"><table><thead><tr><th>N°</th><th class="num">Alquiler</th><th>Aumento</th><th>Próximo aumento</th></tr></thead><tbody>
        ${r.cambios.map(({ numero, resumen: s }) => `<tr><td class="cell-title">${esc(numero)}</td>
          <td class="num tnum">${flecha(money(s.alquiler[0], s.moneda[0]), money(s.alquiler[1], s.moneda[1]))}</td>
          <td>${flecha(s.aumento[0], s.aumento[1])}</td>
          <td class="tnum">${flecha(s.proxAct[0], s.proxAct[1], (x) => (x ? fdate(x) : '—'))}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="page-sub" style="margin-bottom:14px;">No hay nada para cambiar: los datos de la planilla ya coinciden con lo cargado.</div>'}
      <div style="display:flex; gap:10px;">
        <button class="btn" data-accion="importar-cancelar">Cancelar</button>
        <button class="btn btn-primary" data-accion="importar-aplicar" ${r.cambios.length && sinFecha ? '' : 'disabled'}>${icon('check')}Aplicar ${r.cambios.length} cambios</button>
        ${sinFecha ? '' : '<span class="cell-sub" style="align-self:center;">Elegí arriba qué hacer con los que no tienen "última actualización".</span>'}
      </div>
    </div>`;
  return paso1 + paso2 + paso3;
}

function vistaNuevos({ d }) {
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
  if (!archivo) return paso1;
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
        ${nuevosC.slice(0, 8).map(({ data: c }) => `<tr><td>${esc(c.numero || '—')}</td><td>${esc(nombreDe(c.tenantId))}${c.tenantId2 ? ' y ' + esc(nombreDe(c.tenantId2)) : ''}</td><td>${fdate(c.inicio)}</td><td>${fdate(c.fin)}</td><td class="num">${money(c.alquilerActual, c.moneda)}</td><td>${esc(c.tipoAumento)}${c.pctFijo ? ' ' + c.pctFijo + '%' : ''} · ${c.frecuencia}m</td><td>${fdate(c.proxAct)}</td><td>${esc(c.estado)}</td></tr>`).join('')}
      </tbody></table></div><div class="page-sub" style="margin-bottom:14px;">Primeros ${Math.min(8, nuevosC.length)} de ${nuevosC.length}. Revisá que montos y fechas se vean bien antes de importar.</div>` : ''}
      <div style="display:flex; gap:10px;">
        <button class="btn" data-accion="importar-cancelar">Cancelar</button>
        <button class="btn btn-primary" data-accion="importar-confirmar" ${nuevosC.length ? '' : 'disabled'}>${icon('check')}Importar ${nuevosC.length} contratos</button>
      </div>
    </div>`;
  return paso1 + paso2 + paso3;
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
async function leerArchivo(f) {
  try {
    const r = /\.xlsx$/i.test(f.name) ? await leerExcel(f) : await leerCSV(f);
    if (!r.encabezados.length || !r.filas.length) { aviso('El archivo está vacío'); return null; }
    return r;
  } catch (e) {
    console.error(e);
    aviso('No se pudo leer el archivo. Si es un Excel viejo (.xls), abrilo y guardalo como .xlsx');
    return null;
  }
}

export function montar() {
  const act = document.getElementById('actArchivo');
  if (act) act.onchange = async () => {
    const f = act.files[0];
    const r = f && (await leerArchivo(f));
    if (!r) return;
    archivoAct = { nombre: f.name, ...r };
    mapeoAct = adivinarMapeo(r.encabezados, CAMPOS_ACT);
    refrescar();
  };
  const sf = document.getElementById('actSinFecha');
  if (sf) sf.onchange = () => { sinFecha = sf.value; refrescar(); };
  document.querySelectorAll('[data-mapeo-act]').forEach((sel) => {
    sel.onchange = () => { mapeoAct[sel.dataset.mapeoAct] = sel.value === '' ? undefined : Number(sel.value); refrescar(); };
  });
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
  'importar-modo': ({ ds }) => { modo = ds.modo; refrescar(); },
  'importar-planilla': ({ d }) => {
    const blob = new Blob([planillaContratos(d.contratos, d.propiedades, d.personas)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `contratos-para-completar-${hoyIso()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  'importar-aplicar': ({ d }) => {
    if (!sinFecha) return;
    const r = armarActualizacion({ filas: archivoAct.filas, mapeo: mapeoAct, contratos: d.contratos, hoy: hoyIso(), sinFecha });
    if (!r.cambios.length) return;
    confirmar(`Se van a modificar ${r.cambios.length} contratos. ${r.errores.length} filas con error quedan afuera. ¿Aplicar?`, async () => {
      try {
        await actualizarLote(r.cambios.map((c) => ({ coleccion: 'contratos', id: c.id, cambios: c.nuevo })));
        archivoAct = null; mapeoAct = {}; sinFecha = '';
        aviso(`Listo: ${r.cambios.length} contratos actualizados`, () =>
          actualizarLote(r.cambios.map((c) => ({ coleccion: 'contratos', id: c.id, cambios: c.antes })))
            .then(() => aviso('Cambios deshechos')).catch(() => aviso('No se pudo deshacer. Revisá la conexión.')));
        refrescar();
      } catch (e) {
        console.error(e);
        aviso('No se pudieron aplicar los cambios. Revisá la conexión e intentá de nuevo.');
      }
    });
  },
  'importar-cancelar': () => { archivo = null; mapeo = {}; archivoAct = null; mapeoAct = {}; sinFecha = ''; refrescar(); },
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
