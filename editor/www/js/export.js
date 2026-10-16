// Exportação: decodifica quadro a quadro, renderiza com efeitos e codifica em MP4 (H.264 + AAC) no próprio aparelho.
import { segment } from './vision.js';
import * as MB from '../vendor/mediabunny.min.mjs';
import { Renderer } from './render.js';
import { layout, dims, clipDur } from './project.js';
import { FX_BY_ID } from './effects.js';
import { mixProject } from './mix.js';
import { SR } from './audio.js';

export const QUALITIES = [
  { id: 'alta', name: 'Alta (10 Mbps)', bitrate: 10e6 },
  { id: 'normal', name: 'Normal (6 Mbps)', bitrate: 6e6 },
  { id: 'leve', name: 'Leve (3,5 Mbps)', bitrate: 3.5e6 },
];

// presets por plataforma. maxMB: o arquivo final fica abaixo desse tamanho
export const PLATFORMS = [
  { id: 'reels', name: 'Instagram Reels', bitrate: 8e6, note: 'Até 3 min. Ideal 15 a 60 s.' },
  { id: 'tiktok', name: 'TikTok', bitrate: 8e6, note: 'Deixe a direita livre (ícones do app).' },
  { id: 'shorts', name: 'YouTube Shorts', bitrate: 10e6, note: 'Até 3 min.' },
  { id: 'youtube', name: 'YouTube (vídeo longo)', bitrate: 12e6, note: 'Melhor no formato 16:9. Exporte também a legenda .srt.' },
  { id: 'whats', name: 'WhatsApp (menos de 30 MB)', maxMB: 30, note: 'Calcula a qualidade para caber em 30 MB.' },
  { id: 'status', name: 'Status do WhatsApp (menos de 16 MB)', maxMB: 16, scale: 2 / 3, note: 'Em 720p. O status aceita até 60 s.' },
];

// qualidade final de um preset para a duração do vídeo
export function platformSettings(pl, dur) {
  if (!pl.maxMB) return { bitrate: pl.bitrate, scale: pl.scale || 1, abitrate: 192e3 };
  const ab = 128e3;
  const total = pl.maxMB * 1e6 * 8 / Math.max(1, dur) * 0.88;
  let br = Math.max(4e5, Math.min(8e6, total - ab));
  let scale = pl.scale || 1;
  if (br < 2.5e6 && scale > 2 / 3) scale = 2 / 3;   // pouco espaço: 720p fica mais nítido que 1080p espremido
  return { bitrate: br, scale, abitrate: ab };
}

function once(el, ev, ms = 15000) {
  return new Promise((res, rej) => {
    const to = setTimeout(() => { done(); rej(new Error('tempo esgotado ao ler o vídeo')); }, ms);
    const ok = () => { done(); res(); };
    const bad = () => { done(); rej(new Error('erro ao ler o vídeo')); };
    function done() { clearTimeout(to); el.removeEventListener(ev, ok); el.removeEventListener('error', bad); }
    el.addEventListener(ev, ok); el.addEventListener('error', bad);
  });
}

// Lê um clipe em ordem, quadro a quadro, usando o decodificador de hardware.
class ClipReader {
  constructor(blob, url, ring) { this.blob = blob; this.url = url; this.ringSize = ring; this.ring = []; }

  async open(t) {
    try {
      this.input = new MB.Input({ formats: MB.ALL_FORMATS, source: new MB.BlobSource(this.blob) });
      this.vt = await this.input.getPrimaryVideoTrack();
      if (!this.vt || !(await this.vt.canDecode())) throw new Error('sem decodificador');
      this.w = this.vt.displayWidth; this.h = this.vt.displayHeight;
      this.sink = new MB.VideoSampleSink(this.vt);
      this.canvas = document.createElement('canvas'); this.canvas.width = this.w; this.canvas.height = this.h;
      this.ctx = this.canvas.getContext('2d');
      this._start(t);
    } catch (e) {
      // plano B: <video> com busca quadro a quadro (mais lento, mas lê qualquer formato que o aparelho toca)
      this.sink = null;
      this.v = document.createElement('video');
      this.v.muted = true; this.v.playsInline = true; this.v.preload = 'auto'; this.v.src = this.url;
      await once(this.v, 'loadeddata', 20000);
      this.w = this.v.videoWidth; this.h = this.v.videoHeight;
    }
  }

  _start(t) {
    if (this.it) { try { this.it.return(); } catch (e) { } }
    if (this.cur) { this.cur.close(); this.cur = null; }
    if (this.next) { this.next.close(); this.next = null; }
    this.it = this.sink.samples(Math.max(0, t - 0.001));
    this.ended = false;
    this.drawnTs = -1;
  }

  async frame(t) {
    if (!this.sink) {
      if (Math.abs(this.v.currentTime - t) > 0.004) { this.v.currentTime = t; await once(this.v, 'seeked'); }
      return { source: this.v, w: this.w, h: this.h };
    }
    // voltou no tempo (repetir): usa o quadro guardado ou reabre a leitura
    if (this.cur && t < this.cur.timestamp - 0.02) {
      let best = null;
      for (const r of this.ring) if (r.ts <= t + 0.02 && (!best || r.ts > best.ts)) best = r;
      if (best) return { source: best.bmp, w: this.w, h: this.h };
      this._start(t);
    }
    while (!this.ended) {
      if (!this.next) {
        const r = await this.it.next();
        if (r.done) { this.ended = true; break; }
        this.next = r.value;
      }
      if (!this.cur || this.next.timestamp <= t + 0.0005) {
        if (this.cur) this.cur.close();
        this.cur = this.next; this.next = null;
        continue;
      }
      break;
    }
    if (!this.cur) return null;
    if (this.drawnTs !== this.cur.timestamp) {
      this.ctx.clearRect(0, 0, this.w, this.h);
      this.cur.drawWithFit(this.ctx, { fit: 'fill' });
      this.drawnTs = this.cur.timestamp;
      if (this.ringSize) {
        const bmp = await createImageBitmap(this.canvas);
        this.ring.push({ ts: this.cur.timestamp, bmp });
        while (this.ring.length > this.ringSize) this.ring.shift().bmp.close();
      }
    }
    return { source: this.canvas, w: this.w, h: this.h };
  }

  close() {
    try { if (this.it) this.it.return(); } catch (e) { }
    if (this.cur) this.cur.close(); if (this.next) this.next.close();
    for (const r of this.ring) r.bmp.close();
    this.ring = [];
    if (this.v) { this.v.removeAttribute('src'); this.v.load(); }
    if (this.input && this.input.dispose) { try { this.input.dispose(); } catch (e) { } }
  }
}

class ExportProvider {
  constructor(p, app) {
    this.p = p; this.app = app;
    this.readers = new Map();
    this.images = new Map();
    this.ring = p.items.some(it => it.kind === 'effect' && FX_BY_ID[it.p.fx] && FX_BY_ID[it.p.fx].timeRemap) ? 8 : 0;
  }
  async frame(ci, src) {
    const c = this.p.clips[ci], m = this.p.media[c.mid];
    if (m.kind === 'image') {
      if (!this.images.has(c.mid)) this.images.set(c.mid, await createImageBitmap(await this.app.getBlob(c.mid)));
      const b = this.images.get(c.mid);
      return { source: b, w: b.width, h: b.height };
    }
    let r = this.readers.get(c.id);
    if (!r) {
      r = new ClipReader(await this.app.getBlob(c.mid), this.app.urlOf(c.mid), this.ring);
      await r.open(src);
      this.readers.set(c.id, r);
    }
    return r.frame(src);
  }
  async mask(ci, src, fr) {
    if (!this.maskCanvas) this.maskCanvas = document.createElement('canvas');
    try { return await segment(fr.source, fr.w, fr.h, this.maskCanvas); } catch (e) { return null; }
  }
  async itemMask(it, src, fr) {
    this.itemMasks = this.itemMasks || new Map();
    if (!this.itemMasks.has(it.id)) this.itemMasks.set(it.id, document.createElement('canvas'));
    try { return await segment(fr.source, fr.w, fr.h, this.itemMasks.get(it.id)); } catch (e) { return null; }
  }
  async itemFrame(it, src) {
    const m = this.p.media[it.p.mid];
    if (!m) return null;
    if (m.kind === 'image') {
      if (!this.images.has(it.p.mid)) this.images.set(it.p.mid, await createImageBitmap(await this.app.getBlob(it.p.mid)));
      const b = this.images.get(it.p.mid); return { source: b, w: b.width, h: b.height };
    }
    const k = 'pip:' + it.id;
    let r = this.readers.get(k);
    if (!r) { r = new ClipReader(await this.app.getBlob(it.p.mid), this.app.urlOf(it.p.mid), 0); await r.open(src); this.readers.set(k, r); }
    return r.frame(Math.max(0, Math.min(m.dur - 0.02, src)));
  }
  // fecha leitores de clipes que já passaram
  gc(t, L) {
    this.p.clips.forEach((c, i) => {
      if (L.starts[i] + clipDur(c) + 1.5 < t && this.readers.has(c.id)) { this.readers.get(c.id).close(); this.readers.delete(c.id); }
    });
    for (const it of this.p.items) if (it.kind === 'pip' && it.start + it.dur + 1 < t && this.readers.has('pip:' + it.id)) { this.readers.get('pip:' + it.id).close(); this.readers.delete('pip:' + it.id); }
  }
  close() { for (const r of this.readers.values()) r.close(); this.readers.clear(); for (const b of this.images.values()) b.close(); }
}

export async function exportVideo(app, opt, onProgress, abort) {
  const p = JSON.parse(JSON.stringify(app.project));
  const [W0, H0] = dims(p);
  const sc = opt.scale && opt.scale < 1 ? opt.scale : 1;
  const W = Math.round(W0 * sc / 2) * 2, H = Math.round(H0 * sc / 2) * 2;
  const fps = p.fps || 30;
  const L = layout(p);
  if (!L.total) throw new Error('O projeto está vazio.');

  onProgress(0, 'Preparando');
  let vcodec = await MB.getFirstEncodableVideoCodec(['avc', 'hevc', 'vp9', 'av1', 'vp8'], { width: W, height: H, bitrate: opt.bitrate });
  if (!vcodec) throw new Error('Este aparelho não consegue codificar vídeo nesse tamanho.');
  const mp4 = vcodec === 'avc' || vcodec === 'hevc' || vcodec === 'av1';
  const acodec = await MB.getFirstEncodableAudioCodec(mp4 ? ['aac', 'opus'] : ['opus', 'vorbis'], { numberOfChannels: 2, sampleRate: SR });

  // 1) áudio
  const [aL, aR] = await mixProject(p, mid => app.getBlob(mid), (k, msg) => onProgress(k * 0.12, msg));
  if (abort.aborted) throw new Error('cancelado');

  // 2) vídeo
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const R = new Renderer(canvas); R.setSize(W, H);
  for (const [k, v] of app.renderer.images) R.images.set(k, v);
  const output = new MB.Output({ format: mp4 ? new MB.Mp4OutputFormat({ fastStart: 'in-memory' }) : new MB.WebMOutputFormat(), target: new MB.BufferTarget() });
  const vs = new MB.CanvasSource(canvas, { codec: vcodec, bitrate: opt.bitrate, keyFrameInterval: 2 });
  output.addVideoTrack(vs, { frameRate: fps });
  let as = null;
  if (acodec) { as = new MB.AudioBufferSource({ codec: acodec, bitrate: opt.abitrate || 192e3 }); output.addAudioTrack(as); }
  await output.start();

  if (as) {
    const step = SR;
    for (let o = 0; o < aL.length; o += step) {
      const n = Math.min(step, aL.length - o);
      const ab = new AudioBuffer({ length: n, numberOfChannels: 2, sampleRate: SR });
      ab.copyToChannel(aL.subarray(o, o + n), 0); ab.copyToChannel(aR.subarray(o, o + n), 1);
      await as.add(ab);
    }
    as.close && as.close();
  }

  const prov = new ExportProvider(p, app);
  const N = Math.max(1, Math.round(L.total * fps));
  const t0 = performance.now();
  try {
    for (let k = 0; k < N; k++) {
      if (abort.aborted) throw new Error('cancelado');
      const t = k / fps;
      await R.render(p, t, prov, { layout: L, capVersion: 1, keepPrev: true });
      await vs.add(t, 1 / fps);
      if (k % 15 === 0) prov.gc(t, L);
      if (k % 3 === 0) {
        const el = (performance.now() - t0) / 1000, rate = (k + 1) / el;
        onProgress(0.12 + 0.86 * (k / N), `Renderizando ${Math.round(100 * k / N)}%`, (N - k) / Math.max(rate, 0.01));
      }
    }
    vs.close && vs.close();
    onProgress(0.99, 'Finalizando o arquivo');
    await output.finalize();
  } catch (e) {
    try { await output.cancel(); } catch (x) { }
    throw e;
  } finally {
    prov.close();
  }
  const ext = mp4 ? 'mp4' : 'webm';
  return { blob: new Blob([output.target.buffer], { type: mp4 ? 'video/mp4' : 'video/webm' }), ext, vcodec, acodec };
}
