// Legenda karaokê: monta as "páginas" (até N palavras) e desenha com a palavra ativa destacada.
import { layout } from './project.js';
import { cssFont } from './fonts.js';
import { drawMarker, defaultMarker } from './markers.js';

export const CAPTION_STYLES = [
  { id: 'karaoke', name: 'Karaokê' },
  { id: 'fill', name: 'Preenchendo' },
  { id: 'box', name: 'Caixa na palavra' },
  { id: 'one', name: 'Uma palavra gigante' },
  { id: 'classic', name: 'Clássica com fundo' },
  { id: 'neon', name: 'Neon' },
];

// Palavras da legenda já na linha do tempo do projeto
export function captionWords(p) {
  const L = layout(p);
  const out = [];
  p.clips.forEach((c, i) => {
    const words = p.transcripts[c.mid];
    if (!words || !words.length) return;
    const sp = c.speed || 1;
    for (let k = 0; k < words.length; k++) {
      const w = words[k];
      const mid = (w.s + w.e) / 2;
      if (mid < c.in || mid > c.out) continue;
      const s = L.starts[i] + (Math.max(w.s, c.in) - c.in) / sp;
      const e = L.starts[i] + (Math.min(w.e, c.out) - c.in) / sp;
      out.push({ w: w.w, start: s, end: Math.max(e, s + 0.06), strong: !!w.strong, mid: c.mid, k });
    }
  });
  // narrações / áudios soltos
  for (const it of p.items) {
    if (it.kind !== 'audio') continue;
    const words = p.transcripts[it.p.mid];
    if (!words) continue;
    const a = it.p.in || 0;
    for (let k = 0; k < words.length; k++) {
      const w = words[k];
      if (w.s < a || w.s > a + it.dur) continue;
      const s = it.start + (w.s - a), e = Math.min(it.start + it.dur, it.start + (w.e - a));
      out.push({ w: w.w, start: s, end: Math.max(e, s + 0.06), strong: !!w.strong, mid: it.p.mid, k });
    }
  }
  out.sort((x, y) => x.start - y.start);
  return out;
}

const PUNCT_END = /[.!?…:;]$/;
const COMMA = /,$/;

export function buildPages(p) {
  const words = captionWords(p);
  const cap = p.captions;
  const maxW = cap.style === 'one' ? 1 : (cap.maxWords || 3);
  const pages = [];
  let cur = [];
  const flush = () => { if (cur.length) { pages.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end }); cur = []; } };
  for (let i = 0; i < words.length; i++) {
    const w = words[i], prev = cur[cur.length - 1];
    if (prev && (w.start - prev.end > 0.45 || cur.length >= maxW || PUNCT_END.test(prev.w) || (COMMA.test(prev.w) && cur.length >= 2))) flush();
    const chars = cur.reduce((a, x) => a + x.w.length + 1, 0);
    if (cur.length && chars + w.w.length > 22) flush();
    cur.push(w);
  }
  flush();
  // a página fica na tela até a próxima começar (no máximo +0,6 s)
  for (let i = 0; i < pages.length; i++) {
    const next = pages[i + 1];
    pages[i].hold = next ? Math.min(next.start, pages[i].end + 0.6) : pages[i].end + 0.6;
  }
  return pages;
}

export function norm(w) { return String(w).toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N}]/gu, ''); }

function clean(w, upper) {
  const s = upper ? w.toLocaleUpperCase('pt-BR') : w;
  return s;
}

const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

function star(ctx, x, y, r, color) {
  ctx.save(); ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fillStyle = color; ctx.strokeStyle = '#000'; ctx.lineWidth = r * 0.25;
  ctx.stroke(); ctx.fill(); ctx.restore();
}

// Desenha a legenda do instante t. Devolve a caixa ocupada (para arrastar na prévia).
export function drawCaptions(ctx, p, pages, t, W, H, env = {}) {
  const cap = p.captions;
  if (!cap.on || !pages.length) return null;
  const page = pages.find(pg => t >= pg.start - 0.02 && t < pg.hold);
  if (!page) return null;
  const style = cap.style;
  let size = Math.min(W, H) * (style === 'one' ? 0.15 : 0.105) * (cap.size || 1);
  const font = cap.font || 'Poppins';
  ctx.save();
  ctx.font = cssFont(font, size, 900);
  ctx.textBaseline = 'middle';
  const gap = size * 0.28;
  // palavras fortes: marcadas uma a uma ou pela lista do projeto
  const strongSet = new Set(String(cap.strongList || '').split(/[,;\n]/).map(x => norm(x)).filter(Boolean));
  const words = page.words.map(w => ({ ...w, strong: w.strong || strongSet.has(norm(w.w)), txt: clean(w.w, cap.upper) }));
  // quebra em linhas
  const maxLine = W * 0.86;
  let lines = [[]], lw = [0];
  for (const w of words) {
    w.wd = ctx.measureText(w.txt).width;
    const L = lines.length - 1;
    if (lines[L].length && lw[L] + gap + w.wd > maxLine) { lines.push([]); lw.push(0); }
    const k = lines.length - 1;
    lw[k] += (lines[k].length ? gap : 0) + w.wd;
    lines[k].push(w);
  }
  // encolhe se alguma linha passar da largura
  const widest = Math.max(...lw);
  if (widest > maxLine) { const k = maxLine / widest; size *= k; ctx.font = cssFont(font, size, 900); for (const w of words) w.wd *= k; lw = lw.map(x => x * k); }
  const lineH = size * 1.18;
  const cx = cap.x * W, cy = cap.y * H;
  const top = cy - (lines.length - 1) * lineH / 2;
  const pageIn = Math.min(1, (t - page.start) / 0.12);
  const box = { x: cx - Math.max(...lw) / 2 - size * 0.3, y: top - lineH / 2, w: Math.max(...lw) + size * 0.6, h: lines.length * lineH };

  if (style === 'classic') {
    ctx.fillStyle = 'rgba(0,0,0,.62)';
    roundRect(ctx, box.x, box.y, box.w, box.h, size * 0.25); ctx.fill();
  }

  // posições de cada palavra
  const pos = [];
  lines.forEach((ln, li) => {
    let x = cx - lw[li] / 2;
    const y = top + li * lineH;
    for (const w of ln) { pos.push({ w, x: x + w.wd / 2, y, wd: w.wd }); x += w.wd + gap; }
  });
  // marcador que pula (estrelinha ou outro elemento)
  const mk = cap.marker && cap.marker.on ? cap.marker : (cap.star ? { ...defaultMarker(), on: true, color: cap.strong } : null);
  const ai = pos.findIndex(o => t >= o.w.start && t < o.w.end + 0.02);
  const marker = () => {
    if (!mk || ai < 0) return;
    const B = pos[ai], A = ai > 0 ? pos[ai - 1] : null;
    const pt = o => ({ x: o.x, y: o.y, w: o.wd, h: size });
    const strongAlt = B.w.strong && mk.strongType;
    drawMarker(ctx, mk, A ? pt(A) : { x: B.x, y: B.y - size * 1.2, w: B.wd, h: size }, pt(B), t - B.w.start, t, size,
      { type: strongAlt ? mk.strongType : mk.type, color: strongAlt ? (mk.strongColor || mk.color) : mk.color, image: mk.mid && env.image ? env.image(mk.mid) : null });
  };
  if (mk && mk.pos === 'atras') marker();

  for (const o of pos) {
    const w = o.w, wx = o.x, y = o.y;
    {
      const active = t >= w.start && t < w.end + 0.02;
      const past = t >= w.end;
      let col = cap.color;
      if (style === 'karaoke' && active && !(mk && mk.noColor)) col = cap.active;
      if (style === 'fill' && (active || past)) col = cap.active;
      if (style === 'one') col = cap.active;
      if (w.strong) col = cap.strong;
      let sc = 1;
      if (style === 'one') sc = 0.6 + 0.4 * easeOutBack(Math.min(1, (t - w.start) / 0.14));
      else if (active && style !== 'classic') sc = 1 + 0.1 * easeOutBack(Math.min(1, (t - w.start) / 0.1));
      sc *= 0.85 + 0.15 * easeOutBack(pageIn);
      ctx.save();
      ctx.translate(wx, y); ctx.scale(sc, sc);
      ctx.textAlign = 'center';
      if (style === 'box' && active) {
        ctx.fillStyle = cap.active;
        roundRect(ctx, -w.wd / 2 - size * 0.14, -size * 0.62, w.wd + size * 0.28, size * 1.2, size * 0.18); ctx.fill();
        col = w.strong ? cap.strong : '#000';
      }
      if (style === 'neon') {
        ctx.shadowColor = active ? cap.active : cap.color; ctx.shadowBlur = size * 0.5;
        ctx.fillStyle = active ? cap.active : cap.color; ctx.fillText(w.txt, 0, 0); ctx.shadowBlur = 0;
      } else {
        if (style !== 'classic' && !(style === 'box' && active)) {
          ctx.lineJoin = 'round'; ctx.miterLimit = 2;
          ctx.lineWidth = size * 0.17; ctx.strokeStyle = '#000';
          ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = size * 0.12; ctx.shadowOffsetY = size * 0.05;
          ctx.strokeText(w.txt, 0, 0);
          ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        }
        ctx.fillStyle = col; ctx.fillText(w.txt, 0, 0);
      }
      ctx.restore();
    }
  }
  if (mk && mk.pos !== 'atras') marker();
  ctx.restore();
  return box;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// legenda em .srt (para YouTube e outros): frases de até ~7 palavras / 42 letras
export function toSRT(p) {
  const words = captionWords(p);
  const subs = [];
  let cur = [];
  const flush = () => { if (cur.length) { subs.push({ a: cur[0].start, b: cur[cur.length - 1].end, t: cur.map(w => w.w).join(' ') }); cur = []; } };
  for (const w of words) {
    const prev = cur[cur.length - 1];
    const chars = cur.reduce((a, x) => a + x.w.length + 1, 0);
    if (prev && (w.start - prev.end > 0.6 || cur.length >= 7 || chars + w.w.length > 42 || /[.!?…]$/.test(prev.w))) flush();
    cur.push(w);
  }
  flush();
  const ts = x => {
    x = Math.max(0, x);
    const hh = Math.floor(x / 3600), mm = Math.floor(x / 60) % 60, ss = Math.floor(x) % 60, ms = Math.round((x - Math.floor(x)) * 1000) % 1000;
    const z = (n, k = 2) => String(n).padStart(k, '0');
    return `${z(hh)}:${z(mm)}:${z(ss)},${z(ms, 3)}`;
  };
  return subs.map((s, i) => {
    const b = Math.max(s.b, s.a + 0.3), next = subs[i + 1];
    return `${i + 1}\n${ts(s.a)} --> ${ts(next ? Math.min(b + 0.25, next.a) : b + 0.25)}\n${s.t}\n`;
  }).join('\n');
}
