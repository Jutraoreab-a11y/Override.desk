/* ============ v8.43 ============
   1. Historique d'un an lu en direct (Yahoo Finance) : comble les trous des séries (DXY, USD/CNH, S&P 500, premiers contrats)
      et fournit le volume quotidien de l'or ; tout se recalcule seul (variation vs veille, volume / moyenne 20 séances, lecture).
   2. Chaque vue (Tendance, Confirmation) montre les tableaux de tendance ET de confirmation, juste sous le graphique.
   3. « Or · indicateurs » remplace « Argent · indicateurs ».
   4. Volume de l'or : une ligne par séance sur un an.
   5. Inflation : PPI (prix payés par les entreprises) contre CPI (prix payés par le consommateur final), écart mensuel et sa dynamique.
   6. (i) sur chaque élément de la sensibilité mensuelle.
   7. Graphique : deux courbes par défaut (or et argent en base 100 ; Brent et WTI). */

/* ---------- 1. historique d'un an ---------- */
const HIST43={busy:false,at:0,err:''};
const HIST43_MAP={'GC=F':[['goldF','c'],['gvol','v']],'SI=F':[['silverF','c']],'BZ=F':[['brentF','c'],['brentS','c']],'CL=F':[['wtiF','c']],'DX-Y.NYB':[['dxy','c']],'CNH=X':[['cnh','c']],'^GSPC':[['spx','c']]};
async function hist43Load(force){if(HIST43.busy)return;const last=+(S.cm&&S.cm.histAt||0);if(!force&&Date.now()-last<6*3600e3)return;HIST43.busy=true;let n=0;
  try{const today=typeof live42Day==='function'?live42Day():null,s=cmSeries(),at=new Map(s.d.map((d,i)=>[d,i]));S.cm.add=S.cm.add||{};
    for(const [sym,keys] of Object.entries(HIST43_MAP)){let j;try{const r=await fetch('/api/v1/hist?sym='+encodeURIComponent(sym));j=await r.json();if(!r.ok)throw new Error(j.error||r.status);}catch(e){HIST43.err=sym+' : '+(e.message||e);continue;}
      for(const [k,f] of keys){const A=S.cm.add[k]=S.cm.add[k]||{};let pv=null,ref=[];
        (j.rows||[]).forEach(x=>{if(!x||!x.d||(today&&x.d>=today))return;const v=x[f];if(!(typeof v==='number'&&isFinite(v)&&v>0))return;
          if(k==='gvol'){if(pv!==null&&v===pv){pv=v;return;}pv=v;if(!A[x.d]){A[x.d]=[v,null,null];n++;}return;}   /* deux volumes identiques d'affilée : donnée non mise à jour, écartée */
          const i=at.get(x.d),cur=i!==undefined&&s[k]?s[k][i]:null;
          if(ref.length>=5){const w=ref.slice(-10).sort((a,b)=>a-b),m=w[w.length>>1];if(m>0&&(v/m<.8||v/m>1.25))return;}ref.push(v);
          if((cur===null||cur===undefined)&&!A[x.d]){A[x.d]=[v,typeof x.o==='number'&&x.o>0?x.o:null,null];n++;}});}}
    S.cm.histAt=Date.now();S.cm.histSrc='Yahoo Finance (historique quotidien, finance.yahoo.com)';save();if(n){recalc();if(ui.tab==='cm')renderCM();}}
  catch(e){HIST43.err=String(e.message||e);}finally{HIST43.busy=false;HIST43.at=Date.now();}}

/* ---------- 7. graphique : deux courbes par défaut ---------- */
{const _mx=mktX;mktX=function(){const X=_mx.apply(this,arguments);if(ui.cmSilverPass)return X;const a=ui.cmA==='silver'?'gold':(ui.cmA||'brent');
  if(X&&!X.init43){X.init43=1;if(a==='gold'){X.main='gold';if(!X.cmp.includes('silver'))X.cmp=['silver'];X.b100=true;}else if(a==='brent'){X.main='brent';X.cmp=X.cmp.filter(k=>k!=='wti');X.b100=false;}}return X;};}

/* ---------- 5. PPI contre CPI ---------- */
function infl43(){const M=typeof MACRO==='object'?MACRO:null;if(!M)return[];const cpi=Object.assign({},M.cpi),ppi=Object.assign({},M.ppi),R=typeof RATES==='object'&&RATES;
  if(R&&R.ppi&&R.ppi.ym&&R.ppi.yoy!=null)ppi[R.ppi.ym]=R.ppi.yoy;if(R&&R.ppi&&R.ppi.prevYm&&R.ppi.prevYoy!=null)ppi[R.ppi.prevYm]=R.ppi.prevYoy;
  if(R&&R.cpi&&R.cpi.ym&&R.cpi.yoy!=null)cpi[R.cpi.ym]=R.cpi.yoy;if(R&&R.cpi&&R.cpi.prevYm&&R.cpi.prevYoy!=null)cpi[R.cpi.prevYm]=R.cpi.prevYoy;
  const ms=[...new Set([...Object.keys(cpi),...Object.keys(ppi)])].sort();return ms.map(m=>({m,p:isFinite(ppi[m])?+ppi[m]:null,c:isFinite(cpi[m])?+cpi[m]:null})).map((x,i,a)=>{x.s=x.p!==null&&x.c!==null?x.p-x.c:null;
    const pr=a.slice(0,i).reverse().find(y=>y.p!==null&&y.c!==null);x.ds=x.s!==null&&pr?x.s-(pr.p-pr.c):null;return x;});}
function infl43Read(x){if(x.s===null)return['','non calculable (un des deux indices non publié)'];const w=x.ds;
  if(x.s>0.25)return w!==null&&w>0.05?['cf-up','PPI > CPI et l\'écart s\'élargit : les entreprises absorbent des coûts qu\'elles vont répercuter, inflation à venir : l\'or, valeur refuge contre l\'inflation, est recherché']
    :['am','PPI > CPI mais l\'écart se resserre : les hausses de coûts passent dans les prix de détail, pic d\'inflation proche'];
  if(x.s<-0.25)return w!==null&&w<-0.05?['cf-dn','PPI < CPI et l\'écart se creuse : les coûts reculent, les marges se reconstituent, désinflation : l\'or perd son soutien inflation']
    :['am','PPI < CPI mais l\'écart se réduit : la détente des coûts touche à sa fin, surveiller une reprise de l\'inflation'];
  return['','PPI et CPI alignés : pas de pression de coûts cachée, l\'inflation suit son cours'];}
function infl43HTML(){const A=infl43().filter(x=>x.p!==null||x.c!==null),L=A.slice(-13).reverse(),cur=A.slice().reverse().find(x=>x.s!==null);if(!L.length)return'';const rd=cur?infl43Read(cur):['',''];
  const fm=ym=>{const[y,m]=ym.split('-');return['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'][+m-1]+' '+y;};
  return`<div class="card s12" id="infl43"><h2><span>Inflation : PPI (entreprises) contre CPI (consommateurs) <span class="meta">écart mensuel et sa dynamique · BLS</span></span></h2>
    <div class="stats"><div class="stat"><div class="k">PPI demande finale</div><div class="x">${cur&&cur.p!==null?nf(cur.p,2)+' %':'—'}</div><div class="d">prix payés par les entreprises · ${cur?fm(cur.m):''}</div></div>
      <div class="stat"><div class="k">CPI glissement annuel</div><div class="x">${cur&&cur.c!==null?nf(cur.c,2)+' %':'—'}</div><div class="d">prix payés par le consommateur final</div></div>
      <div class="stat ${rd[0]}"><div class="k">Écart PPI − CPI</div><div class="x">${cur&&cur.s!==null?(cur.s>0?'+':'')+nf(cur.s,2)+' pt':'—'}</div><div class="d">${cur&&cur.ds!==null?(cur.ds>0?'s\'élargit de ':'se resserre de ')+nf(Math.abs(cur.ds),2)+' pt sur le mois':''}</div></div></div>
    <div class="dec" style="margin:8px 0"><div class="dc"><span class="dot ${rd[0]==='cf-up'?'ok':rd[0]==='cf-dn'?'ko':'am'}"></span><div><b>Lecture pour l'or</b><span>${esc(rd[1])}</span></div></div></div>
    <div class="tw"><table class="tbl fin"><thead><tr><th>Mois</th><th class="n">PPI (entreprises)</th><th class="n">CPI (consommateurs)</th><th class="n">Écart PPI − CPI</th><th class="n">Variation de l'écart</th><th>Lecture</th></tr></thead><tbody>
      ${L.map(x=>{const r=infl43Read(x);return`<tr><td>${fm(x.m)}</td><td class="n">${x.p!==null?nf(x.p,2)+' %':'non publié'}</td><td class="n">${x.c!==null?nf(x.c,2)+' %':'non publié'}</td><td class="n ${r[0]}">${x.s!==null?(x.s>0?'+':'')+nf(x.s,2)+' pt':'—'}</td><td class="n">${x.ds!==null?(x.ds>0?'+':'')+nf(x.ds,2)+' pt':'—'}</td><td class="wrap">${esc(r[1].split(' : ')[0])}</td></tr>`;}).join('')}</tbody></table></div>
    <p class="note">Glissements annuels publiés par le Bureau of Labor Statistics (via FRED, et l'API BLS pour le dernier mois). CPI d'octobre 2025 non publié par le BLS : les écarts qui en dépendent restent vides.</p></div>`;}

/* ---------- 6. (i) : définitions ---------- */
[[/^Écart PPI|^Variation de l'écart/,'Écart PPI − CPI : différence entre l\'inflation subie par les entreprises (PPI) et celle payée par le consommateur final (CPI), en points.','PPI > CPI (écart positif) : les coûts de production montent plus vite que les prix de détail ; les entreprises absorbent la hausse sur leurs marges et la répercuteront : inflation à venir. L\'or, couverture contre l\'inflation, devient valeur refuge (sauf si la Fed relève fortement ses taux réels). Écart qui s\'élargit = pression qui monte ; qui se resserre = la hausse passe dans les prix de détail, pic proche. PPI < CPI : les coûts reculent, désinflation à venir, l\'or perd ce soutien.'],
 [/^PPI/,'PPI (prix à la production, demande finale) : inflation telle que la subissent les ENTREPRISES (prix de leurs achats et de leurs ventes entre professionnels).','Indicateur avancé : il précède le CPI de quelques mois. Un PPI qui accélère au-delà du CPI annonce une inflation future pour le consommateur et une pression sur les marges : soutien pour l\'or comme valeur refuge.'],
 [/^CPI/,'CPI (prix à la consommation) : inflation telle que la perçoit le CONSOMMATEUR FINAL (panier de biens et services des ménages).','C\'est la mesure suivie par la Fed. Un CPI élevé et persistant maintient les taux hauts (pression de court terme sur l\'or) mais renforce son rôle de protection du pouvoir d\'achat. À lire avec l\'écart PPI − CPI : si le PPI est au-dessus, le CPI va encore monter.'],
 [/^Sensibilité mensuelle/,'Sensibilité mensuelle : de combien l\'or et l\'argent ont bougé, en moyenne, pour un choc d\'une unité sur chaque indicateur macro (régression sur les mois indiqués).','Une valeur positive : l\'actif monte quand l\'indicateur monte. Croisez le signe avec la dernière variation de l\'indicateur : fond vert = l\'effet pousse à l\'achat, rouge = à la vente.'],
 [/^Or, % par unité/,'Variation moyenne de l\'or, en %, pour une unité de choc sur l\'indicateur de la ligne.','Exemple : +2,0 sur la ligne Taux réel signifie que l\'or a pris 2 % quand le taux réel a monté d\'un point. Plus la valeur est grande (en absolu), plus l\'or réagit à cet indicateur.'],
 [/^Argent, % par unité/,'Variation moyenne de l\'argent, en %, pour une unité de choc sur l\'indicateur.','L\'argent réagit souvent plus fort que l\'or (effet piston) : comparez avec la colonne de l\'or.'],
 [/^Argent \/ or/,'Rapport des deux sensibilités : de combien l\'argent amplifie la réaction de l\'or.','Au-dessus de 1 : l\'argent démultiplie le mouvement de l\'or face à cet indicateur ; à privilégier pour jouer le choc. Sous 1 : l\'or réagit davantage.'],
 [/^R² argent/,'R² : part des mouvements mensuels de l\'argent expliquée par l\'indicateur (0 à 1).','Sous 0,1 : lien faible, ne pas se fier au chiffre. Au-delà de 0,3 : lien net, la sensibilité est exploitable.'],
 [/^Mois$/,'Nombre de mois de l\'échantillon.','Moins de 24 mois : ordre de grandeur seulement, prudence.'],
 [/^Unité du choc/,'Taille du choc retenu pour mesurer la sensibilité.','Par exemple +1 point de CPI sur un an, ou +1 point de taux.'],
 [/^Surprise CPI/,'Variation mensuelle du CPI annuel publié (en points).','L\'or réagit à la surprise : une accélération de l\'inflation au-delà de l\'attendu le soutient si la Fed ne réagit pas.'],
 [/^Surprise PPI/,'Variation mensuelle du PPI annuel publié (en points).','Une hausse surprise du PPI annonce une inflation future : signal précoce pour l\'or.'],
 [/^Or · indicateurs/,'Indicateurs propres à l\'or : basis, ratios, z-score et corrélation au dollar.','Chaque chiffre a son (i) : lisez-les ensemble pour confirmer le signal de l\'or.']].reverse().forEach(x=>CM_INFO42.unshift(x));

/* ---------- 2, 3, 4. vue : tableaux de tendance et de confirmation dans chaque vue, Or · indicateurs, volume sur un an ---------- */
cmVolHTML=function(){const s=cmSeries(),N=s.d.length,V=s.gvol||[],G=s.gold&&s.gold.some((v,i)=>nn(v))?s.gold:s.goldF,rows=[],y0=new Date(Date.now()-366*864e5).toISOString().slice(0,10);
  for(let i=N-1;i>=0;i--){const d=s.d[i];if(d<y0)break;   /* aucune date sautée : une séance sans volume publié reste affichée (« à relire » ou férié) */
    const prev=(()=>{for(let j=i-1;j>=0;j--)if(nn(V[j]))return V[j];return null;})(),w=[];for(let j=i-1;j>=0&&w.length<20;j--)if(nn(V[j]))w.push(V[j]);
    const avg=w.length>=5?w.reduce((a,b)=>a+b,0)/w.length:null,gp=(()=>{for(let j=i-1;j>=0;j--)if(nn(G[j]))return G[j];return null;})(),gv=nn(G[i])&&gp>0?G[i]/gp-1:null;
    rows.push({d,v:V[i],dv:nn(V[i])&&prev>0?V[i]/prev-1:null,ra:nn(V[i])&&avg>0?V[i]/avg:null,gv,live:d===s.live});}
  const Q=LIVE42.q&&LIVE42.q.goldF,lec=r=>{if(!nn(r.ra)||!nn(r.gv))return'—';const hi=r.ra>=1.2,lo=r.ra<=0.8;
    return r.gv>0?(hi?'<span class="tag ok">Hausse avec volume : conviction acheteuse</span>':lo?'<span class="tag am">Hausse sans volume : fragile</span>':'Hausse, volume normal'):(hi?'<span class="tag ko">Baisse avec volume : vendeurs déterminés</span>':lo?'<span class="tag am">Baisse sans volume : respiration</span>':'Baisse, volume normal');};
  return`<div class="card s12" id="cm-vol"><h2><span>Or · Volume échangé <span class="meta">contrat or COMEX (GC), en contrats · ${rows.length} séances sur un an${Q&&isFinite(Q.avg10)?` · moyenne 10 séances ${nf(Q.avg10,0)} · 30 séances ${nf(Q.avg30,0)}`:''}</span></span></h2>
    ${rows.length?`<div class="tw"><table class="tbl fin"><thead><tr><th>Date</th><th class="n">Volume</th><th class="n">Var. vs veille</th><th class="n">Volume / moyenne 20 séances</th><th class="n">Var. or</th><th>Lecture prix × volume</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${fdate(r.d)}${r.live?' <span class="meta">en cours</span>':''}</td><td class="n">${nn(r.v)?nf(r.v,0):(typeof cmHolTxt==='function'?cmHolTxt(r.d,'us'):'à relire')}</td><td class="n ${nn(r.dv)&&!r.live?cls(r.dv):''}">${r.live?'séance en cours':nn(r.dv)?sgn(r.dv*100,1):'—'}</td><td class="n ${nn(r.ra)&&!r.live?(r.ra>=1.2?'cf-up':r.ra<=0.8?'cf-dn':''):''}">${r.live?'séance en cours':nn(r.ra)?nf(r.ra,2)+'×':'—'}</td><td class="n ${nn(r.gv)?cls(r.gv):''}">${nn(r.gv)?sgn(r.gv*100,2):'—'}</td><td>${r.live?'<span class="meta">à la clôture</span>':lec(r)}</td></tr>`).join('')}</tbody></table></div>`
      :'<p class="note">Lecture de l\'historique des volumes en cours (Yahoo Finance, GC=F)…</p>'}
    <p class="note">Historique : volume quotidien publié du contrat or (Yahoo Finance, GC=F), recalculé à chaque séance ; séance du jour : volume partiel en direct (TradingView, COMEX:GC1!), comparé à la moyenne une fois la séance close. Un volume identique à la veille (donnée non mise à jour) est écarté.</p></div>`;};
function cm43Order(){const P=document.getElementById('p-cm'),G=P&&P.querySelector(':scope>.grid');if(!G)return;const a=ui.cmA==='silver'?'gold':(ui.cmA||'brent');
  const C=()=>[...G.querySelectorAll(':scope>.card')],T=c=>((c.querySelector(':scope>h2')||{}).textContent||'').trim(),f=re=>C().find(c=>re.test(T(c)));
  const chart=f(/^Graphique principal/);let anchor=chart;const put=c=>{if(!c)return;if(anchor)anchor.after(c);anchor=c;};
  if(a==='gold'){
    const ag=f(/^Argent · indicateurs/);
    const kp=C().find(c=>!c.querySelector(':scope>h2')&&c.querySelector(':scope>.stats')&&!c.querySelector('.symhead'));
    if(kp&&!kp.querySelector(':scope>h2')){kp.insertAdjacentHTML('afterbegin','<h2><span>Or · indicateurs <span class="meta">basis, ratios, z-score, corrélation au dollar</span></span></h2>');}
    if(ag){if(kp)ag.replaceWith(kp);else ag.remove();}
    [/^Or · Tableau chronologique/,/^Argent · Tableau chronologique/,/^Or · Tableau de confirmation/,/^Argent · Tableau de confirmation/,/^Or · Volume/].forEach(re=>put(f(re)));
    const inf=f(/^Inflation : PPI/),tx=f(/^Taux directeurs, inflation/);if(inf&&tx)tx.after(inf);}
  else [/^Tableau chronologique/,/^Tableau de confirmation/].forEach(re=>put(f(re)));}
{const _rc=renderCM;renderCM=function(){const v=ui.cmT==='c'?'c':'t',o=v==='c'?'t':'c';let other=[];ui.cmAll=true;   /* v8.43.1 : une vue = ses tableaux ; tout l'historique, à faire défiler dans un cadre */
  if(false)try{ui.cmT=o;_rc.apply(this,arguments);other=[...document.querySelectorAll('#p-cm>.grid>.card')].filter(c=>/^(Or · |Argent · )?Tableau (chronologique|de confirmation)/.test(((c.querySelector(':scope>h2')||{}).textContent||'').trim()))
      .map(c=>{c.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));return c.outerHTML;});}catch(e){console.error('cm43 pré-rendu',e);}finally{ui.cmT=v;}
  const r=_rc.apply(this,arguments);
  try{const G=document.querySelector('#p-cm>.grid');if(G&&other.length){const t=document.createElement('div');t.innerHTML=other.join('');G.append(...t.children);}
    const a=ui.cmA==='silver'?'gold':(ui.cmA||'brent');
    if(a==='gold'&&G&&!G.querySelector('#infl43')){const h=infl43HTML();if(h)G.insertAdjacentHTML('beforeend',h);}
    cm43Order();if(typeof live42Mark==='function')live42Mark();if(typeof cm42Info==='function')cm42Info();
    document.querySelectorAll('#gs-eng tbody td:first-child, #gs-eng thead th').forEach(k=>cm42Btn(k,k.textContent.trim()));
    }
  catch(e){console.error('cm43',e);}hist43Load();return r;};}

/* ---------- v8.43.1 : chaque tableau dans un cadre de hauteur fixe, défilement de tout l'historique, en-tête figé (tout le SaaS) ---------- */
function scroll43(){document.querySelectorAll('#main .tw').forEach(w=>{const n=w.querySelectorAll('tbody tr').length;const on=n>12;if(on!==w.classList.contains('scroll43'))w.classList.toggle('scroll43',on);if(on&&w.style.maxHeight){w.style.maxHeight='';w.style.overflowY='';}});}
{const _ra=renderAll;renderAll=function(){const r=_ra.apply(this,arguments);try{scroll43();}catch(e){}return r;};}
{const _rc2=renderCM;renderCM=function(){const r=_rc2.apply(this,arguments);try{scroll43();}catch(e){}return r;};}
{const o=new MutationObserver(()=>{clearTimeout(o.t);o.t=setTimeout(()=>{try{scroll43();}catch(e){}},60);});const st=()=>{const M=document.getElementById('main');if(M)o.observe(M,{childList:true,subtree:true});else setTimeout(st,300);};st();}
{const st=document.createElement('style');st.textContent=`.tw.scroll43{max-height:520px!important;overflow:auto!important;border:1px solid var(--line,#27272A);border-radius:6px}
.tw.scroll43 thead th{position:sticky;top:0;z-index:2;background:var(--pane,#111113)}`;document.head.appendChild(st);}
