// Um projeto, vários destinos: recorte de trecho, outros formatos, stories de 15 s, capítulos e miniatura.
import { layout, clipDur, srcOffset, localOf, uid, FORMATS } from './project.js';
import { autoFit } from './templates.js';

const clone = o => JSON.parse(JSON.stringify(o));

// Novo projeto só com o trecho [a, b] da linha do tempo
export function trimProject(p0, a, b) {
  const p = clone(p0);
  const L = layout(p0);
  const clips = [];
  p0.clips.forEach((c0, i) => {
    const s = L.starts[i], e = s + clipDur(c0);
    if (e <= a + 1e-3 || s >= b - 1e-3) return;
    const c = clone(c0);
    const la = Math.max(0, a - s), lb = Math.min(e, b) - s;
    const ia = c0.in + srcOffset(c0, la), ib = c0.in + srcOffset(c0, lb);
    if (c.curve) { c.speed = (ib - ia) / Math.max(0.05, lb - la); delete c.curve; }
    c.in = ia; c.out = ib; c.id = uid();
    if (c.kf) c.kf = c.kf.map(k => ({ ...k, t: k.t - la })).filter(k => k.t >= -0.5 && k.t <= lb - la + 0.5);
    clips.push(c);
  });
  if (clips.length) clips[clips.length - 1].trans = { id: 'none', dur: 0.4, text: 'WOW' };
  p.clips = clips;
  p.items = p0.items.filter(it => it.start < b && it.start + it.dur > a).map(it0 => {
    const it = clone(it0); it.id = uid();
    const cutA = Math.max(0, a - it.start);
    if (cutA && (it.kind === 'audio' || it.kind === 'pip')) it.p.in = (it.p.in || 0) + cutA;
    if (it.kf && cutA) it.kf = it.kf.map(k => ({ ...k, t: k.t - cutA }));
    it.start = Math.max(0, it.start - a);
    it.dur = Math.min(it0.start + it0.dur, b) - Math.max(it0.start, a);
    return it;
  }).filter(it => it.dur > 0.1);
  if (p.audio.music) p.audio.music.start = (p.audio.music.start || 0) + a;
  if (p.capTrans) p.capTrans = { ...p.capTrans, pages: p.capTrans.pages.filter(pg => pg.end > a && pg.start < b).map(pg => ({ ...pg, start: Math.max(0, pg.start - a), end: pg.end - a })) };
  if (p.chapters) p.chapters = p.chapters.filter(c => c.t >= a && c.t < b).map(c => ({ ...c, t: c.t - a }));
  p.id = uid();
  return p;
}

// Mesmo projeto em outro formato (enquadramento refeito; posições dos elementos são proporcionais)
export function asFormat(p0, fmt) {
  const p = clone(p0);
  if (!FORMATS[fmt]) return p;
  p.format = fmt;
  const keep = p.clips.map(c => ({ reframe: c.reframe, track: c.track, kf: c.kf }));
  autoFit(p, undefined);
  p.clips.forEach((c, i) => Object.assign(c, keep[i]));
  return p;
}

// Partes de até "secs" segundos, cortando de preferência numa emenda ou pausa da fala
export function splitPoints(p, secs = 15) {
  const L = layout(p), total = L.total;
  const cuts = [0];
  while (total - cuts[cuts.length - 1] > secs + 0.5) {
    const want = cuts[cuts.length - 1] + secs;
    // procura uma emenda entre want-3 e want
    const near = L.starts.filter(s => s > want - 3 && s <= want).pop();
    cuts.push(near && near > cuts[cuts.length - 1] + 5 ? near : want);
  }
  cuts.push(total);
  return cuts.slice(0, -1).map((a, i) => [a, cuts[i + 1]]);
}

// Capítulos no formato da descrição do YouTube (o primeiro precisa ser 00:00)
export function chaptersText(p) {
  const list = [...(p.chapters || [])].sort((a, b) => a.t - b.t);
  if (!list.length) return '';
  if (list[0].t > 0.5) list.unshift({ t: 0, title: 'Introdução' });
  const total = layout(p).total;
  const f = t => {
    t = Math.floor(t);
    const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
    return (h || total >= 3600 ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(s).padStart(2, '0');
  };
  return list.map(c => `${f(c.t)} ${c.title}`).join('\n');
}

// Miniatura 1280x720: quadro do vídeo + texto grande com contorno + destaque
export function drawThumb(c, frame, o) {
  const W = 1280, H = 720;
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#111'; x.fillRect(0, 0, W, H);
  if (frame) {
    const fw = frame.width, fh = frame.height;
    const k = Math.max(W / fw, H / fh) * (o.zoom || 1);
    const dw = fw * k, dh = fh * k;
    x.drawImage(frame, (W - dw) / 2 + (o.ox || 0) * W, (H - dh) / 2 + (o.oy || 0) * H, dw, dh);
  }
  // escurece o lado do texto
  const side = o.pos || 'esquerda';
  const g = side === 'baixo' ? x.createLinearGradient(0, H, 0, H * 0.35) : side === 'direita' ? x.createLinearGradient(W, 0, W * 0.3, 0) : x.createLinearGradient(0, 0, W * 0.7, 0);
  g.addColorStop(0, `rgba(0,0,0,${o.dark ?? 0.65})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // texto
  const lines = String(o.text || '').toUpperCase().split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3);
  const font = o.font || 'Anton';
  const maxW = side === 'baixo' ? W * 0.9 : W * 0.56;
  let size = 150;
  const fit = () => {
    for (; size > 40; size -= 4) {
      x.font = `${font === 'Anton' ? 400 : 900} ${size}px "${font}", "Poppins", sans-serif`;
      if (lines.every(l => x.measureText(l).width <= maxW) && lines.length * size * 1.05 <= H * 0.8) break;
    }
  };
  fit();
  const lh = size * 1.05;
  const blockH = lines.length * lh;
  let y0 = side === 'baixo' ? H - blockH - H * 0.06 + lh * 0.8 : (H - blockH) / 2 + lh * 0.8;
  const xx = side === 'direita' ? W * 0.96 : side === 'baixo' ? W / 2 : W * 0.04;
  x.textAlign = side === 'direita' ? 'right' : side === 'baixo' ? 'center' : 'left';
  lines.forEach((l, i) => {
    const y = y0 + i * lh;
    x.lineJoin = 'round'; x.lineWidth = size * 0.16; x.strokeStyle = '#000'; x.strokeText(l, xx, y);
    x.fillStyle = i === (o.hiLine ?? 1) % Math.max(1, lines.length) && lines.length > 1 ? (o.color2 || '#FFDE00') : (o.color || '#FFFFFF');
    x.fillText(l, xx, y);
  });
  // destaque: seta ou círculo
  if (o.mark === 'circulo') {
    x.lineWidth = 14; x.strokeStyle = o.markColor || '#EB1E28';
    x.beginPath(); x.ellipse(W * (o.mx ?? 0.75), H * (o.my ?? 0.45), W * 0.12, H * 0.2, -0.15, 0, Math.PI * 2); x.stroke();
  } else if (o.mark === 'seta') {
    const ax = W * (o.mx ?? 0.75), ay = H * (o.my ?? 0.45);
    x.save(); x.translate(ax, ay); x.rotate(Math.PI * 0.8);
    x.fillStyle = o.markColor || '#EB1E28'; x.strokeStyle = '#000'; x.lineWidth = 6;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(60, -50); x.lineTo(60, -22); x.lineTo(170, -22); x.lineTo(170, 22); x.lineTo(60, 22); x.lineTo(60, 50); x.closePath();
    x.stroke(); x.fill(); x.restore();
  }
  if (o.tag) {
    x.font = `900 46px "Poppins", sans-serif`; x.textAlign = 'left';
    const tw = x.measureText(o.tag).width + 40;
    x.fillStyle = o.tagColor || '#EB1E28'; x.fillRect(side === 'direita' ? W * 0.04 : W - tw - W * 0.03, H * 0.06, tw, 70);
    x.fillStyle = '#fff'; x.fillText(o.tag, (side === 'direita' ? W * 0.04 : W - tw - W * 0.03) + 20, H * 0.06 + 52);
  }
  return c;
}

// JPG abaixo de 2 MB (limite do YouTube)
export async function thumbJpeg(c) {
  for (let q = 0.92; q >= 0.5; q -= 0.07) {
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
    if (b && b.size < 1.95e6) return b;
  }
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.5));
}
