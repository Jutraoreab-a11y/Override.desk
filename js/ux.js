/* ============ v8.3 : expérience utilisateur ============
   Recherche universelle (Ctrl+K ou /), centre d'alertes, mode simple / expert, guide de premier lancement,
   création automatique d'une fiche société (SEC EDGAR via le backend), cours du soir appliqués aux fiches. Aucun appel IA. */
const UX=()=>{if(!S.ux)S.ux={mode:'expert',seen:[],onb:false,notif:false};return S.ux;};
const uxIc={bell:'<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M8 1.5a4 4 0 0 0-4 4v2.7L2.6 11h10.8L12 8.2V5.5a4 4 0 0 0-4-4ZM6.3 12.5a1.8 1.8 0 0 0 3.4 0" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  mode:'<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  search:'<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="m10.5 10.5 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'};

/* ---- Recherche universelle ---- */
function uxIndex(){const o=[],A=S.an.assets;
  Object.entries(A).forEach(([k,a])=>o.push({t:'Action',l:a.t,n:a.n,go:{tab:'an',tk:k},kw:[k,a.t,a.n,a.sec]}));
  if(typeof ETF_U==='object')Object.entries(ETF_U.d).forEach(([k,e])=>o.push({t:'ETF',l:k,n:e.n,go:{anX:{cls:'etf',id:k}},kw:[k,e.n,e.th,e.geo]}));
  if(typeof CRYPTO_U==='object')CRYPTO_U.d.forEach(c=>o.push({t:'Crypto',l:c.sym,n:c.name,go:{anX:{cls:'cry',id:c.sym}},kw:[c.sym,c.name,c.nar]}));
  if(typeof mktAll==='function')Object.entries(mktAll()).filter(([k])=>!k.startsWith('stk_')).forEach(([k,m])=>o.push({t:'Marché',l:m.l,n:m.g||'Commodities & flows',go:{tab:'cm',mkt:k},kw:[k,m.l]}));
  (S.prj&&S.prj.bp||[]).forEach(p=>o.push({t:'Dossier',l:p.name,n:'Business plan · '+(p.folder||''),go:{tab:'bp',prj:p.id},kw:[p.name,p.folder]}));
  MODS.forEach(([k,l])=>o.push({t:'Volet',l,n:'Aller au volet',go:{tab:k},kw:[l]}));return o;}
const uxNorm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function uxFind(q){const n=uxNorm(q).trim();if(!n)return uxIndex().filter(x=>x.t==='Volet');
  return uxIndex().map(x=>{const k=x.kw.map(uxNorm),s=k.some(v=>v===n)?3:k.some(v=>v.startsWith(n))?2:k.some(v=>v.includes(n))?1:0;return{x,s};}).filter(z=>z.s).sort((a,b)=>b.s-a.s).slice(0,12).map(z=>z.x);}
function uxGo(g){if(g.anX){ui.tab='an';ui.anX={...g.anX,tk0:ui.tk};}else{if(g.tab)ui.tab=g.tab;if(g.tk){ui.tk=g.tk;ui.anX=null;}if(g.mkt&&typeof mktX==='function')mktX().main=g.mkt;if(g.prj){const p=S.prj.bp.find(x=>x.id===g.prj);if(p&&typeof prjOpen==='function')prjOpen('bp',p.id);}}
  ui.uxQ=null;ui.anmOpen=false;save();renderAll();const m=document.getElementById('main');if(m)m.scrollTop=0;}
function uxPalette(){let el=document.getElementById('uxq');if(ui.uxQ===null||ui.uxQ===undefined){if(el)el.hidden=true;return;}
  if(!el){el=document.createElement('div');el.id='uxq';el.className='ai';document.body.appendChild(el);}el.hidden=false;
  const R=uxFind(ui.uxQ),sel=Math.min(ui.uxI||0,Math.max(0,R.length-1)),q=ui.uxQ.trim();
  el.innerHTML=`<div class="ai-box uxq" role="dialog" aria-label="Recherche universelle"><div class="uxq-in">${uxIc.search}<input id="uxqi" value="${esc(ui.uxQ)}" placeholder="Action, ETF, crypto, matière première, dossier, volet…" autocomplete="off" spellcheck="false" aria-label="Rechercher"><kbd>Échap</kbd></div>
    <div class="uxq-l" role="listbox">${R.map((x,i)=>`<button class="uxq-r${i===sel?' on':''}" role="option" aria-selected="${i===sel}" data-act="uxgo" data-id="${i}"><span class="tag">${x.t}</span><b>${esc(x.l)}</b><span class="meta">${esc(x.n||'')}</span></button>`).join('')}
    ${q&&!R.some(x=>x.t==='Action'&&uxNorm(x.l)===uxNorm(q))?`<button class="uxq-r" data-act="uxcreate" data-id="${esc(q)}"><span class="tag am">Nouveau</span><b>Créer la fiche ${esc(q.toUpperCase())}</b><span class="meta">${typeof AI==='object'&&AI.mcp&&AI.sample?"l'IA lit les pages publiques de la société (aucune clé)":FLUX.on?'lecture des pages publiques par le serveur':'saisie au crayon, ou ouvrir dans l\'application Claude pour la lecture IA'}</span></button>`:''}</div></div>`;
  ui.uxR=R;const i=document.getElementById('uxqi');i.focus();i.setSelectionRange(i.value.length,i.value.length);}
document.addEventListener('input',e=>{if(e.target.id==='uxqi'){ui.uxQ=e.target.value;ui.uxI=0;uxPalette();}});
document.addEventListener('keydown',e=>{
  if((e.key==='k'&&(e.metaKey||e.ctrlKey))||(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))){e.preventDefault();ui.uxQ='';ui.uxI=0;uxPalette();return;}
  if(ui.uxQ===null||ui.uxQ===undefined)return;
  if(e.key==='Escape'){ui.uxQ=null;uxPalette();}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();ui.uxI=clamp((ui.uxI||0)+(e.key==='ArrowDown'?1:-1),0,Math.max(0,(ui.uxR||[]).length-1));uxPalette();}
  else if(e.key==='Enter'&&e.target.id==='uxqi'){e.preventDefault();const r=(ui.uxR||[])[ui.uxI||0];if(r)uxGo(r.go);else if(ui.uxQ.trim())uxCreate(ui.uxQ.trim());}});
document.addEventListener('click',e=>{const p=document.getElementById('uxq');if(p&&!p.hidden&&e.target===p){ui.uxQ=null;uxPalette();}});

/* ---- Création d'une fiche : comptes publiés depuis la SEC quand le backend est connecté ---- */
async function uxCreate(q){ui.uxQ=null;uxPalette();const t=q.toUpperCase().replace(/[^A-Z0-9.:\-]/g,'');
  const tmp=document.createElement('button');tmp.dataset.act='create';tmp.dataset.id=q;tmp.hidden=true;document.body.appendChild(tmp);tmp.click();tmp.remove();
  const k=ui.tk,a=S.an.assets[k];ui.tab='an';ui.anX=null;renderAll();
  const done=(r,how)=>{ui.edit=false;recalc();save();renderAll();toast(`${a.n} : comptes chargés (${how})${r.missing&&r.missing.length?' · à compléter au crayon : '+r.missing.join(', '):''}`);};
  /* 1. Application Claude : l'IA lit les pages publiques dans le navigateur intégré, aucune clé */
  if(typeof AI==='object'&&AI.mcp&&AI.sample){toast(`Lecture des pages publiques de ${q} par l'IA…`);
    try{return done(await aiCompany(q,a),"lecture IA des pages publiques, montants vérifiés dans le texte");}catch(e){toast('Lecture IA impossible : '+(e.message||aiErr(e))+'. Saisie au crayon possible.');return;}}
  /* 2. Web avec backend : le serveur lit les mêmes pages (seule clé : Anthropic), cache en base */
  if(FLUX.on){toast(`Lecture des pages publiques de ${t} par le serveur…`);
    try{const r=await liveApi('/api/v1/ai/ingest',{method:'POST',body:{module:'an',subject:t,trigger:'init'}});const p=r.record&&r.record.payload;
      if(p&&Array.isArray(p.revenue)&&p.revenue.length){a.sa=saPath(t);return done(anApply(a,p,(r.record.source_url||'')),r.cached?'base, 0 jeton':`lecture IA serveur, ${r.tokens} jetons`);}
      throw new Error('aucun compte lu');}
    catch(e){/* 3. Société américaine : comptes officiels de la SEC, sans IA ni clé */
      try{const r=await liveApi('/api/v1/fundamentals?ticker='+encodeURIComponent(t)),st=r.statements;
        return done(anApply(a,{name:r.title,currency:st.currency,fiscal_years:st.years.map(y=>+y.slice(2)),revenue:st.rev,ebitda:st.ebitda,net_income:st.ni,eps:st.eps,fcf:st.fcf,net_debt:st.nd,roe_pct:st.roe,shares:st.shares},r.source_url),'SEC EDGAR, sans IA');}
      catch(e2){toast(`Lecture impossible (${e.message}). Saisissez les comptes au crayon.`);return;}}}
  toast("Fiche créée. Ouvrez OVERRIDE.DESK dans l'application Claude pour que l'IA lise les comptes, ou saisissez-les au crayon.");}

/* ---- Cours du soir (backend) appliqués aux fiches et aux cryptos, sans écraser une saisie ---- */
if(typeof liveMerge==='function'){const _lm=liveMerge;liveMerge=function(tr,br,cm){const r=_lm.apply(this,arguments);
  if(cm&&Array.isArray(cm.prices)){const last={};cm.prices.forEach(p=>{if(p.contract!=='SPOT'||!/^(STK|CRY):/.test(p.instrument))return;const o=last[p.instrument];if(!o||p.price_date>o.price_date)last[p.instrument]=p;});
    const pd=s=>{const m=String(s||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:'';};
    Object.values(last).forEach(p=>{const t=p.instrument.slice(4);
      if(p.instrument.startsWith('STK:')){const k=Object.keys(S.an.assets).find(x=>S.an.assets[x].t.toUpperCase()===t||x===t);const a=k&&S.an.assets[k];
        if(a&&p.price_date>pd(a.pxDate)&&!a.pxManual){a.price=p.close;a.pxDate=p.price_date.split('-').reverse().join('/');a.pxSrc=`${p.source_name}, clôture du ${a.pxDate}`;}}
      else if(typeof CRYPTO_U==='object'){const c=CRYPTO_U.d.find(x=>x.sym===t);if(c&&p.price_date>=CRYPTO_U.at.slice(0,10)){c.px=p.close;c.pxAt=p.price_date;}}});}
  return r;};}

/* ---- Centre d'alertes ---- */
function uxAlerts(){const o=[],today=new Date().toISOString().slice(0,10),pd=s=>{const m=String(s||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:'';};
  Object.entries(S.an.assets).forEach(([k,a])=>{let R;try{R=anCalc(k);}catch(e){return;}
    if(isFinite(R.buy)&&+a.price>0&&+a.price<=R.buy)o.push({id:'buy:'+k+':'+a.pxDate,lv:'ok',t:`${a.t} au prix d'achat cible`,d:`Cours ${nf(+a.price,2)} ≤ cible ${nf(R.buy,2)} ${a.cur}`,go:{tab:'an',tk:k}});
    const age=(Date.parse(today)-Date.parse(pd(a.pxDate)))/864e5;if(a.pxDate&&age>7)o.push({id:'old:'+k+':'+a.pxDate,lv:'am',t:`Cours de ${a.t} daté`,d:`Dernier cours du ${a.pxDate} (${Math.round(age)} jours)`,go:{tab:'an',tk:k}});});
  try{const E=gsEngine(cmCalc());if(E.flag[0]==='ko')o.push({id:'fomo:'+E.L.d,lv:'ko',t:'Or / argent : mouvement FOMO',d:E.flag[2],go:{tab:'cm'}});
    if(isFinite(E.L.lead)&&Math.abs(E.L.lead)>E.th)o.push({id:'lead:'+E.L.d,lv:'am',t:'Signal lead / lag or-argent',d:E.lag[1],go:{tab:'cm'}});}catch(e){}
  return o;}
function uxAlertPanel(){let el=document.getElementById('uxal');if(!ui.uxAl){if(el)el.hidden=true;return;}
  if(!el){el=document.createElement('div');el.id='uxal';el.className='ai';document.body.appendChild(el);}el.hidden=false;const A=uxAlerts(),seen=new Set(UX().seen);
  el.innerHTML=`<div class="ai-box uxal" role="dialog" aria-label="Alertes"><div class="ai-h"><b>Alertes <span class="meta">${A.length} active${A.length>1?'s':''}</span></b><div class="row" style="gap:6px">${'Notification' in window&&Notification.permission!=='granted'?'<button class="btn sm" data-act="uxnotif">Activer les notifications</button>':''}<button class="btn sm" data-act="uxalx">Fermer</button></div></div>
    ${A.length?A.map((a,i)=>`<button class="uxal-r${seen.has(a.id)?'':' new'}" data-act="uxalgo" data-id="${i}"><span class="dot ${a.lv}"></span><span><b>${esc(a.t)}</b><span class="meta">${esc(a.d)}</span></span></button>`).join(''):'<p class="note">Aucune alerte : aucun titre au prix cible, données à jour, pas de mouvement spéculatif détecté.</p>'}
    <p class="note">Alertes calculées dans le navigateur à chaque recalcul, sans appel réseau ni IA. Les notifications du système s'affichent quand une nouvelle alerte apparaît et que l'onglet est ouvert.</p></div>`;ui.uxAlL=A;}
function uxNotify(){const A=uxAlerts(),U=UX(),seen=new Set(U.seen),fresh=A.filter(a=>!seen.has(a.id));
  const b=document.getElementById('uxBell');if(b)b.innerHTML=`${uxIc.bell}<span class="lbl">Alertes</span>${fresh.length?`<span class="cnt">${fresh.length}</span>`:''}`;
  if(fresh.length&&U.notif&&'Notification' in window&&Notification.permission==='granted'&&!ui.uxNotified){ui.uxNotified=true;try{new Notification('OVERRIDE.DESK',{body:fresh.slice(0,3).map(a=>a.t).join(' · ')});}catch(e){}}}

/* ---- Mode simple : chaque volet montre d'abord sa synthèse, le détail se déplie ---- */
function uxFold(){const simple=UX().mode==='simple';document.body.classList.toggle('ux-simple',simple);if(!simple)return;ui.uxOpen=ui.uxOpen||{};
  const P=document.getElementById('p-'+ui.tab);if(!P)return;let n=0;
  P.querySelectorAll('.card').forEach(c=>{const h=c.querySelector(':scope>h2');if(!h)return;n++;if(n<=3||c.classList.contains('msg'))return;const key=ui.tab+':'+h.textContent.slice(0,40);
    if(!ui.uxOpen[key]){c.classList.add('fold');h.setAttribute('data-act','uxunfold');h.dataset.id=key;h.setAttribute('role','button');h.setAttribute('tabindex','0');h.title='Afficher le détail';}});}

/* ---- Guide de premier lancement ---- */
const UX_ONB=[['Bienvenue dans OVERRIDE.DESK','Un poste de travail pour décider : business plan, analyse financière, mapping multi-actifs, LBO, portefeuille, commodities et macro. Chaque chiffre est sourcé et daté ; une donnée absente reste vide plutôt que d\'être inventée.'],
  ['Le crayon ✏️ force n\'importe quelle valeur','Cliquez sur un chiffre suivi d\'un crayon pour le remplacer : tout le dossier se recalcule en cascade et la valeur forcée reste signalée et tracée.'],
  ['Trouver un actif en une touche','Ctrl+K (ou /) ouvre la recherche universelle : action, ETF, crypto, matière première, dossier ou volet. Le mapping sectoriel & stock s\'ouvre depuis l\'Analyse financière. La cloche regroupe les alertes : prix d\'achat atteint, données périmées, mouvement spéculatif.']];
function uxOnb(){let el=document.getElementById('uxonb');const U=UX();if(U.onb||navigator.webdriver){if(el)el.hidden=true;return;}
  if(!el){el=document.createElement('div');el.id='uxonb';el.className='ai';document.body.appendChild(el);}el.hidden=false;const i=ui.uxOnbI||0,[t,d]=UX_ONB[i];
  el.innerHTML=`<div class="ai-box uxonb" role="dialog" aria-label="Guide de démarrage"><div class="meta">Étape ${i+1} sur ${UX_ONB.length}</div><h2 style="margin:6px 0 8px">${t}</h2><p>${d}</p>
    <div class="row" style="justify-content:space-between;margin-top:14px"><button class="btn sm" data-act="uxonbx">Passer</button><div class="row" style="gap:6px">${i?'<button class="btn sm" data-act="uxonbp">Précédent</button>':''}<button class="btn sm pri" data-act="${i<UX_ONB.length-1?'uxonbn':'uxonbx'}">${i<UX_ONB.length-1?'Suivant':'Commencer'}</button></div></div></div>`;}

/* ---- Boutons de l'en-tête et branchements ---- */
function uxHeader(){const acts=document.querySelector('.acts');if(!acts||document.getElementById('uxBell'))return;
  const mk=(id,act,title)=>{const b=document.createElement('button');b.className='tbtn';b.id=id;b.dataset.act=act;b.title=title;return b;};
  const s=mk('uxSearch','uxopen','Recherche universelle (Ctrl+K)');s.innerHTML=`${uxIc.search}<span class="lbl">Rechercher</span>`;
  const m=mk('uxMode','uxmode','Basculer entre le mode simple (synthèse d\'abord) et le mode expert');
  const b=mk('uxBell','uxal','Alertes');acts.insertBefore(b,acts.firstChild);acts.insertBefore(m,acts.firstChild);acts.insertBefore(s,acts.firstChild);}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,U=UX();
  if(a==='uxopen'){ui.uxQ='';ui.uxI=0;uxPalette();}
  else if(a==='uxgo'){const r=(ui.uxR||[])[+b.dataset.id];if(r)uxGo(r.go);}
  else if(a==='uxcreate')uxCreate(b.dataset.id);
  else if(a==='uxmode'){U.mode=U.mode==='simple'?'expert':'simple';save();renderAll();toast(U.mode==='simple'?'Mode simple : synthèse d\'abord, cliquez un titre de carte pour déplier le détail':'Mode expert : tout le détail affiché');}
  else if(a==='uxunfold'){ui.uxOpen=ui.uxOpen||{};ui.uxOpen[b.dataset.id]=true;b.closest('.card').classList.remove('fold');b.removeAttribute('data-act');}
  else if(a==='uxal'){ui.uxAl=true;uxAlertPanel();}
  else if(a==='uxalx'){ui.uxAl=false;U.seen=[...new Set(U.seen.concat((ui.uxAlL||[]).map(x=>x.id)))].slice(-300);save();uxAlertPanel();uxNotify();}
  else if(a==='uxalgo'){const x=(ui.uxAlL||[])[+b.dataset.id];if(x){U.seen=[...new Set(U.seen.concat(x.id))];ui.uxAl=false;uxAlertPanel();uxGo(x.go);}}
  else if(a==='uxnotif'){Notification.requestPermission().then(p=>{U.notif=p==='granted';save();uxAlertPanel();toast(p==='granted'?'Notifications activées':'Notifications refusées par le navigateur');});}
  else if(a==='uxonbn'){ui.uxOnbI=(ui.uxOnbI||0)+1;uxOnb();}else if(a==='uxonbp'){ui.uxOnbI=Math.max(0,(ui.uxOnbI||0)-1);uxOnb();}
  else if(a==='uxonbx'){U.onb=true;save();uxOnb();}});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset&&e.target.dataset.act==='uxunfold'){e.preventDefault();e.target.click();}});
/* La recherche du volet Analyse s'étend aux ETF, cryptos et marchés avant de proposer la création */
if(typeof doSearch==='function'){const _ds=doSearch;doSearch=function(){const q=(($('#q')||{}).value||'').trim();if(!q)return;
  const A=S.an.assets,hit=Object.keys(A).some(k=>k===q.toUpperCase()||A[k].t.toUpperCase().split('.')[0]===q.toUpperCase()||A[k].n.toLowerCase().includes(q.toLowerCase()));
  if(!hit){const r=uxFind(q).filter(x=>x.t!=='Volet');if(r.length){ui.uxQ=q;ui.uxI=0;uxPalette();return;}ui.uxQ=q;ui.uxI=0;uxPalette();return;}
  _ds.apply(this,arguments);};}
{const _r=renderAll;renderAll=function(){_r.apply(this,arguments);try{uxHeader();const m=document.getElementById('uxMode');if(m)m.innerHTML=`${uxIc.mode}<span class="lbl">${UX().mode==='simple'?'Mode simple':'Mode expert'}</span>`;uxFold();uxNotify();uxOnb();if(ui.uxAl)uxAlertPanel();}catch(e){console.error('ux',e);}};}
