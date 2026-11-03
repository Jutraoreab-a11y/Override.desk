/* ============ Dossier d'acquisition LBO ============ */
/* Récupère la cible (dossier du Sélecteur, business plan ou titre coté), pré-remplit le dossier
   et calcule montage, remboursement de la dette, TRI et multiple d'equity. Montants en M€. */
function lboTarget(src){
  const[type,id]=String(src).split(':');
  if(type==='sc'){const c=S.sc.list.find(x=>x.id===id);if(!c)return null;const sec=SECT[c.sec]?c.sec:'saas',D=DAMO[sec]||DAMO.saas;
    const filt=FKEYS.map((k,i)=>[FQ[i][0],+c[k],[c.liqTxt,c.catTxt,c.faille,c.tamTxt][i]]);
    return{type,id,name:c.n,sec:(SECT[sec]||{}).l||sec,secKey:sec,rev:+c.arr,ebitda:+c.arr*(+c.ebm||0)/100,m:+c.ebm||0,g:+c.gr||0,score:attr(c),filt,mult:+D.eve,multSrc:`VE/EBITDA médian du secteur ${D.ind}, Damodaran janvier 2026`,
      thesis:[c.pos,c.equity].filter(Boolean).join(' '),pres:[c.bmTxt,c.teamTxt].filter(Boolean).join(' '),sell:c.bmTxt||'',who:c.pos||'',edge:c.faille?'Angle mort du leader exploité : '+c.faille:'',srcLab:'Dossier du Sélecteur',prem:0,lead:c.lead,evs:+D.evs};}
  if(type==='bp'){const b=S.bp,r=bpCalc(),k=r.mk,Y=r.Y,H=r.H,yr=Y[H-1],sec=SECT[b.sector]?b.sector:'saas',D=DAMO[sec]||DAMO.saas,T=b.tamis;
    const filt=k.filt.map(f=>[f[0],+f[1],f[2]]),sc=10*((+T.cat)*25+(+T.conc)*20+k.sizeS*25+7*15+(r.ratio>=3?8:5)*15)/100;
    return{type,id:'bp',name:b.name||'Projet',sec:(SECT[sec]||{}).l,secKey:sec,rev:yr.rev/1e6,ebitda:yr.ebitda/1e6,m:yr.em,g:Y[H-2]?(yr.rev/Y[H-2].rev-1)*100:20,score:sc,filt,mult:+D.eve,multSrc:`VE/EBITDA médian du secteur ${D.ind}, Damodaran janvier 2026`,
      thesis:[b.posStmt,b.edge].filter(Boolean).join(' '),pres:b.whatSell,sell:b.whatSell||'',who:(b.fiche||{}).forWho||'',edge:b.edge||'',bm:(typeof BM_TYPES!=='undefined'?(BM_TYPES[(b.fiche||{}).bmType]||'')+' · '+(REV_TYPES[(b.fiche||{}).revType]||''):''),srcLab:`Business plan (année ${H} du prévisionnel, ${(+b.startY||2027)+H-1})`,prem:0,evs:+D.evs};}
  if(type==='an'){const a=S.an.assets[id];if(!a)return null;const B=anBase(a),L=B.L,R=anCalc(id),k=a.rcur==='USD'?1/FX_EURUSD:1;
    return{type,id,name:`${a.n} (${a.t})`,sec:a.sec,secKey:null,rev:a.rev[L]*k,ebitda:a.ebitda[L]*k,m:B.em[L],g:isFinite(B.revG[L])?B.revG[L]:3,score:R.score,filt:R.filt.map(f=>[f[0],+f[1],f[2]]),mult:B.evE,multSrc:`VE/EBITDA actuel du titre (cours du ${a.pxDate||'—'})`,
      thesis:R.concl,pres:`${a.sec}. Comptes ${a.y[L]} publiés, source ${a.src||'MarketScreener'}.`,sell:'',who:'',edge:'',srcLab:'Titre coté (retrait de la cote)',prem:25,netDebt:a.nd[L]*k};}
  return null;
}
function lboNew(src){
  const T=lboTarget(src);if(!T)return null;const g=clamp(T.g,-5,40);
  const d={id:uid('l'),name:'LBO '+T.name,src,date:today(),thesis:T.thesis||'',pres:T.pres||'',sell:T.sell||'',who:T.who||'',edge:T.edge||'',bm:T.bm||'',
    p:{basis:'emplois',entryMult:+(isFinite(T.mult)&&T.mult>0?T.mult:8).toFixed(1),exitMult:+(isFinite(T.mult)&&T.mult>0?T.mult:8).toFixed(1),prem:T.prem,fees:3,seniorPct:55,margin:4,euribor:LBO_SRC.euribor.v,amortY:7,mezzPct:0,mezzRate:10,sweep:50,H:5,
      g:[1,2,3,4,5].map(i=>+(g*Math.pow(0.85,i-1)).toFixed(1)),m0:+(+T.m||0).toFixed(1),mT:+Math.max(+T.m||0,(+T.m||0)+3).toFixed(1),capex:3,bfr:10,da:3,tax:LBO_SRC.tax.v,covLev:4.5,covDscr:1.2,irrT:20,synIncl:true,debtCap:true,privDisc:T.type==='an'?0:30},
    syn:[{lev:'Achats et sous-traitance mutualisés',zone:'France ↔ Afrique',k:0,y:2,note:'À chiffrer avec les fournisseurs'},{lev:'Ouverture commerciale',zone:'Afrique de l\'Ouest (zone franc CFA)',k:0,y:3,note:'Clients et distributeurs à identifier'},{lev:'Centre de services partagés',zone:'France → Afrique du Nord',k:0,y:3,note:'Coûts de structure à comparer'}],
    road:['100 premiers jours : gouvernance, reporting mensuel, revue des contrats clés','Plan de performance opérationnelle et achats','Croissance externe ciblée ou ouverture d\'un nouveau marché','Montée en puissance des synergies et désendettement','Préparation de la sortie : data room, vendor due diligence']};
  lboMig(d);S.lbo.list.push(d);S.lbo.cur=d.id;return d;
}
function lboCur(){const d=S.lbo.list.find(x=>x.id===S.lbo.cur)||S.lbo.list[0];if(d)lboMig(d);return d;}
/* Dette senior : 50 à 60 % des emplois par défaut (règle v5). Scénarios multiples par dossier. */
function lboMig(d){
  if(d.p.basis!=='emplois'){d.p.basis='emplois';d.p.seniorPct=55;}
  if(!d.ov)d.ov={rev:[],eb:[]};
  if(d.p.debtCap===undefined)d.p.debtCap=true;if(d.p.privDisc===undefined)d.p.privDisc=String(d.src).startsWith('an:')?0:30;
  if(d.sell===undefined){const T=lboTarget(d.src)||{};d.sell=T.sell||'';d.who=T.who||'';d.edge=T.edge||'';d.bm=T.bm||'';}
  if(!d.scs||!d.scs.length){const s={id:uid('s'),name:'Scénario de base',date:today()};d.scs=[s];d.scCur=s.id;lboSync(d);}
}
function lboSync(d){const s=d.scs.find(x=>x.id===d.scCur);if(s)Object.assign(s,{p:clone(d.p),syn:clone(d.syn),road:clone(d.road),ov:clone(d.ov)});}
function lboScView(d,s){return s.id===d.scCur?d:Object.assign({},d,{p:s.p,syn:s.syn,road:s.road,ov:s.ov||{rev:[],eb:[]}});}
function lboScAct(act,id){const d=lboCur();if(!d)return;lboSync(d);const cur=d.scs.find(x=>x.id===d.scCur);
  if(act==='new'){const n={id:uid('s'),name:'Nouveau scénario',date:today(),p:clone(d.p),syn:clone(d.syn),road:clone(d.road),ov:clone(d.ov)};d.scs.push(n);d.scCur=n.id;ui.lboScRen=n.id;toast('Scénario créé à partir de « '+cur.name+' » : renommez-le puis modifiez ses paramètres');}
  else if(act==='load'){const n=d.scs.find(x=>x.id===id);if(n){d.scCur=n.id;d.p=clone(n.p);d.syn=clone(n.syn);d.road=clone(n.road);d.ov=clone(n.ov||{rev:[],eb:[]});toast('Scénario ouvert : '+n.name);}}
  else if(act==='del'){if(d.scs.length<2){toast('Un dossier garde au moins un scénario');return;}d.scs=d.scs.filter(x=>x.id!==id);if(id===d.scCur){const n=d.scs[0];d.scCur=n.id;d.p=clone(n.p);d.syn=clone(n.syn);d.road=clone(n.road);d.ov=clone(n.ov||{rev:[],eb:[]});}toast('Scénario supprimé');}
  renderAll();save();}
function lboModel(d,ov){
  const T=lboTarget(d.src)||{rev:0,ebitda:0,netDebt:0},P=Object.assign({},d.p,ov||{}),O=d.ov||{rev:[],eb:[]},H=clamp(Math.round(+P.H),3,7);
  const rate=(+P.euribor+ +P.margin)/100,m0=+P.m0/100,mT=+P.mT/100,rev0=T.rev,e0=rev0*m0;
  /* Audit v7.1 : (1) décote de taille et d'illiquidité appliquée aux multiples de sociétés cotées quand la cible ne l'est pas ;
     (2) EBITDA négatif : valorisation au multiple VE/CA du secteur et aucune dette d'acquisition (pas de cash-flow à servir) ;
     (3) prime de contrôle appliquée à la valeur des titres, pas à la valeur d'entreprise ;
     (4) dette senior = % des emplois, plafonnée au levier du covenant (pratique bancaire). */
  const disc=1-clamp(+P.privDisc||0,0,90)/100,neg=!(e0>0),nd0=+T.netDebt||0;
  const evMult=neg?rev0*(+T.evs||0)*disc:e0*(+P.entryMult)*disc,eqv=evMult-nd0,ev0=eqv*(1+(+P.prem||0)/100)+nd0;
  const fees=ev0*(+P.fees)/100,emp=ev0+fees,mez0=neg?0:emp*(+P.mezzPct)/100;
  const senW=neg?0:emp*(+P.seniorPct)/100,senCap=(P.debtCap===false||P.debtCap==='false')?Infinity:Math.max(0,(+P.covLev)*e0-mez0),sen0=Math.min(senW,senCap),eq0=emp-sen0-mez0;
  const Y=[];let rev=rev0,sen=sen0,cash=0;
  for(let t=1;t<=H;t++){const oR=O.rev[t-1],oE=O.eb[t-1],rv=oR!=null&&oR!==''&&isFinite(+oR)?+oR:rev*(1+(+(P.g[t-1]??P.g[P.g.length-1]))/100),g=(rv/rev-1),mg=m0+(mT-m0)*t/H;
    const syn=(P.synIncl===true||P.synIncl==='true')?sum(d.syn.filter(s=>+s.y<=t).map(s=>(+s.k||0)/1000)):0,eb=oE!=null&&oE!==''&&isFinite(+oE)?+oE:rv*mg+syn,da=rv*(+P.da)/100,ebit=eb-da;
    const iS=sen*rate,iM=mez0*(+P.mezzRate)/100,tax=Math.max(0,(ebit-iS-iM)*(+P.tax)/100),capex=rv*(+P.capex)/100,dB=(rv-rev)*(+P.bfr)/100;
    const fcf=eb-capex-dB-tax,am=Math.min(sen,sen0/Math.max(1,+P.amortY)),after=cash+fcf-iS-iM-am,sw=Math.max(0,Math.min(sen-am,after*(+P.sweep)/100));
    const senC=sen-am-sw,cashC=after-sw,nd=senC+mez0-cashC;
    Y.push({t,rev:rv,g:g*100,m:eb/rv*100,syn,eb,da,ebit,iS,iM,tax,capex,dB,fcf,am,sw,senO:sen,senC,mez:mez0,cash:cashC,nd,lev:eb>0?nd/eb:NaN,dscr:(iS+iM+am)>0?fcf/(iS+iM+am):NaN});
    rev=rv;sen=senC;cash=cashC;}
  const yH=Y[H-1],evX=yH.eb>0?yH.eb*(+P.exitMult)*disc:yH.rev*(+T.evs||0)*disc,eqX=evX-yH.nd,moic=eq0>0?eqX/eq0:NaN,irr=eq0>0&&eqX>0?Math.pow(eqX/eq0,1/H)-1:NaN;
  const m0e=ev0/(e0||1),bridge={growth:(yH.eb-e0)*m0e,mult:(+P.exitMult-m0e)*yH.eb,delev:sen0+mez0-yH.nd,fees:-fees};
  return{T,P,H,rate,rev0,e0,ev0,fees,sen0,mez0,eq0,Y,disc,neg,senW,capped:sen0<senW-1e-9,evX,eqX,moic,irr,bridge,lev0:e0>0?(sen0+mez0)/e0:NaN,senLev0:e0>0?sen0/e0:NaN,minDscr:Math.min(...Y.map(y=>y.dscr).filter(isFinite)),maxLev:Math.max(...Y.map(y=>y.lev).filter(isFinite))};
}
function lboChecks(M){const P=M.P;return[
  ['EBITDA de la cible positif',M.e0>0,`EBITDA de référence ${nf(M.e0,2)} M€`],
  ['Levier à l\'entrée',M.lev0<=+P.covLev,`dette / EBITDA ${nf(M.lev0,1)}× pour un maximum de ${nf(+P.covLev,1)}×`],
  ['Couverture du service de la dette',M.minDscr>=+P.covDscr,`DSCR minimal ${nf(M.minDscr,2)} pour un minimum de ${nf(+P.covDscr,2)}`],
  ['Rendement des fonds propres',M.irr*100>=+P.irrT,`TRI ${isFinite(M.irr)?pct(M.irr*100,1):'—'} pour un objectif de ${pct(+P.irrT,0)}`],
  ['Trésorerie toujours positive',Math.min(...M.Y.map(y=>y.cash))>=0,Math.min(...M.Y.map(y=>y.cash))>=0?'aucun besoin de financement complémentaire':`creux de ${nf(Math.min(...M.Y.map(y=>y.cash)),2)} M€ : prévoir une ligne de crédit renouvelable (RCF) ou réduire la dette`],
  ['Multiple d\'equity',M.moic>=2,`MoIC ${isFinite(M.moic)?nf(M.moic,2)+'×':'—'} pour un objectif de 2,0×`]];}
function lboVerdict(M){const c=lboChecks(M),ko=c.filter(x=>!x[1]).length;return!c[0][1]||M.minDscr<1||M.lev0>+M.P.covLev+1?['ko','Non finançable en l\'état']:ko?['am',`Finançable sous réserves (${ko} point${ko>1?'s':''} à traiter)`]:['ok','Dossier prêt pour le comité de crédit'];}
function lboSrcOpts(cur){
  const o=(v,l)=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(l)}</option>`;
  return`<optgroup label="Sélecteur">${S.sc.list.filter(c=>!c.lead).map(c=>o('sc:'+c.id,c.n+(c.ebm>0?'':' (EBITDA négatif)'))).join('')}</optgroup><optgroup label="Business plan">${o('bp',(S.bp.name||'Projet')+' (business plan)')}</optgroup><optgroup label="Titres cotés">${Object.keys(S.an.assets).map(k=>o('an:'+k,S.an.assets[k].n+' ('+S.an.assets[k].t+')')).join('')}</optgroup>`;
}
function sensGrid(d){const P=d.p,e=+P.entryMult,x=+P.exitMult,st=1,E=[-2,-1,0,1,2].map(i=>e+i*st),X=[-2,-1,0,1,2].map(i=>x+i*st);
  return`<div class="tw"><table class="tbl fin"><thead><tr><th>Entrée ↓ / Sortie →</th>${X.map(v=>`<th class="n">${nf(v,1)}×</th>`).join('')}</tr></thead><tbody>${E.map(ev=>`<tr><td>${nf(ev,1)}×</td>${X.map(xv=>{const m=lboModel(d,{entryMult:ev,exitMult:xv}),v=m.irr*100;return`<td class="n ${!isFinite(v)?'':v>=+P.irrT?'up':v<10?'down':''}"${ev===e&&xv===x?' style="font-weight:700;outline:1px solid var(--line2)"':''}>${isFinite(v)?pct(v,1):'—'}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;}
function renderLBO(){
  if(!S.lbo)S.lbo={list:[],cur:null};
  const L=S.lbo.list;
  const bar=`<div class="card s12 prj noprint"><div class="prj-h"><span class="prj-l">${ic('fold')}<b>Dossier LBO</b></span>
    ${L.length?`<select class="f" style="width:auto;max-width:280px" data-lbo="1" aria-label="Dossier LBO">${L.map(x=>`<option value="${x.id}"${x.id===(lboCur()||{}).id?' selected':''}>${esc(x.name)} · ${fdate(x.date)}</option>`).join('')}</select>`:''}
    <span class="prj-l">Cible</span><select class="f" style="width:auto;max-width:280px" data-lbosrc="1" aria-label="Cible du nouveau dossier">${lboSrcOpts(ui.lboSrc||('sc:'+ui.sel))}</select>
    <span class="row" style="margin-left:auto"><button class="btn pri sm" data-act="lbonew">+ Nouveau dossier LBO</button>${L.length?'<button class="btn sm" data-act="lbodel">Supprimer ce dossier</button>':''}</span></div></div>`;
  const d=lboCur();
  if(!d){$('#p-lbo').innerHTML=`<div class="grid">${bar}<div class="card s12"><h2>Aucun dossier LBO</h2><p class="lead" style="margin-top:0">Choisissez une cible (dossier du Sélecteur, business plan ou titre coté) puis « + Nouveau dossier LBO » : le dossier est pré-rempli avec ses données et structuré en cinq parties pour le comité d'acquisition et les banques.</p><p class="note">Raccourci : bouton « Générer le dossier LBO » sur la fiche d'un dossier du Sélecteur.</p></div></div>`;return;}
  const i=L.indexOf(d),Pp=`lbo.list.${i}.p`,M=lboModel(d),T=M.T,P=M.P,Y=M.Y,H=M.H,v=lboVerdict(M),ch=lboChecks(M),u=' M€',mm=x=>nf(x,2);
  if(!T){$('#p-lbo').innerHTML=`<div class="grid">${bar}<div class="card s12 msg">La cible de ce dossier n'existe plus.</div></div>`;return;}
  lboSync(d);
  const scB=`<div class="card s12 prj noprint"><div class="prj-h"><span class="prj-l"><b>Scénario</b></span>
      <select class="f" style="width:auto;max-width:260px" data-lbosc="1" aria-label="Scénario">${d.scs.map(s=>`<option value="${s.id}"${s.id===d.scCur?' selected':''}>${esc(s.name)} · ${fdate(s.date)}</option>`).join('')}</select>
      <label class="fld" style="flex-direction:row;align-items:center;gap:6px;margin:0"><span class="lb" style="margin:0">Nom</span>${lin(`lbo.list.${i}.scs.${d.scs.findIndex(s=>s.id===d.scCur)}.name`,'t',{style:'width:200px',al:'Nom du scénario'})}</label>
      <span class="row" style="margin-left:auto"><button class="btn sm" data-act="lbosc" data-id="new">+ Nouveau scénario</button><button class="btn sm" data-act="lbosc" data-id="del:${d.scCur}"${d.scs.length<2?' disabled':''}>Supprimer ce scénario</button></span></div>
    ${d.scs.length>1?`<div class="tw" style="margin-top:10px"><table class="tbl fin"><thead><tr><th>Scénario</th><th class="n">Multiple d'entrée</th><th class="n">Dette senior</th><th class="n">Equity</th><th class="n">Levier</th><th class="n">DSCR min.</th><th class="n">TRI</th><th class="n">MoIC</th><th>Verdict</th><th></th></tr></thead><tbody>
      ${d.scs.map(s=>{const m=lboModel(lboScView(d,s)),vv=lboVerdict(m);return`<tr${s.id===d.scCur?' class="on"':''}><td><b>${esc(s.name)}</b> <span class="meta">${fdate(s.date)}</span></td><td class="n">${nf(+s.p.entryMult,1)}×</td><td class="n">${nf(m.sen0,2)} M€ · ${pct(+s.p.seniorPct,0)}</td><td class="n">${nf(m.eq0,2)} M€</td><td class="n">${nf(m.lev0,1)}×</td><td class="n ${m.minDscr<+s.p.covDscr?'down':''}">${nf(m.minDscr,2)}</td><td class="n ${m.irr*100>=+s.p.irrT?'up':'down'}">${isFinite(m.irr)?pct(m.irr*100,1):'—'}</td><td class="n">${isFinite(m.moic)?nf(m.moic,2)+'×':'—'}</td><td><span class="tag ${vv[0]}">${vv[1].split(' (')[0]}</span></td><td style="white-space:nowrap">${s.id===d.scCur?'':`<button class="btn sm" data-act="lbosc" data-id="load:${s.id}">Ouvrir</button> <button class="btn sm" data-act="lbosc" data-id="del:${s.id}">Supprimer</button>`}</td></tr>`;}).join('')}
    </tbody></table></div>`:''}</div>`;
  const penC=(k,t,val)=>{const pth=`lbo.list.${i}.ov.${k}.${t}`,ov=d.ov[k][t]!=null&&d.ov[k][t]!=='';return ui.penK===pth?`<span class="pen-wrap">${lin(pth,'nn',{style:'width:84px',al:'Valeur forcée'})}<button class="pen" data-act="penok" title="Valider">✓</button></span>`:`<span class="pen-wrap${ov?' ovr':''}">${nf(val,2)}<button class="pen" data-act="penlin" data-id="${pth}" title="Forcer la valeur">${ic('pen')}</button>${ov?`<button class="pen" data-act="penclr" data-id="${pth}" title="Revenir au calcul">↺</button>`:''}</span>`;};
  const yrs=Y.map(y=>'A'+y.t),row=(l,a,c,f)=>`<tr class="${c||''}"><td>${l}</td>${a.map(x=>{x=Math.abs(x)<5e-4?0:x;return`<td class="n${x<0&&!f?' down':''}">${f?f(x):mm(x)}</td>`;}).join('')}</tr>`;
  const br=M.bridge,brT=br.growth+br.mult+br.delev+br.fees;
  $('#p-lbo').innerHTML=`<div class="grid">${bar}${scB}
    <div class="ph s12" style="grid-column:1/-1"><div><h1>Dossier d'acquisition LBO : ${esc(T.name)}</h1><p>Comité d'acquisition et banques · ${esc(T.srcLab)} · établi le ${fdate(d.date)} · montants en millions d'euros</p></div></div>
    <div class="card s12 noprint"><h2><span>Configuration du montage</span><span class="meta">chaque valeur est modifiable et recalcule le dossier</span></h2>
      <div class="fields">${LF('Nom du dossier',`lbo.list.${i}.name`,'t')}${LF('Multiple d\'entrée VE / EBITDA',Pp+'.entryMult','n',{u:'×'})}${LF('Prime de contrôle',Pp+'.prem','n',{u:'%'})}${LF('Frais de transaction',Pp+'.fees','n',{u:'% VE'})}
        ${LF('Dette senior',Pp+'.seniorPct','n',{u:'% emplois'})}${LF('Plafonner au levier du covenant',Pp+'.debtCap','s',{opts:{true:'Oui (pratique bancaire)',false:'Non'}})}${LF('Décote taille et illiquidité',Pp+'.privDisc','n',{u:'% multiples'})}${LF('Euribor 3 mois',Pp+'.euribor','n',{u:'%'})}${LF('Marge bancaire senior',Pp+'.margin','n',{u:'%'})}${LF('Durée d\'amortissement senior',Pp+'.amortY','n',{u:'ans'})}
        ${LF('Dette mezzanine',Pp+'.mezzPct','n',{u:'% emplois'})}${LF('Taux mezzanine (in fine)',Pp+'.mezzRate','n',{u:'%'})}${LF('Remboursement anticipé (cash sweep)',Pp+'.sweep','n',{u:'% excédent'})}${LF('Horizon de sortie',Pp+'.H','n',{u:'ans'})}
        ${LF('Multiple de sortie',Pp+'.exitMult','n',{u:'×'})}${LF('Marge EBITDA actuelle',Pp+'.m0','n',{u:'%'})}${LF('Marge EBITDA cible',Pp+'.mT','n',{u:'%'})}${LF('Investissements',Pp+'.capex','n',{u:'% CA'})}
        ${LF('BFR',Pp+'.bfr','n',{u:'% CA'})}${LF('Amortissements',Pp+'.da','n',{u:'% CA'})}${LF('Impôt sur les sociétés',Pp+'.tax','n',{u:'%'})}${LF('TRI cible',Pp+'.irrT','n',{u:'%'})}
        ${LF('Levier maximal (covenant)',Pp+'.covLev','n',{u:'×'})}${LF('DSCR minimal (covenant)',Pp+'.covDscr','n')}${LF('Synergies dans le modèle',Pp+'.synIncl','s',{opts:{true:'Oui',false:'Non'}})}</div>
      <div class="fields" style="margin-top:8px">${Array.from({length:H},(_,t)=>LF('Croissance du CA A'+(t+1),`${Pp}.g.${t}`,'n',{u:'%'})).join('')}</div>
      <p class="note">Sources : Euribor 3 mois ${nf(LBO_SRC.euribor.v,3)} % au ${LBO_SRC.euribor.d} (${LBO_SRC.euribor.s}) ; impôt sur les sociétés ${LBO_SRC.tax.v} % (${LBO_SRC.tax.s}) ; multiple d'entrée : ${esc(T.multSrc)}. Marge bancaire, frais et part de dette : hypothèses à confirmer avec les banques.</p></div>

    <div id="lbo-s1" class="card s12"><h2><span>1. Executive summary</span><span class="tag ${v[0]}">${v[1]}</span></h2>
      <div class="stats">
        <div class="stat"><div class="k">Prix d'acquisition (VE)</div><div class="x">${mm(M.ev0)}${u}</div><div class="d">${nf(M.ev0/(M.e0||1),1)}× l'EBITDA</div></div>
        <div class="stat"><div class="k">Dette d'acquisition</div><div class="x">${mm(M.sen0+M.mez0)}${u}</div><div class="d">${pct((M.sen0+M.mez0)/(M.ev0+M.fees)*100,0)} des emplois · ${nf(M.lev0,1)}× EBITDA</div></div>
        <div class="stat"><div class="k">Fonds propres investis</div><div class="x">${mm(M.eq0)}${u}</div><div class="d">${pct(M.eq0/(M.ev0+M.fees)*100,0)} des emplois</div></div>
        <div class="stat"><div class="k">TRI</div><div class="x ${M.irr*100>=+P.irrT?'up':'down'}">${isFinite(M.irr)?pct(M.irr*100,1):'—'}</div><div class="d">sortie en A${H} à ${nf(+P.exitMult,1)}×</div></div>
        <div class="stat"><div class="k">Multiple d'equity (MoIC)</div><div class="x ${M.moic>=2?'up':'down'}">${isFinite(M.moic)?nf(M.moic,2)+'×':'—'}</div><div class="d">equity de sortie ${mm(M.eqX)}${u}</div></div>
      </div>
      <div class="grid" style="margin-top:6px">
        <div class="s6" style="min-width:0"><h3 class="h3">Présentation de la cible</h3><div class="tw"><table class="tbl"><tbody>
          <tr><td>Société</td><td><b>${esc(T.name)}</b></td></tr><tr><td>Secteur</td><td>${esc(T.sec)}</td></tr>
          <tr><td>Chiffre d'affaires de référence</td><td class="num">${mm(T.rev)}${u}</td></tr><tr><td>EBITDA de référence</td><td class="num ${M.e0<0?'down':''}">${mm(M.e0)}${u} (marge ${pct(+P.m0,1)})</td></tr>
          <tr><td>Croissance récente</td><td class="num">${sgn(T.g,1)}</td></tr><tr><td>Origine des données</td><td>${esc(T.srcLab)}</td></tr></tbody></table></div>
          <div class="lb" style="margin-top:8px">Activité</div>${lin(`lbo.list.${i}.pres`,'a',{rows:3})}
          <div class="lb" style="margin-top:8px">Ce que la cible vend</div>${lin(`lbo.list.${i}.sell`,'a',{rows:2,ph:'Produits ou services exacts'})}
          <div class="lb" style="margin-top:8px">À qui</div>${lin(`lbo.list.${i}.who`,'a',{rows:2,ph:'Clients, taille, acheteurs et décideurs'})}
          <div class="lb" style="margin-top:8px">Business model</div>${lin(`lbo.list.${i}.bm`,'t',{ph:'ex. SaaS par abonnement, maintenance sous contrat'})}
          <div class="lb" style="margin-top:8px">Avantage injuste (edge)</div>${lin(`lbo.list.${i}.edge`,'a',{rows:2,ph:'Ce que les concurrents ne peuvent pas copier'})}</div>
        <div class="s6" style="min-width:0"><h3 class="h3">Thèse d'investissement</h3>${lin(`lbo.list.${i}.thesis`,'a',{rows:6,ph:'Pourquoi cette cible, pourquoi maintenant, comment on crée la valeur'})}
          <div class="dec" style="grid-template-columns:1fr;margin-top:8px">${ch.map(x=>`<div class="dc"><span class="dot ${x[1]?'ok':'ko'}"></span><div><b>${x[0]}</b><span>${x[2]}</span></div></div>`).join('')}</div></div>
      </div></div>

    <div id="lbo-s2" class="card s6"><h2><span>2. Scoring macro et tamis</span><span class="tag ${T.filt.filter(f=>f[1]>=S.sc.min).length===4?'ok':'ko'}">${T.filt.filter(f=>f[1]>=S.sc.min).length}/4 filtres</span></h2>
      <div class="stats" style="grid-template-columns:1fr 1fr"><div class="stat"><div class="k">${T.type==='an'?'Score de qualité':'Attractivité'}</div><div class="x">${nf(T.score,0)}/100</div><div class="d">${T.type==='an'?'volet Analyse financière':'grille du Sélecteur'}</div></div>
        ${T.secKey?(()=>{const q=secInGeo(T.secKey,geoAgg(ui.geo||'W'));return`<div class="stat"><div class="k">Secteur, ${esc(geoAgg(ui.geo||'W').lab)}</div><div class="x">${pct(q.cagr,1)}/an</div><div class="d">TAM ${big(q.tam)} · attractivité ${nf(q.attr,0)}/100</div></div>`;})():'<div class="stat"><div class="k">Secteur</div><div class="x">—</div><div class="d">titre coté : voir le volet Analyse financière</div></div>'}</div>
      <div class="tw"><table class="tbl"><tbody>${T.filt.map(f=>`<tr><td><span class="dot ${f[1]>=S.sc.min?'ok':'ko'}"></span> ${esc(f[0])}</td><td class="n">${nf(f[1],1)}/10</td><td class="wrap">${esc(f[2]||'')}</td></tr>`).join('')}</tbody></table></div></div>

    <div id="lbo-s3" class="card s6"><h2>3. Montage financier</h2>
      <div class="tw"><table class="tbl fin"><thead><tr><th>Emplois</th><th class="n">M€</th><th class="n">%</th></tr></thead><tbody>
        <tr><td>Prix d'acquisition (valeur d'entreprise)</td><td class="n">${mm(M.ev0)}</td><td class="n">${pct(M.ev0/(M.ev0+M.fees)*100,1)}</td></tr><tr><td>Frais de transaction</td><td class="n">${mm(M.fees)}</td><td class="n">${pct(M.fees/(M.ev0+M.fees)*100,1)}</td></tr>
        <tr class="tot"><td>Total des emplois</td><td class="n">${mm(M.ev0+M.fees)}</td><td class="n">100 %</td></tr></tbody></table></div>
      <div class="tw" style="margin-top:8px"><table class="tbl fin"><thead><tr><th>Ressources</th><th class="n">M€</th><th class="n">%</th><th class="n">× EBITDA</th></tr></thead><tbody>
        <tr><td>Dette senior (Euribor + ${nf(+P.margin,2)} %, amortissable ${P.amortY} ans)</td><td class="n">${mm(M.sen0)}</td><td class="n">${pct(M.sen0/(M.ev0+M.fees)*100,1)}</td><td class="n">${nf(M.senLev0,1)}×</td></tr>
        ${M.mez0>0?`<tr><td>Dette mezzanine (${nf(+P.mezzRate,1)} %, in fine)</td><td class="n">${mm(M.mez0)}</td><td class="n">${pct(M.mez0/(M.ev0+M.fees)*100,1)}</td><td class="n">${nf(M.mez0/M.e0,1)}×</td></tr>`:''}
        <tr><td>Fonds propres (equity)</td><td class="n">${mm(M.eq0)}</td><td class="n">${pct(M.eq0/(M.ev0+M.fees)*100,1)}</td><td class="n">—</td></tr>
        <tr class="tot"><td>Total des ressources</td><td class="n">${mm(M.ev0+M.fees)}</td><td class="n">100 %</td><td class="n">${nf(M.lev0,1)}×</td></tr></tbody></table></div>
      <p class="note">${M.neg?`EBITDA de référence négatif : cible valorisée à ${nf(+M.T.evs||0,2)}× le CA (VE/CA du secteur) et <b>aucune dette d'acquisition</b>, faute de cash-flow pour la servir. `:`Multiple VE / EBITDA payé : ${nf(M.ev0/(M.e0||1),1)}×${+P.prem?` (prime de contrôle de ${pct(+P.prem,0)} sur la valeur des titres)`:''}${M.disc<1?`, après décote de taille et d'illiquidité de ${pct((1-M.disc)*100,0)} sur le multiple de référence ${nf(+P.entryMult,1)}× (sociétés cotées, à justifier : les études de décote d'illiquidité situent l'ordre de grandeur entre 20 et 35 %)`:''}. `}${M.capped?`Dette senior plafonnée à ${nf(+P.covLev,1)}× l'EBITDA (${nf(M.sen0,2)} M€ au lieu de ${nf(M.senW,2)} M€ à ${pct(+P.seniorPct,0)} des emplois) : le complément est apporté en fonds propres. `:''} Taux de la dette senior : ${pct(M.rate*100,2)}. Hypothèse : cible acquise sans trésorerie ni dette.</p></div>

    <div id="lbo-s4" class="card s12"><h2><span>4. Modèle de remboursement</span><span class="meta">cash-flows prévisionnels, service de la dette et sortie</span></h2>
      <div class="tw"><table class="tbl fin"><thead><tr><th>M€</th>${yrs.map(y=>`<th class="n">${y}</th>`).join('')}</tr></thead><tbody>
        <tr><td>Chiffre d'affaires</td>${Y.map((y,t)=>`<td class="n">${penC('rev',t,y.rev)}</td>`).join('')}</tr>${row('Croissance',Y.map(y=>y.g),'',x=>sgn(x,1))}<tr class="tot"><td>EBITDA</td>${Y.map((y,t)=>`<td class="n">${penC('eb',t,y.eb)}</td>`).join('')}</tr>${row('dont synergies',Y.map(y=>y.syn))}${row('Marge EBITDA',Y.map(y=>y.m),'',x=>pct(x,1))}
        ${row('Impôt',Y.map(y=>-y.tax))}${row('Investissements',Y.map(y=>-y.capex))}${row('Variation du BFR',Y.map(y=>-y.dB))}${row('Cash-flow disponible avant dette',Y.map(y=>y.fcf),'tot')}
        ${row('Intérêts senior',Y.map(y=>-y.iS))}${M.mez0>0?row('Intérêts mezzanine',Y.map(y=>-y.iM)):''}${row('Amortissement contractuel',Y.map(y=>-y.am))}${row('Remboursement anticipé',Y.map(y=>-y.sw))}
        ${row('Dette senior fin d\'année',Y.map(y=>y.senC),'tot')}${row('Trésorerie fin d\'année',Y.map(y=>y.cash))}${row('Dette nette / EBITDA',Y.map(y=>y.lev),'',x=>`<span class="${x>+P.covLev?'down':''}">${nf(x,1)}×</span>`)}${row('DSCR',Y.map(y=>y.dscr),'',x=>`<span class="${x<+P.covDscr?'down':''}">${nf(x,2)}</span>`)}
      </tbody></table></div>
      <div class="grid" style="margin-top:8px">
        <div class="s6" style="min-width:0"><h3 class="h3">Désendettement</h3>${colChart(['Entrée',...yrs],[M.sen0+M.mez0,...Y.map(y=>y.nd)],{w:520,h:200,fmt:v=>nf(v,1),line:{vals:[M.lev0,...Y.map(y=>y.lev)],fmt:v=>nf(v,1)+'×'},title:'Dette nette et levier'})}<p class="note">Barres : dette nette (M€) ; ligne : dette nette / EBITDA.</p></div>
        <div class="s6" style="min-width:0"><h3 class="h3">Sortie en A${H}</h3><div class="tw"><table class="tbl"><tbody>
          <tr><td>EBITDA de sortie</td><td class="n">${mm(Y[H-1].eb)}</td></tr><tr><td>Valeur d'entreprise (${nf(+P.exitMult,1)}×)</td><td class="n">${mm(M.evX)}</td></tr><tr><td>Dette nette résiduelle</td><td class="n">${mm(Y[H-1].nd)}</td></tr>
          <tr class="tot"><td>Valeur des fonds propres</td><td class="n">${mm(M.eqX)}</td></tr><tr><td>Fonds propres investis</td><td class="n">${mm(M.eq0)}</td></tr>
          <tr><td>TRI</td><td class="n ${M.irr*100>=+P.irrT?'up':'down'}">${isFinite(M.irr)?pct(M.irr*100,1):'—'}</td></tr><tr><td>MoIC</td><td class="n">${isFinite(M.moic)?nf(M.moic,2)+'×':'—'}</td></tr></tbody></table></div></div>
      </div>
      <p class="note noprint">Le crayon force le chiffre d'affaires ou l'EBITDA d'une année : tout le modèle se recalcule en cascade (dette, DSCR, TRI) et la valeur forcée est marquée d'une pastille ; ↺ revient au calcul.</p>
      <h3 class="h3">Sensibilité du TRI aux multiples d'entrée et de sortie</h3>${sensGrid(d)}</div>

    <div id="lbo-s5" class="card s12"><h2><span>5. Plan de création de valeur</span><span class="meta">d'où vient le gain des actionnaires</span></h2>
      <div class="grid"><div class="s12" style="min-width:0">${colChart(['Croissance EBITDA','Effet multiple','Désendettement','Frais','Gain total'],[br.growth,br.mult,br.delev,br.fees,brT],{w:900,h:210,fmt:v=>nf(v,1),title:'Pont de création de valeur',colors:[br.growth>=0?'var(--up)':'var(--down)',br.mult>=0?'var(--up)':'var(--down)',br.delev>=0?'var(--up)':'var(--down)','var(--down)','var(--hi)']})}
        <p class="note">Gain total = equity de sortie − equity investi = ${mm(brT)} M€. Croissance de l'EBITDA ${pct(Math.abs(br.growth)/Math.max(1e-9,Math.abs(br.growth)+Math.abs(br.mult)+Math.abs(br.delev))*100,0)} du gain brut.</p></div>
      <div class="s12" style="min-width:0"><h3 class="h3" style="margin-top:0">Synergies <span class="meta">${P.synIncl===true||P.synIncl==='true'?'intégrées au modèle':'non intégrées'}</span></h3>
        <div class="tw"><table class="tbl"><thead><tr><th>Levier</th><th>Zone</th><th class="n">EBITDA (k€/an)</th><th class="n">Dès l'année</th><th>Commentaire</th><th></th></tr></thead><tbody>
        ${d.syn.map((s,j)=>`<tr><td>${lin(`lbo.list.${i}.syn.${j}.lev`,'t')}</td><td>${lin(`lbo.list.${i}.syn.${j}.zone`,'t')}</td><td style="width:100px">${lin(`lbo.list.${i}.syn.${j}.k`,'n')}</td><td style="width:70px">${lin(`lbo.list.${i}.syn.${j}.y`,'n')}</td><td>${lin(`lbo.list.${i}.syn.${j}.note`,'t')}</td><td><button class="btn sm noprint" data-act="lbosyndel" data-id="${j}">✕</button></td></tr>`).join('')}
        </tbody></table></div><div class="row noprint" style="margin-top:6px"><button class="btn sm" data-act="lbosynadd">Ajouter une synergie</button></div>
        <p class="note">Montants à 0 tant qu'ils ne sont pas chiffrés : aucune synergie n'est supposée par défaut.</p></div></div>
      <h3 class="h3">Feuille de route sur ${H} ans</h3><div class="tl">${Array.from({length:H},(_,t)=>`<div class="tl-i"><span class="tl-d">Année ${t+1}</span><span class="tl-t" style="flex:1">${lin(`lbo.list.${i}.road.${t}`,'t',{ph:'Actions clés de l\'année'})}</span></div>`).join('')}</div></div>
  </div>`;
}
