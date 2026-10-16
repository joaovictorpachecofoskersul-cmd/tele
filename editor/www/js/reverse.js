// Vídeo de trás para frente: gera uma cópia do trecho invertida (imagem e som).
// Lê o trecho em pedaços de 1 s do fim para o começo e grava os quadros na ordem contrária.
import * as MB from '../vendor/mediabunny.min.mjs';

export async function reverseRange(blob, a, b, m, onProgress = () => { }, ctl = {}) {
  const input = new MB.Input({ formats: MB.ALL_FORMATS, source: new MB.BlobSource(blob) });
  const vt = await input.getPrimaryVideoTrack();
  if (!vt || !(await vt.canDecode())) throw new Error('não consigo ler este vídeo');
  const W0 = vt.displayWidth, H0 = vt.displayHeight;
  const k = Math.min(1, 1280 / Math.max(W0, H0));
  const W = Math.round(W0 * k / 2) * 2, H = Math.round(H0 * k / 2) * 2;
  const vcodec = await MB.getFirstEncodableVideoCodec(['avc', 'vp9', 'vp8'], { width: W, height: H });
  if (!vcodec) throw new Error('sem codificador de vídeo');
  const mp4 = vcodec === 'avc';
  const at = await input.getPrimaryAudioTrack();
  const acodec = at && (await at.canDecode()) ? await MB.getFirstEncodableAudioCodec(mp4 ? ['aac', 'opus'] : ['opus', 'vorbis'], { numberOfChannels: 2, sampleRate: 48000 }) : null;
  const output = new MB.Output({ format: mp4 ? new MB.Mp4OutputFormat({ fastStart: 'in-memory' }) : new MB.WebMOutputFormat(), target: new MB.BufferTarget() });
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const vs = new MB.CanvasSource(canvas, { codec: vcodec, bitrate: 6e6, keyFrameInterval: 0.5 });
  output.addVideoTrack(vs, { frameRate: 30 });
  let as = null;
  if (acodec) { as = new MB.AudioBufferSource({ codec: acodec, bitrate: 160e3 }); output.addAudioTrack(as); }
  await output.start();

  // som: decodifica o trecho inteiro e inverte
  if (as) {
    const sink = new MB.AudioBufferSink(at);
    const parts = [];
    for await (const w of sink.buffers(a, b)) parts.push(w);
    const sr = parts.length ? parts[0].buffer.sampleRate : 48000;
    const n = Math.max(1, Math.round((b - a) * sr));
    const L = new Float32Array(n), R = new Float32Array(n);
    for (const w of parts) {
      const buf = w.buffer, o = Math.round((w.timestamp - a) * sr);
      const l = buf.getChannelData(0), r = buf.numberOfChannels > 1 ? buf.getChannelData(1) : l;
      for (let i = 0; i < buf.length; i++) { const j = o + i; if (j >= 0 && j < n) { L[j] = l[i]; R[j] = r[i]; } }
    }
    L.reverse(); R.reverse();
    const step = sr;
    for (let o = 0; o < n; o += step) {
      const len = Math.min(step, n - o);
      const ab = new AudioBuffer({ length: len, numberOfChannels: 2, sampleRate: sr });
      ab.copyToChannel(L.subarray(o, o + len), 0); ab.copyToChannel(R.subarray(o, o + len), 1);
      await as.add(ab);
    }
    as.close && as.close();
  }

  // imagem: pedaços de 1 s do fim para o começo, cada pedaço gravado ao contrário
  const sink = new MB.VideoSampleSink(vt);
  const dur = b - a, fps = 30;
  let outT = 0;
  for (let end = b; end > a + 1e-3; end -= 1) {
    if (ctl.stop) { try { await output.cancel(); } catch (e) { } throw new Error('cancelado'); }
    const start = Math.max(a, end - 1);
    const frames = [];
    for await (const sm of sink.samples(start, end)) {
      if (sm.timestamp >= start - 1e-3 && sm.timestamp < end) {
        const bmp = document.createElement('canvas'); bmp.width = W; bmp.height = H;
        sm.drawWithFit(bmp.getContext('2d'), { fit: 'fill' });
        frames.push({ ts: sm.timestamp, c: bmp });
      }
      sm.close();
    }
    // reamostra em 30 qps, do fim para o começo do pedaço
    const n = Math.max(1, Math.round((end - start) * fps));
    for (let i = 0; i < n; i++) {
      const want = end - (i + 0.5) / fps;
      let best = frames[0];
      for (const f of frames) if (f.ts <= want + 1e-3) best = f;
      if (best) { ctx.drawImage(best.c, 0, 0); }
      await vs.add(outT, 1 / fps);
      outT += 1 / fps;
    }
    onProgress(Math.min(0.99, (b - end + 1) / dur));
  }
  vs.close && vs.close();
  await output.finalize();
  return new Blob([output.target.buffer], { type: mp4 ? 'video/mp4' : 'video/webm' });
}
