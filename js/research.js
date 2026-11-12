/* ============ v8.7 : ingestion hybride « Claude client d'abord, backend en repli » ============
   Déclenchement paresseux, un module à la fois (jamais de rafraîchissement global) :
   - [Recalculer] ou « Lancer la recherche » sur le volet affiché (Module 1 BP, LBO, Module 2 Analyse, Module 5 Commodities) ;
   - initialisation d'un nouveau dossier (trigger « init »).
   Ordre des moteurs :
   1. Claude dans l'application Claude (navigateur intégré + modèle de l'abonnement) : 0 jeton pour l'infrastructure ;
   2. repli automatique (indisponible, erreur ou délai dépassé) sur le backend :
      a. cache Supabase d'abord (0 jeton) : toujours à l'initialisation, et sur Recalculer seulement si Claude n'a rien rendu et que l'appel échoue ;
      b. clé Anthropic personnelle de l'utilisateur (BYOK, chiffrée côté serveur) : 0 jeton pour l'infrastructure ;
      c. clé de l'infrastructure, réservée au(x) compte(s) propriétaire(s) (AI_OWNER_EMAILS) ;
   3. sinon : message clair, saisie au crayon.
   Chaque chiffre retenu doit être cité par un extrait retrouvé dans la page lue. */
const RS={busy:{},last:{},eng:{},key:null,keyLoading:false};
const RS_TO=120000;   // délai maximal accordé à Claude avant le repli sur le backend (latence de la passerelle)
const RS_MOD={bp:'Business plan',lbo:'Dossier LBO',an:'Analyse financière',cm:'Commodities & macro'};
const rsClaude=()=>typeof AI==='object'&&!!AI.mcp&&!!AI.sample;
const rsSrv=()=>typeof FLUX==='object'&&FLUX.on?(RS.key&&RS.key.has?'byok':RS.key&&RS.key.infra===false?null:'infra'):null;
const rsWho=()=>rsClaude()?'claude':rsSrv();
const rsChain=()=>[rsClaude()?'claude':null,typeof FLUX==='object'&&FLUX.on?'cache':null,rsSrv()].filter(Boolean);
const rsLabel=w=>({claude:'Claude (application, votre abonnement)',byok:'API Anthropic (votre clé)',infra:'API Anthropic (clé du serveur)',api:'API Anthropic',cache:'base Supabase (0 jeton)'})[w]||'indisponible';
const rsShort=w=>({claude:'Claude',byok:'votre clé',infra:'clé serveur',api:'API',cache:'cache'})[w]||w;
function rsTimeout(p,ms,who){let t;return Promise.race([p,new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error(`${who} ne répond pas (plus de ${Math.round(ms/1000)} s)`)),ms);})]).finally(()=>clearTimeout(t));}

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

/* Exécution hybride d'un module. Renvoie {p, how} (how : claude | cache | byok | infra) ou null. */
async function rsRun(mod,subject,inapp,server,trigger){trigger=trigger==='init'?'init':'recalc';if(RS.busy[mod])return null;
  RS.busy[mod]=true;RS.eng[mod]=rsWho()||'cache';rsBar();rsHdr();let out=null,how=null,err=[];
  try{
    /* Initialisation d'un dossier : la base d'abord, servie à 0 jeton si une extraction valide existe */
    if(trigger==='init'&&typeof FLUX==='object'&&FLUX.on){try{const c=await liveApi(`/api/v1/ai/ingest?module=${mod}&subject=${encodeURIComponent(subject)}`);
      if(c&&c.record&&c.record.payload&&!c.stale){out=c.record.payload;how='cache';}}catch(e){}}
    /* Priorité 1 : Claude côté client */
    if(!out&&rsClaude()){RS.eng[mod]='claude';rsHdr();try{if(trigger==='recalc')toast(`${RS_MOD[mod]} : recherche lancée par Claude (${subject})…`);out=await rsTimeout(inapp(),RS.to||RS_TO,'Claude');how='claude';}
      catch(e){err.push('Claude : '+(e.message||aiErr(e)));}}
    /* Priorité 2 : backend (cache, puis votre clé, puis la clé du serveur) ; Recalculer force un nouvel appel */
    if(!out&&typeof FLUX==='object'&&FLUX.on){RS.eng[mod]=rsSrv()||'cache';rsHdr();
      try{if(err.length||trigger==='recalc')toast(`${RS_MOD[mod]} : ${err.length?'Claude indisponible, repli sur ':''}${rsLabel(rsSrv()||'cache')}…`);
        const r=await liveApi('/api/v1/ai/ingest',{method:'POST',body:{module:mod,subject,trigger,force:trigger==='recalc',...server}});
        out=r.record&&r.record.payload;how=r.cached?'cache':(r.engine||rsSrv()||'infra');RS.last[mod+'tok']=r.tokens||0;}
      catch(e){err.push('Backend : '+e.message);
        /* Dernier recours : la dernière extraction stockée, même ancienne, signalée comme telle */
        try{const c=await liveApi(`/api/v1/ai/ingest?module=${mod}&subject=${encodeURIComponent(subject)}`);if(c&&c.record&&c.record.payload){out=c.record.payload;how='cache';err.push('extraction en base du '+fdate(String(c.record.timestamp_retrieved).slice(0,10))+' servie');}}catch(x){}}}
    if(!out){if(trigger==='recalc')toast(err.length?`${RS_MOD[mod]} : recherche impossible (${err.join(' ; ')})`:`${RS_MOD[mod]} : aucun moteur disponible. Ouvrez OVERRIDE.DESK dans l'application Claude, ou connectez le backend.`);return null;}
    RS.last[mod]={how,at:new Date().toISOString(),err};return{p:out,how};}
  finally{RS.busy[mod]=false;rsBar();rsHdr();}}

/* ---- Module 1 : business plan, étude de marché ---- */
async function rsMarket(trigger){const b=S.bp,Z={fr:'France',eu:'Europe',world:'monde'},sl=(typeof SECT==='object'&&SECT[b.sector]&&SECT[b.sector].l)||b.sector||'',
    label=((b.mkt&&b.mkt.label)||`${sl} ${Z[b.zone]||b.zone||''}`).trim(),q=`${label} taille du marché chiffre d'affaires croissance ${new Date().getFullYear()}`;
  if(!label){if(trigger!=='init')toast('Renseignez le secteur et la zone du dossier avant la recherche');return;}
  const r=await rsRun('bp',label,async()=>{const urls=await rsSearch(q);if(!urls.length)throw new Error('aucune source trouvée');
      return rsRead(urls,`Étude de marché pour : « ${label} ». Donne la taille du marché visé (montant, devise, unité, année), l'historique annuel si disponible et la croissance annuelle moyenne projetée avec son horizon. Un marché mondial ne vaut pas marché national : précise le périmètre.`,
        `{"market_label":"","currency":"EUR","unit":"M","year":2025,"tam":nombre|null,"cagr_pct":nombre|null,"cagr_horizon":"2025-2030"|null,"hist":[{"year":2023,"value":nombre}],"sources":[{"url":"","quote":""}]}`);},{query:q},trigger);
  if(!r)return;const p=r.p,M=b.mkt,mul={Md:1000,B:1000,G:1000,M:1,k:0.001}[String(p.unit||'M').replace(/[^A-Za-z]/g,'').slice(0,2)]||1,cur=String(p.currency||'EUR').toUpperCase(),fx=cur==='USD'?1/(typeof FX_EURUSD==='number'?FX_EURUSD:1.1):1;
  const toM=v=>v!==null&&v!==undefined&&isFinite(+v)?+(v*mul*fx).toFixed(1):null;let n=0;
  (p.hist||[]).forEach(h=>{const v=toM(h.value);if(!v||!isFinite(+h.year))return;const e=M.hist.find(x=>x.y===+h.year);if(e)e.v=v;else M.hist.push({y:+h.year,v,q:null});n++;});M.hist.sort((a,c)=>a.y-c.y);
  if(toM(p.tam)){b.tamOv=toM(p.tam);b.tamAI=true;}if(p.cagr_pct!==null&&p.cagr_pct!==undefined&&isFinite(+p.cagr_pct)){b.cagrOv=+(+p.cagr_pct).toFixed(2);b.cagrAI=true;}
  const urls=[...new Set((p.sources||[]).map(s=>s.url).filter(Boolean))];M.src=urls.join(' ; ');b.mktAI={how:r.how,at:new Date().toISOString(),label:p.market_label||label,quotes:(p.sources||[]).slice(0,4)};
  save();recalc();renderAll();toast(`Étude de marché (${rsLabel(r.how)}) : ${toM(p.tam)?'TAM '+nf(toM(p.tam),0)+' M€':'taille non trouvée'}${b.cagrAI?' · TCAM '+nf(b.cagrOv,1)+' %':''}${n?' · '+n+' année(s) d\'historique':''} · ${urls.length} source(s) citée(s)`);}

/* ---- Dossier LBO : Euribor 3 mois et multiple sectoriel ---- */
async function rsLbo(trigger){const d=typeof lboCur==='function'?lboCur():null;if(!d){if(trigger!=='init')toast('Aucun dossier LBO ouvert');return;}const sec=d.sec||String(d.name||'secteur').replace(/^LBO /,''),q=`multiple VE/EBITDA médian secteur ${sec} Europe ${new Date().getFullYear()}`;
  const r=await rsRun('lbo',sec,async()=>{const urls=['https://www.euribor-rates.eu/fr/taux-euribor-actuels/2/euribor-taux-3-mois/',...await rsSearch(q,2)];
      return rsRead(urls,`Paramètres de marché d'un LBO dans le secteur « ${sec} » : dernier Euribor 3 mois publié (en %) et sa date ; multiple VE/EBITDA médian ou moyen du secteur, avec sa source.`,
        `{"euribor_3m_pct":nombre|null,"euribor_date":"AAAA-MM-JJ"|null,"sector_label":"","sector_ev_ebitda":nombre|null,"sector_source":"","sources":[{"url":"","quote":""}]}`);},{query:q},trigger);
  if(!r)return;const p=r.p,P=d.p;let msg=[];
  if(p.euribor_3m_pct!==null&&isFinite(+p.euribor_3m_pct)&&+p.euribor_3m_pct>-1&&+p.euribor_3m_pct<15){P.euribor=+(+p.euribor_3m_pct).toFixed(3);LBO_SRC.euribor={v:P.euribor,d:fdate(/^\d{4}-\d{2}-\d{2}$/.test(String(p.euribor_date))?p.euribor_date:new Date().toISOString().slice(0,10)),s:'euribor-rates.eu (recherche '+rsShort(r.how)+')'};msg.push('Euribor 3 mois '+nf(P.euribor,3)+' %');}
  if(isFinite(+p.sector_ev_ebitda)&&+p.sector_ev_ebitda>1&&+p.sector_ev_ebitda<60){P.entryMult=+(+p.sector_ev_ebitda).toFixed(1);d.multSrc=`${p.sector_label||sec} : ${nf(P.entryMult,1)}× (${p.sector_source||'source citée'})`;msg.push('multiple d\'entrée '+nf(P.entryMult,1)+'×');}
  d.rsAI={how:r.how,at:new Date().toISOString(),quotes:(p.sources||[]).slice(0,4)};save();recalc();renderAll();
  toast(msg.length?`Dossier LBO (${rsLabel(r.how)}) : ${msg.join(' · ')}. Multiple de sortie inchangé : à fixer au crayon.`:'Aucune valeur vérifiable trouvée : paramètres inchangés');}

/* ---- Module 2 : analyse financière, comptes et cours de la fiche affichée ---- */
const _rsFund=typeof aiRefreshFund==='function'?aiRefreshFund:null;
async function rsAn(trigger,k){k=k||ui.tk;const a=S.an.assets[k];if(!a)return;
  const r=await rsRun('an',a.t,async()=>{if(!_rsFund)throw new Error('lecture des comptes absente');await _rsFund(k);
      try{const p=await srcPriceChecked(k);if(p.ok&&!a.pxManual){a.price=p.v;a.pxDate=fdate(p.d);a.pxSrc=(p.single?'Non recoupé · ':'Recoupé · ')+p.by.join(' et ')+', lecture Claude du '+fdate(new Date().toISOString().slice(0,10));save();recalc();renderAll();}}catch(e){}
      return{done:true};},{},trigger);
  if(!r||r.p.done)return;const p=r.p;
  if(Array.isArray(p.revenue)&&p.revenue.length){const x=anApply(a,p,(p.sources||[]).map(s=>s.url).join(' ; '));a.fundSrc=`${rsLabel(r.how)} · pages publiques, lecture du ${fdate(new Date().toISOString().slice(0,10))}`;
    save();recalc();renderAll();toast(`${a.t} : comptes chargés (${rsLabel(r.how)})${x.missing.length?' · à compléter : '+x.missing.join(', '):''}`);}
  else toast(`${a.t} : aucun compte exploitable dans la réponse`);}
if(_rsFund)aiRefreshFund=k=>rsAn('recalc',k);

/* ---- Module 5 : commodities, dernier cours comptant de l'actif affiché, recoupé entre deux sites ---- */
const RS_CM={brent:{n:'Brent (ICE)',t:'UKOIL',tv:'TVC-UKOIL',inv:'brent-oil'},wti:{n:'WTI (NYMEX)',t:'USOIL',tv:'TVC-USOIL',inv:'crude-oil'},gold:{n:'Or (once troy)',t:'GOLD',tv:'TVC-GOLD',inv:'gold'},silver:{n:'Argent (once troy)',t:'SILVER',tv:'TVC-SILVER',inv:'silver'}};
const rsCmLast=k=>{try{const s=cmSeries(),a=s[k]||[];for(let i=a.length-1;i>=0;i--)if(a[i]!==null&&isFinite(a[i]))return{d:s.d[i],v:+a[i]};}catch(e){}return null;};
async function rsCm(trigger){const k=(ui.cmA&&RS_CM[ui.cmA])?ui.cmA:'brent',I=RS_CM[k],last=rsCmLast(k);
  const r=await rsRun('cm',k,async()=>{const S0=[{n:'TradingView',u:`https://www.tradingview.com/symbols/${I.tv}/`},{n:'Investing.com',u:`https://www.investing.com/commodities/${I.inv}`}],got=[],err=[];
      for(const s of S0){try{got.push(await srcPrice(s,{n:I.n,t:I.t,cur:'USD'}));}catch(e){err.push(s.n+' : '+(e.message||aiErr(e)));}}
      if(!got.length)throw new Error('cours non lu ('+err.join(' ; ')+')');
      const ok=got.length>1&&Math.abs(got[0].v/got[1].v-1)<=0.015;if(got.length>1&&!ok)throw new Error(`sources en désaccord : ${got.map(g=>g.n+' '+nf(g.v,2)).join(', ')}`);
      const g=got.sort((x,y)=>x.d<y.d?1:-1)[0];return{instrument:k,rows:[{date:g.d,close:g.v}],checked:ok,by:got.map(x=>x.n),sources:got.map(x=>({url:x.u,quote:String(x.v)}))};},{},trigger);
  if(!r)return;const rows=(r.p.rows||[]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x.date))&&isFinite(+x.close)&&+x.close>0)
    /* Garde-fou : un cours à plus de 35 % du dernier connu est écarté (mauvaise page, mauvaise unité) */
    .filter(x=>!last||Math.abs(+x.close/last.v-1)<=0.35);
  if(!rows.length){toast(`${I.n} : aucun cours plausible dans la réponse${last?' (dernier connu '+nf(last.v,2)+')':''}`);return;}
  S.cm.add=S.cm.add||{};S.cm.add[k]=S.cm.add[k]||{};rows.slice(-60).forEach(x=>{S.cm.add[k][x.date]=[+x.close,null,null];});
  const top=rows[rows.length-1];S.cm.rsAI=S.cm.rsAI||{};S.cm.rsAI[k]={how:r.how,at:new Date().toISOString(),v:+top.close,d:top.date,by:r.p.by||[],checked:!!r.p.checked};
  save();recalc();renderAll();toast(`${I.n} : ${nf(+top.close,2)} $ au ${fdate(top.date)} (${rsLabel(r.how)}${r.p.by?' · '+(r.p.checked?'recoupé ':'source unique : ')+r.p.by.join(' et '):''})`);}

/* ---- Routage par volet : remplace l'ingestion serveur directe de la v8 (même nom, mêmes appels) ---- */
const RS_RUN={bp:t=>rsMarket(t),lbo:t=>rsLbo(t),an:t=>rsAn(t),cm:t=>rsCm(t)};
liveIngest=async function(mod,trigger){const m=RS_RUN[mod]?mod:RS_RUN[ui.tab]?ui.tab:null;if(!m)return null;   // portefeuille, sélecteur, journal : rien à rechercher
  if(trigger!=='init'&&!rsWho()&&!(typeof FLUX==='object'&&FLUX.on))return null;                       // aucun moteur : Recalculer reste un calcul local
  return RS_RUN[m](trigger==='init'?'init':'recalc');};

/* ---- Barre « Lancer la recherche » en tête des volets concernés ---- */
function rsBar(){const M={bp:['Étude de marché du dossier',"Taille du marché, historique, croissance projetée, sources publiques citées",'rsbp'],
    lbo:['Paramètres de marché du LBO','Euribor 3 mois et multiple VE/EBITDA du secteur, sources citées','rslbo'],an:['Comptes et cours de la société','Comptes recoupés MarketScreener / stockanalysis, cours recoupé Google Finance / TradingView','rsan'],
    cm:['Cours comptant de l\'actif affiché','Dernier cours lu sur TradingView et Investing.com, recoupé à 1,5 %','rscm']}[ui.tab];
  const P=document.getElementById('p-'+ui.tab);if(!P)return;let el=P.querySelector(':scope>.rsbar');if(!M){if(el)el.remove();return;}
  if(!el){el=document.createElement('div');el.className='rsbar noprint';P.insertBefore(el,P.firstChild);}
  const ch=rsChain(),busy=RS.busy[ui.tab],info=ui.tab==='bp'?S.bp.mktAI:ui.tab==='lbo'?(typeof lboCur==='function'&&lboCur()?lboCur().rsAI:null):ui.tab==='cm'?((S.cm.rsAI||{})[ui.cmA]||null):RS.last.an;
  el.innerHTML=`<span class="dot ${busy?'am pulse':ch.length?'ok':'ko'}"></span><div><b>${M[0]}</b><span class="meta">${M[1]} · ${busy?'en cours : '+rsLabel(RS.eng[ui.tab]):'moteurs : '+(ch.length?ch.map(rsShort).join(' → '):'aucun (lecture seule)')}${info&&info.at?` · dernière recherche le ${new Date(info.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} (${rsShort(info.how)})`:''}</span></div>
    <button class="btn sm pri" data-act="${M[2]}" data-id="${ui.tab==='an'?esc(ui.tk):''}"${!ch.length||busy?' disabled':''}>${busy?'Recherche en cours…':'Lancer la recherche'}</button>`;}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='rsbp')rsMarket('recalc');else if(a==='rslbo')rsLbo('recalc');else if(a==='rsan')rsAn('recalc',b.dataset.id||ui.tk);else if(a==='rscm')rsCm('recalc');
  else if(a==='rskeysave')rsKeySave();else if(a==='rskeydel')rsKeyDel();});

/* ---- Voyant « Collecte IA » de l'en-tête : vert prêt, orange pulsé pendant une ingestion, rouge sans moteur ---- */
if(typeof aiState==='function'){const _as=aiState;aiState=function(){const b=Object.keys(RS.busy).filter(k=>RS.busy[k]);
  if(b.length)return['am pulse',`Collecte IA en cours : ${b.map(k=>RS_MOD[k]+' ('+rsLabel(RS.eng[k])+')').join(', ')}`];
  const ch=rsChain();if(ch.length)return['ok',`Collecte IA prête · ordre des moteurs : ${ch.map(rsLabel).join(' → ')} · déclenchée par Recalculer, Lancer la recherche ou l'ouverture d'un dossier, un volet à la fois`];return _as();};}
function rsHdr(){const el=document.getElementById('aiBtn');if(!el||typeof aiState!=='function')return;const st=aiState();el.innerHTML=`<span class="dot ${st[0]}"></span><span class="lbl">Collecte IA</span>`;el.title=st[1];}

/* ---- Clé Anthropic personnelle (BYOK) : enregistrée chiffrée par le backend, jamais conservée dans la page ---- */
async function rsKeyLoad(){if(RS.keyLoading||!(typeof FLUX==='object'&&FLUX.on))return;RS.keyLoading=true;try{RS.key=await liveApi('/api/v1/ai/key');}catch(e){RS.key={has:false,err:e.message};}finally{RS.keyLoading=false;}rsBar();rsHdr();renderAI();}
async function rsKeySave(){const i=document.getElementById('rsKeyIn'),k=i?String(i.value).trim():'';if(!/^sk-ant-[A-Za-z0-9_\-]{30,}$/.test(k)){toast('Clé Anthropic attendue (sk-ant-…)');return;}
  try{RS.key=Object.assign({},RS.key,await liveApi('/api/v1/ai/key',{method:'POST',body:{key:k}}));toast('Clé enregistrée et chiffrée côté serveur : vos recherches de repli utilisent désormais vos propres jetons');}
  catch(e){toast('Enregistrement impossible : '+e.message);}if(i)i.value='';renderAI();rsBar();rsHdr();}
async function rsKeyDel(){try{RS.key=Object.assign({},RS.key,await liveApi('/api/v1/ai/key',{method:'DELETE'}));toast('Clé supprimée');}catch(e){toast('Suppression impossible : '+e.message);}renderAI();rsBar();rsHdr();}
if(typeof renderAI==='function'){const _ra=renderAI;renderAI=function(){_ra.apply(this,arguments);const el=document.getElementById('ai');if(!el||el.hidden)return;const box=el.querySelector('.ai-box'),h=box&&box.querySelector('.ai-h');if(!h)return;
  const on=typeof FLUX==='object'&&FLUX.on,K=RS.key||{},row=(ok,t,d)=>`<li><span class="dot ${ok?'ok':'ko'}"></span><b>${t}</b><span class="meta">${d}</span></li>`;
  const d=document.createElement('div');d.className='rskey';
  d.innerHTML=`<b>Moteurs de recherche, dans l'ordre</b><ol>
    ${row(rsClaude(),'1. Claude, votre application',rsClaude()?'actif : navigateur intégré et modèle de votre abonnement, 0 jeton pour le serveur':'indisponible ici : ouvrez la page dans l\'application Claude (ordinateur)')}
    ${row(on,'2. Base Supabase',on?'extractions déjà stockées, servies à 0 jeton à l\'ouverture d\'un dossier':'backend non connecté')}
    ${row(on&&K.has,'3. API Anthropic, votre clé',on?(K.has?`clé ••••${esc(K.last4||'')} enregistrée le ${fdate(String(K.updated_at||'').slice(0,10))}, chiffrée côté serveur`:'aucune clé personnelle'):'backend non connecté')}
    ${row(on&&K.infra!==false,'4. API Anthropic, clé du serveur',on?(K.infra===false?'non configurée':'réservée au(x) compte(s) propriétaire(s)'):'backend non connecté')}</ol>
    ${on?`<div class="rskey-f"><input id="rsKeyIn" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-… (votre clé Anthropic, facultatif)" aria-label="Votre clé Anthropic"><button class="btn sm pri" data-act="rskeysave">Enregistrer</button>${K.has?'<button class="btn sm" data-act="rskeydel">Supprimer</button>':''}</div>`:''}
    <p class="meta">Délai accordé à Claude : ${RS_TO/1000} s, puis repli automatique. Un seul volet est interrogé à la fois.</p>`;
  h.after(d);};}
{const _r=renderAll;renderAll=function(){_r.apply(this,arguments);try{rsBar();if(typeof FLUX==='object'&&FLUX.on&&RS.key===null&&!RS.keyLoading)rsKeyLoad();}catch(e){console.error('rs',e);}};}
