// Prévias dos modelos sem precisar de vídeo: imagens de exemplo desenhadas pelo app.
import { Renderer } from './render.js';
import { newProject, newClip, layout, clipDur, FORMATS } from './project.js';
import { buildStoryboard } from './storyboards.js';

// imagens de exemplo (paisagem, pessoa, cidade) desenhadas em canvas
const phCache = new Map();
function placeholder(i, W, H) {
  const key = i + ':' + W + 'x' + H;
  if (phCache.has(key)) return phCache.get(key);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const pal = [['#F59E0B', '#7C3AED', '#1E1B4B'], ['#38BDF8', '#0EA5E9', '#0F172A'], ['#FB7185', '#F97316', '#3B0764'], ['#34D399', '#059669', '#022C22']][i % 4];
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, pal[0]); g.addColorStop(.55, pal[1]); g.addColorStop(1, pal[2]);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const U = Math.min(W, H);
  if (i % 3 === 0) {          // sol e montanhas
    x.fillStyle = 'rgba(255,240,200,.85)'; x.beginPath(); x.arc(W * .7, H * .35, U * .12, 0, Math.PI * 2); x.fill();
    for (let k = 0; k < 3; k++) {
      x.fillStyle = `rgba(15,23,42,${.35 + k * .2})`; x.beginPath(); x.moveTo(0, H);
      for (let px = 0; px <= W; px += W / 12) x.lineTo(px, H * (.6 + k * .1) - Math.sin(px / W * 6 + k * 2) * U * .08 - (px % (W / 6)) * .05);
      x.lineTo(W, H); x.closePath(); x.fill();
    }
  } else if (i % 3 === 1) {   // pessoa (silhueta)
    x.fillStyle = 'rgba(0,0,0,.45)';
    x.beginPath(); x.arc(W / 2, H * .42, U * .14, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(W / 2, H * .82, U * .34, U * .28, 0, Math.PI, 0); x.fill(); x.fillRect(W / 2 - U * .34, H * .82, U * .68, H * .2);
  } else {                    // cidade
    for (let k = 0; k < 14; k++) {
      const bw = W / 10, bh = H * (.2 + ((k * 37) % 30) / 60);
      x.fillStyle = `rgba(10,10,30,${.5 + (k % 3) * .15})`; x.fillRect(k * bw * .8 - bw * .3, H - bh, bw, bh);
      x.fillStyle = 'rgba(255,230,150,.5)';
      for (let wy = H - bh + 10; wy < H - 10; wy += U * .04) for (let wx = k * bw * .8 - bw * .2; wx < k * bw * .8 + bw * .5; wx += U * .03) if (((wx * 7 + wy * 3) | 0) % 5 === 0) x.fillRect(wx, wy, U * .012, U * .018);
    }
  }
  phCache.set(key, c);
  return c;
}
const solid = new Map();
function colorCanvas(hex) {
  if (solid.has(hex)) return solid.get(hex);
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const x = c.getContext('2d'); x.fillStyle = hex; x.fillRect(0, 0, 64, 64);
  solid.set(hex, c); return c;
}

const SAMPLE = 'assim fica a legenda do seu vídeo com este modelo bem fácil de editar'.split(' ');
function fakeWords(dur) {
  const out = []; let t = 0.3, i = 0;
  while (t < dur - 0.3) { out.push({ w: SAMPLE[i % SAMPLE.length], s: t, e: t + 0.28 }); t += 0.34; i++; }
  return out;
}

// projeto de mentira a partir de um modelo pronto
export function fakeStoryProject(sb) {
  const p = newProject('prévia');
  p.format = sb.format;
  const [W, H] = FORMATS[sb.format] || FORMATS['9:16'];
  const medias = [0, 1, 2].map(i => ({ id: 'ph' + i, kind: 'image', dur: 60, w: W, h: H, hasAudio: false }));
  for (const m of medias) p.media[m.id] = m;
  const B = buildStoryboard(sb, medias, {}, c => { const id = 'col:' + c; p.media[id] = { id, kind: 'image', dur: 60, w: 64, h: 64 }; return id; });
  p.clips = B.clips.map(bc => { const c = newClip(p.media[bc.mid], { dur: bc.out - bc.in }); Object.assign(c, { in: 0, out: bc.out - bc.in, fit: 'cover', kb: bc.kb, fx: bc.fx, trans: bc.trans }); return c; });
  const L = layout(p);
  p.items = B.items(L.starts, p.clips.map(clipDur)).map((it, k) => ({ id: 'i' + k, ...it }));
  p.captions = { ...p.captions, ...(sb.captions || {}) };
  for (const m of medias) p.transcripts[m.id] = fakeWords(20);
  return p;
}
// projeto de mentira com itens soltos (modelos de texto) ou só legenda (modelos de legenda)
export function fakeItemsProject(items, format = '9:16', cap = null) {
  const p = newProject('prévia');
  p.format = format;
  const [W, H] = FORMATS[format];
  p.media.ph1 = { id: 'ph1', kind: 'image', dur: 60, w: W, h: H, hasAudio: false };
  const c = newClip(p.media.ph1, { dur: 5 }); c.kb = false; p.clips = [c];
  p.items = (items || []).map((it, k) => ({ id: 'i' + k, kind: it.kind, start: it.at || 0, dur: 4.5, p: JSON.parse(JSON.stringify(it.p)) }));
  if (cap) { p.captions = { ...p.captions, ...cap, on: true }; p.transcripts.ph1 = fakeWords(5); } else p.captions = { ...p.captions, on: false };
  return p;
}

let R = null;
function renderer(w, h) {
  if (!R) { const c = document.createElement('canvas'); R = new Renderer(c); }
  R.setSize(w, h);
  return R;
}
function provider(p, w, h) {
  return {
    frame: ci => {
      const c = p.clips[ci]; if (!c) return null;
      if (c.mid.startsWith('col:')) { const cc = colorCanvas(c.mid.slice(4)); return { source: cc, w: 64, h: 64 }; }
      const i = +c.mid.replace(/\D/g, '') || 0;
      const ph = placeholder(i, w, h);
      return { source: ph, w, h };
    },
  };
}
let ver = 0, q = Promise.resolve();
// desenha o quadro do instante t num canvas de largura "width" (um de cada vez)
export function renderStill(p, t, width, out) {
  const job = q.then(() => renderNow(p, t, width, out));
  q = job.catch(() => { });
  return job;
}
async function renderNow(p, t, width, out) {
  const [W, H] = FORMATS[p.format] || FORMATS['9:16'];
  const w = Math.round(width / 2) * 2, h = Math.round(width * H / W / 2) * 2;
  const r = renderer(w, h);
  await r.render(p, t, provider(p, w, h), { capVersion: 'pv' + (++ver) });
  const c = out || document.createElement('canvas');
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  c.getContext('2d').drawImage(r.out, 0, 0);
  return c;
}
// prévia animada (volta para o começo no fim). Devolve função para parar.
export function animate(p, canvas, width) {
  let stop = false, t = 0, last = performance.now(), busy = false;
  const total = layout(p).total;
  const loop = async now => {
    if (stop || !document.body.contains(canvas)) return;
    if (!busy) {
      busy = true;
      t = (t + Math.min(0.1, (now - last) / 1000)) % Math.max(0.5, total);
      last = now;
      try { await renderStill(p, t, width, canvas); } catch (e) { }
      busy = false;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return () => { stop = true; };
}
