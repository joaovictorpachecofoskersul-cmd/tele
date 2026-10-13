// Orquestra a legenda automática: corta o áudio em pedaços de até ~28 s em pontos de silêncio,
// manda para o worker e junta as palavras com o tempo certo.
// Tem vigia: se o reconhecimento parar de responder, reinicia em modo seguro (1 linha de processamento).
let worker = null, workerThreads = 0;
let seq = 0;
const pending = new Map();
let listeners = { download: null, stage: null };

export const ASR_MODELS = [
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

// mono: Float32Array 16 kHz ; env: dB a cada 20 ms
export async function transcribe(mono, env, { model = 'rapida', onProgress, onDownload, onStage } = {}) {
  cancelled = false;
  listeners = { download: onDownload, stage: onStage };
  const SR = 16000, total = mono.length / SR;
  // pontos de corte em momentos de silêncio
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

  const info = ASR_MODELS.find(m => m.id === model) || ASR_MODELS[0];
  let threads = 4;
  getWorker(threads);
  // 1) baixa e prepara o modelo (sem limite de tempo no download; limite generoso na preparação)
  onStage && onStage('loading');
  await call({ type: 'load', model }, null, 0);
  if (cancelled) throw new Error('cancelado');

  // 2) transcreve pedaço por pedaço, com estimativa de tempo e vigia
  let secPerAudioSec = info.speed;         // estimativa inicial (é recalculada no primeiro pedaço)
  const nChunks = cuts.length - 1;
  const words = [];
  for (let i = 0; i < nChunks; i++) {
    const a = Math.floor(cuts[i] * SR), b = Math.floor(cuts[i + 1] * SR);
    const piece = mono.slice(a, b);
    let peak = 0; for (let j = 0; j < piece.length; j += 64) peak = Math.max(peak, Math.abs(piece[j]));
    if (peak < 0.003) { onProgress && onProgress((i + 1) / nChunks, i + 1, nChunks, 0); continue; }
    // o Whisper processa sempre 30 s; a estimativa usa 30 s por pedaço
    const est = Math.max(4, 30 * secPerAudioSec);
    let r = null;
    for (let attempt = 0; attempt < 2 && !r; attempt++) {
      const t0 = performance.now();
      const tick = setInterval(() => {
        const el = (performance.now() - t0) / 1000;
        onProgress && onProgress((i + Math.min(0.95, el / est)) / nChunks, i + 1, nChunks, Math.max(0, est - el) + est * (nChunks - i - 1));
      }, 500);
      try {
        // vigia: se passar muito do esperado, reinicia em modo seguro
        r = await call({ type: 'chunk', audio: piece.slice(), model, lang: 'portuguese' }, null, Math.max(240000, est * 8000));
        secPerAudioSec = Math.max(0.2, ((performance.now() - t0) / 1000) / 30);
      } catch (e) {
        if (cancelled) throw new Error('cancelado');
        if (e.message !== 'TIMEOUT' && e.message !== 'reiniciado' && attempt === 1) throw e;
        if (attempt === 1) throw new Error('O reconhecimento de voz parou de responder. Tente o modo Rápido ou um vídeo mais curto.');
        // modo seguro
        threads = 1;
        onStage && onStage('safe');
        getWorker(threads);
        await call({ type: 'load', model }, null, 0);
      } finally { clearInterval(tick); }
    }
    if (cancelled) throw new Error('cancelado');
    if (HALLU.test(r.text || '')) r.words = r.words.filter(w => !HALLU.test(w.w));
    for (const w of r.words) {
      let s = cuts[i] + w.s, e = cuts[i] + (w.e ?? w.s + 0.3);
      if (!(e > s)) e = s + 0.25;
      // descarta palavra "fantasma" em silêncio total
      const k0 = Math.floor(s / 0.02), k1 = Math.ceil(e / 0.02);
      let mx = -200; for (let k = k0 - 3; k <= k1 + 3; k++) mx = Math.max(mx, env[k] ?? -200);
      if (mx < floor + 4) continue;
      words.push({ w: w.w, s: +s.toFixed(3), e: +e.toFixed(3) });
    }
    onProgress && onProgress((i + 1) / nChunks, i + 1, nChunks, secPerAudioSec * 30 * (nChunks - i - 1));
  }
  words.sort((x, y) => x.s - y.s);
  for (let i = 1; i < words.length; i++) if (words[i].s < words[i - 1].e) words[i - 1].e = Math.max(words[i - 1].s + 0.05, words[i].s);
  return words;
}
