// Linha do tempo estilo CapCut: cursor fixo no meio, arrastar para navegar, pinça para zoom.
import { h } from './ui.js';
import { layout, clipDur, transDur, assignLanes, clamp, srcOffset } from './project.js';
import { TRANS_BY_ID, FX_BY_ID } from './effects.js';
import { ELEMENTS } from './overlays.js';
import { SFX_LIST } from './audio.js';

const KIND_LABEL = Object.fromEntries(ELEMENTS.map(e => [e.kind, e.name]));
KIND_LABEL.text = 'Texto'; KIND_LABEL.effect = 'Efeito'; KIND_LABEL.sfx = 'Som';
const KIND_COLOR = { audio: '#0F766E', text: '#7C3AED', effect: '#DB2777', sfx: '#16A34A', card: '#EA580C', image: '#0891B2' };

export class Timeline {
  constructor(root, app) {
    this.app = app; this.root = root;
    this.pps = 70;                       // pixels por segundo
    this.inner = h('div', { class: 'tl-in' });
    root.append(this.inner);
    // Só conta como "arrastar a linha do tempo" a rolagem feita pelo dedo.
    // A rolagem que o app faz para acompanhar a reprodução é ignorada.
    this.touching = false; this.userUntil = 0; this.expected = null;
    const start = () => { this.touching = true; };
    const end = () => { this.touching = false; this.userUntil = performance.now() + 700; };
    root.addEventListener('touchstart', start, { passive: true });
    root.addEventListener('pointerdown', start, { passive: true });
    root.addEventListener('touchend', end, { passive: true });
    root.addEventListener('touchcancel', end, { passive: true });
    root.addEventListener('pointerup', end, { passive: true });
    root.addEventListener('wheel', () => { this.userUntil = performance.now() + 300; }, { passive: true });
    root.addEventListener('scroll', () => {
      const sl = this.root.scrollLeft;
      if (this.expected != null && Math.abs(sl - this.expected) < 1.5) return;
      const now = performance.now();
      if (!this.touching && now > this.userUntil) return;
      if (!this.touching) this.userUntil = now + 200;   // rolagem por inércia depois de soltar
      this.app.scrub(sl / this.pps);
    }, { passive: true });
    this._pinch();
  }

  get pad() { return Math.round(this.root.clientWidth / 2); }

  _pinch() {
    let d0 = 0, p0 = 0, t0 = 0;
    const dist = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    this.root.addEventListener('touchstart', e => { if (e.touches.length === 2) { d0 = dist(e); p0 = this.pps; t0 = this.app.time; } }, { passive: true });
    this.root.addEventListener('touchmove', e => {
      if (e.touches.length !== 2 || !d0) return;
      e.preventDefault();
      this.pps = clamp(p0 * dist(e) / d0, 8, 400);
      this.build(); this.scrollTo(t0);
    }, { passive: false });
    this.root.addEventListener('touchend', () => { d0 = 0; }, { passive: true });
    // zoom com a roda do mouse (no computador)
    this.root.addEventListener('wheel', e => {
      if (!e.ctrlKey) return;
      e.preventDefault(); const t = this.app.time;
      this.pps = clamp(this.pps * (e.deltaY < 0 ? 1.15 : 0.87), 8, 400); this.build(); this.scrollTo(t);
    }, { passive: false });
  }

  zoom(k) { const t = this.app.time; this.pps = clamp(this.pps * k, 8, 400); this.build(); this.scrollTo(t); }

  scrollTo(t) {
    this.root.scrollLeft = t * this.pps;
    this.expected = this.root.scrollLeft;
  }

  x(t) { return this.pad + t * this.pps; }

  build() {
    const app = this.app, p = app.project, pps = this.pps;
    const L = layout(p);
    const pad = this.pad;
    this.inner.innerHTML = '';
    this.inner.style.width = (L.total * pps + pad * 2) + 'px';
    const sel = app.sel || {};

    // régua
    const ruler = h('div', { class: 'tl-ruler' });
    const step = pps > 120 ? 0.5 : pps > 40 ? 1 : pps > 15 ? 5 : 10;
    for (let t = 0; t <= L.total + 0.001; t += step) {
      const major = Math.abs(t - Math.round(t)) < 1e-6 && (Math.round(t) % (step >= 5 ? step : 2) === 0 || step >= 5);
      ruler.append(h('div', { class: 'tk' + (major ? ' mj' : ''), style: { left: this.x(t) + 'px' } }, major ? fmtShort(t) : ''));
    }
    this.inner.append(ruler);

    // clipes
    const row = h('div', { class: 'tl-row clips' });
    p.clips.forEach((c, i) => {
      const m = p.media[c.mid] || {};
      const w = clipDur(c) * pps;
      const el = h('div', { class: 'clip' + (sel.type === 'clip' && sel.id === c.id ? ' sel' : ''), style: { left: this.x(L.starts[i]) + 'px', width: Math.max(2, w - 2) + 'px' } });
      const aux = app.auxOf(c.mid);
      if (aux && aux.thumbs && aux.thumbs.list.length) {
        const th = aux.thumbs, tw = 56 * (th.w / th.h);
        const n = Math.max(1, Math.ceil(w / tw));
        for (let k = 0; k < n; k++) {
          let idx = 0;
          if (m.kind !== 'image') {
            const tm = c.in + srcOffset(c, (k + 0.5) * tw / pps);
            idx = clamp(Math.floor(tm / Math.max(0.01, m.dur) * th.list.length), 0, th.list.length - 1);
          }
          el.append(h('img', { src: th.list[idx], style: { left: (k * tw) + 'px', width: tw + 'px' }, draggable: 'false' }));
        }
      }
      const badges = [];
      if (c.curve && c.curve.length) badges.push('curva'); else if ((c.speed || 1) !== 1) badges.push(c.speed + 'x');
      if (c.reversed) badges.push('◀◀');
      if (c.fx && c.fx.length) badges.push('✦' + c.fx.length);
      if (m.kind !== 'image' && !(c.vol > 0)) badges.push('🔇');
      if (badges.length) el.append(h('span', { class: 'cb' }, badges.join(' ')));
      el.addEventListener('click', e => { e.stopPropagation(); app.select({ type: 'clip', id: c.id }); });
      if (sel.type === 'clip' && sel.id === c.id) {
        const geo = () => { el.style.width = Math.max(2, clipDur(c) * pps - 2) + 'px'; };
        el.append(this._handle('l', dx => { app.trimClip(c, 'in', dx / pps); geo(); }), this._handle('r', dx => { app.trimClip(c, 'out', dx / pps); geo(); }));
      }
      row.append(el);
      if (i < p.clips.length - 1) {
        const tr = c.trans && c.trans.id !== 'none';
        const b = h('button', { class: 'trb' + (tr ? ' on' : '') + (sel.type === 'trans' && sel.index === i ? ' sel' : ''), style: { left: (this.x(L.starts[i + 1]) - 13) + 'px' }, title: tr ? TRANS_BY_ID[c.trans.id].name : 'Transição' }, tr ? '⧓' : '+');
        b.addEventListener('click', e => { e.stopPropagation(); app.openTransition(i); });
        row.append(b);
      }
    });
    const add = h('button', { class: 'tl-add', style: { left: (this.x(L.total) + 10) + 'px' } }, '+');
    add.addEventListener('click', e => { e.stopPropagation(); app.importFiles('append'); });
    row.append(add);
    this.inner.append(row);

    // legenda
    const pages = app.renderer.captionsFor(p, app.capVersion);
    if (pages.length || Object.keys(p.transcripts).length) {
      const cr = h('div', { class: 'tl-row caps' + (p.captions.on ? '' : ' off') });
      for (const pg of pages) {
        const el = h('div', { class: 'cap' + (sel.type === 'captions' ? ' sel' : ''), style: { left: this.x(pg.start) + 'px', width: Math.max(4, (pg.end - pg.start) * pps - 1) + 'px' } },
          pg.words.map(w => w.w).join(' '));
        el.addEventListener('click', e => { e.stopPropagation(); app.select({ type: 'captions' }); });
        cr.append(el);
      }
      this.inner.append(cr);
    }

    // itens (textos, elementos, efeitos)
    const items = p.items.filter(it => it.kind !== 'sfx' && it.kind !== 'audio');
    const nl = assignLanes(items);
    for (let lane = 0; lane < nl; lane++) {
      const lr = h('div', { class: 'tl-row lane' });
      for (const it of items.filter(x => x._lane === lane)) lr.append(this._itemBlock(it));
      this.inner.append(lr);
    }

    // áudio: música, batida, sons
    const ar = h('div', { class: 'tl-row audio' });
    if (p.audio.music && p.media[p.audio.music.mid]) {
      const el = h('div', { class: 'aud music' + (sel.type === 'music' ? ' sel' : ''), style: { left: this.x(0) + 'px', width: (L.total * pps) + 'px' } }, '♪ ' + (p.media[p.audio.music.mid].name || 'Música'));
      el.addEventListener('click', e => { e.stopPropagation(); app.openAudio(); });
      ar.append(el);
    } else if (p.audio.beat && p.audio.beat.on) {
      const el = h('div', { class: 'aud beat', style: { left: this.x(0) + 'px', width: (L.total * pps) + 'px' } }, '🥁 Batida ' + p.audio.beat.bpm + ' bpm');
      el.addEventListener('click', e => { e.stopPropagation(); app.openAudio(); });
      ar.append(el);
    }
    this.inner.append(ar);
    const nar = p.items.filter(x => x.kind === 'audio');
    if (nar.length) {
      const nr = h('div', { class: 'tl-row lane' });
      for (const it of nar) nr.append(this._itemBlock(it));
      this.inner.append(nr);
    }
    const sr = h('div', { class: 'tl-row audio' });
    for (const it of p.items.filter(x => x.kind === 'sfx')) {
      const name = (SFX_LIST.find(s => s.id === it.p.type) || {}).name || 'Som';
      const el = h('div', { class: 'sfx' + (sel.type === 'item' && sel.id === it.id ? ' sel' : ''), style: { left: (this.x(it.start) - 2) + 'px' } }, '◆ ' + name);
      this._dragMove(el, it, () => { el.style.left = (this.x(it.start) - 2) + 'px'; });
      el.addEventListener('click', e => { e.stopPropagation(); if (!el._dragged) app.select({ type: 'item', id: it.id }); el._dragged = false; });
      sr.append(el);
    }
    if (sr.childNodes.length) this.inner.append(sr);

    this.inner.onclick = () => app.select(null);
  }

  _itemBlock(it) {
    const app = this.app, pps = this.pps, sel = app.sel || {};
    const isSel = sel.type === 'item' && sel.id === it.id;
    let label = KIND_LABEL[it.kind] || it.kind;
    if (it.kind === 'text') label = '𝐓 ' + (it.p.text || '').slice(0, 24);
    if (it.kind === 'effect') label = '✦ ' + ((FX_BY_ID[it.p.fx] || {}).name || 'Efeito');
    if (it.kind === 'audio') label = '🎙 ' + (((this.app.project.media[it.p.mid] || {}).name) || 'Narração');
    if (it.kind === 'stamp' || it.kind === 'knockout') label = (KIND_LABEL[it.kind]) + ': ' + (it.p.text || '');
    const el = h('div', { class: 'blk' + (isSel ? ' sel' : ''), style: { left: this.x(it.start) + 'px', width: Math.max(6, it.dur * pps - 1) + 'px', background: KIND_COLOR[it.kind] || '#475569' } }, h('span', {}, label));
    el.addEventListener('click', e => { e.stopPropagation(); if (!el._dragged) app.select({ type: 'item', id: it.id }); el._dragged = false; });
    if (isSel) {
      const geo = () => { el.style.left = this.x(it.start) + 'px'; el.style.width = Math.max(6, it.dur * pps - 1) + 'px'; };
      this._dragMove(el, it, geo);
      el.append(this._handle('l', dx => { app.trimItem(it, 'start', dx / pps); geo(); }), this._handle('r', dx => { app.trimItem(it, 'end', dx / pps); geo(); }));
    }
    return el;
  }

  _dragMove(el, it, geo) {
    let x0 = null, s0 = 0;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', e => {
      if (e.target.classList.contains('hd')) return;
      x0 = e.clientX; s0 = it.start; el.setPointerCapture(e.pointerId); el._dragged = false;
    });
    el.addEventListener('pointermove', e => {
      if (x0 == null) return;
      const dx = e.clientX - x0;
      if (Math.abs(dx) > 6) el._dragged = true;
      if (el._dragged) { this.app.moveItem(it, s0 + dx / this.pps); geo && geo(); }
    });
    const end = () => { if (x0 != null && el._dragged) this.app.commit(); x0 = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  _handle(side, onDrag) {
    const hd = h('div', { class: 'hd ' + side });
    let x0 = null, last = 0;
    hd.addEventListener('pointerdown', e => { e.stopPropagation(); x0 = e.clientX; last = 0; hd.setPointerCapture(e.pointerId); });
    hd.addEventListener('pointermove', e => {
      if (x0 == null) return;
      const dx = e.clientX - x0;
      onDrag(dx - last); last = dx;
    });
    const end = e => { if (x0 != null) { x0 = null; this.app.commit(); } };
    hd.addEventListener('pointerup', end); hd.addEventListener('pointercancel', end);
    hd.addEventListener('click', e => e.stopPropagation());
    return hd;
  }
}

function fmtShort(t) {
  const m = Math.floor(t / 60), s = Math.round(t - m * 60);
  return m ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}
