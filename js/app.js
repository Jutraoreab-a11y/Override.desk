/* ============ Abonnement ============ */
const MODNAMES={bp:'Business plan',an:'Analyse financière',sc:'Sélecteur & mapping',lbo:'Dossier LBO',pf:'Suivi & placements',cm:'Commodities & flows',pc:'Calculateur de position',jr:'Journal de trading'};
function renderAB(){
  const full=39*Object.keys(MODNAMES).length;if(!MODNAMES[ui.plan])ui.plan='bp';
  $('#p-ab').innerHTML=`<div class="ph"><div><h1>Abonnement</h1><p>Un module à l'unité ou les huit volets en pack. Sans engagement, résiliable à tout moment.</p></div></div>
  <div class="plans">
    <div class="plan"><h2 style="margin:0;font-size:16px">Module</h2><div class="price">39 € <small>HT / mois</small></div><div class="note" style="margin:0">Un volet au choix</div>
      <div class="chips" role="radiogroup" aria-label="Choix du module">${Object.entries(MODNAMES).map(([k,l])=>`<button class="chip" role="radio" data-act="plan" data-id="${k}" aria-pressed="${ui.plan===k}" aria-checked="${ui.plan===k}">${l}</button>`).join('')}</div>
      <ul><li>Override complet sur le volet</li><li>Export PDF institutionnel</li><li>Sauvegarde des dossiers</li></ul>
      <button class="btn" data-act="buy">S'abonner : ${MODNAMES[ui.plan]}</button></div>
    <div class="plan best"><h2 style="margin:0;font-size:16px">Pack global <span class="tag ok">−${nf((1-69/full)*100,0)} %</span></h2><div class="price">69 € <small>HT / mois</small></div><div class="note" style="margin:0">Les huit volets, au lieu de ${full} €</div>
      <ul><li>Finance d'entreprise : Business plan, Analyse financière, Sélecteur, Dossier LBO, Suivi</li><li>Finance de marché : Commodities, Calculateur, Journal</li><li>Données partagées entre volets</li><li>Override et export PDF illimités</li></ul>
      <button class="btn pri" data-act="buy">S'abonner au pack global</button></div>
  </div>`;
}

/* ============ Rendu global ============ */
const MODS=[['bp','Business plan','bp'],['an','Analyse financière','an'],['sc','Sélecteur & mapping','sc'],['lbo','Dossier LBO','lbo'],['pf','Suivi & placements','pf'],['cm','Commodities & flows','cm'],['pc','Calculateur de position','pc'],['jr','Journal de trading','jr']];
const PANELS=['bp','an','sc','lbo','pf','cm','pc','jr','ab'];
const RAILG=[["Finance <br>d'entreprise",5],['Finance <br>de marché',3]];
const BPSEC=['Fiche de renseignements','Executive summary et offre','Étude de marché : secteur','La demande','L\'offre et la concurrence','Marketing, offre et prix','Stratégie et lancement','Porteur et structure','Paramètres et marché adressable','Prévisionnel financier','Suivi du réalisé et écarts','Valorisation et verdict Go / No-Go','Annexes'];
let lastCalc=new Date();
function bpState(){const r=bpCalc(),AL=bpAlerts(r),ko=AL.filter(a=>a.l==='ko').length;return{r,AL,ko,res:AL.length-ko,st:ko?['ko',"Modèle non viable en l'état"]:AL.length?['am','Cohérent sous réserves']:['ok','Modèle cohérent']};}
function ctxHTML(){
  if(ui.tab==='bp')return`<span class="ctx-t">${esc(S.bp.name)||'Projet sans nom'}</span><span class="ctx-s">Business plan, horizon ${Math.max(3,Math.min(5,+S.bp.h||5))} ans</span>`;
  if(ui.tab==='an')return`<label class="sym">${ic('search')}<input id="q" placeholder="Ticker ou société : AAPL, LVMH, Intel…" autocomplete="off" spellcheck="false" aria-label="Rechercher un titre"></label><span class="ctx-s">Rapport d'analyse financière</span>`;
  if(ui.tab==='sc'){const D=S.sc.list.filter(c=>!c.lead&&scPer().inP(c)),n=D.filter(passes).length;return`<span class="ctx-t">Sélecteur d'entreprises</span><span class="ctx-s">${n} dossier${n>1?'s':''} retenu${n>1?'s':''} sur ${D.length}</span>`;}
  if(ui.tab==='cm')return`<div class="seg" role="tablist" aria-label="Actif">${Object.entries(CM_ASSETS).map(([k,l])=>`<button role="tab" data-act="cma" data-id="${k}" aria-selected="${(ui.cmA||'brent')===k}">${l}</button>`).join('')}</div><span class="vsep"></span><div class="seg" role="tablist" aria-label="Vue">${[['t','Pression & approvisionnement'],['c','Confirmation & corrélations']].map(([k,l])=>`<button role="tab" data-act="cmt" data-id="${k}" aria-selected="${(ui.cmT||'t')===k}">${l}</button>`).join('')}</div>`;
  if(ui.tab==='pf'){pfInit();return pfSubBar()+`<span class="ctx-s">${S.hold.length+S.pf.positions.length} lignes · compte de trading ${S.mt5.linked?'lié':'non lié'}</span>`;}
  if(ui.tab==='lbo'){const d=lboCur();return`<span class="ctx-t">Dossier d'acquisition LBO</span><span class="ctx-s">${d?esc(d.name):'aucun dossier'} · ${S.lbo.list.length} dossier${S.lbo.list.length>1?'s':''}</span>`;}
  if(ui.tab==='pc'){const c=pcCalc();return`<span class="ctx-t">Calculateur de position</span><span class="ctx-s">${esc(S.pc.sym)} · ${isFinite(c.lots)?nf(c.lots,2)+' lot(s)':'entrée et stop à saisir'} · risque ${pct(+S.pc.risk,2)}</span>`;}
  if(ui.tab==='jr'){jrInit();return`<span class="ctx-t">Journal de trading</span><span class="ctx-s">${S.jr.trades.length} trade${S.jr.trades.length>1?'s':''} enregistré${S.jr.trades.length>1?'s':''}</span>`;}
  return`<span class="ctx-t">Abonnement</span>`;
}
function sideHTML(){
  const kv=(l,v,neg)=>`<div class="kv"><span>${l}</span><b class="${neg?'down':''}">${v}</b></div>`;
  if(ui.tab==='bp'){const{r,ko,res,st}=bpState(),Hy=r.Y[r.H-1],k=r.mk;
    return`<div class="sideh">Synthèse du modèle</div>
    <div class="vbox ${st[0]}"><b><span class="dot ${st[0]}"></span>${st[1]}</b><span>${ko} point${ko>1?'s':''} bloquant${ko>1?'s':''}, ${res} réserve${res>1?'s':''}</span></div>
    ${kv('CA année '+r.H,big(Hy.rev))}${kv('EBITDA année '+r.H,big(Hy.ebitda),Hy.ebitda<0)}${kv('Point mort EBITDA',r.be?'Année '+r.be.t:'Non atteint',!r.be)}${kv('Point bas de trésorerie',big(r.min.cash),r.min.cash<0)}${kv('LTV / CAC',nf(r.ratio,1)+'×',r.ratio<3)}${kv('Part de marché A'+r.H,pct(k.proj[k.proj.length-1].sv,2))}${kv('Tamis OVERRIDE',k.passN+'/4',k.passN<4)}${(()=>{const G=bpGo(r,bpAlerts(r),DAMO[S.bp.sector]||DAMO.saas);return kv('Verdict ('+G.score+'/100)',G.verdict[1],G.verdict[0]!=='ok');})()}
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
  if(ui.tab==='lbo'){const d=lboCur();if(!d)return'';const M=lboModel(d),v=lboVerdict(M);
    return`<div class="sideh">Synthèse du dossier</div><div class="vbox ${v[0]}"><b><span class="dot ${v[0]}"></span>${v[1]}</b><span>${esc(M.T?M.T.name:'')}</span></div>${kv('Valeur d\'entreprise',nf(M.ev0,1)+' M€')}${kv('Multiple payé',nf(M.ev0/(M.e0||1),1)+'×')}${kv('Dette / EBITDA',nf(M.lev0,1)+'×',M.lev0>+M.P.covLev)}${kv('Fonds propres',nf(M.eq0,1)+' M€')}${kv('TRI',isFinite(M.irr)?pct(M.irr*100,1):'—',!(M.irr*100>=+M.P.irrT))}${kv('MoIC',isFinite(M.moic)?nf(M.moic,2)+'×':'—',!(M.moic>=2))}${kv('DSCR minimal',nf(M.minDscr,2),M.minDscr<+M.P.covDscr)}
    <div class="sideh" style="margin-top:8px">Sections</div><div class="secl">${['Executive summary','Scoring macro et tamis','Montage financier','Modèle de remboursement','Plan de création de valeur'].map((t,i)=>`<button data-act="goto" data-id="lbo-s${i+1}"><span>${String(i+1).padStart(2,'0')}</span>${t}</button>`).join('')}</div>`;}
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
  else if(ui.tab==='lbo'){const d=lboCur();if(d){const v=lboVerdict(lboModel(d));s=`<span class="sti"><span class="dot ${v[0]}"></span><b>${esc(d.name)} : ${v[1]}</b></span>`;}}
  else if(ui.tab==='pc'){const c=pcCalc(),ok=c.checks.every(x=>x[3]);s=`<span class="sti"><span class="dot ${ok?'ok':'ko'}"></span><b>${ok?'Trade conforme au plan':'Hors plan : '+c.checks.filter(x=>!x[3]).map(x=>x[0].toLowerCase()).join(', ')}</b></span>`;}
  else if(ui.tab==='jr'){const st=jrStats(S.jr.trades);s=`<span class="sti"><span class="dot ${st.tot>=0?'ok':'ko'}"></span><b>${st.n} trades · ${nf(st.tot,2)} ${S.pc.ccy}</b></span>`;}
  else if(ui.tab==='pf'){const K=pfCalc();s=`<span class="sti"><span class="dot ${K.alert?'ko':K.div?'am':'ok'}"></span><b>${K.div} divergence${K.div>1?'s':''}, ${K.alert} alerte${K.alert>1?'s':''}</b></span>`;}
  const n=document.querySelectorAll('.main .ovr').length;
  if(n)s+=`<span class="sti"><span class="dot am"></span>${n} valeur${n>1?'s':''} forcée${n>1?'s':''}</span>`;
  if(pending.size)s+=`<span class="sti"><span class="dot ac"></span>${pending.size} modification${pending.size>1?'s':''} en attente de recalcul</span>`;
  s+=`<span class="r"><span>${ui.tab==='lbo'?`Euribor 3 mois ${nf(LBO_SRC.euribor.v,3)} % (${LBO_SRC.euribor.d}) · Damodaran janvier 2026`:ui.tab==='pc'?'Leviers ESMA 2018 · EUR/USD 1,1219 (20/10/2026)':ui.tab==='jr'?'Saisie manuelle et rapports MT5':ui.tab==='an'||ui.tab==='pf'?'Données publiées MarketScreener, cours du 19-20/10/2026':ui.tab==='cm'?'Classeur Investing.com · EODHD · FRED / EIA · USDA WASDE · Fed (10/11/2026)':ui.tab==='sc'?'Zones : FMI WEO':'Données de démonstration à sourcer'}</span><span>Calculé à ${lastCalc.toLocaleTimeString('fr-FR')}</span><span>${ui.edit?'<b style="color:var(--amber)">Override</b>':'Lecture'}</span></span>`;
  return s;
}
function renderAll(){
  document.body.classList.toggle('editing',ui.edit);
  $('#rail').innerHTML=(()=>{let o=0;return RAILG.map(([g,n])=>{const it=MODS.slice(o,o+n);o+=n;return`<div class="rg" role="group" aria-label="${g.replace(' <br>',' ')}"><span class="rg-l">${g}</span>${it.map(([k,l,i])=>`<button class="rb" data-act="tab" data-id="${k}" title="${l}"${ui.tab===k?' aria-current="page"':''}>${ic(i)}<span>${l}</span></button>`).join('')}</div>`;}).join('');})()+`<span class="rail-sp"></span><button class="rb" data-act="tab" data-id="ab" title="Abonnement"${ui.tab==='ab'?' aria-current="page"':''}>${ic('ab')}<span>Offre</span></button>`;
  $('#ctx').innerHTML=ctxHTML();
  PANELS.forEach(k=>$('#p-'+k).classList.toggle('on',ui.tab===k));
  renderBP();renderAN();renderSC();renderLBO();renderPF();renderCM();renderPC();renderJR();renderAB();
  const side=sideHTML();$('#side').innerHTML=side;$('#app').classList.toggle('noside',!side);
  $('#editBtn').classList.toggle('on',ui.edit);$('#editBtn').setAttribute('aria-pressed',ui.edit);
  $('#editBtn').innerHTML=`${ic(ui.edit?'lock':'pen')}<span class="lbl">${ui.edit?'Verrouiller':'Override'}</span>`;
  $('#pdfBtn').innerHTML=`${ic('dl')}<span class="lbl">Exporter PDF</span>`;
  {const st=typeof aiState==='function'?aiState():['ko','Passerelles IA indisponibles'];$('#aiBtn').innerHTML=`<span class="dot ${st[0]}"></span><span class="lbl">Collecte IA</span>`;$('#aiBtn').title=st[1]+' · lecture des données en cache : 0 jeton';}
  if($('#mmBtn'))$('#mmBtn').innerHTML=`${ic('sc')}<span class="lbl">Mapping</span>`;renderAI();
  $('#liveBtn').innerHTML=liveBadge();renderFlux();
  updBar();
  const t={lbo:'Dossier d\'acquisition LBO',pc:'Calculateur de position',jr:'Journal de trading',bp:'Business plan',an:"Rapport d'analyse financière",sc:"Sélecteur d'entreprises & double mapping",pf:'Suivi des actifs et placements',cm:'Commodities & flows : '+((ui.cmT||'t')==='t'?'pression et approvisionnement':'confirmation et corrélations'),ab:'Abonnement'}[ui.tab],sub=ui.tab==='bp'?S.bp.name:ui.tab==='an'?(S.an.assets[ui.tk]||{}).n:ui.tab==='cm'?CM_ASSETS[ui.cmA||'brent']:ui.tab==='sc'?('zone '+geoAgg(ui.geo).lab+', '+((S.sc.list.find(c=>c.id===ui.sel)||{}).n||'')):'';
  const SRC={bp:["Repères sectoriels : Damodaran (NYU Stern), janvier 2026, consulté le 21/10/2026","PIB et croissance : FMI, World Economic Outlook, consulté le 21/10/2026","Hypothèses du projet : données de démonstration à sourcer ("+esc(S.bp.srcDate||'')+")"],
    an:["Comptes publiés et cours : MarketScreener, consultés les 19-20/10/2026","EUR/USD 1,1219 : poundsterlinglive, 20/10/2026"],sc:["Zones : FMI WEO, consulté le 21/10/2026","Secteurs : Damodaran janvier 2026"],
    lbo:[`Euribor 3 mois ${nf(LBO_SRC.euribor.v,3)} % au ${LBO_SRC.euribor.d} : ${LBO_SRC.euribor.s}`,"Multiples sectoriels : Damodaran janvier 2026","Impôt sur les sociétés 25 % : Code général des impôts"],
    pf:["Cours et résultats : MarketScreener, 19-20/10/2026",S.mt5.linked?"Compte MT5 : "+(S.mt5.mode==='metaapi'?'MetaApi':'rapport '+esc(S.mt5.file||''))+", synchronisé le "+(S.mt5.lastSync?new Date(S.mt5.lastSync).toLocaleDateString('fr-FR'):'—'):"Compte MT5 non lié"],
    cm:["Cours quotidiens : exports Investing.com consolidés dans le classeur TRADING_Dashboard (01/2025 à 06/2026)","Seuils et signaux : formules du même classeur"],
    pc:["Leviers : ESMA, décision (UE) 2018/796","EUR/USD 1,1219 au 20/10/2026"],jr:["Saisie manuelle et rapports MT5 importés"]}[ui.tab]||[];
  $('#printHead').innerHTML=`<h1>OVERRIDE.DESK : ${esc(t)}${sub?', '+esc(sub):''}</h1>${SRC.length?`<p><b>Sources et dates de consultation :</b> ${SRC.join(' ; ')}.</p>`:''}<p>Édité le ${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}. ${document.querySelectorAll('#p-'+ui.tab+' .ovr').length} valeur(s) forcée(s) par l'analyste, signalées par *. Rapport d'aide à la décision, ne constitue pas un conseil en investissement.</p>`;
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
  if(!el.classList||!el.classList.contains('f')||!(ui.edit||el.dataset.pen)||!el.dataset.k)return;
  const k=el.dataset.k,t=el.dataset.t;let v=el.value;
  if(t==='nn')v=el.value===''?null:parseFloat(el.value);
  else if(t==='n'){v=el.value===''?0:parseFloat(el.value);if(!isFinite(v))return;}
  setP(S,k,v);el.classList.toggle('ovr',JSON.stringify(v)!==JSON.stringify(getP(DEF,k)));pending.add(k);updBar();
});
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset&&el.dataset.prj){prjSwitch(el.dataset.prj,el.value,false);return;}
  if(el.dataset&&el.dataset.lbo){S.lbo.cur=el.value;renderAll();save();return;}
  if(el.dataset&&el.dataset.lbosc){lboScAct('load',el.value);return;}
  if(el.dataset&&el.dataset.pen&&el.dataset.k){liveMarkOverride(el.dataset.k);ui.penK=null;ui.penOld=undefined;recalc('Valeur forcée : modèle recalculé en cascade');return;}
  if(el.dataset&&el.dataset.lbosrc){ui.lboSrc=el.value;save();return;}
  if(el.dataset&&el.dataset.ver){prjSwitch(el.dataset.ver,el.value,true);return;}
  if(!el.dataset||!el.dataset.lk)return;
  const v=lkVal(el);if(v!==undefined)setP(S,el.dataset.lk,v);
  if(ui.penK===el.dataset.lk)ui.penK=null;
  if(el.dataset.lk==='pc.sym'){S.pc.entry=null;S.pc.sl=null;S.pc.tp=null;}
  save();setTimeout(()=>{const a=document.activeElement,k=a&&a.dataset?a.dataset.lk:null,sc=$('#main').scrollTop;renderAll();$('#main').scrollTop=sc;if(k){const n=document.querySelector(`[data-lk="${CSS.escape(k)}"]`);if(n)n.focus();}},0);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&ui.penK){if(ui.penOld!==undefined&&getP(S,ui.penK)!==undefined)setP(S,ui.penK,ui.penOld);pending.delete(ui.penK);ui.penK=null;ui.penOld=undefined;renderAll();return;}
  if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.pen&&e.target.tagName==='INPUT'){e.preventDefault();e.target.blur();return;}
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
    case 'recalc':recalc();if(FLUX.on){liveRefresh(false);liveIngest(LIVE_MOD[ui.tab],'recalc');}break;
    case 'print':{const was=ui.edit;if(pending.size)recalc('Recalculé avant export');ui.edit=false;renderAll();setTimeout(()=>{window.print();if(was){ui.edit=true;renderAll();}},120);break;}
    case 'reset':{const v=ui.tab;if(v==='jr'||v==='lbo'){toast('Le journal n\'est jamais réinitialisé : supprimez les trades un par un');break;}if(S[v]){S[v]=clone(DEF[v]);pending.clear();renderAll();save();toast('Volet réinitialisé aux valeurs de référence');}break;}
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
    case 'addrow':{const l=b.dataset.list;if(!getP(S,l))setP(S,l,[]);getP(S,l).push(clone(ROWTPL[l]||(/\.peers$/.test(l)?{n:'',evE:null,pe:null,src:''}:{})));pending.add(l);renderAll();break;}
    case 'delrow':{const l=b.dataset.list;getP(S,l).splice(+b.dataset.i,1);pending.add(l);renderAll();break;}
    case 'addco':{const nid='c'+Date.now();S.sc.list.push(co(nid,'Nouveau dossier',ui.secTarget,5,5,5,5,5,5,0,0,1,10,8,{ebm:0,fund:'Capital-risque',serial:0,tier:'',tgt:0},['','','','','','','','','','']));ui.sel=nid;pending.add('co');renderAll();break;}
    case 'bp2sc':bpToSelector();ui.tab='sc';renderAll();save();$('#main').scrollTop=0;toast('Projet envoyé au Sélecteur et positionné sur le mapping de son secteur');break;
    case 'cma':ui.cmA=id;if(typeof mktX==='function'){const X=mktX();X.main=id;X.cmp=X.cmp.filter(k=>k!==id);}renderAll();save();break;
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
    case 'fluxopen':ui.fluxOpen=!ui.fluxOpen;renderFlux();break;
    case 'fluxclose':ui.fluxOpen=false;renderFlux();break;
    case 'raimp':$('#raFile').click();break;
    case 'tornk':ui.tornK=id;renderAll();break;
    case 'tamlv':ui.tamLv=+id;renderAll();break;
    case 'zonedup':ui.zoneDup=!ui.zoneDup;renderAll();break;
    case 'zonedupgo':{const el=document.querySelector('[data-zonedup]');if(!el)break;if(el.value===(S.bp.scope||'K:France')){toast('Choisissez une zone différente de la zone actuelle');break;}bpZoneDup(el.value);break;}
    case 'mktbase':S.bp.mkt.base=S.bp.scope||'K:France';recalc('Données de marché rattachées à la zone du business plan');break;
    case 'liverefresh':liveRefresh(false);break;
    case 'liveinit':save();liveInit().then(()=>toast(FLUX.status&&FLUX.status.backend?'Backend joignable':'Backend injoignable : mode simulation conservé'));break;
    case 'login':{const em=(($('#liveEmail')||{}).value||'').trim();if(!FLUX.sb||!em){toast('Saisissez votre e-mail');break;}FLUX.sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:location.href.split('#')[0]}}).then(r=>toast(r.error?'Envoi impossible : '+r.error.message:'Lien de connexion envoyé à '+em));break;}
    case 'logout':if(FLUX.sb)FLUX.sb.auth.signOut();FLUX.session=null;FLUX.on=false;renderAll();toast('Déconnecté : retour au mode simulation');break;
    case 'credsave':liveCredSave(+id);break;
    case 'eakey':if(!S.mt5.login){toast('Renseignez d\'abord le numéro de compte');break;}liveEaKey();break;
    case 'pft':ui.pfT=id;if(ui.tab!=='pf')ui.tab='pf';renderAll();save();$('#main').scrollTop=0;break;
    case 'bradd':{pfInit();if(!S.brokers.some(x=>x.n===id)){const c=BROKERS.find(x=>x.n===id)||{n:id,t:'Plateforme personnalisée',m:['csv','manuel'],note:''};S.brokers.push({n:c.n,t:c.t,m:c.m,d:today()});S.holdDraft.br=c.n;}renderAll();save();toast('Plateforme associée : '+id);break;}
    case 'bradd2':{const v=(($('#brsel')||{}).value||($('#brq')||{}).value||'').trim();if(!v){toast('Choisissez ou tapez une plateforme');break;}pfInit();if(!S.brokers.some(x=>x.n===v)){const c=BROKERS.find(x=>x.n.toLowerCase()===v.toLowerCase())||{n:v,t:'Plateforme personnalisée',m:['api','csv'],note:''};S.brokers.push({n:c.n,t:c.t,m:c.m,d:today(),cash:null,api:{url:'',tok:''},sync:{}});}ui.brQ='';renderAll();save();toast('Plateforme connectée : '+v+'. Renseignez sa passerelle API pour la remontée automatique.');break;}
    case 'brsync':brSyncAll(false);break;
    case 'brsync1':brSync(+id).then(ok=>{save();renderAll();toast(ok?'Plateforme synchronisée':'Synchronisation impossible : vérifiez l\'adresse de la passerelle');});break;
    case 'brdel':{const b=S.brokers[+id];if(b){S.brokers.splice(+id,1);toast('Plateforme retirée (ses positions sont conservées)');}renderAll();save();break;}
    case 'holdimp':ui.holdBr=id;$('#holdFile').click();break;
    case 'holdadd':{const D=S.holdDraft;if(!D.br||!D.sym||!(+D.qty>0)||!isFinite(+D.pru)||D.pru===null){toast('Renseignez la plateforme, le symbole, la quantité et le PRU');break;}S.hold.push(clone(D));S.holdDraft=Object.assign({},D,{sym:'',name:'',qty:null,pru:null,px:null,tgt:null,real:null});renderAll();save();toast('Position ajoutée');break;}
    case 'holddel':S.hold.splice(+id,1);renderAll();save();toast('Position supprimée');break;
    case 'cmov':{const o=cmOv();o[id]=!o[id];renderAll();save();break;}
    case 'cmsplit':ui.cmSplit=!ui.cmSplit;renderAll();save();break;
    case 'cmdiag':cmDiag();break;
    case 'aiopen':ui.aiOpen=!ui.aiOpen;renderAI();break;
    case 'aiclose':ui.aiOpen=false;renderAI();break;
    case 'aicol':{const x=aiTargets().find(t=>t.k===id);if(x)aiCollect(x);break;}
    case 'pen':{const k=b.dataset.k;ui.penOld=clone(getP(S,k)??null);ui.penK=k;renderAll();const n=document.querySelector(`[data-k="${CSS.escape(k)}"][data-pen]`);if(n){n.focus();if(n.select)try{n.select();}catch(_){}}break;}
    case 'penok':{const a=document.activeElement;if(a&&a.dataset&&(a.dataset.pen||a.dataset.lk===ui.penK)){a.blur();}ui.penK=null;ui.penOld=undefined;recalc('Valeur forcée : modèle recalculé en cascade');break;}
    case 'penreset':{const k=b.dataset.k;setP(S,k,clone(getP(DEF,k)));ui.penK=null;recalc('Valeur de référence rétablie');break;}
    case 'penlin':{ui.penK=id;renderAll();const n=document.querySelector(`[data-lk="${CSS.escape(id)}"]`);if(n){n.focus();try{n.select();}catch(_){}}break;}
    case 'penclr':setP(S,id,null);ui.penK=null;renderAll();save();toast('Valeur recalculée par le modèle');break;
    case 'lbosc':{const[a,x]=id.split(':');lboScAct(a,x);break;}
    case 'lbonew':{const d=lboNew(ui.lboSrc||('sc:'+ui.sel));if(d){renderAll();save();$('#main').scrollTop=0;toast('Dossier LBO créé et pré-rempli : '+d.name);}else toast('Cible introuvable');break;}
    case 'lbogen':{const d=lboNew(id);if(d){ui.lboSrc=id;ui.tab='lbo';renderAll();save();$('#main').scrollTop=0;toast('Dossier LBO généré : '+d.name);}break;}
    case 'lbodel':{const d=lboCur();if(d){S.lbo.list=S.lbo.list.filter(x=>x.id!==d.id);S.lbo.cur=S.lbo.list.length?S.lbo.list[0].id:null;renderAll();save();toast('Dossier LBO supprimé');}break;}
    case 'lbosynadd':{const d=lboCur();d.syn.push({lev:'Nouvelle synergie',zone:'',k:0,y:2,note:''});renderAll();save();break;}
    case 'lbosyndel':{const d=lboCur();d.syn.splice(+id,1);renderAll();save();break;}
    case 'plan':ui.plan=id;renderAB();save();break;
    case 'buy':toast('Paiement à brancher au déploiement : Stripe Checkout et droits Supabase');break;
  }
});
$('#cmFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const n=cmImport(String(rd.result),ui.cmInst||'brent');e.target.value='';save();renderAll();toast(n?`${n} séances importées pour ${(CM_INST[ui.cmInst||'brent']||(mktAll()[ui.cmInst]||{}).l)}`:'Fichier non reconnu : colonnes Date et Dernier attendues');};rd.readAsText(f);});
layoutInit();renderAll();

$('#mt5File').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;readReport(f,txt=>{const r=mt5Ingest(txt,f.name);e.target.value='';save();renderAll();
  toast(r.tot?`${r.tot} position${r.tot>1?'s':''} lue${r.tot>1?'s':''} dans le rapport, ${r.n} nouvelle${r.n>1?'s':''} ajoutée${r.n>1?'s':''} au journal`:r.info.balance!=null?'Rapport lu : solde et fonds propres mis à jour':'Rapport non reconnu : exportez l\'historique MT5 au format HTML');});});

/* Petit crayon : garder le focus pendant le clic sur ✓ / ↺, sortir proprement si rien n'a changé */
document.addEventListener('mousedown',e=>{if(e.target.closest('.pv-on .pen,.pen-wrap .pen'))e.preventDefault();});
document.addEventListener('focusout',e=>{const el=e.target;if(!el.dataset||!ui.penK)return;if(!(el.dataset.pen||el.dataset.lk===ui.penK))return;
  setTimeout(()=>{const a=document.activeElement;if(ui.penK&&!(a&&a.closest&&a.closest('.pv-on,.pen-wrap'))){ui.penK=null;ui.penOld=undefined;renderAll();}},120);});

$('#holdFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const n=holdImport(String(rd.result),ui.holdBr||'Non affecté');e.target.value='';save();renderAll();toast(n?`${n} position${n>1?'s':''} importée${n>1?'s':''} pour ${ui.holdBr}`:'Fichier non reconnu : colonnes symbole et quantité attendues');};rd.readAsText(f);});
document.addEventListener('input',e=>{if(e.target.id==='brq'){ui.brQ=e.target.value;const q=ui.brQ.toLowerCase(),el=document.getElementById('brk');if(el)el.innerHTML=brList(BROKERS.filter(b=>!q||b.n.toLowerCase().includes(q)||b.t.toLowerCase().includes(q)),q);}});

$('#raFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const n=raImport(String(rd.result));e.target.value='';save();renderAll();toast(n?`${n} mois de réalisé importés`:'Aucun mois reconnu : colonnes attendues mois;ca;clients;ebitda;tresorerie');};rd.readAsText(f);});
