/* ============ Volet 6 : Calculateur de position ============ */
function pcSpec(sym){const s=PC_SPECS[sym]||PC_SPECS.XAUUSD,P=S.pc;return Object.assign({},s,{cs:+(P.cs[sym]??s.cs),lev:+(P.lev[sym]??s.lev)});}
/* Dernier cours connu dans le classeur (pour pré-remplir l'entrée) */
function pcLast(sym){const s=PC_SPECS[sym];if(!s||!s.ref)return null;const C=cmSeries(),a=C[s.ref];for(let i=a.length-1;i>=0;i--)if(a[i]!==null)return{v:a[i],d:C.d[i]};return null;}
/* Conversion d'un montant en devise de cotation vers la devise du compte */
function pcFx(q,ccy){if(q===ccy)return 1;if(q==='USD'&&ccy==='EUR')return 1/FX_EURUSD;if(q==='EUR'&&ccy==='USD')return FX_EURUSD;return NaN;}
function pcCalc(){
  const P=S.pc,sp=pcSpec(P.sym),fx=pcFx(sp.q,P.ccy),dir=P.side==='Achat'?1:-1;
  const cap=+P.cap||0,riskPct=+P.risk||0,riskAmt=cap*riskPct/100,e=+P.entry,sl=+P.sl,tp=+P.tp,step=+P.step||0.01;
  const okE=isFinite(e)&&e>0&&P.entry!==null&&P.entry!=='',okS=isFinite(sl)&&P.sl!==null&&P.sl!=='',okT=isFinite(tp)&&P.tp!==null&&P.tp!=='';
  const errs=[];
  if(okE&&okS&&(sl-e)*dir>=0)errs.push(`Stop-loss du mauvais côté : pour une position ${P.side==='Achat'?'acheteuse':'vendeuse'}, il doit être ${P.side==='Achat'?'sous':'au-dessus du'} prix d'entrée.`);
  if(okE&&okT&&(tp-e)*dir<=0)errs.push(`Take-profit du mauvais côté du prix d'entrée.`);
  const dist=okE&&okS?Math.abs(e-sl):NaN,lossLot=dist*sp.cs*fx;
  const raw=isFinite(lossLot)&&lossLot>0?riskAmt/lossLot:NaN,lots=isFinite(raw)?Math.floor(raw/step+1e-9)*step:NaN;
  const effRisk=lots*lossLot,gainLot=okT&&okE?Math.abs(tp-e)*sp.cs*fx:NaN,gain=lots*gainLot,rr=isFinite(dist)&&dist>0&&okT?Math.abs(tp-e)/dist:NaN;
  const notional=lots*sp.cs*e*fx,margin=notional/sp.lev,levEff=cap?notional/cap:NaN;
  if(isFinite(raw)&&raw<step)errs.push(`Le risque autorisé (${nf(riskAmt,2)} ${P.ccy}) ne permet pas d'ouvrir le lot minimal de ${step} : élargir le risque ou rapprocher le stop.`);
  if(isFinite(margin)&&margin>cap)errs.push('Marge requise supérieure au capital : position impossible au levier réglementaire.');
  if(!isFinite(fx))errs.push('Conversion de devise non disponible pour ce couple.');
  /* Contrôles du plan de risque */
  const pl=P.plan,td=today(),T=(S.jr.trades||[]).filter(t=>t.d===td),dayPnl=sum(T.map(t=>+t.pnl||0)),allPnl=sum((S.jr.trades||[]).map(t=>+t.pnl||0));
  const checks=[
    ['Risque par trade',`${pct(riskPct,2)} du capital`,`plan : ${pct(+pl.rpt,2)} maximum`,riskPct<=+pl.rpt],
    ['Trades du jour',`${T.length} saisi${T.length>1?'s':''} au journal`,`plan : ${pl.maxT} maximum`,T.length<+pl.maxT],
    ['Perte du jour',`${nf(dayPnl,2)} ${P.ccy}`,`limite : −${nf(+pl.acct*pl.day/100,2)} ${P.ccy} (${pct(+pl.day,1)})`,dayPnl-effRisk>-(+pl.acct*pl.day/100)||!isFinite(effRisk)],
    ['Perte cumulée',`${nf(allPnl,2)} ${P.ccy}`,`limite : −${nf(+pl.acct*pl.tot/100,2)} ${P.ccy} (${pct(+pl.tot,1)})`,allPnl>-(+pl.acct*pl.tot/100)],
    ['Ratio rendement / risque',isFinite(rr)?'1 : '+nf(rr,2):'—','objectif : 1 : 2 au minimum',isFinite(rr)&&rr>=2]
  ];
  return{P,sp,fx,riskAmt,dist,lossLot,raw,lots,effRisk,gain,rr,notional,margin,levEff,errs,checks,okE,okS,okT};
}
/* Simulation de Monte-Carlo : risque fixe en % du capital, gains de rr × risque */
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let MC_CACHE={k:'',v:null};
function pcMC(){
  const P=S.pc,m=P.mc,wr=clamp(+m.wr/100,0,1),rr=Math.max(0,+m.rr),n=clamp(Math.round(+m.n),10,1000),N=clamp(Math.round(+m.sims),100,5000),r=(+P.risk||0)/100,cap=+P.cap||0,lim=+P.plan.tot/100;
  const key=[wr,rr,n,N,r,cap,lim].join('|');if(MC_CACHE.k===key)return MC_CACHE.v;
  const R=rng(20261027),fin=[],dd=[],paths=[];let breach=0;
  for(let s=0;s<N;s++){let eq=cap,pk=cap,md=0;const path=s<N?[cap]:null;
    for(let i=0;i<n;i++){const risk=eq*r;eq+=R()<wr?risk*rr:-risk;pk=Math.max(pk,eq);md=Math.max(md,(pk-eq)/pk);path.push(eq);}
    fin.push(eq);dd.push(md);if(md>=lim)breach++;paths.push(path);}
  const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p*s.length))];};
  const band=[0.05,0.5,0.95].map(p=>Array.from({length:n+1},(_,i)=>q(paths.map(x=>x[i]),p)));
  const v={wr,rr,n,N,exp:wr*rr-(1-wr),p5:q(fin,.05),p50:q(fin,.5),p95:q(fin,.95),dd50:q(dd,.5),dd95:q(dd,.95),breach:breach/N,loss:fin.filter(x=>x<cap).length/N,band,cap};
  MC_CACHE={k:key,v};return v;
}
function mcChart(v){
  const W=640,H=220,L=58,R=12,T=12,B=26,iw=W-L-R,ih=H-T-B,b=v.band,mx=Math.max(...b[2]),mn=Math.min(...b[0]),rg=(mx-mn)||1;
  const X=i=>L+i/v.n*iw,Y=y=>T+(mx-y)/rg*ih,pl=a=>a.map((y,i)=>`${X(i).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  let s=`<svg class="sc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Simulation de Monte-Carlo">`;
  const st=niceStep(rg/4);for(let y=Math.ceil(mn/st)*st;y<=mx;y+=st)s+=`<line x1="${L}" x2="${W-R}" y1="${Y(y)}" y2="${Y(y)}" class="mid"/><text x="${L-6}" y="${Y(y)+3}" class="ax" text-anchor="end">${nf(y,0)}</text>`;
  s+=`<polygon points="${pl(b[2])} ${b[0].map((y,i)=>`${X(i).toFixed(1)},${Y(y).toFixed(1)}`).reverse().join(' ')}" fill="rgba(255,255,255,.05)"/>`;
  s+=`<line x1="${L}" x2="${W-R}" y1="${Y(v.cap)}" y2="${Y(v.cap)}" stroke="var(--line2)" stroke-dasharray="3 3"/>`;
  s+=`<polyline points="${pl(b[0])}" fill="none" stroke="var(--down)" stroke-width="1.2"/><polyline points="${pl(b[2])}" fill="none" stroke="var(--up)" stroke-width="1.2"/><polyline points="${pl(b[1])}" fill="none" stroke="var(--hi)" stroke-width="1.8"/>`;
  [0,Math.round(v.n/2),v.n].forEach(i=>{s+=`<text x="${X(i)}" y="${H-8}" class="ax" text-anchor="middle">${i===0?'départ':'trade '+i}</text>`;});
  return s+'</svg>';
}
function pcOut(){
  const c=pcCalc(),P=c.P,u=P.ccy;
  return`<div class="stats">
      <div class="stat"><div class="k">Taille de position</div><div class="x">${isFinite(c.lots)?nf(c.lots,2)+' lot'+(c.lots>1?'s':''):'—'}</div><div class="d">${isFinite(c.lots)?nf(c.lots*c.sp.cs,c.sp.cs>=100?0:2)+' '+esc(c.sp.u):'saisir entrée et stop'}</div></div>
      <div class="stat"><div class="k">Risque autorisé</div><div class="x">${nf(c.riskAmt,2)} ${u}</div><div class="d">${pct(+P.risk,2)} de ${nf(+P.cap,0)} ${u}</div></div>
      <div class="stat"><div class="k">Risque réel (lot arrondi)</div><div class="x">${isFinite(c.effRisk)?nf(c.effRisk,2)+' '+u:'—'}</div><div class="d">${isFinite(c.effRisk)&&+P.cap?pct(c.effRisk/P.cap*100,2)+' du capital':''}</div></div>
      <div class="stat"><div class="k">Gain au take-profit</div><div class="x up">${isFinite(c.gain)?nf(c.gain,2)+' '+u:'—'}</div><div class="d">${isFinite(c.rr)?'ratio 1 : '+nf(c.rr,2):'saisir le take-profit'}</div></div>
      <div class="stat"><div class="k">Distance au stop</div><div class="x">${isFinite(c.dist)?nf(c.dist,c.sp.dig):'—'}</div><div class="d">${isFinite(c.lossLot)?nf(c.lossLot,2)+' '+u+' par lot':''}</div></div>
      <div class="stat"><div class="k">Marge requise</div><div class="x">${isFinite(c.margin)?nf(c.margin,2)+' '+u:'—'}</div><div class="d">levier ${c.sp.lev}:1 · exposition ${isFinite(c.levEff)?nf(c.levEff,1)+'× le capital':'—'}</div></div>
    </div>
    ${c.errs.length?`<div class="msg" style="margin-top:10px">${c.errs.map(e=>`<p style="margin:2px 0"><span class="dot ko"></span> ${esc(e)}</p>`).join('')}</div>`:''}
    <div class="dec" style="margin-top:10px">${c.checks.map(x=>`<div class="dc"><span class="dot ${x[3]?'ok':'ko'}"></span><div><b>${x[0]} : ${x[1]}</b><span>${x[2]}</span></div></div>`).join('')}</div>`;
}
function renderPC(){
  const P=S.pc,sp=pcSpec(P.sym),last=pcLast(P.sym),v=pcMC(),u=P.ccy;
  $('#p-pc').innerHTML=`<div class="grid">
    <div class="card s5"><h2>Paramètres du trade</h2>
      <div class="fields">
        ${LF('Instrument','pc.sym','s',{opts:Object.fromEntries(Object.entries(PC_SPECS).map(([k,s])=>[k,k+' · '+s.l]))})}
        ${LF('Sens','pc.side','s',{opts:{Achat:'Achat (long)',Vente:'Vente (short)'}})}
        ${LF('Capital du compte','pc.cap','n',{u,live:1})}${LF('Devise du compte','pc.ccy','s',{opts:{EUR:'EUR',USD:'USD'}})}
        ${LF('Risque par trade','pc.risk','n',{u:'%',live:1})}${LF('Pas de lot','pc.step','n',{live:1})}
        ${LF('Prix d\'entrée','pc.entry','nn',{live:1,ph:last?nf(last.v,sp.dig):''})}${LF('Stop-loss','pc.sl','nn',{live:1})}
        ${LF('Take-profit','pc.tp','nn',{live:1})}
      </div>
      ${last?`<p class="note">Dernier cours connu : ${nf(last.v,sp.dig)} (classeur, ${fdate(last.d)}). <button class="btn sm" data-act="pcfill">Utiliser comme entrée</button></p>`:''}
      <h3 class="h3">Spécification du contrat</h3>
      <div class="fields">${LF('Taille du contrat (1 lot)',`pc.cs.${P.sym}`,'nn',{u:esc(sp.u),ph:String(PC_SPECS[P.sym].cs),live:1})}${LF('Levier maximal',`pc.lev.${P.sym}`,'nn',{u:':1',ph:String(PC_SPECS[P.sym].lev),live:1})}</div>
      <p class="note">Cotation en ${sp.q}${sp.q!==u?`, convertie en ${u} au cours EUR/USD de ${nf(FX_EURUSD,4)} (20/10/2026)`:''}. ${esc(PC_SRC)}</p></div>
    <div class="card s7"><h2>Résultat <span class="meta">${esc(P.sym)} · ${P.side==='Achat'?'position acheteuse':'position vendeuse'}</span></h2><div id="pc-out">${pcOut()}</div>
      <p class="note">Lots = risque autorisé ÷ (distance au stop × taille du contrat × change), arrondi au pas inférieur pour ne jamais dépasser le risque.</p>
      <div class="row noprint"><button class="btn sm" data-act="pc2jr">Préparer ce trade dans le journal</button></div></div>
    <div class="card s5"><h2>Mon plan de risque</h2>
      <div class="fields">${LF('Taille du compte','pc.plan.acct','n',{u})}${LF('Risque par trade maximal','pc.plan.rpt','n',{u:'%'})}${LF('Perte maximale par jour','pc.plan.day','n',{u:'%'})}${LF('Perte maximale totale','pc.plan.tot','n',{u:'%'})}${LF('Trades maximum par jour','pc.plan.maxT','n')}</div>
      <div class="row"><button class="btn sm" data-act="pcplan">Appliquer au calculateur</button></div>
      <p class="note">Les contrôles du calculateur lisent les trades du jour saisis dans le journal (volet 7).</p></div>
    <div class="card s7"><h2><span>Simulation de Monte-Carlo <span class="meta">${nf(v.N,0)} trajectoires de ${v.n} trades</span></span></h2>
      <div class="fields">${LF('Taux de réussite','pc.mc.wr','n',{u:'%'})}${LF('Gain moyen en R','pc.mc.rr','n',{u:'R'})}${LF('Nombre de trades','pc.mc.n','n')}${LF('Trajectoires','pc.mc.sims','n')}</div>
      ${mcChart(v)}
      <div class="legend"><span><i style="background:var(--hi)"></i>Médiane</span><span><i style="background:var(--up)"></i>Meilleurs 5 %</span><span><i style="background:var(--down)"></i>Pires 5 %</span><span>Pointillé : capital de départ</span></div>
      <div class="stats" style="margin-top:8px">
        <div class="stat"><div class="k">Espérance par trade</div><div class="x ${cls(v.exp)}">${(v.exp>=0?'+':'')+nf(v.exp,2)} R</div><div class="d">${v.exp>0?'avantage positif':'avantage négatif : ne pas trader ce système'}</div></div>
        <div class="stat"><div class="k">Capital final médian</div><div class="x">${nf(v.p50,0)} ${u}</div><div class="d">5 % pires : ${nf(v.p5,0)} · 5 % meilleurs : ${nf(v.p95,0)}</div></div>
        <div class="stat"><div class="k">Drawdown maximal</div><div class="x">${pct(v.dd50*100,1)}</div><div class="d">médian ; ${pct(v.dd95*100,1)} dans 5 % des cas</div></div>
        <div class="stat"><div class="k">Limite de perte franchie</div><div class="x ${v.breach>.05?'down':'up'}">${pct(v.breach*100,1)}</div><div class="d">des trajectoires dépassent −${pct(+P.plan.tot,1)}</div></div>
      </div>
      <p class="note">Hypothèses : risque fixe de ${pct(+P.risk,2)} du capital en cours, gains de ${nf(v.rr,2)} R, trades indépendants. Le taux de réussite et le gain moyen peuvent être repris des statistiques réelles du journal.${(S.jr.trades||[]).length>=10?' <button class="btn sm" data-act="mcjr">Reprendre les statistiques du journal</button>':''}</p></div>
  </div>`;
}
LIVE.pc=()=>{const o=document.getElementById('pc-out');if(o)o.innerHTML=pcOut();};
