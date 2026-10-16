import { interp } from './kf.js';
// Modelo do projeto e cálculos da linha do tempo.
import { TRANS_BY_ID, FX_BY_ID, remapTime } from './effects.js';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const FORMATS = {
  '9:16': [1080, 1920],
  '1:1': [1080, 1080],
  '4:5': [1080, 1350],
  '16:9': [1920, 1080],
};

export function newProject(name) {
  return {
    v: 1,
    id: uid(),
    name: name || 'Projeto ' + new Date().toLocaleDateString('pt-BR'),
    created: Date.now(),
    updated: Date.now(),
    format: '9:16',
    fps: 30,
    bg: 'black',          // black | blur
    media: {},            // mid -> {id, kind, name, dur, w, h, hasAudio, env}
    transcripts: {},      // mid -> [{w, s, e, strong}]  (tempo da mídia)
    clips: [],            // clipes principais em sequência
    items: [],            // textos, elementos, efeitos, sons (por tempo)
    captions: {
      on: true, style: 'karaoke', maxWords: 3, x: 0.5, y: 0.7, size: 1,
      color: '#FFFFFF', active: '#FFE600', strong: '#FF2B2B', font: 'Poppins', upper: true, star: false,
    },
    audio: {
      voice: 1,
      music: null,        // {mid, vol, start, fade}
      duck: true,
      beat: { on: false, bpm: 126, vol: 0.35, style: 'funk' },
      sfxAuto: true,
      loud: true,
    },
  };
}

export function dims(project) {
  return FORMATS[project.format] || FORMATS['9:16'];
}

export function newClip(media, opts = {}) {
  const isImg = media.kind === 'image';
  return {
    id: uid(),
    mid: media.id,
    in: 0,
    out: isImg ? (opts.dur || 3) : media.dur,
    speed: 1,
    vol: 1,
    fit: opts.fit || 'cover',
    zoom: 1, x: 0, y: 0,
    fx: [],
    kb: isImg,                       // zoom lento automático em foto
    trans: { id: 'none', dur: 0.4, text: 'WOW' },
  };
}

export function clipDur(c) { return Math.max(0.05, (c.out - c.in) / (c.speed || 1)); }

// Começo de cada clipe e duração total
export function layout(p) {
  const starts = [];
  let t = 0;
  for (const c of p.clips) { starts.push(t); t += clipDur(c); }
  return { starts, total: t };
}

export function totalDur(p) { return layout(p).total; }

export function clipIndexAt(p, t, L = layout(p)) {
  const n = p.clips.length;
  if (!n) return -1;
  for (let i = n - 1; i >= 0; i--) if (t >= L.starts[i]) return i;
  return 0;
}

// duração efetiva da transição entre o clipe i e i+1
export function transDur(p, i) {
  const c = p.clips[i], d = p.clips[i + 1];
  if (!c || !d || !c.trans || c.trans.id === 'none') return 0;
  const want = c.trans.dur || (TRANS_BY_ID[c.trans.id] || {}).dur || 0.4;
  return Math.min(want, clipDur(c) * 0.9, clipDur(d) * 0.9);
}

// Tempo na mídia para um clipe num instante da linha do tempo (com "sobras" para transições)
export function srcTime(p, ci, t, L = layout(p)) {
  const c = p.clips[ci];
  const m = p.media[c.mid];
  const raw = c.in + (t - L.starts[ci]) * (c.speed || 1);
  const maxT = m && m.kind !== 'image' ? Math.max(0, m.dur - 1 / (p.fps || 30)) : 1e9;
  return clamp(raw, 0, maxT);
}

// Efeitos de tempo (repetir/congelar) mudam o instante que é lido dos clipes
export function remapGlobal(p, t) {
  for (const it of p.items) {
    if (it.kind !== 'effect') continue;
    const fx = FX_BY_ID[it.p.fx];
    if (!fx || !fx.timeRemap) continue;
    if (t >= it.start && t < it.start + it.dur) {
      return Math.max(0, it.start + remapTime(fx.id, t - it.start, it.dur, it.p.i ?? fx.def.i, it.p.span ?? 5));
    }
  }
  return t;
}

// O que precisa ser desenhado no instante t
export function frameRequest(p, tIn, L = layout(p)) {
  const n = p.clips.length;
  if (!n) return null;
  const t = clamp(remapGlobal(p, tIn), 0, Math.max(0, L.total - 1e-4));
  const i = clipIndexAt(p, t, L);
  const end = L.starts[i] + clipDur(p.clips[i]);
  // transição de entrada (vinda do clipe anterior)
  if (i > 0) {
    const d = transDur(p, i - 1);
    if (d > 0 && t < L.starts[i] + d / 2) {
      const pr = (t - (L.starts[i] - d / 2)) / d;
      return { t, trans: p.clips[i - 1].trans, transIndex: i - 1, p: clamp(pr, 0, 1),
        a: { ci: i - 1, src: srcTime(p, i - 1, t, L) }, b: { ci: i, src: srcTime(p, i, t, L) } };
    }
  }
  // transição de saída (para o próximo)
  if (i < n - 1) {
    const d = transDur(p, i);
    if (d > 0 && t >= end - d / 2) {
      const pr = (t - (end - d / 2)) / d;
      return { t, trans: p.clips[i].trans, transIndex: i, p: clamp(pr, 0, 1),
        a: { ci: i, src: srcTime(p, i, t, L) }, b: { ci: i + 1, src: srcTime(p, i + 1, t, L) } };
    }
  }
  return { t, a: { ci: i, src: srcTime(p, i, t, L) } };
}

export function activeItems(p, t, kinds) {
  return p.items.filter(it => t >= it.start && t < it.start + it.dur && (!kinds || kinds.includes(it.kind)));
}

// Distribui os itens em faixas para não se sobreporem na linha do tempo
export function assignLanes(items) {
  const lanes = [];
  const sorted = [...items].sort((a, b) => a.start - b.start);
  for (const it of sorted) {
    let k = 0;
    while (lanes[k] != null && lanes[k] > it.start + 0.001) k++;
    lanes[k] = it.start + it.dur;
    it._lane = k;
  }
  return lanes.length;
}

// Dividir um clipe no instante t (linha do tempo)
export function splitClipAt(p, t) {
  const L = layout(p);
  const i = clipIndexAt(p, t, L);
  if (i < 0) return false;
  const c = p.clips[i];
  const s = c.in + (t - L.starts[i]) * (c.speed || 1);
  if (s - c.in < 0.1 || c.out - s < 0.1) return false;
  const d = JSON.parse(JSON.stringify(c));
  d.id = uid();
  c.out = s; d.in = s;
  // animação por pontos: cada metade fica com os seus pontos (tempo local)
  if (c.kf && c.kf.length) {
    const cut = t - L.starts[i];
    const mid = interp(c.kf, cut);
    c.kf.push({ t: cut - 0.001, e: 'suave', ...mid }); c.kf.push({ t: cut, e: 'suave', ...mid });
    c.kf.sort((a, b) => a.t - b.t);
    d.kf = c.kf.filter(k => k.t >= cut).map(k => ({ ...k, t: k.t - cut }));
    c.kf = c.kf.filter(k => k.t < cut);
  }
  d.trans = c.trans; c.trans = { id: 'none', dur: 0.4, text: 'WOW' };
  p.clips.splice(i + 1, 0, d);
  return true;
}

// Ao mudar a duração dos clipes, itens que passam do fim são encurtados
export function clampItems(p) {
  const T = totalDur(p);
  p.items = p.items.filter(it => it.start < T - 0.05);
  for (const it of p.items) if (it.start + it.dur > T) it.dur = Math.max(0.1, T - it.start);
}

// Desfazer / refazer
export class History {
  constructor(limit = 60) { this.stack = []; this.i = -1; this.limit = limit; }
  reset(state) { this.stack = [JSON.stringify(state)]; this.i = 0; }
  push(state) {
    const s = JSON.stringify(state);
    if (this.stack[this.i] === s) return;
    this.stack = this.stack.slice(0, this.i + 1);
    this.stack.push(s);
    if (this.stack.length > this.limit) this.stack.shift();
    this.i = this.stack.length - 1;
  }
  canUndo() { return this.i > 0; }
  canRedo() { return this.i < this.stack.length - 1; }
  undo() { if (!this.canUndo()) return null; this.i--; return JSON.parse(this.stack[this.i]); }
  redo() { if (!this.canRedo()) return null; this.i++; return JSON.parse(this.stack[this.i]); }
}

export function fmtTime(s) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60), r = s - m * 60;
  return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1);
}
