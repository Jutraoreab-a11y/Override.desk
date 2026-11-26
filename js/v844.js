/* ============ v8.44 : Commodities allégé, exact et direct ============
   1. Plus d'import CSV : les tableaux sont alimentés uniquement par Claude et les sources en direct.
   2. Tout signal d'achat (BUY, ACHAT, dont BUY GÉOPOLITIQUE) en vert.
   3. Tableau de confirmation : mise en forme conditionnelle des ratios (vert = achat, rouge = vente).
   4. Variations : base précisée (comptant clôture / clôture veille 17 h New York ; futur dernier / règlement veille).
   5. Futurs : le « Brent futur » n'est plus une copie du Brent du jour ; séance du jour = vrai 2e contrat (ICE BRN2!).
   6. Graphique Or / Argent : vrais prix (or à droite, argent à gauche), plus de base 100 par défaut.
   7. Doublons supprimés : un seul bloc taux et inflation (FOMC inclus), un bloc dollar et rendements US. */

/* ---- 2. tout BUY en vert ---- */
{const _cc=cmCls;cmCls=function(t){const u=String(t||'').toUpperCase();if(/\bBUY\b|ACHAT|ACCUMULATION/.test(u)&&!/SELL|VENTE/.test(u))return'ok';return _cc.apply(this,arguments);};}

/* ---- 5. futurs : pas de copie du cours du jour ---- */
{const _cs=cmSeries;cmSeries=function(){const s=_cs.apply(this,arguments);try{const B=s.brent,F=s.brentF;if(B&&F)for(let i=0;i<F.length;i++){if(F[i]!==null&&B[i]!==null&&F[i]===B[i])F[i]=null;}
  const Q=typeof LIVE42==='object'&&LIVE42.q;if(Q&&s.live&&s.d[s.d.length-1]===s.live){const n=s.d.length-1;if(Q.brentF2&&isFinite(Q.brentF2.last)){s.brentF[n]=Q.brentF2.last;}}}catch(e){}return s;};}

/* ---- 6. graphique : vrais prix ---- */
try{if(ui.cmXA&&ui.cmXA.gold&&!ui.cmXA.gold.init44){ui.cmXA.gold.init44=1;ui.cmXA.gold.b100=false;if(!ui.cmXA.gold.cmp.includes('silver'))ui.cmXA.gold.cmp=['silver'];}}catch(e){}
{const _mx=mktX;mktX=function(){const X=_mx.apply(this,arguments);if(!ui.cmSilverPass&&(ui.cmA==='gold'||ui.cmA==='silver')&&X&&!X.init44){X.init44=1;X.b100=false;}return X;};}

/* ---- 3, 4, 1, 7 : post-traitement de la vue ---- */
const num44=t=>{const x=String(t||'').replace(/\s| | /g,'').replace('×','').replace('%','').replace(',','.');const v=parseFloat(x);return isFinite(v)?v:null;};
function cm44(){const P=document.getElementById('p-cm');if(!P)return;const Pm=cmP(),a=ui.cmA==='silver'?'gold':(ui.cmA||'brent');
  /* 1 : plus d'import CSV */
  P.querySelectorAll('[data-act=cmimp],[data-ui=cmInst],[data-act=cmimpgo]').forEach(b=>b.remove());ui.cmImp=false;
  /* 3 : ratios en couleur, 4 : base des variations */
  P.querySelectorAll('table').forEach(t=>{const H=[...t.querySelectorAll('thead th')].map(th=>th.textContent.replace(/\s*i\s*$/,'').trim());if(!H.length)return;
    H.forEach((h,j)=>{const th=t.querySelectorAll('thead th')[j];if(!th||th.dataset.v44)return;th.dataset.v44=1;
      if(/^Var\.$/.test(h)){th.firstChild&&(th.firstChild.textContent='Var. clôture ');th.title='Clôture du jour / clôture de la veille − 1 (comptant, 17 h New York ; séance du jour : dernier cours / clôture de la veille)';}
      else if(/^Var\. futur/.test(h))th.title='Premier contrat à terme : dernier cours ou règlement / règlement de la veille − 1 (COMEX, ICE, NYMEX)';
      else if(/^Var\. (or|argent)/.test(h))th.title='Comptant : clôture / clôture de la veille − 1 (17 h New York). Le contrat à terme du panneau de droite se compare à son règlement de la veille (13 h 30 New York) : les deux variations peuvent différer de signe.';
      else if(/^Var\. 5 séances/.test(h))th.title='Clôture du jour / clôture d\'il y a 5 séances − 1';});
    const col=re=>H.findIndex(h=>re.test(h)),cR=col(/^Ratio Or\/Argent/),cB=col(/^Ratio Or\/Brent/),cZ=col(/^Z-score/),cY=col(/^Yuan$/);
    t.querySelectorAll('tbody tr').forEach(tr=>{const td=tr.cells;const paint=(j,good)=>{if(j<0||!td[j])return;const c=td[j];c.classList.remove('cf-up','cf-dn');if(good===null)return;c.classList.add(good?'cf-up':'cf-dn');};
      if(cR>=0){const v=num44(td[cR]&&td[cR].textContent);paint(cR,v===null?null:v>=Pm.gsRef);}
      if(cB>=0){const v=num44(td[cB]&&td[cB].textContent);paint(cB,v===null?null:v>=Pm.gbDis);}
      if(cZ>=0){const v=num44(td[cZ]&&td[cZ].textContent);paint(cZ,v===null||Math.abs(v)<Pm.zAlert?null:v<0);}});});
  /* Brent : 2e contrat non publié dans l'historique : case vide expliquée, jamais « férié » */
  P.querySelectorAll('table').forEach(t=>{const H=[...t.querySelectorAll('thead th')].map(th=>th.textContent.replace(/\s*i\s*$/,'').trim()),jf=H.findIndex(h=>/^Brent futur/.test(h)),jb=H.findIndex(h=>/^Basis Brent/.test(h));if(jf<0)return;
    t.querySelectorAll('tbody tr').forEach(tr=>[jf,jb].forEach(j=>{const c=tr.cells[j];if(c&&/à relire|férié|non renseigné/.test(c.textContent)){c.innerHTML='<span class="meta" title="Deuxième contrat Brent (ICE) : lu en direct pour la séance du jour ; historique non publié gratuitement, jamais recopié du premier contrat">—</span>';}}));});
  /* note de lecture des variations, une fois par tableau */
  [...P.querySelectorAll(':scope>.grid>.card')].forEach(c=>{const h=((c.querySelector(':scope>h2')||{}).textContent||'');if(!/Tableau (chronologique|de confirmation)/.test(h)||c.querySelector('.v44n'))return;
    c.insertAdjacentHTML('beforeend',`<p class="note v44n">Variations : comptant = clôture / clôture de la veille (17 h New York) ; futur = dernier cours / règlement de la veille. Séance du jour : dernier cours en direct (TradingView). Ratios et z-score : fond vert = pousse à l'achat, rouge = à la vente (seuils : ratio or/argent ${Pm.gsRef}, or/Brent ${Pm.gbDis}, z-score ±${Pm.zAlert}).</p>`);});
  /* 7 : doublons */
  const C=()=>[...P.querySelectorAll(':scope>.grid>.card')],T=c=>((c.querySelector(':scope>h2')||{}).textContent||'').trim();
  const mp=P.querySelector('#macpink'),inf=C().find(c=>/^Inflation & politique monétaire/.test(T(c)));
  if(inf){const fomc=[...inf.querySelectorAll('.tw')].find(w=>/Médiane FOMC/.test(w.textContent));if(mp&&fomc&&!mp.querySelector('.fomc44')){fomc.classList.add('fomc44');fomc.style.marginTop='10px';mp.querySelector('.mp')?.after(fomc);}inf.remove();}
  const rd=P.querySelector('#ratesdxy');if(rd){const tws=rd.querySelectorAll(':scope>.tw');if(tws.length>1)tws[0].remove();const h=rd.querySelector(':scope>h2>span');if(h&&!h.dataset.v44){h.dataset.v44=1;h.innerHTML='Dollar et rendements US <span class="meta">DXY, taux 2 et 10 ans : performances</span>';}}}
{const _rc=renderCM;renderCM=function(){ui.cmImp=false;const r=_rc.apply(this,arguments);try{cm44();}catch(e){console.error('cm44',e);}return r;};}
{const st=document.createElement('style');st.textContent=`.fomc44 table{margin-top:4px}`;document.head.appendChild(st);}
