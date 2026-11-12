/* ============ v8.6 : routeur de recherche « Claude d'abord, API Anthropic ensuite » ============
   Toute recherche lancée par l'utilisateur (étude de marché, dossier LBO, société, cours) passe :
   1. par Claude dans l'application Claude : navigateur intégré + modèle de l'abonnement, comme dans une conversation, sans jeton d'API ;
   2. sinon par le serveur, avec la clé Anthropic, réservée au compte propriétaire (AI_OWNER_EMAILS) ;
   3. sinon : message clair, saisie au crayon.
   Rien ne part au chargement : uniquement sur clic « Lancer la recherche ». Chaque chiffre retenu est retrouvé dans le texte de sa page. */
const RS={busy:{},last:{}};
const rsWho=()=>typeof AI==='object'&&AI.mcp&&AI.sample?'claude':typeof FLUX==='object'&&FLUX.on?'api':null;
const rsLabel=w=>w==='claude'?'Claude (application, abonnement)':w==='api'?'API Anthropic (jetons du compte)':'indisponible';
/* Recherche web dans le navigateur intégré : page de résultats DuckDuckGo, puis choix des sources par Claude */
async function rsSearch(query,max=3){const txt=await aiPage('https://html.duckduckgo.com/html/?q='+encodeURIComponent(query)),nt=normTxt(txt);
  const j=await AI.sample.json(`Résultats d'une recherche web pour : « ${query} ».\nChoisis au plus ${max} pages les plus fiables (institut statistique, étude sectorielle, fédération professionnelle, régulateur, presse économique), pas de publicité.\nJSON : {"urls":["https://..."]} : adresses complètes telles qu'affichées dans les résultats.\n\n${txt.slice(0,12000)}`,{modelTier:'quick',cache:false});
  return(j&&Array.isArray(j.urls)?j.urls:[]).map(String).filter(u=>/^https?:\/\//.test(u)&&nt.includes(normTxt(u.replace(/^https?:\/\/(www\.)?/,'').split(/[/?#]/)[0]))).slice(0,max);}
/* Lecture de pages et extraction par Claude, chaque extrait cité devant figurer dans la page */
async function rsRead(urls,ask,schema){const pages=[];for(const u of urls){try{const t=await aiPage(u);if(t.length>300)pages.push({u,t});}catch(e){}}
  if(!pages.length)throw new Error('aucune page lisible');
  const j=await AI.sample.json(`${ask}\nN'utilise que le texte des pages ci-dessous ; null si absent ; pour chaque chiffre, donne l'extrait exact (120 caractères au plus) dans "sources":[{"url":"","quote":""}].\nJSON : ${schema}\n\n${pages.map(p=>`=== ${p.u} ===\n${p.t.slice(0,16000)}`).join('\n\n')}`,{modelTier:'default',cache:false});
  const all=normTxt(pages.map(p=>p.t).join(' ')),src=(j&&Array.isArray(j.sources)?j.sources:[]).filter(s=>s&&s.quote&&all.includes(normTxt(s.quote).slice(0,50)));
  if(!j||!src.length)throw new Error('aucun extrait vérifiable dans les pages');
  return{...j,sources:src,read:pages.map(p=>p.u)};}
/* Exécution : Claude d'abord, puis l'API ; le résultat suit le même format dans les deux cas */
async function rsRun(mod,subject,inapp,server){if(RS.busy[mod])return null;RS.busy[mod]=true;rsBar();let out=null,how=null,err=[];
  try{if(rsWho()==='claude'){try{toast(`Recherche lancée par Claude : ${subject}…`);out=await inapp();how='claude';}catch(e){err.push('Claude : '+(e.message||aiErr(e)));}}
    if(!out&&typeof FLUX==='object'&&FLUX.on){try{toast(`Recherche par l'API Anthropic : ${subject}…`);const r=await liveApi('/api/v1/ai/ingest',{method:'POST',body:{module:mod,subject,trigger:'recalc',...server}});out=r.record&&r.record.payload;how=r.cached?'cache':'api';RS.last[mod+'tok']=r.tokens||0;}catch(e){err.push('API : '+e.message);}}
    if(!out){toast(err.length?'Recherche impossible : '+err.join(' ; '):"Recherche indisponible : ouvrez OVERRIDE.DESK dans l'application Claude, ou connectez le backend.");return null;}
    RS.last[mod]={how,at:new Date().toISOString()};return{p:out,how};}
  finally{RS.busy[mod]=false;rsBar();}}

/* ---- Business plan : étude de marché ---- */
async function rsMarket(){const b=S.bp,Z={fr:'France',eu:'Europe',world:'monde'},label=(b.mkt&&b.mkt.label)||`${b.sector||''} ${Z[b.zone]||b.zone||''}`,q=`${label} taille du marché chiffre d'affaires croissance ${new Date().getFullYear()}`;
  const r=await rsRun('bp',label,async()=>{const urls=await rsSearch(q);if(!urls.length)throw new Error('aucune source trouvée');
      return rsRead(urls,`Étude de marché pour : « ${label} ». Donne la taille du marché visé (montant, devise, unité, année), l'historique annuel si disponible et la croissance annuelle moyenne projetée avec son horizon. Un marché mondial ne vaut pas marché national : précise le périmètre.`,
        `{"market_label":"","currency":"EUR","unit":"M","year":2025,"tam":nombre|null,"cagr_pct":nombre|null,"cagr_horizon":"2025-2030"|null,"hist":[{"year":2023,"value":nombre}],"sources":[{"url":"","quote":""}]}`);},{query:q});
  if(!r)return;const p=r.p,M=b.mkt,mul={Md:1000,B:1000,G:1000,M:1,k:0.001}[String(p.unit||'M').replace(/[^A-Za-z]/g,'').slice(0,2)]||1,cur=String(p.currency||'EUR').toUpperCase(),fx=cur==='USD'?1/(typeof FX_EURUSD==='number'?FX_EURUSD:1.1):1;
  const toM=v=>isFinite(+v)&&v!==null?+(v*mul*fx).toFixed(1):null;let n=0;
  (p.hist||[]).forEach(h=>{const v=toM(h.value);if(!v||!isFinite(+h.year))return;const e=M.hist.find(x=>x.y===+h.year);if(e)e.v=v;else M.hist.push({y:+h.year,v,q:null});n++;});M.hist.sort((a,c)=>a.y-c.y);
  if(toM(p.tam)){b.tamOv=toM(p.tam);b.tamAI=true;}if(isFinite(+p.cagr_pct)&&p.cagr_pct!==null){b.cagrOv=+(+p.cagr_pct).toFixed(2);b.cagrAI=true;}
  const urls=[...new Set((p.sources||[]).map(s=>s.url).filter(Boolean))];M.src=urls.join(' ; ');b.mktAI={how:r.how,at:new Date().toISOString(),label:p.market_label||label,quotes:(p.sources||[]).slice(0,4)};
  save();recalc();renderAll();toast(`Étude de marché (${rsLabel(r.how==='cache'?'api':r.how)}) : ${toM(p.tam)?'TAM '+nf(toM(p.tam),0)+' M€':'taille non trouvée'}${b.cagrAI?' · TCAM '+nf(b.cagrOv,1)+' %':''}${n?' · '+n+' année(s) d\'historique':''} · ${urls.length} source(s) citée(s)`);}

/* ---- Dossier LBO : Euribor 3 mois et multiple sectoriel ---- */
async function rsLbo(){const d=typeof lboCur==='function'?lboCur():null;if(!d){toast('Aucun dossier LBO ouvert');return;}const sec=d.sec||String(d.name||'secteur').replace(/^LBO /,''),q=`multiple VE/EBITDA médian secteur ${sec} Europe ${new Date().getFullYear()}`;
  const r=await rsRun('lbo',sec,async()=>{const urls=['https://www.euribor-rates.eu/fr/taux-euribor-actuels/2/euribor-taux-3-mois/',...await rsSearch(q,2)];
      return rsRead(urls,`Paramètres de marché d'un LBO dans le secteur « ${sec} » : dernier Euribor 3 mois publié (en %) et sa date ; multiple VE/EBITDA médian ou moyen du secteur, avec sa source.`,
        `{"euribor_3m_pct":nombre|null,"euribor_date":"AAAA-MM-JJ"|null,"sector_label":"","sector_ev_ebitda":nombre|null,"sector_source":"","sources":[{"url":"","quote":""}]}`);},{query:q});
  if(!r)return;const p=r.p,P=d.p;let msg=[];
  if(isFinite(+p.euribor_3m_pct)&&p.euribor_3m_pct!==null&&+p.euribor_3m_pct>-1&&+p.euribor_3m_pct<15){P.euribor=+(+p.euribor_3m_pct).toFixed(3);LBO_SRC.euribor={v:P.euribor,d:fdate(/^\d{4}-\d{2}-\d{2}$/.test(String(p.euribor_date))?p.euribor_date:new Date().toISOString().slice(0,10)),s:'euribor-rates.eu (recherche '+(r.how==='claude'?'Claude':'API')+')'};msg.push('Euribor 3 mois '+nf(P.euribor,3)+' %');}
  if(isFinite(+p.sector_ev_ebitda)&&+p.sector_ev_ebitda>1&&+p.sector_ev_ebitda<60){P.entryMult=+(+p.sector_ev_ebitda).toFixed(1);d.multSrc=`${p.sector_label||sec} : ${nf(P.entryMult,1)}× (${p.sector_source||'source citée'})`;msg.push('multiple d\'entrée '+nf(P.entryMult,1)+'×');}
  d.rsAI={how:r.how,at:new Date().toISOString(),quotes:(p.sources||[]).slice(0,4)};save();recalc();renderAll();
  toast(msg.length?`Dossier LBO (${rsLabel(r.how==='cache'?'api':r.how)}) : ${msg.join(' · ')}. Multiple de sortie inchangé : à fixer au crayon.`:'Aucune valeur vérifiable trouvée : paramètres inchangés');}

/* ---- Barre « Lancer la recherche » en tête des volets Business plan, Dossier LBO et Analyse financière ---- */
function rsBar(){const M={bp:['Étude de marché du dossier',"Claude cherche et lit les sources publiques (instituts, études, fédérations) : taille du marché, historique, croissance projetée",'rsbp'],
    lbo:['Paramètres de marché du LBO','Euribor 3 mois et multiple VE/EBITDA du secteur, sources citées','rslbo'],an:['Comptes et cours de la société','Comptes recoupés MarketScreener / stockanalysis, cours recoupé Google Finance / TradingView','aifund']}[ui.tab];
  const P=document.getElementById('p-'+ui.tab);if(!P)return;let el=P.querySelector(':scope>.rsbar');if(!M){if(el)el.remove();return;}
  if(!el){el=document.createElement('div');el.className='rsbar noprint';P.insertBefore(el,P.firstChild);}
  const w=rsWho(),last=RS.last[ui.tab==='an'?'an':ui.tab],info=ui.tab==='bp'&&S.bp.mktAI?S.bp.mktAI:ui.tab==='lbo'&&typeof lboCur==='function'&&lboCur()&&lboCur().rsAI?lboCur().rsAI:null;
  el.innerHTML=`<span class="dot ${w?'ok':'ko'}"></span><div><b>${M[0]}</b><span class="meta">${M[1]} · moteur : ${rsLabel(w)}${info?` · dernière recherche le ${new Date(info.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} (${info.how==='claude'?'Claude':'API'})`:''}</span></div>
    <button class="btn sm pri" data-act="${M[2]}" data-id="${ui.tab==='an'?esc(ui.tk):''}"${!w||RS.busy[ui.tab]?' disabled':''}>${RS.busy[ui.tab]?'Recherche en cours…':'Lancer la recherche'}</button>`;}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;if(b.dataset.act==='rsbp')rsMarket();else if(b.dataset.act==='rslbo')rsLbo();});
{const _r=renderAll;renderAll=function(){_r.apply(this,arguments);try{rsBar();}catch(e){console.error('rs',e);}};}
/* Les comptes et cours d'une société suivent la même règle : Claude, sinon l'API (lecture serveur des pages publiques) */
if(typeof aiRefreshFund==='function'){const _f=aiRefreshFund;aiRefreshFund=async function(k){if(rsWho()==='claude')return _f(k);
  const a=S.an.assets[k];if(!a)return;const r=await rsRun('an',a.t,async()=>{throw new Error('Claude indisponible');},{});
  if(r&&r.p&&Array.isArray(r.p.revenue)){const x=anApply(a,r.p,(r.p.sources||[]).map(s=>s.url).join(' ; '));a.fundSrc='API Anthropic · pages publiques, lecture du '+fdate(new Date().toISOString().slice(0,10));save();recalc();renderAll();toast(`${a.t} : comptes chargés par l'API${x.missing.length?' · à compléter : '+x.missing.join(', '):''}`);}};}
