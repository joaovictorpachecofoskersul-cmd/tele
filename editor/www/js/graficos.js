// Gráficos e números animados (motion graphics de dados).
// Todos aceitam fundo: nenhum (sobre o vídeo), escuro, papel, dourado ou vídeo escurecido; e "fonte" no rodapé.
import { cssFont } from './fonts.js';
import { drawBg, PAL, roundRect, eio, eout, eback } from './cartelas.js';

const cl = x => Math.max(0, Math.min(1, x));
const RED = '#EB1E28', YEL = '#FFDE00', GRAY = '#5F5F69';

function parseRows(text) {
  return String(text || '').split('\n').map(l => {
    const i = l.lastIndexOf(':');
    if (i < 0) return null;
    const v = parseFloat(l.slice(i + 1).replace(/\./g, '').replace(',', '.'));
    return { label: l.slice(0, i).trim(), v: isFinite(v) ? v : 0 };
  }).filter(r => r && r.label);
}
const fmt = (v, dec = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

function T(ctx, s, x, y, size, color, { weight = 900, align = 'center', maxw = 1e9, stroke = 0, alpha = 1 } = {}) {
  if (s == null || s === '' || alpha <= 0) return;
  s = String(s);
  let sz = size; ctx.font = cssFont('Poppins', sz, weight);
  while (ctx.measureText(s).width > maxw && sz > 10) { sz *= 0.93; ctx.font = cssFont('Poppins', sz, weight); }
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = sz * stroke; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
  ctx.restore();
}

function base(ctx, it, t, W, H, fn) {
  const q = it.p;
  const local = (t - it.start) * (q.speed || 1);
  const a = cl((t - it.start) / 0.25), b = cl((it.start + it.dur - t) / 0.25);
  const bg = q.bg || 'none';
  const pal = bg === 'none' ? PAL.video : (PAL[bg] || PAL.escuro);
  const U = Math.min(W, H);
  ctx.save();
  ctx.globalAlpha = Math.min(a, b);
  if (bg !== 'none') drawBg(ctx, bg, W, H, local);
  const stroke = bg === 'none' ? 0.14 : 0;            // sobre vídeo: contorno preto para ler
  const box = fn({ q, pal, local, U, cx: W * (q.x ?? 0.5), cy: H * (q.y ?? 0.45), mw: Math.min(W * 0.88, U * 1.1), stroke });
  if (q.fonte) T(ctx, q.fonte, W / 2, H - Math.max(H * 0.2, U * 0.06), U * 0.024, pal.note, { weight: 600, stroke: stroke ? 0.2 : 0 });
  ctx.restore();
  return box || { x: 0, y: 0, w: W, h: H };
}

function check(ctx, x, y, s, color) {   // ✓ desenhado
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = s * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - s * 0.45, y); ctx.lineTo(x - s * 0.1, y + s * 0.35); ctx.lineTo(x + s * 0.5, y - s * 0.4); ctx.stroke(); ctx.restore();
}
function cross(ctx, x, y, s, color) {   // ✕ desenhado
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = s * 0.22; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - s * 0.38, y - s * 0.38); ctx.lineTo(x + s * 0.38, y + s * 0.38); ctx.moveTo(x + s * 0.38, y - s * 0.38); ctx.lineTo(x - s * 0.38, y + s * 0.38); ctx.stroke(); ctx.restore();
}

export const GRAFICO_DRAW = {
  // barras em corrida: tabela "Ano, A, B, C" com uma linha por ano; as barras trocam de lugar
  g_race(ctx, it, t, W, H) {
    return base(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, stroke }) => {
      const lines = String(q.data || '').split('\n').map(l => l.split(/[;,\t|]/).map(x => x.trim())).filter(l => l.length > 1 && l.some(Boolean));
      if (lines.length < 3) return null;
      const names = lines[0].slice(1);
      const rows = lines.slice(1).map(l => ({ k: l[0], v: names.map((_, i) => parseFloat(String(l[i + 1] || '0').replace(/\./g, '').replace(',', '.')) || 0) }));
      const span = Math.max(0.5, (it.dur / (q.speed || 1)) - 1.2);
      const pos = cl((local - 0.4) / span) * (rows.length - 1);
      const i0 = Math.floor(pos), i1 = Math.min(rows.length - 1, i0 + 1), f = eio(pos - i0);
      const vals = names.map((n, j) => rows[i0].v[j] + (rows[i1].v[j] - rows[i0].v[j]) * f);
      // posição de cada barra (ordenada pelo valor) também desliza
      const rank = a => { const o = names.map((n, j) => j).sort((x, y) => a[y] - a[x]); const r = []; o.forEach((j, k) => r[j] = k); return r; };
      const r0 = rank(rows[i0].v), r1 = rank(rows[i1].v);
      const show = Math.min(names.length, q.top || 6);
      const gw = Math.min(W * 0.86, U * 1.2), bh = U * 0.07, gap = U * 0.022;
      const top = cy - (show * (bh + gap)) / 2 + U * 0.03;
      const mx = Math.max(1e-9, ...vals);
      const colors = String(q.colors || '#EB1E28,#FFDE00,#3B82F6,#22C55E,#A855F7,#F97316,#EC4899,#14B8A6').split(',').map(x => x.trim());
      T(ctx, q.title, cx, top - U * 0.11, U * 0.055, pal.text, { stroke, maxw: gw });
      const lw = gw * 0.3;
      names.forEach((n, j) => {
        const rk = r0[j] + (r1[j] - r0[j]) * f;
        if (rk > show - 0.01) return;
        const y = top + rk * (bh + gap);
        const w = (gw - lw - U * 0.12) * vals[j] / mx;
        ctx.fillStyle = colors[j % colors.length];
        roundRect(ctx, cx - gw / 2 + lw, y, Math.max(2, w), bh, bh * 0.2); ctx.fill();
        T(ctx, n, cx - gw / 2 + lw - U * 0.015, y + bh / 2, U * 0.034, pal.text, { align: 'right', maxw: lw - U * 0.02, stroke });
        T(ctx, fmt(vals[j], +q.dec || 0) + (q.suffix || ''), cx - gw / 2 + lw + w + U * 0.012, y + bh / 2, U * 0.032, pal.text, { align: 'left', stroke, weight: 800 });
      });
      const yr = rows[f > 0.5 ? i1 : i0].k;
      T(ctx, yr, cx + gw / 2, top + show * (bh + gap) + U * 0.02, U * 0.09, pal.accent || YEL, { align: 'right', stroke, alpha: 0.9 });
      return { x: cx - gw / 2, y: top - U * 0.15, w: gw, h: show * (bh + gap) + U * 0.28 };
    });
  },

  g_ring(ctx, it, t, W, H) {
    return base(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, stroke }) => {
      const pct = +q.pct || 0, r = U * 0.26, esp = U * 0.055;
      const k = eio(local / (q.anim || 1.5));
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(120,120,130,.55)'; ctx.lineWidth = esp;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = q.color || RED;
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct / 100 * k); ctx.stroke();
      T(ctx, fmt(pct * k, +q.dec || 0) + '%', cx, cy, U * 0.13, pal.text, { stroke });
      T(ctx, q.label, cx, cy + r + U * 0.09, U * 0.045, pal.text, { stroke, maxw: W * 0.9, alpha: cl((local - 0.6) / 0.3) });
      return { x: cx - r - esp, y: cy - r - esp, w: (r + esp) * 2, h: (r + esp) * 2 + U * 0.12 };
    });
  },

  g_line(ctx, it, t, W, H) {
    return base(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, stroke }) => {
      const rows = parseRows(q.data);
      if (rows.length < 2) return null;
      const gw = Math.min(W * 0.84, U * 1.2), gh = U * 0.42;
      const x0 = cx - gw / 2, y1 = cy + gh / 2, y0 = cy - gh / 2;
      const mx = Math.max(...rows.map(r => r.v)), mn = q.zero === false ? Math.min(...rows.map(r => r.v)) : 0;
      const pts = rows.map((r, i) => [x0 + gw * i / (rows.length - 1), y1 - (r.v - mn) / Math.max(1e-9, mx - mn) * gh]);
      T(ctx, q.title, cx, y0 - U * 0.08, U * 0.05, pal.text, { stroke, maxw: W * 0.9 });
      ctx.strokeStyle = 'rgba(160,160,170,.5)'; ctx.lineWidth = U * 0.003;
      ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0 + gw, y1); ctx.stroke();
      // revela pelo comprimento
      const seg = []; let tot = 0;
      for (let i = 0; i < pts.length - 1; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(L); tot += L; }
      const alvo = tot * eio(local / (q.anim || 2)); let acc = 0, tip = pts[0], tipIdx = 0;
      const path = [pts[0]];
      for (let i = 0; i < seg.length; i++) {
        if (acc + seg[i] <= alvo) { path.push(pts[i + 1]); acc += seg[i]; tipIdx = i + 1; tip = pts[i + 1]; }
        else { const f = (alvo - acc) / seg[i]; tip = [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; path.push(tip); break; }
      }
      if (q.area !== false) {
        const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, (q.color || RED) + '88'); g.addColorStop(1, (q.color || RED) + '00');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(path[0][0], y1); path.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(tip[0], y1); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = q.color || RED; ctx.lineWidth = U * 0.01; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); path.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tip[0], tip[1], U * 0.016, 0, Math.PI * 2); ctx.fill();
      rows.forEach((r, i) => {
        const shown = i <= tipIdx;
        T(ctx, r.label, pts[i][0], y1 + U * 0.04, U * 0.03, pal.text, { weight: 700, stroke: stroke * 0.8, alpha: shown ? 1 : 0.35 });
        if (shown) T(ctx, fmt(r.v, +q.dec || 0) + (q.suffix || ''), pts[i][0], pts[i][1] - U * 0.045, U * 0.035, pal.text, { stroke });
      });
      return { x: x0, y: y0 - U * 0.12, w: gw, h: gh + U * 0.2 };
    });
  },

  g_pie(ctx, it, t, W, H) {
    return base(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, stroke }) => {
      const rows = parseRows(q.data);
      if (!rows.length) return null;
      const tot = rows.reduce((a, r) => a + r.v, 0) || 1;
      const r = U * 0.27, cols = [RED, YEL, '#3B82F6', '#22C55E', GRAY, '#A855F7'];
      const k = eio(local / (q.anim || 1.5));
      T(ctx, q.title, cx, cy - r - U * 0.08, U * 0.05, pal.text, { stroke, maxw: W * 0.9 });
      let a0 = -Math.PI / 2;
      const donut = q.donut !== false;
      rows.forEach((row, i) => {
        const span = Math.PI * 2 * row.v / tot * k;
        const hi = (q.highlight || '') === row.label;
        const mid = a0 + span / 2, off = hi ? U * 0.03 * k : 0;
        const ox = cx + Math.cos(mid) * off, oy = cy + Math.sin(mid) * off;
        if (donut) {            // rosca desenhada como arco grosso (não apaga o vídeo de trás)
          ctx.strokeStyle = cols[i % cols.length]; ctx.lineWidth = r * 0.5; ctx.lineCap = 'butt';
          ctx.beginPath(); ctx.arc(ox, oy, r * 0.75, a0, a0 + span); ctx.stroke();
        } else {
          ctx.fillStyle = cols[i % cols.length];
          ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, r, a0, a0 + span); ctx.closePath(); ctx.fill();
        }
        if (k > 0.95) {
          const lx = cx + Math.cos(mid) * r * (donut ? 0.75 : 0.66), ly = cy + Math.sin(mid) * r * (donut ? 0.75 : 0.66);
          T(ctx, Math.round(row.v / tot * 100) + '%', lx, ly, U * 0.04, '#fff', { stroke: 0.12 });
        }
        a0 += span;
      });
      // legenda
      const ly0 = cy + r + U * 0.07;
      rows.forEach((row, i) => {
        const y = ly0 + i * U * 0.05, al = cl((local - 1 - i * 0.15) / 0.3);
        ctx.save(); ctx.globalAlpha *= al; ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(cx - U * 0.3, y - U * 0.015, U * 0.03, U * 0.03); ctx.restore();
        T(ctx, row.label, cx - U * 0.25, y, U * 0.034, pal.text, { align: 'left', weight: 700, stroke, alpha: al, maxw: U * 0.6 });
      });
      return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 + rows.length * U * 0.05 + U * 0.08 };
    });
  },

  g_vbars(ctx, it, t, W, H) {
    return base(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, stroke }) => {
      const rows = parseRows(q.data).slice(0, 8);
      if (!rows.length) return null;
      const gw = Math.min(W * 0.86, U * 1.1), hmax = U * 0.5, baseY = cy + hmax / 2;
      const n = rows.length, slot = gw / n, bw = slot * 0.7, vmax = Math.max(...rows.map(r => r.v), 1e-9);
      T(ctx, q.title, cx, baseY - hmax - U * 0.1, U * 0.05, pal.text, { stroke, maxw: W * 0.9 });
      rows.forEach((r, i) => {
        const p = eout((local - i * 0.12) / 0.8);
        const hgt = hmax * r.v / vmax * p;
        const x = cx - gw / 2 + i * slot + (slot - bw) / 2;
        const hi = (q.highlight || '') === r.label;
        const pulse = hi && p >= 1 ? 1 + 0.04 * Math.sin(local * 6) : 1;
        ctx.fillStyle = hi ? YEL : (q.color || RED);
        ctx.fillRect(x - (pulse - 1) * bw / 2, baseY - hgt * pulse, bw * pulse, hgt * pulse);
        if (p > 0) T(ctx, fmt(r.v * p, +q.dec || 0) + (q.suffix || ''), x + bw / 2, baseY - hgt - U * 0.035, U * 0.038, pal.text, { stroke, maxw: slot });
        T(ctx, r.label, x + bw / 2, baseY + U * 0.035, U * 0.03, pal.text, { weight: 700, stroke: stroke * 0.8, maxw: slot * 0.98 });
      });
      return { x: cx - gw / 2, y: baseY - hmax - U * 0.14, w: gw, h: hmax + U * 0.2 };
    });
  },

  g_poll(ctx, it, t, W, H) {
    return base(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, stroke }) => {
      const a = +q.pa || 50, b = +q.pb || (100 - a);
      const k = eio(local / (q.anim || 1.6));
      const gw = Math.min(W * 0.88, U * 1.1), bh = U * 0.11;
      const x0 = cx - gw / 2;
      T(ctx, q.title, cx, cy - U * 0.2, U * 0.05, pal.text, { stroke, maxw: W * 0.9 });
      T(ctx, q.na, x0, cy - U * 0.1, U * 0.045, q.ca || RED, { align: 'left', stroke: 0.14, maxw: gw / 2 });
      T(ctx, q.nb, x0 + gw, cy - U * 0.1, U * 0.045, q.cb || '#3B82F6', { align: 'right', stroke: 0.14, maxw: gw / 2 });
      // cabo de guerra: começa no meio e vai para o resultado
      const split = 0.5 + (a / (a + b) - 0.5) * k;
      ctx.fillStyle = q.ca || RED; roundRect(ctx, x0, cy - bh / 2, gw * split, bh, bh * 0.2); ctx.fill();
      ctx.fillStyle = q.cb || '#3B82F6'; roundRect(ctx, x0 + gw * split, cy - bh / 2, gw * (1 - split), bh, bh * 0.2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x0 + gw * split - U * 0.003, cy - bh * 0.7, U * 0.006, bh * 1.4);
      T(ctx, fmt(a * k, +q.dec || 0) + '%', x0 + U * 0.02, cy, U * 0.06, '#fff', { align: 'left', stroke: 0.1 });
      T(ctx, fmt(b * k, +q.dec || 0) + '%', x0 + gw - U * 0.02, cy, U * 0.06, '#fff', { align: 'right', stroke: 0.1 });
      T(ctx, q.margin, cx, cy + U * 0.11, U * 0.03, pal.note, { weight: 700, stroke: stroke * 0.8, alpha: cl((local - 1.4) / 0.3) });
      return { x: x0, y: cy - U * 0.24, w: gw, h: U * 0.4 };
    });
  },

  g_versus(ctx, it, t, W, H) {
    return base(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, stroke }) => {
      const L = String(q.left || '').split('\n').map(s => s.trim()).filter(Boolean);
      const R = String(q.right || '').split('\n').map(s => s.trim()).filter(Boolean);
      const colW = Math.min(W * 0.44, U * 0.55), off = Math.min(W * 0.235, U * 0.29);
      T(ctx, q.ta, cx - off, cy - U * 0.3, U * 0.06, q.ca || YEL, { stroke: 0.14, maxw: colW, alpha: cl(local / 0.3) });
      T(ctx, q.tb, cx + off, cy - U * 0.3, U * 0.06, q.cb || RED, { stroke: 0.14, maxw: colW, alpha: cl(local / 0.3) });
      T(ctx, 'x', cx, cy - U * 0.3, U * 0.07, pal.text, { stroke, alpha: cl(local / 0.3) });
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(cx - U * 0.002, cy - U * 0.24, U * 0.004, U * 0.6 * cl(local / 0.6));
      const n = Math.max(L.length, R.length);
      const step = q.step ? +q.step : Math.max(0.35, (it.dur / (q.speed || 1) - 1.2) / Math.max(1, n * 2));
      const item = (s, x, y, k) => {
        if (k <= 0) return;
        const ok = /^[+✓v]/i.test(s), bad = /^[-✕x]/i.test(s);
        const txtv = s.replace(/^[+\-✓✕xv]\s*/i, '');
        ctx.save(); ctx.globalAlpha *= k;
        const icon = U * 0.045;
        if (ok) check(ctx, x - colW / 2 + icon * 0.6, y, icon, '#22C55E');
        if (bad) cross(ctx, x - colW / 2 + icon * 0.6, y, icon, RED);
        T(ctx, txtv, x - colW / 2 + icon * 1.5, y, U * 0.034, pal.text, { align: 'left', weight: 800, stroke, maxw: colW - icon * 1.6 });
        ctx.restore();
      };
      for (let i = 0; i < n; i++) {
        const y = cy - U * 0.18 + i * U * 0.085;
        if (L[i]) item(L[i], cx - off, y, cl((local - 0.6 - i * 2 * step) / 0.3));
        if (R[i]) item(R[i], cx + off, y, cl((local - 0.6 - (i * 2 + 1) * step) / 0.3));
      }
      return { x: cx - off - colW / 2, y: cy - U * 0.35, w: off * 2 + colW, h: U * 0.25 + n * U * 0.085 };
    });
  },

  g_table(ctx, it, t, W, H) {
    return base(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, stroke }) => {
      const rows = String(q.data || '').split('\n').map(l => l.split('|').map(c => c.trim())).filter(r => r.length && r[0]);
      if (!rows.length) return null;
      const cols = Math.max(...rows.map(r => r.length));
      const tw = Math.min(W * 0.9, U * 1.15), rh = U * 0.075, x0 = cx - tw / 2, y0 = cy - rows.length * rh / 2;
      const cw = tw / cols;
      const hi = +q.highlight || 0;
      rows.forEach((r, i) => {
        const k = cl((local - i * 0.15) / 0.3);
        if (k <= 0) return;
        ctx.save(); ctx.globalAlpha *= k; ctx.translate((1 - eout(k)) * U * 0.05, 0);
        const blink = hi && i === hi && Math.floor(local * 3) % 2 === 0;
        ctx.fillStyle = i === 0 ? (q.color || RED) : blink ? 'rgba(255,222,0,.85)' : (i % 2 ? 'rgba(0,0,0,.55)' : 'rgba(40,40,48,.6)');
        ctx.fillRect(x0, y0 + i * rh, tw, rh - U * 0.004);
        r.forEach((c, j) => T(ctx, c, x0 + cw * j + cw / 2, y0 + i * rh + rh / 2, U * (i === 0 ? 0.034 : 0.032), blink ? '#111' : '#fff', { weight: i === 0 ? 900 : 700, maxw: cw * 0.94 }));
        ctx.restore();
      });
      T(ctx, q.title, cx, y0 - U * 0.06, U * 0.05, pal.text, { stroke, maxw: W * 0.9 });
      return { x: x0, y: y0 - U * 0.1, w: tw, h: rows.length * rh + U * 0.1 };
    });
  },

  g_countdown(ctx, it, t, W, H) {
    return base(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, stroke }) => {
      const from = Math.round(+q.from || 10), to = Math.round(+q.to || 0);
      const steps = Math.abs(from - to);
      const per = (q.anim || Math.max(0.3, (it.dur / (q.speed || 1) - 0.6) / Math.max(1, steps)));
      const i = Math.min(steps, Math.floor(local / per));
      const v = from > to ? from - i : from + i;
      const ph = (local % per) / per;
      T(ctx, q.top, cx, cy - U * 0.18, U * 0.055, pal.text, { stroke });
      // "folha" que vira
      const s = U * 0.28;
      ctx.save();
      ctx.fillStyle = q.color || RED; roundRect(ctx, cx - s * 0.55, cy - s * 0.48, s * 1.1, s * 0.96, s * 0.08); ctx.fill();
      ctx.restore();

      const pop = 1 + 0.08 * (1 - cl(ph * 3));
      ctx.save(); ctx.translate(cx, cy); ctx.scale(pop, pop);
      T(ctx, String(v), 0, 0, s * 0.62, '#fff', {});
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(cx - s * 0.55, cy - U * 0.002, s * 1.1, U * 0.004);
      T(ctx, q.bottom, cx, cy + U * 0.2, U * 0.055, q.color2 || YEL, { stroke: stroke || 0.1 });
      return { x: cx - s * 0.6, y: cy - U * 0.22, w: s * 1.2, h: U * 0.46 };
    });
  },

  g_odometer(ctx, it, t, W, H) {
    return base(ctx, it, t, W, H, ({ q, pal, local, U, cx, cy, stroke }) => {
      const target = Math.max(0, Math.round(+q.to || 0));
      const digits = String(target).length;
      const k = eout(local / (q.anim || 2.2));
      const v = target * k;
      const dh = U * 0.17, dw = dh * 0.66;
      const total = dw * digits;
      T(ctx, q.top, cx, cy - dh * 0.9, U * 0.05, pal.text, { stroke });
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - total / 2 - U * 0.01, cy - dh / 2, total + U * 0.02, dh); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(cx - total / 2 - U * 0.01, cy - dh / 2, total + U * 0.02, dh);
      for (let d = 0; d < digits; d++) {
        const place = Math.pow(10, digits - 1 - d);
        const cur = Math.floor(v / place) % 10;
        const lower = v % place;                       // dígito só rola quando os de baixo chegam no 9
        const frac = place === 1 ? v - Math.floor(v) : (lower > place - 1 ? lower - (place - 1) : 0);
        const x = cx - total / 2 + d * dw + dw / 2;
        for (const [n, yo] of [[cur, -frac], [(cur + 1) % 10, 1 - frac]]) T(ctx, String(n), x, cy + yo * dh, dh * 0.8, q.color || YEL, {});
      }
      ctx.restore();
      T(ctx, q.bottom, cx, cy + dh * 0.85, U * 0.045, pal.text, { stroke, weight: 800 });
      return { x: cx - total / 2, y: cy - dh, w: total, h: dh * 2 };
    });
  },
};

const G = (kind, name, p) => ({ kind, name, group: 'Gráficos', p: { bg: 'none', fonte: '', speed: 1, x: .5, y: .45, ...p } });
export const GRAFICO_ELEMENTS = [
  G('g_race', 'Barras em corrida', { title: 'RANKING AO LONGO DOS ANOS', data: 'Ano, Brasil, México, Argentina, Chile\n2000, 10, 14, 8, 5\n2005, 18, 16, 9, 7\n2010, 30, 20, 12, 9\n2015, 26, 25, 13, 12\n2020, 34, 24, 11, 15', top: 6, suffix: '', colors: '' }),
  G('g_vbars', 'Barras verticais', { title: 'TÍTULO DO GRÁFICO', data: 'Norte: 42\nNordeste: 35\nCentro-Oeste: 12\nSudeste: 8\nSul: 3', highlight: 'Norte', suffix: '', color: RED }),
  G('g_line', 'Linha que se desenha', { title: 'EVOLUÇÃO', data: '2003: 10\n2008: 18\n2013: 30\n2018: 22\n2023: 38\n2026: 45', suffix: '', color: RED }),
  G('g_pie', 'Pizza / rosca', { title: 'DIVISÃO', data: 'Sim: 58\nNão: 30\nNão sabe: 12', highlight: 'Sim', donut: true }),
  G('g_ring', 'Anel de porcentagem', { pct: 72, label: 'DOS ENTREVISTADOS', color: RED }),
  G('g_poll', 'Pesquisa (cabo de guerra)', { title: 'PESQUISA', na: 'CANDIDATO A', nb: 'CANDIDATO B', pa: 52, pb: 48, ca: RED, cb: '#3B82F6', margin: 'Margem de erro: 2 pontos', fonte: 'Fonte: instituto, data' }),
  G('g_versus', 'Comparativo X', { ta: '4 ANOS', tb: '24 ANOS', left: '+ item a favor\n- item contra', right: '+ item a favor\n- item contra', ca: YEL, cb: RED }),
  G('g_table', 'Tabela animada', { title: 'TABELA', data: 'Ano | Valor | Variação\n2022 | 100 | -\n2023 | 120 | +20%\n2024 | 150 | +25%', highlight: 3 }),
  G('g_countdown', 'Contagem regressiva', { top: 'FALTAM', from: 9, to: 0, bottom: 'DIAS', color: RED, color2: YEL }),
  G('g_odometer', 'Odômetro', { top: '', to: 2026, bottom: 'ANOS DE HISTÓRIA', color: YEL }),
];
