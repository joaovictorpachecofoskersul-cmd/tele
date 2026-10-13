// Elementos desenhados por cima do vídeo (Canvas 2D).
import { cssFont } from './fonts.js';
import { roundRect } from './captions.js';

export const TEXT_ANIMS = [
  { id: 'pop', name: 'Pular' }, { id: 'fade', name: 'Aparecer' }, { id: 'slide', name: 'Subir' },
  { id: 'type', name: 'Máquina de escrever' }, { id: 'letters3d', name: 'Letras 3D com brilho' },
  { id: 'bounce', name: 'Quicar' }, { id: 'blink', name: 'Piscar' }, { id: 'zoom', name: 'Zoom de longe' },
  { id: 'none', name: 'Sem animação' },
];

// Catálogo do botão "Elementos"
export const ELEMENTS = [
  { kind: 'text', name: 'Texto destaque', p: { text: 'SEU TEXTO', font: 'Poppins', size: .09, color: '#FFFFFF', stroke: '#000000', bg: '', x: .5, y: .25, anim: 'pop', upper: true } },
  { kind: 'text', name: 'Tarja amarela', p: { text: 'ATENÇÃO', font: 'Poppins', size: .075, color: '#000000', stroke: '', bg: '#FFE600', x: .5, y: .2, anim: 'slide', upper: true } },
  { kind: 'text', name: 'Cabeçalho fixo', p: { text: 'SEU CANAL', font: 'Anton', size: .08, color: '#FFFFFF', stroke: '', bg: '#E1251B', x: .5, y: .07, anim: 'none', upper: true, full: true } },
  { kind: 'text', name: 'Letras 3D', p: { text: 'IMPORTANTE', font: 'Anton', size: .12, color: '#FFE600', stroke: '#000000', bg: '', x: .5, y: .3, anim: 'letters3d', upper: true } },
  { kind: 'text', name: 'Máquina de escrever', p: { text: 'enquanto isso...', font: 'Courier Prime', size: .06, color: '#FFFFFF', stroke: '', bg: 'rgba(0,0,0,.7)', x: .5, y: .3, anim: 'type', upper: false } },
  { kind: 'stamp', name: 'Carimbo', p: { text: 'APROVADO', color: '#E1251B', x: .5, y: .4, size: .14, rot: -12 } },
  { kind: 'counter', name: 'Contador', p: { from: 0, to: 100, prefix: '', suffix: '%', decimals: 0, label: 'DE DESCONTO', x: .5, y: .35, size: .16, color: '#FFE600' } },
  { kind: 'censor', name: 'Tarja de censura', p: { x: .5, y: .45, w: .7, h: .08, text: 'CENSURADO', color: '#000000' } },
  { kind: 'knockout', name: 'Texto vazado', p: { text: 'VERDADE', font: 'Anton', size: .3, dim: .9, x: .5, y: .5 } },
  { kind: 'card', name: 'Card de tela cheia', p: { title: 'TÍTULO', sub: 'subtítulo aqui', bg: '#0EA5E9', bg2: '#0C4A6E', color: '#FFFFFF', confetti: false } },
  { kind: 'card', name: 'Card final com confete', p: { title: 'SIGA PARA MAIS', sub: '@seuperfil', bg: '#7C3AED', bg2: '#2E1065', color: '#FFFFFF', confetti: true, comment: 'COMENTA AQUI' } },
  { kind: 'lower', name: 'Nome na tela', p: { name: 'Seu Nome', role: 'Profissão ou cargo', color: '#FFE600', x: .06, y: .78 } },
  { kind: 'follow', name: 'Botão seguir', p: { text: 'SEGUIR', handle: '@seuperfil', x: .5, y: .82 } },
  { kind: 'bubble', name: 'Balão de fala', p: { text: 'Olha isso!', x: .5, y: .3, size: .065, tail: 'baixo' } },
  { kind: 'text', name: 'Data / local', p: { text: '📍 Cuiabá · hoje', font: 'Poppins', size: .045, color: '#FFFFFF', stroke: '', bg: 'rgba(0,0,0,.55)', x: .5, y: .12, anim: 'fade', upper: false } },
  { kind: 'like', name: 'Curtida (coração)', p: { x: .82, y: .62, count: '12,4 mil', color: '#FF2D55' } },
  { kind: 'click', name: 'Cursor clicando', p: { x: .5, y: .5, clicks: 2 } },
  { kind: 'tap', name: 'Dedo tocando', p: { x: .5, y: .55, clicks: 2 } },
  { kind: 'bell', name: 'Sininho (ative)', p: { text: 'ATIVE AS NOTIFICAÇÕES', x: .5, y: .78 } },
  { kind: 'notif', name: 'Notificação', p: { app: 'Mensagem', title: 'Nova mensagem', text: 'Você precisa ver isso!', y: .08 } },
  { kind: 'swipe', name: 'Arraste para cima', p: { text: 'ARRASTE PARA CIMA', x: .5, y: .85, color: '#FFFFFF' } },
  { kind: 'comment', name: 'Comentário', p: { user: '@seguidor', text: 'Que vídeo incrível! 👏', x: .5, y: .7, likes: '238' } },
  { kind: 'poll', name: 'Enquete', p: { q: 'O que você acha?', a: 'SIM', b: 'NÃO', pa: 72, x: .5, y: .45 } },
  { kind: 'arrows', name: 'Setas animadas', p: { x: .5, y: .5, dir: 'baixo', color: '#FFE600' } },
  { kind: 'share', name: 'Compartilhar', p: { x: .82, y: .75, text: 'MANDA PRA ALGUÉM' } },
  { kind: 'emoji', name: 'Emoji', p: { text: '🔥', x: .5, y: .35, size: .18, anim: 'pop' } },
  { kind: 'arrow', name: 'Seta', p: { x: .5, y: .45, size: .25, rot: 35, color: '#FFE600' } },
  { kind: 'circle', name: 'Círculo de destaque', p: { x: .5, y: .45, r: .18, color: '#FF2B2B' } },
  { kind: 'confetti', name: 'Confete', p: {} },
  { kind: 'progress', name: 'Barra de progresso', p: { color: '#FFE600', pos: 'top' }, whole: true },
  { kind: 'image', name: 'Imagem / logo', p: { mid: null, x: .5, y: .15, scale: .3, opacity: 1, anim: 'pop' }, needsImage: true },
];

const clamp01 = x => Math.max(0, Math.min(1, x));
const easeOut = x => 1 - Math.pow(1 - x, 3);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (line && ctx.measureText(test).width > maxW) { out.push(line); line = w; } else line = test;
    }
    out.push(line);
  }
  return out;
}

// envelope de entrada/saída (0..1)
function inOut(t, it, inD = 0.3, outD = 0.25) {
  const a = clamp01((t - it.start) / inD);
  const b = clamp01((it.start + it.dur - t) / outD);
  return { a, b, local: t - it.start };
}

export function drawItems(ctx, p, t, W, H, env) {
  const boxes = [];
  for (const it of p.items) {
    if (it.kind === 'effect' || it.kind === 'sfx') continue;
    if (t < it.start || t >= it.start + it.dur) continue;
    const fn = DRAW[it.kind];
    if (!fn) continue;
    ctx.save();
    try {
      const b = fn(ctx, it, t, W, H, env, p);
      if (b) boxes.push({ id: it.id, ...b });
    } catch (e) { /* um elemento com erro não derruba o quadro */ }
    ctx.restore();
  }
  return boxes;
}

function textBlock(ctx, it, t, W, H) {
  const q = it.p;
  const { a, b, local } = inOut(t, it);
  const size = W * (q.size || .08);
  ctx.font = cssFont(q.font || 'Poppins', size, 900);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const txt = q.upper ? String(q.text).toLocaleUpperCase('pt-BR') : String(q.text);
  const lines = wrap(ctx, txt, W * (q.full ? 0.94 : 0.86));
  const lh = size * 1.15;
  const widths = lines.map(l => ctx.measureText(l).width);
  const bw = Math.max(...widths, 1);
  const cx = q.x * W, cy = q.y * H;
  const box = { x: cx - bw / 2 - size * .35, y: cy - lines.length * lh / 2 - size * .2, w: bw + size * .7, h: lines.length * lh + size * .4 };
  let alpha = 1, sc = 1, dy = 0, visible = txt.length;
  switch (q.anim) {
    case 'pop': sc = .3 + .7 * easeOutBack(a); alpha = Math.min(1, a * 3); break;
    case 'fade': alpha = a; break;
    case 'slide': dy = (1 - easeOut(a)) * size * 1.2; alpha = a; break;
    case 'zoom': sc = 3 - 2 * easeOut(a); alpha = a; break;
    case 'bounce': dy = -Math.abs(Math.sin(local * 5)) * size * .25 * Math.exp(-local * 1.2); sc = .5 + .5 * easeOutBack(a); break;
    case 'blink': alpha = (Math.floor(local * 4) % 2) ? .25 : 1; break;
    case 'type': visible = Math.floor(clamp01(local / Math.max(.4, Math.min(it.dur * .7, txt.length * .06))) * txt.length); break;
    default: break;
  }
  alpha *= b;
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy + dy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
  if (q.rot) { ctx.translate(cx, cy); ctx.rotate(q.rot * Math.PI / 180); ctx.translate(-cx, -cy); }
  if (q.bg) {
    ctx.fillStyle = q.bg;
    if (q.full) ctx.fillRect(0, box.y, W, box.h);
    else { roundRect(ctx, box.x, box.y, box.w, box.h, size * .18); ctx.fill(); }
  }
  if (q.anim === 'letters3d') { letters3d(ctx, lines, cx, cy, lh, size, q, local); return box; }
  let shown = 0;
  lines.forEach((ln, i) => {
    const y = cy + (i - (lines.length - 1) / 2) * lh;
    let s = ln;
    if (q.anim === 'type') { const rem = Math.max(0, visible - shown); s = ln.slice(0, rem); shown += ln.length + 1; }
    if (q.stroke) {
      ctx.lineJoin = 'round'; ctx.lineWidth = size * .16; ctx.strokeStyle = q.stroke;
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = size * .12; ctx.shadowOffsetY = size * .05;
      ctx.strokeText(s, cx, y); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }
    ctx.fillStyle = q.color || '#fff'; ctx.fillText(s, cx, y);
    if (q.anim === 'type' && i === lines.length - 1 || (q.anim === 'type' && s.length < ln.length)) {
      if (Math.floor(local * 2.5) % 2 === 0 && s.length <= ln.length) {
        const w = ctx.measureText(s).width;
        const x0 = cx - ctx.measureText(ln).width / 2 + w;
        ctx.fillRect(x0 + size * .05, y - size * .45, size * .08, size * .9);
      }
    }
  });
  return box;
}

function letters3d(ctx, lines, cx, cy, lh, size, q, local) {
  const depth = Math.max(4, Math.round(size * .08));
  lines.forEach((ln, li) => {
    const y0 = cy + (li - (lines.length - 1) / 2) * lh;
    const total = ctx.measureText(ln).width;
    let x = cx - total / 2;
    for (let i = 0; i < ln.length; i++) {
      const ch = ln[i];
      const w = ctx.measureText(ch).width;
      const k = clamp01((local - i * 0.045) / 0.35);
      const e = easeOutBack(k);
      const yy = y0 + (1 - e) * size * 1.4;
      ctx.save();
      ctx.globalAlpha *= clamp01(k * 2.5);
      ctx.translate(x + w / 2, yy); ctx.scale(1, .2 + .8 * e);
      for (let d = depth; d > 0; d--) { ctx.fillStyle = d === depth ? '#000' : shade(q.color, .45); ctx.fillText(ch, d * .6, d); }
      if (q.stroke) { ctx.lineWidth = size * .08; ctx.strokeStyle = q.stroke; ctx.strokeText(ch, 0, 0); }
      const g = ctx.createLinearGradient(-w, -size, w, size);
      const sp = ((local * .9 - i * .05) % 2.2) / 2.2;
      g.addColorStop(0, q.color); g.addColorStop(clamp01(sp - .08), q.color); g.addColorStop(clamp01(sp), '#FFFFFF'); g.addColorStop(clamp01(sp + .08), q.color); g.addColorStop(1, q.color);
      ctx.fillStyle = g; ctx.fillText(ch, 0, 0);
      ctx.restore();
      x += w;
    }
  });
}

function shade(hex, k) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#333';
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

const DRAW = {
  text: textBlock,

  stamp(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .18);
    const size = W * (q.size || .14);
    const cx = q.x * W, cy = q.y * H;
    const sc = 2.6 - 1.6 * easeOut(a);
    const shake = local < .3 ? (hash(Math.floor(local * 60)) - .5) * size * .1 * (1 - local / .3) : 0;
    ctx.globalAlpha = Math.min(1, a * 2) * b * .92;
    ctx.translate(cx + shake, cy); ctx.rotate((q.rot || -12) * Math.PI / 180); ctx.scale(sc, sc);
    ctx.font = cssFont('Anton', size, 400); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = String(q.text).toLocaleUpperCase('pt-BR');
    const w = ctx.measureText(txt).width;
    ctx.strokeStyle = q.color; ctx.lineWidth = size * .09;
    roundRect(ctx, -w / 2 - size * .3, -size * .7, w + size * .6, size * 1.4, size * .12); ctx.stroke();
    ctx.fillStyle = q.color; ctx.fillText(txt, 0, size * .04);
    // textura de carimbo gasto
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 70; i++) {
      const x = (hash(i * 3.1 + it.start) - .5) * (w + size * .6), y = (hash(i * 7.7 + it.start) - .5) * size * 1.4;
      ctx.beginPath(); ctx.arc(x, y, size * (.01 + .03 * hash(i)), 0, Math.PI * 2); ctx.fill();
    }
    return { x: cx - w / 2 - size * .4, y: cy - size * .8, w: w + size * .8, h: size * 1.6 };
  },

  counter(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .2);
    const size = W * (q.size || .16);
    const k = easeOut(clamp01(local / Math.max(.3, it.dur * .7)));
    const v = q.from + (q.to - q.from) * k;
    const txt = (q.prefix || '') + v.toLocaleString('pt-BR', { minimumFractionDigits: q.decimals || 0, maximumFractionDigits: q.decimals || 0 }) + (q.suffix || '');
    const cx = q.x * W, cy = q.y * H;
    ctx.globalAlpha = a * b;
    ctx.font = cssFont('Poppins', size, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = size * .14; ctx.strokeStyle = '#000';
    ctx.strokeText(txt, cx, cy); ctx.fillStyle = q.color || '#FFE600'; ctx.fillText(txt, cx, cy);
    if (q.label) {
      const s2 = size * .32; ctx.font = cssFont('Poppins', s2, 800);
      ctx.lineWidth = s2 * .16; ctx.strokeText(q.label.toLocaleUpperCase('pt-BR'), cx, cy + size * .75);
      ctx.fillStyle = '#fff'; ctx.fillText(q.label.toLocaleUpperCase('pt-BR'), cx, cy + size * .75);
    }
    const w = ctx.measureText(txt).width;
    return { x: cx - size * 2, y: cy - size * .6, w: size * 4, h: size * 1.6 };
  },

  censor(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .12, .12);
    const w = q.w * W, h = q.h * H, x = q.x * W - w / 2, y = q.y * H - h / 2;
    const jit = (hash(Math.floor(local * 20)) - .5) * w * .01;
    ctx.globalAlpha = Math.min(a, b);
    ctx.fillStyle = q.color || '#000';
    ctx.fillRect(x + jit, y, w * easeOut(a), h);
    if (q.text) {
      const s = h * .5; ctx.font = cssFont('Anton', s, 400); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.fillText(String(q.text).toLocaleUpperCase('pt-BR'), x + w / 2, y + h / 2 + s * .04);
    }
    return { x, y, w, h };
  },

  knockout(ctx, it, t, W, H, env) {
    const q = it.p, { a, b } = inOut(t, it, .35);
    const size = W * (q.size || .3);
    const tmp = env.scratch(W, H);
    const c2 = tmp.getContext('2d');
    c2.clearRect(0, 0, W, H);
    c2.fillStyle = `rgba(0,0,0,${q.dim ?? .9})`; c2.fillRect(0, 0, W, H);
    c2.globalCompositeOperation = 'destination-out';
    c2.font = cssFont(q.font || 'Anton', size, 900); c2.textAlign = 'center'; c2.textBaseline = 'middle';
    const lines = wrap(c2, String(q.text).toLocaleUpperCase('pt-BR'), W * .94);
    const lh = size * 1.02;
    const sc = 1.25 - .25 * easeOut(a);
    c2.save(); c2.translate(q.x * W, q.y * H); c2.scale(sc, sc);
    lines.forEach((l, i) => c2.fillText(l, 0, (i - (lines.length - 1) / 2) * lh));
    c2.restore();
    c2.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(a * 1.5, 1) * b;
    ctx.drawImage(tmp, 0, 0);
    return { x: 0, y: q.y * H - lines.length * lh / 2, w: W, h: lines.length * lh };
  },

  card(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .3, .3);
    ctx.globalAlpha = Math.min(a, b);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, q.bg || '#E1251B'); g.addColorStop(1, q.bg2 || q.bg || '#7A0000');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // raios girando
    ctx.save(); ctx.translate(W / 2, H * .42); ctx.rotate(local * .25); ctx.globalAlpha *= .12; ctx.fillStyle = '#fff';
    for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(H, -H * .09); ctx.lineTo(H, H * .09); ctx.fill(); }
    ctx.restore();
    if (q.confetti) confetti(ctx, W, H, local, it.start);
    const s1 = W * .2, s2 = W * .075;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const pop = easeOutBack(clamp01(local / .45));
    ctx.save(); ctx.translate(W / 2, H * .42); ctx.scale(pop, pop);
    ctx.font = cssFont('Anton', s1, 400);
    const tl = wrap(ctx, String(q.title).toLocaleUpperCase('pt-BR'), W * .9);
    tl.forEach((l, i) => {
      const y = (i - (tl.length - 1) / 2) * s1 * 1.05;
      ctx.lineWidth = s1 * .1; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(l, 0, y);
      ctx.fillStyle = q.color || '#fff'; ctx.fillText(l, 0, y);
    });
    ctx.restore();
    if (q.sub) {
      const k = clamp01((local - .25) / .3);
      ctx.globalAlpha *= k;
      ctx.font = cssFont('Poppins', s2, 900);
      const sub = String(q.sub).toLocaleUpperCase('pt-BR');
      const w = ctx.measureText(sub).width;
      ctx.fillStyle = '#FFE600'; roundRect(ctx, W / 2 - w / 2 - s2 * .5, H * .6 - s2 * .75, w + s2, s2 * 1.5, s2 * .3); ctx.fill();
      ctx.fillStyle = '#000'; ctx.fillText(sub, W / 2, H * .6 + s2 * .05);
    }
    if (q.comment) {
      const k = clamp01((local - .5) / .3);
      ctx.globalAlpha = Math.min(a, b) * k;
      ctx.font = cssFont('Poppins', s2 * .8, 800); ctx.fillStyle = '#fff';
      ctx.fillText('👇 ' + String(q.comment).toLocaleUpperCase('pt-BR'), W / 2, H * .72);
    }
    return { x: 0, y: 0, w: W, h: H };
  },

  lower(ctx, it, t, W, H) {
    const q = it.p, { a, b } = inOut(t, it, .45, .3);
    const s1 = W * .055, s2 = W * .036;
    const x = q.x * W, y = q.y * H;
    ctx.font = cssFont('Poppins', s1, 900);
    const w1 = ctx.measureText(q.name || '').width;
    ctx.font = cssFont('Poppins', s2, 600);
    const w2 = ctx.measureText(q.role || '').width;
    const bw = Math.max(w1, w2) + s1 * 1.2;
    const e = easeOut(a);
    ctx.globalAlpha = b;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y - s1 * 1.1, bw * e + s1 * .3, s1 * 2.6); ctx.clip();
    ctx.fillStyle = q.color || '#FFE600'; ctx.fillRect(x, y - s1 * .95, s1 * .22, s1 * 2.2);
    ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(x + s1 * .22, y - s1 * .95, bw, s1 * 1.25);
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(x + s1 * .22, y + s1 * .3, w2 + s1 * .9, s2 * 1.5);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.font = cssFont('Poppins', s1, 900); ctx.fillStyle = '#fff'; ctx.fillText(q.name || '', x + s1 * .65, y - s1 * .3);
    ctx.font = cssFont('Poppins', s2, 600); ctx.fillStyle = '#111'; ctx.fillText(q.role || '', x + s1 * .65, y + s1 * .3 + s2 * .78);
    ctx.restore();
    return { x, y: y - s1, w: bw + s1 * .3, h: s1 * 2.5 };
  },

  follow(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .35);
    const s = W * .05;
    ctx.font = cssFont('Poppins', s, 900);
    const tw = ctx.measureText(q.text || 'SEGUIR').width;
    ctx.font = cssFont('Poppins', s * .8, 700);
    const hw = ctx.measureText(q.handle || '').width;
    const bw = tw + hw + s * 3.4, bh = s * 2;
    const cx = q.x * W, cy = q.y * H;
    const pressed = local > .9 && local < 1.15;
    const sc = (.4 + .6 * easeOutBack(a)) * (pressed ? .92 : 1);
    ctx.globalAlpha = b; ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.fillStyle = '#fff'; roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
    const done = local > 1.05;
    const bx = bw / 2 - tw - s * 1.4;
    ctx.fillStyle = done ? '#9CA3AF' : '#E1306C'; roundRect(ctx, bx, -bh / 2 + s * .25, tw + s * 1.15, bh - s * .5, (bh - s * .5) / 2); ctx.fill();
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.font = cssFont('Poppins', s * .8, 700); ctx.fillStyle = '#111'; ctx.fillText(q.handle || '', -bw / 2 + s * .9, 0);
    ctx.font = cssFont('Poppins', s, 900); ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(done ? '✓' : (q.text || 'SEGUIR'), bx + (tw + s * 1.15) / 2, s * .04);
    // mãozinha tocando
    if (local > .5 && local < 1.6) {
      const k = clamp01((local - .5) / .4);
      ctx.font = `${Math.round(s * 1.6)}px "Noto Color Emoji", sans-serif`;
      ctx.fillText('👆', bx + (tw + s * 1.15) / 2 + (1 - k) * s * 3, bh * .9 + (1 - k) * s * 2);
    }
    return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
  },

  bubble(ctx, it, t, W, H) {
    const q = it.p, { a, b } = inOut(t, it, .3);
    const size = W * (q.size || .065);
    ctx.font = cssFont('Poppins', size, 800);
    const lines = wrap(ctx, q.text || '', W * .7);
    const lh = size * 1.2;
    const bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + size * 1.4, bh = lines.length * lh + size * .9;
    const cx = q.x * W, cy = q.y * H;
    ctx.globalAlpha = b; ctx.translate(cx, cy); ctx.scale(.3 + .7 * easeOutBack(a), .3 + .7 * easeOutBack(a));
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = size * .12;
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, size * .6);
    ctx.stroke(); ctx.fill();
    const dir = q.tail === 'cima' ? -1 : 1;
    ctx.beginPath(); ctx.moveTo(-size * .5, dir * bh / 2 - dir * 2); ctx.lineTo(-size * 1.1, dir * (bh / 2 + size * 1.1)); ctx.lineTo(size * .4, dir * bh / 2 - dir * 2);
    ctx.stroke(); ctx.fill();
    ctx.fillRect(-size * .55, dir > 0 ? bh / 2 - size * .2 : -bh / 2 - size * .02, size * 1.0, size * .24);
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * lh));
    return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
  },

  like(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .25);
    const s = W * .1, x = q.x * W, y = q.y * H;
    ctx.globalAlpha = b;
    // explosão de coraçõezinhos subindo
    for (let i = 0; i < 9; i++) {
      const k = clamp01((local - .15 - i * .08) / 1.1);
      if (k <= 0 || k >= 1) continue;
      const hx = x + Math.sin(i * 2.1 + k * 4) * s * .6, hy = y - k * s * 4;
      ctx.save(); ctx.globalAlpha = b * (1 - k); heart(ctx, hx, hy, s * (.25 + .15 * hash(i)), i % 3 ? q.color : '#FF8FAB'); ctx.restore();
    }
    const beat = local < .5 ? easeOutBack(clamp01(local / .35)) : 1 + .08 * Math.max(0, Math.sin((local - .5) * 7)) * Math.exp(-(local - .5) * 2);
    heart(ctx, x, y, s * beat, q.color || '#FF2D55', true);
    if (q.count) {
      const fs = s * .38; ctx.font = cssFont('Poppins', fs, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = fs * .2; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineJoin = 'round';
      ctx.strokeText(q.count, x, y + s * .62); ctx.fillStyle = '#fff'; ctx.fillText(q.count, x, y + s * .62);
    }
    return { x: x - s * .7, y: y - s * .7, w: s * 1.4, h: s * 1.6 };
  },

  click(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .35);
    const s = W * .09, x = q.x * W, y = q.y * H;
    const n = q.clicks || 2, per = Math.max(.5, (it.dur - .5) / n);
    const ph = Math.max(0, local - .4) % per, pressed = local > .4 && ph < .14;
    const k = easeOut(a);
    ctx.globalAlpha = b;
    if (local > .4 && ph < .5) { const r = ph / .5; ctx.strokeStyle = `rgba(255,255,255,${1 - r})`; ctx.lineWidth = s * .08; ctx.beginPath(); ctx.arc(x, y, s * (.2 + r * .9), 0, Math.PI * 2); ctx.stroke(); }
    ctx.translate(x + (1 - k) * s * 2, y + (1 - k) * s * 1.5); ctx.scale(pressed ? .88 : 1, pressed ? .88 : 1);
    ctx.beginPath();
    const P = [[0, 0], [0, 1.15], [.3, .88], [.52, 1.32], [.7, 1.24], [.48, .8], [.86, .8]];
    P.forEach(([px, py], i) => i ? ctx.lineTo(px * s, py * s) : ctx.moveTo(px * s, py * s)); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = s * .07; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill();
    return { x: x - s * .5, y: y - s * .5, w: s * 1.5, h: s * 1.8 };
  },

  tap(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .35);
    const s = W * .14, x = q.x * W, y = q.y * H;
    const n = q.clicks || 2, per = Math.max(.5, (it.dur - .5) / n);
    const ph = Math.max(0, local - .4) % per;
    ctx.globalAlpha = b;
    if (local > .4 && ph < .55) {
      const r = ph / .55;
      for (const kk of [0, .25]) { const rr = clamp01(r - kk); ctx.strokeStyle = `rgba(255,255,255,${(1 - rr) * .9})`; ctx.lineWidth = s * .05; ctx.beginPath(); ctx.arc(x, y, s * (.1 + rr * .7), 0, Math.PI * 2); ctx.stroke(); }
    }
    const press = local > .4 && ph < .15 ? .9 : 1;
    ctx.translate(x + s * .22, y + s * .55 + (1 - easeOut(a)) * s); ctx.scale(press, press);
    ctx.font = `${Math.round(s)}px "Noto Color Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('👆', 0, 0);
    return { x: x - s * .6, y: y - s * .5, w: s * 1.2, h: s * 1.6 };
  },

  bell(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .3);
    const s = W * .085, x = q.x * W, y = q.y * H;
    ctx.font = cssFont('Poppins', s * .45, 900);
    const tw = ctx.measureText(q.text || '').width;
    const bw = tw + s * 2.2, bh = s * 1.5;
    ctx.globalAlpha = b; ctx.translate(x, y); ctx.scale(.4 + .6 * easeOutBack(a), .4 + .6 * easeOutBack(a));
    ctx.fillStyle = 'rgba(0,0,0,.75)'; roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
    // sino
    ctx.save(); ctx.translate(-bw / 2 + s * .9, 0); ctx.rotate(Math.sin(local * 18) * .35 * Math.exp(-((local % 1.6)) * 2));
    ctx.fillStyle = '#FFE600'; ctx.beginPath();
    ctx.moveTo(-s * .38, s * .25); ctx.quadraticCurveTo(-s * .3, -s * .1, -s * .28, -s * .2); ctx.quadraticCurveTo(-s * .25, -s * .5, 0, -s * .52);
    ctx.quadraticCurveTo(s * .25, -s * .5, s * .28, -s * .2); ctx.quadraticCurveTo(s * .3, -s * .1, s * .38, s * .25); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, s * .32, s * .1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(q.text || '', -bw / 2 + s * 1.55, s * .03);
    return { x: x - bw / 2, y: y - bh / 2, w: bw, h: bh };
  },

  notif(ctx, it, t, W, H) {
    const q = it.p, { a, b } = inOut(t, it, .4, .35);
    const bw = W * .9, bh = W * .2, x = (W - bw) / 2;
    const y = q.y * H - (1 - easeOut(Math.min(a, b))) * (bh + q.y * H + 20);
    ctx.fillStyle = 'rgba(245,245,247,.96)'; roundRect(ctx, x, y, bw, bh, bh * .22); ctx.fill();
    const ic = bh * .42;
    ctx.fillStyle = '#22C55E'; roundRect(ctx, x + bh * .2, y + bh * .18, ic, ic, ic * .25); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = cssFont('Poppins', ic * .55, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✉', x + bh * .2 + ic / 2, y + bh * .18 + ic / 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6B7280'; ctx.font = cssFont('Poppins', bh * .14, 600); ctx.fillText(String(q.app || '').toLocaleUpperCase('pt-BR') + '  ·  agora', x + bh * .2 + ic + bh * .15, y + bh * .3);
    ctx.fillStyle = '#111'; ctx.font = cssFont('Poppins', bh * .19, 800); ctx.fillText(q.title || '', x + bh * .2, y + bh * .62);
    ctx.fillStyle = '#374151'; ctx.font = cssFont('Poppins', bh * .16, 400); ctx.fillText(q.text || '', x + bh * .2, y + bh * .84);
    return { x, y, w: bw, h: bh };
  },

  swipe(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .3);
    const s = W * .06, x = q.x * W, y = q.y * H;
    ctx.globalAlpha = Math.min(a, b);
    ctx.strokeStyle = q.color || '#fff'; ctx.lineWidth = s * .22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const ph = (local * 1.6 - i * .22) % 1;
      const al = Math.sin(clamp01(ph) * Math.PI);
      ctx.globalAlpha = Math.min(a, b) * al;
      const yy = y - i * s * .9 - ph * s * .6;
      ctx.beginPath(); ctx.moveTo(x - s, yy); ctx.lineTo(x, yy - s * .7); ctx.lineTo(x + s, yy); ctx.stroke();
    }
    ctx.globalAlpha = Math.min(a, b);
    ctx.font = cssFont('Poppins', s * .8, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = s * .18; ctx.strokeStyle = '#000'; ctx.strokeText(q.text || '', x, y + s * 1.2);
    ctx.fillStyle = q.color || '#fff'; ctx.fillText(q.text || '', x, y + s * 1.2);
    return { x: x - W * .35, y: y - s * 3, w: W * .7, h: s * 5 };
  },

  comment(ctx, it, t, W, H) {
    const q = it.p, { a, b } = inOut(t, it, .35);
    const bw = W * .84, x = q.x * W - bw / 2, y = q.y * H;
    const fs = W * .04;
    ctx.font = cssFont('Poppins', fs, 400);
    const lines = wrap(ctx, q.text || '', bw - fs * 6);
    const bh = fs * 2.6 + lines.length * fs * 1.3;
    ctx.globalAlpha = b; ctx.translate(0, (1 - easeOut(a)) * W * .15); ctx.globalAlpha *= a;
    ctx.fillStyle = '#fff'; roundRect(ctx, x, y, bw, bh, fs * .8); ctx.fill();
    const r = fs * 1.2;
    const g = ctx.createLinearGradient(x + fs, y + fs, x + fs + r * 2, y + fs + r * 2); g.addColorStop(0, '#F59E0B'); g.addColorStop(1, '#EC4899');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + fs + r, y + fs + r, r, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#111'; ctx.font = cssFont('Poppins', fs * .9, 800); ctx.fillText(q.user || '', x + fs * 4, y + fs * .9);
    ctx.font = cssFont('Poppins', fs, 400); ctx.fillStyle = '#222';
    lines.forEach((l, i) => ctx.fillText(l, x + fs * 4, y + fs * 2.1 + i * fs * 1.3));
    heart(ctx, x + bw - fs * 1.6, y + fs * 1.6, fs * .9, '#FF2D55', true);
    ctx.fillStyle = '#6B7280'; ctx.font = cssFont('Poppins', fs * .7, 600); ctx.textAlign = 'center';
    ctx.fillText(q.likes || '', x + bw - fs * 1.6, y + fs * 2.4);
    return { x, y, w: bw, h: bh };
  },

  poll(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .35);
    const bw = W * .78, x = q.x * W - bw / 2, y = q.y * H;
    const fs = W * .05;
    const bh = fs * 6.4;
    ctx.globalAlpha = b; ctx.translate(q.x * W, y + bh / 2); ctx.scale(.5 + .5 * easeOutBack(a), .5 + .5 * easeOutBack(a)); ctx.translate(-q.x * W, -(y + bh / 2));
    ctx.fillStyle = '#fff'; roundRect(ctx, x, y, bw, bh, fs * .6); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = cssFont('Poppins', fs, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(q.q || '', q.x * W, y + fs * 1.1);
    const reveal = easeOut(clamp01((local - .8) / .8));
    const pa = (q.pa ?? 50) / 100;
    [[q.a, pa, '#93C5FD'], [q.b, 1 - pa, '#F9A8D4']].forEach(([lab, v, col], i) => {
      const yy = y + fs * 2.2 + i * fs * 2;
      ctx.fillStyle = '#F3F4F6'; roundRect(ctx, x + fs * .6, yy, bw - fs * 1.2, fs * 1.6, fs * .8); ctx.fill();
      if (reveal > 0) { ctx.fillStyle = col; roundRect(ctx, x + fs * .6, yy, Math.max(fs * 1.6, (bw - fs * 1.2) * v * reveal), fs * 1.6, fs * .8); ctx.fill(); }
      ctx.fillStyle = '#111'; ctx.font = cssFont('Poppins', fs * .75, 800); ctx.textAlign = 'left';
      ctx.fillText(lab || '', x + fs * 1.3, yy + fs * .82);
      if (reveal > 0) { ctx.textAlign = 'right'; ctx.fillStyle = '#111'; ctx.fillText(Math.round(v * 100 * reveal) + '%', x + bw - fs * 1.2, yy + fs * .82); }
    });
    return { x, y, w: bw, h: bh };
  },

  arrows(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .25);
    const s = W * .06, x = q.x * W, y = q.y * H;
    const ang = { baixo: Math.PI / 2, cima: -Math.PI / 2, esquerda: Math.PI, direita: 0 }[q.dir || 'baixo'];
    ctx.globalAlpha = Math.min(a, b); ctx.translate(x, y); ctx.rotate(ang);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const al = .3 + .7 * Math.max(0, Math.sin((local * 6 - i * 1.1)));
      const xx = (i - 1) * s * 1.1 + Math.sin(local * 6) * s * .15;
      for (const [col, lw] of [['#000', s * .42], [q.color || '#FFE600', s * .26]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.globalAlpha = Math.min(a, b) * al;
        ctx.beginPath(); ctx.moveTo(xx - s * .4, -s * .7); ctx.lineTo(xx + s * .35, 0); ctx.lineTo(xx - s * .4, s * .7); ctx.stroke();
      }
    }
    return { x: x - s * 2.2, y: y - s * 2.2, w: s * 4.4, h: s * 4.4 };
  },

  share(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .3);
    const s = W * .08, x = q.x * W, y = q.y * H;
    const pulse = 1 + .08 * Math.max(0, Math.sin(local * 5));
    ctx.globalAlpha = b; ctx.translate(x, y); ctx.scale((.4 + .6 * easeOutBack(a)) * pulse, (.4 + .6 * easeOutBack(a)) * pulse);
    // seta curva de compartilhar
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = s * .08; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s * .55, -s * .05); ctx.lineTo(s * .05, -s * .5); ctx.lineTo(s * .05, -s * .25);
    ctx.quadraticCurveTo(-s * .55, -s * .2, -s * .6, s * .45); ctx.quadraticCurveTo(-s * .3, s * .05, s * .05, s * .1);
    ctx.lineTo(s * .05, s * .38); ctx.closePath(); ctx.stroke(); ctx.fill();
    if (q.text) {
      const fs = s * .32; ctx.font = cssFont('Poppins', fs, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = fs * .22; ctx.strokeText(q.text, 0, s * .7); ctx.fillStyle = '#fff'; ctx.fillText(q.text, 0, s * .7);
    }
    return { x: x - s, y: y - s * .7, w: s * 2, h: s * 1.8 };
  },

  emoji(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .3);
    const size = W * (q.size || .18);
    let sc = .3 + .7 * easeOutBack(a), dy = 0;
    if (q.anim === 'bounce') dy = -Math.abs(Math.sin(local * 6)) * size * .2;
    ctx.globalAlpha = b; ctx.translate(q.x * W, q.y * H + dy); ctx.scale(sc, sc);
    ctx.font = `${Math.round(size)}px "Noto Color Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q.text, 0, 0);
    return { x: q.x * W - size * .6, y: q.y * H - size * .6, w: size * 1.2, h: size * 1.2 };
  },

  arrow(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .35);
    const L = W * (q.size || .25);
    const k = easeOut(a);
    const wob = Math.sin(local * 8) * L * .04;
    ctx.globalAlpha = b; ctx.translate(q.x * W, q.y * H); ctx.rotate((q.rot || 0) * Math.PI / 180);
    ctx.translate(-L * .5 + wob, 0);
    ctx.strokeStyle = '#000'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [col, lw] of [['#000', L * .11], [q.color || '#FFE600', L * .065]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L * k, 0); ctx.stroke();
      if (k > .7) { ctx.beginPath(); ctx.moveTo(L * k - L * .25, -L * .2); ctx.lineTo(L * k, 0); ctx.lineTo(L * k - L * .25, L * .2); ctx.stroke(); }
    }
    return { x: q.x * W - L * .6, y: q.y * H - L * .3, w: L * 1.2, h: L * .6 };
  },

  circle(ctx, it, t, W, H) {
    const q = it.p, { a, b } = inOut(t, it, .45);
    const r = W * (q.r || .18);
    const k = easeOut(a);
    ctx.globalAlpha = b; ctx.lineCap = 'round';
    for (const [col, lw] of [['#000', r * .13], [q.color || '#FF2B2B', r * .08]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
      for (let i = 0; i <= 60 * k; i++) {
        const ang = -Math.PI * .6 + i / 60 * Math.PI * 2.15;
        const rr = r * (1 + .06 * Math.sin(i * .7));
        const x = q.x * W + Math.cos(ang) * rr, y = q.y * H + Math.sin(ang) * rr * .8;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    return { x: q.x * W - r, y: q.y * H - r, w: r * 2, h: r * 2 };
  },

  confetti(ctx, it, t, W, H) {
    const { b, local } = inOut(t, it, .01, .4);
    ctx.globalAlpha = b; confetti(ctx, W, H, local, it.start);
    return null;
  },

  progress(ctx, it, t, W, H, env) {
    const q = it.p;
    const k = clamp01(t / Math.max(.1, env.total));
    const h = Math.max(6, H * .008);
    const y = q.pos === 'bottom' ? H - h : 0;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, y, W, h);
    ctx.fillStyle = q.color || '#FFE600'; ctx.fillRect(0, y, W * k, h);
    return null;
  },

  image(ctx, it, t, W, H, env) {
    const q = it.p;
    const img = q.mid && env.image(q.mid);
    if (!img) return null;
    const { a, b } = inOut(t, it, .3);
    const w = W * (q.scale || .3), h = w * (img.height / img.width);
    let sc = 1, al = 1;
    if (q.anim === 'pop') sc = .3 + .7 * easeOutBack(a);
    else if (q.anim === 'fade') al = a;
    ctx.globalAlpha = (q.opacity ?? 1) * al * b;
    ctx.translate(q.x * W, q.y * H); ctx.scale(sc, sc);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    return { x: q.x * W - w / 2, y: q.y * H - h / 2, w, h };
  },
};

function heart(ctx, x, y, s, color, outline) {
  ctx.save(); ctx.translate(x, y); ctx.beginPath();
  ctx.moveTo(0, s * .35);
  ctx.bezierCurveTo(-s * .9, -s * .2, -s * .45, -s * .85, 0, -s * .4);
  ctx.bezierCurveTo(s * .45, -s * .85, s * .9, -s * .2, 0, s * .35);
  ctx.closePath();
  if (outline) { ctx.lineWidth = s * .1; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke(); }
  ctx.fillStyle = color; ctx.fill(); ctx.restore();
}

function confetti(ctx, W, H, local, seed) {
  const cols = ['#FFE600', '#FFFFFF', '#E1251B', '#22C55E', '#3B82F6', '#FF7AB6'];
  for (let i = 0; i < 140; i++) {
    const r1 = hash(i + seed), r2 = hash(i * 2.3 + seed), r3 = hash(i * 5.1 + seed);
    const life = (local * (0.35 + r3 * 0.35) + r1) % 1.2;
    const x = (r2 + Math.sin(local * (1 + r1 * 2) + i) * .04) * W;
    const y = (life - .1) * H * 1.1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(local * (2 + r3 * 6) + i);
    ctx.fillStyle = cols[i % cols.length];
    const s = W * (.012 + r3 * .01);
    ctx.fillRect(-s / 2, -s / 4, s, s * Math.abs(Math.cos(local * 5 + i)) * .6 + s * .1);
    ctx.restore();
  }
}
