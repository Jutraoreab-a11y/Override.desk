/* ============ Volet 4 : Suivi & placements (3 sous-onglets) ============ */
/* Catalogue des plateformes. Méthodes de lecture déclarées prudemment :
   « api » = API officielle en lecture seule (clés à brancher côté serveur, jamais dans la page),
   « csv » = export de positions ou relevé, « adresse » = adresses publiques (lecture seule). */
const BROKERS=[
  {n:'Interactive Brokers',t:'Courtier multi-actifs',m:['api','csv'],note:'Client Portal API ou relevés Flex'},
  {n:'Saxo Bank',t:'Courtier multi-actifs',m:['api','csv'],note:'Saxo OpenAPI'},
  {n:'XTB',t:'Courtier CFD et actions',m:['csv'],note:'Export du compte (Excel)'},
  {n:'Trade Republic',t:'Néo-courtier',m:['csv'],note:'Relevés de compte'},
  {n:'DEGIRO',t:'Courtier en ligne',m:['csv'],note:'Export du portefeuille (CSV)'},
  {n:'Boursorama Banque',t:'Banque en ligne (CTO, PEA)',m:['csv'],note:'Export des positions'},
  {n:'Fortuneo',t:'Banque en ligne (CTO, PEA)',m:['csv'],note:'Export des positions'},
  {n:'BforBank',t:'Banque en ligne (CTO, PEA)',m:['csv'],note:'Export des positions'},
  {n:'eToro',t:'Courtier social',m:['csv'],note:'Relevé de compte'},
  {n:'Revolut',t:'Néobanque (actions, crypto)',m:['csv'],note:'Relevé de compte'},
  {n:'Bitpanda',t:'Plateforme crypto et actions',m:['api','csv'],note:'API en lecture'},
  {n:'Coinbase',t:'Exchange crypto',m:['api','csv'],note:'API Advanced Trade (lecture)'},
  {n:'Binance',t:'Exchange crypto',m:['api','csv'],note:'Clé API en lecture seule'},
  {n:'Kraken',t:'Exchange crypto',m:['api','csv'],note:'Clé API « Query funds »'},
  {n:'OKX',t:'Exchange crypto',m:['api','csv'],note:'Clé API en lecture'},
  {n:'Ledger (cold storage)',t:'Portefeuille matériel',m:['adresse','csv'],note:'Adresses publiques ou export Ledger Live'},
  {n:'Assurance-vie',t:'Contrat d\'assurance',m:['csv'],note:'Relevé annuel de situation'},
  {n:'Private equity',t:'Fonds non cotés',m:['manuel'],note:'Valorisation des derniers rapports'}];
const CLASSES=['Actions','ETF','Options','Obligations','Crypto','VMP / OPCVM','Private equity','Commodities','Cash','Trading (CFD)'];
const METH={api:'API lecture',csv:'Import CSV',adresse:'Adresses publiques',manuel:'Saisie'};
function pfInit(){if(!S.brokers)S.brokers=[];if(!S.hold)S.hold=[];if(!ui.pfT)ui.pfT='dash';if(!S.pnlP)S.pnlP={mode:'mois',from:today().slice(0,8)+'01',to:today()};
  S.brokers.forEach(b=>{if(!b.api)b.api={url:'',tok:''};if(b.cash===undefined)b.cash=null;if(!b.sync)b.sync={};});
  S.pf.positions.forEach(p=>{if(p.br===undefined)p.br='Compte-titres (exemple)';});}
const toEUR=(v,c)=>c==='USD'?v/(+S.pf.eurusd||FX_EURUSD):v;
const brKind=n=>{const b=BROKERS.find(x=>x.n===n)||S.brokers.find(x=>x.n===n)||{t:''};return/crypto|exchange|ledger/i.test(b.t+' '+n)?'Crypto':/CFD|trading/i.test(b.t)?'Trading (CFD)':'Titres';};
/* Lignes consolidées : placements (API, import, override), actions suivies du volet 2, positions de trading ouvertes */
function wealthLines(){pfInit();const L=[];
  S.hold.forEach((h,i)=>{const q=+h.qty||0,px=isFinite(+h.px)&&h.px!==null&&h.px!==''?+h.px:+h.pru,pru=+h.pru,val=toEUR(q*px,h.ccy),cost=toEUR(q*pru,h.ccy);
    const sl=+h.sl||null,tp=+h.tp||null,risk=sl?toEUR(Math.max(0,(px-sl)*q),h.ccy):null,rew=tp?toEUR(Math.max(0,(tp-px)*q),h.ccy):null;
    L.push({pf:'Placements',src:'hold',i,br:h.br||'Non affecté',cls:h.cls||'Actions',sym:h.sym,name:h.name||h.sym,val,cost,lat:val-cost,px,sl,tp,risk,rew,ccy:h.ccy,cash:h.cls==='Cash'?val:0});});
  const K=pfCalc();K.ls.forEach(l=>{const sl=l.stop,tp=l.R.tp,fx=v=>l.a.cur==='USD'?v/(+S.pf.eurusd||FX_EURUSD):v;
    L.push({pf:'Placements',src:'pf',i:l.i,br:l.p.br||'Compte-titres',cls:'Actions',sym:l.a.t,name:l.a.n,val:l.valE,cost:l.costE,lat:l.valE-l.costE,px:l.price,sl,tp,risk:sl?fx(Math.max(0,(l.price-sl)*l.q)):null,rew:isFinite(tp)?fx(Math.max(0,(tp-l.price)*l.q)):null,tgt:l.R.ref,ccy:l.a.cur,sig:l.sig,cash:0});});
  const M=S.mt5;if(M.linked){const ccy=M.ccy||'EUR',acct=M.broker||M.server||'Compte de trading';
    (M.open||[]).forEach(o=>{const sp=PC_SPECS[o.sym]||PC_SPECS[String(o.sym).replace(/[.\-_].*$/,'')],fx=sp?pcFx(sp.q,'EUR'):1,cs=sp?sp.cs:1,d=o.side==='Achat'?1:-1,px=+o.mkt||+o.price,expo=sp?(+o.vol)*cs*px*fx:NaN;
      const mg=sp&&isFinite(expo)?expo/sp.lev:0,kl=!sp?'Trading (CFD)':sp.ref?'Commodities':/^(EUR|GBP|USD)/.test(o.sym)?'Devises (CFD)':'Indices (CFD)';
      L.push({pf:'Trading',src:'open',br:acct,cls:kl,sym:o.sym,name:o.side+' '+nf(+o.vol,2)+' lot',val:mg,expo,margin:mg,cost:mg,lat:toEUR(+o.pl||0,ccy),px,sl:o.sl,tp:o.tp,
        risk:o.sl&&sp?Math.max(0,(px-o.sl)*d*(+o.vol)*cs*fx):null,rew:o.tp&&sp?Math.max(0,(o.tp-px)*d*(+o.vol)*cs*fx):null,cash:0,unk:!sp});});
    if(M.info&&isFinite(+M.info.freeMargin))L.push({pf:'Trading',src:'cash',br:acct,cls:'Cash',sym:'Marge libre',name:'Compte '+(M.platform||'MT5'),val:toEUR(+M.info.freeMargin,ccy),cost:toEUR(+M.info.freeMargin,ccy),lat:0,cash:toEUR(+M.info.freeMargin,ccy)});}
  S.brokers.forEach(b=>{if(isFinite(+b.cash)&&b.cash!==null&&b.cash!=='')L.push({pf:'Placements',src:'brcash',br:b.n,cls:'Cash',sym:'Liquidités',name:b.n,val:+b.cash,cost:+b.cash,lat:0,cash:+b.cash});});
  return L;}
function grp(L,k,f){const o={};L.forEach(l=>{const g=f?f(l):l[k];o[g]=o[g]||{val:0,cost:0,lat:0,n:0,cash:0};const x=o[g];x.val+=l.val||0;x.cost+=l.cost||0;x.lat+=l.lat||0;x.n++;x.cash+=l.cash||0;});return Object.entries(o).sort((a,b)=>b[1].val-a[1].val);}
function pfSubBar(){return`<div class="seg" role="tablist" aria-label="Sous-onglets">${[['tr','Comptes de trading'],['pl','Placements & courtiers'],['dash','Dashboard consolidé']].map(([k,l])=>`<button role="tab" data-act="pft" data-id="${k}" aria-selected="${ui.pfT===k}">${l}</button>`).join('')}</div>`;}
function renderPF(){pfInit();
  if(ui.pfT==='pl'){renderPFStocks();const g=$('#p-pf .grid');if(g)g.insertAdjacentHTML('afterbegin',pfBrokers());return;}
  if(ui.pfT==='tr'){const st=jrStats(S.jr.trades.filter(t=>t.src!=='manuel')),M=S.mt5,aut=M.mode==='metaapi'&&M.token&&M.acctId;
    $('#p-pf').innerHTML=`<div class="grid">${mt5Card()}
      <div class="card s12"><h2><span>Positions ouvertes <span class="meta">${aut?`remontée automatique MetaApi à l'ouverture puis toutes les 60 s${M.lastSync?' · dernière mise à jour '+new Date(M.lastSync).toLocaleTimeString('fr-FR'):''}${M.err?' · <span class="down">échec : '+esc(M.err)+'</span>':''}`:M.linked?'issues du dernier rapport importé':'compte non lié'}</span></span></h2>${(M.open||[]).length?`<div class="tw"><table class="tbl fin"><thead><tr><th>Symbole</th><th>Sens</th><th class="n">Volume</th><th class="n">Entrée</th><th class="n">Cours</th><th class="n">Stop-loss</th><th class="n">Take-profit</th><th class="n">RR restant</th><th class="n">Résultat latent</th></tr></thead><tbody>${M.open.map(o=>{const d=o.side==='Achat'?1:-1,px=+o.mkt||+o.price,rr=o.sl&&o.tp?((o.tp-px)*d)/((px-o.sl)*d):NaN;return`<tr><td>${esc(o.sym)}</td><td>${o.side}</td><td class="n">${nf(o.vol,2)}</td><td class="n">${auto(o.price)}</td><td class="n">${auto(o.mkt)}</td><td class="n">${o.sl?auto(o.sl):'<span class="down">aucun</span>'}</td><td class="n">${o.tp?auto(o.tp):'—'}</td><td class="n">${isFinite(rr)&&rr>0?'1 : '+nf(rr,2):'—'}</td><td class="n ${cls(o.pl)}">${nf(o.pl,2)}</td></tr>`;}).join('')}</tbody></table></div>`:'<p class="note">Aucune position ouverte.</p>'}</div>
      <div class="card s12"><h2>Trades clôturés <span class="meta">${st.n} trades, détail dans le Journal de trading</span></h2><div class="stats"><div class="stat"><div class="k">Profit net</div><div class="x ${cls(st.tot)}">${nf(st.tot,2)}</div></div><div class="stat"><div class="k">Taux de réussite</div><div class="x">${isFinite(st.wr)?pct(st.wr*100,1):'—'}</div></div><div class="stat"><div class="k">Profit factor</div><div class="x">${isFinite(st.pf)?nf(st.pf,2):'—'}</div></div><div class="stat"><div class="k">Drawdown maximal</div><div class="x ${st.dd>0?'down':''}">${nf(st.dd,2)}</div></div></div><div class="row" style="margin-top:8px"><button class="btn sm" data-act="tab" data-id="jr">Ouvrir le journal</button></div></div></div>`;return;}
  $('#p-pf').innerHTML=pfDash();
}
/* ---- Placements & courtiers : connecteurs en listes dépliantes ---- */
function pfBrokers(){
  const avail=BROKERS.filter(b=>!S.brokers.some(x=>x.n===b.n)),types=[...new Set(avail.map(b=>b.t))];
  return`<div class="card s12"><details class="dd2"${S.brokers.length?'':' open'}><summary><b>Connecter une plateforme</b><span class="meta">${BROKERS.length} plateformes au catalogue · recherche universelle</span></summary>
      <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><input class="f" id="brq" list="brl" placeholder="Rechercher : XTB, Saxo, Binance, Ledger…" value="${esc(ui.brQ||'')}" aria-label="Rechercher une plateforme" style="max-width:300px">
        <datalist id="brl">${avail.map(b=>`<option value="${esc(b.n)}">${esc(b.t)}</option>`).join('')}</datalist>
        <select class="f" id="brsel" style="width:auto;max-width:280px" aria-label="Catalogue des plateformes"><option value="">ou choisir dans le catalogue</option>${types.map(ty=>`<optgroup label="${esc(ty)}">${avail.filter(b=>b.t===ty).map(b=>`<option value="${esc(b.n)}">${esc(b.n)} · ${b.m.map(m=>METH[m]).join(', ')}</option>`).join('')}</optgroup>`).join('')}</select>
        <button class="btn pri sm" data-act="bradd2">Associer</button></div>
      <p class="note">Une plateforme absente du catalogue s'associe en tapant son nom. Les positions remontent automatiquement à chaque ouverture de la page depuis la passerelle API de chaque plateforme.</p></details></div>
    ${S.brokers.length?`<div class="card s12"><h2><span>Plateformes connectées <span class="meta">${S.brokers.length}</span></span><button class="btn sm" data-act="brsync">Actualiser toutes les passerelles</button></h2>
      ${S.brokers.map((b,i)=>{const H=S.hold.map((h,k)=>[h,k]).filter(([h])=>h.br===b.n),val=sum(H.map(([h])=>toEUR((+h.qty||0)*(isFinite(+h.px)&&h.px!==null&&h.px!==''?+h.px:+h.pru),h.ccy))),sy=b.sync||{};
        return`<details class="dd2 brd"><summary><span class="dot ${b.live&&b.live.status==='live'&&FLUX.on?'ok':'ko'}" title="${b.live&&b.live.status==='live'&&FLUX.on?'Connecté (flux live)':'Déconnecté (mode simulation)'}"></span><b>${esc(b.n)}</b><span class="meta">${esc(b.t)}</span><span class="num">${H.length} ligne${H.length>1?'s':''} · ${big(val)}${isFinite(+b.cash)&&b.cash!==null&&b.cash!==''?' · cash '+big(+b.cash):''}</span>${FLUX.on?`<span class="tag ${b.live&&b.live.status==='live'?'ok':b.live&&b.live.status==='error'?'ko':''}">${!b.live?'Identifiants non enregistrés':b.live.status==='live'?'Flux live'+(b.live.at?' · '+new Date(b.live.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''):b.live.status==='error'?'Échec de synchronisation':'En attente'}</span>`:`<span class="tag ${sy.err?'ko':sy.at?'ok':''}">${sy.err?'Échec de synchronisation':sy.at?'Synchronisé '+new Date(sy.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):b.api.url?'En attente':'Passerelle non configurée'}</span>`}</summary>
          <div class="grid" style="margin-top:10px">
            <div class="s5" style="min-width:0">${FLUX.on?liveBrokerForm(b,i):`<h3 class="h3" style="margin-top:0">Passerelle API (lecture seule)</h3><div class="fields one">${LF('Adresse de la passerelle',`brokers.${i}.api.url`,'t',{ph:'https://…/functions/v1/broker-positions'})}${LF('Jeton de la passerelle',`brokers.${i}.api.tok`,'t',{ph:'jeton de votre fonction serveur'})}</div>
              <p class="note">La passerelle est votre fonction serveur : elle détient les clés API du courtier (jamais la page) et renvoie <code>{"positions":[{"sym","name","cls","qty","pru","px","ccy","sl","tp"}],"cash":nombre}</code>.${sy.err?` <span class="down">Dernière erreur : ${esc(sy.err)}</span>`:''}</p>`}
              <div class="row"><button class="btn sm" data-act="brsync1" data-id="${i}">Synchroniser</button><button class="btn sm" data-act="holdimp" data-id="${esc(b.n)}">Importer un relevé (CSV)</button><button class="btn sm" data-act="brdel" data-id="${i}">Déconnecter</button></div></div>
            <div class="s7" style="min-width:0"><h3 class="h3" style="margin-top:0">Positions et liquidités <span class="meta">crayon pour forcer une valeur</span></h3>
              <div class="fields" style="margin-bottom:8px">${LF('Liquidités disponibles',`brokers.${i}.cash`,'nn',{u:'€'})}</div>
              ${H.length?`<div class="tw"><table class="tbl fin"><thead><tr><th>Ligne</th><th>Classe</th><th class="n">Qté</th><th class="n">PRU</th><th class="n">Cours</th><th class="n">SL</th><th class="n">TP</th><th class="n">Latent</th></tr></thead><tbody>${H.map(([h,k])=>{const P=x=>`hold.${k}.${x}`,px=isFinite(+h.px)&&h.px!==null&&h.px!==''?+h.px:+h.pru,lt=toEUR((px-(+h.pru))*(+h.qty||0),h.ccy);return`<tr><td><b>${esc(h.sym)}</b> <span class="meta">${esc(h.name||'')}</span></td><td>${esc(h.cls)}</td><td class="n">${fld(P('qty'),'nn')}</td><td class="n">${fld(P('pru'),'nn')}</td><td class="n">${fld(P('px'),'nn',{empty:'—'})}</td><td class="n">${fld(P('sl'),'nn',{empty:'—'})}</td><td class="n">${fld(P('tp'),'nn',{empty:'—'})}</td><td class="n ${cls(lt)}">${nf(lt,0)}</td></tr>`;}).join('')}</tbody></table></div>`:'<p class="note">Aucune position remontée pour l\'instant.</p>'}</div>
          </div></details>`;}).join('')}</div>`:''}`;
}
function brList(){return'';}
async function brSync(i,silent){const b=S.brokers[i];if(!b||!b.api||!b.api.url)return false;b.sync=b.sync||{};
  try{const r=await fetch(b.api.url,{headers:Object.assign({'Accept':'application/json'},b.api.tok?{'Authorization':'Bearer '+b.api.tok}:{})});if(!r.ok)throw new Error('HTTP '+r.status);
    const j=await r.json(),P=Array.isArray(j)?j:(j.positions||[]);if(!Array.isArray(P))throw new Error('format inattendu');
    S.hold=S.hold.filter(h=>!(h.br===b.n&&h.src==='api')).concat(P.filter(x=>x&&x.sym&&isFinite(+x.qty)).map(x=>({br:b.n,src:'api',cls:CLASSES.includes(x.cls)?x.cls:brKind(b.n)==='Crypto'?'Crypto':'Actions',sym:String(x.sym),name:String(x.name||x.sym),qty:+x.qty,pru:isFinite(+x.pru)?+x.pru:null,px:isFinite(+x.px)?+x.px:null,ccy:x.ccy==='USD'?'USD':'EUR',sl:isFinite(+x.sl)&&x.sl?+x.sl:null,tp:isFinite(+x.tp)&&x.tp?+x.tp:null,realD:null,real:null})));
    if(isFinite(+j.cash))b.cash=+j.cash;if(Array.isArray(j.realized)){S.realized=(S.realized||[]).filter(r=>r.br!==b.n).concat(j.realized.filter(r=>r&&r.d&&isFinite(+r.pnl)).map(r=>({br:b.n,d:String(r.d).slice(0,10),sym:String(r.sym||''),pnl:toEUR(+r.pnl,r.ccy)})));}
    b.sync={at:new Date().toISOString(),err:'',n:P.length};return true;}
  catch(e){b.sync={at:b.sync.at,err:e.message||'erreur'};return false;}}
async function brSyncAll(silent){pfInit();const idx=S.brokers.map((b,i)=>i).filter(i=>S.brokers[i].api&&S.brokers[i].api.url);if(!idx.length){if(!silent)toast('Aucune passerelle configurée');return;}
  const r=await Promise.all(idx.map(i=>brSync(i,silent)));save();renderAll();if(!silent)toast(`${r.filter(Boolean).length} plateforme(s) synchronisée(s) sur ${idx.length}`);}
setTimeout(()=>brSyncAll(true),1200);
/* ---- Période du PnL ---- */
function pnlRange(){const P=S.pnlP,t=today(),d=new Date(t+'T00:00:00'),iso=x=>x.toISOString().slice(0,10);
  if(P.mode==='jour')return[t,t,"aujourd'hui"];
  if(P.mode==='semaine'){const m=new Date(d);m.setDate(d.getDate()-((d.getDay()+6)%7));return[iso(m),t,'semaine en cours'];}
  if(P.mode==='mois')return[t.slice(0,8)+'01',t,'mois en cours'];
  if(P.mode==='annee'){const a=new Date(d);a.setFullYear(d.getFullYear()-1);return[iso(a),t,'12 derniers mois'];}
  if(P.mode==='ytd')return[t.slice(0,4)+'-01-01',t,'depuis le 1er janvier'];
  if(P.mode==='tout')return['0000-01-01','9999-12-31','toute la période'];
  return[P.from||'0000-01-01',P.to||'9999-12-31',`du ${fdate(P.from)} au ${fdate(P.to)}`];}
function pfDash(){
  const L=wealthLines(),inv=L.filter(l=>l.cls!=='Cash'),V=sum(L.map(l=>l.val)),Lt=L.filter(l=>l.pf==='Trading'),Lp=L.filter(l=>l.pf==='Placements');
  const cashT=sum(L.map(l=>l.cash||0)),margin=sum(Lt.map(l=>l.margin||0)),investedLT=sum(Lp.filter(l=>l.cls!=='Cash').map(l=>l.val)),invested=investedLT+margin,expoRatio=invested+cashT?invested/(invested+cashT):NaN;
  const [f,t2,lab]=pnlRange(),inP=d=>d>=f&&d<=t2;
  const tEUR=x=>{const v=jrPnl(x);return isFinite(v)?toEUR(v,x.src==='manuel'?S.pc.ccy:(S.mt5.ccy||'EUR')):NaN;},trR=sum(S.jr.trades.filter(x=>inP(x.d)).map(tEUR).filter(isFinite)),plR=sum((S.realized||[]).filter(r=>inP(r.d)).map(r=>r.pnl))+sum(S.hold.filter(h=>h.real&&h.realD&&inP(h.realD)).map(h=>+h.real));
  const trL=sum(Lt.map(l=>l.lat)),plL=sum(Lp.map(l=>l.lat));
  const days={};S.jr.trades.filter(x=>inP(x.d)).forEach(x=>{const v=tEUR(x);if(isFinite(v)){days[x.d]=days[x.d]||[0,0];days[x.d][0]+=v;}});(S.realized||[]).filter(r=>inP(r.d)).forEach(r=>{days[r.d]=days[r.d]||[0,0];days[r.d][1]+=r.pnl;});
  const dk=Object.keys(days).sort();
  const gC=grp(inv,'cls'),gA=[...inv].sort((a,b)=>b.val-a.val),gB=grp(L,'br'),cash=L.filter(l=>l.cash>0);
  const rk=(arr)=>{const R=arr.filter(l=>isFinite(l.risk)&&l.risk!==null),W=arr.filter(l=>isFinite(l.rew)&&l.rew!==null),r=sum(R.map(l=>l.risk)),w=sum(W.map(l=>l.rew));return{r,w,rr:r?w/r:NaN,unp:arr.filter(l=>!l.sl).length};};
  const rkT=rk(Lt.filter(l=>l.src==='open')),rkP=rk(Lp.filter(l=>l.cls!=='Cash')),rkA=rk(inv);
  const row=(k,x,tot)=>`<tr><td><b>${esc(k)}</b> <span class="meta">${x.n} ligne${x.n>1?'s':''}</span></td><td class="n">${big(x.val)}</td><td class="n">${pct(tot?x.val/tot*100:0,1)}</td><td class="n ${cls(x.lat)}">${big(x.lat)}</td></tr>`;
  const head='<thead><tr><th></th><th class="n">Valeur</th><th class="n">Poids</th><th class="n">Latent</th></tr></thead>';
  const totInv=sum(inv.map(l=>l.val));
  return`<div class="grid">
    <div class="card s12"><div class="stats">
      <div class="stat"><div class="k">Patrimoine financier</div><div class="x">${big(V)}</div><div class="d">${L.length} lignes · ${gB.length} plateforme${gB.length>1?'s':''}</div></div>
      <div class="stat"><div class="k">Cash investi</div><div class="x">${big(invested)}</div><div class="d">placements ${big(investedLT)} · marge trading ${big(margin)}</div></div>
      <div class="stat"><div class="k">Cash disponible</div><div class="x">${big(cashT)}</div><div class="d">liquidités et marge libre</div></div>
      <div class="stat"><div class="k">Exposition du capital</div><div class="x ${expoRatio>.9?'down':''}">${isFinite(expoRatio)?pct(expoRatio*100,1):'—'}</div><div class="d">investi / (investi + disponible)</div></div>
      <div class="stat"><div class="k">Risk / Reward consolidé</div><div class="x ${rkA.rr>=2?'up':rkA.rr<1?'down':''}">${isFinite(rkA.rr)?'1 : '+nf(rkA.rr,2):'—'}</div><div class="d">risque ${big(rkA.r)} · gain visé ${big(rkA.w)}</div></div>
      <div class="stat"><div class="k">Lignes sans stop-loss</div><div class="x ${rkA.unp?'down':'up'}">${rkA.unp}</div><div class="d">sur ${inv.length} lignes investies</div></div>
    </div></div>
    <div class="card s12"><h2><span>PnL dynamique <span class="meta">réalisé : ${esc(lab)} · latent : positions ouvertes à date</span></span>
      <span class="row noprint">${lin('pnlP.mode','s',{opts:{jour:'Jour',semaine:'Semaine',mois:'Mois',annee:'Année (12 mois)',ytd:'YTD',tout:'Tout',perso:'Période personnalisée'},style:'width:auto',al:'Période du PnL'})}${S.pnlP.mode==='perso'?`${lin('pnlP.from','d',{style:'width:150px',al:'Début'})}${lin('pnlP.to','d',{style:'width:150px',al:'Fin'})}`:''}</span></h2>
      <div class="tw"><table class="tbl fin"><thead><tr><th></th><th class="n">PnL latent (en cours)</th><th class="n">PnL réalisé (clôturé)</th><th class="n">PnL total</th></tr></thead><tbody>
        <tr><td>Trading</td><td class="n ${cls(trL)}">${nf(trL,2)} €</td><td class="n ${cls(trR)}">${nf(trR,2)} €</td><td class="n ${cls(trL+trR)}">${nf(trL+trR,2)} €</td></tr>
        <tr><td>Placements</td><td class="n ${cls(plL)}">${nf(plL,2)} €</td><td class="n ${cls(plR)}">${nf(plR,2)} €</td><td class="n ${cls(plL+plR)}">${nf(plL+plR,2)} €</td></tr>
        <tr class="tot"><td>Consolidé</td><td class="n ${cls(trL+plL)}">${nf(trL+plL,2)} €</td><td class="n ${cls(trR+plR)}">${nf(trR+plR,2)} €</td><td class="n ${cls(trL+plL+trR+plR)}">${nf(trL+plL+trR+plR,2)} €</td></tr></tbody></table></div>
      ${dk.length?colChart(dk.map(d=>d.slice(8,10)+'/'+d.slice(5,7)),dk.map(d=>days[d][0]+days[d][1]),{w:900,h:190,fmt:v=>nf(v,0),title:'PnL réalisé par jour'}):'<p class="note">Aucun PnL réalisé sur la période.</p>'}
      <p class="note">Réalisé trading : trades clôturés du journal (MT4, MT5, MetaApi, saisis). Réalisé placements : cessions renvoyées par les passerelles des courtiers. Le latent reflète les positions ouvertes à la dernière synchronisation.</p></div>
    <div class="card s6"><h2>Répartition par classe d'actifs</h2>${hbars(gC.map(([k,x],i)=>({l:k,v:x.val,hl:i===0})),{fmt:v=>big(v)})}<div class="tw"><table class="tbl fin">${head}<tbody>${gC.map(([k,x])=>row(k,x,totInv)).join('')}</tbody></table></div></div>
    <div class="card s6"><h2>Répartition par broker / contrepartie</h2>${hbars(gB.map(([k,x],i)=>({l:k,v:x.val,hl:i===0})),{fmt:v=>big(v)})}<div class="tw"><table class="tbl fin"><thead><tr><th></th><th class="n">Encours</th><th class="n">Poids</th><th class="n">dont cash</th><th>Risque</th></tr></thead><tbody>${gB.map(([k,x])=>`<tr><td><b>${esc(k)}</b></td><td class="n">${big(x.val)}</td><td class="n">${pct(V?x.val/V*100:0,1)}</td><td class="n">${x.cash?big(x.cash):'—'}</td><td>${V&&x.val/V>.4?'<span class="tag ko">Concentration élevée</span>':V&&x.val/V>.25?'<span class="tag am">À surveiller</span>':'<span class="tag ok">Diversifié</span>'}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card s12"><h2><span>Répartition par actif <span class="meta">long terme et trading confondus</span></span></h2><div class="tw" style="max-height:460px;overflow:auto"><table class="tbl fin"><thead><tr><th>Actif</th><th>Portefeuille</th><th>Plateforme</th><th>Classe</th><th class="n">Valeur engagée</th><th class="n">Poids</th><th class="n">Exposition</th><th class="n">Latent</th><th class="n">Stop-loss</th><th class="n">Take-profit</th><th class="n">Risque €</th><th class="n">Gain visé €</th><th class="n">RR</th></tr></thead><tbody>
      ${gA.map(l=>{const rr=isFinite(l.risk)&&l.risk>0&&isFinite(l.rew)?l.rew/l.risk:NaN,P=l.src==='hold'?k=>`hold.${l.i}.${k}`:null;return`<tr><td><b>${esc(l.sym)}</b> <span class="meta">${esc(l.name||'')}</span></td><td>${l.pf}</td><td>${esc(l.br)}</td><td>${esc(l.cls)}</td><td class="n">${l.unk?'<span class="meta">contrat inconnu</span>':big(l.val)}</td><td class="n">${pct(totInv?l.val/totInv*100:0,1)}</td><td class="n">${isFinite(l.expo)?big(l.expo):big(l.val)}</td><td class="n ${cls(l.lat)}">${big(l.lat)}</td><td class="n">${P?fld(P('sl'),'nn',{empty:'—'}):l.sl?auto(l.sl):'<span class="down">aucun</span>'}</td><td class="n">${P?fld(P('tp'),'nn',{empty:'—'}):l.tp?auto(l.tp):'—'}</td><td class="n">${isFinite(l.risk)&&l.risk!==null?big(l.risk):'—'}</td><td class="n">${isFinite(l.rew)&&l.rew!==null?big(l.rew):'—'}</td><td class="n ${rr>=2?'up':rr<1?'down':''}">${isFinite(rr)?'1 : '+nf(rr,2):'—'}</td></tr>`;}).join('')}
      </tbody></table></div>
      <div class="stats" style="margin-top:8px">${[['Trading',rkT],['Placements',rkP],['Consolidé',rkA]].map(([n,x])=>`<div class="stat"><div class="k">RR ${n}</div><div class="x ${x.rr>=2?'up':x.rr<1?'down':''}">${isFinite(x.rr)?'1 : '+nf(x.rr,2):'—'}</div><div class="d">risque ${big(x.r)} · gain visé ${big(x.w)} · ${x.unp} sans stop</div></div>`).join('')}</div>
      <p class="note">Positions de trading : valeur engagée = marge mobilisée (exposition ÷ levier) ; l'exposition notionnelle est indiquée à part. Risque = distance entre le cours et le stop-loss × quantité ; gain visé = distance au take-profit. Actions suivies : stop au prix de revient moins ${nf(S.an.crit.sl,0)} % et objectif du volet 2.</p></div>
    <div class="card s6"><h2>Répartition du cash</h2>${cash.length?`<div class="tw"><table class="tbl fin"><thead><tr><th>Par broker</th><th class="n">Cash</th><th class="n">Part</th></tr></thead><tbody>${grp(cash,'br').map(([k,x])=>`<tr><td>${esc(k)}</td><td class="n">${big(x.cash)}</td><td class="n">${pct(x.cash/cashT*100,1)}</td></tr>`).join('')}</tbody></table></div>
      <div class="tw" style="margin-top:8px"><table class="tbl fin"><thead><tr><th>Par portefeuille</th><th class="n">Cash</th><th class="n">Part</th></tr></thead><tbody>${grp(cash,'pf').map(([k,x])=>`<tr><td>${esc(k)}</td><td class="n">${big(x.cash)}</td><td class="n">${pct(x.cash/cashT*100,1)}</td></tr>`).join('')}</tbody></table></div>
      <div class="tw" style="margin-top:8px"><table class="tbl fin"><thead><tr><th>Par classe de compte</th><th class="n">Cash</th><th class="n">Part</th></tr></thead><tbody>${grp(cash,null,l=>l.pf==='Trading'?'Trading (CFD)':brKind(l.br)).map(([k,x])=>`<tr><td>${esc(k)}</td><td class="n">${big(x.cash)}</td><td class="n">${pct(x.cash/cashT*100,1)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="note">Aucune liquidité remontée : elles arrivent par les passerelles des courtiers et par la marge libre du compte de trading.</p>'}</div>
    <div class="card s6"><h2>Alerte de divergence psychologique</h2>${(()=>{const K=pfCalc(),dv=K.ls.filter(l=>l.sig[1].startsWith('Divergence')||l.sig[0]==='ko');return dv.length?`<div class="dec" style="grid-template-columns:1fr">${dv.map(l=>`<div class="dc"><span class="dot ${l.sig[0]}"></span><div><b>${esc(l.a.t)} : ${esc(l.sig[1])}</b><span>${esc(l.sig[2])}</span></div></div>`).join('')}</div>`:'<p class="note">Aucune divergence.</p>';})()}</div>
    ${typeof pfRiskCard==='function'?pfRiskCard(L):''}
  </div>`;
}
function holdImport(txt,br){
  const L=txt.replace(/\r/g,'').split('\n').filter(x=>x.trim());if(L.length<2)return 0;
  const sep=L[0].includes(';')?';':L[0].includes('\t')?'\t':',',split=l=>{const o=[];let c='',q=false;for(const ch of l){if(ch==='"'){q=!q;continue;}if(ch===sep&&!q){o.push(c);c='';}else c+=ch;}o.push(c);return o.map(x=>x.trim());};
  const h=split(L[0]).map(x=>x.toLowerCase()),ix=(...k)=>h.findIndex(x=>k.some(y=>x.includes(y)));
  const I={sym:ix('symbole','symbol','ticker','isin','code'),name:ix('nom','name','libellé','libelle','produit','product','actif','asset'),qty:ix('quantité','quantite','quantity','qty','units','nombre','amount','solde'),pru:ix('pru','prix de revient','average','cost','prix moyen','avg'),px:ix('cours','price','dernier','last','valeur unitaire'),ccy:ix('devise','currency','ccy'),cls:ix('classe','type','catégorie','category')};
  const cr=/coinbase|binance|kraken|okx|ledger|bitpanda/i.test(br);let n=0;
  L.slice(1).forEach(l=>{const c=split(l),num=k=>I[k]>=0?mtNum(c[I[k]]):NaN,sym=I.sym>=0?c[I.sym]:I.name>=0?c[I.name]:'';if(!sym||!isFinite(num('qty')))return;
    const name=I.name>=0?c[I.name]:sym,cl=I.cls>=0&&CLASSES.find(x=>x.toLowerCase()===String(c[I.cls]).toLowerCase())||(cr?'Crypto':/etf|ucits|tracker/i.test(name)?'ETF':'Actions');
    S.hold.push({br,cls:cl,sym,name,qty:num('qty'),pru:isFinite(num('pru'))?num('pru'):null,px:isFinite(num('px'))?num('px'):null,ccy:I.ccy>=0&&/usd/i.test(c[I.ccy])?'USD':'EUR',tgt:null,real:null});n++;});
  return n;}
