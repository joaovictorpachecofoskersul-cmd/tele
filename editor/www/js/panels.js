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

const ICON = { like: '♥', click: '↖', tap: '☝', bell: '🔔', notif: '▭', swipe: '⌃', comment: '💬', poll: '▤', arrows: '»', share: '↪', text: '𝐓', stamp: '⛝', counter: '#', censor: '▬', knockout: '◩', card: '▣', emoji: '☺', arrow: '➜', circle: '◯', confetti: '✺', progress: '▭', image: '🖼', lower: '▤', follow: '♥', bubble: '💬' };

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
  const isSfx = it.kind === 'sfx';
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
