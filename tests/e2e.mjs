/* Test de bout en bout : charge index.html, parcourt les volets et les fonctions clés, échoue sur toute erreur JavaScript.
   Aucun appel réseau sortant (les CDN sont servis localement ou neutralisés). */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lw = path.join(root, 'node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.js');
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1440, height: 900 } }), errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue();
  if (/lightweight-charts/.test(u) && fs.existsSync(lw)) return r.fulfill({ path: lw, contentType: 'application/javascript' }); return r.fulfill({ status: 200, body: '' }); });
await p.goto('file://' + path.join(root, 'index.html')); await p.waitForTimeout(1000);
const step = async (name, fn) => { try { await fn(); console.log('ok   ' + name); } catch (e) { errs.push(name + ' : ' + e.message); console.log('FAIL ' + name); } };
for (const t of ['bp', 'an', 'sc', 'lbo', 'pf', 'cm', 'pc', 'jr']) await step('volet ' + t, () => p.evaluate(t => { ui.tab = t; renderAll(); }, t));
for (const a of ['brent', 'gold', 'silver']) await step('commodities ' + a, () => p.evaluate(a => { ui.tab = 'cm'; ui.cmA = a; ui.cmOv = { cpi: true, ff: true, wasde: true, gsb: true }; renderAll(); }, a));
await step('mapping multi-actifs', async () => { await p.evaluate(() => { ui.tab = 'an'; renderAll(); }); await p.click('[data-act=anmopen]');
  for (const c of ['stk', 'etf', 'cry', 'cmd']) await p.evaluate(c => { S.mm.cls = c; renderAnMap(); if (!document.querySelectorAll('#anmap svg.mm .pt').length) throw new Error('quadrant vide ' + c); }, c); });
await step('clic ETF vers analyse', async () => { await p.evaluate(() => { S.mm.cls = 'etf'; renderAnMap(); }); await p.click('#anmap svg.mm .pt[data-id="SPY"]');
  if (await p.evaluate(() => document.querySelector('#p-an .sh-t')?.textContent) !== 'SPY') throw new Error('slide ETF absente'); });
await step('recherche universelle', async () => { await p.keyboard.press('Control+k'); await p.keyboard.type('bitc'); await p.keyboard.press('Enter');
  if (await p.evaluate(() => ui.anX && ui.anX.id) !== 'BTC') throw new Error('BTC non ouvert'); });
await step('mode simple et alertes', () => p.evaluate(() => { document.getElementById('uxMode').click(); document.getElementById('uxBell').click(); if (!document.getElementById('uxal') || document.getElementById('uxal').hidden) throw new Error('panneau alertes'); }));
await b.close();
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log('Test de bout en bout : aucune erreur');
