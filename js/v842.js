/* ============ v8.42 ============
   1. Ligne du jour en direct dans tous les tableaux Commodities (comptant or/argent, USD/CNH, DXY, S&P 500, premiers contrats).
   2. Volume échangé sur l'or (contrat COMEX GC) : historique demandé à Claude + séance du jour en direct, tableau dans la vue Or / Argent.
   3. Vue Or / Argent regroupée par paires (or puis argent, l'argent servant de piston), plus de bouton « Tout » : tout est affiché.
   4. (i) sur chaque ratio, chaque taux, le DXY (définition, composition, lecture) et chaque indicateur.
   5. Chaque bloc du SaaS s'ouvre et se ferme par une petite icône. */

/* ---------- 2. série de volume ---------- */
try{CM_INST.gvol='Volume or (COMEX GC, contrats)';if(typeof CMD==='object'&&!CMD.gvolC){CMD.gvolC=CMD.d.map(()=>null);CMD.gvolO=CMD.d.map(()=>null);CMD.gvolV=CMD.d.map(()=>null);}}catch(e){}
try{JOB_CM_X.gold.gvol='Volume quotidien échangé du contrat or COMEX (GC=F, colonne « Volume » de l\'historique Yahoo Finance), en nombre de contrats';}catch(e){}
{const _js=jobCmSeries;jobCmSeries=function(res){try{const X=res&&res.series;if(X&&Array.isArray(X.gvol)){S.cm.add=S.cm.add||{};const A=S.cm.add.gvol=S.cm.add.gvol||{};
    X.gvol.forEach(r=>{const v=+(r&&(r.volume!==undefined?r.volume:r.close));if(/^\d{4}-\d{2}-\d{2}$/.test(String(r&&r.date))&&isFinite(v)&&v>0)A[r.date]=[v,null,null];});delete X.gvol;}}catch(e){}
  return _js.apply(this,arguments);};}

/* ---------- 1. ligne du jour en direct ---------- */
const LIVE42={at:0,busy:false,q:null,ts:null};
function live42Day(){const ny=new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}));if(ny.getDay()===0||ny.getDay()===6)return null;
  return`${ny.getFullYear()}-${String(ny.getMonth()+1).padStart(2,'0')}-${String(ny.getDate()).padStart(2,'0')}`;}
async function live42Load(){if(LIVE42.busy||Date.now()-LIVE42.at<4*60e3)return;LIVE42.busy=true;
  try{const r=await fetch('/api/v1/spot'),j=await r.json();if(r.ok&&j.q){LIVE42.q=j.q;LIVE42.ts=j.at;if(ui.tab==='cm')renderCM();}}catch(e){}finally{LIVE42.at=Date.now();LIVE42.busy=false;}}
{const _cs=cmSeries;cmSeries=function(){const s=_cs.apply(this,arguments);try{const Q=LIVE42.q,d=live42Day();if(!Q||!d||!s.d.length||d<=s.d[s.d.length-1])return s;
  const val={gold:Q.gold,silver:Q.silver,cnh:Q.cnh,dxy:Q.dxy,spx:Q.spx,goldF:Q.goldF,silverF:Q.silverF,brentF:Q.brentS,brentS:Q.brentS,wtiF:Q.wtiF,brent:Q.brentS,wti:Q.wtiF};   /* Brent et WTI du jour : premier contrat en direct (comme le provisoire avant publication EIA) */
  s.d.push(d);Object.keys(CM_INST).forEach(k=>{if(!s[k])return;const x=val[k];let c=x&&isFinite(x.last)?x.last:null;if(k==='gvol')c=Q.goldF&&isFinite(Q.goldF.vol)?Q.goldF.vol:null;
    const p=(()=>{for(let i=s[k].length-1;i>=0;i--)if(s[k][i]!==null&&s[k][i]!==undefined)return s[k][i];return null;})();
    s[k].push(c);if(s[k+'O'])s[k+'O'].push(x&&isFinite(x.open)&&k!=='gvol'?x.open:null);if(s[k+'V'])s[k+'V'].push(c!==null&&p>0&&k!=='gvol'?c/p-1:null);});s.live=d;}catch(e){console.error('live42',e);}return s;};}

/* ---------- 3. vue Or / Argent regroupée ---------- */
/* v8.42.1 : deux vues séparées comme avant (Tendance / pression et Confirmation / corrélations), sans « Tout » ; chaque vue montre les deux actifs de la paire */
{const _cx=ctxHTML;ctxHTML=function(){const h=_cx.apply(this,arguments);if(ui.tab!=='cm')return h;const t=ui.cmT==='c'?'c':'t';
  return h.replace(/<div class="seg" role="tablist" aria-label="Vue">[\s\S]*?<\/div>/,`<div class="seg" role="tablist" aria-label="Vue">${[['t','Tendance : pression & approvisionnement'],['c','Confirmation & corrélations']].map(([k,l])=>`<button role="tab" data-act="cmt" data-id="${k}" aria-selected="${t===k}">${l}</button>`).join('')}</div>`);};}
function cmVolHTML(){const s=cmSeries(),N=s.d.length,V=s.gvol||[],G=s.gold||[],rows=[];
  for(let i=N-1;i>=0&&rows.length<30;i--){if(!nn(V[i])&&s.d[i]!==s.live)continue;const prev=(()=>{for(let j=i-1;j>=0;j--)if(nn(V[j]))return V[j];return null;})();
    const w=[];for(let j=i-1;j>=0&&w.length<20;j--)if(nn(V[j]))w.push(V[j]);const avg=w.length>=5?w.reduce((a,b)=>a+b,0)/w.length:null;
    const gp=(()=>{for(let j=i-1;j>=0;j--)if(nn(G[j]))return G[j];return null;})(),gv=nn(G[i])&&gp>0?G[i]/gp-1:null;rows.push({d:s.d[i],v:V[i],dv:nn(V[i])&&prev>0?V[i]/prev-1:null,ra:nn(V[i])&&avg>0?V[i]/avg:null,gv,live:s.d[i]===s.live});}
  const Q=LIVE42.q&&LIVE42.q.goldF,lec=r=>{if(!nn(r.ra)||!nn(r.gv))return'—';const hi=r.ra>=1.2,lo=r.ra<=0.8;
    return r.gv>0?(hi?'<span class="tag ok">Hausse avec volume : conviction acheteuse</span>':lo?'<span class="tag am">Hausse sans volume : fragile</span>':'Hausse, volume normal'):(hi?'<span class="tag ko">Baisse avec volume : vendeurs déterminés</span>':lo?'<span class="tag am">Baisse sans volume : simple respiration</span>':'Baisse, volume normal');};
  return`<div class="card s12" id="cm-vol"><h2><span>Or · Volume échangé <span class="meta">contrat or COMEX (GC), en contrats${Q&&isFinite(Q.avg10)?` · moyenne 10 séances ${nf(Q.avg10,0)} · 30 séances ${nf(Q.avg30,0)}`:''}</span></span></h2>
    ${rows.length?`<div class="tw"><table class="tbl fin"><thead><tr><th>Date</th><th class="n">Volume</th><th class="n">Var. vs veille</th><th class="n">Volume / moyenne 20 séances</th><th class="n">Var. or</th><th>Lecture prix × volume</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${fdate(r.d)}${r.live?' <span class="meta">en cours</span>':''}</td><td class="n">${nn(r.v)?nf(r.v,0):'à relire'}</td><td class="n ${nn(r.dv)?cls(r.dv):''}">${nn(r.dv)?sgn(r.dv*100,1):'—'}</td><td class="n ${nn(r.ra)?(r.ra>=1.2?'cf-up':r.ra<=0.8?'cf-dn':''):''}">${nn(r.ra)?nf(r.ra,2)+'×':'—'}</td><td class="n ${nn(r.gv)?cls(r.gv):''}">${nn(r.gv)?sgn(r.gv*100,2):'—'}</td><td>${lec(r)}</td></tr>`).join('')}</tbody></table></div>`
      :'<p class="note">Historique des volumes demandé à Claude (Yahoo Finance GC=F) : il s\'affiche dès son retour ; la séance du jour est lue en direct.</p>'}
    <p class="note">Le volume confirme ou infirme le mouvement du prix : une hausse portée par un volume supérieur à 1,2× la moyenne a plus de chances de durer ; une hausse sans volume est fragile. Séance du jour : volume partiel en cours de séance (TradingView, COMEX:GC1!). Historique : volume quotidien publié (Yahoo Finance, GC=F).</p></div>`;}
function cm42Group(){const P=document.getElementById('p-cm'),G=P&&P.querySelector(':scope>.grid');if(!G)return;const a=ui.cmA==='silver'?'gold':(ui.cmA||'brent');
  const C=[...G.querySelectorAll(':scope>.card')],T=c=>((c.querySelector('h2')||{}).textContent||'').trim(),f=re=>C.find(c=>re.test(T(c)));
  if(a!=='gold')return;
  const old=G.querySelector('#cm-vol');if(old)old.remove();
  const order=[f(/^Taux directeurs, inflation/),f(/^Tableau de décision/),f(/^Or · Signaux du jour/),f(/^Argent · Signaux du jour/),f(/^Argent · indicateurs/),f(/^Graphique principal/),
    f(/^Or · Tableau chronologique/),f(/^Argent · Tableau chronologique/),f(/^Or · Tableau de confirmation/),f(/^Argent · Tableau de confirmation/),'VOL',
    f(/^Sensibilité & propulsion/),f(/^Taux directeurs en vigueur/),f(/^Inflation & politique/)].filter(Boolean);
  const head=C.find(c=>c.querySelector('.symhead'));let anchor=head||null;
  order.forEach(c=>{if(c==='VOL'){const t=document.createElement('div');t.innerHTML=cmVolHTML();c=t.firstElementChild;}if(anchor)anchor.after(c);else G.prepend(c);anchor=c;});
  const so=f(/^Or · Signaux du jour/),sa=f(/^Argent · Signaux du jour/);if(so&&sa){so.classList.remove('s12');so.classList.add('s6');sa.classList.remove('s12');sa.classList.add('s6');}
  const ai=f(/^Argent · indicateurs/);if(ai){const h=ai.querySelector('h2');if(h&&!/piston/.test(h.textContent))h.insertAdjacentHTML('beforeend',' <span class="meta">l\'argent, plus sensible, sert de piston à l\'or</span>');}}
{const _rc=renderCM;renderCM=function(){if(ui.cmT!=='c')ui.cmT='t';const r=_rc.apply(this,arguments);try{cm42Group();live42Mark();cm42Info();}catch(e){console.error('cm42',e);}live42Load();return r;};}
function live42Mark(){const d=LIVE42.q&&live42Day();if(!d)return;const fdt=fdate(d),t=LIVE42.ts?new Date(LIVE42.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
  document.querySelectorAll('#p-cm tbody tr').forEach(tr=>{const td=tr.cells[0];if(td&&td.textContent.trim().startsWith(fdt)&&!td.querySelector('.live42'))td.insertAdjacentHTML('beforeend',` <span class="tag am live42" title="Séance en cours : cours en direct (TradingView), non clôturé">en direct ${t}</span>`);});}

/* ---------- 4. (i) partout ---------- */
const CM_INFO42=[
  [/^DXY|Dollar Index|Dollar \(DXY\)/,'Dollar Index (DXY, ICE) : valeur du dollar américain face à un panier fixe de six devises. Composition : euro 57,6 %, yen 13,6 %, livre sterling 11,9 %, dollar canadien 9,1 %, couronne suédoise 4,2 %, franc suisse 3,6 %. Base 100 en mars 1973.','Au-dessus de 100, le dollar est plus fort qu\'en 1973 face au panier. Un DXY qui monte rend l\'or et le pétrole plus chers pour le reste du monde : pression baissière. Un DXY qui baisse les soutient. Utilisation : confirmer un achat d\'or quand le DXY casse à la baisse ; se méfier d\'une hausse de l\'or quand le DXY monte aussi (mouvement fragile ou refuge pur). Comme l\'euro pèse 57,6 %, le DXY suit surtout l\'EUR/USD en miroir.'],
  [/^Signal (or|principal)|^Signal Or/,'Signal or : sens de l\'or comparé au sens du dollar (DXY) sur la séance.','ACHAT FONDAMENTAL : dollar en baisse et or en hausse, mouvement sain. RÉSILIENCE : l\'or monte malgré un dollar ferme, demande refuge forte. VENTE MACRO : dollar en hausse, or en baisse. ALERTE ROUGE : dollar et or baissent ensemble, faiblesse propre à l\'or.'],
  [/^Corr\. DXY|Corrélation DXY/,'Corrélation glissante entre le DXY et l\'actif (−1 à +1).','Normalement négative pour l\'or (le dollar monte, l\'or baisse). Proche de −1 : le dollar explique le mouvement. Proche de 0 ou positive : l\'or bouge pour une autre raison (refuge, banques centrales).'],
  [/^Ratio XAU|^Ratio Or ?\/ ?Argent|^Or \/ Argent/,'Ratio or / argent : nombre d\'onces d\'argent pour une once d\'or.','Au-dessus de 80 : l\'or est cher face à l\'argent (peur, refuge) et l\'argent a un potentiel de rattrapage. Sous 65 : l\'argent a déjà surperformé. L\'argent, plus volatil, sert de piston : quand il part avant l\'or, le mouvement de l\'or suit souvent.'],
  [/^Ratio Or ?\/ ?Brent|^Or \/ Brent/,'Ratio or / Brent : nombre de barils de Brent pour une once d\'or.','Au-delà de 40 : l\'or est recherché comme refuge alors que l\'activité (pétrole) ralentit, climat de prudence. Vers 15 à 25 : cycle économique porteur. Une hausse rapide du ratio annonce souvent un ralentissement.'],
  [/^Z-score ratio/,'Écart du ratio or / argent à sa moyenne, en écarts-types.','Au-delà de +2 : ratio anormalement haut, l\'argent est bon marché face à l\'or. Sous −2 : l\'argent est cher. Entre −1 et +1 : zone normale.'],
  [/^Bêta argent/,'Bêta : de combien l\'argent bouge pour 1 % de mouvement de l\'or.','Un bêta de 1,5 signifie que l\'argent amplifie l\'or de 50 % : c\'est l\'effet piston. Plus il est élevé, plus l\'argent démultiplie le mouvement (à la hausse comme à la baisse).'],
  [/^Impulsion/,'Impulsion sur 20 séances, en écarts-types.','Au-delà de la borne : mouvement exceptionnel, souvent suivi d\'une pause. Dans la borne : tendance normale.'],
  [/^Silver Lead/,'Avance de l\'argent sur l\'or : impulsion de l\'argent au-delà de ce qu\'explique son bêta.','Positif : l\'argent part devant, l\'or suit souvent (signal d\'achat précoce). Négatif : l\'argent décroche, prudence sur l\'or.'],
  [/^Fed : fourchette|^Fed Funds|^Fed$/,'Taux directeur de la Réserve fédérale américaine (fourchette cible) et taux effectif au jour le jour (EFFR).','Des taux élevés rendent l\'or moins attractif (il ne verse pas d\'intérêt) et soutiennent le dollar. Une baisse de taux attendue est favorable à l\'or. Le taux effectif évolue à l\'intérieur de la fourchette.'],
  [/^BCE/,'Taux de la Banque centrale européenne : facilité de dépôt (rémunération des dépôts des banques) et refinancement principal.','Une BCE qui baisse ses taux affaiblit l\'euro, donc renforce le DXY (57,6 % d\'euro) : pression sur l\'or en dollars. L\'écart de taux Fed − BCE guide l\'EUR/USD.'],
  [/^BoE/,'Bank Rate : taux directeur de la Banque d\'Angleterre.','Agit sur la livre sterling (11,9 % du DXY). Une BoE plus restrictive que la Fed affaiblit le dollar.'],
  [/^BoC/,'Taux cible du financement à un jour de la Banque du Canada.','Agit sur le dollar canadien (9,1 % du DXY), devise liée au pétrole.'],
  [/^CPI/,'Indice des prix à la consommation américain (BLS), glissement sur un an.','Une inflation qui accélère pousse la Fed à garder des taux hauts (négatif pour l\'or à court terme) mais renforce l\'or comme protection à long terme. Comparer au chiffre précédent.'],
  [/^PPI/,'Indice des prix à la production américain (demande finale, BLS), glissement sur un an.','Indicateur avancé de l\'inflation : une hausse du PPI annonce souvent une hausse du CPI quelques mois plus tard.'],
  [/^Dernière décision/,'Dernière décision de taux du comité de politique monétaire de la Fed (FOMC) et projection médiane.','Si la médiane FOMC est sous le taux actuel, le marché attend des baisses : favorable à l\'or.'],
  [/^Taux réel/,'Taux réel 10 ans américain (obligations indexées sur l\'inflation, TIPS).','Premier moteur de l\'or : un taux réel qui baisse rend l\'or plus attractif ; un taux réel qui monte le pénalise.'],
  [/^Rendement US|^Taux US/,'Rendement des emprunts d\'État américains (2 ou 10 ans), variation relative.','Des rendements en hausse attirent les capitaux vers le dollar et pèsent sur l\'or. En baisse : soutien pour l\'or.'],
  [/^Volume|Volume \/ moyenne/,'Volume échangé : nombre de contrats or COMEX négociés sur la séance.','Rapporté à la moyenne de 20 séances : au-dessus de 1,2×, le mouvement du jour est porté par de vrais flux ; sous 0,8×, il est peu suivi.'],
  [/^Lecture prix/,'Croisement du sens du prix et du niveau de volume.','Hausse avec volume = conviction ; hausse sans volume = fragile ; baisse avec volume = vendeurs déterminés ; baisse sans volume = respiration.'],
  [/^USD\/CNH/,'Prix d\'un dollar en yuans offshore.','Indique la demande chinoise (premier acheteur physique d\'or) ; information complémentaire : le signal de l\'or, lui, se lit face au DXY.'],
  [/^Basis Or/,'Basis or = comptant − premier contrat à terme, en dollars.','Négatif = contango (normal, coût de portage) ; proche de zéro ou positif = tension sur le physique.'],
  [/^Basis Argent/,'Basis argent = comptant − contrat à terme, en dollars.','Négatif = contango ; positif = backwardation, demande physique immédiate.']];
function cm42InfoOf(t){t=String(t||'').replace(/\s+i$/,'').replace(/\s+/g,' ').trim();const r=CM_INFO42.find(x=>x[0].test(t));if(r)return{w:r[1],h:r[2]||''};return typeof cmInfoOf==='function'?cmInfoOf(t):null;}
function cm42Btn(el,lab){if(!el||el.querySelector(':scope > .ihelp'))return;if(!cm42InfoOf(lab))return;el.insertAdjacentHTML('beforeend',` <button class="ihelp noprint" type="button" data-ih2="1" data-lab="${esc(lab)}" aria-label="Signification de ${esc(lab)}">i</button>`);}
function cm42Info(){const P=document.getElementById('p-cm');if(!P)return;
  P.querySelectorAll('.stat .k').forEach(k=>cm42Btn(k,k.textContent.trim()));
  P.querySelectorAll('.macpink .mp span').forEach(k=>cm42Btn(k,k.textContent.trim()));
  P.querySelectorAll('#dectab tbody td:first-child, #ratesdxy tbody td:first-child, #cm-vol thead th').forEach(k=>cm42Btn(k,k.textContent.trim()));
  P.querySelectorAll('.dc b').forEach(k=>cm42Btn(k,k.textContent.trim()));
  P.querySelectorAll('table thead th').forEach(th=>{if(!th.querySelector('.ihelp'))cm42Btn(th,th.textContent.trim());});
  document.querySelectorAll('#side .kv > span:first-child').forEach(k=>cm42Btn(k,k.textContent.trim()));}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.ihelp[data-ih2]');if(!b)return;e.preventDefault();e.stopPropagation();
  const old=document.getElementById('ihpop');if(old)old.remove();const lab=b.dataset.lab,I=cm42InfoOf(lab);if(!I)return;const r=b.getBoundingClientRect();
  const d=document.createElement('div');d.id='ihpop';d.setAttribute('role','dialog');d.innerHTML=`<b>${esc(lab)}</b><p>${esc(I.w)}</p>${I.h?`<p><b>Comment lire et utiliser :</b> ${esc(I.h)}</p>`:''}`;
  document.body.appendChild(d);const w=Math.min(360,window.innerWidth-20);d.style.width=w+'px';d.style.left=Math.max(10,Math.min(r.left-w/2,window.innerWidth-w-10))+'px';d.style.top=(r.bottom+6+window.scrollY)+'px';},true);
/* le (i) des colonnes (v8.41) consulte aussi les nouvelles définitions */
{const _ci=cmInfoOf;cmInfoOf=function(t){const r=CM_INFO42.find(x=>x[0].test(String(t||'').replace(/\s+/g,' ').trim()));return r?{w:r[1],h:r[2]||''}:_ci.apply(this,arguments);};}
{const o=new MutationObserver(()=>{try{if(ui.tab==='cm')document.querySelectorAll('#side .kv > span:first-child').forEach(k=>cm42Btn(k,k.textContent.trim()));}catch(e){}});const st=()=>{const S0=document.getElementById('side');if(S0)o.observe(S0,{childList:true,subtree:true});else setTimeout(st,300);};st();}

/* ---------- 5. ouvrir / fermer chaque bloc ---------- */
let FOLD42={};try{FOLD42=JSON.parse(localStorage.getItem('fomo.fold')||'{}')||{};}catch(e){}
const fold42Key=c=>{const p=c.closest('section.panel,[id^=p-]'),h=c.querySelector(':scope > h2');if(!h)return null;
  const t=[...h.childNodes].map(n=>n.nodeType===3?n.textContent:(n.matches&&n.matches('button,.row,select,.fold42')?'':n.textContent)).join(' ').replace(/\d[\d\s,.]*/g,'#').replace(/\s+/g,' ').trim().slice(0,60);return(p?p.id:'x')+'|'+t;};
function fold42Apply(){const M=document.getElementById('main');if(!M)return;
  M.querySelectorAll('.card').forEach(c=>{const h=c.querySelector(':scope > h2');if(!h)return;const k=fold42Key(c);if(!k)return;const shut=!!FOLD42[k];
    if(c.classList.contains('folded')!==shut)c.classList.toggle('folded',shut);
    let b=h.querySelector(':scope > .fold42');if(!b){h.insertAdjacentHTML('beforeend','<button type="button" class="fold42 noprint" aria-label="Ouvrir ou fermer ce bloc"></button>');b=h.querySelector(':scope > .fold42');}
    const want=shut?'▸':'▾';if(b.textContent!==want){b.textContent=want;b.setAttribute('aria-expanded',String(!shut));b.title=shut?'Ouvrir ce bloc':'Fermer ce bloc';}});}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.fold42');if(!b)return;e.preventDefault();e.stopPropagation();const c=b.closest('.card'),k=c&&fold42Key(c);if(!k)return;
  if(FOLD42[k])delete FOLD42[k];else FOLD42[k]=1;try{localStorage.setItem('fomo.fold',JSON.stringify(FOLD42));}catch(_){}fold42Apply();},true);
{const _ra42=renderAll;renderAll=function(){const r=_ra42.apply(this,arguments);try{fold42Apply();}catch(e){}return r;};}
{let q=0;const run=()=>{q=0;try{fold42Apply();if(ui.tab==='cm')cm42Info();}catch(e){}};const obs=new MutationObserver(()=>{if(!q)q=setTimeout(run,40);});
  const start=()=>{const M=document.getElementById('main');if(M){obs.observe(M,{childList:true,subtree:true});run();}else setTimeout(start,300);};start();}

{const st=document.createElement('style');st.textContent=`
.fold42{margin-left:auto;flex:none;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;border:1px solid var(--line,#27272A);background:transparent;color:var(--mute,#A1A1AA);font-size:11px;cursor:pointer;padding:0;order:99}
.fold42:hover{color:var(--hi,#FAFAFA);border-color:var(--line2,#52525B)}
.card>h2{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.card.folded>*:not(h2){display:none!important}.card.folded{padding-bottom:10px}
.live42{font-size:10.5px;padding:1px 6px;margin-left:4px}`;document.head.appendChild(st);}
