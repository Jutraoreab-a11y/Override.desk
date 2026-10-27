/* ============ Volet 5 : Commodities & flows ============ */
const CM_ASSETS={brent:'Brent',wti:'WTI',gold:'Or',silver:'Argent'};
const CM_INST={brent:'Brent spot',wti:'WTI spot',brentF:'Brent futur M1',gold:'Or spot',goldF:'Or futur',silver:'Argent spot',silverF:'Argent contrat',cnh:'USD/CNH',spx:'S&P 500'};
function cmP(){return S.cm.p;}
const cmStrip=t=>String(t||'').replace(/^[^\p{L}\p{N}]+/u,'').replace(/\s+/g,' ').trim();
function cmCls(t){const u=String(t||'').toUpperCase();
  if(!t||/NO DATA|MANQUE/.test(u))return'';
  if(/GÉOPOLITIQUE|NEUTRE|TENSION|ATTENTION|PIVOT|FLUX TENDUS|PARITÉ|CONVERGENCE|MODÉRÉ|SERRÉ|FLAT|STANDARD|SAINE \(|STRUCTURE SAINE/.test(u)&&!/BUY NOW|SELL NOW/.test(u))return'am';
  if(/SELL|VENTE|ALERTE|CAPITULATION|RUPTURE|PANIQUE|BLOCAGE|BAISSIER|BAISSIÈRE|CRITIQUE|DISTRIBUTION|SURCHAUFFE|EXTRÊME|SURCHARGE|PRESSION SUR|FAIBLESSE|BAISSE SAINE/.test(u))return'ko';
  if(/BUY|ACHAT|HAUSSE|ACCUMULATION|RÉSILIENCE|SAIN|HAUSSIER|BON/.test(u))return'ok';
  return'am';}
/* Fusion des séries du classeur et des imports CSV */
function cmSeries(){
  const add=S.cm.add||{},keys=Object.keys(CM_INST),map={};
  keys.forEach(k=>{const m=new Map();CMD.d.forEach((d,i)=>{const c=CMD[k+'C'][i];if(c!==null)m.set(d,[c,CMD[k+'O']?CMD[k+'O'][i]:null,CMD[k+'V']?CMD[k+'V'][i]:(k==='spx'?CMD.spxV[i]:null)]);});
    Object.entries(add[k]||{}).forEach(([d,r])=>m.set(d,r));map[k]=m;});
  const d=[...map.brent.keys()].sort();
  const col=(k,j)=>d.map(x=>{const r=map[k].get(x);return r?r[j]:null;});
  const s={d};keys.forEach(k=>{s[k]=col(k,0);s[k+'O']=col(k,1);s[k+'V']=col(k,2);});return s;
}
const win=(a,i,n)=>a.slice(Math.max(0,i-n+1),i+1).filter(v=>v!==null&&isFinite(v));
function mean(a){return a.length?sum(a)/a.length:NaN;}
function sd(a){if(a.length<2)return NaN;const m=mean(a);return Math.sqrt(sum(a.map(v=>(v-m)**2))/(a.length-1));}
function corr(x,y,i,n){const X=[],Y=[];for(let j=Math.max(0,i-n+1);j<=i;j++){if(x[j]!==null&&y[j]!==null){X.push(x[j]);Y.push(y[j]);}}if(X.length<3)return NaN;const mx=mean(X),my=mean(Y);let a=0,b=0,c=0;X.forEach((v,j)=>{a+=(v-mx)*(Y[j]-my);b+=(v-mx)**2;c+=(Y[j]-my)**2;});return a/Math.sqrt(b*c);}
function zAt(a,i,n){if(a[i]===null)return NaN;const w=win(a,i,n);return(a[i]-mean(w))/sd(w);}
function pctRank(a,i,n){if(a[i]===null)return NaN;const w=win(a,i,n);if(w.length<2)return NaN;return w.filter(v=>v<a[i]).length/(w.length-1);}
const nn=v=>v!==null&&isFinite(v);
function cmCalc(){
  const s=cmSeries(),P=cmP(),N=s.d.length,R=[];
  const spread=s.d.map((_,i)=>nn(s.brent[i])&&nn(s.wti[i])?s.brent[i]-s.wti[i]:null);
  const bB=s.d.map((_,i)=>nn(s.brent[i])&&nn(s.brentF[i])?s.brent[i]-s.brentF[i]:null);
  const bS=s.d.map((_,i)=>nn(s.silver[i])&&nn(s.silverF[i])?s.silver[i]-s.silverF[i]:null);
  const bG=s.d.map((_,i)=>nn(s.gold[i])&&nn(s.goldF[i])?s.gold[i]-s.goldF[i]:null);
  const silDist=s.d.map((_,i)=>nn(s.silver[i])?s.silver[i]-mean(win(s.silver,i,20)):null);
  for(let i=0;i<N;i++){const p=i-1,r={i,d:s.d[i]};
    r.spread=spread[i];r.bB=bB[i];r.bS=bS[i];r.bG=bG[i];
    const x=r.spread;
    r.spSt=!nn(x)?'NO DATA':x>=-10&&x<=0?'Risque logistique US':x>0&&x<=3?'Moyen':x>3&&x<=6?'Bon':x>6&&x<=10?'Attention':x>10&&x<=15?'Situation critique':'Panique';
    r.spRk=!nn(x)?'':x>=-10&&x<=0?"BLOCAGE LOGISTIQUE US : le brut américain reste coincé localement. L'approvisionnement mondial dépend entièrement du Brent.":x>0&&x<=3?"FLUX TENDUS US : l'offre américaine est insuffisante pour soulager le marché mondial. Le Brent compense.":x>3&&x<=6?"APPROVISIONNEMENT SAIN : arbitrage fluide. Le marché mondial s'approvisionne correctement.":x>6&&x<=10?"PRESSION SUR L'OFFRE : l'approvisionnement global se tend. Le Brent surperforme le WTI (risque géopolitique majeur).":x>10&&x<=15?"SURCHARGE D'ARBITRAGE : le Brent est devenu trop cher par rapport au WTI. Risque de blocage de la demande mondiale.":"RUPTURE DE FLUX : panique sur les approvisionnements. Le marché physique mondial est déconnecté.";
    const e=r.bB,ep=p>=0?bB[p]:null;
    r.bBSt=!nn(e)?'NO DATA':e>=-30&&e<=0?'Contango':e>0&&e<=1?'Flat / légère backwardation':e>1&&e<=3?'Backwardation modérée':e>3&&e<=6?'Forte backwardation':e>6?'Backwardation de crise':'';
    r.bBRk=!nn(e)?'':e<0?"CONTANGO : surplus de pétrole, le stockage coûte cher. Si le Yuan est faible, signal de vente puissant.":e<=1.5?(nn(ep)&&e<ep?"CONTANGO SERRÉ : le spread se resserre vers l'équilibre. Base saine, hausse très probable.":"BACKWARDATION SAINE : équilibre dynamique. La demande est présente sans être paniquée."):e<=3.5?"BACKWARDATION FORTE : demande physique dominante. Le marché a besoin de barils maintenant. Signal baissier.":e<=6?"SURCHAUFFE PHYSIQUE : tension extrême sur les livraisons. Prix fragile, trop cher pour les raffineurs. Signal baissier si Yuan fort.":"RUPTURE / PANIQUE : pénurie réelle ou peur irrationnelle. Risque de retournement baissier violent par destruction de la demande.";
    const h=r.bS;
    r.bSSt=!nn(h)?'NO DATA':h<-.15?'Contango extrême':h<0?'Contango standard':h===0?'Parité sans arbitrage':h<=.08?'Tension':'Panique : backwardation critique';
    r.bSRk=!nn(h)?'':h<-.15?"Stockage saturé (opportunité d'arbitrage cash & carry)":h<0?'Structure saine (marché normalement approvisionné)':h===0?'Convergence parfaite spot / futur':h<=.08?'Backwardation initiale (demande physique en hausse à court terme)':'Backwardation critique (pénurie de métal physique, crise de liquidité)';
    const k=r.bG;
    r.bGSt=!nn(k)?'NO DATA':k<-8?'Contango extrême':k<0?'Contango standard':k===0?'Parité sans arbitrage':k<=4?'Tension':'Panique macro';
    r.bGRk=!nn(k)?'':k<-8?"Surcharge de portage (opportunité d'arbitrage cash & carry)":k<0?'Structure saine (marché normalement approvisionné)':k===0?'Convergence parfaite spot / futur':k<=4?'Prime sur le physique (stress bancaire)':'Backwardation critique (fuite vers le physique, crise systémique)';
    /* Confirmation Brent */
    r.zSp=zAt(spread,i,+P.zWin);r.pct=pctRank(spread,i,+P.pctWin);
    r.cC20=corr(s.brent,s.cnh,i,+P.cS);r.cC60=corr(s.brent,s.cnh,i,+P.cM);r.cWB=corr(s.brent,s.wti,i,+P.cS);
    const g=r.zSp;
    r.sigStruct=!nn(g)?'NO DATA':g>2?'RETOURNEMENT BAISSIER : Brent en surchauffe statistique (> +2). Risque de correction.':g<-2?"RETOURNEMENT HAUSSIER : Brent en capitulation statistique (< −2). Opportunité d'achat.":Math.abs(g)<=.75?'ZONE NEUTRE : le prix est proche de sa moyenne. Pas de signal.':g>0?'TENDANCE HAUSSIÈRE : flux acheteur modéré.':'TENDANCE BAISSIÈRE : flux vendeur modéré.';
    const B=s.brent[i],Bp=p>=0?s.brent[p]:null,D=s.cnh[i],Dp=p>=0?s.cnh[p]:null;
    r.sigChine=!(nn(B)&&nn(D)&&nn(r.spread)&&nn(r.bB)&&nn(Bp)&&nn(Dp))?'NO DATA':B>Bp&&D>=Dp?'BUY GÉOPOLITIQUE : le Brent monte mais le Yuan stagne ou baisse. Hausse non soutenue par la Chine.':B<Bp&&D<Dp&&(r.spread>8||r.bB>3)?'SELL PRESSION TECHNIQUE : le Yuan monte mais le Brent chute. Pression des spreads (WTI-Brent / basis) trop forte.':B>Bp&&D<Dp?'BUY NOW SOUTIEN CHINE : hausse saine. Le Yuan se renforce et tire le prix vers le haut.':B<Bp&&D>Dp?'SELL NOW FAIBLESSE ÉCO : le Yuan chute et le pétrole capitule. Ralentissement global.':'NEUTRE : flux équilibrés.';
    /* Confirmation Or / Argent */
    const Gd=s.gold[i],Gp=p>=0?s.gold[p]:null,Sv=s.silver[i];
    r.gs=nn(Gd)&&nn(Sv)?Gd/Sv:NaN;r.gb=nn(Gd)&&nn(B)?Gd/B:NaN;r.cCG=corr(s.gold,s.cnh,i,+P.cS);r.zG=zAt(s.gold,i,+P.zWin);
    r.perf=nn(s.goldV[i])&&nn(s.spxV[i])?(s.goldV[i]-s.spxV[i])*100:NaN;
    r.sigGold=!(nn(Gd)&&nn(D)&&nn(Gp)&&nn(Dp))?'NO DATA':D<Dp&&Gd>Gp?"ACHAT FONDAMENTAL : le Yuan se renforce, l'or monte. Demande réelle solide.":D>=Dp&&Gd>Gp?"RÉSILIENCE : l'or monte malgré un Yuan faible. Forte pression acheteuse hors Chine.":D>Dp&&Gd<Gp?"VENTE MACRO : le Yuan s'affaiblit, l'or capitule. Perte de pouvoir d'achat.":D<=Dp&&Gd<Gp?"ALERTE ROUGE : le Yuan est fort mais l'or baisse. Faiblesse interne critique ou arbitrage de taux.":'NEUTRE';
    const H=r.zG,J=r.perf;
    r.sigGoldSt=!(nn(H)&&nn(J))?'NO DATA':H>1.5?(J<0?'DISTRIBUTION (vente institutionnelle)':'SURCHAUFFE (euphorie)'):H<-1.5?(J>0?'ACCUMULATION (achat institutionnel)':'CAPITULATION (panique)'):Math.abs(H)<.75?'PIVOT / NEUTRE':J>0?'HAUSSE SAINE':'BAISSE SAINE';
    r.zS=zAt(s.silver,i,20);r.sDist=silDist[i];const sdp=p>=0?silDist[p]:null;
    r.sigSilver=!(nn(r.zS)&&nn(r.sDist))?'NO DATA':r.zS>1.7?(r.sDist<0?'SELL NOW DISTRIBUTION ARGENT':'BUY NOW EUPHORIE ARGENT'):r.zS<-1.7?(nn(sdp)&&sdp>0?'ATTENTION BUY : ACCUMULATION ARGENT si USD faible':'SELL : CAPITULATION ARGENT si USD fort'):Math.abs(r.zS)<.75?'NEUTRE ARGENT':r.sDist>0?'BUY NOW : HAUSSE SAINE ARGENT':'SELL NOW : BAISSE SAINE ARGENT';
    R.push(r);}
  return{s,R,N};
}
function cmCorrLab(v){const P=cmP();return!nn(v)?'—':Math.abs(v)>P.cStrong?'forte':Math.abs(v)>P.cMod?'modérée':'faible';}
function cmImport(txt,inst){
  const L=txt.replace(/\r/g,'').split('\n').filter(x=>x.trim());if(L.length<2)return 0;
  const sep=L[0].includes(';')?';':',',split=l=>{const o=[];let cur='',q=false;for(const ch of l){if(ch==='"'){q=!q;continue;}if(ch===sep&&!q){o.push(cur);cur='';}else cur+=ch;}o.push(cur);return o.map(x=>x.trim());};
  const h=split(L[0]).map(x=>x.toLowerCase()),ix=(...k)=>h.findIndex(x=>k.some(y=>x.startsWith(y)));
  const iD=Math.max(0,ix('date')),iC=ix('dernier','price','close','clôture'),iO=ix('ouv','open'),iV=ix('variation','change');
  const num=v=>{v=String(v||'').replace(/\s/g,'').replace('%','');if(/\d,\d/.test(v)&&v.includes('.'))v=v.replace(/\./g,'');return parseFloat(v.replace(',','.'));};
  const dt=v=>{let m=String(v).match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);if(m)return`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[0]:null;};
  S.cm.add=S.cm.add||{};S.cm.add[inst]=S.cm.add[inst]||{};let n=0;
  L.slice(1).forEach(l=>{const c=split(l),d=dt(c[iD]),v=num(c[iC<0?1:iC]);if(!d||!isFinite(v))return;const o=iO>=0?num(c[iO]):NaN,va=iV>=0?num(c[iV])/100:NaN;S.cm.add[inst][d]=[v,isFinite(o)?o:null,isFinite(va)?va:null];n++;});
  return n;
}
function renderCM(){
  const C=cmCalc(),{s,R,N}=C,a=ui.cmA||'brent',tab=ui.cmT||'t',last=R[N-1],E=ui.edit,P=cmP();
  const li=(()=>{for(let i=N-1;i>=0;i--)if(s[a][i]!==null)return i;return N-1;})(),r=R[li];
  const px=s[a][li],pv=s[a+'V'][li],lastD=s.d[N-1],age=Math.round((new Date()-new Date(lastD+'T00:00:00'))/864e5);
  const fd=d=>new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});
  const ind={brent:['Basis Brent (spot − M1)','bB','bBSt','bBRk'],wti:['Spread Brent − WTI','spread','spSt','spRk'],gold:['Basis Or (spot − futur)','bG','bGSt','bGRk'],silver:['Basis Argent (spot − contrat)','bS','bSSt','bSRk']}[a];
  const sigMain=a==='brent'||a==='wti'?r.sigChine:a==='gold'?r.sigGold:r.sigSilver,sigStruct=a==='brent'||a==='wti'?r.sigStruct:a==='gold'?r.sigGoldSt:'';
  const tag=t=>`<span class="tag ${cmCls(t)}">${esc(cmStrip(t).split(' : ')[0])}</span>`;
  const nRows=ui.cmAll?N:Math.min(N,60),rows=R.slice(-nRows).reverse();
  let table,chartId='cm-ch',chartMake;
  if(tab==='t'){
    table=`<table class="tbl fin"><thead><tr><th>Date</th><th class="n">Ouv.</th><th class="n">En cours</th><th class="n">Ferm. (veille)</th><th class="n">Var.</th><th class="n">${ind[0]}</th><th>État du marché</th><th>Risque et interprétation</th></tr></thead><tbody>${rows.map(x=>{const i=x.i,prev=(()=>{for(let j=i-1;j>=0;j--)if(s[a][j]!==null)return s[a][j];return null;})();return`<tr><td>${fd(x.d)}</td><td class="n">${nf(s[a+'O'][i],2)}</td><td class="n">${nf(s[a][i],2)}</td><td class="n">${nf(prev,2)}</td><td class="n ${nn(s[a+'V'][i])?cls(s[a+'V'][i]):''}">${nn(s[a+'V'][i])?sgn(s[a+'V'][i]*100,2):'—'}</td><td class="n">${nf(x[ind[1]],2)}</td><td>${x[ind[2]]==='NO DATA'?'<span class="meta">pas de donnée</span>':`<span class="tag ${cmCls(x[ind[3]])}">${esc(x[ind[2]])}</span>`}</td><td class="wrap">${esc(x[ind[3]])}</td></tr>`;}).join('')}</tbody></table>`;
    chartMake=el=>{const ch=lwBase(el,p=>nf(p,2));const l=ch.addLineSeries({color:'#E4E4E7',lineWidth:2,priceLineVisible:false,title:CM_ASSETS[a]});
      l.setData(s.d.map((d,i)=>s[a][i]!==null?{time:d,value:s[a][i]}:null).filter(Boolean));
      const h=ch.addHistogramSeries({priceScaleId:'ind',priceLineVisible:false,lastValueVisible:true,title:ind[0].split(' (')[0]});ch.priceScale('ind').applyOptions({scaleMargins:{top:.72,bottom:0}});
      h.setData(R.filter(x=>nn(x[ind[1]])).map(x=>({time:x.d,value:+x[ind[1]].toFixed(4),color:x[ind[1]]>=0?'rgba(16,185,129,.45)':'rgba(220,38,38,.45)'})));ch.timeScale().fitContent();return ch;};
  }else if(a==='brent'||a==='wti'){
    table=`<table class="tbl fin"><thead><tr><th>Date</th><th class="n">Brent</th><th class="n">WTI</th><th class="n">USD/CNH</th><th class="n">Spread</th><th class="n">Z-score ${P.zWin} j</th><th class="n">Percentile ${P.pctWin} j</th><th class="n">Corr. CNH/Brent ${P.cS} j</th><th class="n">${P.cM} j</th><th class="n">Corr. WTI/Brent ${P.cS} j</th><th>Structure</th><th>Brent vs Chine</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${fd(x.d)}</td><td class="n">${nf(s.brent[x.i],2)}</td><td class="n">${nf(s.wti[x.i],2)}</td><td class="n">${nf(s.cnh[x.i],4)}</td><td class="n">${nf(x.spread,2)}</td><td class="n">${nf(x.zSp,2)}</td><td class="n">${nn(x.pct)?pct(x.pct*100,0):'—'}</td><td class="n">${nf(x.cC20,2)}</td><td class="n">${nf(x.cC60,2)}</td><td class="n">${nf(x.cWB,2)}</td><td>${tag(x.sigStruct)}</td><td>${tag(x.sigChine)}</td></tr>`).join('')}</tbody></table>`;
    chartMake=el=>zChart(el,R.map(x=>({time:x.d,value:x.zSp})),'Z-score du spread');
  }else if(a==='gold'){
    table=`<table class="tbl fin"><thead><tr><th>Date</th><th class="n">Or</th><th class="n">Argent</th><th class="n">Ratio Or/Argent</th><th class="n">Ratio Or/Brent</th><th class="n">USD/CNH</th><th class="n">Corr. CNH/Or ${P.cS} j</th><th class="n">Z-score Or ${P.zWin} j</th><th class="n">DXY</th><th class="n">Perf. vs S&P 500</th><th>Signal Or / USD</th><th>Structure</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${fd(x.d)}</td><td class="n">${nf(s.gold[x.i],2)}</td><td class="n">${nf(s.silver[x.i],2)}</td><td class="n">${nf(x.gs,1)}</td><td class="n">${nf(x.gb,1)}</td><td class="n">${nf(s.cnh[x.i],4)}</td><td class="n">${nf(x.cCG,2)}</td><td class="n">${nf(x.zG,2)}</td><td class="n meta">n.d.</td><td class="n ${nn(x.perf)?cls(x.perf):''}">${nn(x.perf)?sgn(x.perf,2):'—'}</td><td>${tag(x.sigGold)}</td><td>${tag(x.sigGoldSt)}</td></tr>`).join('')}</tbody></table>`;
    chartMake=el=>zChart(el,R.map(x=>({time:x.d,value:x.zG})),'Z-score de l\'or');
  }else{
    table=`<table class="tbl fin"><thead><tr><th>Date</th><th class="n">Argent</th><th class="n">Z-score 20 j</th><th class="n">Distance à la moyenne 20 j</th><th class="n">Ratio Or/Argent</th><th>Signal argent</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${fd(x.d)}</td><td class="n">${nf(s.silver[x.i],2)}</td><td class="n">${nf(x.zS,2)}</td><td class="n">${nf(x.sDist,2)}</td><td class="n">${nf(x.gs,1)}</td><td>${tag(x.sigSilver)}</td></tr>`).join('')}</tbody></table>`;
    chartMake=el=>zChart(el,R.map(x=>({time:x.d,value:x.zS})),'Z-score de l\'argent');
  }
  const k=(l,v,d,c)=>`<div class="stat"><div class="k">${l}</div><div class="x ${c||''}">${v}</div><div class="d">${d||''}</div></div>`;
  const kpis=a==='brent'||a==='wti'?k('Spread Brent − WTI',nf(r.spread,2),r.spSt)+k('Basis Brent',nf(r.bB,2),r.bBSt)+k(`Z-score spread ${P.zWin} j`,nf(r.zSp,2),Math.abs(r.zSp)>P.zCrit?'critique':Math.abs(r.zSp)>P.zAlert?'alerte':'normal')+k(`Corr. CNH/Brent ${P.cS} j`,nf(r.cC20,2),cmCorrLab(r.cC20))+k(`Corr. CNH/Brent ${P.cM} j`,nf(r.cC60,2),cmCorrLab(r.cC60))
    :a==='gold'?k('Basis Or',nf(r.bG,2),r.bGSt)+k('Ratio Or/Argent',nf(r.gs,1),r.gs>P.gsRef?'zone refuge (> '+P.gsRef+')':'sous le seuil refuge')+k('Ratio Or/Brent',nf(r.gb,1),r.gb>P.gbDis?'déséquilibre (> '+P.gbDis+')':'')+k(`Z-score Or ${P.zWin} j`,nf(r.zG,2),Math.abs(r.zG)>P.zCrit?'critique':Math.abs(r.zG)>P.zAlert?'alerte':'normal')+k(`Corr. CNH/Or ${P.cS} j`,nf(r.cCG,2),cmCorrLab(r.cCG))
    :k('Basis Argent',nf(r.bS,3),r.bSSt)+k('Z-score 20 j',nf(r.zS,2),Math.abs(r.zS)>1.7?'extrême':'normal')+k('Distance à la moyenne 20 j',nf(r.sDist,2))+k('Ratio Or/Argent',nf(r.gs,1));
  $('#p-cm').innerHTML=`<div class="grid">
    ${age>7?`<div class="card s12 msg"><b style="color:var(--hi)">Données arrêtées au ${fd(lastD)}</b> (${age} jours). Importez les derniers exports Investing.com pour actualiser les signaux. <button class="btn sm noprint" data-act="cmimp">Importer un export (CSV)</button></div>`:''}
    <div class="card s12"><div class="symhead">
      <div class="sh-id"><div class="sh-t">${CM_ASSETS[a]}</div><div class="sh-n">${tab==='t'?'Pression et approvisionnement':'Confirmation et corrélations macro'}</div><div class="sh-m">séance du ${fd(s.d[li])}</div></div>
      <div><div class="sh-px"><span class="v">${nf(px,2)}</span><em class="u">USD</em></div><div class="sh-d ${nn(pv)?cls(pv):''}">${nn(pv)?sgn(pv*100,2):''} sur la séance</div></div>
      <div class="sh-kv"><div><span>${ind[0]}</span><b>${nf(r[ind[1]],2)}</b></div><div><span>État du marché</span><b>${esc(r[ind[2]])}</b></div></div>
      <div class="badge ${cmCls(sigMain)==='ok'?'ok':cmCls(sigMain)==='ko'?'ko':'am'}">${esc(cmStrip(sigMain).split(' : ')[0].toUpperCase())}</div>
    </div></div>
    <div class="card s12"><h2>Signaux du jour</h2><div class="dec">
      <div class="dc"><span class="dot ${cmCls(sigMain)}"></span><div><b>Signal principal</b><span>${esc(cmStrip(sigMain))}</span></div></div>
      ${sigStruct?`<div class="dc"><span class="dot ${cmCls(sigStruct)}"></span><div><b>Structure</b><span>${esc(cmStrip(sigStruct))}</span></div></div>`:''}
      <div class="dc"><span class="dot ${cmCls(r[ind[3]])}"></span><div><b>${esc(r[ind[2]])}</b><span>${esc(r[ind[3]])}</span></div></div>
      ${a!=='silver'?`<div class="dc"><span class="dot ${cmCls(r.spRk)}"></span><div><b>Spread Brent − WTI : ${nf(r.spread,2)}</b><span>${esc(r.spRk)}</span></div></div>`:''}
    </div></div>
    <div class="card s12"><div class="stats">${kpis}</div></div>
    <div class="card s12"><h2><span>${tab==='t'?CM_ASSETS[a]+' et '+ind[0]:'Z-score et bandes d\'alerte'}</span><span class="meta">${tab==='t'?'cours (ligne) et indicateur de structure (barres)':`seuils ±${P.zAlert} (alerte) et ±${P.zCrit} (critique)`}</span></h2><div class="lwc" id="${chartId}"></div></div>
    <div class="card s12"><h2><span>${tab==='t'?'Tableau chronologique':'Tableau de confirmation'} <span class="meta">${nRows} séances sur ${N}</span></span><span class="row noprint"><button class="btn sm" data-act="cmall">${ui.cmAll?'60 dernières séances':'Toutes les séances'}</button><button class="btn sm" data-act="cmimp">Importer un export (CSV)</button></span></h2><div class="tw" style="max-height:620px;overflow:auto">${table}</div></div>
    <div class="card s8"><h2>Paramètres des signaux <span class="meta">repris du classeur</span></h2>
      <div class="fields">${F('Fenêtre Z-score','cm.p.zWin','n',{u:'j'})}${F('Fenêtre percentile','cm.p.pctWin','n',{u:'j'})}${F('Corrélation court terme','cm.p.cS','n',{u:'j'})}${F('Corrélation moyen terme','cm.p.cM','n',{u:'j'})}${F('Corrélation forte au-delà de','cm.p.cStrong')}${F('Corrélation modérée au-delà de','cm.p.cMod')}${F('Z-score alerte','cm.p.zAlert')}${F('Z-score critique','cm.p.zCrit')}${F('Ratio Or/Argent refuge','cm.p.gsRef')}${F('Ratio Or/Brent déséquilibre','cm.p.gbDis')}</div></div>
    <div class="card s4"><h2>Sources</h2><div class="tw"><table class="tbl"><tbody>
      <tr><td>Cours quotidiens (spot, futurs M1, USD/CNH, S&P 500)</td><td>Exports Investing.com consolidés dans votre classeur TRADING_Dashboard, du ${fd(s.d[0])} au ${fd(lastD)}</td></tr>
      <tr><td>Règles d'état et de signal</td><td>Formules des onglets Tendance, Confirmation Brent et Confirmation Or-Argent du même classeur</td></tr>
      <tr><td>DXY</td><td>Non fourni dans le classeur : colonne à alimenter</td></tr>
      ${Object.keys(S.cm.add||{}).filter(k=>Object.keys(S.cm.add[k]).length).map(k=>`<tr><td>${CM_INST[k]}</td><td>${Object.keys(S.cm.add[k]).length} séances importées par CSV</td></tr>`).join('')}
    </tbody></table></div></div>
  </div>`;
  queueChart(chartId,chartMake,()=>'<p class="note">Graphique indisponible hors connexion.</p>');mountCharts();
}
function zChart(el,data,title){const P=cmP(),ch=lwBase(el,p=>nf(p,2)),l=ch.addBaselineSeries({baseValue:{type:'price',price:0},topLineColor:'#E4E4E7',bottomLineColor:'#E4E4E7',topFillColor1:'rgba(255,255,255,.06)',topFillColor2:'rgba(255,255,255,0)',bottomFillColor1:'rgba(255,255,255,0)',bottomFillColor2:'rgba(255,255,255,.06)',lineWidth:2,priceLineVisible:false,title});
  l.setData(data.filter(x=>nn(x.value)).map(x=>({time:x.time,value:+x.value.toFixed(3)})));
  [[+P.zCrit,TVC.down],[+P.zAlert,TVC.amber],[-P.zAlert,TVC.amber],[-P.zCrit,TVC.up]].forEach(([v,c])=>l.createPriceLine({price:v,color:c,lineWidth:1,lineStyle:2,axisLabelVisible:true,title:''}));
  ch.timeScale().fitContent();return ch;}
