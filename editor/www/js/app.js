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
import { svgIcon } from './icons.js';
import { buildHome } from './home.js';
import { parseCube } from './lut.js';
import { itemBase, clipBase, upsertKf } from './kf.js';

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
  buildHome(app);
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
  if (optCtl && optCtl.cancel) { optCtl.paused = true; try { optCtl.cancel(); } catch (e) { } }
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
  // trocando de projeto sem passar pela tela inicial: solta os vídeos do anterior
  if (app.project && app.project !== p) { try { await saveNow(); } catch (e) { } app.preview.pause(); app.preview.releaseAll(); }
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
    if (p.captions && p.captions.marker && p.captions.marker.mid) await loadItemImage(p.captions.marker.mid);
    for (const c of p.clips) {
      if (c.seg && c.seg.mid) await loadItemImage(c.seg.mid);
      if (c.key && c.key.mid) await loadItemImage(c.key.mid);
      if (c.lut && c.lut.mid) await app.loadLut(c.lut.mid);
    }
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
      while (app.transcribing && app.project === p) await new Promise(r => setTimeout(r, 1500));   // não disputa o processador com a legenda
      if (app.project !== p) break;
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
      } catch (e) {
        if (optCtl && optCtl.paused) { optimizing = false; optCtl = null; $('#bgtask').textContent = ''; setTimeout(optimizeInBackground, 2000); return; }
        if (app.project === p) m.proxy = false;        // falhou de verdade: segue com o original
        console.warn('proxy', e);
      }
    }
  } finally { optimizing = false; optCtl = null; if (!app.transcribing) $('#bgtask').textContent = ''; }
}

// pausa a otimização (ela recomeça sozinha depois)
function pauseOptimize() {
  if (optCtl && optCtl.cancel) { optCtl.paused = true; try { optCtl.cancel(); } catch (e) { } }
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
app.loadItemImage = loadItemImage;
app.loadLut = async mid => {
  if (app.renderer.luts.has(mid)) return true;
  try { app.renderer.luts.set(mid, parseCube(await (await app.getBlob(mid)).text())); return true; } catch (e) { toast('LUT inválida: ' + e.message, 4000); return false; }
};
app.importLut = async () => {
  const [f] = await pickFiles('.cube,text/plain,application/octet-stream', false);
  if (!f) return null;
  try {
    const lut = parseCube(await f.text());
    const mid = uid();
    await store.putMedia(mid, f); app.blobs.set(mid, f);
    app.project.media[mid] = { id: mid, kind: 'lut', name: f.name, dur: 0, w: 0, h: 0, hasAudio: false };
    app.renderer.luts.set(mid, lut);
    return mid;
  } catch (e) { toast('Não consegui ler a LUT: ' + e.message, 5000); return null; }
};
// inverte o clipe (gera uma cópia de trás para frente)
app.reverseClip = async clip => {
  const m = app.project.media[clip.mid];
  if (!m || m.kind !== 'video') { toast('Só dá para inverter vídeo'); return; }
  if (clip.reversed && clip.orig) {
    Object.assign(clip, { mid: clip.orig.mid, in: clip.orig.in, out: clip.orig.out }); delete clip.orig; clip.reversed = false;
    app.commit(); toast('O clipe voltou ao normal'); return;
  }
  const ctl = { stop: false };
  busy({ title: 'Invertendo o clipe', detail: 'Preparando', progress: 0, cancel: () => { ctl.stop = true; } });
  try {
    pauseOptimize && pauseOptimize();
    const { reverseRange } = await import('./reverse.js');
    const out = await reverseRange(await app.getBlob(clip.mid), clip.in, clip.out, m, k => busyUpdate({ progress: k, detail: Math.round(k * 100) + '%' }), ctl);
    const file = new File([out], (m.name || 'video').replace(/\.[^.]+$/, '') + '-invertido.' + (out.type.includes('mp4') ? 'mp4' : 'webm'), { type: out.type });
    const nm = await addMedia(file);
    nm.proxy = false; nm.noAsr = true;
    clip.orig = { mid: clip.mid, in: clip.in, out: clip.out };
    clip.mid = nm.id; clip.in = 0; clip.out = nm.dur; clip.reversed = true;
    app.commit();
    toast('Clipe invertido');
  } catch (e) {
    if (e.message !== 'cancelado') toast('Não consegui inverter: ' + e.message, 5000);
  } finally { busyDone(); }
};

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

app.importVideoForItem = async () => {
  const [f] = await pickFiles('video/*,image/*', false);
  if (!f) return null;
  busy({ title: 'Importando vídeo', detail: f.name });
  try {
    const m = await addMedia(f);
    if (m.kind === 'image') await loadItemImage(m.id);
    setTimeout(optimizeInBackground, 300);
    return m.id;
  } catch (e) { toast('Não consegui abrir o vídeo: ' + e.message, 4000); return null; } finally { busyDone(); }
};

// Enquadramento automático: procura o rosto ao longo do clipe e guarda o caminho (suavizado)
app.trackFaces = async clip => {
  const m = app.project.media[clip.mid];
  if (!m || m.kind !== 'video') { toast('O enquadramento automático é para vídeos'); return false; }
  const ctl = { stop: false };
  busy({ title: 'Procurando o rosto', detail: 'Carregando o detector', progress: 0, cancel: () => { ctl.stop = true; } });
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = app.previewUrlOf(clip.mid);
  try {
    const { faces } = await import('./vision.js');
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('não abriu o vídeo')); setTimeout(() => rej(new Error('tempo esgotado')), 20000); });
    const step = 0.4, raw = [];
    const a = clip.in, b = clip.out;
    for (let t = a; t <= b + 0.001 && !ctl.stop; t += step) {
      v.currentTime = Math.min(m.dur - 0.05, t);
      await new Promise(r => { v.onseeked = r; setTimeout(r, 4000); });
      const fs = await faces(v, v.videoWidth, v.videoHeight);
      raw.push({ t, f: fs[0] || null });
      busyUpdate({ progress: (t - a) / Math.max(0.1, b - a), detail: `${Math.round(100 * (t - a) / Math.max(0.1, b - a))}%` });
    }
    if (ctl.stop) return false;
    const found = raw.filter(r => r.f).length;
    if (!found) { toast('Não encontrei rosto neste clipe', 4000); return false; }
    // preenche buracos e suaviza (sem tremedeira: só anda se mudar de verdade)
    let last = raw.find(r => r.f).f;
    const pts = raw.map(r => { if (r.f) last = r.f; return { t: r.t, x: last.x, y: last.y }; });
    const sm = pts.map((p, i) => {
      const w = pts.slice(Math.max(0, i - 2), i + 3);
      return { t: p.t, x: w.reduce((s, q) => s + q.x, 0) / w.length, y: w.reduce((s, q) => s + q.y, 0) / w.length };
    });
    const out = [sm[0]];
    for (const p of sm.slice(1)) { const q = out[out.length - 1]; if (Math.hypot(p.x - q.x, p.y - q.y) > 0.035) out.push(p); else out.push({ t: p.t, x: q.x, y: q.y }); }
    clip.track = out.map(p => ({ t: +p.t.toFixed(2), x: +p.x.toFixed(4), y: +p.y.toFixed(4) }));
    clip.reframe = true;
    if ((clip.fit || 'cover') !== 'cover') clip.fit = 'cover';
    app.commit();
    toast(`Rosto encontrado em ${Math.round(100 * found / raw.length)}% do clipe. O enquadramento segue a pessoa.`, 4000);
    return true;
  } catch (e) {
    toast('Não consegui analisar: ' + e.message, 5000); return false;
  } finally {
    v.removeAttribute('src'); v.load();
    busyDone();
  }
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
    if (app.safeGuides && app.safeGuides !== 'off') drawSafe(app.renderer.ctx, app.renderer.out.width, app.renderer.out.height, app.safeGuides);
    drawSelection();
  } catch (e) { console.error(e); }
  rendering = false;
  if (again) { again = false; if (!app.preview.playing) app.requestRender(); }
};

// guias da zona segura (só na prévia): onde os botões e textos de cada app cobrem o vídeo
let safeMode = null;
try { safeMode = localStorage.getItem('ed.safe'); } catch (e) { }
app.safeGuides = safeMode || 'off';
app.setSafe = m => { app.safeGuides = m; try { localStorage.setItem('ed.safe', m); } catch (e) { } app.requestRender(); };
function drawSafe(ctx, W, H, mode) {
  // frações do quadro cobertas pela interface de cada app (vídeo 9:16)
  const Z = {
    reels: { top: .1, bottom: .2, right: .14, left: .03 },
    tiktok: { top: .09, bottom: .22, right: .17, left: .03 },
    shorts: { top: .08, bottom: .2, right: .15, left: .03 },
    stories: { top: .12, bottom: .14, right: .03, left: .03 },
    youtube: { top: .0, bottom: .1, right: .0, left: .0 },
  }[mode];
  if (!Z) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255,40,40,.22)';
  ctx.fillRect(0, 0, W, H * Z.top);
  ctx.fillRect(0, H * (1 - Z.bottom), W, H * Z.bottom);
  ctx.fillRect(W * (1 - Z.right), H * Z.top, W * Z.right, H * (1 - Z.top - Z.bottom));
  ctx.fillRect(0, H * Z.top, W * Z.left, H * (1 - Z.top - Z.bottom));
  ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;
  ctx.strokeRect(W * Z.left, H * Z.top, W * (1 - Z.left - Z.right), H * (1 - Z.top - Z.bottom));
  ctx.setLineDash([]);
  // ícones laterais (curtir, comentar, compartilhar) para ter noção
  if (Z.right > .1) {
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(W * (1 - Z.right / 2), H * (1 - Z.bottom) - (i + .6) * H * .075, Math.min(W, H) * .035, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(Math.min(W, H) * .03)}px sans-serif`; ctx.textAlign = 'center';
  ctx.fillText('ÁREA SEGURA · ' + mode.toUpperCase(), W / 2, H * Z.top + Math.min(W, H) * .05);
  ctx.restore();
}

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
  const sp = (c.out - c.in) / clipDur(c);
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
app.mediaNeedingTranscript = () => app.captionGaps().map(g => g.mid);

app.transcribeAll = async () => {
  if (app.transcribing) { toast('A legenda já está sendo gerada'); return; }
  app.transcribing = true;
  pauseOptimize();
  const p = app.project;
  try { return await transcribeAllInner(); }
  finally {
    app.transcribing = false; setTimeout(optimizeInBackground, 1500);
    if (app.project !== p) { p.updated = Date.now(); await store.putProject(p); }   // saiu do projeto no meio: guarda mesmo assim
  }
};

// faixas da mídia em uso no projeto (só elas são legendadas)
function usedRanges(p, mid) {
  const r = [];
  for (const c of p.clips) if (c.mid === mid) r.push([Math.max(0, c.in - 0.3), c.out + 0.3]);
  for (const it of p.items) if (it.kind === 'audio' && it.p.mid === mid) r.push([it.p.in || 0, (it.p.in || 0) + it.dur + 0.3]);
  r.sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const x of r) { if (out.length && x[0] <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], x[1]); else out.push([...x]); }
  return out;
}
// o que ainda falta legendar (fora do que já foi coberto)
function missing(ranges, cover) {
  if (!cover) return ranges;
  const out = [];
  for (let [a, b] of ranges) {
    for (const [x, y] of cover) {
      if (y <= a || x >= b) continue;
      if (x > a + 0.5) out.push([a, x]);
      a = Math.max(a, y);
    }
    if (b - a > 0.5) out.push([a, b]);
  }
  return out;
}
app.captionGaps = () => {
  const p = app.project;
  const mids = [...new Set([...p.clips.map(c => c.mid), ...p.items.filter(i => i.kind === 'audio').map(i => i.p.mid)])];
  return mids.filter(mid => { const m = p.media[mid]; return m && m.kind !== 'image' && !m.noAsr && (m.hasAudio || m.kind === 'audio'); })
    .map(mid => ({ mid, todo: (p.transcripts[mid] && p.transcripts[mid].length && !(p.trCover && p.trCover[mid])) ? [] : missing(usedRanges(p, mid), p.trCover && p.trCover[mid]) }))
    .filter(x => x.todo.length);
};

// barra de progresso da legenda (não bloqueia: dá para continuar editando)
function capBar() {
  let el = document.getElementById('captask');
  if (!el) {
    el = h('div', { id: 'captask' }, h('div', { class: 'ct-t' }), h('div', { class: 'ct-bar' }, h('i')), h('button', { type: 'button', class: 'ct-x', 'aria-label': 'Cancelar' }, '✕'));
    document.body.append(el);
  }
  el.hidden = false;
  return {
    set: (txt, k) => { el.querySelector('.ct-t').textContent = txt; if (k != null) el.querySelector('i').style.width = Math.round(k * 100) + '%'; },
    onCancel: fn => { el.querySelector('.ct-x').onclick = fn; },
    done: () => { el.hidden = true; },
  };
}

async function transcribeAllInner() {
  const gaps = app.captionGaps();
  if (!gaps.length) { toast('A legenda já está pronta'); return; }
  const p = app.project;
  let model = 'rapida';
  try { model = localStorage.getItem('ed.asr') || 'rapida'; } catch (e) { }
  let done = 0, total = 0, cancelledByUser = false, hw = '';
  const fmtEta = s => s > 90 ? `uns ${Math.ceil(s / 60)} min` : `uns ${Math.max(5, Math.round(s / 5) * 5)} s`;
  const bar = capBar();
  bar.onCancel(() => { cancelledByUser = true; cancelTranscription(); });
  p.captions.on = true;
  try {
    for (const g of gaps) {
      const mid = g.mid, m = p.media[mid];
      const pre = gaps.length > 1 ? `Legenda ${done + 1} de ${gaps.length}: ` : 'Legenda: ';
      bar.set(pre + 'lendo o áudio', 0);
      await ensureEnv(mid, k => bar.set(pre + 'lendo o áudio', k * 0.05));
      let mono = app.mono.get(mid);
      if (!mono) { mono = await decodeMono16k(await app.getBlob(mid), m.dur); app.mono.set(mid, mono); }
      const t0 = Date.now();
      const before = (p.transcripts[mid] || []).slice();
      const merge = ws => {
        const keep = before.filter(w => !g.todo.some(([a, b]) => w.s >= a && w.s < b));
        return [...keep, ...ws].sort((x, y) => x.s - y.s);
      };
      const words = await transcribe(mono, app.envOf(mid), {
        model, ranges: g.todo,
        onStage: st => {
          if (st === 'loading') bar.set(pre + 'abrindo o reconhecimento de voz', null);
          if (st === 'preparing') bar.set(pre + 'preparando (na 1ª vez leva até 1 min)', null);
          if (st === 'gpu') hw = ' · placa de vídeo';
          if (st === 'cpu') hw = '';
          if (st === 'safe') bar.set(pre + 'celular lento, seguindo em modo seguro', null);
        },
        onDownload: (l, t) => bar.set(`Baixando o reconhecimento de voz (só na 1ª vez): ${(l / 1e6).toFixed(0)} de ${(t / 1e6).toFixed(0)} MB`, t ? l / t : null),
        onProgress: (k, part, parts, eta) => {
          bar.set(pre + `${Math.round(k * 100)}%` + (eta > 3 ? ` · falta ${fmtEta(eta)}` : '') + hw + ` · ${Math.round((Date.now() - t0) / 1000)} s`, 0.05 + 0.95 * k);
        },
        // a legenda vai aparecendo enquanto escuta
        onWords: ws => { p.transcripts[mid] = merge(ws); app.capVersion++; app.requestRender(); },
      });
      p.transcripts[mid] = merge(words);
      p.trCover = p.trCover || {};
      p.trCover[mid] = [...(p.trCover[mid] || []), ...g.todo].sort((x, y) => x[0] - y[0]);
      total += words.length; done++;
    }
    bar.done();
    app.capVersion++;
    app.commit();
    toast(total ? `Legenda pronta: ${total} palavras. Confira e corrija se precisar.` : 'Não encontrei fala nesse vídeo.', 4000);
  } catch (e) {
    bar.done();
    const msg = String(e.message || e);
    if (cancelledByUser || msg === 'cancelado' || msg === 'reiniciado') toast('Legenda cancelada');
    else if (/fetch|network|Failed to load|404|Could not locate|Unauthorized/i.test(msg)) toast('Para a primeira legenda o app precisa de internet para baixar o reconhecimento de voz. Conecte e tente de novo.', 6000);
    else toast('Erro na legenda automática: ' + msg, 7000);
    app.capVersion++;
    app.commit();
  }
}

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
  const ic = svgIcon(icon) || h('span', { class: 'ti-i' }, icon);
  const b = h('button', { class: 'tool ' + cls, type: 'button' }, ic, h('span', { class: 'tl' }, label));
  b.addEventListener('click', fn);
  return b;
}

// barra de baixo em dois níveis, como no CapCut: categorias e, ao tocar, as ferramentas dela
app.toolLevel = null;
function openLevel(k) { app.toolLevel = k; updateToolbar(); }
function addText() {
  const it = app.addItem('text', { text: 'SEU TEXTO', font: 'Poppins', size: .09, color: '#FFFFFF', stroke: '#000000', bg: '', x: .5, y: .3, anim: 'pop', upper: true }, null, 3);
  P.itemPanel(app, it);
}
function nearestCut() {
  const L = layout(app.project); const n = app.project.clips.length;
  if (n < 2) { toast('Coloque pelo menos dois clipes para usar transição'); return; }
  let best = 0, bd = 1e9; for (let i = 0; i < n - 1; i++) { const d = Math.abs(L.starts[i + 1] - app.time); if (d < bd) { bd = d; best = i; } }
  app.openTransition(best);
}
const LEVELS = {
  editar: { name: 'Editar', tools: () => [
    tool('split', 'Dividir', () => app.splitAtPlayhead()),
    tool('pause', 'Cortar pausas', () => app.cutSilences()),
    tool('dice', 'Surpreenda-me', () => P.surprise(app)),
    tool('format', 'Formato', () => P.formatPanel(app)),
    tool('frame', 'Zona segura', () => P.platformPanel(app)),
    tool('export', 'YouTube e formatos', () => P.platformPanel(app)),
    tool('plus', 'Adicionar mídia', () => app.importFiles('cursor')),
    tool('mic', 'Teleprompter', () => import('./teleprompter.js').then(T => T.openTeleprompter({
      onDone: async file => { await addFiles([file], 'cursor'); app.transcribeAll(); },
      onSave: file => app.saveText(file, file.name, file.type),
    }))),
  ] },
  audio: { name: 'Áudio', tools: () => [
    tool('wave', 'Efeitos sonoros', () => P.soundsPanel(app)),
    tool('music', 'Música', () => P.audioPanel(app)),
    tool('person', 'Voz e ruído', () => P.soundsPanel(app, 'voz')),
    tool('mic', 'Narrar', () => app.recordNarration()),
    tool('plus', 'Áudio do celular', () => app.addNarrationFile()),
    tool('beat', 'Batida', () => P.audioPanel(app)),
  ] },
  texto: { name: 'Texto', tools: () => [
    tool('style', 'Modelos de texto', () => P.textPresetsPanel(app)),
    tool('text', 'Adicionar texto', addText),
    tool('captions', 'Legenda automática', () => P.captionsPanel(app)),
    tool('star', 'Modelos de legenda', () => P.captionPresetsPanel(app)),
    tool('pencil', 'Corrigir legenda', () => P.captionsEditor(app)),
    tool('card', 'Cartelas', () => P.elementsPanel(app, 'Cartelas')),
    tool('retain', 'Ganchos e CTA', () => P.elementsPanel(app, 'Retenção')),
  ] },
};

function updateToolbar() {
  const bar = $('#tools');
  bar.innerHTML = '';
  const s = app.sel;
  const clip = app.selectedClip(), item = app.selectedItem();
  const back = (label, fn) => h('button', { class: 'tool back', type: 'button', onclick: fn }, svgIcon('back', 24), h('span', { class: 'tl' }, label));
  const row = h('div', { class: 'trow' });
  if (clip) {
    bar.append(back('Clipe', () => { app.select(null); }));
    row.append(
      tool('split', 'Dividir', () => app.splitAtPlayhead()),
      tool('speed', 'Velocidade', () => P.clipPanel(app, clip, 'speed')),
      tool('volume', 'Volume', () => P.clipPanel(app, clip, 'vol')),
      tool('crop', 'Enquadrar', () => P.clipPanel(app, clip, 'frame')),
      tool('filter', 'Filtros', () => P.filtersPanel(app, clip)),
      tool('bg', 'Ajustar', () => P.clipPanel(app, clip, 'cor')),
      tool('kf', 'Animação', () => P.clipPanel(app, clip, 'anim')),
      tool('person', 'Pessoa', () => P.clipPanel(app, clip, 'person')),
      tool('effects', 'Efeitos', () => P.clipPanel(app, clip, 'fx')),
      tool('pause', 'Pausas', () => app.cutSilences([clip])),
      tool('duplicate', 'Duplicar', () => app.duplicateClip(clip)),
      tool('more', 'Mais', () => P.clipPanel(app, clip, 'more')),
      tool('trash', 'Excluir', () => app.deleteSelected(), 'danger'),
    );
  } else if (item) {
    bar.append(back('Item', () => { app.select(null); }));
    row.append(
      tool('pencil', 'Editar', () => P.itemPanel(app, item)),
      ...(!['sfx', 'audio', 'effect'].includes(item.kind) ? [tool('kf', 'Keyframe', () => { const lt = Math.max(0, Math.min(item.dur, app.time - item.start)); upsertKf(item, lt, itemBase(item, lt)); app.commit(); toast('Ponto marcado. Mude o tempo e arraste o elemento para animar.'); })] : []),
      tool('cursor', 'No cursor', () => { app.moveItem(item, app.time); app.commit(); }),
      tool('play', 'Ver', () => app.replayItem(item)),
      tool('duplicate', 'Duplicar', () => app.duplicateItem(item)),
      ...(!['sfx', 'audio', 'effect'].includes(item.kind) ? [tool('star', 'Salvar', () => P.saveMyElement(app, item))] : []),
      tool('trash', 'Excluir', () => app.deleteSelected(), 'danger'),
    );
  } else if (s && s.type === 'captions') {
    bar.append(back('Legenda', () => { app.select(null); }));
    row.append(
      tool('style', 'Estilo', () => P.captionsPanel(app)),
      tool('pencil', 'Corrigir', () => P.captionsEditor(app)),
      tool(app.project.captions.on ? 'eyeoff' : 'eye', app.project.captions.on ? 'Ocultar' : 'Mostrar', () => { app.project.captions.on = !app.project.captions.on; app.commit(); }),
    );
  } else if (app.toolLevel && LEVELS[app.toolLevel]) {
    bar.append(back(LEVELS[app.toolLevel].name, () => openLevel(null)));
    row.append(...LEVELS[app.toolLevel].tools());
  } else {
    row.append(
      tool('edit', 'Editar', () => openLevel('editar')),
      tool('template', 'Modelos', () => P.templatesPanel(app)),
      tool('music', 'Sons', () => openLevel('audio')),
      tool('text', 'Texto', () => openLevel('texto')),
      tool('captions', 'Legendas', () => P.captionsPanel(app)),
      tool('overlay', 'Sobrepor', () => P.elementsPanel(app, 'Vídeo')),
      tool('sticker', 'Elementos', () => P.elementsPanel(app)),
      tool('chart', 'Gráficos', () => P.elementsPanel(app, 'Gráficos')),
      tool('effects', 'Efeitos', () => P.effectsPanel(app)),
      tool('filter', 'Filtros', () => P.filtersPanel(app)),
      tool('bg', 'Ajustar', () => { const c = app.project.clips[0]; if (c) P.clipPanel(app, app.selectedClip() || c, 'cor'); }),
      tool('transition', 'Transições', nearestCut),
      tool('format', 'Formato', () => P.formatPanel(app)),
    );
  }
  bar.append(row);
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
      const [a, b] = [...pts.values()]; drag.d0 = Math.hypot(a.x - b.x, a.y - b.y); drag.z0 = drag.kfc ? clipBase(drag.clip, drag.lt).zoom : (drag.clip.zoom || 1);
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
      const kfxy = (it.kf || []).some(k => k.x != null || k.y != null);
      const b0 = kfxy ? itemBase(it, app.time - it.start) : null;
      drag = { type: 'item', it, n0: n, x0: kfxy ? b0.x : it.p.x, y0: kfxy ? b0.y : it.p.y, moved: false, was, kfxy };
    } else if (target && target.type === 'captions') {
      const was = app.sel && app.sel.type === 'captions';
      if (!was) app.select(target);
      drag = { type: 'cap', n0: n, x0: app.project.captions.x, y0: app.project.captions.y, moved: false, was };
    } else if (clip && app.framing) {
      const ci = app.project.clips.indexOf(clip), lt = app.time - layout(app.project).starts[ci];
      const kfc = (clip.kf || []).length > 0, b0 = clipBase(clip, lt);
      drag = { type: 'frame', clip, n0: n, x0: b0.x, y0: b0.y, moved: false, kfc, lt };
    } else drag = { type: 'tap', n0: n, moved: false };
  });
  c.addEventListener('pointermove', e => {
    if (!drag || !pts.has(e.pointerId)) return;
    pts.set(e.pointerId, norm(e));
    if (drag.type === 'frame' && pts.size === 2 && drag.d0) {
      const [a, b] = [...pts.values()];
      const z = clamp(drag.z0 * Math.hypot(a.x - b.x, a.y - b.y) / drag.d0, 0.3, 4);
      if (drag.kfc) upsertKf(drag.clip, drag.lt, { zoom: z }); else drag.clip.zoom = z;
      drag.moved = true; app.live(); return;
    }
    const n = norm(e), dx = n.x - drag.n0.x, dy = n.y - drag.n0.y;
    if (Math.abs(dx) + Math.abs(dy) > 0.01) drag.moved = true;
    if (!drag.moved) return;
    if (drag.type === 'item' && drag.kfxy) { upsertKf(drag.it, app.time - drag.it.start, { x: clamp(drag.x0 + dx, -0.4, 1.4), y: clamp(drag.y0 + dy, -0.3, 1.3) }); app.live(); }
    else if (drag.type === 'item' && drag.x0 != null) { drag.it.p.x = clamp(drag.x0 + dx, -0.2, 1.2); if (drag.y0 != null) drag.it.p.y = clamp(drag.y0 + dy, -0.1, 1.1); app.live(); }
    else if (drag.type === 'item' && drag.x0 == null && drag.y0 != null) { drag.it.p.y = clamp(drag.y0 + dy, 0, 1); app.live(); }
    if (drag.type === 'cap') { app.project.captions.x = clamp(drag.x0 + dx, 0.1, 0.9); app.project.captions.y = clamp(drag.y0 + dy, 0.05, 0.95); app.live(); }
    if (drag.type === 'frame') {
      const v = { x: clamp(drag.x0 + dx, -0.8, 0.8), y: clamp(drag.y0 + dy, -0.8, 0.8) };
      if (drag.kfc) upsertKf(drag.clip, drag.lt, v); else { drag.clip.x = v.x; drag.clip.y = v.y; }
      app.live();
    }
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
    const r = await exportVideo(app, { bitrate: q.bitrate, scale: q.scale, abitrate: q.abitrate }, (k, msg, eta) => {
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
      if (!quiet) toast(blob.type.startsWith('video/') ? 'Salvo na galeria, pasta Filmes/Editor' : 'Salvo em Downloads/Editor', 3500);
      return true;
    } catch (e) { busyDone(); toast('Erro ao salvar: ' + e.message, 5000); return false; }
  }
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  toast(blob.type.startsWith('video/') ? 'Vídeo baixado' : 'Arquivo baixado');
  return true;
}

// ganchos para teste automatizado
app.saveText = (text, name, mime = 'application/x-subrip') => saveBlob(new Blob([text], { type: mime }), name);
// ======================================================================= atalhos da tela inicial e modelos prontos
app.pickFiles = pickFiles;
app.importFileAsMedia = async f => { const m = await addMedia(f); if (m.kind === 'image') await loadItemImage(m.id); return m.id; };
app.newProjectWith = async (files, name, format) => {
  const p = newProject(name);
  if (format) p.format = format;
  await store.putProject(p);
  await openProject(p);
  if (files && files.length) await addFiles(files, 'append');
  return app.project;
};
// imagem de cor sólida (fundo das cenas sem vídeo)
async function colorMedia(color) {
  const [W, H] = dims(app.project);
  const c = document.createElement('canvas'); c.width = Math.round(W / 2); c.height = Math.round(H / 2);
  const x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  const g = x.createRadialGradient(c.width / 2, c.height * .4, 0, c.width / 2, c.height / 2, Math.max(c.width, c.height) * .7);
  g.addColorStop(0, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const m = await addMedia(new File([blob], 'fundo-' + color.replace('#', '') + '.png', { type: 'image/png' }));
  m.isColor = true;
  return m.id;
}
app.createFromStoryboard = async (sb, files, vals) => {
  const { buildStoryboard } = await import('./storyboards.js');
  const { FILTERS, filterAdj } = await import('./filters.js');
  const p = newProject(sb.name);
  p.format = sb.format;
  await store.putProject(p);
  await openProject(p);
  busy({ title: 'Montando o modelo', detail: 'Importando suas mídias', progress: 0 });
  try {
    const medias = [];
    for (let i = 0; i < files.length; i++) {
      busyUpdate({ detail: `Importando ${i + 1} de ${files.length}`, progress: i / Math.max(1, files.length) });
      try { const m = await addMedia(files[i]); if (m.kind !== 'audio') medias.push(m); else p.audio.music = { mid: m.id, vol: 0.5, start: 0 }; } catch (e) { toast('Não abri ' + files[i].name, 3000); }
    }
    const colors = {};
    const need = new Set(sb.scenes.filter(sc => sc.media === false || !medias.length).map(sc => sc.bg || '#111111'));
    for (const c of need) colors[c] = await colorMedia(c);
    const B = buildStoryboard(sb, medias, vals, c => colors[c] || colors['#111111']);
    const [W, H] = dims(p), oa = W / H;
    p.clips = B.clips.map(bc => {
      const m = p.media[bc.mid];
      const c = newClip(m);
      c.in = bc.in; c.out = bc.out; c.kb = bc.kb; c.fx = bc.fx; c.trans = bc.trans;
      c.fit = bc.fit;
      if (bc.fit === 'cover' && m.w && m.h && Math.abs(m.w / m.h - oa) / oa > 0.35 && !m.isColor) c.fit = 'blur';
      if (sb.look && !m.isColor) { const f = FILTERS.find(x => x.id === sb.look); if (f) { c.adj = filterAdj(f); c.look = f.id; } }
      return c;
    });
    const L = layout(p);
    const durs = p.clips.map(clipDur);
    for (const it of B.items(L.starts, durs)) p.items.push({ id: uid(), ...it });
    p.captions = { ...p.captions, ...JSON.parse(JSON.stringify(sb.captions || {})) };
    if (sb.beat) p.audio.beat = { ...p.audio.beat, ...sb.beat }; else p.audio.beat = { ...p.audio.beat, on: false };
    if (p.audio.music) p.audio.beat.on = false;
    p.storyboard = sb.id;
    for (const it of p.items) if (it.kind === 'image' && it.p.mid) await loadItemImage(it.p.mid);
    app.applyFormat();
    app.commit();
    app.setTime(Math.min(1.2, L.total / 2));
  } finally { busyDone(); }
  optimizeInBackground();
  const talk = p.captions.on && p.clips.some(c => { const m = p.media[c.mid]; return m && m.kind === 'video' && m.hasAudio; });
  if (talk) { app.transcribeAll(); toast('Modelo pronto. A legenda vai aparecendo enquanto o app escuta. Toque nos textos para trocar.', 5000); }
  else toast('Modelo pronto. Toque nos textos para trocar e em ▶ para ver.', 4000);
};
app.addTextPreset = (pr, start) => {
  const t0 = start ?? app.time;
  let last = null;
  for (const it of pr.items) last = app.addItem(it.kind, JSON.parse(JSON.stringify(it.p)), t0 + (it.at || 0), it.dur || 3);
  return last;
};
app.applyCaptionPreset = cp => {
  const keepLang = app.project.captions.lang;
  app.project.captions = { ...app.project.captions, ...JSON.parse(JSON.stringify(cp.cap)), lang: keepLang };
  app.capVersion++;
  app.commit(true);
};

// várias exportações seguidas (todos os formatos, stories de 15 s...)
app.exportMany = async jobs => {
  const ctl = { aborted: false };
  await preloadBlobs();
  busy({ title: 'Exportando', detail: 'Preparando', progress: 0, cancel: () => { ctl.aborted = true; busyUpdate({ detail: 'Cancelando...' }); } });
  const done = [];
  try {
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i];
      const r = await exportVideo(app, { ...j.settings, project: j.project }, (k, msg) => {
        busyUpdate({ title: `Exportando ${i + 1} de ${jobs.length}: ${j.label}`, progress: (i + k) / jobs.length, detail: msg });
      }, ctl);
      const name = j.name + '.' + r.ext;
      savedName = null;
      busyDone();
      const ok = await saveBlob(r.blob, name, true);
      if (ok) done.push(j.label);
      busy({ title: 'Exportando', detail: 'Próximo', progress: (i + 1) / jobs.length, cancel: () => { ctl.aborted = true; } });
    }
    busyDone();
    toast(`${done.length} vídeo(s) salvos: ${done.join(', ')}`, 6000);
  } catch (e) {
    busyDone();
    toast(String(e.message) === 'cancelado' ? `Exportação cancelada (${done.length} prontos)` : 'Erro ao exportar: ' + e.message, 7000);
  }
  return done;
};
app.fileBase = () => (app.project.name || 'video').replace(/[^\w\-À-ú ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40);

// corte vertical a partir de um trecho do vídeo longo: vira um projeto novo
app.makeVertical = async (a, b, follow) => {
  const { trimProject, asFormat } = await import('./platform.js');
  const np = asFormat(trimProject(app.project, a, b), '9:16');
  np.name = (app.project.name || 'Projeto') + ' (vertical)';
  np.created = np.updated = Date.now();
  await saveNow();
  await store.putProject(np);
  await openProject(np);
  if (follow) for (const c of app.project.clips) { const m = app.project.media[c.mid]; if (m && m.kind === 'video') await app.trackFaces(c); }
  toast('Projeto vertical criado. O original continua salvo na lista de projetos.', 5000);
};

// tradução da legenda
app.translateCaptions = async lang => {
  const { sentences } = await import('./captions.js');
  const { translateTexts } = await import('./translate.js');
  const subs = sentences(app.project);
  if (!subs.length) { toast('Gere a legenda primeiro'); return false; }
  busy({ title: 'Traduzindo a legenda', detail: 'Baixando o tradutor (só na primeira vez)', progress: 0 });
  try {
    const out = await translateTexts(subs.map(x => x.t), lang,
      (k, step) => busyUpdate({ progress: k, detail: 'Traduzindo para ' + step + ' ' + Math.round(k * 100) + '%' }),
      (l, t) => busyUpdate({ progress: t ? l / t : 0, detail: `Baixando o tradutor: ${Math.round(l / 1e6)} de ${Math.round(t / 1e6)} MB` }));
    app.project.capTrans = { lang, pages: subs.map((x, i) => ({ start: x.a, end: Math.max(x.b, x.a + 0.4), text: out[i] || '' })) };
    app.project.captions.lang = lang;
    app.capVersion++;
    app.commit(true);
    toast('Legenda traduzida. Você pode corrigir cada frase.');
    return true;
  } catch (e) { toast('Não consegui traduzir: ' + e.message, 6000); return false; } finally { busyDone(); }
};

// ouvir 6 s do clipe no cursor com a redução de ruído
app.previewDenoise = async (amount, fx) => {
  const p = app.project, L = layout(p), ci = clipIndexAt(p, app.time, L), c = p.clips[ci];
  const m = c && p.media[c.mid];
  if (!m || !m.hasAudio) { toast('Coloque o cursor num clipe com som'); return; }
  const { decodeRange } = await import('./media.js');
  const { denoiseChannel, voiceFx } = await import('./denoise.js');
  const s = c.in + Math.max(0, app.time - L.starts[ci]);
  busy({ title: 'Preparando a prévia do som' });
  try {
    const [l, r] = await decodeRange(await app.getBlob(c.mid), s, Math.min(m.dur, s + 6));
    if (amount > 0) { denoiseChannel(l, amount, 48000); denoiseChannel(r, amount, 48000); }
    if (fx) { voiceFx(l, fx, 48000); voiceFx(r, fx, 48000); }
    const ac = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
    const b = ac.createBuffer(2, l.length, 48000); b.copyToChannel(l, 0); b.copyToChannel(r, 1);
    const src = ac.createBufferSource(); src.buffer = b; src.connect(ac.destination); src.start();
    src.onended = () => ac.close();
  } catch (e) { toast('Não consegui: ' + e.message, 4000); } finally { busyDone(); }
};

app._test = {
  async newWithFiles(files) { const p = newProject('Teste'); await store.putProject(p); await openProject(p); await addFiles(files, 'append'); },
  ensureEnv, showHome, openProject,
};

init().catch(e => { console.error(e); document.body.append(h('pre', { class: 'fatal' }, 'Erro ao iniciar: ' + e.message)); });
