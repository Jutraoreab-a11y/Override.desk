/* ============ v8.34 : dossiers ============
   - Business plan : rien ne s'affiche tant qu'aucun dossier n'est créé. Un bouton crée le dossier, on saisit ses informations,
     puis la première étude de marché part vers Claude.
   - Explorateur « Mes dossiers » en tête du Business plan et de l'Analyse financière : tous les dossiers et leurs versions,
     un clic ouvre la version tout de suite ; renommer, changer de dossier et supprimer les projets comme les versions.
   - Cours en temps réel des trois actifs suivis dans le panneau Commodities. */

/* ---------- cours en temps réel (tableau TradingView chargé par js/cm-plus.js) ---------- */
const CM_LIVE_T={brent:'ICEEUR:BRN1!',wti:'NYMEX:CL1!',gold:'COMEX:GC1!',silver:'COMEX:SI1!'};
function cmLive(k){try{const D=typeof CMB==='object'&&CMB.d;if(!D)return null;const t=CM_LIVE_T[k];for(const g of D.groups)for(const x of g.items)if(x.t===t&&x.c!==null&&isFinite(x.c))return{c:x.c,ch:isFinite(x.ch)?x.ch:0,at:D.at};}catch(e){}return null;}

/* ---------- styles ---------- */
if(!document.getElementById('fd-v834-css')){const st=document.createElement('style');st.id='fd-v834-css';st.textContent=`
.bp0{max-width:760px;margin:24px auto;text-align:center;padding:36px 28px}
.bp0 h2{justify-content:center;font-size:20px}.bp0 p{color:var(--mute,#A1A1AA);max-width:56ch;margin:8px auto 20px}
.bp0f{text-align:left;display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
.bp0f label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--mute,#A1A1AA)}.bp0f .full{grid-column:1/-1}
.bp0f textarea{min-height:84px;resize:vertical}
.bp0 .acts{display:flex;gap:8px;justify-content:center;margin-top:18px;flex-wrap:wrap}
.bp0l{margin-top:22px;border-top:1px solid var(--line,#27272A);padding-top:14px;text-align:left}
.bp0l button{display:flex;width:100%;justify-content:space-between;background:none;border:1px solid var(--line,#27272A);border-radius:8px;padding:10px 12px;color:var(--text,#D4D4D8);cursor:pointer;margin-top:6px;font:inherit}
.bp0l button:hover{border-color:var(--line2,#3F3F46);color:var(--hi,#FAFAFA)}
.fx{padding:14px 16px}.fx-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.fx-h h2{margin:0;border:0;padding:0}
.fx-g{margin-top:10px}.fx-gl{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute,#71717A);margin:12px 0 6px}
.fx-p{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border:1px solid var(--line,#27272A);border-radius:8px;margin-bottom:6px;background:rgba(255,255,255,.015)}
.fx-p.on{border-color:var(--line2,#52525B);background:rgba(255,255,255,.04)}
.fx-p .nm{font-weight:600;color:var(--hi,#FAFAFA);min-width:140px}
.fx-v{display:inline-flex;align-items:center;border:1px solid var(--line,#27272A);border-radius:999px;overflow:hidden;font-size:12px}
.fx-v.on{border-color:#F5A524}.fx-v button{background:none;border:0;color:var(--text,#D4D4D8);cursor:pointer;padding:4px 8px;font:inherit}
.fx-v button.o{padding-right:6px}.fx-v button.o:hover{color:var(--hi,#FAFAFA)}.fx-v button.i{padding:4px 6px;color:var(--mute,#71717A);border-left:1px solid var(--line,#27272A)}
.fx-v button.i:hover{color:var(--hi,#FAFAFA)}.fx-v button.d:hover{color:#DC2626}
.fx-ic{background:none;border:1px solid var(--line,#27272A);border-radius:6px;color:var(--mute,#A1A1AA);cursor:pointer;padding:3px 8px;font-size:12px}
.fx-ic:hover{color:var(--hi,#FAFAFA);border-color:var(--line2,#3F3F46)}.fx-ic.d:hover{color:#DC2626;border-color:#7F1D1D}
.fx-sp{margin-left:auto;display:flex;gap:6px}`;document.head.appendChild(st);}

/* ---------- Business plan : vide tant qu'aucun dossier n'est lancé ---------- */
const BP_ZONES={fr:'France',eu:'Europe',world:'Monde'};
function bpStarted(){return !!(S&&S.bpStarted);}
function bpEmptyHTML(){const P=(S.prj&&S.prj.bp)||[],f=ui.bpNew;
  return`<div class="card s12 bp0"><h2>Business plan</h2>
    <p>Aucun dossier lancé. Créez un dossier, renseignez son activité, puis lancez la première étude : Claude recherche la taille du marché et sa croissance, avec les sources citées.</p>
    ${f?`<form class="bp0f" id="bp0form" onsubmit="return false">
      <label class="full">Nom du projet<input class="f" name="name" required maxlength="80" placeholder="ex. Atelier Nova"></label>
      <label>Secteur<select class="f" name="sector">${Object.entries(SECT).map(([k,v])=>`<option value="${k}">${esc(v.l)}</option>`).join('')}</select></label>
      <label>Zone visée<select class="f" name="zone">${Object.entries(BP_ZONES).map(([k,v])=>`<option value="${k}"${k==='fr'?' selected':''}>${v}</option>`).join('')}</select></label>
      <label>Année de démarrage<input class="f" name="startY" type="number" min="2020" max="2040" value="${new Date().getFullYear()+1}"></label>
      <label>Dossier (classement)<input class="f" name="folder" maxlength="60" placeholder="ex. Industrie"></label>
      <label class="full">Activité en quelques lignes<textarea class="f" name="summary" maxlength="1200" placeholder="Ce que fait l'entreprise, pour qui, et ce qui la distingue."></textarea></label>
    </form>
    <div class="acts"><button class="btn pri" data-act="bp0go">Créer le dossier et lancer la première étude</button><button class="btn" data-act="bp0cancel">Annuler</button></div>`
    :`<div class="acts"><button class="btn pri" data-act="bp0new">Créer un dossier</button></div>`}
    ${P.length&&!f?`<div class="bp0l"><div class="meta">Ou rouvrir un dossier existant</div>${P.map(p=>`<button data-act="bp0open" data-id="${p.id}"><span>${esc(p.name)}</span><span class="meta">${esc(p.folder||'Sans dossier')} · ${p.versions.length} version${p.versions.length>1?'s':''}</span></button>`).join('')}</div>`:''}
  </div>`;}
if(typeof renderBP==='function'){const _rb=renderBP;renderBP=function(){
  if(!bpStarted()){const P=document.getElementById('p-bp');if(P)P.innerHTML=`<div class="grid">${bpEmptyHTML()}</div>`;return;}
  _rb.apply(this,arguments);try{fxMount('bp');}catch(e){console.error('fx bp',e);}};}
/* pas de recherche Business plan envoyée à Claude tant qu'aucun dossier n'est lancé */
if(typeof rsMarket==='function'){const _rm=rsMarket;rsMarket=async function(){if(!bpStarted())return;return _rm.apply(this,arguments);};}
function bpCreate(){const F=document.getElementById('bp0form');if(!F)return;const v=n=>(F.elements[n]&&F.elements[n].value||'').trim();
  const name=v('name');if(!name){toast('Donnez un nom au projet');F.elements.name.focus();return;}
  prjInit();const D=clone(DEF.bp);Object.assign(D,{name,sector:v('sector')||'saas',zone:v('zone')||'fr',startY:+v('startY')||new Date().getFullYear()+1,summary:v('summary'),edge:'',team:[]});
  delete D.mkt;delete D.mktAI;delete D.tamOv;delete D.cagrOv;
  const ver={id:uid('v'),label:'Version A',date:new Date().toISOString(),note:'Création du dossier',data:clone(D)};ver.dd=ver.date.slice(0,10);
  const p={id:uid('p'),name,folder:v('folder'),created:today(),versions:[ver],cur:ver.id};
  S.prj.bp.unshift(p);ui.prj_bp=p.id;S.bp=clone(D);S.bpStarted=true;ui.bpNew=false;ui.tab='bp';save();renderAll();
  toast('Dossier créé : première étude de marché envoyée à Claude');setTimeout(()=>{try{rsMarket('recalc');}catch(e){}},300);}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='bp0new'){ui.bpNew=true;renderAll();setTimeout(()=>{const i=document.querySelector('#bp0form [name=name]');if(i)i.focus();},50);}
  else if(a==='bp0cancel'){ui.bpNew=false;renderAll();}
  else if(a==='bp0go')bpCreate();
  else if(a==='bp0open'){S.bpStarted=true;ui.prj_bp=b.dataset.id;const p=prjCur('bp');prjApply('bp',(p.versions.find(x=>x.id===p.cur)||p.versions[p.versions.length-1]).data);save();renderAll();}
  else if(a==='fxopen')fxOpen(b.dataset.m,b.dataset.p,b.dataset.v);
  else if(a==='fxren')fxRename(b.dataset.m,b.dataset.p,b.dataset.v);
  else if(a==='fxfold')fxFolder(b.dataset.m,b.dataset.p);
  else if(a==='fxdel')fxDelete(b.dataset.m,b.dataset.p,b.dataset.v);
  else if(a==='fxnew'){if(b.dataset.m==='bp'){ui.bpNew=true;S.bpStarted=false;save();renderAll();}else prjAct('prjnew','an',b);}
  else if(a==='fxtog'){ui['fxOpen_'+b.dataset.m]=!fxIsOpen(b.dataset.m);save();renderAll();}});

/* ---------- explorateur « Mes dossiers » ---------- */
const fxIsOpen=m=>ui['fxOpen_'+m]!==false;
function fxHTML(m){prjInit();const P=S.prj[m],cur=prjCur(m),cv=cur&&verCur(m),open=fxIsOpen(m),title=m==='bp'?'Mes dossiers business plan':'Mes analyses financières';
  const groups={};P.forEach(p=>{const f=p.folder||'Sans dossier';(groups[f]=groups[f]||[]).push(p);});
  const body=Object.keys(groups).sort((a,b)=>a.localeCompare(b,'fr')).map(f=>`<div class="fx-gl">📁 ${esc(f)}</div>`+groups[f].map(p=>`<div class="fx-p${p.id===cur.id?' on':''}">
      <span class="nm">${esc(p.name)}</span>
      ${p.versions.map(v=>`<span class="fx-v${p.id===cur.id&&v.id===cv.id?' on':''}"><button class="o" data-act="fxopen" data-m="${m}" data-p="${p.id}" data-v="${v.id}" title="Ouvrir cette version">${esc(v.label)} · ${fdate(v.dd||v.date.slice(0,10))}</button><button class="i" data-act="fxren" data-m="${m}" data-p="${p.id}" data-v="${v.id}" title="Renommer la version" aria-label="Renommer la version">✎</button><button class="i d" data-act="fxdel" data-m="${m}" data-p="${p.id}" data-v="${v.id}" title="Supprimer la version" aria-label="Supprimer la version">✕</button></span>`).join('')}
      <span class="fx-sp"><button class="fx-ic" data-act="fxren" data-m="${m}" data-p="${p.id}" title="Renommer le projet">✎ Renommer</button><button class="fx-ic" data-act="fxfold" data-m="${m}" data-p="${p.id}" title="Changer de dossier">📁 Dossier</button><button class="fx-ic d" data-act="fxdel" data-m="${m}" data-p="${p.id}" title="Supprimer le projet">✕ Supprimer</button></span>
    </div>`).join('')).join('');
  return`<div class="card s12 fx noprint" id="fx-${m}"><div class="fx-h"><h2>${title} <span class="meta">${P.length} projet${P.length>1?'s':''} · ${P.reduce((n,p)=>n+p.versions.length,0)} versions</span></h2>
    <span class="fx-sp"><button class="btn sm" data-act="fxnew" data-m="${m}">${m==='bp'?'Nouveau dossier':'Nouveau projet'}</button><button class="btn sm" data-act="fxtog" data-m="${m}" aria-expanded="${open}">${open?'Replier':'Afficher'}</button></span></div>
    ${open?`<div class="fx-g">${body}</div>`:''}</div>`;}
function fxMount(m){const P=document.getElementById('p-'+m);if(!P)return;const old=P.querySelector('#fx-'+m);if(old)old.remove();
  const g=P.querySelector('.grid')||P;g.insertAdjacentHTML('afterbegin',fxHTML(m));}
if(typeof renderAN==='function'){const _ra=renderAN;renderAN=function(){_ra.apply(this,arguments);try{fxMount('an');}catch(e){console.error('fx an',e);}};}
function fxKeep(m){const p=prjCur(m),v=verCur(m);if(v&&prjDirty(m)&&sameTk(m))v.data=prjSnap(m);}
function fxOpen(m,pid,vid){fxKeep(m);ui['prj_'+m]=pid;const p=prjCur(m);if(!p)return;p.cur=vid;prjApply(m,verCur(m).data);if(m==='bp')S.bpStarted=true;save();renderAll();toast('Ouvert : '+p.name+' · '+verCur(m).label);}
function fxRename(m,pid,vid){const p=S.prj[m].find(x=>x.id===pid);if(!p)return;const v=vid&&p.versions.find(x=>x.id===vid),cur=v?v.label:p.name;
  const n=prompt(v?'Nouveau nom de la version':'Nouveau nom du projet',cur);if(n===null)return;const t=n.trim().slice(0,80);if(!t)return;
  if(v)v.label=t;else p.name=t;save();renderAll();toast('Renommé : '+t);}
function fxFolder(m,pid){const p=S.prj[m].find(x=>x.id===pid);if(!p)return;const n=prompt('Dossier de classement (vide = Sans dossier)',p.folder||'');if(n===null)return;p.folder=n.trim().slice(0,60);save();renderAll();}
function fxDelete(m,pid,vid){const L=S.prj[m],p=L.find(x=>x.id===pid);if(!p)return;
  if(vid&&p.versions.length>1){const v=p.versions.find(x=>x.id===vid);if(!confirm(`Supprimer la version « ${v.label} » de « ${p.name} » ? Cette action est définitive.`))return;
    p.versions=p.versions.filter(x=>x.id!==vid);if(p.cur===vid)p.cur=p.versions[p.versions.length-1].id;if(prjCur(m).id===p.id)prjApply(m,verCur(m).data);save();renderAll();toast('Version supprimée');return;}
  if(!confirm(`Supprimer le projet « ${p.name} » et ses ${p.versions.length} version${p.versions.length>1?'s':''} ? Cette action est définitive.`))return;
  S.prj[m]=L.filter(x=>x.id!==pid);
  if(!S.prj[m].length){if(m==='bp'){S.bpStarted=false;ui.bpNew=false;}else{prjInit();}}
  if(S.prj[m].length){if(!S.prj[m].find(x=>x.id===ui['prj_'+m]))ui['prj_'+m]=S.prj[m][0].id;prjApply(m,verCur(m).data);}
  save();renderAll();toast('Projet supprimé');}

/* ---------- mapping en direct : ETF et actions (TradingView), cryptos (CoinGecko) ---------- */
const MML={at:0,busy:false,d:null,err:''};
const mmTk=a=>{const sa=String(a.sa||'').replace(/^\/|\/$/g,''),m=sa.match(/^quote\/([a-z]+)\/([A-Za-z0-9.\-]+)$/),X={epa:'PA',ams:'AS',etr:'DE',lon:'L',bit:'MI',bme:'MC',swx:'SW',tsx:'TO',ebr:'BR'};
  if(m&&X[m[1]])return m[2]+'.'+X[m[1]];if(/^stocks\//.test(sa))return sa.split('/')[1].toUpperCase();return String(a.t||'').toUpperCase();};
async function mmLiveLoad(){if(MML.busy)return;MML.busy=true;
  try{const A=S.an.assets,keys=Object.keys(A),tks=keys.map(k=>mmTk(A[k]));const base=typeof liveBase==='function'&&liveBase()||'';
    const r=await fetch(base+'/api/v1/mapping?stk='+encodeURIComponent(tks.join(',')));const D=await r.json();if(!r.ok)throw new Error(D.error||('HTTP '+r.status));
    const dfr=new Date().toLocaleDateString('fr-FR'),iso=new Date().toISOString().slice(0,10);
    keys.forEach((k,i)=>{const x=D.stk&&D.stk[tks[i]],a=A[k];if(!x)return;
      if(typeof STK_RISK==='object'){STK_RISK.d[k]=STK_RISK.d[k]||{};if(x.p1y!==null)STK_RISK.d[k].r1y=+x.p1y.toFixed(1);}
      if(x.c!==null&&!a.pxManual){a.price=x.c;a.pxDate=dfr;a.pxSrc='TradingView, cours en direct (différé ~10 min) du '+dfr;}});
    if(typeof ETF_U==='object'&&D.etf){Object.entries(D.etf).forEach(([s,x])=>{const e=ETF_U.d[s];if(!e||x.c===null)return;if(e.m&&e.m.length)e.m[e.m.length-1]=x.c;if(e.v&&e.v.length)e.v[e.v.length-1]=x.c;});
      ETF_U.last=iso;ETF_U.src='Tiingo (historique ajusté) + TradingView (dernier cours en direct, '+dfr+')';}
    if(typeof CRYPTO_U==='object'&&D.cry){CRYPTO_U.d.forEach(c=>{const x=D.cry[c.sym];if(!x)return;['px','mc','fdv','vol','ath','athD','p30','p200','p1y'].forEach(f=>{if(x[f]!==null&&x[f]!==undefined)c[f]=x[f];});});
      CRYPTO_U.at=D.at;CRYPTO_U.src='CoinGecko API publique /coins/markets, en direct ('+new Date(D.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+')';}
    MML.d=D;MML.err='';save();}catch(e){MML.err=e.message||String(e);}
  MML.at=Date.now();MML.busy=false;if(typeof ui==='object'&&['an','sc'].includes(ui.tab))renderAll();}
const mmLiveDue=()=>!MML.busy&&Date.now()-MML.at>5*60e3;
{const _r2=renderAll;renderAll=function(){const r=_r2.apply(this,arguments);
  /* Business plan sans dossier : seul l'écran de création s'affiche (ni bandeaux, ni synthèse, ni panneau de droite) */
  try{if(ui.tab==='bp'&&!bpStarted()){const P=document.getElementById('p-bp');if(P)P.innerHTML=`<div class="grid">${bpEmptyHTML()}</div>`;
    const sd=document.getElementById('side');if(sd)sd.innerHTML='';const ap=document.getElementById('app');if(ap)ap.classList.add('noside');}}catch(e){}
  try{if(['an','sc'].includes(ui.tab)&&mmLiveDue())setTimeout(mmLiveLoad,0);
  const P=document.getElementById('p-'+ui.tab),h=P&&P.querySelector('.anmm h2 .meta, #p-sc .mm-h .meta');
  if(P&&MML.d&&!P.querySelector('.mmlive')){const t=P.querySelector('.anmm h2');if(t)t.insertAdjacentHTML('beforeend',`<span class="meta mmlive">· données en direct (TradingView, CoinGecko) à ${new Date(MML.d.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>`);}}catch(e){}return r;};}
setInterval(()=>{if(typeof ui==='object'&&['an','sc'].includes(ui.tab)&&document.visibilityState==='visible'&&mmLiveDue())mmLiveLoad();},60e3);

/* ---------- v8.36 : prix en direct en tête du panneau Commodities (or, argent, WTI, Brent) ---------- */
const CM_TOP4=[['gold','Or','COMEX:GC1!','USD/oz'],['silver','Argent','COMEX:SI1!','USD/oz'],['wti','WTI','NYMEX:CL1!','USD/baril'],['brent','Brent','ICEEUR:BRN1!','USD/baril']];
function cmTop4HTML(s){const D=typeof CMB==='object'&&CMB.d,live=t=>{if(!D)return null;for(const g of D.groups)for(const x of g.items)if(x.t===t&&x.c!==null&&isFinite(x.c))return x;return null;};
  const last=k=>{const a=s&&s[k];if(!a)return null;let i=a.length-1;while(i>=0&&!(a[i]>0))i--;if(i<0)return null;let j=i-1;while(j>=0&&!(a[j]>0))j--;return{c:a[i],ch:j>=0?(a[i]/a[j]-1)*100:null,d:s.d[i]};};
  const t=D?new Date(D.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
  if(!D&&typeof cmBoardLoad==='function'&&!(typeof CMB==='object'&&CMB.busy))setTimeout(cmBoardLoad,0);
  return`<div class="sideh">Prix en direct <span class="meta">${D?'TradingView · '+t:'chargement…'}</span></div><div class="wl-h"><span>Actif</span><span>Cours</span><span>Var.</span></div>`+
    CM_TOP4.map(([k,l,tk,u])=>{const x=live(tk),f=x?null:last(k),c=x?x.c:f&&f.c,ch=x?x.ch:f&&f.ch,sel=k===(ui.cmA||'brent')||(k==='wti'&&(ui.cmA||'brent')==='brent');
      return`<button class="wl${sel?' on':''}" data-act="cma" data-id="${k==='wti'?'brent':k}" title="${x?'Cours en direct, différé ~10 min (TradingView)':f?'Dernière clôture du '+fdate(f.d):''}"><span class="wl-s"><b>${l}</b><small>${u}${x?'':' · clôture'}</small></span><span class="wl-p">${c!=null?nf(c,c<100?2:2):'—'}</span><span class="wl-c ${ch!=null?cls(ch):''}">${ch!=null&&isFinite(ch)?sgn(ch,2):'—'}</span></button>`;}).join('');}
