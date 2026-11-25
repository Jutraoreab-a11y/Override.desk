/* ============ v8.40 ============
   1. Business plan : une seule liste déroulante des dossiers en tête de page (un dossier ouvert à la fois), plus d'explorateur en double.
   2. Analyse financière : dossier ouvert par défaut ; bloc « Bilan et flux de trésorerie (FCF) » à partir des comptes publiés.
   3. Sélecteur : sociétés cotées et non cotées strictement séparées, boutons colorés et animés ;
      non cotées : Mapping 1 = toutes les industries (75), un clic ouvre Mapping 2 = vos dossiers non cotés de cette industrie,
      un clic sur un dossier ouvre son analyse détaillée (le tamis d'entrée n'y figure plus que dans l'analyse de la société).
   4. Suivi placement : uniquement le compte MetaTrader 5 (connexion, solde, courbe, résultats, positions).
   5. Commodities : sources repliées par défaut ; basis non calculé (comptant provisoire) affiché vide au lieu de 0. */

/* ---------- 1. Business plan ---------- */
{const _fx=fxHTML;fxHTML=function(m){return m==='bp'?'':_fx.apply(this,arguments);};}
{const _rb=renderBP;renderBP=function(){const r=_rb.apply(this,arguments);try{const P=document.getElementById('p-bp'),G=P&&P.querySelector('.grid');if(!G)return r;
  const bar=G.querySelector(':scope>.prj');if(bar&&G.firstElementChild!==bar)G.prepend(bar);
  const l=bar&&bar.querySelector('.prj-l');if(l&&!l.dataset.v840){l.dataset.v840=1;l.innerHTML=l.innerHTML.replace('Dossier projet','Dossier');}
  const p=prjCur('bp'),hd=bar&&bar.querySelector('.prj-h');if(p&&hd&&!hd.querySelector('[data-act=fxren]'))hd.insertAdjacentHTML('beforeend',`<span class="row noprint" style="gap:6px"><button class="btn sm" data-act="fxren" data-m="bp" data-p="${p.id}">✎ Renommer</button><button class="btn sm" data-act="fxdel" data-m="bp" data-p="${p.id}">✕ Supprimer</button></span>`);}catch(e){console.error('bp840',e);}return r;};}

/* ---------- 2. Analyse financière ---------- */
{const _ra=renderAN;renderAN=function(){try{if(ui.anDos===undefined&&S.prj&&S.prj.an&&S.prj.an.length)ui.anDos=S.prj.an[0].id;}catch(e){}
  const r=_ra.apply(this,arguments);try{anBalMount();}catch(e){console.error('bilan',e);}return r;};}
function anBalMount(){const P=document.getElementById('p-an');if(!P||!ui.anOpen)return;const a=S.an.assets[ui.tk];if(!a||!Array.isArray(a.y))return;
  const G=P.querySelector(':scope>.grid')||P,old=G.querySelector('#an-bal');if(old)old.remove();
  const y=a.y,n=y.length,v=(k,i)=>Array.isArray(a[k])&&a[k][i]!==null&&a[k][i]!==undefined&&isFinite(a[k][i])?+a[k][i]:null,f=x=>x===null||!isFinite(x)?'—':nf(x,0),pc=x=>x===null||!isFinite(x)?'—':nf(x,1)+' %';
  const row=(l,fn,fmt,cl)=>`<tr><td>${l}</td>${y.map((_,i)=>{const x=fn(i);return`<td class="n ${cl&&x!==null&&isFinite(x)?cls(x):''}">${(fmt||f)(x)}</td>`;}).join('')}</tr>`;
  const capR=+a.price/(+a.fx||1)*(+a.shares);
  const fcf=i=>v('fcf',i)!==null?v('fcf',i):(v('cfo',i)!==null&&v('capex',i)!==null?v('cfo',i)-v('capex',i):null);
  const h=`<div class="card s12" id="an-bal"><h2><span>Bilan et flux de trésorerie (FCF) <span class="meta">millions de ${esc(a.rcur||a.cur||'')}, exercices publiés</span></span></h2>
    <div class="grid" style="gap:12px">
      <div class="s6" style="min-width:0"><h3 class="h3" style="margin-top:0">Bilan</h3><div class="tw"><table class="tbl fin"><thead><tr><th></th>${y.map(x=>`<th class="n">${esc(x)}</th>`).join('')}</tr></thead><tbody>
        ${row('Total actif',i=>v('assets',i))}${row('Capitaux propres',i=>v('eq',i))}${row('Dette nette (− = trésorerie nette)',i=>v('nd',i))}
        ${row('Dette nette / capitaux propres',i=>v('nd',i)!==null&&v('eq',i)>0?v('nd',i)/v('eq',i)*100:null,pc)}
        ${row('Dette nette / EBITDA',i=>v('nd',i)!==null&&v('ebitda',i)>0?v('nd',i)/v('ebitda',i):null,x=>x===null||!isFinite(x)?'—':nf(x,1)+'×')}
        ${row('ROE',i=>v('roe',i),pc)}${row('Capitaux propres / actif',i=>v('eq',i)!==null&&v('assets',i)>0?v('eq',i)/v('assets',i)*100:null,pc)}
      </tbody></table></div></div>
      <div class="s6" style="min-width:0"><h3 class="h3" style="margin-top:0">Flux de trésorerie disponibles (FCF)</h3><div class="tw"><table class="tbl fin"><thead><tr><th></th>${y.map(x=>`<th class="n">${esc(x)}</th>`).join('')}</tr></thead><tbody>
        ${row('Flux de trésorerie d\'exploitation',i=>v('cfo',i))}${row('Investissements (capex)',i=>v('capex',i)!==null?-v('capex',i):null)}
        ${row('<b>Free cash flow</b>',fcf,null,true)}${row('Marge de FCF (FCF / CA)',i=>fcf(i)!==null&&v('rev',i)>0?fcf(i)/v('rev',i)*100:null,pc,true)}
        ${row('Conversion (FCF / résultat net)',i=>fcf(i)!==null&&v('ni',i)>0?fcf(i)/v('ni',i)*100:null,pc)}
        ${row('Rendement FCF (FCF / capitalisation actuelle)',i=>fcf(i)!==null&&capR>0?fcf(i)/capR*100:null,pc,true)}
        ${row('Croissance du FCF',i=>i&&fcf(i)!==null&&fcf(i-1)>0?(fcf(i)/fcf(i-1)-1)*100:null,pc,true)}
      </tbody></table></div></div></div>
    <p class="note">Source : ${a.src?`<a href="${esc(a.src)}" target="_blank" rel="noopener">${esc(a.srcNote||'comptes publiés')}</a>`:esc(a.srcNote||'comptes publiés')}. FCF publié, sinon flux d'exploitation − capex. Une case vide = donnée non publiée.</p></div>`;
  const ref=[...G.querySelectorAll(':scope>.card')].find(c=>/^3\. Fondamentaux/.test(((c.querySelector('h2')||{}).textContent||'').trim()));
  if(ref)ref.insertAdjacentHTML('afterend',h);else G.insertAdjacentHTML('beforeend',h);}

/* ---------- 3. Sélecteur : coté / non coté ---------- */
const NC_IND_OF_SEC=k=>(typeof SC38_IND==='object'&&SC38_IND[k]?SC38_IND[k][0]:null);
const ncInd=c=>Number.isInteger(c.ind)?c.ind:NC_IND_OF_SEC(c.sec);
const ncList=()=>(S.sc.list||[]).filter(c=>c.fund!=='Coté');   /* un dossier non coté ne peut pas être marqué « Coté » */
function ncM1(){const D=ncList(),cnt={};D.forEach(c=>{const i=ncInd(c);if(i!==null)cnt[i]=(cnt[i]||0)+1;});
  const yk=ui.ncY==='opm'?'opm':'g5',yl=yk==='g5'?'Croissance du BPA à 5 ans':'Marge opérationnelle';
  const In=UNIV.ind.map((d,i)=>({d,i})).filter(x=>isFinite(x.d.eve)&&x.d.eve>0&&x.d.eve<80&&isFinite(x.d[yk])),tx=mmMed(In.map(x=>x.d.eve)),ty=mmMed(In.map(x=>x.d[yk]));
  const pts=In.map(({d,i})=>({x:d.eve,y:d[yk],id:String(i),label:d.fi.length>24?d.fi.slice(0,23)+'…':d.fi,aria:`${d.fi} (${d.fs}) : VE/EBITDA ${nf(d.eve,1)}×, ${yl} ${nf(d[yk],1)} %${cnt[i]?', '+cnt[i]+' dossier(s) non coté(s)':''}`,
    r:cnt[i]?6+Math.min(cnt[i],4):3.5,cls:(d.eve<=tx&&d[yk]>=ty?'ok':d[yk]>=ty?'am':d.eve<=tx?'':'ko')+(i===ui.ncInd?' sel':'')}));
  return`<div class="card s12" id="nc-m1"><h2><span>Mapping 1 : marché global, toutes les industries <span class="meta">${In.length} industries · choisissez celle qui mérite votre argent</span></span>
      <select class="f noprint" data-ncy style="width:auto"><option value="g5"${yk==='g5'?' selected':''}>Axe vertical : croissance du BPA à 5 ans</option><option value="opm"${yk==='opm'?' selected':''}>Axe vertical : marge opérationnelle</option></select></h2>
    <div class="mmwrap">${mmScatter(pts,{title:'Industries',xl:'VE / EBITDA du secteur (inversé : moins cher à droite) · ×',yl:yl+' · %',inv:true,tx,ty,sparse:true}).replace(/data-act="mmpt"/g,'data-act="ncind"')}</div>
    <p class="note">Repères de valorisation et de rentabilité de chaque industrie : Aswath Damodaran (NYU Stern), janvier 2026. Seuils : médianes (VE/EBITDA ${nf(tx,1)}×, ${yl.toLowerCase()} ${nf(ty,1)} %). Gros point : industrie où vous avez des dossiers non cotés. Un clic ouvre le Mapping 2 de l'industrie.</p></div>`;}
function ncM2(){if(ui.ncInd===undefined||ui.ncInd===null||!UNIV.ind[ui.ncInd])return`<div class="card s12" id="nc-m2"><h2>Mapping 2 : sociétés non cotées de l'industrie</h2><p class="note">Cliquez une industrie du Mapping 1.</p></div>`;
  const d=UNIV.ind[ui.ncInd],L=ncList().filter(c=>ncInd(c)===ui.ncInd);
  const pts=L.map(c=>{const f=coFlags(c);return{x:c.liq*10,y:f.a,id:c.id,label:c.n,aria:`${c.n} : liquidité ${nf(c.liq,1)}/10, attractivité ${nf(f.a,0)}`,r:4+clamp(Math.log10((+c.arr||0)+1)*2.2,0,7),cls:(f.gem?'ok':f.end?'ko':passes(c)?'ok':'am')+(c.id===ui.sel?' sel':'')};});
  return`<div class="card s12" id="nc-m2"><h2><span>Mapping 2 : ${esc(d.fi)} <span class="meta">${esc(d.fs)} · ${L.length} société${L.length>1?'s':''} non cotée${L.length>1?'s':''} (vos dossiers)</span></span><button class="btn sm pri noprint" data-act="ncadd">＋ Nouveau dossier dans cette industrie</button></h2>
    ${L.length?`<div class="mmwrap">${mmScatter(pts,{title:'Sociétés non cotées',xl:'Liquidité de l\'investissement · /100',yl:'Attractivité · /100',tx:50,ty:55}).replace(/data-act="mmpt"/g,'data-act="ncco"')}</div><p class="note">Un clic sur une société ouvre son analyse détaillée (tamis d'entrée, grille fondamentale, valorisation) juste en dessous.</p>`
      :'<p class="note">Aucun dossier non coté dans cette industrie : créez-en un avec le bouton ci-dessus.</p>'}</div>`;}
function sc840(){if(ui.tab!=='sc')return;const P=document.getElementById('p-sc'),G=P&&(P.querySelector(':scope>.grid')||P);if(!G)return;
  const seg=G.querySelector('.sc38seg');if(seg)seg.classList.add('sc40seg');
  if((ui.scMap||'cot')!=='nc'){[...G.querySelectorAll(':scope>.card')].forEach(c=>{if(c.querySelector('.tamis,[data-act=lbogen],.dd')||/^Dossiers class|^Paramètres$/.test(((c.querySelector('h2')||{}).textContent||'').trim()))c.remove();});return;}   /* coté : aucune donnée non cotée */
  const T=c=>((c.querySelector('h2')||{}).textContent||'').trim();
  [...G.querySelectorAll(':scope>.card')].forEach(c=>{const t=T(c);if(/^I\. Tamis d'entrée/.test(t)||/^II\. Mapping 1/.test(t)||/^Mapping 2/.test(t)||/^Sociétés cotées comparables/.test(t))c.remove();});
  G.querySelectorAll('.sc38p').forEach(x=>x.remove());
  const anchor=G.querySelector('.sc38seg');const h=ncM1()+ncM2();if(anchor)anchor.insertAdjacentHTML('afterend',h);else G.insertAdjacentHTML('afterbegin',h);
  /* fiche du dossier ouvert : champ Industrie, pas d'option « Coté » */
  const det=[...G.querySelectorAll(':scope>.card')].find(c=>c.querySelector('.tamis'));
  if(det){const ci=S.sc.list.findIndex(x=>x.id===ui.sel),c=S.sc.list[ci];
    det.querySelectorAll('select option[value="Coté"]').forEach(o=>o.remove());
    if(c){const f=det.querySelector('.fields');const opts=UNIV.ind.map((d,i)=>({d,i})).sort((a,b)=>(a.d.fs+a.d.fi).localeCompare(b.d.fs+b.d.fi,'fr'));
      const sel=`<label class="fld"><span class="lb">Industrie</span><select class="f" data-ncind="${esc(c.id)}">${[...new Set(opts.map(o=>o.d.fs))].map(s=>`<optgroup label="${esc(s)}">${opts.filter(o=>o.d.fs===s).map(o=>`<option value="${o.i}"${o.i===ncInd(c)?' selected':''}>${esc(o.d.fi)}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
      if(f)f.insertAdjacentHTML('beforeend',sel);}
    const m2=G.querySelector('#nc-m2');if(m2&&det.previousElementSibling!==m2)m2.after(det);}}
{const _rs=renderSC;renderSC=function(){const r=_rs.apply(this,arguments);try{sc840();}catch(e){console.error('sc840',e);}return r;};}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='ncind'){ui.ncInd=+b.dataset.id;save();renderAll();setTimeout(()=>{const m=document.getElementById('nc-m2');if(m)m.scrollIntoView({behavior:'smooth',block:'start'});},60);}
  else if(a==='ncco'){ui.sel=b.dataset.id;save();renderAll();setTimeout(()=>{const d=[...document.querySelectorAll('#p-sc .card')].find(c=>c.querySelector('.tamis'));if(d)d.scrollIntoView({behavior:'smooth',block:'start'});},60);}
  else if(a==='ncadd'){const n0=S.sc.list.length,t=document.createElement('button');t.dataset.act='addco';t.style.display='none';document.body.appendChild(t);t.click();t.remove();
    const c=S.sc.list[S.sc.list.length-1];if(S.sc.list.length>n0&&c){c.ind=ui.ncInd;c.fund=c.fund==='Coté'?'Capital-risque':c.fund;const sk=Object.keys(SC38_IND||{}).find(k=>(SC38_IND[k]||[]).includes(ui.ncInd));if(sk)c.sec=sk;ui.sel=c.id;save();renderAll();toast('Dossier non coté créé dans « '+UNIV.ind[ui.ncInd].fi+' » : renseignez-le');}}});
document.addEventListener('change',e=>{const t=e.target;if(!t)return;
  if(t.dataset&&t.dataset.ncind){const c=S.sc.list.find(x=>x.id===t.dataset.ncind);if(c){c.ind=+t.value;ui.ncInd=c.ind;save();renderAll();}}
  else if(t.hasAttribute&&t.hasAttribute('data-ncy')){ui.ncY=t.value;renderAll();}});

/* ---------- 4. Suivi placement : compte MetaTrader 5 uniquement ---------- */
function mt5Perf(){const M=S.mt5||{},T=(S.jr.trades||[]).filter(t=>['MT5','MT4','MetaApi','CSV','EA'].includes(t.src)||/^mt5-/.test(String(t.id))).slice().sort((a,b)=>(a.d+(a.t||''))<(b.d+(b.t||''))?-1:1),u=M.ccy||(M.info||{}).ccy||'EUR';
  const P=T.map(t=>({d:t.d,p:jrPnl(t)})).filter(x=>isFinite(x.p)),tot=P.reduce((s,x)=>s+x.p,0),info=M.info||{},bal=isFinite(+info.balance)?+info.balance:null,start=bal!==null?bal-tot:null;
  const byD={};P.forEach(x=>{byD[x.d]=(byD[x.d]||0)+x.p;});const days=Object.keys(byD).sort();let cum=start||0;const curve=days.map(d=>{cum+=byD[d];return{time:d,value:+cum.toFixed(2)};});
  const byM={};P.forEach(x=>{const m=String(x.d).slice(0,7);byM[m]=(byM[m]||0)+x.p;});const months=Object.keys(byM).sort().reverse().slice(0,12);
  const O=M.open||[];
  return{T,P,tot,u,curve,months,byM,O,start,bal};}
function mt5PerfHTML(){const K=mt5Perf(),u=K.u;
  const eq=K.curve.length?`<div class="lwc" id="mt5-eq" style="height:260px"></div>`:'<p class="note">Aucun trade clôturé reçu : la courbe s\'affichera dès la première synchronisation du compte.</p>';
  return`<div class="card s12" id="mt5perf"><h2><span>Performance du compte <span class="meta">${K.T.length} trades clôturés${K.start!==null?' · capital de départ reconstitué '+nf(K.start,0)+' '+esc(u):''}</span></span></h2>
    ${eq}
    <div class="grid" style="gap:12px;margin-top:10px">
      <div class="s6" style="min-width:0"><h3 class="h3" style="margin-top:0">Résultat par mois</h3><div class="tw"><table class="tbl fin"><thead><tr><th>Mois</th><th class="n">Résultat</th>${K.start>0?'<th class="n">% du capital</th>':''}</tr></thead><tbody>
        ${K.months.map(m=>`<tr><td>${esc(m)}</td><td class="n ${cls(K.byM[m])}">${nf(K.byM[m],2)} ${esc(u)}</td>${K.start>0?`<td class="n ${cls(K.byM[m])}">${sgn(K.byM[m]/K.start*100,2)}</td>`:''}</tr>`).join('')||'<tr><td colspan="3" class="meta">Aucun mois clôturé</td></tr>'}</tbody></table></div></div>
      <div class="s6" style="min-width:0"><h3 class="h3" style="margin-top:0">Positions ouvertes</h3><div class="tw"><table class="tbl fin"><thead><tr><th>Symbole</th><th>Sens</th><th class="n">Volume</th><th class="n">Prix d'entrée</th><th class="n">Résultat latent</th></tr></thead><tbody>
        ${K.O.map(o=>`<tr><td>${esc(o.sym||o.symbol||'')}</td><td>${esc(o.side||'')}</td><td class="n">${nf(+o.vol||+o.volume||0,2)}</td><td class="n">${nf(+o.open||+o.price||+o.open_price||NaN,5)}</td><td class="n ${cls(+o.profit||0)}">${isFinite(+o.profit)?nf(+o.profit,2)+' '+esc(u):'—'}</td></tr>`).join('')||'<tr><td colspan="5" class="meta">Aucune position ouverte</td></tr>'}</tbody></table></div></div></div>
    <p class="note">Source : votre compte MetaTrader 5 (EA OverrideSync toutes les 30 s, ou rapport d'historique importé). Aucun ordre n'est passé depuis FOMO.DESK.</p></div>`;}
if(typeof renderPF==='function'){const _rp=renderPF;renderPF=function(){const r=_rp.apply(this,arguments);try{const P=document.getElementById('p-pf');if(!P)return r;
  P.innerHTML=`<div class="grid">${mt5Card()}${mt5PerfHTML()}</div>`;
  const c=P.querySelector('.card');if(c){c.querySelectorAll('.stat').forEach(s=>{if(/Portefeuille de titres/.test((s.querySelector('.k')||{}).textContent||''))s.remove();});c.querySelectorAll('.dec').forEach(d=>{if(/Lecture croisée/.test(d.textContent))d.remove();});
    const b=c.querySelector('[data-act=mt5open]');if(b&&!(S.mt5&&S.mt5.linked)){b.textContent='🔌 Connecter mon MT5';b.classList.add('pri','mt5go');}
    c.querySelectorAll('p.note').forEach(n=>{if(/comparer la performance réelle du compte de trading à celle du portefeuille/.test(n.textContent))n.textContent='Connectez votre compte MetaTrader 5 : solde, fonds propres, courbe de performance, résultats mensuels et positions ouvertes s\'affichent ici automatiquement.';});}
  const K=mt5Perf();if(K.curve.length){queueChart('mt5-eq',el=>{const ch=lwBase(el,p=>nf(p,0));const s=ch.addAreaSeries({lineColor:'#10B981',topColor:'rgba(16,185,129,.25)',bottomColor:'rgba(16,185,129,0)',lineWidth:2,priceLineVisible:false,title:'Solde'});s.setData(K.curve);ch.timeScale().fitContent();return ch;},()=>'');mountCharts();}}
  catch(e){console.error('pf840',e);}return r;};}

/* ---------- 5. Commodities ---------- */
{const _cc=cmCalc;cmCalc=function(){const C=_cc.apply(this,arguments);try{if(typeof cmProv!=='function')return C;
  C.R.forEach(r=>{if(!r||!r.d)return;if(cmProv(r.d,'silver')&&r.bS===0){r.bS=null;r.bSSt='NO DATA';r.bSRk='';}if(cmProv(r.d,'gold')&&r.bG===0){r.bG=null;r.bGSt='NO DATA';r.bGRk='';}});}catch(e){}return C;};}
{const _rc=renderCM;renderCM=function(){const r=_rc.apply(this,arguments);try{const P=document.getElementById('p-cm');if(!P)return r;
  const c=[...P.querySelectorAll(':scope>.grid>.card')].find(x=>/^Sources/.test(((x.querySelector('h2')||{}).textContent||'').trim()));
  if(c){const open=!!ui.cmSrcOpen,h=c.querySelector('h2');[...c.children].forEach(ch=>{if(ch!==h)ch.style.display=open?'':'none';});
    if(!h.querySelector('[data-act=cmsrc]'))h.insertAdjacentHTML('beforeend',`<button class="btn sm noprint" data-act="cmsrc" style="margin-left:auto">${open?'Replier':'Afficher les sources'}</button>`);h.style.display='flex';h.style.alignItems='center';}}
  catch(e){console.error('cm840',e);}return r;};}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act=cmsrc]');if(b){ui.cmSrcOpen=!ui.cmSrcOpen;renderCM();}});

/* ---------- styles ---------- */
{const st=document.createElement('style');st.textContent=`
.sc40seg .seg button{position:relative;border:1px solid transparent;transition:background .25s,box-shadow .25s,transform .15s}
.sc40seg .seg button[data-id=cot]{color:#60A5FA}.sc40seg .seg button[data-id=nc]{color:#C084FC}
.sc40seg .seg button[data-id=cot][aria-selected=true]{background:rgba(59,130,246,.18);border-color:rgba(59,130,246,.6);color:#BFDBFE;animation:sc40b 2.4s ease-in-out infinite}
.sc40seg .seg button[data-id=nc][aria-selected=true]{background:rgba(168,85,247,.18);border-color:rgba(168,85,247,.6);color:#E9D5FF;animation:sc40v 2.4s ease-in-out infinite}
.sc40seg .seg button:hover{transform:translateY(-1px)}
@keyframes sc40b{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,.0)}50%{box-shadow:0 0 0 4px rgba(59,130,246,.25)}}
@keyframes sc40v{0%,100%{box-shadow:0 0 0 0 rgba(168,85,247,.0)}50%{box-shadow:0 0 0 4px rgba(168,85,247,.25)}}
#nc-m1,#nc-m2{border-left:3px solid rgba(168,85,247,.6)}.sc38cot{border-left:3px solid rgba(59,130,246,.6)}
.mt5go{animation:sc40b 2.4s ease-in-out infinite}
.vl-target .x{color:var(--up)!important;font-size:24px}
@media (prefers-reduced-motion:reduce){.sc40seg .seg button,.mt5go{animation:none!important}}`;document.head.appendChild(st);}
