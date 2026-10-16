// Leitura de LUT .cube (o padrão de "looks" de cor do Premiere, DaVinci, CapCut).
export function parseCube(text) {
  let n = 0;
  const vals = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const up = line.toUpperCase();
    if (up.startsWith('LUT_3D_SIZE')) { n = parseInt(line.split(/\s+/)[1], 10); continue; }
    if (/^[A-Z_]/.test(up)) continue;               // TITLE, DOMAIN_MIN, LUT_1D... ignorados
    const p = line.split(/\s+/).map(Number);
    if (p.length >= 3 && p.every(x => isFinite(x))) vals.push(p[0], p[1], p[2]);
  }
  if (!n || n < 2 || n > 128) throw new Error('arquivo .cube sem LUT_3D_SIZE válido');
  if (vals.length < n * n * n * 3) throw new Error('LUT incompleta');
  const data = new Uint8Array(n * n * n * 4);
  for (let b = 0; b < n; b++) for (let g = 0; g < n; g++) for (let r = 0; r < n; r++) {
    const i = (r + g * n + b * n * n) * 3, o = (g * n * n + b * n + r) * 4;
    data[o] = Math.round(Math.max(0, Math.min(1, vals[i])) * 255);
    data[o + 1] = Math.round(Math.max(0, Math.min(1, vals[i + 1])) * 255);
    data[o + 2] = Math.round(Math.max(0, Math.min(1, vals[i + 2])) * 255);
    data[o + 3] = 255;
  }
  return { n, data };
}
