// Modelos prontos com edição completa (cenas): a pessoa escolhe vídeos/fotos e troca os textos.
// Cada cena usa uma mídia da pessoa (ou um fundo de cor) e tem textos, elementos, efeitos e transição.
import { ELEMENTS } from './overlays.js';

export const CATS = [
  { id: 'alta', name: 'Em alta' }, { id: 'reels', name: 'Reels e TikTok' }, { id: 'stories', name: 'Stories' }, { id: 'youtube', name: 'YouTube' },
  { id: 'dados', name: 'Gráficos e números' }, { id: 'textos', name: 'Textos animados' }, { id: 'vinhetas', name: 'Vinhetas e aberturas' },
  { id: 'legendas', name: 'Legendas' }, { id: 'fotos', name: 'Fotos' }, { id: 'noticias', name: 'Notícias' }, { id: 'negocios', name: 'Negócios e vendas' },
];

const Y = '#FFDE00', R = '#EB1E28', W = '#FFFFFF', K = '#111111';
const defOf = kind => { const e = ELEMENTS.find(x => x.kind === kind); return e ? JSON.parse(JSON.stringify(e.p)) : {}; };
// texto
const T = (text, o = {}) => ({ kind: 'text', p: { text, font: o.font || 'Poppins', size: o.size || .085, color: o.color || W, stroke: o.stroke === undefined ? '#000000' : o.stroke, bg: o.bg || '', x: o.x ?? .5, y: o.y ?? .3, anim: o.anim || 'pop', upper: o.upper ?? true, full: !!o.full, rot: o.rot || 0 } });
// elemento com os padrões do catálogo
const E = (kind, p = {}) => ({ kind, p: { ...defOf(kind), ...p } });
const FX = (fx, i = .7, extra = {}) => ({ kind: 'effect', p: { fx, i, ...extra } });
const SFX = type => ({ kind: 'sfx', p: { type, vol: .7 } });
// [início na cena, duração (null = até o fim da cena), item]
const at = (t, d, item) => ({ t, d, item });

const CAP = {
  karaoke: { on: true, style: 'karaoke', maxWords: 3, x: .5, y: .7, size: 1.05, color: W, active: Y, strong: R, font: 'Poppins', upper: true, star: false },
  one: { on: true, style: 'one', maxWords: 1, x: .5, y: .62, size: 1, color: W, active: W, strong: Y, font: 'Anton', upper: true, star: false },
  box: { on: true, style: 'box', maxWords: 3, x: .5, y: .74, size: .95, color: W, active: Y, strong: R, font: 'Poppins', upper: true, star: false },
  classic: { on: true, style: 'classic', maxWords: 6, x: .5, y: .86, size: .8, color: W, active: Y, strong: Y, font: 'Poppins', upper: false, star: false },
  off: { on: false, style: 'karaoke', maxWords: 3, x: .5, y: .7, size: 1, color: W, active: Y, strong: R, font: 'Poppins', upper: true, star: false },
};

export const STORYBOARDS = [
  // ----------------------------------------------------------------- Reels / TikTok
  {
    id: 'gancho3dicas', name: 'Gancho + 3 dicas', cats: ['alta', 'reels'], format: '9:16', colors: [Y, K],
    desc: 'Começa com uma pergunta forte, depois 3 dicas numeradas e chamada para seguir.',
    fields: [{ k: 'titulo', label: 'Gancho', def: 'VOCÊ FAZ ISSO ERRADO' }, { k: 'd1', label: 'Dica 1', def: 'BEBA ÁGUA LOGO CEDO' }, { k: 'd2', label: 'Dica 2', def: 'DURMA NO MESMO HORÁRIO' }, { k: 'd3', label: 'Dica 3', def: 'CAMINHE 20 MINUTOS' }, { k: 'cta', label: 'Chamada final', def: 'SEGUE PARA MAIS DICAS' }],
    captions: CAP.karaoke, beat: { on: true, bpm: 124, vol: .2, style: 'funk' },
    scenes: [
      { dur: 3, trans: 'zoompunch', items: [at(0, null, T('{titulo}', { size: .1, color: Y, y: .3 })), at(0, .5, FX('zoompunch', .8)), at(.2, 2.6, E('arrows', { x: .5, y: .5, color: Y }))] },
      { dur: 6, trans: 'whipL', items: [at(0, null, E('pill', { text: 'DICA 1', bg: Y, color: K, x: .5, y: .12 })), at(.2, null, T('{d1}', { y: .22, size: .07 }))] },
      { dur: 6, trans: 'whipR', items: [at(0, null, E('pill', { text: 'DICA 2', bg: Y, color: K, x: .5, y: .12 })), at(.2, null, T('{d2}', { y: .22, size: .07 }))] },
      { dur: 6, trans: 'glitch', items: [at(0, null, E('pill', { text: 'DICA 3', bg: Y, color: K, x: .5, y: .12 })), at(.2, null, T('{d3}', { y: .22, size: .07 })), at(3, 2.5, E('like', { x: .82, y: .6 }))] },
      { dur: 4, items: [at(0, null, E('r_cta', { text: '{cta}', sub: 'E COMPARTILHA', color: R, x: .5, y: .8 })), at(.3, null, E('confetti', {}))] },
    ],
  },
  {
    id: 'antesdepois2', name: 'Antes e depois', cats: ['alta', 'reels', 'negocios'], format: '9:16', colors: ['#64748B', Y],
    desc: 'Mostra o antes, uma virada com flash e o depois com destaque. Use 2 mídias.',
    fields: [{ k: 'titulo', label: 'Título', def: 'OLHA A DIFERENÇA' }, { k: 'a', label: 'Antes', def: 'ANTES' }, { k: 'b', label: 'Depois', def: 'DEPOIS' }],
    captions: CAP.off, beat: { on: true, bpm: 118, vol: .25, style: 'leve' },
    scenes: [
      { dur: 4, trans: 'tear', fx: [{ id: 'bw', i: .8 }], items: [at(0, null, T('{titulo}', { y: .14, size: .08 })), at(.4, null, E('stamp', { text: '{a}', color: '#64748B', x: .5, y: .78, rot: -8 }))] },
      { dur: 5, items: [at(0, .4, FX('flash', .9)), at(.1, null, E('stamp', { text: '{b}', color: '#22C55E', x: .5, y: .78, rot: 8 })), at(.6, 2.5, E('confetti', {})), at(1, 3, E('circle', { x: .5, y: .45, r: .25, color: Y }))] },
    ],
  },
  {
    id: 'trend', name: 'Cortes na batida', cats: ['alta', 'reels'], format: '9:16', colors: ['#A855F7', '#22D3EE'],
    desc: 'Vários cortes rápidos com zoom, tremor e flash no ritmo da batida. Use 6 a 10 mídias.',
    fields: [{ k: 'titulo', label: 'Texto de abertura', def: 'MEU FIM DE SEMANA' }],
    captions: CAP.off, beat: { on: true, bpm: 128, vol: .45, style: 'funk' },
    scenes: [
      { dur: 1.9, trans: 'zoompunch', items: [at(0, null, T('{titulo}', { anim: 'glitch', size: .09, y: .5 }))] },
      { dur: 1.9, trans: 'whipL', fx: [{ id: 'pop', i: .4 }] }, { dur: 1.9, trans: 'shake' }, { dur: 1.9, trans: 'rgbsplit' }, { dur: 1.9, trans: 'whipUp' },
      { dur: 1.9, trans: 'zoompunch' }, { dur: 1.9, trans: 'flash' }, { dur: 1.9, trans: 'glitch' }, { dur: 1.9, trans: 'whipR' },
      { dur: 2.5, items: [at(0, null, FX('pulse', .5)), at(.3, null, T('FIM ✓', { anim: 'stretch', size: .12, color: '#22D3EE', y: .5 }))] },
    ],
  },
  {
    id: 'listacheck', name: 'Lista com checks', cats: ['reels', 'negocios'], format: '9:16', colors: ['#22C55E', K],
    desc: 'Título e uma lista que vai se completando, com zoom lento e final de chamada.',
    fields: [{ k: 'titulo', label: 'Título', def: 'O QUE NÃO PODE FALTAR' }, { k: 'lista', label: 'Itens (um por linha)', def: 'Planejamento\nConstância\nBoa iluminação\nSom limpo' }],
    captions: CAP.box, beat: { on: true, bpm: 110, vol: .2, style: 'leve' },
    scenes: [
      { dur: 3, trans: 'slideUp', items: [at(0, null, T('{titulo}', { y: .2, size: .08, anim: 'words' }))] },
      { dur: 9, trans: 'fade', fx: [{ id: 'zoomslow', i: .5 }], items: [at(0, null, E('checklist', { text: '{lista}', y: .5 }))] },
      { dur: 3, items: [at(0, null, E('follow', { text: 'SEGUIR', handle: '@seuperfil', y: .8 }))] },
    ],
  },
  {
    id: 'depoimento2', name: 'Depoimento', cats: ['reels', 'negocios', 'youtube'], format: '9:16', colors: ['#0EA5E9', W],
    desc: 'Pessoa falando com nome na tela, legenda e card final. Use 1 vídeo de fala.',
    fields: [{ k: 'nome', label: 'Nome', def: 'NOME DA PESSOA' }, { k: 'cargo', label: 'Cargo / cidade', def: 'Cliente desde 2020' }, { k: 'frase', label: 'Frase final', def: 'RECOMENDO DE OLHOS FECHADOS' }],
    captions: CAP.karaoke, beat: { on: true, bpm: 88, vol: .15, style: 'calmo' },
    scenes: [
      { dur: 25, fit: 'blur', items: [at(.5, 4.5, E('lower', { name: '{nome}', role: '{cargo}', color: '#0EA5E9', x: .06, y: .64 }))] },
      { dur: 4, media: false, bg: '#0B1A2A', items: [at(0, null, E('c_phrase', { l1: '"', l2: '{frase}', bg: 'video' }))] },
    ],
  },
  {
    id: 'comparativo', name: 'Comparativo X', cats: ['reels', 'dados'], format: '9:16', colors: [R, Y],
    desc: 'Dois lados comparados com ✓ e ✕, ótimo para "isso ou aquilo".',
    fields: [{ k: 'titulo', label: 'Pergunta', def: 'QUAL É MELHOR?' }, { k: 'a', label: 'Lado A', def: 'OPÇÃO A' }, { k: 'b', label: 'Lado B', def: 'OPÇÃO B' }],
    captions: CAP.box, beat: { on: true, bpm: 120, vol: .2, style: 'tenso' },
    scenes: [
      { dur: 3, trans: 'zoompunch', items: [at(0, null, T('{titulo}', { size: .1, y: .5, anim: 'stretch', color: Y }))] },
      { dur: 8, media: false, bg: '#141418', items: [at(0, null, E('g_versus', { ta: '{a}', tb: '{b}', bg: 'none' }))] },
      { dur: 5, items: [at(0, null, E('poll', { q: 'E VOCÊ?', a: '{a}', b: '{b}', pa: 55, y: .45 }))] },
    ],
  },
  {
    id: 'receita2', name: 'Receita rápida', cats: ['reels', 'fotos'], format: '9:16', colors: ['#F97316', '#FDE68A'],
    desc: 'Nome do prato, ingredientes, passo a passo e o prato pronto.',
    fields: [{ k: 'prato', label: 'Nome do prato', def: 'BOLO DE CENOURA' }, { k: 'ing', label: 'Ingredientes (um por linha)', def: '3 cenouras\n3 ovos\n2 xícaras de farinha\n1 xícara de óleo' }],
    captions: CAP.karaoke, beat: { on: true, bpm: 100, vol: .25, style: 'leve' }, look: 'comida',
    scenes: [
      { dur: 3, trans: 'zoomin', items: [at(0, null, T('{prato}', { font: 'Anton', size: .11, color: '#FDE68A', y: .25, anim: 'drop' }))] },
      { dur: 7, trans: 'slideLeft', items: [at(0, null, E('checklist', { text: '{ing}', y: .55, check: '#F97316' }))] },
      { dur: 4, trans: 'slideLeft', items: [at(0, null, E('pill', { text: 'PASSO 1', bg: '#F97316', color: W, y: .12 }))] },
      { dur: 4, trans: 'slideLeft', items: [at(0, null, E('pill', { text: 'PASSO 2', bg: '#F97316', color: W, y: .12 }))] },
      { dur: 4, items: [at(0, null, T('PRONTO! 😋', { size: .11, y: .25, anim: 'letters' })), at(.3, 2.5, E('confetti', {}))] },
    ],
  },
  {
    id: 'viagem', name: 'Viagem / passeio', cats: ['reels', 'fotos', 'stories'], format: '9:16', colors: ['#0D9488', '#99F6E4'],
    desc: 'Local na tela, zoom lento, luz e transições suaves. Use 5 a 8 mídias.',
    fields: [{ k: 'lugar', label: 'Lugar', def: 'CHAPADA DOS GUIMARÃES' }, { k: 'data', label: 'Data ou frase', def: 'Julho de 2026' }],
    captions: CAP.off, beat: { on: true, bpm: 92, vol: .35, style: 'calmo' }, look: 'verao',
    scenes: [
      { dur: 4, trans: 'leak', items: [at(.3, null, T('{lugar}', { font: 'Montserrat', size: .07, y: .45, anim: 'reveal', stroke: '' })), at(.8, null, T('{data}', { size: .04, y: .52, anim: 'fade', upper: false, stroke: '' }))] },
      { dur: 3.5, trans: 'zoomin', kb: true }, { dur: 3.5, trans: 'leak', kb: true }, { dur: 3.5, trans: 'fade', kb: true }, { dur: 3.5, trans: 'ink', kb: true },
      { dur: 4, items: [at(0, null, T('ATÉ A PRÓXIMA', { font: 'Montserrat', size: .06, y: .5, anim: 'blurin', stroke: '' }))] },
    ],
  },
  {
    id: 'motivacional', name: 'Frase motivacional', cats: ['reels', 'textos'], format: '9:16', colors: [K, W],
    desc: 'Preto e branco, uma frase aparecendo palavra por palavra e trilha calma.',
    fields: [{ k: 'f1', label: 'Frase (parte 1)', def: 'NÃO É SOBRE SER O MELHOR' }, { k: 'f2', label: 'Frase (parte 2)', def: 'É SOBRE SER MELHOR QUE ONTEM' }, { k: 'autor', label: 'Assinatura', def: '@seuperfil' }],
    captions: CAP.off, beat: { on: true, bpm: 80, vol: .4, style: 'calmo' }, look: 'pbforte',
    scenes: [
      { dur: 5, trans: 'dip', kb: true, items: [at(.3, null, T('{f1}', { anim: 'words', y: .45, size: .075 }))] },
      { dur: 6, trans: 'dip', kb: true, items: [at(.3, null, T('{f2}', { anim: 'words', y: .45, size: .075, color: Y }))] },
      { dur: 3, media: false, bg: '#000000', items: [at(.2, null, T('{autor}', { anim: 'fade', size: .05, upper: false, stroke: '' }))] },
    ],
  },
  {
    id: 'aniversario', name: 'Aniversário', cats: ['reels', 'stories', 'fotos'], format: '9:16', colors: ['#EC4899', '#FDE68A'],
    desc: 'Fotos com confete, coração e card final de parabéns.',
    fields: [{ k: 'nome', label: 'Nome', def: 'MARIA' }, { k: 'msg', label: 'Mensagem', def: 'MUITA SAÚDE E ALEGRIA!' }],
    captions: CAP.off, beat: { on: true, bpm: 116, vol: .4, style: 'animado' },
    scenes: [
      { dur: 3, trans: 'heart', kb: true, items: [at(.2, null, T('FELIZ ANIVERSÁRIO', { anim: 'letters3d', color: '#FDE68A', font: 'Anton', size: .1, y: .2 }))] },
      { dur: 3, trans: 'heart', kb: true }, { dur: 3, trans: 'iris', kb: true }, { dur: 3, trans: 'heart', kb: true },
      { dur: 4, items: [at(0, null, E('card', { title: '{nome}', sub: '{msg}', bg: '#EC4899', bg2: '#831843', confetti: true, comment: '' }))] },
    ],
  },
  // ----------------------------------------------------------------- Stories
  {
    id: 'storypromo', name: 'Promoção relâmpago', cats: ['stories', 'negocios', 'alta'], format: '9:16', colors: [R, Y],
    desc: 'Carimbo de oferta, preço com contador, contagem regressiva e "arraste para cima".',
    fields: [{ k: 'produto', label: 'Produto', def: 'TÊNIS ESPORTIVO' }, { k: 'de', label: 'Preço antigo', def: 'R$ 299' }, { k: 'por', label: 'Preço novo (só número)', def: '149' }],
    captions: CAP.off, beat: { on: true, bpm: 128, vol: .35, style: 'funk' }, look: 'vivo',
    scenes: [
      { dur: 3, trans: 'zoompunch', items: [at(0, null, E('stamp', { text: 'OFERTA', color: R, x: .5, y: .2, rot: -10 })), at(.3, null, T('{produto}', { y: .82, size: .065 }))] },
      { dur: 4, trans: 'whipL', items: [at(0, null, T('DE {de}', { size: .05, y: .2, color: '#D4D4D8', anim: 'fade' })), at(.5, null, E('counter', { from: 999, to: 149, prefix: 'R$ ', suffix: '', label: 'SÓ HOJE', color: Y, y: .35 }))] },
      { dur: 4, items: [at(0, null, E('g_countdown', { top: 'TERMINA EM', from: 3, to: 0, bottom: 'HORAS', bg: 'none', y: .3 })), at(1.5, null, E('swipe', { text: 'ARRASTE PARA CIMA', y: .86 }))] },
    ],
  },
  {
    id: 'storyenquete', name: 'Enquete no story', cats: ['stories'], format: '9:16', colors: ['#8B5CF6', W],
    desc: 'Pergunta grande, enquete animada e resultado.',
    fields: [{ k: 'q', label: 'Pergunta', def: 'CAFÉ OU CHÁ?' }, { k: 'a', label: 'Opção 1', def: 'CAFÉ' }, { k: 'b', label: 'Opção 2', def: 'CHÁ' }],
    captions: CAP.off, beat: { on: true, bpm: 110, vol: .3, style: 'leve' },
    scenes: [
      { dur: 3, trans: 'slideUp', items: [at(0, null, T('{q}', { anim: 'drop', size: .11, y: .3 }))] },
      { dur: 6, items: [at(0, null, E('poll', { q: '{q}', a: '{a}', b: '{b}', pa: 63, y: .45 })), at(3, 2.5, E('tap', { x: .35, y: .52 }))] },
    ],
  },
  {
    id: 'storyevento', name: 'Convite para evento', cats: ['stories', 'negocios'], format: '9:16', colors: ['#7C3AED', '#FDE68A'],
    desc: 'Nome do evento, data e local, contagem e "te esperamos".',
    fields: [{ k: 'evento', label: 'Evento', def: 'ENCONTRO REGIONAL' }, { k: 'data', label: 'Data', def: 'SÁBADO, 25 · 19H' }, { k: 'local', label: 'Local', def: 'Centro de Eventos, Cuiabá' }],
    captions: CAP.off, beat: { on: true, bpm: 112, vol: .35, style: 'animado' },
    scenes: [
      { dur: 4, trans: 'leak', items: [at(0, null, T('{evento}', { anim: 'letters3d', font: 'Anton', size: .1, color: '#FDE68A', y: .3 }))] },
      { dur: 4, trans: 'zoomin', items: [at(0, null, E('pill', { text: '{data}', bg: '#7C3AED', color: W, y: .2 })), at(.3, null, E('lower', { name: '{local}', role: 'Local', color: '#FDE68A', x: .06, y: .72 }))] },
      { dur: 4, items: [at(0, null, E('card', { title: 'TE ESPERAMOS', sub: '{data}', bg: '#7C3AED', bg2: '#2E1065', confetti: true, comment: '' }))] },
    ],
  },
  {
    id: 'storydia', name: 'Meu dia', cats: ['stories', 'fotos'], format: '9:16', colors: ['#F97316', '#EC4899'],
    desc: 'Horários na tela, luz quente e transições de luz. Use 4 a 6 mídias.',
    fields: [{ k: 'titulo', label: 'Título', def: 'UM DIA COMIGO' }],
    captions: CAP.off, beat: { on: true, bpm: 104, vol: .35, style: 'leve' }, look: 'quente',
    scenes: [
      { dur: 3, trans: 'leak', items: [at(0, null, T('{titulo}', { anim: 'highlight', bg: '#F97316', stroke: '', size: .07, y: .14 }))] },
      { dur: 3, trans: 'leak', items: [at(0, null, E('pill', { text: '07:00', bg: W, color: K, x: .2, y: .1 }))] },
      { dur: 3, trans: 'slideUp', items: [at(0, null, E('pill', { text: '12:30', bg: W, color: K, x: .2, y: .1 }))] },
      { dur: 3, trans: 'leak', items: [at(0, null, E('pill', { text: '18:00', bg: W, color: K, x: .2, y: .1 }))] },
      { dur: 3, items: [at(0, null, E('pill', { text: '22:00', bg: W, color: K, x: .2, y: .1 })), at(.4, null, E('emoji', { text: '🌙', x: .8, y: .3 }))] },
    ],
  },
  // ----------------------------------------------------------------- YouTube
  {
    id: 'ytexplica', name: 'Vídeo explicativo', cats: ['youtube', 'alta'], format: '16:9', colors: ['#1E3A8A', Y],
    desc: 'Abertura com título, 3 tópicos com nome na tela, legenda e tela final.',
    fields: [{ k: 'titulo', label: 'Título do vídeo', def: 'COMO FUNCIONA O SANEAMENTO' }, { k: 't1', label: 'Tópico 1', def: 'O problema' }, { k: 't2', label: 'Tópico 2', def: 'As causas' }, { k: 't3', label: 'Tópico 3', def: 'O que fazer' }, { k: 'canal', label: 'Nome do canal', def: 'SEU CANAL' }],
    captions: CAP.classic, beat: { on: true, bpm: 96, vol: .15, style: 'calmo' },
    scenes: [
      { dur: 4, media: false, bg: '#0B1437', items: [at(0, null, T('{titulo}', { anim: 'reveal', font: 'Montserrat', size: .09, y: .45, stroke: '' })), at(.6, null, T('{canal}', { anim: 'fade', size: .04, y: .58, color: Y, stroke: '' })), at(0, .5, SFX('vinheta'))] },
      { dur: 8, trans: 'slideLeft', items: [at(.3, 3.5, E('module', { num: '1', title: '{t1}', bg: '#1E3A8A', accent: Y }))] },
      { dur: 8, trans: 'slideLeft', items: [at(.3, 3.5, E('module', { num: '2', title: '{t2}', bg: '#1E3A8A', accent: Y }))] },
      { dur: 8, trans: 'slideLeft', items: [at(.3, 3.5, E('module', { num: '3', title: '{t3}', bg: '#1E3A8A', accent: Y })), at(4.5, 3, E('bell', { text: 'SE INSCREVA NO CANAL', y: .82 }))] },
      { dur: 6, media: false, bg: '#0B1437', items: [at(0, null, T('OBRIGADO POR ASSISTIR', { anim: 'words', size: .07, y: .2 })), at(.4, null, T('ASSISTA TAMBÉM ➜', { size: .045, y: .82, x: .78, color: Y, anim: 'fade' }))] },
    ],
  },
  {
    id: 'yttop5', name: 'Top 5', cats: ['youtube', 'reels'], format: '16:9', colors: ['#FACC15', K],
    desc: 'Contagem do 5 ao 1 com número gigante e chicote entre os itens. Use 5 mídias.',
    fields: [{ k: 'titulo', label: 'Título', def: 'TOP 5 LUGARES PARA VISITAR' }, { k: 'i5', label: '#5', def: 'Quinto' }, { k: 'i4', label: '#4', def: 'Quarto' }, { k: 'i3', label: '#3', def: 'Terceiro' }, { k: 'i2', label: '#2', def: 'Segundo' }, { k: 'i1', label: '#1', def: 'Primeiro' }],
    captions: CAP.classic, beat: { on: true, bpm: 122, vol: .25, style: 'funk' },
    scenes: [
      { dur: 3, media: false, bg: '#111111', items: [at(0, null, T('{titulo}', { anim: 'stretch', font: 'Anton', size: .1, color: '#FACC15', y: .5 })), at(0, .6, SFX('tambor'))] },
      ...['5', '4', '3', '2', '1'].map(n => ({ dur: 5, trans: n === '1' ? 'flash' : 'whipL', items: [at(0, 2.5, T('#' + n, { font: 'Anton', size: .22, color: '#FACC15', x: .14, y: .2, anim: 'zoom' })), at(.3, null, E('lower', { name: '{i' + n + '}', role: '', color: '#FACC15', x: .05, y: .82 }))] })),
    ],
  },
  {
    id: 'ytreview', name: 'Review de produto', cats: ['youtube', 'negocios'], format: '16:9', colors: ['#2563EB', '#FACC15'],
    desc: 'Produto, prós e contras, nota final e chamada.',
    fields: [{ k: 'produto', label: 'Produto', def: 'FONE SEM FIO' }, { k: 'pros', label: 'Prós (um por linha)', def: '+ Bateria dura muito\n+ Som limpo' }, { k: 'contras', label: 'Contras (um por linha)', def: '- Caixa grande\n- Sem cabo' }, { k: 'nota', label: 'Nota (0 a 100)', def: '86' }],
    captions: CAP.classic, beat: { on: true, bpm: 104, vol: .15, style: 'leve' },
    scenes: [
      { dur: 5, trans: 'zoompunch', items: [at(0, null, E('stamp', { text: 'REVIEW', color: '#2563EB', x: .82, y: .18, rot: 10 })), at(.3, null, T('{produto}', { size: .1, y: .8, anim: 'stretch' }))] },
      { dur: 10, trans: 'slideLeft', items: [at(.3, null, E('g_versus', { ta: 'PRÓS', tb: 'CONTRAS', left: '{pros}', right: '{contras}', bg: 'escuro' }))] },
      { dur: 6, items: [at(0, null, E('g_ring', { pct: '{nota}', label: 'NOTA FINAL', bg: 'none', color: '#22C55E' }))] },
    ],
  },
  {
    id: 'ytendscreen', name: 'Tela final do YouTube', cats: ['youtube', 'vinhetas'], format: '16:9', colors: [R, K],
    desc: '20 s com espaço reservado para os vídeos sugeridos e o botão inscrever do YouTube.',
    fields: [{ k: 'msg', label: 'Mensagem', def: 'OBRIGADO POR ASSISTIR!' }],
    captions: CAP.off, beat: { on: true, bpm: 90, vol: .4, style: 'calmo' },
    scenes: [
      { dur: 20, fit: 'blur', fx: [{ id: 'blur', i: .6 }, { id: 'darkfade', i: .5 }], items: [at(0, null, T('{msg}', { anim: 'words', size: .065, y: .14 })), at(.5, null, E('blurbox', { x: .3, y: .55, w: .4, h: .4, mode: 'blur' })), at(.5, null, E('blurbox', { x: .74, y: .55, w: .3, h: .3, mode: 'blur' })), at(.8, null, T('ASSISTA ESTE ➜', { size: .035, x: .3, y: .8, anim: 'fade', stroke: '' })), at(.8, null, T('INSCREVA-SE', { size: .035, x: .74, y: .76, anim: 'fade', color: R, stroke: '#FFFFFF' }))] },
    ],
  },
  // ----------------------------------------------------------------- Gráficos e números
  {
    id: 'dados30', name: 'Dados que impressionam', cats: ['dados', 'alta', 'noticias'], format: '9:16', colors: [R, Y],
    desc: 'Gancho, número subindo, gráfico de barras, anel de porcentagem e fonte. 30 s.',
    fields: [{ k: 'titulo', label: 'Gancho', def: 'VOCÊ NÃO VAI ACREDITAR NESSE NÚMERO' }, { k: 'num', label: 'Número principal', def: '35000000' }, { k: 'sobre', label: 'O que é o número', def: 'DE PESSOAS SEM ÁGUA TRATADA' }, { k: 'pct', label: 'Porcentagem', def: '16' }, { k: 'fonte', label: 'Fonte', def: 'Fonte: instituto, ano' }],
    captions: CAP.karaoke, beat: { on: true, bpm: 118, vol: .2, style: 'tenso' },
    scenes: [
      { dur: 4, trans: 'zoompunch', items: [at(0, null, T('{titulo}', { anim: 'words', size: .075, y: .3 })), at(0, .5, FX('zoompunch', .8))] },
      { dur: 6, media: false, bg: '#121216', items: [at(0, null, E('counter', { from: 0, to: '{num}', label: '{sobre}', color: Y, y: .45, size: .11 })), at(0, null, E('text', { text: '{fonte}', size: .022, y: .93, anim: 'fade', stroke: '', color: '#A1A1AA', upper: false }))] },
      { dur: 7, media: false, bg: '#121216', items: [at(0, null, E('g_vbars', { bg: 'none', fonte: '{fonte}' }))] },
      { dur: 6, items: [at(0, null, E('g_ring', { pct: '{pct}', label: 'DA POPULAÇÃO', bg: 'none', y: .4 }))] },
      { dur: 6, items: [at(0, null, E('c_final', { l1: 'COMPARTILHE', l2: 'ESSA INFORMAÇÃO', cta1: 'MANDA PRA 3 PESSOAS', cta2: 'SEGUE O PERFIL', bg: 'video' }))] },
    ],
  },
  {
    id: 'linhatempo', name: 'Linha do tempo histórica', cats: ['dados', 'noticias'], format: '9:16', colors: ['#C8A96B', K],
    desc: 'Contador de anos, datas com pop, barra do tempo e lista de marcos sobre fundo de papel.',
    fields: [{ k: 'titulo', label: 'Tema', def: 'NOSSA HISTÓRIA' }, { k: 'ini', label: 'Ano inicial', def: '1889' }, { k: 'fim', label: 'Ano final', def: '2026' }, { k: 'evento', label: 'Marco principal', def: 'O COMEÇO DE TUDO' }],
    captions: CAP.karaoke, beat: { on: true, bpm: 84, vol: .2, style: 'calmo' }, look: 'retro',
    scenes: [
      { dur: 4, trans: 'ink', fx: [{ id: 'bw', i: .8 }], items: [at(0, null, T('{titulo}', { anim: 'reveal', font: 'Montserrat', size: .08, y: .45 }))] },
      { dur: 6, media: false, bg: '#E8DCC0', items: [at(0, null, E('c_year', { label: '{titulo}', from: '{ini}', to: '{fim}', sub: 'ANOS DE HISTÓRIA' }))] },
      { dur: 6, media: false, bg: '#E8DCC0', items: [at(0, null, E('c_date', { top: 'EM', year: '{ini}', title: '{evento}', title2: '' }))] },
      { dur: 8, media: false, bg: '#111111', items: [at(0, null, E('c_timeline', { title: '{titulo}', start: '{ini}', end: '{fim}', segs: '', line1: 'TUDO MUDOU', line2: 'COM O TEMPO', segLabel: '', segLine: '' }))] },
      { dur: 6, trans: 'ink', fx: [{ id: 'bw', i: .8 }], items: [at(0, null, E('c_final', { l1: 'NÃO PODEMOS', l2: 'ESQUECER', cta1: 'COMENTA O QUE ACHOU', cta2: 'SEGUE O PERFIL', bg: 'video' }))] },
    ],
  },
  {
    id: 'ranking', name: 'Ranking em corrida', cats: ['dados'], format: '9:16', colors: ['#3B82F6', Y],
    desc: 'Barras que trocam de lugar ao longo dos anos, com título e conclusão.',
    fields: [{ k: 'titulo', label: 'Título', def: 'QUEM CRESCEU MAIS?' }, { k: 'conc', label: 'Conclusão', def: 'E O PRIMEIRO LUGAR MUDOU' }],
    captions: CAP.off, beat: { on: true, bpm: 116, vol: .4, style: 'tenso' },
    scenes: [
      { dur: 3, trans: 'zoompunch', items: [at(0, null, T('{titulo}', { anim: 'drop', size: .09, y: .35 }))] },
      { dur: 12, media: false, bg: '#0E0E12', items: [at(0, null, E('g_race', { title: '{titulo}', bg: 'none' }))] },
      { dur: 4, items: [at(0, null, T('{conc}', { anim: 'words', size: .075, y: .4, color: Y }))] },
    ],
  },
  {
    id: 'pesquisa', name: 'Pesquisa e números', cats: ['dados', 'noticias'], format: '9:16', colors: [R, '#3B82F6'],
    desc: 'Cabo de guerra de pesquisa, tabela e linha que se desenha, com fonte no rodapé.',
    fields: [{ k: 'titulo', label: 'Título', def: 'O QUE A PESQUISA MOSTRA' }, { k: 'fonte', label: 'Fonte', def: 'Fonte: instituto, data' }],
    captions: CAP.karaoke, beat: { on: true, bpm: 110, vol: .2, style: 'tenso' },
    scenes: [
      { dur: 3, trans: 'zoompunch', items: [at(0, null, E('r_headline', { tag: 'PESQUISA', l1: '{titulo}', l2: '', y: .1 }))] },
      { dur: 7, media: false, bg: '#101014', items: [at(0, null, E('g_poll', { title: '{titulo}', fonte: '{fonte}', bg: 'none' }))] },
      { dur: 7, media: false, bg: '#101014', items: [at(0, null, E('g_line', { title: 'EVOLUÇÃO', bg: 'none', fonte: '{fonte}' }))] },
      { dur: 6, media: false, bg: '#101014', items: [at(0, null, E('g_pie', { title: 'DIVISÃO', bg: 'none', fonte: '{fonte}' }))] },
    ],
  },
  {
    id: 'mapa', name: 'Mapa e regiões', cats: ['dados'], format: '9:16', colors: ['#16A34A', Y],
    desc: 'Mapa do Brasil com estados em destaque, pessoas e número.',
    fields: [{ k: 'titulo', label: 'Título', def: 'ONDE ISSO ACONTECE' }, { k: 'uf', label: 'Estados (siglas)', def: 'MT, PA, BA' }, { k: 'num', label: 'Número', def: '3 EM CADA 10' }],
    captions: CAP.karaoke, beat: { on: true, bpm: 100, vol: .2, style: 'leve' },
    scenes: [
      { dur: 3, trans: 'zoomin', items: [at(0, null, T('{titulo}', { anim: 'words', size: .08, y: .3 }))] },
      { dur: 7, media: false, bg: '#0F172A', items: [at(0, null, E('map', { states: '{uf}', label: '{uf}', y: .45 }))] },
      { dur: 6, media: false, bg: '#0F172A', items: [at(0, null, E('people', { total: 10, hi: 3, label: '{num}', y: .45 }))] },
    ],
  },
  // ----------------------------------------------------------------- Notícias
  {
    id: 'urgente', name: 'Notícia urgente', cats: ['noticias', 'alta'], format: '9:16', colors: [R, W],
    desc: 'Manchete com etiqueta, carimbo URGENTE, moldura pulsando, dados e chamada.',
    fields: [{ k: 'tag', label: 'Local e data', def: 'CUIABÁ · HOJE' }, { k: 'l1', label: 'Manchete (linha branca)', def: 'O QUE ACONTECEU HOJE' }, { k: 'l2', label: 'Manchete (linha amarela)', def: 'VAI MUDAR A SUA VIDA' }],
    captions: CAP.karaoke, beat: { on: true, bpm: 112, vol: .2, style: 'tenso' },
    scenes: [
      { dur: 5, trans: 'flash', items: [at(0, null, E('r_headline', { tag: '{tag}', l1: '{l1}', l2: '{l2}', y: .07 })), at(0, null, E('r_frame', { mode: 'pulsar' })), at(.3, 2.5, E('stamp', { text: 'URGENTE', color: R, x: .5, y: .5, rot: -10 })), at(0, null, E('r_blink', { text: 'ESPERA O FINAL', y: .24 }))] },
      { dur: 10, trans: 'scanner', items: [at(0, 4, E('r_headline', { tag: '{tag}', l1: '{l1}', l2: '{l2}', y: .07 }))] },
      { dur: 10, trans: 'glitch', items: [at(1, 3, E('circle', { x: .5, y: .45, r: .2, color: R }))] },
      { dur: 4, items: [at(0, null, E('c_final', { l1: 'FIQUE', l2: 'INFORMADO', cta1: 'COMENTA O QUE ACHOU', cta2: 'SEGUE O PERFIL', bg: 'video' }))] },
    ],
  },
  {
    id: 'vocesabia2', name: 'Você sabia?', cats: ['noticias', 'reels'], format: '9:16', colors: ['#173B32', '#F0B429'],
    desc: 'Etiqueta "você sabia?", curiosidade, número e chamada para compartilhar.',
    fields: [{ k: 'fato', label: 'Curiosidade', def: 'O CORAÇÃO BATE 100 MIL VEZES POR DIA' }, { k: 'num', label: 'Número', def: '100000' }, { k: 'sobre', label: 'O que é o número', def: 'BATIDAS POR DIA' }],
    captions: CAP.box, beat: { on: true, bpm: 108, vol: .2, style: 'animado' },
    scenes: [
      { dur: 4, trans: 'slideLeft', items: [at(0, null, E('pill', { text: 'VOCÊ SABIA?', bg: '#F0B429', color: '#173B32', y: .12 })), at(.3, null, T('{fato}', { anim: 'words', size: .065, y: .3 }))] },
      { dur: 6, items: [at(0, null, E('counter', { from: 0, to: '{num}', label: '{sobre}', color: '#F0B429', y: .45 }))] },
      { dur: 4, items: [at(0, null, E('share', { text: 'MANDA PRA ALGUÉM', x: .5, y: .78 }))] },
    ],
  },
  // ----------------------------------------------------------------- Vinhetas e aberturas
  {
    id: 'vinheta1', name: 'Vinheta com título', cats: ['vinhetas', 'alta'], format: '9:16', colors: ['#111827', Y],
    desc: 'Abertura de 6 s: luz, título em 3D com brilho e som de vinheta. Coloque antes do seu vídeo.',
    fields: [{ k: 'titulo', label: 'Título', def: 'SEU NOME AQUI' }, { k: 'sub', label: 'Subtítulo', def: 'apresenta' }],
    captions: CAP.off, beat: null,
    scenes: [{ dur: 6, media: false, bg: '#0B0B12', items: [at(0, null, E('floaters', { color: Y, amount: .6 })), at(0, null, FX('leak', .6)), at(.4, null, T('{sub}', { anim: 'fade', size: .04, y: .38, upper: false, stroke: '', color: '#D4D4D8' })), at(.8, null, T('{titulo}', { anim: 'letters3d', font: 'Anton', size: .12, color: Y, y: .48 })), at(0, 1, SFX('vinheta'))] }],
  },
  {
    id: 'vinheta2', name: 'Abertura glitch', cats: ['vinhetas'], format: '9:16', colors: ['#06B6D4', '#EC4899'],
    desc: 'Abertura de 5 s com glitch, RGB e chiado.',
    fields: [{ k: 'titulo', label: 'Título', def: 'EPISÓDIO 1' }],
    captions: CAP.off, beat: null,
    scenes: [{ dur: 5, fx: [{ id: 'rgbsplit', i: .7 }], items: [at(0, null, FX('glitch', .8)), at(.2, null, T('{titulo}', { anim: 'glitch', font: 'Anton', size: .13, y: .5 })), at(0, 1, SFX('glitch')), at(3.8, 1, SFX('chiado'))] }],
  },
  {
    id: 'vinheta3', name: 'Contagem 3, 2, 1', cats: ['vinhetas', 'youtube'], format: '9:16', colors: [K, W],
    desc: 'Contagem regressiva estilo cinema antes do vídeo começar.',
    fields: [{ k: 'titulo', label: 'Texto depois da contagem', def: 'COMEÇOU!' }],
    captions: CAP.off, beat: null,
    scenes: [{ dur: 5, media: false, bg: '#1A1A1A', items: [at(0, 3, E('g_countdown', { top: '', from: 3, to: 1, bottom: '', bg: 'none', color: W, color2: Y })), at(0, null, FX('vintage', .6)), at(3.1, null, T('{titulo}', { anim: 'stretch', size: .12, y: .5, color: Y })), at(3, .6, SFX('impacto'))] }],
  },
  {
    id: 'vinheta4', name: 'Encerramento', cats: ['vinhetas', 'youtube'], format: '9:16', colors: [R, W],
    desc: 'Fechamento de 6 s: "obrigado", @ do perfil, botão seguir e confete.',
    fields: [{ k: 'msg', label: 'Mensagem', def: 'OBRIGADO POR ASSISTIR' }, { k: 'perfil', label: 'Seu @', def: '@seuperfil' }],
    captions: CAP.off, beat: null,
    scenes: [{ dur: 6, fit: 'blur', fx: [{ id: 'blur', i: .5 }], items: [at(0, null, T('{msg}', { anim: 'words', size: .075, y: .32 })), at(.8, null, E('follow', { text: 'SEGUIR', handle: '{perfil}', y: .6 })), at(1.4, null, E('confetti', {})), at(0, .8, SFX('tadah'))] }],
  },
  {
    id: 'vinheta5', name: 'Abertura de podcast', cats: ['vinhetas', 'youtube'], format: '16:9', colors: ['#111111', '#F59E0B'],
    desc: 'Nome do programa, convidado e tema, para abrir episódios.',
    fields: [{ k: 'prog', label: 'Programa', def: 'PAPO RETO' }, { k: 'conv', label: 'Convidado', def: 'NOME DO CONVIDADO' }, { k: 'tema', label: 'Tema', def: 'Saúde e comunidade' }],
    captions: CAP.off, beat: { on: true, bpm: 96, vol: .5, style: 'animado' },
    scenes: [{ dur: 7, fit: 'blur', fx: [{ id: 'darkfade', i: .4 }], items: [at(0, null, T('{prog}', { anim: 'stretch', font: 'Anton', size: .14, y: .38, color: '#F59E0B' })), at(1.2, null, E('lower', { name: '{conv}', role: '{tema}', color: '#F59E0B', x: .05, y: .74 })), at(0, 1, SFX('vinheta'))] }],
  },
  // ----------------------------------------------------------------- Negócios
  {
    id: 'lancamento', name: 'Lançamento de produto', cats: ['negocios', 'reels'], format: '9:16', colors: ['#2563EB', '#FACC15'],
    desc: 'Suspense, revelação com flash, 3 benefícios e preço.',
    fields: [{ k: 'produto', label: 'Produto', def: 'NOVA COLEÇÃO' }, { k: 'b', label: 'Benefícios (um por linha)', def: 'Entrega rápida\nGarantia de 1 ano\nParcelamento sem juros' }, { k: 'preco', label: 'Chamada', def: 'LINK NA BIO' }],
    captions: CAP.box, beat: { on: true, bpm: 124, vol: .3, style: 'funk' }, look: 'vivo',
    scenes: [
      { dur: 3, fx: [{ id: 'darkfade', i: .7 }], items: [at(0, null, T('VEM AÍ...', { anim: 'neon', color: '#22D3EE', size: .1, y: .5 })), at(0, 3, SFX('suspense'))] },
      { dur: 5, trans: 'flash', items: [at(0, null, E('stamp', { text: 'NOVO', color: '#2563EB', x: .78, y: .16, rot: 12 })), at(.3, null, T('{produto}', { anim: 'letters3d', font: 'Anton', size: .11, color: '#FACC15', y: .8 }))] },
      { dur: 7, trans: 'slideLeft', items: [at(0, null, E('checklist', { text: '{b}', y: .5, check: '#FACC15' }))] },
      { dur: 4, items: [at(0, null, E('card', { title: '{produto}', sub: '{preco}', bg: '#2563EB', bg2: '#1E3A8A', confetti: true, comment: '' }))] },
    ],
  },
  {
    id: 'servico', name: 'Divulgar serviço', cats: ['negocios'], format: '9:16', colors: ['#059669', W],
    desc: 'Problema, solução, como funciona e contato.',
    fields: [{ k: 'prob', label: 'Problema', def: 'CANSADO DE PERDER TEMPO?' }, { k: 'sol', label: 'Solução', def: 'NÓS RESOLVEMOS PARA VOCÊ' }, { k: 'contato', label: 'Contato', def: '(65) 99999-0000' }],
    captions: CAP.karaoke, beat: { on: true, bpm: 112, vol: .25, style: 'leve' },
    scenes: [
      { dur: 4, fx: [{ id: 'bw', i: .7 }], items: [at(0, null, T('{prob}', { anim: 'shake', size: .08, y: .3 })), at(.2, null, E('emoji', { text: '😩', x: .5, y: .55 }))] },
      { dur: 5, trans: 'flash', items: [at(0, null, T('{sol}', { anim: 'highlight', bg: '#059669', stroke: '', size: .07, y: .25 }))] },
      { dur: 8, trans: 'slideLeft', items: [at(0, null, E('pill', { text: 'COMO FUNCIONA', bg: '#059669', color: W, y: .12 }))] },
      { dur: 4, items: [at(0, null, E('card', { title: 'FALE CONOSCO', sub: '{contato}', bg: '#059669', bg2: '#064E3B', confetti: false, comment: '' }))] },
    ],
  },
  // ----------------------------------------------------------------- Fotos
  {
    id: 'album2', name: 'Álbum de fotos', cats: ['fotos', 'alta'], format: '9:16', colors: ['#A855F7', '#FBCFE8'],
    desc: 'Fotos com zoom lento, molduras desfocadas e transições de tinta. Use 6 a 12 fotos.',
    fields: [{ k: 'titulo', label: 'Título', def: 'MOMENTOS' }],
    captions: CAP.off, beat: { on: true, bpm: 84, vol: .45, style: 'calmo' },
    scenes: [
      { dur: 3.5, fit: 'blur', kb: true, trans: 'ink', items: [at(.3, null, T('{titulo}', { anim: 'blurin', font: 'Montserrat', size: .09, y: .82, stroke: '', bg: 'rgba(0,0,0,.35)' }))] },
      ...[1, 2, 3, 4, 5].map(i => ({ dur: 3, fit: 'blur', kb: true, trans: ['fade', 'leak', 'iris', 'ink', 'fade'][i - 1] })),
    ],
  },
  {
    id: 'carrossel2', name: 'Carrossel em vídeo', cats: ['fotos', 'reels'], format: '9:16', colors: ['#1F2937', R],
    desc: 'Transforma prints e imagens de um carrossel em vídeo, com som de suspense.',
    fields: [{ k: 'titulo', label: 'Título', def: 'ARRASTA PARA O LADO' }],
    captions: CAP.off, beat: { on: true, bpm: 80, vol: .3, style: 'calmo' },
    scenes: [
      { dur: 3.5, fit: 'blur', trans: 'radialzoom', items: [at(0, null, E('r_headline', { tag: 'VEJA', l1: '{titulo}', l2: '', y: .08 })), at(0, 1.5, SFX('riser'))] },
      ...[1, 2, 3, 4].map(() => ({ dur: 3.5, fit: 'blur', trans: 'slideLeft' })),
    ],
  },
];

// ------------------------------------------------------------------ montagem
const subst = (v, vals) => typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (m, k) => vals[k] ?? m) : v;
function fill(obj, vals) {
  const o = {};
  for (const [k, v] of Object.entries(obj)) {
    let x = subst(v, vals);
    if (typeof v === 'string' && /^\{\w+\}$/.test(v) && ['to', 'from', 'pct', 'start', 'end', 'num'].includes(k)) { const n = parseFloat(String(x).replace(/\./g, '').replace(',', '.')); if (isFinite(n)) x = n; }
    o[k] = x;
  }
  return o;
}

export function storyMediaCount(sb) { return sb.scenes.filter(s => s.media !== false).length; }
export function storyDur(sb) { return sb.scenes.reduce((a, s) => a + s.dur, 0); }

// medias: [{id, kind, dur}] escolhidas pela pessoa ; colorMedia(cor) -> id de uma imagem de cor sólida
export function buildStoryboard(sb, medias, vals, colorMedia) {
  const v = {};
  for (const f of sb.fields || []) v[f.k] = (vals && vals[f.k] != null && vals[f.k] !== '') ? vals[f.k] : f.def;
  const clips = [], plan = [];
  const pos = {};
  let mi = 0;
  sb.scenes.forEach((sc, i) => {
    let m;
    if (sc.media === false || !medias.length) m = { id: colorMedia(sc.bg || '#111111'), kind: 'image', dur: sc.dur };
    else m = medias[mi++ % medias.length];
    let a = 0, b = sc.dur;
    if (m.kind === 'video') {
      a = pos[m.id] || 0;
      if (a + sc.dur * 0.6 > m.dur) a = 0;
      b = Math.min(m.dur, a + sc.dur);
      pos[m.id] = b;
    }
    clips.push({ mid: m.id, in: a, out: b, fit: sc.fit || 'cover', kb: m.kind === 'image' && (sc.kb ?? true), fx: (sc.fx || []).map(f => ({ ...f })), trans: { id: (sb.scenes[i + 1] && sc.trans) || 'none', dur: 0.4, text: 'WOW' }, isVideo: m.kind === 'video' });
    plan.push(sc);
  });
  return {
    clips, plan, vals: v,
    items: (starts, durs) => {
      const out = [];
      plan.forEach((sc, i) => {
        for (const x of sc.items || []) {
          const st = starts[i] + x.t, d = x.d == null ? Math.max(0.3, durs[i] - x.t) : Math.min(x.d, Math.max(0.3, durs[i] - x.t + (x.item.kind === 'sfx' ? 2 : 0)));
          if (x.t >= durs[i]) continue;
          out.push({ kind: x.item.kind, start: st, dur: x.item.kind === 'sfx' ? 0.5 : d, p: fill(x.item.p, v) });
        }
      });
      return out;
    },
  };
}
