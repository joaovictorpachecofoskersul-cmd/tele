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

  copy(src, target) { return this.pass('copy', COPY, { A: src }, {}, target); }
}
