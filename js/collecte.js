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
(async()=>{try{AI.mcp=await claude.use('mcp');}catch(e){AI.mcp=null;}try{AI.sample=await claude.use('sample');}catch(e){AI.sample=null;}if(ui.aiOpen)renderAI();})();
const normTxt=s=>String(s||'').replace(/\s+/g,' ').toLowerCase();
async function aiPage(url){
  await AI.mcp.callTool(AI_HOST,'navigate',{url},{cache:false});
  await new Promise(r=>setTimeout(r,2500));
  const r=await AI.mcp.callTool(AI_HOST,'get_page_text',{max_chars:60000},{cache:false});
  const p=r.payload;let txt=typeof p==='string'?p:(r.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');
  if(!txt&&p&&typeof p==='object')txt=JSON.stringify(p);
  return String(txt||'');
}
function aiErr(e){const c=e&&e.code;return{server_not_connected:"Navigateur intégré non disponible : ouvrez cette page dans l'application Claude (ordinateur).",not_in_manifest:"Accès au navigateur refusé pour cette page.",cancelled:"Ouverture de la page refusée dans l'application Claude.",approval_required:"Autorisation requise dans l'application Claude.",not_granted:"Claude n'est pas autorisé pour cette page : collecte impossible.",rate_limited:"Trop de demandes : réessayez dans quelques minutes.",invalid_json:"La page n'a pas permis d'extraire une valeur lisible.",tool_error:"La page source n'a pas pu être lue ("+(e.message||'')+")."}[c]||("Échec de la collecte"+(c?' ('+c+')':'')+(e&&e.message&&!c?' : '+e.message:''));}
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
    <div class="tw"><table class="tbl"><thead><tr><th>Donnée</th><th>Volet</th><th>Dernière valeur</th><th>Source et consultation</th><th></th></tr></thead><tbody>
    ${T.map(t=>{const x=L[t.k],m=AI.msg[t.k];return`<tr><td><b>${esc(t.l)}</b></td><td class="meta">${t.mod}</td><td class="num">${x?nf(x.v,t.k==='eurusd'?4:3)+(t.unit?' '+t.unit:'')+(x.d?` <span class="meta">au ${fdate(x.d)}</span>`:''):'<span class="meta">jamais collectée</span>'}</td>
      <td class="wrap"><a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(new URL(t.url).hostname)}</a>${x?` · consulté le ${new Date(x.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}${x.quote?`<br><span class="meta">« ${esc(x.quote)} »</span>`:''}`:''}${m?`<br><span class="dot ${m[0]}"></span> <span class="${m[0]==='ko'?'down':''}">${esc(m[1])}</span>`:''}</td>
      <td><button class="btn sm${avail?' pri':''}" data-act="aicol" data-id="${t.k}"${!avail||AI.busy[t.k]?' disabled':''}>${AI.busy[t.k]?'En cours…':'Collecter'}</button></td></tr>`;}).join('')}
    </tbody></table></div>
    <p class="note">La collecte navigue dans l'onglet actif du navigateur intégré. Elle est déclenchée uniquement par un clic, jamais automatiquement, et consomme votre usage Claude.</p></div>`;
}
aiApplyLive();
