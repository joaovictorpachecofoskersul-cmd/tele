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

// Efeitos de voz (filtros simples): melhorar voz, rádio, telefone, voz grave, megafone, eco
class BQ {
  constructor(type, f, q, sr, gain = 0) {
    const w = 2 * Math.PI * f / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), A = Math.pow(10, gain / 40);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
    else if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
    else { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; }   // peak
    this.b = [b0 / a0, b1 / a0, b2 / a0]; this.a = [a1 / a0, a2 / a0]; this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  run(x) { const y = this.b[0] * x + this.b[1] * this.x1 + this.b[2] * this.x2 - this.a[0] * this.y1 - this.a[1] * this.y2; this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y; }
}
export const VOICE_FX = [
  { id: '', name: 'Nenhum' }, { id: 'melhorar', name: 'Melhorar voz' }, { id: 'radio', name: 'Rádio' }, { id: 'telefone', name: 'Telefone' },
  { id: 'grave', name: 'Voz encorpada' }, { id: 'megafone', name: 'Megafone' }, { id: 'eco', name: 'Eco' }, { id: 'sala', name: 'Sala (reverb)' },
];
export function voiceFx(x, type, sr = 48000) {
  if (!type) return x;
  const chain = {
    melhorar: [new BQ('hp', 85, 0.7, sr), new BQ('peak', 220, 1, sr, -2), new BQ('peak', 3200, 0.9, sr, 4), new BQ('peak', 9000, 0.8, sr, 2)],
    radio: [new BQ('hp', 400, 0.8, sr), new BQ('lp', 4500, 0.8, sr), new BQ('peak', 1500, 1, sr, 5)],
    telefone: [new BQ('hp', 500, 0.9, sr), new BQ('lp', 3000, 0.9, sr), new BQ('hp', 500, 0.9, sr), new BQ('lp', 3000, 0.9, sr)],
    grave: [new BQ('peak', 140, 0.8, sr, 6), new BQ('peak', 3000, 1, sr, 2)],
    megafone: [new BQ('hp', 700, 1, sr), new BQ('lp', 3500, 1, sr), new BQ('peak', 1800, 2, sr, 8)],
    eco: [], sala: [],
  }[type] || [];
  for (let i = 0; i < x.length; i++) { let v = x[i]; for (const f of chain) v = f.run(v); x[i] = v; }
  if (type === 'megafone' || type === 'radio') for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * 2.2) / 1.6;
  if (type === 'melhorar') {
    // compressor suave: voz mais presente e uniforme
    let env = 0; const at = Math.exp(-1 / (0.005 * sr)), rl = Math.exp(-1 / (0.15 * sr));
    for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); env = a > env ? at * env + (1 - at) * a : rl * env + (1 - rl) * a; const g = env > 0.12 ? Math.pow(0.12 / env, 0.5) : 1; x[i] *= g * 1.6; }
  }
  if (type === 'eco') { const d = Math.round(0.28 * sr); for (let i = d; i < x.length; i++) x[i] += x[i - d] * 0.4; }
  if (type === 'sala') {
    const taps = [0.031, 0.047, 0.061, 0.083, 0.097, 0.113].map(t => Math.round(t * sr));
    const y = Float32Array.from(x);
    for (let i = 0; i < x.length; i++) { let v = 0; for (const tp of taps) if (i >= tp) v += y[i - tp]; x[i] = y[i] + v * 0.12; }
    for (let k = 0; k < 2; k++) { const d = Math.round((0.15 + k * 0.07) * sr); for (let i = d; i < x.length; i++) x[i] += x[i - d] * 0.25; }
  }
  return x;
}
