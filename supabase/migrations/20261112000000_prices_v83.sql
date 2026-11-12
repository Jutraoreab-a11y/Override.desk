-- OVERRIDE.DESK v8.3 : cours du soir des cryptos (CRY:<symbole>) à côté des actions et ETF (STK:<ticker>). Rejouable.
alter table public.commodity_prices drop constraint if exists commodity_prices_instrument_check;
alter table public.commodity_prices add constraint commodity_prices_instrument_check
  check (instrument in ('BRENT','WTI','GOLD','SILVER','COPPER','NATGAS','EURUSD','GBPUSD','USDJPY','USDCNH','AUDUSD','USDCAD','SPX','NDX','DJI','DAX','CAC','NKX')
         or instrument ~ '^STK:[A-Z0-9.\-]{1,12}$' or instrument ~ '^CRY:[A-Z0-9]{1,10}$');
