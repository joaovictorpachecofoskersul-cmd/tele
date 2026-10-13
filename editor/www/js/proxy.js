// Cópia otimizada para edição (proxy): vídeos 4K, HEVC/HDR ou muito pesados ganham uma versão
// leve (até 1280 px, quadro-chave a cada 0,5 s) usada só na prévia. A exportação usa sempre o original.
import * as MB from '../vendor/mediabunny.min.mjs';

const LONG = 1280;

export async function needsProxy(blob, m) {
  if (m.kind !== 'video') return false;
  const long = Math.max(m.w || 0, m.h || 0);
  if (long > 1920) return true;
  const mbps = m.dur ? (blob.size * 8 / m.dur) / 1e6 : 0;
  if (mbps > 18) return true;
  try {
    const input = new MB.Input({ formats: MB.ALL_FORMATS, source: new MB.BlobSource(blob) });
    const vt = await input.getPrimaryVideoTrack();
    const codec = vt && (vt.getCodec ? await vt.getCodec() : vt.codec);
    if (codec === 'hevc' || codec === 'av1') return true;
    if (vt && vt.computePacketStats) {
      const st = await vt.computePacketStats(90);
      if (st && st.averagePacketRate > 40) return true;     // 60 fps
    }
  } catch (e) { /* sem informação: não otimiza */ }
  return false;
}

export async function makeProxy(blob, m, onProgress, ctl = {}) {
  const input = new MB.Input({ formats: MB.ALL_FORMATS, source: new MB.BlobSource(blob) });
  const portrait = (m.h || 0) >= (m.w || 0);
  const vcodec = await MB.getFirstEncodableVideoCodec(['avc', 'vp9', 'vp8'], { width: portrait ? 720 : LONG, height: portrait ? LONG : 720 });
  if (!vcodec) throw new Error('sem codificador');
  const mp4 = vcodec === 'avc';
  const acodec = await MB.getFirstEncodableAudioCodec(mp4 ? ['aac', 'opus'] : ['opus', 'vorbis']);
  const output = new MB.Output({
    format: mp4 ? new MB.Mp4OutputFormat({ fastStart: 'in-memory' }) : new MB.WebMOutputFormat(),
    target: new MB.BufferTarget(),
  });
  const long = Math.max(m.w || LONG, m.h || LONG);
  const size = Math.min(LONG, long);
  const conv = await MB.Conversion.init({
    input, output,
    video: {
      ...(portrait ? { height: size } : { width: size }),
      allowRotationMetadata: false,
      codec: vcodec, bitrate: 2.5e6, frameRate: 30, keyFrameInterval: 0.5, forceTranscode: true,
    },
    audio: acodec ? { codec: acodec, bitrate: 128e3 } : { discard: true },
  });
  if (!conv.isValid) throw new Error('não foi possível converter');
  ctl.cancel = () => conv.cancel();
  conv.onProgress = k => onProgress && onProgress(k);
  await conv.execute();
  return new Blob([output.target.buffer], { type: mp4 ? 'video/mp4' : 'video/webm' });
}
