// Tela inicial no estilo CapCut: atalhos, teleprompter, modelos por categoria e projetos.
import { h, btn, toast, textInput } from './ui.js';
import { svgIcon } from './icons.js';
import { CATS, STORYBOARDS, storyMediaCount, storyDur } from './storyboards.js';
import { TEXT_PRESETS, CAPTION_PRESETS } from './presets.js';
import { TEMPLATES, applyTemplate } from './templates.js';
import { listUserTemplates, toTemplate } from './usertpl.js';
import * as P from './panels.js';

let built = false, curCat = null;

export function buildHome(app) {
  if (built) return;
  built = true;
  const root = document.getElementById('hometop');
  try { curCat = localStorage.getItem('ed.homeCat') || 'alta'; } catch (e) { curCat = 'alta'; }

  // ------------------------------------------------ atalhos
  const pick = async (accept, multiple = true) => { const f = await app.pickFiles(accept, multiple); return f; };
  const quick = async (accept, after, multiple = true) => {
    const files = await pick(accept, multiple);
    if (!files.length) return;
    await app.newProjectWith(files);
    if (app.project && app.project.clips.length) await after();
  };
  const tele = () => import('./teleprompter.js').then(T => T.openTeleprompter({
    onDone: async file => { await app.newProjectWith([file], 'Teleprompter ' + new Date().toLocaleDateString('pt-BR')); app.transcribeAll(); toast('Vídeo no editor. A legenda vai aparecendo enquanto o app escuta.', 4500); },
    onSave: file => app.saveText(file, file.name, file.type),
  }));
  const TOOLS = [
    { i: 'template', n: 'Modelos', f: () => document.getElementById('hmodels').scrollIntoView({ behavior: 'smooth' }) },
    { i: 'captions', n: 'Legenda automática', f: () => quick('video/*', async () => { app.transcribeAll(); P.captionPresetsPanel(app); }) },
    { i: 'text', n: 'Texto animado', f: () => quick('video/*,image/*', async () => P.textPresetsPanel(app)) },
    { i: 'person', n: 'Remover fundo', f: () => quick('video/*,image/*', async () => { const c = app.project.clips[0]; c.seg = { mode: 'blur', color: '#00B140', thr: .5, soft: .15 }; app.commit(); P.clipPanel(app, c, 'person'); }, false) },
    { i: 'image', n: 'Fotos em vídeo', f: () => openStory(app, STORYBOARDS.find(s => s.id === 'album2')) },
    { i: 'mic', n: 'Gravar narração', f: () => quick('video/*,image/*', async () => app.recordNarration()) },
    { i: 'pause', n: 'Cortar pausas', f: () => quick('video/*', async () => app.cutSilences(), false) },
    { i: 'wave', n: 'Melhorar áudio', f: () => quick('video/*,audio/*', async () => P.soundsPanel(app, 'voz'), false) },
    { i: 'filter', n: 'Filtros', f: () => quick('video/*,image/*', async () => P.filtersPanel(app)) },
    { i: 'overlay', n: 'Tela dividida', f: async () => {
      const files = await pick('video/*,image/*', true);
      if (files.length < 2) { if (files.length) toast('Escolha 2 vídeos ou fotos'); return; }
      await app.newProjectWith([files[0]]);
      const mid = await app.importFileAsMedia(files[1]);
      const p = app.project, L = (await import('./project.js')).layout(p);
      p.clips.forEach(c => { c.fit = 'cover'; c.y = 0; });
      app.addItem('pip', { mid, in: 0, x: .5, y: .75, w: 1, h: .5, shape: 'rect', border: '#FFFFFF', bw: .004, shadow: false, vol: 0, cut: false, anim: 'none', zoom: 1, fit: 'cover' }, 0, L.total);
      p.clips.forEach(c => { c.y = .25; c.zoom = 1; });
      app.commit(); toast('Tela dividida pronta: o 2º vídeo está embaixo. Toque nele para ajustar.');
    } },
    { i: 'kf', n: 'Inverter vídeo', f: () => quick('video/*', async () => app.reverseClip(app.project.clips[0]), false) },
    { i: 'export', n: 'Miniatura', f: () => quick('video/*,image/*', async () => P.thumbPanel(app), false) },
  ];

  root.append(
    h('div', { class: 'hhead' }, h('div', { class: 'hbrand' }, h('img', { src: 'img/icone.png', alt: '' }), h('b', {}, 'Editaí')), h('span', { id: 'storage' })),
    h('div', { class: 'hero' },
      h('button', { id: 'newp', type: 'button', class: 'herob new' }, svgIcon('plus', 30), h('span', {}, 'Novo projeto')),
      h('button', { type: 'button', class: 'herob tele', onclick: tele }, svgIcon('mic', 30), h('span', {}, 'Teleprompter'))),
    h('div', { class: 'htools' }, TOOLS.map(t => h('button', { type: 'button', class: 'htool', onclick: t.f }, h('span', { class: 'hti' }, svgIcon(t.i, 24)), h('span', {}, t.n)))),
    h('div', { id: 'hmodels', class: 'hsec' }, h('h3', {}, 'Modelos'),
      h('div', { class: 'hcats', id: 'hcats' }), h('div', { class: 'hgrid', id: 'hgrid' })),
    h('h3', { class: 'hsec' }, 'Seus projetos'),
  );
  drawCats(app);
}

const EXTRA_CATS = [{ id: 'estilos', name: 'Estilos de edição' }, { id: 'meus', name: 'Meus modelos' }];
function drawCats(app) {
  const cats = document.getElementById('hcats');
  cats.innerHTML = '';
  for (const c of [...CATS, ...EXTRA_CATS]) {
    const b = h('button', { type: 'button', class: 'hcat' + (c.id === curCat ? ' on' : '') }, c.name);
    b.addEventListener('click', () => { curCat = c.id; try { localStorage.setItem('ed.homeCat', c.id); } catch (e) { } drawCats(app); });
    cats.append(b);
  }
  drawGrid(app);
}

// fila de miniaturas (desenha uma por vez, sem travar a rolagem)
let thumbQ = [], thumbBusy = false;
function queueThumb(fn) { thumbQ.push(fn); if (!thumbBusy) { thumbBusy = true; setTimeout(runThumbs, 30); } }
async function runThumbs() {
  thumbBusy = true;
  while (thumbQ.length) { const fn = thumbQ.shift(); try { await fn(); } catch (e) { } await new Promise(r => setTimeout(r, 0)); }
  thumbBusy = false;
}

function card(title, sub, aspect, onClick, draw) {
  const th = h('div', { class: 'hth', style: { aspectRatio: aspect } });
  const c = h('button', { type: 'button', class: 'hcard' }, th, h('b', {}, title), sub ? h('span', {}, sub) : null);
  c.addEventListener('click', onClick);
  if (draw) queueThumb(async () => { if (!document.body.contains(th)) return; const cv = await draw(); if (cv) { th.innerHTML = ''; th.append(cv); } });
  return c;
}

async function drawGrid(app) {
  const grid = document.getElementById('hgrid');
  grid.innerHTML = '';
  thumbQ = [];
  const PV = await import('./previewer.js');
  const W = 180;
  if (curCat === 'textos') {
    for (const pr of TEXT_PRESETS) grid.append(card(pr.name, 'Texto animado', '9/16', () => useText(app, pr), async () => PV.renderStill(PV.fakeItemsProject(pr.items), 2.2, W)));
    return;
  }
  if (curCat === 'legendas') {
    for (const cp of CAPTION_PRESETS) grid.append(card(cp.name, 'Modelo de legenda', '9/16', () => useCaption(app, cp), async () => PV.renderStill(PV.fakeItemsProject([], '9:16', cp.cap), 1.5, W)));
    return;
  }
  if (curCat === 'estilos') {
    for (const t of TEMPLATES) grid.append(card(t.name, t.format, t.format.replace(':', '/'), () => useStyle(app, t), null));
    return;
  }
  if (curCat === 'meus') {
    const list = listUserTemplates();
    if (!list.length) grid.append(h('p', { class: 'empty' }, 'Você ainda não salvou modelos. No editor, abra Modelos e toque em "Salvar este vídeo como meu modelo".'));
    for (const u of list) grid.append(card(u.name, 'Meu modelo · ' + u.format, u.format.replace(':', '/'), () => useStyle(app, toTemplate(u)), null));
    return;
  }
  const list = STORYBOARDS.filter(s => s.cats.includes(curCat));
  for (const sb of list) {
    grid.append(card(sb.name, `${Math.round(storyDur(sb))} s · ${storyMediaCount(sb) ? storyMediaCount(sb) + ' cenas' : 'sem vídeo'}`, sb.format.replace(':', '/'), () => openStory(app, sb),
      async () => { const p = PV.fakeStoryProject(sb); return PV.renderStill(p, Math.min(1.4, sb.scenes[0].dur * 0.6), W); }));
  }
}

// ------------------------------------------------ detalhe de um modelo pronto
async function openStory(app, sb) {
  const PV = await import('./previewer.js');
  const vals = {};
  const cv = h('canvas', { class: 'sbprev' });
  const p = PV.fakeStoryProject(sb);
  const n = storyMediaCount(sb);
  const dlg = h('div', { class: 'sbdlg' });
  const close = () => { stop(); dlg.remove(); };
  const go = async files => { close(); await app.createFromStoryboard(sb, files, vals); };
  dlg.append(h('div', { class: 'sbbox' },
    h('div', { class: 'sbtop' }, h('b', {}, sb.name), h('button', { type: 'button', class: 'tpib', onclick: close }, '✕')),
    h('div', { class: 'sbview', style: { aspectRatio: sb.format.replace(':', '/') } }, cv),
    h('p', { class: 'hint' }, `${sb.desc} ${Math.round(storyDur(sb))} s.` + (n ? ` Escolha até ${n} vídeos ou fotos (se escolher menos, o app repete).` : '')),
    (sb.fields || []).length ? h('div', { class: 'sbfields' }, h('div', { class: 'sec-t' }, 'Seus textos (dá para mudar depois também)'),
      ...sb.fields.map(f => h('div', {}, h('div', { class: 'sec-t' }, f.label), textInput(f.def, v => { vals[f.k] = v; }, { multiline: /\n/.test(f.def), placeholder: f.def })))) : null,
    h('div', { class: 'sbact' },
      btn(n ? `Escolher vídeos e fotos` : 'Usar este modelo', async () => {
        if (!n) { go([]); return; }
        const files = await app.pickFiles('video/*,image/*,audio/*', true);
        if (files.length) go(files);
      }, 'pri big'),
      n ? btn('Usar só com fundos coloridos', () => go([]), 'sm') : null)));
  document.body.append(dlg);
  const stop = PV.animate(p, cv, 300);
}

async function useText(app, pr) {
  const files = await app.pickFiles('video/*,image/*', true);
  if (!files.length) return;
  await app.newProjectWith(files);
  if (!app.project.clips.length) return;
  const it = app.addTextPreset(pr, 0.2);
  if (it) P.itemPanel(app, it);
}
async function useCaption(app, cp) {
  const files = await app.pickFiles('video/*', true);
  if (!files.length) return;
  await app.newProjectWith(files);
  if (!app.project.clips.length) return;
  app.applyCaptionPreset(cp);
  app.transcribeAll();
  toast('A legenda vai aparecendo enquanto o app escuta. Pode continuar editando.', 4500);
}
async function useStyle(app, t) {
  const files = await app.pickFiles('video/*,image/*', true);
  if (!files.length) return;
  await app.newProjectWith(files, t.name, t.format);
  if (!app.project.clips.length) return;
  applyTemplate(app.project, t, { title: '', handle: '', intro: true, outro: true });
  app.applyFormat(); app.commit();
  toast('Estilo "' + t.name + '" aplicado. Em Modelos dá para trocar.');
}
