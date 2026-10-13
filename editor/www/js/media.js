// Importação de mídia: leitura de informações, miniaturas e decodificação de áudio.
import * as MB from '../vendor/mediabunny.min.mjs';
import { resample, envelope, SR } from './audio.js';

export function kindOf(file) {
  const t = (file.type || '').toLowerCase(), n = (file.name || '').toLowerCase();
  if (t.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|bmp)$/.test(n)) return 'image';
  if (t.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|opus|flac)$/.test(n)) return 'audio';
  return 'video';
}

function once(el, ev, ms = 15000) {
  return new Promise((res, rej) => {
    const to = setTimeout(() => { cleanup(); rej(new Error('tempo esgotado')); }, ms);
    const ok = () => { cleanup(); res(); };
    const bad = () => { cleanup(); rej(new Error('não consegui abrir o arquivo')); };
    function cleanup() { clearTimeout(to); el.removeEventListener(ev, ok); el.removeEventListener('error', bad); }
    el.addEventListener(ev, ok); el.addEventListener('error', bad);
  });
}

export async function probe(file, url) {
  const kind = kindOf(file);
  if (kind === 'image') {
    const bmp = await createImageBitmap(file);
    const r = { kind, dur: 3, w: bmp.width, h: bmp.height, hasAudio: false };
    bmp.close && bmp.close();
    return r;
  }
  const el = document.createElement(kind === 'audio' ? 'audio' : 'video');
  el.preload = 'metadata'; el.muted = true; el.src = url;
  if (kind === 'video') el.playsInline = true;
  await once(el, 'loadedmetadata');
  let dur = el.duration;
  if (!isFinite(dur)) {
    // alguns arquivos (webm gravado) não informam a duração: pede o fim
    el.currentTime = 1e9; await once(el, 'seeked').catch(() => null); dur = el.duration;
  }
  let hasAudio = kind === 'audio';
  let dur2 = null;
  try {
    const input = new MB.Input({ formats: MB.ALL_FORMATS, source: new MB.BlobSource(file) });
    hasAudio = !!(await input.getPrimaryAudioTrack());
    dur2 = await input.computeDuration();
  } catch (e) { if (kind === 'video') hasAudio = true; }
  if (!isFinite(dur) || !dur) dur = dur2 || 0;
  const r = { kind, dur, w: el.videoWidth || 0, h: el.videoHeight || 0, hasAudio };
  el.removeAttribute('src'); el.load();
  return r;
}

// Miniaturas para a linha do tempo
export async function thumbnails(url, dur, n = 12, w = 72) {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  await once(v, 'loadeddata', 20000);
  const h = Math.round(w * (v.videoHeight / v.videoWidth || 16 / 9));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = Math.min(dur - 0.05, (i + 0.5) * dur / n);
    try {
      v.currentTime = Math.max(0, t);
      await once(v, 'seeked', 8000);
      x.drawImage(v, 0, 0, w, h);
      out.push(c.toDataURL('image/jpeg', 0.6));
    } catch (e) { out.push(out[out.length - 1] || ''); }
  }
  v.removeAttribute('src'); v.load();
  return { list: out, w, h };
}

export async function imageThumb(file, w = 72) {
  const bmp = await createImageBitmap(file);
  const h = Math.round(w * bmp.height / bmp.width);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close && bmp.close();
  return { list: [c.toDataURL('image/jpeg', 0.7)], w, h };
}

async function audioTrackOf(blob) {
  const input = new MB.Input({ formats: MB.ALL_FORMATS, source: new MB.BlobSource(blob) });
  const at = await input.getPrimaryAudioTrack();
  if (!at || !(await at.canDecode())) return null;
  return at;
}

// Fallback: decodifica o arquivo inteiro pelo navegador
async function decodeWhole(blob) {
  const ac = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, 48000, 48000);
  const ab = await blob.arrayBuffer();
  return await ac.decodeAudioData(ab);
}

// Áudio mono 16 kHz (para legenda automática) + envelope de volume
export async function decodeMono16k(blob, dur, onProgress) {
  const out = new Float32Array(Math.ceil((dur + 1) * 16000));
  let wrote = false;
  try {
    const at = await audioTrackOf(blob);
    if (at) {
      const sink = new MB.AudioBufferSink(at);
      for await (const wb of sink.buffers()) {
        const b = wb.buffer, n = b.length, ch = b.numberOfChannels;
        const mono = new Float32Array(n);
        for (let c = 0; c < ch; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / ch; }
        const r = resample(mono, b.sampleRate, 16000);
        const o = Math.round(wb.timestamp * 16000);
        if (o >= 0) out.set(r.subarray(0, Math.max(0, Math.min(r.length, out.length - o))), o);
        wrote = true;
        if (onProgress && dur) onProgress(Math.min(1, wb.timestamp / dur));
      }
    }
  } catch (e) { wrote = false; }
  if (!wrote) {
    const b = await decodeWhole(blob);
    const n = b.length, ch = b.numberOfChannels, mono = new Float32Array(n);
    for (let c = 0; c < ch; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / ch; }
    const r = resample(mono, b.sampleRate, 16000);
    out.set(r.subarray(0, Math.min(r.length, out.length)));
  }
  return out;
}

export function envFrom16k(mono) { return envelope(mono, 16000, 0.02); }

// Trecho de áudio em 48 kHz estéreo (para exportar)
export async function decodeRange(blob, start, end) {
  const len = Math.max(1, Math.ceil((end - start) * SR));
  const L = new Float32Array(len), R = new Float32Array(len);
  try {
    const at = await audioTrackOf(blob);
    if (at) {
      const sink = new MB.AudioBufferSink(at);
      for await (const wb of sink.buffers(Math.max(0, start - 0.1), end + 0.1)) {
        const b = wb.buffer;
        const l = resample(b.getChannelData(0), b.sampleRate, SR);
        const r = b.numberOfChannels > 1 ? resample(b.getChannelData(1), b.sampleRate, SR) : l;
        const o = Math.round((wb.timestamp - start) * SR);
        for (let i = 0; i < l.length; i++) { const j = o + i; if (j >= 0 && j < len) { L[j] = l[i]; R[j] = r[i]; } }
      }
      return [L, R];
    }
  } catch (e) { /* tenta o método do navegador */ }
  const b = await decodeWhole(blob);
  const l = resample(b.getChannelData(0), b.sampleRate, SR);
  const r = b.numberOfChannels > 1 ? resample(b.getChannelData(1), b.sampleRate, SR) : l;
  const o = Math.round(start * SR);
  for (let i = 0; i < len; i++) { L[i] = l[o + i] || 0; R[i] = r[o + i] || 0; }
  return [L, R];
}
