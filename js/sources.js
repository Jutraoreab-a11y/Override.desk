/* ============ v8.5 : chaîne de sources réelles, recoupées ============
   Cours : Google Finance, TradingView, stockanalysis.com, Investing.com (si l'adresse est connue). Un cours est accepté quand
   deux sources concordent à 1,5 % près ; une source seule est acceptée mais signalée « non recoupé ».
   Comptes : MarketScreener (CA, EBITDA, résultat net, BPA, FCF, dette nette, prévisions), recoupé avec stockanalysis.com ;
   Yahoo Finance en dernier recours (mur de consentement fréquent en Europe).
   Lecture par l'IA dans le navigateur intégré de l'application Claude : aucune clé. Chaque valeur est recherchée dans le texte de sa page. */
const SRC_EX={epa:['EPA','EURONEXT','PA'],ams:['AMS','EURONEXT','AS'],etr:['ETR','XETR','DE'],bit:['BIT','MIL','MI'],bme:['BME','BME','MC'],lon:['LON','LSE','L'],swx:['SWX','SIX','SW'],ebr:['EBR','EURONEXT','BR']};
const SRC_US={AAPL:'NASDAQ',MSFT:'NASDAQ',NVDA:'NASDAQ',INTC:'NASDAQ',KO:'NYSE'};
/* Adresses de chaque site pour une fiche : déduites du ticker, de l'adresse stockanalysis et du lien MarketScreener déjà stocké */
function srcOf(k){const a=S.an.assets[k];if(!a)return null;const path=a.sa||SA_PATH[k]||saPath(a.t),m=path.match(/^quote\/(\w+)\/(.+)$/),sym=m?m[2].toUpperCase():path.split('/')[1].toUpperCase(),ex=m?SRC_EX[m[1]]:null;
  const us=a.usEx||SRC_US[k]||(ex?null:'NASDAQ'),ms=(String(a.ms||a.src||'').match(/https:\/\/[a-z]{2,3}\.marketscreener\.com\/quote\/stock\/[A-Z0-9\-]+\//i)||[])[0];
  return{sym,path,
    price:[{n:'Google Finance',u:ex?`https://www.google.com/finance/quote/${sym}:${ex[0]}`:`https://www.google.com/finance/quote/${sym}:${us}`},
      {n:'TradingView',u:ex?`https://www.tradingview.com/symbols/${ex[1]}-${sym}/`:`https://www.tradingview.com/symbols/${us}-${sym}/`},
      {n:'stockanalysis.com',u:`https://stockanalysis.com/${path}/`},...(a.inv?[{n:'Investing.com',u:a.inv}]:[])],
    fund:[...(ms?[{n:'MarketScreener',u:ms.replace(/^https:\/\/[a-z]{2,3}\./,'https://www.')+'finances/'}]:[]),{n:'stockanalysis.com',u:`https://stockanalysis.com/${path}/financials/`},
      {n:'Yahoo Finance',u:`https://finance.yahoo.com/quote/${ex?sym+'.'+ex[2]:sym}/financials/`}]};}
/* Lecture d'un cours sur une page : valeur demandée à Claude, puis retrouvée dans le texte */
async function srcPrice(s,a){const txt=await aiPage(s.u),nt=normTxt(txt);if(txt.length<300)throw new Error('page vide');
  const j=await AI.sample.json(`Page « ${s.n} » consacrée à ${a.n} (${a.t}). Donne le dernier cours affiché pour cette action, sa devise et sa date.\nJSON : {"price":nombre|null,"currency":"EUR"|"USD"|...|null,"date":"AAAA-MM-JJ"|null}\nSi la page n'est pas celle de ce titre ou ne montre pas de cours (mur de consentement, erreur), price = null.\n\n${txt.slice(0,7000)}`,{modelTier:'quick',cache:false});
  const v=+(j&&j.price);if(!isFinite(v)||!(v>0)||!aiNumIn(v,nt))throw new Error('cours absent de la page');
  if(j.currency&&a.cur&&String(j.currency).toUpperCase()!==String(a.cur).toUpperCase())throw new Error(`devise ${j.currency} ≠ ${a.cur}`);
  return{v,d:/^\d{4}-\d{2}-\d{2}$/.test(String(j.date))?j.date:new Date().toISOString().slice(0,10),n:s.n,u:s.u};}
/* Cours recoupé : lit les sources dans l'ordre jusqu'à deux valeurs concordantes */
async function srcPriceChecked(k){const a=S.an.assets[k],S0=srcOf(k),got=[],err=[];
  for(const s of S0.price){try{const r=await srcPrice(s,a);const pair=got.find(g=>Math.abs(g.v/r.v-1)<=0.015);got.push(r);if(pair)return{ok:true,v:pair.d>=r.d?pair.v:r.v,d:pair.d>=r.d?pair.d:r.d,by:[pair.n,r.n],err};}
    catch(e){err.push(s.n+' : '+(e.message||aiErr(e)));}}
  if(got.length===1)return{ok:true,single:true,v:got[0].v,d:got[0].d,by:[got[0].n],err};
  if(got.length>1)return{ok:false,conflict:got.map(g=>`${g.n} ${nf(g.v,2)}`),err};
  return{ok:false,err};}
/* Actualisation des cours de toutes les fiches, recoupés entre sites */
aiRefreshPrices=async function(){if(!AI.mcp||!AI.sample){toast("Lecture des cours par l'IA : ouvrez OVERRIDE.DESK dans l'application Claude (navigateur intégré)");return;}
  const K=Object.keys(S.an.assets),rep={ok:[],one:[],ko:[]};AI.busy.prices=true;
  for(const [i,k] of K.entries()){const a=S.an.assets[k];AI.msg.prices=['am',`${a.t} : lecture et recoupement des sources (${i+1}/${K.length})…`];renderAI();
    if(a.pxManual){rep.ko.push(a.t+' (saisie conservée)');continue;}
    try{const r=await srcPriceChecked(k);
      if(!r.ok){rep.ko.push(a.t+(r.conflict?' (sources en désaccord : '+r.conflict.join(', ')+')':''));continue;}
      a.price=r.v;a.pxDate=fdate(r.d);a.pxSrc=(r.single?'Non recoupé · ':'Recoupé · ')+r.by.join(' et ')+', lecture IA du '+fdate(new Date().toISOString().slice(0,10));
      (r.single?rep.one:rep.ok).push(a.t);}catch(e){rep.ko.push(a.t);}}
  AI.busy.prices=false;AI.msg.prices=[rep.ko.length||rep.one.length?'am':'ok',`${rep.ok.length} cours recoupés par deux sites${rep.one.length?' · '+rep.one.length+' sur une seule source ('+rep.one.join(', ')+')':''}${rep.ko.length?' · non actualisés : '+rep.ko.join(', '):''}.`];
  save();recalc();renderAll();renderAI();toast(AI.msg.prices[1]);};
/* Comptes annuels lus sur une page, au format commun (même schéma que l'ingestion serveur) */
async function srcFund(s,a){const txt=await aiPage(s.u),nt=normTxt(txt);if(txt.length<500)throw new Error('page vide ou bloquée');
  const p=await AI.sample.json(`Page « ${s.n} » : données financières de ${a.n} (${a.t}).\nExtrais les exercices annuels publiés (pas les prévisions, pas TTM), du plus ancien au plus récent, cinq au plus, en millions de la devise des comptes (convertis « 84.68B » en 84680).\nJSON : {"currency":"EUR","fiscal_years":[2021,...],"revenue":[...],"ebitda":[...|null],"net_income":[...|null],"eps":[...|null],"fcf":[...|null],"net_debt":[...|null]}\nnull si absent ; n'invente rien.\n\n${txt.slice(0,24000)}`,{modelTier:'default',cache:false});
  if(!p||!Array.isArray(p.revenue)||!p.revenue.length)throw new Error('comptes non lus');
  const vals=[...p.revenue,...(p.net_income||[])].filter(v=>v!==null&&isFinite(+v)),hit=vals.filter(v=>aiNumIn(+v,nt)||aiNumIn(+v/1000,nt)).length;
  if(hit<Math.ceil(vals.length*0.8))throw new Error('montants introuvables dans la page');
  return{...p,src:s};}
/* Recoupement de deux jeux de comptes : chiffre d'affaires du dernier exercice commun à 3 % près */
function srcAgree(A,B){const y=(A.fiscal_years||[]).filter(x=>(B.fiscal_years||[]).includes(x)).pop();if(!y)return null;
  const a=A.revenue[A.fiscal_years.indexOf(y)],b=B.revenue[B.fiscal_years.indexOf(y)];return isFinite(+a)&&isFinite(+b)&&b?{y,ok:Math.abs(a/b-1)<=0.03,a,b}:null;}
/* Actualisation des comptes d'une fiche : MarketScreener, recoupé avec stockanalysis ; les données manquantes d'une source sont complétées par l'autre */
async function aiRefreshFund(k){if(!AI.mcp||!AI.sample){toast("Lecture des comptes par l'IA : ouvrez OVERRIDE.DESK dans l'application Claude");return;}
  const a=S.an.assets[k],F=srcOf(k).fund,got=[],err=[];toast(`${a.t} : lecture des comptes publiés…`);
  for(const s of F){if(got.length>=2)break;try{got.push(await srcFund(s,a));}catch(e){err.push(s.n+' : '+(e.message||aiErr(e)));}}
  if(!got.length){toast(`${a.t} : comptes non lus (${err.join(' ; ')})`);return;}
  const [P,Q]=got,chk=Q?srcAgree(P,Q):null;
  if(chk&&!chk.ok){toast(`${a.t} : ${P.src.n} (${nf(chk.a,0)}) et ${Q.src.n} (${nf(chk.b,0)}) divergent sur le CA ${chk.y} : comptes non modifiés`);return;}
  if(Q)['ebitda','net_income','eps','fcf','net_debt'].forEach(f=>{P[f]=(P.fiscal_years||[]).map((y,i)=>{const v=(P[f]||[])[i];if(v!==null&&v!==undefined&&isFinite(+v))return v;const j=(Q.fiscal_years||[]).indexOf(y);return j>=0&&Q[f]?Q[f][j]:null;});});
  const roe=a.roe.slice(),r=anApply(a,{...P,roe_pct:P.fiscal_years.map((y,i)=>roe[roe.length-P.fiscal_years.length+i]||null),price:null},P.src.u);
  a.fundSrc=(chk?'Recoupé · ':'Non recoupé · ')+got.map(g=>g.src.n).join(' et ')+', lecture IA du '+fdate(new Date().toISOString().slice(0,10));
  save();recalc();renderAll();toast(`${a.t} : ${P.fiscal_years.length} exercices · ${a.fundSrc}${r.missing.length?' · à compléter : '+r.missing.join(', '):''}`);}
/* Nouvelle société : après la lecture stockanalysis, recoupement du CA avec Yahoo Finance ou MarketScreener si lisibles, et du cours avec Google Finance / TradingView */
if(typeof aiCompany==='function'){const _ac=aiCompany;aiCompany=async function(q,a){const r=await _ac(q,a);
  try{const k=Object.keys(S.an.assets).find(x=>S.an.assets[x]===a),S0=srcOf(k);
    const base={fiscal_years:a.y.filter(y=>/^FY\d{4}$/.test(y)).map(y=>+y.slice(2)),revenue:a.rev.slice(5-a.y.filter(y=>/^FY\d{4}$/.test(y)).length)};
    for(const s of S0.fund.filter(s=>s.n!=='stockanalysis.com')){try{const o=await srcFund(s,a),c=srcAgree(base,o);if(c){a.fundSrc=(c.ok?'Recoupé · stockanalysis.com et ':'Écart signalé · stockanalysis.com et ')+s.n;r.check=c;break;}}catch(e){}}
    const p=await srcPriceChecked(k);if(p.ok){a.price=p.v;a.pxDate=fdate(p.d);a.pxSrc=(p.single?'Non recoupé · ':'Recoupé · ')+p.by.join(' et ');}
  }catch(e){}
  if(!a.fundSrc)a.fundSrc='Non recoupé · stockanalysis.com';return r;};}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act="aifund"]');if(b)aiRefreshFund(b.dataset.id||ui.tk);});
