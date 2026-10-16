// Marcadores do karaokê: o elemento que pula de palavra em palavra (estrela, coração, fogo, imagem própria...).
// Todos desenhados como vetor (não dependem de fonte de emoji).
import { cssFont } from './fonts.js';

export const MARKERS = [
  { id: 'star', name: 'Estrela' }, { id: 'heart', name: 'Coração' }, { id: 'fire', name: 'Fogo' },
  { id: 'arrow', name: 'Seta' }, { id: 'circle', name: 'Círculo' }, { id: 'bolt', name: 'Raio' },
  { id: 'pin', name: 'Pin' }, { id: 'number', name: 'Número / texto' }, { id: 'flag', name: 'Bandeira BR' },
  { id: 'dot', name: 'Bolinha' }, { id: 'image', name: 'Minha imagem' },
];

export const MARKER_POS = [
  { id: 'acima', name: 'Acima' }, { id: 'abaixo', name: 'Abaixo' }, { id: 'esquerda', name: 'Esquerda' },
  { id: 'direita', name: 'Direita' }, { id: 'atras', name: 'Atrás (destaque)' }, { id: 'centro', name: 'No centro' },
];

const cl = x => Math.max(0, Math.min(1, x));
const eout = x => 1 - Math.pow(1 - cl(x), 3);

export function defaultMarker() {
  return { on: false, type: 'star', color: '#EB1E28', size: 1, pos: 'acima', dx: 0, dy: 0, rot: 0, spin: false, arc: 0.6, dur: 0.18, pulse: true, trail: false, squash: true, text: '13', mid: null, strongType: '', strongColor: '#FFDE00' };
}

// desenha o marcador centrado em (0,0) com "raio" r
export function shape(ctx, type, r, color, extra = {}) {
  ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = r * 0.16; ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (type) {
    case 'heart':
      ctx.moveTo(0, r * 0.85);
      ctx.bezierCurveTo(-r * 1.6, -r * 0.2, -r * 0.7, -r * 1.35, 0, -r * 0.5);
      ctx.bezierCurveTo(r * 0.7, -r * 1.35, r * 1.6, -r * 0.2, 0, r * 0.85);
      break;
    case 'fire': {
      ctx.moveTo(0, -r * 1.1);
      ctx.bezierCurveTo(r * 0.5, -r * 0.5, r * 0.95, -r * 0.1, r * 0.75, r * 0.45);
      ctx.bezierCurveTo(r * 0.6, r * 0.95, -r * 0.6, r * 0.95, -r * 0.75, r * 0.45);
      ctx.bezierCurveTo(-r * 0.9, 0, -r * 0.4, -r * 0.2, -r * 0.25, -r * 0.6);
      ctx.bezierCurveTo(-r * 0.05, -r * 0.3, 0, -r * 0.6, 0, -r * 1.1);
      ctx.closePath(); ctx.stroke();
      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0, '#FFE066'); g.addColorStop(0.5, '#FF8A00'); g.addColorStop(1, color);
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.bezierCurveTo(r * 0.35, r * 0.1, r * 0.35, r * 0.6, 0, r * 0.65); ctx.bezierCurveTo(-r * 0.35, r * 0.6, -r * 0.35, r * 0.15, 0, -r * 0.2);
      ctx.fillStyle = '#FFF3B0'; ctx.fill();
      return;
    }
    case 'arrow':
      ctx.moveTo(-r * 0.35, -r); ctx.lineTo(r * 0.35, -r); ctx.lineTo(r * 0.35, 0); ctx.lineTo(r * 0.8, 0);
      ctx.lineTo(0, r); ctx.lineTo(-r * 0.8, 0); ctx.lineTo(-r * 0.35, 0); ctx.closePath();
      break;
    case 'circle':
      ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.lineWidth = r * 0.28; ctx.strokeStyle = color; ctx.stroke(); return;
    case 'dot':
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); break;
    case 'bolt':
      ctx.moveTo(r * 0.2, -r * 1.1); ctx.lineTo(-r * 0.65, r * 0.15); ctx.lineTo(-r * 0.05, r * 0.15); ctx.lineTo(-r * 0.25, r * 1.1);
      ctx.lineTo(r * 0.7, -r * 0.2); ctx.lineTo(r * 0.08, -r * 0.2); ctx.closePath();
      break;
    case 'pin':
      ctx.moveTo(0, r * 1.1); ctx.bezierCurveTo(-r * 0.4, r * 0.4, -r * 0.85, 0, -r * 0.85, -r * 0.35);
      ctx.arc(0, -r * 0.35, r * 0.85, Math.PI, 0); ctx.bezierCurveTo(r * 0.85, 0, r * 0.4, r * 0.4, 0, r * 1.1); ctx.closePath();
      ctx.stroke(); ctx.fill(); ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(0, -r * 0.35, r * 0.32, 0, Math.PI * 2); ctx.fill(); return;
    case 'number': {
      ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
      const s = String(extra.text || '13');
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let fs = r * 1.15; ctx.font = cssFont('Poppins', fs, 900);
      while (ctx.measureText(s).width > r * 1.6 && fs > 6) { fs *= 0.9; ctx.font = cssFont('Poppins', fs, 900); }
      ctx.fillText(s, 0, fs * 0.05); return;
    }
    case 'flag':
      ctx.rect(-r * 1.2, -r * 0.84, r * 2.4, r * 1.68); ctx.fillStyle = '#009C3B'; ctx.stroke(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -r * 0.7); ctx.lineTo(r * 1.05, 0); ctx.lineTo(0, r * 0.7); ctx.lineTo(-r * 1.05, 0); ctx.closePath(); ctx.fillStyle = '#FFDF00'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2); ctx.fillStyle = '#002776'; ctx.fill(); return;
    default: // estrela de 5 pontas (10 vértices, raio interno 0,42)
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 === 0 ? r : r * 0.42;
        ctx.lineTo(rr * Math.cos(a), rr * Math.sin(a));
      }
      ctx.closePath();
  }
  ctx.stroke(); ctx.fill();
}

// Desenha o marcador indo da palavra anterior (A) para a atual (B).
// A e B: {x, y, w, h} do centro de cada palavra; lt = tempo desde o início da palavra B; t = tempo absoluto
export function drawMarker(ctx, m, A, B, lt, t, fontSize, opts = {}) {
  const type = opts.type || m.type || 'star';
  const color = opts.color || m.color || '#EB1E28';
  const base = fontSize * 0.3 * (m.size || 1);
  const off = (pt) => {
    const p = m.pos || 'acima';
    if (p === 'acima') return [pt.x, pt.y - fontSize * 0.85];
    if (p === 'abaixo') return [pt.x, pt.y + fontSize * 0.85];
    if (p === 'esquerda') return [pt.x - pt.w / 2 - base * 1.4, pt.y];
    if (p === 'direita') return [pt.x + pt.w / 2 + base * 1.4, pt.y];
    return [pt.x, pt.y];
  };
  const [xa, ya] = off(A || B), [xb, yb] = off(B);
  const dur = m.dur || 0.18;
  const p = lt / dur, q = eout(p);
  const arc = (m.arc ?? 0.6) * fontSize;
  let x = xa + (xb - xa) * q, y = ya + (yb - ya) * q - (p < 1 ? arc * 4 * q * (1 - q) : 0);
  x += (m.dx || 0) * fontSize; y += (m.dy || 0) * fontSize;
  let s = p < 1 ? 1 + 0.25 * (1 - cl(p * 3)) : (m.pulse !== false ? 1 + 0.12 * Math.sin(t * 12) : 1);
  let sx = s, sy = s;
  if (m.squash !== false) { const k = Math.max(0, 1 - Math.abs(p - 1) * 8); sx *= 1 + 0.2 * k; sy *= 1 - 0.2 * k; }
  const rot = ((m.rot || 0) * Math.PI / 180) + (m.spin ? t * 6 : 0);
  const behind = m.pos === 'atras';
  const r = behind ? Math.max(B.w, B.h) * 0.62 * (m.size || 1) : base;
  const one = (xx, yy, alpha) => {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(xx, yy); ctx.rotate(rot); ctx.scale(sx, sy);
    if (type === 'image' && opts.image) {
      const img = opts.image, ww = r * 2.2, hh = ww * img.height / img.width;
      ctx.drawImage(img, -ww / 2, -hh / 2, ww, hh);
    } else shape(ctx, type === 'image' ? 'star' : type, r, color, { text: m.text });
    ctx.restore();
  };
  if (m.trail && p < 1) for (let i = 3; i >= 1; i--) {
    const qq = eout(Math.max(0, p - i * 0.12));
    one(xa + (xb - xa) * qq, ya + (yb - ya) * qq - arc * 4 * qq * (1 - qq), 0.18 * (4 - i));
  }
  one(x, y, behind ? 0.85 : 1);
}
