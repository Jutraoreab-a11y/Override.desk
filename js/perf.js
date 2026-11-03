/* ============ v7.2 : performance réelle du portefeuille ============ */
/* Deux mesures complémentaires :
   1) rétro-calcul à composition constante : positions actuelles valorisées sur l'historique de cours disponible
      (rendement, volatilité, Sharpe, VaR, drawdown, bêta et corrélation à l'indice choisi) ;
   2) TWR et MWR réels à partir des valorisations enregistrées chaque jour et des apports / retraits déclarés. */
const symKey=s=>'stk_'+String(s||'').toUpperCase().replace(/\.(PA|AS|DE|US|L|MI|MC)$/,'');
function perfLines(){const L=[],fx=+S.pf.eurusd||FX_EURUSD;
  (S.pf.positions||[]).forEach(p=>{const a=S.an.assets[p.tk];if(!a||!(+p.q>0))return;L.push({sym:p.tk,name:a.n,q:+p.q,ccy:a.cur,px:+a.price,val:(+p.q)*(+a.price)/(a.cur==='USD'?fx:1)});});
  (S.hold||[]).forEach(h=>{if(h.cls==='Cash'||!(+h.qty>0))return;const px=isFinite(+h.px)&&h.px!==null&&h.px!==''?+h.px:+h.pru;L.push({sym:h.sym,name:h.name||h.sym,q:+h.qty,ccy:h.ccy||'EUR',px,val:typeof toEUR==='function'?toEUR(h.qty*px,h.ccy):h.qty*px});});
  return L;}
const PERF_BENCH={cac:'CAC 40',spx:'S&P 500',ndx:'Nasdaq 100',dax:'DAX 40',dji:'Dow Jones',nkx:'Nikkei 225'};
function perfCalc(){const L=perfLines(),fx=+S.pf.eurusd||FX_EURUSD,tot=sum(L.map(l=>l.val));
  const H=L.map(l=>({l,pts:mktPts(symKey(l.sym))})),cov=H.filter(x=>x.pts.length>=2),covV=sum(cov.map(x=>x.l.val));
  const dates=[...new Set(cov.flatMap(x=>x.pts.map(p=>p.time)))].sort(),start=cov.length?cov.map(x=>x.pts[0].time).sort().pop():null;
  const D=dates.filter(d=>start&&d>=start);
  /* Valeur à composition constante : chaque ligne couverte, cours prolongé au dernier connu */
  const ser=cov.map(x=>{const m=new Map(x.pts.map(p=>[p.time,p.value]));let last=null;return D.map(d=>{if(m.has(d))last=m.get(d);return last===null?NaN:x.l.q*last/(x.l.ccy==='USD'?fx:1);});});
  const V=D.map((d,i)=>sum(ser.map(s=>s[i])));
  const R=V.slice(1).map((v,i)=>v/V[i]-1).filter(isFinite);
  const n=R.length,mu=n?sum(R)/n:NaN,sd=n>1?Math.sqrt(sum(R.map(r=>(r-mu)**2))/(n-1)):NaN;
  const totR=V.length>1?V[V.length-1]/V[0]-1:NaN,days=D.length>1?(new Date(D[D.length-1])-new Date(D[0]))/864e5:0,annR=days>0?(1+totR)**(365/days)-1:NaN;
  const vol=sd*Math.sqrt(252),rf=((typeof LBO_SRC==='object'&&LBO_SRC.euribor)?+LBO_SRC.euribor.v:2)/100,sharpe=vol>0?(annR-rf)/vol:NaN;
  const dn=R.filter(r=>r<0),dsd=dn.length>1?Math.sqrt(sum(dn.map(r=>r*r))/dn.length)*Math.sqrt(252):NaN,sortino=dsd>0?(annR-rf)/dsd:NaN;
  let pk=-Infinity,mdd=0;V.forEach(v=>{if(v>pk)pk=v;if(pk>0)mdd=Math.min(mdd,v/pk-1);});
  const srt=[...R].sort((a,b)=>a-b),q5=n?srt[Math.max(0,Math.floor(0.05*n)-0)]:NaN,cvar=n?sum(srt.slice(0,Math.max(1,Math.floor(0.05*n))))/Math.max(1,Math.floor(0.05*n)):NaN;
  const Vnow=tot,varH=isFinite(q5)?-q5*Vnow:NaN,varP=isFinite(sd)?1.645*sd*Vnow:NaN;
  /* Indice de référence */
  const bk=PERF_BENCH[ui.perfB]?ui.perfB:'cac',bp=mktPts(bk),bm=new Map(bp.map(p=>[p.time,p.value]));let lb=null;const B=D.map(d=>{if(bm.has(d))lb=bm.get(d);return lb;});
  const pairs=[];for(let i=1;i<D.length;i++){if(B[i]!=null&&B[i-1]!=null&&bm.has(D[i])&&isFinite(V[i]/V[i-1])){pairs.push([V[i]/V[i-1]-1,B[i]/B[i-1]-1]);}}
  const pm=pairs.length?sum(pairs.map(p=>p[0]))/pairs.length:NaN,bmu=pairs.length?sum(pairs.map(p=>p[1]))/pairs.length:NaN;
  const cv=pairs.length>2?sum(pairs.map(p=>(p[0]-pm)*(p[1]-bmu)))/(pairs.length-1):NaN,vb=pairs.length>2?sum(pairs.map(p=>(p[1]-bmu)**2))/(pairs.length-1):NaN,vp=pairs.length>2?sum(pairs.map(p=>(p[0]-pm)**2))/(pairs.length-1):NaN;
  const beta=vb>0?cv/vb:NaN,corr=vb>0&&vp>0?cv/Math.sqrt(vb*vp):NaN,bFirst=B.find(x=>x!=null),bLast=[...B].reverse().find(x=>x!=null),bTot=bFirst&&bLast?bLast/bFirst-1:NaN;
  const te=pairs.length>2?Math.sqrt(sum(pairs.map(p=>(p[0]-p[1]-(pm-bmu))**2))/(pairs.length-1))*Math.sqrt(252):NaN;
  return{L,tot,cov,covV,covPct:tot?covV/tot:0,miss:H.filter(x=>x.pts.length<2).map(x=>x.l),D,V,R,n,totR,annR,vol,rf,sharpe,sortino,mdd,q5,varH,varP,cvar:isFinite(cvar)?-cvar*Vnow:NaN,bk,B,bTot,beta,corr,te,pairs:pairs.length,days};}
/* Valorisations quotidiennes réelles et flux déclarés : TWR et MWR (TRI) */
function navRecord(){const v=sum(perfLines().map(l=>l.val));if(!(v>0))return;S.nav=S.nav||{};const d=today();S.nav[d]=Object.assign({},S.nav[d]||{},{v:+v.toFixed(2)});}
function navCalc(){const N=S.nav||{},K=Object.keys(N).sort();if(K.length<2)return{n:K.length};
  let tw=1;for(let i=1;i<K.length;i++){const a=N[K[i-1]].v,b=N[K[i]].v,f=+N[K[i]].f||0;if(a>0)tw*=(b-f)/a;}
  const cf=[{t:new Date(K[0]),c:-N[K[0]].v}];K.slice(1).forEach(k=>{if(+N[k].f)cf.push({t:new Date(k),c:-(+N[k].f)});});cf.push({t:new Date(K[K.length-1]),c:N[K[K.length-1]].v});
  const npv=r=>sum(cf.map(x=>x.c/(1+r)**((x.t-cf[0].t)/(365*864e5))));let r=0.05;for(let i=0;i<60;i++){const h=1e-6,f=npv(r),d=(npv(r+h)-f)/h;if(!isFinite(d)||Math.abs(d)<1e-12)break;const nr=r-f/d;if(!isFinite(nr))break;if(Math.abs(nr-r)<1e-10){r=nr;break;}r=Math.max(-0.99,nr);}
  return{n:K.length,from:K[0],to:K[K.length-1],twr:tw-1,mwr:isFinite(npv(r))&&Math.abs(npv(r))<1?r:NaN};}
function perfCard(){navRecord();const P=perfCalc(),NV=navCalc(),fd=d=>fdate(d),short=P.n<60;
  const k=(l,v,d,c)=>`<div class="stat"><div class="k">${l}</div><div class="x ${c||''}">${v}</div><div class="d">${d||''}</div></div>`;
  return`<div class="card s12"><h2><span>Performance et risque du portefeuille <span class="meta">${P.D.length?`du ${fd(P.D[0])} au ${fd(P.D[P.D.length-1])}, ${P.n} rendements quotidiens`:'historique de cours à charger'}</span></span>
    <span class="row noprint"><span class="lb" style="margin:0">Indice</span><select class="f" data-ui="perfB" style="width:auto" aria-label="Indice de référence">${Object.entries(PERF_BENCH).map(([x,l])=>`<option value="${x}"${x===P.bk?' selected':''}>${l}${mktPts(x).length?'':' (à charger)'}</option>`).join('')}</select></span></h2>
    ${P.cov.length?`<div class="stats">
      ${k('Rendement de la période',pct(P.totR*100,2),`indice ${PERF_BENCH[P.bk]} : ${isFinite(P.bTot)?pct(P.bTot*100,2):'—'}`,P.totR<0?'down':'up')}
      ${k('Volatilité annualisée',pct(P.vol*100,1),'écart-type quotidien × √252')}
      ${k('Ratio de Sharpe',nf(P.sharpe,2),`taux sans risque ${pct(P.rf*100,2)} (Euribor 3 mois)`,P.sharpe<0?'down':'')}
      ${k('Ratio de Sortino',nf(P.sortino,2),'volatilité des seules baisses')}
      ${k('Perte maximale (drawdown)',pct(P.mdd*100,1),'du plus haut au plus bas',P.mdd<-0.1?'down':'')}
      ${k('VaR 95 % à 1 jour',big(P.varH),`historique · paramétrique ${big(P.varP)}`,'down')}
      ${k('CVaR 95 % à 1 jour',big(P.cvar),'perte moyenne au-delà de la VaR','down')}
      ${k('Bêta / corrélation',`${nf(P.beta,2)} · ${nf(P.corr,2)}`,`${P.pairs} séances communes avec l'indice`)}
      ${k('Tracking error',pct(P.te*100,1),'écart de rendement annualisé à l\'indice')}</div>
    ${short?`<p class="note"><span class="tag am">Échantillon court</span> ${P.n} rendements seulement : volatilité, Sharpe et VaR sont indicatifs. Une mesure robuste demande au moins un an d'historique (252 séances), que le flux live ou l'import des historiques fournissent.</p>`:''}
    <div class="lwc sm" id="perf-ch"></div><div class="legend"><span><i style="background:#E4E4E7"></i>Portefeuille à composition constante (base 100)</span><span><i style="background:#5B9BD5"></i>${PERF_BENCH[P.bk]} (base 100)</span></div>`
    :`<p class="note">Aucune ligne n'a d'historique de cours : chargez-le depuis Commodities & flows (sélecteur d'actifs, champ « Action ») ou par le flux live.</p>`}
    <div class="grid" style="margin-top:8px"><div class="s6" style="min-width:0"><h3 class="h3">Couverture des historiques</h3>
      <p class="note" style="margin-top:0">${pct(P.covPct*100,0)} de la valeur investie (${big(P.covV)} sur ${big(P.tot)}) dispose d'un historique de cours.${P.miss.length?' Lignes sans historique, exclues des statistiques : '+P.miss.map(l=>esc(l.sym)).join(', ')+'.':''}</p>
      ${P.miss.length?`<div class="row">${P.miss.slice(0,8).map(l=>`<button class="btn sm" data-act="perfload" data-id="${esc(l.sym)}">Charger ${esc(l.sym)}</button>`).join('')}</div>`:''}
      <p class="note">Rétro-calcul à composition constante : les positions actuelles sont valorisées sur l'historique, sans tenir compte des achats et ventes passés. Il mesure le risque du portefeuille tel qu'il est détenu aujourd'hui.</p></div>
    <div class="s6" style="min-width:0"><h3 class="h3">Performance réelle (TWR et MWR)</h3>
      ${NV.n>=2?`<div class="stats" style="grid-template-columns:1fr 1fr">${k('TWR',pct(NV.twr*100,2),`du ${fd(NV.from)} au ${fd(NV.to)}`,NV.twr<0?'down':'up')}${k('MWR (TRI)',isFinite(NV.mwr)?pct(NV.mwr*100,1)+' / an':'—','pondéré par les apports')}</div>`:`<p class="note" style="margin-top:0">${NV.n} valorisation enregistrée : le TWR et le MWR se calculent à partir de deux jours de valorisation.</p>`}
      <div class="row" style="margin-top:6px;align-items:flex-end"><label class="mkt-f"><span>Apport (+) ou retrait (−) du jour</span><input class="f" id="navFlow" type="number" step="any" placeholder="€" style="width:140px"></label><button class="btn sm" data-act="navflow">Enregistrer</button></div>
      <p class="note">La valorisation est enregistrée chaque jour d'ouverture de la page, et conservée côté serveur en flux live. Le TWR neutralise les apports et retraits : il mesure la gestion. Le MWR (TRI) en tient compte : il mesure l'expérience de l'investisseur.</p></div></div>
    <p class="note">Sources des historiques : ${Object.keys(MKT_HIST_SRC||{}).filter(x=>P.cov.some(c=>symKey(c.l.sym)===x)||x===P.bk).map(x=>`${x.replace('stk_','')} ${MKT_HIST_SRC[x]}`).join(' ; ')||'imports et collecte'}. Lignes en USD converties au taux du jour (${nf(+S.pf.eurusd||FX_EURUSD,4)}), sans historique de change.</p></div>`;}
function perfChart(){const el=document.getElementById('perf-ch');if(!el)return;const P=perfCalc();if(!P.V.length)return;
  queueChart('perf-ch',e=>{const ch=lwBase(e,v=>nf(v,1)),b0=P.V.find(v=>v>0),bb=P.B.find(x=>x!=null);
    ch.addLineSeries({color:'#E4E4E7',lineWidth:2,priceLineVisible:false,title:'Portefeuille'}).setData(P.D.map((d,i)=>({time:d,value:+(P.V[i]/b0*100).toFixed(2)})).filter(x=>isFinite(x.value)));
    if(bb)ch.addLineSeries({color:'#5B9BD5',lineWidth:1.5,priceLineVisible:false,title:PERF_BENCH[P.bk]}).setData(P.D.map((d,i)=>P.B[i]!=null?{time:d,value:+(P.B[i]/bb*100).toFixed(2)}:null).filter(Boolean));
    ch.timeScale().fitContent();return ch;},()=>'');mountCharts();}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;
  if(b.dataset.act==='navflow'){const v=+((document.getElementById('navFlow')||{}).value);if(!isFinite(v)||!v){toast('Saisissez un montant');return;}navRecord();const d=today();S.nav[d].f=(+S.nav[d].f||0)+v;
    if(typeof auditLog==='function')auditLog('nav.'+d+'.f',null,S.nav[d].f,'flux du portefeuille');save();renderAll();toast('Flux enregistré');}
  if(b.dataset.act==='perfload'){const t=b.dataset.id.toUpperCase().replace(/\.(PA|AS|DE|US)$/,'');const Lst=mktStocks();if(!Lst.includes(t))Lst.push(t);mktSetMain('stk_'+t);ui.tab='cm';save();renderAll();toast('Chargez l\'historique de '+t+' depuis le graphique principal');}});
