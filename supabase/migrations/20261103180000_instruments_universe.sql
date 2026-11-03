-- v7.0 : le sélecteur universel du volet 5 stocke aussi cuivre, gaz naturel, devises, indices et actions (STK:<ticker>).
alter table public.commodity_prices drop constraint if exists commodity_prices_instrument_check;
alter table public.commodity_prices add constraint commodity_prices_instrument_check
  check (instrument in ('BRENT','WTI','GOLD','SILVER','COPPER','NATGAS','EURUSD','GBPUSD','USDJPY','USDCNH','AUDUSD','USDCAD','SPX','NDX','DJI','DAX','CAC','NKX')
         or instrument ~ '^STK:[A-Z0-9.\-]{1,12}$');
