// Automatischer Rundgang durch alle Funktionen (Desktop, Tablet, Handy). Braucht Playwright + Chromium.
// Aufruf: erst `npm run build && npm run preview`, dann in einem zweiten Terminal `npm run rundgang`.
const { chromium } = require('playwright');
const S = __dirname + '/bilder/'; require('fs').mkdirSync(S, { recursive: true });
const U = '' + (process.env.MEDATLAS_URL || 'http://localhost:4173/') + '#';
const A = '/n/grundlagen/anatomie/untere-extremitaet';
const ok = (name, bed, info = '') => console.log((bed ? 'OK   ' : 'FAIL ') + name + (info ? ' → ' + info : ''));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const fehler = [];
  const neu = async (viewport, extra = {}) => {
    const ctx = await b.newContext({ viewport, serviceWorkers: 'block', ...extra });
    const p = await ctx.newPage();
    p.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
    p.on('pageerror', (e) => fehler.push('PAGEERROR ' + e.message));
    await p.goto(U + '/'); await p.getByRole('button', { name: 'Verstanden' }).click();
    return p;
  };
  // ---------- Desktop ----------
  let p = await neu({ width: 1366, height: 860 });
  // 3D: Struktur anklicken
  await p.goto(U + A + '/bein-szene'); await p.waitForSelector('canvas[data-bereit]'); await p.waitForTimeout(2500);
  let pt = await p.evaluate(() => window.__medatlasPunkt('FJ1434'));
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(1500);
  ok('3D-Klick zeigt Infokarte', await p.getByTestId('infokarte').isVisible(), await p.getByTestId('struktur-lat').textContent() + ' / ' + await p.getByTestId('struktur-de').textContent());
  await p.screenshot({ path: S + '20-3d-auswahl.png' });
  await p.getByRole('button', { name: 'Freistellen' }).click(); await p.waitForTimeout(800); await p.screenshot({ path: S + '21-3d-frei.png' });
  await p.getByRole('button', { name: 'Auswahl aufheben' }).click();
  // Schichten: Muskeln aus → Femur anklickbar
  await p.getByRole('button', { name: /Muskeln: sichtbar/ }).click(); await p.getByRole('button', { name: /Muskeln: durchsichtig/ }).click();
  await p.getByRole('button', { name: 'Hinten' }).click(); await p.waitForTimeout(3500);
  pt = await p.evaluate(() => window.__medatlasPunkt('FJ3365'));
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(1200);
  ok('Muskeln aus → Knochen anklickbar', (await p.getByTestId('struktur-lat').textContent()) === 'Femur', await p.getByTestId('struktur-lat').textContent());
  await p.screenshot({ path: S + '22-3d-knochen-nerven.png' });
  // Drehen / Zoomen
  const vor = await p.evaluate(() => JSON.stringify(window.__medatlasPunkt('FJ3381')));
  await p.mouse.move(800, 450); await p.mouse.down(); await p.mouse.move(950, 470, { steps: 8 }); await p.mouse.up(); await p.mouse.wheel(0, -400); await p.waitForTimeout(800);
  ok('Drehen/Zoomen bewegt die Kamera', vor !== await p.evaluate(() => JSON.stringify(window.__medatlasPunkt('FJ3381'))));
  // Ganzkörper-Atlas: Skelett in Silhouette, Schichten einzeln laden, großes Infofenster
  await p.goto(U + '/n/grundlagen/anatomie/ganzkoerper-szene'); await p.waitForSelector('canvas[data-bereit]', { timeout: 120000 }); await p.waitForTimeout(3000);
  ok('Ganzkörper: Skelett + Haut geladen', Number(await p.locator('canvas').getAttribute('data-bereit')) > 300, await p.locator('canvas').getAttribute('data-bereit') + ' Netze');
  await p.screenshot({ path: S + '10-koerper-skelett.png' });
  await p.getByRole('button', { name: 'Nur Arterien zeigen' }).click(); await p.waitForTimeout(300); await p.waitForSelector('canvas[data-bereit]', { timeout: 120000 }); await p.waitForTimeout(3000);
  await p.screenshot({ path: S + '11-koerper-arterien.png' });
  await p.getByRole('button', { name: 'Nur Skelett zeigen' }).click(); await p.waitForTimeout(2500);
  pt = await p.evaluate(() => window.__medatlasPunkt('FJ3259')); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(3000);
  ok('Ganzkörper: Klick öffnet Infofenster mit Steckbrief', (await p.getByTestId('struktur-lat').textContent()) === 'Femur' && (await p.getByTestId('infokarte').textContent()).includes('Steckbrief'), await p.getByTestId('struktur-lat').textContent());
  await p.screenshot({ path: S + '12-koerper-femur.png' });
  await p.getByRole('button', { name: 'Alles zeigen' }).click(); await p.getByRole('button', { name: 'Auswahl aufheben' }).click(); await p.waitForTimeout(300); await p.waitForSelector('canvas[data-bereit]', { timeout: 180000 }); await p.waitForTimeout(8000);
  ok('Ganzkörper: alle Schichten geladen', Number(await p.locator('canvas').getAttribute('data-bereit')) === 2234, await p.locator('canvas').getAttribute('data-bereit') + ' Netze');
  await p.screenshot({ path: S + '13-koerper-alles.png', timeout: 120000 });
  // Lerneinheit → 3D
  await p.goto(U + A + '/oberschenkel/muskeln/m-quadriceps-femoris'); await p.getByRole('link', { name: '3D: Rechtes Bein' }).click();
  await p.waitForSelector('canvas[data-bereit]'); await p.waitForTimeout(2500);
  ok('Einheit → 3D markiert 4 Köpfe', (await p.getByTestId('infokarte').locator('.grid button').count()) === 4); await p.screenshot({ path: S + '23-3d-quadriceps.png' });
  // Begriff-Tooltip, gelernt markieren, Fortschritt im Ordner
  await p.goto(U + A + '/oberschenkel/muskeln/m-quadriceps-femoris');
  await p.locator('.begriff').first().hover(); ok('Begriff-Erklärung', await p.getByRole('tooltip').isVisible(), (await p.getByRole('tooltip').textContent()));
  await p.getByRole('button', { name: 'Als gelernt markieren' }).click();
  await p.goto(U + A + '/oberschenkel/muskeln'); ok('Ordner-Fortschritt', (await p.getByTestId('ordner-fortschritt').textContent()).includes('1 von 4'), await p.getByTestId('ordner-fortschritt').textContent());
  // Querverweis
  await p.goto(U + A + '/oberschenkel/muskeln/m-quadriceps-femoris'); await p.locator('.prosa a', { hasText: 'Kniescheibe' }).first().click(); await p.waitForTimeout(400);
  ok('Querverweis im Text', p.url().endsWith('/knie/patella'), p.url());
  // Suche
  await p.keyboard.press('Control+k'); await p.keyboard.type('quadrizeps'); await p.waitForTimeout(300);
  ok('Suche mit Tippfehler', (await p.getByTestId('suchtreffer').locator('li').first().textContent()).includes('quadriceps')); await p.screenshot({ path: S + '24-suche.png' });
  await p.keyboard.press('Escape'); await p.keyboard.press('Control+k'); await p.keyboard.type('Kniescheibe'); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  ok('Suche öffnet Treffer', p.url().includes('patella') || p.url().includes('s=FJ3381'), p.url());
  // Mindmap-Klick
  await p.goto(U + A + '/untere-extremitaet-mindmap'); await p.locator('.react-flow__node', { hasText: 'M. sartorius' }).waitFor(); await p.waitForTimeout(2500); { const bb = await p.locator('.react-flow__node', { hasText: 'M. sartorius' }).boundingBox(); await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); } await p.waitForTimeout(600);
  ok('Mindmap-Knoten öffnet Einheit', p.url().endsWith('m-sartorius'), p.url());
  // Leitfaden
  await p.goto(U + '/n/klinik/notfallmedizin/leitfaeden/abcde-schema-leitfaden'); await p.waitForTimeout(1500); await p.screenshot({ path: S + '25-leitfaden.png' });
  { const bb = await p.locator('.react-flow__node', { hasText: 'Airway – Atemweg' }).boundingBox(); await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); } await p.waitForTimeout(400); ok('Leitfaden-Details', await p.getByTestId('leitfaden-details').isVisible());
  await p.getByRole('button', { name: 'Schritt für Schritt' }).click(); await p.waitForTimeout(400); await p.screenshot({ path: S + '26-leitfaden-liste.png' });
  // Karteikarten
  await p.goto(U + A + '/untere-extremitaet-karten');
  for (const note of ['Gut', 'Leicht', 'Nochmal', 'Gut']) { await p.getByRole('button', { name: 'Antwort zeigen' }).click(); if (note === 'Gut') await p.screenshot({ path: S + '27-karte.png' }); await p.getByRole('button', { name: new RegExp('^' + note) }).click(); await p.waitForTimeout(350); }
  ok('Karten bewertet', true, await p.getByTestId('kartenstatus').textContent());
  await p.goto(U + '/'); ok('Tagesziel zählt', (await p.getByTestId('tagesziel').textContent()).startsWith('4'), await p.getByTestId('tagesziel').textContent());
  await p.reload(); ok('Fortschritt bleibt nach Neuladen', (await p.getByTestId('tagesziel').textContent()).startsWith('4'));
  // Quiz MC
  await p.goto(U + A + '/untere-extremitaet-quiz'); await p.getByRole('button', { name: /Multiple Choice/ }).click();
  for (let i = 0; i < 10; i++) { await p.locator('button[data-richtig]').click(); if (i === 0) await p.screenshot({ path: S + '28-quiz.png' }); await p.getByRole('button', { name: /Weiter|Ergebnis/ }).click(); }
  ok('Quiz MC 10/10', (await p.getByTestId('quiz-ergebnis').textContent()).includes('10 / 10'));
  // Quiz 3D
  await p.getByRole('button', { name: 'Andere Quizart' }).click(); await p.getByRole('button', { name: /Struktur benennen/ }).click();
  await p.waitForSelector('canvas[data-bereit]'); await p.waitForTimeout(3000); await p.screenshot({ path: S + '29-quiz3d.png' });
  for (let i = 0; i < 8; i++) { await p.locator('button[data-richtig]').click(); await p.getByRole('button', { name: /Weiter|Ergebnis/ }).click(); await p.waitForTimeout(200); }
  ok('Quiz 3D 8/8', (await p.getByTestId('quiz-ergebnis').textContent()).includes('8 / 8'));
  // Trainer
  await p.goto(U + '/n/grundlagen/terminologie/terminologie-trainer');
  for (let i = 0; i < 3; i++) { await p.locator('button[data-richtig]').click(); await p.getByRole('button', { name: 'Nächster Begriff' }).click(); }
  ok('Trainer-Serie', (await p.getByTestId('trainer-serie').textContent()).includes('3'));
  // Dark Mode
  await p.getByRole('button', { name: 'Dunkler Modus' }).click(); await p.goto(U + '/'); await p.waitForTimeout(400); await p.screenshot({ path: S + '30-dunkel-start.png' });
  await p.goto(U + '/fortschritt'); await p.waitForTimeout(400); await p.screenshot({ path: S + '31-dunkel-fortschritt.png', fullPage: false });
  await p.goto(U + '/pruefen'); await p.waitForTimeout(300); await p.screenshot({ path: S + '32-pruefen.png' });
  await p.goto(U + '/quellen'); await p.waitForTimeout(300); await p.screenshot({ path: S + '33-quellen.png' });

  // ---------- Tablet (iPad hochkant) ----------
  p = await neu({ width: 820, height: 1180 }, { hasTouch: true, deviceScaleFactor: 2 });
  await p.goto(U + '/'); await p.waitForTimeout(400); await p.screenshot({ path: S + '40-tablet-start.png' });
  await p.getByRole('button', { name: 'Menü öffnen' }).click(); await p.waitForTimeout(500); await p.screenshot({ path: S + '41-tablet-menue.png' });
  await p.goto(U + A + '/bein-szene'); await p.waitForSelector('canvas[data-bereit]'); await p.waitForTimeout(2500);
  pt = await p.evaluate(() => window.__medatlasPunkt('FJ3381')); await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(1500);
  ok('Tablet: Tippen wählt Struktur', await p.getByTestId('infokarte').isVisible(), await p.getByTestId('struktur-lat').textContent()); await p.screenshot({ path: S + '42-tablet-3d.png' });
  // ---------- Handy ----------
  p = await neu({ width: 390, height: 844 }, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await p.goto(U + '/'); await p.waitForTimeout(400); await p.screenshot({ path: S + '50-handy-start.png' });
  await p.goto(U + A + '/knie/articulatio-genus'); await p.waitForTimeout(400); await p.screenshot({ path: S + '51-handy-einheit.png' });
  ok('Handy: kein Querscrollen', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await p.goto(U + A + '/bein-szene'); await p.waitForSelector('canvas[data-bereit]'); await p.waitForTimeout(2500);
  pt = await p.evaluate(() => window.__medatlasPunkt('FJ3387')); await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(1500); await p.screenshot({ path: S + '52-handy-3d.png' });
  ok('Handy: Tippen wählt Struktur', await p.getByTestId('infokarte').isVisible(), await p.getByTestId('struktur-lat').textContent());
  await p.goto(U + '/n/klinik/notfallmedizin/leitfaeden/abcde-schema-leitfaden'); await p.waitForTimeout(1500); await p.screenshot({ path: S + '53-handy-leitfaden.png' });
  await p.goto(U + A + '/untere-extremitaet-mindmap'); await p.waitForTimeout(1500); await p.screenshot({ path: S + '54-handy-mindmap.png' });
  await p.goto(U + A + '/untere-extremitaet-karten'); await p.getByRole('button', { name: 'Antwort zeigen' }).click(); await p.waitForTimeout(400); await p.screenshot({ path: S + '55-handy-karte.png' });
  console.log('KONSOLENFEHLER:', JSON.stringify(fehler, null, 1));
  await b.close();
})().catch((e) => { console.error('ABBRUCH', e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
