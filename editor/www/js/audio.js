// Áudio: efeitos sonoros sintetizados, batida, ducking da música, loudness (-14 LUFS) e limitador.
export const SR = 48000;

export const SFX_LIST = [
  { id: 'whoosh', name: 'Whoosh' }, { id: 'boom', name: 'Boom' }, { id: 'impacto', name: 'Impacto' },
  { id: 'glitch', name: 'Glitch' }, { id: 'vidro', name: 'Vidro quebrando' }, { id: 'rasgo', name: 'Papel rasgando' },
  { id: 'chiado', name: 'Chiado de TV' }, { id: 'pop', name: 'Pop' }, { id: 'camera', name: 'Câmera (foto)' },
  { id: 'tique', name: 'Tique-taque' }, { id: 'carimbo', name: 'Carimbo' }, { id: 'ding', name: 'Ding' },
  { id: 'riser', name: 'Subida (tensão)' }, { id: 'digitar', name: 'Digitação' }, { id: 'erro', name: 'Erro (buzzer)' },
  { id: 'palmas', name: 'Palmas' }, { id: 'clique', name: 'Clique de mouse' }, { id: 'vinheta', name: 'Vinheta de abertura' }, { id: 'notificacao', name: 'Notificação' },
  { id: 'swoosh2', name: 'Swoosh rápido' }, { id: 'swipeup', name: 'Deslizar para cima' }, { id: 'zoomin', name: 'Zoom (aproximar)' }, { id: 'reverse', name: 'Rebobinar' },
  { id: 'trovao', name: 'Trovão' }, { id: 'tambor', name: 'Rufar de tambor' }, { id: 'tadah', name: 'Tcharam!' }, { id: 'sino', name: 'Sino' },
  { id: 'moeda', name: 'Moeda / dinheiro' }, { id: 'caixa', name: 'Caixa registradora' }, { id: 'acerto', name: 'Acerto (certo)' }, { id: 'errou', name: 'Errou (triste)' },
  { id: 'suspense', name: 'Suspense grave' }, { id: 'batida', name: 'Batida do coração' }, { id: 'bolha', name: 'Bolha' }, { id: 'mola', name: 'Mola (boing)' },
  { id: 'laser', name: 'Laser' }, { id: 'apito', name: 'Apito' }, { id: 'buzina', name: 'Buzina' }, { id: 'sirene', name: 'Sirene' },
  { id: 'scratch', name: 'Arranhão de disco' }, { id: 'bip', name: 'Bip (censura)' }, { id: 'risada', name: 'Risada (plateia)' }, { id: 'uau', name: 'Uau (plateia)' },
  { id: 'gota', name: 'Gota' }, { id: 'passos', name: 'Passos' },
];
// grupos para achar fácil
export const SFX_GROUPS = [
  { name: 'Transição', ids: ['whoosh', 'swoosh2', 'swipeup', 'zoomin', 'reverse', 'riser', 'glitch', 'rasgo', 'scratch'] },
  { name: 'Impacto', ids: ['boom', 'impacto', 'trovao', 'carimbo', 'vidro', 'suspense', 'batida', 'tambor'] },
  { name: 'Interface', ids: ['pop', 'clique', 'notificacao', 'ding', 'bip', 'digitar', 'camera', 'bolha', 'gota'] },
  { name: 'Engraçado', ids: ['mola', 'risada', 'uau', 'errou', 'buzina', 'apito', 'laser', 'palmas'] },
  { name: 'Resultado', ids: ['tadah', 'acerto', 'erro', 'moeda', 'caixa', 'sino', 'vinheta', 'tique', 'sirene', 'chiado', 'passos'] },
];

// som automático de alguns elementos
export const ELEMENT_SFX = { e_rating: 'acerto', e_pin: 'pop', e_price: 'moeda', e_subscribe: 'clique', e_check: 'acerto', e_typing: 'notificacao', e_underline: 'swoosh2', g_hbars: 'whoosh', g_gauge: 'whoosh', g_icons: 'pop', g_change: 'whoosh', g_stack: 'whoosh', g_race: 'whoosh', stamp: 'carimbo', counter: 'tique', censor: 'erro', card: 'boom', emoji: 'pop', circle: 'whoosh', arrow: 'pop', lower: 'whoosh', follow: 'pop', bubble: 'pop', pill: 'pop', checklist: 'pop', people: 'pop', map: 'whoosh', bars: 'whoosh', module: 'whoosh', like: 'pop', click: 'clique', tap: 'pop', bell: 'notificacao', notif: 'notificacao', swipe: 'whoosh', comment: 'pop', poll: 'pop', share: 'whoosh',
  c_year: 'tique', c_period: 'whoosh', c_date: 'boom', c_timeline: 'whoosh', c_two: 'pop', c_list: 'pop', c_phrase: 'impacto', c_quote: 'whoosh', c_final: 'boom',
  g_vbars: 'whoosh', g_line: 'whoosh', g_pie: 'whoosh', g_ring: 'whoosh', g_poll: 'whoosh', g_versus: 'whoosh', g_table: 'whoosh', g_countdown: 'tique', g_odometer: 'tique',
  r_cta: 'pop', r_headline: 'whoosh', r_nametag: 'pop' };

// --------------------------------------------------------------------------
// utilidades DSP
// --------------------------------------------------------------------------
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; }; }

class Biquad {
  constructor(type, f, q = 0.707, sr = SR) { this.set(type, f, q, sr); this.x1 = this.x2 = this.y1 = this.y2 = 0; }
  set(type, f, q, sr = SR) {
    const w = 2 * Math.PI * Math.min(f, sr * 0.45) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; }
    a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y;
  }
}

const buf = s => new Float32Array(Math.max(1, Math.round(s * SR)));

function normalize(a, peak = 0.9) {
  let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
  if (m > 0) { const k = peak / m; for (let i = 0; i < a.length; i++) a[i] *= k; }
  return a;
}

// --------------------------------------------------------------------------
// efeitos sonoros
// --------------------------------------------------------------------------
const cache = new Map();
export function sfx(type) {
  if (cache.has(type)) return cache.get(type);
  const r = rng(type.length * 7919 + type.charCodeAt(0));
  let a;
  switch (type) {
    case 'whoosh': {
      a = buf(0.55); const f = new Biquad('bp', 400, 1.2);
      for (let i = 0; i < a.length; i++) {
        const t = i / a.length; f.set('bp', 300 + 3500 * Math.sin(Math.PI * t) ** 2, 1.4);
        a[i] = f.run(r()) * Math.sin(Math.PI * t) ** 1.5;
      } break;
    }
    case 'boom': {
      a = buf(1.4); const lp = new Biquad('lp', 180); let ph = 0;
      for (let i = 0; i < a.length; i++) {
        const t = i / SR; const fr = 40 + 120 * Math.exp(-t * 18); ph += 2 * Math.PI * fr / SR;
        a[i] = Math.sin(ph) * Math.exp(-t * 3.2) + lp.run(r()) * Math.exp(-t * 9) * 0.8;
      } break;
    }
    case 'impacto': {
      a = buf(0.8); const lp = new Biquad('lp', 2500); let ph = 0;
      for (let i = 0; i < a.length; i++) {
        const t = i / SR; ph += 2 * Math.PI * (60 + 200 * Math.exp(-t * 30)) / SR;
        a[i] = Math.sin(ph) * Math.exp(-t * 6) + lp.run(r()) * Math.exp(-t * 25);
      } break;
    }
    case 'glitch': {
      a = buf(0.45); let hold = 0, v = 0;
      for (let i = 0; i < a.length; i++) {
        if (hold-- <= 0) { hold = 30 + Math.floor((r() + 1) * 400); v = r(); }
        const gate = Math.sin(i / SR * 70) > -0.2 ? 1 : 0;
        a[i] = (Math.round(v * 4) / 4) * gate * (Math.sin(i * 0.08 * (1 + v)) > 0 ? 1 : -1) * 0.6;
      } break;
    }
    case 'vidro': {
      a = buf(1.3); const hp = new Biquad('hp', 2500);
      const parts = Array.from({ length: 14 }, () => ({ f: 2500 + (r() + 1) * 4500, d: 4 + (r() + 1) * 6, t0: (r() + 1) * 0.12 }));
      for (let i = 0; i < a.length; i++) {
        const t = i / SR; let s = hp.run(r()) * Math.exp(-t * 14) * 0.9;
        for (const p of parts) if (t > p.t0) s += Math.sin(2 * Math.PI * p.f * (t - p.t0)) * Math.exp(-(t - p.t0) * p.d) * 0.12;
        a[i] = s;
      } break;
    }
    case 'rasgo': {
      a = buf(0.7); const bp = new Biquad('bp', 1800, 0.8);
      for (let i = 0; i < a.length; i++) {
        const t = i / a.length; const crackle = Math.random() < 0.02 ? 1 : 0.35;
        a[i] = bp.run(r()) * crackle * Math.sin(Math.PI * t) ** 0.6;
      } break;
    }
    case 'chiado': {
      a = buf(0.6); const hp = new Biquad('hp', 900);
      for (let i = 0; i < a.length; i++) { const t = i / a.length; a[i] = hp.run(r()) * (t < 0.05 ? t / 0.05 : 1) * (1 - t) ** 0.5; } break;
    }
    case 'pop': {
      a = buf(0.18); let ph = 0;
      for (let i = 0; i < a.length; i++) { const t = i / SR; ph += 2 * Math.PI * (900 - 600 * t / 0.18) / SR; a[i] = Math.sin(ph) * Math.exp(-t * 28); } break;
    }
    case 'camera': {
      a = buf(0.35); const hp = new Biquad('hp', 1500);
      for (let i = 0; i < a.length; i++) { const t = i / SR; a[i] = hp.run(r()) * (Math.exp(-t * 80) + (t > 0.09 ? Math.exp(-(t - 0.09) * 60) * 0.8 : 0)); } break;
    }
    case 'tique': {
      a = buf(1.0); const hp = new Biquad('hp', 2000);
      for (let i = 0; i < a.length; i++) { const t = i / SR; const k = t % 0.125; a[i] = hp.run(r()) * Math.exp(-k * 300) * (Math.floor(t / 0.125) % 2 ? 0.6 : 1); } break;
    }
    case 'carimbo': {
      a = buf(0.5); const lp = new Biquad('lp', 900); let ph = 0;
      for (let i = 0; i < a.length; i++) { const t = i / SR; ph += 2 * Math.PI * (90 + 140 * Math.exp(-t * 40)) / SR; a[i] = Math.sin(ph) * Math.exp(-t * 14) + lp.run(r()) * Math.exp(-t * 40) * 1.2; } break;
    }
    case 'ding': {
      a = buf(1.4);
      for (let i = 0; i < a.length; i++) { const t = i / SR; a[i] = (Math.sin(2 * Math.PI * 1318 * t) + 0.5 * Math.sin(2 * Math.PI * 2637 * t) + 0.25 * Math.sin(2 * Math.PI * 3951 * t)) * Math.exp(-t * 3.5) * Math.min(1, t * 400); } break;
    }
    case 'riser': {
      a = buf(1.6); const bp = new Biquad('bp', 300, 2); let ph = 0;
      for (let i = 0; i < a.length; i++) { const t = i / a.length; bp.set('bp', 200 + 5000 * t * t, 2); ph += 2 * Math.PI * (120 + 900 * t * t) / SR; a[i] = (bp.run(r()) * 0.8 + Math.sin(ph) * 0.25) * t ** 1.5; } break;
    }
    case 'digitar': {
      a = buf(1.2); const hp = new Biquad('hp', 2500); const hits = []; let tt = 0; while (tt < 1.1) { hits.push(tt); tt += 0.06 + (r() + 1) * 0.05; }
      for (let i = 0; i < a.length; i++) { const t = i / SR; let s = 0; for (const h of hits) if (t >= h && t < h + 0.03) s += Math.exp(-(t - h) * 250); a[i] = hp.run(r()) * s; } break;
    }
    case 'erro': {
      a = buf(0.6);
      for (let i = 0; i < a.length; i++) { const t = i / SR; const sq = Math.sign(Math.sin(2 * Math.PI * 160 * t)) + 0.6 * Math.sign(Math.sin(2 * Math.PI * 233 * t)); a[i] = sq * 0.4 * (t < 0.55 ? 1 : (0.6 - t) / 0.05); } break;
    }
    case 'palmas': {
      a = buf(1.6); const bp = new Biquad('bp', 1400, 0.9); const hits = []; for (let k = 0; k < 40; k++) hits.push((r() + 1) / 2 * 1.4);
      for (let i = 0; i < a.length; i++) { const t = i / SR; let e = 0; for (const h of hits) if (t >= h && t < h + 0.05) e += Math.exp(-(t - h) * 90); a[i] = bp.run(r()) * e; } break;
    }
    case 'clique': {
      a = buf(0.12); const hp = new Biquad('hp', 3000);
      for (let i = 0; i < a.length; i++) { const t = i / SR; a[i] = hp.run(r()) * (Math.exp(-t * 600) + (t > 0.05 ? Math.exp(-(t - 0.05) * 700) * 0.6 : 0)); } break;
    }
    case 'notificacao': {
      a = buf(0.7);
      for (let i = 0; i < a.length; i++) { const t = i / SR; const f = t < 0.12 ? 1046 : 1568; const tt = t < 0.12 ? t : t - 0.12; a[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-tt * 9) * Math.min(1, tt * 300); } break;
    }
    case 'vinheta': {
      // subida + acorde brilhante
      a = buf(2.2); const bp = new Biquad('bp', 400, 1.5);
      const notes = [523.25, 659.25, 783.99, 1046.5];
      for (let i = 0; i < a.length; i++) {
        const t = i / SR; let v = 0;
        if (t < 0.9) { bp.set('bp', 300 + 4000 * (t / 0.9) ** 2, 1.5); v += bp.run(r()) * (t / 0.9) ** 2 * 0.7; }
        if (t >= 0.85) { const tt = t - 0.85; for (const f of notes) v += Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt * 2.2) * 0.22 * Math.min(1, tt * 200); v += Math.sin(2 * Math.PI * 65 * tt) * Math.exp(-tt * 5) * 0.6; }
        a[i] = v;
      } break;
    }
    case 'swoosh2': {
      a = buf(0.32); const f = new Biquad('bp', 800, 1.5);
      for (let i = 0; i < a.length; i++) { const t = i / a.length; f.set('bp', 600 + 6000 * t, 1.5); a[i] = f.run(r()) * Math.sin(Math.PI * t) ** 2; } break;
    }
    case 'swipeup': {
      a = buf(0.4); let ph = 0; const f = new Biquad('bp', 1000, 2);
      for (let i = 0; i < a.length; i++) { const t = i / a.length; ph += 2 * Math.PI * (300 + 1500 * t) / SR; f.set('bp', 500 + 4000 * t, 2); a[i] = (Math.sin(ph) * 0.4 + f.run(r()) * 0.8) * Math.sin(Math.PI * t); } break;
    }
    case 'zoomin': {
      a = buf(0.7); let ph = 0; const f = new Biquad('lp', 400);
      for (let i = 0; i < a.length; i++) { const t = i / a.length; ph += 2 * Math.PI * (80 + 500 * t * t) / SR; f.set('lp', 300 + 6000 * t * t); a[i] = (Math.sin(ph) * 0.6 + f.run(r()) * 0.6) * (t < 0.9 ? t : (1 - t) * 9); } break;
    }
    case 'reverse': {
      a = buf(0.9); const hp = new Biquad('hp', 600);
      for (let i = 0; i < a.length; i++) { const t = i / a.length; const w = Math.sin(2 * Math.PI * (40 * t + 12 * t * t)); a[i] = hp.run(r()) * (0.3 + 0.7 * Math.abs(w)) * Math.sin(Math.PI * t) + Math.sin(2 * Math.PI * (220 - 160 * t) * t * 3) * 0.3 * Math.sin(Math.PI * t); } break;
    }
    case 'trovao': {
      a = buf(2.4); const lp = new Biquad('lp', 300); const lp2 = new Biquad('lp', 1200);
      for (let i = 0; i < a.length; i++) { const t = i / SR; a[i] = lp.run(r()) * 3 * Math.exp(-t * 1.4) * (0.6 + 0.4 * Math.sin(t * 13)) + lp2.run(r()) * Math.exp(-t * 18) * 1.5; } break;
    }
    case 'tambor': {
      a = buf(2.0); const bp = new Biquad('bp', 220, 1.2);
      for (let i = 0; i < a.length; i++) { const t = i / SR; const k = t % 0.045; const cr = t < 1.7 ? 0.3 + 0.7 * t / 1.7 : Math.exp(-(t - 1.7) * 15); a[i] = bp.run(r()) * Math.exp(-k * 90) * cr + (t > 1.7 ? Math.sin(2 * Math.PI * 70 * (t - 1.7)) * Math.exp(-(t - 1.7) * 9) : 0); } break;
    }
    case 'tadah': {
      a = buf(1.6); const ch = [[523.25, 659.25, 783.99], [698.46, 880, 1046.5]];
      for (let i = 0; i < a.length; i++) { const t = i / SR; const set = t < 0.18 ? ch[0] : ch[1]; const tt = t < 0.18 ? t : t - 0.18; let v = 0; for (const f of set) v += (Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.3 + Math.sin(2 * Math.PI * f * t)) * 0.25; a[i] = v * Math.exp(-tt * (t < 0.18 ? 6 : 2)) * Math.min(1, tt * 300); } break;
    }
    case 'sino': {
      a = buf(2.5); const fs = [880, 1760 * 1.01, 2640 * 1.02, 3520 * 0.99];
      for (let i = 0; i < a.length; i++) { const t = i / SR; let v = 0; fs.forEach((f, k) => { v += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * (1.2 + k)) / (k + 1); }); a[i] = v * Math.min(1, t * 500); } break;
    }
    case 'moeda': {
      a = buf(0.7);
      for (let i = 0; i < a.length; i++) { const t = i / SR; const f = t < 0.08 ? 988 : 1319; const tt = t < 0.08 ? t : t - 0.08; a[i] = Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.35 * Math.exp(-tt * 6); } break;
    }
    case 'caixa': {
      a = buf(1.2); const hp = new Biquad('hp', 2500);
      for (let i = 0; i < a.length; i++) { const t = i / SR; a[i] = hp.run(r()) * Math.exp(-t * 40) * 0.8 + (t > 0.12 ? (Math.sin(2 * Math.PI * 2093 * t) + Math.sin(2 * Math.PI * 2637 * t)) * 0.3 * Math.exp(-(t - 0.12) * 3) : 0); } break;
    }
    case 'acerto': {
      a = buf(0.6);
      for (let i = 0; i < a.length; i++) { const t = i / SR; const f = t < 0.1 ? 880 : 1318; const tt = t < 0.1 ? t : t - 0.1; a[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-tt * 7) * Math.min(1, tt * 300); } break;
    }
    case 'errou': {
      a = buf(1.6); const nts = [392, 370, 349, 330];
      for (let i = 0; i < a.length; i++) { const t = i / SR; const k = Math.min(3, Math.floor(t / 0.35)); const tt = t - k * 0.35; const vib = k === 3 ? Math.sin(t * 30) * 6 : 0; a[i] = (Math.sign(Math.sin(2 * Math.PI * (nts[k] + vib) * t)) * 0.3 + Math.sin(2 * Math.PI * nts[k] * t) * 0.5) * Math.exp(-tt * (k === 3 ? 1.5 : 4)); } break;
    }
    case 'suspense': {
      a = buf(2.5); const lp = new Biquad('lp', 200);
      for (let i = 0; i < a.length; i++) { const t = i / SR; a[i] = (Math.sin(2 * Math.PI * 55 * t) + Math.sin(2 * Math.PI * 58.3 * t) + lp.run(r()) * 2) * Math.min(1, t * 2) * Math.exp(-Math.max(0, t - 1.8) * 4) * 0.4; } break;
    }
    case 'batida': {
      a = buf(1.6);
      for (let i = 0; i < a.length; i++) { const t = i / SR; let v = 0; for (const h of [0, 0.22, 0.8, 1.02]) if (t >= h) { const tt = t - h; v += Math.sin(2 * Math.PI * (55 + 40 * Math.exp(-tt * 30)) * tt) * Math.exp(-tt * 14); } a[i] = v; } break;
    }
    case 'bolha': {
      a = buf(0.25); let ph = 0;
      for (let i = 0; i < a.length; i++) { const t = i / SR; ph += 2 * Math.PI * (400 + 1800 * t / 0.25) / SR; a[i] = Math.sin(ph) * Math.exp(-t * 18) * Math.min(1, t * 400); } break;
    }
    case 'mola': {
      a = buf(0.9); let ph = 0;
      for (let i = 0; i < a.length; i++) { const t = i / SR; ph += 2 * Math.PI * (220 + 160 * Math.sin(t * 40) * Math.exp(-t * 3)) / SR; a[i] = Math.sin(ph) * Math.exp(-t * 3.5); } break;
    }
    case 'laser': {
      a = buf(0.35); let ph = 0;
      for (let i = 0; i < a.length; i++) { const t = i / SR; ph += 2 * Math.PI * (2400 * Math.exp(-t * 9) + 200) / SR; a[i] = Math.sign(Math.sin(ph)) * 0.35 * Math.exp(-t * 6); } break;
    }
    case 'apito': {
      a = buf(0.9);
      for (let i = 0; i < a.length; i++) { const t = i / SR; const f = 2800 + 120 * Math.sin(t * 2 * Math.PI * 28); a[i] = Math.sin(2 * Math.PI * f * t) * (t < 0.8 ? Math.min(1, t * 50) : (0.9 - t) * 10) * 0.6; } break;
    }
    case 'buzina': {
      a = buf(0.8);
      for (let i = 0; i < a.length; i++) { const t = i / SR; a[i] = (Math.sign(Math.sin(2 * Math.PI * 415 * t)) + Math.sign(Math.sin(2 * Math.PI * 523 * t))) * 0.25 * (t < 0.7 ? Math.min(1, t * 80) : (0.8 - t) * 10); } break;
    }
    case 'sirene': {
      a = buf(2.4); let ph = 0;
      for (let i = 0; i < a.length; i++) { const t = i / SR; ph += 2 * Math.PI * (700 + 400 * Math.sin(2 * Math.PI * 1.2 * t)) / SR; a[i] = Math.sin(ph) * 0.5 * Math.min(1, t * 20) * Math.min(1, (2.4 - t) * 10); } break;
    }
    case 'scratch': {
      a = buf(0.5); const bp = new Biquad('bp', 1000, 2);
      for (let i = 0; i < a.length; i++) { const t = i / a.length; const sp = Math.sin(t * Math.PI * 3); bp.set('bp', 400 + 2500 * Math.abs(sp), 3); a[i] = bp.run(r()) * Math.abs(sp) * 1.4; } break;
    }
    case 'bip': {
      a = buf(0.6);
      for (let i = 0; i < a.length; i++) { const t = i / SR; a[i] = Math.sin(2 * Math.PI * 1000 * t) * 0.6 * Math.min(1, t * 300) * Math.min(1, (0.6 - t) * 300); } break;
    }
    case 'risada': {
      a = buf(2.2); const bp = new Biquad('bp', 700, 1); const voices = [];
      for (let v = 0; v < 14; v++) voices.push({ f: 4 + (r() + 1) * 2.5, o: (r() + 1) * 3, d: (r() + 1) * 0.4 });
      for (let i = 0; i < a.length; i++) { const t = i / SR; let e = 0; for (const v of voices) if (t > v.d) e += Math.max(0, Math.sin(2 * Math.PI * v.f * t + v.o)) ** 3; a[i] = bp.run(r()) * e * Math.min(1, t * 3) * Math.exp(-Math.max(0, t - 1.4) * 3) * 0.3; } break;
    }
    case 'uau': {
      a = buf(1.8); const bp = new Biquad('bp', 500, 1.5);
      for (let i = 0; i < a.length; i++) { const t = i / SR; bp.set('bp', 400 + 600 * Math.sin(Math.PI * Math.min(1, t / 1.2)), 1.5); a[i] = bp.run(r()) * Math.sin(Math.PI * Math.min(1, t / 1.8)) * 1.5; } break;
    }
    case 'gota': {
      a = buf(0.3); let ph = 0;
      for (let i = 0; i < a.length; i++) { const t = i / SR; ph += 2 * Math.PI * (1400 * Math.exp(-t * 20) + 600) / SR; a[i] = Math.sin(ph) * Math.exp(-t * 22); } break;
    }
    case 'passos': {
      a = buf(1.8); const lp = new Biquad('lp', 500);
      for (let i = 0; i < a.length; i++) { const t = i / SR; const k = t % 0.45; a[i] = lp.run(r()) * Math.exp(-k * 35) * 2.2 * (t < 1.8 ? 1 : 0); } break;
    }
    default: a = buf(0.05);
  }
  normalize(a, 0.85);
  cache.set(type, a);
  return a;
}

// --------------------------------------------------------------------------
// batida automática (124-128 bpm): kick, clap, chimbal e baixo serrilhado
// --------------------------------------------------------------------------
export const BEAT_STYLES = [{ id: 'funk', name: 'Pancada' }, { id: 'tenso', name: 'Tensão' }, { id: 'leve', name: 'Leve' }, { id: 'animado', name: 'Animado (aula)' }, { id: 'calmo', name: 'Calmo' }];

// música de fundo com acordes (para aulas, vlog, institucional)
function makeMusic(bpm, seconds, style) {
  const a = buf(seconds), beat = 60 / bpm, r = rng(7);
  const prog = style === 'calmo' ? [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]] : [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const melody = [0, 2, 4, 2, 7, 4, 2, 0, 4, 5, 7, 9, 7, 4, 2, 4];
  const lp = new Biquad('lp', style === 'calmo' ? 1400 : 2600), hp = new Biquad('hp', 7000), cbp = new Biquad('bp', 1600, .8);
  for (let i = 0; i < a.length; i++) {
    const t = i / SR, b = t / beat, bar = Math.floor(b / 4), ch = prog[bar % 4], inB = (b % 1) * beat;
    let v = 0;
    // pad / pluck de acordes
    for (const n of ch) {
      const f = hz(n);
      if (style === 'calmo') v += Math.sin(2 * Math.PI * f * t) * 0.09 + Math.sin(2 * Math.PI * f * 2.001 * t) * 0.03;
      else { const ph = (b * 2) % 1 * beat / 2; v += Math.sin(2 * Math.PI * f * t) * Math.exp(-ph * 6) * 0.12; }
    }
    // baixo
    v += Math.sin(2 * Math.PI * hz(ch[0] - 24) * t) * (style === 'calmo' ? 0.12 : 0.22 * Math.exp(-inB * 3));
    if (style !== 'calmo') {
      // melodia simples (marimba)
      const step = Math.floor(b * 2), m = melody[step % 16], ph = (b * 2 % 1) * beat / 2;
      if (step % 2 === 0 || step % 16 > 8) v += Math.sin(2 * Math.PI * hz(ch[0] + 12 + m) * t) * Math.exp(-ph * 9) * 0.13;
      // bateria leve
      if (Math.floor(b) % 1 === 0) { const f = 50 + 90 * Math.exp(-inB * 35); v += Math.sin(2 * Math.PI * f * inB) * Math.exp(-inB * 9) * 0.5; }
      if (Math.floor(b) % 2 === 1) v += cbp.run(r()) * Math.exp(-inB * 25) * 0.35; else cbp.run(0);
      v += hp.run(r()) * Math.exp(-((b * 2) % 1) * beat / 2 * 70) * 0.12;
    }
    a[i] = lp.run(v);
  }
  const f = Math.min(a.length / 2, SR * 1.5);
  for (let i = 0; i < f; i++) { a[i] *= i / f; a[a.length - 1 - i] *= i / f; }
  return normalize(a, 0.75);
}

export function makeBeat(bpm, seconds, style = 'funk') {
  if (style === 'animado' || style === 'calmo') return makeMusic(style === 'calmo' ? Math.min(bpm, 90) : bpm, seconds, style);
  const a = buf(seconds);
  const beat = 60 / bpm, r = rng(42);
  const hp = new Biquad('hp', 7000), cbp = new Biquad('bp', 1500, 0.7), blp = new Biquad('lp', 600);
  const roots = style === 'tenso' ? [41.2, 41.2, 43.65, 38.9] : style === 'leve' ? [55, 49, 61.7, 46.2] : [55, 55, 65.4, 49];
  let bph = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / SR, b = t / beat, inBeat = (b % 1) * beat, bar = Math.floor(b / 4);
    let s = 0;
    // kick
    if (style !== 'leve' || Math.floor(b) % 2 === 0) { const f = 50 + 110 * Math.exp(-inBeat * 30); s += Math.sin(2 * Math.PI * f * inBeat) * Math.exp(-inBeat * 7) * 0.9; }
    // clap nos tempos 2 e 4
    if (Math.floor(b) % 2 === 1) s += cbp.run(r()) * Math.exp(-inBeat * 22) * 0.9; else cbp.run(0);
    // chimbal nos contratempos
    const half = (b * 2) % 1 * beat / 2;
    s += hp.run(r()) * Math.exp(-half * 60) * (style === 'tenso' ? 0.35 : 0.25);
    // baixo serrilhado
    const root = roots[bar % roots.length];
    bph += root / SR;
    const saw = 2 * (bph % 1) - 1;
    const gate = Math.exp(-((b * 2) % 1) * beat * 6);
    s += blp.run(saw) * gate * (style === 'leve' ? 0.25 : 0.4);
    a[i] = s;
  }
  // fade nas pontas
  const f = Math.min(a.length / 2, SR * 0.5);
  for (let i = 0; i < f; i++) { a[i] *= i / f; a[a.length - 1 - i] *= i / f; }
  return normalize(a, 0.8);
}

// --------------------------------------------------------------------------
// análise
// --------------------------------------------------------------------------
// envelope em dB a cada 20 ms (de áudio mono)
export function envelope(mono, sr, hop = 0.02) {
  const n = Math.max(1, Math.floor(mono.length / (sr * hop)));
  const out = new Float32Array(n), w = Math.floor(sr * hop);
  for (let k = 0; k < n; k++) {
    let s = 0; const o = k * w;
    for (let i = 0; i < w; i++) { const v = mono[o + i] || 0; s += v * v; }
    out[k] = 10 * Math.log10(s / w + 1e-10);
  }
  return out;
}

// trechos com fala (para cortar silêncios). env: dB a cada 20 ms. Devolve [{s,e}] em segundos da mídia.
export function speechRanges(env, inS, outS, sens = 0.5) {
  const hop = 0.02;
  const a = Math.floor(inS / hop), b = Math.min(env.length, Math.ceil(outS / hop));
  const seg = Array.from(env.slice(a, b)).sort((x, y) => x - y);
  if (!seg.length) return [{ s: inS, e: outS }];
  const floor = seg[Math.floor(seg.length * 0.1)], peak = seg[Math.floor(seg.length * 0.95)];
  const th = Math.max(floor + 6, Math.min(peak - 12, -50 + 22 * sens)) ;
  const minSil = 0.35 - sens * 0.15, pad = 0.09;
  const ranges = [];
  let start = null, lastVoice = -1;
  for (let k = a; k < b; k++) {
    const t = k * hop;
    if (env[k] > th) { if (start == null) start = t; lastVoice = t; }
    else if (start != null && t - lastVoice > minSil) { ranges.push({ s: start, e: lastVoice + hop }); start = null; }
  }
  if (start != null) ranges.push({ s: start, e: Math.min(outS, lastVoice + hop) });
  const out = [];
  for (const r of ranges) {
    const s = Math.max(inS, r.s - pad), e = Math.min(outS, r.e + pad);
    if (e - s < 0.12) continue;
    if (out.length && s - out[out.length - 1].e < 0.05) out[out.length - 1].e = e; else out.push({ s, e });
  }
  return out.length ? out : [{ s: inS, e: outS }];
}

// --------------------------------------------------------------------------
// loudness (ITU-R BS.1770, aproximado) e limitador
// --------------------------------------------------------------------------
function kweight(x) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, w1 = 0, w2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    const s1 = 1.53512485958697 * v - 2.69169618940638 * x1 + 1.19839281085285 * x2 + 1.69065929318241 * y1 - 0.73248077421585 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = s1;
    const s2 = s1 - 2 * z1 + z2 + 1.99004745483398 * w1 - 0.99007225036621 * w2;
    z2 = z1; z1 = s1; w2 = w1; w1 = s2;
    y[i] = s2;
  }
  return y;
}

export function lufs(chans) {
  const k = chans.map(kweight);
  const blk = Math.floor(SR * 0.4), step = Math.floor(SR * 0.1);
  const powers = [];
  for (let o = 0; o + blk <= k[0].length; o += step) {
    let s = 0;
    for (const c of k) { for (let i = o; i < o + blk; i++) s += c[i] * c[i]; }
    powers.push(s / blk);
  }
  if (!powers.length) return -70;
  const L = p => -0.691 + 10 * Math.log10(p + 1e-12);
  let g = powers.filter(p => L(p) > -70);
  if (!g.length) return -70;
  const rel = L(g.reduce((a, b) => a + b, 0) / g.length) - 10;
  g = g.filter(p => L(p) > rel);
  return L(g.reduce((a, b) => a + b, 0) / g.length);
}

export function limit(chans, ceilingDb = -1) {
  const thr = Math.pow(10, ceilingDb / 20);
  const n = chans[0].length, look = Math.floor(SR * 0.005);
  const req = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0; for (const c of chans) m = Math.max(m, Math.abs(c[i]));
    req[i] = m > thr ? thr / m : 1;
  }
  // mínimo nos próximos "look" amostras (fila monotônica)
  const mn = new Float32Array(n); const dq = []; let head = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (dq.length > head && req[dq[dq.length - 1]] >= req[i]) dq.pop();
    dq.push(i);
    while (dq[head] > i + look) head++;
    mn[i] = req[dq[head]];
    if (head > 4096) { dq.splice(0, head); head = 0; }
  }
  // suaviza (média móvel causal) + soltura
  let acc = 0; const g = new Float32Array(n); let prev = 1;
  for (let i = 0; i < n; i++) {
    acc += mn[i]; if (i >= look) acc -= mn[i - look];
    const v = acc / Math.min(i + 1, look);
    prev = v < prev ? v : prev + (v - prev) * 0.0008;
    g[i] = prev;
  }
  for (const c of chans) for (let i = 0; i < n; i++) c[i] *= g[i];
}

// --------------------------------------------------------------------------
// ducking: ganho da música a partir da voz (blocos de 50 ms)
// --------------------------------------------------------------------------
export function duckCurve(voice, total, amount = 0.2) {
  const hop = Math.floor(SR * 0.05), nb = Math.ceil(total / hop);
  const g = new Float32Array(total);
  let cur = 1;
  for (let b = 0; b < nb; b++) {
    let s = 0; const o = b * hop;
    for (let i = 0; i < hop && o + i < total; i++) { const v = voice[o + i]; s += v * v; }
    const db = 10 * Math.log10(s / hop + 1e-10);
    const want = db > -38 ? amount : 1;
    for (let i = 0; i < hop && o + i < total; i++) {
      cur += (want - cur) * (want < cur ? 0.0012 : 0.00012);
      g[o + i] = cur;
    }
  }
  return g;
}

export function resample(src, srIn, srOut) {
  if (srIn === srOut) return src;
  const n = Math.floor(src.length * srOut / srIn), out = new Float32Array(n), k = srIn / srOut;
  if (k > 1.5) {
    // reduzindo: média em caixa para evitar serrilhado
    for (let i = 0; i < n; i++) {
      const a = Math.floor(i * k), b = Math.min(src.length, Math.floor((i + 1) * k));
      let s = 0; for (let j = a; j < b; j++) s += src[j]; out[i] = s / Math.max(1, b - a);
    }
  } else {
    for (let i = 0; i < n; i++) { const x = i * k, j = Math.floor(x), f = x - j; out[i] = (src[j] || 0) * (1 - f) + (src[j + 1] || 0) * f; }
  }
  return out;
}
