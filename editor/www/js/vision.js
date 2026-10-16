// Visão computacional no próprio aparelho (MediaPipe, sem internet):
// - recorte de pessoa (máscara da pessoa para trocar o fundo)
// - detector de rosto (para o enquadramento automático seguir quem fala)
const base = new URL('../vendor/', import.meta.url).href;

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[data-src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.dataset.src = src; s.crossOrigin = 'anonymous';
    s.onload = () => res(); s.onerror = () => rej(new Error('não consegui carregar ' + src));
    document.head.append(s);
  });
}

// fila: o MediaPipe processa uma imagem por vez
let chain = Promise.resolve();
const queued = fn => { const p = chain.then(fn, fn); chain = p.catch(() => { }); return p; };

let segP = null, segRes = null;
function seg() {
  if (!segP) segP = (async () => {
    await loadScript(base + 'mpseg/selfie_segmentation.js');
    const s = new window.SelfieSegmentation({ locateFile: f => base + 'mpseg/' + f });
    s.setOptions({ modelSelection: 1, selfieMode: false });
    s.onResults(r => { segRes = r; });
    await s.initialize();
    return s;
  })();
  segP.catch(() => { segP = null; });
  return segP;
}

let faceP = null, faceRes = null;
function face() {
  if (!faceP) faceP = (async () => {
    await loadScript(base + 'mpface/face_detection.js');
    const f = new window.FaceDetection({ locateFile: n => base + 'mpface/' + n });
    f.setOptions({ model: 'full', minDetectionConfidence: 0.45, selfieMode: false });
    f.onResults(r => { faceRes = r; });
    await f.initialize();
    return f;
  })();
  faceP.catch(() => { faceP = null; });
  return faceP;
}

// reduz a imagem antes de mandar (o modelo usa 256 px; mandar 4K só gasta tempo)
const small = document.createElement('canvas');
function shrink(source, w, h, max = 512) {
  const k = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(2, Math.round(w * k)), ch = Math.max(2, Math.round(h * k));
  if (small.width !== cw || small.height !== ch) { small.width = cw; small.height = ch; }
  small.getContext('2d').drawImage(source, 0, 0, cw, ch);
  return small;
}

// devolve um canvas com a máscara (vermelho = pessoa) no tamanho da imagem reduzida
export function segment(source, w, h, out) {
  return queued(async () => {
    const s = await seg();
    segRes = null;
    await s.send({ image: shrink(source, w, h) });
    const m = segRes && segRes.segmentationMask;
    if (!m) return null;
    const c = out || document.createElement('canvas');
    if (c.width !== small.width || c.height !== small.height) { c.width = small.width; c.height = small.height; }
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    x.drawImage(m, 0, 0, c.width, c.height);
    // a confiança vem no vermelho: copia para a transparência (serve para recortar no Canvas 2D)
    const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const v = a[i]; a[i + 1] = v; a[i + 2] = v; a[i + 3] = v; }
    x.putImageData(d, 0, 0);
    return c;
  });
}

// rostos: [{x, y, w, h, score}] normalizados (centro), do maior para o menor
export function faces(source, w, h) {
  return queued(async () => {
    const f = await face();
    faceRes = null;
    await f.send({ image: shrink(source, w, h, 640) });
    const d = (faceRes && faceRes.detections) || [];
    return d.map(x => ({ x: x.boundingBox.xCenter, y: x.boundingBox.yCenter, w: x.boundingBox.width, h: x.boundingBox.height }))
      .sort((a, b) => b.w * b.h - a.w * a.h);
  });
}

export async function visionReady(kind) {
  try { await (kind === 'face' ? face() : seg()); return true; } catch (e) { return false; }
}
