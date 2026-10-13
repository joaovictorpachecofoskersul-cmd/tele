// Controlador principal do editor.
import { store } from './store.js';
import { newProject, newClip, layout, clipDur, splitClipAt, clampItems, History, uid, dims, fmtTime, clamp, clipIndexAt } from './project.js';
import { Renderer } from './render.js';
import { Preview } from './preview.js';
import { Timeline } from './timeline.js';
import { loadFonts } from './fonts.js';
import { probe, thumbnails, imageThumb, decodeMono16k, envFrom16k, kindOf } from './media.js';
import { speechRanges } from './audio.js';
import { transcribe, cancelTranscription } from './asr.js';
import { exportVideo } from './export.js';
import { needsProxy, makeProxy } from './proxy.js';
import * as P from './panels.js';
import { h, $, toast, confirmBox, promptBox, btn } from './ui.js';

const isApp = !!(window.Android && window.Android.begin);

const app = window.APP = {
  project: null,
  history: new History(),
  sel: null,
  time: 0,
  capVersion: 0,
  urls: new Map(),
  blobs: new Map(),
  aux: new Map(),          // mid -> {thumbs, env}
  mono: new Map(),         // mid -> Float32Array 16 kHz (só na memória)
  framing: false,
};

// ======================================================================= início
async function init() {
  await loadFonts();
  store.persist();
  const stage = $('#stage canvas');
  app.renderer = new Renderer(stage);
  app.preview = new Preview(app);
  app.timeline = new Timeline($('#tl'), app);
  bindStage();
  bindTop();
  window.addEventListener('resize', () => { if (app.project) { fitStage(); app.timeline.build(); app.timeline.scrollTo(app.time); app.requestRender(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) app.preview.pause(); });
  window.edBack = onBack;
  await showHome();
}

async function showHome() {
  app.preview.pause();
  app.preview.releaseAll();
  if (app.project) await saveNow();
  app.project = null;
  if (optCtl && optCtl.cancel) { try { optCtl.cancel(); } catch (e) { } }
  for (const u of app.urls.values()) URL.revokeObjectURL(u);
  for (const u of app.proxyUrls.values()) URL.revokeObjectURL(u);
  app.urls.clear(); app.blobs.clear(); app.mono.clear(); app.proxyUrls.clear();
  $('#editor').hidden = true; $('#home').hidden = false;
  const list = $('#plist');
  list.innerHTML = '';
  const projects = await store.listProjects();
  if (!projects.length) list.append(h('p', { class: 'empty' }, 'Nenhum projeto ainda. Toque em "Novo projeto" e escolha seus vídeos e fotos.'));
  for (const p of projects) {
    const L = layout(p);
    let thumb = '';
    const first = p.clips[0] && p.clips[0].mid;
    if (first) { const ax = await store.getAux(first); thumb = ax && ax.thumbs && ax.thumbs.list[0] || ''; }
    const card = h('div', { class: 'pcard' },
      h('div', { class: 'pth', style: thumb ? { backgroundImage: `url(${thumb})` } : {} }),
      h('div', { class: 'pinfo' }, h('b', {}, p.name), h('span', {}, `${fmtTime(L.total)} · ${p.clips.length} clipes · ${new Date(p.updated).toLocaleDateString('pt-BR')}`)),
      h('div', { class: 'pact' },
        btn('✎', async e => { e.stopPropagation(); const n = await promptBox('Nome do projeto', p.name); if (n) { p.name = n; await store.putProject(p); showHome(); } }, 'sm'),
        btn('⧉', async e => { e.stopPropagation(); const c = JSON.parse(JSON.stringify(p)); c.id = uid(); c.name = p.name + ' (cópia)'; c.updated = Date.now(); await store.putProject(c); showHome(); }, 'sm'),
        btn('🗑', async e => { e.stopPropagation(); if (await confirmBox(`Apagar "${p.name}"?`, 'Apagar')) { await store.deleteProject(p); showHome(); } }, 'sm danger')),
    );
    card.addEventListener('click', () => openProject(p));
    list.append(card);
  }
  const u = await store.usage();
  $('#storage').textContent = u && u.usage ? `Espaço usado pelo app: ${(u.usage / 1e6).toFixed(0)} MB` : '';
}

async function openProject(p) {
  busy({ title: 'Abrindo projeto' });
  try {
    app.project = p;
    app.history.reset(p);
    app.sel = null; app.time = 0; app.capVersion++;
    for (const mid of Object.keys(p.media)) {
      const ax = await store.getAux(mid);
      if (ax) app.aux.set(mid, ax);
    }
    await preloadBlobs();
    for (const it of p.items) if (it.kind === 'image' && it.p.mid) await loadItemImage(it.p.mid);
    setTimeout(optimizeInBackground, 500);
    $('#home').hidden = true; $('#editor').hidden = false;
    $('#pname').textContent = p.name;
    app.applyFormat();
    app.timeline.build();
    app.setTime(0);
    updateToolbar();
  } finally { busyDone(); }
}

async function newProjectFlow() {
  const files = await pickFiles('video/*,image/*', true);
  if (!files.length) return;
  const p = newProject();
  await store.putProject(p);
  await openProject(p);
  await addFiles(files, 'append');
  if (app.project && app.project.clips.length) P.templatesPanel(app, true);
}

// ======================================================================= mídia
function pickFiles(accept, multiple) {
  return new Promise(res => {
    const inp = h('input', { type: 'file', accept, multiple: multiple || null, style: { display: 'none' } });
    let done = false;
    inp.addEventListener('change', () => { done = true; res([...inp.files]); inp.remove(); });
    document.body.append(inp);
    inp.click();
    // se a pessoa cancelar, alguns aparelhos não avisam: resolve vazio quando a janela volta
    window.addEventListener('focus', () => setTimeout(() => { if (!done) { res([]); inp.remove(); } }, 1200), { once: true });
  });
}

app.getBlob = async mid => {
  if (app.blobs.has(mid)) return app.blobs.get(mid);
  const b = await store.getMedia(mid);
  if (!b) throw new Error('arquivo não encontrado');
  app.blobs.set(mid, b);
  return b;
};
app.urlOf = mid => {
  if (!app.urls.has(mid)) {
    const b = app.blobs.get(mid);
    if (!b) { app.getBlob(mid).then(() => app.requestRender()); return ''; }
    app.urls.set(mid, URL.createObjectURL(b));
  }
  return app.urls.get(mid);
};
// prévia usa a cópia otimizada quando existe
app.proxyUrls = new Map();
app.previewUrlOf = mid => app.proxyUrls.get(mid) || app.urlOf(mid);
app.auxOf = mid => app.aux.get(mid);
app.envOf = mid => { const a = app.aux.get(mid); return a && a.env; };

async function preloadBlobs() {
  for (const mid of Object.keys(app.project.media)) { try { await app.getBlob(mid); } catch (e) { } }
}

async function addMedia(file) {
  const mid = uid();
  const kind = kindOf(file);
  await store.putMedia(mid, file);
  app.blobs.set(mid, file);
  const url = URL.createObjectURL(file);
  app.urls.set(mid, url);
  const info = await probe(file, url);
  const m = { id: mid, kind, name: file.name, dur: info.dur, w: info.w, h: info.h, hasAudio: info.hasAudio };
  app.project.media[mid] = m;
  let thumbs = null;
  if (kind === 'video') thumbs = await thumbnails(url, info.dur, Math.min(30, Math.max(4, Math.ceil(info.dur / 2))));
  else if (kind === 'image') thumbs = await imageThumb(file);
  const ax = { thumbs };
  app.aux.set(mid, ax);
  await store.putAux(mid, ax);
  return m;
}

async function addFiles(files, mode) {
  const p = app.project;
  const L = layout(p);
  let at = mode === 'append' || !p.clips.length ? p.clips.length : clipIndexAt(p, app.time, L) + 1;
  let n = 0;
  for (const f of files) {
    busy({ title: `Importando ${++n} de ${files.length}`, detail: f.name });
    try {
      const m = await addMedia(f);
      if (m.kind === 'audio') { p.audio.music = { mid: m.id, vol: 0.5, start: 0 }; toast('Áudio colocado como música de fundo'); continue; }
      const c = newClip(m);
      if (m.kind === 'video' && m.w && m.h) {
        const [W, H] = dims(p);
        // vídeo deitado num formato em pé: cabe com fundo desfocado
        if ((m.w / m.h > 1.2) !== (W / H > 1.2)) c.fit = 'blur';
      }
      p.clips.splice(at++, 0, c);
    } catch (e) {
      toast('Não consegui abrir ' + f.name + ': ' + e.message, 4000);
    }
  }
  busyDone();
  app.commit();
  optimizeInBackground();
}

// Cria cópias leves de vídeos pesados (4K, HEVC/HDR, 60 fps) para a prévia não travar.
let optimizing = false, optCtl = null;
async function optimizeInBackground() {
  if (optimizing || !app.project) return;
  optimizing = true;
  const p = app.project;
  try {
    for (const m of Object.values(p.media)) {
      if (app.project !== p) break;
      if (m.kind !== 'video' || m.proxy === false || app.proxyUrls.has(m.id)) continue;
      const px = await store.getMedia(m.id + '_px');
      if (px) { app.proxyUrls.set(m.id, URL.createObjectURL(px)); app.preview.forgetMedia(m.id); app.requestRender(); continue; }
      const blob = await app.getBlob(m.id);
      if (m.proxy !== true && !(await needsProxy(blob, m))) { m.proxy = false; scheduleSave(); continue; }
      $('#bgtask').textContent = 'Otimizando vídeo para editar: 0%';
      try {
        optCtl = {};
        const out = await makeProxy(blob, m, k => { $('#bgtask').textContent = `Otimizando vídeo para editar: ${Math.round(k * 100)}%`; }, optCtl);
        if (app.project !== p) break;
        await store.putMedia(m.id + '_px', out);
        m.proxy = true; scheduleSave();
        app.proxyUrls.set(m.id, URL.createObjectURL(out));
        app.preview.forgetMedia(m.id);
        app.requestRender();
      } catch (e) { m.proxy = false; console.warn('proxy', e); }
    }
  } finally { optimizing = false; optCtl = null; $('#bgtask').textContent = ''; }
}

app.lowerPreview = () => {
  const steps = [960, 720, 540];
  const i = steps.indexOf(app.previewSide || 960);
  if (i < 0 || i >= steps.length - 1) return false;
  app.previewSide = steps[i + 1];
  app.preview.maxSide = app.previewSide;
  app.applyFormat();
  return true;
};

async function ensureEnv(mid, onProgress) {
  const ax = app.aux.get(mid) || {};
  if (ax.env && (app.mono.has(mid) || !onProgress)) return ax.env;
  const m = app.project.media[mid];
  const mono = await decodeMono16k(await app.getBlob(mid), m.dur, onProgress);
  app.mono.set(mid, mono);
  ax.env = envFrom16k(mono);
  app.aux.set(mid, ax);
  await store.putAux(mid, ax);
  return ax.env;
}

async function loadItemImage(mid) {
  try { app.renderer.images.set(mid, await createImageBitmap(await app.getBlob(mid))); } catch (e) { }
}

app.importFiles = async mode => {
  const files = await pickFiles('video/*,image/*', true);
  if (files.length) await addFiles(files, mode);
};

app.importMusic = async () => {
  const [f] = await pickFiles('audio/*,video/*', false);
  if (!f) return;
  busy({ title: 'Importando música', detail: f.name });
  try {
    const m = await addMedia(f);
    app.project.audio.music = { mid: m.id, vol: 0.5, start: 0 };
    app.commit();
  } catch (e) { toast('Não consegui abrir a música: ' + e.message, 4000); }
  busyDone();
};

app.addNarrationFile = async () => {
  const [f] = await pickFiles('audio/*,video/*', false);
  if (!f) return;
  busy({ title: 'Importando áudio', detail: f.name });
  try {
    const m = await addMedia(f);
    m.hasAudio = true;
    app.addItem('audio', { mid: m.id, vol: 1, in: 0 }, null, m.dur);
    const it = app.project.items[app.project.items.length - 1];
    it.dur = m.dur; app.commit();
    toast('Narração adicionada no cursor');
  } catch (e) { toast('Não consegui abrir o áudio: ' + e.message, 4000); }
  busyDone();
};

// Grava narração pelo microfone enquanto o vídeo toca (sem som, para não vazar no microfone)
app.recordNarration = async () => {
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } }); }
  catch (e) { toast('Permita o uso do microfone para gravar a narração', 4000); return; }
  const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', ''].find(m => !m || (window.MediaRecorder && MediaRecorder.isTypeSupported(m)));
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = e => e.data && e.data.size && chunks.push(e.data);
  const start = app.time;
  const bg = h('div', { class: 'modal' });
  const clock = h('div', { class: 'recclock' }, '0:00');
  const stop = btn('■ Parar', () => rec.stop(), 'pri big');
  bg.append(h('div', { class: 'mbox', style: { textAlign: 'center' } }, h('div', { class: 'recdot' }), h('p', {}, 'Gravando narração. O vídeo está tocando sem som para você acompanhar.'), clock, stop));
  document.body.append(bg);
  const t0 = Date.now();
  const iv = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); clock.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 250);
  app.recording = true;
  rec.onstop = async () => {
    clearInterval(iv); app.recording = false; app.preview.pause(); bg.remove();
    stream.getTracks().forEach(t => t.stop());
    const type = (rec.mimeType || 'audio/webm').split(';')[0];
    const blob = new Blob(chunks, { type });
    if (!blob.size) { toast('A gravação ficou vazia'); return; }
    busy({ title: 'Salvando narração' });
    try {
      const f = new File([blob], 'narracao-' + new Date().toLocaleTimeString('pt-BR').replace(/:/g, '') + (type.includes('mp4') ? '.m4a' : '.webm'), { type });
      const m = await addMedia(f);
      m.kind = 'audio'; m.hasAudio = true;
      app.addItem('audio', { mid: m.id, vol: 1, in: 0 }, start, m.dur || (Date.now() - t0) / 1000);
      toast('Narração gravada');
    } catch (e) { toast('Erro ao salvar a narração: ' + e.message, 4000); }
    busyDone();
    app.setTime(start);
  };
  rec.start(500);
  app.setTime(start);
  app.preview.play();
};

app.importImageForItem = async () => {
  const [f] = await pickFiles('image/*', false);
  if (!f) return null;
  busy({ title: 'Importando imagem' });
  try {
    const m = await addMedia(f);
    await loadItemImage(m.id);
    return m.id;
  } catch (e) { toast('Não consegui abrir a imagem', 3000); return null; } finally { busyDone(); }
};

// ======================================================================= estado
let saveT = null;
function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(saveNow, 700); }
async function saveNow() {
  clearTimeout(saveT);
  if (!app.project) return;
  app.project.updated = Date.now();
  try { await store.putProject(app.project); } catch (e) { toast('Não consegui salvar: ' + e.message, 4000); }
}

app.commit = () => {
  const p = app.project; if (!p) return;
  clampItems(p);
  app.capVersion++;
  app.history.push(p);
  scheduleSave();
  app.timeline.build();
  const L = layout(p);
  if (app.time > L.total) app.setTime(L.total);
  updateClock();
  updateToolbar();
  app.requestRender();
};

let liveT = null;
app.live = (rebuild = false) => {
  app.capVersion++;
  app.requestRender();
  if (rebuild) { cancelAnimationFrame(liveT); liveT = requestAnimationFrame(() => app.timeline.build()); }
};

function restore(state) {
  if (!state) return;
  app.preview.pause();
  app.project = state;
  app.sel = null; app.capVersion++;
  closeSheet();
  app.timeline.build();
  updateToolbar();
  scheduleSave();
  app.requestRender();
}

app.select = sel => {
  app.sel = sel;
  app.timeline.build();
  updateToolbar();
  app.requestRender();
  if (!sel) closeSheet();
};

app.selectedClip = () => app.sel && app.sel.type === 'clip' ? app.project.clips.find(c => c.id === app.sel.id) : null;
app.selectedItem = () => app.sel && app.sel.type === 'item' ? app.project.items.find(i => i.id === app.sel.id) : null;

// ======================================================================= tempo e renderização
app.setTime = t => {
  const L = layout(app.project);
  app.time = clamp(t, 0, Math.max(0, L.total - 0.001));
  app.timeline.scrollTo(app.time);
  updateClock();
  app.requestRender();
};

app.scrub = t => {
  if (app.preview.playing) app.preview.pause();
  const L = layout(app.project);
  app.time = clamp(t, 0, Math.max(0, L.total - 0.001));
  updateClock();
  app.requestRender();
};

app.onPlayhead = t => { app.timeline.scrollTo(t); updateClock(); };
app.onPlayState = on => { $('#play').textContent = on ? '❚❚' : '▶'; };

let rq = false, rendering = false, again = false;
app.requestRender = () => {
  if (rq || app.preview.playing) return;
  rq = true;
  requestAnimationFrame(() => { rq = false; app.renderNow(); });
};
app.renderNow = async () => {
  if (!app.project) return;
  if (rendering) { again = true; return; }
  rendering = true;
  try {
    await app.renderer.render(app.project, app.time, app.preview, { capVersion: app.capVersion, keepPrev: app.preview.playing });
    drawSelection();
  } catch (e) { console.error(e); }
  rendering = false;
  if (again) { again = false; if (!app.preview.playing) app.requestRender(); }
};

function updateClock() {
  const L = layout(app.project);
  $('#clock').textContent = `${fmtTime(app.time)} / ${fmtTime(L.total)}`;
}

app.applyFormat = () => {
  const [W, H] = dims(app.project);
  const k = Math.min(1, (app.previewSide || 960) / Math.max(W, H));
  app.renderer.setSize(Math.round(W * k / 2) * 2, Math.round(H * k / 2) * 2);
  fitStage();
  app.requestRender();
};

function fitStage() {
  const box = $('#stage');
  const c = $('#stage canvas');
  const [W, H] = dims(app.project);
  const bw = box.clientWidth, bh = box.clientHeight;
  const s = Math.min(bw / W, bh / H);
  c.style.width = Math.floor(W * s) + 'px'; c.style.height = Math.floor(H * s) + 'px';
}

// ======================================================================= edição
app.addItem = (kind, p, start, dur) => {
  const L = layout(app.project);
  const s = clamp(start ?? app.time, 0, Math.max(0, L.total - 0.2));
  const it = { id: uid(), kind, start: s, dur: Math.max(0.2, Math.min(dur, Math.max(0.2, L.total - s))), p };
  app.project.items.push(it);
  app.sel = { type: 'item', id: it.id };
  app.commit();
  return it;
};

app.moveItem = (it, start) => {
  const L = layout(app.project);
  it.start = clamp(start, 0, Math.max(0, L.total - Math.min(it.dur, 0.2)));
  app.live();
};

app.trimItem = (it, side, ds) => {
  const L = layout(app.project);
  if (side === 'start') {
    let ns = clamp(it.start + ds, 0, it.start + it.dur - 0.1);
    if (it.kind === 'audio') { const a = (it.p.in || 0) + (ns - it.start); if (a < 0) ns -= a; it.p.in = Math.max(0, (it.p.in || 0) + (ns - it.start)); }
    it.dur += it.start - ns; it.start = ns;
    app.time = ns;
  } else {
    let max = Math.max(0.1, L.total - it.start);
    if (it.kind === 'audio') { const m = app.project.media[it.p.mid]; if (m) max = Math.max(0.1, m.dur - (it.p.in || 0)); }
    it.dur = clamp(it.dur + ds, 0.1, max);
    app.time = Math.max(0, it.start + it.dur - 0.02);
  }
  updateClock(); app.live();
};

app.trimClip = (c, side, ds) => {
  const m = app.project.media[c.mid];
  const sp = c.speed || 1;
  const L = layout(app.project);
  const i = app.project.clips.indexOf(c);
  if (side === 'in') {
    c.in = clamp(c.in + ds * sp, 0, c.out - 0.1);
    app.time = L.starts[i];
  } else {
    const max = m.kind === 'image' ? 600 : m.dur;
    c.out = clamp(c.out + ds * sp, c.in + 0.1, max);
    app.time = L.starts[i] + clipDur(c) - 0.03;
  }
  updateClock(); app.live();
};

app.splitAtPlayhead = () => {
  if (splitClipAt(app.project, app.time)) { app.commit(); toast('Clipe dividido'); }
  else toast('Coloque o cursor no meio de um clipe para dividir');
};

app.deleteSelected = () => {
  const p = app.project, s = app.sel;
  if (!s) return;
  if (s.type === 'clip') p.clips = p.clips.filter(c => c.id !== s.id);
  if (s.type === 'item') p.items = p.items.filter(i => i.id !== s.id);
  if (s.type === 'music') p.audio.music = null;
  app.sel = null; closeSheet();
  app.commit();
};

app.duplicateClip = c => {
  const i = app.project.clips.indexOf(c);
  const d = JSON.parse(JSON.stringify(c)); d.id = uid();
  app.project.clips.splice(i + 1, 0, d);
  app.commit();
};

app.duplicateItem = it => {
  const d = JSON.parse(JSON.stringify(it)); d.id = uid(); d.start = it.start + it.dur;
  app.project.items.push(d);
  app.sel = { type: 'item', id: d.id };
  app.commit();
};

app.moveClip = (c, dir) => {
  const a = app.project.clips, i = a.indexOf(c), j = i + dir;
  if (j < 0 || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]];
  app.commit();
  app.setTime(layout(app.project).starts[j] + 0.01);
};

app.replayItem = it => { app.setTime(Math.max(0, it.start - 0.15)); setTimeout(() => app.preview.play(), 60); };

app.cutSilences = async clips => {
  const p = app.project;
  clips = clips || p.clips.slice();
  let removed = 0, cuts = 0;
  for (const c of clips) {
    const m = p.media[c.mid];
    if (!m || m.kind === 'image' || !m.hasAudio) continue;
    busy({ title: 'Procurando silêncios', detail: m.name, progress: 0 });
    let env;
    try { env = await ensureEnv(c.mid, k => busyUpdate({ progress: k })); } catch (e) { continue; }
    const ranges = speechRanges(env, c.in, c.out, 0.5);
    if (ranges.length === 1 && Math.abs(ranges[0].s - c.in) < 0.05 && Math.abs(ranges[0].e - c.out) < 0.05) continue;
    const i = p.clips.indexOf(c);
    const before = c.out - c.in;
    const parts = ranges.map((r, k) => {
      const d = JSON.parse(JSON.stringify(c));
      d.id = k === 0 ? c.id : uid(); d.in = r.s; d.out = r.e;
      d.trans = k === ranges.length - 1 ? c.trans : { id: 'none', dur: 0.4, text: 'WOW' };
      return d;
    });
    p.clips.splice(i, 1, ...parts);
    removed += before - parts.reduce((a, d) => a + d.out - d.in, 0);
    cuts += parts.length - 1;
  }
  busyDone();
  if (cuts) { app.commit(); toast(`${cuts} pausas cortadas, ${removed.toFixed(1).replace('.', ',')} s a menos`, 3500); }
  else toast('Não encontrei pausas para cortar');
};

// ======================================================================= legenda
app.mediaNeedingTranscript = () => {
  const p = app.project;
  const mids = [...new Set([...p.clips.map(c => c.mid), ...p.items.filter(i => i.kind === 'audio').map(i => i.p.mid)])];
  return mids.filter(mid => { const m = p.media[mid]; return m && m.kind !== 'image' && (m.hasAudio || m.kind === 'audio') && !(p.transcripts[mid] && p.transcripts[mid].length); });
};

app.transcribeAll = async () => {
  const mids = app.mediaNeedingTranscript();
  if (!mids.length) { toast('Todos os vídeos já têm legenda'); return; }
  const p = app.project;
  let model = 'rapida';
  try { model = localStorage.getItem('ed.asr') || 'rapida'; } catch (e) { }
  let done = 0, total = 0, cancelledByUser = false;
  const fmtEta = s => s > 90 ? `uns ${Math.ceil(s / 60)} min` : `uns ${Math.max(5, Math.round(s / 5) * 5)} s`;
  try {
    for (const mid of mids) {
      const m = p.media[mid];
      const title = mids.length > 1 ? `Legendando ${done + 1} de ${mids.length}` : 'Gerando legenda';
      busy({ title, detail: 'Lendo o áudio do vídeo', progress: 0, cancel: () => { cancelledByUser = true; cancelTranscription(); } });
      await ensureEnv(mid, k => busyUpdate({ progress: k * 0.05 }));
      let mono = app.mono.get(mid);
      if (!mono) { mono = await decodeMono16k(await app.getBlob(mid), m.dur); app.mono.set(mid, mono); }
      const t0 = Date.now();
      const words = await transcribe(mono, app.envOf(mid), {
        model,
        onStage: st => {
          if (st === 'loading') busyUpdate({ detail: 'Abrindo o reconhecimento de voz...', progress: null });
          if (st === 'preparing') busyUpdate({ detail: 'Preparando o reconhecimento de voz. Na primeira vez pode levar até 1 minuto.', progress: null });
          if (st === 'safe') busyUpdate({ detail: 'O celular demorou para responder. Continuando em modo seguro (mais lento, porém estável)...', progress: null });
        },
        onDownload: (l, t) => busyUpdate({ detail: `Baixando o reconhecimento de voz (só na primeira vez): ${(l / 1e6).toFixed(0)} de ${(t / 1e6).toFixed(0)} MB`, progress: t ? l / t : null }),
        onProgress: (k, part, parts, eta) => {
          const sec = Math.round((Date.now() - t0) / 1000);
          busyUpdate({ detail: `Escutando e escrevendo${parts > 1 ? ` (parte ${part} de ${parts})` : ''}... ${Math.round(k * 100)}%` + (eta > 3 ? ` · falta ${fmtEta(eta)}` : '') + ` · ${sec} s`, progress: 0.05 + 0.95 * k });
        },
      });
      p.transcripts[mid] = words;
      total += words.length; done++;
    }
    busyDone();
    p.captions.on = true;
    app.commit();
    toast(total ? `Legenda pronta: ${total} palavras. Confira e corrija se precisar.` : 'Não encontrei fala nesse vídeo.', 4000);
  } catch (e) {
    busyDone();
    const msg = String(e.message || e);
    if (cancelledByUser || msg === 'cancelado' || msg === 'reiniciado') toast('Legenda cancelada');
    else if (/fetch|network|Failed to load|404|Could not locate|Unauthorized/i.test(msg)) toast('Para a primeira legenda o app precisa de internet para baixar o reconhecimento de voz. Conecte e tente de novo.', 6000);
    else toast('Erro na legenda automática: ' + msg, 7000);
    if (done) app.commit();
  }
};

// Corrige o texto de uma "página" da legenda
app.editCaptionPage = (pg, text) => {
  const p = app.project;
  const tokens = String(text).trim().split(/\s+/).filter(Boolean);
  const byMid = {};
  for (const w of pg.words) (byMid[w.mid] = byMid[w.mid] || []).push(w.k);
  const mids = Object.keys(byMid);
  if (mids.length !== 1) { toast('Este trecho junta dois vídeos; corrija palavra por palavra'); return; }
  const mid = mids[0], arr = p.transcripts[mid], ks = byMid[mid].sort((a, b) => a - b);
  const k0 = ks[0], n = ks[ks.length - 1] - k0 + 1;
  const old = arr.slice(k0, k0 + n);
  let neu;
  if (tokens.length === old.length) neu = old.map((w, i) => ({ ...w, w: tokens[i] }));
  else {
    const s0 = old[0].s, e0 = old[old.length - 1].e;
    const weights = tokens.map(t => Math.max(2, t.length)), tw = weights.reduce((a, b) => a + b, 0);
    let s = s0;
    neu = tokens.map((t, i) => { const d = (e0 - s0) * weights[i] / tw; const w = { w: t, s: +s.toFixed(3), e: +(s + d).toFixed(3) }; s += d; return w; });
  }
  arr.splice(k0, n, ...neu);
  app.commit();
  P.captionsEditor(app);
};

// ======================================================================= painéis e barra de ferramentas
app.openSheet = (title, content, opt = {}) => {
  const sh = $('#sheet');
  $('#sheet-t').textContent = title;
  const body = $('#sheet-b');
  body.innerHTML = ''; body.append(content); body.scrollTop = 0;
  sh.classList.add('open');
  sh._onClose = opt.onClose;
  $('#sheet-back').hidden = !opt.back;
  $('#sheet-back').onclick = opt.back || null;
  document.body.classList.add('sheet-open');
  setTimeout(() => { app.timeline.build(); app.timeline.scrollTo(app.time); }, 260);
};
function closeSheet() {
  const sh = $('#sheet');
  if (!sh.classList.contains('open')) return;
  sh.classList.remove('open');
  document.body.classList.remove('sheet-open');
  if (sh._onClose) sh._onClose();
  app.framing = false;
  setTimeout(() => { app.timeline.build(); app.timeline.scrollTo(app.time); }, 260);
}
app.closeSheet = closeSheet;
app.openTransition = i => P.transitionPanel(app, i);
app.openAudio = () => P.audioPanel(app);

function tool(icon, label, fn, cls = '') {
  const b = h('button', { class: 'tool ' + cls, type: 'button' }, h('span', { class: 'ti-i' }, icon), h('span', {}, label));
  b.addEventListener('click', fn);
  return b;
}

function updateToolbar() {
  const bar = $('#tools');
  bar.innerHTML = '';
  const s = app.sel;
  const clip = app.selectedClip(), item = app.selectedItem();
  if (clip) {
    bar.append(
      tool('✂', 'Dividir', () => app.splitAtPlayhead()),
      tool('⏩', 'Velocidade', () => P.clipPanel(app, clip, 'speed')),
      tool('🔊', 'Volume', () => P.clipPanel(app, clip, 'vol')),
      tool('⛶', 'Enquadrar', () => P.clipPanel(app, clip, 'frame')),
      tool('✦', 'Efeitos', () => P.clipPanel(app, clip, 'fx')),
      tool('〰', 'Silêncios', () => app.cutSilences([clip])),
      tool('⧉', 'Duplicar', () => app.duplicateClip(clip)),
      tool('…', 'Mais', () => P.clipPanel(app, clip, 'more')),
      tool('🗑', 'Excluir', () => app.deleteSelected(), 'danger'),
    );
  } else if (item) {
    bar.append(
      tool('✎', 'Editar', () => P.itemPanel(app, item)),
      tool('⇤', 'No cursor', () => { app.moveItem(item, app.time); app.commit(); }),
      tool('▶', 'Ver', () => app.replayItem(item)),
      tool('⧉', 'Duplicar', () => app.duplicateItem(item)),
      tool('🗑', 'Excluir', () => app.deleteSelected(), 'danger'),
    );
  } else if (s && s.type === 'captions') {
    bar.append(
      tool('Aa', 'Estilo', () => P.captionsPanel(app)),
      tool('✎', 'Corrigir', () => P.captionsEditor(app)),
      tool(app.project.captions.on ? '◉' : '○', app.project.captions.on ? 'Ocultar' : 'Mostrar', () => { app.project.captions.on = !app.project.captions.on; app.commit(); }),
    );
  } else {
    bar.append(
      tool('＋', 'Mídia', () => app.importFiles('cursor')),
      tool('▦', 'Modelos', () => P.templatesPanel(app)),
      tool('✂', 'Dividir', () => app.splitAtPlayhead()),
      tool('🎙', 'Legendas', () => P.captionsPanel(app)),
      tool('𝐓', 'Texto', () => { const it = app.addItem('text', { text: 'SEU TEXTO', font: 'Poppins', size: .09, color: '#FFFFFF', stroke: '#000000', bg: '', x: .5, y: .3, anim: 'pop', upper: true }, null, 3); P.itemPanel(app, it); }),
      tool('◈', 'Elementos', () => P.elementsPanel(app)),
      tool('✦', 'Efeitos', () => P.effectsPanel(app)),
      tool('⧓', 'Transições', () => {
        const L = layout(app.project); const n = app.project.clips.length;
        if (n < 2) { toast('Coloque pelo menos dois clipes para usar transição'); return; }
        let best = 0, bd = 1e9; for (let i = 0; i < n - 1; i++) { const d = Math.abs(L.starts[i + 1] - app.time); if (d < bd) { bd = d; best = i; } }
        app.openTransition(best);
      }),
      tool('♪', 'Áudio', () => P.audioPanel(app)),
      tool('◆', 'Sons', () => P.soundsPanel(app)),
      tool('〰', 'Cortar pausas', () => app.cutSilences()),
      tool('▭', 'Formato', () => P.formatPanel(app)),
    );
  }
  $('#undo').disabled = !app.history.canUndo();
  $('#redo').disabled = !app.history.canRedo();
}

// ======================================================================= prévia: tocar e arrastar
function drawSelection() {
  const box = $('#selbox');
  const c = $('#stage canvas');
  const s = app.sel;
  let b = null;
  if (s && s.type === 'item') b = (app.renderer.lastBoxes.items || []).find(x => x.id === s.id);
  if (s && s.type === 'captions') b = app.renderer.lastBoxes.captions;
  if (!b || app.preview.playing) { box.hidden = true; return; }
  const k = c.clientWidth / c.width;
  const r = c.getBoundingClientRect(), pr = $('#stage').getBoundingClientRect();
  Object.assign(box.style, { left: (r.left - pr.left + b.x * k) + 'px', top: (r.top - pr.top + b.y * k) + 'px', width: (b.w * k) + 'px', height: (b.h * k) + 'px' });
  box.hidden = false;
}

function bindStage() {
  const c = $('#stage canvas');
  const pts = new Map();
  let drag = null;
  const norm = e => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
  const hit = (n) => {
    const W = c.width, H = c.height, X = n.x * W, Y = n.y * H;
    const inBox = b => b && X >= b.x && X <= b.x + b.w && Y >= b.y && Y <= b.y + b.h;
    const items = (app.renderer.lastBoxes.items || []).slice().reverse();
    for (const b of items) if (inBox(b) && b.w < W * 0.98) return { type: 'item', id: b.id };
    if (inBox(app.renderer.lastBoxes.captions)) return { type: 'captions' };
    return null;
  };
  c.addEventListener('pointerdown', e => {
    c.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, norm(e));
    if (pts.size === 2 && drag && drag.type === 'frame') {
      const [a, b] = [...pts.values()]; drag.d0 = Math.hypot(a.x - b.x, a.y - b.y); drag.z0 = drag.clip.zoom || 1;
      return;
    }
    if (pts.size > 1) return;
    const n = norm(e);
    const target = hit(n);
    const clip = app.selectedClip();
    if (target && target.type === 'item') {
      const it = app.project.items.find(i => i.id === target.id);
      const was = app.sel && app.sel.id === it.id;
      if (!was) app.select(target);
      drag = { type: 'item', it, n0: n, x0: it.p.x, y0: it.p.y, moved: false, was };
    } else if (target && target.type === 'captions') {
      const was = app.sel && app.sel.type === 'captions';
      if (!was) app.select(target);
      drag = { type: 'cap', n0: n, x0: app.project.captions.x, y0: app.project.captions.y, moved: false, was };
    } else if (clip && app.framing) {
      drag = { type: 'frame', clip, n0: n, x0: clip.x || 0, y0: clip.y || 0, moved: false };
    } else drag = { type: 'tap', n0: n, moved: false };
  });
  c.addEventListener('pointermove', e => {
    if (!drag || !pts.has(e.pointerId)) return;
    pts.set(e.pointerId, norm(e));
    if (drag.type === 'frame' && pts.size === 2 && drag.d0) {
      const [a, b] = [...pts.values()];
      drag.clip.zoom = clamp(drag.z0 * Math.hypot(a.x - b.x, a.y - b.y) / drag.d0, 0.3, 4); drag.moved = true; app.live(); return;
    }
    const n = norm(e), dx = n.x - drag.n0.x, dy = n.y - drag.n0.y;
    if (Math.abs(dx) + Math.abs(dy) > 0.01) drag.moved = true;
    if (!drag.moved) return;
    if (drag.type === 'item' && drag.x0 != null) { drag.it.p.x = clamp(drag.x0 + dx, -0.2, 1.2); if (drag.y0 != null) drag.it.p.y = clamp(drag.y0 + dy, -0.1, 1.1); app.live(); }
    if (drag.type === 'item' && drag.x0 == null && drag.y0 != null) { drag.it.p.y = clamp(drag.y0 + dy, 0, 1); app.live(); }
    if (drag.type === 'cap') { app.project.captions.x = clamp(drag.x0 + dx, 0.1, 0.9); app.project.captions.y = clamp(drag.y0 + dy, 0.05, 0.95); app.live(); }
    if (drag.type === 'frame') { drag.clip.x = clamp(drag.x0 + dx, -0.8, 0.8); drag.clip.y = clamp(drag.y0 + dy, -0.8, 0.8); app.live(); }
  });
  const end = e => {
    pts.delete(e.pointerId);
    if (!drag || pts.size) return;
    if (drag.moved) app.commit();
    else if (drag.type === 'item' && drag.was) P.itemPanel(app, drag.it);
    else if (drag.type === 'cap' && drag.was) P.captionsPanel(app);
    else if (drag.type === 'tap') { if (app.sel) app.select(null); else app.preview.toggle(); }
    drag = null;
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
}

function bindTop() {
  $('#newp').addEventListener('click', newProjectFlow);
  $('#back').addEventListener('click', () => showHome());
  $('#play').addEventListener('click', () => app.preview.toggle());
  $('#undo').addEventListener('click', () => restore(app.history.undo()));
  $('#redo').addEventListener('click', () => restore(app.history.redo()));
  $('#zin').addEventListener('click', () => app.timeline.zoom(1.4));
  $('#zout').addEventListener('click', () => app.timeline.zoom(1 / 1.4));
  $('#exp').addEventListener('click', () => { app.preview.pause(); P.exportPanel(app); });
  $('#sheet-x').addEventListener('click', () => closeSheet());
  $('#pname').addEventListener('click', async () => { const n = await promptBox('Nome do projeto', app.project.name); if (n) { app.project.name = n; $('#pname').textContent = n; scheduleSave(); } });
}

function onBack() {
  if (!$('#busy').hidden) return true;
  if (!$('#result').hidden) { closeResult(); return true; }
  if (document.querySelector('.modal')) { document.querySelector('.modal').remove(); return true; }
  if ($('#sheet').classList.contains('open')) { closeSheet(); return true; }
  if (app.preview.playing) { app.preview.pause(); return true; }
  if (app.sel) { app.select(null); return true; }
  if (app.project) { showHome(); return true; }
  return false;
}

// ======================================================================= carregando / progresso
let busyCancel = null;
function busy({ title, detail = '', progress = null, cancel = null }) {
  $('#busy').hidden = false;
  $('#busy-t').textContent = title || 'Aguarde';
  busyUpdate({ detail, progress });
  busyCancel = cancel;
  $('#busy-x').hidden = !cancel;
}
function busyUpdate({ detail, progress }) {
  if (detail != null) $('#busy-d').textContent = detail;
  const bar = $('#busy-p');
  if (progress == null) bar.classList.add('ind'); else { bar.classList.remove('ind'); bar.firstElementChild.style.width = Math.round(progress * 100) + '%'; }
}
function busyDone() { $('#busy').hidden = true; busyCancel = null; }
app.busy = busy; app.busyUpdate = busyUpdate; app.busyDone = busyDone;
$('#busy-x').addEventListener('click', () => busyCancel && busyCancel());

// ======================================================================= exportar
app.runExport = async q => {
  const ctl = { aborted: false };
  await preloadBlobs();
  busy({ title: 'Exportando vídeo', detail: 'Preparando', progress: 0, cancel: () => { ctl.aborted = true; busyUpdate({ detail: 'Cancelando...' }); } });
  const t0 = Date.now();
  try {
    const r = await exportVideo(app, { bitrate: q.bitrate }, (k, msg, eta) => {
      busyUpdate({ progress: k, detail: msg + (eta ? ` · faltam ~${Math.ceil(eta / 60) > 1 ? Math.ceil(eta / 60) + ' min' : Math.ceil(eta) + ' s'}` : '') });
    }, ctl);
    busyDone();
    showResult(r, (Date.now() - t0) / 1000);
  } catch (e) {
    busyDone();
    if (String(e.message) !== 'cancelado') toast('Erro ao exportar: ' + e.message, 7000); else toast('Exportação cancelada');
  }
};

let resultUrl = null;
function showResult(r, secs) {
  const name = (app.project.name || 'video').replace(/[^\w\-À-ú ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) + '-' + Date.now().toString().slice(-6) + '.' + r.ext;
  resultUrl = URL.createObjectURL(r.blob);
  const v = $('#result video'); v.src = resultUrl;
  $('#result-info').textContent = `${(r.blob.size / 1e6).toFixed(1).replace('.', ',')} MB · ${r.vcodec.toUpperCase()}${r.acodec ? ' + ' + r.acodec.toUpperCase() : ''} · pronto em ${Math.round(secs)} s`;
  $('#result').hidden = false;
  $('#r-save').onclick = () => saveBlob(r.blob, name);
  $('#r-share').onclick = async () => {
    if (isApp && window.Android.shareLast) { const ok = await saveBlob(r.blob, name, true); if (ok) window.Android.shareLast(); return; }
    try { await navigator.share({ files: [new File([r.blob], name, { type: r.blob.type })] }); } catch (e) { toast('Não foi possível compartilhar daqui'); }
  };
  $('#r-close').onclick = closeResult;
}
function closeResult() {
  const v = $('#result video'); v.pause(); v.removeAttribute('src'); v.load();
  if (resultUrl) URL.revokeObjectURL(resultUrl); resultUrl = null;
  $('#result').hidden = true;
}

const toB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(b); });
let savedName = null;
async function saveBlob(blob, name, quiet) {
  if (isApp) {
    if (savedName === name) return true;
    const CH = 1024 * 1024;
    busy({ title: 'Salvando na galeria', progress: 0 });
    try {
      const r0 = window.Android.begin(name); if (r0 !== 'ok') throw new Error(r0);
      for (let o = 0; o < blob.size; o += CH) {
        const r = window.Android.chunk(name, await toB64(blob.slice(o, o + CH)));
        if (r !== 'ok') throw new Error(r);
        busyUpdate({ progress: o / blob.size });
      }
      const r = window.Android.finish(name, blob.type);
      if (!r.startsWith('ok')) throw new Error(r);
      savedName = name;
      busyDone();
      if (!quiet) toast('Salvo na galeria, pasta Filmes/Editor', 3500);
      return true;
    } catch (e) { busyDone(); toast('Erro ao salvar: ' + e.message, 5000); return false; }
  }
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  toast('Vídeo baixado');
  return true;
}

// ganchos para teste automatizado
app._test = {
  async newWithFiles(files) { const p = newProject('Teste'); await store.putProject(p); await openProject(p); await addFiles(files, 'append'); },
  ensureEnv, showHome, openProject,
};

init().catch(e => { console.error(e); document.body.append(h('pre', { class: 'fatal' }, 'Erro ao iniciar: ' + e.message)); });
