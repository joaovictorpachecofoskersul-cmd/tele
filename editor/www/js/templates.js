// Modelos prontos: aplicam formato, enquadramento, legenda, transições, abertura/final, elementos, filtro e música.
// Itens criados por um modelo ficam marcados (tpl) para que trocar de modelo não acumule coisas.
import { layout, uid, dims, FORMATS } from './project.js';

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
    id: 'limpo', name: 'Limpo (só legenda)', desc: 'Sem transições nem elementos: só a legenda karaokê e o enquadramento certo.',
    format: '9:16', colors: ['#FFFFFF', '#111111'],
    captions: { on: true, style: 'karaoke', maxWords: 3, x: .5, y: .7, size: 1, color: '#FFFFFF', active: '#FFE600', strong: '#FF2B2B', font: 'Poppins', upper: true, star: false },
    trans: ['none'],
    audio: { beat: { on: false }, sfxAuto: false, duck: true },
    build: () => [],
  },
];

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
  if (opt.captions !== false) p.captions = { ...p.captions, ...tpl.captions };
  // transições
  const list = opt.trans !== false ? tpl.trans : ['none'];
  p.clips.forEach((c, i) => {
    if (i >= p.clips.length - 1) { c.trans = T('none'); return; }
    const id = list[i % list.length];
    c.trans = T(id, id === 'fade' || id === 'dip' || id === 'leak' ? 0.6 : 0.4);
  });
  // filtro nos clipes
  for (const f of tpl.clipFx || []) for (const c of p.clips) c.fx.push({ ...f, tpl: true });
  // áudio
  if (opt.music !== false && tpl.audio) {
    if (tpl.audio.beat) p.audio.beat = { ...p.audio.beat, ...tpl.audio.beat };
    if (p.audio.music && p.audio.beat.on) p.audio.beat.on = false;   // se já tem música, não põe batida por cima
  } else if (opt.music === false) p.audio.beat = { ...p.audio.beat, on: false };
  if (tpl.audio) { p.audio.sfxAuto = tpl.audio.sfxAuto; p.audio.duck = tpl.audio.duck; }
  // elementos
  const L = layout(p);
  const o = { title: (opt.title || '').trim(), handle: (opt.handle || '').trim(), intro: opt.intro !== false, outro: opt.outro !== false };
  for (const it of tpl.build(L, o)) {
    if (it.start >= L.total) continue;
    p.items.push({ id: uid(), kind: it.kind, start: Math.max(0, it.start), dur: Math.max(0.2, Math.min(it.dur, L.total - Math.max(0, it.start))), p: it.p, tpl: true });
  }
  return p;
}
