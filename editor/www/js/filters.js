// Filtros prontos (looks de cor) feitos com o ajuste de cor do clipe.
export const FILTERS = [
  { id: 'natural', name: 'Original', adj: {} },
  { id: 'vivo', name: 'Vivo', adj: { sat: .35, con: .15 } },
  { id: 'quente', name: 'Quente', adj: { temp: .5, sat: .1 } },
  { id: 'frio', name: 'Frio', adj: { temp: -.5, con: .08 } },
  { id: 'verao', name: 'Verão', adj: { bri: .08, sat: .4, temp: .3 } },
  { id: 'por', name: 'Pôr do sol', adj: { temp: .7, tint: .2, sat: .2, vig: .25 } },
  { id: 'cinema', name: 'Cinema', adj: { con: .22, sat: -.15, temp: -.15, tint: .1, vig: .4 } },
  { id: 'drama', name: 'Dramático', adj: { con: .5, sat: -.2, vig: .6, sharp: .3, shadow: -.2 } },
  { id: 'retro', name: 'Retrô', adj: { sat: -.3, temp: .35, con: -.1, shadow: .25, vig: .3 } },
  { id: 'desbotado', name: 'Desbotado', adj: { con: -.3, shadow: .4, sat: -.3 } },
  { id: 'pastel', name: 'Pastel', adj: { bri: .1, con: -.25, sat: -.2, tint: .2 } },
  { id: 'rosa', name: 'Rosado', adj: { tint: .5, temp: .1, bri: .04 } },
  { id: 'esmeralda', name: 'Esmeralda', adj: { tint: -.5, temp: -.2, con: .1 } },
  { id: 'noite', name: 'Noite', adj: { bri: -.15, temp: -.6, con: .2, vig: .35 } },
  { id: 'inverno', name: 'Inverno', adj: { temp: -.35, sat: -.3, bri: .05 } },
  { id: 'brilho', name: 'Luminoso', adj: { bri: .15, shadow: .3, sat: .1 } },
  { id: 'nitido', name: 'Nítido', adj: { sharp: .6, con: .1 } },
  { id: 'pb', name: 'Preto e branco', adj: { sat: -1, con: .2 } },
  { id: 'pbforte', name: 'P&B forte', adj: { sat: -1, con: .5, vig: .4 } },
  { id: 'sepia', name: 'Sépia', adj: { sat: -1, temp: .6, con: .05 } },
  { id: 'noticia', name: 'Jornal', adj: { con: .15, sat: -.1, sharp: .4 } },
  { id: 'comida', name: 'Comida', adj: { sat: .3, temp: .25, sharp: .3, bri: .05 } },
  { id: 'pele', name: 'Pele suave', adj: { bri: .06, con: -.08, tint: .1, temp: .12, sharp: -0 } },
  { id: 'neon', name: 'Neon', adj: { sat: .6, con: .3, tint: .35, temp: -.25 } },
];
export function filterAdj(f, k = 1) {
  const o = {};
  for (const [key, v] of Object.entries(f.adj)) o[key] = v * k;
  return o;
}
