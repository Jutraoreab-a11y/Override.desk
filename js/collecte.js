/* ============ Collecte par IA connectée (scraping intelligent) ============ */
/* Fonctionnement : la page ouvre une source validée dans le navigateur intégré de l'application Claude
   (host:claude_browser), lit le texte de la page, puis Claude en extrait la valeur au format JSON.
   Chaque valeur est contrôlée (l'extrait cité doit figurer dans la page) et conservée avec son URL
   et sa date de consultation. Rien n'est inventé : sans valeur lisible, rien n'est mis à jour. */
const AI_HOST='host:claude_browser';
const AI_TICK={AAPL:'AAPL:NASDAQ',MSFT:'MSFT:NASDAQ',NVDA:'NVDA:NASDAQ',INTC:'INTC:NASDAQ',ASML:'ASML:AMS',SAP:'SAP:ETR',MC:'MC:EPA',OR:'OR:EPA',KO:'KO:NYSE',AIR:'AIR:EPA',TTE:'TTE:EPA'};
const AI_CM={brent:['Brent','https://fr.investing.com/commodities/brent-oil-historical-data'],wti:['WTI','https://fr.investing.com/commodities/crude-oil-historical-data'],gold:['Or','https://fr.investing.com/commodities/gold-historical-data'],silver:['Argent','https://fr.investing.com/commodities/silver-historical-data']};
function aiTargets(){
  const T=[
    {k:'euribor',l:'Euribor 3 mois',mod:'LBO',url:'https://www.euribor-rates.eu/fr/taux-euribor-actuels/2/euribor-taux-3-mois/',ask:"le taux Euribor 3 mois le plus récent affiché, en pourcentage",unit:'%'},
    {k:'eurusd',l:'EUR/USD (référence BCE)',mod:'Tous',url:'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-usd.en.html',ask:"le dernier taux de change de référence de la BCE pour 1 euro en dollars américains (USD)",unit:''}];
  Object.entries(AI_CM).forEach(([k,[l,url]])=>T.push({k:'cm_'+k,l:l+' : cours quotidiens',mod:'Commodities',url,cm:k}));
  const tk=ui.tk&&AI_TICK[ui.tk]?ui.tk:'MC';T.push({k:'px_'+tk,l:'Cours de '+(S.an.assets[tk]||{}).n,mod:'Analyse financière',url:'https://www.google.com/finance/quote/'+AI_TICK[tk],ask:"le dernier cours de l'action affiché (prix actuel ou de clôture), dans sa devise de cotation",unit:(S.an.assets[tk]||{}).cur||'',tk});
  return T;
}
function aiApplyLive(){const L=S.live||{};
  if(L.eurusd&&isFinite(L.eurusd.v)){FX_EURUSD=+L.eurusd.v;FX_DATE=fdate(L.eurusd.d||L.eurusd.at.slice(0,10));FX_SRC='BCE, taux de référence (collecte IA du '+fdate(L.eurusd.at.slice(0,10))+')';S.pf.eurusd=FX_EURUSD;}
  if(L.euribor&&isFinite(L.euribor.v)){LBO_SRC.euribor={v:+L.euribor.v,d:fdate(L.euribor.d||L.euribor.at.slice(0,10)),s:'euribor-rates.eu (collecte IA du '+fdate(L.euribor.at.slice(0,10))+')'};}}
const AI={mcp:undefined,sample:undefined,busy:{},msg:{}};
(async()=>{try{AI.mcp=await claude.use('mcp');}catch(e){AI.mcp=null;}try{AI.sample=await claude.use('sample');}catch(e){AI.sample=null;}if(ui.aiOpen)renderAI();if(typeof renderAll==='function')renderAll();})();
const normTxt=s=>String(s||'').replace(/\s+/g,' ').toLowerCase();
/* Lecture d'une page par Claude : navigateur intégré de l'application Claude (ordinateur), sinon connecteur Firecrawl du compte Claude
   (claude.ai web, mobile et ordinateur). Le premier moyen qui répond est retenu pour la suite de la session. */
const AI_FC='Firecrawl';AI.via=null;
async function aiPageBrowser(url){
  await AI.mcp.callTool(AI_HOST,'navigate',{url},{cache:false});
  await new Promise(r=>setTimeout(r,2500));
  const r=await AI.mcp.callTool(AI_HOST,'get_page_text',{max_chars:60000},{cache:false});
  const p=r.payload;let txt=typeof p==='string'?p:(r.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');
  if(!txt&&p&&typeof p==='object')txt=JSON.stringify(p);
  return String(txt||'');}
async function aiPageFC(url){
  const r=await AI.mcp.callTool(AI_FC,'firecrawl_scrape',{url,formats:['markdown'],onlyMainContent:true,maxAge:0,objective:'Lire cette page publique pour alimenter le terminal OVERRIDE.DESK (cours, comptes, études de marché).'},{cache:false});
  const pick=o=>o&&typeof o==='object'?(o.markdown||o.rawHtml||(o.data&&(o.data.markdown||o.data.rawHtml))||''):'';
  let t=pick(r.payload);
  if(!t){t=(r.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');try{const j=JSON.parse(t);t=pick(j)||t;}catch(e){}}
  return String(t||'');}
async function aiPage(url){
  if(AI.via!=='firecrawl'){try{const t=await aiPageBrowser(url);AI.via='browser';return t;}
    catch(e){if(AI.via==='browser'&&!['server_not_connected','not_in_manifest','blocked_by_policy'].includes(e&&e.code))throw e;}}
  const t=await aiPageFC(url);AI.via='firecrawl';return t;}
function aiErr(e){const c=e&&e.code;return{server_not_connected:"Ni le navigateur intégré (application Claude sur ordinateur) ni le connecteur Firecrawl ne sont reliés à votre compte Claude : activez l'un des deux.",not_in_manifest:"Accès au navigateur refusé pour cette page.",cancelled:"Ouverture de la page refusée dans l'application Claude.",approval_required:"Autorisation requise dans l'application Claude.",not_granted:"Claude n'est pas autorisé pour cette page : collecte impossible.",rate_limited:"Trop de demandes : réessayez dans quelques minutes.",invalid_json:"La page n'a pas permis d'extraire une valeur lisible.",tool_error:"La page source n'a pas pu être lue ("+(e.message||'')+")."}[c]||("Échec de la collecte"+(c?' ('+c+')':'')+(e&&e.message&&!c?' : '+e.message:''));}
async function aiCollect(t){
  if(!AI.mcp||!AI.sample){AI.msg[t.k]=['ko',"Collecte IA indisponible ici : elle fonctionne dans l'application Claude (ordinateur), navigateur intégré activé."];renderAI();return;}
  AI.busy[t.k]=true;AI.msg[t.k]=['am','Lecture de la source…'];renderAI();
  try{
    const txt=await aiPage(t.url),excerpt=txt.slice(0,40000),now=new Date().toISOString(),nt=normTxt(txt);
    if(txt.length<200)throw{code:'tool_error',message:'page vide ou bloquée'};
    AI.msg[t.k]=['am','Extraction par Claude…'];renderAI();
    if(t.cm){
      const j=await AI.sample.json(`Voici le texte d'une page d'historique de cours (source : ${t.url}).\nExtrais les 30 lignes les plus récentes du tableau des cours quotidiens.\nRéponds uniquement en JSON : {"rows":[{"date":"AAAA-MM-JJ","close":nombre,"open":nombre|null,"chg":nombre|null}]} où close = cours de clôture (« Dernier »), open = ouverture, chg = variation en % (ex. -0,85 % devient -0.85).\nN'invente rien : si le tableau n'apparaît pas, réponds {"rows":[]}.\n\nTEXTE DE LA PAGE :\n${excerpt}`,{modelTier:'quick',cache:false});
      const rows=(j&&Array.isArray(j.rows)?j.rows:[]).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(String(r.date))&&isFinite(+r.close)&&+r.close>0);
      const ok=rows.filter(r=>{const v=+r.close,a=v.toFixed(2),b=a.replace('.',','),c=v.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).replace(/\s/g,' ');return nt.includes(a)||nt.includes(b)||nt.includes(normTxt(c));});
      if(!ok.length)throw{code:'invalid_json'};
      S.cm.add=S.cm.add||{};S.cm.add[t.cm]=S.cm.add[t.cm]||{};ok.forEach(r=>{S.cm.add[t.cm][r.date]=[+r.close,isFinite(+r.open)&&r.open!==null?+r.open:null,isFinite(+r.chg)&&r.chg!==null?+r.chg/100:null];});
      const last=ok.map(r=>r.date).sort().pop();
      S.live=S.live||{};S.live[t.k]={v:+ok.find(r=>r.date===last).close,d:last,at:now,url:t.url,n:ok.length,rej:rows.length-ok.length};
      AI.msg[t.k]=['ok',`${ok.length} séances importées jusqu'au ${fdate(last)}${rows.length>ok.length?` (${rows.length-ok.length} rejetée(s) car absentes du texte de la page)`:''}.`];
    }else{
      const j=await AI.sample.json(`Voici le texte d'une page web (source : ${t.url}).\nExtrais ${t.ask}.\nRéponds uniquement en JSON : {"value":nombre|null,"date":"AAAA-MM-JJ"|null,"quote":"extrait exact de la page, 80 caractères au plus, qui contient la valeur"}.\nN'invente rien : si la valeur n'apparaît pas dans le texte, value = null.\n\nTEXTE DE LA PAGE :\n${excerpt}`,{modelTier:'quick',cache:false});
      const v=+(j&&j.value),q=normTxt(j&&j.quote);
      if(!isFinite(v)||!(j&&j.value!==null))throw{code:'invalid_json'};
      if(!q||!nt.includes(q.slice(0,40)))throw{code:'invalid_json',message:"l'extrait cité ne figure pas dans la page"};
      S.live=S.live||{};S.live[t.k]={v,d:/^\d{4}-\d{2}-\d{2}$/.test(String(j.date))?j.date:null,at:now,url:t.url,quote:String(j.quote).slice(0,120)};
      if(t.tk){const a=S.an.assets[t.tk];a.price=v;a.pxDate=fdate(now.slice(0,10));a.src=(a.src?a.src+' ; ':'')+'cours : Google Finance (collecte IA du '+fdate(now.slice(0,10))+')';}
      aiApplyLive();AI.msg[t.k]=['ok',`Valeur ${nf(v,t.k==='eurusd'?4:3)}${t.unit?' '+t.unit:''} relevée et appliquée.`];
    }
    save();
  }catch(e){AI.msg[t.k]=['ko',aiErr(e)];}
  finally{AI.busy[t.k]=false;renderAll();renderAI();}
}
function renderAI(){
  const el=document.getElementById('ai');if(!el)return;el.hidden=!ui.aiOpen;if(!ui.aiOpen)return;
  const T=aiTargets(),L=S.live||{},avail=AI.mcp&&AI.sample,load=AI.mcp===undefined;
  el.innerHTML=`<div class="ai-box" role="dialog" aria-label="Collecte IA et sources"><div class="ai-h"><b>Collecte IA et traçabilité des sources</b><button class="btn sm" data-act="aiclose">Fermer</button></div>
    <p class="note" style="margin:0 0 10px">${load?'Connexion à l\'application Claude…':avail?"Claude ouvre chaque source validée dans le navigateur intégré, lit la page et en extrait la donnée. Chaque valeur garde son URL, sa date de consultation et l'extrait cité ; une valeur absente de la page est rejetée.":"Collecte indisponible dans cet affichage : ouvrez la page dans l'application Claude sur ordinateur (navigateur intégré) pour l'activer. Les valeurs déjà collectées restent appliquées."}</p>
    <div class="tw"><table class="tbl"><thead><tr><th>Donnée</th><th>Volet</th><th>Dernière valeur</th><th>Source et consultation</th><th></th></tr></thead><tbody><tr><td><b>Cours de toutes les fiches</b><div class="meta">${Object.keys(S.an.assets).length} sociétés, une page de cotation chacune</div></td><td>Analyse financière</td><td class="meta">${(AI.msg.prices||[])[1]?esc(AI.msg.prices[1]):'—'}</td><td class="meta">Google Finance, TradingView, stockanalysis.com, Investing.com : accepté quand deux sites concordent à 1,5 %</td><td><button class="btn sm${AI.mcp&&AI.sample?' pri':''}" data-act="aiprices"${!(AI.mcp&&AI.sample)||AI.busy.prices?' disabled':''}>${AI.busy.prices?'En cours…':'Actualiser'}</button></td></tr><tr><td><b>Comptes de ${esc((S.an.assets[ui.tk]||{}).n||'')}</b><div class="meta">${esc((S.an.assets[ui.tk]||{}).fundSrc||'cinq derniers exercices')}</div></td><td>Analyse financière</td><td class="meta">—</td><td class="meta">MarketScreener, recoupé avec stockanalysis.com (Yahoo Finance en secours) : CA à 3 % près</td><td><button class="btn sm${AI.mcp&&AI.sample?' pri':''}" data-act="aifund" data-id="${esc(ui.tk)}"${!(AI.mcp&&AI.sample)?' disabled':''}>Actualiser</button></td></tr>
    ${T.map(t=>{const x=L[t.k],m=AI.msg[t.k];return`<tr><td><b>${esc(t.l)}</b></td><td class="meta">${t.mod}</td><td class="num">${x?nf(x.v,t.k==='eurusd'?4:3)+(t.unit?' '+t.unit:'')+(x.d?` <span class="meta">au ${fdate(x.d)}</span>`:''):'<span class="meta">jamais collectée</span>'}</td>
      <td class="wrap"><a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(new URL(t.url).hostname)}</a>${x?` · consulté le ${new Date(x.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}${x.quote?`<br><span class="meta">« ${esc(x.quote)} »</span>`:''}`:''}${m?`<br><span class="dot ${m[0]}"></span> <span class="${m[0]==='ko'?'down':''}">${esc(m[1])}</span>`:''}</td>
      <td><button class="btn sm${avail?' pri':''}" data-act="aicol" data-id="${t.k}"${!avail||AI.busy[t.k]?' disabled':''}>${AI.busy[t.k]?'En cours…':'Collecter'}</button></td></tr>`;}).join('')}
    </tbody></table></div>
    <p class="note">La collecte navigue dans l'onglet actif du navigateur intégré. Elle est déclenchée uniquement par un clic, jamais automatiquement, et consomme votre usage Claude.</p></div>`;
}
aiApplyLive();

/* Voyant d'état de la collecte IA (en-tête) : vert si une passerelle est active ; les appels restent explicites */
function aiState(){const srv=!!(typeof FLUX==='object'&&FLUX.on&&FLUX.status&&FLUX.status.connectors&&FLUX.status.connectors.ai),app=!!(AI.mcp&&AI.sample);
  return srv||app?['ok','Collecte IA active : '+[app?'navigateur intégré de l\'application Claude':'',srv?'passerelle serveur à serveur (API Anthropic)':''].filter(Boolean).join(' et ')+' · appels uniquement sur Recalculer, Collecter ou à l\'initialisation d\'un dossier']
    :AI.mcp===undefined?['am','Connexion aux passerelles IA…']:['ko','Passerelles IA indisponibles ici : lecture seule des données en cache'];}

/* ============ v8.4 : le SaaS s'alimente en lisant les pages publiques (aucune clé de fournisseur de données) ============
   Dans l'application Claude : navigateur intégré + Claude, sans aucune clé. Sur le web avec backend : lecture serveur (clé Anthropic seule).
   Source : stockanalysis.com (cotation, comptes annuels, ratios). Chaque chiffre extrait est recherché dans le texte de la page avant d'être accepté. */
const SA_EX={PA:'epa',AS:'ams',DE:'etr',MI:'bit',MC:'bme',L:'lon',SW:'swx',BR:'ebr'};
const SA_PATH={AAPL:'stocks/aapl',MSFT:'stocks/msft',NVDA:'stocks/nvda',INTC:'stocks/intc',KO:'stocks/ko',ASML:'quote/ams/ASML',SAP:'quote/etr/SAP',MC:'quote/epa/MC',OR:'quote/epa/OR',AIR:'quote/epa/AIR',TTE:'quote/epa/TTE'};
function saPath(t){t=String(t).trim().toUpperCase();const m1=t.match(/^([A-Z]{2,8}):([A-Z0-9.\-]{1,12})$/),m2=t.match(/^([A-Z0-9\-]{1,12})\.([A-Z]{1,2})$/);
  return m1?`quote/${m1[1].toLowerCase()}/${m1[2]}`:m2&&SA_EX[m2[2]]?`quote/${SA_EX[m2[2]]}/${m2[1]}`:`stocks/${t.toLowerCase()}`;}
const saUrls=p=>{const b=`https://stockanalysis.com/${p}/`;return[b,b+'financials/',b+'financials/ratios/'];};
const aiNumIn=(v,nt)=>{if(!isFinite(v)||v===null)return false;const a=Math.abs(v),f=[a.toFixed(0),a.toFixed(1),a.toFixed(2),a.toLocaleString('en-US',{maximumFractionDigits:2}),a.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})];return f.some(x=>nt.includes(x.toLowerCase()));};
/* Applique des comptes extraits (navigateur ou serveur, même format) à une fiche : cinq colonnes, les plus récentes à droite */
function anApply(a,p,src){const ys=(p.fiscal_years||[]).map(Number),n=Math.min(5,ys.length),cut=x=>(Array.isArray(x)?x:[]).slice(-n),pad=v=>Array(5-n).fill(0).concat(cut(v).map(x=>x===null||!isFinite(+x)?0:+x));
  const rev=cut(p.revenue),mg=cut(p.ebitda_margin_pct),eb=cut(p.ebitda).map((x,i)=>x!==null&&isFinite(+x)?+x:(isFinite(+mg[i])&&mg[i]!==null&&isFinite(+rev[i])?+(rev[i]*mg[i]/100).toFixed(1):null));
  Object.assign(a,{n:p.name||a.n,sec:p.sector||a.sec,cur:p.currency||a.cur,rcur:p.currency||a.rcur,y:Array(5-n).fill('—').concat(ys.slice(-n).map(y=>'FY'+y)),
    rev:pad(p.revenue),ebitda:pad(eb),ni:pad(p.net_income),eps:pad(p.eps),fcf:pad(p.fcf),nd:pad(p.net_debt),roe:pad(p.roe_pct),shares:isFinite(+p.shares)&&p.shares?+p.shares:a.shares,src,srcNote:'Lecture IA des pages publiques'});
  if(isFinite(+p.price)&&+p.price>0){a.price=+p.price;a.pxDate=fdate(/^\d{4}-\d{2}-\d{2}$/.test(String(p.price_date))?p.price_date:new Date().toISOString().slice(0,10));a.pxSrc='stockanalysis.com, lecture IA du '+fdate(new Date().toISOString().slice(0,10));}
  return{missing:[['rev','chiffre d\'affaires'],['ebitda','EBITDA'],['ni','résultat net'],['fcf','FCF'],['nd','dette nette'],['roe','ROE']].filter(([k])=>a[k].every(v=>!v)).map(x=>x[1])};}
/* Société inconnue : lecture IA des pages publiques dans le navigateur intégré (aucune clé) */
async function aiCompany(q,a){
  let path=SA_PATH[q.toUpperCase()]||saPath(q),U=saUrls(path),quote=await aiPage(U[0]);
  if(quote.length<500||/page not found|404/i.test(quote.slice(0,600))){/* nom en clair : recherche sur le site, puis choix du titre par Claude */
    const st=await aiPage('https://stockanalysis.com/search/?q='+encodeURIComponent(q));
    const r=await AI.sample.json(`Résultats de recherche boursière pour « ${q} ». Choisis l'action ordinaire principale de la société visée.\nRéponds en JSON : {"symbol":"MC","exchange":"EPA"|"NASDAQ"|"NYSE"|...|null,"name":"..."} ; null si rien ne correspond.\n\n${st.slice(0,12000)}`,{modelTier:'quick',cache:false});
    if(!r||!r.symbol)throw{code:'invalid_json',message:'société introuvable'};
    path=/^(NASDAQ|NYSE|NYSEAMERICAN|AMEX|OTC|BATS)$/i.test(r.exchange||'')||!r.exchange?`stocks/${String(r.symbol).toLowerCase()}`:`quote/${String(r.exchange).toLowerCase()}/${r.symbol}`;U=saUrls(path);quote=await aiPage(U[0]);}
  const fin=await aiPage(U[1]),rat=await aiPage(U[2]),all=normTxt(quote+' '+fin+' '+rat);
  const p=await AI.sample.json(`Trois pages publiques d'une société cotée (cotation, comptes annuels, ratios).\nExtrais en JSON strict :\n{"name":"","sector":"","currency":"EUR","fiscal_years":[2021,...],"revenue":[...],"ebitda":[...|null],"ebitda_margin_pct":[...|null],"net_income":[...],"eps":[...],"fcf":[...],"net_debt":[...],"roe_pct":[...],"shares":nombre,"price":nombre,"price_date":"AAAA-MM-JJ"|null}\nRègles : colonnes annuelles « FY » seulement (jamais TTM), du plus ancien au plus récent, cinq au plus ; montants en millions de la devise des comptes, tels qu'affichés ; dette nette = Total Debt − Cash & Investments ; EBITDA null si la ligne n'existe pas ; marge d'EBITDA et ROE depuis les ratios ; shares en millions ; n'invente rien, null si absent.\n\n=== COTATION ===\n${quote.slice(0,8000)}\n\n=== COMPTES ===\n${fin.slice(0,20000)}\n\n=== RATIOS ===\n${rat.slice(0,14000)}`,{modelTier:'default',cache:false});
  if(!p||!Array.isArray(p.revenue)||!p.revenue.length)throw{code:'invalid_json',message:'comptes non lus'};
  const chk=[...p.revenue,...(p.net_income||[])].filter(v=>v!==null&&isFinite(+v)),ok=chk.filter(v=>aiNumIn(+v,all)).length;
  if(ok<Math.ceil(chk.length*0.8))throw{code:'invalid_json',message:`${chk.length-ok} montant(s) extrait(s) introuvable(s) dans les pages : extraction rejetée`};
  if(isFinite(+p.price)&&!aiNumIn(+p.price,normTxt(quote)))p.price=null;
  a.sa=path;return anApply(a,p,U.join(' ; '));}
/* Actualisation des cours de toutes les fiches : une page de cotation par titre, valeur vérifiée dans le texte */
async function aiRefreshPrices(){if(!AI.mcp||!AI.sample){toast("Lecture des cours par l'IA : ouvrez OVERRIDE.DESK dans l'application Claude (navigateur intégré)");return;}
  const K=Object.keys(S.an.assets).filter(k=>S.an.assets[k].sa||SA_PATH[k]);let ok=0,ko=[];AI.busy.prices=true;renderAI();
  for(const k of K){const a=S.an.assets[k],u=`https://stockanalysis.com/${a.sa||SA_PATH[k]}/`;AI.msg.prices=['am',`Lecture du cours de ${a.t} (${ok+ko.length+1}/${K.length})…`];renderAI();
    try{const txt=await aiPage(u),nt=normTxt(txt);const j=await AI.sample.json(`Page de cotation de ${a.n} (${u}). Donne le dernier cours affiché et sa date.\nJSON : {"price":nombre|null,"date":"AAAA-MM-JJ"|null,"currency":"EUR"|"USD"|...}\n\n${txt.slice(0,6000)}`,{modelTier:'quick',cache:false});
      if(!j||!isFinite(+j.price)||!aiNumIn(+j.price,nt))throw{code:'invalid_json'};
      if(a.pxManual){ko.push(a.t+' (saisie conservée)');continue;}
      a.price=+j.price;a.pxDate=fdate(/^\d{4}-\d{2}-\d{2}$/.test(String(j.date))?j.date:new Date().toISOString().slice(0,10));a.pxSrc='stockanalysis.com, lecture IA du '+fdate(new Date().toISOString().slice(0,10));ok++;}
    catch(e){ko.push(a.t);}}
  AI.busy.prices=false;AI.msg.prices=[ko.length?'am':'ok',`${ok} cours relus et vérifiés${ko.length?' · non actualisés : '+ko.join(', '):''}.`];save();recalc();renderAll();renderAI();toast(AI.msg.prices[1]);}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act="aiprices"]');if(b)aiRefreshPrices();});
