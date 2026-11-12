/* Adaptateurs de courtiers titres. */
import type { BrokerAdapter, Position, CashBalance, AssetClass } from '../../types/models.js';

/** Saxo OpenAPI : GET /port/v1/positions/me et /port/v1/balances/me avec un jeton OAuth (Bearer). */
export const saxo: BrokerAdapter = {
  id: 'saxo', label: 'Saxo Bank', required: ['accessToken'],
  async fetchSnapshot(c, f = fetch) {
    const base = 'https://gateway.saxobank.com/openapi', h = { Authorization: `Bearer ${c.accessToken}` };
    const r = await f(`${base}/port/v1/positions/me?FieldGroups=PositionBase,PositionView,DisplayAndFormat`, { headers: h });
    if (!r.ok) throw new Error(`Saxo HTTP ${r.status}`);
    type SaxoPos = { PositionBase?: { Amount?: number; OpenPrice?: number; AssetType?: string }; PositionView?: { CurrentPrice?: number }; DisplayAndFormat?: { Symbol?: string; Description?: string; Currency?: string } };
    const j = await r.json() as { Data?: SaxoPos[] };
    const cls = (t?: string): AssetClass => t === 'Etf' ? 'ETF' : t === 'Bond' ? 'Obligations' : t?.includes('Option') ? 'Options' : t === 'MutualFund' ? 'VMP / OPCVM' : 'Actions';
    const positions: Position[] = (j.Data ?? []).map(p => ({ symbol: p.DisplayAndFormat?.Symbol ?? '?', name: p.DisplayAndFormat?.Description, asset_class: cls(p.PositionBase?.AssetType),
      quantity: p.PositionBase?.Amount ?? 0, avg_cost: p.PositionBase?.OpenPrice ?? null, last_price: p.PositionView?.CurrentPrice ?? null, currency: p.DisplayAndFormat?.Currency ?? 'EUR' }));
    const b = await f(`${base}/port/v1/balances/me`, { headers: h });
    const cash: CashBalance[] = [];
    if (b.ok) { const bj = await b.json() as { CashBalance?: number; Currency?: string }; if (typeof bj.CashBalance === 'number') cash.push({ currency: bj.Currency ?? 'EUR', amount: bj.CashBalance }); }
    return { positions, cash };
  },
};

/** Interactive Brokers, Flex Web Service : SendRequest (jeton + n° de requête Flex) puis GetStatement (XML). */
export function parseFlex(xml: string): { positions: Position[]; cash: CashBalance[] } {
  const attrs = (tag: string) => [...xml.matchAll(new RegExp(`<${tag}\\s([^>]*?)/?>`, 'g'))].map(m => Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map(a => [a[1], a[2]])));
  const cls = (c: string): AssetClass => c === 'OPT' || c === 'FOP' ? 'Options' : c === 'BOND' ? 'Obligations' : c === 'FUND' ? 'VMP / OPCVM' : c === 'CMDTY' ? 'Commodities' : c === 'CRYPTO' ? 'Crypto' : 'Actions';
  const positions = attrs('OpenPosition').map(a => ({ symbol: a.symbol, name: a.description, asset_class: cls(a.assetCategory), quantity: parseFloat(a.position),
    avg_cost: a.costBasisPrice ? parseFloat(a.costBasisPrice) : null, last_price: a.markPrice ? parseFloat(a.markPrice) : null, currency: a.currency || 'USD' })).filter(p => Number.isFinite(p.quantity));
  const cash = attrs('CashReportCurrency').filter(a => a.currency && a.currency !== 'BASE_SUMMARY').map(a => ({ currency: a.currency, amount: parseFloat(a.endingCash) })).filter(c => Number.isFinite(c.amount));
  return { positions, cash };
}
export const ibkrFlex: BrokerAdapter = {
  id: 'ibkr_flex', label: 'Interactive Brokers (Flex)', required: ['flexToken', 'flexQueryId'],
  async fetchSnapshot(c, f = fetch) {
    const base = process.env.IBKR_FLEX_BASE || 'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService';
    const s = await (await f(`${base}/SendRequest?t=${encodeURIComponent(c.flexToken!)}&q=${encodeURIComponent(c.flexQueryId!)}&v=3`)).text();
    const ref = s.match(/<ReferenceCode>(\w+)<\/ReferenceCode>/)?.[1];
    if (!ref) throw new Error('IBKR : ' + (s.match(/<ErrorMessage>([^<]+)/)?.[1] ?? 'référence absente'));
    for (let i = 0; i < 5; i++) {
      const x = await (await f(`${base}/GetStatement?t=${encodeURIComponent(c.flexToken!)}&q=${ref}&v=3`)).text();
      if (/<FlexQueryResponse/.test(x)) return parseFlex(x);
      await new Promise(r => setTimeout(r, 2000));   // relevé en cours de génération
    }
    throw new Error('IBKR : relevé non disponible, réessayez');
  },
};

/** Passerelle personnalisée : votre propre service renvoie {positions, cash, realized} au format OVERRIDE.DESK. */
export const gateway: BrokerAdapter = {
  id: 'gateway', label: 'Passerelle personnalisée', required: ['url'],
  async fetchSnapshot(c, f = fetch) {
    const r = await f(c.url!, { headers: c.token ? { Authorization: `Bearer ${c.token}` } : {} });
    if (!r.ok) throw new Error(`Passerelle HTTP ${r.status}`);
    const j = await r.json() as { positions?: Array<Record<string, unknown>>; cash?: number | Array<{ currency: string; amount: number }> };
    const positions: Position[] = (j.positions ?? []).map(p => ({ symbol: String(p.sym ?? p.symbol), name: String(p.name ?? p.sym ?? ''), asset_class: (p.cls ?? p.asset_class ?? 'Actions') as AssetClass,
      quantity: Number(p.qty ?? p.quantity), avg_cost: p.pru != null ? Number(p.pru) : null, last_price: p.px != null ? Number(p.px) : null, currency: String(p.ccy ?? p.currency ?? 'EUR'),
      stop_loss: p.sl != null ? Number(p.sl) : null, take_profit: p.tp != null ? Number(p.tp) : null }));
    const cash = typeof j.cash === 'number' ? [{ currency: 'EUR', amount: j.cash }] : (j.cash ?? []);
    return { positions, cash };
  },
};
