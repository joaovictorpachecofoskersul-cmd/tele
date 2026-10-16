import { userTemplateMedia } from './usertpl.js';
// Armazenamento local (IndexedDB): projetos, arquivos de mídia e dados auxiliares (miniaturas, envelope de áudio).
const DB = 'editor-videos';
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media');
      if (!db.objectStoreNames.contains('aux')) db.createObjectStore('aux');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

function tx(store, mode, fn) {
  return open().then(db => new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then(v => { out = v; });
    t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('Sem espaço para salvar'));
  }));
}

export const store = {
  async listProjects() {
    const all = await tx('projects', 'readonly', s => s.getAll());
    return (all || []).sort((a, b) => b.updated - a.updated);
  },
  getProject: id => tx('projects', 'readonly', s => s.get(id)),
  putProject: p => tx('projects', 'readwrite', s => s.put(p)),
  async deleteProject(p) {
    await tx('projects', 'readwrite', s => s.delete(p.id));
    // apaga mídias que nenhum outro projeto usa
    const others = await this.listProjects();
    const used = new Set(others.flatMap(o => Object.keys(o.media || {})));
    for (const m of userTemplateMedia()) used.add(m);
    for (const mid of Object.keys(p.media || {})) {
      if (!used.has(mid)) { await tx('media', 'readwrite', s => s.delete(mid)); await tx('media', 'readwrite', s => s.delete(mid + '_px')); await tx('aux', 'readwrite', s => s.delete(mid)); }
    }
  },
  putMedia: (mid, blob) => tx('media', 'readwrite', s => s.put(blob, mid)),
  getMedia: mid => tx('media', 'readonly', s => s.get(mid)),
  putAux: (mid, data) => tx('aux', 'readwrite', s => s.put(data, mid)),
  getAux: mid => tx('aux', 'readonly', s => s.get(mid)),
  async persist() { try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { } },
  async usage() { try { return await navigator.storage.estimate(); } catch (e) { return null; } },
};
