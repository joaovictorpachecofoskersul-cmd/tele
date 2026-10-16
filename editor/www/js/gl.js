// Motor WebGL2: compila os shaders da biblioteca e compõe quadros.
import { HEADER, VERT, TRANS_BY_ID, FX_BY_ID } from './effects.js';

const MAIN = `\nvoid main(){ o = f(vUv); o.a = 1.; }`;

// Posiciona um clipe dentro do quadro (cobrir / caber / zoom / deslocamento) com fundo.
// uD.xy = tamanho da fonte, uD.z = modo de fundo (0 cor, 1 desfocado), uC = (fit, zoom, offX, offY), uSeed = cor do fundo (cinza)
const PLACE = `
uniform vec4 uD;
vec4 f(vec2 uv){
  float sa = uD.x/uD.y, oa = asp();
  vec2 sz = (uC.x < .5) ? (sa > oa ? vec2(sa/oa, 1.) : vec2(1., oa/sa)) : (sa > oa ? vec2(1., oa/sa) : vec2(sa/oa, 1.));
  sz *= uC.y;
  vec2 c = vec2(.5) + vec2(uC.z, -uC.w);
  vec2 s = (uv - c)/sz + .5;
  if (inside(s) < .5) { return uD.z > .5 ? vec4(texture(uB, uv).rgb*.55, 1.) : vec4(vec3(uSeed), 1.); }
  return texture(uA, s);
}`;
// recorte de pessoa: mistura o fundo (uB) e a pessoa (uA) pela máscara (uM.r). uC.x = limiar, uC.y = suavidade
const SEGC = `vec4 f(vec2 uv){ vec4 fg = texture(uA, uv); float m = texture(uM, uv).r; float a = smoothstep(uC.x - uC.y, uC.x + uC.y, m); return vec4(mix(texture(uB, uv).rgb, fg.rgb, a), 1.); }`;
const GRAY = `vec4 f(vec2 uv){ vec3 c = texture(uA, uv).rgb; float g = dot(c, vec3(.299,.587,.114)); return vec4(vec3(g)*uC.x, 1.); }`;
// ajuste de cor: uC = (brilho, contraste, saturação, temperatura), uD = (tom, vinheta, nitidez, realce/sombra)
const ADJ = `
uniform vec4 uD;
vec4 f(vec2 uv){
  vec2 px = 1./uRes;
  vec3 c = texture(uA, uv).rgb;
  if (uD.z > 0.001) {
    vec3 bl = (texture(uA, uv+vec2(px.x,0)).rgb + texture(uA, uv-vec2(px.x,0)).rgb + texture(uA, uv+vec2(0,px.y)).rgb + texture(uA, uv-vec2(0,px.y)).rgb) * .25;
    c += (c - bl) * uD.z * 2.5;
  }
  c += uC.x * .5;
  c = (c - .5) * (1. + uC.y) + .5;
  float l = luma(c);
  if (abs(uD.w) > .001) { float k = uD.w; c += k * .35 * (1. - smoothstep(.0, .55, l)) - k * .25 * smoothstep(.6, 1., l); }
  c = mix(vec3(luma(c)), c, 1. + uC.z);
  c += vec3(uC.w * .12, uD.x * -.06 + uC.w * .02, -uC.w * .12 + uD.x * .02);
  c.g += uD.x * .08;
  if (uD.y > .001) { vec2 d = (uv - .5) * vec2(asp(), 1.); c *= 1. - uD.y * smoothstep(.25, .95, length(d)); }
  return vec4(clamp(c, 0., 1.), 1.);
}`;
// LUT 3D guardado como faixa 2D (largura = N*N, altura = N). uC.x = N, uC.y = intensidade
const LUT = `
vec3 lutAt(vec3 c){
  float N = uC.x; float b = c.b * (N - 1.); float b0 = floor(b), b1 = min(N - 1., b0 + 1.), f = b - b0;
  vec2 sz = vec2(N * N, N);
  vec2 p0 = vec2(b0 * N + c.r * (N - 1.) + .5, c.g * (N - 1.) + .5) / sz;
  vec2 p1 = vec2(b1 * N + c.r * (N - 1.) + .5, c.g * (N - 1.) + .5) / sz;
  return mix(texture(uM, p0).rgb, texture(uM, p1).rgb, f);
}
vec4 f(vec2 uv){ vec3 c = texture(uA, uv).rgb; return vec4(mix(c, lutAt(clamp(c, 0., 1.)), uC.y), 1.); }`;
// chroma key: tira a cor escolhida e põe o fundo (uB). uC = cor, uD = (semelhança, suavidade, tirar reflexo, -)
const KEY = `
uniform vec4 uD;
vec2 cc(vec3 c){ return vec2(dot(c, vec3(-.169, -.331, .5)), dot(c, vec3(.5, -.419, -.081))); }
vec4 f(vec2 uv){
  vec3 c = texture(uA, uv).rgb;
  float d = distance(cc(c), cc(uC.rgb));
  float a = smoothstep(uD.x * .5, uD.x * .5 + uD.y * .5 + .001, d);
  float sp = 1. - smoothstep(uD.x * .5, uD.x * .5 + .25, d);
  vec3 fg = mix(c, vec3(luma(c)), sp * uD.z);
  return vec4(mix(texture(uB, uv).rgb, fg, a), 1.);
}`;
const COPY = `vec4 f(vec2 uv){ return texture(uA, uv); }`;
const BLUR = `vec4 f(vec2 uv){ vec4 acc=vec4(0); for(int i=-4;i<=4;i++){ acc += texture(uA, uv + uC.xy*float(i)); } return acc/9.; }`;

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('Este aparelho não tem WebGL2, que o editor precisa.');
    this.gl = gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.progs = new Map();
    this.fbos = new Map();
    this.texs = new Map();
    this.w = canvas.width; this.h = canvas.height;
    this.black = this._solid([0, 0, 0, 255]);
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; });
  }

  setSize(w, h) {
    if (w === this.w && h === this.h) return;
    this.canvas.width = w; this.canvas.height = h; this.w = w; this.h = h;
    for (const f of this.fbos.values()) { this.gl.deleteFramebuffer(f.fb); this.gl.deleteTexture(f.tex); }
    this.fbos.clear();
  }

  _solid(rgba) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(rgba));
    return { tex: t, w: 1, h: 1 };
  }

  _compile(type, src) {
    const gl = this.gl, s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s); gl.deleteShader(s);
      throw new Error('Shader: ' + log);
    }
    return s;
  }

  prog(key, body) {
    let p = this.progs.get(key);
    if (p) return p;
    const gl = this.gl;
    const pr = gl.createProgram();
    gl.attachShader(pr, this._compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, this._compile(gl.FRAGMENT_SHADER, HEADER + body + MAIN));
    gl.bindAttribLocation(pr, 0, 'aPos');
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('Link: ' + gl.getProgramInfoLog(pr));
    const u = {};
    for (const n of ['uA', 'uB', 'uM', 'uPrev', 'uP', 'uT', 'uI', 'uSeed', 'uRes', 'uC', 'uD']) u[n] = gl.getUniformLocation(pr, n);
    p = { pr, u };
    this.progs.set(key, p);
    return p;
  }

  // Compila todos os shaders de uma vez (para detectar erro cedo)
  warmup(transIds, fxIds) {
    const errs = [];
    for (const id of transIds) { try { this.prog('t:' + id, TRANS_BY_ID[id].glsl); } catch (e) { errs.push(id + ': ' + e.message); } }
    for (const id of fxIds) { try { this.prog('f:' + id, FX_BY_ID[id].glsl); } catch (e) { errs.push(id + ': ' + e.message); } }
    return errs;
  }

  texture(key) {
    let t = this.texs.get(key);
    if (t) return t;
    const gl = this.gl, tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    t = { tex, w: 1, h: 1 };
    this.texs.set(key, t);
    return t;
  }

  upload(key, source, w, h) {
    const gl = this.gl, t = this.texture(key);
    // ImageBitmap ignora o "virar de cabeça para baixo" do WebGL: passa por um canvas antes.
    // Como foto não muda entre quadros, só envia de novo quando a imagem for outra.
    if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
      if (t.bmp === source) return t;
      if (!t.cv) { t.cv = document.createElement('canvas'); }
      t.cv.width = source.width; t.cv.height = source.height;
      t.cv.getContext('2d').drawImage(source, 0, 0);
      t.bmp = source;
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, t.cv);
      t.w = source.width; t.h = source.height;
      return t;
    }
    t.bmp = null;
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    t.w = w || source.videoWidth || source.displayWidth || source.width || 1;
    t.h = h || source.videoHeight || source.displayHeight || source.height || 1;
    return t;
  }

  dropTexture(key) {
    const t = this.texs.get(key);
    if (t) { this.gl.deleteTexture(t.tex); this.texs.delete(key); }
  }

  fbo(name, w = this.w, h = this.h) {
    let f = this.fbos.get(name);
    if (f && f.w === w && f.h === h) return f;
    const gl = this.gl;
    if (f) { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.tex); }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    f = { fb, tex, w, h };
    this.fbos.set(name, f);
    return f;
  }

  // Executa um passe. target = fbo ou null (tela). tx = {A,B,M,Prev} objetos {tex}
  pass(key, body, tx, un, target) {
    const gl = this.gl;
    const p = this.prog(key, body);
    gl.useProgram(p.pr);
    const W = target ? target.w : this.w, H = target ? target.h : this.h;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, W, H);
    const slots = [['uA', tx.A], ['uB', tx.B], ['uM', tx.M], ['uPrev', tx.Prev]];
    slots.forEach(([n, t], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, (t || this.black).tex);
      if (p.u[n]) gl.uniform1i(p.u[n], i);
    });
    const v = un || {};
    if (p.u.uP) gl.uniform1f(p.u.uP, v.P || 0);
    if (p.u.uT) gl.uniform1f(p.u.uT, v.T || 0);
    if (p.u.uI) gl.uniform1f(p.u.uI, v.I == null ? 1 : v.I);
    if (p.u.uSeed) gl.uniform1f(p.u.uSeed, v.Seed || 0);
    if (p.u.uRes) gl.uniform2f(p.u.uRes, W, H);
    if (p.u.uC) gl.uniform4fv(p.u.uC, v.C || [0, 0, 0, 0]);
    if (p.u.uD) gl.uniform4fv(p.u.uD, v.D || [0, 0, 0, 0]);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return target;
  }

  // Coloca um clipe (textura src) no quadro, com fundo preto, de cor ou desfocado.
  place(src, opt, target) {
    const fit = opt.fit === 'contain' || opt.fit === 'blur' ? 1 : 0;
    let bg = null;
    if (opt.fit === 'blur') {
      const sw = Math.max(8, Math.round(this.w / 12)), sh = Math.max(8, Math.round(this.h / 12));
      const s1 = this.fbo('bg1', sw, sh), s2 = this.fbo('bg2', sw, sh);
      this.pass('place', PLACE, { A: src }, { C: [0, 1.15, 0, 0], D: [src.w, src.h, 0, 0] }, s1);
      this.pass('blur', BLUR, { A: s1 }, { C: [1.5 / sw, 0, 0, 0] }, s2);
      this.pass('blur', BLUR, { A: s2 }, { C: [0, 1.5 / sh, 0, 0] }, s1);
      bg = s1;
    }
    return this.pass('place', PLACE, { A: src, B: bg }, {
      C: [fit, opt.zoom || 1, opt.x || 0, opt.y || 0],
      D: [src.w, src.h, bg ? 1 : 0, 0],
      Seed: opt.bgGray || 0,
    }, target);
  }

  transition(id, A, B, p, t, maskTex, target) {
    const tr = TRANS_BY_ID[id] || TRANS_BY_ID.fade;
    return this.pass('t:' + tr.id, tr.glsl, { A, B, M: maskTex }, { P: p, T: t, Seed: 3.7 }, target);
  }

  effect(id, A, p, t, intensity, extra, prev, target) {
    const fx = FX_BY_ID[id];
    if (!fx) return A;
    return this.pass('f:' + fx.id, fx.glsl, { A, Prev: prev }, { P: p, T: t, I: intensity, C: extra || [0, 0, 0, 0] }, target);
  }

  solid(hex) {
    const key = 'solid:' + hex;
    if (!this.texs.has(key)) {
      const n = parseInt(String(hex).replace('#', '').padEnd(6, '0').slice(0, 6), 16);
      this.texs.set(key, this._solid([(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]));
    }
    return this.texs.get(key);
  }

  // fundo desfocado forte de uma textura já posicionada
  blurBg(src, name) {
    const sw = Math.max(8, Math.round(this.w / 16)), sh = Math.max(8, Math.round(this.h / 16));
    const s1 = this.fbo(name + 'b1', sw, sh), s2 = this.fbo(name + 'b2', sw, sh);
    this.pass('copy', COPY, { A: src }, {}, s1);
    for (let i = 0; i < 2; i++) {
      this.pass('blur', BLUR, { A: s1 }, { C: [1.6 / sw, 0, 0, 0] }, s2);
      this.pass('blur', BLUR, { A: s2 }, { C: [0, 1.6 / sh, 0, 0] }, s1);
    }
    return s1;
  }
  gray(src, k, target) { return this.pass('gray', GRAY, { A: src }, { C: [k, 0, 0, 0] }, target); }
  adjust(src, a, target) {
    return this.pass('adj', ADJ, { A: src }, { C: [a.bri || 0, a.con || 0, a.sat || 0, a.temp || 0], D: [a.tint || 0, a.vig || 0, a.sharp || 0, a.shadow || 0] }, target);
  }
  // LUT: data = Uint8Array RGBA (N*N x N)
  lutTexture(key, lut) {
    if (this.texs.has(key)) return this.texs.get(key);
    const gl = this.gl, tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, lut.n * lut.n, lut.n, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut.data);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const t = { tex, w: lut.n * lut.n, h: lut.n };
    this.texs.set(key, t);
    return t;
  }
  lut(src, lutTex, n, k, target) { return this.pass('lut', LUT, { A: src, M: lutTex }, { C: [n, k, 0, 0] }, target); }
  chroma(src, bg, color, sim, soft, spill, target) {
    const n = parseInt(String(color || '#00FF00').replace('#', '').slice(0, 6), 16);
    return this.pass('key', KEY, { A: src, B: bg }, { C: [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1], D: [sim, soft, spill, 0] }, target);
  }
  segComposite(fg, mask, bg, thr, soft, target) { return this.pass('segc', SEGC, { A: fg, B: bg, M: mask }, { C: [thr, soft, 0, 0] }, target); }

  copy(src, target) { return this.pass('copy', COPY, { A: src }, {}, target); }
}
