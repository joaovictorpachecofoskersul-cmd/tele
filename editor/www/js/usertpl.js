// "Meus modelos": a pessoa salva o projeto atual como modelo e aplica em outros vídeos.
// Guarda formato, enquadramento, legenda (com marcador), padrão de transições, filtros,
// áudio e todos os elementos com o tempo relativo (começo, fim ou vídeo inteiro).
import { layout, uid } from './project.js';

const KEY = 'ed.userTpl';

export function listUserTemplates() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
}
function save(a) {
  try { localStorage.setItem(KEY, JSON.stringify(a)); return true; } catch (e) { return false; }
}
const clone = o => JSON.parse(JSON.stringify(o));

// mídias (imagens, música, imagem do marcador) que os modelos usam: não podem ser apagadas
export function userTemplateMedia() {
  return new Set(listUserTemplates().flatMap(u => Object.keys(u.media || {})));
}

export function captureTemplate(p, name, id) {
  const L = layout(p), total = Math.max(0.1, L.total);
  const tr = p.clips.slice(0, -1).map(c => c.trans || { id: 'none', dur: 0.4 });
  const items = p.items.filter(it => it.kind !== 'audio').map(it => {
    const end = it.start + it.dur;
    let anchor = 'start', off = it.start;
    if (it.start < 0.05 && end > total - 0.1) anchor = 'whole';
    else if (it.start > total * 0.5) { anchor = 'end'; off = total - it.start; }
    return { kind: it.kind, p: clone(it.p), anchor, off, dur: it.dur };
  });
  const mids = new Set();
  for (const it of items) if (it.p.mid) mids.add(it.p.mid);
  if (p.captions.marker && p.captions.marker.mid) mids.add(p.captions.marker.mid);
  if (p.audio.music) mids.add(p.audio.music.mid);
  const media = {};
  for (const m of mids) if (p.media[m]) media[m] = clone(p.media[m]);
  const c0 = p.clips[0] || {};
  return {
    id: id || 'u_' + uid(), name: name || 'Meu modelo', user: true, updated: Date.now(),
    format: p.format, fps: p.fps, fit: c0.fit || 'cover',
    captions: clone(p.captions),
    trans: tr.length ? tr.map(t => t.id) : ['none'], transDur: tr.length ? tr.map(t => t.dur || 0.4) : [0.4],
    clipFx: (c0.fx || []).map(f => { const g = clone(f); delete g.tpl; return g; }),
    audio: { beat: clone(p.audio.beat || { on: false }), sfxAuto: !!p.audio.sfxAuto, duck: !!p.audio.duck, loud: !!p.audio.loud },
    music: p.audio.music ? clone(p.audio.music) : null,
    items, media, total,
    colors: [p.captions.active || '#FFE600', p.captions.strong || '#FF2B2B'],
  };
}

export function saveUserTemplate(t) {
  const a = listUserTemplates();
  const i = a.findIndex(x => x.id === t.id);
  if (i >= 0) a[i] = t; else a.unshift(t);
  return save(a);
}
export function renameUserTemplate(id, name) {
  const a = listUserTemplates(); const t = a.find(x => x.id === id);
  if (t) { t.name = name; t.updated = Date.now(); save(a); }
}
export function deleteUserTemplate(id) {
  save(listUserTemplates().filter(x => x.id !== id));
}
export function duplicateUserTemplate(id) {
  const a = listUserTemplates(); const t = a.find(x => x.id === id);
  if (!t) return;
  a.unshift({ ...clone(t), id: 'u_' + uid(), name: t.name + ' (cópia)', updated: Date.now() });
  save(a);
}

const KIND_NAMES = { text: 'texto', effect: 'efeito', sfx: 'som' };
// converte para o mesmo formato dos modelos prontos (usado por applyTemplate)
export function toTemplate(u) {
  const n = u.items.length;
  const kinds = [...new Set(u.items.map(i => KIND_NAMES[i.kind] || 'elemento'))];
  return {
    id: u.id, name: u.name, user: true,
    desc: `Meu modelo · ${u.format} · ${n ? n + ' ' + (n === 1 ? 'item' : 'itens') + ' (' + kinds.join(', ') + ')' : 'só estilo'}`,
    format: u.format, fitAll: u.fit && u.fit !== 'cover' ? u.fit : undefined,
    colors: u.colors || ['#334155', '#0f766e'],
    captions: u.captions, trans: u.trans, transDur: u.transDur, clipFx: u.clipFx,
    audio: u.audio, music: u.music, media: u.media,
    build: L => u.items.map(it => {
      if (it.anchor === 'whole') return { kind: it.kind, start: 0, dur: L.total, p: it.p };
      const start = it.anchor === 'end' ? Math.max(0, L.total - it.off) : it.off;
      return { kind: it.kind, start, dur: it.dur, p: it.p };
    }),
  };
}
