// Formatos de pantalla e impresión (pesos, fechas, períodos).

// Moneda de un contrato: 'ARS' (pesos, por defecto) o 'USD' (dólares).
export const money = (n, moneda) => (moneda === 'USD' ? 'US$ ' : '$ ') + Math.round(n || 0).toLocaleString('es-AR');
export const nombreMoneda = (moneda) => (moneda === 'USD' ? 'dólares estadounidenses' : 'pesos');
// Total de varios importes que pueden estar en pesos y en dólares: "$ 1.000 + US$ 200".
export function totalMonedas(items) {
  const t = { ARS: 0, USD: 0 };
  items.forEach(([n, moneda]) => { t[moneda === 'USD' ? 'USD' : 'ARS'] += n || 0; });
  return [t.ARS || !t.USD ? money(t.ARS) : null, t.USD ? money(t.USD, 'USD') : null].filter(Boolean).join(' + ');
}

// Texto de fecha escrito a mano → ISO (aaaa-mm-dd). Acepta dd/mm/aaaa, d/m/aa, ddmmaaaa y aaaa-mm-dd.
// Devuelve '' si está vacío y null si no es una fecha válida.
export function leerFecha(texto) {
  const t = String(texto || '').trim();
  if (!t) return '';
  let y, m, d, r;
  if ((r = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [, y, m, d] = r;
  else if ((r = t.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/))) [, d, m, y] = r;
  else if ((r = t.match(/^(\d{2})(\d{2})(\d{4})$/))) [, d, m, y] = r;
  else return null;
  y = Number(y); m = Number(m); d = Number(d);
  if (y < 100) y += 2000;
  const f = new Date(Date.UTC(y, m - 1, d));
  if (f.getUTCFullYear() !== y || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
// ISO → dd/mm/aaaa (para mostrar en un campo de texto)
export const isoATexto = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
export const fdate = (iso) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('es-AR') : '—');

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// '2026-09' → 'Septiembre 2026'
export const periodoLabel = (p) => {
  const [y, m] = p.split('-');
  const mes = MESES[Number(m) - 1];
  return mes.charAt(0).toUpperCase() + mes.slice(1) + ' ' + y;
};

// '2026-12' → '2027-01'
export const nextPeriodo = (p) => {
  const [y, m] = p.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

// '2027-01' → '2026-12'
export const prevPeriodo = (p) => {
  const [y, m] = p.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Monto en letras para el recibo: 632000 → 'seiscientos treinta y dos mil'
export function numeroALetras(n) {
  n = Math.round(n);
  if (n === 0) return 'cero';
  const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const DIECI = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  const tres = (x) => {
    if (x === 0) return '';
    if (x === 100) return 'cien';
    let out = '';
    const c = Math.floor(x / 100), r = x % 100;
    if (c > 0) out += CENTENAS[c] + ' ';
    if (r > 0) {
      if (r < 10) out += UNIDADES[r];
      else if (r < 20) out += DIECI[r - 10];
      else {
        const d = Math.floor(r / 10), u = r % 10;
        if (d === 2 && u > 0) out += 'veinti' + UNIDADES[u];
        else { out += DECENAS[d]; if (u > 0) out += ' y ' + UNIDADES[u]; }
      }
    }
    return out.trim();
  };
  let out = '';
  const millones = Math.floor(n / 1000000); n %= 1000000;
  const miles = Math.floor(n / 1000); const resto = n % 1000;
  if (millones > 0) out += (millones === 1 ? 'un millón' : tres(millones) + ' millones') + ' ';
  if (miles > 0) out += (miles === 1 ? 'mil' : tres(miles) + ' mil') + ' ';
  if (resto > 0) out += tres(resto);
  return out.trim();
}
