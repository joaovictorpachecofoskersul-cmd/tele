// Modelos prontos: aplicam formato, enquadramento, legenda, transições, abertura/final, elementos, filtro e música.
// Itens criados por um modelo ficam marcados (tpl) para que trocar de modelo não acumule coisas.
import { layout, uid, dims, FORMATS } from './project.js';
import { defaultMarker } from './markers.js';

const T = (id, dur = 0.4) => ({ id, dur, text: 'WOW' });

const items = {
  hook: (title, y = .2, color = '#FFE600', font = 'Poppins') => title ? [{ kind: 'text', start: 0, dur: 2.6, p: { text: title, font, size: .085, color, stroke: '#000000', bg: '', x: .5, y, anim: 'pop', upper: true } }] : [],
  progress: (total, pos = 'top', color = '#FFE600') => [{ kind: 'progress', start: 0, dur: total, p: { color, pos } }],
  endCard: (total, title, sub, bg = '#7C3AED', bg2 = '#2E1065', confetti = true, d = 2.4) =>
    total > 5 ? [{ kind: 'card', start: total - d, dur: d, p: { title, sub, bg, bg2, color: '#FFFFFF', confetti, comment: '' } }] : [],
  follow: (total, handle, at) => total > 8 && handle ? [{ kind: 'follow', start: at, dur: 2.6, p: { text: 'SEGUIR', handle, x: .5, y: .8 } }] : [],
};

export const TEMPLATES = [
  {
    id: 'brasileirando', name: 'Brasileirando', desc: 'Gancho de 5 s (manchete, moldura pulsando, "ESPERA O FINAL", pílula SEGUE O PERFIL), rebobinar, legenda karaokê amarela e vermelha, tinta nos cortes e card final DIA 25 É LULA 13.',
    format: '9:16', colors: ['#FFDE00', '#EB1E28'],
    captions: { on: true, style: 'karaoke', maxWords: 3, x: .5, y: .7, size: 1.05, color: '#FFFFFF', active: '#FFDE00', strong: '#EB1E28', font: 'Poppins', upper: true, star: false },
    trans: ['ink', 'zoompunch', 'whipL', 'flash'],
    audio: { beat: { on: false }, sfxAuto: true, duck: true },
    build: (L, o) => {
      const g = Math.min(5, L.total * .4), out = [];
      const [l1, l2] = splitTitle(o.title || 'OLHA O QUE ELE FALOU / E NINGUÉM PERCEBEU');
      out.push({ kind: 'effect', start: 0, dur: .5, p: { fx: 'zoompunch', i: .7 } });
      out.push({ kind: 'r_headline', start: 0, dur: Math.max(g, Math.min(L.total, 8)), p: { tag: o.handle || 'LOCAL · DATA', l1, l2, tagColor: '#EB1E28', color2: '#FFDE00', alpha: .8, x: .5, y: .07 } });
      if (L.total > 6) {
        out.push({ kind: 'r_frame', start: 0, dur: g, p: { mode: 'pulsar', color: '#EB1E28', inset: .02 } });
        out.push({ kind: 'r_blink', start: .3, dur: g - .3, p: { text: 'ESPERA O FINAL', size: .045, hz: 3, color: '#FFFFFF', bg: '#EB1E28', x: .5, y: .24 } });
        out.push({ kind: 'r_cta', start: 0, dur: g, p: { text: 'SEGUE O PERFIL', sub: 'E ASSISTE ATÉ O FIM', color: '#EB1E28', x: .5, y: .84 } });
      }
      if (L.total > 12) out.push({ kind: 'effect', start: g - .6, dur: .6, p: { fx: 'rewind', i: .8, span: Math.max(1, g - .6) } });
      if (o.outro && L.total > 7) out.push({ kind: 'c_final', start: L.total - 3.2, dur: 3.2, p: { bg: 'escuro', fonte: '', speed: 1, l1: 'DIA 25 É', l2: 'LULA 13', cta1: 'COMENTA O QUE ACHOU', cta2: 'SEGUE O PERFIL', pillColor: '#EB1E28' } });
      return out;
    },
  },
  {
    id: 'boralula', name: 'BORA LULA', desc: 'Cabeçalho BORA LULA, legenda palavra por palavra com a estrelinha vermelha pulando, transições agressivas e card final LULA 13 com confete.',
    format: '9:16', colors: ['#EB1E28', '#FFDE00'],
    captions: { on: true, style: 'karaoke', maxWords: 2, x: .5, y: .68, size: 1.15, color: '#FFFFFF', active: '#FFDE00', strong: '#EB1E28', font: 'Anton', upper: true, star: false, marker: { ...defaultMarker(), on: true, type: 'star', color: '#EB1E28' } },
    trans: ['zoompunch', 'glitch', 'whipL', 'shake', 'rgbsplit', 'flash'],
    audio: { beat: { on: true, bpm: 128, vol: .2, style: 'funk' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      { kind: 'pill', start: 0, dur: L.total, p: { text: 'BORA LULA', bg: '#EB1E28', color: '#FFFFFF', x: .5, y: .06, size: .045 } },
      { kind: 'effect', start: 0, dur: .5, p: { fx: 'zoompunch', i: .8 } },
      ...(o.title ? [{ kind: 'text', start: 0, dur: 3, p: { text: o.title, font: 'Anton', size: .09, color: '#FFDE00', stroke: '#000000', bg: '', x: .5, y: .22, anim: 'pop', upper: true } }] : []),
      ...(o.outro && L.total > 6 ? [{ kind: 'card', start: L.total - 3, dur: 3, p: { title: 'LULA 13', sub: '25 DE OUTUBRO · VOTE 13', bg: '#EB1E28', bg2: '#7F0A10', color: '#FFFFFF', confetti: true, comment: 'COMENTA: 13' } }] : []),
    ],
  },
  {
    id: 'forum', name: 'Fórum com Lula (liderança)', desc: 'Para depoimento de liderança: nome e cargo na faixa, legenda limpa sem nada no rosto, cortes suaves e card final do Fórum.',
    format: '9:16', colors: ['#B91C1C', '#FDE68A'],
    captions: { on: true, style: 'karaoke', maxWords: 3, x: .5, y: .78, size: .95, color: '#FFFFFF', active: '#FFDE00', strong: '#EB1E28', font: 'Poppins', upper: true, star: false },
    trans: ['fade', 'dip', 'leak'],
    audio: { beat: { on: true, bpm: 92, vol: .18, style: 'calmo' }, sfxAuto: false, duck: true },
    build: (L, o) => [
      { kind: 'lower', start: .6, dur: Math.min(5, L.total - .6), p: { name: o.handle || 'NOME DA LIDERANÇA', role: o.title || 'Cargo · Entidade', color: '#EB1E28', x: .05, y: .62 } },
      ...(o.outro && L.total > 6 ? [{ kind: 'c_final', start: L.total - 3.2, dur: 3.2, p: { bg: 'escuro', fonte: '', speed: 1, l1: 'FÓRUM', l2: 'COM LULA', cta1: 'EU VOTO NO LULA', cta2: 'SEGUE O PERFIL', pillColor: '#EB1E28' } }] : []),
    ],
  },
  {
    id: 'audioviral', name: 'Áudio viral com cartelas', desc: 'Para áudio sobre fundo escuro ou cenas em preto e branco: gancho "O ÁUDIO QUE ESTÁ VIRANDO VOTOS", "OUVE ATÉ O FIM" piscando, tinta nos cortes e card final. Use "+ cartela" na legenda para as datas.',
    format: '9:16', colors: ['#111111', '#FFDE00'],
    captions: { on: true, style: 'karaoke', maxWords: 3, x: .5, y: .72, size: 1.05, color: '#FFFFFF', active: '#FFDE00', strong: '#EB1E28', font: 'Poppins', upper: true, star: false },
    trans: ['ink', 'dip', 'ink', 'flash'],
    clipFx: [{ id: 'bw', i: .9 }, { id: 'vignette', i: .6 }],
    audio: { beat: { on: false }, sfxAuto: true, duck: true },
    build: (L, o) => {
      const g = Math.min(5, L.total * .45);
      const [l1, l2] = splitTitle(o.title || 'O ÁUDIO QUE ESTÁ / VIRANDO VOTOS');
      return [
        { kind: 'r_headline', start: 0, dur: g, p: { tag: o.handle || 'OUÇA', l1, l2, tagColor: '#EB1E28', color2: '#FFDE00', alpha: .85, x: .5, y: .1 } },
        { kind: 'r_blink', start: .4, dur: g - .4, p: { text: 'OUVE ATÉ O FIM', size: .045, hz: 3, color: '#FFFFFF', bg: '#EB1E28', x: .5, y: .3 } },
        ...(L.total > 6 ? [{ kind: 'r_cta', start: 0, dur: g, p: { text: 'SEGUE O PERFIL', sub: 'E COMPARTILHA', color: '#EB1E28', x: .5, y: .86 } }] : []),
        ...(o.outro && L.total > 7 ? [{ kind: 'c_final', start: L.total - 3.2, dur: 3.2, p: { bg: 'escuro', fonte: '', speed: 1, l1: 'DIA 25 É', l2: 'LULA 13', cta1: 'MANDA PRA 3 PESSOAS', cta2: 'SEGUE O PERFIL', pillColor: '#EB1E28' } }] : []),
      ];
    },
  },
  {
    id: 'carrossel', name: 'Carrossel em vídeo', desc: 'Para fotos e prints em sequência: zoom lento, tinta e mergulho preto nos cortes, som de suspense e fundo desfocado.',
    format: '9:16', fitAll: 'blur', kbAll: true, colors: ['#1F2937', '#EB1E28'],
    captions: { on: true, style: 'karaoke', maxWords: 3, x: .5, y: .8, size: 1, color: '#FFFFFF', active: '#FFDE00', strong: '#EB1E28', font: 'Poppins', upper: true, star: false },
    trans: ['ink', 'dip', 'radialzoom'],
    audio: { beat: { on: true, bpm: 80, vol: .3, style: 'calmo' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      ...(o.title ? [{ kind: 'r_headline', start: 0, dur: Math.min(4, L.total), p: { tag: o.handle || 'VEJA', l1: splitTitle(o.title)[0], l2: splitTitle(o.title)[1], tagColor: '#EB1E28', color2: '#FFDE00', alpha: .8, x: .5, y: .08 } }] : []),
      { kind: 'sfx', start: 0, dur: 1, p: { type: 'riser', vol: .5 } },
    ],
  },
  {
    id: 'tiktok', name: 'TikTok / Reels viral', desc: 'Legenda karaokê grande, cortes com chicote e zoom soco, barra de progresso, batida e final com "siga".',
    format: '9:16', colors: ['#FFE600', '#FF2D55'],
    captions: { on: true, style: 'karaoke', maxWords: 3, x: .5, y: .66, size: 1.1, color: '#FFFFFF', active: '#FFE600', strong: '#FF2B2B', font: 'Poppins', upper: true, star: false },
    trans: ['whipL', 'zoompunch', 'glitch', 'whipR', 'rgbsplit', 'shake'],
    audio: { beat: { on: true, bpm: 126, vol: .22, style: 'funk' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      { kind: 'effect', start: 0, dur: .6, p: { fx: 'zoompunch', i: .7 } },
      ...items.hook(o.title, .2),
      ...items.progress(L.total),
      ...items.follow(L.total, o.handle, Math.max(0, L.total - 5.4)),
      ...(o.outro ? items.endCard(L.total, 'SIGA PARA MAIS', o.handle || 'COMENTA AQUI 👇') : []),
    ],
  },
  {
    id: 'shorts', name: 'YouTube Shorts', desc: 'Uma palavra gigante por vez, zoom soco nos cortes, curtida e sininho no meio.',
    format: '9:16', colors: ['#FF0033', '#FFFFFF'],
    captions: { on: true, style: 'one', maxWords: 1, x: .5, y: .6, size: 1, color: '#FFFFFF', active: '#FFFFFF', strong: '#FF2B2B', font: 'Anton', upper: true, star: false },
    trans: ['zoompunch', 'whipUp', 'flash'],
    audio: { beat: { on: true, bpm: 120, vol: .18, style: 'leve' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      ...(o.title ? [{ kind: 'pill', start: 0, dur: 3, p: { text: o.title, bg: '#FF0033', color: '#FFFFFF', x: .5, y: .1, size: .045 } }] : []),
      ...(L.total > 8 ? [{ kind: 'like', start: L.total * .35, dur: 2.2, p: { x: .82, y: .58, count: '', color: '#FF2D55' } }] : []),
      ...(L.total > 10 ? [{ kind: 'bell', start: L.total * .6, dur: 2.6, p: { text: 'ATIVE AS NOTIFICAÇÕES', x: .5, y: .82 } }] : []),
      ...(o.outro ? items.endCard(L.total, 'INSCREVA-SE', o.handle || '', '#DC2626', '#450A0A') : []),
    ],
  },
  {
    id: 'youtube', name: 'YouTube (deitado)', desc: 'Formato 16:9, abertura com título e vinheta, nome na tela, legenda clássica e tela final.',
    format: '16:9', colors: ['#1E3A8A', '#FFFFFF'],
    captions: { on: true, style: 'classic', maxWords: 6, x: .5, y: .87, size: .8, color: '#FFFFFF', active: '#FFE600', strong: '#FFE600', font: 'Poppins', upper: false, star: false },
    trans: ['fade'],
    audio: { beat: { on: false }, sfxAuto: true, duck: true },
    build: (L, o) => [
      ...(o.intro ? [{ kind: 'card', start: 0, dur: 2.6, p: { title: o.title || 'TÍTULO DO VÍDEO', sub: o.handle || '', bg: '#1E3A8A', bg2: '#0B1437', color: '#FFFFFF', confetti: false, comment: '' } },
        { kind: 'sfx', start: 0, dur: .5, p: { type: 'vinheta', vol: .7 } }] : []),
      ...(o.handle ? [{ kind: 'lower', start: o.intro ? 3 : .6, dur: 4, p: { name: o.handle, role: o.title || '', color: '#FFE600', x: .05, y: .74 } }] : []),
      ...(L.total > 12 ? [{ kind: 'bell', start: L.total * .45, dur: 3, p: { text: 'SE INSCREVA NO CANAL', x: .5, y: .82 } }] : []),
      ...(o.outro ? items.endCard(L.total, 'OBRIGADO POR ASSISTIR', 'SE INSCREVA', '#1E3A8A', '#0B1437', false, 3) : []),
    ],
  },
  {
    id: 'stories', name: 'Stories', desc: 'Legenda em caixa, transições suaves de luz, tom quente, enquete e "arraste para cima".',
    format: '9:16', colors: ['#F97316', '#EC4899'],
    captions: { on: true, style: 'box', maxWords: 3, x: .5, y: .74, size: .95, color: '#FFFFFF', active: '#FFFFFF', strong: '#FF2B2B', font: 'Poppins', upper: true, star: false },
    trans: ['leak', 'zoomin', 'slideUp'],
    clipFx: [{ id: 'warm', i: .35 }],
    audio: { beat: { on: true, bpm: 112, vol: .18, style: 'leve' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      ...(o.title ? [{ kind: 'pill', start: 0, dur: 3, p: { text: o.title, bg: '#FFFFFF', color: '#111111', x: .5, y: .1, size: .045 } }] : []),
      ...(L.total > 9 ? [{ kind: 'poll', start: L.total * .4, dur: 3.2, p: { q: 'O que você acha?', a: 'AMEI', b: 'QUERO MAIS', pa: 64, x: .5, y: .4 } }] : []),
      ...(o.outro && L.total > 5 ? [{ kind: 'swipe', start: L.total - 2.6, dur: 2.6, p: { text: 'ARRASTE PARA CIMA', x: .5, y: .86, color: '#FFFFFF' } }] : []),
    ],
  },
  {
    id: 'podcast', name: 'Podcast / Entrevista', desc: 'Vídeo deitado dentro do vertical com fundo desfocado, faixa de título fixa, nome na tela e legenda.',
    format: '9:16', fitAll: 'blur', colors: ['#111111', '#FFE600'],
    captions: { on: true, style: 'karaoke', maxWords: 4, x: .5, y: .76, size: .9, color: '#FFFFFF', active: '#FFE600', strong: '#FF2B2B', font: 'Poppins', upper: true, star: false },
    trans: ['none'],
    audio: { beat: { on: false }, sfxAuto: false, duck: true },
    build: (L, o) => [
      { kind: 'text', start: 0, dur: L.total, p: { text: o.title || 'PODCAST', font: 'Anton', size: .07, color: '#111111', stroke: '', bg: '#FFE600', x: .5, y: .16, anim: 'none', upper: true, full: true } },
      ...(o.handle ? [{ kind: 'lower', start: 1, dur: 4, p: { name: o.handle, role: 'Convidado', color: '#FFE600', x: .06, y: .64 } }] : []),
      ...items.progress(L.total, 'bottom'),
    ],
  },
  {
    id: 'noticia', name: 'Notícia / Urgente', desc: 'Faixa vermelha de urgente, scanner e flash nos cortes, legenda clássica e trilha de tensão.',
    format: '9:16', colors: ['#DC2626', '#FFFFFF'],
    captions: { on: true, style: 'classic', maxWords: 5, x: .5, y: .78, size: .9, color: '#FFFFFF', active: '#FFE600', strong: '#FFE600', font: 'Poppins', upper: true, star: false },
    trans: ['scanner', 'flash'],
    audio: { beat: { on: true, bpm: 100, vol: .2, style: 'tenso' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      { kind: 'text', start: 0, dur: L.total, p: { text: 'URGENTE', font: 'Anton', size: .07, color: '#FFFFFF', stroke: '', bg: '#DC2626', x: .5, y: .07, anim: 'none', upper: true, full: true } },
      ...(o.title ? [{ kind: 'text', start: .3, dur: 3.5, p: { text: o.title, font: 'Poppins', size: .062, color: '#000000', stroke: '', bg: '#FFE600', x: .5, y: .17, anim: 'slide', upper: true } }] : []),
      ...(o.handle ? [{ kind: 'lower', start: 4, dur: 4, p: { name: o.handle, role: 'Reportagem', color: '#DC2626', x: .06, y: .64 } }] : []),
    ],
  },
  {
    id: 'vlog', name: 'Vlog / Dia a dia', desc: 'Legenda preenchendo em letra normal, luz quente, transições de luz e local/data no começo.',
    format: '9:16', colors: ['#F59E0B', '#FDE68A'],
    captions: { on: true, style: 'fill', maxWords: 4, x: .5, y: .78, size: .85, color: '#FFFFFF', active: '#FDE68A', strong: '#FB923C', font: 'Poppins', upper: false, star: false },
    trans: ['leak', 'zoomin', 'fade', 'whipL'],
    clipFx: [{ id: 'warm', i: .45 }],
    audio: { beat: { on: true, bpm: 100, vol: .22, style: 'calmo' }, sfxAuto: false, duck: true },
    build: (L, o) => [
      { kind: 'text', start: .2, dur: 3, p: { text: '📍 ' + (o.title || 'hoje'), font: 'Poppins', size: .045, color: '#FFFFFF', stroke: '', bg: 'rgba(0,0,0,.55)', x: .5, y: .12, anim: 'fade', upper: false } },
    ],
  },
  {
    id: 'tutorial', name: 'Tutorial / Dica rápida', desc: 'Título em máquina de escrever, etiqueta de passo a passo, legenda clássica e final "salve para não esquecer".',
    format: '9:16', colors: ['#22C55E', '#FFFFFF'],
    captions: { on: true, style: 'classic', maxWords: 5, x: .5, y: .8, size: .9, color: '#FFFFFF', active: '#86EFAC', strong: '#FFE600', font: 'Poppins', upper: false, star: false },
    trans: ['slideLeft'],
    audio: { beat: { on: true, bpm: 112, vol: .2, style: 'animado' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      { kind: 'pill', start: 0, dur: 3.2, p: { text: 'PASSO A PASSO', bg: '#22C55E', color: '#FFFFFF', x: .5, y: .1, size: .045 } },
      ...(o.title ? [{ kind: 'text', start: .3, dur: 3.2, p: { text: o.title, font: 'Courier Prime', size: .06, color: '#FFFFFF', stroke: '', bg: 'rgba(0,0,0,.7)', x: .5, y: .22, anim: 'type', upper: false } }] : []),
      ...items.progress(L.total, 'top', '#22C55E'),
      ...(o.outro ? items.endCard(L.total, 'SALVE PARA NÃO ESQUECER', o.handle || '', '#16A34A', '#052E16', false) : []),
    ],
  },
  {
    id: 'aula', name: 'Minicurso / Aula animada', desc: 'O estilo dos minicursos: verde e amarelo, card de módulo na abertura com vinheta, fundo animado, legenda karaokê e trilha animada.',
    format: '16:9', colors: ['#173B32', '#F0B429'],
    captions: { on: true, style: 'karaoke', maxWords: 5, x: .5, y: .86, size: .9, color: '#FFFFFF', active: '#F0B429', strong: '#F0B429', font: 'Poppins', upper: false, star: false },
    trans: ['fade', 'whipL'],
    audio: { beat: { on: true, bpm: 112, vol: .2, style: 'animado' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      ...(o.intro ? [{ kind: 'module', start: 0, dur: 3, p: { num: 'AULA', title: o.title || 'Título da aula', bg: '#173B32', accent: '#F0B429' } },
        { kind: 'sfx', start: 0, dur: .5, p: { type: 'vinheta', vol: .7 } }] : []),
      { kind: 'floaters', start: 0, dur: L.total, p: { color: '#F0B429', amount: .25 } },
      ...(o.handle ? [{ kind: 'pill', start: o.intro ? 3.2 : .3, dur: 3.5, p: { text: o.handle, bg: '#F0B429', color: '#173B32', x: .5, y: .08, size: .03 } }] : []),
      ...(o.outro ? items.endCard(L.total, 'OBRIGADO!', o.handle || '', '#173B32', '#0B1F1A', false, 3) : []),
    ],
  },
  {
    id: 'venda', name: 'Promoção / Venda', desc: 'Carimbo de oferta, contador de desconto, setas, cores vivas, batida e card final de chamada.',
    format: '9:16', colors: ['#EF4444', '#FFE600'],
    captions: { on: true, style: 'box', maxWords: 3, x: .5, y: .72, size: 1, color: '#FFFFFF', active: '#FFE600', strong: '#FF2B2B', font: 'Poppins', upper: true, star: false },
    trans: ['zoompunch', 'glitch', 'flash'],
    clipFx: [{ id: 'pop', i: .5 }],
    audio: { beat: { on: true, bpm: 128, vol: .25, style: 'funk' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      { kind: 'stamp', start: .6, dur: 1.8, p: { text: 'OFERTA', color: '#EF4444', x: .5, y: .3, size: .14, rot: -12 } },
      ...(L.total > 6 ? [{ kind: 'counter', start: L.total * .3, dur: 2.6, p: { from: 0, to: 50, prefix: '', suffix: '% OFF', decimals: 0, label: '', x: .5, y: .35, size: .16, color: '#FFE600' } }] : []),
      ...(L.total > 8 ? [{ kind: 'arrows', start: L.total - 5, dur: 2.4, p: { x: .5, y: .55, dir: 'baixo', color: '#FFE600' } }] : []),
      ...(o.outro ? items.endCard(L.total, 'PEÇA JÁ', o.handle || 'LINK NA BIO', '#EF4444', '#7F1D1D', true) : []),
    ],
  },
  {
    id: 'cinema', name: 'Cinema / Emocional', desc: 'Faixas de cinema, cor de filme, dissolver e mergulho preto, título elegante e trilha calma.',
    format: '9:16', colors: ['#0F172A', '#FDE68A'],
    captions: { on: true, style: 'fill', maxWords: 4, x: .5, y: .8, size: .75, color: '#FFFFFF', active: '#FDE68A', strong: '#FDE68A', font: 'Montserrat', upper: false, star: false },
    trans: ['fade', 'dip'],
    clipFx: [{ id: 'cinema', i: .7 }],
    audio: { beat: { on: true, bpm: 80, vol: .28, style: 'calmo' }, sfxAuto: false, duck: true },
    build: (L, o) => [
      { kind: 'effect', start: 0, dur: L.total, p: { fx: 'letterbox', i: .55 } },
      ...(o.title ? [{ kind: 'text', start: .4, dur: 3.5, p: { text: o.title, font: 'Montserrat', size: .07, color: '#FFFFFF', stroke: '', bg: '', x: .5, y: .45, anim: 'fade', upper: true } }] : []),
    ],
  },
  {
    id: 'meme', name: 'Meme / Engraçado', desc: 'Uma palavra por vez no meio da tela, zoom soco e tremor nos cortes, emojis e efeitos sonoros.',
    format: '9:16', colors: ['#FACC15', '#111111'],
    captions: { on: true, style: 'one', maxWords: 1, x: .5, y: .5, size: 1.15, color: '#FFFFFF', active: '#FFFFFF', strong: '#FACC15', font: 'Anton', upper: true, star: false },
    trans: ['zoompunch', 'shake', 'glitch'],
    audio: { beat: { on: false }, sfxAuto: true, duck: true },
    build: L => [
      ...(L.total > 4 ? [{ kind: 'emoji', start: L.total * .3, dur: 1.6, p: { text: '😂', x: .78, y: .25, size: .2, anim: 'bounce' } }] : []),
      ...(L.total > 6 ? [{ kind: 'effect', start: L.total * .5, dur: .6, p: { fx: 'shake', i: .9 } }, { kind: 'sfx', start: L.total * .5, dur: .5, p: { type: 'boom', vol: .8 } }] : []),
      ...(L.total > 8 ? [{ kind: 'emoji', start: L.total * .72, dur: 1.6, p: { text: '💀', x: .22, y: .28, size: .2, anim: 'pop' } }] : []),
    ],
  },
  {
    id: 'retro', name: 'Retrô VHS', desc: 'Filtro de fita VHS, chiado nos cortes, legenda neon em fonte de máquina.',
    format: '9:16', colors: ['#22D3EE', '#F472B6'],
    captions: { on: true, style: 'neon', maxWords: 3, x: .5, y: .72, size: .9, color: '#F472B6', active: '#22D3EE', strong: '#FFE600', font: 'Courier Prime', upper: true, star: false },
    trans: ['vhs', 'static'],
    clipFx: [{ id: 'vhs', i: .6 }],
    audio: { beat: { on: true, bpm: 96, vol: .2, style: 'tenso' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      { kind: 'text', start: 0, dur: 2.2, p: { text: 'PLAY ▶', font: 'Courier Prime', size: .055, color: '#FFFFFF', stroke: '', bg: '', x: .2, y: .07, anim: 'blink', upper: true } },
      ...(o.title ? [{ kind: 'text', start: .4, dur: 3, p: { text: o.title, font: 'Courier Prime', size: .065, color: '#22D3EE', stroke: '#000000', bg: '', x: .5, y: .3, anim: 'type', upper: true } }] : []),
    ],
  },
  {
    id: 'feed', name: 'Feed quadrado (1:1)', desc: 'Formato quadrado para o feed, fundo desfocado quando o vídeo não é quadrado, legenda em caixa.',
    format: '1:1', fitAll: 'blur', colors: ['#3B82F6', '#FFFFFF'],
    captions: { on: true, style: 'box', maxWords: 4, x: .5, y: .82, size: .8, color: '#FFFFFF', active: '#FFE600', strong: '#FF2B2B', font: 'Poppins', upper: true, star: false },
    trans: ['fade', 'slideLeft'],
    audio: { beat: { on: false }, sfxAuto: true, duck: true },
    build: L => [...items.progress(L.total, 'bottom', '#3B82F6')],
  },
  {
    id: 'receita', name: 'Receita / Culinária', desc: 'Cor quente, título de ingrediente, lista com checks, transições deslizando e trilha leve.',
    format: '9:16', colors: ['#EA580C', '#FDE68A'],
    captions: { on: true, style: 'box', maxWords: 3, x: .5, y: .76, size: .95, color: '#FFFFFF', active: '#FDE68A', strong: '#FB923C', font: 'Poppins', upper: true, star: false },
    trans: ['slideLeft', 'zoomin', 'whipL'],
    clipFx: [{ id: 'warm', i: .4 }, { id: 'pop', i: .3 }],
    audio: { beat: { on: true, bpm: 108, vol: .2, style: 'animado' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      { kind: 'pill', start: 0, dur: 3, p: { text: o.title || 'RECEITA FÁCIL', bg: '#EA580C', color: '#FFFFFF', x: .5, y: .1, size: .05 } },
      ...(L.total > 8 ? [{ kind: 'checklist', start: 3.2, dur: 3.6, p: { text: 'Ingrediente 1\nIngrediente 2\nIngrediente 3', x: .5, y: .4, size: .05, color: '#FFFFFF', check: '#EA580C', box: 'rgba(0,0,0,.55)' } }] : []),
      ...(o.outro ? items.endCard(L.total, 'SALVE A RECEITA', o.handle || '', '#EA580C', '#7C2D12', false) : []),
    ],
  },
  {
    id: 'fitness', name: 'Treino / Fitness', desc: 'Energia alta: uma palavra por vez, pulsando na batida, zoom soco e tremor nos cortes.',
    format: '9:16', colors: ['#84CC16', '#111111'],
    captions: { on: true, style: 'one', maxWords: 1, x: .5, y: .62, size: 1.1, color: '#FFFFFF', active: '#BEF264', strong: '#BEF264', font: 'Anton', upper: true, star: false },
    trans: ['zoompunch', 'shake', 'flash'],
    clipFx: [{ id: 'pop', i: .5 }],
    audio: { beat: { on: true, bpm: 128, vol: .3, style: 'funk' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      { kind: 'effect', start: 0, dur: L.total, p: { fx: 'pulse', i: .5, bpm: 128 } },
      { kind: 'pill', start: 0, dur: 3, p: { text: o.title || 'TREINO DE HOJE', bg: '#84CC16', color: '#111111', x: .5, y: .1, size: .05 } },
      ...items.progress(L.total, 'top', '#84CC16'),
    ],
  },
  {
    id: 'antesdepois', name: 'Antes e depois', desc: 'Marca "ANTES" no primeiro clipe e "DEPOIS" no último, com papel rasgado na virada.',
    format: '9:16', colors: ['#6B7280', '#22C55E'],
    captions: { on: true, style: 'classic', maxWords: 4, x: .5, y: .8, size: .9, color: '#FFFFFF', active: '#86EFAC', strong: '#FFE600', font: 'Poppins', upper: true, star: false },
    trans: ['tear', 'diag'],
    audio: { beat: { on: true, bpm: 112, vol: .2, style: 'leve' }, sfxAuto: true, duck: true },
    build: (L, o, p) => {
      const n = p.clips.length, out = [];
      if (n) out.push({ kind: 'stamp', start: .2, dur: Math.min(2.5, L.starts[1] ?? L.total), p: { text: 'ANTES', color: '#9CA3AF', x: .5, y: .2, size: .13, rot: -8 } });
      if (n > 1) out.push({ kind: 'stamp', start: L.starts[n - 1] + .2, dur: 2.5, p: { text: 'DEPOIS', color: '#22C55E', x: .5, y: .2, size: .13, rot: -8 } });
      if (o.title) out.push({ kind: 'text', start: 0, dur: 2.5, p: { text: o.title, font: 'Poppins', size: .07, color: '#FFFFFF', stroke: '#000000', bg: '', x: .5, y: .35, anim: 'pop', upper: true } });
      return out;
    },
  },
  {
    id: 'depoimento', name: 'Depoimento', desc: 'Fundo desfocado, nome e cargo na tela, legenda suave e trilha calma. Bom para cliente, paciente ou liderança.',
    format: '9:16', fitAll: 'blur', colors: ['#0EA5E9', '#E0F2FE'],
    captions: { on: true, style: 'fill', maxWords: 4, x: .5, y: .76, size: .9, color: '#FFFFFF', active: '#7DD3FC', strong: '#FDE68A', font: 'Poppins', upper: false, star: false },
    trans: ['fade'],
    audio: { beat: { on: true, bpm: 84, vol: .18, style: 'calmo' }, sfxAuto: false, duck: true },
    build: (L, o) => [
      { kind: 'lower', start: .6, dur: 4.5, p: { name: o.handle || 'Nome da pessoa', role: o.title || 'Depoimento', color: '#0EA5E9', x: .06, y: .66 } },
      { kind: 'text', start: 0, dur: 2.4, p: { text: '“', font: 'Montserrat', size: .22, color: '#7DD3FC', stroke: '', bg: '', x: .2, y: .14, anim: 'fade', upper: false } },
    ],
  },
  {
    id: 'frase', name: 'Frase / Motivacional', desc: 'Preto e branco com vinheta, uma palavra por vez no centro, dissolver e trilha calma.',
    format: '9:16', colors: ['#111111', '#F5F5F5'],
    captions: { on: true, style: 'one', maxWords: 1, x: .5, y: .5, size: 1, color: '#FFFFFF', active: '#FFFFFF', strong: '#FDE68A', font: 'Montserrat', upper: true, star: false },
    trans: ['fade', 'dip'],
    clipFx: [{ id: 'bw', i: .9 }, { id: 'vignette', i: .7 }],
    audio: { beat: { on: true, bpm: 76, vol: .26, style: 'calmo' }, sfxAuto: false, duck: true },
    build: (L, o) => o.title ? [{ kind: 'text', start: .3, dur: 3, p: { text: o.title, font: 'Montserrat', size: .07, color: '#FFFFFF', stroke: '', bg: '', x: .5, y: .3, anim: 'fade', upper: true } }] : [],
  },
  {
    id: 'evento', name: 'Evento / Convite', desc: 'Card de abertura com o nome do evento, etiqueta de data e local, confete e final "te esperamos".',
    format: '9:16', colors: ['#7C3AED', '#F472B6'],
    captions: { on: true, style: 'karaoke', maxWords: 3, x: .5, y: .72, size: 1, color: '#FFFFFF', active: '#F9A8D4', strong: '#FFE600', font: 'Poppins', upper: true, star: false },
    trans: ['leak', 'heart', 'zoomin'],
    audio: { beat: { on: true, bpm: 116, vol: .24, style: 'animado' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      ...(o.intro ? [{ kind: 'card', start: 0, dur: 2.6, p: { title: o.title || 'NOME DO EVENTO', sub: 'VOCÊ É NOSSO CONVIDADO', bg: '#7C3AED', bg2: '#4C1D95', color: '#FFFFFF', confetti: true, comment: '' } }] : []),
      { kind: 'pill', start: o.intro ? 2.8 : .3, dur: 3.5, p: { text: o.handle || 'DATA · LOCAL', bg: '#F472B6', color: '#FFFFFF', x: .5, y: .12, size: .045 } },
      ...(o.outro ? items.endCard(L.total, 'TE ESPERAMOS!', o.handle || '', '#7C3AED', '#2E1065', true) : []),
    ],
  },
  {
    id: 'parabens', name: 'Aniversário / Parabéns', desc: 'Confete, emojis de festa, transição de coração e card final de parabéns.',
    format: '9:16', colors: ['#F59E0B', '#EC4899'],
    captions: { on: true, style: 'karaoke', maxWords: 3, x: .5, y: .72, size: 1, color: '#FFFFFF', active: '#FDE68A', strong: '#F9A8D4', font: 'Poppins', upper: true, star: true },
    trans: ['heart', 'leak', 'iris'],
    audio: { beat: { on: true, bpm: 118, vol: .25, style: 'animado' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      { kind: 'confetti', start: 0, dur: Math.min(3, L.total), p: {} },
      { kind: 'text', start: .2, dur: 3, p: { text: o.title || 'PARABÉNS!', font: 'Anton', size: .12, color: '#FDE68A', stroke: '#000000', bg: '', x: .5, y: .25, anim: 'letters3d', upper: true } },
      ...(L.total > 6 ? [{ kind: 'emoji', start: L.total * .45, dur: 1.8, p: { text: '🎉', x: .8, y: .3, size: .2, anim: 'bounce' } }] : []),
      ...(o.outro ? items.endCard(L.total, 'FELIZ ANIVERSÁRIO', o.handle || '', '#EC4899', '#831843', true) : []),
    ],
  },
  {
    id: 'top', name: 'Lista / Top 5', desc: 'Cada clipe ganha um número grande (#5, #4...) com chicote entre eles. Monte um clipe por item.',
    format: '9:16', colors: ['#FACC15', '#111111'],
    captions: { on: true, style: 'karaoke', maxWords: 3, x: .5, y: .72, size: 1, color: '#FFFFFF', active: '#FACC15', strong: '#FF2B2B', font: 'Poppins', upper: true, star: false },
    trans: ['whipL', 'whipR'],
    audio: { beat: { on: true, bpm: 124, vol: .22, style: 'funk' }, sfxAuto: true, duck: true },
    build: (L, o, p) => {
      const n = p.clips.length, out = [];
      p.clips.forEach((c, i) => {
        const d = Math.min(2.2, (L.starts[i + 1] ?? L.total) - L.starts[i]);
        out.push({ kind: 'text', start: L.starts[i] + .05, dur: d, p: { text: '#' + (n - i), font: 'Anton', size: .2, color: '#FACC15', stroke: '#000000', bg: '', x: .2, y: .14, anim: 'zoom', upper: true } });
      });
      if (o.title) out.push({ kind: 'pill', start: 0, dur: 3, p: { text: o.title, bg: '#FACC15', color: '#111111', x: .6, y: .12, size: .04 } });
      return out;
    },
  },
  {
    id: 'tour', name: 'Tour / Lugar', desc: 'Zoom lento em tudo, transições de luz, local na tela e trilha calma. Para imóvel, viagem ou espaço.',
    format: '9:16', colors: ['#0D9488', '#99F6E4'],
    captions: { on: true, style: 'fill', maxWords: 4, x: .5, y: .8, size: .85, color: '#FFFFFF', active: '#99F6E4', strong: '#FDE68A', font: 'Poppins', upper: false, star: false },
    trans: ['leak', 'zoomin', 'fade'],
    clipFx: [{ id: 'zoomslow', i: .5 }],
    audio: { beat: { on: true, bpm: 90, vol: .25, style: 'calmo' }, sfxAuto: false, duck: true },
    build: (L, o) => [
      { kind: 'lower', start: .5, dur: 4, p: { name: o.title || 'Nome do lugar', role: o.handle || 'Cidade · Estado', color: '#2DD4BF', x: .06, y: .14 } },
    ],
  },
  {
    id: 'produto', name: 'Produto / Novidade', desc: 'Carimbo de "novo", círculo de destaque, setas, cores vivas e chamada final.',
    format: '9:16', colors: ['#2563EB', '#FACC15'],
    captions: { on: true, style: 'box', maxWords: 3, x: .5, y: .74, size: 1, color: '#FFFFFF', active: '#FACC15', strong: '#FF2B2B', font: 'Poppins', upper: true, star: false },
    trans: ['zoompunch', 'rgbsplit', 'whipL'],
    clipFx: [{ id: 'pop', i: .45 }],
    audio: { beat: { on: true, bpm: 124, vol: .24, style: 'funk' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      { kind: 'stamp', start: .5, dur: 1.8, p: { text: 'NOVO', color: '#2563EB', x: .78, y: .14, size: .11, rot: 12 } },
      ...(L.total > 5 ? [{ kind: 'circle', start: L.total * .35, dur: 2.2, p: { x: .5, y: .45, r: .22, color: '#FACC15' } }] : []),
      ...(o.title ? [{ kind: 'text', start: 0, dur: 2.6, p: { text: o.title, font: 'Poppins', size: .08, color: '#FFFFFF', stroke: '#000000', bg: '', x: .5, y: .3, anim: 'pop', upper: true } }] : []),
      ...(o.outro ? items.endCard(L.total, 'GARANTA O SEU', o.handle || 'LINK NA BIO', '#2563EB', '#1E3A8A', true) : []),
    ],
  },
  {
    id: 'vocesabia', name: 'Você sabia? / Educativo', desc: 'Etiqueta "você sabia?", nome da instituição, legenda clássica, trilha animada e final "compartilhe".',
    format: '9:16', colors: ['#173B32', '#F0B429'],
    captions: { on: true, style: 'classic', maxWords: 5, x: .5, y: .78, size: .9, color: '#FFFFFF', active: '#F0B429', strong: '#F0B429', font: 'Poppins', upper: false, star: false },
    trans: ['fade', 'slideLeft'],
    audio: { beat: { on: true, bpm: 110, vol: .2, style: 'animado' }, sfxAuto: true, duck: true },
    build: (L, o) => [
      { kind: 'pill', start: 0, dur: 3.2, p: { text: 'VOCÊ SABIA?', bg: '#F0B429', color: '#173B32', x: .5, y: .1, size: .05 } },
      ...(o.title ? [{ kind: 'text', start: .3, dur: 3.2, p: { text: o.title, font: 'Poppins', size: .07, color: '#FFFFFF', stroke: '', bg: '#173B32', x: .5, y: .2, anim: 'slide', upper: false } }] : []),
      ...(o.handle ? [{ kind: 'lower', start: 3.6, dur: 4, p: { name: o.handle, role: 'Informação de utilidade pública', color: '#F0B429', x: .06, y: .64 } }] : []),
      ...(o.outro ? items.endCard(L.total, 'COMPARTILHE', 'INFORMAÇÃO SALVA VIDAS', '#173B32', '#0B1F1A', false) : []),
    ],
  },
  {
    id: 'reacao', name: 'Reação', desc: 'Zoom soco e emojis de surpresa nos momentos fortes, uma palavra por vez e efeitos sonoros.',
    format: '9:16', colors: ['#F43F5E', '#FDE047'],
    captions: { on: true, style: 'one', maxWords: 1, x: .5, y: .6, size: 1.1, color: '#FFFFFF', active: '#FFFFFF', strong: '#FDE047', font: 'Anton', upper: true, star: false },
    trans: ['zoompunch', 'glitch'],
    audio: { beat: { on: false }, sfxAuto: true, duck: true },
    build: L => [
      ...(L.total > 3 ? [{ kind: 'emoji', start: L.total * .25, dur: 1.6, p: { text: '😱', x: .8, y: .22, size: .2, anim: 'pop' } }, { kind: 'effect', start: L.total * .25, dur: .6, p: { fx: 'zoompunch', i: .8 } }] : []),
      ...(L.total > 7 ? [{ kind: 'emoji', start: L.total * .65, dur: 1.6, p: { text: '🤯', x: .2, y: .25, size: .2, anim: 'bounce' } }, { kind: 'effect', start: L.total * .65, dur: .5, p: { fx: 'flash', i: .8 } }] : []),
    ],
  },
  {
    id: 'album', name: 'Álbum de fotos', desc: 'Para fotos: zoom lento em cada uma, transições suaves e de tinta, trilha calma e sem legenda.',
    format: '9:16', fitAll: 'blur', kbAll: true, colors: ['#A855F7', '#FBCFE8'],
    captions: { on: false, style: 'karaoke', maxWords: 3, x: .5, y: .72, size: 1, color: '#FFFFFF', active: '#FFE600', strong: '#FF2B2B', font: 'Poppins', upper: true, star: false },
    trans: ['fade', 'ink', 'leak', 'iris'],
    audio: { beat: { on: true, bpm: 84, vol: .35, style: 'calmo' }, sfxAuto: false, duck: true },
    build: (L, o) => [
      ...(o.title ? [{ kind: 'text', start: .3, dur: 3.2, p: { text: o.title, font: 'Montserrat', size: .075, color: '#FFFFFF', stroke: '', bg: 'rgba(0,0,0,.35)', x: .5, y: .82, anim: 'fade', upper: true } }] : []),
    ],
  },
  {
    id: 'documentario', name: 'Documentário', desc: 'Formato deitado com faixas de cinema, cor de filme, nome na tela e legenda clássica.',
    format: '16:9', colors: ['#1C1917', '#D6D3D1'],
    captions: { on: true, style: 'classic', maxWords: 7, x: .5, y: .86, size: .75, color: '#FFFFFF', active: '#FFFFFF', strong: '#FDE68A', font: 'Poppins', upper: false, star: false },
    trans: ['fade', 'dip'],
    clipFx: [{ id: 'cinema', i: .6 }],
    audio: { beat: { on: true, bpm: 78, vol: .22, style: 'calmo' }, sfxAuto: false, duck: true },
    build: (L, o) => [
      { kind: 'effect', start: 0, dur: L.total, p: { fx: 'letterbox', i: .4 } },
      ...(o.title ? [{ kind: 'text', start: .5, dur: 3.5, p: { text: o.title, font: 'Montserrat', size: .08, color: '#FFFFFF', stroke: '', bg: '', x: .5, y: .45, anim: 'fade', upper: true } }] : []),
      ...(o.handle ? [{ kind: 'lower', start: 4.5, dur: 4, p: { name: o.handle, role: '', color: '#D6D3D1', x: .05, y: .72 } }] : []),
    ],
  },
  {
    id: 'limpo', name: 'Limpo (só legenda)', desc: 'Sem transições nem elementos: só a legenda karaokê e o enquadramento certo.',
    format: '9:16', colors: ['#FFFFFF', '#111111'],
    captions: { on: true, style: 'karaoke', maxWords: 3, x: .5, y: .7, size: 1, color: '#FFFFFF', active: '#FFE600', strong: '#FF2B2B', font: 'Poppins', upper: true, star: false },
    trans: ['none'],
    audio: { beat: { on: false }, sfxAuto: false, duck: true },
    build: () => [],
  },
];

// "LINHA 1 / LINHA 2" ou divide no meio
function splitTitle(t) {
  t = String(t || '').trim();
  if (t.includes('/')) { const [a, ...b] = t.split('/'); return [a.trim(), b.join('/').trim()]; }
  const w = t.split(/\s+/); if (w.length < 4) return [t, ''];
  const k = Math.ceil(w.length / 2); return [w.slice(0, k).join(' '), w.slice(k).join(' ')];
}

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map(t => [t.id, t]));

// enquadramento automático: mesmo formato = preencher; formato diferente = caber com fundo desfocado
export function autoFit(p, fitAll) {
  const [W, H] = dims(p);
  const oa = W / H;
  for (const c of p.clips) {
    const m = p.media[c.mid];
    c.zoom = 1; c.x = 0; c.y = 0;
    if (!m || !m.w || !m.h) { c.fit = 'cover'; continue; }
    const ma = m.w / m.h;
    if (fitAll) c.fit = Math.abs(ma - oa) / oa < 0.08 ? 'cover' : fitAll;
    else c.fit = Math.abs(ma - oa) / oa < 0.35 ? 'cover' : 'blur';
  }
}

// opt: {title, handle, intro, outro, trans, music, captions}
export function applyTemplate(p, tpl, opt) {
  p.template = tpl.id;
  p.items = p.items.filter(it => !it.tpl);
  for (const c of p.clips) c.fx = (c.fx || []).filter(f => !f.tpl);
  if (FORMATS[tpl.format]) p.format = tpl.format;
  autoFit(p, tpl.fitAll);
  for (const c of p.clips) { const m = p.media[c.mid]; if (m && m.kind === 'image') c.kb = tpl.kbAll ? true : c.kb; }
  if (opt.captions !== false) {
    const keep = p.captions.marker;
    p.captions = { ...p.captions, ...JSON.parse(JSON.stringify(tpl.captions)) };
    if (!tpl.captions.marker) p.captions.marker = { ...(keep || defaultMarker()), on: false };
  }
  if (tpl.media) for (const [k, v] of Object.entries(tpl.media)) if (!p.media[k]) p.media[k] = { ...v };
  // transições
  const list = opt.trans !== false ? tpl.trans : ['none'];
  p.clips.forEach((c, i) => {
    if (i >= p.clips.length - 1) { c.trans = T('none'); return; }
    const id = list[i % list.length];
    const d = tpl.transDur && opt.trans !== false ? tpl.transDur[i % tpl.transDur.length] : null;
    c.trans = T(id, d || (id === 'fade' || id === 'dip' || id === 'leak' ? 0.6 : 0.4));
  });
  // filtro nos clipes
  for (const f of tpl.clipFx || []) for (const c of p.clips) c.fx.push({ ...f, tpl: true });
  // áudio
  if (opt.music !== false && tpl.audio) {
    if (tpl.audio.beat) p.audio.beat = { ...p.audio.beat, ...tpl.audio.beat };
    if (tpl.music && p.media[tpl.music.mid] && !p.audio.music) p.audio.music = { ...tpl.music };
    if (p.audio.music && p.audio.beat.on) p.audio.beat.on = false;   // se já tem música, não põe batida por cima
  } else if (opt.music === false) p.audio.beat = { ...p.audio.beat, on: false };
  if (tpl.audio) { p.audio.sfxAuto = tpl.audio.sfxAuto; p.audio.duck = tpl.audio.duck; if (tpl.audio.loud !== undefined) p.audio.loud = tpl.audio.loud; }
  // elementos
  const L = layout(p);
  const o = { title: (opt.title || '').trim(), handle: (opt.handle || '').trim(), intro: opt.intro !== false, outro: opt.outro !== false };
  for (const it of tpl.build(L, o, p)) {
    if (it.start >= L.total) continue;
    p.items.push({ id: uid(), kind: it.kind, start: Math.max(0, it.start), dur: Math.max(0.2, Math.min(it.dur, L.total - Math.max(0, it.start))), p: JSON.parse(JSON.stringify(it.p)), ...(it.kf ? { kf: JSON.parse(JSON.stringify(it.kf)) } : {}), tpl: true });
  }
  return p;
}
