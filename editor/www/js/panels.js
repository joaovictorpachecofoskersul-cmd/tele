// Painéis de edição (folhas que sobem de baixo).
import { h, section, slider, chips, swatches, toggle, btn, textInput, numInput, toast, confirmBox, promptBox } from './ui.js';
import { TRANSITIONS, EFFECTS, TRANS_BY_ID, FX_BY_ID } from './effects.js';
import { ELEMENTS, TEXT_ANIMS, drawItems } from './overlays.js';
import { CAPTION_STYLES, toSRT } from './captions.js';
import { ASR_MODELS } from './asr.js';
import { FONT_CHOICES } from './fonts.js';
import { SFX_LIST, BEAT_STYLES, ELEMENT_SFX } from './audio.js';
import { QUALITIES, PLATFORMS, platformSettings } from './export.js';
import { BG_CHOICES } from './cartelas.js';
import { MARKERS, MARKER_POS, defaultMarker } from './markers.js';
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
// sorteia transições sem repetir as usadas nos últimos vídeos (histórico no aparelho)
export function surprise(app) {
  const p = app.project;
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('ed.recentTrans') || '[]'); } catch (e) { }
  const pool = TRANSITIONS.filter(t => t.id !== 'none' && t.id !== 'mask');
  const used = [];
  p.clips.forEach((x, k) => {
    if (k >= p.clips.length - 1) return;
    let cand = pool.filter(t => !hist.includes(t.id) && !used.includes(t.id));
    if (!cand.length) cand = pool.filter(t => !used.slice(-3).includes(t.id));
    if (!cand.length) cand = pool;
    const t = cand[Math.floor(Math.random() * cand.length)];
    used.push(t.id); x.trans = { id: t.id, dur: t.dur || 0.4, text: 'WOW' };
  });
  hist = [...used, ...hist].slice(0, Math.min(18, pool.length - 6));
  try { localStorage.setItem('ed.recentTrans', JSON.stringify(hist)); } catch (e) { }
  app.commit();
  toast(used.length ? 'Transições sorteadas sem repetir as últimas que você usou' : 'Coloque pelo menos 2 clipes para ter transições');
}

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
    btn('🎲 Surpreenda-me', () => { surprise(app); draw(); }),
    btn('Tirar todas', () => { p.clips.forEach(x => x.trans = { id: 'none', dur: 0.4, text: 'WOW' }); app.commit(); draw(); }),
  ));
  app.sel = { type: 'trans', index: i };
  app.openSheet('Transição', body);
}

// ------------------------------------------------------------------ elementos
// ------------------------------------------------------------------ galeria de elementos (estilo CapCut)
const GROUP_OF = {
  text: 'Texto', stamp: 'Texto', counter: 'Texto', censor: 'Texto', knockout: 'Texto', card: 'Texto', lower: 'Texto', pill: 'Texto', bubble: 'Texto', module: 'Texto',
  follow: 'Redes sociais', like: 'Redes sociais', click: 'Redes sociais', tap: 'Redes sociais', bell: 'Redes sociais', notif: 'Redes sociais', swipe: 'Redes sociais', comment: 'Redes sociais', poll: 'Redes sociais', share: 'Redes sociais',
  arrows: 'Destaques', arrow: 'Destaques', circle: 'Destaques', emoji: 'Destaques', confetti: 'Destaques', floaters: 'Destaques', progress: 'Destaques', blurbox: 'Destaques', image: 'Destaques',
  checklist: 'Dados', people: 'Dados', map: 'Dados', bars: 'Dados',
};
const RED = '#EB1E28', YEL = '#FFDE00';
// kits prontos com as identidades (estilos)
const KITS = [
  { kit: 'Brasileirando', kind: 'r_headline', name: 'Manchete com local e data', p: { tag: 'CUIABÁ · 2026', l1: 'ELE FALOU ISSO NA', l2: 'CARA DE TODO MUNDO', tagColor: RED, color2: YEL, alpha: .8, x: .5, y: .07 } },
  { kit: 'Brasileirando', kind: 'r_cta', name: 'SEGUE O PERFIL', p: { text: 'SEGUE O PERFIL', sub: 'E ASSISTE ATÉ O FIM', color: RED, x: .5, y: .84 } },
  { kit: 'Brasileirando', kind: 'r_blink', name: 'ESPERA O FINAL', p: { text: 'ESPERA O FINAL', size: .045, hz: 3, color: '#FFFFFF', bg: RED, x: .5, y: .24 } },
  { kit: 'Brasileirando', kind: 'r_nametag', name: 'Nome de político', p: { name: 'NOME DO POLÍTICO', dir: 'baixo', bg: YEL, color: '#111111', x: .5, y: .3 } },
  { kit: 'Brasileirando', kind: 'c_final', name: 'Card DIA 25 É LULA 13', p: { bg: 'escuro', fonte: '', speed: 1, l1: 'DIA 25 É', l2: 'LULA 13', cta1: 'COMENTA O QUE ACHOU', cta2: 'SEGUE O PERFIL', pillColor: RED } },
  { kit: 'BORA LULA', kind: 'pill', name: 'Cabeçalho BORA LULA', p: { text: 'BORA LULA', bg: RED, color: '#FFFFFF', x: .5, y: .06, size: .045 } },
  { kit: 'BORA LULA', kind: 'stamp', name: 'Carimbo VOTA 13', p: { text: 'VOTA 13', color: RED, x: .5, y: .45, size: .14, rot: -10 } },
  { kit: 'BORA LULA', kind: 'card', name: 'Card LULA 13', p: { title: 'LULA 13', sub: '25 DE OUTUBRO · VOTE 13', bg: RED, bg2: '#7F0A10', color: '#FFFFFF', confetti: true, comment: 'COMENTA: 13' } },
  { kit: 'Minicurso', kind: 'module', name: 'Card de módulo', p: { num: 'MÓDULO 1', title: 'Título da aula', bg: '#173B32', accent: '#F0B429' } },
  { kit: 'Minicurso', kind: 'pill', name: 'Etiqueta de aula', p: { text: 'AULA 1 DE 5', bg: '#F0B429', color: '#173B32', x: .5, y: .1, size: .045 } },
  { kit: 'Minicurso', kind: 'checklist', name: 'Lista da aula', p: { text: 'Primeiro ponto\nSegundo ponto\nTerceiro ponto', x: .5, y: .45, size: .055, color: '#FFFFFF', check: '#F0B429', box: 'rgba(23,59,50,.85)' } },
  { kit: 'Minicurso', kind: 'lower', name: 'Nome do professor', p: { name: 'NOME', role: 'Professor(a)', color: '#F0B429', x: .05, y: .74 } },
];
const groupOf = e => e.kit ? 'Kits' : e.group || GROUP_OF[e.kind] || 'Destaques';
const keyOf = e => e.kind + '|' + e.name;
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };

export function saveMyElement(app, it) {
  promptBox('Nome para este elemento:', (ELEMENTS.find(e => e.kind === it.kind) || {}).name || 'Meu elemento').then(name => {
    if (!name || !name.trim()) return;
    const mine = lsGet('ed.myEls', []);
    mine.unshift({ kind: it.kind, name: name.trim(), p: JSON.parse(JSON.stringify(it.p)), dur: it.dur, mine: true });
    lsSet('ed.myEls', mine.slice(0, 60));
    toast('Salvo em Elementos › Meus');
  });
}

// miniatura renderizada de verdade (desenha o elemento num quadro pequeno)
const thumbCache = new Map();
function renderThumb(e) {
  const k = keyOf(e) + (e.mine ? JSON.stringify(e.p).length : '');
  if (thumbCache.has(k)) return thumbCache.get(k);
  const W = 240, H = 240, BW = 540, BH = 960;
  let big = document.createElement('canvas'); big.width = BW; big.height = BH;
  const bx = big.getContext('2d', { willReadFrequently: true });
  const full = /^c_/.test(e.kind) || ['card', 'module', 'confetti', 'floaters', 'r_frame', 'r_money', 'progress', 'knockout'].includes(e.kind);
  const dur = /^c_/.test(e.kind) ? 6 : 3;
  const it = { id: 'th', kind: e.kind, start: 0, dur, p: JSON.parse(JSON.stringify(e.p)) };
  const t = /^c_/.test(e.kind) ? 3.2 : e.kind === 'checklist' ? 2.6 : e.kind === 'confetti' ? 0.7 : 1.5;
  try {
    drawItems(bx, { items: [it], media: {}, captions: {}, clips: [], format: '9:16' }, t, BW, BH,
      { scratch: (w, h) => { const s = document.createElement('canvas'); s.width = w; s.height = h; return s; }, image: () => null, total: dur });
  } catch (err) { /* sem prévia */ }
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  // fundo atrás do desenho
  const bg = document.createElement('canvas'); bg.width = BW; bg.height = BH;
  const gx = bg.getContext('2d');
  const g = gx.createLinearGradient(0, 0, BW, BH); g.addColorStop(0, '#52525B'); g.addColorStop(1, '#1C1C22');
  gx.fillStyle = g; gx.fillRect(0, 0, BW, BH); gx.drawImage(big, 0, 0);
  // limites reais do que foi desenhado (pixels não transparentes)
  let b = null;
  if (!full) {
    const d = bx.getImageData(0, 0, BW, BH).data;
    let x0 = BW, y0 = BH, x1 = -1, y1 = -1;
    for (let y = 0; y < BH; y += 2) for (let x = 0; x < BW; x += 2) if (d[(y * BW + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 > x0) b = { x: x0, y: y0, w: x1 - x0 + 2, h: y1 - y0 + 2 };
  }
  big = bg;
  if (b && b.w > 4 && b.h > 4) {
    // recorta em volta do elemento (com folga) mantendo a proporção da miniatura
    let cw = Math.max(150, b.w * 1.2, b.h * 1.2 * W / H), ch = cw * H / W;
    cw = Math.min(cw, BW); ch = Math.min(ch, BH);
    const cx = Math.max(0, Math.min(BW - cw, b.x + b.w / 2 - cw / 2)), cy = Math.max(0, Math.min(BH - ch, b.y + b.h / 2 - ch / 2));
    ctx.drawImage(big, cx, cy, cw, ch, 0, 0, W, H);
  } else ctx.drawImage(big, 0, (BH - BW * H / W) / 2, BW, BW * H / W, 0, 0, W, H);
  thumbCache.set(k, c);
  return c;
}

export function elementsPanel(app, startTab) {
  const all = [...ELEMENTS, ...KITS];
  const groups = ['Destaques', 'Texto', 'Redes sociais', 'Retenção', 'Cartelas', 'Gráficos', 'Dados', 'Kits'];
  let tab = startTab || lsGet('ed.elTab', 'Recentes');
  let q = '';
  const tabs = h('div', { class: 'etabs' });
  const grid = h('div', { class: 'egrid' });
  const hint = h('p', { class: 'hint' });
  const add = async e => {
    const p = JSON.parse(JSON.stringify(e.p));
    if (e.needsImage) { const mid = await app.importImageForItem(); if (!mid) return; p.mid = mid; }
    const rec = lsGet('ed.recentEl', []).filter(k => k !== keyOf(e) || e.mine);
    if (!e.mine) { rec.unshift(keyOf(e)); lsSet('ed.recentEl', rec.slice(0, 24)); }
    const dur = e.dur || (e.whole ? layout(app.project).total : /^c_/.test(e.kind) ? 5 : e.kind === 'card' ? 2.5 : e.kind === 'confetti' ? 2.5 : e.kind === 'stamp' ? 1.8 : e.kind === 'r_frame' || e.kind === 'r_cta' ? 5 : 3);
    const it = app.addItem(e.kind, p, e.whole ? 0 : null, dur);
    itemPanel(app, it);
  };
  const list = () => {
    if (q) { const n = q.toLowerCase(); return all.concat(lsGet('ed.myEls', [])).filter(e => (e.name + ' ' + groupOf(e) + ' ' + (e.kit || '')).toLowerCase().includes(n)); }
    if (tab === 'Recentes') { const rec = lsGet('ed.recentEl', []); return rec.map(k => all.find(e => keyOf(e) === k)).filter(Boolean); }
    if (tab === 'Meus') return lsGet('ed.myEls', []);
    return all.filter(e => groupOf(e) === tab);
  };
  const draw = () => {
    tabs.innerHTML = '';
    for (const g of ['Recentes', 'Meus', ...groups]) {
      const b = h('button', { class: 'etab' + (g === tab && !q ? ' on' : ''), type: 'button' }, g);
      b.addEventListener('click', () => { tab = g; q = ''; search.value = ''; lsSet('ed.elTab', g); draw(); });
      tabs.append(b);
    }
    const items = list();
    hint.textContent = !items.length ? (tab === 'Recentes' ? 'Os elementos que você usar aparecem aqui.' : tab === 'Meus' ? 'Edite um elemento do seu jeito e toque em "Salvar" (estrela) na barra de baixo para guardar aqui.' : 'Nada encontrado.')
      : tab === 'Kits' && !q ? 'Kits prontos com as cores de cada estilo: Brasileirando, BORA LULA e Minicurso.' : 'O elemento entra no cursor. Depois arraste na prévia e ajuste a duração na linha do tempo.';
    grid.innerHTML = '';
    let lastKit = null;
    items.forEach((e, i) => {
      if (tab === 'Kits' && !q && e.kit !== lastKit) { lastKit = e.kit; grid.append(h('div', { class: 'sec-t', style: { gridColumn: '1/-1' } }, e.kit)); }
      const th = h('div', { class: 'eth' }, ICON[e.kind] || '◻');
      const card = h('button', { class: 'eit', type: 'button' }, th, h('span', {}, e.name));
      card.addEventListener('click', ev => { if (ev.target.classList.contains('x')) return; add(e); });
      if (e.mine && tab === 'Meus' && !q) {
        const x = h('span', { class: 'x' }, '✕');
        x.addEventListener('click', async () => {
          if (!(await confirmBox(`Apagar "${e.name}" dos seus elementos?`, 'Apagar'))) return;
          const mine = lsGet('ed.myEls', []); mine.splice(i, 1); lsSet('ed.myEls', mine); draw();
        });
        th.append(x);
      }
      grid.append(card);
      // prévia desenhada aos poucos para não travar
      const job = () => { if (!document.body.contains(th)) return; const c = renderThumb(e); th.firstChild && th.firstChild.nodeType === 3 && th.firstChild.remove(); th.prepend(c); };
      (window.requestIdleCallback || (f => setTimeout(f, 16)))(job);
    });
  };
  const search = h('input', { class: 'esearch', type: 'search', placeholder: 'Buscar elemento (ex.: seta, ano, pesquisa)' });
  search.addEventListener('input', () => { q = search.value.trim(); draw(); });
  draw();
  app.openSheet('Elementos', h('div', {}, tabs, search, hint, grid));
}

const ICON = { c_year: '📅', c_period: '⏳', c_date: '📆', c_timeline: '⇥', c_two: '⇄', c_list: '☰', c_phrase: '❝', c_quote: '❞', c_final: '▣', g_vbars: '▥', g_line: '📈', g_pie: '◔', g_ring: '◯', g_poll: '⚖', g_versus: '✕', g_table: '▦', g_countdown: '⏱', g_odometer: '🔢', r_cta: '★', r_headline: '📰', r_nametag: '🏷', r_blink: '⚡', r_frame: '▢', r_money: '$', pill: '⬭', checklist: '☑', people: '👥', map: '🗺', bars: '▥', module: '▣', floaters: '◌', blurbox: '▒', like: '♥', click: '↖', tap: '☝', bell: '🔔', notif: '▭', swipe: '⌃', comment: '💬', poll: '▤', arrows: '»', share: '↪', text: '𝐓', stamp: '⛝', counter: '#', censor: '▬', knockout: '◩', card: '▣', emoji: '☺', arrow: '➜', circle: '◯', confetti: '✺', progress: '▭', image: '🖼', lower: '▤', follow: '♥', bubble: '💬' };


// rótulos dos campos das cartelas, gráficos e elementos de retenção
const LBL = {
  label: 'Texto de cima', from: 'De', to: 'Até', dur2: 'Tempo da contagem (s)', sub: 'Texto de baixo', top: 'Linha de cima', big: 'Número grande',
  line1: 'Linha 1', line2: 'Linha 2', note: 'Observação', year: 'Ano', title: 'Título', title2: 'Título (linha 2)', start: 'Ano inicial', end: 'Ano final',
  segs: 'Trechos destacados (ex.: 2003-2016, 2023-2026)', t2: 'Quando destacar (s)', segLabel: 'Texto do destaque', segLine: 'Linha do destaque', segColor: 'Cor do destaque',
  l1: 'Linha 1', l2: 'Linha 2', a: 'Valor da esquerda', b: 'Valor da direita', la: 'Legenda da esquerda', lb: 'Legenda da direita',
  items: 'Itens (um por linha: ANO · texto / linha 2)', step: 'Etapa', text: 'Texto', author: 'Autor', cta1: 'Chamada 1', cta2: 'Botão', pillColor: 'Cor do botão',
  data: 'Dados (um por linha, "Nome: valor")', highlight: 'Destaque', suffix: 'Depois do número', color: 'Cor', color2: 'Cor 2', pct: 'Porcentagem',
  na: 'Nome A', nb: 'Nome B', pa: '% de A', pb: '% de B', ca: 'Cor A', cb: 'Cor B', margin: 'Margem de erro', ta: 'Título da esquerda', tb: 'Título da direita',
  left: 'Esquerda (+ a favor, - contra)', right: 'Direita (+ a favor, - contra)', bottom: 'Linha de baixo', fonte: 'Fonte (aparece no rodapé)',
  tag: 'Etiqueta', tagColor: 'Cor da etiqueta', alpha: 'Fundo escuro', name: 'Nome', hz: 'Piscadas por segundo', size: 'Tamanho', inset: 'Margem',
  speed: 'Velocidade da animação', donut: 'Rosca (furo no meio)', bg: 'Fundo',
};
const MULTI = new Set(['items', 'data', 'left', 'right', 'text']);
const CHOICE = {
  dir: [{ id: 'baixo', name: 'Seta embaixo' }, { id: 'cima', name: 'Seta em cima' }],
  mode: [{ id: 'pulsar', name: 'Pulsar' }, { id: 'piscar', name: 'Piscar' }],
};
const RANGE = { speed: [0.3, 3, 0.05, pct], alpha: [0, 1, 0.01, pct], size: [0.02, 0.15, 0.002, v => Math.round(v * 1000)], inset: [0, 0.1, 0.002, pct], hz: [0.5, 8, 0.5, v => v], t2: [0.5, 15, 0.1, sec], dur2: [0.5, 10, 0.1, sec] };
const isColor = v => typeof v === 'string' && /^(#|rgba?\()/.test(v);

function genericFields(app, it, body, live, commit) {
  const q = it.p;
  const def = (ELEMENTS.find(e => e.kind === it.kind) || {}).p || {};
  const keys = [...new Set([...Object.keys(def), ...Object.keys(q)])].filter(k => !['x', 'y', 'scale', 'rot', 'sound', 'mid'].includes(k));
  const last = k => k === 'fonte' ? 3 : k === 'speed' ? 2 : k === 'bg' ? 1 : 0;
  keys.sort((a, b) => last(a) - last(b));
  for (const k of keys) {
    const v = q[k] ?? def[k], name = LBL[k] || k;
    if (k === 'bg' && (it.kind.startsWith('c_') || it.kind.startsWith('g_'))) {
      body.append(section(name, chips(it.kind.startsWith('g_') ? [{ id: 'none', name: 'Sem fundo' }, ...BG_CHOICES] : BG_CHOICES, v, x => { q.bg = x; commit(); })));
    } else if (CHOICE[k]) body.append(section(name, chips(CHOICE[k], v, x => { q[k] = x; commit(); })));
    else if (typeof v === 'boolean') body.append(toggle(name, v, x => { q[k] = x; commit(); }));
    else if (isColor(v)) body.append(section(name, swatches(v, x => { q[k] = x; commit(); })));
    else if (typeof v === 'number' && RANGE[k]) { const r = RANGE[k]; body.append(slider(name, r[0], r[1], r[2], v, x => { q[k] = x; live(); }, r[3], commit)); }
    else if (typeof v === 'number') body.append(h('div', { class: 'nrow' }, numInput(name, v, x => { q[k] = x; live(); }, commit)));
    else body.append(h('div', {}, h('div', { class: 'sec-t' }, name), textInput(v ?? '', x => { q[k] = x; live(); }, { multiline: MULTI.has(k), onCommit: commit })));
  }
  if (!it.kind.startsWith('c_')) body.append(slider('Tamanho geral', 0.4, 2, 0.05, q.scale ?? 1, x => { q.scale = x; live(); }, pct, commit));
  if (it.kind.startsWith('c_')) body.append(h('p', { class: 'hint' }, 'A cartela cobre a tela inteira. Use "Sobre o vídeo" no fundo para ver o vídeo por trás.'));
}

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
      if (q.fx === 'spotlight') body.append(
        slider('Posição horizontal', 0, 1, 0.01, q.cx ?? .5, v => { q.cx = v; live(); }, pct, commit),
        slider('Posição vertical', 0, 1, 0.01, q.cy ?? .45, v => { q.cy = v; live(); }, pct, commit),
        slider('Tamanho do foco', 0.05, 0.6, 0.01, q.r ?? .25, v => { q.r = v; live(); }, pct, commit));
      if (q.fx === 'rewind') body.append(slider('Quanto volta (segundos)', 1, 20, 0.5, q.span ?? 5, v => { q.span = v; live(); }, sec, commit));
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
    default:
      if (/^[cgr]_/.test(it.kind)) genericFields(app, it, body, live, commit);
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
        h('p', {}, has ? 'Alguns vídeos ainda não têm legenda.' : 'Gere a legenda automática a partir da fala dos vídeos. Na primeira vez o app baixa o reconhecimento de voz (cerca de 100 MB no modo Rápido); depois funciona sem internet.'),
        h('div', { class: 'sec-t' }, 'Reconhecimento de voz'),
        chips(ASR_MODELS, (() => { try { return localStorage.getItem('ed.asr') || 'rapida'; } catch (e) { return 'rapida'; } })(), v => { try { localStorage.setItem('ed.asr', v); } catch (e) { } }),
        h('p', { class: 'hint' }, 'A Rápida serve para a maioria dos vídeos e é a melhor para celular. A Precisa erra menos, mas demora bem mais. Depois você pode corrigir qualquer palavra.'),
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
      section('Palavras fortes',
        h('p', { class: 'hint' }, 'Escreva as palavras que devem ficar na cor forte em todo o vídeo, separadas por vírgula (ex.: Lula, 13, fome). Também dá para tocar nas palavras em "Corrigir texto".'),
        textInput(cap.strongList || '', v => { cap.strongList = v; app.live(true); }, { onCommit: () => app.commit(true), placeholder: 'Lula, 13, fome' })),
      markerSection(app, cap, draw),
      has ? btn('✎ Corrigir texto e marcar palavras fortes', () => captionsEditor(app), 'pri') : null,
      has ? btn('Apagar toda a legenda', async () => { if (await confirmBox('Apagar a legenda de todos os vídeos?', 'Apagar')) { p.transcripts = {}; app.commit(true); draw(); } }, 'danger') : null,
    );
  };
  draw();
  app.sel = { type: 'captions' };
  app.openSheet('Legendas', body);
}


// ------------------------------------------------------------------ marcador da legenda
const MK_KEY = 'ed.markerPresets';
const loadMk = () => { try { return JSON.parse(localStorage.getItem(MK_KEY) || '[]'); } catch (e) { return []; } };
const saveMk = a => { try { localStorage.setItem(MK_KEY, JSON.stringify(a)); } catch (e) { } };

function markerSection(app, cap, redraw) {
  if (!cap.marker) cap.marker = { ...defaultMarker(), on: !!cap.star, color: cap.star ? cap.strong : defaultMarker().color };
  const m = cap.marker;
  const c = () => { cap.star = false; app.commit(); };
  const l = () => app.live();
  const box = h('div', {});
  box.append(toggle('Elemento pulando de palavra em palavra', m.on, v => { m.on = v; cap.star = false; app.commit(); redraw(); }));
  if (!m.on) return section('Marcador', box);
  const presets = loadMk();
  box.append(
    presets.length ? section('Meus marcadores', h('div', { class: 'brow' }, presets.map((pr, i) => h('span', { class: 'mkp' },
      btn(pr.name, () => { Object.assign(m, pr.m, { on: true }); c(); redraw(); }, 'sm'),
      btn('✕', async () => { if (await confirmBox('Apagar o marcador "' + pr.name + '"?', 'Apagar')) { presets.splice(i, 1); saveMk(presets); redraw(); } }, 'sm'))))) : null,
    section('Elemento', chips(MARKERS, m.type, async v => {
      if (v === 'image' && !m.mid) { const mid = await app.importImageForItem(); if (!mid) return; m.mid = mid; }
      m.type = v; c(); redraw();
    })),
    m.type === 'image' ? btn('Trocar imagem', async () => { const mid = await app.importImageForItem(); if (mid) { m.mid = mid; c(); } }) : null,
    m.type === 'number' ? h('div', {}, h('div', { class: 'sec-t' }, 'Texto dentro'), textInput(m.text, v => { m.text = v; l(); }, { onCommit: c })) : null,
    section('Cor', swatches(m.color, v => { m.color = v; c(); })),
    section('Posição', chips(MARKER_POS, m.pos, v => { m.pos = v; c(); })),
    slider('Tamanho', 0.4, 3, 0.05, m.size, v => { m.size = v; l(); }, pct, c),
    slider('Ajuste horizontal', -1.5, 1.5, 0.02, m.dx, v => { m.dx = v; l(); }, v => v.toFixed(2), c),
    slider('Ajuste vertical', -1.5, 1.5, 0.02, m.dy, v => { m.dy = v; l(); }, v => v.toFixed(2), c),
    slider('Rotação', -180, 180, 1, m.rot, v => { m.rot = v; l(); }, v => v + '°', c),
    slider('Altura do pulo', 0, 2, 0.05, m.arc, v => { m.arc = v; l(); }, v => v.toFixed(2), c),
    slider('Duração do pulo', 0.06, 0.5, 0.01, m.dur, v => { m.dur = v; l(); }, v => v.toFixed(2) + ' s', c),
    toggle('Pulsar parado na palavra', m.pulse, v => { m.pulse = v; c(); }),
    toggle('Girar', m.spin, v => { m.spin = v; c(); }),
    toggle('Rastro no pulo', m.trail, v => { m.trail = v; c(); }),
    toggle('Amassar ao cair', m.squash, v => { m.squash = v; c(); }),
    section('Nas palavras fortes, trocar por', chips([{ id: '', name: 'O mesmo' }, ...MARKERS.filter(x => x.id !== 'image')], m.strongType || '', v => { m.strongType = v; c(); redraw(); })),
    m.strongType ? section('Cor nas palavras fortes', swatches(m.strongColor, v => { m.strongColor = v; c(); })) : null,
    btn('Salvar este marcador', async () => {
      const name = await promptBox('Nome do marcador:', MARKERS.find(x => x.id === m.type)?.name || 'Meu marcador');
      if (!name) return;
      const a = loadMk(); a.unshift({ name, m: { ...m, on: true } }); saveMk(a.slice(0, 20)); toast('Marcador salvo'); redraw();
    }),
  );
  return section('Marcador', box);
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
    const add = btn('＋ cartela', () => pickCartela(app, pg), 'sm');
    row.append(h('div', { class: 'cetop' }, time, inp, add), words);
    list.append(row);
  }
  app.openSheet('Corrigir legenda', h('div', {},
    h('p', { class: 'hint' }, 'Corrija o texto de cada trecho (o tempo é ajustado sozinho). Toque numa palavra para deixá-la na cor forte. Toque no horário para ver o trecho.'),
    list), { back: () => captionsPanel(app) });
}

function pickCartela(app, pg) {
  const list = ELEMENTS.filter(e => e.group === 'Cartelas' || e.group === 'Gráficos');
  const grid = h('div', { class: 'grid' }, list.map(e => {
    const b = h('button', { class: 'gi', type: 'button' }, h('span', { class: 'gi-i' }, e.group === 'Cartelas' ? '▤' : '▥'), e.name);
    b.addEventListener('click', () => {
      const dur = Math.max(2, Math.min(6, pg.end - pg.start + 0.4));
      const it = app.addItem(e.kind, JSON.parse(JSON.stringify(e.p)), pg.start, dur);
      itemPanel(app, it);
    });
    return b;
  }));
  app.openSheet('Cartela neste trecho', h('div', {}, h('p', { class: 'hint' }, 'A cartela entra no começo deste trecho da fala e dura enquanto ele é falado. Depois ajuste o texto.'), grid), { back: () => captionsEditor(app) });
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
  const p = app.project;
  const L = layout(p);
  let pick = null;
  try { pick = localStorage.getItem('ed.exportPreset'); } catch (e) { }
  pick = pick || 'reels';
  const info = h('p', { class: 'hint' });
  const settings = () => {
    const pl = PLATFORMS.find(x => x.id === pick);
    if (pl) return { ...platformSettings(pl, L.total), name: pl.name };
    const q = QUALITIES.find(x => x.id === pick) || QUALITIES[1];
    return { bitrate: q.bitrate, scale: 1, abitrate: 192e3, name: q.name };
  };
  const showInfo = () => {
    const st = settings(), pl = PLATFORMS.find(x => x.id === pick);
    const mb = (st.bitrate + st.abitrate) * L.total / 8e6;
    const warn = [];
    if (pick === 'youtube' && p.format !== '16:9') warn.push('Seu vídeo está em ' + p.format + '. Para YouTube deitado, mude o formato para 16:9.');
    if ((pick === 'reels' || pick === 'tiktok' || pick === 'shorts' || pick === 'status') && p.format === '16:9') warn.push('Seu vídeo está deitado (16:9). Para ' + (pl ? pl.name : '') + ' o melhor é 9:16.');
    if (pick === 'status' && L.total > 60) warn.push('O status do WhatsApp corta em 60 s.');
    if ((pick === 'reels' || pick === 'shorts') && L.total > 180) warn.push('Passa de 3 min.');
    info.textContent = `${pl ? pl.note + ' ' : ''}Arquivo de cerca de ${mb.toFixed(0)} MB${st.scale < 1 ? ' em 720p' : ''}.${warn.length ? ' Atenção: ' + warn.join(' ') : ''}`;
  };
  const pc = chips(PLATFORMS.map(x => ({ id: x.id, name: x.name })), pick, id => { pick = id; try { localStorage.setItem('ed.exportPreset', id); } catch (e) { } showInfo(); qc.set(null); });
  const qc = chips(QUALITIES, pick, id => { pick = id; showInfo(); pc.set(null); });
  const body = h('div', {},
    h('p', {}, `Duração: ${fmtTime(L.total)} · ${p.format} · ${p.fps} quadros por segundo`),
    section('Para onde vai o vídeo', pc),
    section('Ou escolha a qualidade', qc),
    info,
    h('p', { class: 'hint' }, 'A exportação acontece no próprio celular. Deixe o app aberto e a tela ligada até terminar.'),
    btn('Exportar vídeo', () => { app.closeSheet(); app.runExport(settings()); }, 'pri big'),
    section('Legenda e textos',
      h('div', { class: 'brow' },
        btn('Baixar legenda .srt', () => {
          const srt = toSRT(p);
          if (!srt.trim()) { toast('Gere a legenda primeiro (menu Legendas)'); return; }
          app.saveText(srt, (p.name || 'legenda').replace(/[^\w\-À-ú ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) + '.srt');
        }),
        btn('Textos para postar', () => postTextsPanel(app)))),
  );
  showInfo();
  app.openSheet('Exportar', body);
}

// descrição de Instagram, WhatsApp e comentário fixado (modelo editável, sem travessão)
export function postTextsPanel(app) {
  const p = app.project;
  const d = p.post = p.post || { hook: '', facts: '', phrase: '', word: '', sources: '', tags: '' };
  if (!d.hook) d.hook = (p.name || '').toUpperCase();
  const outs = h('div');
  const nodash = x => String(x || '').replace(/\s*[—–]\s*/g, ', ');
  const lines = x => nodash(x).split('\n').map(l => l.trim()).filter(Boolean);
  const tagify = x => String(x || '').split(/[\s,]+/).filter(Boolean).map(t => t.startsWith('#') ? t : '#' + t);
  const gen = () => {
    const facts = lines(d.facts), src = lines(d.sources), tags = tagify(d.tags);
    const word = (d.word || 'EU QUERO').toUpperCase();
    const insta = [
      '🔥 ' + nodash(d.hook),
      '',
      ...facts,
      d.phrase ? '' : null, d.phrase ? nodash(d.phrase) : null,
      '',
      `👇 Comenta: ${word}`,
      src.length ? '' : null, ...(src.length ? ['Fontes: ' + src.join('; ')] : []),
      tags.length ? '' : null, tags.length ? tags.slice(0, 8).join(' ') : null,
    ].filter(x => x !== null).join('\n');
    const whats = [
      '📢 *' + nodash(d.hook) + '*',
      ...facts.slice(0, 4),
      d.phrase ? '*' + nodash(d.phrase) + '*' : null,
      '',
      'Assiste e compartilha 👇',
    ].filter(x => x !== null).join('\n');
    const pin = `Companheiros, se você também acha isso, comenta ${word} e segue o perfil. Manda esse vídeo para 3 pessoas hoje.`;
    outs.innerHTML = '';
    for (const [t, txt] of [['Instagram', insta], ['WhatsApp', whats], ['Comentário fixado', pin]]) {
      const ta = h('textarea', { class: 'ti', rows: Math.min(12, txt.split('\n').length + 1) }); ta.value = txt;
      outs.append(section(t, ta, btn('Copiar', async () => {
        try { await navigator.clipboard.writeText(ta.value); toast('Copiado'); } catch (e) { ta.select(); document.execCommand('copy'); toast('Copiado'); }
      }, 'sm')));
    }
  };
  const f = (label, key, multi, ph) => h('div', {}, h('div', { class: 'sec-t' }, label), textInput(d[key], v => { d[key] = v; }, { multiline: multi, placeholder: ph, onCommit: () => { app.commit(); gen(); } }));
  app.openSheet('Textos para postar', h('div', {},
    h('p', { class: 'hint' }, 'Preencha e o app monta a descrição do Instagram, do WhatsApp e o comentário fixado. Dá para editar antes de copiar. Números e acusações sempre com fonte e data.'),
    f('Gancho (primeira linha)', 'hook', false, 'ELE FALOU ISSO NA CARA DE TODO MUNDO'),
    f('Fatos (um por linha)', 'facts', true, 'Em 2014 o Brasil saiu do Mapa da Fome'),
    f('Frase de efeito', 'phrase', false, 'Não podemos esquecer nossa história'),
    f('Palavra para comentar', 'word', false, 'LULA'),
    f('Fontes com data (uma por linha)', 'sources', true, 'ONU/FAO, julho de 2025'),
    f('Hashtags', 'tags', false, '#SegundoTurno #Eleições2026 #25DeOutubro'),
    outs), { back: () => exportPanel(app) });
  gen();
}

// ------------------------------------------------------------------ modelos
import { TEMPLATES, applyTemplate } from './templates.js';
import { listUserTemplates, captureTemplate, saveUserTemplate, renameUserTemplate, deleteUserTemplate, duplicateUserTemplate, toTemplate } from './usertpl.js';
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

async function renderTemplatePreview(tpl, still, opt, app) {
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
  for (const [mid, m] of Object.entries(tpl.media || {})) {
    if (m.kind !== 'image' || tplRenderer.images.has(mid)) continue;
    try { tplRenderer.images.set(mid, app.renderer.images.get(mid) || await createImageBitmap(await app.getBlob(mid))); } catch (e) { }
  }
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
  let chosen = null;
  const grid = h('div', { class: 'tgrid' });
  const cards = new Map();
  const status = h('div', { class: 'tstatus' });
  const showStatus = t => {
    status.innerHTML = '';
    if (!t) return;
    status.append(h('div', { class: 'callout' }, h('p', {}, '✓ Modelo "' + t.name + '" aplicado. Veja no vídeo acima; toque em outro para trocar ou em OK para continuar.'),
      app.mediaNeedingTranscript().length ? btn('🎙 Gerar legenda agora', () => { app.closeSheet(); app.transcribeAll(); }, 'pri') : null));
  };
  const apply = t => {
    try {
      try { localStorage.setItem('ed.tpl', JSON.stringify({ handle: opt.handle })); } catch (e) { }
      applyTemplate(p, t, opt);
      if (t.media && app.loadItemImage) for (const [mid, m] of Object.entries(t.media)) if (m.kind === 'image') app.loadItemImage(mid).then(() => app.requestRender());
      app.applyFormat();
      app.commit();
      app.setTime(Math.min(1.5, layout(p).total / 3));
      chosen = t.id;
      for (const [id, c] of cards) c.classList.toggle('on', id === t.id);
      showStatus(t);
      status.scrollIntoView({ block: 'nearest' });
    } catch (e) {
      console.error(e);
      toast('Não consegui aplicar o modelo: ' + e.message, 6000);
    }
  };
  const makeCard = (t, extra) => {
    const thumb = h('div', { class: 'tthumb', style: { background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`, aspectRatio: t.format.replace(':', '/') } });
    const card = h('div', { class: 'tcard' + (p.template === t.id ? ' on' : ''), role: 'button', tabindex: 0 }, thumb, h('b', {}, t.name), h('span', {}, t.desc), extra || null);
    card.addEventListener('click', e => { if (e.target.closest('.tact')) return; apply(t); });
    cards.set(t.id, card);
    return card;
  };
  // meus modelos
  const mine = h('div', {});
  const userList = () => listUserTemplates().map(toTemplate);
  const drawMine = () => {
    mine.innerHTML = '';
    const list = listUserTemplates();
    const g = h('div', { class: 'tgrid' });
    for (const u of list) {
      const t = toTemplate(u);
      const acts = h('div', { class: 'tact' },
        btn('✎', async () => { const n = await promptBox('Novo nome do modelo:', u.name); if (n && n.trim()) { renameUserTemplate(u.id, n.trim()); drawMine(); previews(userList()); } }, 'sm'),
        btn('⟳', async () => {
          if (!(await confirmBox(`Trocar o modelo "${u.name}" pelo jeito que este vídeo está agora?`, 'Atualizar'))) return;
          saveUserTemplate(captureTemplate(p, u.name, u.id)); p.template = u.id; app.commit(); toast('Modelo atualizado'); drawMine(); previews(userList());
        }, 'sm'),
        btn('⧉', () => { duplicateUserTemplate(u.id); drawMine(); previews(userList()); }, 'sm'),
        btn('🗑', async () => { if (await confirmBox(`Apagar o modelo "${u.name}"?`, 'Apagar')) { deleteUserTemplate(u.id); drawMine(); } }, 'sm danger'));
      g.append(makeCard(t, acts));
    }
    mine.append(
      section('Meus modelos',
        h('p', { class: 'hint' }, list.length
          ? 'Toque para aplicar. ✎ renomear · ⟳ atualizar com este vídeo · ⧉ duplicar · 🗑 apagar. Para editar um modelo: aplique, mude o que quiser no vídeo e toque em ⟳.'
          : 'Deixe um vídeo do seu jeito (legenda, cores, marcador, transições, elementos, cartelas, áudio) e salve como modelo para usar nos próximos.'),
        btn('＋ Salvar este vídeo como meu modelo', async () => {
          const n = await promptBox('Nome do modelo:', p.name || 'Meu modelo');
          if (!n || !n.trim()) return;
          const u = captureTemplate(p, n.trim());
          if (!saveUserTemplate(u)) { toast('Não consegui salvar o modelo (memória cheia?)', 5000); return; }
          p.template = u.id; app.commit(); toast('Modelo salvo em Meus modelos'); drawMine(); previews([toTemplate(u)]);
        }, 'pri'),
        list.length ? g : null));
  };
  drawMine();
  for (const t of TEMPLATES) grid.append(makeCard(t));
  // mudar título/@/opções reaplica o modelo escolhido
  const reapply = () => { const t = TEMPLATES.find(x => x.id === chosen) || userList().find(x => x.id === chosen); if (t) apply(t); };
  const body = h('div', {},
    h('p', { class: 'hint' }, afterImport ? 'Toque num modelo para aplicar na hora. Dá para trocar quantas vezes quiser, ou tocar em OK para editar do zero.' : 'Toque num modelo para aplicar na hora. Os textos e elementos do modelo anterior são trocados; o que você colocou continua.'),
    h('div', { class: 'nrow' },
      h('div', {}, h('div', { class: 'sec-t' }, 'Título do vídeo (opcional)'), textInput('', v => { opt.title = v; }, { placeholder: 'Ex.: 3 dicas de saúde', onCommit: reapply })),
      h('div', {}, h('div', { class: 'sec-t' }, 'Seu @ (opcional)'), textInput(opt.handle, v => { opt.handle = v; }, { placeholder: '@seuperfil', onCommit: reapply }))),
    h('div', { class: 'tgl2' },
      toggle('Abertura e final', true, v => { opt.intro = v; opt.outro = v; reapply(); }),
      toggle('Transições', true, v => { opt.trans = v; reapply(); }),
      toggle('Batida / trilha', true, v => { opt.music = v; reapply(); })),
    status, mine, section('Modelos prontos', grid));
  app.openSheet('Modelos', body);
  // prévias com um quadro do próprio vídeo
  let stillP = null, queue = Promise.resolve();
  const previews = list => {
    queue = queue.then(async () => {
      if (!stillP) stillP = stillOf(app);
      const still = await stillP;
      for (const t of list) {
        if (!document.body.contains(grid)) return;
        try {
          const c = await renderTemplatePreview(t, still, opt, app);
          const th = cards.get(t.id)?.querySelector('.tthumb');
          if (!th) continue;
          th.style.background = '#000'; th.innerHTML = ''; th.append(c);
        } catch (e) { console.warn('prévia do modelo', t.id, e); }
      }
    });
  };
  previews([...userList(), ...TEMPLATES]);
}
