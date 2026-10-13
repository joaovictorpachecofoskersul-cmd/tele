// Worker da legenda automática (Whisper com tempo por palavra), roda no próprio celular.
import { pipeline, env } from '../vendor/transformers.min.js';

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = {
  mjs: new URL('../vendor/ort/ort-wasm-simd-threaded.asyncify.mjs', import.meta.url).href,
  wasm: new URL('../vendor/ort/ort-wasm-simd-threaded.asyncify.wasm', import.meta.url).href,
};

// rapida: Whisper base (~100 MB) ; precisa: Whisper small (~250 MB)
export const MODELS = {
  rapida: { id: 'Xenova/whisper-base', revision: 'output_attentions' },
  precisa: { id: 'onnx-community/whisper-small_timestamped', revision: 'main' },
};

let asr = null, loadedKey = null, configured = false;

function configure(threads) {
  if (configured) return;
  const max = self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1;
  env.backends.onnx.wasm.numThreads = Math.max(1, Math.min(threads || max, max));
  configured = true;
}

async function load(key) {
  if (asr && loadedKey === key) return asr;
  const m = MODELS[key] || MODELS.rapida;
  const files = {};
  let announced = false;
  asr = await pipeline('automatic-speech-recognition', m.id, {
    revision: m.revision,
    device: 'wasm',
    dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    progress_callback: p => {
      if (p.status === 'progress' && p.file) {
        files[p.file] = { loaded: p.loaded || 0, total: p.total || 0 };
        let l = 0, t = 0; for (const f of Object.values(files)) { l += f.loaded; t += f.total; }
        postMessage({ type: 'download', loaded: l, total: t });
      }
      if (p.status === 'done' && !announced && Object.values(files).every(f => f.loaded >= f.total)) {
        announced = true;
        postMessage({ type: 'stage', stage: 'preparing' });
      }
    },
  });
  loadedKey = key;
  return asr;
}

onmessage = async e => {
  const m = e.data;
  try {
    if (m.type === 'config') { configure(m.threads); postMessage({ type: 'config', id: m.id, threads: env.backends.onnx.wasm.numThreads, isolated: !!self.crossOriginIsolated }); return; }
    configure();
    if (m.type === 'load') { postMessage({ type: 'stage', stage: 'loading' }); await load(m.model); postMessage({ type: 'ready', id: m.id }); return; }
    if (m.type === 'chunk') {
      const a = await load(m.model);
      postMessage({ type: 'stage', stage: 'running' });
      const out = await a(m.audio, { language: m.lang || 'portuguese', task: 'transcribe', return_timestamps: 'word' });
      const words = (out.chunks || []).map(c => ({ w: String(c.text || '').trim(), s: c.timestamp[0], e: c.timestamp[1] }))
        .filter(w => w.w);
      postMessage({ type: 'chunk', id: m.id, words, text: out.text });
    }
  } catch (err) {
    postMessage({ type: 'error', id: m.id, msg: String((err && err.message) || err) });
  }
};
