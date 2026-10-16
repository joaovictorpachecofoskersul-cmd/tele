// Pequenos componentes de interface.
// append ignora itens vazios (null/false), para os painéis poderem montar partes opcionais
if (!Element.prototype.__appendSafe) {
  const ap = Element.prototype.append;
  Element.prototype.append = function (...k) { return ap.apply(this, k.filter(x => x != null && x !== false)); };
  Element.prototype.__appendSafe = true;
}
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

export const $ = s => document.querySelector(s);

export function section(title, ...kids) { return h('div', { class: 'sec' }, title ? h('div', { class: 'sec-t' }, title) : null, ...kids); }

export function slider(label, min, max, step, value, onInput, fmt = v => v, onChange) {
  const out = h('span', { class: 'sv' }, fmt(value));
  const inp = h('input', { type: 'range', min, max, step, value });
  inp.addEventListener('input', () => { const v = parseFloat(inp.value); out.textContent = fmt(v); onInput(v); });
  inp.addEventListener('change', () => onChange && onChange(parseFloat(inp.value)));
  return h('label', { class: 'sl' }, h('span', { class: 'sl-l' }, label, out), inp);
}

export function chips(options, value, onPick, cls = '') {
  const wrap = h('div', { class: 'chips ' + cls });
  const render = v => {
    wrap.innerHTML = '';
    for (const o of options) {
      const b = h('button', { class: 'chip' + (o.id === v ? ' on' : ''), type: 'button' }, o.icon ? h('span', { class: 'ci' }, o.icon) : null, o.name);
      b.addEventListener('click', () => { render(o.id); onPick(o.id, o); });
      wrap.append(b);
    }
  };
  render(value);
  wrap.set = render;
  return wrap;
}

export const COLORS = ['#FFFFFF', '#000000', '#FFE600', '#FF2B2B', '#E1251B', '#22C55E', '#3B82F6', '#0EA5E9', '#A855F7', '#F97316', '#EC4899', '#9CA3AF'];

export function swatches(value, onPick, { none = false, colors = COLORS, label } = {}) {
  const wrap = h('div', { class: 'sw-row' });
  const render = v => {
    wrap.innerHTML = '';
    if (label) wrap.append(h('span', { class: 'sw-l' }, label));
    if (none) {
      const b = h('button', { class: 'sw none' + (!v ? ' on' : ''), type: 'button', title: 'Nenhum' }, '∅');
      b.addEventListener('click', () => { render(''); onPick(''); }); wrap.append(b);
    }
    for (const c of colors) {
      const b = h('button', { class: 'sw' + (v && v.toLowerCase() === c.toLowerCase() ? ' on' : ''), type: 'button', style: { background: c } });
      b.addEventListener('click', () => { render(c); onPick(c); }); wrap.append(b);
    }
    const pick = h('input', { type: 'color', class: 'sw-pick', value: /^#[0-9a-f]{6}$/i.test(v || '') ? v : '#ffffff' });
    pick.addEventListener('input', () => onPick(pick.value));
    pick.addEventListener('change', () => render(pick.value));
    wrap.append(pick);
  };
  render(value);
  return wrap;
}

export function toggle(label, value, onChange) {
  const inp = h('input', { type: 'checkbox' });
  inp.checked = !!value;
  inp.addEventListener('change', () => onChange(inp.checked));
  return h('label', { class: 'tg' }, h('span', {}, label), inp);
}

export function btn(label, onClick, cls = '') {
  const b = h('button', { class: 'btn ' + cls, type: 'button' }, label);
  b.addEventListener('click', onClick);
  return b;
}

export function textInput(value, onInput, { multiline = false, placeholder = '', onCommit } = {}) {
  const el = h(multiline ? 'textarea' : 'input', { class: 'ti', placeholder, rows: multiline ? 2 : null });
  el.value = value ?? '';
  el.addEventListener('input', () => onInput(el.value));
  el.addEventListener('change', () => onCommit && onCommit(el.value));
  return el;
}

export function numInput(label, value, onInput, onCommit) {
  const el = h('input', { class: 'ti num', type: 'number', inputmode: 'decimal', step: 'any' });
  el.value = value;
  el.addEventListener('input', () => { const v = parseFloat(el.value); if (isFinite(v)) onInput(v); });
  el.addEventListener('change', () => onCommit && onCommit());
  return h('label', { class: 'nl' }, h('span', {}, label), el);
}

let toastT = null;
export function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}

export function confirmBox(msg, okLabel = 'Confirmar') {
  return new Promise(res => {
    const bg = h('div', { class: 'modal' });
    const box = h('div', { class: 'mbox' }, h('p', {}, msg),
      h('div', { class: 'mrow' },
        btn('Cancelar', () => { bg.remove(); res(false); }),
        btn(okLabel, () => { bg.remove(); res(true); }, 'pri')));
    bg.append(box); document.body.append(bg);
  });
}

export function promptBox(msg, value = '') {
  return new Promise(res => {
    const bg = h('div', { class: 'modal' });
    const inp = h('input', { class: 'ti' }); inp.value = value;
    const box = h('div', { class: 'mbox' }, h('p', {}, msg), inp,
      h('div', { class: 'mrow' },
        btn('Cancelar', () => { bg.remove(); res(null); }),
        btn('OK', () => { bg.remove(); res(inp.value); }, 'pri')));
    bg.append(box); document.body.append(bg); setTimeout(() => inp.focus(), 50);
  });
}
