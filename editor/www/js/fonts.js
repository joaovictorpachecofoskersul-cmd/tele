// Fontes embutidas no app (funcionam sem internet)
const LIST = [
  ['Poppins', 'poppins-latin-400-normal', '400'],
  ['Poppins', 'poppins-latin-600-normal', '600'],
  ['Poppins', 'poppins-latin-700-normal', '700'],
  ['Poppins', 'poppins-latin-ext-700-normal', '700'],
  ['Poppins', 'poppins-latin-800-normal', '800'],
  ['Poppins', 'poppins-latin-900-normal', '900'],
  ['Poppins', 'poppins-latin-ext-900-normal', '900'],
  ['Anton', 'anton-latin-400-normal', '400'],
  ['Bebas Neue', 'bebas-neue-latin-400-normal', '400'],
  ['Permanent Marker', 'permanent-marker-latin-400-normal', '400'],
  ['Montserrat', 'montserrat-latin-900-normal', '900'],
  ['Courier Prime', 'courier-prime-latin-700-normal', '700'],
];

export const FONT_CHOICES = [
  { id: 'Poppins', name: 'Poppins', weight: 900 },
  { id: 'Anton', name: 'Anton', weight: 400 },
  { id: 'Bebas Neue', name: 'Bebas', weight: 400 },
  { id: 'Montserrat', name: 'Montserrat', weight: 900 },
  { id: 'Permanent Marker', name: 'Pincel', weight: 400 },
  { id: 'Courier Prime', name: 'Máquina', weight: 700 },
];

export function fontWeight(family, want) {
  const f = FONT_CHOICES.find(x => x.id === family);
  if (family === 'Poppins') return want || 900;
  return f ? f.weight : 400;
}

export function cssFont(family, px, weight) {
  return `${fontWeight(family, weight)} ${Math.round(px)}px "${family}", "Poppins", sans-serif`;
}

let ready = null;
export function loadFonts(base = 'fonts/') {
  if (ready) return ready;
  ready = Promise.all(LIST.map(([fam, file, w]) => {
    const ff = new FontFace(fam, `url(${base}${file}.woff2)`, { weight: w });
    return ff.load().then(f => document.fonts.add(f)).catch(() => null);
  }));
  return ready;
}
