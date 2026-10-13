// Roda a legenda automática de verdade (baixa o modelo) e publica o resultado como anotações do GitHub
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', m => console.log('console:', m.type(), m.text().slice(0, 300)));
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto('http://localhost:8080/test/asr.html');
await page.waitForFunction('window.READY');
let ok = true;
for (const model of ['rapida', 'precisa']) {
  try {
    const r = await page.evaluate(m => window.run(m), model);
    const text = r.words.map(w => `${w.w}@${w.s.toFixed(1)}`).join(' ');
    console.log(JSON.stringify(r));
    console.log(`::notice title=Legenda ${model}::${r.secs.toFixed(1)} s para ${r.audio.toFixed(1)} s de audio; isolado=${r.isolated}; baixou ${r.dlMB.toFixed(0)} MB; etapas=${r.stages.join(',')}; ${r.words.length} palavras: ${text.slice(0, 900)}`);
    if (!r.words.length) ok = false;
  } catch (e) {
    ok = false;
    console.log(`::error title=Legenda ${model}::${String(e.message || e).slice(0, 500)}`);
  }
}
await browser.close();
process.exit(ok ? 0 : 1);
