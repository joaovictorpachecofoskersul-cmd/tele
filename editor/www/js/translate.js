// Tradução da legenda: traduz frase por frase e guarda por trecho (dá para corrigir depois).
export const LANGS = [
  { id: 'en', name: 'Inglês', steps: [{ name: 'inglês', models: ['Xenova/opus-mt-ROMANCE-en', 'Xenova/opus-mt-mul-en'] }] },
  { id: 'es', name: 'Espanhol', steps: [{ name: 'inglês', models: ['Xenova/opus-mt-ROMANCE-en', 'Xenova/opus-mt-mul-en'] }, { name: 'espanhol', models: ['Xenova/opus-mt-en-es'] }] },
  { id: 'fr', name: 'Francês', steps: [{ name: 'inglês', models: ['Xenova/opus-mt-ROMANCE-en', 'Xenova/opus-mt-mul-en'] }, { name: 'francês', models: ['Xenova/opus-mt-en-fr'] }] },
];

let worker = null, seq = 0;
export function translateTexts(texts, lang, onProgress = () => { }, onDownload = () => { }) {
  const L = LANGS.find(x => x.id === lang);
  if (!L) return Promise.reject(new Error('idioma não disponível'));
  if (!worker) worker = new Worker(new URL('./translate-worker.js', import.meta.url), { type: 'module' });
  const id = ++seq;
  return new Promise((res, rej) => {
    worker.onmessage = e => {
      const m = e.data;
      if (m.type === 'download') onDownload(m.loaded, m.total);
      else if (m.type === 'progress') onProgress(m.k, m.step);
      else if (m.id === id) { if (m.type === 'done') res(m.texts); else rej(new Error(m.msg)); }
    };
    worker.onerror = e => rej(new Error(e.message || 'falha na tradução'));
    worker.postMessage({ id, texts, steps: L.steps });
  });
}
