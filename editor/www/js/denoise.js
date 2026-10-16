// Redução de ruído da voz (chiado, ventilador, ar-condicionado, vento leve).
// Subtração espectral: mede o ruído de fundo nas partes mais silenciosas e tira essa "camada" de cada frequência.
const N = 2048, HOP = 512;

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

const win = new Float32Array(N);
for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);

// amount 0..1. Altera o canal no lugar.
export function denoiseChannel(x, amount = 0.7, sr = 48000) {
  const n = x.length;
  if (n < N * 4 || amount <= 0) return x;
  const frames = Math.floor((n - N) / HOP) + 1;
  const B = N / 2 + 1;
  // 1) energia por quadro e perfil do ruído (média dos 10% de quadros mais silenciosos, ignorando silêncio absoluto)
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) { let e = 0; const o = f * HOP; for (let i = 0; i < N; i += 4) e += x[o + i] * x[o + i]; energy[f] = e; }
  const order = [...energy.keys()].filter(f => energy[f] > 1e-9).sort((a, b) => energy[a] - energy[b]);
  if (order.length < 8) return x;
  const quiet = order.slice(0, Math.max(4, Math.floor(order.length * 0.1)));
  const noise = new Float32Array(B);
  const re = new Float32Array(N), im = new Float32Array(N);
  for (const f of quiet) {
    const o = f * HOP;
    for (let i = 0; i < N; i++) { re[i] = x[o + i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < B; k++) noise[k] += Math.hypot(re[k], im[k]) / quiet.length;
  }
  // 2) processa com sobreposição; ganho suavizado no tempo para não "borbulhar"
  const out = new Float32Array(n), norm = new Float32Array(n);
  const prevG = new Float32Array(B).fill(1);
  const over = 1 + amount * 1.5, floor = 1 - amount * 0.85;
  const hpBin = Math.ceil(80 / (sr / N));
  for (let f = 0; f < frames; f++) {
    const o = f * HOP;
    for (let i = 0; i < N; i++) { re[i] = x[o + i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < B; k++) {
      const mag = Math.hypot(re[k], im[k]) + 1e-12;
      let g = Math.max(floor, 1 - over * noise[k] / mag);
      if (k < hpBin) g = Math.min(g, floor);
      g = g > prevG[k] ? g * 0.6 + prevG[k] * 0.4 : g * 0.3 + prevG[k] * 0.7;
      prevG[k] = g;
      re[k] *= g; im[k] *= g;
      if (k > 0 && k < N / 2) { re[N - k] = re[k]; im[N - k] = -im[k]; }
    }
    // inversa: FFT do conjugado
    for (let i = 0; i < N; i++) im[i] = -im[i];
    fft(re, im);
    for (let i = 0; i < N; i++) { out[o + i] += (re[i] / N) * win[i]; norm[o + i] += win[i] * win[i]; }
  }
  for (let i = 0; i < n; i++) x[i] = norm[i] > 1e-3 ? out[i] / norm[i] : x[i] * floor;
  return x;
}
