// Modelos de texto animado e modelos de legenda.
import { defaultMarker } from './markers.js';

const Y = '#FFDE00', R = '#EB1E28', W = '#FFFFFF', K = '#111111';
const T = (o) => ({ kind: 'text', p: { text: 'SEU TEXTO', font: 'Poppins', size: .09, color: W, stroke: '#000000', bg: '', x: .5, y: .3, anim: 'pop', upper: true, full: false, rot: 0, ...o } });

// cada modelo: itens (com início relativo "at" e duração "dur")
export const TEXT_PRESETS = [
  { id: 'impacto', name: 'Impacto amarelo', items: [T({ text: 'OLHA ISSO', font: 'Anton', size: .13, color: Y, anim: 'pop' })] },
  { id: 'limpo', name: 'Título limpo', items: [T({ text: 'Título do vídeo', font: 'Montserrat', size: .08, stroke: '', anim: 'fade', upper: false })] },
  { id: 'l3d', name: 'Letras 3D', items: [T({ text: 'IMPORTANTE', font: 'Anton', size: .12, color: Y, anim: 'letters3d' })] },
  { id: 'neonazul', name: 'Neon azul', items: [T({ text: 'NOITE', font: 'Bebas Neue', size: .14, color: '#22D3EE', stroke: '', anim: 'neon' })] },
  { id: 'neonrosa', name: 'Neon rosa', items: [T({ text: 'PROMOÇÃO', font: 'Bebas Neue', size: .14, color: '#F472B6', stroke: '', anim: 'neon' })] },
  { id: 'glitch', name: 'Glitch', items: [T({ text: 'ERRO 404', font: 'Anton', size: .12, anim: 'glitch' })] },
  { id: 'maquina', name: 'Máquina de escrever', items: [T({ text: 'enquanto isso...', font: 'Courier Prime', size: .06, stroke: '', bg: 'rgba(0,0,0,.7)', anim: 'type', upper: false })] },
  { id: 'palavras', name: 'Palavra por palavra', items: [T({ text: 'UMA PALAVRA DE CADA VEZ', size: .08, anim: 'words' })] },
  { id: 'letras', name: 'Letra por letra', items: [T({ text: 'SURPRESA', font: 'Anton', size: .12, color: Y, anim: 'letters' })] },
  { id: 'onda', name: 'Onda', items: [T({ text: 'BOA VIBE', font: 'Anton', size: .12, color: '#34D399', anim: 'wave' })] },
  { id: 'marca', name: 'Marca-texto amarelo', items: [T({ text: 'ISSO É IMPORTANTE', size: .07, color: K, stroke: '', bg: Y, anim: 'highlight' })] },
  { id: 'marcarosa', name: 'Marca-texto rosa', items: [T({ text: 'DICA DE OURO', size: .07, color: W, stroke: '', bg: '#EC4899', anim: 'highlight' })] },
  { id: 'revelar', name: 'Revelar elegante', items: [T({ text: 'CAPÍTULO 1', font: 'Montserrat', size: .08, stroke: '', anim: 'reveal' })] },
  { id: 'cair', name: 'Cair de cima', items: [T({ text: 'CAIU!', font: 'Anton', size: .14, color: Y, anim: 'drop' })] },
  { id: 'girar', name: 'Girar entrando', items: [T({ text: 'NOVIDADE', font: 'Anton', size: .12, color: '#A78BFA', anim: 'spin' })] },
  { id: 'esticar', name: 'Esticar', items: [T({ text: 'BORA!', font: 'Anton', size: .15, color: Y, anim: 'stretch' })] },
  { id: 'tremer', name: 'Alerta tremendo', items: [T({ text: 'ATENÇÃO', font: 'Anton', size: .12, color: R, stroke: W, anim: 'shake' })] },
  { id: 'desfoque', name: 'Desfoque entrando', items: [T({ text: 'Era uma vez...', font: 'Montserrat', size: .07, stroke: '', anim: 'blurin', upper: false })] },
  { id: 'contorno', name: 'Contorno grosso', items: [T({ text: 'RESULTADO', font: 'Bebas Neue', size: .15, color: W, stroke: '#000000', anim: 'zoom' })] },
  { id: 'caixapreta', name: 'Caixa preta', items: [T({ text: 'O QUE NINGUÉM TE CONTA', size: .065, stroke: '', bg: 'rgba(0,0,0,.85)', anim: 'slide' })] },
  { id: 'urgente', name: 'Faixa urgente', items: [T({ text: 'URGENTE', font: 'Anton', size: .08, stroke: '', bg: R, full: true, anim: 'stretch' })] },
  { id: 'inclinado', name: 'Inclinado', items: [T({ text: 'NÃO PERCA', font: 'Anton', size: .1, color: K, stroke: '', bg: Y, rot: -6, anim: 'pop' })] },
  { id: 'piscando', name: 'Piscando', items: [T({ text: 'AO VIVO', font: 'Anton', size: .07, stroke: '', bg: R, anim: 'blink' })] },
  { id: 'quicar', name: 'Quicando', items: [T({ text: 'UHUL!', font: 'Anton', size: .14, color: '#F97316', anim: 'bounce' })] },
  { id: 'gibi', name: 'Gibi (quadrinhos)', items: [T({ text: 'POW!', font: 'Bangers', size: .16, color: Y, stroke: K, rot: -8, anim: 'pop' })] },
  { id: 'manuscrita', name: 'Manuscrita', items: [T({ text: 'Com carinho', font: 'Pacifico', size: .09, stroke: '', anim: 'reveal', upper: false })] },
  { id: 'redonda', name: 'Redonda divertida', items: [T({ text: 'BORA!', font: 'Lilita One', size: .13, color: '#F472B6', stroke: W, anim: 'bounce' })] },
  { id: 'oswald', name: 'Notícia (Oswald)', items: [T({ text: 'ÚLTIMA HORA', font: 'Oswald', size: .08, color: W, stroke: '', bg: R, anim: 'stretch' })] },
  { id: 'gibibalao', name: 'Balão de quadrinho', items: [{ kind: 'bubble', p: { text: 'Uau!', x: .5, y: .3, size: .07, tail: 'baixo' } }] },
  { id: 'combo', name: 'Título + subtítulo', items: [T({ text: 'GRANDE TÍTULO', font: 'Anton', size: .11, color: Y, y: .28 }), { ...T({ text: 'um subtítulo explicando', font: 'Poppins', size: .045, stroke: '', y: .36, anim: 'fade', upper: false }), at: .4 }] },
  { id: 'pergunta', name: 'Pergunta', items: [T({ text: 'VOCÊ SABIA?', font: 'Anton', size: .1, color: W, stroke: '', bg: '#7C3AED', anim: 'pop' }), { kind: 'emoji', p: { text: '🤔', x: .78, y: .2, size: .14, anim: 'bounce' }, at: .3 }] },
  { id: 'nome', name: 'Nome na tela', items: [{ kind: 'lower', p: { name: 'NOME DA PESSOA', role: 'Cargo ou cidade', color: Y, x: .05, y: .74 } }] },
  { id: 'etiqueta', name: 'Etiqueta', items: [{ kind: 'pill', p: { text: 'PARTE 1', bg: Y, color: K, x: .5, y: .12, size: .045 } }] },
  { id: 'manchete', name: 'Manchete', items: [{ kind: 'r_headline', p: { tag: 'LOCAL · DATA', l1: 'MANCHETE EM BRANCO', l2: 'LINHA EM AMARELO', tagColor: R, color2: Y, alpha: .8, x: .5, y: .07 } }] },
  { id: 'esperafinal', name: 'Espera o final', items: [{ kind: 'r_blink', p: { text: 'ESPERA O FINAL', size: .05, hz: 3, color: W, bg: R, x: .5, y: .2 } }] },
  { id: 'numero', name: 'Número gigante', items: [{ kind: 'counter', p: { from: 0, to: 100, decimals: 0, prefix: '', suffix: '%', label: 'DOS ENTREVISTADOS', color: Y, x: .5, y: .4, size: .16 } }] },
  { id: 'citacao', name: 'Citação', items: [{ kind: 'c_quote', p: { bg: 'video', fonte: '', speed: 1, text: 'Escreva aqui a frase de alguém.', author: 'NOME, ANO' } }] },
];

// modelos de legenda (estilo + cores + fonte + marcador)
const C = (o) => ({ on: true, style: 'karaoke', maxWords: 3, x: .5, y: .7, size: 1.05, color: W, active: Y, strong: R, font: 'Poppins', upper: true, star: false, marker: { ...defaultMarker(), on: false }, ...o });
export const CAPTION_PRESETS = [
  { id: 'viral', name: 'Viral amarelo', cap: C({}) },
  { id: 'gigante', name: 'Uma palavra gigante', cap: C({ style: 'one', maxWords: 1, font: 'Anton', size: 1.1, y: .6, active: W, strong: Y }) },
  { id: 'caixa', name: 'Caixa na palavra', cap: C({ style: 'box', active: Y, size: .95, y: .74 }) },
  { id: 'caixavermelha', name: 'Caixa vermelha', cap: C({ style: 'box', active: R, strong: Y, size: .95, y: .74 }) },
  { id: 'estrela', name: 'Estrela pulando', cap: C({ marker: { ...defaultMarker(), on: true, type: 'star', color: R } }) },
  { id: 'coracao', name: 'Coração pulando', cap: C({ active: '#F472B6', strong: '#F472B6', marker: { ...defaultMarker(), on: true, type: 'heart', color: '#EC4899' } }) },
  { id: 'fogo', name: 'Fogo nas fortes', cap: C({ active: '#F97316', marker: { ...defaultMarker(), on: true, type: 'dot', color: '#F97316', strongType: 'fire', strongColor: '#F97316' } }) },
  { id: 'destaque', name: 'Destaque atrás', cap: C({ marker: { ...defaultMarker(), on: true, type: 'circle', pos: 'atras', color: Y, size: 1 } }) },
  { id: 'neon', name: 'Neon', cap: C({ style: 'neon', color: '#A5F3FC', active: '#22D3EE', font: 'Bebas Neue', size: 1.2 }) },
  { id: 'preenchendo', name: 'Preenchendo verde', cap: C({ style: 'fill', active: '#22C55E', strong: Y, upper: false, size: .95 }) },
  { id: 'classica', name: 'Clássica (YouTube)', cap: C({ style: 'classic', maxWords: 6, y: .86, size: .8, upper: false }) },
  { id: 'podcast', name: 'Podcast em 2 linhas', cap: C({ style: 'karaoke', maxWords: 6, y: .8, size: .8, upper: false, active: '#F59E0B' }) },
  { id: 'minimal', name: 'Minimalista', cap: C({ style: 'classic', maxWords: 4, size: .7, y: .78, upper: false, font: 'Montserrat' }) },
  { id: 'maquina', name: 'Máquina', cap: C({ style: 'fill', font: 'Courier Prime', upper: false, active: W, color: '#A1A1AA', size: .85 }) },
  { id: 'pincel', name: 'Pincel', cap: C({ font: 'Permanent Marker', upper: false, active: '#FDE047', size: 1 }) },
  { id: 'gibi', name: 'Gibi', cap: C({ font: 'Bangers', size: 1.15, active: Y, strong: R }) },
  { id: 'redonda', name: 'Redonda', cap: C({ font: 'Lilita One', active: '#F472B6', size: 1.05 }) },
  { id: 'oswald', name: 'Notícia', cap: C({ style: 'box', font: 'Oswald', active: R, strong: Y, size: .95 }) },
  { id: 'centro', name: 'No meio da tela', cap: C({ y: .5, size: 1.2, font: 'Anton', active: '#22D3EE' }) },
];
