/* Ingestion IA « cache-first » (v8) : règles pures, testables sans réseau.
   - Un appel = un module (bp, an, cm). Aucun rafraîchissement global.
   - Un appel à l'API Anthropic n'est permis que sur action explicite (« recalc ») ou à l'initialisation d'un dossier (« init »).
   - Toute lecture passe d'abord par la base : si une extraction récente existe pour (module, sujet), elle est servie à 0 jeton. */
export type Module = 'bp' | 'an' | 'cm';
export type Trigger = 'recalc' | 'init';
export const MODULES: Module[] = ['bp', 'an', 'cm'];
export const TRIGGERS: Trigger[] = ['recalc', 'init'];
/** Durée de validité du cache par module (heures) : au-delà, la donnée reste lisible mais est signalée « à revalider ». */
export const TTL_H: Record<Module, number> = { bp: 24 * 30, an: 24 * 7, cm: 24 };

const n = { type: ['number', 'null'] } as const, ns = { type: 'array', items: { type: ['number', 'null'] } } as const, s = { type: ['string', 'null'] } as const;
const src = { type: 'array', items: { type: 'object', properties: { url: { type: 'string' }, quote: { type: 'string' } }, required: ['url', 'quote'] } } as const;
/** Schéma JSON strict par module : le modèle est contraint à répondre par cet outil (tool_choice forcé). */
export const SCHEMAS: Record<Module, { name: string; description: string; input_schema: Record<string, unknown> }> = {
  bp: { name: 'market_study', description: "Étude de marché : TAM, SAM, SOM, croissance et ratios sectoriels, uniquement s'ils figurent dans le texte fourni.",
    input_schema: { type: 'object', additionalProperties: false, properties: { currency: s, year: n, tam: n, sam: n, som: n, cagr_pct: n,
      sector: s, ev_ebitda: n, ebitda_margin_pct: n, net_margin_pct: n, confidence: { type: 'number' }, sources: src }, required: ['tam', 'sam', 'som', 'cagr_pct', 'confidence', 'sources'] } },
  an: { name: 'financial_statements', description: "États financiers publiés du titre (compte de résultat, bilan, flux), uniquement s'ils figurent dans le texte fourni.",
    input_schema: { type: 'object', additionalProperties: false, properties: { ticker: s, name: s, sector: s, currency: s, unit: s, fiscal_years: { type: 'array', items: { type: 'number' } },
      revenue: ns, ebitda: ns, ebitda_margin_pct: ns, net_income: ns, eps: ns, fcf: ns, net_debt: ns, equity: ns, roe_pct: ns, shares: n, price: n, price_date: s, confidence: { type: 'number' }, sources: src },
      required: ['fiscal_years', 'revenue', 'ebitda', 'net_income', 'confidence', 'sources'] } },
  cm: { name: 'price_series', description: "Séries de cours quotidiens (clôture) lues dans le tableau du texte fourni ; aucune valeur hors tableau.",
    input_schema: { type: 'object', additionalProperties: false, properties: { instrument: { type: 'string' }, rows: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, close: { type: 'number' } }, required: ['date', 'close'] } },
      confidence: { type: 'number' }, sources: src }, required: ['instrument', 'rows', 'confidence', 'sources'] } },
};
export interface IngestInput { module: string; subject: string; trigger: string; url?: string; urls?: string[]; force?: boolean }
/** Valide une demande d'ingestion. Lève une erreur lisible (code HTTP, message) si elle n'est pas autorisée. */
export function validateIngest(b: Partial<IngestInput>): { module: Module; subject: string; trigger: Trigger; url: string | null; urls: string[]; force: boolean } {
  const m = String(b.module ?? '');
  if (m === 'all' || m === '*' || m.includes(',')) throw Object.assign(new Error('Payload global interdit : un appel par module (bp, an ou cm)'), { code: 400 });
  if (!MODULES.includes(m as Module)) throw Object.assign(new Error('module attendu : bp, an ou cm'), { code: 400 });
  const t = String(b.trigger ?? '');
  if (!TRIGGERS.includes(t as Trigger)) throw Object.assign(new Error('Déclenchement explicite requis : trigger = recalc ou init (aucun appel automatique)'), { code: 400 });
  const subject = String(b.subject ?? '').trim().slice(0, 80);
  if (!subject) throw Object.assign(new Error('subject requis (dossier, ticker ou instrument)'), { code: 400 });
  /* Jusqu'à quatre pages lues pour une même extraction (cours, comptes, ratios, MarketScreener) */
  const urls = [...(b.url ? [String(b.url)] : []), ...(Array.isArray(b.urls) ? b.urls.map(String) : [])].slice(0, 4);
  if (urls.some(u => !/^https:\/\//.test(u))) throw Object.assign(new Error('url https requise'), { code: 400 });
  return { module: m as Module, subject, trigger: t as Trigger, url: urls[0] ?? null, urls, force: !!b.force };
}
export const cacheKey = (m: Module, subject: string) => `${m}:${subject.toUpperCase()}`;
/** Le cache est-il servable sans appel ? « init » ne rappelle jamais l'IA si une extraction existe déjà ; « recalc » rappelle si la donnée a dépassé sa durée de validité ou si force est demandé. */
export function cacheDecision(rec: { timestamp_retrieved: string } | null, m: Module, trigger: Trigger, force: boolean, now = Date.now()): { serve: boolean; stale: boolean; ageH: number | null } {
  if (!rec) return { serve: false, stale: true, ageH: null };
  const ageH = (now - Date.parse(rec.timestamp_retrieved)) / 36e5, stale = ageH > TTL_H[m];
  if (trigger === 'init') return { serve: true, stale, ageH };
  return { serve: !force && !stale, stale, ageH };
}
const HINT: Record<Module, string> = {
  an: "\nComptes : colonnes annuelles « FY » seulement (jamais TTM ni trimestres), du plus ancien au plus récent, cinq au plus ; montants en millions de la devise des comptes ; BPA dilué en unités ; dette nette = dette totale − trésorerie et placements ; EBITDA si la ligne existe, sinon null et marge d'EBITDA depuis les ratios ; ROE en % depuis les ratios ; nombre d'actions en millions ; cours et date depuis la page de cotation.",
  bp: '', cm: '' };
/** Corps de la requête Messages : réponse forcée par l'outil du module, donc JSON conforme au schéma. */
export function buildRequest(m: Module, model: string, subject: string, text: string, url: string | null) {
  const S = SCHEMAS[m];
  return { model, max_tokens: m === 'an' ? 1500 : 900, tools: [S], tool_choice: { type: 'tool', name: S.name },
    messages: [{ role: 'user', content: `Sujet : ${subject}${url ? `\nSource : ${url}` : ''}${HINT[m]}\nRègles : n'utilise que le texte ci-dessous ; une donnée absente vaut null ; chaque valeur doit pouvoir être citée (champ sources.quote, extrait exact de 120 caractères au plus) ; confidence entre 0 et 1.\n\n---\n${text.slice(0, 60000)}` }] };
}
/** Extrait l'entrée de l'outil (JSON strict) et le décompte de jetons de la réponse de l'API. */
export function parseResponse(j: { content?: Array<{ type: string; name?: string; input?: unknown }>; usage?: { input_tokens?: number; output_tokens?: number } }, m: Module) {
  const t = (j.content || []).find(c => c.type === 'tool_use' && c.name === SCHEMAS[m].name);
  if (!t || typeof t.input !== 'object' || t.input === null) throw Object.assign(new Error('Réponse IA non conforme au schéma'), { code: 502 });
  const p = t.input as Record<string, unknown>, req = (SCHEMAS[m].input_schema.required as string[]);
  const miss = req.filter(k => !(k in p)); if (miss.length) throw Object.assign(new Error('Champs manquants : ' + miss.join(', ')), { code: 502 });
  const conf = Math.max(0, Math.min(1, Number(p.confidence) || 0));
  return { payload: p, confidence: +conf.toFixed(2), tokens: { input: j.usage?.input_tokens ?? 0, output: j.usage?.output_tokens ?? 0 } };
}
/** Contrôle des extraits : la confiance est plafonnée à 0,3 si aucun extrait cité n'est retrouvé dans la page. */
export function verifyQuotes(payload: Record<string, unknown>, text: string, conf: number): { confidence: number; verified: number; total: number } {
  const norm = (x: string) => x.replace(/\s+/g, ' ').toLowerCase(), T = norm(text);
  const q = Array.isArray(payload.sources) ? (payload.sources as Array<{ quote?: string }>).map(x => String(x.quote || '')).filter(Boolean) : [];
  const ok = q.filter(x => T.includes(norm(x).slice(0, 60))).length;
  return { confidence: q.length && ok ? conf : Math.min(conf, 0.3), verified: ok, total: q.length };
}
/** Pages publiques lues pour une société (stockanalysis.com) : « EPA:RMS » ou « RMS.PA » → cotation européenne, « COST » → États-Unis. */
const EXCH: Record<string, string> = { PA: 'epa', AS: 'ams', DE: 'etr', MI: 'bit', MC: 'bme', L: 'lon', SW: 'swx', BR: 'ebr', LS: 'elisbon' };
export function companyPages(ticker: string): { path: string; urls: string[] } {
  const t = ticker.trim().toUpperCase(); let path: string;
  const m1 = t.match(/^([A-Z]{2,8}):([A-Z0-9.\-]{1,12})$/), m2 = t.match(/^([A-Z0-9\-]{1,12})\.([A-Z]{1,2})$/);
  if (m1) path = `quote/${m1[1].toLowerCase()}/${m1[2]}`; else if (m2 && EXCH[m2[2]]) path = `quote/${EXCH[m2[2]]}/${m2[1]}`; else path = `stocks/${t.toLowerCase()}`;
  const b = `https://stockanalysis.com/${path}/`;
  return { path, urls: [b, b + 'financials/', b + 'financials/ratios/'] };
}
