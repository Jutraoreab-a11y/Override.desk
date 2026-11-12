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
await step('création par lecture IA (navigateur et Claude simulés)', () => p.evaluate(async () => {
  const pages = { 'https://stockanalysis.com/quote/epa/RMS/': 'Hermes International (EPA:RMS) 2,104.00 EUR Nov 11, 2026 Shares Out 104.7M ' + 'Market data. '.repeat(60),
    'https://stockanalysis.com/quote/epa/RMS/financials/': 'Financials in millions EUR FY 2025 FY 2024 FY 2023 FY 2022 FY 2021 Revenue 16,002 15,170 13,427 11,602 8,982 Net Income 4,524 4,603 4,311 3,367 2,445',
    'https://stockanalysis.com/quote/epa/RMS/financials/ratios/': 'ROE 28.1% EBITDA margin 47.9%' };
  AI.mcp = {}; AI.sample = { json: async () => ({ name: 'Hermès', sector: 'Luxe', currency: 'EUR', fiscal_years: [2021, 2022, 2023, 2024, 2025], revenue: [8982, 11602, 13427, 15170, 16002],
    ebitda: [null, null, null, null, null], ebitda_margin_pct: [45, 46, 47, 47.5, 47.9], net_income: [2445, 3367, 4311, 4603, 4524], eps: [23.3, 32.09, 41.12, 43.87, 43.07],
    fcf: [3002, 3770, 3750, 4072, 4666], net_debt: [-9000, -9500, -10000, -11000, -12000], roe_pct: [25, 27, 28, 28.5, 28.1], shares: 104.7, price: 2104, price_date: '2026-11-11' }) };
  aiPage = async u => pages[u] || 'page not found';
  await uxCreate('RMS.PA'); const a = S.an.assets[ui.tk];
  if (a.rev[4] !== 16002 || a.ni[0] !== 2445 || a.price !== 2104 || Math.round(a.ebitda[4]) !== 7665) throw new Error('comptes mal appliqués ' + JSON.stringify([a.rev, a.ebitda, a.price]));
  AI.sample = { json: async () => ({ fiscal_years: [2025], revenue: [99999], net_income: [11111] }) };   // montants absents des pages : doit être rejeté
  const before = Object.keys(S.an.assets).length; await uxCreate('EPA:XYZ'); const z = S.an.assets[ui.tk];
  if (z.rev.some(v => v)) throw new Error('extraction non vérifiée acceptée');
}));
await b.close();
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log('Test de bout en bout : aucune erreur');
