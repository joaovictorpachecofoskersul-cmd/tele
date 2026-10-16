// Elementos de atenção e retenção: pílula "segue o perfil", manchete, etiqueta de nome com seta,
// texto piscando, moldura pulsando, dinheiro caindo e as marcas do "rebobinar".
import { cssFont } from './fonts.js';
import { roundRect, ctaPill, eback, eout, eio, money, star } from './cartelas.js';

const cl = x => Math.max(0, Math.min(1, x));
const RED = '#EB1E28', YEL = '#FFDE00';

function fit(ctx, s, size, maxw, weight = 900) {
  let sz = size; ctx.font = cssFont('Poppins', sz, weight);
  while (ctx.measureText(s).width > maxw && sz > 10) { sz *= 0.94; ctx.font = cssFont('Poppins', sz, weight); }
  return sz;
}

export const RETENCAO_DRAW = {
  r_cta(ctx, it, t, W, H) {
    const q = it.p, U = Math.min(W, H);
    const lt = t - it.start;
    const b = cl((it.start + it.dur - t) / 0.25);
    ctx.save(); ctx.globalAlpha = b;
    const box = ctaPill(ctx, q.x * W, q.y * H, U, lt, q.text || 'SEGUE O PERFIL', q.color || RED, q.sub || '');
    ctx.restore();
    return box;
  },

  r_headline(ctx, it, t, W, H) {
    const q = it.p, U = Math.min(W, H), lt = t - it.start;
    const a = eback(lt / 0.35), b = cl((it.start + it.dur - t) / 0.25);
    const bw = Math.min(W * 0.92, U * 0.95), pad = U * 0.03;
    const tagS = U * 0.026, l1S = U * 0.05, l2S = U * 0.056;
    const lines = [];
    if (q.tag) lines.push(['tag', String(q.tag).toLocaleUpperCase('pt-BR'), tagS]);
    if (q.l1) lines.push(['l1', String(q.l1).toLocaleUpperCase('pt-BR'), l1S]);
    if (q.l2) lines.push(['l2', String(q.l2).toLocaleUpperCase('pt-BR'), l2S]);
    if (!lines.length) return null;
    const hgt = lines.reduce((s, l) => s + l[2] * (l[0] === 'tag' ? 1.9 : 1.3), 0) + pad * 1.4;
    const x = q.x * W - bw / 2, y = q.y * H;
    ctx.save(); ctx.globalAlpha = b * cl(lt / 0.12);
    ctx.translate(q.x * W, y + hgt / 2); ctx.scale(0.85 + 0.15 * a, 0.85 + 0.15 * a); ctx.translate(-q.x * W, -(y + hgt / 2));
    ctx.fillStyle = `rgba(0,0,0,${q.alpha ?? 0.8})`; roundRect(ctx, x, y, bw, hgt, U * 0.028); ctx.fill();
    let yy = y + pad * 0.7;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [k, s, size] of lines) {
      if (k === 'tag') {
        const sz = fit(ctx, s, size, bw - pad * 3, 800);
        const tw = ctx.measureText(s).width + sz * 1.2, th = sz * 1.6;
        ctx.fillStyle = q.tagColor || RED; roundRect(ctx, q.x * W - tw / 2, yy, tw, th, th * 0.25); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(s, q.x * W, yy + th / 2 + sz * 0.04);
        yy += size * 1.9;
      } else {
        const sz = fit(ctx, s, size, bw - pad * 2, 900);
        ctx.fillStyle = k === 'l1' ? '#FFFFFF' : (q.color2 || YEL);
        ctx.fillText(s, q.x * W, yy + size * 0.65);
        yy += size * 1.3;
      }
    }
    ctx.restore();
    return { x, y, w: bw, h: hgt };
  },

  r_nametag(ctx, it, t, W, H) {
    const q = it.p, U = Math.min(W, H), lt = t - it.start;
    const a = eback(lt / 0.35), b = cl((it.start + it.dur - t) / 0.25);
    const s = String(q.name || '').toLocaleUpperCase('pt-BR');
    const fs = fit(ctx, s, U * 0.045, W * 0.8, 900);
    const tw = ctx.measureText(s).width + fs * 1.2, th = fs * 1.7;
    const cx = q.x * W, cy = q.y * H;
    const up = q.dir === 'cima';
    ctx.save(); ctx.globalAlpha = b * cl(lt / 0.1);
    ctx.translate(cx, cy); ctx.scale(0.3 + 0.7 * a, 0.3 + 0.7 * a);
    ctx.fillStyle = q.bg || YEL; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = U * 0.004;
    roundRect(ctx, -tw / 2, -th / 2, tw, th, th * 0.18); ctx.fill(); ctx.stroke();
    // triângulo apontando para a pessoa
    const tri = th * 0.45;
    ctx.beginPath();
    if (up) { ctx.moveTo(-tri * 0.6, -th / 2); ctx.lineTo(0, -th / 2 - tri); ctx.lineTo(tri * 0.6, -th / 2); }
    else { ctx.moveTo(-tri * 0.6, th / 2); ctx.lineTo(0, th / 2 + tri); ctx.lineTo(tri * 0.6, th / 2); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = q.color || '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, fs * 0.05);
    ctx.restore();
    return { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th };
  },

  r_blink(ctx, it, t, W, H) {
    const q = it.p, U = Math.min(W, H), lt = t - it.start;
    const on = Math.floor(lt * (q.hz || 3)) % 2 === 0;
    const s = String(q.text || '').toLocaleUpperCase('pt-BR');
    const fs = fit(ctx, s, U * (q.size || 0.05), W * 0.86, 900);
    const tw = ctx.measureText(s).width + fs * 1, th = fs * 1.6;
    const cx = q.x * W, cy = q.y * H;
    if (!on) return { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th };
    ctx.save();
    if (q.bg) { ctx.fillStyle = q.bg; roundRect(ctx, cx - tw / 2, cy - th / 2, tw, th, th * 0.2); ctx.fill(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (!q.bg) { ctx.lineWidth = fs * 0.16; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(s, cx, cy); }
    ctx.fillStyle = q.color || '#fff'; ctx.fillText(s, cx, cy + fs * 0.04);
    ctx.restore();
    return { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th };
  },

  r_frame(ctx, it, t, W, H) {
    const q = it.p, U = Math.min(W, H), lt = t - it.start;
    const pulse = 0.5 + 0.5 * Math.sin(lt * 9);
    if (q.mode === 'piscar' && Math.floor(lt * 8) % 2 === 1) return null;
    const lw = U * (0.009 + 0.0075 * (q.mode === 'piscar' ? 1 : pulse));
    const ins = q.inset ?? 0.03;
    const x = W * ins, y = H * (q.top ?? ins), w = W * (1 - ins * 2), h = H * ((q.bottom ?? (1 - ins)) - (q.top ?? ins));
    ctx.save(); ctx.strokeStyle = q.color || RED; ctx.lineWidth = lw; ctx.shadowColor = q.color || RED; ctx.shadowBlur = lw * 1.5;
    roundRect(ctx, x, y, w, h, U * 0.02); ctx.stroke(); ctx.restore();
    return null;
  },

  r_money(ctx, it, t, W, H) {
    const lt = t - it.start, b = cl((it.start + it.dur - t) / 0.4), a = cl(lt / 0.4);
    ctx.save(); ctx.globalAlpha = Math.min(a, b) * 1.6; money(ctx, W, H, lt); ctx.restore();
    return null;
  },
};

// marcas do "rebobinar" (desenhadas por cima do efeito)
export function drawRewindMarks(ctx, it, t, W, H) {
  const U = Math.min(W, H), lt = t - it.start;
  const cx = W / 2, cy = H * 0.42, s = U * 0.07;
  ctx.save();
  ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(lt * 8));
  ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = U * 0.005;
  for (const dx of [-s * 0.55, s * 0.55]) {   // ◀◀ desenhado com polígonos
    ctx.beginPath(); ctx.moveTo(cx + dx + s * 0.5, cy - s * 0.6); ctx.lineTo(cx + dx - s * 0.5, cy); ctx.lineTo(cx + dx + s * 0.5, cy + s * 0.6); ctx.closePath(); ctx.stroke(); ctx.fill();
  }
  const txt = String(it.p.text || 'DO COMEÇO').toLocaleUpperCase('pt-BR');
  ctx.font = cssFont('Poppins', U * 0.05, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = U * 0.009; ctx.lineJoin = 'round'; ctx.strokeStyle = '#000'; ctx.strokeText(txt, cx, cy + s * 1.2); ctx.fillText(txt, cx, cy + s * 1.2);
  ctx.restore();
}

const R = (kind, name, p) => ({ kind, name, group: 'Retenção', p });
export const RETENCAO_ELEMENTS = [
  R('r_cta', 'Pílula "SEGUE O PERFIL"', { text: 'SEGUE O PERFIL', sub: 'E ASSISTE ATÉ O FIM', color: RED, x: .5, y: .82 }),
  R('r_headline', 'Manchete com etiqueta', { tag: 'LOCAL · DATA', l1: 'LINHA BRANCA DA MANCHETE', l2: 'LINHA AMARELA', tagColor: RED, color2: YEL, alpha: .8, x: .5, y: .07 }),
  R('r_nametag', 'Etiqueta de nome com seta', { name: 'NOME DA PESSOA', dir: 'baixo', bg: YEL, color: '#111111', x: .5, y: .3 }),
  R('r_blink', 'Texto piscando (ESPERA O FINAL)', { text: 'ESPERA O FINAL', size: .05, hz: 3, color: '#FFFFFF', bg: RED, x: .5, y: .2 }),
  R('r_blink', 'Loop aberto (1/3)', { text: '1/3', size: .05, hz: 0.0001, color: '#FFFFFF', bg: 'rgba(0,0,0,.7)', x: .88, y: .1 }),
  R('r_frame', 'Moldura vermelha pulsando', { mode: 'pulsar', color: RED, inset: .03 }),
  R('r_frame', 'Moldura piscando', { mode: 'piscar', color: RED, inset: .03 }),
  R('r_money', 'Dinheiro caindo ($)', {}),
];
