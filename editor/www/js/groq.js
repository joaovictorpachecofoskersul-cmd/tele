// Legenda rápida pela internet (Groq, Whisper large-v3-turbo). A chave fica só neste celular.
// O áudio vai em pedaços de até 5 min (16 kHz mono). No app Android o envio é feito pelo próprio Android.
const URL_API = 'https://api.groq.com/openai/v1/audio/transcriptions';

export function groqKey() { try { return (localStorage.getItem('ed.groqKey') || '').trim(); } catch (e) { return ''; } }
export function setGroqKey(k) { try { localStorage.setItem('ed.groqKey', (k || '').trim()); } catch (e) { } }
// chave embutida no app (vem do build) ou colada pela pessoa
export function groqBuiltin() { try { return !!(window.Android && window.Android.hasGroq && window.Android.hasGroq() === '1'); } catch (e) { return false; } }
export function groqAvailable() { return !!groqKey() || groqBuiltin(); }
export function groqOn() { try { return groqAvailable() && localStorage.getItem('ed.groqOff') !== '1'; } catch (e) { return false; } }
export function setGroqOn(v) { try { localStorage.setItem('ed.groqOff', v ? '0' : '1'); } catch (e) { } }

// WAV 16 bits mono
function wav(samples, sr) {
  const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  return new Blob([buf], { type: 'audio/wav' });
}

// Opus em WebM (8x menor que WAV: envia mais rápido). Se o aparelho não tiver, usa WAV.
async function opus(samples, sr) {
  try {
    const MB = await import('../vendor/mediabunny.min.mjs');
    if (!(await MB.canEncodeAudio('opus', { numberOfChannels: 1, sampleRate: 48000 }))) return null;
    const out = new MB.Output({ format: new MB.WebMOutputFormat(), target: new MB.BufferTarget() });
    const src = new MB.AudioBufferSource({ codec: 'opus', bitrate: 32000 });
    out.addAudioTrack(src);
    await out.start();
    // reamostra 16k -> 48k (o Opus trabalha em 48 kHz)
    const k = 3, step = 48000;
    const up = new Float32Array(samples.length * k);
    for (let i = 0; i < up.length; i++) { const x = i / k, j = Math.floor(x), f = x - j; up[i] = (samples[j] || 0) * (1 - f) + (samples[j + 1] || 0) * f; }
    for (let o = 0; o < up.length; o += step) {
      const n = Math.min(step, up.length - o);
      const ab = new AudioBuffer({ length: n, numberOfChannels: 1, sampleRate: 48000 });
      ab.copyToChannel(up.subarray(o, o + n), 0);
      await src.add(ab);
    }
    src.close && src.close();
    await out.finalize();
    return new Blob([out.target.buffer], { type: 'audio/webm' });
  } catch (e) { return null; }
}

const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });

// envio pelo Android (sem restrição de navegador); resposta chega por window.__httpDone
let seq = 0;
const waiting = new Map();
window.__httpDone = (id, status, body) => { const p = waiting.get(id); if (p) { waiting.delete(id); p({ status, body }); } };
async function postAndroid(fileBlob, fileName, fields, key) {
  const A = window.Android;
  const name = 'up-' + Date.now() + '-' + fileName;
  const CH = 512 * 1024;
  if (A.begin(name) !== 'ok') throw new Error('não consegui preparar o envio');
  for (let o = 0; o < fileBlob.size; o += CH) { const r = A.chunk(name, await b64(fileBlob.slice(o, o + CH))); if (r !== 'ok') throw new Error(r); }
  const id = 'h' + (++seq);
  const done = new Promise(res => waiting.set(id, res));
  const r = A.httpUpload(id, URL_API, key ? 'Bearer ' + key : '', name, fileName, fileBlob.type, JSON.stringify(fields));
  if (r !== 'ok') { waiting.delete(id); throw new Error(r); }
  const to = new Promise((_, rej) => setTimeout(() => { waiting.delete(id); rej(new Error('a internet demorou demais')); }, 180000));
  return Promise.race([done, to]);
}
async function postFetch(fileBlob, fileName, fields, key) {
  const fd = new FormData();
  fd.append('file', fileBlob, fileName);
  for (const [k, v] of Object.entries(fields)) { if (Array.isArray(v)) v.forEach(x => fd.append(k, x)); else fd.append(k, v); }
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 180000);
  try {
    const r = await fetch(URL_API, { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd, signal: ctl.signal });
    return { status: r.status, body: await r.text() };
  } finally { clearTimeout(to); }
}

function explain(status, body) {
  let msg = '';
  try { msg = JSON.parse(body).error.message || ''; } catch (e) { msg = String(body || '').slice(0, 200); }
  if (status === 401) return 'chave da Groq inválida. Confira a chave em Legendas.';
  if (status === 429) return 'limite grátis da Groq atingido por agora.';
  if (status === 413) return 'pedaço de áudio grande demais.';
  if (status === 0 || status === -1) return 'sem conexão com a Groq. ' + msg;
  return `a Groq respondeu ${status}. ${msg}`;
}

// junta a pontuação do texto das frases nas palavras (o Groq devolve as palavras sem pontuação)
function punctuate(words, segments) {
  const norm = s => String(s).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  for (const sg of segments || []) {
    const toks = String(sg.text || '').trim().split(/\s+/).filter(Boolean);
    const ws = words.filter(w => w.s >= sg.start - 0.05 && w.s < sg.end + 0.05 && !w._p);
    let j = 0;
    for (const w of ws) {
      for (let k = j; k < Math.min(toks.length, j + 3); k++) if (norm(toks[k]) === norm(w.w)) { w.w = toks[k]; w._p = 1; j = k + 1; break; }
    }
  }
  for (const w of words) delete w._p;
  return words;
}

async function sendPiece(samples, sr, key, lang) {
  let file = await opus(samples, sr), name = 'audio.webm';
  if (!file) { file = wav(samples, sr); name = 'audio.wav'; }
  const fields = { model: 'whisper-large-v3-turbo', language: lang || 'pt', response_format: 'verbose_json', temperature: '0', 'timestamp_granularities[]': ['word', 'segment'] };
  let r;
  if (window.Android && window.Android.httpUpload) r = await postAndroid(file, name, fields, key);
  else {
    if (!key) throw new Error('sem chave da Groq');
    try { r = await postFetch(file, name, fields, key); } catch (e) { throw new Error('sem conexão com a Groq (' + e.message + ')'); }
  }
  if (r.status !== 200) throw new Error(explain(r.status, r.body));
  const j = JSON.parse(r.body);
  const words = (j.words || []).map(w => ({ w: String(w.word || '').trim(), s: +w.start, e: +w.end })).filter(w => w.w && isFinite(w.s));
  return punctuate(words, j.segments);
}

// mono: Float32Array 16 kHz; ranges: [[a,b]] em segundos. Devolve [{w,s,e}] no tempo da mídia.
export async function transcribeGroq(mono, ranges, { onProgress, onWords, lang = 'pt' } = {}) {
  const key = groqKey();
  if (!key && !groqBuiltin()) throw new Error('sem chave da Groq');
  const SR = 16000, MAX = 300;
  // divide as faixas em pedaços de até 5 min
  const pieces = [];
  for (const [a0, b0] of ranges) for (let a = a0; a < b0 - 0.3; a += MAX) pieces.push([a, Math.min(b0, a + MAX)]);
  const all = [];
  for (let i = 0; i < pieces.length; i++) {
    const [a, b] = pieces[i];
    onProgress && onProgress(i / pieces.length, i + 1, pieces.length);
    const seg = mono.subarray(Math.floor(a * SR), Math.min(mono.length, Math.floor(b * SR)));
    let peak = 0; for (let j = 0; j < seg.length; j += 64) peak = Math.max(peak, Math.abs(seg[j]));
    if (peak < 0.003) continue;
    const ws = await sendPiece(seg, SR, key, lang);
    for (const w of ws) all.push({ w: w.w, s: +(a + w.s).toFixed(3), e: +(a + Math.max(w.e, w.s + 0.05)).toFixed(3) });
    onWords && onWords(all.slice());
    onProgress && onProgress((i + 1) / pieces.length, i + 1, pieces.length);
  }
  return all.sort((x, y) => x.s - y.s);
}

// testa a chave com 1 s de silêncio
export async function testGroq() {
  const s = new Float32Array(16000 * 1.2);
  for (let i = 0; i < s.length; i++) s[i] = Math.sin(i / 16000 * 2 * Math.PI * 220) * 0.05;
  await sendPiece(s, 16000, groqKey(), 'pt');
  return true;
}
