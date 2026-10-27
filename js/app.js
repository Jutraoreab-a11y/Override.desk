/* ============ Abonnement ============ */
const MODNAMES={bp:'Business plan',an:'Analyse financière',sc:'Sélecteur',pf:'Suivi & placements',cm:'Matières premières'};
function renderAB(){
  const full=39*Object.keys(MODNAMES).length;if(!MODNAMES[ui.plan])ui.plan='bp';
  $('#p-ab').innerHTML=`<div class="ph"><div><h1>Abonnement</h1><p>Un module à l'unité ou les cinq volets en pack. Sans engagement, résiliable à tout moment.</p></div></div>
  <div class="plans">
    <div class="plan"><h2 style="margin:0;font-size:16px">Module</h2><div class="price">39 € <small>HT / mois</small></div><div class="note" style="margin:0">Un volet au choix</div>
      <div class="chips" role="radiogroup" aria-label="Choix du module">${Object.entries(MODNAMES).map(([k,l])=>`<button class="chip" role="radio" data-act="plan" data-id="${k}" aria-pressed="${ui.plan===k}" aria-checked="${ui.plan===k}">${l}</button>`).join('')}</div>
      <ul><li>Override complet sur le volet</li><li>Export PDF institutionnel</li><li>Sauvegarde des dossiers</li></ul>
      <button class="btn" data-act="buy">S'abonner : ${MODNAMES[ui.plan]}</button></div>
    <div class="plan best"><h2 style="margin:0;font-size:16px">Pack global <span class="tag ok">−${nf((1-69/full)*100,0)} %</span></h2><div class="price">69 € <small>HT / mois</small></div><div class="note" style="margin:0">Les cinq volets, au lieu de ${full} €</div>
      <ul><li>Business plan, Analyse financière, Sélecteur, Suivi, Matières premières</li><li>Données partagées entre volets</li><li>Override et export PDF illimités</li></ul>
      <button class="btn pri" data-act="buy">S'abonner au pack global</button></div>
  </div>`;
}

/* ============ Rendu global ============ */
const MODS=[['bp','Business plan','bp'],['an','Analyse financière','an'],['sc','Sélecteur','sc'],['pf','Suivi & placements','pf'],['cm','Matières premières','cm']];
const PANELS=['bp','an','sc','pf','cm','ab'];
const BPSEC=['Executive summary et offre','Équipe','Étude de marché','Marketing, offre et prix','Psychologie client','Concurrence et environnement','Commercial','Paramètres et marché adressable','Partie financière','Annexes'];
let lastCalc=new Date();
function bpState(){const r=bpCalc(),AL=bpAlerts(r),ko=AL.filter(a=>a.l==='ko').length;return{r,AL,ko,res:AL.length-ko,st:ko?['ko',"Modèle non viable en l'état"]:AL.length?['am','Cohérent sous réserves']:['ok','Modèle cohérent']};}
function ctxHTML(){
  if(ui.tab==='bp')return`<span class="ctx-t">${esc(S.bp.name)||'Projet sans nom'}</span><span class="ctx-s">Business plan, horizon ${Math.max(3,Math.min(5,+S.bp.h||5))} ans</span>`;
  if(ui.tab==='an')return`<label class="sym">${ic('search')}<input id="q" placeholder="Ticker ou société : AAPL, LVMH, Intel…" autocomplete="off" spellcheck="false" aria-label="Rechercher un titre"></label><span class="ctx-s">Rapport d'analyse financière</span>`;
  if(ui.tab==='sc'){const D=S.sc.list.filter(c=>!c.lead),n=D.filter(passes).length;return`<span class="ctx-t">Sélecteur d'entreprises</span><span class="ctx-s">${n} dossier${n>1?'s':''} retenu${n>1?'s':''} sur ${D.length}</span>`;}
  if(ui.tab==='cm')return`<div class="seg" role="tablist" aria-label="Actif">${Object.entries(CM_ASSETS).map(([k,l])=>`<button role="tab" data-act="cma" data-id="${k}" aria-selected="${(ui.cmA||'brent')===k}">${l}</button>`).join('')}</div><span class="vsep"></span><div class="seg" role="tablist" aria-label="Vue">${[['t','Pression & approvisionnement'],['c','Confirmation & corrélations']].map(([k,l])=>`<button role="tab" data-act="cmt" data-id="${k}" aria-selected="${(ui.cmT||'t')===k}">${l}</button>`).join('')}</div>`;
  if(ui.tab==='pf')return`<span class="ctx-t">Suivi des actifs et placements</span><span class="ctx-s">${S.pf.positions.length} lignes</span>`;
  return`<span class="ctx-t">Abonnement</span>`;
}
function sideHTML(){
  const kv=(l,v,neg)=>`<div class="kv"><span>${l}</span><b class="${neg?'down':''}">${v}</b></div>`;
  if(ui.tab==='bp'){const{r,ko,res,st}=bpState(),Hy=r.Y[r.H-1],k=r.mk;
    return`<div class="sideh">Synthèse du modèle</div>
    <div class="vbox ${st[0]}"><b><span class="dot ${st[0]}"></span>${st[1]}</b><span>${ko} point${ko>1?'s':''} bloquant${ko>1?'s':''}, ${res} réserve${res>1?'s':''}</span></div>
    ${kv('CA année '+r.H,big(Hy.rev))}${kv('EBITDA année '+r.H,big(Hy.ebitda),Hy.ebitda<0)}${kv('Point mort EBITDA',r.be?'Année '+r.be.t:'Non atteint',!r.be)}${kv('Point bas de trésorerie',big(r.min.cash),r.min.cash<0)}${kv('LTV / CAC',nf(r.ratio,1)+'×',r.ratio<3)}${kv('Part de marché A'+r.H,pct(k.proj[k.proj.length-1].sv,2))}${kv('Tamis OVERRIDE',k.passN+'/4',k.passN<4)}
    <div class="sideh" style="margin-top:8px">Sections</div>
    <div class="secl">${BPSEC.map((t,i)=>`<button data-act="goto" data-id="bp-s${i+1}"><span>${String(i+1).padStart(2,'0')}</span>${t}</button>`).join('')}</div>`;}
  if(ui.tab==='an'){const A=S.an.assets,R=Object.keys(A).map(k=>[k,anCalc(k)]),np=R.filter(x=>x[1].positive).length;
    return`<div class="sideh">Titres couverts <span class="meta">${np} positive${np>1?'s':''} sur ${R.length}</span></div>
    <div class="wl-h"><span>Titre</span><span>Cours</span><span>Potentiel</span></div>
    ${R.map(([k,r])=>`<button class="wl${k===ui.tk?' on':''}" data-act="tk" data-id="${k}"><span class="wl-s"><span class="dot ${r.positive?'ok':'ko'}"></span><b>${esc(A[k].t)}</b><small>${esc(A[k].n)}</small></span><span class="wl-p">${nf(+A[k].price,2)}</span><span class="wl-c ${cls(r.up)}">${isFinite(r.up)?sgn(r.up*100,0):'—'}</span></button>`).join('')}
    <p class="note" style="margin:10px 12px">Point vert : décision positive (qualité, tamis et prix réunis). Potentiel : écart entre la valeur de référence et le cours.</p>`;}
  if(ui.tab==='sc'){const L=[...S.sc.list].filter(c=>!c.lead).sort((x,y)=>attr(y)-attr(x));
    return`<div class="sideh">Dossiers <span class="meta">par attractivité</span></div>
    <div class="wl-h"><span>Entreprise</span><span>Attract.</span><span>Liquid.</span></div>
    ${L.map(x=>`<button class="wl${x.id===ui.sel?' on':''}" data-act="pick" data-id="${esc(x.id)}"><span class="wl-s"><span class="dot ${passes(x)?'ok':'ko'}"></span><b>${esc(x.n)}</b><small>${esc((SECT[x.sec]||{}).l||x.sec)}</small></span><span class="wl-p">${nf(attr(x),0)}</span><span class="wl-c" style="color:var(--mute)">${auto(x.liq)}/10</span></button>`).join('')}`;}
  if(ui.tab==='cm'){const{s,R,N}=cmCalc();return`<div class="sideh">Matières premières <span class="meta">${new Date(s.d[N-1]+'T00:00:00').toLocaleDateString('fr-FR')}</span></div><div class="wl-h"><span>Actif</span><span>Cours</span><span>Var.</span></div>${Object.entries(CM_ASSETS).map(([k,l])=>{let i=N-1;while(i>0&&s[k][i]===null)i--;const r=R[i],sg=k==='brent'||k==='wti'?r.sigChine:k==='gold'?r.sigGold:r.sigSilver,v=s[k+'V'][i];return`<button class="wl${k===(ui.cmA||'brent')?' on':''}" data-act="cma" data-id="${k}"><span class="wl-s"><span class="dot ${cmCls(sg)}"></span><b>${l}</b><small>${esc(cmStrip(sg).split(' : ')[0])}</small></span><span class="wl-p">${nf(s[k][i],2)}</span><span class="wl-c ${v!==null?cls(v):''}">${v!==null?sgn(v*100,2):'—'}</span></button>`;}).join('')}<div class="sideh" style="margin-top:8px">Ratios</div><div class="kv"><span>Or / Argent</span><b>${nf(R[N-1].gs,1)}</b></div><div class="kv"><span>Or / Brent</span><b>${nf(R[N-1].gb,1)}</b></div><div class="kv"><span>USD/CNH</span><b>${nf(s.cnh[N-1],4)}</b></div>`;}
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
  else if(ui.tab==='sc'){const n=S.sc.list.filter(c=>!c.lead&&passes(c)).length;s=`<span class="sti"><span class="dot ok"></span><b>${n} dossier${n>1?'s':''} retenu${n>1?'s':''}</b></span>`;}
  else if(ui.tab==='cm'){const{R,N}=cmCalc(),r=R[N-1];s=`<span class="sti"><span class="dot ${cmCls(r.sigChine)}"></span><b>Brent : ${esc(cmStrip(r.sigChine).split(' : ')[0])}</b></span><span class="sti"><span class="dot ${cmCls(r.sigGold)}"></span><b>Or : ${esc(cmStrip(r.sigGold).split(' : ')[0])}</b></span>`;}
  else if(ui.tab==='pf'){const K=pfCalc();s=`<span class="sti"><span class="dot ${K.alert?'ko':K.div?'am':'ok'}"></span><b>${K.div} divergence${K.div>1?'s':''}, ${K.alert} alerte${K.alert>1?'s':''}</b></span>`;}
  const n=document.querySelectorAll('.main .ovr').length;
  if(n)s+=`<span class="sti"><span class="dot am"></span>${n} valeur${n>1?'s':''} forcée${n>1?'s':''}</span>`;
  if(pending.size)s+=`<span class="sti"><span class="dot ac"></span>${pending.size} modification${pending.size>1?'s':''} en attente de recalcul</span>`;
  s+=`<span class="r"><span>${ui.tab==='an'||ui.tab==='pf'?'Données publiées MarketScreener, cours du 19-20/10/2026':ui.tab==='cm'?'Classeur TRADING_Dashboard (Investing.com)':ui.tab==='sc'?'Zones : FMI WEO':'Données de démonstration à sourcer'}</span><span>Calculé à ${lastCalc.toLocaleTimeString('fr-FR')}</span><span>${ui.edit?'<b style="color:var(--amber)">Override</b>':'Lecture'}</span></span>`;
  return s;
}
function renderAll(){
  document.body.classList.toggle('editing',ui.edit);
  $('#rail').innerHTML=MODS.map(([k,l,i])=>`<button class="rb" data-act="tab" data-id="${k}" title="${l}"${ui.tab===k?' aria-current="page"':''}>${ic(i)}<span>${l}</span></button>`).join('')+`<span class="rail-sp"></span><button class="rb" data-act="tab" data-id="ab" title="Abonnement"${ui.tab==='ab'?' aria-current="page"':''}>${ic('ab')}<span>Offre</span></button>`;
  $('#ctx').innerHTML=ctxHTML();
  PANELS.forEach(k=>$('#p-'+k).classList.toggle('on',ui.tab===k));
  renderBP();renderAN();renderSC();renderPF();renderCM();renderAB();
  const side=sideHTML();$('#side').innerHTML=side;$('#app').classList.toggle('noside',!side);
  $('#editBtn').classList.toggle('on',ui.edit);$('#editBtn').setAttribute('aria-pressed',ui.edit);
  $('#editBtn').innerHTML=`${ic(ui.edit?'lock':'pen')}<span class="lbl">${ui.edit?'Verrouiller':'Override'}</span>`;
  $('#pdfBtn').innerHTML=`${ic('dl')}<span class="lbl">Exporter PDF</span>`;
  updBar();
  const t={bp:'Business plan',an:"Rapport d'analyse financière",sc:"Sélecteur d'entreprises & double mapping",pf:'Suivi des actifs et placements',cm:'Matières premières : '+((ui.cmT||'t')==='t'?'pression et approvisionnement':'confirmation et corrélations'),ab:'Abonnement'}[ui.tab],sub=ui.tab==='bp'?S.bp.name:ui.tab==='an'?(S.an.assets[ui.tk]||{}).n:ui.tab==='cm'?CM_ASSETS[ui.cmA||'brent']:ui.tab==='sc'?('zone '+geoAgg(ui.geo).lab+', '+((S.sc.list.find(c=>c.id===ui.sel)||{}).n||'')):'';
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
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset&&el.dataset.ui){ui[el.dataset.ui]=el.value;renderAll();save();return;}
  if(!el.classList||!el.classList.contains('f')||!ui.edit||!el.dataset.k)return;
  const k=el.dataset.k,t=el.dataset.t;let v=el.value;
  if(t==='nn')v=el.value===''?null:parseFloat(el.value);
  else if(t==='n'){v=el.value===''?0:parseFloat(el.value);if(!isFinite(v))return;}
  setP(S,k,v);el.classList.toggle('ovr',JSON.stringify(v)!==JSON.stringify(getP(DEF,k)));pending.add(k);updBar();
});
document.addEventListener('keydown',e=>{
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
    case 'reset':{const v=ui.tab;if(S[v]){S[v]=clone(DEF[v]);pending.clear();renderAll();save();toast('Volet réinitialisé aux valeurs de référence');}break;}
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
    case 'cmimp':{const inst=prompt("Instrument à mettre à jour :\n"+Object.entries(CM_INST).map(([k,l])=>k+' = '+l).join('\n'),'brent');if(!inst||!CM_INST[inst]){if(inst)toast('Instrument inconnu');break;}ui.cmInst=inst;$('#cmFile').click();break;}
    case 'plan':ui.plan=id;renderAB();save();break;
    case 'buy':toast('Paiement à brancher au déploiement : Stripe Checkout et droits Supabase');break;
  }
});
$('#cmFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const n=cmImport(String(rd.result),ui.cmInst||'brent');e.target.value='';save();renderAll();toast(n?`${n} séances importées pour ${CM_INST[ui.cmInst||'brent']}`:'Fichier non reconnu : colonnes Date et Dernier attendues');};rd.readAsText(f);});
renderAll();
