// Monta cada quadro: clipes (com encaixe e efeitos de clipe) -> transição -> efeitos de trecho -> elementos -> legenda.
import { Engine } from './gl.js';
import { frameRequest, layout, clipDur } from './project.js';
import { FX_BY_ID } from './effects.js';
import { drawItems } from './overlays.js';
import { drawCaptions, buildPages } from './captions.js';
import { cssFont } from './fonts.js';
import { interp } from './kf.js';

// posição do rosto no instante da mídia (suavizada entre amostras)
function trackAt(tr, st) {
  if (st <= tr[0].t) return tr[0];
  const last = tr[tr.length - 1];
  if (st >= last.t) return last;
  let i = 0; while (i < tr.length - 1 && tr[i + 1].t <= st) i++;
  const a = tr[i], b = tr[i + 1], q = (st - a.t) / Math.max(1e-3, b.t - a.t);
  const e = q * q * (3 - 2 * q);
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
}

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
    this.luts = new Map();        // mid -> {n, data} (LUT .cube)
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
    if (fr && fr.source) { src = eng.upload('src' + slot, fr.source, fr.w, fr.h); src.owner = p.id; }
    else { const old = eng.texs.get('src' + slot); src = old && old.owner === p.id ? old : eng.black; }   // quadro de outro projeto nunca aparece
    const lt = t - L.starts[req.ci];
    const local = Math.max(0, Math.min(1, lt / clipDur(c)));
    // keyframes do enquadramento
    const kv = c.kf && c.kf.length ? interp(c.kf, lt) : {};
    let zoom = kv.zoom ?? (c.zoom || 1);
    let ox = kv.x ?? (c.x || 0), oy = kv.y ?? (c.y || 0);
    if (c.kb) zoom *= 1 + 0.12 * local;           // zoom lento automático em fotos
    // enquadramento automático seguindo o rosto
    if (c.reframe && c.track && c.track.length && (c.fit || 'cover') === 'cover' && src.w > 1) {
      const f = trackAt(c.track, req.src);
      if (f) {
        const sa = src.w / src.h, oa = eng.w / eng.h;
        const sx = (sa > oa ? sa / oa : 1) * zoom, sy = (sa > oa ? 1 : oa / sa) * zoom;
        const mx = Math.max(0, (sx - 1) / 2), my = Math.max(0, (sy - 1) / 2);
        ox += Math.max(-mx, Math.min(mx, -(f.x - 0.5) * sx));
        oy += Math.max(-my, Math.min(my, (0.5 - (f.y + 0.06)) * sy));   // um pouco abaixo do rosto: deixa espaço acima da cabeça
      }
    }
    const place = { fit: c.fit, zoom, x: ox, y: oy };
    let cur = eng.place(src, place, eng.fbo(slot));
    // ajuste de cor e LUT
    const a = c.adj;
    if (a && (a.bri || a.con || a.sat || a.temp || a.tint || a.vig || a.sharp || a.shadow)) cur = eng.adjust(cur, a, eng.fbo(slot + 'adj'));
    if (c.lut && c.lut.mid && this.luts.get(c.lut.mid)) {
      const L3 = this.luts.get(c.lut.mid);
      cur = eng.lut(cur, eng.lutTexture('lut:' + c.lut.mid, L3), L3.n, c.lut.k ?? 1, eng.fbo(slot + 'lut'));
    }
    // fundo de outra cor (chroma key)
    const ky = c.key;
    if (ky && ky.on) {
      const bg = this._bg(ky, cur, slot);
      cur = eng.chroma(cur, bg, ky.color || '#00FF00', ky.sim ?? .4, ky.soft ?? .1, ky.spill ?? .6, eng.fbo(slot + 'key'));
    }
    // recorte de pessoa: troca o fundo
    const sg = c.seg;
    if (sg && sg.mode && sg.mode !== 'off' && provider.mask && fr && fr.source) {
      const mk = await provider.mask(req.ci, req.src, fr);
      if (mk) {
        const mt = eng.upload('mask' + slot, mk, mk.width, mk.height);
        const mp = eng.place(mt, { ...place, fit: c.fit === 'blur' ? 'contain' : c.fit, bgGray: 0 }, eng.fbo(slot + 'mk'));
        const bg = this._bg(sg, cur, slot);
        cur = eng.segComposite(cur, mp, bg, sg.thr ?? 0.5, sg.soft ?? 0.15, eng.fbo(slot + 'sc'));
      }
    }
    let k = 0;
    for (const f of c.fx || []) {
      const fx = FX_BY_ID[f.id];
      if (!fx || fx.timeRemap) continue;
      const tgt = eng.fbo(slot + 'x' + (k++ % 2));
      cur = eng.effect(fx.id, cur, local, t, f.i ?? fx.def.i, fx.params ? fx.params(f) : [f.bpm || 126, 0, 0, 0], eng.fbo('prev'), tgt);
    }
    return cur;
  }

  // fundo usado no recorte de pessoa e no chroma key
  _bg(o, cur, slot) {
    const eng = this.eng;
    if (o.mode === 'blur') return eng.blurBg(cur, slot);
    if (o.mode === 'bw') return eng.gray(cur, 0.85, eng.fbo(slot + 'g'));
    if (o.mode === 'dark') return eng.gray(cur, 0.25, eng.fbo(slot + 'g'));
    if (o.mode === 'image' && o.mid && this.images.get(o.mid)) {
      const im = this.images.get(o.mid);
      return eng.place(eng.upload('bgimg' + slot, im, im.width, im.height), { fit: 'cover' }, eng.fbo(slot + 'g'));
    }
    return eng.solid(o.mode === 'color' ? (o.bgColor || o.color || '#000000') : '#000000');
  }

  // provider.frame(ci, srcTime, slot) -> {source, w, h} | null
  async render(p, t, provider, opt = {}) {
    const eng = this.eng;
    const W = this.out.width, H = this.out.height;
    const L = opt.layout || layout(p);
    const req = frameRequest(p, t, L);
    // vídeos sobrepostos (PiP): busca o quadro de cada um antes de desenhar
    const pips = new Map();
    for (const it of p.items) {
      if (it.kind !== 'pip' || t < it.start || t >= it.start + it.dur || !provider.itemFrame) continue;
      const st = (it.p.in || 0) + (t - it.start) * (it.p.speed || 1);
      try {
        const fr = await provider.itemFrame(it, st);
        let mask = null;
        if (fr && it.p.cut && provider.itemMask) mask = await provider.itemMask(it, st, fr);
        pips.set(it.id, { fr, mask });
      } catch (e) { /* segue sem esse vídeo */ }
    }
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
      cur = eng.effect(fx.id, cur, (t - it.start) / it.dur, t, it.p.i ?? fx.def.i, fx.params ? fx.params(it.p) : [it.p.bpm || 126, 0, 0, 0], eng.fbo('prev'), tgt);
    }
    eng.copy(cur, null);
    if (usedPrev || opt.keepPrev) eng.copy(cur, eng.fbo('prev'));
    const ctx = this.ctx;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.glc, 0, 0, W, H);
    const env = {
      scratch: (w, h) => this.scratch(w, h),
      image: mid => this.images.get(mid),
      pip: id => pips.get(id),
      total: L.total,
    };
    const items = drawItems(ctx, p, t, W, H, env);
    const pages = this.captionsFor(p, opt.capVersion ?? -2);
    const capBox = drawCaptions(ctx, p, pages, t, W, H, env);
    this.lastBoxes = { captions: capBox, items };
    return this.lastBoxes;
  }
}
