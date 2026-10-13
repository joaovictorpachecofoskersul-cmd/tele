// Mixagem final do áudio do projeto (48 kHz estéreo).
import { SR, sfx, makeBeat, duckCurve, lufs, limit, ELEMENT_SFX } from './audio.js';
import { layout, clipDur, transDur } from './project.js';
import { TRANS_BY_ID, FX_BY_ID, remapTime } from './effects.js';
import { decodeRange } from './media.js';

// Lista de sons (manuais + automáticos) com o instante em que tocam
export function sfxEvents(p) {
  const ev = [];
  for (const it of p.items) if (it.kind === 'sfx') ev.push({ t: it.start, type: it.p.type, vol: it.p.vol ?? 0.8 });
  if (!p.audio.sfxAuto) return ev;
  const L = layout(p);
  p.clips.forEach((c, i) => {
    const d = transDur(p, i);
    if (!d) return;
    const tr = TRANS_BY_ID[c.trans.id];
    if (!tr || !tr.sfx) return;
    const cut = L.starts[i + 1];
    const lead = tr.sfx === 'whoosh' ? 0.27 : tr.sfx === 'riser' ? 1.5 : tr.sfx === 'boom' || tr.sfx === 'impacto' ? 0.02 : d / 2;
    ev.push({ t: Math.max(0, cut - lead), type: tr.sfx, vol: 0.55, auto: true });
  });
  for (const it of p.items) {
    if (it.kind === 'effect') {
      const fx = FX_BY_ID[it.p.fx];
      if (fx && fx.sfx) ev.push({ t: it.start, type: fx.sfx, vol: 0.5, auto: true });
    } else if (ELEMENT_SFX[it.kind] && it.p.sound !== false) {
      let type = ELEMENT_SFX[it.kind];
      if (it.kind === 'card' && it.p.confetti) type = 'ding';
      ev.push({ t: it.start + (it.kind === 'stamp' ? 0.1 : 0), type, vol: 0.5, auto: true });
    } else if (it.kind === 'text' && it.p.anim === 'type') {
      ev.push({ t: it.start, type: 'digitar', vol: 0.35, auto: true });
    }
  }
  return ev.sort((a, b) => a.t - b.t);
}

// Janelas de remapeamento de tempo (repetir / congelar)
function remapWindows(p) {
  return p.items.filter(it => it.kind === 'effect' && FX_BY_ID[it.p.fx] && FX_BY_ID[it.p.fx].timeRemap)
    .map(it => ({ a: it.start, b: it.start + it.dur, fx: it.p.fx, i: it.p.i ?? FX_BY_ID[it.p.fx].def.i }));
}

export async function mixProject(p, getBlob, onProgress = () => { }) {
  const Lay = layout(p);
  const total = Math.max(0.1, Lay.total);
  const N = Math.ceil(total * SR);
  const L = new Float32Array(N), R = new Float32Array(N);
  const voice = new Float32Array(N);
  const wins = remapWindows(p);
  const voiceGain = p.audio.voice ?? 1;

  // 1) voz / som original dos clipes
  const ranges = [];
  for (let i = 0; i < p.clips.length; i++) {
    const c = p.clips[i], m = p.media[c.mid];
    if (!m || m.kind === 'image' || !m.hasAudio || !(c.vol > 0)) { ranges.push(null); continue; }
    const a = Math.max(0, c.in - 0.5), b = Math.min(m.dur, c.out + 0.5);
    onProgress(0.05 + 0.5 * i / p.clips.length, 'Lendo o áudio dos clipes');
    try { ranges.push({ a, data: await decodeRange(await getBlob(c.mid), a, b) }); } catch (e) { ranges.push(null); }
  }
  const fadeS = Math.floor(SR * 0.008);
  let ci = 0;
  for (let n = 0; n < N; n++) {
    const t = n / SR;
    let tr = t, silent = false;
    for (const w of wins) if (t >= w.a && t < w.b) {
      if (w.fx === 'freeze') silent = true;
      tr = w.a + remapTime(w.fx, t - w.a, w.b - w.a, w.i);
    }
    if (silent) continue;
    while (ci < p.clips.length - 1 && tr >= Lay.starts[ci + 1]) ci++;
    while (ci > 0 && tr < Lay.starts[ci]) ci--;
    const r = ranges[ci];
    if (!r) continue;
    const c = p.clips[ci];
    const local = tr - Lay.starts[ci];
    const s = c.in + local * (c.speed || 1);
    const x = (s - r.a) * SR, j = Math.floor(x), f = x - j;
    const dl = r.data[0], dr = r.data[1];
    if (j < 0 || j + 1 >= dl.length) continue;
    // pequenas rampas nas emendas para não estalar
    const dn = Math.floor(local * SR), up = Math.floor((clipDur(c) - local) * SR);
    let g = (c.vol ?? 1) * voiceGain;
    if (dn < fadeS) g *= dn / fadeS;
    if (up < fadeS) g *= Math.max(0, up) / fadeS;
    const vl = (dl[j] * (1 - f) + dl[j + 1] * f) * g, vr = (dr[j] * (1 - f) + dr[j + 1] * f) * g;
    L[n] += vl; R[n] += vr; voice[n] = (vl + vr) * 0.5;
  }
  onProgress(0.6, 'Música e batida');

  // 2) música e batida com ducking
  const duck = p.audio.duck ? duckCurve(voice, N, 0.22) : null;
  const mu = p.audio.music;
  if (mu && p.media[mu.mid]) {
    const m = p.media[mu.mid];
    try {
      const [ml, mr] = await decodeRange(await getBlob(mu.mid), 0, m.dur);
      const len = ml.length, off = Math.floor((mu.start || 0) * SR), vol = mu.vol ?? 0.5;
      const fo = Math.floor(SR * 1.5);
      for (let n = 0; n < N; n++) {
        const j = (off + n) % len;
        let g = vol * (duck ? duck[n] : 1);
        if (N - n < fo) g *= (N - n) / fo;
        L[n] += ml[j] * g; R[n] += mr[j] * g;
      }
    } catch (e) { /* música com problema: segue sem */ }
  }
  const bt = p.audio.beat;
  if (bt && bt.on) {
    const beat = makeBeat(bt.bpm || 126, total, bt.style);
    const vol = bt.vol ?? 0.35;
    for (let n = 0; n < N; n++) { const v = beat[n] * vol * (duck ? duck[n] : 1); L[n] += v; R[n] += v; }
  }
  onProgress(0.75, 'Efeitos sonoros');

  // 3) efeitos sonoros
  for (const e of sfxEvents(p)) {
    const s = sfx(e.type), o = Math.floor(e.t * SR), g = e.vol;
    for (let i = 0; i < s.length && o + i < N; i++) { if (o + i < 0) continue; L[o + i] += s[i] * g; R[o + i] += s[i] * g; }
  }
  onProgress(0.85, 'Ajustando o volume');

  // 4) volume padrão de rede social (-14 LUFS) + limitador
  if (p.audio.loud) {
    const cur = lufs([L, R]);
    if (cur > -60) {
      const gain = Math.pow(10, Math.max(-12, Math.min(18, -14 - cur)) / 20);
      for (let n = 0; n < N; n++) { L[n] *= gain; R[n] *= gain; }
    }
  }
  limit([L, R], -1);
  onProgress(1, 'Áudio pronto');
  return [L, R];
}
