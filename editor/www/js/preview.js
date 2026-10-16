// Reprodução da prévia.
// - Cada mídia usa dois <video> que se alternam (clipe par / clipe ímpar): o próximo clipe já fica
//   carregado e parado no ponto certo antes do corte, então a emenda não engasga.
// - Durante a reprodução, o relógio segue o próprio vídeo (não fica brigando com ele com buscas).
// - Quadros de vídeos grandes (4K) são reduzidos antes de ir para a GPU.
import { frameRequest, layout, clipIndexAt, clipDur } from './project.js';
import { FX_BY_ID } from './effects.js';
import { sfx, makeBeat, SR } from './audio.js';
import { sfxEvents } from './mix.js';
import { segment } from './vision.js';

export class Preview {
  constructor(app) {
    this.app = app;
    this.pool = new Map();      // chave mid:paridade -> {v, last, canvas}
    this.bitmaps = new Map();   // mid -> Promise<ImageBitmap>
    this.playing = false;
    this.ac = null;
    this.nodes = [];
    this.audioBufs = new Map(); // mid -> AudioBuffer (música e narrações)
    this.beatKey = ''; this.beatBuf = null;
    this.activeKeys = new Set();
    this.maxSide = 960;
    this.stats = { seeks: 0, frames: 0 };
  }

  get p() { return this.app.project; }

  image(mid) {
    if (!this.bitmaps.has(mid)) this.bitmaps.set(mid, this.app.getBlob(mid).then(b => createImageBitmap(b)));
    return this.bitmaps.get(mid);
  }

  key(ci) { const c = this.p.clips[ci]; return c.mid + ':' + (ci % 2); }

  video(ci) {
    const c = this.p.clips[ci];
    const k = this.key(ci);
    const url = this.app.previewUrlOf(c.mid);
    let e = this.pool.get(k);
    if (e && e.url !== url) { this._drop(k); e = null; }
    if (!e) {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('playsinline', ''); v.disablePictureInPicture = true;
      v.src = url;
      v.addEventListener('seeked', () => {
        if (v._want != null && Math.abs(v.currentTime - v._want) > 0.03 && !this.playing) { this._seek(v, v._want); return; }
        v._want = null;
        if (!this.playing) this.app.requestRender();
      });
      v.addEventListener('loadeddata', () => { if (!this.playing) this.app.requestRender(); });
      e = { v, url, last: 0, canvas: null, a: null };
      // vídeo otimizado (cópia leve) não tem som: o som vem do arquivo original
      if (url !== this.app.urlOf(c.mid)) {
        const a = document.createElement('audio');
        a.preload = 'auto'; a.src = this.app.urlOf(c.mid); a.muted = true;
        e.a = a;
      }
      this.pool.set(k, e);
      this._prune();
    }
    e.last = performance.now();
    return e;
  }

  _seek(v, t) { this.stats.seeks++; v._want = t; v.currentTime = t; }

  _drop(k) {
    const e = this.pool.get(k);
    if (!e) return;
    try { e.v.pause(); e.v.removeAttribute('src'); e.v.load(); } catch (x) { }
    if (e.a) { try { e.a.pause(); e.a.removeAttribute('src'); e.a.load(); } catch (x) { } }
    this.pool.delete(k);
  }

  _prune(max = 6) {
    if (this.pool.size <= max) return;
    const arr = [...this.pool.entries()].filter(([k]) => !this.activeKeys.has(k)).sort((a, b) => a[1].last - b[1].last);
    for (let i = 0; i < arr.length && this.pool.size > max; i++) this._drop(arr[i][0]);
  }

  releaseAll() { for (const k of [...this.pool.keys()]) this._drop(k); this.bitmaps.clear(); }
  forgetMedia(mid) { for (const k of [...this.pool.keys()]) if (k.startsWith(mid + ':')) this._drop(k); }

  // reduz quadros grandes para o tamanho da prévia
  _source(e) {
    const v = e.v, w = v.videoWidth, h = v.videoHeight;
    const s = Math.min(1, this.maxSide / Math.max(w, h));
    if (s > 0.8) return { source: v, w, h };
    const cw = Math.round(w * s), ch = Math.round(h * s);
    if (!e.canvas) { e.canvas = document.createElement('canvas'); e.ctx = e.canvas.getContext('2d', { alpha: false }); }
    if (e.canvas.width !== cw || e.canvas.height !== ch) { e.canvas.width = cw; e.canvas.height = ch; }
    e.ctx.drawImage(v, 0, 0, cw, ch);
    return { source: e.canvas, w: cw, h: ch };
  }

  _remapAt(t) {
    for (const it of this.p.items) {
      if (it.kind !== 'effect' || t < it.start || t >= it.start + it.dur) continue;
      const fx = FX_BY_ID[it.p.fx];
      if (fx && fx.timeRemap) return true;
    }
    return false;
  }

  // chamado pelo renderizador
  async frame(ci, src) {
    const c = this.p.clips[ci];
    if (!c) return null;
    const m = this.p.media[c.mid];
    if (!m) return null;
    if (m.kind === 'image') {
      const b = await this.image(c.mid);
      return { source: b, w: b.width, h: b.height };
    }
    const e = this.video(ci);
    const v = e.v;
    if (this.playing && !this.remap) {
      this.activeKeys.add(this.key(ci));
      const rate = c.speed || 1;
      if (v.playbackRate !== rate) v.playbackRate = rate;
      if (v.paused) {
        if (Math.abs(v.currentTime - src) > 0.06 && !v.seeking) this._seek(v, src);
        v.play().catch(() => { });
      } else if (Math.abs(v.currentTime - src) > 0.6 && !v.seeking) this._seek(v, src);
      if (e.a) {
        if (e.a.playbackRate !== rate) e.a.playbackRate = rate;
        if (e.a.paused) { if (Math.abs(e.a.currentTime - src) > 0.05) e.a.currentTime = src; e.a.play().catch(() => { }); }
        else if (Math.abs(e.a.currentTime - src) > 0.25 && !e.a.seeking) e.a.currentTime = src;
      }
    } else {
      if (e.a && !e.a.paused) e.a.pause();
      if (this.playing) this.activeKeys.add(this.key(ci));
      if (!v.paused) v.pause();
      if (Math.abs(v.currentTime - src) > 0.03) { if (v.seeking) v._want = src; else this._seek(v, src); }
    }
    if (v.readyState >= 2 && v.videoWidth) return this._source(e);
    return null;
  }

  // máscara do recorte de pessoa. Na reprodução não espera: usa a última pronta e calcula a próxima.
  mask(ci, src, fr) {
    const c = this.p.clips[ci];
    return c ? this._mask('mk:' + c.id, src, fr) : null;
  }
  itemMask(it, src, fr) { return this._mask('mi:' + it.id, src, fr); }
  _mask(k, src, fr) {
    let st = this.masks && this.masks.get(k);
    if (!this.masks) this.masks = new Map();
    if (!st) { st = { canvas: document.createElement('canvas'), t: -1, busy: false, ok: false }; this.masks.set(k, st); }
    const want = Math.round(src * 30) / 30;
    if (st.t === want && st.ok) return st.canvas;
    if (!st.busy) {
      st.busy = true;
      const p = segment(fr.source, fr.w, fr.h, st.canvas).then(r => { st.busy = false; if (r) { st.ok = true; st.t = want; if (!this.playing) this.app.requestRender(); } })
        .catch(() => { st.busy = false; });
      if (!this.playing || !st.ok) return p.then(() => st.ok ? st.canvas : null);
    }
    return st.ok ? st.canvas : null;
  }

  // vídeo sobreposto (PiP / tela dividida): um <video> por elemento, sincronizado com o tempo
  async itemFrame(it, src) {
    const m = this.p.media[it.p.mid];
    if (!m) return null;
    if (m.kind === 'image') { const b = await this.image(it.p.mid); return { source: b, w: b.width, h: b.height }; }
    const k = 'pip:' + it.id;
    const url = this.app.previewUrlOf(it.p.mid);
    let e = this.pool.get(k);
    if (e && e.url !== url) { this._drop(k); e = null; }
    if (!e) {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.setAttribute('playsinline', ''); v.src = url;
      v.addEventListener('seeked', () => { if (!this.playing) this.app.requestRender(); });
      v.addEventListener('loadeddata', () => { if (!this.playing) this.app.requestRender(); });
      e = { v, url, last: 0, canvas: null, a: null };
      this.pool.set(k, e); this._prune(8);
    }
    e.last = performance.now();
    const v = e.v;
    src = Math.max(0, Math.min(m.dur - 0.05, src));
    if (this.playing) {
      this.activeKeys.add(k);
      if (v.paused) { if (Math.abs(v.currentTime - src) > 0.08) this._seek(v, src); v.play().catch(() => { }); }
      else if (Math.abs(v.currentTime - src) > 0.5 && !v.seeking) this._seek(v, src);
    } else {
      if (!v.paused) v.pause();
      if (Math.abs(v.currentTime - src) > 0.03 && !v.seeking) this._seek(v, src);
    }
    if (v.readyState >= 2 && v.videoWidth) return this._source(e);
    return null;
  }

  // deixa o próximo clipe carregado e parado no ponto de entrada
  _prepare(ci, L) {
    const c = this.p.clips[ci];
    if (!c) return;
    const m = this.p.media[c.mid];
    if (!m || m.kind === 'image') { if (m) this.image(c.mid); return; }
    const e = this.video(ci);
    this.activeKeys.add(this.key(ci));
    const want = c.in;
    if (e.v.paused && !e.v.seeking && Math.abs(e.v.currentTime - want) > 0.05) this._seek(e.v, want);
  }

  // ---------------- reprodução ----------------
  async play() {
    if (this.playing || !this.p.clips.length) return;
    let L = layout(this.p);
    if (this.app.time >= L.total - 0.05) this.app.time = 0;
    this.playing = true;
    this.t0 = this.app.time;
    this.lastT = this.t0;
    this.events = sfxEvents(this.p);
    this.stats = { seeks: 0, frames: 0 };
    this.app.onPlayState(true);
    await this._startAudio(this.t0, L.total);
    this.p0 = performance.now();
    let slow = 0;
    const tick = async () => {
      if (!this.playing) return;
      const now = performance.now();
      L = layout(this.p);
      let t = this.t0 + (now - this.p0) / 1000;
      // segue o relógio do vídeo que está tocando
      const ci = clipIndexAt(this.p, t, L);
      const c = this.p.clips[ci];
      this.remap = this._remapAt(t);
      if (c && !this.remap) {
        const e = this.pool.get(this.key(ci));
        const m = this.p.media[c.mid];
        if (e && m && m.kind !== 'image' && !e.v.paused && !e.v.seeking && e.v.readyState >= 3) {
          const tv = L.starts[ci] + (e.v.currentTime - c.in) / (c.speed || 1);
          const end = L.starts[ci] + clipDur(c);
          if (tv >= L.starts[ci] - 0.05 && tv < end && Math.abs(tv - t) < 0.5) { t = tv; this.t0 = tv; this.p0 = now; }
        }
      }
      if (t >= L.total) { this.pause(); this.app.setTime(Math.max(0, L.total - 0.001)); return; }
      this.activeKeys.clear();
      if (ci + 1 < this.p.clips.length && L.starts[ci + 1] - t < 1.5) this._prepare(ci + 1, L);
      this.app.time = t;
      const r0 = performance.now();
      await this.app.renderNow();
      const dt = performance.now() - r0;
      this.stats.frames++;
      // celular lento: reduz a resolução da prévia
      slow = dt > 40 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 20 && this.app.lowerPreview()) slow = 0;
      this._mixVoices(t, L);
      this._fireSfx(this.lastT, t);
      this._duck(t, L);
      this.lastT = t;
      this.app.onPlayhead(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    for (const e of this.pool.values()) { try { e.v.pause(); e.v.muted = true; if (e.a) { e.a.pause(); e.a.muted = true; } } catch (x) { } }
    this._stopAudio();
    this.app.onPlayState(false);
    this.app.requestRender();
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  _mixVoices(t, L) {
    const req = frameRequest(this.p, t, L);
    let main = null;
    if (req) main = req.b && req.p >= 0.5 ? req.b.ci : req.a.ci;
    const mainKey = main != null && this.p.clips[main] ? this.key(main) : null;
    for (const [k, e] of this.pool) {
      if (!this.activeKeys.has(k)) { if (!e.v.paused) e.v.pause(); e.v.muted = true; if (e.a) { if (!e.a.paused) e.a.pause(); e.a.muted = true; } continue; }
      const on = k === mainKey && !this.remap && !this.app.recording;
      const out = e.a || e.v;              // quem toca o som
      if (e.a && !e.v.muted) e.v.muted = true;
      if (out.muted === on) out.muted = !on;
      if (on) {
        const c = this.p.clips[main];
        const vol = Math.max(0, Math.min(1, (c.vol ?? 1) * (this.p.audio.voice ?? 1)));
        if (Math.abs(out.volume - vol) > 0.01) out.volume = vol;
      }
    }
  }

  // ---------------- áudio (música, narração, batida, efeitos) ----------------
  _ctx() {
    if (!this.ac) this.ac = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR });
    if (this.ac.state === 'suspended') this.ac.resume().catch(() => { });
    return this.ac;
  }

  _buf(arr) {
    const ac = this._ctx();
    const b = ac.createBuffer(1, arr.length, SR);
    b.copyToChannel(arr, 0);
    return b;
  }

  async _decoded(mid) {
    if (this.audioBufs.has(mid)) return this.audioBufs.get(mid);
    let b = null;
    try { b = await this._ctx().decodeAudioData(await (await this.app.getBlob(mid)).arrayBuffer()); } catch (e) { b = null; }
    this.audioBufs.set(mid, b);
    return b;
  }

  async _startAudio(t, total) {
    const ac = this._ctx();
    this.musicGain = null; this.beatGain = null;
    if (this.app.recording) return;
    const mu = this.p.audio.music;
    if (mu && this.p.media[mu.mid]) {
      const b = await this._decoded(mu.mid);
      if (b) {
        const s = ac.createBufferSource(); s.buffer = b; s.loop = true;
        const g = ac.createGain(); g.gain.value = mu.vol ?? 0.5;
        s.connect(g).connect(ac.destination);
        s.start(0, ((mu.start || 0) + t) % b.duration);
        this.nodes.push(s); this.musicGain = g;
      }
    }
    // narrações / áudios soltos na linha do tempo
    for (const it of this.p.items) {
      const pipSound = it.kind === 'pip' && (it.p.vol ?? 0) > 0 && this.p.media[it.p.mid] && this.p.media[it.p.mid].hasAudio;
      if ((it.kind !== 'audio' && !pipSound) || it.start + it.dur <= t) continue;
      const b = await this._decoded(it.p.mid);
      if (!b) continue;
      const s = ac.createBufferSource(); s.buffer = b;
      const g = ac.createGain(); g.gain.value = it.p.vol ?? 1;
      s.connect(g).connect(ac.destination);
      const off = Math.max(0, t - it.start), when = ac.currentTime + Math.max(0, it.start - t);
      if ((it.p.in || 0) + off < b.duration) s.start(when, (it.p.in || 0) + off, Math.max(0.01, it.dur - off));
      this.nodes.push(s);
    }
    const bt = this.p.audio.beat;
    if (bt && bt.on) {
      const key = [bt.bpm, bt.style, Math.ceil(total)].join('|');
      if (key !== this.beatKey) { this.beatBuf = this._buf(makeBeat(bt.bpm || 126, Math.ceil(total) + 1, bt.style)); this.beatKey = key; }
      const s = ac.createBufferSource(); s.buffer = this.beatBuf;
      const g = ac.createGain(); g.gain.value = bt.vol ?? 0.35;
      s.connect(g).connect(ac.destination); s.start(0, Math.min(t, this.beatBuf.duration - 0.01));
      this.nodes.push(s); this.beatGain = g;
    }
  }

  _stopAudio() {
    for (const n of this.nodes) { try { n.stop(); } catch (e) { } }
    this.nodes = [];
  }

  _fireSfx(a, b) {
    if (!this.events || this.app.recording) return;
    const ac = this._ctx();
    for (const e of this.events) {
      if ((e.t > a && e.t <= b) || (a === this.t0 && e.t === a)) {
        const s = ac.createBufferSource(); s.buffer = this._buf(sfx(e.type));
        const g = ac.createGain(); g.gain.value = e.vol;
        s.connect(g).connect(ac.destination); s.start();
        this.nodes.push(s);
      }
    }
  }

  // ducking aproximado na prévia: usa o envelope de volume da mídia do clipe atual (se já analisado)
  _duck(t, L) {
    if (!this.p.audio.duck || (!this.musicGain && !this.beatGain)) return;
    const ci = clipIndexAt(this.p, t, L);
    const c = this.p.clips[ci];
    let talking = this.p.items.some(it => it.kind === 'audio' && t >= it.start && t < it.start + it.dur);
    if (c && !talking) {
      const env = this.app.envOf(c.mid);
      if (env) { const s = c.in + (t - L.starts[ci]) * (c.speed || 1); const k = Math.round(s / 0.02); talking = (env[k] ?? -100) > -38; }
    }
    const k = talking ? 0.22 : 1;
    const ac = this._ctx();
    if (this.musicGain) this.musicGain.gain.setTargetAtTime((this.p.audio.music.vol ?? 0.5) * k, ac.currentTime, talking ? 0.03 : 0.3);
    if (this.beatGain) this.beatGain.gain.setTargetAtTime((this.p.audio.beat.vol ?? 0.35) * k, ac.currentTime, talking ? 0.03 : 0.3);
  }

  async previewSfx(type) {
    const ac = this._ctx();
    const s = ac.createBufferSource(); s.buffer = this._buf(sfx(type));
    s.connect(ac.destination); s.start();
  }
}
