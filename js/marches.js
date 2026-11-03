/* ============ Volet 5 : sélecteur universel d'actifs du graphique principal ============ */
/* Chaque actif a une clé de stockage : les séries du classeur TRADING_Dashboard (Brent, WTI, Or, Argent, USD/CNH, S&P 500)
   sont réutilisées telles quelles ; les autres se chargent par import CSV, par le navigateur de l'application Claude
   (page d'historique Investing.com lue puis vérifiée), ou par le flux live du backend. Aucune série n'est inventée. */
const MKT_GROUPS=[
  ['Commodités',[['brent','Brent','brent','commodities/brent-oil'],['wti','WTI','wti','commodities/crude-oil'],['gold','Or','gold','commodities/gold'],['silver','Argent','silver','commodities/silver'],['copper','Cuivre',null,'commodities/copper'],['natgas','Gaz naturel',null,'commodities/natural-gas']]],
  ['Devises',[['eurusd','EUR/USD',null,'currencies/eur-usd'],['gbpusd','GBP/USD',null,'currencies/gbp-usd'],['usdjpy','USD/JPY',null,'currencies/usd-jpy'],['usdcnh','USD/CNH','cnh','currencies/usd-cnh'],['audusd','AUD/USD',null,'currencies/aud-usd'],['usdcad','USD/CAD',null,'currencies/usd-cad']]],
  ['Indices',[['spx','S&P 500','spx','indices/us-spx-500'],['ndx','Nasdaq 100',null,'indices/nq-100'],['dji','Dow Jones',null,'indices/us-30'],['dax','DAX 40',null,'indices/germany-30'],['cac','CAC 40',null,'indices/france-40'],['nkx','Nikkei 225',null,'indices/japan-ni225']]]];
/* Pages d'historique proposées pour quelques actions : à vérifier, modifiables dans le panneau de chargement. */
const MKT_STOCK_URL={AAPL:'equities/apple-computer-inc',INTC:'equities/intel-corp',TTE:'equities/total',MC:'equities/lvmh'};
const MKT_COLORS=['#5B9BD5','#E0B04A','#9F7AEA','#4FB286','#E07A5F','#7DD3FC'];
function mktStocks(){if(!S.mktStocks)S.mktStocks=['AAPL','TTE','MC','INTC'];return S.mktStocks;}
function mktAll(){const m={};MKT_GROUPS.forEach(([g,L])=>L.forEach(([k,l,loc,u])=>m[k]={k,l,g,loc,url:'https://fr.investing.com/'+u+'-historical-data'}));
  mktStocks().forEach(t=>{const k='stk_'+t;m[k]={k,l:t+((S.an&&S.an.assets&&S.an.assets[t])?' · '+S.an.assets[t].n:''),g:'Actions',loc:null,url:(S.mktUrl&&S.mktUrl[k])||(MKT_STOCK_URL[t]?'https://fr.investing.com/'+MKT_STOCK_URL[t]+'-historical-data':'')};});
  Object.keys(m).forEach(k=>{if(S.mktUrl&&S.mktUrl[k])m[k].url=S.mktUrl[k];});return m;}
const mktStore=k=>{const a=mktAll()[k];return a&&a.loc?a.loc:k;};
/* Points {time,value} triés : classeur + imports CSV + navigateur + flux live */
function mktPts(k){const st=mktStore(k),m=new Map();
  if(typeof CMD==='object'&&CMD[st+'C'])CMD.d.forEach((d,i)=>{const v=CMD[st+'C'][i];if(v!==null&&isFinite(v))m.set(d,v);});
  Object.entries((S.cm.add||{})[st]||{}).forEach(([d,r])=>{const v=Array.isArray(r)?r[0]:r;if(isFinite(+v))m.set(d,+v);});
  return[...m.entries()].sort((a,b)=>a[0]<b[0]?-1:1).map(([time,value])=>({time,value}));}
function mktX(){if(!ui.cmX)ui.cmX={main:ui.cmA||'brent',cmp:[],b100:false};if(!Array.isArray(ui.cmX.cmp))ui.cmX.cmp=[];return ui.cmX;}
/* Brent/WTI, Or et Argent pilotent aussi l'analyse (signaux, tableaux) : on garde les deux sélecteurs alignés. */
const MKT_TO_CMA={brent:'brent',wti:'brent',gold:'gold',silver:'silver'};
function mktSetMain(k){const X=mktX();X.main=k;X.cmp=X.cmp.filter(c=>c!==k);if(MKT_TO_CMA[k])ui.cmA=MKT_TO_CMA[k];}
function mktOptions(sel,skip){const A=mktAll(),groups=[...MKT_GROUPS.map(g=>g[0]),'Actions'];
  return groups.map(g=>`<optgroup label="${g}">${Object.values(A).filter(a=>a.g===g&&!(skip||[]).includes(a.k)).map(a=>`<option value="${a.k}"${a.k===sel?' selected':''}>${esc(a.l)}${mktPts(a.k).length?'':' (à charger)'}</option>`).join('')}</optgroup>`).join('');}
function mktBar(){const X=mktX(),A=mktAll();
  return`<div class="mkt-bar noprint">
    <label class="mkt-f"><span>Actif affiché</span><select class="f" data-act="mktmain" aria-label="Actif du graphique principal">${mktOptions(X.main)}</select></label>
    <label class="mkt-f"><span>Superposer</span><select class="f" data-act="mktadd" aria-label="Ajouter un actif en superposition"><option value="">Ajouter un actif…</option>${mktOptions('',[X.main,...X.cmp])}</select></label>
    <label class="mkt-f mkt-tk"><span>Action (ticker)</span><span class="row" style="gap:4px;flex-wrap:nowrap"><input class="f" id="mktTk" placeholder="ex. NVDA" maxlength="12" aria-label="Ajouter une action par ticker"><button class="btn sm" data-act="mkttk">Ajouter</button></span></label>
    <button class="chip" data-act="mktb100" aria-pressed="${!!X.b100}" title="Rebase chaque courbe à 100 à la première séance commune">Base 100</button>
    ${X.cmp.length?`<div class="chips" style="margin:0">${X.cmp.map((k,j)=>`<span class="chip on mkt-c" style="--c:${MKT_COLORS[j%MKT_COLORS.length]}"><i></i>${esc((A[k]||{l:k}).l)}${mktPts(k).length?'':' · à charger'}<button class="x" data-act="mktdel" data-id="${k}" aria-label="Retirer ${esc((A[k]||{l:k}).l)}">×</button></span>`).join('')}</div>`:''}
  </div>`;}
/* Panneau de chargement pour un actif sans série */
function mktEmpty(k){const a=mktAll()[k]||{l:k,url:''},meta=(S.mktMeta||{})[k],busy=ui.mktBusy===k,msg=(ui.mktMsg||{})[k];
  return`<div class="mkt-empty"><b>${esc(a.l)} : aucune série chargée</b>
    <p class="note" style="margin:6px 0 10px">Trois façons d'alimenter cet actif, toutes tracées avec leur source : importer un export CSV (Investing.com, MetaTrader, courtier), lire la page d'historique dans le navigateur de l'application Claude, ou brancher le flux live (backend, panneau « Flux de données »).</p>
    <label class="mkt-f" style="max-width:640px"><span>Page d'historique (Investing.com ou fichier CSV en ligne)</span><input class="f" data-mkturl="${k}" value="${esc(a.url||'')}" placeholder="https://fr.investing.com/…-historical-data"></label>
    <div class="row" style="margin-top:8px"><button class="btn pri sm" data-act="mktload" data-id="${k}"${busy?' disabled':''}>${busy?'Lecture en cours…':'Charger les cours (navigateur Claude)'}</button><button class="btn sm" data-act="mktcsv" data-id="${k}">Importer un CSV</button></div>
    ${msg?`<p class="note ${msg[0]==='ko'?'down':''}" style="margin:8px 0 0">${esc(msg[1])}</p>`:''}${meta?`<p class="note">Dernier chargement : ${esc(meta.src)}, ${fdate(meta.at.slice(0,10))}</p>`:''}</div>`;}
/* Lecture d'une page d'historique : CSV brut analysé directement, sinon extraction par Claude puis contrôle
   que chaque cours figure bien dans le texte de la page. */
async function mktLoad(k){const A=mktAll(),a=A[k];if(!a)return;const inp=document.querySelector(`[data-mkturl="${k}"]`),url=((inp&&inp.value)||a.url||'').trim();
  ui.mktMsg=ui.mktMsg||{};
  if(!/^https:\/\//.test(url)){ui.mktMsg[k]=['ko',"Renseignez l'adresse https de la page d'historique."];renderAll();return;}
  S.mktUrl=S.mktUrl||{};S.mktUrl[k]=url;
  if(!AI.mcp||!AI.sample){ui.mktMsg[k]=['ko',"Chargement indisponible ici : il fonctionne dans l'application Claude (ordinateur), navigateur intégré activé. Sinon, importez un CSV."];renderAll();return;}
  ui.mktBusy=k;ui.mktMsg[k]=['am','Lecture de la page…'];renderAll();
  try{const txt=await aiPage(url),st=mktStore(k);if(txt.length<120)throw{code:'tool_error',message:'page vide ou bloquée'};
    let n=0,src='';
    if(/^\s*"?date"?[,;]/i.test(txt)){n=cmImport(txt,st);src='CSV lu sur '+new URL(url).hostname;}
    else{const nt=normTxt(txt);
      const j=await AI.sample.json(`Voici le texte d'une page d'historique de cours (source : ${url}).\nExtrais les 30 lignes les plus récentes du tableau des cours quotidiens.\nRéponds uniquement en JSON : {"rows":[{"date":"AAAA-MM-JJ","close":nombre,"open":nombre|null,"chg":nombre|null}]} où close = cours de clôture (« Dernier »), open = ouverture, chg = variation en % (ex. -0,85 % devient -0.85).\nN'invente rien : si le tableau n'apparaît pas, réponds {"rows":[]}.\n\nTEXTE DE LA PAGE :\n${txt.slice(0,40000)}`,{modelTier:'quick',cache:false});
      const rows=(j&&Array.isArray(j.rows)?j.rows:[]).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(String(r.date))&&isFinite(+r.close)&&+r.close>0);
      const dec=v=>{const s=String(v);return Math.min(4,(s.split('.')[1]||'').length||2);};
      const ok=rows.filter(r=>{const v=+r.close,d=dec(r.close),a1=v.toFixed(d),b1=a1.replace('.',','),c1=normTxt(v.toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d}));return nt.includes(a1)||nt.includes(b1)||nt.includes(c1);});
      if(!ok.length)throw{code:'invalid_json'};
      S.cm.add=S.cm.add||{};S.cm.add[st]=S.cm.add[st]||{};ok.forEach(r=>{S.cm.add[st][r.date]=[+r.close,r.open!==null&&isFinite(+r.open)?+r.open:null,r.chg!==null&&isFinite(+r.chg)?+r.chg/100:null];});
      n=ok.length;src=new URL(url).hostname+' (lecture par Claude, '+(rows.length-ok.length)+' ligne(s) rejetée(s))';}
    if(!n)throw{code:'invalid_json'};
    S.mktMeta=S.mktMeta||{};S.mktMeta[k]={src,url,at:new Date().toISOString(),n};
    ui.mktMsg[k]=['ok',n+' séances chargées.'];save();toast(`${a.l} : ${n} séances chargées`);
  }catch(e){ui.mktMsg[k]=['ko',typeof aiErr==='function'?aiErr(e):'Lecture impossible.'];}
  ui.mktBusy=null;renderAll();}
/* Tracé : actif principal, superpositions (échelles propres ou base 100 à la première séance commune).
   Renvoie la fonction de transformation à appliquer aussi à la série principale. */
function mktDraw(ch,X){const A=mktAll(),keys=[X.main,...X.cmp],P={};keys.forEach(k=>P[k]=mktPts(k));
  let tf=k=>P[k];
  if(X.b100){const start=keys.filter(k=>P[k].length).map(k=>P[k][0].time).sort().pop();
    tf=k=>{const L=P[k].filter(x=>x.time>=start);const b=L.length?L[0].value:null;return b?L.map(x=>({time:x.time,value:+(x.value/b*100).toFixed(3)})):[];};}
  X.cmp.forEach((k,j)=>{if(!P[k].length)return;const id=X.b100?'right':(j===0?'left':'cmp_'+k);
    const sr=ch.addLineSeries({priceScaleId:id,color:MKT_COLORS[j%MKT_COLORS.length],lineWidth:1.5,priceLineVisible:false,lastValueVisible:true,title:(A[k]||{l:k}).l});
    if(!X.b100)ch.priceScale(id).applyOptions(j===0?{visible:true,borderColor:'#27272A'}:{visible:false});
    sr.setData(tf(k));});
  return tf;}
/* Interactions du sélecteur */
document.addEventListener('change',e=>{const el=e.target;if(!el.dataset)return;const v=el.value;
  if(el.dataset.act==='mktmain'){mktSetMain(v);save();renderAll();}
  else if(el.dataset.act==='mktadd'&&v){const X=mktX();if(!X.cmp.includes(v)&&v!==X.main)X.cmp.push(v);if(X.cmp.length>6)X.cmp.shift();save();renderAll();}});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const id=b.dataset.id,X=mktX();
  switch(b.dataset.act){
    case 'mktb100':X.b100=!X.b100;save();renderAll();break;
    case 'mktdel':X.cmp=X.cmp.filter(k=>k!==id);save();renderAll();break;
    case 'mktload':mktLoad(id);break;
    case 'mktcsv':ui.cmInst=mktStore(id);ui.cmImp=true;document.getElementById('cmFile').click();break;
    case 'mkttk':{const inp=document.getElementById('mktTk'),t=String(inp&&inp.value||'').trim().toUpperCase().replace(/[^A-Z0-9.\-]/g,'');
      if(!t){toast('Saisissez un ticker');break;}const L=mktStocks();if(!L.includes(t))L.push(t);mktSetMain('stk_'+t);save();renderAll();break;}}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='mktTk'){e.preventDefault();const b=document.querySelector('[data-act="mkttk"]');if(b)b.click();}});
