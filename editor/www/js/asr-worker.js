// Worker da legenda automática (Whisper small com tempo por palavra), roda no próprio celular.
import { pipeline, env } from '../vendor/transformers.min.js';

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = {
  mjs: new URL('../vendor/ort/ort-wasm-simd-threaded.asyncify.mjs', import.meta.url).href,
  wasm: new URL('../vendor/ort/ort-wasm-simd-threaded.asyncify.wasm', import.meta.url).href,
};
env.backends.onnx.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1;

const MODEL = 'onnx-community/whisper-small_timestamped';
let asr = null;

async function load() {
  if (asr) return asr;
  const files = {};
  asr = await pipeline('automatic-speech-recognition', MODEL, {
    device: 'wasm',
    dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    progress_callback: p => {
      if (p.status === 'progress' && p.file) {
        files[p.file] = { loaded: p.loaded || 0, total: p.total || 0 };
        let l = 0, t = 0; for (const f of Object.values(files)) { l += f.loaded; t += f.total; }
        postMessage({ type: 'download', loaded: l, total: t });
      }
    },
  });
  return asr;
}

onmessage = async e => {
  const m = e.data;
  try {
    if (m.type === 'load') { await load(); postMessage({ type: 'ready' }); return; }
    if (m.type === 'chunk') {
      const a = await load();
      const out = await a(m.audio, { language: m.lang || 'portuguese', task: 'transcribe', return_timestamps: 'word' });
      const words = (out.chunks || []).map(c => ({ w: String(c.text || '').trim(), s: c.timestamp[0], e: c.timestamp[1] }))
        .filter(w => w.w);
      postMessage({ type: 'chunk', id: m.id, words, text: out.text });
    }
  } catch (err) {
    postMessage({ type: 'error', id: m.id, msg: String((err && err.message) || err) });
  }
};
