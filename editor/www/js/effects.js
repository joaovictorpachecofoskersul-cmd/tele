// Biblioteca de transições e efeitos (shaders WebGL2).
// Convenção: todas as texturas com v=0 embaixo (upload com FLIP_Y). "Topo" = v=1.
// Transições recebem uA (clipe que sai), uB (clipe que entra), uP (0..1).
// Efeitos recebem uA (quadro atual), uP (progresso dentro do item 0..1), uT (tempo em s), uI (intensidade 0..1).

export const HEADER = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uA, uB, uM, uPrev;
uniform float uP, uT, uI, uSeed;
uniform vec2 uRes;
uniform vec4 uC;
const float PI = 3.14159265;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float hash1(float n){ return fract(sin(n)*43758.5453123); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=.5; } return v; }
float asp(){ return uRes.x/uRes.y; }
vec2 toP(vec2 uv){ return (uv-.5)*vec2(asp(),1.); }
vec2 fromP(vec2 p){ return p/vec2(asp(),1.)+.5; }
float luma(vec3 c){ return dot(c, vec3(.299,.587,.114)); }
float inside(vec2 uv){ return step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.); }
vec4 A(vec2 uv){ return texture(uA, clamp(uv,0.,1.)); }
vec4 B(vec2 uv){ return texture(uB, clamp(uv,0.,1.)); }
vec4 Ak(vec2 uv){ return inside(uv)>.5 ? texture(uA,uv) : vec4(0,0,0,1); }
vec4 Bk(vec2 uv){ return inside(uv)>.5 ? texture(uB,uv) : vec4(0,0,0,1); }
float easeIO(float x){ return x<.5 ? 4.*x*x*x : 1.-pow(-2.*x+2.,3.)/2.; }
float easeOut(float x){ return 1.-pow(1.-x,3.); }
float easeIn(float x){ return x*x*x; }
vec2 rot(vec2 p, float a){ float c=cos(a), s=sin(a); return vec2(c*p.x-s*p.y, s*p.x+c*p.y); }
vec4 radialBlurA(vec2 uv, vec2 c, float s){ vec4 acc=vec4(0); for(int i=0;i<16;i++){ float k=1.-s*float(i)/15.; acc+=Ak(c+(uv-c)*k);} return acc/16.; }
vec4 radialBlurB(vec2 uv, vec2 c, float s){ vec4 acc=vec4(0); for(int i=0;i<16;i++){ float k=1.-s*float(i)/15.; acc+=Bk(c+(uv-c)*k);} return acc/16.; }
`;

export const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos*.5+.5; gl_Position = vec4(aPos,0.,1.); }`;

// --------------------------------------------------------------------------
// TRANSIÇÕES
// --------------------------------------------------------------------------
export const TRANSITIONS = [
  { id:'none', name:'Corte seco', dur:0, sfx:null, glsl:`vec4 f(vec2 uv){ return uP<.5?A(uv):B(uv); }` },

  { id:'fade', name:'Dissolver', dur:.5, sfx:null, glsl:`vec4 f(vec2 uv){ return mix(A(uv),B(uv),easeIO(uP)); }` },

  { id:'flash', name:'Flash branco', dur:.35, sfx:'impacto', glsl:`
vec4 f(vec2 uv){ float w = 1.-abs(uP-.5)*2.; w = pow(w,.7);
  vec4 c = uP<.5?A(uv):B(uv); return mix(c, vec4(1), w); }` },

  { id:'dip', name:'Mergulho preto', dur:.5, sfx:null, glsl:`
vec4 f(vec2 uv){ float w = 1.-abs(uP-.5)*2.; vec4 c = uP<.5?A(uv):B(uv); return mix(c, vec4(0,0,0,1), smoothstep(0.,1.,w)); }` },

  { id:'whipL', name:'Chicote (esquerda)', dur:.4, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ float e = easeIO(uP); float bl = sin(PI*uP)*.18; vec4 acc=vec4(0);
  for(int i=0;i<20;i++){ float k = (float(i)/19.-.5)*bl; vec2 q = uv + vec2(e + k, 0.);
    acc += q.x<1. ? A(vec2(q.x,uv.y)) : B(vec2(q.x-1.,uv.y)); }
  return acc/20.; }` },

  { id:'whipR', name:'Chicote (direita)', dur:.4, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ float e = easeIO(uP); float bl = sin(PI*uP)*.18; vec4 acc=vec4(0);
  for(int i=0;i<20;i++){ float k = (float(i)/19.-.5)*bl; vec2 q = uv - vec2(e + k, 0.);
    acc += q.x>0. ? A(vec2(q.x,uv.y)) : B(vec2(q.x+1.,uv.y)); }
  return acc/20.; }` },

  { id:'whipUp', name:'Chicote (cima)', dur:.4, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ float e = easeIO(uP); float bl = sin(PI*uP)*.18; vec4 acc=vec4(0);
  for(int i=0;i<20;i++){ float k = (float(i)/19.-.5)*bl; vec2 q = uv - vec2(0., e + k);
    acc += q.y>0. ? A(vec2(uv.x,q.y)) : B(vec2(uv.x,q.y+1.)); }
  return acc/20.; }` },

  { id:'zoompunch', name:'Zoom soco', dur:.45, sfx:'boom', glsl:`
vec4 f(vec2 uv){ vec2 c=vec2(.5);
  if(uP<.5){ float k=easeIn(uP*2.); vec2 q=c+(uv-c)/(1.+k*.8); vec4 col=radialBlurA(q,c,k*.25); return mix(col,vec4(1),k*.35); }
  float k=1.-easeOut((uP-.5)*2.); vec2 q=c+(uv-c)/(1.+k*.8); vec4 col=radialBlurB(q,c,k*.25); return mix(col,vec4(1),k*.35); }` },

  { id:'zoomin', name:'Zoom suave', dur:.6, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ vec2 c=vec2(.5); float e=easeIO(uP);
  vec4 a=A(c+(uv-c)/(1.+e*1.5)); vec4 b=B(c+(uv-c)/(2.5-e*1.5)); return mix(a,b,smoothstep(.35,.65,uP)); }` },

  { id:'glitch', name:'Glitch', dur:.45, sfx:'glitch', glsl:`
vec4 f(vec2 uv){ float t=floor(uT*24.); float amt=sin(PI*uP);
  float row=floor(uv.y*28.+hash1(t)*5.); float r=hash(vec2(row,t));
  float shift=(r-.5)*.25*amt*step(.45,hash(vec2(row*1.7,t+3.)));
  vec2 q=vec2(uv.x+shift, uv.y); float pick=step(hash(vec2(row,t+9.)), uP*1.15-.05);
  float sp=.02*amt;
  vec4 cr=mix(A(q+vec2(sp,0)),B(q+vec2(sp,0)),pick); vec4 cg=mix(A(q),B(q),pick); vec4 cb=mix(A(q-vec2(sp,0)),B(q-vec2(sp,0)),pick);
  vec3 col=vec3(cr.r,cg.g,cb.b); float ln=step(.985,hash(vec2(floor(uv.y*240.),t)))*amt; col=mix(col,vec3(hash(vec2(uv.x,t))),ln);
  return vec4(col,1.); }` },

  { id:'rgbsplit', name:'RGB split', dur:.4, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ float a=sin(PI*uP)*.06; vec2 d=vec2(a,a*.3);
  vec4 r = uP<.5?A(uv+d):B(uv+d); vec4 g = uP<.5?A(uv):B(uv); vec4 b = uP<.5?A(uv-d):B(uv-d);
  return vec4(r.r,g.g,b.b,1.); }` },

  { id:'iris', name:'Íris circular', dur:.6, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ vec2 p=toP(uv); float r=easeIO(uP)*1.25; float d=length(p);
  float m=smoothstep(r,r-.01,d); vec4 c=mix(A(uv),B(uv),m); float ring=smoothstep(.012,0.,abs(d-r))*step(.02,uP)*step(uP,.98);
  return mix(c,vec4(1),ring*.8); }` },

  { id:'blinds', name:'Persiana', dur:.6, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ float n=12.; float k=fract(uv.y*n); float delay=floor(uv.y*n)/n*.3; float e=clamp((uP-delay)/.7,0.,1.);
  return k<easeIO(e)?B(uv):A(uv); }` },

  { id:'tear', name:'Papel rasgado', dur:.7, sfx:'rasgo', glsl:`
vec4 f(vec2 uv){ float e=easeIO(uP); float x0=mix(-.25,1.25,e);
  float edge=x0+(fbm(vec2(uv.y*9.,1.3))-.5)*.16+(noise(vec2(uv.y*70.,3.))-.5)*.02;
  if(uv.x<edge-.022){ return B(uv); }
  if(uv.x<edge){ float fib=fbm(uv*vec2(60.,140.)); vec3 paper=vec3(.95,.93,.88)-fib*.18; return vec4(paper,1.); }
  float sh=smoothstep(.06,0.,uv.x-edge)*.55; vec4 a=A(uv+vec2(e*.08,0.)); return vec4(a.rgb*(1.-sh),1.); }` },

  { id:'shatter', name:'Vidro estilhaçado', dur:.8, sfx:'vidro', glsl:`
vec2 seed(vec2 cell){ return cell+.15+.7*vec2(hash(cell),hash(cell+7.3)); }
vec4 f(vec2 uv){
  vec2 G=vec2(6.,10.); vec2 P=uv*G;
  if(uP<.18){ vec2 c=floor(P); float md=9., md2=9.;
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ vec2 cc=c+vec2(x,y); float d=length(P-seed(cc)); if(d<md){md2=md;md=d;}else if(d<md2)md2=d; }
    float crack=smoothstep(.05,0.,md2-md)*smoothstep(0.,.18,uP)*1.2; vec4 a=A(uv); return vec4(mix(a.rgb,vec3(1),crack),1.); }
  float t=(uP-.18)/.82;
  for(int y=-3;y<=2;y++)for(int x=-2;x<=2;x++){
    vec2 cc=floor(P)+vec2(x,y); vec2 s=seed(cc); float h=hash(cc+2.1);
    vec2 cen=s/G; vec2 dir=normalize(cen-vec2(.5,.45)+.001);
    vec2 off=dir*t*(.25+h*.4)+vec2(0.,-1.6*t*t*(.5+h));
    float ang=(h-.5)*t*5.; float sc=1.-t*.35;
    vec2 q=cen+rot((uv-cen-off)/sc,-ang)*vec2(1.,1.);
    vec2 Q=q*G; vec2 qc=floor(Q); float md=9.; vec2 own=vec2(-99.);
    for(int yy=-1;yy<=1;yy++)for(int xx=-1;xx<=1;xx++){ vec2 c2=qc+vec2(xx,yy); float d=length(Q-seed(c2)); if(d<md){md=d;own=c2;} }
    if(own==cc && inside(q)>.5){ vec4 a=A(q); float shade=.85+.3*h; return vec4(a.rgb*shade,1.); }
  }
  return B(uv); }` },

  { id:'spin3d', name:'Giro 3D', dur:.7, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ float a=easeIO(uP)*PI; bool second=a>PI*.5; float ang=second?a-PI:a;
  float x=uv.x*2.-1.; float d=.9; float cs=cos(ang), sn=sin(ang);
  float px = x/(cs - x*sn*d*.5); float w=1.-px*sn*d*.5; float py=(uv.y*2.-1.)*w;
  vec2 q=vec2(px,py)*.5+.5; if(inside(q)<.5) return vec4(0,0,0,1);
  vec4 c = second?B(q):A(q); return vec4(c.rgb*(.75+.25*abs(cs)),1.); }` },

  { id:'mosaic', name:'Mosaico em cascata', dur:.8, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ vec2 G=vec2(6.,10.); vec2 cell=floor(uv*G); vec2 lc=fract(uv*G);
  float delay=(cell.x/G.x+(G.y-1.-cell.y)/G.y)*.5; float e=clamp((uP-delay)/.5,0.,1.);
  float sx=abs(cos(e*PI)); float lx=(lc.x-.5)/max(sx,.001)+.5; if(lx<0.||lx>1.) return vec4(0,0,0,1);
  vec2 q=(cell+vec2(lx,lc.y))/G; vec4 c=e<.5?A(q):B(q); return vec4(c.rgb*(.6+.4*sx),1.); }` },

  { id:'pixelate', name:'Pixelizar', dur:.5, sfx:'glitch', glsl:`
vec4 f(vec2 uv){ float s=sin(PI*uP); float n=mix(400.,14.,pow(s,.6)); vec2 g=vec2(n*asp(),n);
  vec2 q=(floor(uv*g)+.5)/g; return uP<.5?A(q):B(q); }` },

  { id:'shockwave', name:'Onda de choque', dur:.7, sfx:'boom', glsl:`
vec4 f(vec2 uv){ vec2 p=toP(uv); float r=easeOut(uP)*1.3; float d=length(p); float w=.12;
  float k=d-r; float disp=0.; if(abs(k)<w){ disp=sin(k/w*PI)*.05*(1.-uP); }
  vec2 q=fromP(p+normalize(p+.0001)*disp); vec4 c=d<r-.02?B(q):A(q);
  float ring=smoothstep(w,0.,abs(k))*(1.-uP)*.5; return vec4(c.rgb+ring,1.); }` },

  { id:'ink', name:'Tinta espalhando', dur:.9, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ vec2 p=toP(uv); float n=fbm(uv*3.5+uSeed)*.75+length(p)*.55; float th=mix(-.1,1.2,easeIO(uP));
  float m=smoothstep(th+.02,th-.02,n); float edge=smoothstep(.05,0.,abs(n-th))*step(.02,uP)*step(uP,.98);
  vec4 c=mix(A(uv),B(uv),m); return vec4(mix(c.rgb,vec3(.05),edge*.85),1.); }` },

  { id:'kaleido', name:'Caleidoscópio', dur:.8, sfx:'whoosh', glsl:`
vec2 kal(vec2 uv,float amt){ vec2 p=toP(uv); float a=atan(p.y,p.x)+uP*PI; float r=length(p); float seg=PI/3.;
  float ka=mod(a,seg); ka=abs(ka-seg*.5); vec2 kp=vec2(cos(ka),sin(ka))*r; return fromP(mix(p,kp*1.2,amt)); }
vec4 f(vec2 uv){ float amt=sin(PI*uP); vec2 q=kal(uv,amt); return uP<.5?A(q):B(q); }` },

  { id:'vhs', name:'VHS rolando', dur:.7, sfx:'chiado', glsl:`
vec4 f(vec2 uv){ float s=sin(PI*uP); float roll=easeIO(uP); vec2 q=vec2(uv.x+(noise(vec2(uv.y*30.,uT*20.))-.5)*.03*s, fract(uv.y+roll));
  bool useB = uv.y+roll>=1.; vec4 c=useB?B(q):A(q); float bleed=.006*s;
  vec3 col=vec3((useB?B(q+vec2(bleed,0)):A(q+vec2(bleed,0))).r, c.g, (useB?B(q-vec2(bleed,0)):A(q-vec2(bleed,0))).b);
  float band=smoothstep(.02,0.,abs(fract(uv.y+roll)-.0))*s; col+=band*.4; col+=(hash(uv*uRes+uT)-.5)*.25*s;
  col*=.9+.1*sin(uv.y*uRes.y*1.5); return vec4(col,1.); }` },

  { id:'fisheye', name:'Olho de peixe', dur:.6, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ float amt=sin(PI*uP)*1.6; vec2 p=toP(uv); float r=length(p); vec2 q=fromP(p*(1.-amt*.35+amt*.35*r*r*1.4)/(1.+amt*.3));
  vec4 c=uP<.5?Ak(q):Bk(q); return vec4(c.rgb*(1.-r*r*amt*.25),1.); }` },

  { id:'mask', name:'Máscara de texto', dur:.8, sfx:'whoosh', usesMask:true, glsl:`
vec4 f(vec2 uv){ float s=mix(.25,18.,pow(easeIO(uP),2.2)); vec2 p=(uv-.5)/s+.5;
  float m = inside(p)>.5 ? texture(uM,p).a : 0.; m=max(m, smoothstep(.85,1.,uP));
  return mix(A(uv),B(uv),m); }` },

  { id:'scanner', name:'Scanner de luz', dur:.6, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ float y=mix(1.15,-.15,easeIO(uP)); vec4 c=uv.y>y?B(uv):A(uv); float g=exp(-pow((uv.y-y)*30.,2.));
  return vec4(c.rgb+vec3(.6,.85,1.)*g*1.4,1.); }` },

  { id:'diag', name:'Split diagonal', dur:.6, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ vec2 P=toP(uv); vec2 d=normalize(vec2(1.,1.6)); vec2 nr=vec2(-d.y,d.x); float side=dot(P,nr)>=0.?1.:-1.; float e=easeIO(uP);
  vec2 Q=P-nr*side*e*.9-d*side*e*.25;
  if((dot(Q,nr)>=0.?1.:-1.)==side){ vec2 q=fromP(Q); if(inside(q)>.5) return A(q); }
  return B(uv); }` },

  { id:'radialzoom', name:'Zoom radial', dur:.5, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ vec2 c=vec2(.5); float s=sin(PI*uP)*.45; vec4 col = uP<.5 ? radialBlurA(uv,c,s) : radialBlurB(uv,c,s); return col; }` },

  { id:'static', name:'Chiado de TV', dur:.5, sfx:'chiado', glsl:`
vec4 f(vec2 uv){ float s=sin(PI*uP); vec4 c=uP<.5?A(uv):B(uv); float n=hash(floor(uv*uRes/2.)+floor(uT*30.)*1.37);
  float lines=.8+.2*sin(uv.y*uRes.y*1.2); vec3 col=mix(c.rgb,vec3(n),pow(s,.6))*lines; return vec4(col,1.); }` },

  { id:'leak', name:'Light leak', dur:.8, sfx:null, glsl:`
vec4 f(vec2 uv){ float s=sin(PI*uP); vec4 c=mix(A(uv),B(uv),smoothstep(.3,.7,uP));
  vec2 p=uv-vec2(mix(-.2,1.2,uP),.6); float g=exp(-dot(p,p)*3.5); vec2 p2=uv-vec2(mix(1.1,-.1,uP),.25); float g2=exp(-dot(p2,p2)*5.);
  vec3 leak=vec3(1.,.55,.2)*g+vec3(1.,.25,.45)*g2; return vec4(1.-(1.-c.rgb)*(1.-leak*s*1.3),1.); }` },

  { id:'slideUp', name:'Empurrar p/ cima', dur:.45, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ float e=easeIO(uP); vec2 q=uv-vec2(0.,e); return q.y>=0.?A(q):B(vec2(q.x,q.y+1.)); }` },

  { id:'slideLeft', name:'Empurrar p/ lado', dur:.45, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ float e=easeIO(uP); vec2 q=uv+vec2(e,0.); return q.x<=1.?A(q):B(vec2(q.x-1.,q.y)); }` },

  { id:'shake', name:'Tremor', dur:.4, sfx:'boom', glsl:`
vec4 f(vec2 uv){ float s=sin(PI*uP); vec2 o=vec2(noise(vec2(uT*40.,1.))-.5,noise(vec2(uT*40.,7.))-.5)*.08*s;
  vec2 q=(uv-.5)/(1.+.1*s)+.5+o; return uP<.5?A(q):B(q); }` },

  { id:'swirl', name:'Redemoinho', dur:.6, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ vec2 p=toP(uv); float r=length(p); float a=sin(PI*uP)*6.*(1.-smoothstep(0.,.9,r)); vec2 q=fromP(rot(p,a));
  return uP<.5?A(q):B(q); }` },

  { id:'heart', name:'Coração', dur:.7, sfx:'pop', glsl:`
vec4 f(vec2 uv){ float s=easeIO(uP)*2.8+.001; vec2 q=toP(uv)/s*1.5; q.y+=.2; float x=q.x, y=q.y;
  float a=x*x+y*y-1.; float v=a*a*a-x*x*y*y*y; return v<0.?B(uv):A(uv); }` },

  { id:'circlesplit', name:'Cortinas', dur:.6, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ float e=easeIO(uP)*.5; if(abs(uv.x-.5)<e) return B(uv); vec2 q=uv+vec2(uv.x<.5?e:-e,0.); return A(q); }` },
];

// --------------------------------------------------------------------------
// EFEITOS (aplicados a um trecho da linha do tempo ou a um clipe)
// params: lista de controles mostrados no painel
// --------------------------------------------------------------------------
export const EFFECTS = [
  { id:'shake', name:'Tremor', group:'Movimento', def:{i:.6}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec2 o=vec2(noise(vec2(uT*35.,1.))-.5,noise(vec2(uT*35.,9.))-.5)*.06*uI; float a=(noise(vec2(uT*25.,4.))-.5)*.05*uI;
  vec2 q=fromP(rot(toP(uv),a))+o; q=(q-.5)/(1.+.06*uI)+.5; return A(q); }` },

  { id:'zoompunch', name:'Zoom soco', group:'Movimento', def:{i:.7}, sfx:'boom', glsl:`
vec4 f(vec2 uv){ float k=uI*.4*(1.-easeOut(clamp(uP*3.,0.,1.))); float bl=k*.3; vec2 c=vec2(.5); vec2 q=c+(uv-c)/(1.+k); return radialBlurA(q,c,bl); }` },

  { id:'zoomslow', name:'Zoom lento', group:'Movimento', def:{i:.5}, sfx:null, glsl:`
vec4 f(vec2 uv){ float s=1.+uI*.25*uP; return A((uv-.5)/s+.5); }` },

  { id:'zoomout', name:'Afastar lento', group:'Movimento', def:{i:.5}, sfx:null, glsl:`
vec4 f(vec2 uv){ float s=1.+uI*.25*(1.-uP); return A((uv-.5)/s+.5); }` },

  { id:'pulse', name:'Pulsar na batida', group:'Movimento', def:{i:.5, bpm:126}, sfx:null, glsl:`
vec4 f(vec2 uv){ float beat=fract(uT*uC.x/60.); float k=uI*.08*exp(-beat*7.); return A((uv-.5)/(1.+k)+.5); }` },

  { id:'flash', name:'Flash', group:'Luz', def:{i:.9}, sfx:'impacto', glsl:`
vec4 f(vec2 uv){ float k=uI*pow(1.-clamp(uP,0.,1.),2.); vec4 c=A(uv); return vec4(mix(c.rgb,vec3(1),k),1.); }` },

  { id:'strobe', name:'Pisca-pisca', group:'Luz', def:{i:.7}, sfx:null, glsl:`
vec4 f(vec2 uv){ float on=step(.5,fract(uT*8.)); vec4 c=A(uv); return vec4(mix(c.rgb,vec3(1),on*uI*.8),1.); }` },

  { id:'leak', name:'Light leak quente', group:'Luz', def:{i:.7}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec4 c=A(uv); vec2 p=uv-vec2(.2+.6*sin(uT*.7),.75); float g=exp(-dot(p,p)*3.); vec2 p2=uv-vec2(.85,.2+.3*cos(uT*.5)); float g2=exp(-dot(p2,p2)*4.);
  vec3 lk=vec3(1.,.5,.15)*g+vec3(1.,.2,.4)*g2; return vec4(1.-(1.-c.rgb)*(1.-lk*uI),1.); }` },

  { id:'scanner', name:'Scanner de luz', group:'Luz', def:{i:.8}, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ float y=mix(1.1,-.1,fract(uP)); float g=exp(-pow((uv.y-y)*28.,2.)); vec4 c=A(uv); return vec4(c.rgb+vec3(.6,.85,1.)*g*uI*1.4,1.); }` },

  { id:'glow', name:'Brilho suave', group:'Luz', def:{i:.6}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec3 acc=vec3(0); for(int i=0;i<12;i++){ float a=float(i)*PI/6.; acc+=A(uv+vec2(cos(a),sin(a))*.012).rgb; } acc/=12.;
  vec4 c=A(uv); vec3 br=max(acc-.5,0.)*2.; return vec4(c.rgb+br*uI*.8,1.); }` },

  { id:'rgbsplit', name:'RGB split', group:'Glitch', def:{i:.6}, sfx:null, glsl:`
vec4 f(vec2 uv){ float a=uI*.02*(1.+.5*sin(uT*9.)); return vec4(A(uv+vec2(a,0)).r, A(uv).g, A(uv-vec2(a,0)).b, 1.); }` },

  { id:'glitch', name:'Glitch', group:'Glitch', def:{i:.7}, sfx:'glitch', glsl:`
vec4 f(vec2 uv){ float t=floor(uT*16.); float row=floor(uv.y*24.+hash1(t)*4.); float on=step(1.-uI*.55,hash(vec2(row,t)));
  float sh=(hash(vec2(row*3.1,t))-.5)*.2*on; vec2 q=vec2(uv.x+sh,uv.y); float sp=.015*uI;
  vec3 col=vec3(A(q+vec2(sp,0)).r,A(q).g,A(q-vec2(sp,0)).b); float blk=step(.97,hash(vec2(floor(uv*vec2(12,30)))+t))*uI; col=mix(col,1.-col,blk);
  return vec4(col,1.); }` },

  { id:'vhs', name:'VHS', group:'Glitch', def:{i:.7}, sfx:null, glsl:`
vec4 f(vec2 uv){ float w=(noise(vec2(uv.y*20.,uT*10.))-.5)*.012*uI; float band=smoothstep(.05,0.,abs(uv.y-fract(uT*.35)))*uI;
  vec2 q=vec2(uv.x+w+band*.03,uv.y); float b=.005*uI; vec3 col=vec3(A(q+vec2(b,0)).r,A(q).g,A(q-vec2(b,0)).b);
  col+= (hash(uv*uRes+floor(uT*30.))-.5)*.18*uI; col*=.92+.08*sin(uv.y*uRes.y*1.3); col=mix(col,col*vec3(1.05,.95,1.1),uI); col+=band*.25;
  return vec4(col,1.); }` },

  { id:'tvnoise', name:'Chiado de TV', group:'Glitch', def:{i:.5}, sfx:'chiado', glsl:`
vec4 f(vec2 uv){ float n=hash(floor(uv*uRes/2.)+floor(uT*30.)*1.37); vec4 c=A(uv); return vec4(mix(c.rgb,vec3(n),uI*.85)*(.85+.15*sin(uv.y*uRes.y)),1.); }` },

  { id:'pixelate', name:'Pixelizar', group:'Glitch', def:{i:.5}, sfx:null, glsl:`
vec4 f(vec2 uv){ float n=mix(160.,10.,uI); vec2 g=vec2(n*asp(),n); return A((floor(uv*g)+.5)/g); }` },

  { id:'bw', name:'Preto e branco', group:'Cor', def:{i:1}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec4 c=A(uv); float l=luma(c.rgb); l=(l-.5)*1.25+.5; return vec4(mix(c.rgb,vec3(l),uI),1.); }` },

  { id:'redonly', name:'Só vermelho', group:'Cor', def:{i:1}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec4 c=A(uv); float l=luma(c.rgb); float red=smoothstep(.12,.32,c.r-max(c.g,c.b)); vec3 g=vec3((l-.5)*1.2+.5);
  return vec4(mix(c.rgb, mix(g,c.rgb*vec3(1.15,.9,.9),red), uI),1.); }` },

  { id:'pop', name:'Cor viva', group:'Cor', def:{i:.6}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec4 c=A(uv); float l=luma(c.rgb); vec3 s=mix(vec3(l),c.rgb,1.+uI*.6); s=(s-.5)*(1.+uI*.25)+.5; return vec4(clamp(s,0.,1.),1.); }` },

  { id:'warm', name:'Quente', group:'Cor', def:{i:.6}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec4 c=A(uv); return vec4(c.rgb*mix(vec3(1),vec3(1.12,1.,.82),uI),1.); }` },

  { id:'cold', name:'Frio', group:'Cor', def:{i:.6}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec4 c=A(uv); return vec4(c.rgb*mix(vec3(1),vec3(.85,1.,1.15),uI),1.); }` },

  { id:'vintage', name:'Vintage', group:'Cor', def:{i:.7}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec4 c=A(uv); vec3 s=vec3(dot(c.rgb,vec3(.393,.769,.189)),dot(c.rgb,vec3(.349,.686,.168)),dot(c.rgb,vec3(.272,.534,.131)));
  s=mix(c.rgb,s,uI*.85); s+= (hash(uv*uRes+floor(uT*24.))-.5)*.08*uI; float v=1.-smoothstep(.35,1.,length(toP(uv)))*.5*uI; return vec4(s*v,1.); }` },

  { id:'cinema', name:'Cinema', group:'Cor', def:{i:.7}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec4 c=A(uv); float l=luma(c.rgb); vec3 tint=mix(vec3(.0,.35,.45),vec3(1.,.6,.3),smoothstep(.2,.8,l));
  vec3 g=mix(c.rgb,c.rgb*.6+tint*.5*l+tint*.15,uI*.7); g=(g-.5)*(1.+.15*uI)+.5; return vec4(clamp(g,0.,1.),1.); }` },

  { id:'invert', name:'Negativo', group:'Cor', def:{i:1}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec4 c=A(uv); return vec4(mix(c.rgb,1.-c.rgb,uI),1.); }` },

  { id:'hue', name:'Arco-íris', group:'Cor', def:{i:.7}, sfx:null, glsl:`
vec3 hs(vec3 c,float h){ const vec3 k=vec3(.57735); float ca=cos(h); return c*ca+cross(k,c)*sin(h)+k*dot(k,c)*(1.-ca); }
vec4 f(vec2 uv){ vec4 c=A(uv); return vec4(hs(c.rgb,uT*3.*uI),1.); }` },

  { id:'halftone', name:'Retícula de pontos', group:'Estilo', def:{i:.7}, sfx:null, glsl:`
vec4 f(vec2 uv){ float n=mix(100.,40.,uI); vec2 g=vec2(n*asp(),n); vec2 cell=floor(uv*g); vec2 lc=fract(uv*g)-.5;
  vec4 c=A((cell+.5)/g); float l=luma(c.rgb); float r=sqrt(1.-l)*.62; float d=smoothstep(r,r-.08,length(lc));
  vec3 paper=vec3(.97,.95,.9); vec3 ink=c.rgb*.7; return vec4(mix(paper,ink,d),1.); }` },

  { id:'letterbox', name:'Cinema (faixas)', group:'Estilo', def:{i:.6}, sfx:null, glsl:`
vec4 f(vec2 uv){ float h=uI*.17*easeOut(clamp(uP*4.,0.,1.)); vec4 c=A(uv); return (uv.y<h||uv.y>1.-h)?vec4(0,0,0,1):c; }` },

  { id:'vignette', name:'Vinheta', group:'Estilo', def:{i:.6}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec4 c=A(uv); float d=length(toP(uv)); return vec4(c.rgb*(1.-smoothstep(.3,.95,d)*uI),1.); }` },

  { id:'blur', name:'Desfocar', group:'Estilo', def:{i:.6}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec4 acc=vec4(0); float r=uI*.02; float tot=0.; for(int x=-3;x<=3;x++)for(int y=-3;y<=3;y++){ float w=exp(-float(x*x+y*y)/8.); acc+=A(uv+vec2(x,y)*r/3.*vec2(1.,asp()))*w; tot+=w; } return acc/tot; }` },

  { id:'mirror', name:'Espelho', group:'Estilo', def:{i:1}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec2 q=uv; if(uv.x>.5) q.x=1.-uv.x; return A(q); }` },

  { id:'triptych', name:'Tríptico', group:'Estilo', def:{i:1}, sfx:null, glsl:`
vec4 f(vec2 uv){ float k=floor(uv.y*3.); float ly=fract(uv.y*3.); vec2 q=vec2(uv.x, .5+(ly-.5)/3.*1.); vec4 c=A(vec2(q.x,(ly-.5)*.6+.5));
  if(k==1.) c.rgb=vec3(luma(c.rgb)); float line=step(abs(ly-0.),.004)+step(1.-.004,ly); return vec4(mix(c.rgb,vec3(1),line),1.); }` },

  { id:'split2', name:'Tela dividida', group:'Estilo', def:{i:1}, sfx:null, glsl:`
vec4 f(vec2 uv){ float ly=fract(uv.y*2.); vec4 c=A(vec2(uv.x,(ly-.5)*.5+.5)); float line=smoothstep(.006,0.,abs(uv.y-.5)); return vec4(mix(c.rgb,vec3(1),line),1.); }` },

  { id:'splitElastic', name:'Tela dividida elástica', group:'Estilo', def:{i:1}, sfx:'whoosh', glsl:`
vec4 f(vec2 uv){ float div=.5+sin(uT*3.)*.08*uI*exp(-uP*1.5)+ (1.-easeOut(clamp(uP*3.,0.,1.)))*.5;
  float w=.006; vec4 c;
  if(uv.y>div){ float ly=(uv.y-div)/(1.-div); c=A(vec2(uv.x,(ly-.5)*(1.-div)+.5+.15)); }
  else { float ly=uv.y/div; c=A(vec2(1.-uv.x,(ly-.5)*div+.5-.15)); c.rgb=vec3(luma(c.rgb))*vec3(1.,.95,.9); }
  return vec4(mix(c.rgb,vec3(1),smoothstep(w,0.,abs(uv.y-div))),1.); }` },

  { id:'parallax', name:'Parallax (profundidade)', group:'Movimento', def:{i:.6}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec2 p=toP(uv); float r=length(p); float depth=1.-smoothstep(0.,.75,r);
  float z=1.+uI*.18*uP*(.3+.7*depth); vec2 pan=vec2(sin(uP*1.6)*.03*uI*(1.-depth),0.);
  return A(fromP(p/z)+pan); }` },

  { id:'echo', name:'Rastro', group:'Estilo', def:{i:.7}, sfx:null, usesPrev:true, glsl:`
vec4 f(vec2 uv){ vec4 c=A(uv); vec4 p=texture(uPrev,uv); return vec4(max(c.rgb,p.rgb*(.55+.4*uI)),1.); }` },

  { id:'kaleido', name:'Caleidoscópio', group:'Distorção', def:{i:1}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec2 p=toP(uv); float a=atan(p.y,p.x)+uT*.4; float r=length(p); float seg=PI/(2.+floor(uI*4.)); float ka=abs(mod(a,seg)-seg*.5);
  return A(fromP(vec2(cos(ka),sin(ka))*r)); }` },

  { id:'fisheye', name:'Olho de peixe', group:'Distorção', def:{i:.6}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec2 p=toP(uv); float r=length(p); float k=uI*.9; vec2 q=fromP(p*(1.-k*.3+k*.45*r*r)); vec4 c=Ak(q); return vec4(c.rgb*(1.-r*r*k*.3),1.); }` },

  { id:'shockwave', name:'Onda de choque', group:'Distorção', def:{i:.8}, sfx:'boom', glsl:`
vec4 f(vec2 uv){ vec2 p=toP(uv); float r=easeOut(clamp(uP*2.,0.,1.))*1.3; float d=length(p); float w=.1; float k=d-r; float disp=abs(k)<w?sin(k/w*PI)*.05*uI*(1.-uP):0.;
  vec4 c=A(fromP(p+normalize(p+.0001)*disp)); return vec4(c.rgb+smoothstep(w,0.,abs(k))*(1.-uP)*.35*uI,1.); }` },

  { id:'swirl', name:'Redemoinho', group:'Distorção', def:{i:.6}, sfx:null, glsl:`
vec4 f(vec2 uv){ vec2 p=toP(uv); float r=length(p); float a=uI*4.*(1.-smoothstep(0.,.9,r))*sin(uT*1.5); return A(fromP(rot(p,a))); }` },

  { id:'wave', name:'Ondas', group:'Distorção', def:{i:.5}, sfx:null, glsl:`
vec4 f(vec2 uv){ return A(uv+vec2(sin(uv.y*25.+uT*6.)*.012*uI, 0.)); }` },

  { id:'stutter', name:'Repetir (stutter)', group:'Tempo', def:{i:.5}, timeRemap:true, sfx:null, glsl:`vec4 f(vec2 uv){ return A(uv); }` },
  { id:'freeze', name:'Congelar', group:'Tempo', def:{i:1}, timeRemap:true, sfx:'camera', glsl:`
vec4 f(vec2 uv){ vec4 c=A(uv); float fl=pow(1.-clamp(uP*6.,0.,1.),2.)*.8; return vec4(mix(c.rgb,vec3(1),fl),1.); }` },
];

export const TRANS_BY_ID = Object.fromEntries(TRANSITIONS.map(t => [t.id, t]));
export const FX_BY_ID = Object.fromEntries(EFFECTS.map(e => [e.id, e]));

// Remapeamento de tempo (stutter / congelar): devolve o tempo local a usar
export function remapTime(fx, local, dur, intensity) {
  if (fx === 'freeze') return 0;
  if (fx === 'stutter') {
    const L = 0.06 + (1 - intensity) * 0.14;       // tamanho do pedaço repetido
    const reps = 3;
    const k = Math.floor(local / L);
    if (k < reps * 2) return (local % L) + Math.floor(k / reps) * L;
    return local - (reps - 1) * 2 * L;
  }
  return local;
}
