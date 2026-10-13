// Painéis de edição (folhas que sobem de baixo).
import { h, section, slider, chips, swatches, toggle, btn, textInput, numInput, toast, confirmBox } from './ui.js';
import { TRANSITIONS, EFFECTS, TRANS_BY_ID, FX_BY_ID } from './effects.js';
import { ELEMENTS, TEXT_ANIMS } from './overlays.js';
import { CAPTION_STYLES } from './captions.js';
import { FONT_CHOICES } from './fonts.js';
import { SFX_LIST, BEAT_STYLES, ELEMENT_SFX } from './audio.js';
import { QUALITIES } from './export.js';
import { FORMATS, layout, clipDur, transDur, fmtTime } from './project.js';

const pct = v => Math.round(v * 100) + '%';
const sec = v => v.toFixed(1).replace('.', ',') + ' s';

// ------------------------------------------------------------------ clipe
export function clipPanel(app, clip, tab = 'speed') {
  const m = app.project.media[clip.mid] || {};
  const body = h('div');
  const tabs = chips([
    { id: 'speed', name: 'Velocidade' }, { id: 'vol', name: 'Volume' }, { id: 'frame', name: 'Enquadrar' },
    { id: 'fx', name: 'Efeitos do clipe' }, { id: 'more', name: 'Mais' },
  ], tab, id => fill(id), 'tabs');
  const area = h('div');
  body.append(tabs, area);
  function fill(t) {
    app.framing = t === 'frame';
    area.innerHTML = '';
    if (t === 'speed') {
      area.append(
        chips([0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3].map(v => ({ id: v, name: String(v).replace('.', ',') + 'x' })), clip.speed || 1, v => { clip.speed = v; app.commit(); }),
        slider('Velocidade', 0.1, 4, 0.05, clip.speed || 1, v => { clip.speed = v; app.live(true); }, v => v.toFixed(2).replace('.', ',') + 'x', () => app.commit()),
        h('p', { class: 'hint' }, 'A duração do clipe muda junto. Na prévia o som acompanha a velocidade.'),
      );
      if (m.kind === 'image') area.append(slider('Duração da foto', 0.5, 15, 0.1, clip.out - clip.in, v => { clip.out = clip.in + v; app.live(true); }, sec, () => app.commit()));
    }
    if (t === 'vol') {
      area.append(
        slider('Volume deste clipe', 0, 2, 0.05, clip.vol ?? 1, v => { clip.vol = v; app.live(); }, pct, () => app.commit()),
        btn(clip.vol > 0 ? 'Silenciar clipe' : 'Ativar som', () => { clip.vol = clip.vol > 0 ? 0 : 1; app.commit(); fill('vol'); }),
      );
    }
    if (t === 'frame') {
      area.append(
        chips([{ id: 'cover', name: 'Preencher' }, { id: 'blur', name: 'Caber + fundo desfocado' }, { id: 'contain', name: 'Caber + fundo preto' }], clip.fit, v => { clip.fit = v; app.commit(); }),
        slider('Zoom', 0.5, 3, 0.01, clip.zoom || 1, v => { clip.zoom = v; app.live(); }, v => v.toFixed(2).replace('.', ',') + 'x', () => app.commit()),
        slider('Horizontal', -0.6, 0.6, 0.005, clip.x || 0, v => { clip.x = v; app.live(); }, v => Math.round(v * 100), () => app.commit()),
        slider('Vertical', -0.6, 0.6, 0.005, clip.y || 0, v => { clip.y = v; app.live(); }, v => Math.round(v * 100), () => app.commit()),
        toggle('Zoom lento automático', clip.kb, v => { clip.kb = v; app.commit(); }),
        h('p', { class: 'hint' }, 'Dica: com esta aba aberta, arraste o vídeo na prévia para reposicionar e use dois dedos para dar zoom.'),
        btn('Aplicar este enquadramento em todos os clipes', () => { for (const c of app.project.clips) { c.fit = clip.fit; c.zoom = clip.zoom; c.x = clip.x; c.y = clip.y; } app.commit(); toast('Aplicado em todos'); }),
      );
    }
    if (t === 'fx') {
      const list = h('div');
      const draw = () => {
        list.innerHTML = '';
        for (const f of clip.fx) {
          const fx = FX_BY_ID[f.id]; if (!fx) continue;
          list.append(h('div', { class: 'fxrow' }, h('b', {}, fx.name),
            slider('Intensidade', 0, 1, 0.01, f.i ?? fx.def.i, v => { f.i = v; app.live(); }, pct, () => app.commit()),
            btn('Remover', () => { clip.fx = clip.fx.filter(x => x !== f); app.commit(); draw(); }, 'sm')));
        }
        if (!clip.fx.length) list.append(h('p', { class: 'hint' }, 'Nenhum efeito neste clipe. Escolha abaixo: ele vale do começo ao fim do clipe.'));
      };
      draw();
      area.append(list, fxGrid(EFFECTS.filter(e => !e.timeRemap), id => { clip.fx.push({ id, i: FX_BY_ID[id].def.i }); app.commit(); draw(); }));
    }
    if (t === 'more') {
      area.append(
        h('div', { class: 'brow' },
          btn('Dividir no cursor', () => app.splitAtPlayhead()),
          btn('Duplicar', () => app.duplicateClip(clip)),
          btn('◀ Mover', () => app.moveClip(clip, -1)),
          btn('Mover ▶', () => app.moveClip(clip, 1)),
        ),
        m.kind !== 'image' && m.hasAudio ? btn('✂ Cortar silêncios deste clipe', () => app.cutSilences([clip])) : null,
        m.kind !== 'image' ? btn('Separar o som (usar como música)', () => { app.project.audio.music = { mid: clip.mid, vol: 1, start: clip.in }; clip.vol = 0; app.commit(); toast('O som foi para a faixa de música'); }) : null,
        btn('Excluir clipe', () => app.deleteSelected(), 'danger'),
      );
    }
  }
  fill(tab);
  app.openSheet('Clipe', body, { onClose: () => { app.framing = false; } });
}

function fxGrid(list, onPick) {
  const groups = {};
  for (const e of list) (groups[e.group] = groups[e.group] || []).push(e);
  return h('div', {}, Object.entries(groups).map(([g, arr]) => section(g, h('div', { class: 'grid' }, arr.map(e => {
    const b = h('button', { class: 'gi', type: 'button' }, h('span', { class: 'gi-i' }, '✦'), e.name);
    b.addEventListener('click', () => onPick(e.id));
    return b;
  })))));
}

// ------------------------------------------------------------------ transição
export function transitionPanel(app, i) {
  const p = app.project;
  const c = p.clips[i];
  if (!c || !p.clips[i + 1]) return;
  c.trans = c.trans || { id: 'none', dur: 0.4, text: 'WOW' };
  const body = h('div');
  const grid = h('div', { class: 'grid' });
  const extra = h('div');
  const draw = () => {
    grid.innerHTML = '';
    for (const t of TRANSITIONS) {
      const b = h('button', { class: 'gi' + (c.trans.id === t.id ? ' on' : ''), type: 'button' }, h('span', { class: 'gi-i' }, t.id === 'none' ? '│' : '⧓'), t.name);
      b.addEventListener('click', () => {
        c.trans.id = t.id;
        if (t.dur) c.trans.dur = t.dur;
        app.commit(); draw();
        const L = layout(p); app.setTime(Math.max(0, L.starts[i + 1] - Math.max(0.6, transDur(p, i)))); app.preview.play();
      });
      grid.append(b);
    }
    extra.innerHTML = '';
    if (c.trans.id !== 'none') {
      extra.append(slider('Duração', 0.15, 2, 0.05, c.trans.dur, v => { c.trans.dur = v; app.live(); }, sec, () => app.commit()));
      if (c.trans.id === 'mask') extra.append(h('div', { class: 'sec-t' }, 'Texto da máscara'), textInput(c.trans.text, v => { c.trans.text = v || 'WOW'; app.live(); }, { onCommit: () => app.commit() }));
    }
  };
  draw();
  body.append(extra, grid, h('div', { class: 'brow' },
    btn('Usar em todas', () => { p.clips.forEach((x, k) => { if (k < p.clips.length - 1) x.trans = { ...c.trans }; }); app.commit(); toast('Aplicada em todas as emendas'); }),
    btn('Sortear diferentes', () => {
      const pool = TRANSITIONS.filter(t => t.id !== 'none' && t.id !== 'mask');
      const used = new Set();
      p.clips.forEach((x, k) => {
        if (k >= p.clips.length - 1) return;
        let t; let guard = 0;
        do { t = pool[Math.floor(Math.random() * pool.length)]; } while (used.has(t.id) && used.size < pool.length && guard++ < 50);
        used.add(t.id); x.trans = { id: t.id, dur: t.dur, text: 'WOW' };
      });
      app.commit(); draw(); toast('Cada emenda ganhou uma transição diferente');
    }),
    btn('Tirar todas', () => { p.clips.forEach(x => x.trans = { id: 'none', dur: 0.4, text: 'WOW' }); app.commit(); draw(); }),
  ));
  app.sel = { type: 'trans', index: i };
  app.openSheet('Transição', body);
}

// ------------------------------------------------------------------ elementos
export function elementsPanel(app) {
  const grid = h('div', { class: 'grid' }, ELEMENTS.map(e => {
    const b = h('button', { class: 'gi', type: 'button' }, h('span', { class: 'gi-i' }, ICON[e.kind] || '◻'), e.name);
    b.addEventListener('click', async () => {
      const p = JSON.parse(JSON.stringify(e.p));
      if (e.needsImage) {
        const mid = await app.importImageForItem(); if (!mid) return; p.mid = mid;
      }
      const dur = e.whole ? layout(app.project).total : e.kind === 'card' ? 2.5 : e.kind === 'confetti' ? 2.5 : e.kind === 'stamp' ? 1.8 : 3;
      const it = app.addItem(e.kind, p, e.whole ? 0 : null, dur);
      itemPanel(app, it);
    });
    return b;
  }));
  app.openSheet('Elementos', h('div', {}, h('p', { class: 'hint' }, 'O elemento entra na posição do cursor. Depois você arrasta na prévia e ajusta a duração na linha do tempo.'), grid));
}

const ICON = { pill: '⬭', checklist: '☑', people: '👥', map: '🗺', bars: '▥', module: '▣', floaters: '◌', blurbox: '▒', like: '♥', click: '↖', tap: '☝', bell: '🔔', notif: '▭', swipe: '⌃', comment: '💬', poll: '▤', arrows: '»', share: '↪', text: '𝐓', stamp: '⛝', counter: '#', censor: '▬', knockout: '◩', card: '▣', emoji: '☺', arrow: '➜', circle: '◯', confetti: '✺', progress: '▭', image: '🖼', lower: '▤', follow: '♥', bubble: '💬' };

// ------------------------------------------------------------------ editor de item
export function itemPanel(app, it) {
  const q = it.p;
  const L = layout(app.project);
  const body = h('div');
  const live = () => app.live();
  const commit = () => app.commit();
  const field = (label, key, multiline = false) => h('div', {}, h('div', { class: 'sec-t' }, label), textInput(q[key], v => { q[key] = v; live(); }, { multiline, onCommit: commit }));

  switch (it.kind) {
    case 'text':
      body.append(
        field('Texto', 'text', true),
        section('Fonte', chips(FONT_CHOICES.map(f => ({ id: f.id, name: f.name })), q.font, v => { q.font = v; commit(); })),
        slider('Tamanho', 0.03, 0.25, 0.005, q.size, v => { q.size = v; live(); }, v => Math.round(v * 100), commit),
        section('Cor do texto', swatches(q.color, v => { q.color = v; commit(); })),
        section('Contorno', swatches(q.stroke, v => { q.stroke = v; commit(); }, { none: true, colors: ['#000000', '#FFFFFF', '#E1251B', '#FFE600'] })),
        section('Fundo', swatches(q.bg, v => { q.bg = v; commit(); }, { none: true, colors: ['#FFE600', '#000000', '#FFFFFF', '#E1251B', 'rgba(0,0,0,.6)', '#22C55E', '#3B82F6', '#A855F7'] })),
        section('Animação', chips(TEXT_ANIMS, q.anim, v => { q.anim = v; commit(); app.replayItem(it); })),
        toggle('MAIÚSCULAS', q.upper, v => { q.upper = v; commit(); }),
        toggle('Faixa de lado a lado', q.full, v => { q.full = v; commit(); }),
        slider('Inclinação', -30, 30, 1, q.rot || 0, v => { q.rot = v; live(); }, v => v + '°', commit),
      );
      break;
    case 'stamp':
      body.append(field('Texto do carimbo', 'text'),
        section('Cor', swatches(q.color, v => { q.color = v; commit(); })),
        slider('Tamanho', 0.06, 0.3, 0.005, q.size, v => { q.size = v; live(); }, v => Math.round(v * 100), commit),
        slider('Inclinação', -45, 45, 1, q.rot, v => { q.rot = v; live(); }, v => v + '°', commit));
      break;
    case 'counter':
      body.append(h('div', { class: 'nrow' },
        numInput('De', q.from, v => { q.from = v; live(); }, commit), numInput('Até', q.to, v => { q.to = v; live(); }, commit), numInput('Casas decimais', q.decimals, v => { q.decimals = Math.max(0, Math.min(3, Math.round(v))); live(); }, commit)),
        h('div', { class: 'nrow' }, h('div', {}, h('div', { class: 'sec-t' }, 'Antes'), textInput(q.prefix, v => { q.prefix = v; live(); }, { onCommit: commit, placeholder: 'R$ ' })), h('div', {}, h('div', { class: 'sec-t' }, 'Depois'), textInput(q.suffix, v => { q.suffix = v; live(); }, { onCommit: commit, placeholder: '%' }))),
        field('Legenda embaixo', 'label'),
        section('Cor', swatches(q.color, v => { q.color = v; commit(); })),
        slider('Tamanho', 0.06, 0.3, 0.005, q.size, v => { q.size = v; live(); }, v => Math.round(v * 100), commit));
      break;
    case 'censor':
      body.append(field('Texto na tarja', 'text'),
        slider('Largura', 0.1, 1, 0.01, q.w, v => { q.w = v; live(); }, pct, commit),
        slider('Altura', 0.02, 0.4, 0.005, q.h, v => { q.h = v; live(); }, pct, commit),
        section('Cor', swatches(q.color, v => { q.color = v; commit(); }, { colors: ['#000000', '#E1251B', '#FFE600', '#FFFFFF'] })));
      break;
    case 'knockout':
      body.append(field('Texto', 'text'),
        section('Fonte', chips(FONT_CHOICES.map(f => ({ id: f.id, name: f.name })), q.font, v => { q.font = v; commit(); })),
        slider('Tamanho', 0.1, 0.5, 0.005, q.size, v => { q.size = v; live(); }, v => Math.round(v * 100), commit),
        slider('Escurecer fora das letras', 0.3, 1, 0.01, q.dim, v => { q.dim = v; live(); }, pct, commit));
      break;
    case 'card':
      body.append(field('Título', 'title', true), field('Subtítulo', 'sub'), field('Chamada embaixo (opcional)', 'comment'),
        section('Cor de cima', swatches(q.bg, v => { q.bg = v; commit(); })),
        section('Cor de baixo', swatches(q.bg2, v => { q.bg2 = v; commit(); })),
        toggle('Confete', q.confetti, v => { q.confetti = v; commit(); }));
      break;
    case 'lower':
      body.append(field('Nome', 'name'), field('Cargo / descrição', 'role'), section('Cor do detalhe', swatches(q.color, v => { q.color = v; commit(); })));
      break;
    case 'follow':
      body.append(field('Texto do botão', 'text'), field('Seu @', 'handle'));
      break;
    case 'bubble':
      body.append(field('Texto', 'text', true), slider('Tamanho', 0.03, 0.12, 0.002, q.size, v => { q.size = v; live(); }, v => Math.round(v * 100), commit),
        section('Ponta', chips([{ id: 'baixo', name: 'Embaixo' }, { id: 'cima', name: 'Em cima' }], q.tail, v => { q.tail = v; commit(); })));
      break;
    case 'pill':
      body.append(field('Texto', 'text'), slider('Tamanho', 0.025, 0.1, 0.001, q.size, v => { q.size = v; live(); }, v => Math.round(v * 1000), commit),
        section('Fundo', swatches(q.bg, v => { q.bg = v; commit(); })), section('Texto', swatches(q.color, v => { q.color = v; commit(); })));
      break;
    case 'checklist':
      body.append(field('Itens (um por linha)', 'text', true),
        slider('Tamanho', 0.03, 0.09, 0.001, q.size, v => { q.size = v; live(); }, v => Math.round(v * 1000), commit),
        section('Cor do check', swatches(q.check, v => { q.check = v; commit(); })),
        section('Fundo', swatches(q.box, v => { q.box = v; commit(); }, { none: true, colors: ['rgba(0,0,0,.55)', '#000000', '#173B32', '#1E293B', '#FFFFFF'] })),
        h('p', { class: 'hint' }, 'Os itens aparecem apagados e acendem um por vez ao longo da duração do elemento.'));
      break;
    case 'people':
      body.append(h('div', { class: 'nrow' }, numInput('Total de pessoas', q.total, v => { q.total = Math.max(1, Math.min(50, Math.round(v))); live(); }, commit), numInput('Em destaque', q.hi, v => { q.hi = Math.max(0, Math.round(v)); live(); }, commit)),
        field('Texto embaixo', 'label'), section('Cor do destaque', swatches(q.color, v => { q.color = v; commit(); })));
      break;
    case 'map':
      body.append(h('div', {}, h('div', { class: 'sec-t' }, 'Estados em destaque (siglas: MT, BA, SP...)'), textInput(q.states, v => { q.states = v; live(); }, { onCommit: commit })),
        field('Texto embaixo', 'label'),
        slider('Tamanho', 0.3, 1, 0.01, q.size, v => { q.size = v; live(); }, pct, commit),
        section('Cor do destaque', swatches(q.color, v => { q.color = v; commit(); })),
        h('p', { class: 'hint' }, 'Mapa: @svg-maps (licença CC BY 4.0). O crédito já aparece no canto.'));
      break;
    case 'bars':
      body.append(field('Título', 'title'), field('Dados (um por linha, "Nome: valor")', 'text', true), section('Cor das barras', swatches(q.color, v => { q.color = v; commit(); })));
      break;
    case 'module':
      body.append(field('Número / etiqueta', 'num'), field('Título', 'title', true),
        section('Fundo', swatches(q.bg, v => { q.bg = v; commit(); }, { colors: ['#173B32', '#111111', '#1E3A8A', '#7C2D12', '#4C1D95', '#E1251B', '#FFFFFF'] })),
        section('Destaque', swatches(q.accent, v => { q.accent = v; commit(); })));
      break;
    case 'floaters':
      body.append(slider('Quantidade', 0.1, 1, 0.05, q.amount ?? .5, v => { q.amount = v; live(); }, pct, commit), section('Cor', swatches(q.color, v => { q.color = v; commit(); })));
      break;
    case 'blurbox':
      body.append(section('Tipo', chips([{ id: 'blur', name: 'Desfocar' }, { id: 'pixel', name: 'Pixelizar' }], q.mode, v => { q.mode = v; commit(); })),
        slider('Largura', 0.05, 1, 0.005, q.w, v => { q.w = v; live(); }, pct, commit),
        slider('Altura', 0.02, 1, 0.005, q.h, v => { q.h = v; live(); }, pct, commit),
        h('p', { class: 'hint' }, 'Use para esconder uma legenda antiga gravada no vídeo, uma placa ou um rosto. Arraste na prévia para posicionar.'));
      break;
    case 'like':
      body.append(field('Número embaixo (opcional)', 'count'), section('Cor', swatches(q.color, v => { q.color = v; commit(); })));
      break;
    case 'click': case 'tap':
      body.append(slider('Quantos cliques', 1, 6, 1, q.clicks || 2, v => { q.clicks = v; live(); }, v => v, commit));
      break;
    case 'bell': case 'swipe': case 'share':
      body.append(field('Texto', 'text'));
      if (it.kind === 'swipe') body.append(section('Cor', swatches(q.color, v => { q.color = v; commit(); })));
      break;
    case 'notif':
      body.append(field('Nome do app', 'app'), field('Título', 'title'), field('Mensagem', 'text'),
        slider('Altura', 0.03, 0.85, 0.005, q.y, v => { q.y = v; live(); }, pct, commit));
      break;
    case 'comment':
      body.append(field('Usuário', 'user'), field('Comentário', 'text', true), field('Curtidas', 'likes'));
      break;
    case 'poll':
      body.append(field('Pergunta', 'q'), field('Opção 1', 'a'), field('Opção 2', 'b'),
        slider('Resultado da opção 1', 0, 100, 1, q.pa ?? 50, v => { q.pa = v; live(); }, v => v + '%', commit));
      break;
    case 'arrows':
      body.append(section('Direção', chips([{ id: 'baixo', name: '↓' }, { id: 'cima', name: '↑' }, { id: 'esquerda', name: '←' }, { id: 'direita', name: '→' }], q.dir, v => { q.dir = v; commit(); })),
        section('Cor', swatches(q.color, v => { q.color = v; commit(); })));
      break;
    case 'emoji':
      body.append(section('Escolha', h('div', { class: 'emojis' }, ['🔥', '😱', '😂', '👏', '❤️', '👀', '✅', '❌', '⚠️', '💥', '🚨', '🤔', '💰', '📢', '⭐', '👇', '👉', '🙌', '😡', '🎉'].map(e => {
        const b = h('button', { type: 'button' }, e); b.addEventListener('click', () => { q.text = e; commit(); }); return b;
      }))), field('Ou digite', 'text'),
        slider('Tamanho', 0.06, 0.4, 0.005, q.size, v => { q.size = v; live(); }, v => Math.round(v * 100), commit),
        section('Animação', chips([{ id: 'pop', name: 'Pular' }, { id: 'bounce', name: 'Quicar' }], q.anim, v => { q.anim = v; commit(); })));
      break;
    case 'arrow':
      body.append(slider('Direção', -180, 180, 1, q.rot, v => { q.rot = v; live(); }, v => v + '°', commit),
        slider('Tamanho', 0.1, 0.6, 0.005, q.size, v => { q.size = v; live(); }, v => Math.round(v * 100), commit),
        section('Cor', swatches(q.color, v => { q.color = v; commit(); })));
      break;
    case 'circle':
      body.append(slider('Tamanho', 0.05, 0.5, 0.005, q.r, v => { q.r = v; live(); }, v => Math.round(v * 100), commit),
        section('Cor', swatches(q.color, v => { q.color = v; commit(); })));
      break;
    case 'progress':
      body.append(section('Cor', swatches(q.color, v => { q.color = v; commit(); })),
        section('Posição', chips([{ id: 'top', name: 'Em cima' }, { id: 'bottom', name: 'Embaixo' }], q.pos, v => { q.pos = v; commit(); })));
      break;
    case 'image':
      body.append(slider('Tamanho', 0.05, 1, 0.005, q.scale, v => { q.scale = v; live(); }, pct, commit),
        slider('Transparência', 0.1, 1, 0.01, q.opacity ?? 1, v => { q.opacity = v; live(); }, pct, commit),
        section('Animação', chips([{ id: 'pop', name: 'Pular' }, { id: 'fade', name: 'Aparecer' }, { id: 'none', name: 'Nenhuma' }], q.anim, v => { q.anim = v; commit(); })),
        toggle('Zoom lento (Ken Burns)', q.kb, v => { q.kb = v; commit(); }),
        field('Crédito (ex.: Foto: Autor, CC BY 4.0)', 'credit'),
        btn('Trocar imagem', async () => { const mid = await app.importImageForItem(); if (mid) { q.mid = mid; commit(); } }));
      break;
    case 'effect': {
      const fx = FX_BY_ID[q.fx];
      body.append(h('div', { class: 'sec-t' }, 'Efeito: ' + (fx ? fx.name : '')),
        slider('Intensidade', 0, 1, 0.01, q.i ?? (fx ? fx.def.i : 0.7), v => { q.i = v; live(); }, pct, commit));
      if (q.fx === 'pulse') body.append(slider('Batidas por minuto', 60, 180, 1, q.bpm || 126, v => { q.bpm = v; live(); }, v => v, commit));
      body.append(section('Trocar por', fxGrid(EFFECTS, id => { q.fx = id; q.i = FX_BY_ID[id].def.i; commit(); itemPanel(app, it); })));
      break;
    }
    case 'audio': {
      const m = app.project.media[q.mid] || {};
      body.append(h('p', {}, '🎙 ' + (m.name || 'Narração')),
        slider('Volume', 0, 2, 0.05, q.vol ?? 1, v => { q.vol = v; }, pct, commit),
        h('p', { class: 'hint' }, 'Arraste o bloco na linha do tempo para mudar onde começa; use as alças para cortar o começo ou o fim.'),
        !(app.project.transcripts[q.mid] || []).length ? btn('Gerar legenda desta narração', async () => { app.closeSheet(); await app.transcribeAll(); }) : null);
      break;
    }
    case 'sfx':
      body.append(section('Som', h('div', { class: 'grid' }, SFX_LIST.map(s => {
        const b = h('button', { class: 'gi' + (q.type === s.id ? ' on' : ''), type: 'button' }, h('span', { class: 'gi-i' }, '▶'), s.name);
        b.addEventListener('click', () => { q.type = s.id; app.preview.previewSfx(s.id); commit(); itemPanel(app, it); });
        return b;
      }))), slider('Volume', 0, 1.5, 0.05, q.vol ?? 0.8, v => { q.vol = v; }, pct, commit));
      break;
  }
  if (ELEMENT_SFX[it.kind]) body.append(toggle('Som automático deste elemento', q.sound !== false, v => { q.sound = v; commit(); }));

  // tempo
  const isSfx = it.kind === 'sfx' || it.kind === 'audio';
  body.append(section('Tempo',
    h('div', { class: 'brow' },
      btn('⇤ Começar no cursor', () => { app.moveItem(it, app.time); app.commit(); }),
      !isSfx ? btn('Até o fim do vídeo', () => { it.dur = Math.max(0.2, L.total - it.start); app.commit(); }) : null,
      !isSfx ? btn('Vídeo inteiro', () => { it.start = 0; it.dur = L.total; app.commit(); }) : null),
    !isSfx ? slider('Duração', 0.2, Math.max(1, Math.min(60, L.total)), 0.05, Math.min(it.dur, Math.max(1, L.total)), v => { it.dur = v; live(); }, sec, commit) : null,
  ));
  body.append(h('div', { class: 'brow' },
    btn('Duplicar', () => app.duplicateItem(it)),
    btn('Excluir', () => app.deleteSelected(), 'danger')));
  app.openSheet(ELEMENTS.find(e => e.kind === it.kind)?.name || (it.kind === 'effect' ? 'Efeito' : it.kind === 'sfx' ? 'Som' : 'Texto'), body);
}

// ------------------------------------------------------------------ efeitos
export function effectsPanel(app) {
  const durs = { flash: 0.4, zoompunch: 0.6, shake: 1, freeze: 1.2, stutter: 0.8, shockwave: 0.8, glitch: 0.8, scanner: 1 };
  const body = h('div', {},
    h('p', { class: 'hint' }, 'O efeito entra no cursor e vale para o trecho que você ajustar na linha do tempo. Para um efeito no clipe inteiro, toque no clipe e use "Efeitos do clipe".'),
    fxGrid(EFFECTS, id => {
      const it = app.addItem('effect', { fx: id, i: FX_BY_ID[id].def.i }, null, durs[id] || 1.5);
      app.replayItem(it);
      itemPanel(app, it);
    }));
  app.openSheet('Efeitos', body);
}

// ------------------------------------------------------------------ sons
export function soundsPanel(app) {
  const body = h('div', {}, h('p', { class: 'hint' }, 'Toque em ▶ para ouvir e em "+" para colocar no cursor.'),
    h('div', { class: 'list' }, SFX_LIST.map(s => h('div', { class: 'lrow' },
      btn('▶', () => app.preview.previewSfx(s.id), 'sm'), h('span', {}, s.name),
      btn('+', () => { const it = app.addItem('sfx', { type: s.id, vol: 0.8 }, null, 0.5); toast(s.name + ' adicionado'); }, 'sm pri')))));
  app.openSheet('Sons', body);
}

// ------------------------------------------------------------------ áudio
export function audioPanel(app) {
  const a = app.project.audio;
  const body = h('div');
  const draw = () => {
    body.innerHTML = '';
    const mu = a.music && app.project.media[a.music.mid] ? a.music : null;
    body.append(
      slider('Volume da voz / som dos vídeos', 0, 2, 0.05, a.voice ?? 1, v => { a.voice = v; }, pct, () => app.commit()),
      section('Música',
        mu ? h('div', {},
          h('div', { class: 'lrow' }, h('span', {}, '♪ ' + (app.project.media[mu.mid].name || 'Música')), btn('Remover', () => { a.music = null; app.commit(); draw(); }, 'sm danger')),
          slider('Volume da música', 0, 1.5, 0.05, mu.vol ?? 0.5, v => { mu.vol = v; }, pct, () => app.commit()),
          slider('Começar a música em', 0, Math.max(1, app.project.media[mu.mid].dur - 1), 0.5, mu.start || 0, v => { mu.start = v; }, v => fmtTime(v), () => app.commit()),
        ) : btn('+ Escolher música do celular', async () => { await app.importMusic(); draw(); }, 'pri'),
        toggle('Abaixar a música quando alguém fala', a.duck, v => { a.duck = v; app.commit(); }),
      ),
      section('Narração',
        h('div', { class: 'brow' },
          btn('🎙 Gravar narração', () => { app.closeSheet(); app.recordNarration(); }, 'pri'),
          btn('＋ Áudio do celular', async () => { await app.addNarrationFile(); draw(); })),
        h('p', { class: 'hint' }, 'A narração entra no cursor. Na gravação, o vídeo toca sem som para você acompanhar. Depois dá para gerar legenda dela em Legendas.'),
      ),
      section('Batida automática',
        toggle('Ligar batida', a.beat.on, v => { a.beat.on = v; app.commit(); draw(); }),
        a.beat.on ? h('div', {},
          chips(BEAT_STYLES, a.beat.style, v => { a.beat.style = v; app.commit(); }),
          slider('Velocidade (BPM)', 90, 160, 1, a.beat.bpm, v => { a.beat.bpm = v; }, v => v, () => app.commit()),
          slider('Volume da batida', 0, 1, 0.05, a.beat.vol, v => { a.beat.vol = v; }, pct, () => app.commit())) : null,
      ),
      section('Acabamento',
        toggle('Sons automáticos nas transições e elementos', a.sfxAuto, v => { a.sfxAuto = v; app.commit(); }),
        toggle('Volume padrão de rede social (-14 LUFS)', a.loud, v => { a.loud = v; app.commit(); }),
      ),
    );
  };
  draw();
  app.openSheet('Áudio', body);
}

// ------------------------------------------------------------------ legendas
export function captionsPanel(app) {
  const p = app.project, cap = p.captions;
  const body = h('div');
  const pending = app.mediaNeedingTranscript();
  const draw = () => {
    body.innerHTML = '';
    const has = Object.values(p.transcripts).some(w => w && w.length);
    body.append(
      pending.length || !has ? h('div', { class: 'callout' },
        h('p', {}, has ? 'Alguns vídeos ainda não têm legenda.' : 'Gere a legenda automática a partir da fala dos vídeos. Na primeira vez o app baixa o reconhecimento de voz (cerca de 250 MB); depois funciona sem internet.'),
        btn('🎙 Gerar legenda automática', async () => { await app.transcribeAll(); captionsPanel(app); }, 'pri')) : null,
      toggle('Mostrar legenda', cap.on, v => { cap.on = v; app.commit(); }),
      section('Estilo', chips(CAPTION_STYLES, cap.style, v => { cap.style = v; app.commit(true); })),
      slider('Palavras por vez', 1, 6, 1, cap.maxWords, v => { cap.maxWords = v; app.live(true); }, v => v, () => app.commit(true)),
      slider('Tamanho', 0.5, 1.8, 0.05, cap.size, v => { cap.size = v; app.live(); }, pct, () => app.commit()),
      slider('Altura na tela', 0.08, 0.92, 0.005, cap.y, v => { cap.y = v; app.live(); }, v => Math.round(v * 100) + '%', () => app.commit()),
      section('Cor do texto', swatches(cap.color, v => { cap.color = v; app.commit(); })),
      section('Cor da palavra falada', swatches(cap.active, v => { cap.active = v; app.commit(); })),
      section('Cor das palavras fortes', swatches(cap.strong, v => { cap.strong = v; app.commit(); })),
      section('Fonte', chips(FONT_CHOICES.map(f => ({ id: f.id, name: f.name })), cap.font, v => { cap.font = v; app.commit(); })),
      toggle('MAIÚSCULAS', cap.upper, v => { cap.upper = v; app.commit(); }),
      toggle('Estrelinha pulando na palavra', cap.star, v => { cap.star = v; app.commit(); }),
      has ? btn('✎ Corrigir texto e marcar palavras fortes', () => captionsEditor(app), 'pri') : null,
      has ? btn('Apagar toda a legenda', async () => { if (await confirmBox('Apagar a legenda de todos os vídeos?', 'Apagar')) { p.transcripts = {}; app.commit(true); draw(); } }, 'danger') : null,
    );
  };
  draw();
  app.sel = { type: 'captions' };
  app.openSheet('Legendas', body);
}

// edição linha a linha
export function captionsEditor(app) {
  const p = app.project;
  const pages = app.renderer.captionsFor(p, app.capVersion);
  const list = h('div', { class: 'capedit' });
  for (const pg of pages) {
    const row = h('div', { class: 'cerow' });
    const time = btn(fmtTime(pg.start), () => { app.setTime(pg.start + 0.01); }, 'sm');
    const inp = textInput(pg.words.map(w => w.w).join(' '), () => { }, {
      onCommit: v => { app.editCaptionPage(pg, v); },
    });
    const words = h('div', { class: 'cw' }, pg.words.map(w => {
      const b = h('button', { class: 'wchip' + (w.strong ? ' strong' : ''), type: 'button' }, w.w);
      b.addEventListener('click', () => {
        const arr = p.transcripts[w.mid]; if (!arr || !arr[w.k]) return;
        arr[w.k].strong = !arr[w.k].strong; b.classList.toggle('strong'); app.commit(true);
      });
      return b;
    }));
    row.append(h('div', { class: 'cetop' }, time, inp), words);
    list.append(row);
  }
  app.openSheet('Corrigir legenda', h('div', {},
    h('p', { class: 'hint' }, 'Corrija o texto de cada trecho (o tempo é ajustado sozinho). Toque numa palavra para deixá-la na cor forte. Toque no horário para ver o trecho.'),
    list), { back: () => captionsPanel(app) });
}

// ------------------------------------------------------------------ formato
export function formatPanel(app) {
  const p = app.project;
  const body = h('div', {},
    section('Formato do vídeo', chips(Object.keys(FORMATS).map(k => ({ id: k, name: { '9:16': '9:16 Reels/Status', '1:1': '1:1 Quadrado', '4:5': '4:5 Feed', '16:9': '16:9 YouTube' }[k] })), p.format, v => { p.format = v; app.applyFormat(); app.commit(); })),
    section('Enquadramento de todos os clipes', chips([{ id: 'cover', name: 'Preencher' }, { id: 'blur', name: 'Caber + fundo desfocado' }, { id: 'contain', name: 'Caber + fundo preto' }], (p.clips[0] || {}).fit || 'cover', v => { for (const c of p.clips) c.fit = v; app.commit(); })),
    section('Quadros por segundo', chips([{ id: 24, name: '24' }, { id: 30, name: '30' }, { id: 60, name: '60' }], p.fps, v => { p.fps = v; app.commit(); })),
  );
  app.openSheet('Formato', body);
}

// ------------------------------------------------------------------ exportar
export function exportPanel(app) {
  let q = QUALITIES[1];
  const L = layout(app.project);
  const body = h('div', {},
    h('p', {}, `Duração: ${fmtTime(L.total)} · ${app.project.format} · ${app.project.fps} quadros por segundo`),
    section('Qualidade', chips(QUALITIES, q.id, (id, o) => { q = o; })),
    h('p', { class: 'hint' }, 'A exportação acontece no próprio celular. Deixe o app aberto e a tela ligada até terminar.'),
    btn('Exportar vídeo', () => { app.closeSheet(); app.runExport(q); }, 'pri big'));
  app.openSheet('Exportar', body);
}

// ------------------------------------------------------------------ modelos
import { TEMPLATES, applyTemplate } from './templates.js';
import { Renderer } from './render.js';
import { newProject, newClip, dims as dimsOf } from './project.js';

let tplRenderer = null;

async function stillOf(app) {
  const p = app.project, c = p.clips[0];
  if (!c) return null;
  const m = p.media[c.mid];
  try {
    if (m.kind === 'image') return await app.preview.image(c.mid);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = app.previewUrlOf(c.mid);
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; setTimeout(rej, 8000); });
    v.currentTime = Math.min(m.dur - 0.1, (c.in + c.out) / 2);
    await new Promise((res, rej) => { v.onseeked = res; setTimeout(rej, 8000); });
    const b = await createImageBitmap(v);
    v.removeAttribute('src'); v.load();
    return b;
  } catch (e) { return null; }
}

async function renderTemplatePreview(tpl, still, opt) {
  const p = newProject('prévia');
  const w = still ? still.width : 720, h = still ? still.height : 1280;
  p.media.still = { id: 'still', kind: 'image', dur: 4, w, h, hasAudio: false };
  const a = newClip(p.media.still, { dur: 4 }); a.kb = false;
  const b = newClip(p.media.still, { dur: 4 }); b.kb = false;
  p.clips = [a, b];
  p.transcripts.still = 'assim fica a sua legenda no vídeo com este modelo'.split(' ').map((x, i) => ({ w: x, s: 2.6 + i * 0.3, e: 2.6 + i * 0.3 + 0.27 }));
  applyTemplate(p, tpl, { ...opt, title: opt.title || 'SEU TÍTULO', handle: opt.handle || '@seuperfil' });
  const [W, H] = dimsOf(p);
  const k = 200 / Math.max(W, H);
  if (!tplRenderer) { const c = document.createElement('canvas'); tplRenderer = new Renderer(c); }
  tplRenderer.setSize(Math.round(W * k), Math.round(H * k));
  const fallback = document.createElement('canvas'); fallback.width = 9; fallback.height = 16;
  const fx = fallback.getContext('2d'); const g = fx.createLinearGradient(0, 0, 9, 16); g.addColorStop(0, '#334155'); g.addColorStop(1, '#0f766e'); fx.fillStyle = g; fx.fillRect(0, 0, 9, 16);
  const src = still || fallback;
  await tplRenderer.render(p, 3.4, { frame: () => ({ source: src, w, h }) }, { capVersion: Math.random() });
  const out = document.createElement('canvas');
  out.width = tplRenderer.out.width; out.height = tplRenderer.out.height;
  out.getContext('2d').drawImage(tplRenderer.out, 0, 0);
  return out;
}

export function templatesPanel(app, afterImport = false) {
  const p = app.project;
  let store = {};
  try { store = JSON.parse(localStorage.getItem('ed.tpl') || '{}'); } catch (e) { }
  const opt = { title: '', handle: store.handle || '', intro: true, outro: true, trans: true, music: true };
  let chosen = p.template || null;
  const grid = h('div', { class: 'tgrid' });
  const cards = new Map();
  for (const t of TEMPLATES) {
    const thumb = h('div', { class: 'tthumb', style: { background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`, aspectRatio: t.format.replace(':', '/') } });
    const card = h('button', { class: 'tcard' + (chosen === t.id ? ' on' : ''), type: 'button' }, thumb, h('b', {}, t.name), h('span', {}, t.desc));
    card.addEventListener('click', () => { chosen = t.id; for (const [id, c] of cards) c.classList.toggle('on', id === t.id); applyBtn.disabled = false; });
    cards.set(t.id, card);
    grid.append(card);
  }
  const applyBtn = btn('Aplicar modelo', async () => {
    const t = TEMPLATES.find(x => x.id === chosen);
    if (!t) return;
    try { localStorage.setItem('ed.tpl', JSON.stringify({ handle: opt.handle })); } catch (e) { }
    applyTemplate(p, t, opt);
    app.applyFormat();
    app.commit();
    app.closeSheet();
    app.setTime(0);
    toast('Modelo "' + t.name + '" aplicado. Dá para mudar qualquer coisa depois.', 3500);
    if (app.mediaNeedingTranscript().length && await confirmBox('Gerar a legenda automática agora? O app escuta a fala e escreve sozinho.', 'Gerar legenda')) app.transcribeAll();
  }, 'pri big');
  applyBtn.disabled = !chosen;
  const body = h('div', {},
    afterImport ? h('p', { class: 'hint' }, 'Escolha um modelo para começar já com tudo pronto, ou toque em OK para editar do zero.') : null,
    h('div', { class: 'nrow' },
      h('div', {}, h('div', { class: 'sec-t' }, 'Título do vídeo (opcional)'), textInput('', v => { opt.title = v; }, { placeholder: 'Ex.: 3 dicas de saúde' })),
      h('div', {}, h('div', { class: 'sec-t' }, 'Seu @ (opcional)'), textInput(opt.handle, v => { opt.handle = v; }, { placeholder: '@seuperfil' }))),
    h('div', { class: 'tgl2' },
      toggle('Abertura e final', true, v => { opt.intro = v; opt.outro = v; }),
      toggle('Transições', true, v => { opt.trans = v; }),
      toggle('Batida / trilha', true, v => { opt.music = v; })),
    grid, applyBtn);
  app.openSheet('Modelos', body);
  // prévias com um quadro do próprio vídeo
  (async () => {
    const still = await stillOf(app);
    for (const t of TEMPLATES) {
      if (!document.body.contains(grid)) return;
      try {
        const c = await renderTemplatePreview(t, still, opt);
        const th = cards.get(t.id).querySelector('.tthumb');
        th.style.background = '#000'; th.innerHTML = ''; th.append(c);
      } catch (e) { console.warn('prévia do modelo', t.id, e); }
    }
  })();
}
