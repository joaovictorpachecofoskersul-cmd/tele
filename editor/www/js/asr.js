// Orquestra a legenda automática: corta o áudio em pedaços de até ~28 s em pontos de silêncio,
// manda para o worker e junta as palavras com o tempo certo.
// Tem vigia: se o reconhecimento parar de responder, reinicia em modo seguro (1 linha de processamento).
let worker = null, workerThreads = 0;
let seq = 0;
const pending = new Map();
let listeners = { download: null, stage: null };

export const ASR_MODELS = [
  { id: 'relampago', name: 'Relâmpago (40 MB)', speed: 0.35 },
  { id: 'rapida', name: 'Rápida (100 MB)', speed: 0.9 },
  { id: 'precisa', name: 'Precisa (250 MB, mais lenta)', speed: 3 },
];

function killWorker() {
  if (worker) { try { worker.terminate(); } catch (e) { } }
  worker = null;
  for (const p of pending.values()) p.rej(new Error('reiniciado'));
  pending.clear();
}

function getWorker(threads) {
  if (worker && workerThreads === threads) return worker;
  killWorker();
  worker = new Worker(new URL('./asr-worker.js', import.meta.url), { type: 'module' });
  workerThreads = threads;
  worker.onmessage = e => {
    const m = e.data;
    if (m.type === 'download') { listeners.download && listeners.download(m.loaded, m.total); return; }
    if (m.type === 'stage') { listeners.stage && listeners.stage(m.stage); return; }
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.type === 'error') p.rej(new Error(m.msg)); else p.res(m);
  };
  worker.onerror = e => { const err = new Error(e.message || 'falha no reconhecimento de voz'); for (const p of pending.values()) p.rej(err); pending.clear(); };
  worker.postMessage({ type: 'config', id: ++seq, threads });
  return worker;
}

function call(msg, transfer, timeoutMs) {
  const id = ++seq;
  return new Promise((res, rej) => {
    let to = null;
    pending.set(id, {
      res: v => { clearTimeout(to); res(v); },
      rej: e => { clearTimeout(to); rej(e); },
    });
    if (timeoutMs) to = setTimeout(() => { pending.delete(id); rej(new Error('TIMEOUT')); }, timeoutMs);
    worker.postMessage({ ...msg, id }, transfer || []);
  });
}

let cancelled = false;
export function cancelTranscription() { cancelled = true; killWorker(); }

const HALLU = /(amara\.org|legendas pela comunidade|legendado por|inscreva-se no canal|obrigado por assistir|tradução e legendas|subtitles by)/i;

// trechos com voz (a partir do envelope em dB a cada 20 ms), limitados às faixas pedidas
function voiced(env, total, ranges, floor) {
  const thr = floor + 7, F = 0.02;
  const segs = [];
  for (const [ra, rb] of ranges) {
    let start = null, quiet = 0;
    const k0 = Math.max(0, Math.floor(ra / F)), k1 = Math.min(env.length, Math.ceil(rb / F));
    for (let k = k0; k < k1; k++) {
      const on = (env[k] ?? -200) > thr;
      if (on) { if (start == null) start = k; quiet = 0; }
      else if (start != null && ++quiet > 30) { segs.push([start * F, (k - quiet + 1) * F]); start = null; quiet = 0; }
    }
    if (start != null) segs.push([start * F, Math.min(rb, k1 * F)]);
  }
  // folga de 0,25 s em cada lado e junta trechos muito próximos
  const out = [];
  for (const [x, y] of segs) {
    const a = Math.max(0, x - 0.25), b = Math.min(total, y + 0.25);
    if (out.length && a - out[out.length - 1][1] < 0.4) out[out.length - 1][1] = Math.max(out[out.length - 1][1], b);
    else out.push([a, b]);
  }
  return out.filter(([x, y]) => y - x > 0.2);
}

// Monta pedaços de até ~28 s só com fala (as pausas longas ficam de fora: o Whisper trabalha menos)
function packChunks(segs, maxLen = 28) {
  const chunks = [];
  let cur = null;
  const push = () => { if (cur && cur.parts.length) chunks.push(cur); cur = null; };
  for (let [a, b] of segs) {
    while (b - a > 0.01) {
      if (!cur) cur = { parts: [], len: 0 };
      const room = maxLen - cur.len;
      if (room < 1.5) { push(); continue; }
      const take = Math.min(b - a, room);
      cur.parts.push({ src: a, at: cur.len, len: take });
      cur.len += take + 0.15;           // pequena pausa entre trechos colados
      a += take;
      if (cur.len >= maxLen - 0.5) push();
    }
  }
  push();
  return chunks;
}

// mono: Float32Array 16 kHz ; env: dB a cada 20 ms ; ranges: [[a, b]] em segundos (o que está em uso no projeto)
export async function transcribe(mono, env, { model = 'rapida', ranges = null, onProgress, onDownload, onStage, onWords } = {}) {
  cancelled = false;
  listeners = { download: onDownload, stage: onStage };
  const SR = 16000, total = mono.length / SR;
  const sorted = Array.from(env).sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)] ?? -80;
  const segs = voiced(env, total, ranges && ranges.length ? ranges : [[0, total]], floor);
  const chunks = packChunks(segs);
  if (!chunks.length) return [];

  const info = ASR_MODELS.find(m => m.id === model) || ASR_MODELS[0];
  let threads = 4;
  // placa de vídeo do celular (WebGPU) quando existir e não tiver falhado antes
  let device = 'wasm';
  try { if ('gpu' in navigator && navigator.gpu && localStorage.getItem('ed.nogpu') !== '1' && (await navigator.gpu.requestAdapter())) device = 'webgpu'; } catch (e) { }
  getWorker(threads);
  onStage && onStage('loading');
  try { await call({ type: 'load', model, device }, null, 0); }
  catch (e) {
    if (device !== 'webgpu' || cancelled) throw e;
    try { localStorage.setItem('ed.nogpu', '1'); } catch (x) { }
    device = 'wasm'; getWorker(threads); await call({ type: 'load', model, device }, null, 0);
  }
  if (cancelled) throw new Error('cancelado');
  onStage && onStage(device === 'webgpu' ? 'gpu' : 'cpu');

  let secPerAudioSec = device === 'webgpu' ? info.speed * 0.35 : info.speed;
  const n = chunks.length;
  const words = [];
  for (let i = 0; i < n; i++) {
    const ch = chunks[i];
    const piece = new Float32Array(Math.ceil(ch.len * SR) + 10);
    for (const pt of ch.parts) piece.set(mono.subarray(Math.floor(pt.src * SR), Math.floor((pt.src + pt.len) * SR)), Math.floor(pt.at * SR));
    const est = Math.max(3, 30 * secPerAudioSec);
    let r = null;
    for (let attempt = 0; attempt < 3 && !r; attempt++) {
      const t0 = performance.now();
      const tick = setInterval(() => {
        const el = (performance.now() - t0) / 1000;
        onProgress && onProgress((i + Math.min(0.95, el / est)) / n, i + 1, n, Math.max(0, est - el) + est * (n - i - 1));
      }, 500);
      try {
        r = await call({ type: 'chunk', audio: piece, model, device, lang: 'portuguese' }, null, Math.max(240000, est * 8000));
        secPerAudioSec = Math.max(0.05, ((performance.now() - t0) / 1000) / 30);
        // resultado estranho na placa de vídeo (sem tempos): volta para o processador
        if (device === 'webgpu' && r.words.length && r.words.some(w => !(w.s >= 0) || w.s > ch.len + 2)) throw new Error('GPU_BAD');
      } catch (e) {
        r = null;
        if (cancelled) throw new Error('cancelado');
        if (device === 'webgpu') {
          try { localStorage.setItem('ed.nogpu', '1'); } catch (x) { }
          device = 'wasm'; onStage && onStage('cpu');
          getWorker(threads); await call({ type: 'load', model, device }, null, 0);
          continue;
        }
        if (e.message !== 'TIMEOUT' && e.message !== 'reiniciado' && attempt >= 1) throw e;
        if (attempt >= 1) throw new Error('O reconhecimento de voz parou de responder. Tente o modo Relâmpago ou um vídeo mais curto.');
        threads = 1;
        onStage && onStage('safe');
        getWorker(threads);
        await call({ type: 'load', model, device }, null, 0);
      } finally { clearInterval(tick); }
    }
    if (cancelled) throw new Error('cancelado');
    if (HALLU.test(r.text || '')) r.words = r.words.filter(w => !HALLU.test(w.w));
    // tempo no pedaço colado -> tempo real na mídia
    const toSrc = t => {
      let best = ch.parts[0];
      for (const pt of ch.parts) if (t >= pt.at - 0.08) best = pt;
      return best.src + Math.max(0, Math.min(best.len, t - best.at));
    };
    const fresh = [];
    for (const w of r.words) {
      let s = toSrc(w.s), e = toSrc(w.e ?? w.s + 0.3);
      if (!(e > s)) e = s + 0.25;
      const k0 = Math.floor(s / 0.02), k1 = Math.ceil(e / 0.02);
      let mx = -200; for (let k = k0 - 3; k <= k1 + 3; k++) mx = Math.max(mx, env[k] ?? -200);
      if (mx < floor + 4) continue;
      fresh.push({ w: w.w, s: +s.toFixed(3), e: +e.toFixed(3) });
    }
    words.push(...fresh);
    onWords && onWords(words.slice().sort((x, y) => x.s - y.s));
    onProgress && onProgress((i + 1) / n, i + 1, n, secPerAudioSec * 30 * (n - i - 1));
  }
  words.sort((x, y) => x.s - y.s);
  for (let i = 1; i < words.length; i++) if (words[i].s < words[i - 1].e) words[i - 1].e = Math.max(words[i - 1].s + 0.05, words[i].s);
  return words;
}
