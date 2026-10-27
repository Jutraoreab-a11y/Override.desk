/* ---- Étude de marché ---- */
function seasW(){const m=S.bp.mkt,raw=(m.seas||[]).map(v=>Math.max(0,+v||0)),t=sum(raw);return raw.length===12&&t>0?raw.map(v=>v/t):Array(12).fill(1/12);}
function tamScore(tam){return clamp((Math.log10(Math.max(tam,1)/1e9)+0.7)*3.5,0,10);}
function mkCalc(r){
  const b=S.bp,m=b.mkt,h=[...m.hist].map(x=>({y:+x.y,v:+x.v,q:+x.q})).filter(x=>isFinite(x.y)).sort((a,c)=>a.y-c.y),n=h.length,last=h[n-1]||{y:NaN,v:NaN,q:NaN},first=h[0]||last;
  const yoyV=h.map((x,i)=>i?(x.v/h[i-1].v-1)*100:NaN),yoyQ=h.map((x,i)=>i?(x.q/h[i-1].q-1)*100:NaN);
  const cagrV=n>1?((last.v/first.v)**(1/(n-1))-1)*100:NaN,cagrQ=n>1?((last.q/first.q)**(1/(n-1))-1)*100:NaN;
  const unitP=last.v*1e6/last.q,W=seasW();
  const proj=r.Y.map(y=>{const yr=(+b.startY||2027)+y.t-1,k=yr-last.y,v=last.v*1e6*(1+r.cagr/100)**k,q=last.q*(1+(isFinite(cagrQ)?cagrQ:r.cagr)/100)**k;return{yr,v,q,sv:y.rev/v*100,sq:y.clients/q*100};});
  const comp=b.comp,svT=sum(comp.map(c=>c.sv)),sqT=sum(comp.map(c=>c.sq)),leader=[...comp].sort((a,c)=>(+c.sv||0)-(+a.sv||0))[0];
  const pts=b.ptypes,top=[...pts].sort((a,c)=>(+c.sv||0)-(+a.sv||0))[0],regT=sum(m.regions.map(x=>x.sh));
  const vw=b.vw,opt=Math.sqrt((+vw.ch)*(+vw.ex));
  const T=b.tamis,sizeS=Math.round((tamScore(r.tam)+clamp(r.cagr/2,0,10))/2*10)/10;
  const filt=[['Liquidité',+T.liq,T.liqTxt],['Catalyseur',+T.cat,T.catTxt],['Concurrence',+T.conc,T.concTxt],['Taille de marché',sizeS,`TAM ${big(r.tam)}, CAGR ${pct(r.cagr)} (calcul automatique).`]];
  return{h,n,last,yoyV,yoyQ,cagrV,cagrQ,unitP,W,proj,svT,sqT,leader,top,regT,opt,filt,sizeS,passN:filt.filter(f=>f[1]>=S.sc.min).length};
}
function vwChart(vw,marks){
  const W=640,H=180,L=14,R=14,mx=(+vw.te)*1.25,X=v=>L+clamp(v/mx,0,1)*(W-L-R),y0=86,h=24,tx=x=>clamp(x,L+40,W-R-40);
  let s=`<svg class="sc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mapping du prix psychologique">`;
  const z=(a,b,f,lab)=>{s+=`<rect x="${X(a)}" y="${y0}" width="${Math.max(0,X(b)-X(a))}" height="${h}" fill="${f}"/>`;if(X(b)-X(a)>74)s+=`<text x="${(X(a)+X(b))/2}" y="${y0+h+16}" font-size="10.5" fill="#A1A1AA" text-anchor="middle">${lab}</text>`;};
  z(0,+vw.tc,'rgba(220,38,38,.30)','Qualité douteuse');z(+vw.tc,+vw.ch,'rgba(212,212,216,.12)','Bonne affaire');z(+vw.ch,+vw.ex,'rgba(16,185,129,.32)','Zone acceptable');z(+vw.ex,+vw.te,'rgba(217,119,6,.24)','Cher, envisageable');z(+vw.te,mx,'rgba(220,38,38,.30)','Trop cher');
  [+vw.tc,+vw.ch,+vw.ex,+vw.te].forEach(v=>{s+=`<line x1="${X(v)}" x2="${X(v)}" y1="${y0-3}" y2="${y0+h+3}" stroke="#71717A"/><text x="${X(v)}" y="${H-6}" font-size="10.5" fill="#71717A" text-anchor="middle">${nf(v,0)} €</text>`;});
  [...marks].sort((a,b)=>a.v-b.v).forEach((m,i)=>{const x=X(m.v),ty=16+(i%3)*20;s+=`<line x1="${x}" x2="${x}" y1="${ty+5}" y2="${y0+h}" stroke="${m.c}" stroke-width="${m.w||1.2}" ${m.dash?'stroke-dasharray="3 3"':''}/><text x="${tx(x)}" y="${ty}" font-size="11" text-anchor="middle" fill="${m.c}" font-weight="${m.w?600:400}">${esc(m.k)} ${nf(m.v,0)} €</text>`;});
  return s+'</svg>';
}
function hbars(items,o={}){
  const mx=Math.max(1,...items.map(x=>+x.v||0));
  return `<div class="hb">${items.map(x=>`<div class="hb-r"><span class="hb-l">${esc(x.l)}</span><span class="hb-t"><b style="width:${clamp((+x.v||0)/mx*100,0,100)}%"${x.hl?' class="hl"':''}></b></span><span class="hb-v num">${o.fmt?o.fmt(+x.v):nf(+x.v,0)}</span></div>`).join('')}</div>`;
}
function bpToSelector(){
  const b=S.bp,r=bpCalc(),k=r.mk,Hy=r.Y[r.H-1],sec=SECT[b.sector]?b.sector:'saas';
  const L=S.sc.list,ex=L.findIndex(c=>c.id==='bp-project');
  const c=co('bp-project',b.name||'Projet',sec,+b.tamis.liq,+b.tamis.cat,+b.tamis.conc,Math.round(k.sizeS),7,r.ratio>=3?8:5,Math.round((r.Y[1]?r.Y[1].rev/r.Y[0].rev-1:0)*100),+(b.raise/1e6).toFixed(2),+(b.clients1*b.arpu*12/1e6).toFixed(2),+(b.preMoney/1e6).toFixed(2),8,
    {ebm:Math.round(r.Y[0].em),fund:+b.raise>0?'Capital-risque':'Autofinancé',serial:0,tier:'À constituer',tgt:+(Hy.rev*8/1e6).toFixed(1),fromBP:1},
    [b.tamis.liqTxt,b.tamis.catTxt,(k.leader||{}).n||'',(k.leader||{}).z||b.tamis.concTxt,`TAM ${big(r.tam)}, CAGR ${pct(r.cagr)}`,b.posStmt||b.edge,b.revModel,b.teamTxt,b.summary,'À constituer (levée de '+big(+b.raise)+')']);
  if(ex>=0)L[ex]=c;else L.push(c);
  ui.sel='bp-project';ui.secTarget=sec;
}

const FQ=[['Liquidité',"Le marché est-il liquide ? Peut-on entrer et sortir du capital, ou revendre l'actif, sans décote massive ?"],['Catalyseur',"Le marché est-il porté par un catalyseur externe fort : réglementation, subvention, transition, rupture technologique, inflation sectorielle ?"],['Concurrence',"Qui est le leader, quelles sont ses forces, et surtout quelle faille exploitable laisse-t-il ?"],['Taille de marché',"Le marché total adressable est-il assez vaste, et quelle est sa dynamique de croissance historique et projetée ?"]];
/* ============ Volet 1 : Business plan ============ */
const ROWTPL={'bp.team':{n:'Nouveau membre',r:'',p:''},'bp.personas':{n:'Nouveau persona',who:'',spend:'',when:'',why:'',fears:'',where:''},'bp.offers':{n:'Nouvelle offre',p:0,seg:'',d:''},'bp.channels':{n:'Nouveau canal',sh:0,cac:0},'bp.comp':{n:'Nouveau concurrent',x:50,y:50,sv:0,sq:0,f:'',k:'',z:'',a:''},'bp.mkt.regions':{n:'Nouvelle région',sh:0},'bp.mkt.intl':{n:'Nouveau pays',v:0,ph:'',note:''},'bp.ptypes':{n:'Nouveau type d\'offre',sv:0,sq:0},'pf.positions':{tk:'AAPL',q:0,pru:0,d:'',qd:'',qeps:null,qepsP:null,qrev:null,qrevP:null}};
const kk=v=>isFinite(v)?nf(Math.round(v/1000),0):'—';
const isOv=ps=>ps.some(p=>JSON.stringify(getP(S,p))!==JSON.stringify(getP(DEF,p)));
function bpCalc(){
  const b=S.bp,s=SECT[b.sector]||SECT.saas,z=ZONE[b.zone]||ZONE.eu,H=Math.max(3,Math.min(5,+b.h||5));
  const tamAuto=s.tam*z.s,tam=b.tamOv>0?b.tamOv*1e6:tamAuto,cagr=b.cagrOv>0?b.cagrOv:s.cagr;
  const sam=tam*b.samPct/100,som=sam*b.somPct/100;
  const chS=b.channels.reduce((a,c)=>a+(+c.sh||0),0),cac=chS?b.channels.reduce((a,c)=>a+(+c.sh||0)*(+c.cac||0),0)/chS:0;
  const gm=b.gm/100,churn=b.churn/100,amortM=Math.max(1,b.amortY*12),princ=b.loanY>0?b.loan/(b.loanY*12):0;
  const c=[0,+b.clients1];for(let t=2;t<=H;t++)c[t]=c[t-1]*(1+(+b.g[t-2]||0)/100);
  const W=S.bp.mkt&&String(S.bp.mkt.seasApply)==='true'?seasW():Array(12).fill(1/12),FC=[0];W.forEach((w,i)=>FC.push(FC[i]+w));FC[12]=1;
  const M=[],Y=[],capexL=[];
  let cash=0,loanOut=0,rec=0,pay=0,capital=0,grantEq=0,retained=0,lossCF=0,capCum=0,daCum=0,prevBFR=0;
  for(let t=1;t<=H;t++){
    const y={t,clients:c[t],rev:0,cogs:0,mkt:0,pers:0,other:0,da:0,int:0,tax:0,capex:0,coll:0,paySup:0,inEq:0,inGrant:0,inDebt:0,repay:0,newC:0,ebt:0};
    for(let k=1;k<=12;k++){
      const m=(t-1)*12+k,c0=c[t-1]+(c[t]-c[t-1])*FC[k-1],c1=c[t-1]+(c[t]-c[t-1])*FC[k],avg=(c0+c1)/2;
      const rev=avg*b.arpu,cogs=rev*(1-gm),nw=Math.max(0,c1-c0+avg*churn),mkt=nw*cac;
      const pers=(+b.hc[t-1]||0)*b.salary/12,other=b.other1*(1+b.otherG/100)**(t-1)/12;
      let inEq=0,inGrant=0,inDebt=0;
      if(m===1){inEq+=+b.equity;inGrant=+b.grant;inDebt=+b.loan;loanOut+=+b.loan;}
      if(m===+b.raiseM)inEq+=+b.raise;
      capital+=inEq;grantEq+=inGrant;
      const capex=k===1?(+b.capex[t-1]||0):0;if(capex)capexL.push({m,a:capex});
      const da=capexL.reduce((a,x)=>a+(m>=x.m&&m<x.m+amortM?x.a/amortM:0),0);
      const intr=loanOut*b.rate/100/12,principal=m>b.defer?Math.min(loanOut,princ):0;
      const recE=rev*b.dso/30,payE=(cogs+other)*b.dpo/30,coll=rev-(recE-rec),paySup=cogs+other-(payE-pay);rec=recE;pay=payE;
      y.ebt+=rev-cogs-mkt-pers-other-da-intr;
      let tax=0;
      if(k===12){if(y.ebt<0)lossCF+=-y.ebt;else{const used=Math.min(lossCF,y.ebt);lossCF-=used;tax=(y.ebt-used)*b.tax/100;}}
      const inTot=coll+inEq+inGrant+inDebt,outTot=paySup+mkt+pers+capex+intr+tax+principal;
      cash+=inTot-outTot;loanOut-=principal;capCum+=capex;daCum+=da;
      M.push({m,t,k,rev,ebitda:rev-cogs-mkt-pers-other,coll,inEq,inFin:inGrant+inDebt,inTot,paySup,mkt,pers,capex,intr,tax,principal,outTot,flow:inTot-outTot,cash});
      Object.entries({rev,cogs,mkt,pers,other,da,int:intr,tax,capex,coll,paySup,inEq,inGrant,inDebt,repay:principal,newC:nw}).forEach(([q,v])=>y[q]+=v);
    }
    y.gp=y.rev-y.cogs;y.ebitda=y.gp-y.mkt-y.pers-y.other;y.ebit=y.ebitda-y.da;y.net=y.ebit-y.int-y.tax;retained+=y.net;
    y.caf=y.net+y.da;const bfr=rec-pay;y.dBFR=bfr-prevBFR;prevBFR=bfr;
    y.bal={fixed:capCum-daCum,rec,cash,capital,grant:grantEq,retained,debt:loanOut,pay,bfr};
    y.bal.assets=y.bal.fixed+rec+cash;y.bal.liab=capital+grantEq+retained+loanOut+pay;y.gap=y.bal.assets-y.bal.liab;
    y.R={caf:Math.max(0,y.caf),eq:y.inEq,grant:y.inGrant,debt:y.inDebt,bfr:Math.max(0,-y.dBFR)};
    y.E={caf:Math.max(0,-y.caf),capex:y.capex,bfr:Math.max(0,y.dBFR),repay:y.repay};
    y.Rt=Object.values(y.R).reduce((a,v)=>a+v,0);y.Et=Object.values(y.E).reduce((a,v)=>a+v,0);
    y.cash=cash;y.em=y.rev?y.ebitda/y.rev*100:NaN;y.hc=+b.hc[t-1]||0;
    Y.push(y);
  }
  let minI=0;M.forEach((x,i)=>{if(x.cash<M[minI].cash)minI=i;});
  const life=Math.min(churn>0?1/churn:60,60),mc=b.arpu*gm,ltv=mc*life;
  const out={s,z,H,tam,tamAuto,cagr,sam,som,cac,M,Y,min:M[minI],ltv,life,mc,ratio:cac?ltv/cac:NaN,payback:mc?cac/mc:NaN,
    somShare:Y[H-1].rev/som*100,be:Y.find(y=>y.ebitda>0),funding:+b.equity+ +b.grant+ +b.loan+ +b.raise};
  out.mk=mkCalc(out);return out;
}
function bpAlerts(r){
  const b=S.bp,A=[],add=(l,t)=>A.push({l,t}),Hy=r.Y[r.H-1];
  const mlab=x=>`mois ${x.k} de l'année ${x.t}`;
  if(r.ltv<r.cac)add('ko',`Modèle non viable en l'état : LTV de ${big(r.ltv)} inférieure au CAC de ${big(r.cac)}.`);
  else if(r.ratio<3)add('am',`LTV/CAC de ${nf(r.ratio,1)}× sous le seuil institutionnel de 3×.`);
  if(r.min.cash<0)add('ko',`⚠️ Risque de rupture de trésorerie : solde de ${big(r.min.cash)} au ${mlab(r.min)}. Financement manquant : ${big(-r.min.cash)}.`);
  if(r.Y[0].cash<0)add('ko',`Trésorerie négative en fin d'année 1 (${big(r.Y[0].cash)}) sans apport ni financement suffisant.`);
  if(Hy.rev>r.som)add('ko',`CA de l'année ${r.H} (${big(Hy.rev)}) supérieur au marché obtenable (SOM ${big(r.som)}).`);
  else if(r.somShare>50)add('am',`Le CA de l'année ${r.H} capte ${pct(r.somShare,0)} du SOM : part de marché agressive.`);
  b.g.slice(0,r.H-1).forEach((g,i)=>{if(g>300)add('am',`Croissance du parc de ${pct(g,0)} en année ${i+2} : à adosser à un pipeline signé.`);});
  if(b.gm>r.s.gm+15)add('am',`Marge brute de ${pct(b.gm,0)} supérieure de plus de 15 points à la référence sectorielle (${pct(r.s.gm,0)}).`);
  if(r.payback>24)add('am',`Remboursement du CAC en ${nf(r.payback,0)} mois, au-delà de 24 mois.`);
  if(!r.be)add('am',`EBITDA négatif sur tout l'horizon de ${r.H} ans.`);
  const maxP=Math.max(0,...b.offers.map(o=>+o.p||0));if(maxP&&b.arpu>maxP)add('am',`ARPU de ${big(b.arpu)} supérieur au prix de l'offre la plus chère (${big(maxP)}).`);
  if(r.Y.some(y=>Math.abs(y.gap)>1))add('ko','Bilan prévisionnel déséquilibré.');
  const k=r.mk,m=b.mkt;
  if(!(m.src||'').trim())add('am','Historique de marché sans source : citer l\'étude ou la base de données utilisée.');
  if(isFinite(k.cagrV)&&Math.abs(k.cagrV-r.cagr)>5)add('am',`CAGR historique du marché (${pct(k.cagrV)}) éloigné de plus de 5 points du CAGR retenu (${pct(r.cagr)}).`);
  if(isFinite(k.last.v)){const ratio=r.sam/(k.last.v*1e6);if(ratio<0.5||ratio>2)add('am',`SAM (${big(r.sam)}) incohérent avec la valeur du marché N-1 (${big(k.last.v*1e6)}) : écart supérieur à un facteur 2.`);}
  if(Math.abs(sum(m.seas)-100)>1)add('am',`La saisonnalité totalise ${pct(sum(m.seas),1)} au lieu de 100 % : valeurs normalisées dans le modèle.`);
  if(k.regT>100.5)add('ko',`Les parts régionales totalisent ${pct(k.regT,0)}, au-delà de 100 %.`);
  if(k.svT>100.5||k.sqT>100.5)add('ko',`Les parts de marché des concurrents dépassent 100 % (valeur ${pct(k.svT,0)}, volume ${pct(k.sqT,0)}).`);
  const lastP=k.proj[k.proj.length-1];if(lastP&&lastP.sv>25)add('am',`Part de marché visée en année ${r.H} de ${pct(lastP.sv,1)} en valeur : supérieure à 25 %, à démontrer.`);
  if(+b.arpu<+b.vw.ch||+b.arpu>+b.vw.ex)add('am',`ARPU de ${big(+b.arpu)} hors de la zone de prix acceptable (${nf(+b.vw.ch,0)} à ${nf(+b.vw.ex,0)} €).`);
  b.offers.forEach(o=>{if(+o.p>+b.vw.te)add('am',`Offre « ${esc(o.n)} » au-dessus du seuil de rejet pour prix trop élevé (${nf(+b.vw.te,0)} €).`);});
  if(Math.abs(+b.arpu-+b.priceRec)/(+b.priceRec||1)>.15)add('am',`ARPU du modèle (${big(+b.arpu)}) éloigné de plus de 15 % du prix recommandé (${big(+b.priceRec)}).`);
  if(isFinite(k.unitP)&&b.arpu*12>k.unitP*3)add('am',`Prix annuel (${big(b.arpu*12)}) plus de trois fois supérieur au prix moyen observé sur le marché (${big(k.unitP)} par unité et par an).`);
  k.filt.forEach(f=>{if(f[1]<S.sc.min)add('am',`Le projet ne passe pas le filtre « ${f[0]} » (${nf(f[1],1)}/10, seuil ${S.sc.min}).`);});
  const SF=DAMO[b.sector]||DAMO.saas,PO=b.porter.length?sum(b.porter.map(f=>+f.s||0))/b.porter.length:NaN;
  if(PO>=4)add('am',`Intensité concurrentielle forte (5 forces de Porter : ${nf(PO,1)}/5).`);
  if(Hy.em>SF.ebm+20)add('am',`Marge EBITDA de l'année ${r.H} (${pct(Hy.em,0)}) supérieure de plus de 20 points à la moyenne du secteur (${pct(SF.ebm,0)}).`);
  if(+b.preMoney>2*SF.evs*b.clients1*b.arpu*12)add('am',`Pre-money visé (${big(+b.preMoney)}) supérieur à 2 fois la valeur implicite au multiple VE/CA du secteur (${big(SF.evs*b.clients1*b.arpu*12)}).`);

  REG.forEach(([lab,,k,ps])=>{const j=(b.just[k]||'').trim();
    if(!j)add('ko',`Hypothèse « ${lab} » sans justification.`);
    else if(isOv(ps)&&j===DEF.bp.just[k])add('am',`Hypothèse « ${lab} » forcée sans mise à jour de sa justification.`);});
  return A;
}
const REG=[
  ['ARPU mensuel',()=>`${fld('bp.arpu')}<em class="u">€</em>`,'arpu',['bp.arpu']],
  ['Clients fin d\'année 1',()=>fld('bp.clients1'),'clients1',['bp.clients1']],
  ['Croissance du parc clients',H=>S.bp.g.slice(0,H-1).map((_,i)=>`<span class="mini"><em class="u">A${i+2}</em>${fld('bp.g.'+i)}<em class="u">%</em></span>`).join(''),'g',['bp.g']],
  ['Churn mensuel',()=>`${fld('bp.churn')}<em class="u">%</em>`,'churn',['bp.churn']],
  ['Marge brute',()=>`${fld('bp.gm')}<em class="u">%</em>`,'gm',['bp.gm']],
  ['CAC moyen pondéré',(H,r)=>`<span class="v num">${big(r.cac)}</span><em class="u">calculé en section 7</em>`,'cac',['bp.channels']],
  ['Effectifs et salaire chargé',H=>S.bp.hc.slice(0,H).map((_,i)=>`<span class="mini"><em class="u">A${i+1}</em>${fld('bp.hc.'+i)}</span>`).join('')+`<span class="mini">${fld('bp.salary')}<em class="u">€/ETP</em></span>`,'hc',['bp.hc','bp.salary']],
  ['Délais clients et fournisseurs',()=>`<span class="mini">${fld('bp.dso')}<em class="u">j clients</em></span><span class="mini">${fld('bp.dpo')}<em class="u">j fourn.</em></span>`,'bfr',['bp.dso','bp.dpo']]
];
function etable(list,cols){
  const arr=getP(S,list)||[],E=ui.edit;
  return `<div class="tw"><table class="tbl"><thead><tr>${cols.map(c=>`<th class="${c[2]==='n'?'n':''}">${c[1]}</th>`).join('')}${E?'<th></th>':''}</tr></thead><tbody>${arr.map((_,i)=>`<tr>${cols.map(c=>`<td class="${c[2]==='n'?'n':''}"${c[3]?` style="${c[3]}"`:''}>${fld(`${list}.${i}.${c[0]}`,c[2]||'t',{rows:2,al:c[1]})}</td>`).join('')}${E?`<td><button class="btn sm ghost" data-act="delrow" data-list="${list}" data-i="${i}" aria-label="Supprimer la ligne">✕</button></td>`:''}</tr>`).join('')}</tbody></table></div>${E?`<button class="btn sm" data-act="addrow" data-list="${list}" style="margin-top:8px">Ajouter une ligne</button>`:''}`;
}
function ftable(head,rows){
  return `<div class="tw"><table class="tbl fin"><thead><tr><th>k€</th>${head.map(h=>`<th class="n">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>r[0]==='§'?`<tr class="sec"><td colspan="${head.length+1}">${r[1]}</td></tr>`:`<tr class="${r[2]||''}"><td>${r[0]}</td>${r[1].map(v=>`<td class="n${r[3]&&v<-0.5?' down':''}">${typeof v==='string'?v:kk(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function cashChart(M){
  const W=560,H=160,L=48,R=8,T=12,B=22,iw=W-L-R,ih=H-T-B,v=M.map(x=>x.cash),mx=Math.max(0,...v),mn=Math.min(0,...v);
  const X=i=>L+i*iw/(M.length-1),Y=x=>T+(mx-x)/((mx-mn)||1)*ih;
  let s=`<svg class="sc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trésorerie mensuelle">`;
  [mx,mn].forEach(x=>{s+=`<text x="${L-5}" y="${Y(x)+3}" class="ax" text-anchor="end">${big(x,'')}</text>`;});
  for(let i=0;i<M.length;i+=12)s+=`<line x1="${X(i)}" x2="${X(i)}" y1="${T}" y2="${T+ih}" class="mid"/><text x="${X(i)+3}" y="${H-6}" class="ax">A${i/12+1}</text>`;
  s+=`<line x1="${L}" x2="${W-R}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line2)"/>`;
  s+=`<polyline points="${M.map((x,i)=>`${X(i)},${Y(x.cash)}`).join(' ')}" fill="none" stroke="#D4D4D8" stroke-width="1.5"/>`;
  const neg=M.map((x,i)=>x.cash<0?i:-1).filter(i=>i>=0);
  neg.forEach(i=>{s+=`<circle cx="${X(i)}" cy="${Y(M[i].cash)}" r="2.4" fill="var(--down)"/>`;});
  let mi=0;M.forEach((x,i)=>{if(x.cash<M[mi].cash)mi=i;});
  s+=`<circle cx="${X(mi)}" cy="${Y(M[mi].cash)}" r="4" fill="none" stroke="${M[mi].cash<0?'var(--down)':'#A1A1AA'}" stroke-width="2"/><text x="${Math.min(X(mi)+6,W-90)}" y="${Y(M[mi].cash)-7}" class="ax">point bas ${big(M[mi].cash,'')}</text>`;
  return s+'</svg>';
}
function renderBP(){
  const b=S.bp,r=bpCalc(),E=ui.edit,H=r.H,Yr=r.Y,AL=bpAlerts(r);
  const ko=AL.filter(a=>a.l==='ko'),st=ko.length?['ko','Modèle non viable en l\'état']:AL.length?['am','Modèle cohérent sous réserves']:['ok','Modèle cohérent'];
  const head=Yr.map(y=>'A'+y.t),sectOpts=Object.fromEntries(Object.entries(SECT).map(([k,v])=>[k,v.l])),zoneOpts=Object.fromEntries(Object.entries(ZONE).map(([k,v])=>[k,v.l]));
  const Hy=Yr[H-1],ty=Math.min(H,Math.max(1,+ui.ty||1)),MY=r.M.filter(x=>x.t===ty);
  const sec=(n,t,body)=>`<section class="bps" id="bp-s${n}"><div class="bph"><span class="bpn">${String(n).padStart(2,'0')}</span><h2>${t}</h2></div><div class="grid">${body}</div></section>`;
  const T=(label,p,rows=3)=>`<div class="fld"><span class="lb">${label}</span>${fld(p,'a',{rows,al:label})}</div>`;
  const verdict=`<div class="verdict ${st[0]}"><div class="vh">${st[1]}</div>${AL.length?`<ul class="diag">${AL.map(a=>`<li><span class="tag ${a.l}">${a.l==='ko'?'Bloquant':'Réserve'}</span> ${a.t}</li>`).join('')}</ul>`:'<p class="note" style="margin:6px 0 0">Aucune incohérence détectée sur les hypothèses saisies.</p>'}</div>`;
  const sumTxt=`${esc(b.name)} vise ${big(Hy.rev)} de chiffre d'affaires en année ${H}, soit ${pct(r.somShare,1)} du marché obtenable. ${r.be?`L'EBITDA devient positif en année ${r.be.t}.`:`L'EBITDA reste négatif sur ${H} ans.`} Le plan mobilise ${big(r.funding)} de financements (apports ${big(+b.equity)}, levée ${big(+b.raise)} au mois ${b.raiseM}, emprunt ${big(+b.loan)}, aides ${big(+b.grant)}). Point bas de trésorerie : ${big(r.min.cash)} au mois ${r.min.k} de l'année ${r.min.t}.`;
  const regRows=REG.map(([lab,val,k,ps])=>{const j=(b.just[k]||'').trim(),ov=isOv(ps),stt=!j?['ko','Non justifiée']:ov&&j===DEF.bp.just[k]?['am','À mettre à jour']:['ok','Justifiée'];
    return `<tr><td>${lab}${ov?' <span class="tag am">forcé</span>':''}</td><td><span class="fv" style="flex-wrap:wrap">${val(H,r)}</span></td><td style="min-width:240px">${fld('bp.just.'+k,'a',{rows:2,al:'Justification '+lab})}</td><td><span class="tag ${stt[0]}">${stt[1]}</span></td></tr>`;}).join('');
  const yrsFld=(p,n,u)=>[...Array(n)].map((_,i)=>`<span class="mini"><em class="u">A${i+1}</em>${fld(`${p}.${i}`)}${u?`<em class="u">${u}</em>`:''}</span>`).join('');
  const advice=[];
  if(r.min.cash<0)advice.push(`Sécuriser au moins ${big(-r.min.cash*1.2)} supplémentaires (marge de 20 %) avant le mois ${r.min.k} de l'année ${r.min.t}, ou décaler les recrutements.`);
  advice.push(`Signer la levée au plus tard au mois ${Math.max(1,b.raiseM-3)} : trois mois de marge avant l'encaissement prévu au mois ${b.raiseM}.`);
  const best=[...b.channels].sort((x,y)=>(+x.cac||1e12)-(+y.cac||1e12))[0];if(best)advice.push(`Le canal le moins coûteux est « ${esc(best.n)} » (${big(+best.cac)} par client) : augmenter sa part abaisse directement le CAC pondéré.`);
  if(b.dso>45)advice.push(`Le BFR immobilise ${big(Yr[0].bal.bfr)} fin d'année 1 : la facturation annuelle d'avance réduirait les délais clients de ${b.dso} jours.`);
  if(r.be)advice.push(`Point mort EBITDA en année ${r.be.t} : piloter le ratio charges de personnel / CA (${pct(Yr[0].pers/Yr[0].rev*100,0)} en A1, ${pct(Hy.pers/Hy.rev*100,0)} en A${H}).`);
  advice.push('Comparer chaque mois le réalisé au prévisionnel sur trois indicateurs : nouveaux clients, churn et CAC.');
  const funnelW=[100,Math.max(2,r.sam/r.tam*100),Math.max(1,r.som/r.tam*100)];
  const compPts=b.comp.map(c=>({x:+c.x,y:+c.y,label:c.n})).concat([{x:+b.px,y:+b.py,label:b.name||'Projet',cls:'me',r:7}]);
  const k=r.mk,m=b.mkt;
  const SF=DAMO[b.sector]||DAMO.saas,PO=b.porter.length?sum(b.porter.map(f=>+f.s||0))/b.porter.length:NaN,FR=y=>(y.bal.capital+y.bal.grant+y.bal.retained+y.bal.debt-y.bal.fixed)/y.rev*365;
  $('#p-bp').innerHTML=`
  <div class="ph"><div><h1>${esc(b.name)||'Projet sans nom'}</h1><p>Business plan ${esc(r.s.l)}, ${esc(r.z.l)}, horizon ${H} ans.</p></div></div>
  ${sec(1,'Executive summary et nature de l\'offre',`
    <div class="card s12">${verdict}</div>
    <div class="card s12"><h2>Nature de l'offre : ce que l'on vend</h2>${fld('bp.whatSell','a',{rows:3,al:"Ce que l'on vend"})}</div>
    <div class="card s4"><h2>Projet</h2><div class="fields one">${F('Nom du projet','bp.name','t')}${F('Secteur','bp.sector','s',{opts:sectOpts})}${F('Zone géographique','bp.zone','s',{opts:zoneOpts})}${F('Horizon du prévisionnel','bp.h','s',{opts:{'3':'3 ans','4':'4 ans','5':'5 ans'}})}</div></div>
    <div class="card s8"><div class="stats">
      <div class="stat"><div class="k">CA année ${H}</div><div class="x">${big(Hy.rev)}</div><div class="d">${pct(r.somShare,1)} du SOM</div></div>
      <div class="stat"><div class="k">EBITDA année ${H}</div><div class="x ${cls(Hy.ebitda)}">${big(Hy.ebitda)}</div><div class="d">Marge ${pct(Hy.em,0)}</div></div>
      <div class="stat"><div class="k">Point mort EBITDA</div><div class="x ${r.be?'up':'down'}">${r.be?'Année '+r.be.t:'Non atteint'}</div><div class="d">sur ${H} ans</div></div>
      <div class="stat"><div class="k">Financements mobilisés</div><div class="x">${big(r.funding)}</div><div class="d">dont levée ${big(+b.raise)}</div></div>
      <div class="stat"><div class="k">Point bas de trésorerie</div><div class="x ${cls(r.min.cash)}">${big(r.min.cash)}</div><div class="d">mois ${r.min.k}, année ${r.min.t}</div></div>
      <div class="stat"><div class="k">LTV / CAC</div><div class="x ${r.ratio>=3?'up':'down'}">${nf(r.ratio,1)}×</div><div class="d">remboursement ${nf(r.payback,1)} mois</div></div>
    </div>
    <p class="lead">${sumTxt}</p>
    ${T('Synthèse du projet et de l\'enjeu','bp.summary',4)}
    <div style="margin-top:10px">${T('Avantage injuste (edge)','bp.edge',3)}</div></div>`)}
  ${sec(2,'Le porteur de projet et son équipe',`
    <div class="card s8"><h2>Équipe fondatrice et clés</h2>${etable('bp.team',[['n','Nom','t','width:140px'],['r','Rôle','t','width:150px'],['p','Parcours et track-record','a']])}</div>
    <div class="card s4"><h2>Complémentarité et résilience</h2>${fld('bp.teamTxt','a',{rows:6})}<p class="note">Effectif prévu : ${Yr.map(y=>`A${y.t} ${y.hc} ETP`).join(', ')}.</p></div>`)}
  ${sec(3,'Étude de marché et analyse granulaire',`
    <div class="card s12"><h2><span>Historique du marché sur 5 ans <span class="meta">${esc(m.label)}</span></span>${srcTag(m.src)}</h2>
      <div class="stats">
        <div class="stat"><div class="k">Valeur du marché ${k.last.y}</div><div class="x">${nf(k.last.v,0)} M€</div><div class="d ${cls(k.yoyV[k.n-1])}">${sgn(k.yoyV[k.n-1])} sur un an</div></div>
        <div class="stat"><div class="k">Volume ${k.last.y}</div><div class="x">${nf(k.last.q,0)}</div><div class="d">${esc(m.unitQ)}, ${sgn(k.yoyQ[k.n-1])}</div></div>
        <div class="stat"><div class="k">CAGR valeur ${k.h[0]?k.h[0].y:''}-${k.last.y}</div><div class="x">${pct(k.cagrV)}</div><div class="d">retenu dans le modèle : ${pct(r.cagr)}</div></div>
        <div class="stat"><div class="k">CAGR volume</div><div class="x">${pct(k.cagrQ)}</div><div class="d">effet prix : ${sgn(((1+k.cagrV/100)/(1+k.cagrQ/100)-1)*100)}/an</div></div>
        <div class="stat"><div class="k">Prix moyen par unité et par an</div><div class="x">${big(k.unitP)}</div><div class="d">notre prix annuel : ${big(b.arpu*12)}</div></div>
      </div>
      <div class="grid" style="margin-top:4px">
        <div class="s6" style="min-width:0"><div class="tw"><table class="tbl"><thead><tr><th></th>${k.h.map((x,i)=>`<th class="n">${E?fld(`bp.mkt.hist.${i}.y`,'n',{al:'Année'}):x.y}</th>`).join('')}</tr></thead><tbody>
          <tr><td>Valeur (M€)</td>${m.hist.map((x,i)=>`<td class="n">${fld(`bp.mkt.hist.${i}.v`,'n',{al:'Valeur '+x.y})}</td>`).join('')}</tr>
          <tr><td>Croissance valeur</td>${k.yoyV.map(v=>`<td class="n ${isFinite(v)?cls(v):''}">${isFinite(v)?sgn(v):'—'}</td>`).join('')}</tr>
          <tr><td>Volume (${esc(m.unitQ)})</td>${m.hist.map((x,i)=>`<td class="n">${fld(`bp.mkt.hist.${i}.q`,'n',{al:'Volume '+x.y})}</td>`).join('')}</tr>
          <tr><td>Croissance volume</td>${k.yoyQ.map(v=>`<td class="n ${isFinite(v)?cls(v):''}">${isFinite(v)?sgn(v):'—'}</td>`).join('')}</tr>
          <tr><td>Prix moyen par unité</td>${k.h.map(x=>`<td class="n">${big(x.v*1e6/x.q)}</td>`).join('')}</tr>
        </tbody></table></div>
        <div class="fields" style="margin-top:12px">${E?F('Libellé du marché','bp.mkt.label','t')+F('Unité de volume','bp.mkt.unitQ','t'):''}${F('Source de l\'historique','bp.mkt.src','t',{ph:'Étude, base de données, date de consultation'})}</div></div>
        <div class="s6" style="min-width:0">${colChart(k.h.map(x=>String(x.y)),k.h.map(x=>x.v),{h:200,fmt:v=>nf(v,0),title:'Valeur et volume du marché',vlab:v=>nf(v,0),line:{vals:k.h.map(x=>x.q),fmt:v=>nf(v,0)}})}
          <div class="legend"><span><i style="background:var(--c-bar)"></i>Valeur (M€)</span><span><i style="background:var(--hi)"></i>Volume (${esc(m.unitQ)})</span></div></div>
      </div></div>
    <div class="card s7"><h2><span>Saisonnalité mensuelle <span class="meta">exercice ${k.last.y}</span></span>${srcTag(m.srcSeas)}</h2>
      ${colChart(MONTHS,k.W.map(w=>w*100),{h:170,fmt:v=>nf(v,0)+' %',title:'Saisonnalité du chiffre d\'affaires',vlab:v=>nf(v,1),colors:k.W.map(w=>w===Math.max(...k.W)?'var(--hi)':w===Math.min(...k.W)?'var(--down)':'var(--c-bar)')})}
      <div class="tw" style="margin-top:6px"><table class="tbl fin"><thead><tr><th></th>${MONTHS.map(x=>`<th class="n">${x}</th>`).join('')}<th class="n">Total</th></tr></thead><tbody>
        <tr><td>% du CA annuel</td>${m.seas.map((v,i)=>`<td class="n">${fld('bp.mkt.seas.'+i,'n',{al:'Saisonnalité '+MONTHS[i]})}</td>`).join('')}<td class="n">${pct(sum(m.seas),1)}</td></tr>
        <tr><td>Valeur (M€)</td>${k.W.map(w=>`<td class="n">${nf(k.last.v*w,1)}</td>`).join('')}<td class="n">${nf(k.last.v,0)}</td></tr>
        <tr><td>Volume</td>${k.W.map(w=>`<td class="n">${nf(k.last.q*w,0)}</td>`).join('')}<td class="n">${nf(k.last.q,0)}</td></tr>
      </tbody></table></div>
      <div class="fields" style="margin-top:10px">${F('Appliquer au rythme de signature','bp.mkt.seasApply','s',{opts:{'true':'Oui','false':'Non'}})}${F('Source de la saisonnalité','bp.mkt.srcSeas','t',{ph:'Source'})}</div>
      <p class="note">Pic en ${MONTHS[k.W.indexOf(Math.max(...k.W))].toLowerCase()} (${pct(Math.max(...k.W)*100,1)}), creux en ${MONTHS[k.W.indexOf(Math.min(...k.W))].toLowerCase()} (${pct(Math.min(...k.W)*100,1)}). ${String(m.seasApply)==='true'?'Le modèle répartit les nouvelles signatures selon ce profil.':'Le modèle répartit les signatures uniformément sur l\'année.'}</p></div>
    <div class="card s5"><h2><span>Concentration géographique</span>${srcTag(m.srcGeo)}</h2>
      ${E?etable('bp.mkt.regions',[['n','Région','t'],['sh','Part du marché (%)','n','width:120px']]):hbars([...m.regions].sort((a,c)=>c.sh-a.sh).map((x,i)=>({l:x.n,v:x.sh,hl:i<3})),{fmt:v=>pct(v,0)})}
      <p class="note">Les ${m.regions.length} premières régions concentrent ${pct(k.regT,0)} du marché national ; les trois premières ${pct(sum([...m.regions].sort((a,c)=>c.sh-a.sh).slice(0,3).map(x=>x.sh)),0)}.</p>
      <div class="fields" style="margin-top:8px">${F('Nombre de clients cibles (pays)','bp.mkt.targets','nn',{empty:'à renseigner',al:'Nombre de clients cibles'})}</div>
      ${isFinite(+m.targets)&&m.targets?`<div class="tw"><table class="tbl"><thead><tr><th>Région</th><th class="n">Part</th><th class="n">Clients cibles</th></tr></thead><tbody>${[...m.regions].sort((a,c)=>c.sh-a.sh).map(x=>`<tr><td>${esc(x.n)}</td><td class="n">${pct(+x.sh,0)}</td><td class="n">${nf(m.targets*x.sh/100,0)}</td></tr>`).join('')}<tr class="tot"><td>Autres régions</td><td class="n">${pct(100-k.regT,0)}</td><td class="n">${nf(m.targets*(100-k.regT)/100,0)}</td></tr></tbody></table></div>`:'<p class="note">Renseignez le nombre de clients cibles (avec sa source) pour obtenir leur répartition par région.</p>'}

      <h2>Extension Europe et international</h2>
      ${etable('bp.mkt.intl',[['n','Pays','t'],['v','Marché (M€)','n','width:90px'],['ph','Phase','t','width:110px'],['note','Commentaire','t']])}
      <div class="fields" style="margin-top:10px">${F('Source géographique','bp.mkt.srcGeo','t',{ph:'Source'})}</div></div>
    <div class="card s12"><h2><span>Repères financiers du secteur <span class="meta">${esc(SF.ind)}, ${SF.firms} sociétés cotées</span></span><span class="tag ok">Sourcé</span></h2>
      <div class="tw"><table class="tbl"><thead><tr><th>Indicateur</th><th class="n">Moyenne du secteur</th><th class="n">Projet A1</th><th class="n">Projet A${H}</th><th>Lecture</th></tr></thead><tbody>
        <tr><td>BFR moyen</td><td class="n">${pct(SF.wc,1)} du CA (${nf(SF.wc/100*365,0)} j)</td><td class="n">${nf(Yr[0].bal.bfr/Yr[0].rev*365,0)} j</td><td class="n">${nf(Hy.bal.bfr/Hy.rev*365,0)} j</td><td class="meta">${Hy.bal.bfr/Hy.rev*365>SF.wc/100*365*1.5?'BFR plus lourd que le secteur':'cohérent avec le secteur'}</td></tr>
        <tr><td>FRNG moyen</td><td class="n">${fld('bp.frng','nn',{empty:'non publié',al:'FRNG moyen du secteur (jours de CA)'})}${b.frng!==null&&b.frng!==''&&b.frng!==undefined?' j':''}</td><td class="n">${nf(FR(Yr[0]),0)} j</td><td class="n">${nf(FR(Hy),0)} j</td><td class="meta">FRNG du projet : capitaux permanents moins immobilisations</td></tr>
        <tr><td>Taux d'EBITDA moyen</td><td class="n">${pct(SF.ebm,1)}</td><td class="n">${pct(Yr[0].em,1)}</td><td class="n">${pct(Hy.em,1)}</td><td class="meta">${Hy.em>SF.ebm+20?'au-dessus de la moyenne : à justifier':'dans la norme ou en deçà'}</td></tr>
        <tr><td>Marge opérationnelle</td><td class="n">${pct(SF.opm,1)}</td><td class="n">${pct(Yr[0].ebit/Yr[0].rev*100,1)}</td><td class="n">${pct(Hy.ebit/Hy.rev*100,1)}</td><td></td></tr>
        <tr><td>Marge nette moyenne</td><td class="n">${pct(SF.nm,1)}</td><td class="n">${pct(Yr[0].net/Yr[0].rev*100,1)}</td><td class="n">${pct(Hy.net/Hy.rev*100,1)}</td><td></td></tr>
        <tr><td>PER (sociétés bénéficiaires)</td><td class="n">${nf(SF.pe,1)}×</td><td class="n" colspan="2">PER prévisionnel du secteur : ${nf(SF.fpe,1)}×</td><td></td></tr>
        <tr><td>VE / CA</td><td class="n">${nf(SF.evs,2)}×</td><td class="n" colspan="2">valeur implicite sur l'ARR fin A1 : ${big(SF.evs*b.clients1*b.arpu*12)}</td><td class="meta">pre-money visé : ${big(+b.preMoney)}${+b.preMoney>2*SF.evs*b.clients1*b.arpu*12?', plus de 2 fois la valeur implicite':''}</td></tr>
        <tr><td>VE / EBITDA</td><td class="n">${nf(SF.eve,1)}×</td><td class="n" colspan="2">sociétés à EBITDA positif : ${nf(SF.eveP,1)}×</td><td></td></tr>
      </tbody></table></div>
      <p class="note">Source : Aswath Damodaran (NYU Stern), données de janvier 2026 sur les sociétés cotées américaines (marges, PER, multiples de valeur, BFR). Taux d'EBITDA dérivé : VE/CA divisé par VE/EBITDA. Le FRNG moyen n'est pas publié par cette source. ${SF.note||''}</p></div>
    <div class="card s12"><h2>Segmentation et demande</h2><div class="grid"><div class="s6">${fld('bp.segments','a',{rows:4})}</div><div class="s6">${fld('bp.demand','a',{rows:4})}</div></div></div>`)}
  ${sec(4,'Marketing, offre et prix',`
    <div class="card s12"><h2>Mix marketing : les 4P</h2><div class="four4">
      <div><h3>Produit</h3>${fld('bp.p4.prod','a',{rows:4,al:'Produit'})}<p class="note">${b.offers.length} offres : ${b.offers.map(o=>esc(o.n)).join(', ')}.</p></div>
      <div><h3>Prix</h3>${fld('bp.p4.prix','a',{rows:4,al:'Prix'})}<p class="note">Prix recommandé ${big(+b.priceRec)} ; ARPU ${big(+b.arpu)} ; zone acceptable ${nf(+b.vw.ch,0)} à ${nf(+b.vw.ex,0)} €.</p></div>
      <div><h3>Distribution</h3>${fld('bp.p4.place','a',{rows:4,al:'Distribution'})}<p class="note">Canaux du modèle : ${b.channels.map(c=>esc(c.n)+' '+pct(+c.sh,0)).join(', ')}.</p></div>
      <div><h3>Communication</h3>${fld('bp.p4.promo','a',{rows:4,al:'Communication'})}<p class="note">Budget d'acquisition A1 : ${big(Yr[0].mkt)}.</p></div>
    </div></div>
    <div class="card s5"><h2>Proposition de valeur</h2>${fld('bp.valueProp','a',{rows:4})}
      <h2><span>Ce que le marché achète aujourd'hui</span>${srcTag(b.srcPt)}</h2>
      ${E?etable('bp.ptypes',[['n','Type d\'offre','t'],['sv','% du CA','n','width:80px'],['sq','% du volume','n','width:90px']]):`<div class="tw"><table class="tbl"><thead><tr><th>Type d'offre</th><th class="n">% du CA</th><th class="n">% du volume</th></tr></thead><tbody>${b.ptypes.map(x=>`<tr class="${x===k.top?'hl':''}"><td>${esc(x.n)}</td><td class="n">${pct(+x.sv,0)}</td><td class="n">${pct(+x.sq,0)}</td></tr>`).join('')}</tbody></table></div>`}
      <p class="note">Offre la plus achetée : ${esc((k.top||{}).n)}, ${pct(+(k.top||{}).sv,0)} du CA et ${pct(+(k.top||{}).sq,0)} du volume du marché.</p>
      <div class="fields">${F('Source','bp.srcPt','t',{ph:'Source'})}</div></div>
    <div class="card s7"><h2><span>Mapping du prix psychologique <span class="meta">prix mensuel, méthode Van Westendorp</span></span>${srcTag(b.srcVw)}</h2>
      ${vwChart(b.vw,[...b.offers.map(o=>({k:o.n,v:+o.p,c:'#A1A1AA'})),{k:'ARPU',v:+b.arpu,c:'#FAFAFA',w:2},{k:'Optimal',v:k.opt,c:'#10B981',dash:1}])}
      <div class="stats" style="margin-top:8px">
        <div class="stat"><div class="k">Zone acceptable</div><div class="x">${nf(+b.vw.ch,0)} à ${nf(+b.vw.ex,0)} €</div><div class="d">entre « bon marché » et « cher »</div></div>
        <div class="stat"><div class="k">Point de prix optimal</div><div class="x">${big(k.opt)}</div><div class="d">moyenne géométrique de la zone</div></div>
        <div class="stat"><div class="k">Prix recommandé</div><div class="x">${fld('bp.priceRec')}</div><div class="d">par mois et par site</div></div>
        <div class="stat"><div class="k">ARPU du modèle</div><div class="x ${+b.arpu<+b.vw.ch||+b.arpu>+b.vw.ex?'down':''}">${big(+b.arpu)}</div><div class="d">${+b.arpu<+b.vw.ch||+b.arpu>+b.vw.ex?'hors zone acceptable':'dans la zone acceptable'}</div></div>
      </div>
      ${E?`<div class="fields" style="margin-top:10px">${F('Trop bon marché','bp.vw.tc','n',{u:'€'})}${F('Bon marché','bp.vw.ch','n',{u:'€'})}${F('Cher','bp.vw.ex','n',{u:'€'})}${F('Trop cher','bp.vw.te','n',{u:'€'})}${F('Source de l\'enquête','bp.srcVw','t')}</div>`:''}
      <p class="note">Seuils issus de l'enquête de prix (médiane des réponses). En dessous de ${nf(+b.vw.tc,0)} €, l'offre est jugée de qualité insuffisante ; au-dessus de ${nf(+b.vw.te,0)} €, elle est rejetée pour son prix.</p></div>
    <div class="card s12"><h2>Grille tarifaire par segment</h2>
      ${E?etable('bp.offers',[['n','Offre','t','width:130px'],['seg','Segment visé','t'],['p','Prix mensuel (€)','n','width:120px'],['d','Contenu','t']]):`<div class="tw"><table class="tbl"><thead><tr><th>Offre</th><th>Segment visé</th><th class="n">Prix mensuel</th><th>Position psychologique</th><th>Contenu</th></tr></thead><tbody>${b.offers.map(o=>{const p=+o.p,z=p<+b.vw.tc?['ko','Qualité douteuse']:p<+b.vw.ch?['am','Bonne affaire']:p<=+b.vw.ex?['ok','Acceptable']:p<=+b.vw.te?['am','Cher, envisageable']:['ko','Trop cher'];return`<tr><td><b>${esc(o.n)}</b></td><td>${esc(o.seg)}</td><td class="n">${nf(p,0)} €</td><td><span class="tag ${z[0]}">${z[1]}</span></td><td>${esc(o.d)}</td></tr>`;}).join('')}</tbody></table></div>`}</div>`)}
  ${sec(5,'Psychologie client et comportement d\'achat',`
    <div class="card s12"><h2>Psychologie client et personas <span class="meta">qui, où, quand, pourquoi, freins, contact</span></h2>
      <div class="personas">${b.personas.map((p,i)=>`<div class="persona"><h3><span>${fld(`bp.personas.${i}.n`,'t',{al:'Persona'})}</span>${E?`<button class="btn sm ghost" data-act="delrow" data-list="bp.personas" data-i="${i}" aria-label="Supprimer le persona">✕</button>`:''}</h3>${[['who','Qui sont-ils'],['spend','Où allait leur budget jusqu\'ici'],['when','Quand achètent-ils'],['why','Pourquoi ils achètent'],['fears','Freins et objections'],['where','Où les trouver, comment les contacter']].map(([f,l])=>`<div class="pq"><span class="lb">${l}</span>${fld(`bp.personas.${i}.${f}`,'a',{rows:2,al:l})}</div>`).join('')}</div>`).join('')}</div>
      ${E?`<button class="btn sm" data-act="addrow" data-list="bp.personas" style="margin-top:8px">Ajouter un persona</button>`:''}</div>
    <div class="card s12"><h2>Cartographie des canaux de contact</h2><div class="four4">
      <div><h3>Inbound</h3>${fld('bp.touch.in','a',{rows:3,al:'Inbound'})}</div>
      <div><h3>Outbound</h3>${fld('bp.touch.out','a',{rows:3,al:'Outbound'})}</div>
      <div><h3>Digital</h3>${fld('bp.touch.dig','a',{rows:3,al:'Digital'})}</div>
      <div><h3>Salons et événements</h3>${fld('bp.touch.sal','a',{rows:3,al:'Salons'})}</div>
    </div></div>`)}
  ${sec(6,'Concurrence et environnement stratégique',`
    <div class="card s12"><h2><span>Cartographie intégrale des concurrents</span><span class="meta">parts attribuées : ${pct(k.svT,0)} en valeur, ${pct(k.sqT,0)} en volume</span></h2>
      <div class="verdict ok" style="margin-bottom:12px"><div class="vh" style="margin-bottom:4px">Leader : ${esc((k.leader||{}).n||'—')} <span class="meta">${pct(+(k.leader||{}).sv,0)} du CA, ${pct(+(k.leader||{}).sq,0)} du volume</span></div>${fld('bp.leadWhy','a',{rows:2,al:'Raisons de la domination du leader'})}</div>
      ${etable('bp.comp',[['n','Acteur','t','width:130px'],['sv','PdM valeur (%)','n','width:90px'],['sq','PdM volume (%)','n','width:90px'],['f','Forces','a'],['k','Faiblesses','a'],['z','Zones d\'ombre','a'],['a','Plan d\'attaque','a'],['x','Prix','n','width:56px'],['y','Diff.','n','width:56px']])}</div>
    <div class="card s5"><h2>Énoncé de positionnement</h2>${fld('bp.posStmt','a',{rows:4})}
      <h2>Avantage injuste</h2><p class="v txt">${esc(b.edge)}</p>
      <h2>Barrières à l'entrée</h2>${fld('bp.barriers','a',{rows:3})}
      <h2>Facteurs clés de succès</h2>${E?fld('bp.fcs','a',{rows:5}):`<ol class="adv">${String(b.fcs||'').split('\n').filter(x=>x.trim()).map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`}</div>
    <div class="card s7"><h2>Carte concurrentielle <span class="meta">prix × différenciation</span></h2>
      ${scatter(compPts,{title:'Carte concurrentielle',xl:'Niveau de prix',yl:'Différenciation',q:['Niche premium','Leaders premium','Bas de gamme','Prix élevé, peu différencié'],hi:false})}
      <div class="fields" style="margin-top:8px;max-width:320px">${F('Position du projet : prix','bp.px')}${F('Différenciation','bp.py')}</div></div>
    <div class="card s5"><h2>Part de marché visée</h2>
      <div class="tw"><table class="tbl"><thead><tr><th>Année</th><th class="n">CA visé</th><th class="n">PdM valeur</th><th class="n">Clients</th><th class="n">PdM volume</th></tr></thead><tbody>
      ${k.proj.map((p,i)=>`<tr><td>A${i+1} <span class="meta">${p.yr}</span></td><td class="n">${big(Yr[i].rev)}</td><td class="n"><b>${pct(p.sv,2)}</b></td><td class="n">${nf(Yr[i].clients,0)}</td><td class="n"><b>${pct(p.sq,2)}</b></td></tr>`).join('')}
      </tbody></table></div>
      <p class="note">Marché projeté depuis ${k.last.y} : ${big(k.proj[k.proj.length-1].v)} et ${nf(k.proj[k.proj.length-1].q,0)} ${esc(m.unitQ)} en A${H}, au CAGR retenu (${pct(r.cagr)}) en valeur et au CAGR historique (${pct(k.cagrQ)}) en volume. Court terme : A1-A2 ; moyen terme : A${H}.</p></div>
    <div class="card s7"><h2><span>Passage au tamis OVERRIDE <span class="meta">4 filtres amont</span></span><span class="tag ${k.passN===4?'ok':k.passN>=3?'am':'ko'}">${k.passN}/4 filtres franchis</span></h2>
      <div class="tamis">${k.filt.map((f,i)=>`<div class="tm ${f[1]>=S.sc.min?'ok':'ko'}"><div class="tm-h"><b>${FQ[i][0]}</b><span class="num">${i<3?fld(['bp.tamis.liq','bp.tamis.cat','bp.tamis.conc'][i],'n',{al:FQ[i][0]}):nf(f[1],1)}<span class="meta"> /10</span></span></div><div class="meter${f[1]<S.sc.min?' lo':''}"><b style="width:${clamp(f[1],0,10)*10}%"></b></div><p class="tm-q">${FQ[i][1]}</p>${i<3?fld(['bp.tamis.liqTxt','bp.tamis.catTxt','bp.tamis.concTxt'][i],'a',{rows:2,al:FQ[i][0]}):`<p class="v txt">${esc(f[2])}</p>`}</div>`).join('')}</div>
      <div class="row noprint" style="margin-top:12px"><button class="btn" data-act="bp2sc">Envoyer le projet au Sélecteur</button><span class="meta">Le projet est positionné sur le mapping de son secteur avec ses scores.</span></div></div>
    <div class="card s12"><h2><span>Les 5 forces de Porter <span class="meta">intensité de 1 (faible) à 5 (forte)</span></span><span class="tag ${PO>=4?'ko':PO>=3?'am':'ok'}">Intensité moyenne ${nf(PO,1)}/5 : secteur ${PO>=4?'peu':PO>=3?'moyennement':'très'} attractif</span></h2>
      <div class="porter">${b.porter.map((f,i)=>`<div class="pr"><div class="pr-h"><b>${esc(f.n)}</b><span class="num">${fld('bp.porter.'+i+'.s','n',{al:f.n})}<span class="meta"> /5</span></span></div><div class="meter${+f.s>=4?' lo':''}"><b style="width:${clamp(+f.s,0,5)*20}%"></b></div>${fld('bp.porter.'+i+'.t','a',{rows:2,al:f.n})}</div>`).join('')}</div></div>

    <div class="card s12"><h2>Analyse PESTEL</h2><div class="six">${[['p','Politique'],['e','Économique'],['s','Sociologique'],['t','Technologique'],['env','Écologique'],['l','Législatif']].map(([q,l])=>`<div><h3>${l}</h3>${fld('bp.pestel.'+q,'a',{rows:3,al:l})}</div>`).join('')}</div></div>
    <div class="card s12"><h2>Analyse SWOT</h2><div class="swot">
        <div><h3>Forces</h3>${fld('bp.swot.s','a',{rows:3})}</div><div><h3>Faiblesses</h3>${fld('bp.swot.w','a',{rows:3})}</div>
        <div><h3>Opportunités</h3>${fld('bp.swot.o','a',{rows:3})}</div><div><h3>Menaces</h3>${fld('bp.swot.t','a',{rows:3})}</div></div></div>`)}
  ${sec(7,'Stratégie commerciale et marketing',`
    <div class="card s7"><h2>Canaux d'acquisition</h2>${etable('bp.channels',[['n','Canal','t'],['sh','Part des acquisitions (%)','n','width:150px'],['cac','CAC du canal (€)','n','width:130px']])}
      ${Math.abs(b.channels.reduce((a,c)=>a+(+c.sh||0),0)-100)>0.5?'<p class="note down">La somme des parts doit faire 100 % : le CAC est pondéré sur le total saisi.</p>':''}</div>
    <div class="card s5"><div class="stats" style="grid-template-columns:1fr 1fr">
      <div class="stat"><div class="k">CAC pondéré</div><div class="x">${big(r.cac)}</div><div class="d">utilisé par le modèle</div></div>
      <div class="stat"><div class="k">Clients à acquérir</div><div class="x">${nf(Yr.reduce((a,y)=>a+y.newC,0),0)}</div><div class="d">sur ${H} ans, churn compris</div></div>
      <div class="stat"><div class="k">Budget d'acquisition A1</div><div class="x">${big(Yr[0].mkt)}</div><div class="d">${pct(Yr[0].mkt/Yr[0].rev*100,0)} du CA</div></div>
      <div class="stat"><div class="k">Budget d'acquisition A${H}</div><div class="x">${big(Hy.mkt)}</div><div class="d">${pct(Hy.mkt/Hy.rev*100,0)} du CA</div></div></div>
      <h2 style="margin-top:14px">Stratégie de pénétration</h2>${fld('bp.penetration','a',{rows:4})}</div>`)}
  ${sec(8,'Paramètres économiques, marché adressable et sources',`
    <div class="card s4"><h2>Hypothèses macroéconomiques</h2>${fld('bp.macro','a',{rows:5})}</div>
    <div class="card s4"><h2>Moteurs de croissance</h2>${fld('bp.drivers','a',{rows:5})}</div>
    <div class="card s4"><h2>Contraintes</h2>${fld('bp.constraints','a',{rows:5})}</div>
    <div class="card s12"><h2>Registre des hypothèses <span class="meta">chaque hypothèse doit être justifiée</span></h2>
      <div class="tw"><table class="tbl reg"><thead><tr><th>Hypothèse</th><th>Valeur</th><th>Justification et source</th><th>Statut</th></tr></thead><tbody>${regRows}</tbody></table></div></div>
    <div class="card s12"><h2>Paramètres de structure</h2><div class="pgrid">
      <div><h3>Charges et investissements</h3><div class="fields">${F('Charges externes A1','bp.other1','n',{u:'€'})}${F('Hausse annuelle','bp.otherG','n',{u:'%'})}${F('Durée d\'amortissement','bp.amortY','n',{u:'ans'})}</div><div class="lb" style="margin-top:8px">Investissements par année (€)</div><div class="fv" style="flex-wrap:wrap">${yrsFld('bp.capex',H)}</div></div>
      <div><h3>Calendrier et fiscalité</h3><div class="fields">${F('Année de démarrage','bp.startY','n',{raw:1})}${F('Impôt sur les sociétés','bp.tax','n',{u:'%'})}</div><p class="note">Déficits reportables imputés sur les bénéfices futurs ; impôt décaissé en fin d'exercice.</p></div>
      <div><h3>Financement</h3><div class="fields">${F('Apport des fondateurs','bp.equity','n',{u:'€'})}${F('Subventions et aides','bp.grant','n',{u:'€'})}${F('Levée de fonds','bp.raise','n',{u:'€'})}${F('Valorisation pre-money','bp.preMoney','n',{u:'€'})}${F('Mois d\'encaissement','bp.raiseM','n',{u:'mois'})}${F('Emprunt bancaire','bp.loan','n',{u:'€'})}${F('Taux','bp.rate','n',{u:'%'})}${F('Durée','bp.loanY','n',{u:'ans'})}${F('Différé','bp.defer','n',{u:'mois'})}</div><p class="note">Dilution de la levée : ${pct(+b.raise/((+b.preMoney)+(+b.raise))*100,1)} (post-money ${big((+b.preMoney)+(+b.raise))}).</p></div>
    </div></div>
    <div class="card s8"><h2>Marché adressable <span class="meta">${b.tamOv>0||b.cagrOv>0?'valeurs forcées':'calcul automatique'}</span></h2>
      <div class="stats">
        <div class="stat"><div class="k">TAM</div><div class="x">${big(r.tam)}</div><div class="d">${b.tamOv>0?'forcé':'secteur × part de zone'}</div></div>
        <div class="stat"><div class="k">SAM</div><div class="x">${big(r.sam)}</div><div class="d">${pct(+b.samPct,1)} du TAM</div></div>
        <div class="stat"><div class="k">SOM</div><div class="x amb">${big(r.som)}</div><div class="d">${pct(+b.somPct,1)} du SAM</div></div>
        <div class="stat"><div class="k">CAGR</div><div class="x">${pct(r.cagr)}</div><div class="d">TAM à ${H} ans : ${big(r.tam*(1+r.cagr/100)**H)}</div></div></div>
      <div class="funnel">${[['TAM',r.tam],['SAM',r.sam],['SOM',r.som]].map((x,i)=>`<div class="fr"><span>${x[0]}</span><div class="track"><div class="fill" style="width:${funnelW[i]}%"></div></div><span class="num">${big(x[1])}</span></div>`).join('')}</div>
      <p class="note">CA de l'année ${H} : <b class="num">${pct(r.somShare,1)}</b> du SOM.</p>
      ${E?`<div class="fields" style="margin-top:10px">${F('TAM forcé (0 = auto)','bp.tamOv','n',{u:'M€'})}${F('CAGR forcé (0 = auto)','bp.cagrOv','n',{u:'%'})}${F('SAM','bp.samPct','n',{u:'% TAM'})}${F('SOM','bp.somPct','n',{u:'% SAM'})}</div>`:''}</div>
    <div class="card s4"><h2>Modèle de revenus</h2>${fld('bp.revModel','a',{rows:5})}</div>
    <div class="card s12"><h2>Sources macroéconomiques <span class="meta">consultation : ${esc(b.srcDate)}</span></h2>
      <div class="tw"><table class="tbl"><thead><tr><th>Donnée</th><th class="n">Valeur</th><th>Source de référence</th><th>Statut</th></tr></thead><tbody>
        <tr><td>Marché sectoriel mondial</td><td class="n">${big(r.s.tam)}</td><td>${esc(r.s.src)}</td><td><span class="tag am">Ordre de grandeur à confirmer</span></td></tr>
        <tr><td>Part de la zone ${esc(r.z.l)}</td><td class="n">${pct(r.z.s*100)}</td><td>${esc(r.z.src)}</td><td><span class="tag am">Ordre de grandeur à confirmer</span></td></tr>
        <tr><td>Marge brute de référence du secteur</td><td class="n">${pct(r.s.gm,0)}</td><td>${esc(r.s.src)}</td><td><span class="tag am">Ordre de grandeur à confirmer</span></td></tr>
        <tr><td>TAM retenu</td><td class="n">${big(r.tam)}</td><td>${b.tamOv>0?'Saisie analyste':'Marché sectoriel × part de zone'}</td><td><span class="tag ${b.tamOv>0?'am':'ok'}">${b.tamOv>0?'Forcé':'Calculé'}</span></td></tr>
        <tr><td>CAGR sectoriel</td><td class="n">${pct(r.cagr)}</td><td>${b.cagrOv>0?'Saisie analyste':esc(r.s.src)}</td><td><span class="tag ${b.cagrOv>0?'am':'ok'}">${b.cagrOv>0?'Forcé':'Calculé'}</span></td></tr>
      </tbody></table></div>
      ${E?`<div class="fields" style="margin-top:10px;max-width:320px">${F('Date de consultation','bp.srcDate','t')}</div>`:''}
      <p class="note">Les références sectorielles intégrées sont des ordres de grandeur. Avant diffusion, remplacez-les par les chiffres exacts de l'étude citée via Override.</p></div>`)}
  ${sec(9,'Partie financière',`
    <div class="card s12">${verdict}</div>
    <div class="card s12"><h2><span>Trésorerie mensuelle <span class="meta">${H} ans à partir de janvier ${+b.startY||2027}</span></span><span class="meta">Point bas ${big(r.min.cash)}, mois ${r.min.k} de l'année ${r.min.t}</span></h2><div class="lwc" id="ch-cash"></div>
      <div class="legend"><span><i style="background:var(--up)"></i>Trésorerie positive</span><span><i style="background:var(--down)"></i>Trésorerie négative</span><span><i style="background:rgba(16,185,129,.5)"></i>Flux net du mois</span><span>Glisser pour naviguer, pincer pour zoomer</span></div></div>
    <div class="card s12"><h2><span>Activité mensuelle</span><span class="meta">chiffre d'affaires et EBITDA par mois</span></h2><div class="lwc sm" id="ch-act"></div>
      <div class="legend"><span><i style="background:#A1A1AA"></i>Chiffre d'affaires</span><span><i style="background:var(--up)"></i>EBITDA positif</span><span><i style="background:var(--down)"></i>EBITDA négatif</span></div></div>
    <div class="card s6"><h2>Compte de résultat prévisionnel</h2>${ftable(head,[
      ['Clients fin d\'année',Yr.map(y=>nf(y.clients,0))],
      ["Chiffre d'affaires",Yr.map(y=>y.rev),'tot'],['Coût des ventes',Yr.map(y=>-y.cogs)],['Marge brute',Yr.map(y=>y.gp),'tot'],
      ['Acquisition clients',Yr.map(y=>-y.mkt)],['Charges de personnel',Yr.map(y=>-y.pers)],['Charges externes',Yr.map(y=>-y.other)],
      ['EBITDA',Yr.map(y=>y.ebitda),'tot',1],['Marge EBITDA',Yr.map(y=>pct(y.em,0))],['Dotations aux amortissements',Yr.map(y=>-y.da)],
      ['EBIT',Yr.map(y=>y.ebit),'tot',1],['Charges financières',Yr.map(y=>-y.int)],['Impôt sur les sociétés',Yr.map(y=>-y.tax)],['Résultat net',Yr.map(y=>y.net),'tot',1]])}</div>
    <div class="card s6"><h2>Bilan prévisionnel <span class="meta">fin d'exercice</span></h2>${ftable(head,[
      ['§','Actif'],['Immobilisations nettes',Yr.map(y=>y.bal.fixed)],['Créances clients',Yr.map(y=>y.bal.rec)],['Trésorerie',Yr.map(y=>y.bal.cash),'',1],['Total actif',Yr.map(y=>y.bal.assets),'tot'],
      ['§','Passif'],['Capital et primes',Yr.map(y=>y.bal.capital)],['Subventions',Yr.map(y=>y.bal.grant)],['Résultats cumulés',Yr.map(y=>y.bal.retained),'',1],['Dettes financières',Yr.map(y=>y.bal.debt)],['Dettes fournisseurs',Yr.map(y=>y.bal.pay)],['Total passif',Yr.map(y=>y.bal.liab),'tot'],
      ['Contrôle actif − passif',Yr.map(y=>Math.abs(y.gap)<1?'0':kk(y.gap))]])}
      <p class="note">Capitaux propres fin A${H} : <b class="num">${big(Hy.bal.capital+Hy.bal.grant+Hy.bal.retained)}</b>${Hy.bal.capital+Hy.bal.grant+Hy.bal.retained<0?' <span class="down">(négatifs : reconstitution obligatoire)</span>':''}.</p></div>
    <div class="card s6"><h2>Plan de financement</h2>${ftable(head,[
      ['§','Ressources'],['Capacité d\'autofinancement',Yr.map(y=>y.R.caf)],['Apports et levées',Yr.map(y=>y.R.eq)],['Subventions',Yr.map(y=>y.R.grant)],['Emprunts',Yr.map(y=>y.R.debt)],['Dégagement de BFR',Yr.map(y=>y.R.bfr)],['Total ressources',Yr.map(y=>y.Rt),'tot'],
      ['§','Emplois'],['Insuffisance d\'autofinancement',Yr.map(y=>y.E.caf)],['Investissements',Yr.map(y=>y.E.capex)],['Augmentation du BFR',Yr.map(y=>y.E.bfr)],['Remboursements d\'emprunt',Yr.map(y=>y.E.repay)],['Total emplois',Yr.map(y=>y.Et),'tot'],
      ['Variation de trésorerie',Yr.map(y=>y.Rt-y.Et),'tot',1],['Trésorerie fin d\'exercice',Yr.map(y=>y.cash),'',1]])}</div>
    <div class="card s6"><h2>Budget de trésorerie annuel</h2>${ftable(head,[
      ['§','Encaissements'],['Clients',Yr.map(y=>y.coll)],['Apports et levées',Yr.map(y=>y.inEq)],['Emprunts et subventions',Yr.map(y=>y.inDebt+y.inGrant)],['Total encaissements',Yr.map(y=>y.coll+y.inEq+y.inDebt+y.inGrant),'tot'],
      ['§','Décaissements'],['Fournisseurs et charges externes',Yr.map(y=>y.paySup)],['Acquisition clients',Yr.map(y=>y.mkt)],['Salaires chargés',Yr.map(y=>y.pers)],['Investissements',Yr.map(y=>y.capex)],['Intérêts',Yr.map(y=>y.int)],['Impôt sur les sociétés',Yr.map(y=>y.tax)],['Remboursements d\'emprunt',Yr.map(y=>y.repay)],
      ['Total décaissements',Yr.map(y=>y.paySup+y.mkt+y.pers+y.capex+y.int+y.tax+y.repay),'tot'],['Trésorerie fin d\'exercice',Yr.map(y=>y.cash),'tot',1]])}</div>
    <div class="card s12"><h2>Budget de trésorerie mensuel
      <select class="f noprint" data-ui="ty" aria-label="Année affichée" style="width:auto;padding:4px 24px 4px 8px">${Yr.map(y=>`<option value="${y.t}"${y.t===ty?' selected':''}>Année ${y.t}</option>`).join('')}</select></h2>
      ${ftable(MY.map(x=>'M'+x.k),[
        ['Encaissements clients',MY.map(x=>x.coll)],['Apports et levées',MY.map(x=>x.inEq)],['Emprunts et subventions',MY.map(x=>x.inFin)],['Total encaissements',MY.map(x=>x.inTot),'tot'],
        ['Fournisseurs et charges externes',MY.map(x=>x.paySup)],['Acquisition clients',MY.map(x=>x.mkt)],['Salaires chargés',MY.map(x=>x.pers)],['Investissements',MY.map(x=>x.capex)],['Intérêts et impôt',MY.map(x=>x.intr+x.tax)],['Remboursements',MY.map(x=>x.principal)],['Total décaissements',MY.map(x=>x.outTot),'tot'],
        ['Solde du mois',MY.map(x=>x.flow),'',1],['Trésorerie fin de mois',MY.map(x=>x.cash),'tot',1]])}</div>
    <div class="card s4"><h2>Unit economics</h2><div class="tw"><table class="tbl">
      <tr><td>ARPU mensuel</td><td class="n">${big(+b.arpu)}</td></tr><tr><td>Marge de contribution mensuelle</td><td class="n">${big(r.mc)}</td></tr>
      <tr><td>CAC pondéré</td><td class="n">${big(r.cac)}</td></tr><tr><td>Durée de vie client (plafonnée à 60 mois)</td><td class="n">${nf(r.life,0)} mois</td></tr>
      <tr class="tot"><td>LTV</td><td class="n">${big(r.ltv)}</td></tr><tr><td>LTV / CAC</td><td class="n ${r.ratio>=3?'up':'down'}">${nf(r.ratio,1)}×</td></tr><tr><td>Remboursement du CAC</td><td class="n ${r.payback<=18?'up':'down'}">${nf(r.payback,1)} mois</td></tr></table></div></div>
    <div class="card s4"><h2>Besoin en fonds de roulement</h2>${ftable(head,[['Créances clients',Yr.map(y=>y.bal.rec)],['Dettes fournisseurs',Yr.map(y=>-y.bal.pay)],['BFR',Yr.map(y=>y.bal.bfr),'tot'],['BFR en jours de CA',Yr.map(y=>nf(y.bal.bfr/y.rev*365,0)+' j')]])}</div>
    <div class="card s4"><h2>Tableau de cohérence</h2>${ftable(head,[['CA par ETP',Yr.map(y=>y.hc?y.rev/y.hc:NaN)],['Personnel / CA',Yr.map(y=>pct(y.pers/y.rev*100,0))],['Acquisition / CA',Yr.map(y=>pct(y.mkt/y.rev*100,0))],['Croissance du CA',Yr.map((y,i)=>i?pct((y.rev/Yr[i-1].rev-1)*100,0):'—')],['Dette fin. / fonds propres',Yr.map(y=>{const e=y.bal.capital+y.bal.grant+y.bal.retained;return e>0?nf(y.bal.debt/e,2)+'×':'n.s.';})]])}</div>`)}
  ${sec(10,'Annexes et conseils d\'exécution',`
    <div class="card s7"><h2>Lignes directrices issues du modèle</h2><ol class="adv">${advice.map(a=>`<li>${a}</li>`).join('')}</ol></div>
    <div class="card s5"><h2>Conseils de l'analyste</h2>${fld('bp.advice','a',{rows:6})}
      <p class="note">Conventions du modèle : mois de 30 jours ; montée en charge du parc clients selon la saisonnalité du marché (ou linéaire si désactivée) ; acquisition décaissée au mois de signature ; impôt payé en fin d'exercice ; subventions classées en quasi-fonds propres ; amortissement linéaire de l'emprunt après différé.</p></div>`)}`;

  const tm=x=>`${(+b.startY||2027)+x.t-1}-${String(x.k).padStart(2,'0')}-01`;
  queueChart('ch-cash',el=>{const ch=lwBase(el,kfmt);
    const s1=ch.addBaselineSeries({baseValue:{type:'price',price:0},topLineColor:TVC.up,topFillColor1:'rgba(16,185,129,.22)',topFillColor2:'rgba(16,185,129,.02)',bottomLineColor:TVC.down,bottomFillColor1:'rgba(220,38,38,.02)',bottomFillColor2:'rgba(220,38,38,.25)',lineWidth:2,priceLineVisible:false,title:'Trésorerie'});
    s1.setData(r.M.map(x=>({time:tm(x),value:Math.round(x.cash)})));
    const hs=ch.addHistogramSeries({priceScaleId:'flow',priceLineVisible:false,lastValueVisible:false,priceFormat:{type:'custom',formatter:kfmt}});
    ch.priceScale('flow').applyOptions({scaleMargins:{top:.8,bottom:0}});
    hs.setData(r.M.map(x=>({time:tm(x),value:Math.round(x.flow),color:x.flow>=0?'rgba(16,185,129,.4)':'rgba(220,38,38,.4)'})));
    const mk=[{time:tm(r.min),position:'belowBar',color:r.min.cash<0?TVC.down:TVC.text,shape:'arrowUp',text:'Point bas '+big(r.min.cash)}];
    const rm=r.M.find(x=>x.m===+b.raiseM);if(rm&&+b.raise>0&&rm.m!==r.min.m)mk.push({time:tm(rm),position:'aboveBar',color:TVC.accent,shape:'arrowDown',text:'Levée '+big(+b.raise)});
    mk.sort((p,q)=>p.time<q.time?-1:1);s1.setMarkers(mk);ch.timeScale().fitContent();return ch;},()=>cashChart(r.M));
  queueChart('ch-act',el=>{const ch=lwBase(el,kfmt);
    const hs=ch.addHistogramSeries({color:'rgba(161,161,170,.55)',priceLineVisible:false,title:'CA'});
    hs.setData(r.M.map(x=>({time:tm(x),value:Math.round(x.rev)})));
    const es=ch.addBaselineSeries({baseValue:{type:'price',price:0},topLineColor:TVC.up,topFillColor1:'rgba(0,0,0,0)',topFillColor2:'rgba(0,0,0,0)',bottomLineColor:TVC.down,bottomFillColor1:'rgba(0,0,0,0)',bottomFillColor2:'rgba(0,0,0,0)',lineWidth:2,priceLineVisible:false,title:'EBITDA'});
    es.setData(r.M.map(x=>({time:tm(x),value:Math.round(x.ebitda)})));ch.timeScale().fitContent();return ch;},()=>bars(Yr.map(y=>({rev:y.rev,ebitda:y.ebitda})),head));
  mountCharts();
}

