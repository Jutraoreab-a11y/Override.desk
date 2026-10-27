/* ============ Volet 2 : Analyse financière de titre ============ */
const avg=a=>{const v=a.filter(x=>x!==null&&isFinite(x));return v.length?sum(v)/v.length:NaN;};
function anBase(a){
  const n=a.rev.length,L=n-1,em=a.rev.map((r,i)=>a.ebitda[i]/r*100),ndE=a.nd.map((d,i)=>a.ebitda[i]>0?d/a.ebitda[i]:NaN);
  const revG=a.rev.map((r,i)=>i?(r/a.rev[i-1]-1)*100:NaN),epsG=a.eps.map((e,i)=>i&&a.eps[i-1]!==0?(e-a.eps[i-1])/Math.abs(a.eps[i-1])*100:NaN);
  const capR=(+a.price)/(+a.fx||1)*(+a.shares),evR=capR+(+a.nd[L]),eurK=a.rcur==='USD'?1/FX_EURUSD:1;
  return{n,L,em,ndE,revG,epsG,capR,evR,capEUR:capR*eurK,evE:a.ebitda[L]>0?evR/a.ebitda[L]:NaN,per:a.eps[L]>0?a.price/(a.eps[L]*a.fx):NaN,perF:a.epsE>0?a.price/(a.epsE*a.fx):NaN,fcfY:a.fcf[L]/capR*100};
}
function anCalc(id){
  const A=S.an.assets,a=A[id],c=S.an.crit,B=anBase(a),L=B.L;
  const peers=Object.keys(A).filter(k=>k!==id&&A[k].sec===a.sec),PB=peers.map(k=>anBase(A[k]));
  const medEvE=median(PB.map(p=>p.evE).filter(v=>v>0)),medPE=median(PB.map(p=>p.per).filter(v=>v>0)),medEm=median(PB.map(p=>p.em[p.L]));
  /* DCF sur FCF normalisé (moyenne 3 ans) */
  const base=avg(a.fcf.slice(-3)),w=a.wacc/100,g=a.g/100,tg=a.tg/100;let pv=0,f=base;
  for(let t=1;t<=5;t++){f*=1+g;pv+=f/(1+w)**t;}
  const tv=w>tg?f*(1+tg)/(w-tg):NaN,pvtv=tv/(1+w)**5,ev=pv+pvtv,iv=base>0?(ev-a.nd[L])/a.shares*a.fx:NaN;
  const impEv=medEvE>0&&a.ebitda[L]>0?(medEvE*a.ebitda[L]-a.nd[L])/a.shares*a.fx:NaN,impPe=medPE>0&&a.eps[L]>0?medPE*a.eps[L]*a.fx:NaN;
  const meth=[['DCF (FCF normalisé 3 ans)',iv,+c.wDcf],['VE/EBITDA médian des pairs',impEv,+c.wEv],['PER médian des pairs',impPe,+c.wPe]];
  const okM=meth.filter(x=>isFinite(x[1])&&x[1]>0&&x[2]>0),wt=sum(okM.map(x=>x[2])),ref=wt?sum(okM.map(x=>x[1]*x[2]))/wt:NaN;
  const buy=ref*(1-c.mos/100),sl=buy*(1-c.sl/100),tp=ref*(1+c.tp/100),up=ref/a.price-1;
  /* Scoring vs seuils personnels */
  const pos5=a.fcf.filter(v=>v>0).length;
  const rows=[
    ['Marge EBITDA N-1',B.em[L],'≥',c.ebitda,B.em[L]>=c.ebitda,15,'%','an.crit.ebitda'],
    ['ROE N-1',a.roe[L],'≥',c.roe,a.roe[L]>=c.roe,15,'%','an.crit.roe'],
    ['ROIC N-1',a.roic,'≥',c.roic,a.roic!==null&&a.roic!==''&&+a.roic>=c.roic,15,'%','an.crit.roic',a.roic===null||a.roic===''],
    ['Dette nette / EBITDA',B.ndE[L],'≤',c.nd,isFinite(B.ndE[L])&&B.ndE[L]<=c.nd,15,'×','an.crit.nd'],
    ['Free cash flow N-1',a.fcf[L],'>',0,a.fcf[L]>0,10,' M',null],
    ['Croissance du CA N-1',B.revG[L],'≥',c.growth,B.revG[L]>=c.growth,10,'%','an.crit.growth'],
    ['Croissance du BPA N-1',B.epsG[L],'>',0,B.epsG[L]>0,10,'%',null],
    ['Années de FCF positif',pos5,'≥',4,pos5>=4,10,'/'+B.n,null]
  ];
  const avail=rows.filter(r=>!r[8]),score=Math.round(sum(avail.filter(r=>r[4]).map(r=>r[5]))/sum(avail.map(r=>r[5]))*100);
  /* Tamis */
  const ce=B.capEUR/1000,liq=ce>=100?10:ce>=20?9:ce>=5?8:ce>=1?6:ce>=.3?4:2;
  const isLead=[id,...peers].sort((x,y)=>A[y].rev[A[y].rev.length-1]/(A[y].rcur==='USD'?FX_EURUSD:1)-A[x].rev[A[x].rev.length-1]/(A[x].rcur==='USD'?FX_EURUSD:1))[0]===id;
  const conc=Math.round(clamp(5+(B.em[L]-medEm)/4+(isLead?1:0),1,10)*10)/10;
  const leadName=A[[id,...peers].sort((x,y)=>A[y].rev[A[y].rev.length-1]/(A[y].rcur==='USD'?FX_EURUSD:1)-A[x].rev[A[x].rev.length-1]/(A[x].rcur==='USD'?FX_EURUSD:1))[0]].n;
  const filt=[
    ['Liquidité',liq,`Capitalisation de ${mm(B.capEUR*1,'')}€ : titre ${liq>=8?'très liquide, entrée et sortie sans décote':liq>=6?'liquide':'peu liquide, risque de décote à la revente'}.`,'auto'],
    ['Catalyseur',+a.cat,a.catTxt,'an.assets.'+id+'.cat'],
    ['Concurrence',conc,`${isLead?'Leader de son groupe de comparables par le chiffre d\'affaires':'Leader du groupe : '+leadName}. Marge EBITDA ${pct(B.em[L],1)} contre ${pct(medEm,1)} en médiane des pairs.`,'auto'],
    ['Taille de marché',+a.tamS,a.tamTxt,'an.assets.'+id+'.tamS']
  ];
  const fPass=filt.filter(f=>f[1]>=c.fmin).length;
  const checks=[
    ['Qualité',score>=c.min,`Score ${score}/100 pour un seuil de ${c.min}`],
    ['Tamis',fPass===4,`${fPass}/4 filtres franchis (seuil ${c.fmin}/10)`],
    ['Valorisation',isFinite(ref),isFinite(ref)?`Valeur de référence ${nf(ref,2)} ${a.cur}`:'Aucune méthode applicable (FCF ou résultats négatifs)'],
    ['Prix',isFinite(ref)&&a.price<=buy,isFinite(ref)?`Cours ${nf(+a.price,2)} pour un prix d'achat cible de ${nf(buy,2)}`:'Prix d\'achat cible non calculable']
  ];
  const positive=checks.every(x=>x[1]);
  let concl;
  if(positive)concl=`Prendre position : qualité validée, tamis franchi et cours sous le prix d'achat cible. Stop-loss à ${nf(sl,2)}, objectif à ${nf(tp,2)} ${a.cur}.`;
  else if(!checks[0][1])concl=`S'abstenir : le titre ne respecte pas vos critères de qualité (${score}/100).`;
  else if(!checks[1][1])concl=`S'abstenir : le titre ne franchit pas le tamis (${filt.filter(f=>f[1]<c.fmin).map(f=>f[0].toLowerCase()).join(', ')}).`;
  else if(!checks[2][1])concl=`S'abstenir : valorisation intrinsèque non calculable avec les données publiées.`;
  else concl=`S'abstenir au cours actuel : qualité validée mais prix au-dessus de la cible. Placer un ordre limite à ${nf(buy,2)} ${a.cur} (${sgn((buy/a.price-1)*100)}).`;
  return{a,B,peers,medEvE,medPE,medEm,base,iv,impEv,impPe,meth,ref,buy,sl,tp,up,tvw:pvtv/ev,rows,score,filt,fPass,checks,positive,concl};
}
function renderAN(){
  const A=S.an.assets;let id=ui.tk;if(!A[id]){id=ui.tk=Object.keys(A)[0];}
  const R=anCalc(id),a=R.a,B=R.B,L=B.L,E=ui.edit,c=S.an.crit,P=k=>`an.assets.${id}.${k}`,cur=a.cur,rc=a.rcur;
  const LV=[{key:'sl',k:'Stop-loss',v:R.sl,c:TVC.down},{key:'buy',k:"Achat cible",v:R.buy,c:TVC.up},{key:'px',k:'Cours',v:+a.price,c:'#FAFAFA'},{key:'iv',k:'Valeur de référence',v:R.ref,c:'#A1A1AA'},{key:'tp',k:'Take-profit',v:R.tp,c:TVC.amber}];
  const hrow=(lab,arr,fmt,key,cl)=>`<tr><td>${lab}</td>${arr.map((v,i)=>`<td class="n ${cl?(isFinite(v)?cls(v):''):''}">${key&&E?fld(`${P(key)}.${i}`,'n',{al:lab+' '+a.y[i]}):fmt(v)}</td>`).join('')}</tr>`;
  $('#p-an').innerHTML=`
  <div class="grid">
    ${prjBar('an')}
    ${ui.qmsg?`<div class="card s12 msg">${ui.qmsg}</div>`:''}
    <div class="card s12"><div class="symhead">
      <div class="sh-id"><div class="sh-t">${esc(a.t)}</div><div class="sh-n">${esc(a.n)}</div><div class="sh-m">${esc(a.sec)}, exercice clos en ${esc(a.fy)}, comptes en ${esc(rc)}</div></div>
      <div><div class="sh-px">${fld(P('price'),'n',{al:'Cours',d:2})}<em class="u">${esc(cur)}</em></div><div class="sh-m">cours au ${esc(a.pxDate)}</div></div>
      <div class="sh-kv">
        <div><span>Valeur de référence</span><b>${nf(R.ref,2)}</b></div>
        <div><span>Potentiel</span><b class="${cls(R.up)}">${isFinite(R.up)?sgn(R.up*100):'—'}</b></div>
        <div><span>Prix d'achat cible</span><b>${nf(R.buy,2)}</b></div>
        <div><span>Score qualité</span><b>${R.score}/100</b></div>
      </div>
      <div class="badge ${R.positive?'ok':'ko'}">${R.positive?'POSITIVE : PRENDRE POSITION':'NÉGATIVE : S\'ABSTENIR'}</div>
    </div>
    ${E?`<div class="fields" style="margin-top:12px;max-width:760px">${F('Nom',P('n'),'t')}${F('Groupe de comparables',P('sec'),'t')}${F('Date du cours',P('pxDate'),'t')}${F('Devise de cotation',P('cur'),'t')}${F('Change comptes → cotation',P('fx'))}</div>`:''}</div>

    <div class="card s12"><h2>1. Décision d'investissement</h2>
      <div class="dec">${R.checks.map((x,i)=>`<div class="dc ${x[1]?'ok':'ko'}"><span class="dot ${x[1]?'ok':'ko'}"></span><div><b>${i+1}. ${x[0]}</b><span>${x[2]}</span></div></div>`).join('')}</div>
      <div class="verdict ${R.positive?'ok':'ko'}" style="margin-top:12px"><div class="vh" style="margin:0">${R.concl}</div></div></div>

    <div class="card s12"><h2><span>2. Tamis : les 4 filtres amont</span><span class="tag ${R.fPass===4?'ok':'ko'}">${R.fPass}/4 franchis</span></h2>
      <div class="tamis four">${R.filt.map((f,i)=>`<div class="tm ${f[1]>=c.fmin?'ok':'ko'}"><div class="tm-h"><b>${f[0]}</b><span class="num">${f[3]==='auto'?nf(f[1],1):fld(f[3],'n',{al:f[0]})}<span class="meta"> /10${f[3]==='auto'?', auto':''}</span></span></div><div class="meter${f[1]<c.fmin?' lo':''}"><b style="width:${clamp(f[1],0,10)*10}%"></b></div><p class="tm-q">${FQ[i][1]}</p>${f[3]==='auto'?`<p class="v txt">${esc(f[2])}</p>`:fld(i===1?P('catTxt'):P('tamTxt'),'a',{rows:2,al:f[0]})}</div>`).join('')}</div></div>

    <div class="card s12"><h2><span>3. Fondamentaux historiques <span class="meta">millions de ${esc(rc)}, sauf mention</span></span><span class="meta">source publiée</span></h2>
      <div class="sparks">
        <div><span class="lb">Chiffre d'affaires</span>${spark(a.y,a.rev,{fmt:v=>mm(v),title:'CA'})}</div>
        <div><span class="lb">Marge EBITDA</span>${spark(a.y,B.em,{type:'line',fmt:v=>pct(v,1),title:'Marge EBITDA'})}</div>
        <div><span class="lb">Free cash flow</span>${spark(a.y,a.fcf,{fmt:v=>mm(v),title:'FCF'})}</div>
        <div><span class="lb">BPA (${esc(rc)})</span>${spark(a.y,a.eps,{fmt:v=>nf(v,2),title:'BPA'})}</div>
      </div>
      <div class="tw" style="margin-top:8px"><table class="tbl fin"><thead><tr><th></th>${a.y.map((y,i)=>`<th class="n">${esc(y)}${i===L?' (N-1)':''}</th>`).join('')}</tr></thead><tbody>
        ${hrow("Chiffre d'affaires",a.rev,v=>nf(v,0),'rev')}
        ${hrow('Croissance du CA',B.revG,v=>isFinite(v)?sgn(v):'—',null,1)}
        ${hrow('EBITDA',a.ebitda,v=>nf(v,0),'ebitda')}
        ${hrow('Marge EBITDA',B.em,v=>pct(v,1))}
        ${hrow('Résultat net',a.ni,v=>nf(v,0),'ni')}
        ${hrow('BPA ('+rc+')',a.eps,v=>nf(v,2),'eps')}
        ${hrow('Croissance du BPA',B.epsG,v=>isFinite(v)?sgn(v):'—',null,1)}
        ${hrow('Free cash flow',a.fcf,v=>nf(v,0),'fcf')}
        ${hrow('Dette nette (négatif : trésorerie nette)',a.nd,v=>nf(v,0),'nd')}
        ${hrow('Dette nette / EBITDA',B.ndE,v=>isFinite(v)?nf(v,2)+'×':'—')}
        ${hrow('ROE',a.roe,v=>pct(v,1),'roe')}
      </tbody></table></div>
      <div class="fields" style="margin-top:10px;max-width:520px">${F('ROIC N-1 (non publié par la source)',P('roic'),'nn',{u:'%',empty:'à renseigner',ph:'à saisir'})}${F('BPA consensus N (estimation)',P('epsE'),'nn',{u:rc})}</div></div>

    <div class="card s5"><h2>4. Scoring vs vos seuils <span class="meta">éligibilité ${fld('an.crit.min')}</span></h2>
      <div class="tw"><table class="tbl"><thead><tr><th>Critère</th><th class="n">Valeur</th><th class="n">Seuil</th><th class="n">Pts</th></tr></thead><tbody>
      ${R.rows.map(r=>`<tr><td><span class="dot ${r[8]?'':r[4]?'ok':'ko'}" style="margin-right:7px"></span>${r[0]}</td><td class="n">${r[8]?'<span class="meta">n.d.</span>':(r[6]===' M'?nf(r[1],0)+' M':auto(r[1])+r[6])}</td><td class="n" style="min-width:80px">${r[2]} ${r[7]?fld(r[7]):r[3]}</td><td class="n">${r[8]?'<span class="meta">exclu</span>':r[4]?r[5]:'<span class="meta">0</span>'}</td></tr>`).join('')}
      <tr class="tot"><td>Score</td><td colspan="2" class="n"><span class="tag ${R.score>=c.min?'ok':'ko'}">${R.score>=c.min?'Éligible':'Non éligible'}</span></td><td class="n">${R.score}</td></tr>
      </tbody></table></div>
      <p class="note">Les critères non renseignés sont exclus et le score est ramené sur 100.</p></div>
    <div class="card s7"><h2>5. Valorisation intrinsèque et relative</h2>
      <div class="fields">${F('Croissance FCF 5 ans',P('g'),'n',{u:'%'})}${F('Croissance terminale',P('tg'),'n',{u:'%'})}${F('WACC',P('wacc'),'n',{u:'%'})}</div>
      <p class="note" style="margin-top:6px">FCF normalisé (moyenne des 3 derniers exercices) : ${mm(R.base,rc)}${R.base<=0?' : négatif, DCF non applicable.':'.'} Poids de la valeur terminale : ${isFinite(R.tvw)?pct(R.tvw*100,0):'—'}.</p>
      <div class="tw" style="margin-top:8px"><table class="tbl"><thead><tr><th>Multiple</th><th class="n">${esc(a.t)}</th><th class="n">Médiane des pairs</th><th class="n">Écart</th></tr></thead><tbody>
        <tr><td>VE / EBITDA N-1</td><td class="n">${isFinite(B.evE)?nf(B.evE,1)+'×':'—'}</td><td class="n">${isFinite(R.medEvE)?nf(R.medEvE,1)+'×':'—'}</td><td class="n ${cls(R.medEvE-B.evE)}">${isFinite(B.evE)&&isFinite(R.medEvE)?sgn((B.evE/R.medEvE-1)*100,0):'—'}</td></tr>
        <tr><td>PER N-1</td><td class="n">${isFinite(B.per)?nf(B.per,1)+'×':'n.s.'}</td><td class="n">${isFinite(R.medPE)?nf(R.medPE,1)+'×':'—'}</td><td class="n ${cls(R.medPE-B.per)}">${isFinite(B.per)&&isFinite(R.medPE)?sgn((B.per/R.medPE-1)*100,0):'—'}</td></tr>
        <tr><td>PER sur BPA consensus N</td><td class="n">${isFinite(B.perF)?nf(B.perF,1)+'×':'n.s.'}</td><td class="n">—</td><td class="n">—</td></tr>
        <tr><td>Rendement FCF N-1</td><td class="n">${pct(B.fcfY,1)}</td><td class="n">—</td><td class="n">—</td></tr>
      </tbody></table></div>
      <div class="tw" style="margin-top:8px"><table class="tbl"><thead><tr><th>Méthode</th><th class="n">Valeur par action</th><th class="n">Poids</th></tr></thead><tbody>
        ${R.meth.map((x,i)=>`<tr><td>${x[0]}</td><td class="n">${isFinite(x[1])&&x[1]>0?nf(x[1],2)+' '+cur:'<span class="meta">non applicable</span>'}</td><td class="n">${fld(['an.crit.wDcf','an.crit.wEv','an.crit.wPe'][i])} %</td></tr>`).join('')}
        <tr class="tot"><td>Valeur de référence</td><td class="n">${nf(R.ref,2)} ${cur}</td><td class="n">pondérée</td></tr>
      </tbody></table></div></div>

    <div class="card s8"><h2>6. Zones d'intervention</h2>${levelsChart(LV,cur)}
      <div class="legend">${LV.map(x=>`<span><i style="background:${x.c}"></i>${x.k} <b class="num" style="color:var(--hi);font-weight:500">${isFinite(x.v)?nf(x.v,2):'—'}</b></span>`).join('')}</div></div>
    <div class="card s4"><h2>Grille de décision</h2>
      <div class="fields" style="grid-template-columns:1fr 1fr">${F('Marge de sécurité','an.crit.mos','n',{u:'%'})}${F('Stop-loss sous achat','an.crit.sl','n',{u:'%'})}${F('Take-profit / référence','an.crit.tp','n',{u:'%'})}${F('Note minimale par filtre','an.crit.fmin','n',{u:'/10'})}</div>
      <div class="stats" style="margin-top:12px;grid-template-columns:1fr 1fr">
        <div class="stat"><div class="k">Prix d'achat cible</div><div class="x">${nf(R.buy,2)}</div><div class="d">référence − ${nf(c.mos,0)} %</div></div>
        <div class="stat"><div class="k">Stop-loss</div><div class="x">${nf(R.sl,2)}</div><div class="d">achat − ${nf(c.sl,0)} %</div></div>
        <div class="stat"><div class="k">Take-profit</div><div class="x">${nf(R.tp,2)}</div><div class="d">référence + ${nf(c.tp,0)} %</div></div>
        <div class="stat"><div class="k">Cours</div><div class="x">${nf(+a.price,2)}</div><div class="d">${isFinite(R.buy)?sgn((a.price/R.buy-1)*100)+' vs achat cible':'—'}</div></div>
      </div></div>

    <div class="card s12"><h2>7. Comparables sectoriels <span class="meta">${esc(a.sec)}</span></h2>
      <div class="tw"><table class="tbl"><thead><tr><th>Titre</th><th class="n">Cours</th><th class="n">Capitalisation (€)</th><th class="n">Croiss. CA</th><th class="n">Marge EBITDA</th><th class="n">ND / EBITDA</th><th class="n">VE / EBITDA</th><th class="n">PER</th><th class="n">Potentiel</th><th>Décision</th></tr></thead><tbody>
      ${[id,...R.peers].map(k=>{const x=A[k],b=anBase(x),r=k===id?R:anCalc(k);return`<tr class="click${k===id?' hl':''}" data-act="tk" data-id="${k}"><td><b>${esc(x.t)}</b> <span class="meta">${esc(x.n)}</span></td><td class="n">${nf(+x.price,2)} ${esc(x.cur)}</td><td class="n">${mm(b.capEUR)}</td><td class="n ${cls(b.revG[b.L])}">${sgn(b.revG[b.L])}</td><td class="n">${pct(b.em[b.L],1)}</td><td class="n">${isFinite(b.ndE[b.L])?nf(b.ndE[b.L],2)+'×':'—'}</td><td class="n">${isFinite(b.evE)?nf(b.evE,1)+'×':'—'}</td><td class="n">${isFinite(b.per)?nf(b.per,1)+'×':'n.s.'}</td><td class="n ${cls(r.up)}">${isFinite(r.up)?sgn(r.up*100,0):'—'}</td><td><span class="tag ${r.positive?'ok':'ko'}">${r.positive?'Positive':'Négative'}</span></td></tr>`;}).join('')}
      </tbody></table></div></div>

    <div class="card s12"><h2>8. Sources et traçabilité</h2>
      <div class="tw"><table class="tbl"><tbody>
        <tr><td>États financiers ${esc(a.y[0])} à ${esc(a.y[L])}, dette nette, ROE, BPA consensus</td><td><a href="${esc(a.src)}" target="_blank" rel="noopener">MarketScreener</a>, consultation du 21/10/2026</td><td><span class="tag ok">Publié</span></td></tr>
        <tr><td>Cours</td><td>${nf(+a.price,2)} ${esc(cur)} au ${esc(a.pxDate)} (même source)</td><td><span class="tag ${JSON.stringify(a.price)===JSON.stringify(getP(DEF,P('price')))?'ok':'am'}">${JSON.stringify(a.price)===JSON.stringify(getP(DEF,P('price')))?'Publié':'Forcé'}</span></td></tr>
        ${rc!==cur?`<tr><td>Conversion des comptes (${rc}) en devise de cotation (${cur})</td><td>EUR/USD ${nf(FX_EURUSD,4)} au ${FX_DATE}, ${FX_SRC}</td><td><span class="tag ok">Publié</span></td></tr>`:''}
        <tr><td>ROIC</td><td>Non publié par la source</td><td><span class="tag ${a.roic===null||a.roic===''?'am':'ok'}">${a.roic===null||a.roic===''?'À renseigner':'Saisi'}</span></td></tr>
        <tr><td>Croissance FCF, WACC, croissance terminale, notes de catalyseur et de taille de marché</td><td>Hypothèses de l'analyste, modifiables en Override</td><td><span class="tag am">Hypothèse</span></td></tr>
        ${a.ovNote?`<tr><td>Point d'attention sur les données</td><td>${esc(a.ovNote)}</td><td><span class="tag am">À vérifier</span></td></tr>`:''}
      </tbody></table></div>
      <p class="note">Rapport d'aide à la décision, ne constitue pas un conseil en investissement. Les estimations de consensus sont des prévisions, pas des résultats publiés.</p></div>
  </div>`;
}
