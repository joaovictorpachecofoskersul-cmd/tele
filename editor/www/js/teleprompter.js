// Teleprompter: câmera + texto rolando na frente. Grava com som e o vídeo vai direto para um projeto.
import { h, toast, btn, slider, toggle } from './ui.js';

const KEY = 'ed.tp';
const DEF = {
  text: 'Cole aqui o seu texto.\n\nToque no texto para pausar ou continuar a rolagem.\n\nUse + e − para mudar a velocidade.',
  speed: 4, size: 34, op: 0.55, mirror: false, facing: 'user', count: true, height: 0.45, align: 'center',
};
const load = () => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return { ...DEF }; } };
const save = S => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };

function pickMime() {
  if (!window.MediaRecorder) return '';
  const c = ['video/mp4;codecs="avc1.42E01E,mp4a.40.2"', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const m of c) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) { } }
  return '';
}

// onDone(file) é chamado com o vídeo gravado quando a pessoa escolhe "Editar"
export function openTeleprompter({ onDone, onSave }) {
  const S = load();
  let stream = null, rec = null, chunks = [], recording = false, t0 = 0, raf = 0, pos = 0, last = 0, rolling = false, timerI = 0;
  const root = h('div', { id: 'tp' });
  const cam = h('video', { class: 'tpcam', autoplay: true, muted: true, playsinline: true });
  cam.muted = true; cam.setAttribute('playsinline', '');
  const scroller = h('div', { class: 'tpscroll' });
  const box = h('div', { class: 'tpbox' }, h('div', { class: 'tpflip' }, scroller), h('div', { class: 'tpguide' }));
  const clock = h('div', { class: 'tpclock' }, '00:00');
  const spv = h('b', {}, String(S.speed));
  const recBtn = h('button', { class: 'tprec', type: 'button', 'aria-label': 'Gravar' });
  const count = h('div', { class: 'tpcount', hidden: true });
  const top = h('div', { class: 'tptop' },
    h('button', { class: 'tpib', type: 'button', onclick: () => close() }, '✕'),
    clock,
    h('button', { class: 'tpib', type: 'button', onclick: () => editText() }, '✎ Texto'),
    h('button', { class: 'tpib', type: 'button', onclick: () => settings() }, '⚙'));
  const bottom = h('div', { class: 'tpbot' },
    h('div', { class: 'tpspeed' },
      h('button', { type: 'button', onclick: () => speed(-1) }, '−'), h('span', {}, 'velocidade ', spv), h('button', { type: 'button', onclick: () => speed(1) }, '+')),
    h('div', { class: 'tprow' },
      h('button', { class: 'tpib', type: 'button', onclick: () => { pos = 0; render(); } }, '⟲ Início'),
      recBtn,
      h('button', { class: 'tpib', type: 'button', onclick: () => flip() }, '⇄ Câmera')));
  root.append(cam, box, top, count, bottom);
  document.body.append(root);
  document.body.classList.add('tp-open');

  function apply() {
    scroller.textContent = S.text;
    root.style.setProperty('--tpfs', S.size + 'px');
    root.style.setProperty('--tpop', S.op);
    root.style.setProperty('--tph', Math.round(S.height * 100) + '%');
    scroller.style.textAlign = S.align;
    box.querySelector('.tpflip').classList.toggle('mirror', !!S.mirror);
    cam.classList.toggle('mirror', S.facing === 'user');
    spv.textContent = S.speed;
    const hgt = box.clientHeight || 300;
    scroller.style.paddingTop = Math.round(hgt * 0.3) + 'px';
    scroller.style.paddingBottom = Math.round(hgt * 0.8) + 'px';
    render();
  }
  function render() { scroller.style.transform = `translate3d(0,${(-pos).toFixed(1)}px,0)`; }
  function maxPos() { return Math.max(0, scroller.offsetHeight - box.clientHeight * 0.8); }
  function loop(t) {
    if (rolling) {
      const dt = Math.min(0.1, (t - last) / 1000);
      pos = Math.min(maxPos(), pos + S.speed * 14 * dt);
      render();
      if (pos >= maxPos()) rolling = false;
    }
    last = t;
    raf = requestAnimationFrame(loop);
  }
  function speed(d) { S.speed = Math.max(1, Math.min(30, S.speed + d)); save(S); apply(); }
  box.addEventListener('click', () => { rolling = !rolling; });
  // arrastar o texto com o dedo
  let dragY = null;
  box.addEventListener('touchstart', e => { dragY = e.touches[0].clientY; }, { passive: true });
  box.addEventListener('touchmove', e => { if (dragY == null) return; const y = e.touches[0].clientY; pos = Math.max(0, Math.min(maxPos(), pos + (dragY - y))); dragY = y; render(); }, { passive: true });

  async function startCam() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: S.facing, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: S.facing }, audio: true }); }
      catch (e2) { toast('Não consegui abrir a câmera ou o microfone. Libere a permissão do app nas configurações do celular.', 6000); return false; }
    }
    cam.srcObject = stream;
    try { await cam.play(); } catch (e) { }
    apply();
    return true;
  }
  async function flip() {
    if (recording) return;
    S.facing = S.facing === 'user' ? 'environment' : 'user'; save(S);
    await startCam();
  }

  async function startRec() {
    if (!stream && !(await startCam())) return;
    const at = stream.getAudioTracks()[0];
    if (!at || at.readyState !== 'live') { toast('Sem microfone: o vídeo vai sair sem som. Confira a permissão do microfone.', 5000); }
    if (S.count) {
      count.hidden = false;
      for (let n = 3; n > 0; n--) { count.textContent = n; await new Promise(r => setTimeout(r, 800)); }
      count.hidden = true;
    }
    const mime = pickMime();
    chunks = [];
    try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8e6, audioBitsPerSecond: 128e3 } : undefined); }
    catch (e) { try { rec = new MediaRecorder(stream); } catch (e2) { toast('Este celular não deixou gravar'); return; } }
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = finish;
    rec.start(1000);
    recording = true; t0 = Date.now();
    recBtn.classList.add('on');
    pos = 0; render(); rolling = true;
    timerI = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); clock.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 300);
  }
  function stopRec() {
    if (!rec) return;
    recording = false; rolling = false;
    recBtn.classList.remove('on');
    clearInterval(timerI);
    try { rec.requestData(); } catch (e) { }
    rec.stop();
  }
  function finish() {
    const type = ((rec && rec.mimeType) || (chunks[0] && chunks[0].type) || 'video/webm').split(';')[0];
    const blob = new Blob(chunks, { type });
    rec = null;
    if (!blob.size) { toast('A gravação saiu vazia. Tente de novo.'); return; }
    const ext = type.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([blob], `teleprompter-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${ext}`, { type });
    const v = h('video', { class: 'tpprev', controls: true, playsinline: true });
    v.src = URL.createObjectURL(blob);
    const sheet = h('div', { class: 'tpdone' },
      v,
      h('div', { class: 'brow' },
        btn('✂ Editar este vídeo', () => { cleanup(); onDone && onDone(file); }, 'pri'),
        btn('Salvar na galeria', async () => { if (onSave) await onSave(file); }),
        btn('Gravar de novo', () => { URL.revokeObjectURL(v.src); sheet.remove(); })));
    root.append(sheet);
  }
  recBtn.addEventListener('click', () => { recording ? stopRec() : startRec(); });

  function editText() {
    const ta = h('textarea', { class: 'ti tpta' }); ta.value = S.text;
    const dlg = h('div', { class: 'tpdlg' }, h('b', {}, 'Texto do teleprompter'), ta,
      h('div', { class: 'brow' },
        btn('Colar', async () => { try { ta.value = await navigator.clipboard.readText(); } catch (e) { toast('Segure no campo e escolha Colar'); } }, 'sm'),
        btn('Limpar', () => { ta.value = ''; ta.focus(); }, 'sm'),
        btn('OK', () => { S.text = ta.value || ' '; save(S); pos = 0; apply(); dlg.remove(); }, 'pri')));
    root.append(dlg); setTimeout(() => ta.focus(), 50);
  }
  function settings() {
    const dlg = h('div', { class: 'tpdlg' }, h('b', {}, 'Ajustes'),
      slider('Tamanho da letra', 18, 72, 1, S.size, v => { S.size = v; apply(); }, v => v),
      slider('Altura da área do texto', 0.25, 0.9, 0.01, S.height, v => { S.height = v; apply(); }, v => Math.round(v * 100) + '%'),
      slider('Fundo do texto', 0, 0.9, 0.01, S.op, v => { S.op = v; apply(); }, v => Math.round(v * 100) + '%'),
      slider('Velocidade', 1, 30, 1, S.speed, v => { S.speed = v; apply(); }, v => v),
      toggle('Espelhar o texto (para usar com vidro de teleprompter)', S.mirror, v => { S.mirror = v; apply(); }),
      toggle('Contagem 3, 2, 1 antes de gravar', S.count, v => { S.count = v; }),
      toggle('Texto centralizado', S.align === 'center', v => { S.align = v ? 'center' : 'left'; apply(); }),
      btn('OK', () => { save(S); dlg.remove(); }, 'pri'));
    root.append(dlg);
  }
  function cleanup() {
    cancelAnimationFrame(raf); clearInterval(timerI);
    if (rec && rec.state !== 'inactive') { rec.onstop = null; try { rec.stop(); } catch (e) { } }
    if (stream) stream.getTracks().forEach(t => t.stop());
    root.remove(); document.body.classList.remove('tp-open');
  }
  function close() { if (recording) { stopRec(); return; } cleanup(); }

  apply();
  raf = requestAnimationFrame(loop);
  startCam();
  return { close: cleanup };
}
