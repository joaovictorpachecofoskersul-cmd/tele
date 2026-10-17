// Cartelas animadas de datas e dados (estilo do vídeo "não podemos esquecer nossa história").
// Fundos: papel antigo, escuro (vinho), dourado com "$" caindo, ou por cima do vídeo.
import { cssFont } from './fonts.js';

const cl = x => Math.max(0, Math.min(1, x));
export const eio = x => { x = cl(x); return x * x * (3 - 2 * x); };
export const eout = x => { x = cl(x); return 1 - Math.pow(1 - x, 3); };
export const eback = x => { x = cl(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// paletas por fundo
export const PAL = {
  papel: { bg: '#ECE0C4', text: '#281C14', accent: '#821414', note: '#5A3C28', alt: '#821414' },
  escuro: { bg: '#16080A', text: '#FFFFFF', accent: '#EB1E28', note: '#D2D2D2', alt: '#FFDE00' },
  dourado: { bg: '#1E1604', text: '#FFFFFF', accent: '#FFDE00', note: '#E8D9A8', alt: '#FFDE00' },
  video: { bg: 'rgba(0,0,0,.6)', text: '#FFFFFF', accent: '#EB1E28', note: '#E5E5E5', alt: '#FFDE00' },
};
export const BG_CHOICES = [{ id: 'papel', name: 'Papel antigo' }, { id: 'escuro', name: 'Escuro' }, { id: 'dourado', name: 'Dourado ($)' }, { id: 'video', name: 'Sobre o vídeo' }];

// ------------------------------------------------------------------ fundos
const paperCache = new Map();
function paper(W, H) {
  const key = W + 'x' + H;
  if (paperCache.has(key)) return paperCache.get(key);
  const w = Math.max(64, Math.round(W / 2)), h = Math.max(64, Math.round(H / 2));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const img = x.createImageData(w, h), d = img.data;
  // ruído grosso (blocos suavizados) + ruído fino
  const gw = Math.ceil(w / 6), gh = Math.ceil(h / 6), g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = hash(i * 1.37 + 3) * 2 - 1;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const fx = xx / 6, fy = yy / 6, ix = Math.min(gw - 2, Math.floor(fx)), iy = Math.min(gh - 2, Math.floor(fy)), ax = fx - ix, ay = fy - iy;
    const n = (g[iy * gw + ix] * (1 - ax) + g[iy * gw + ix + 1] * ax) * (1 - ay) + (g[(iy + 1) * gw + ix] * (1 - ax) + g[(iy + 1) * gw + ix + 1] * ax) * ay;
    const fine = (hash(xx * 7.1 + yy * 13.7) * 2 - 1) * 6;
    const dx = (xx - w / 2) / w, dy = (yy - h / 2) / h, dd = dx * dx + dy * dy;
    const vig = 1 - 0.55 * dd * 2.2;
    const k = (yy * w + xx) * 4;
    d[k] = Math.max(0, Math.min(255, (236 + n * 10 + fine) * vig));
    d[k + 1] = Math.max(0, Math.min(255, (224 + n * 10 + fine) * vig));
    d[k + 2] = Math.max(0, Math.min(255, (196 + n * 10 + fine) * vig));
    d[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  paperCache.set(key, c);
  return c;
}

export function drawBg(ctx, bg, W, H, local, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (bg === 'papel') {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(paper(W, H), 0, 0, W, H);
  } else if (bg === 'escuro' || bg === 'dourado') {
    ctx.fillStyle = bg === 'escuro' ? 'rgb(22,8,10)' : 'rgb(30,22,4)'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.62);
    g.addColorStop(0, bg === 'escuro' ? 'rgba(120,20,26,.55)' : 'rgba(110,80,10,.5)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.7)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (bg === 'dourado') money(ctx, W, H, local);
  } else if (bg === 'video') {
    ctx.fillStyle = 'rgba(0,0,0,.58)'; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

export function money(ctx, W, H, local) {
  const U = Math.min(W, H);
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 26; i++) {
    const sz = U * (0.046 + 0.065 * hash(i * 3.1)), sp = U * (0.074 + 0.13 * hash(i * 5.7));
    const x = hash(i * 1.9) * W, y = ((hash(i * 2.3) * (H + sz * 2)) + local * sp) % (H + sz * 2) - sz;
    ctx.globalAlpha = 0.27;
    ctx.font = cssFont('Poppins', sz, 900); ctx.fillStyle = '#E7B416';
    ctx.save(); ctx.translate(x, y); ctx.rotate((hash(i) - 0.5) * 0.6 + Math.sin(local + i) * 0.1); ctx.fillText('$', 0, 0); ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ texto
function fitFont(ctx, txt, size, maxw, weight = 900, family = 'Poppins') {
  let s = size;
  ctx.font = cssFont(family, s, weight);
  while (ctx.measureText(txt).width > maxw && s > 12) { s *= 0.94; ctx.font = cssFont(family, s, weight); }
  return s;
}

function txt(ctx, s, x, y, size, color, { weight = 900, maxw, alpha = 1, scale = 1, shadow = false, family = 'Poppins', align = 'center' } = {}) {
  if (!s || alpha <= 0) return 0;
  s = String(s).toLocaleUpperCase('pt-BR');
  ctx.save();
  const sz = fitFont(ctx, s, size, maxw || 1e9, weight, family);
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = sz * 0.12; ctx.shadowOffsetY = sz * 0.04; }
  ctx.fillStyle = color; ctx.fillText(s, 0, 0);
  ctx.restore();
  return sz;
}

function footer(ctx, q, pal, W, H, a) {
  if (!q.fonte) return;
  const U = Math.min(W, H);
  ctx.save(); ctx.globalAlpha *= a * 0.9;
  const s = U * 0.024;
  ctx.font = cssFont('Poppins', s, 600); ctx.fillStyle = pal.note; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText(q.fonte, W / 2, H - Math.max(H * 0.2, U * 0.06));
  ctx.restore();
}

function lifecycle(it, t) {
  const local = (t - it.start) * (it.p.speed || 1);
  const a = cl((t - it.start) / 0.25), b = cl((it.start + it.dur - t) / 0.25);
  return { local, a, b };
}

function frame(ctx, it, t, W, H, fn) {
  const q = it.p, pal = PAL[q.bg] || PAL.escuro;
  const { local, a, b } = lifecycle(it, t);
  ctx.save();
  ctx.globalAlpha = Math.min(a, b);
  drawBg(ctx, q.bg || 'escuro', W, H, local);
  const U = Math.min(W, H);
  const cx = W / 2, cy = H * (q.y ?? 0.42);
  fn({ q, pal, local, U, cx, cy, mw: Math.min(W * 0.9, U * 1.1) });
  footer(ctx, q, pal, W, H, 1);
  ctx.restore();
  return { x: 0, y: 0, w: W, h: H };
}

const fmtNum = (v, dec = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

// ------------------------------------------------------------------ cartelas
export const CARTELA_DRAW = {
  c_year(ctx, it, t, W, H) {
    return frame(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, mw }) => {
      const k = eio(local / (q.dur2 || 2.6));
      const v = Math.round((q.from ?? 1500) + ((q.to ?? 2026) - (q.from ?? 1500)) * k);
      txt(ctx, q.label, cx, cy - U * 0.2, U * 0.045, pal.text, { alpha: cl(local / 0.3), maxw: mw });
      txt(ctx, String(v), cx, cy, U * 0.26, pal.text, { scale: 0.9 + 0.1 * eback(local / 0.4), maxw: mw });
      txt(ctx, q.sub, cx, cy + U * 0.17, U * 0.034, pal.accent, { alpha: cl((local - 1.2) / 0.3), maxw: mw });
    });
  },

  c_period(ctx, it, t, W, H) {
    return frame(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, mw }) => {
      txt(ctx, q.top, cx, cy - U * 0.2, U * 0.1, pal.text, { alpha: cl(local / 0.3), maxw: mw });
      const bw = Math.min(W * 0.84, U * 0.84) * eio(local / 1.6), bh = U * 0.035;
      ctx.fillStyle = pal.accent; ctx.fillRect(cx - Math.min(W * 0.84, U * 0.84) / 2, cy - U * 0.11, bw, bh);
      txt(ctx, q.big, cx, cy + U * 0.02, U * 0.15, pal.accent, { scale: 0.75 + 0.25 * eback((local - 1.5) / 0.3), alpha: cl((local - 1.5) / 0.15), maxw: mw });
      txt(ctx, q.line2, cx, cy + U * 0.14, U * 0.06, pal.text, { alpha: cl((local - 2.2) / 0.3), maxw: mw });
      txt(ctx, q.note, cx, cy + U * 0.21, U * 0.026, pal.note, { weight: 700, alpha: cl((local - 3.2) / 0.3), maxw: mw });
    });
  },

  c_date(ctx, it, t, W, H) {
    return frame(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, mw }) => {
      txt(ctx, q.top, cx, cy - U * 0.16, U * 0.04, pal.text, { alpha: cl(local / 0.3), maxw: mw });
      txt(ctx, q.year, cx, cy, U * 0.24, pal.text, { scale: 0.15 + 0.85 * eback(local / 0.45), alpha: cl(local / 0.12), maxw: mw });
      txt(ctx, q.title, cx, cy + U * 0.155, U * 0.048, pal.accent, { alpha: cl((local - 0.8) / 0.3), maxw: mw });
      txt(ctx, q.title2, cx, cy + U * 0.215, U * 0.06, pal.alt === pal.accent ? pal.text : pal.alt, { alpha: cl((local - 1.1) / 0.3), maxw: mw });
    });
  },

  c_timeline(ctx, it, t, W, H) {
    return frame(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, mw }) => {
      const a0 = +q.start || 1889, a1 = +q.end || 2026;
      const segs = String(q.segs || '').split(/[,;]/).map(s => s.split(/[-a]/).map(x => parseFloat(x))).filter(s => s.length === 2 && isFinite(s[0]) && isFinite(s[1]));
      txt(ctx, q.title, cx, cy - U * 0.27, U * 0.05, pal.text, { alpha: cl(local / 0.3), maxw: mw });
      txt(ctx, `${a0} > ${a1}`, cx, cy - U * 0.215, U * 0.03, pal.note, { alpha: cl(local / 0.3), maxw: mw });
      const x0 = cx - Math.min(W * 0.86, U * 0.86) / 2, x1 = cx + Math.min(W * 0.86, U * 0.86) / 2, y0 = cy - U * 0.13, y1 = cy + U * 0.02;
      const X = ano => x0 + (x1 - x0) * (ano - a0) / (a1 - a0);
      ctx.save(); ctx.globalAlpha *= cl(local / 0.3);
      ctx.strokeStyle = pal === PAL.papel ? '#5A3C28' : '#787878'; ctx.lineWidth = U * 0.004;
      roundRect(ctx, x0, y0, x1 - x0, y1 - y0, U * 0.015); ctx.stroke();
      const pad = U * 0.004;
      const firstSeg = segs.length ? segs[0][0] : a1;
      const p = eio(local / 2.5);
      ctx.fillStyle = pal === PAL.papel ? '#8C7B66' : '#5F5F69';
      ctx.fillRect(x0 + pad, y0 + pad, (X(firstSeg) - x0 - pad) * p, y1 - y0 - pad * 2);
      const t2 = q.t2 != null && q.t2 !== '' ? +q.t2 : 5.8;
      if (local > t2) {
        const qq = eio((local - t2) / 0.8);
        ctx.fillStyle = '#5F5F69';
        for (let i = 0; i < segs.length - 1; i++) ctx.fillRect(X(segs[i][1]), y0 + pad, (X(segs[i + 1][0]) - X(segs[i][1])) * qq, y1 - y0 - pad * 2);
        ctx.fillStyle = q.segColor || '#EB1E28';
        for (const [s, e] of segs) ctx.fillRect(X(s), y0 + pad, (X(e) - X(s)) * qq, y1 - y0 - pad * 2);
      }
      ctx.restore();
      const after = local > t2 + 0.6;
      if (!after) {
        txt(ctx, q.line1, cx, cy + U * 0.09, U * 0.045, pal.text, { alpha: cl((local - 1.2) / 0.3), maxw: mw });
        txt(ctx, q.line2, cx, cy + U * 0.14, U * 0.028, pal.note, { weight: 700, alpha: cl((local - 1.4) / 0.3), maxw: mw });
      } else {
        txt(ctx, q.segLabel, cx, cy + U * 0.075, U * 0.03, q.segColor || pal.accent, { alpha: cl((local - t2 - 0.6) / 0.3), maxw: mw });
        txt(ctx, q.segLine, cx, cy + U * 0.125, U * 0.045, pal.text, { alpha: cl((local - t2 - 0.8) / 0.3), maxw: mw });
      }
    });
  },

  c_two(ctx, it, t, W, H) {
    return frame(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, mw }) => {
      txt(ctx, q.l1, cx, cy - U * 0.22, U * 0.05, pal.text, { alpha: cl(local / 0.3), maxw: mw });
      txt(ctx, q.l2, cx, cy - U * 0.15, U * 0.075, pal.accent, { alpha: cl((local - 0.2) / 0.3), maxw: mw });
      const off = Math.min(W * 0.24, U * 0.24);
      txt(ctx, q.a, cx - off, cy + U * 0.04, U * 0.16, pal.text, { scale: 0.2 + 0.8 * eback((local - 0.5) / 0.4), alpha: cl((local - 0.5) / 0.1), maxw: W * 0.44 });
      txt(ctx, q.b, cx + off, cy + U * 0.04, U * 0.16, pal.alt, { scale: 0.2 + 0.8 * eback((local - 1.2) / 0.4), alpha: cl((local - 1.2) / 0.1), maxw: W * 0.44 });
      txt(ctx, q.la, cx - off, cy + U * 0.15, U * 0.03, pal.note, { weight: 700, alpha: cl((local - 0.7) / 0.3), maxw: W * 0.44 });
      txt(ctx, q.lb, cx + off, cy + U * 0.15, U * 0.03, pal.note, { weight: 700, alpha: cl((local - 1.4) / 0.3), maxw: W * 0.44 });
      txt(ctx, q.note, cx, cy + U * 0.23, U * 0.028, pal.note, { weight: 700, alpha: cl((local - 1.9) / 0.3), maxw: mw });
    });
  },

  c_list(ctx, it, t, W, H) {
    return frame(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, mw }) => {
      txt(ctx, q.title, cx, cy - U * 0.3, U * 0.07, pal.text, { scale: 0.75 + 0.25 * eback(local / 0.3), maxw: mw });
      const items = String(q.items || '').split('\n').map(s => s.trim()).filter(Boolean);
      const step = q.step ? +q.step : Math.max(0.6, (it.dur / (it.p.speed || 1) - 1) / Math.max(1, items.length));
      let y = cy - U * 0.17;
      items.forEach((line, i) => {
        const k = cl((local - 0.6 - i * step) / 0.35);
        if (k <= 0) return;
        const [head, ...rest] = line.split('·');
        const body = rest.join('·').split('/').map(s => s.trim()).filter(Boolean);
        ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, (1 - eout(k)) * U * 0.04);
        txt(ctx, head.trim(), cx, y, U * 0.055, pal.accent, { maxw: mw });
        body.forEach((b, j) => txt(ctx, b, cx, y + U * 0.06 + j * U * 0.045, U * 0.038, pal.text, { maxw: mw, weight: 800 }));
        ctx.restore();
        y += U * 0.1 + body.length * U * 0.045;
      });
    });
  },

  c_phrase(ctx, it, t, W, H) {
    return frame(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, mw }) => {
      txt(ctx, q.l1, cx, cy - U * 0.06, U * 0.085, pal.text, { scale: 0.75 + 0.25 * eback(local / 0.3), alpha: cl(local / 0.1), maxw: mw, shadow: true });
      txt(ctx, q.l2, cx, cy + U * 0.06, U * 0.12, pal.accent, { scale: 0.75 + 0.25 * eback((local - 0.35) / 0.3), alpha: cl((local - 0.35) / 0.1), maxw: mw, shadow: true });
    });
  },

  c_quote(ctx, it, t, W, H) {
    return frame(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, mw }) => {
      txt(ctx, '“', cx - mw * 0.4, cy - U * 0.2, U * 0.25, pal.accent, { family: 'Montserrat', alpha: cl(local / 0.3) });
      ctx.save(); ctx.globalAlpha *= cl((local - 0.2) / 0.4);
      ctx.font = cssFont('Poppins', U * 0.055, 800); ctx.fillStyle = pal.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lines = wrapLines(ctx, String(q.text || ''), mw * 0.9);
      lines.forEach((l, i) => ctx.fillText(l, cx, cy - (lines.length - 1) * U * 0.035 + i * U * 0.07));
      ctx.restore();
      txt(ctx, q.author, cx, cy + lines.length * U * 0.035 + U * 0.07, U * 0.032, pal.accent, { weight: 800, alpha: cl((local - 0.9) / 0.3), maxw: mw });
    });
  },

  c_final(ctx, it, t, W, H) {
    return frame(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, mw }) => {
      txt(ctx, q.l1, cx, cy - U * 0.12, U * 0.085, pal.text, { scale: 0.75 + 0.25 * eback((local - 0.2) / 0.3), alpha: cl((local - 0.2) / 0.1), maxw: mw, shadow: true });
      txt(ctx, q.l2, cx, cy - U * 0.02, U * 0.11, pal.accent, { scale: 0.75 + 0.25 * eback((local - 0.4) / 0.3), alpha: cl((local - 0.4) / 0.1), maxw: mw, shadow: true });
      txt(ctx, q.cta1, cx, cy + U * 0.12, U * 0.06, pal.alt, { scale: 0.75 + 0.25 * eback((local - 1.1) / 0.3), alpha: cl((local - 1.1) / 0.1), maxw: mw, shadow: true });
      if (q.cta2 && local > 1.7) ctaPill(ctx, cx, cy + U * 0.25, U, local - 1.7, q.cta2, q.pillColor || '#EB1E28');
    });
  },
};

function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const test = line ? line + ' ' + w : w;
      if (line && ctx.measureText(test).width > maxW) { out.push(line); line = w; } else line = test;
    }
    if (line) out.push(line);
  }
  return out;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function star(ctx, x, y, r, color, inner = 0.42) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 === 0 ? r : r * inner;
    ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}

// Pílula "SEGUE O PERFIL" com estrela pulsando (lt = tempo desde que entrou)
export function ctaPill(ctx, cx, cy, U, lt, text, color = '#EB1E28', sub = '') {
  const q = eback(lt / 0.35);
  const sc = q * (1 + 0.06 * Math.sin(lt * 10));
  const w = U * 0.76 * sc, h = U * 0.139 * sc;
  ctx.save();
  ctx.fillStyle = color; roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  star(ctx, cx - w / 2 + 0.62 * h, cy, 0.34 * h * (1 + 0.18 * Math.sin(lt * 12)), '#FFFFFF');
  ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(ctx, text, U * 0.057 * sc, w - h * 1.5, 900);
  ctx.font = cssFont('Poppins', fs, 900);
  ctx.fillText(String(text).toLocaleUpperCase('pt-BR'), cx + h * 0.3, cy + fs * 0.04);
  if (sub) {
    ctx.font = cssFont('Poppins', U * 0.046 * sc, 900);
    ctx.lineWidth = U * 0.008; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round';
    ctx.strokeText(String(sub).toLocaleUpperCase('pt-BR'), cx, cy + h * 0.95);
    ctx.fillText(String(sub).toLocaleUpperCase('pt-BR'), cx, cy + h * 0.95);
  }
  ctx.restore();
  return { x: cx - w / 2, y: cy - h / 2, w, h: h * (sub ? 1.6 : 1) };
}

// Catálogo
const C = (kind, name, p) => ({ kind, name, group: 'Cartelas', p: { bg: 'escuro', fonte: '', speed: 1, ...p }, full: true });
export const CARTELA_ELEMENTS = [
  C('c_year', 'Contador de ano', { bg: 'papel', label: 'BRASIL', from: 1500, to: 2026, dur2: 2.6, sub: 'MAIS DE 500 ANOS DE HISTÓRIA' }),
  C('c_period', 'Período com barra', { bg: 'papel', top: '1500 > 1888', big: '388 ANOS', line2: 'DE ESCRAVIDÃO', note: 'O ÚLTIMO PAÍS DAS AMÉRICAS A ABOLIR' }),
  C('c_date', 'Data com pop', { bg: 'papel', top: '15 DE NOVEMBRO DE', year: '1889', title: 'PROCLAMAÇÃO DA REPÚBLICA', title2: '' }),
  C('c_timeline', 'Barra do tempo', { title: 'LINHA DO TEMPO', start: 1900, end: 2026, segs: '1950-1970, 2000-2010', t2: 5.8, line1: 'MAIS DE 120 ANOS', line2: 'DE HISTÓRIA', segLabel: 'DESTAQUES: 1950 A 1970 E 2000 A 2010', segLine: 'CERCA DE 30 ANOS', segColor: '#EB1E28' }),
  C('c_two', 'Dois valores lado a lado', { l1: 'BRASIL FORA DO', l2: 'MAPA DA FOME', a: '2014', b: '2025', la: '', lb: '', note: 'SEGUNDO A ONU (FAO)' }),
  C('c_list', 'Lista de marcos', { title: 'MARCOS IMPORTANTES', items: '1990 · PRIMEIRO MARCO / UMA LINHA EXPLICANDO\n2005 · SEGUNDO MARCO / O QUE MUDOU\n2020 · TERCEIRO MARCO / RESULTADO', step: '' }),
  C('c_phrase', 'Frase de impacto', { bg: 'dourado', l1: 'CADA VEZ MAIS', l2: 'BILIONÁRIOS' }),
  C('c_quote', 'Citação com fonte', { text: 'Escreva aqui a frase de alguém.', author: 'NOME, ANO' }),
  C('c_final', 'Card final (frase + CTA)', { l1: 'SUA FRASE', l2: 'FORTE AQUI', cta1: 'COMENTA O QUE ACHOU', cta2: 'SEGUE O PERFIL', pillColor: '#EB1E28' }),
];
