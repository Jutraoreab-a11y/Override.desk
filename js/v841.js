/* ============ v8.41 : Commodities ============
   1. Chaque actif a sa propre configuration de graphique (actif principal, comparaisons, base 100, superpositions) :
      ajouter un indicateur dans Or / Argent ne touche plus Brent / WTI, et inversement.
   2. Stocks de brut US API et EIA lus en direct (calendrier économique TradingView, sources api.org et eia.gov), dès leur publication.
   3. Tableaux chronologique et de confirmation toujours dépliés (plus de défilement interne).
   4. Un (i) sur chaque titre de colonne : signification, lecture et interprétation du chiffre.
   5. Bloc taux et inflation sans fond rose. */

/* ---- 1. configuration par actif ---- */
mktX=function(){const a=ui.cmA==='silver'?'gold':(ui.cmA||'brent');ui.cmXA=ui.cmXA||{};
  if(!ui.cmXA[a]){const old=ui.cmX&&ui.cmX.main&&(MKT_TO_CMA[ui.cmX.main]===a||(a==='gold'&&MKT_TO_CMA[ui.cmX.main]==='silver'))?ui.cmX:null;
    ui.cmXA[a]=old?{main:old.main,cmp:[...(old.cmp||[])],b100:!!old.b100}:{main:a,cmp:[],b100:false};}
  const X=ui.cmXA[a];if(!Array.isArray(X.cmp))X.cmp=[];return X;};
mktSetMain=function(k){const t=MKT_TO_CMA[k];if(t){const a=t==='silver'?'gold':t;if(a!==(ui.cmA==='silver'?'gold':ui.cmA))ui.cmA=a;}const X=mktX();X.main=k;X.cmp=X.cmp.filter(c=>c!==k);};
cmOv=function(){const a=ui.cmA==='silver'?'gold':(ui.cmA||'brent');ui.cmOvA=ui.cmOvA||{};if(!ui.cmOvA[a])ui.cmOvA[a]=a==='brent'?{spread:true}:{basis:true};return ui.cmOvA[a];};

/* ---- 2. stocks de brut en direct ---- */
const OIL41={at:0,busy:false,err:''};
const oilParis=iso=>{const d=new Date(iso);return{d:d.toLocaleDateString('sv-SE',{timeZone:'Europe/Paris'}),t:d.toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'})};};
async function oilLive(force){if(OIL41.busy||(!force&&Date.now()-OIL41.at<10*60e3))return;OIL41.busy=true;
  try{const r=await fetch('/api/v1/oil');const j=await r.json();if(!r.ok)throw new Error(j.error||'HTTP '+r.status);
    const map=new Map(OIL_STK.w.map(x=>[x.wk,x]));let n=0;const now=Date.now(),next={};
    (j.events||[]).forEach(e=>{const P=oilParis(e.at),wk=oilWk(P.d);
      if(new Date(e.at).getTime()>now-3*3600e3&&e.actual===null){if(!next[e.k]||e.at<next[e.k])next[e.k]=e.at;}
      if(e.actual===null&&e.forecast===null)return;
      let w=map.get(wk);if(!w){w={wk,api:[null,null,null,null],eia:[null,null,null,null],lvl:null};map.set(wk,w);}
      const cur=w[e.k]||[];if(String(cur[2])!==String(e.actual===null?NaN:e.actual))n++;w[e.k]=[P.d,P.t,e.actual===null?NaN:e.actual,e.forecast===null?NaN:e.forecast];   /* NaN = pas encore publié (affiché « non publié », jamais lu comme 0) */});
    const W=[...map.values()].sort((p,q)=>p.wk<q.wk?-1:1);
    for(let i=1;i<W.length;i++){const w=W[i],p=W[i-1];if(!isFinite(w.lvl)||w.lvlCalc){w.lvl=isFinite(p.lvl)&&isFinite(w.eia[2])?Math.round((p.lvl+w.eia[2])*1000)/1000:null;w.lvlCalc=w.lvl!==null;}}
    OIL_STK.w=W;OIL_STK.at=j.at;OIL_STK.src.api=OIL_STK.src.inv='https://www.tradingview.com/economic-calendar/';OIL_STK.live=true;
    if(next.api)OIL_STK.next.api=next.api;if(next.eia)OIL_STK.next.eia=next.eia;
    try{localStorage.setItem('fomo.oil',JSON.stringify(OIL_STK));}catch(e){}OIL41.err='';if(n&&ui.tab==='cm')renderCM();}
  catch(e){OIL41.err=String(e.message||e);}finally{OIL41.at=Date.now();OIL41.busy=false;}}
oilRefresh=async function(){await oilLive(true);toast(OIL41.err?'Stocks de brut : '+OIL41.err:'Stocks de brut à jour (API et EIA)');if(ui.tab==='cm')renderCM();};
{const _oc=oilCard;oilCard=function(){let h=_oc.apply(this,arguments);
  h=h.replace(/title="Relit les calendriers API et EIA \(Investing\.com\) dans votre navigateur"/,'title="Relit les publications API et EIA en direct"');
  h=h.replace(/<p class="note">Sources : [\s\S]*?<\/p>/,`<p class="note">Sources : American Petroleum Institute (<a href="https://www.api.org" target="_blank" rel="noopener">api.org</a>) le mardi soir et U.S. Energy Information Administration (<a href="https://www.eia.gov/petroleum/supply/weekly/" target="_blank" rel="noopener">eia.gov</a>) le mercredi, réel et consensus lus en direct sur le <a href="https://www.tradingview.com/economic-calendar/" target="_blank" rel="noopener">calendrier économique TradingView</a>${OIL41.err?' · lecture impossible : '+esc(OIL41.err):''}. Stock commercial des dernières semaines : stock EIA publié + variation EIA de la semaine.</p>`);
  return h;};}
setInterval(()=>{if(document.visibilityState==='visible'&&ui.tab==='cm')oilLive();},5*60e3);

/* ---- 4. aide (i) sur chaque colonne ---- */
const CM_INFO=[
  [/^Date/,'Séance de cotation (jour ouvré). Une case « férié » ou « à relire » signale une séance sans cours publié : rien n\'est inventé.'],
  [/^Ouv\./,'Cours d\'ouverture de la séance.','Comparé à la clôture de la veille, il montre l\'écart d\'ouverture (gap) : un gap haussier suivi d\'une clôture plus basse signale des vendeurs présents.'],
  [/^En cours/,'Dernier cours de la séance (clôture une fois la séance terminée).'],
  [/^Ferm\. \(veille\)/,'Clôture de la séance précédente, base du calcul de la variation.'],
  [/^Var\. futur/,'Variation du premier contrat à terme sur la séance.','Si le futur monte plus que le comptant, le marché anticipe une hausse ; s\'il monte moins, la demande immédiate (physique) domine.'],
  [/^Var\. 5 séances/,'Variation sur 5 séances (une semaine de bourse).','Mesure la tendance courte : au-delà de ±5 % sur l\'or, le mouvement est fort et souvent suivi d\'une respiration.'],
  [/^Var\. basis/,'Variation du basis par rapport à la séance précédente.','Un basis qui remonte vers zéro (contango qui se resserre) signale une demande physique qui revient ; un basis qui s\'enfonce, un surplus.'],
  [/^Var\. USD\/CNH/,'Variation du taux USD/CNH (yuan offshore) sur la séance.','Baisse = le yuan se renforce (vert) : la Chine achète plus facilement de l\'or et des matières premières. Hausse = yuan faible (rouge).'],
  [/^Var\. DXY/,'Variation du Dollar Index sur la séance.','Dollar en baisse (vert) : soutien mécanique pour l\'or et le pétrole cotés en dollars. Dollar en hausse (rouge) : pression baissière.'],
  [/^Var\. or/,'Variation de l\'or sur la séance.'],[/^Var\. argent/,'Variation de l\'argent sur la séance.'],
  [/^Var\./,'Variation sur la séance, en %.'],
  [/^Futur M1|Brent futur/,'Premier contrat à terme (échéance la plus proche).','Référence des marchés : comparé au comptant, il donne le basis.'],
  [/^Basis/,'Basis = comptant − futur, en dollars (valeur exacte, sans arrondi à zéro).','Négatif = contango (rouge) : le futur coûte plus cher que le comptant, le marché est bien approvisionné et le stockage se paie. Positif = backwardation (vert) : le physique est recherché tout de suite, signe de tension. Plus l\'écart est grand, plus le signal est fort.'],
  [/^Spread Brent/,'Écart de prix Brent − WTI en dollars.','Entre 3 et 6 $ : arbitrage normal. Sous 3 $ : le brut américain est bloqué localement. Au-delà de 6 à 10 $ : tension sur l\'offre mondiale, le Brent surperforme.'],
  [/^Ratio Or\/Argent/,'Nombre d\'onces d\'argent pour une once d\'or.','Au-dessus de 80 : l\'or est cher face à l\'argent (climat de peur, refuge) et l\'argent a un potentiel de rattrapage. Sous 65 : l\'argent a déjà surperformé, appétit pour le risque.'],
  [/^Ratio Or\/Brent/,'Nombre de barils de Brent pour une once d\'or.','Très élevé (au-delà de 40) : l\'or est recherché comme refuge alors que l\'activité (pétrole) ralentit ; bas : cycle économique porteur.'],
  [/^USD\/CNH/,'Prix d\'un dollar en yuans offshore.','Le yuan est l\'indicateur de la demande chinoise, premier acheteur d\'or et de matières premières : un yuan fort soutient les prix.'],
  [/^Yuan/,'Lecture de la variation du USD/CNH.','Yuan fort (USD/CNH en baisse) = pouvoir d\'achat chinois en hausse, soutien pour l\'or et le pétrole. Yuan faible = demande chinoise freinée.'],
  [/^Corr\./,'Corrélation glissante entre USD/CNH et l\'actif (−1 à +1).','Proche de −1 : l\'actif monte quand le yuan se renforce (lien normal). Proche de 0 : le yuan n\'explique plus les prix. Au-delà de ±0,7 : lien fort, le signal yuan est fiable.'],
  [/^Z-score/,'Écart du prix (ou du spread) à sa moyenne, en nombre d\'écarts-types.','Entre −1 et +1 : zone normale. Au-delà de ±2 : excès statistique, risque de retour vers la moyenne ; ne pas acheter un z-score de +2 par FOMO.'],
  [/^Percentile/,'Position de la valeur du jour dans l\'historique récent (0 à 100).','Au-dessus de 90 : niveau rarement atteint, prudence ; sous 10 : niveau bas historique.'],
  [/^DXY/,'Dollar Index : valeur du dollar face à un panier de six devises.','Un dollar fort pèse sur l\'or et le pétrole (ils deviennent plus chers hors États-Unis). Un dollar faible les soutient.'],
  [/^Perf\. vs S&P/,'Performance de l\'or moins celle du S&P 500 sur la séance.','Positive : l\'or surperforme les actions (fuite vers la qualité). Négative : appétit pour le risque.'],
  [/^Signal/,'Signal combiné du classeur : sens de l\'actif et du yuan (ou du dollar).','ACHAT FONDAMENTAL : l\'actif monte avec une demande réelle. VENTE MACRO : il baisse avec un yuan faible. ALERTE : divergence à surveiller.'],
  [/^Structure/,'Lecture de la structure du marché (volume, momentum, basis).','ACCUMULATION : achat institutionnel discret. BAISSE SAINE : correction sans panique. DISTRIBUTION : les grands vendent.'],
  [/^État du marché/,'État déduit du basis selon les seuils.','Contango, parité ou backwardation ; voir l\'aide de la colonne Basis.'],
  [/^Risque/,'Risque et interprétation de l\'état du marché.'],
  [/^Or$|^Argent$|^Brent$|^WTI$/,'Cours comptant de l\'actif en dollars.']];
function cmInfoOf(t){t=String(t||'').replace(/\s+/g,' ').trim();const r=CM_INFO.find(x=>x[0].test(t));return r?{w:r[1],h:r[2]||''}:null;}
function cmInfoMount(){const P=document.getElementById('p-cm');if(!P)return;
  P.querySelectorAll('table thead th').forEach(th=>{if(th.querySelector('.ihelp'))return;const I=cmInfoOf(th.textContent);if(!I)return;
    th.insertAdjacentHTML('beforeend',` <button class="ihelp noprint" type="button" aria-label="Signification de ${esc(th.textContent.trim())}" data-ih="1">i</button>`);});
  /* tableaux toujours dépliés */
  [...P.querySelectorAll(':scope>.grid>.card')].forEach(c=>{const t=((c.querySelector('h2')||{}).textContent||'');if(/Tableau chronologique|Tableau de confirmation/.test(t))c.querySelectorAll('.tw').forEach(w=>{w.style.maxHeight='none';w.style.overflowY='visible';});});}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.ihelp[data-ih]');const old=document.getElementById('ihpop');
  if(!b){if(old&&!e.target.closest('#ihpop'))old.remove();return;}e.preventDefault();e.stopPropagation();if(old)old.remove();
  const th=b.closest('th'),lab=th.textContent.replace(/\bi$/,'').trim(),I=cmInfoOf(lab);if(!I)return;const r=b.getBoundingClientRect();
  const d=document.createElement('div');d.id='ihpop';d.setAttribute('role','dialog');d.innerHTML=`<b>${esc(lab)}</b><p>${esc(I.w)}</p>${I.h?`<p><b>Comment lire :</b> ${esc(I.h)}</p>`:''}`;
  document.body.appendChild(d);const w=Math.min(340,window.innerWidth-20);d.style.width=w+'px';d.style.left=Math.max(10,Math.min(r.left-w/2,window.innerWidth-w-10))+'px';d.style.top=(r.bottom+6+window.scrollY)+'px';},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const o=document.getElementById('ihpop');if(o)o.remove();}});
{const _rc=renderCM;renderCM=function(){const r=_rc.apply(this,arguments);try{cmInfoMount();}catch(e){console.error('cm41',e);}if(Date.now()-OIL41.at>10*60e3)oilLive();return r;};}

/* ---- styles : (i), et plus de rose ---- */
{const st=document.createElement('style');st.textContent=`
.ihelp{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;margin-left:3px;border-radius:50%;border:1px solid var(--line2,#52525B);background:transparent;color:var(--mute,#A1A1AA);font:italic 600 10px Georgia,serif;cursor:pointer;vertical-align:middle;padding:0}
.ihelp:hover,.ihelp:focus-visible{color:var(--hi,#FAFAFA);border-color:var(--hi,#FAFAFA)}
#ihpop{position:absolute;z-index:9999;background:var(--raised,#18181B);border:1px solid var(--line2,#3F3F46);border-radius:8px;padding:10px 12px;box-shadow:0 8px 24px rgba(0,0,0,.45);font-size:12.5px;line-height:1.45;color:var(--text,#D4D4D8)}
#ihpop b{color:var(--hi,#FAFAFA)}#ihpop p{margin:6px 0 0}
.macpink{background:var(--pane)!important;border-color:var(--line)!important}.macpink h2{color:var(--hi)!important}
.macpink .mp div{background:var(--raised)!important;border-color:var(--line)!important}
.cmconf td,.cmconf th{white-space:nowrap}`;document.head.appendChild(st);}

/* ---- comptant réel (or, argent), USD/CNH, DXY, S&P 500 : clôture de la séance précédente lue en direct chaque jour ----
   Remplace aussi un « comptant » qui n'était qu'une copie du futur (basis faussement nul). */
const SPOT41={at:0,busy:false};
function spotPrevDate(k){const ny=new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'})),d=new Date(ny);
  const metals=['gold','silver','cnh','dxy'].includes(k);if(metals&&ny.getHours()>=17)return wd(d);   /* après 17 h New York, la séance en cours est celle du lendemain */
  d.setDate(d.getDate()-1);return wd(d);
  function wd(x){while(x.getDay()===0||x.getDay()===6)x.setDate(x.getDate()-1);return`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;}}
async function spotLive(){if(SPOT41.busy||Date.now()-SPOT41.at<5*60e3)return;SPOT41.busy=true;
  try{const r=await fetch('/api/v1/spot'),j=await r.json();if(!r.ok)throw new Error(j.error||r.status);let n=0;S.cm.add=S.cm.add||{};
    Object.entries(j.q||{}).forEach(([k,x])=>{if(!x||!isFinite(x.prev)||!(x.prev>0))return;const d=spotPrevDate(k),A=S.cm.add[k]=S.cm.add[k]||{},cur=A[d];
      let fut=null;try{const s=cmSeries(),i=s.d.indexOf(d);if(i>=0&&s[k+'F'])fut=s[k+'F'][i];if(i>=0&&!cur&&nn(s[k][i])&&Math.abs(s[k][i]/x.prev-1)<0.0005&&!(fut!==null&&s[k][i]===fut))return;}catch(e){}
      if(cur&&Math.abs(cur[0]/x.prev-1)<0.0005)return;
      A[d]=[x.prev,cur?cur[1]:null,null];n++;});
    S.cm.spotAt=j.at;if(n){save();recalc();if(ui.tab==='cm')renderCM();}}
  catch(e){console.warn('comptant',e);}finally{SPOT41.at=Date.now();SPOT41.busy=false;}}
{const _cc=cmCalc;cmCalc=function(){const C=_cc.apply(this,arguments);try{const s=C.s;C.R.forEach((r,i)=>{if(!r)return;const j=s.d.indexOf(r.d);if(j<0)return;
  if(nn(s.gold[j])&&s.goldF&&s.gold[j]===s.goldF[j]){r.bG=null;r.bGSt='NO DATA';r.bGRk='';}
  if(nn(s.silver[j])&&s.silverF&&s.silver[j]===s.silverF[j]){r.bS=null;r.bSSt='NO DATA';r.bSRk='';}});}catch(e){}return C;};}
{const _rc2=renderCM;renderCM=function(){const r=_rc2.apply(this,arguments);spotLive();return r;};}

/* ---- variations calculées pour les séances ajoutées (Claude, comptant en direct) : clôture / clôture précédente − 1 ---- */
{const _cs=cmSeries;cmSeries=function(){const s=_cs.apply(this,arguments);try{Object.keys(CM_INST).forEach(k=>{const C=s[k],V=s[k+'V'];if(!C||!V)return;let p=null;
  for(let i=0;i<C.length;i++){if(C[i]===null||C[i]===undefined)continue;if((V[i]===null||V[i]===undefined)&&p>0)V[i]=C[i]/p-1;p=C[i];}});}catch(e){}return s;};}
/* ---- un comptant égal au futur (copie) compte comme manquant : la séance est redemandée à Claude avec le vrai comptant ---- */
{const _jf=jobCmFrom;jobCmFrom=function(k){const f=_jf.apply(this,arguments);if(k!=='gold'&&k!=='silver')return f;try{const s=cmSeries(),N=s.d.length,F=s[k+'F'];let from=null;
  for(let i=N-1;i>=Math.max(1,N-30);i--){if(nn(s[k][i])&&F&&s[k][i]===F[i])from=s.d[i-1];}if(from&&(!f||from<f))return from;}catch(e){}return f;};}
/* ---- stock commercial : dernier niveau publié tant que l'EIA de la semaine n'est pas sortie ---- */
{const _oc2=oilCard;oilCard=function(){let h=_oc2.apply(this,arguments);try{const L=[...OIL_STK.w].reverse().find(x=>typeof x.lvl==='number'&&isFinite(x.lvl));
  if(L)h=h.replace(/(Stock commercial EIA<\/div><div class="x[^"]*">)—( Mb)/,`$1${nf(L.lvl,1)}$2 <small class="meta">au ${oilFd(L.wk)}</small>`);}catch(e){}return h;};}
