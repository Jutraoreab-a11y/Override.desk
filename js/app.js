/* ============ Abonnement ============ */
const MODNAMES={bp:'Business plan',an:'Analyse financière',sc:'Sélecteur & mapping',pf:'Suivi & placements',cm:'Commodities & flows',pc:'Calculateur de position',jr:'Journal de trading'};
function renderAB(){
  const full=39*Object.keys(MODNAMES).length;if(!MODNAMES[ui.plan])ui.plan='bp';
  $('#p-ab').innerHTML=`<div class="ph"><div><h1>Abonnement</h1><p>Un module à l'unité ou les sept volets en pack. Sans engagement, résiliable à tout moment.</p></div></div>
  <div class="plans">
    <div class="plan"><h2 style="margin:0;font-size:16px">Module</h2><div class="price">39 € <small>HT / mois</small></div><div class="note" style="margin:0">Un volet au choix</div>
      <div class="chips" role="radiogroup" aria-label="Choix du module">${Object.entries(MODNAMES).map(([k,l])=>`<button class="chip" role="radio" data-act="plan" data-id="${k}" aria-pressed="${ui.plan===k}" aria-checked="${ui.plan===k}">${l}</button>`).join('')}</div>
      <ul><li>Override complet sur le volet</li><li>Export PDF institutionnel</li><li>Sauvegarde des dossiers</li></ul>
      <button class="btn" data-act="buy">S'abonner : ${MODNAMES[ui.plan]}</button></div>
    <div class="plan best"><h2 style="margin:0;font-size:16px">Pack global <span class="tag ok">−${nf((1-69/full)*100,0)} %</span></h2><div class="price">69 € <small>HT / mois</small></div><div class="note" style="margin:0">Les sept volets, au lieu de ${full} €</div>
      <ul><li>Business plan, Analyse financière, Sélecteur, Suivi et MT5, Commodities, Calculateur, Journal</li><li>Données partagées entre volets</li><li>Override et export PDF illimités</li></ul>
      <button class="btn pri" data-act="buy">S'abonner au pack global</button></div>
  </div>`;
}

/* ============ Rendu global ============ */
const MODS=[['bp','Business plan','bp'],['an','Analyse financière','an'],['sc','Sélecteur & mapping','sc'],['pf','Suivi & placements','pf'],['cm','Commodities & flows','cm'],['pc','Calculateur de position','pc'],['jr','Journal de trading','jr']];
const PANELS=['bp','an','sc','pf','cm','pc','jr','ab'];
const BPSEC=['Fiche de renseignements','Executive summary et offre','Équipe','Étude de marché','Marketing, offre et prix','Psychologie client','Concurrence et environnement','Commercial','Paramètres et marché adressable','Partie financière','Annexes'];
let lastCalc=new Date();
function bpState(){const r=bpCalc(),AL=bpAlerts(r),ko=AL.filter(a=>a.l==='ko').length;return{r,AL,ko,res:AL.length-ko,st:ko?['ko',"Modèle non viable en l'état"]:AL.length?['am','Cohérent sous réserves']:['ok','Modèle cohérent']};}
function ctxHTML(){
  if(ui.tab==='bp')return`<span class="ctx-t">${esc(S.bp.name)||'Projet sans nom'}</span><span class="ctx-s">Business plan, horizon ${Math.max(3,Math.min(5,+S.bp.h||5))} ans</span>`;
  if(ui.tab==='an')return`<label class="sym">${ic('search')}<input id="q" placeholder="Ticker ou société : AAPL, LVMH, Intel…" autocomplete="off" spellcheck="false" aria-label="Rechercher un titre"></label><span class="ctx-s">Rapport d'analyse financière</span>`;
  if(ui.tab==='sc'){const D=S.sc.list.filter(c=>!c.lead&&scPer().inP(c)),n=D.filter(passes).length;return`<span class="ctx-t">Sélecteur d'entreprises</span><span class="ctx-s">${n} dossier${n>1?'s':''} retenu${n>1?'s':''} sur ${D.length}</span>`;}
  if(ui.tab==='cm')return`<div class="seg" role="tablist" aria-label="Actif">${Object.entries(CM_ASSETS).map(([k,l])=>`<button role="tab" data-act="cma" data-id="${k}" aria-selected="${(ui.cmA||'brent')===k}">${l}</button>`).join('')}</div><span class="vsep"></span><div class="seg" role="tablist" aria-label="Vue">${[['t','Pression & approvisionnement'],['c','Confirmation & corrélations']].map(([k,l])=>`<button role="tab" data-act="cmt" data-id="${k}" aria-selected="${(ui.cmT||'t')===k}">${l}</button>`).join('')}</div>`;
  if(ui.tab==='pf')return`<span class="ctx-t">Suivi des actifs et placements</span><span class="ctx-s">${S.pf.positions.length} lignes · MT5 ${S.mt5.linked?'lié':'non lié'}</span>`;
  if(ui.tab==='pc'){const c=pcCalc();return`<span class="ctx-t">Calculateur de position</span><span class="ctx-s">${esc(S.pc.sym)} · ${isFinite(c.lots)?nf(c.lots,2)+' lot(s)':'entrée et stop à saisir'} · risque ${pct(+S.pc.risk,2)}</span>`;}
  if(ui.tab==='jr'){jrInit();return`<span class="ctx-t">Journal de trading</span><span class="ctx-s">${S.jr.trades.length} trade${S.jr.trades.length>1?'s':''} enregistré${S.jr.trades.length>1?'s':''}</span>`;}
  return`<span class="ctx-t">Abonnement</span>`;
}
function sideHTML(){
  const kv=(l,v,neg)=>`<div class="kv"><span>${l}</span><b class="${neg?'down':''}">${v}</b></div>`;
  if(ui.tab==='bp'){const{r,ko,res,st}=bpState(),Hy=r.Y[r.H-1],k=r.mk;
    return`<div class="sideh">Synthèse du modèle</div>
    <div class="vbox ${st[0]}"><b><span class="dot ${st[0]}"></span>${st[1]}</b><span>${ko} point${ko>1?'s':''} bloquant${ko>1?'s':''}, ${res} réserve${res>1?'s':''}</span></div>
    ${kv('CA année '+r.H,big(Hy.rev))}${kv('EBITDA année '+r.H,big(Hy.ebitda),Hy.ebitda<0)}${kv('Point mort EBITDA',r.be?'Année '+r.be.t:'Non atteint',!r.be)}${kv('Point bas de trésorerie',big(r.min.cash),r.min.cash<0)}${kv('LTV / CAC',nf(r.ratio,1)+'×',r.ratio<3)}${kv('Part de marché A'+r.H,pct(k.proj[k.proj.length-1].sv,2))}${kv('Tamis OVERRIDE',k.passN+'/4',k.passN<4)}
    <div class="sideh" style="margin-top:8px">Sections</div>
    <div class="secl">${BPSEC.map((t,i)=>`<button data-act="goto" data-id="bp-s${i}"><span>${String(i).padStart(2,'0')}</span>${t}</button>`).join('')}</div>`;}
  if(ui.tab==='an'){const A=S.an.assets,R=Object.keys(A).map(k=>[k,anCalc(k)]),np=R.filter(x=>x[1].positive).length;
    return`<div class="sideh">Titres couverts <span class="meta">${np} positive${np>1?'s':''} sur ${R.length}</span></div>
    <div class="wl-h"><span>Titre</span><span>Cours</span><span>Potentiel</span></div>
    ${R.map(([k,r])=>`<button class="wl${k===ui.tk?' on':''}" data-act="tk" data-id="${k}"><span class="wl-s"><span class="dot ${r.positive?'ok':'ko'}"></span><b>${esc(A[k].t)}</b><small>${esc(A[k].n)}</small></span><span class="wl-p">${nf(+A[k].price,2)}</span><span class="wl-c ${cls(r.up)}">${isFinite(r.up)?sgn(r.up*100,0):'—'}</span></button>`).join('')}
    <p class="note" style="margin:10px 12px">Point vert : décision positive (qualité, tamis et prix réunis). Potentiel : écart entre la valeur de référence et le cours.</p>`;}
  if(ui.tab==='sc'){const L=[...S.sc.list].filter(c=>!c.lead&&scPer().inP(c)).sort((x,y)=>attr(y)-attr(x));
    return`<div class="sideh">Dossiers <span class="meta">par attractivité</span></div>
    <div class="wl-h"><span>Entreprise</span><span>Attract.</span><span>Liquid.</span></div>
    ${L.map(x=>`<button class="wl${x.id===ui.sel?' on':''}" data-act="pick" data-id="${esc(x.id)}"><span class="wl-s"><span class="dot ${passes(x)?'ok':'ko'}"></span><b>${esc(x.n)}</b><small>${esc((SECT[x.sec]||{}).l||x.sec)}</small></span><span class="wl-p">${nf(attr(x),0)}</span><span class="wl-c" style="color:var(--mute)">${auto(x.liq)}/10</span></button>`).join('')}`;}
  if(ui.tab==='cm'){const{s,R,N}=cmCalc();return`<div class="sideh">Matières premières <span class="meta">${new Date(s.d[N-1]+'T00:00:00').toLocaleDateString('fr-FR')}</span></div><div class="wl-h"><span>Actif</span><span>Cours</span><span>Var.</span></div>${Object.entries(CM_ASSETS).map(([k,l])=>{let i=N-1;while(i>0&&s[k][i]===null)i--;const r=R[i],sg=k==='brent'?r.sigChine:k==='gold'?r.sigGold:r.sigSilver,v=s[k+'V'][i];return`<button class="wl${k===(ui.cmA||'brent')?' on':''}" data-act="cma" data-id="${k}"><span class="wl-s"><span class="dot ${cmCls(sg)}"></span><b>${l}</b><small>${esc(cmStrip(sg).split(' : ')[0])}</small></span><span class="wl-p">${nf(s[k][i],2)}</span><span class="wl-c ${v!==null?cls(v):''}">${v!==null?sgn(v*100,2):'—'}</span></button>`;}).join('')}<div class="sideh" style="margin-top:8px">Ratios</div><div class="kv"><span>Or / Argent</span><b>${nf(R[N-1].gs,1)}</b></div><div class="kv"><span>Or / Brent</span><b>${nf(R[N-1].gb,1)}</b></div><div class="kv"><span>USD/CNH</span><b>${nf(s.cnh[N-1],4)}</b></div>`;}
  if(ui.tab==='pc'){const c=pcCalc(),pl=S.pc.plan,u=S.pc.ccy;return`<div class="sideh">Plan de risque</div>${kv('Compte',nf(+pl.acct,0)+' '+u)}${kv('Risque par trade',pct(+pl.rpt,2)+' · '+nf(pl.acct*pl.rpt/100,2)+' '+u)}${kv('Perte maximale par jour',pct(+pl.day,1)+' · '+nf(pl.acct*pl.day/100,0)+' '+u)}${kv('Perte maximale totale',pct(+pl.tot,1)+' · '+nf(pl.acct*pl.tot/100,0)+' '+u)}${kv('Trades par jour',pl.maxT)}
    <div class="sideh" style="margin-top:8px">Contrôles du trade</div>${c.checks.map(x=>`<div class="kv"><span><span class="dot ${x[3]?'ok':'ko'}"></span> ${x[0]}</span><b>${x[1]}</b></div>`).join('')}`;}
  if(ui.tab==='jr'){jrInit();const T=S.jr.trades,st=jrStats(T.filter(t=>t.d.slice(0,7)===ui.jrM)),L=[...T].sort((a,b)=>(b.d+(b.t||'')).localeCompare(a.d+(a.t||''))).slice(0,8),u=S.pc.ccy;
    return`<div class="sideh">Mois affiché <span class="meta">${ui.jrM}</span></div>${kv('Trades',st.n)}${kv('P&L',nf(st.tot,2)+' '+u,st.tot<0)}${kv('Taux de réussite',isFinite(st.wr)?pct(st.wr*100,0):'—')}${kv('Profit factor',isFinite(st.pf)?nf(st.pf,2):'—')}
    <div class="sideh" style="margin-top:8px">Derniers trades</div><div class="wl-h"><span>Trade</span><span>P&L</span><span>R</span></div>${L.map(t=>{const p=jrPnl(t),r=jrR(t);return`<button class="wl" data-act="jrday" data-id="${t.d}"><span class="wl-s"><span class="dot ${p>=0?'ok':'ko'}"></span><b>${esc(t.sym)}</b><small>${esc(t.side)} · ${fdate(t.d)}</small></span><span class="wl-p ${isFinite(p)?cls(p):''}">${isFinite(p)?nf(p,0):'—'}</span><span class="wl-c" style="color:var(--mute)">${isFinite(r)?nf(r,1):'—'}</span></button>`;}).join('')||'<p class="note" style="margin:10px 12px">Aucun trade.</p>'}`;}
  if(ui.tab==='pf'){const K=pfCalc();
    return`<div class="sideh">Lignes <span class="meta">${big(K.V)}</span></div>
    <div class="wl-h"><span>Titre</span><span>Perf.</span><span>Poids</span></div>
    ${K.ls.map(x=>`<button class="wl${x.i===ui.pfSel?' on':''}" data-act="pfsel" data-id="${x.i}"><span class="wl-s"><span class="dot ${x.sig[0]}"></span><b>${esc(x.a.t)}</b><small>${esc(x.sig[1])}</small></span><span class="wl-p ${cls(x.perf)}">${sgn(x.perf,1)}</span><span class="wl-c" style="color:var(--mute)">${pct(x.w,0)}</span></button>`).join('')}`;}
  return'';
}
function statusHTML(){
  let s='';
  if(ui.tab==='bp'){const{st}=bpState();s=`<span class="sti"><span class="dot ${st[0]}"></span><b>${st[1]}</b></span>`;}
  else if(ui.tab==='an'){const a=S.an.assets[ui.tk];if(a){const r=anCalc(ui.tk);s=`<span class="sti"><span class="dot ${r.positive?'ok':'ko'}"></span><b>${esc(a.t)} : décision ${r.positive?'positive':'négative'}</b></span>`;}}
  else if(ui.tab==='sc'){const n=S.sc.list.filter(c=>!c.lead&&scPer().inP(c)&&passes(c)).length;s=`<span class="sti"><span class="dot ok"></span><b>${n} dossier${n>1?'s':''} retenu${n>1?'s':''}</b></span>`;}
  else if(ui.tab==='cm'){const{R,N}=cmCalc(),r=R[N-1];s=`<span class="sti"><span class="dot ${cmCls(r.sigChine)}"></span><b>Brent : ${esc(cmStrip(r.sigChine).split(' : ')[0])}</b></span><span class="sti"><span class="dot ${cmCls(r.sigGold)}"></span><b>Or : ${esc(cmStrip(r.sigGold).split(' : ')[0])}</b></span>`;}
  else if(ui.tab==='pc'){const c=pcCalc(),ok=c.checks.every(x=>x[3]);s=`<span class="sti"><span class="dot ${ok?'ok':'ko'}"></span><b>${ok?'Trade conforme au plan':'Hors plan : '+c.checks.filter(x=>!x[3]).map(x=>x[0].toLowerCase()).join(', ')}</b></span>`;}
  else if(ui.tab==='jr'){const st=jrStats(S.jr.trades);s=`<span class="sti"><span class="dot ${st.tot>=0?'ok':'ko'}"></span><b>${st.n} trades · ${nf(st.tot,2)} ${S.pc.ccy}</b></span>`;}
  else if(ui.tab==='pf'){const K=pfCalc();s=`<span class="sti"><span class="dot ${K.alert?'ko':K.div?'am':'ok'}"></span><b>${K.div} divergence${K.div>1?'s':''}, ${K.alert} alerte${K.alert>1?'s':''}</b></span>`;}
  const n=document.querySelectorAll('.main .ovr').length;
  if(n)s+=`<span class="sti"><span class="dot am"></span>${n} valeur${n>1?'s':''} forcée${n>1?'s':''}</span>`;
  if(pending.size)s+=`<span class="sti"><span class="dot ac"></span>${pending.size} modification${pending.size>1?'s':''} en attente de recalcul</span>`;
  s+=`<span class="r"><span>${ui.tab==='pc'?'Leviers ESMA 2018 · EUR/USD 1,1219 (20/10/2026)':ui.tab==='jr'?'Saisie manuelle et rapports MT5':ui.tab==='an'||ui.tab==='pf'?'Données publiées MarketScreener, cours du 19-20/10/2026':ui.tab==='cm'?'Classeur TRADING_Dashboard (Investing.com)':ui.tab==='sc'?'Zones : FMI WEO':'Données de démonstration à sourcer'}</span><span>Calculé à ${lastCalc.toLocaleTimeString('fr-FR')}</span><span>${ui.edit?'<b style="color:var(--amber)">Override</b>':'Lecture'}</span></span>`;
  return s;
}
function renderAll(){
  document.body.classList.toggle('editing',ui.edit);
  $('#rail').innerHTML=MODS.map(([k,l,i],n)=>`<button class="rb" data-act="tab" data-id="${k}" title="${n+1}. ${l}"${ui.tab===k?' aria-current="page"':''}>${ic(i)}<span><b class="rbn">${n+1}</b>${l}</span></button>`).join('')+`<span class="rail-sp"></span><button class="rb" data-act="tab" data-id="ab" title="Abonnement"${ui.tab==='ab'?' aria-current="page"':''}>${ic('ab')}<span>Offre</span></button>`;
  $('#ctx').innerHTML=ctxHTML();
  PANELS.forEach(k=>$('#p-'+k).classList.toggle('on',ui.tab===k));
  renderBP();renderAN();renderSC();renderPF();renderCM();renderPC();renderJR();renderAB();
  const side=sideHTML();$('#side').innerHTML=side;$('#app').classList.toggle('noside',!side);
  $('#editBtn').classList.toggle('on',ui.edit);$('#editBtn').setAttribute('aria-pressed',ui.edit);
  $('#editBtn').innerHTML=`${ic(ui.edit?'lock':'pen')}<span class="lbl">${ui.edit?'Verrouiller':'Override'}</span>`;
  $('#pdfBtn').innerHTML=`${ic('dl')}<span class="lbl">Exporter PDF</span>`;
  updBar();
  const t={pc:'Calculateur de position',jr:'Journal de trading',bp:'Business plan',an:"Rapport d'analyse financière",sc:"Sélecteur d'entreprises & double mapping",pf:'Suivi des actifs et placements',cm:'Commodities & flows : '+((ui.cmT||'t')==='t'?'pression et approvisionnement':'confirmation et corrélations'),ab:'Abonnement'}[ui.tab],sub=ui.tab==='bp'?S.bp.name:ui.tab==='an'?(S.an.assets[ui.tk]||{}).n:ui.tab==='cm'?CM_ASSETS[ui.cmA||'brent']:ui.tab==='sc'?('zone '+geoAgg(ui.geo).lab+', '+((S.sc.list.find(c=>c.id===ui.sel)||{}).n||'')):'';
  $('#printHead').innerHTML=`<h1>OVERRIDE.DESK : ${esc(t)}${sub?', '+esc(sub):''}</h1><p>Édité le ${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}. ${document.querySelectorAll('#p-'+ui.tab+' .ovr').length} valeur(s) forcée(s) par l'analyste, signalées par *. Rapport d'aide à la décision, ne constitue pas un conseil en investissement.</p>`;
}
function updBar(){
  $('#recalcBtn').innerHTML=`${ic('calc')}<span class="lbl">Recalculer</span>${pending.size?`<span class="pend">${pending.size}</span>`:''}`;
  $('#recalcBtn').classList.toggle('hot',pending.size>0);
  $('#status').innerHTML=statusHTML();
}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2600);}
function recalc(msg){const n=pending.size;pending.clear();lastCalc=new Date();renderAll();save();toast(msg||(n?`Recalculé : ${n} modification${n>1?'s':''} appliquée${n>1?'s':''}`:'Recalculé'));}

/* ============ Événements ============ */
function lkVal(el){const t=el.dataset.lt;let v=el.value;if(t==='n'){v=parseFloat(String(v).replace(/\s/g,'').replace(',','.'));return isFinite(v)?v:undefined;}if(t==='nn'){if(String(v).trim()==='')return null;v=parseFloat(String(v).replace(/\s/g,'').replace(',','.'));return isFinite(v)?v:undefined;}return v;}
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset&&el.dataset.lk){const v=lkVal(el);if(v===undefined)return;setP(S,el.dataset.lk,v);if(el.dataset.live&&LIVE[ui.tab]){LIVE[ui.tab]();save();}return;}
  if(el.dataset&&el.dataset.ui){ui[el.dataset.ui]=el.value;renderAll();save();return;}
  if(!el.classList||!el.classList.contains('f')||!ui.edit||!el.dataset.k)return;
  const k=el.dataset.k,t=el.dataset.t;let v=el.value;
  if(t==='nn')v=el.value===''?null:parseFloat(el.value);
  else if(t==='n'){v=el.value===''?0:parseFloat(el.value);if(!isFinite(v))return;}
  setP(S,k,v);el.classList.toggle('ovr',JSON.stringify(v)!==JSON.stringify(getP(DEF,k)));pending.add(k);updBar();
});
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset&&el.dataset.prj){prjSwitch(el.dataset.prj,el.value,false);return;}
  if(el.dataset&&el.dataset.ver){prjSwitch(el.dataset.ver,el.value,true);return;}
  if(!el.dataset||!el.dataset.lk)return;
  const v=lkVal(el);if(v!==undefined)setP(S,el.dataset.lk,v);
  if(el.dataset.lk==='pc.sym'){S.pc.entry=null;S.pc.sl=null;S.pc.tp=null;}
  save();setTimeout(()=>{const a=document.activeElement,k=a&&a.dataset?a.dataset.lk:null,sc=$('#main').scrollTop;renderAll();$('#main').scrollTop=sc;if(k){const n=document.querySelector(`[data-lk="${CSS.escape(k)}"]`);if(n)n.focus();}},0);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.lk&&e.target.tagName==='INPUT'){e.target.blur();return;}
  if(e.key==='Enter'&&e.target.id==='q'){e.preventDefault();doSearch();}
  if((e.key==='Enter'||e.key===' ')&&e.target.closest&&e.target.closest('g.pt[data-act]')){e.preventDefault();e.target.closest('g.pt').dispatchEvent(new MouseEvent('click',{bubbles:true}));}
  if(e.key==='Enter'&&ui.edit&&e.target.classList&&e.target.classList.contains('f')&&e.target.tagName==='INPUT'){recalc();}
});
function doSearch(){
  const q=(($('#q')||{}).value||'').trim();if(!q)return;
  const A=S.an.assets,up=q.toUpperCase(),lo=q.toLowerCase();
  const hit=Object.keys(A).find(k=>k===up||A[k].t.toUpperCase()===up||A[k].t.toUpperCase().split('.')[0]===up)||Object.keys(A).find(k=>A[k].n.toLowerCase().includes(lo));
  if(hit){ui.tk=hit;ui.qmsg='';renderAll();save();$('#main').scrollTop=0;return;}
  ui.qmsg=`Aucun titre « ${esc(q)} » dans l'univers couvert. <button class="btn sm" data-act="create" data-id="${esc(q)}">Créer la fiche ${esc(q.toUpperCase())}</button> puis saisir les comptes publiés en Override.`;renderAll();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const act=b.dataset.act,id=b.dataset.id;
  switch(act){
    case 'tab':ui.tab=id;renderAll();save();$('#main').scrollTop=0;window.scrollTo(0,0);break;
    case 'edit':ui.edit=!ui.edit;if(!ui.edit&&pending.size){recalc();}else renderAll();break;
    case 'recalc':recalc();break;
    case 'print':{const was=ui.edit;if(pending.size)recalc('Recalculé avant export');ui.edit=false;renderAll();setTimeout(()=>{window.print();if(was){ui.edit=true;renderAll();}},120);break;}
    case 'reset':{const v=ui.tab;if(v==='jr'){toast('Le journal n\'est jamais réinitialisé : supprimez les trades un par un');break;}if(S[v]){S[v]=clone(DEF[v]);pending.clear();renderAll();save();toast('Volet réinitialisé aux valeurs de référence');}break;}
    case 'tk':ui.tk=id;ui.qmsg='';renderAll();save();break;
    case 'goan':ui.tk=id;ui.tab='an';ui.qmsg='';renderAll();save();$('#main').scrollTop=0;break;
    case 'search':doSearch();break;
    case 'create':{const k=id.toUpperCase().replace(/[^A-Z0-9]/g,'_'),z=[0,0,0,0,0],yr=new Date().getFullYear();
      S.an.assets[k]=A({t:id.toUpperCase(),n:id,sec:'Nouveau groupe',cur:'EUR',rcur:'EUR',fx:1,price:0,pxDate:'',fy:'décembre',shares:1,epsE:null,y:[yr-5,yr-4,yr-3,yr-2,yr-1].map(v=>'FY'+v),rev:[...z],ebitda:[...z],ni:[...z],eps:[...z],fcf:[...z],nd:[...z],roe:[...z],g:5,tg:2,wacc:9,cat:5,catTxt:'',tamS:5,tamTxt:'',src:''});
      ui.tk=k;ui.qmsg='';ui.edit=true;renderAll();save();toast('Fiche créée : saisissez les comptes publiés puis Recalculer');break;}
    case 'pick':ui.sel=id;renderAll();save();break;
    case 'pickSec':ui.secTarget=id;renderAll();save();break;
    case 'pfsel':ui.pfSel=+id;renderAll();save();break;
    case 'goto':{const el=document.getElementById(id);if(el)el.scrollIntoView({block:'start'});break;}
    case 'addrow':{const l=b.dataset.list;getP(S,l).push(clone(ROWTPL[l]));pending.add(l);renderAll();break;}
    case 'delrow':{const l=b.dataset.list;getP(S,l).splice(+b.dataset.i,1);pending.add(l);renderAll();break;}
    case 'addco':{const nid='c'+Date.now();S.sc.list.push(co(nid,'Nouveau dossier',ui.secTarget,5,5,5,5,5,5,0,0,1,10,8,{ebm:0,fund:'Capital-risque',serial:0,tier:'',tgt:0},['','','','','','','','','','']));ui.sel=nid;pending.add('co');renderAll();break;}
    case 'bp2sc':bpToSelector();ui.tab='sc';renderAll();save();$('#main').scrollTop=0;toast('Projet envoyé au Sélecteur et positionné sur le mapping de son secteur');break;
    case 'cma':ui.cmA=id;renderAll();save();break;
    case 'cmt':ui.cmT=id;renderAll();save();break;
    case 'cmall':ui.cmAll=!ui.cmAll;renderAll();save();break;
    case 'cmimp':ui.cmImp=!ui.cmImp;if(!ui.cmInst)ui.cmInst='brent';renderAll();break;
    case 'versave':case 'vernew':case 'verrevert':case 'verload':case 'verdel':case 'prjnew':case 'prjdup':case 'prjdel':case 'prjopen':prjAct(act,id,b);break;
    case 'pcfill':{const l=pcLast(S.pc.sym);if(l){S.pc.entry=+l.v.toFixed(pcSpec(S.pc.sym).dig);renderAll();save();}break;}
    case 'pcplan':S.pc.cap=+S.pc.plan.acct;S.pc.risk=+S.pc.plan.rpt;renderAll();save();toast('Plan appliqué au calculateur');break;
    case 'pc2jr':{const c=pcCalc();jrInit();Object.assign(S.jr.draft,{d:today(),sym:S.pc.sym,side:S.pc.side,vol:isFinite(c.lots)?+c.lots.toFixed(2):null,entry:S.pc.entry,sl:S.pc.sl,tp:S.pc.tp,exit:null,pnl:null});ui.tab='jr';renderAll();save();$('#main').scrollTop=0;toast('Trade préparé dans le journal : complétez la sortie après clôture');break;}
    case 'mcjr':{const st=jrStats(S.jr.trades);if(isFinite(st.wr))S.pc.mc.wr=+(st.wr*100).toFixed(1);if(isFinite(st.avgRW))S.pc.mc.rr=+st.avgRW.toFixed(2);renderAll();save();toast('Statistiques réelles du journal reprises');break;}
    case 'jradd':{jrInit();const D=S.jr.draft;if(!D.d||!D.sym||!(+D.vol>0)||!isFinite(jrPnl(D))){toast('Renseignez au minimum la date, le volume, l\'entrée et la sortie (ou le P&L)');break;}
      S.jr.trades.push(Object.assign(clone(D),{id:uid('t'),src:'manuel'}));S.jr.draft=Object.assign(JR_DRAFT(),{sym:D.sym,setup:D.setup});ui.jrDay=D.d;ui.jrM=D.d.slice(0,7);renderAll();save();toast('Trade enregistré');break;}
    case 'jrdel':S.jr.trades=S.jr.trades.filter(t=>t.id!==id);renderAll();save();toast('Trade supprimé');break;
    case 'jrday':ui.jrDay=id;ui.jrM=id.slice(0,7);if(ui.tab!=='jr')ui.tab='jr';renderAll();save();break;
    case 'jrsess':ui.jrSess=id;renderAll();save();break;
    case 'jrmon':{if(+id===0)ui.jrM=today().slice(0,7);else{const[y,m]=ui.jrM.split('-').map(Number),d=new Date(y,m-1+(+id),1);ui.jrM=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}renderAll();save();break;}
    case 'mt5open':ui.mt5Open=!ui.mt5Open;renderAll();break;
    case 'mt5imp':$('#mt5File').click();break;
    case 'mt5sync':mt5Sync();break;
    case 'mt5unlink':S.mt5=Object.assign(clone(DEF.mt5),{mode:S.mt5.mode});ui.mt5Open=false;renderAll();save();toast('Compte MT5 délié (les trades importés restent dans le journal)');break;
    case 'cmfile':$('#cmFile').click();break;
    case 'plan':ui.plan=id;renderAB();save();break;
    case 'buy':toast('Paiement à brancher au déploiement : Stripe Checkout et droits Supabase');break;
  }
});
$('#cmFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const n=cmImport(String(rd.result),ui.cmInst||'brent');e.target.value='';save();renderAll();toast(n?`${n} séances importées pour ${CM_INST[ui.cmInst||'brent']}`:'Fichier non reconnu : colonnes Date et Dernier attendues');};rd.readAsText(f);});
renderAll();

$('#mt5File').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;readReport(f,txt=>{const r=mt5Ingest(txt,f.name);e.target.value='';save();renderAll();
  toast(r.tot?`${r.tot} position${r.tot>1?'s':''} lue${r.tot>1?'s':''} dans le rapport, ${r.n} nouvelle${r.n>1?'s':''} ajoutée${r.n>1?'s':''} au journal`:r.info.balance!=null?'Rapport lu : solde et fonds propres mis à jour':'Rapport non reconnu : exportez l\'historique MT5 au format HTML');});});
