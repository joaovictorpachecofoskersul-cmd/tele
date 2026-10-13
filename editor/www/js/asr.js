// Orquestra a legenda automática: corta o áudio em pedaços de até ~28 s em pontos de silêncio,
// manda para o worker e junta as palavras com o tempo certo.
let worker = null;
let seq = 0;
const pending = new Map();
let downloadCb = null;

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./asr-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = e => {
    const m = e.data;
    if (m.type === 'download') { downloadCb && downloadCb(m.loaded, m.total); return; }
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.type === 'error') p.rej(new Error(m.msg)); else p.res(m);
  };
  worker.onerror = e => { for (const p of pending.values()) p.rej(new Error(e.message || 'falha no reconhecimento')); pending.clear(); };
  return worker;
}

function runChunk(audio) {
  const id = ++seq;
  return new Promise((res, rej) => {
    pending.set(id, { res, rej });
    getWorker().postMessage({ type: 'chunk', id, audio, lang: 'portuguese' }, [audio.buffer]);
  });
}

const HALLU = /(amara\.org|legendas pela comunidade|legendado por|inscreva-se no canal|obrigado por assistir|tradução e legendas|subtitles by)/i;

// mono: Float32Array 16 kHz ; env: dB a cada 20 ms
export async function transcribe(mono, env, { onProgress, onDownload } = {}) {
  downloadCb = onDownload;
  const SR = 16000, total = mono.length / SR;
  // pontos de corte
  const cuts = [0];
  let pos = 0;
  while (total - pos > 29) {
    let best = pos + 28, bestDb = 1e9;
    for (let t = pos + 18; t < pos + 28.5; t += 0.02) {
      const k = Math.round(t / 0.02);
      let db = 0; for (let j = -5; j <= 5; j++) db += env[k + j] ?? 0;
      if (db < bestDb) { bestDb = db; best = t; }
    }
    cuts.push(best); pos = best;
  }
  cuts.push(total);
  const sorted = Array.from(env).sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)] ?? -80;
  const words = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = Math.floor(cuts[i] * SR), b = Math.floor(cuts[i + 1] * SR);
    const piece = mono.slice(a, b);
    let peak = 0; for (let j = 0; j < piece.length; j += 64) peak = Math.max(peak, Math.abs(piece[j]));
    onProgress && onProgress(i / (cuts.length - 1));
    if (peak < 0.003) continue;                          // trecho mudo
    const r = await runChunk(piece);
    if (HALLU.test(r.text || '')) {
      // remove só as frases inventadas
      r.words = r.words.filter(w => !HALLU.test(w.w));
    }
    for (const w of r.words) {
      let s = cuts[i] + w.s, e = cuts[i] + (w.e ?? w.s + 0.3);
      if (!(e > s)) e = s + 0.25;
      // descarta palavra "fantasma" em silêncio total
      const k0 = Math.floor(s / 0.02), k1 = Math.ceil(e / 0.02);
      let mx = -200; for (let k = k0 - 3; k <= k1 + 3; k++) mx = Math.max(mx, env[k] ?? -200);
      if (mx < floor + 4) continue;
      words.push({ w: w.w, s: +s.toFixed(3), e: +e.toFixed(3) });
    }
  }
  onProgress && onProgress(1);
  // garante ordem e sem sobreposição
  words.sort((x, y) => x.s - y.s);
  for (let i = 1; i < words.length; i++) if (words[i].s < words[i - 1].e) words[i - 1].e = Math.max(words[i - 1].s + 0.05, words[i].s);
  return words;
}

export function preloadModel(onDownload) {
  downloadCb = onDownload;
  const id = ++seq;
  return new Promise((res, rej) => {
    pending.set(id, { res, rej });
    const w = getWorker();
    const h = e => { if (e.data.type === 'ready') { w.removeEventListener('message', h); pending.delete(id); res(); } };
    w.addEventListener('message', h);
    w.postMessage({ type: 'load', id });
  });
}
