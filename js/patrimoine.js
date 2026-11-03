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
function pfInit(){if(!S.brokers)S.brokers=[];if(!S.hold)S.hold=[];if(!S.holdDraft)S.holdDraft={br:'',cls:'Actions',sym:'',name:'',qty:null,pru:null,px:null,ccy:'EUR',tgt:null,real:null};if(!ui.pfT)ui.pfT='dash';
  S.pf.positions.forEach(p=>{if(p.br===undefined)p.br='Compte-titres (exemple)';});}
const toEUR=(v,c)=>c==='USD'?v/(+S.pf.eurusd||FX_EURUSD):v;
/* Lignes consolidées : placements saisis ou importés, actions suivies (volet 2), compte de trading */
function wealthLines(){pfInit();const L=[];
  S.hold.forEach((h,i)=>{const q=+h.qty||0,px=+h.px,pru=+h.pru,val=toEUR(q*(isFinite(px)?px:pru),h.ccy),cost=toEUR(q*pru,h.ccy);
    L.push({src:'hold',i,br:h.br||'Non affecté',cls:h.cls||'Actions',sym:h.sym,name:h.name||h.sym,val,cost,lat:isFinite(px)&&isFinite(pru)?val-cost:0,real:+h.real||0,tgt:+h.tgt||null,px,ccy:h.ccy});});
  const K=pfCalc();K.ls.forEach(l=>L.push({src:'pf',i:l.i,br:l.p.br||'Compte-titres',cls:'Actions',sym:l.a.t,name:l.a.n,val:l.valE,cost:l.costE,lat:l.valE-l.costE,real:0,tgt:l.R.ref,px:l.price,ccy:l.a.cur,sig:l.sig}));
  const M=S.mt5;if(M.linked&&M.info&&isFinite(M.info.equity!=null?M.info.equity:M.info.balance)){const eq=+(M.info.equity!=null?M.info.equity:M.info.balance),st=jrStats(S.jr.trades.filter(t=>/MT|Meta|CSV/.test(t.src||'')));
    L.push({src:'tr',br:M.broker||M.server||'Compte de trading',cls:'Trading (CFD)',sym:M.login||'',name:'Compte '+(M.platform||'MT5'),val:toEUR(eq,M.ccy),cost:toEUR(eq-st.tot,M.ccy),lat:toEUR((M.info.equity??eq)-(M.info.balance??eq),M.ccy),real:toEUR(st.tot,M.ccy),cash:toEUR(+M.info.freeMargin||0,M.ccy)});}
  return L;}
function grp(L,k){const o={};L.forEach(l=>{const g=l[k];o[g]=o[g]||{val:0,cost:0,lat:0,real:0,n:0,cash:0};const x=o[g];x.val+=l.val;x.cost+=l.cost;x.lat+=l.lat;x.real+=l.real;x.n++;x.cash+=l.cls==='Cash'?l.val:(l.cash||0);});return Object.entries(o).sort((a,b)=>b[1].val-a[1].val);}
function pfSubBar(){return`<div class="seg" role="tablist" aria-label="Sous-onglets">${[['tr','Comptes de trading'],['pl','Placements & courtiers'],['dash','Dashboard patrimonial']].map(([k,l])=>`<button role="tab" data-act="pft" data-id="${k}" aria-selected="${ui.pfT===k}">${l}</button>`).join('')}</div>`;}
function renderPF(){pfInit();
  if(ui.pfT==='pl'){renderPFStocks();const g=$('#p-pf .grid');if(g)g.insertAdjacentHTML('afterbegin',pfBrokers());return;}
  if(ui.pfT==='tr'){const st=jrStats(S.jr.trades.filter(t=>t.src!=='manuel'));
    $('#p-pf').innerHTML=`<div class="grid">${mt5Card()}
      <div class="card s12"><h2>Positions ouvertes importées</h2>${(S.mt5.open||[]).length?`<div class="tw"><table class="tbl fin"><thead><tr><th>Symbole</th><th>Sens</th><th class="n">Volume</th><th class="n">Prix d'entrée</th><th class="n">Cours</th><th class="n">Résultat latent</th></tr></thead><tbody>${S.mt5.open.map(o=>`<tr><td>${esc(o.sym)}</td><td>${o.side}</td><td class="n">${nf(o.vol,2)}</td><td class="n">${auto(o.price)}</td><td class="n">${auto(o.mkt)}</td><td class="n ${cls(o.pl)}">${nf(o.pl,2)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="note">Aucune position ouverte : importez un rapport qui contient la section « Positions ouvertes » ou synchronisez MetaApi.</p>'}</div>
      <div class="card s12"><h2>Historique des trades importés <span class="meta">${st.n} trades, détail et statistiques dans le Journal de trading</span></h2><div class="stats"><div class="stat"><div class="k">Profit net</div><div class="x ${cls(st.tot)}">${nf(st.tot,2)}</div></div><div class="stat"><div class="k">Taux de réussite</div><div class="x">${isFinite(st.wr)?pct(st.wr*100,1):'—'}</div></div><div class="stat"><div class="k">Profit factor</div><div class="x">${isFinite(st.pf)?nf(st.pf,2):'—'}</div></div><div class="stat"><div class="k">Drawdown maximal</div><div class="x ${st.dd>0?'down':''}">${nf(st.dd,2)}</div></div></div><div class="row" style="margin-top:8px"><button class="btn sm" data-act="tab" data-id="jr">Ouvrir le journal</button></div></div></div>`;return;}
  $('#p-pf').innerHTML=pfDash();
}
function pfBrokers(){
  const q=(ui.brQ||'').toLowerCase(),list=BROKERS.filter(b=>!q||b.n.toLowerCase().includes(q)||b.t.toLowerCase().includes(q)),D=S.holdDraft,brOpts=Object.fromEntries([['','Choisir un courtier'],...S.brokers.map(b=>[b.n,b.n])]);
  return`<div class="card s12"><h2><span>Connecteurs et recherche universelle <span class="meta">${S.brokers.length} plateforme${S.brokers.length>1?'s':''} associée${S.brokers.length>1?'s':''}</span></span></h2>
    <input class="f" id="brq" placeholder="Rechercher une plateforme : XTB, Saxo, Binance, Ledger…" value="${esc(ui.brQ||'')}" aria-label="Rechercher une plateforme" style="max-width:420px">
    <div class="brk" id="brk">${brList(list,q)}</div>
    <p class="note">La lecture par API se fait avec des clés en lecture seule, à brancher côté serveur (jamais dans la page). En attendant, chaque plateforme s'alimente par l'export CSV de ses positions ou par saisie.</p></div>
  ${S.brokers.length?`<div class="card s12"><h2>Plateformes associées</h2><div class="tw"><table class="tbl"><thead><tr><th>Plateforme</th><th>Type</th><th>Lecture</th><th class="n">Lignes</th><th class="n">Valeur</th><th></th></tr></thead><tbody>${S.brokers.map((b,i)=>{const H=S.hold.filter(h=>h.br===b.n);return`<tr><td><b>${esc(b.n)}</b></td><td>${esc(b.t)}</td><td>${b.m.map(m=>`<span class="tag ${m==='api'?'am':''}">${METH[m]}${m==='api'?' (serveur)':''}</span>`).join(' ')}</td><td class="n">${H.length}</td><td class="n">${big(sum(H.map(h=>toEUR((+h.qty||0)*(isFinite(+h.px)&&h.px!==null?+h.px:+h.pru),h.ccy))))}</td><td style="white-space:nowrap"><button class="btn sm" data-act="holdimp" data-id="${esc(b.n)}">Importer les positions (CSV)</button> <button class="btn sm" data-act="brdel" data-id="${i}">Retirer</button></td></tr>`;}).join('')}</tbody></table></div></div>`:''}
  <div class="card s12"><h2>Ajouter une position</h2><div class="fields">${LF('Plateforme','holdDraft.br','s',{opts:brOpts})}${LF('Classe d\'actif','holdDraft.cls','s',{opts:Object.fromEntries(CLASSES.map(c=>[c,c]))})}${LF('Symbole ou ISIN','holdDraft.sym','t')}${LF('Nom','holdDraft.name','t')}${LF('Quantité','holdDraft.qty','nn')}${LF('Prix de revient unitaire (PRU)','holdDraft.pru','nn')}${LF('Cours actuel','holdDraft.px','nn')}${LF('Devise','holdDraft.ccy','s',{opts:{EUR:'EUR',USD:'USD'}})}${LF('Objectif de cours (hypothèse)','holdDraft.tgt','nn')}${LF('Plus-value réalisée','holdDraft.real','nn',{u:'€'})}</div>
    <div class="row" style="margin-top:8px"><button class="btn pri sm" data-act="holdadd">Ajouter la position</button></div></div>
  ${S.hold.length?`<div class="card s12"><h2>Positions des plateformes <span class="meta">crayon pour modifier une valeur</span></h2><div class="tw"><table class="tbl fin"><thead><tr><th>Plateforme</th><th>Classe</th><th>Ligne</th><th class="n">Quantité</th><th class="n">PRU</th><th class="n">Cours</th><th class="n">Valeur (€)</th><th class="n">Latent</th><th class="n">Objectif</th><th></th></tr></thead><tbody>
    ${S.hold.map((h,i)=>{const P=k=>`hold.${i}.${k}`,v=toEUR((+h.qty||0)*(isFinite(+h.px)&&h.px!==null?+h.px:+h.pru),h.ccy),c=toEUR((+h.qty||0)*(+h.pru),h.ccy),lt=h.px!==null&&h.px!==''?v-c:NaN;return`<tr><td>${esc(h.br)}</td><td>${esc(h.cls)}</td><td><b>${esc(h.sym)}</b> <span class="meta">${esc(h.name||'')}</span></td><td class="n">${fld(P('qty'),'nn')}</td><td class="n">${fld(P('pru'),'nn')}</td><td class="n">${fld(P('px'),'nn',{empty:'à saisir'})}</td><td class="n">${nf(v,0)}</td><td class="n ${isFinite(lt)?cls(lt):''}">${isFinite(lt)?nf(lt,0)+' · '+sgn(c?lt/c*100:NaN,1):'—'}</td><td class="n">${fld(P('tgt'),'nn',{empty:'—'})}</td><td><button class="btn sm" data-act="holddel" data-id="${i}">Supprimer</button></td></tr>`;}).join('')}</tbody></table></div></div>`:''}`;
}
function brList(list,q){
  return list.map(b=>{const on=S.brokers.some(x=>x.n===b.n);return`<div class="brc${on?' on':''}"><b>${esc(b.n)}</b><span>${esc(b.t)}</span><small>${b.m.map(m=>METH[m]).join(' · ')} · ${esc(b.note)}</small><button class="btn sm${on?'':' pri'}" data-act="bradd" data-id="${esc(b.n)}"${on?' disabled':''}>${on?'Associée':'Associer'}</button></div>`;}).join('')
    +(q&&!list.length?`<div class="brc"><b>${esc(ui.brQ)}</b><span>Plateforme personnalisée</span><small>Import CSV ou saisie</small><button class="btn sm pri" data-act="bradd" data-id="${esc(ui.brQ)}">Associer « ${esc(ui.brQ)} »</button></div>`:'');
}
function pfDash(){
  const L=wealthLines(),V=sum(L.map(l=>l.val)),C=sum(L.map(l=>l.cost)),LT=sum(L.map(l=>l.lat)),RE=sum(L.map(l=>l.real)),gC=grp(L,'cls'),gB=grp(L,'br');
  const K=pfCalc(),div=K.ls.filter(l=>l.sig[1].startsWith('Divergence')||l.sig[0]==='ko'),dev=L.filter(l=>isFinite(l.tgt)&&l.tgt>0&&isFinite(l.px));
  const tbl=(rows,label)=>`<div class="tw"><table class="tbl fin"><thead><tr><th>${label}</th><th class="n">Valeur</th><th class="n">Poids</th><th class="n">Investi</th><th class="n">Latent</th><th class="n">Rentabilité</th><th class="n">Réalisé</th>${label==='Plateforme'?'<th class="n">Liquidité</th><th>Contrepartie</th>':''}</tr></thead><tbody>${rows.map(([k,x])=>`<tr><td><b>${esc(k)}</b> <span class="meta">${x.n} ligne${x.n>1?'s':''}</span></td><td class="n">${big(x.val)}</td><td class="n">${pct(V?x.val/V*100:0,1)}</td><td class="n">${big(x.cost)}</td><td class="n ${cls(x.lat)}">${big(x.lat)}</td><td class="n ${cls(x.lat)}">${x.cost?sgn(x.lat/x.cost*100,1):'—'}</td><td class="n ${x.real?cls(x.real):''}">${x.real?big(x.real):'—'}</td>${label==='Plateforme'?`<td class="n">${x.cash?big(x.cash):'—'}</td><td>${V&&x.val/V>.4?'<span class="tag ko">Concentration élevée</span>':V&&x.val/V>.25?'<span class="tag am">À surveiller</span>':'<span class="tag ok">Diversifié</span>'}</td>`:''}</tr>`).join('')}</tbody></table></div>`;
  return`<div class="grid">
    <div class="card s12"><div class="stats">
      <div class="stat"><div class="k">Patrimoine financier</div><div class="x">${big(V)}</div><div class="d">${L.length} lignes sur ${gB.length} plateforme${gB.length>1?'s':''}</div></div>
      <div class="stat"><div class="k">Montant investi</div><div class="x">${big(C)}</div><div class="d">prix de revient</div></div>
      <div class="stat"><div class="k">Plus-values latentes</div><div class="x ${cls(LT)}">${big(LT)}</div><div class="d">${C?sgn(LT/C*100,1):''}</div></div>
      <div class="stat"><div class="k">Plus-values réalisées</div><div class="x ${RE?cls(RE):''}">${big(RE)}</div><div class="d">trading et cessions saisies</div></div>
      <div class="stat"><div class="k">Performance globale</div><div class="x ${cls(LT+RE)}">${C?sgn((LT+RE)/C*100,1):'—'}</div><div class="d">${big(LT+RE)}</div></div>
      <div class="stat"><div class="k">Alertes de divergence</div><div class="x ${div.length?'down':'up'}">${div.length}</div><div class="d">résultats publiés vs performance de la ligne</div></div>
    </div>${L.some(l=>l.src==='pf')?'<p class="note" style="margin:8px 0 0">Les actions suivies sont l\'exemple du volet (quantités et prix de revient fictifs) : remplacez-les dans « Placements & courtiers ».</p>':''}</div>
    <div class="card s6"><h2>Rentabilité par classe d'actifs</h2>${hbars(gC.map(([k,x],i)=>({l:k,v:x.val,hl:i===0})),{fmt:v=>big(v)})}${tbl(gC,'Classe')}</div>
    <div class="card s6"><h2>Répartition par plateforme <span class="meta">risque de contrepartie</span></h2>${hbars(gB.map(([k,x],i)=>({l:k,v:x.val,hl:i===0})),{fmt:v=>big(v)})}${tbl(gB,'Plateforme')}</div>
    <div class="card s6"><h2>Delta par rapport aux hypothèses initiales</h2>${dev.length?`<div class="tw"><table class="tbl fin"><thead><tr><th>Ligne</th><th class="n">Cours</th><th class="n">Objectif</th><th class="n">Écart</th></tr></thead><tbody>${dev.map(l=>{const e=(l.px/l.tgt-1)*100;return`<tr><td><b>${esc(l.sym)}</b> <span class="meta">${esc(l.src==='pf'?'valeur de référence du volet 2':'objectif saisi')}</span></td><td class="n">${nf(l.px,2)}</td><td class="n">${nf(l.tgt,2)}</td><td class="n ${e>=0?'up':'down'}">${sgn(e,1)}</td></tr>`;}).join('')}</tbody></table></div>`:'<p class="note">Saisissez un objectif de cours sur vos positions pour mesurer l\'écart.</p>'}</div>
    <div class="card s6"><h2>Alerte de divergence psychologique</h2>${div.length?`<div class="dec" style="grid-template-columns:1fr">${div.map(l=>`<div class="dc"><span class="dot ${l.sig[0]}"></span><div><b>${esc(l.a.t)} : ${esc(l.sig[1])}</b><span>${esc(l.sig[2])}</span></div></div>`).join('')}</div>`:'<p class="note">Aucune divergence entre résultats publiés et performance des lignes.</p>'}
      ${S.mt5.linked?(()=>{const st=jrStats(S.jr.trades.filter(t=>t.src!=='manuel')),pp=K.pnlP;return st.n&&isFinite(pp)&&Math.sign(st.tot)!==Math.sign(pp)?`<div class="dc" style="margin-top:8px"><span class="dot am"></span><div><b>Trading et placements divergent</b><span>Compte de trading ${st.tot>=0?'en gain':'en perte'} (${nf(st.tot,0)}) alors que les placements sont ${pp>=0?'en hausse':'en baisse'} (${sgn(pp,1)}).</span></div></div>`:'';})():''}
      <div class="row" style="margin-top:8px"><button class="btn sm" data-act="pft" data-id="pl">Voir le détail des lignes</button></div></div>
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
