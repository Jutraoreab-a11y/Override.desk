/* Aides HTTP pour les fonctions Vercel (Node). Types minimaux pour ne pas dépendre de @vercel/node. */
export interface Req { method?: string; headers: Record<string, string | string[] | undefined>; query: Record<string, string | string[] | undefined>; body?: unknown; }
export interface Res { status(code: number): Res; setHeader(name: string, value: string): void; json(body: unknown): void; end(body?: string): void; }

export function header(req: Req, name: string): string { const v = req.headers[name.toLowerCase()]; return Array.isArray(v) ? v[0] : (v ?? ''); }
export function q(req: Req, name: string): string { const v = req.query[name]; return Array.isArray(v) ? v[0] : (v ?? ''); }
export function cors(res: Res): void {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, x-override-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
}
export class HttpError extends Error { code: number; constructor(code: number, msg: string) { super(msg); this.code = code; } }
export function send(res: Res, code: number, body: unknown): void { res.status(code).json(body); }
/** Enveloppe commune : CORS, OPTIONS, erreurs typées. */
export function handler(fn: (req: Req, res: Res) => Promise<void>) {
  return async (req: Req, res: Res) => {
    cors(res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    try { await fn(req, res); }
    catch (e) {
      const code = e instanceof HttpError ? e.code : 500;
      send(res, code, { error: e instanceof Error ? e.message : String(e) });
    }
  };
}
export function body<T>(req: Req): T {
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) as T; } catch { throw new HttpError(400, 'JSON invalide'); } }
  if (!req.body || typeof req.body !== 'object') throw new HttpError(400, 'Corps de requête manquant');
  return req.body as T;
}
export const num = (v: unknown): number | null => { const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : typeof v === 'number' ? v : NaN; return Number.isFinite(n) ? n : null; };
