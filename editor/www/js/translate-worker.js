// Worker de tradução da legenda (Marian/OPUS-MT, roda no celular depois de baixar o modelo).
import { pipeline, env } from '../vendor/transformers.min.js';

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = {
  mjs: new URL('../vendor/ort/ort-wasm-simd-threaded.asyncify.mjs', import.meta.url).href,
  wasm: new URL('../vendor/ort/ort-wasm-simd-threaded.asyncify.wasm', import.meta.url).href,
};
env.backends.onnx.wasm.numThreads = 1;

const cache = new Map();
async function load(ids) {
  let last = null;
  for (const id of ids) {
    if (cache.has(id)) return cache.get(id);
    try {
      const files = {};
      const p = await pipeline('translation', id, {
        dtype: 'q8', device: 'wasm',
        progress_callback: e => {
          if (e.status === 'progress' && e.file) {
            files[e.file] = { l: e.loaded || 0, t: e.total || 0 };
            let l = 0, t = 0; for (const f of Object.values(files)) { l += f.l; t += f.t; }
            postMessage({ type: 'download', loaded: l, total: t });
          }
        },
      });
      cache.set(id, p);
      return p;
    } catch (e) { last = e; }
  }
  throw last || new Error('modelo indisponível');
}

onmessage = async e => {
  const m = e.data;
  try {
    // passos: lista de etapas; cada etapa tem modelos alternativos e um prefixo opcional (ex.: ">>spa<<")
    let texts = m.texts;
    for (const step of m.steps) {
      const tr = await load(step.models);
      const out = [];
      for (let i = 0; i < texts.length; i++) {
        const src = (step.prefix || '') + texts[i];
        const r = texts[i].trim() ? await tr(src, { max_new_tokens: 200 }) : [{ translation_text: '' }];
        out.push((r[0] && r[0].translation_text) || '');
        postMessage({ type: 'progress', k: (i + 1) / texts.length, step: step.name });
      }
      texts = out;
    }
    postMessage({ type: 'done', id: m.id, texts });
  } catch (err) {
    postMessage({ type: 'error', id: m.id, msg: String(err && err.message || err) });
  }
};
