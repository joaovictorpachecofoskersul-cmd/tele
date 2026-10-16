// Keyframes: valores marcados em instantes do elemento ou do clipe, com interpolação suave.
// Elemento: x, y (posição 0..1), s (tamanho, multiplica), r (giro em graus), o (opacidade 0..1).
// Clipe: zoom, x, y (deslocamento do enquadramento).
export const EASES = [
  { id: 'suave', name: 'Suave' }, { id: 'linear', name: 'Linear' }, { id: 'rapido', name: 'Rápido no começo' },
  { id: 'lento', name: 'Lento no começo' }, { id: 'rebote', name: 'Rebote' },
];

const cl = x => Math.max(0, Math.min(1, x));
export function ease(id, x) {
  x = cl(x);
  switch (id) {
    case 'linear': return x;
    case 'rapido': return 1 - Math.pow(1 - x, 3);
    case 'lento': return x * x * x;
    case 'rebote': { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
    default: return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
}

// valores no instante lt (tempo local). Só devolve as chaves que algum keyframe tem.
export function interp(kf, lt) {
  const out = {};
  if (!kf || !kf.length) return out;
  const keys = new Set();
  for (const k of kf) for (const n of Object.keys(k)) if (n !== 't' && n !== 'e') keys.add(n);
  for (const n of keys) {
    const list = kf.filter(k => k[n] != null);
    if (!list.length) continue;
    if (lt <= list[0].t) { out[n] = list[0][n]; continue; }
    const last = list[list.length - 1];
    if (lt >= last.t) { out[n] = last[n]; continue; }
    let i = 0; while (i < list.length - 1 && list[i + 1].t <= lt) i++;
    const a = list[i], b = list[i + 1];
    const q = ease(a.e || 'suave', (lt - a.t) / Math.max(1e-4, b.t - a.t));
    out[n] = a[n] + (b[n] - a[n]) * q;
  }
  return out;
}

// cria ou atualiza o keyframe no instante lt
export function upsertKf(obj, lt, vals, near = 0.08) {
  obj.kf = obj.kf || [];
  let k = obj.kf.find(x => Math.abs(x.t - lt) <= near);
  if (!k) { k = { t: Math.max(0, lt), e: 'suave' }; obj.kf.push(k); }
  Object.assign(k, vals);
  obj.kf.sort((a, b) => a.t - b.t);
  return k;
}

export function kfAt(obj, lt, near = 0.08) {
  return (obj.kf || []).find(x => Math.abs(x.t - lt) <= near) || null;
}

// valores atuais (sem keyframe) de um elemento, para começar a animação
export function itemBase(it, lt) {
  const v = interp(it.kf, lt);
  return { x: v.x ?? it.p.x ?? .5, y: v.y ?? it.p.y ?? .5, s: v.s ?? 1, r: v.r ?? 0, o: v.o ?? 1 };
}
export function clipBase(c, lt) {
  const v = interp(c.kf, lt);
  return { zoom: v.zoom ?? c.zoom ?? 1, x: v.x ?? c.x ?? 0, y: v.y ?? c.y ?? 0 };
}

// animações prontas para elementos (geram keyframes na duração do elemento)
export const ITEM_PRESETS = [
  { id: 'esq', name: 'Entrar da esquerda', make: (b, d) => [{ t: 0, x: -0.3, e: 'rapido' }, { t: Math.min(.6, d / 2), x: b.x }] },
  { id: 'dir', name: 'Entrar da direita', make: (b, d) => [{ t: 0, x: 1.3, e: 'rapido' }, { t: Math.min(.6, d / 2), x: b.x }] },
  { id: 'baixo', name: 'Subir de baixo', make: (b, d) => [{ t: 0, y: 1.25, e: 'rebote' }, { t: Math.min(.6, d / 2), y: b.y }] },
  { id: 'zoomin', name: 'Crescer devagar', make: (b, d) => [{ t: 0, s: .85, e: 'linear' }, { t: d, s: 1.15 }] },
  { id: 'pulsar', name: 'Pulsar', make: (b, d) => { const a = []; for (let t = 0, i = 0; t <= d; t += .5, i++) a.push({ t, s: i % 2 ? 1.12 : 1, e: 'suave' }); return a; } },
  { id: 'girar', name: 'Girar entrando', make: (b, d) => [{ t: 0, r: -180, s: .2, e: 'rapido' }, { t: Math.min(.7, d / 2), r: 0, s: 1 }] },
  { id: 'sumir', name: 'Sumir no fim', make: (b, d) => [{ t: Math.max(0, d - .5), o: 1, e: 'suave' }, { t: d, o: 0 }] },
  { id: 'atravessar', name: 'Atravessar a tela', make: (b, d) => [{ t: 0, x: -0.3, e: 'linear' }, { t: d, x: 1.3 }] },
];
export const CLIP_PRESETS = [
  { id: 'punch', name: 'Zoom de ênfase (1,0 → 1,15)', make: (b, d) => [{ t: 0, zoom: b.zoom, e: 'rapido' }, { t: Math.min(.35, d), zoom: b.zoom * 1.15 }] },
  { id: 'aprox', name: 'Aproximar devagar', make: (b, d) => [{ t: 0, zoom: b.zoom, e: 'linear' }, { t: d, zoom: b.zoom * 1.25 }] },
  { id: 'afastar', name: 'Afastar devagar', make: (b, d) => [{ t: 0, zoom: b.zoom * 1.25, e: 'linear' }, { t: d, zoom: b.zoom }] },
  { id: 'panesq', name: 'Passear para a esquerda', make: (b, d) => [{ t: 0, zoom: Math.max(1.2, b.zoom), x: .08, e: 'linear' }, { t: d, zoom: Math.max(1.2, b.zoom), x: -.08 }] },
  { id: 'pandir', name: 'Passear para a direita', make: (b, d) => [{ t: 0, zoom: Math.max(1.2, b.zoom), x: -.08, e: 'linear' }, { t: d, zoom: Math.max(1.2, b.zoom), x: .08 }] },
];
