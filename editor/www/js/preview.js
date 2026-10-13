// Reprodução da prévia: vídeos via <video>, fotos via ImageBitmap, música/batida/efeitos via WebAudio.
import { frameRequest, layout, clipIndexAt } from './project.js';
import { sfx, makeBeat, SR } from './audio.js';
import { sfxEvents } from './mix.js';

export class Preview {
  constructor(app) {
    this.app = app;
    this.pool = new Map();      // clipId -> {v, last}
    this.bitmaps = new Map();   // mid -> Promise<ImageBitmap>
    this.playing = false;
    this.ac = null;
    this.nodes = [];
    this.musicBuf = new Map();  // mid -> AudioBuffer
    this.beatKey = ''; this.beatBuf = null;
    this.activeIds = new Set();
  }

  get p() { return this.app.project; }

  image(mid) {
    if (!this.bitmaps.has(mid)) {
      this.bitmaps.set(mid, this.app.getBlob(mid).then(b => createImageBitmap(b)));
    }
    return this.bitmaps.get(mid);
  }

  video(clip) {
    let e = this.pool.get(clip.id);
    if (!e || e.mid !== clip.mid) {
      if (e) this._drop(clip.id);
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('playsinline', ''); v.disablePictureInPicture = true;
      v.src = this.app.urlOf(clip.mid);
      v.addEventListener('seeked', () => {
        if (v._want != null && Math.abs(v.currentTime - v._want) > 0.02 && !this.playing) { v.currentTime = v._want; return; }
        v._want = null;
        if (!this.playing) this.app.requestRender();
      });
      v.addEventListener('loadeddata', () => { if (!this.playing) this.app.requestRender(); });
      e = { v, mid: clip.mid, last: 0 };
      this.pool.set(clip.id, e);
      this._prune();
    }
    e.last = performance.now();
    return e.v;
  }

  _drop(id) {
    const e = this.pool.get(id);
    if (!e) return;
    try { e.v.pause(); e.v.removeAttribute('src'); e.v.load(); } catch (x) { }
    this.pool.delete(id);
  }

  _prune(max = 4) {
    if (this.pool.size <= max) return;
    const arr = [...this.pool.entries()].sort((a, b) => a[1].last - b[1].last);
    for (let i = 0; i < arr.length - max; i++) this._drop(arr[i][0]);
  }

  releaseAll() { for (const id of [...this.pool.keys()]) this._drop(id); }

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
    const v = this.video(c);
    if (this.playing) {
      this.activeIds.add(c.id);
      const rate = c.speed || 1;
      if (v.playbackRate !== rate) v.playbackRate = rate;
      if (v.paused || Math.abs(v.currentTime - src) > 0.25) { if (!v.seeking) v.currentTime = src; }
      if (v.paused) v.play().catch(() => { });
    } else if (Math.abs(v.currentTime - src) > 0.02) {
      if (v.seeking) v._want = src; else { v._want = src; v.currentTime = src; }
    }
    if (v.readyState >= 2 && v.videoWidth) return { source: v, w: v.videoWidth, h: v.videoHeight };
    return null;
  }

  // ---------------- reprodução ----------------
  async play() {
    if (this.playing || !this.p.clips.length) return;
    const L = layout(this.p);
    if (this.app.time >= L.total - 0.05) this.app.time = 0;
    this.playing = true;
    this.t0 = this.app.time;
    this.p0 = performance.now();
    this.lastT = this.t0;
    this.events = sfxEvents(this.p);
    await this._startAudio(this.t0, L.total);
    this.p0 = performance.now();
    const tick = async () => {
      if (!this.playing) return;
      const t = this.t0 + (performance.now() - this.p0) / 1000;
      const Lnow = layout(this.p);
      if (t >= Lnow.total) { this.pause(); this.app.setTime(Lnow.total - 0.001); return; }
      this.activeIds.clear();
      this.app.time = t;
      await this.app.renderNow(true);
      this._mixVoices(t, Lnow);
      this._fireSfx(this.lastT, t);
      this._duck(t, Lnow);
      this.lastT = t;
      this.app.onPlayhead(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    this.app.onPlayState(true);
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    for (const e of this.pool.values()) { try { e.v.pause(); e.v.muted = true; } catch (x) { } }
    this._stopAudio();
    this.app.onPlayState(false);
    this.app.requestRender();
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  _mixVoices(t, L) {
    const req = frameRequest(this.p, t, L);
    let main = null;
    if (req) main = req.b && req.p >= 0.5 ? req.b.ci : req.a.ci;
    let freeze = false;
    for (const it of this.p.items) if (it.kind === 'effect' && it.p.fx === 'freeze' && t >= it.start && t < it.start + it.dur) freeze = true;
    for (const [id, e] of this.pool) {
      const ci = this.p.clips.findIndex(c => c.id === id);
      const c = this.p.clips[ci];
      if (!this.activeIds.has(id)) { if (!e.v.paused) e.v.pause(); e.v.muted = true; continue; }
      const on = ci === main && !freeze;
      e.v.muted = !on;
      if (on) e.v.volume = Math.max(0, Math.min(1, (c.vol ?? 1) * (this.p.audio.voice ?? 1)));
    }
  }

  // ---------------- áudio (música, batida, efeitos) ----------------
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

  async _startAudio(t, total) {
    const ac = this._ctx();
    this.musicGain = null; this.beatGain = null;
    const mu = this.p.audio.music;
    if (mu && this.p.media[mu.mid]) {
      let b = this.musicBuf.get(mu.mid);
      if (!b) {
        try { b = await ac.decodeAudioData(await (await this.app.getBlob(mu.mid)).arrayBuffer()); this.musicBuf.set(mu.mid, b); } catch (e) { b = null; }
      }
      if (b) {
        const s = ac.createBufferSource(); s.buffer = b; s.loop = true;
        const g = ac.createGain(); g.gain.value = mu.vol ?? 0.5;
        s.connect(g).connect(ac.destination);
        s.start(0, ((mu.start || 0) + t) % b.duration);
        this.nodes.push(s); this.musicGain = g;
      }
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
    if (!this.events) return;
    const ac = this._ctx();
    for (const e of this.events) {
      if (e.t > a && e.t <= b || (a === this.t0 && e.t === a)) {
        const s = ac.createBufferSource(); s.buffer = this._buf(sfx(e.type));
        const g = ac.createGain(); g.gain.value = e.vol;
        s.connect(g).connect(ac.destination); s.start();
        this.nodes.push(s);
      }
    }
  }

  // ducking aproximado na prévia: usa o envelope de volume da mídia do clipe atual
  _duck(t, L) {
    if (!this.p.audio.duck || (!this.musicGain && !this.beatGain)) return;
    const ci = clipIndexAt(this.p, t, L);
    const c = this.p.clips[ci];
    let talking = false;
    if (c) {
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
