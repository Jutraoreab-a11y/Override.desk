/* POST /api/v1/ai/market-parser {url, metric, question}
   Le serveur lit la page source, Claude en extrait la donnée, l'extrait cité est vérifié dans la page,
   puis la mesure est stockée avec source_url, source_name, timestamp_retrieved et confidence_score. */
import { handler, body, send, HttpError, num, type Req, type Res } from '../../../lib/http.ts';
import { db, check, requireUser } from '../../../lib/supabase.ts';
import type { AiSourceRecord } from '../../../types/models.ts';
import { q } from '../../../lib/http.ts';
import { ingestRoute } from '../../../lib/ai-ingest-route.ts';

export { htmlToText } from '../../../lib/html.ts';
import { htmlToText } from '../../../lib/html.ts';
const norm = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
/** Score de confiance : confiance déclarée par le modèle, plafonnée selon la vérification de l'extrait et de la valeur dans la page. */
export function confidence(modelConf: number, quoteFound: boolean, valueInQuote: boolean): number {
  const c = Math.max(0, Math.min(1, modelConf));
  return +(quoteFound ? (valueInQuote ? c : Math.min(c, 0.6)) : Math.min(c, 0.2)).toFixed(2);
}
export default handler(async (req: Req, res: Res) => {
  /* /api/v1/ai/ingest est réécrit vers cette fonction avec op=ingest */
  if (q(req, 'op') === 'ingest') return ingestRoute(req, res);
  const uid = await requireUser(req);
  const b = body<{ url: string; metric: string; question: string }>(req);
  if (!/^https:\/\//.test(b.url ?? '') || !b.metric || !b.question) throw new HttpError(400, 'url (https), metric et question requis');
  const key = process.env.ANTHROPIC_API_KEY; if (!key) throw new HttpError(503, 'ANTHROPIC_API_KEY non configurée (mode simulation)');
  const page = await fetch(b.url, { headers: { 'User-Agent': 'OVERRIDE.DESK market-parser' } });
  if (!page.ok) throw new HttpError(502, `Source HTTP ${page.status}`);
  const text = htmlToText(await page.text()).slice(0, 60000);
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 600, messages: [{ role: 'user', content:
      `Texte d'une page web (source : ${b.url}).\nQuestion : ${b.question}\nRéponds uniquement en JSON : {"value": nombre ou null, "text": chaîne ou null, "quote": "extrait exact de la page (80 caractères max) contenant la réponse", "source_name": "nom de l'éditeur de la page", "confidence": nombre entre 0 et 1}. N'invente rien : si la réponse n'est pas dans le texte, value et text valent null et confidence 0.\n\nTEXTE :\n${text}` }] }) });
  if (!r.ok) throw new HttpError(502, `API Claude HTTP ${r.status}`);
  const j = await r.json() as { content: Array<{ type: string; text?: string }> };
  const raw = j.content.filter(c => c.type === 'text').map(c => c.text).join('');
  const m = raw.match(/\{[\s\S]*\}/); if (!m) throw new HttpError(502, 'Réponse IA illisible');
  const o = JSON.parse(m[0]) as { value: unknown; text: string | null; quote: string; source_name: string; confidence: number };
  const quote = String(o.quote || ''), found = !!quote && norm(text).includes(norm(quote).slice(0, 60));
  const v = num(o.value), vIn = v != null && [String(v), String(v).replace('.', ','), v.toLocaleString('fr-FR')].some(s => quote.includes(s));
  const rec: AiSourceRecord = { metric: b.metric, value_numeric: v, value_text: o.text ?? null, source_url: b.url, source_name: o.source_name || new URL(b.url).hostname,
    quote: quote || null, timestamp_retrieved: new Date().toISOString(), confidence_score: confidence(Number(o.confidence) || 0, found, vIn), model };
  if (v == null && !o.text) throw new HttpError(422, 'Donnée absente de la page');
  check(await db().from('ai_sources').insert({ ...rec, user_id: uid }));
  send(res, 200, { ok: true, record: rec, verified: found });
});
