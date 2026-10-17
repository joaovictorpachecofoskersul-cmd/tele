// Elementos desenhados por cima do vídeo (Canvas 2D).
import { interp } from './kf.js';
import { cssFont } from './fonts.js';
import { roundRect } from './captions.js';
import BRAZIL from '../vendor/brazil-map.js';
import { CARTELA_DRAW, CARTELA_ELEMENTS } from './cartelas.js';
import { GRAFICO_DRAW, GRAFICO_ELEMENTS } from './graficos.js';
import { RETENCAO_DRAW, RETENCAO_ELEMENTS, drawRewindMarks } from './retencao.js';

export const TEXT_ANIMS = [
  { id: 'pop', name: 'Pular' }, { id: 'fade', name: 'Aparecer' }, { id: 'slide', name: 'Subir' },
  { id: 'type', name: 'Máquina de escrever' }, { id: 'letters3d', name: 'Letras 3D com brilho' },
  { id: 'bounce', name: 'Quicar' }, { id: 'blink', name: 'Piscar' }, { id: 'zoom', name: 'Zoom de longe' },
  { id: 'words', name: 'Palavra por palavra' }, { id: 'letters', name: 'Letra por letra' }, { id: 'wave', name: 'Onda' },
  { id: 'glitch', name: 'Glitch' }, { id: 'neon', name: 'Neon piscando' }, { id: 'blurin', name: 'Desfoque entrando' },
  { id: 'reveal', name: 'Revelar da esquerda' }, { id: 'highlight', name: 'Marca-texto' }, { id: 'drop', name: 'Cair de cima' },
  { id: 'spin', name: 'Girar entrando' }, { id: 'stretch', name: 'Esticar' }, { id: 'shake', name: 'Tremer' },
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
  { kind: 'pill', name: 'Etiqueta', p: { text: 'AULA 1 DE 5', bg: '#FFE600', color: '#111111', x: .5, y: .12, size: .045 } },
  { kind: 'checklist', name: 'Lista com checks', p: { text: 'Água tratada\nEsgoto\nMoradia digna\nAcesso à saúde', x: .5, y: .45, size: .055, color: '#FFFFFF', check: '#22C55E', box: 'rgba(0,0,0,.55)' } },
  { kind: 'people', name: 'Pessoas (1 em cada N)', p: { total: 10, hi: 3, label: '3 EM CADA 10', color: '#FFE600', x: .5, y: .45 } },
  { kind: 'map', name: 'Mapa do Brasil', p: { states: 'MT, BA, PA', color: '#FFE600', base: 'rgba(255,255,255,.25)', label: '', x: .5, y: .45, size: .8 } },
  { kind: 'bars', name: 'Gráfico de barras', p: { text: 'Norte: 42\nNordeste: 35\nCentro-Oeste: 12\nSudeste: 8\nSul: 3', title: 'CASOS POR REGIÃO (%)', color: '#FFE600', x: .5, y: .45 } },
  { kind: 'module', name: 'Card de módulo', p: { num: 'MÓDULO 2', title: 'O que é e como prevenir', bg: '#173B32', accent: '#F0B429' } },
  { kind: 'floaters', name: 'Fundo animado', p: { color: '#FFFFFF', amount: .5 } },
  { kind: 'blurbox', name: 'Desfocar área', p: { x: .5, y: .82, w: .9, h: .1, mode: 'blur' } },
  { kind: 'blurbox', name: 'Apagar logo / legenda antiga', p: { x: .82, y: .08, w: .3, h: .07, mode: 'remove' } },
  { kind: 'text', name: 'Crédito de imagem', p: { text: 'Foto: Autor, CC BY 4.0', font: 'Poppins', size: .026, color: '#FFFFFF', stroke: '', bg: 'rgba(0,0,0,.5)', x: .5, y: .95, anim: 'fade', upper: false } },
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
  { kind: 'pip', name: 'Vídeo no canto (PiP)', p: { mid: null, in: 0, x: .74, y: .2, w: .42, h: .26, shape: 'round', border: '#FFFFFF', bw: .006, shadow: true, vol: 0, cut: false, anim: 'pop', zoom: 1, fit: 'cover' }, needsVideo: true },
  { kind: 'pip', name: 'Vídeo em círculo', p: { mid: null, in: 0, x: .8, y: .78, w: .36, h: .36, shape: 'circle', border: '#FFDE00', bw: .008, shadow: true, vol: 0, cut: false, anim: 'pop', zoom: 1, fit: 'cover' }, needsVideo: true },
  { kind: 'pip', name: 'Tela dividida (metade de cima)', p: { mid: null, in: 0, x: .5, y: .25, w: 1, h: .5, shape: 'rect', border: '', bw: 0, shadow: false, vol: 0, cut: false, anim: 'none', zoom: 1, fit: 'cover' }, needsVideo: true },
  { kind: 'pip', name: 'Pessoa recortada por cima', p: { mid: null, in: 0, x: .5, y: .62, w: .9, h: .7, shape: 'rect', border: '', bw: 0, shadow: false, vol: 0, cut: true, anim: 'pop', zoom: 1, fit: 'contain' }, needsVideo: true },
  { kind: 'e_rating', name: 'Avaliação (estrelas)', group: 'Redes sociais', p: { x: .5, y: .3, stars: 5, size: 1, color: '#FACC15', text: 'NOTA MÁXIMA' } },
  { kind: 'e_subscribe', name: 'Botão inscrever-se', group: 'Redes sociais', p: { x: .5, y: .8, text: 'INSCREVER-SE', done: 'INSCRITO ✓', color: '#FF0000' } },
  { kind: 'e_typing', name: 'Mensagem chegando', group: 'Redes sociais', p: { x: .5, y: .4, text: 'Oi! Viu o vídeo?', side: 'esquerda', wait: 1.5 } },
  { kind: 'e_pin', name: 'Pino de local', group: 'Destaques', p: { x: .5, y: .55, text: 'AQUI', color: '#EF4444' } },
  { kind: 'e_price', name: 'Etiqueta de preço', group: 'Destaques', p: { x: .7, y: .3, price: 'R$ 49,90', old: 'R$ 89,90', color: '#EF4444', size: .1 } },
  { kind: 'e_sparkles', name: 'Brilhos', group: 'Destaques', p: { x: .5, y: .4, size: .25, color: '#FFF7AE' } },
  { kind: 'e_loading', name: 'Barra carregando', group: 'Destaques', p: { x: .5, y: .5, text: 'CARREGANDO...', color: '#22C55E' } },
  { kind: 'e_underline', name: 'Sublinhado à mão', group: 'Destaques', p: { x: .5, y: .35, w: .5, color: '#FFE600' } },
  { kind: 'e_check', name: 'Certo ✓ / Errado ✕', group: 'Destaques', p: { x: .5, y: .4, mode: 'certo', size: .18, color: '' } },
  { kind: 'image', name: 'Imagem / logo', p: { mid: null, x: .5, y: .15, scale: .3, opacity: 1, anim: 'pop', credit: '', kb: false }, needsImage: true },
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

// unidade de tamanho: o lado menor do quadro (assim os elementos ficam iguais no vertical, quadrado e deitado)
let U = 1080;

export function drawItems(ctx, p, t, W, H, env) {
  U = Math.min(W, H);
  const boxes = [];
  const order = p.items.filter(it => it.kind === 'blurbox').concat(p.items.filter(it => it.kind !== 'blurbox'));
  for (const it of order) {
    if (it.kind === 'effect') {
      if (it.p.fx === 'rewind' && t >= it.start && t < it.start + it.dur) { ctx.save(); drawRewindMarks(ctx, it, t, W, H); ctx.restore(); }
      continue;
    }
    if (it.kind === 'sfx' || it.kind === 'audio') continue;
    if (t < it.start || t >= it.start + it.dur) continue;
    const fn = DRAW[it.kind];
    if (!fn) continue;
    ctx.save();
    // keyframes: posição, tamanho, giro e opacidade ao longo do tempo
    let d = it;
    let ks = 1, kr = 0;
    if (it.kf && it.kf.length && !it._live) {
      const v = interp(it.kf, t - it.start);
      if (v.x != null || v.y != null) d = { ...it, p: { ...it.p, x: v.x ?? it.p.x, y: v.y ?? it.p.y } };
      if (v.s != null) ks = Math.max(0.01, v.s);
      if (v.r != null) kr = v.r;
      if (v.o != null) ctx.globalAlpha *= Math.max(0, Math.min(1, v.o));
    }
    if (it.p.blend && it.p.blend !== 'normal') ctx.globalCompositeOperation = it.p.blend;
    const gs = (/^[gr]_/.test(it.kind) && it.p.scale ? it.p.scale : 1) * ks;
    const ax = (d.p.x ?? .5) * W, ay = (d.p.y ?? .5) * H;
    const tf = gs !== 1 || kr;
    if (tf) { ctx.translate(ax, ay); if (kr) ctx.rotate(kr * Math.PI / 180); ctx.scale(gs, gs); ctx.translate(-ax, -ay); }
    try {
      let b = fn(ctx, d, t, W, H, env, p);
      if (b && tf) b = { ...b, x: ax + (b.x - ax) * gs, y: ay + (b.y - ay) * gs, w: b.w * gs, h: b.h * gs };
      if (b) boxes.push({ id: it.id, ...b });
    } catch (e) { /* um elemento com erro não derruba o quadro */ }
    ctx.restore();
  }
  return boxes;
}

function textBlock(ctx, it, t, W, H) {
  const q = it.p;
  const { a, b, local } = inOut(t, it);
  const size = U * (q.size || .08);
  ctx.font = cssFont(q.font || 'Poppins', size, 900);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const txt = q.upper ? String(q.text).toLocaleUpperCase('pt-BR') : String(q.text);
  const lines = wrap(ctx, txt, W * (q.full ? 0.94 : 0.86));
  const lh = size * 1.15;
  const widths = lines.map(l => ctx.measureText(l).width);
  const bw = Math.max(...widths, 1);
  const cx = q.x * W, cy = q.y * H;
  const box = { x: cx - bw / 2 - size * .35, y: cy - lines.length * lh / 2 - size * .2, w: bw + size * .7, h: lines.length * lh + size * .4 };
  let alpha = 1, sc = 1, dy = 0, dx = 0, sx = 1, rot = 0, visible = txt.length, blur = 0, clipW = 1;
  switch (q.anim) {
    case 'drop': { const e = 1 - Math.pow(1 - a, 3); dy = -(1 - easeOutBounce(a)) * H * .25; alpha = Math.min(1, e * 4); break; }
    case 'spin': rot = (1 - easeOut(a)) * -200; sc = .2 + .8 * easeOutBack(a); alpha = Math.min(1, a * 3); break;
    case 'stretch': sx = .05 + .95 * easeOutBack(a); alpha = Math.min(1, a * 4); break;
    case 'shake': dx = Math.sin(local * 45) * size * .05; dy = Math.cos(local * 38) * size * .03; alpha = Math.min(1, a * 3); break;
    case 'blurin': blur = (1 - a) * size * .35; sc = 1.35 - .35 * easeOut(a); alpha = a; break;
    case 'reveal': clipW = easeOut(clamp01(local / .6)); break;
    case 'highlight': clipW = 1; break;
    case 'neon': alpha = local < .6 ? ((Math.floor(local * 14) % 3) ? .25 : 1) : (.92 + .08 * Math.sin(local * 20)); break;
    case 'words': case 'letters': case 'wave': case 'glitch': alpha = 1; break;
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
  ctx.translate(cx + dx, cy + dy); ctx.scale(sc * sx, sc); if (rot) ctx.rotate(rot * Math.PI / 180); ctx.translate(-cx, -cy);
  if (q.rot) { ctx.translate(cx, cy); ctx.rotate(q.rot * Math.PI / 180); ctx.translate(-cx, -cy); }
  if (blur > 0.5) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  if (q.anim === 'reveal') { ctx.beginPath(); ctx.rect(box.x - size, box.y - size, (box.w + size * 2) * clipW, box.h + size * 2); ctx.clip(); }
  if (q.anim === 'highlight') {
    const k = easeOut(clamp01(local / .5));
    ctx.fillStyle = q.bg || '#FFE600';
    lines.forEach((ln, i) => { const w = widths[i], y = cy + (i - (lines.length - 1) / 2) * lh; ctx.fillRect(cx - w / 2 - size * .15, y - size * .5, (w + size * .3) * k, size * 1.0); });
    if (!q.stroke) { ctx.save(); ctx.globalAlpha *= clamp01((local - .25) / .2); }
    flatChars(ctx, lines, cx, cy, lh, size, q, local, 'none');
    if (!q.stroke) ctx.restore();
    return box;
  }
  if (q.bg) {
    ctx.fillStyle = q.bg;
    if (q.full) ctx.fillRect(0, box.y, W, box.h);
    else { roundRect(ctx, box.x, box.y, box.w, box.h, size * .18); ctx.fill(); }
  }
  if (q.anim === 'letters3d') { letters3d(ctx, lines, cx, cy, lh, size, q, local); return box; }
  if (['words', 'letters', 'wave', 'glitch', 'neon'].includes(q.anim)) { flatChars(ctx, lines, cx, cy, lh, size, q, local, q.anim); ctx.filter = 'none'; return box; }
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

function easeOutBounce(x) {
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + .75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + .9375;
  return n * (x -= 2.625 / d) * x + .984375;
}

// texto desenhado por palavra/letra: palavra por palavra, letra por letra, onda, glitch, neon
function flatChars(ctx, lines, cx, cy, lh, size, q, local, mode) {
  const stroke = (s, x, y) => {
    if (!q.stroke) return;
    ctx.lineJoin = 'round'; ctx.lineWidth = size * .16; ctx.strokeStyle = q.stroke; ctx.strokeText(s, x, y);
  };
  let wi = 0, ci = 0;
  ctx.textAlign = 'left';
  lines.forEach((ln, li) => {
    const y0 = cy + (li - (lines.length - 1) / 2) * lh;
    const total = ctx.measureText(ln).width;
    let x = cx - total / 2;
    if (mode === 'glitch') {
      const j = Math.floor(local * 12);
      const off = (hash(j + li) - .5) * size * (local < .5 ? .25 : .07);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,0,60,.8)'; ctx.fillText(ln, x + off, y0);
      ctx.fillStyle = 'rgba(0,240,255,.8)'; ctx.fillText(ln, x - off, y0 + off * .3);
      ctx.restore();
      stroke(ln, x, y0); ctx.fillStyle = q.color || '#fff'; ctx.fillText(ln, x, y0);
      // faixa cortada deslocada
      if (hash(j * 3.1) > .55) {
        const sy = y0 - size * .5 + hash(j * 7.7) * size * .8, sh = size * .18;
        ctx.save(); ctx.beginPath(); ctx.rect(x - size, sy, total + size * 2, sh); ctx.clip();
        ctx.fillStyle = q.color || '#fff'; ctx.fillText(ln, x + (hash(j) - .5) * size * .6, y0); ctx.restore();
      }
      return;
    }
    if (mode === 'neon') {
      ctx.save(); ctx.shadowColor = q.color || '#00E5FF'; ctx.shadowBlur = size * .6;
      ctx.fillStyle = q.color || '#00E5FF'; ctx.fillText(ln, x, y0); ctx.shadowBlur = size * .25; ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha *= .85; ctx.fillText(ln, x, y0); ctx.restore();
      return;
    }
    const words = ln.split(' ');
    for (let w = 0; w < words.length; w++) {
      const word = words[w] + (w < words.length - 1 ? ' ' : '');
      if (mode === 'words' || mode === 'none') {
        const k = mode === 'none' ? 1 : clamp01((local - wi * .22) / .25);
        if (k > 0) {
          ctx.save(); const ww = ctx.measureText(word).width;
          ctx.globalAlpha *= clamp01(k * 3);
          ctx.translate(x + ww / 2, y0); const e = .4 + .6 * easeOutBack(k); ctx.scale(e, e); ctx.translate(-(x + ww / 2), -y0);
          stroke(word, x, y0); ctx.fillStyle = q.color || '#fff'; ctx.fillText(word, x, y0); ctx.restore();
        }
        x += ctx.measureText(word).width; wi++;
        continue;
      }
      for (const ch of word) {
        const cw = ctx.measureText(ch).width;
        ctx.save();
        if (mode === 'letters') {
          const k = clamp01((local - ci * .05) / .3);
          ctx.globalAlpha *= clamp01(k * 3);
          ctx.translate(x + cw / 2, y0); const e = easeOutBack(k); ctx.scale(e, e); ctx.translate(-(x + cw / 2), -y0);
        } else if (mode === 'wave') {
          ctx.translate(0, Math.sin(local * 6 - ci * .45) * size * .14);
        }
        stroke(ch, x, y0); ctx.fillStyle = q.color || '#fff'; ctx.fillText(ch, x, y0);
        ctx.restore();
        x += cw; ci++;
      }
      wi++;
    }
  });
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
    const size = U * (q.size || .14);
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
    const size = U * (q.size || .16);
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
    const size = U * (q.size || .3);
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
    const s1 = U * .2, s2 = U * .075;
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
    const s1 = U * .055, s2 = U * .036;
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
    const s = U * .05;
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
    const size = U * (q.size || .065);
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

  pill(ctx, it, t, W, H) {
    const q = it.p, { a, b } = inOut(t, it, .3);
    const fs = U * (q.size || .045);
    ctx.font = cssFont('Poppins', fs, 800);
    const txt = String(q.text || '').toLocaleUpperCase('pt-BR');
    const tw = ctx.measureText(txt).width, bw = tw + fs * 1.6, bh = fs * 1.9;
    const cx = q.x * W, cy = q.y * H;
    ctx.globalAlpha = b; ctx.translate(cx, cy); ctx.scale(.4 + .6 * easeOutBack(a), .4 + .6 * easeOutBack(a));
    ctx.fillStyle = q.bg || '#FFE600'; roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
    ctx.fillStyle = q.color || '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 0, fs * .05);
    return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
  },

  checklist(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .3);
    const fs = U * (q.size || .055);
    const lines = String(q.text || '').split('\n').map(x => x.trim()).filter(Boolean);
    if (!lines.length) return null;
    ctx.font = cssFont('Poppins', fs, 700);
    const lh = fs * 1.9;
    const bw = Math.min(W * .9, Math.max(...lines.map(l => ctx.measureText(l).width)) + fs * 3.2), bh = lines.length * lh + fs;
    const x0 = q.x * W - bw / 2, y0 = q.y * H - bh / 2;
    ctx.globalAlpha = Math.min(a, b);
    if (q.box) { ctx.fillStyle = q.box; roundRect(ctx, x0, y0, bw, bh, fs * .6); ctx.fill(); }
    // cada item começa apagado ("fantasma") e acende na sua vez
    const step = Math.max(.35, (it.dur - .8) / lines.length);
    lines.forEach((l, i) => {
      const k = clamp01((local - .3 - i * step) / .3);
      const y = y0 + fs * .5 + lh * (i + .5);
      const cx = x0 + fs * 1.3, r = fs * .55;
      ctx.globalAlpha = Math.min(a, b) * (.3 + .7 * k);
      ctx.lineWidth = fs * .12; ctx.strokeStyle = k > 0 ? (q.check || '#22C55E') : 'rgba(255,255,255,.6)';
      ctx.fillStyle = k > 0 ? (q.check || '#22C55E') : 'transparent';
      ctx.beginPath(); ctx.arc(cx, y, r * (k > 0 ? .9 + .2 * Math.sin(Math.min(1, k) * Math.PI) : 1), 0, Math.PI * 2);
      if (k > 0) ctx.fill(); ctx.stroke();
      if (k > 0) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = fs * .13; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(cx - r * .45, y); ctx.lineTo(cx - r * .45 + r * .35 * Math.min(1, k * 2), y + r * .35 * Math.min(1, k * 2));
        if (k > .5) ctx.lineTo(cx - r * .1 + r * .6 * (k - .5) * 2, y + r * .35 - r * .7 * (k - .5) * 2);
        ctx.stroke();
      }
      ctx.fillStyle = q.color || '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(l, cx + fs * 1.1, y + fs * .03);
    });
    return { x: x0, y: y0, w: bw, h: bh };
  },

  people(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .3);
    const n = Math.max(1, Math.min(50, Math.round(q.total || 10))), hi = Math.max(0, Math.min(n, Math.round(q.hi || 0)));
    const cols = n <= 10 ? n : Math.ceil(Math.sqrt(n * 2));
    const rows = Math.ceil(n / cols);
    const cell = Math.min(W * .86 / cols, H * .3 / rows);
    const x0 = q.x * W - cols * cell / 2, y0 = q.y * H - rows * cell / 2;
    ctx.globalAlpha = b;
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const k = clamp01((local - i * .05) / .25);
      const on = i < hi && local > .6 + n * .05 + i * .12;
      const x = x0 + (c + .5) * cell, y = y0 + (r + .5) * cell + (1 - easeOutBack(k)) * cell * .4;
      ctx.globalAlpha = b * k;
      ctx.fillStyle = on ? (q.color || '#FFE600') : 'rgba(255,255,255,.35)';
      const s = cell * .42;
      ctx.beginPath(); ctx.arc(x, y - s * .55, s * .32, 0, Math.PI * 2); ctx.fill();
      roundRect(ctx, x - s * .42, y - s * .15, s * .84, s * .95, s * .35); ctx.fill();
    }
    ctx.globalAlpha = b * clamp01((local - .8) / .4);
    if (q.label) {
      const fs = U * .07; ctx.font = cssFont('Poppins', fs, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = fs * .16; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round';
      ctx.strokeText(q.label, q.x * W, y0 + rows * cell + fs * .3); ctx.fillStyle = q.color || '#FFE600'; ctx.fillText(q.label, q.x * W, y0 + rows * cell + fs * .3);
    }
    return { x: x0, y: y0, w: cols * cell, h: rows * cell + W * .12 };
  },

  map(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .4);
    const paths = brazilPaths();
    const [vw, vh] = [613, 639];
    const size = Math.min(W * .95, U * (q.size || .8)), sc = size / vw;
    const x0 = q.x * W - size / 2, y0 = q.y * H - vh * sc / 2;
    const sel = new Set(String(q.states || '').toLowerCase().split(/[\s,;]+/).filter(Boolean));
    ctx.globalAlpha = b * Math.min(1, a * 1.5);
    ctx.save(); ctx.translate(x0, y0); ctx.scale(sc, sc);
    ctx.lineJoin = 'round';
    let i = 0;
    for (const [id, path] of paths) {
      const on = sel.has(id);
      const k = on ? clamp01((local - .5 - (i++) * .15) / .35) : 0;
      ctx.fillStyle = on && k > 0 ? mix(q.base || '#555', q.color || '#FFE600', k) : (q.base || 'rgba(255,255,255,.25)');
      ctx.fill(path);
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.2 / Math.max(.3, sc) * sc * 1.5; ctx.stroke(path);
    }
    ctx.restore();
    if (q.label) {
      const fs = U * .06; ctx.font = cssFont('Poppins', fs, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = fs * .16; ctx.strokeStyle = '#000'; ctx.strokeText(q.label, q.x * W, y0 + vh * sc + fs * .2);
      ctx.fillStyle = '#fff'; ctx.fillText(q.label, q.x * W, y0 + vh * sc + fs * .2);
    }
    const cf = Math.max(9, U * .016); ctx.font = cssFont('Poppins', cf, 400); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('Mapa: @svg-maps, CC BY 4.0', x0 + size, y0 + vh * sc);
    return { x: x0, y: y0, w: size, h: vh * sc };
  },

  bars(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .3);
    const rows = String(q.text || '').split('\n').map(l => { const m = l.split(':'); return { label: (m[0] || '').trim(), v: parseFloat(String(m[1] || '').replace(',', '.')) || 0 }; }).filter(r => r.label);
    if (!rows.length) return null;
    const max = Math.max(...rows.map(r => r.v), 1e-9);
    const bw = Math.min(W * .86, U * 1.1), fs = U * .042, rh = fs * 2.3;
    const titleH = q.title ? fs * 2.2 : 0;
    const bh = titleH + rows.length * rh + fs;
    const x0 = q.x * W - bw / 2, y0 = q.y * H - bh / 2;
    ctx.globalAlpha = Math.min(a, b);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; roundRect(ctx, x0, y0, bw, bh, fs * .6); ctx.fill();
    if (q.title) { ctx.font = cssFont('Poppins', fs * 1.05, 900); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q.title, q.x * W, y0 + titleH * .6); }
    const labW = bw * .34, barX = x0 + labW + fs * .6, barMax = bw - labW - fs * 4.2;
    rows.forEach((r, i) => {
      const k = easeOut(clamp01((local - .3 - i * .15) / .7));
      const y = y0 + titleH + fs * .5 + i * rh;
      ctx.font = cssFont('Poppins', fs * .85, 700); ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(r.label, x0 + labW, y + rh / 2);
      ctx.fillStyle = q.color || '#FFE600'; roundRect(ctx, barX, y + rh * .2, Math.max(2, barMax * (r.v / max) * k), rh * .6, rh * .15); ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = cssFont('Poppins', fs * .85, 800);
      ctx.fillText((r.v * k).toLocaleString('pt-BR', { maximumFractionDigits: 1 }), barX + barMax * (r.v / max) * k + fs * .4, y + rh / 2);
    });
    return { x: x0, y: y0, w: bw, h: bh };
  },

  module(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .35, .3);
    ctx.globalAlpha = Math.min(a, b);
    ctx.fillStyle = q.bg || '#173B32'; ctx.fillRect(0, 0, W, H);
    const e = easeOut(clamp01(local / .6));
    ctx.fillStyle = q.accent || '#F0B429';
    ctx.fillRect(0, H * .4, W * e, H * .012);
    floatersDraw(ctx, W, H, local, .35, '#FFFFFF', 7);
    const f1 = U * .075, f2 = U * .085;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = Math.min(a, b) * clamp01((local - .15) / .3);
    ctx.font = cssFont('Poppins', f1, 800); ctx.fillStyle = q.accent || '#F0B429';
    ctx.fillText(String(q.num || '').toLocaleUpperCase('pt-BR'), W / 2, H * .34);
    ctx.globalAlpha = Math.min(a, b) * clamp01((local - .35) / .35);
    ctx.font = cssFont('Poppins', f2, 900); ctx.fillStyle = '#fff';
    const lines = wrap(ctx, q.title || '', W * .84);
    lines.forEach((l, i) => ctx.fillText(l, W / 2, H * .5 + i * f2 * 1.2 + (1 - easeOut(clamp01((local - .35) / .4))) * f2));
    return { x: 0, y: 0, w: W, h: H };
  },

  floaters(ctx, it, t, W, H) {
    const { a, b, local } = inOut(t, it, .6, .6);
    ctx.globalAlpha = Math.min(a, b);
    floatersDraw(ctx, W, H, local, it.p.amount ?? .5, it.p.color || '#fff', 14);
    return null;
  },

  blurbox(ctx, it, t, W, H, env) {
    const q = it.p;
    const w = Math.max(4, q.w * W), h = Math.max(4, q.h * H), x = q.x * W - w / 2, y = q.y * H - h / 2;
    if (q.mode === 'remove') { inpaint(ctx, x, y, w, h); return { x, y, w, h }; }
    const k = q.mode === 'pixel' ? 0.04 : 0.08;
    const sw = Math.max(2, Math.round(w * k)), sh = Math.max(2, Math.round(h * k));
    const tmp = env.scratch(sw, sh); const c2 = tmp.getContext('2d');
    c2.imageSmoothingEnabled = true; c2.clearRect(0, 0, sw, sh);
    c2.drawImage(ctx.canvas, x, y, w, h, 0, 0, sw, sh);
    ctx.save(); ctx.beginPath(); roundRect(ctx, x, y, w, h, Math.min(w, h) * .2); ctx.clip();
    ctx.imageSmoothingEnabled = q.mode !== 'pixel';
    ctx.drawImage(tmp, 0, 0, sw, sh, x, y, w, h);
    if (q.mode !== 'pixel') { ctx.globalAlpha = .25; ctx.drawImage(tmp, 0, 0, sw, sh, x - w * .02, y - h * .02, w * 1.04, h * 1.04); }
    ctx.restore(); ctx.imageSmoothingEnabled = true;
    return { x, y, w, h };
  },

  like(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .25);
    const s = U * .1, x = q.x * W, y = q.y * H;
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
    const s = U * .09, x = q.x * W, y = q.y * H;
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
    const s = U * .14, x = q.x * W, y = q.y * H;
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
    const s = U * .085, x = q.x * W, y = q.y * H;
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
    const bw = Math.min(W * .9, U * .95), bh = U * .2, x = (W - bw) / 2;
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
    const s = U * .06, x = q.x * W, y = q.y * H;
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
    const bw = U * .84, x = q.x * W - bw / 2, y = q.y * H;
    const fs = U * .04;
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
    const bw = U * .78, x = q.x * W - bw / 2, y = q.y * H;
    const fs = U * .05;
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
    const s = U * .06, x = q.x * W, y = q.y * H;
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
    const s = U * .08, x = q.x * W, y = q.y * H;
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
    const size = U * (q.size || .18);
    let sc = .3 + .7 * easeOutBack(a), dy = 0;
    if (q.anim === 'bounce') dy = -Math.abs(Math.sin(local * 6)) * size * .2;
    ctx.globalAlpha = b; ctx.translate(q.x * W, q.y * H + dy); ctx.scale(sc, sc);
    ctx.font = `${Math.round(size)}px "Noto Color Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q.text, 0, 0);
    return { x: q.x * W - size * .6, y: q.y * H - size * .6, w: size * 1.2, h: size * 1.2 };
  },

  arrow(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it, .35);
    const L = U * (q.size || .25);
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
    const r = U * (q.r || .18);
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
    if (q.kb) {
      const k = 1 + 0.12 * clamp01((t - it.start) / it.dur);
      ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip();
      ctx.drawImage(img, -w * k / 2, -h * k / 2, w * k, h * k); ctx.restore();
    } else ctx.drawImage(img, -w / 2, -h / 2, w, h);
    if (q.credit) {
      const fs = Math.max(10, U * .022); ctx.font = cssFont('Poppins', fs, 600);
      const tw = ctx.measureText(q.credit).width;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(w / 2 - tw - fs * .8, h / 2 - fs * 1.5, tw + fs * .8, fs * 1.5);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(q.credit, w / 2 - fs * .4, h / 2 - fs * .75);
    }
    return { x: q.x * W - w / 2, y: q.y * H - h / 2, w, h };
  },
};

let _br = null;
function brazilPaths() {
  if (!_br) _br = (BRAZIL.locations || []).map(l => [l.id, new Path2D(l.path)]);
  return _br;
}

function mix(c1, c2, k) {
  const p = c => { const m = /^#?([0-9a-f]{6})$/i.exec(c); if (!m) return [120, 120, 120]; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const a = p(c1), b = p(c2);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
}

function floatersDraw(ctx, W, H, local, amount, color, n) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const r1 = hash(i * 1.7), r2 = hash(i * 3.3), r3 = hash(i * 5.9);
    const R = U * (.03 + r3 * .1);
    const x = ((r1 + local * (.02 + r2 * .03)) % 1.2 - .1) * W, y = ((r2 + Math.sin(local * .5 + i) * .03 + 1 - (local * (.01 + r1 * .02)) % 1.2)) % 1.2 * H;
    ctx.globalAlpha = (.05 + .08 * r3) * amount * 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (i % 3 === 0) ctx.arc(x, y, R, 0, Math.PI * 2);
    else if (i % 3 === 1) { ctx.translate(x, y); ctx.rotate(local * .3 + i); roundRect(ctx, -R, -R, R * 2, R * 2, R * .3); ctx.setTransform(1, 0, 0, 1, 0, 0); }
    else { ctx.lineWidth = R * .15; ctx.strokeStyle = color; ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke(); continue; }
    ctx.fill();
  }
  ctx.restore();
}

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
    const s = U * (.012 + r3 * .01);
    ctx.fillRect(-s / 2, -s / 4, s, s * Math.abs(Math.cos(local * 5 + i)) * .6 + s * .1);
    ctx.restore();
  }
}

// cartelas, gráficos e retenção
// Apagar logo / legenda antiga: preenche a área com o que está em volta (difusão a partir da borda)
const ipA = typeof document !== 'undefined' ? document.createElement('canvas') : null;
function inpaint(ctx, x, y, w, h) {
  const scale = Math.min(1, 180 / Math.max(w, h));
  const sw = Math.max(6, Math.round(w * scale)) + 2, sh = Math.max(6, Math.round(h * scale)) + 2;
  const mx = w / (sw - 2), my = h / (sh - 2);              // tamanho de 1 pixel pequeno em pixels reais
  if (ipA.width !== sw || ipA.height !== sh) { ipA.width = sw; ipA.height = sh; }
  const a = ipA.getContext('2d', { willReadFrequently: true });
  a.imageSmoothingEnabled = true;
  a.drawImage(ctx.canvas, x - mx, y - my, w + 2 * mx, h + 2 * my, 0, 0, sw, sh);
  const img = a.getImageData(0, 0, sw, sh), d = img.data;
  const R = new Float32Array(sw * sh), G = new Float32Array(sw * sh), B = new Float32Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) { R[i] = d[i * 4]; G[i] = d[i * 4 + 1]; B[i] = d[i * 4 + 2]; }
  // começa com a interpolação das quatro bordas
  for (let j = 1; j < sh - 1; j++) for (let i = 1; i < sw - 1; i++) {
    const u = i / (sw - 1), v = j / (sh - 1), k = j * sw + i;
    const l = j * sw, r = j * sw + sw - 1, tp = i, bt = (sh - 1) * sw + i;
    for (const C of [R, G, B]) C[k] = ((1 - u) * C[l] + u * C[r] + (1 - v) * C[tp] + v * C[bt]) / 2;
  }
  // suaviza por dentro (Laplace), mantendo a borda
  for (let it = 0; it < 40; it++) for (let j = 1; j < sh - 1; j++) for (let i = 1; i < sw - 1; i++) {
    const k = j * sw + i;
    R[k] = (R[k - 1] + R[k + 1] + R[k - sw] + R[k + sw]) * .25;
    G[k] = (G[k - 1] + G[k + 1] + G[k - sw] + G[k + sw]) * .25;
    B[k] = (B[k - 1] + B[k + 1] + B[k - sw] + B[k + sw]) * .25;
  }
  // um pouco de grão para não parecer borrão liso
  for (let i = 0; i < sw * sh; i++) { const n = (hash(i * 1.37) - .5) * 6; d[i * 4] = R[i] + n; d[i * 4 + 1] = G[i] + n; d[i * 4 + 2] = B[i] + n; d[i * 4 + 3] = 255; }
  a.putImageData(img, 0, 0);
  ctx.save();
  ctx.beginPath(); roundRect(ctx, x, y, w, h, Math.min(w, h) * .12); ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(ipA, 1, 1, sw - 2, sh - 2, x, y, w, h);
  ctx.restore();
}

// vídeo sobreposto: PiP, círculo, tela dividida ou pessoa recortada
const pipCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const pipMask = typeof document !== 'undefined' ? document.createElement('canvas') : null;
function pipPath(ctx, shape, w, h) {
  ctx.beginPath();
  const r = Math.min(w, h) / 2;
  if (shape === 'circle') ctx.arc(0, 0, r, 0, Math.PI * 2);
  else if (shape === 'round') roundRect(ctx, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.08);
  else if (shape === 'heart') {
    ctx.moveTo(0, r * .9);
    ctx.bezierCurveTo(-r * 1.7, -r * .15, -r * .75, -r * 1.35, 0, -r * .5);
    ctx.bezierCurveTo(r * .75, -r * 1.35, r * 1.7, -r * .15, 0, r * .9); ctx.closePath();
  } else if (shape === 'star') {
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .5 : r; ctx.lineTo(rr * Math.cos(a), rr * Math.sin(a)); }
    ctx.closePath();
  } else if (shape === 'hex') {
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(r * Math.cos(a), r * Math.sin(a)); }
    ctx.closePath();
  } else ctx.rect(-w / 2, -h / 2, w, h);
}
const SQUARE = new Set(['circle', 'heart', 'star', 'hex']);
const hexRgb = hx => { const n = parseInt(String(hx || '#00FF00').replace('#', '').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
// chroma key no Canvas 2D (para vídeo sobreposto)
function chromaKey(c, color, sim, soft) {
  const x = c.getContext('2d', { willReadFrequently: true });
  const img = x.getImageData(0, 0, c.width, c.height), d = img.data;
  const [kr, kg, kb] = hexRgb(color);
  const ku = -.169 * kr - .331 * kg + .5 * kb, kv = .5 * kr - .419 * kg - .081 * kb;
  const lo = sim * 127, hi = lo + soft * 127 + 1;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const u = -.169 * r - .331 * g + .5 * b - ku, v = .5 * r - .419 * g - .081 * b - kv;
    const dist = Math.sqrt(u * u + v * v);
    const a = dist <= lo ? 0 : dist >= hi ? 1 : (dist - lo) / (hi - lo);
    if (a < 1) { const l = .299 * r + .587 * g + .114 * b; d[i] = r + (l - r) * (1 - a) * .7; d[i + 1] = g + (l - g) * (1 - a) * .7; d[i + 2] = b + (l - b) * (1 - a) * .7; }
    d[i + 3] = d[i + 3] * a;
  }
  x.putImageData(img, 0, 0);
}
DRAW.pip = (ctx, it, t, W, H, env) => {
  const q = it.p;
  const pp = env && env.pip ? env.pip(it.id) : null;
  const fr = pp && pp.fr;
  const { a, b } = inOut(t, it, 0.3, 0.2);
  let bw = q.w * W, bh = q.h * H;
  if (SQUARE.has(q.shape)) bw = bh = Math.min(bw, bh);
  const cx = q.x * W, cy = q.y * H;
  const sc = q.anim === 'pop' ? 0.55 + 0.45 * easeOutBack(a) : 1;
  const al = q.anim === 'none' ? 1 : Math.min(q.anim === 'fade' ? a : clamp01(a * 3), b);
  ctx.save();
  ctx.globalAlpha *= al;
  ctx.translate(cx, cy); ctx.scale(sc, sc);
  const cut = q.cut && pp && pp.mask;
  const special = cut || q.key || (q.feather > 0) || (q.shape && q.shape !== 'rect' && q.shape !== 'round' && q.shape !== 'circle');
  if (!cut && !q.key && q.shadow) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = U * 0.035; ctx.shadowOffsetY = U * 0.01;
    pipPath(ctx, q.shape, bw, bh); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  }
  if (fr && fr.source) {
    const sw = fr.w, sh = fr.h;
    const k = (q.fit === 'contain' ? Math.min(bw / sw, bh / sh) : Math.max(bw / sw, bh / sh)) * (q.zoom || 1);
    const dw = sw * k, dh = sh * k, dx = -dw / 2 + (q.ox || 0) * bw, dy = -dh / 2 + (q.oy || 0) * bh;
    if (special) {
      // monta num canvas à parte: vídeo, recorte de pessoa, chroma key, máscara de forma com borda suave
      const res = q.key ? Math.min(1, 640 / Math.max(bw, bh)) : Math.min(1, 1280 / Math.max(bw, bh));
      const cw = Math.max(2, Math.round(bw * res)), ch = Math.max(2, Math.round(bh * res));
      const c = pipCanvas;
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      const x = c.getContext('2d', { willReadFrequently: !!q.key });
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, cw, ch);
      const ox = (dx + bw / 2) * res, oy = (dy + bh / 2) * res;
      x.drawImage(fr.source, ox, oy, dw * res, dh * res);
      if (cut) { x.globalCompositeOperation = 'destination-in'; x.drawImage(pp.mask, ox, oy, dw * res, dh * res); x.globalCompositeOperation = 'source-over'; }
      if (q.key) chromaKey(c, q.keyColor || '#00FF00', q.keySim ?? .35, q.keySoft ?? .15);
      if (!cut && !q.key || q.feather > 0) {
        const m = pipMask;
        if (m.width !== cw || m.height !== ch) { m.width = cw; m.height = ch; }
        const mx = m.getContext('2d');
        mx.setTransform(1, 0, 0, 1, 0, 0); mx.clearRect(0, 0, cw, ch);
        const f = (q.feather || 0) * Math.min(cw, ch);
        mx.translate(cw / 2, ch / 2);
        const shrink = f > 0 ? Math.max(0.2, 1 - 2.2 * f / Math.min(cw, ch)) : 1;
        mx.filter = f > 0 ? `blur(${f.toFixed(1)}px)` : 'none';
        mx.fillStyle = '#fff';
        if (cut || q.key) mx.fillRect(-cw / 2 * shrink, -ch / 2 * shrink, cw * shrink, ch * shrink);
        else { pipPath(mx, q.shape, cw * shrink, ch * shrink); mx.fill(); }
        mx.filter = 'none';
        x.globalCompositeOperation = 'destination-in'; x.drawImage(m, 0, 0); x.globalCompositeOperation = 'source-over';
      }
      if (cut && q.border && q.bw) { ctx.save(); ctx.shadowColor = q.border; ctx.shadowBlur = U * q.bw * 2.5; ctx.drawImage(c, -bw / 2, -bh / 2, bw, bh); ctx.restore(); }
      ctx.drawImage(c, -bw / 2, -bh / 2, bw, bh);
    } else {
      ctx.save(); pipPath(ctx, q.shape, bw, bh); ctx.clip();
      ctx.fillStyle = '#000'; ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      ctx.drawImage(fr.source, dx, dy, dw, dh);
      ctx.restore();
    }
  } else {
    pipPath(ctx, q.shape, bw, bh); ctx.fillStyle = 'rgba(20,20,24,.85)'; ctx.fill();
    ctx.fillStyle = '#A1A1AA'; ctx.font = cssFont('Poppins', U * 0.03, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(q.mid ? 'carregando vídeo' : 'escolha um vídeo', 0, 0);
  }
  if (!cut && !q.key && !(q.feather > 0) && q.border && q.bw) { pipPath(ctx, q.shape, bw, bh); ctx.lineWidth = q.bw * U; ctx.strokeStyle = q.border; ctx.stroke(); }
  ctx.restore();
  return { x: cx - bw * sc / 2, y: cy - bh * sc / 2, w: bw * sc, h: bh * sc };
};

// ------------------------------------------------------------------ elementos extras (e_*)
function starPath(ctx, x, y, r) { ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } ctx.closePath(); }
Object.assign(DRAW, {
  e_rating(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it); const r = U * .055 * (q.size || 1), gap = r * 2.4, cx = q.x * W, cy = q.y * H;
    ctx.globalAlpha = b;
    for (let i = 0; i < 5; i++) {
      const x = cx + (i - 2) * gap, k = clamp01((local - .15 - i * .15) / .3), fill = clamp01((q.stars ?? 5) - i);
      ctx.save(); ctx.translate(x, cy); ctx.scale(.3 + .7 * easeOutBack(k), .3 + .7 * easeOutBack(k)); ctx.translate(-x, -cy);
      starPath(ctx, x, cy, r); ctx.fillStyle = 'rgba(120,120,130,.6)'; ctx.fill();
      if (fill > 0 && k > 0) { ctx.save(); starPath(ctx, x, cy, r); ctx.clip(); ctx.fillStyle = q.color || '#FACC15'; ctx.fillRect(x - r, cy - r, 2 * r * fill, 2 * r); ctx.restore(); }
      ctx.lineWidth = r * .12; ctx.strokeStyle = '#000'; starPath(ctx, x, cy, r); ctx.stroke(); ctx.restore();
    }
    if (q.text) { ctx.font = cssFont('Poppins', U * .045, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = U * .008; ctx.strokeStyle = '#000'; ctx.strokeText(q.text, cx, cy + r * 2); ctx.fillStyle = '#fff'; ctx.fillText(q.text, cx, cy + r * 2); }
    return { x: cx - gap * 2.5, y: cy - r * 1.3, w: gap * 5, h: r * 3.6 };
  },
  e_pin(ctx, it, t, W, H) {
    const q = it.p, { a, b } = inOut(t, it, .5); const r = U * .06, cx = q.x * W, cy = q.y * H;
    const drop = (1 - easeOutBounce(a)) * H * .2;
    ctx.globalAlpha = b;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(cx, cy + r * .2, r * .6 * a, r * .2 * a, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(cx, cy - drop);
    ctx.fillStyle = q.color || '#EF4444'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-r * .4, -r * .6, -r, -r, -r, -r * 1.6); ctx.arc(0, -r * 1.6, r, Math.PI, 0); ctx.bezierCurveTo(r, -r, r * .4, -r * .6, 0, 0); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -r * 1.6, r * .4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (q.text) {
      const k = clamp01((t - it.start - .5) / .3);
      ctx.globalAlpha = b * k; ctx.font = cssFont('Poppins', U * .04, 900);
      const tw = ctx.measureText(q.text).width + U * .05;
      ctx.fillStyle = 'rgba(0,0,0,.75)'; roundRect(ctx, cx - tw / 2, cy - r * 3.6 - U * .07, tw, U * .065, U * .03); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q.text, cx, cy - r * 3.6 - U * .037);
    }
    return { x: cx - r * 1.2, y: cy - r * 4.4, w: r * 2.4, h: r * 4.6 };
  },
  e_price(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it); const cx = q.x * W, cy = q.y * H, s = U * (q.size || .1);
    ctx.globalAlpha = b;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate((-8 + Math.sin(local * 3) * 2) * Math.PI / 180); const sc = .3 + .7 * easeOutBack(a); ctx.scale(sc, sc);
    ctx.font = cssFont('Anton', s, 400); const tw = Math.max(ctx.measureText(q.price || '').width, s * 2) + s * .8;
    ctx.fillStyle = q.color || '#EF4444';
    ctx.beginPath(); ctx.moveTo(-tw / 2 - s * .45, 0); ctx.lineTo(-tw / 2, -s * .75); ctx.lineTo(tw / 2, -s * .75); ctx.lineTo(tw / 2, s * .75); ctx.lineTo(-tw / 2, s * .75); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-tw / 2 - s * .05, 0, s * .1, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(q.price || '', s * .1, s * .05);
    if (q.old) { ctx.font = cssFont('Poppins', s * .32, 700); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(q.old, s * .1, -s * .52); const ow = ctx.measureText(q.old).width; ctx.fillRect(s * .1 - ow / 2, -s * .53, ow, s * .04); }
    ctx.restore();
    return { x: cx - s * 2, y: cy - s, w: s * 4, h: s * 2 };
  },
  e_sparkles(ctx, it, t, W, H) {
    const q = it.p, { b, local } = inOut(t, it); const cx = q.x * W, cy = q.y * H, R = U * (q.size || .25);
    ctx.globalAlpha = b;
    for (let i = 0; i < 14; i++) {
      const ph = hash(i * 3.3) * 6.28, k = (Math.sin(local * (2 + hash(i) * 3) + ph) + 1) / 2;
      const x = cx + Math.cos(i * 2.4) * R * hash(i + 1), y = cy + Math.sin(i * 2.4) * R * hash(i + 2), r = U * .02 * (.4 + k);
      ctx.fillStyle = q.color || '#FFF7AE'; ctx.globalAlpha = b * k;
      ctx.beginPath(); ctx.moveTo(x, y - r * 2); ctx.quadraticCurveTo(x, y, x + r * 2, y); ctx.quadraticCurveTo(x, y, x, y + r * 2); ctx.quadraticCurveTo(x, y, x - r * 2, y); ctx.quadraticCurveTo(x, y, x, y - r * 2); ctx.fill();
    }
    return { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R };
  },
  e_subscribe(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it); const cx = q.x * W, cy = q.y * H, s = U * .06;
    const done = local > 1.3;
    ctx.globalAlpha = b;
    ctx.save(); ctx.translate(cx, cy); const sc = (.4 + .6 * easeOutBack(a)) * (local > 1.15 && local < 1.35 ? .92 : 1); ctx.scale(sc, sc);
    ctx.font = cssFont('Poppins', s * .75, 900); const label = done ? (q.done || 'INSCRITO ✓') : (q.text || 'INSCREVER-SE');
    const tw = ctx.measureText(label).width + s * 1.4;
    ctx.fillStyle = done ? '#3F3F46' : (q.color || '#FF0000'); roundRect(ctx, -tw / 2, -s * .75, tw, s * 1.5, s * .3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, s * .03);
    ctx.restore();
    // cursor clicando
    const k = clamp01((local - .5) / .6), mx = cx + s * 3 * (1 - easeOut(k)) + s * .6, my = cy + s * 2.2 * (1 - easeOut(k)) + s * .3;
    if (local < 2.2) { ctx.save(); ctx.translate(mx, my); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = s * .08; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s * 1.1); ctx.lineTo(s * .3, s * .8); ctx.lineTo(s * .55, s * 1.25); ctx.lineTo(s * .72, s * 1.15); ctx.lineTo(s * .48, s * .72); ctx.lineTo(s * .85, s * .72); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    return { x: cx - s * 4, y: cy - s, w: s * 8, h: s * 2 };
  },
  e_loading(ctx, it, t, W, H) {
    const q = it.p, { b, local } = inOut(t, it); const cx = q.x * W, cy = q.y * H, w = W * .7, hh = U * .04;
    const k = clamp01(local / Math.max(.5, it.dur * .85));
    ctx.globalAlpha = b;
    ctx.font = cssFont('Poppins', U * .04, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = U * .008; ctx.strokeStyle = '#000'; ctx.strokeText(q.text || 'CARREGANDO...', cx, cy - hh * 1.4); ctx.fillStyle = '#fff'; ctx.fillText(q.text || 'CARREGANDO...', cx, cy - hh * 1.4);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; roundRect(ctx, cx - w / 2, cy - hh / 2, w, hh, hh / 2); ctx.fill();
    ctx.fillStyle = q.color || '#22C55E'; roundRect(ctx, cx - w / 2 + 3, cy - hh / 2 + 3, Math.max(2, (w - 6) * k), hh - 6, hh / 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = cssFont('Poppins', U * .028, 900); ctx.fillText(Math.round(k * 100) + '%', cx, cy + hh * 1.3);
    return { x: cx - w / 2, y: cy - hh * 2, w, h: hh * 4 };
  },
  e_underline(ctx, it, t, W, H) {
    const q = it.p, { b, local } = inOut(t, it); const cx = q.x * W, cy = q.y * H, w = W * (q.w || .5);
    const k = easeOut(clamp01(local / .45));
    ctx.globalAlpha = b; ctx.strokeStyle = q.color || '#FFE600'; ctx.lineWidth = U * .014; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 40 * k; i++) { const u = i / 40, x = cx - w / 2 + w * u, y = cy + Math.sin(u * 9) * U * .006 + (u - .5) * U * .01; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    return { x: cx - w / 2, y: cy - U * .03, w, h: U * .06 };
  },
  e_check(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it); const cx = q.x * W, cy = q.y * H, s = U * (q.size || .18);
    const ok = q.mode !== 'errado', col = q.color || (ok ? '#22C55E' : '#EF4444');
    ctx.globalAlpha = b;
    ctx.save(); ctx.translate(cx, cy); const sc = .4 + .6 * easeOutBack(a); ctx.scale(sc, sc);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, s * .5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = s * .1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const k = easeOut(clamp01((local - .2) / .35));
    ctx.beginPath();
    if (ok) { const p = [[-s * .2, 0], [-s * .05, s * .15], [s * .22, -s * .15]]; ctx.moveTo(...p[0]); if (k < .4) ctx.lineTo(p[0][0] + (p[1][0] - p[0][0]) * k / .4, p[0][1] + (p[1][1] - p[0][1]) * k / .4); else { ctx.lineTo(...p[1]); const u = (k - .4) / .6; ctx.lineTo(p[1][0] + (p[2][0] - p[1][0]) * u, p[1][1] + (p[2][1] - p[1][1]) * u); } }
    else { const d = s * .18; ctx.moveTo(-d, -d); ctx.lineTo(-d + 2 * d * Math.min(1, k * 2), -d + 2 * d * Math.min(1, k * 2)); if (k > .5) { const u = (k - .5) * 2; ctx.moveTo(d, -d); ctx.lineTo(d - 2 * d * u, -d + 2 * d * u); } }
    ctx.stroke(); ctx.restore();
    return { x: cx - s / 2, y: cy - s / 2, w: s, h: s };
  },
  e_typing(ctx, it, t, W, H) {
    const q = it.p, { a, b, local } = inOut(t, it); const cx = q.x * W, cy = q.y * H, s = U * .05;
    ctx.globalAlpha = b * clamp01(a * 2);
    const showMsg = local > (q.wait || 1.5);
    ctx.font = cssFont('Poppins', s * .8, 700);
    const msg = q.text || 'Oi! Tudo bem?';
    const w = showMsg ? Math.min(W * .8, ctx.measureText(msg).width + s * 1.4) : s * 3.4;
    const x = q.side === 'direita' ? cx + W * .3 - w : cx - W * .3;
    ctx.fillStyle = q.side === 'direita' ? '#22C55E' : '#E4E4E7'; roundRect(ctx, x, cy - s * .8, w, s * 1.6, s * .8); ctx.fill();
    ctx.fillStyle = q.side === 'direita' ? '#fff' : '#111';
    if (showMsg) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(msg, x + s * .7, cy + s * .03); }
    else for (let i = 0; i < 3; i++) { ctx.globalAlpha = b * (.35 + .65 * Math.max(0, Math.sin(local * 8 - i))); ctx.beginPath(); ctx.arc(x + s * (1 + i * .7), cy, s * .2, 0, Math.PI * 2); ctx.fill(); }
    return { x, y: cy - s, w, h: s * 2 };
  },
});

Object.assign(DRAW, CARTELA_DRAW, GRAFICO_DRAW, RETENCAO_DRAW);
ELEMENTS.push(...RETENCAO_ELEMENTS, ...CARTELA_ELEMENTS, ...GRAFICO_ELEMENTS);
