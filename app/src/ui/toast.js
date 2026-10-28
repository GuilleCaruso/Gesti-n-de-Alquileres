import { esc } from '../domain/formato.js';
import { icon } from './icons.js';

let timer = null;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.innerHTML = icon('check') + '<span>' + esc(msg) + '</span>';
  t.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => t.classList.remove('show'), 2600);
}
