const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const root = process.cwd();
const proto = 'uniion App v3.dc.html';
const support = path.join(root, 'support.js');
const out = path.join(root, 'output', 'captures-usages');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ttf': 'font/ttf' };
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const cases = [
  { name: '01-dossier', route: 'dossier', state: { dossierId: 'pap' } },
  { name: '02-reunions', route: 'reunions', state: {} },
  { name: '03-reunion-detail', route: 'reunion', state: { reunionId: 'r-0826' } },
  { name: '04-communication', route: 'communication', state: { comTab: 'plan' } },
  { name: '05-consultation', route: 'newpoll', state: {} },
  { name: '06-contacts', route: 'contacts', state: { ctCat: 'all', ctQ: '' } }
];
(async () => {
  for (const file of [path.join(root, proto), support]) if (!fs.existsSync(file)) throw new Error('Fichier absent : ' + file);
  fs.mkdirSync(out, { recursive: true });
  const report = { source: proto, sourceSHA256: sha(path.join(root, proto)), supportSHA256: sha(support), mode: 'Prototype original exécuté ; React et ReactDOM fournis localement pour le rendu ; aucun écran reconstruit.', screenshots: [], errors: [], missingLocalResources: [], blockedRequests: [] };
  const react = fs.readFileSync(path.join(path.dirname(require.resolve('react/package.json')), 'umd', 'react.production.min.js'), 'utf8');
  const reactDOM = fs.readFileSync(path.join(path.dirname(require.resolve('react-dom/package.json')), 'umd', 'react-dom.production.min.js'), 'utf8');
  const runtime = fs.readFileSync(support, 'utf8');
  const server = http.createServer((req, res) => {
    let filename;
    try { filename = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
    catch { res.writeHead(400); res.end(); return; }
    if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(filename).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() !== 'GET') { report.blockedRequests.push({ url: url.origin + url.pathname, method: request.method() }); return route.abort(); }
      if (url.origin === origin && url.pathname === '/support.js') return route.fulfill({ contentType: 'text/javascript; charset=utf-8', body: react + '\n' + reactDOM + '\n' + runtime });
      if (url.origin === origin || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
      report.blockedRequests.push({ url: url.origin + url.pathname, method: 'GET' });
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(String(e)));
    page.on('response', res => { if (res.url().startsWith(origin) && res.status() >= 400) report.missingLocalResources.push({ url: res.url().slice(origin.length), status: res.status() }); });
    await page.goto(origin + '/' + encodeURIComponent(proto), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(() => window.__proto && typeof window.__proto.setState === 'function', null, { timeout: 45000 });
    for (const spec of cases) {
      await page.evaluate(s => { window.__proto.setState({ authed: true, adminAuthed: false, route: s.route, asstFull: false, uniiOpen: false, ...s.state }); }, spec);
      await page.waitForFunction(route => window.__proto.state.route === route && window.__proto.state.authed, spec.route);
      await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
      await page.waitForTimeout(600);
      if (await page.locator('.sc-logic-error:visible').count()) throw new Error('Erreur de rendu du prototype : ' + spec.route);
      const main = page.locator('main:visible').last();
      await main.waitFor({ state: 'visible', timeout: 10000 });
      if ((await main.innerText()).trim().length < 100) throw new Error('Module vide ou incomplet : ' + spec.route);
      await main.evaluate(el => { el.scrollTop = 0; });
      const bounds = await main.boundingBox();
      const clip = { x: Math.max(0, bounds.x), y: Math.max(0, bounds.y), width: Math.min(bounds.width, 1440 - Math.max(0, bounds.x)), height: Math.min(bounds.height, 1000 - Math.max(0, bounds.y)) };
      if (clip.width < 300 || clip.height < 200) throw new Error('Zone de capture invalide : ' + spec.route);
      const target = path.join(out, spec.name + '.png');
      await page.screenshot({ path: target, clip, animations: 'disabled' });
      report.screenshots.push({ file: spec.name + '.png', route: spec.route, state: spec.state, clip, screenshotSHA256: sha(target), note: 'Capture recadrée du module original ; données fictives du prototype. Aucune requête IA ni aucun envoi de formulaire.' });
    }
    report.status = 'captured';
    const figures = report.screenshots.map(s => '<figure><img src="' + s.file + '" alt="Capture du module ' + s.route + '"><figcaption>' + s.route + ' — données fictives du prototype</figcaption></figure>').join('');
    fs.writeFileSync(path.join(out, 'galerie.html'), '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Captures originales Uniion</title><style>body{margin:30px;font:16px/1.6 system-ui;background:#f8f8fa;color:#2c2c34}figure{margin:30px 0}img{display:block;max-width:100%;height:auto}figcaption{font-size:13px;color:#686871}</style><h1>Captures du prototype original</h1><p>Données fictives. Pas de garantie commerciale ou juridique déduite des mentions du prototype. Captures sans iframe ni fenêtre de navigateur ajoutée.</p>' + figures + '</html>');
    if (report.errors.length) throw new Error('Captures produites mais erreurs JavaScript détectées : consulter rapport.json avant toute utilisation.');
  } catch (e) {
    report.status = 'failed';
    report.failure = String(e);
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(out, 'rapport.json'), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})();
