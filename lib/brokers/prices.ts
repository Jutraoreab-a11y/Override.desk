/* Valorisation des avoirs crypto via le carnet public Binance (sans clé) : prix en EUR si la paire existe, sinon en USDT ≈ USD. */
const STABLE = new Set(['USDT', 'USDC', 'BUSD', 'FDUSD', 'DAI']);
export async function cryptoPrice(asset: string, f: typeof fetch = fetch): Promise<{ price: number | null; currency: string }> {
  const a = asset.toUpperCase().replace(/^X(?=[A-Z]{3}$)/, '').replace(/^XBT$/, 'BTC');
  if (a === 'EUR') return { price: 1, currency: 'EUR' };
  if (STABLE.has(a) || a === 'USD') return { price: 1, currency: 'USD' };
  for (const [quote, ccy] of [['EUR', 'EUR'], ['USDT', 'USD']] as const) {
    try {
      const r = await f(`https://api.binance.com/api/v3/ticker/price?symbol=${a}${quote}`);
      if (r.ok) { const j = await r.json() as { price?: string }; const p = parseFloat(j.price ?? ''); if (Number.isFinite(p)) return { price: p, currency: ccy }; }
    } catch { /* paire absente : essai suivant */ }
  }
  return { price: null, currency: 'USD' };
}
/** Normalise les codes Kraken (XXBT, XETH, ZEUR…). */
export function krakenAsset(code: string): string {
  const m: Record<string, string> = { XXBT: 'BTC', XBT: 'BTC', XETH: 'ETH', XXRP: 'XRP', XLTC: 'LTC', XXLM: 'XLM', XXMR: 'XMR', XZEC: 'ZEC', XETC: 'ETC', XXDG: 'DOGE', ZEUR: 'EUR', ZUSD: 'USD', ZGBP: 'GBP', ZCAD: 'CAD', ZJPY: 'JPY' };
  return m[code] ?? code.replace(/\.(S|M|F|B|P)$/, '');
}
