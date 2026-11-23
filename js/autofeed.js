/* ============ v8.14 : alimentation automatique au chargement ============
   Dès que la page s'ouvre dans l'application Claude, FOMO.DESK se met à jour tout seul, une source après l'autre :
   1. EUR/USD (BCE) et Euribor 3 mois, lus par Claude ;
   2. cours de clôture de tous les titres analysés (pages publiques stockanalysis.com, sans IA) ;
   3. cours quotidiens des commodities, lus par Claude ;
   4. stocks de brut API / EIA quand une publication est passée ;
   5. fiche complète du titre ouvert si elle a plus de 7 jours ;
   6. recherche du volet affiché (étude de marché, LBO, analyse, commodities), puis de chaque volet ouvert ensuite.
   Chaque étape a une durée de validité : une donnée encore fraîche n'est pas relue (pas de dépense inutile).
   Hors de l'application Claude (site Vercel), le backend sert les extractions déjà stockées.
   Le bouton « Tout mettre à jour » relance tout en ignorant les durées de validité ; l'interrupteur coupe l'automatisme. */
const AF={run:false,stop:false,step:'',i:0,n:0,log:[],at:null};
const AF_K='fomo.af',AF_ON='fomo.af.on',AF_H=36e5;
const afGet=()=>{try{return JSON.parse(localStorage.getItem(AF_K)||'{}')||{};}catch(e){return{};}};
const afSet=(k,v)=>{const o=afGet();o[k]=v;try{localStorage.setItem(AF_K,JSON.stringify(o));}catch(e){}};
const afFresh=(k,ttl)=>Date.now()-(afGet()[k]||0)<ttl;
function afEnabled(){try{return localStorage.getItem(AF_ON)!=='0';}catch(e){return true;}}
async function afCol(t){if(!t)throw new Error('source inconnue');await aiCollect(t);const m=AI.msg[t.k]||['ko','sans réponse'];if(m[0]!=='ok')throw new Error(m[1]);return m[1]||'à jour';}

/* hors application Claude : le serveur FOMO.DESK relit les sources publiques (BCE, stockanalysis, EIA, Investing.com), sans IA */
const afSrvOk=()=>typeof liveReachable==='function'&&liveReachable();
async function afSrv(){const A=S.an.assets,px=[...new Set(Object.keys(A).map(k=>A[k].sa).filter(Boolean).map(x=>String(x).replace(/^\/|\/$/g,'')))];
  const j=await liveApi('/api/v1/refresh?px='+encodeURIComponent(px.join(','))),done=[];
  if(j.fx&&j.fx.rates&&j.fx.rates.USD){S.live=S.live||{};S.live.eurusd={v:j.fx.rates.USD,d:j.fx.date,at:j.at,url:j.fx.src};if(typeof aiApplyLive==='function')aiApplyLive();
    if(typeof FX_ECB==='object'){Object.assign(FX_ECB.r,j.fx.rates);FX_ECB.d=fdate(j.fx.date);FX_ECB.s='BCE, taux de change de référence du '+fdate(j.fx.date);}done.push('EUR/USD '+nf(j.fx.rates.USD,4)+' (BCE du '+fdate(j.fx.date)+')');}
  let np=0;Object.keys(A).forEach(k=>{const a=A[k],key=a.sa&&String(a.sa).replace(/^\/|\/$/g,''),p=j.prices&&j.prices[key];if(!p||a.pxManual)return;const cent=(typeof FI_CENT==='object'&&typeof fiSfx==='function'&&FI_CENT[fiSfx(a.t||k)])||1;
    a.price=Math.round(p.c/cent*100)/100;a.pxDate=fdate(p.t);a.pxSrc=`stockanalysis.com, clôture du ${fdate(p.t)} (mise à jour par le serveur)`;np++;});if(np)done.push(np+' cours');
  if(typeof OIL_STK==='object'){const map=new Map(OIL_STK.w.map(x=>[x.wk,x]));let no=0;
    if(j.eia&&Array.isArray(j.eia.w)){j.eia.w.forEach((w,i,arr)=>{const prev=arr[i-1];let x=map.get(w.wk);if(!x){if(!prev||w.wk<=OIL_STK.w[OIL_STK.w.length-1].wk)return;const dd=n=>{const t=new Date(w.wk+'T12:00:00');t.setDate(t.getDate()+n);return t.toISOString().slice(0,10);};x={wk:w.wk,api:[dd(4),'22:30',NaN,NaN],eia:[dd(5),'16:30',NaN,NaN],lvl:NaN};map.set(w.wk,x);no++;}
      x.lvl=w.lvl;if(prev&&!isFinite(x.eia[2]))x.eia[2]=Math.round((w.lvl-prev.lvl)*1000)/1000;});}
    if(j.cal){(j.cal.eia||[]).forEach(r=>{const x=map.get(oilWk(r.d));if(x){x.eia[0]=r.d;x.eia[2]=r.a;x.eia[3]=r.f;}});(j.cal.api||[]).forEach(r=>{const x=map.get(oilWk(r.d));if(x){x.api[0]=r.d;x.api[2]=r.a;x.api[3]=r.f;}});}
    OIL_STK.w=[...map.values()].sort((p,q)=>p.wk<q.wk?-1:1);OIL_STK.at=j.at;try{localStorage.setItem('fomo.oil',JSON.stringify(OIL_STK));}catch(e){}if(j.eia||j.cal)done.push('stocks de brut'+(no?' (+'+no+' semaine)':''));}
  save();recalc();const ko=Object.keys(j.err||{});if(!done.length)throw new Error(ko.length?Object.values(j.err).slice(0,2).join(' ; '):'aucune donnée renvoyée');
  return done.join(', ')+(ko.length?' ; non lus : '+ko.map(k=>k.replace(/^px:/,'')).join(', '):'');}
const afClaude=()=>typeof AI==='object'&&!!AI.mcp&&!!AI.sample;

/* cours de clôture d'un titre : données JSON publiques de stockanalysis.com, sans IA */
async function afPx(k){const a=S.an.assets[k];if(!a||a.pxManual)return false;const path=a.sa||(typeof SA_PATH==='object'&&SA_PATH[k]);if(!path)return false;
  const j=await fiReadJson(`https://stockanalysis.com/${path.replace(/^\/|\/$/g,'')}/history/__data.json?x-sveltekit-invalidated=001`),H0=j&&j.data&&j.data.data;
  if(!Array.isArray(H0)||!H0.length)throw new Error('historique vide');const s=[...H0].sort((x,y)=>x.t<y.t?-1:1),last=s[s.length-1],cent=(typeof FI_CENT==='object'&&FI_CENT[fiSfx(a.t||k)])||1;
  if(!(last.c>0))throw new Error('cours absent');a.price=Math.round(last.c/cent*100)/100;a.pxDate=fdate(last.t);a.pxSrc=`stockanalysis.com, clôture du ${fdate(last.t)} (mise à jour automatique)`;
  if(Array.isArray(a.hist)){const lh=a.hist[a.hist.length-1];s.filter(x=>!lh||x.t>lh[0]).forEach((x,i,arr)=>{const p=a.hist[a.hist.length-1];if(p&&(new Date(x.t)-new Date(p[0]))<5*864e5&&i<arr.length-1)return;
    if(p&&(new Date(x.t)-new Date(p[0]))<5*864e5)a.hist[a.hist.length-1]=[x.t,x.c/cent];else a.hist.push([x.t,x.c/cent]);});if(a.hist.length>60)a.hist=a.hist.slice(-60);}
  return true;}

/* liste des étapes ; chacune renvoie un court compte rendu */
function afSteps(force){const T=typeof aiTargets==='function'?aiTargets():[],tg=k=>T.find(t=>t.k===k),st=[];
  const add=(k,l,ttl,fn,need)=>{if(need&&!need())return;if(!force&&afFresh(k,ttl))return;st.push({k,l,fn});};
  add('srv','Sources publiques relues par le serveur (BCE, cours, stocks de brut)',0.25*AF_H,afSrv,()=>!afClaude()&&afSrvOk());
  add('eurusd','EUR/USD (BCE)',12*AF_H,async()=>afCol(tg('eurusd')),afClaude);
  add('euribor','Euribor 3 mois',12*AF_H,async()=>afCol(tg('euribor')),afClaude);
  add('prices','Cours des titres analysés',0.5*AF_H,async()=>{const K=Object.keys(S.an.assets);let ok=0,ko=[];
    for(const k of K){if(AF.stop)break;AF.step=`Cours des titres analysés (${ok+ko.length+1}/${K.length}) : ${S.an.assets[k].t||k}`;afBar();try{if(await afPx(k))ok++;}catch(e){ko.push(S.an.assets[k].t||k);}}
    save();recalc();if(!ok&&ko.length)throw new Error('aucun cours lu');return `${ok} cours mis à jour${ko.length?' ; non lus : '+ko.join(', '):''}`;},()=>typeof AI==='object'&&!!AI.mcp&&typeof fiReadJson==='function');
  T.filter(t=>t.cm).forEach(t=>add(t.k,t.l,6*AF_H,async()=>afCol(t),afClaude));
  if(typeof OIL_STK==='object'){const due=Date.now()>Math.min(+new Date(OIL_STK.next.api),+new Date(OIL_STK.next.eia));
    if(due||force)add('oil','Stocks de brut API / EIA',force?0:0.25*AF_H,async()=>{await oilRefresh();return 'calendriers relus';},()=>typeof AI==='object'&&!!AI.mcp);}
  const a=S.an.assets[ui.tk],fk=a&&typeof ficheKeyOf==='function'?ficheKeyOf(ui.tk):null;
  if(fk&&(force||!a.ficheAt||Date.now()-new Date(a.ficheAt)>7*24*AF_H))add('fiche_'+fk,'Fiche complète de '+(a.n||fk),force?0:24*AF_H,async()=>{const b=await ficheFetch(fk);
    const keep={n:a.n,sec:a.sec,sub:a.sub,g:a.g,tg:a.tg,wacc:a.wacc,cat:a.cat,catTxt:a.catTxt,tamS:a.tamS,tamTxt:a.tamTxt,peers:a.peers,ovNote:a.ovNote,t:a.t};ficheApply(a,b,fk,false);Object.assign(a,keep);save();recalc();return 'comptes, estimations et cours relus';},()=>typeof AI==='object'&&!!AI.mcp);
  afResearchStep(ui.tab,force,add);
  return st;}
function afResearchStep(tab,force,add){const F={bp:()=>rsMarket('init'),lbo:()=>rsLbo('init'),an:()=>rsAn('init',ui.tk),cm:()=>rsCm('init')}[tab];if(!F)return;
  const key='rs_'+tab+(tab==='an'?'_'+ui.tk:tab==='cm'?'_'+(ui.cmA||'brent'):'');
  add(key,'Recherche : '+(RS_MOD[tab]||tab),24*AF_H,async()=>{const r=await F();if(r===null)throw new Error('aucun moteur n\'a répondu');return 'recherche terminée';},()=>afClaude()||(typeof FLUX==='object'&&FLUX.on));}

async function afRun(force){if(AF.run)return;if(!force&&!afEnabled()){afBar();return;}
  const st=afSteps(force);if(!st.length){AF.at=new Date().toISOString();afBar();if(force)toast('Tout est déjà à jour');return;}
  AF.run=true;AF.stop=false;AF.n=st.length;AF.i=0;AF.log=[];afBar();
  for(const s of st){if(AF.stop)break;AF.i++;AF.step=s.l;afBar();let r='';try{r=await s.fn()||'fait';afSet(s.k,Date.now());}catch(e){r='échec : '+(e&&(e.message||aiErr(e))||e);}
    AF.log.push([s.l,r]);try{renderAll();}catch(e){}}
  AF.run=false;AF.at=new Date().toISOString();AF.step='';save();try{recalc();renderAll();}catch(e){}afBar();
  const ko=AF.log.filter(x=>/^échec/.test(x[1])).length;toast(AF.stop?'Mise à jour interrompue':`Mise à jour automatique terminée : ${AF.log.length-ko}/${AF.log.length} sources à jour`);}

/* bandeau d'état sous l'en-tête */
function afBar(){let el=document.getElementById('afbar');if(!el){const m=document.getElementById('main')||document.querySelector('main');if(!m)return;el=document.createElement('div');el.id='afbar';el.className='afbar noprint';m.prepend(el);}
  const on=afEnabled(),env=afClaude()?'Claude (navigateur et modèle de votre abonnement)':typeof AI==='object'&&AI.mcp===undefined?'connexion à Claude…':afSrvOk()?'serveur FOMO.DESK (sources publiques, sans IA)'+((typeof FLUX==='object'&&FLUX.on)?' et recherches stockées':''):'aperçu sans Claude ni serveur : données en cache';
  const last=AF.at?new Date(AF.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):null;
  el.innerHTML=(typeof helloHTML==='function'?helloHTML():'')+`<span class="dot ${AF.run?'am pulse':afClaude()||afSrvOk()?'ok':'ko'}"></span>
    <span class="aft">${AF.run?`<b>Mise à jour ${AF.i}/${AF.n}</b> ${esc(AF.step)}`:`<b>Alimentation automatique ${on?'active':'coupée'}</b> ${last?'· dernière passe à '+last:''}`}<span class="meta"> · ${env}</span></span>
    ${AF.log.length&&!AF.run?`<details class="afd"><summary>Détail</summary><ul>${AF.log.map(([l,r])=>`<li><b>${esc(l)}</b> : ${esc(r)}</li>`).join('')}</ul></details>`:''}
    <span class="afb">${AF.run?'<button class="btn sm" data-act="afstop">Arrêter</button>':`<button class="btn sm pri" data-act="afall" >Tout mettre à jour</button>`}
    <label class="afsw" title="Mettre à jour automatiquement à chaque ouverture"><input type="checkbox" data-af="on" ${on?'checked':''}> au chargement</label></span>`;}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='afall'){if(!afClaude()&&!afSrvOk()){toast("Mise à jour impossible ici : ouvrez FOMO.DESK dans l'application Claude ou sur override-desk.vercel.app");return;}afRun(true);}else if(a==='afstop'){AF.stop=true;afBar();}
  else if(a==='tab'&&afEnabled())setTimeout(()=>{if(AF.run)return;const st=[];afResearchStep(ui.tab,false,(k,l,ttl,fn,need)=>{if(need&&!need())return;if(afFresh(k,ttl))return;st.push({k,l,fn});});if(st.length)afRun(false);},400);});
document.addEventListener('change',e=>{const c=e.target.closest&&e.target.closest('[data-af=on]');if(!c)return;try{localStorage.setItem(AF_ON,c.checked?'1':'0');}catch(x){}toast(c.checked?'Mise à jour automatique au chargement activée':'Mise à jour automatique coupée : utilisez « Tout mettre à jour »');afBar();});
{const _r=renderAll;renderAll=function(){_r.apply(this,arguments);try{afBar();}catch(e){}};}
/* démarrage : on attend la réponse des passerelles Claude (au plus 15 s), puis une seule passe */
(async()=>{const t0=Date.now();while(typeof AI==='object'&&AI.mcp===undefined&&Date.now()-t0<15000)await new Promise(r=>setTimeout(r,300));
  await new Promise(r=>setTimeout(r,1200));afBar();
  if(typeof FLUX==='object'&&!afClaude()){const t1=Date.now();while(FLUX.busy&&Date.now()-t1<8000)await new Promise(r=>setTimeout(r,300));}
  afRun(false);})();
