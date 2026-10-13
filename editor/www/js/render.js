// Monta cada quadro: clipes (com encaixe e efeitos de clipe) -> transição -> efeitos de trecho -> elementos -> legenda.
import { Engine } from './gl.js';
import { frameRequest, layout, clipDur } from './project.js';
import { FX_BY_ID } from './effects.js';
import { drawItems } from './overlays.js';
import { drawCaptions, buildPages } from './captions.js';
import { cssFont } from './fonts.js';

export class Renderer {
  constructor(outCanvas) {
    this.out = outCanvas;
    this.ctx = outCanvas.getContext('2d', { alpha: false });
    this.glc = document.createElement('canvas');
    this.glc.width = outCanvas.width; this.glc.height = outCanvas.height;
    this.eng = new Engine(this.glc);
    this.pages = [];
    this.pagesKey = -1;
    this.scratchCanvas = null;
    this.images = new Map();      // mid -> ImageBitmap (para elemento "imagem")
    this.lastBoxes = { captions: null, items: [] };
  }

  setSize(w, h) {
    if (this.out.width !== w || this.out.height !== h) { this.out.width = w; this.out.height = h; }
    this.eng.setSize(w, h);
  }

  captionsFor(p, version) {
    if (this.pagesKey !== version) { this.pages = buildPages(p); this.pagesKey = version; }
    return this.pages;
  }

  maskTexture(text) {
    const key = 'mask:' + text;
    if (this.eng.texs.has(key)) return this.eng.texs.get(key);
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let s = 420; x.font = cssFont('Anton', s, 400);
    const w = x.measureText(text).width;
    if (w > 470) { s *= 470 / w; x.font = cssFont('Anton', s, 400); }
    x.fillText(text, 256, 270);
    return this.eng.upload(key, c, 512, 512);
  }

  scratch(W, H) {
    if (!this.scratchCanvas) this.scratchCanvas = document.createElement('canvas');
    if (this.scratchCanvas.width !== W || this.scratchCanvas.height !== H) { this.scratchCanvas.width = W; this.scratchCanvas.height = H; }
    return this.scratchCanvas;
  }

  async _clip(p, req, slot, L, t, provider) {
    const eng = this.eng;
    const c = p.clips[req.ci];
    const fr = await provider.frame(req.ci, req.src, slot);
    let src;
    if (fr && fr.source) src = eng.upload('src' + slot, fr.source, fr.w, fr.h);
    else src = eng.texs.get('src' + slot) || eng.black;
    const local = Math.max(0, Math.min(1, (t - L.starts[req.ci]) / clipDur(c)));
    let zoom = c.zoom || 1;
    if (c.kb) zoom *= 1 + 0.12 * local;           // zoom lento automático em fotos
    let cur = eng.place(src, { fit: c.fit, zoom, x: c.x, y: c.y }, eng.fbo(slot));
    let k = 0;
    for (const f of c.fx || []) {
      const fx = FX_BY_ID[f.id];
      if (!fx || fx.timeRemap) continue;
      const tgt = eng.fbo(slot + 'x' + (k++ % 2));
      cur = eng.effect(fx.id, cur, local, t, f.i ?? fx.def.i, [f.bpm || 126, 0, 0, 0], eng.fbo('prev'), tgt);
    }
    return cur;
  }

  // provider.frame(ci, srcTime, slot) -> {source, w, h} | null
  async render(p, t, provider, opt = {}) {
    const eng = this.eng;
    const W = this.out.width, H = this.out.height;
    const L = opt.layout || layout(p);
    const req = frameRequest(p, t, L);
    let main;
    if (!req) {
      main = eng.copy(eng.black, eng.fbo('M'));
    } else {
      const A = await this._clip(p, req.a, 'A', L, t, provider);
      if (req.b) {
        const B = await this._clip(p, req.b, 'B', L, t, provider);
        const mask = req.trans.id === 'mask' ? this.maskTexture(req.trans.text || 'WOW') : null;
        main = eng.transition(req.trans.id, A, B, req.p, t, mask, eng.fbo('M'));
      } else main = A;
    }
    // efeitos aplicados a trechos
    let cur = main, k = 0, usedPrev = false;
    for (const it of p.items) {
      if (it.kind !== 'effect' || t < it.start || t >= it.start + it.dur) continue;
      const fx = FX_BY_ID[it.p.fx];
      if (!fx || fx.id === 'stutter') continue;
      if (fx.usesPrev) usedPrev = true;
      const tgt = eng.fbo('P' + (k++ % 2));
      cur = eng.effect(fx.id, cur, (t - it.start) / it.dur, t, it.p.i ?? fx.def.i, [it.p.bpm || 126, 0, 0, 0], eng.fbo('prev'), tgt);
    }
    eng.copy(cur, null);
    if (usedPrev || opt.keepPrev) eng.copy(cur, eng.fbo('prev'));
    const ctx = this.ctx;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.glc, 0, 0, W, H);
    const env = {
      scratch: (w, h) => this.scratch(w, h),
      image: mid => this.images.get(mid),
      total: L.total,
    };
    const items = drawItems(ctx, p, t, W, H, env);
    const pages = this.captionsFor(p, opt.capVersion ?? -2);
    const capBox = drawCaptions(ctx, p, pages, t, W, H);
    this.lastBoxes = { captions: capBox, items };
    return this.lastBoxes;
  }
}
