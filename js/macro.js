/* ============ Module 5 v8.1 : macro, WASDE et sensibilité or / argent (anti-FOMO) ============ */
/* Tout est calculé à la volée depuis les séries livrées (macro-data.js) et les cours du volet : aucun appel IA.
   Les « surprises » CPI/PPI sont approchées par la variation mensuelle du glissement annuel publié :
   le consensus des économistes n'est pas une donnée publique gratuite, il n'est donc pas inventé. */
const MAC_C={cpi:'#E8A87C',ppi:'#C38D9E',ff:'#85A3D6',ry:'#7FB7A4',beta:'#9AD1D4',lead:'#F2C14E',corn:'#D9C27A',soy:'#9BB56B',wheat:'#C9A26B',cotton:'#B9B4C7'};
const macM=k=>Object.entries(MACRO[k]).map(([ym,v])=>({time:ym+'-01',value:v}));
const macLast=k=>{const e=Object.entries(MACRO[k]);return e.length?{ym:e[e.length-1][0],v:e[e.length-1][1],prev:e.length>1?e[e.length-2][1]:null,prevYm:e.length>1?e[e.length-2][0]:null}:null;};
const macYm=ym=>{const[y,m]=ym.split('-');return['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'][+m-1]+' '+y;};
const macMean=a=>a.reduce((x,y)=>x+y,0)/a.length,macSd=a=>{const m=macMean(a);return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/(a.length-1));};
function macOls(y,x){const n=y.length;if(n<6)return{b:NaN,r2:NaN,n};const my=macMean(y),mx=macMean(x);let c=0,v=0,t=0;for(let i=0;i<n;i++){c+=(x[i]-mx)*(y[i]-my);v+=(x[i]-mx)**2;t+=(y[i]-my)**2;}
  const b=c/v;return{b,r2:t?c*c/(v*t):NaN,n};}
function macP(){const P=S.cm.p;if(P.gsBound===undefined)P.gsBound=2;if(P.gsLead===undefined)P.gsLead=1.5;if(P.gsBetaWin===undefined)P.gsBetaWin=60;return P;}

/* Moteur or / argent : ratio et Z-scores 20 / 60 j, bêta glissant de l'argent sur l'or, impulsion relative (Silver Lead Indicator), drapeau FOMO */
function gsEngine(C){const s=C.s,P=macP(),bw=+P.gsBetaWin||60,o=[];
  for(let i=0;i<s.d.length;i++)if(nn(s.gold[i])&&nn(s.silver[i]))o.push({d:s.d[i],g:s.gold[i],s:s.silver[i]});
  const n=o.length,r=o.map(x=>x.g/x.s),lg=o.map((x,i)=>i?Math.log(x.g/o[i-1].g):null),ls=o.map((x,i)=>i?Math.log(x.s/o[i-1].s):null);
  const z=(a,i,w)=>{if(i<w-1)return NaN;const W=a.slice(i-w+1,i+1);return(a[i]-macMean(W))/macSd(W);};
  const beta=o.map((_,i)=>{if(i<bw)return NaN;const G=lg.slice(i-bw+1,i+1),Sv=ls.slice(i-bw+1,i+1);return macOls(Sv,G).b;});
  const ex=o.map((x,i)=>i>=20&&isFinite(beta[i])?Math.log(x.s/o[i-20].s)-beta[i]*Math.log(x.g/o[i-20].g):NaN);
  const lead=o.map((_,i)=>{const W=ex.slice(Math.max(0,i-119),i+1).filter(isFinite);return W.length>=40&&isFinite(ex[i])?clamp((ex[i]-macMean(W))/macSd(W),-4,4):NaN;});
  const mz=(lr,i)=>{if(i<120)return NaN;const W=lr.slice(i-119,i+1),sdd=macSd(W);let m=0;for(let j=i-19;j<=i;j++)m+=lr[j];return m/(sdd*Math.sqrt(20));};
  const R=o.map((x,i)=>({d:x.d,g:x.g,s:x.s,ratio:r[i],z20:z(r,i,20),z60:z(r,i,60),beta:beta[i],lead:lead[i],zG:mz(lg,i),zS:mz(ls,i)}));
  const L=R[n-1]||{},bound=+P.gsBound||2,th=+P.gsLead||1.5;
  /* Soutien fondamental : cuivre (métaux industriels) et taux réel 10 ans, dernières publications mensuelles */
  const cu=macLast('cu'),ry=macLast('ry'),cuCh=cu&&cu.prev?cu.v/cu.prev-1:NaN,ryCh=ry&&nn(ry.prev)?ry.v-ry.prev:NaN;
  const dir=Math.abs(L.zS)>=Math.abs(L.zG)?Math.sign(L.zS):Math.sign(L.zG),out=Math.abs(L.zG)>bound||Math.abs(L.zS)>bound;
  const supInd=isFinite(cuCh)&&Math.sign(cuCh)===dir,supRy=isFinite(ryCh)&&Math.sign(-ryCh)===dir,sup=supInd||supRy;
  const flag=!out?['ok','Mouvement dans la borne statistique','|Z 20 j| or '+nf(Math.abs(L.zG),2)+' et argent '+nf(Math.abs(L.zS),2)+' sous la borne ±'+nf(bound,1)]
    :sup?['am','Mouvement hors borne, soutenu par les fondamentaux',(supInd?'cuivre '+sgn(cuCh*100,1)+' sur le dernier mois publié':'')+(supInd&&supRy?' et ':'')+(supRy?'taux réel 10 ans '+(ryCh<0?'en baisse':'en hausse')+' de '+nf(Math.abs(ryCh)*100,0)+' pb':'')]
    :['ko','🔴 Mouvement FOMO / spéculatif sans support fondamental',`${dir>0?'hausse':'baisse'} hors borne ±${nf(bound,1)} alors que le cuivre (${isFinite(cuCh)?sgn(cuCh*100,1):'n.d.'}) et le taux réel 10 ans (${isFinite(ryCh)?sgn(ryCh*100,0)+' pb':'n.d.'}) ne la confirment pas`];
  const lag=!isFinite(L.lead)?['','Données insuffisantes']:L.lead>th&&Math.abs(L.zG)<1?['ok',"Silver lead haussier : l'argent amorce une rupture avant que l'or n'ait ajusté"]
    :L.lead<-th&&Math.abs(L.zG)<1?['ko',"Silver lead baissier : l'argent décroche avant l'or"]
    :Math.abs(L.zG)>th&&Math.abs(L.lead)<0.5?['am',"Or en tête : l'argent n'a pas encore suivi le mouvement de l'or"]
    :L.lead>th?['ok','Argent en surperformance relative, or déjà en mouvement']:L.lead<-th?['ko','Argent en sous-performance relative, or déjà en mouvement']:['','Pas de divergence significative'];
  return{R,L,flag,lag,cu,ry,cuCh,ryCh,bound,th,bw};}

/* Sensibilité mensuelle aux surprises macro : rendement du mois de publication régressé sur la variation de l'indicateur */
function gsMacroBeta(C){const s=C.s,me={};s.d.forEach((d,i)=>{const ym=d.slice(0,7);if(nn(s.gold[i])&&nn(s.silver[i]))me[ym]={g:s.gold[i],s:s.silver[i]};});
  const ms=Object.keys(me).sort(),ret={};ms.forEach((m,i)=>{if(i)ret[m]={g:me[m].g/me[ms[i-1]].g-1,s:me[m].s/me[ms[i-1]].s-1};});
  const nx=ym=>{const[y,m]=ym.split('-').map(Number);return m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`;};
  const reg=k=>{const X=MACRO[k],Y=Object.keys(X).sort(),G=[],Sv=[],D=[];
    Y.forEach((ym,i)=>{if(!i)return;const pm=Y[i-1];if(!(+ym.slice(0,4)*12+ +ym.slice(5)-(+pm.slice(0,4)*12+ +pm.slice(5))===1))return;const pub=k==='cpi'||k==='ppi'?nx(ym):ym,r=ret[pub];if(!r)return;D.push(X[ym]-X[pm]);G.push(r.g);Sv.push(r.s);});
    const bg=macOls(G,D),bs=macOls(Sv,D);return{bg,bs,rel:bs.b/bg.b,n:D.length};};
  return{cpi:reg('cpi'),ppi:reg('ppi'),ff:reg('ff'),ry:reg('ry'),from:ms[1],to:ms[ms.length-1]};}

/* Jauge d'impulsion relative (−3 à +3) */
function gsGauge(v,th){const W=220,H=124,cx=110,cy=110,r=92,a=x=>Math.PI*(1-(clamp(x,-3,3)+3)/6),pt=(x,R)=>[cx+R*Math.cos(a(x)),cy-R*Math.sin(a(x))];
  const arc=(x0,x1,c)=>{const[p0,q0]=pt(x0,r),[p1,q1]=pt(x1,r);return`<path d="M${p0} ${q0} A${r} ${r} 0 0 1 ${p1} ${q1}" stroke="${c}" stroke-width="12" fill="none"/>`;};
  const[nx,ny]=isFinite(v)?pt(v,r-18):[cx,cy-r+18];
  return`<svg viewBox="0 0 ${W} ${H}" class="gauge" role="img" aria-label="Silver Lead Indicator ${isFinite(v)?nf(v,2):'indisponible'}">${arc(-3,-th,'var(--down)')}${arc(-th,th,'var(--line2)')}${arc(th,3,'var(--up)')}
    <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="var(--hi)" stroke-width="2.5"/><circle cx="${cx}" cy="${cy}" r="4" fill="var(--hi)"/>
    <text x="${cx}" y="${cy-30}" text-anchor="middle" class="gv">${isFinite(v)?sgn(v,2).replace('%',''):'—'}</text>
    <text x="14" y="${H-2}" class="ax">−3 or en tête</text><text x="${W-14}" y="${H-2}" class="ax" text-anchor="end">argent en tête +3</text></svg>`;}

/* Puces du graphique principal (V8.1) */
CM_OV.push(
  {k:'cpi',c:MAC_C.cpi,l:()=>'CPI / PPI YoY',series:C=>{const d0=C.s.d[0];return[{c:MAC_C.cpi,t:'CPI glissement annuel (%)',data:macM('cpi').filter(p=>p.time>=d0)},{c:MAC_C.ppi,t:'PPI demande finale (%)',data:macM('ppi').filter(p=>p.time>=d0)}];}},
  {k:'ff',c:MAC_C.ff,l:()=>'Fed Funds Rate',series:C=>{const d0=C.s.d[0];return[{c:MAC_C.ff,t:'Fed Funds effectif (%)',w:2,data:macM('ff').filter(p=>p.time>=d0)},{c:MAC_C.ry,t:'Taux réel 10 ans (%)',ls:2,data:macM('ry').filter(p=>p.time>=d0)}];}},
  {k:'wasde',c:MAC_C.corn,l:()=>'WASDE Stock/Use Ratio',series:()=>{const W=MACRO.wasde,d=W.date;return[['corn','Maïs'],['soy','Soja'],['wheat','Blé'],['cotton','Coton']].map(([k,l])=>({c:MAC_C[k],t:`${l} US stocks/emplois ${nf(W.us[k].cur[0]/W.us[k].cur[1]*100,1)} % (WASDE ${fdate(d)})`,data:[{time:d,value:+(W.us[k].cur[0]/W.us[k].cur[1]*100).toFixed(2)}]}));}},
  {k:'gsb',c:MAC_C.lead,l:()=>'Beta XAU/XAG & Lead Impulse',series:C=>{const E=gsEngine(C),P=macP();return[{c:MAC_C.beta,t:`Bêta argent / or ${E.bw} j`,data:E.R.filter(x=>isFinite(x.beta)).map(x=>({time:x.d,value:+x.beta.toFixed(3)}))},
    {c:MAC_C.lead,t:'Silver Lead Indicator (z)',w:2,lines:[[+P.gsLead,TVC.up],[-P.gsLead,TVC.down]],data:E.R.filter(x=>isFinite(x.lead)).map(x=>({time:x.d,value:+x.lead.toFixed(3)}))}];}});

/* Bandeau de couverture des séries (remplace l'ancien avis de trou de données) */
function cmGapNote(lastD,P){const s=cmSeries(),lst=k=>{for(let i=s.d.length-1;i>=0;i--)if(nn(s[k][i]))return s.d[i];return null;};
  const fF=k=>s.d.filter((d,i)=>d>='2026-06-18'&&nn(s[k][i])),bF=fF('brentF');
  return`<div class="card s12 msg"><b style="color:var(--hi)">Séries actualisées jusqu'au ${fdate(lastD)}</b> · comptant or et argent EODHD jusqu'au ${fdate(lst('gold'))} · Brent daté et WTI Cushing FRED / EIA jusqu'au ${fdate(lst('brent'))} (publication EIA décalée de quelques jours). Contrats à terme M1 (Investing.com) : ${bF.length?`${bF.length} séances du ${fdate(bF[0])} au ${fdate(bF[bF.length-1])}`:'aucune séance récente'}, les basis spot − futur ne sont calculés que sur cette fenêtre. USD/CNH arrêté au ${fdate(lst('cnh'))} : les corrélations CNH ne sont plus calculées au-delà (importer un export pour compléter). Fenêtres longues (Z-score ${P.zWin} j, corrélations ${P.cM} j) : à lire avec ces trous.</div>`;}

function macCards(C){const a=ui.cmA||'brent',E=gsEngine(C),B=gsMacroBeta(C),L=E.L,P=macP(),W=MACRO.wasde,F=MACRO.sep;
  const cpi=macLast('cpi'),ppi=macLast('ppi'),ff=macLast('ff'),ry=macLast('ry');
  const k=(l,v,d,c)=>`<div class="stat"><div class="k">${l}</div><div class="x ${c||''}">${v}</div><div class="d">${d||''}</div></div>`;
  const bt=(lab,r,u)=>`<tr><td>${lab}</td><td class="n">${isFinite(r.bg.b)?nf(r.bg.b*100,2):'—'}</td><td class="n">${isFinite(r.bs.b)?nf(r.bs.b*100,2):'—'}</td><td class="n">${isFinite(r.rel)?nf(r.rel,2)+' ×':'—'}</td><td class="n">${isFinite(r.bs.r2)?nf(r.bs.r2,2):'—'}</td><td class="n">${r.n}</td><td class="meta">${u}</td></tr>`;
  const su=(x)=>x[0]/x[1]*100,arrow=(p,c)=>{const d=c-p;return Math.abs(d)<0.05?'=':(d>0?'▲ ':'▼ ')+nf(Math.abs(d),1)+' pt';};
  const gs=a!=='brent'?`<div class="card s12" id="gs-eng"><h2><span>Sensibilité & propulsion relative or / argent <span class="meta">anti-FOMO · séance du ${fdate(L.d)}</span></span><span class="tag ${E.flag[0]}">${esc(E.flag[1].replace('🔴 ',''))}</span></h2>
    <div class="grid" style="gap:12px">
      <div class="s4" style="min-width:0;text-align:center">${gsGauge(L.lead,E.th)}<div class="meta">Silver Lead Indicator : impulsion 20 j de l'argent au-delà de ce qu'explique son bêta à l'or, en écarts-types sur 120 séances</div></div>
      <div class="s8" style="min-width:0"><div class="stats">
        ${k('Ratio XAU / XAG',nf(L.ratio,1),'or '+nf(L.g,0)+' · argent '+nf(L.s,2))}
        ${k('Z-score ratio 20 j',nf(L.z20,2),Math.abs(L.z20)>2?'extrême':Math.abs(L.z20)>1?'tendu':'normal',Math.abs(L.z20)>2?'down':'')}
        ${k('Z-score ratio 60 j',nf(L.z60,2),Math.abs(L.z60)>2?'extrême':Math.abs(L.z60)>1?'tendu':'normal',Math.abs(L.z60)>2?'down':'')}
        ${k(`Bêta argent / or ${E.bw} j`,nf(L.beta,2),"amplification de l'argent pour 1 % sur l'or")}
        ${k('Impulsion 20 j or (z)',nf(L.zG,2),Math.abs(L.zG)>E.bound?'hors borne':'dans la borne',Math.abs(L.zG)>E.bound?'down':'')}
        ${k('Impulsion 20 j argent (z)',nf(L.zS,2),Math.abs(L.zS)>E.bound?'hors borne':'dans la borne',Math.abs(L.zS)>E.bound?'down':'')}
      </div>
      <div class="dec" style="grid-template-columns:1fr 1fr;margin-top:8px">
        <div class="dc"><span class="dot ${E.lag[0]}"></span><div><b>Signal lead / lag</b><span>${esc(E.lag[1])}</span></div></div>
        <div class="dc"><span class="dot ${E.flag[0]}"></span><div><b>${esc(E.flag[1])}</b><span>${esc(E.flag[2])}</span></div></div>
      </div></div>
      <div class="s12" style="min-width:0"><div class="tw"><table class="tbl"><thead><tr><th>Sensibilité mensuelle (${macYm(B.from)} à ${macYm(B.to)})</th><th class="n">Or, % par unité</th><th class="n">Argent, % par unité</th><th class="n">Argent / or</th><th class="n">R² argent</th><th class="n">Mois</th><th>Unité du choc</th></tr></thead><tbody>
        ${bt('Surprise CPI (variation du glissement annuel)',B.cpi,'+1 pt de CPI YoY')}${bt('Surprise PPI (variation du glissement annuel)',B.ppi,'+1 pt de PPI YoY')}${bt('Fed Funds effectif',B.ff,'+1 pt de taux')}${bt('Taux réel 10 ans (TIPS)',B.ry,'+1 pt de taux réel')}
      </tbody></table></div>
      <p class="note">Bêtas MCO du rendement mensuel sur la variation de l'indicateur ; CPI et PPI sont rapportés au mois de leur publication (M+1). Échantillon court (${B.cpi.n} à ${B.ry.n} mois, CPI d'octobre 2025 non publié) : à lire comme un ordre de grandeur, pas comme une loi. Le consensus des économistes n'étant pas une donnée publique gratuite, la « surprise » est la variation mensuelle du chiffre publié.
      Borne statistique ±${fld('cm.p.gsBound','n',{al:'Borne statistique (z)'})} · seuil lead ±${fld('cm.p.gsLead','n',{al:'Seuil Silver Lead'})} · fenêtre du bêta ${fld('cm.p.gsBetaWin','n',{al:'Fenêtre du bêta (j)'})} j. Soutien fondamental : cuivre ${E.cu?macYm(E.cu.ym):'n.d.'} (FMI via FRED), taux réel ${E.ry?macYm(E.ry.ym):'n.d.'} (FRED DFII10).</p></div>
    </div></div>`:'';
  const mac=`<div class="card s12"><h2><span>Inflation & politique monétaire <span class="meta">FRED, Fed</span></span></h2><div class="stats">
      ${k('CPI glissement annuel',nf(cpi.v,2)+' %',macYm(cpi.ym)+(nn(cpi.prev)?' · '+(cpi.v>=cpi.prev?'▲ ':'▼ ')+nf(Math.abs(cpi.v-cpi.prev),2)+' pt':''),cpi.v>cpi.prev?'down':'up')}
      ${k('PPI demande finale',nf(ppi.v,2)+' %',macYm(ppi.ym)+(nn(ppi.prev)?' · '+(ppi.v>=ppi.prev?'▲ ':'▼ ')+nf(Math.abs(ppi.v-ppi.prev),2)+' pt':''),ppi.v>ppi.prev?'down':'up')}
      ${k('Fed Funds effectif',nf(ff.v,2)+' %',macYm(ff.ym)+' · cible '+F.target)}
      ${k('Taux réel 10 ans',nf(ry.v,2)+' %',macYm(ry.ym)+' (moyenne mensuelle)')}
    </div>
    <div class="tw"><table class="tbl"><thead><tr><th>Médiane FOMC (taux directeur fin d'année)</th>${['2026','2027','2028','2029','LR'].map(y=>`<th class="n">${y==='LR'?'Long terme':y}</th>`).join('')}</tr></thead><tbody>
      <tr><td>Septembre 2026</td>${['2026','2027','2028','2029','LR'].map(y=>`<td class="n">${nf(F.med[y],1)} %</td>`).join('')}</tr>
      <tr><td class="meta">Juin 2026</td>${['2026','2027','2028','2029','LR'].map(y=>`<td class="n meta">${F.jun[y]!==undefined?nf(F.jun[y],1)+' %':'—'}</td>`).join('')}</tr>
      <tr><td class="meta">Fourchette des participants</td>${['2026','2027','2028','2029','LR'].map(y=>`<td class="n meta">${nf(F.range[y][0],1)}–${nf(F.range[y][1],1)}</td>`).join('')}</tr></tbody></table></div>
    <p class="note">Dernière décision : ${esc(F.decision)} (cible ${F.target}). Inflation PCE projetée ${nf(F.pce[2026],1)} % en 2026, cœur ${nf(F.core[2026],1)} %. Sources : ${esc(MACRO.src.cpi)} ; ${esc(MACRO.src.ppi)} ; ${esc(MACRO.src.ff)} ; <a href="${F.url}" target="_blank" rel="noopener">${esc(F.src)}</a>. ${MACRO.gaps.map(esc).join(' · ')}. Probabilités de marché type FedWatch (CME) : non diffusées gratuitement, non reprises.</p></div>`;
  const crops=[['corn','Maïs'],['soy','Soja'],['wheat','Blé'],['cotton','Coton']];
  const was=`<div class="card s12"><h2><span>WASDE : bilans 2026/27 <span class="meta">USDA, rapport du ${fdate(W.date)}</span></span></h2>
    <div class="tw"><table class="tbl"><thead><tr><th>Culture</th><th class="n">Stocks / emplois US</th><th class="n">Révision</th><th class="n">2025/26</th><th class="n">Stocks / emplois monde</th><th class="n">Rendement US</th></tr></thead><tbody>
      ${crops.map(([c,l])=>{const u=W.us[c],w=W.world[c];return`<tr><td>${l}<div class="meta">stocks ${nf(u.cur[0],u.u==='M balles'?2:0)} ${u.u} · export ${nf(u.exp[1],u.u==='M balles'?2:0)}</div></td><td class="n"><b>${nf(su(u.cur),1)} %</b></td><td class="n ${su(u.cur)>su(u.prev)?'down':su(u.cur)<su(u.prev)?'up':''}">${arrow(su(u.prev),su(u.cur))}</td><td class="n meta">${nf(su(u.y25),1)} %</td><td class="n">${nf(su(w.cur),1)} % <span class="meta">${arrow(su(w.prev),su(w.cur))}</span></td><td class="n">${u.yld?nf(u.yld[1],1)+' bu/ac':'—'}</td></tr>`;}).join('')}
    </tbody></table></div>
    <p class="note">Ratio stocks de fin / emplois totaux (consommation intérieure + exportations) ; révision par rapport au rapport de septembre (hausse du ratio = offre plus confortable, baissière pour les prix). ${esc(W.note)} <a href="${W.url}" target="_blank" rel="noopener">${esc(W.src)}</a>. Le rapport de novembre n'était pas encore en ligne le ${fdate(MACRO.asof)} : l'ingestion IA du volet 5 (bouton Recalculer) le reprendra à sa publication.</p></div>`;
  return gs+mac+was;}
function macInject(){const el=document.getElementById('p-cm');if(!el||!el.firstElementChild)return;const C=cmCalc(),html=macCards(C),ch=document.getElementById('cm-ch'),card=ch&&ch.closest('.card');
  if(card)card.insertAdjacentHTML('afterend',html);else el.firstElementChild.insertAdjacentHTML('beforeend',html);}
{const _rcm=renderCM;renderCM=function(){_rcm.apply(this,arguments);try{macInject();}catch(e){console.error('macInject',e);}};}
