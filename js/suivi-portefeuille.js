/* ============ Volet 4 : Suivi des actifs et placements ============ */
const isNum=v=>v!==null&&v!==''&&v!==undefined&&isFinite(v);
function pfLine(p,i){
  const A=S.an.assets,a=A[p.tk];if(!a)return null;
  const fx=+S.pf.eurusd||FX_EURUSD,toEur=v=>a.cur==='USD'?v/fx:v;
  const q=+p.q||0,pru=+p.pru||0,price=+a.price,val=q*price,cost=q*pru,perf=pru?(price/pru-1)*100:NaN;
  const L=a.rev.length-1,Pv=L-1,em=k=>a.ebitda[k]/a.rev[k]*100;
  const useQ=isNum(p.qeps)&&isNum(p.qepsP),useQr=isNum(p.qrev)&&isNum(p.qrevP);
  const F=[
    ['BPA',useQ?+p.qeps:a.eps[L],useQ?+p.qepsP:a.eps[Pv],useQ?`trimestre ${p.qd||'publié'} vs même trimestre N-1`:`${a.y[L]} vs ${a.y[Pv]}`,v=>nf(v,2)],
    ["Chiffre d'affaires",useQr?+p.qrev:a.rev[L],useQr?+p.qrevP:a.rev[Pv],useQr?`trimestre ${p.qd||'publié'} vs même trimestre N-1`:`${a.y[L]} vs ${a.y[Pv]}`,v=>nf(v,0)+' M'],
    ['Free cash flow',a.fcf[L],a.fcf[Pv],`${a.y[L]} vs ${a.y[Pv]}`,v=>nf(v,0)+' M'],
    ['Marge EBITDA',em(L),em(Pv),`${a.y[L]} vs ${a.y[Pv]}`,v=>pct(v,1)]
  ].map(f=>({l:f[0],n:f[1],p:f[2],per:f[3],fmt:f[4],up:f[1]>f[2],ch:f[2]!==0?(f[1]-f[2])/Math.abs(f[2])*100:NaN}));
  const ups=F.filter(f=>f.up).length,fs=(ups-(4-ups))/4*100,trend=ups>=3?'Hausse':ups<=1?'Baisse':'Mitigée';
  const R=anCalc(p.tk),cons=isNum(a.epsE)?(a.epsE-a.eps[L])/Math.abs(a.eps[L]||1)*100:NaN;
  const stop=pru*(1-S.an.crit.sl/100);let sig;
  if(pru&&price<=stop&&trend==='Hausse')sig=['am','Divergence : stop atteint malgré des résultats en hausse',`Les résultats progressent (${ups}/4 indicateurs en hausse) mais la ligne perd ${pct(-perf,1)} et touche son stop (${nf(stop,2)}). Décision à documenter : maintien seulement si la cause de la baisse est identifiée et sans lien avec la thèse ; sinon sortie.`];
  else if(pru&&price<=stop)sig=['ko','Stop-loss franchi',`Le cours (${nf(price,2)}) est sous le stop de la ligne (${nf(stop,2)}, soit le prix de revient moins ${nf(S.an.crit.sl,0)} %). ${trend==='Hausse'?'Les résultats progressent pourtant : ne conserver qu\'après une révision documentée de la thèse.':'Les résultats ne compensent pas : appliquer la discipline de sortie.'}${isFinite(R.ref)&&price<R.buy?` Le titre cote sous son prix d'achat cible (${nf(R.buy,2)}) : une sortie ne signifie pas que le titre est cher.`:''}`];
  else if(trend==='Hausse'&&perf<0)sig=['am','Divergence : résultats en hausse, ligne en baisse',`Les fondamentaux progressent (${ups}/4 indicateurs en hausse) alors que la ligne perd ${pct(-perf,1)}. Maintien recommandé si la thèse reste intacte : vérifier la cause de la baisse (secteur, macroéconomie, prévisions de la direction). Renforcer uniquement sous le prix d'achat cible (${nf(R.buy,2)} ${a.cur}).`];
  else if(trend==='Hausse')sig=isFinite(R.tp)&&price>=R.tp?['am','Take-profit atteint',`Résultats en hausse et cours au-dessus de l'objectif (${nf(R.tp,2)}). Alléger pour sécuriser une partie du gain.`]:['ok','Thèse confirmée',`Résultats et cours progressent ensemble. Maintenir ; relever le stop au prix de revient (${nf(pru,2)}) pour protéger la ligne.`];
  else if(trend==='Baisse'&&perf>=0)sig=['am','Le cours devance les résultats',`La ligne gagne ${pct(perf,1)} alors que ${4-ups}/4 indicateurs reculent. Alléger ou sécuriser les gains.`];
  else if(trend==='Baisse')sig=['ko','Thèse fragilisée',`Résultats et cours reculent ensemble (${pct(-perf,1)}). Réduire ou sortir ; respecter le stop de la ligne (${nf(stop,2)}).`];
  else sig=['am','Surveillance renforcée',`Fondamentaux mitigés (${ups}/4 en hausse). Attendre la prochaine publication avant de renforcer.`];
  return{stop,i,p,a,q,pru,price,val,cost,valE:toEur(val),costE:toEur(cost),pnlE:toEur(val-cost),perf,F,ups,fs,trend,R,cons,sig};
}
function pfCalc(){const ls=S.pf.positions.map(pfLine).filter(Boolean),V=sum(ls.map(l=>l.valE)),C=sum(ls.map(l=>l.costE));ls.forEach(l=>l.w=V?l.valE/V*100:0);return{ls,V,C,pnl:V-C,pnlP:C?(V/C-1)*100:NaN,div:ls.filter(l=>l.sig[1].startsWith('Divergence')).length,alert:ls.filter(l=>l.sig[0]==='ko').length};}
function renderPF(){
  const E=ui.edit,K=pfCalc(),ls=K.ls,A=S.an.assets;
  if(ui.pfSel>=ls.length)ui.pfSel=0;
  const l=ls[ui.pfSel],P=k=>`pf.positions.${l?l.i:0}.${k}`;
  const tkOpts=Object.fromEntries(Object.keys(A).map(k=>[k,A[k].t+' ('+A[k].n+')']));
  $('#p-pf').innerHTML=`
  <div class="grid">
    ${mt5Card()}
    <div class="card s12 msg"><b style="color:var(--hi)">Portefeuille d'exemple.</b> Les quantités et prix de revient sont fictifs ; cours et résultats publiés sont réels (MarketScreener, 19-20/10/2026). Passez en Override pour saisir vos positions.</div>
    <div class="card s12"><div class="stats">
      <div class="stat"><div class="k">Valeur du portefeuille</div><div class="x">${big(K.V)}</div><div class="d">${ls.length} lignes, USD convertis à ${nf(+S.pf.eurusd,4)}</div></div>
      <div class="stat"><div class="k">Prix de revient total</div><div class="x">${big(K.C)}</div><div class="d">frais non inclus</div></div>
      <div class="stat"><div class="k">Plus ou moins-value latente</div><div class="x ${K.pnl<0?'down':''}">${big(K.pnl)}</div><div class="d ${cls(K.pnlP)}">${sgn(K.pnlP)}</div></div>
      <div class="stat"><div class="k">Divergences</div><div class="x">${K.div}</div><div class="d">résultats en hausse, ligne en baisse</div></div>
      <div class="stat"><div class="k">Alertes</div><div class="x ${K.alert?'down':''}">${K.alert}</div><div class="d">thèse fragilisée ou stop franchi</div></div>
    </div></div>
    <div class="card s7"><h2>Résultats publiés vs performance de vos lignes</h2>
      ${quadChart(ls.map(x=>({x:x.fs,y:x.perf,label:x.a.t,id:x.i,cls:x.sig[0]+(x.i===(l||{}).i?' sel':''),r:4+clamp(x.w/6,0,6)})),{title:'Fondamentaux contre performance',xl:'Évolution des fondamentaux (indicateurs en hausse moins en baisse, en %)',yl:'Performance de la ligne vs prix de revient',q:['Le cours devance les résultats','Thèse confirmée','Thèse fragilisée','Divergence : résultats en hausse']})}
      <p class="note">Abscisse : BPA, chiffre d'affaires, FCF et marge EBITDA du dernier exercice publié (ou du dernier trimestre saisi) comparés à la période précédente. Taille du point : poids dans le portefeuille.</p></div>
    <div class="card s5"><h2>Répartition</h2>${hbars([...ls].sort((x,y)=>y.w-x.w).map(x=>({l:x.a.t,v:x.w})),{fmt:v=>pct(v,1)})}
      <div class="tw" style="margin-top:12px"><table class="tbl"><thead><tr><th>Signal</th><th class="n">Lignes</th><th class="n">Poids</th></tr></thead><tbody>
      ${['ok','am','ko'].map(s=>{const g=ls.filter(x=>x.sig[0]===s);return`<tr><td><span class="tag ${s}">${s==='ok'?'Thèse confirmée':s==='am'?'À surveiller':'Alerte'}</span></td><td class="n">${g.length}</td><td class="n">${pct(sum(g.map(x=>x.w)),1)}</td></tr>`;}).join('')}
      </tbody></table></div></div>
    <div class="card s12"><h2>Positions</h2>
      <div class="tw"><table class="tbl"><thead><tr><th>Titre</th><th class="n">Quantité</th><th class="n">Prix de revient</th><th class="n">Cours</th><th class="n">Valeur (€)</th><th class="n">+/- value</th><th class="n">Perf.</th><th class="n">Poids</th><th class="n">BPA</th><th class="n">CA</th><th>Fondamentaux</th><th>Signal</th>${E?'<th></th>':''}</tr></thead><tbody>
      ${ls.map(x=>`<tr class="click${x.i===(l||{}).i?' hl':''}" data-act="pfsel" data-id="${x.i}"><td>${E?fld(`pf.positions.${x.i}.tk`,'s',{opts:tkOpts,al:'Titre'}):`<b>${esc(x.a.t)}</b> <span class="meta">${esc(x.a.n)}</span>`}</td><td class="n">${fld(`pf.positions.${x.i}.q`,'n',{al:'Quantité'})}</td><td class="n">${fld(`pf.positions.${x.i}.pru`,'n',{al:'Prix de revient'})}</td><td class="n">${nf(x.price,2)} ${esc(x.a.cur)}</td><td class="n">${nf(x.valE,0)}</td><td class="n ${x.pnlE<0?'down':'up'}">${(x.pnlE>=0?'+':'')+nf(x.pnlE,0)}</td><td class="n ${cls(x.perf)}">${sgn(x.perf)}</td><td class="n">${pct(x.w,1)}</td><td class="n ${cls(x.F[0].ch)}">${sgn(x.F[0].ch,0)}</td><td class="n ${cls(x.F[1].ch)}">${sgn(x.F[1].ch,1)}</td><td><span class="tag ${x.trend==='Hausse'?'ok':x.trend==='Baisse'?'ko':'am'}">${x.trend}</span></td><td><span class="tag ${x.sig[0]}">${x.sig[1]}</span></td>${E?`<td><button class="btn sm ghost" data-act="delrow" data-list="pf.positions" data-i="${x.i}" aria-label="Supprimer la ligne">✕</button></td>`:''}</tr>`).join('')}
      </tbody></table></div>
      ${E?`<div class="row" style="margin-top:8px"><button class="btn sm" data-act="addrow" data-list="pf.positions">Ajouter une position</button>${F('Taux EUR/USD','pf.eurusd')}</div>`:''}</div>
    ${l?`<div class="card s12"><h2><span>${esc(l.a.t)} <span class="meta">${esc(l.a.n)}, ${nf(l.q,0)} titres à ${nf(l.pru,2)} ${esc(l.a.cur)}</span></span><span class="row"><button class="btn sm" data-act="goan" data-id="${esc(l.p.tk)}">Ouvrir l'analyse financière</button></span></h2>
      <div class="verdict ${l.sig[0]}"><div class="vh">${l.sig[1]}</div><p style="margin:0;color:var(--text);line-height:1.55">${l.sig[2]}</p></div>
      <div class="grid" style="margin-top:4px">
        <div class="s7" style="min-width:0"><div class="tw"><table class="tbl"><thead><tr><th>Indicateur publié</th><th>Période</th><th class="n">Précédent</th><th class="n">Dernier</th><th class="n">Variation</th></tr></thead><tbody>
          ${l.F.map(f=>`<tr><td><span class="dot ${f.up?'ok':'ko'}" style="margin-right:7px"></span>${f.l}</td><td class="meta">${esc(f.per)}</td><td class="n">${f.fmt(f.p)}</td><td class="n">${f.fmt(f.n)}</td><td class="n ${cls(f.ch)}">${sgn(f.ch,1)}</td></tr>`).join('')}
          <tr><td>BPA consensus N</td><td class="meta">estimation</td><td class="n">${nf(l.a.eps[l.a.eps.length-1],2)}</td><td class="n">${nf(l.a.epsE,2)}</td><td class="n ${cls(l.cons)}">${sgn(l.cons,1)}</td></tr>
        </tbody></table></div></div>
        <div class="s5" style="min-width:0"><div class="stats" style="grid-template-columns:1fr 1fr">
          <div class="stat"><div class="k">Performance de la ligne</div><div class="x ${l.perf<0?'down':''}">${sgn(l.perf)}</div><div class="d">${(l.pnlE>=0?'+':'')+nf(l.pnlE,0)} €</div></div>
          <div class="stat"><div class="k">Décision du volet 2</div><div class="x" style="font-size:15px">${l.R.positive?'Positive':'Négative'}</div><div class="d">score ${l.R.score}/100</div></div>
          <div class="stat"><div class="k">Prix d'achat cible</div><div class="x">${nf(l.R.buy,2)}</div><div class="d">renforcement sous ce prix</div></div>
          <div class="stat"><div class="k">Stop de la ligne / objectif</div><div class="x" style="font-size:15px">${nf(l.stop,2)} / ${nf(l.R.tp,2)}</div><div class="d">PRU − ${nf(S.an.crit.sl,0)} % / take-profit du volet 2</div></div>
        </div></div>
      </div>
      <h3 class="h3">Dernière publication trimestrielle <span class="meta">facultatif : prioritaire sur l'exercice annuel pour le BPA et le CA</span></h3>
      <div class="fields">${F('Trimestre',P('qd'),'t',{ph:'ex. T3 2026'})}${F('BPA du trimestre',P('qeps'),'nn')}${F('BPA même trimestre N-1',P('qepsP'),'nn')}${F('CA du trimestre (M)',P('qrev'),'nn')}${F('CA même trimestre N-1 (M)',P('qrevP'),'nn')}${F("Date d'achat",P('d'),'t')}</div></div>`:''}
  </div>`;
}
