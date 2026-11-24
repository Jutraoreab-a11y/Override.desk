/* ============ v8.38 : Mes analyses financières = dossiers de titres ============
   - Un dossier (ex. « Sociétés cotées · stratégie long ») contient plusieurs titres ; chaque titre a ses versions V1, V2, V3…
   - Un seul nom par dossier (bouton Renommer) : plus de double « nom du projet » / « dossier de classement ».
   - Dossier fermé : aucune analyse affichée, seulement la liste des dossiers.
   - Un clic sur une version l'ouvre ; « Nouvelle version » copie la version en cours pour la modifier ; « Imprimer en PDF » imprime l'analyse ouverte. */

const AN38={busy:{},err:{}};
const anDosName=p=>p.name||'Dossier sans nom';
function anStocks(p){const m=new Map();(p.versions||[]).forEach(v=>{const tk=v.data&&v.data.tk;if(!tk)return;if(!m.has(tk))m.set(tk,[]);m.get(tk).push(v);});return[...m.entries()];}
function anOpenVer(){const p=S.prj&&S.prj.an&&S.prj.an.find(x=>x.id===ui.prj_an);if(!p)return null;const v=(p.versions||[]).find(x=>x.id===p.cur);return v&&v.data&&v.data.tk===ui.tk?{p,v}:null;}

/* Migration unique : un seul titre par dossier (l'ancien « dossier de classement » devient le nom s'il était le seul renseigné) et versions numérotées V1, V2… par titre */
(()=>{try{if(!S.prj||!S.prj.an||S.v838mig)return;
  S.prj.an.forEach(p=>{if(p.folder&&(!p.name||/^(Nouvelles analyses|Analyses \d{4}|Nouveau projet)$/.test(p.name)))p.name=p.folder;p.folder='';
    anStocks(p).forEach(([,L])=>L.forEach((v,i)=>{if(/^Analyse\b/.test(v.label||'')||!v.label)v.label='V'+(i+1);}));});
  S.v838mig=new Date().toISOString();save();}catch(e){console.error('v838 migration',e);}})();
if(ui.anOpen===undefined)ui.anOpen=false;

/* Numérotation des versions d'analyse : V(n+1) pour le titre ouvert dans le dossier courant */
{const _nl=nextLabel;nextLabel=function(p,mod){if(mod!=='an')return _nl.apply(this,arguments);const n=(p.versions||[]).filter(v=>v.data&&v.data.tk===ui.tk).length;return'V'+(n+1);};}

/* ---------- liste des dossiers ---------- */
function anXHTML(){prjInit();const P=S.prj.an,o=anOpenVer(),nT=P.reduce((n,p)=>n+anStocks(p).length,0);
  const dos=P.map(p=>{const open=ui.anDos===p.id,st=anStocks(p);
    return`<div class="ad${open?' on':''}"><div class="ad-h">
      <button class="ad-t" data-act="adtog" data-p="${p.id}" aria-expanded="${open}"><span class="car">${open?'▾':'▸'}</span>📁 <b>${esc(anDosName(p))}</b></button>
      <span class="meta">${st.length} titre${st.length>1?'s':''} · ${(p.versions||[]).length} version${(p.versions||[]).length>1?'s':''} · créé le ${fdate(p.created)}</span>
      <span class="fx-sp"><button class="fx-ic" data-act="adren" data-p="${p.id}">✎ Renommer</button><button class="fx-ic d" data-act="addel" data-p="${p.id}">✕ Supprimer</button></span></div>
      ${open?`<div class="ad-b">${st.length?st.map(([tk,L])=>{const a=S.an.assets[tk]||(L[L.length-1].data||{}).asset||{},on=o&&o.p.id===p.id&&o.v.data.tk===tk;
        return`<div class="ad-s${on?' on':''}"><div class="ad-n"><b>${esc(a.t||tk)}</b> <span>${esc(a.n&&a.n!==a.t?a.n:'')}</span>${isFinite(+a.price)?`<span class="meta">${nf(+a.price,2)} ${esc(a.cur||'')}${a.pxDate?' · '+esc(a.pxDate):''}</span>`:''}</div>
          <div class="ad-v">${L.map(v=>`<button class="fx-v-b${o&&o.v.id===v.id?' on':''}" data-act="adopen" data-p="${p.id}" data-v="${v.id}" title="Ouvrir cette version">${esc(v.label)} · ${fdate(v.dd||String(v.date).slice(0,10))}</button>`).join('')}</div>
          <span class="fx-sp"><button class="fx-ic" data-act="advnew" data-p="${p.id}" data-tk="${esc(tk)}">＋ Nouvelle version</button><button class="fx-ic" data-act="adprint" data-p="${p.id}" data-tk="${esc(tk)}">🖨 Imprimer en PDF</button><button class="fx-ic d" data-act="adrm" data-p="${p.id}" data-tk="${esc(tk)}">Retirer</button></span></div>`;}).join(''):'<p class="meta" style="margin:4px 0 8px">Aucun titre dans ce dossier.</p>'}
        <div class="ad-add"><input class="f" id="ad-in-${p.id}" placeholder="Ticker à ajouter, ex. AAPL, MC.PA, ASML.AS" autocomplete="off" data-p="${p.id}">
          <button class="btn sm pri" data-act="adadd" data-p="${p.id}"${AN38.busy[p.id]?' disabled':''}>${AN38.busy[p.id]?'Lecture des comptes…':'Ajouter au dossier'}</button>
          ${AN38.err[p.id]?`<span class="note" style="color:var(--down)">${esc(AN38.err[p.id])}</span>`:''}</div></div>`:''}</div>`;}).join('');
  return`<div class="card s12 fx noprint" id="fx-an"><div class="fx-h"><h2>Mes analyses financières <span class="meta">${P.length} dossier${P.length>1?'s':''} · ${nT} titre${nT>1?'s':''}</span></h2>
    <span class="fx-sp"><button class="btn sm pri" data-act="adnew">Nouveau dossier</button></span></div>
    <div class="fx-g">${dos||'<p class="meta">Aucun dossier. Créez un dossier (ex. « Sociétés cotées · stratégie long »), puis ajoutez-y des titres par leur ticker.</p>'}</div></div>`;}
{const _fx=fxHTML;fxHTML=function(m){return m==='an'?anXHTML():_fx.apply(this,arguments);};}

/* ---------- barre de l'analyse ouverte (remplace « Dossier projet / Version » : plus de doublon avec la liste) ---------- */
{const _pb=prjBar;prjBar=function(mod){if(mod!=='an')return _pb.apply(this,arguments);prjInit();const o=anOpenVer(),a=S.an.assets[ui.tk]||{};
  if(!o){const P=S.prj.an;return`<div class="card s12 prj noprint"><div class="prj-h"><span class="prj-l">${ic('fold')}<b>${esc(a.t||ui.tk)}</b> <span class="tag am">hors dossier</span></span>
    ${P.length?`<select class="f" id="ad-to" style="width:auto;max-width:260px" aria-label="Dossier">${P.map(p=>`<option value="${p.id}"${p.id===ui.anDos?' selected':''}>${esc(anDosName(p))}</option>`).join('')}</select><button class="btn sm pri" data-act="adsave">Enregistrer dans ce dossier</button>`:'<button class="btn sm pri" data-act="adnew">Créer un dossier</button>'}
    <span class="row" style="margin-left:auto"><button class="btn sm" data-act="adprint">🖨 Imprimer en PDF</button><button class="btn sm" data-act="adclose">Fermer l'analyse</button></span></div></div>`;}
  const dirty=prjDirty('an');
  return`<div class="card s12 prj noprint"><div class="prj-h"><span class="prj-l">${ic('fold')}<b>${esc(anDosName(o.p))}</b> › <b>${esc(a.t||ui.tk)}</b> › ${esc(o.v.label)} · ${fdate(o.v.dd||String(o.v.date).slice(0,10))}</span>
    ${dirty?'<span class="tag am">Modifications non enregistrées</span>':'<span class="tag ok">Enregistré</span>'}
    <span class="row" style="margin-left:auto">
      <button class="btn sm${dirty?' pri':''}" data-act="versave" data-id="an">Enregistrer ${esc(o.v.label)}</button>
      <button class="btn sm" data-act="vernew" data-id="an">Enregistrer en nouvelle version</button>
      ${dirty?`<button class="btn sm" data-act="verrevert" data-id="an">Annuler les modifications</button>`:''}
      <button class="btn sm" data-act="adprint">🖨 Imprimer en PDF</button>
      <button class="btn sm" data-act="adclose">Fermer l'analyse</button></span></div></div>`;};}

/* ---------- affichage : sans analyse ouverte, seulement les dossiers ---------- */
{const _ra=renderAN;renderAN=function(){const P=document.getElementById('p-an');
  if(!ui.anOpen||!S.an.assets[ui.tk]){if(P){P.innerHTML=`<div class="grid">${anXHTML()}</div>`;}return;}
  return _ra.apply(this,arguments);};}

/* ---------- actions ---------- */
function anKeep(){const o=anOpenVer();if(o&&prjDirty('an'))o.v.data=prjSnap('an');}
function anOpen(pid,vid){anKeep();const p=S.prj.an.find(x=>x.id===pid);if(!p)return;const v=p.versions.find(x=>x.id===vid);if(!v)return;
  ui.prj_an=pid;ui.anDos=pid;p.cur=vid;prjApply('an',v.data);ui.anOpen=true;ui.tab='an';save();renderAll();const m=document.getElementById('main');if(m)m.scrollTop=0;}
function anNewDos(){const n=prompt('Nom du dossier (ex. Sociétés cotées · stratégie long)','');if(n===null)return null;const t=n.trim().slice(0,80);if(!t){toast('Donnez un nom au dossier');return null;}
  prjInit();const p={id:uid('p'),name:t,folder:'',created:today(),versions:[],cur:null};S.prj.an.unshift(p);ui.anDos=p.id;save();renderAll();toast('Dossier créé : ajoutez-y des titres');return p;}
function anAddVer(p,tk,label){const v={id:uid('v'),label:label||('V'+((p.versions||[]).filter(x=>x.data&&x.data.tk===tk).length+1)),date:new Date().toISOString(),note:'',data:{tk,asset:clone(S.an.assets[tk]),crit:clone(S.an.crit)}};
  v.dd=v.date.slice(0,10);p.versions.push(v);return v;}
async function anAddTk(pid){const p=S.prj.an.find(x=>x.id===pid),el=document.getElementById('ad-in-'+pid),tk=(el&&el.value||'').trim().toUpperCase();if(!p||!tk||AN38.busy[pid])return;
  if(anStocks(p).some(([k])=>String((S.an.assets[k]||{}).t||k).toUpperCase()===tk)){AN38.err[pid]=tk+' est déjà dans ce dossier';renderAll();return;}
  AN38.busy[pid]=true;AN38.err[pid]='';renderAll();
  try{anKeep();const b=await ficheFetch(tk);if(!b||!b.y)throw new Error('comptes introuvables');ficheOpen(tk,b);const key=ui.tk,v=anAddVer(p,key,'V1');AN38.busy[pid]=false;anOpen(pid,v.id);toast(`${tk} ajouté au dossier « ${anDosName(p)} » (V1, comptes publiés)`);}
  catch(e){AN38.busy[pid]=false;AN38.err[pid]=`${tk} : ${e.message||e}`;renderAll();}}
function anVerNew(pid,tk){const p=S.prj.an.find(x=>x.id===pid);if(!p)return;const o=anOpenVer();
  if(!(o&&o.p.id===pid&&o.v.data.tk===tk)){const L=p.versions.filter(v=>v.data&&v.data.tk===tk);if(!L.length)return;anKeep();ui.prj_an=pid;p.cur=L[L.length-1].id;prjApply('an',L[L.length-1].data);}
  const v=anAddVer(p,ui.tk);v.note='Copie de '+(o&&o.v.data.tk===tk?o.v.label:'la dernière version');p.cur=v.id;ui.anDos=pid;ui.anOpen=true;save();renderAll();toast(`${v.label} créée : modifiez puis enregistrez`);}
function anPrint(pid,tk){if(pid&&tk){const p=S.prj.an.find(x=>x.id===pid),L=p?p.versions.filter(v=>v.data&&v.data.tk===tk):[];const o=anOpenVer();
    if(L.length&&!(o&&o.p.id===pid&&o.v.data.tk===tk))anOpen(pid,L[L.length-1].id);}
  if(!ui.anOpen)return;const o=anOpenVer(),a=S.an.assets[ui.tk]||{},t0=document.title;
  document.title=`FOMO.DESK - Analyse ${a.t||ui.tk}${o?' '+o.v.label:''} - ${new Date().toLocaleDateString('fr-FR')}`;
  const restore=()=>{document.title=t0;window.removeEventListener('afterprint',restore);};window.addEventListener('afterprint',restore);
  setTimeout(()=>{const b=document.getElementById('pdfBtn');if(b)b.click();else window.print();},250);}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,pid=b.dataset.p;
  if(a==='adtog'){ui.anDos=ui.anDos===pid?null:pid;if(ui.anDos===null||(anOpenVer()&&anOpenVer().p.id!==ui.anDos)){anKeep();ui.anOpen=false;}save();renderAll();}
  else if(a==='adnew')anNewDos();
  else if(a==='adren'){const p=S.prj.an.find(x=>x.id===pid);if(!p)return;const n=prompt('Nouveau nom du dossier',anDosName(p));if(n===null)return;const t=n.trim().slice(0,80);if(!t)return;p.name=t;p.folder='';save();renderAll();toast('Dossier renommé : '+t);}
  else if(a==='addel'){const p=S.prj.an.find(x=>x.id===pid);if(!p)return;if(!confirm(`Supprimer le dossier « ${anDosName(p)} », ses ${anStocks(p).length} titre(s) et toutes leurs versions ? Cette action est définitive.`))return;
    S.prj.an=S.prj.an.filter(x=>x.id!==pid);if(ui.prj_an===pid){ui.anOpen=false;ui.prj_an=S.prj.an[0]&&S.prj.an[0].id;}if(ui.anDos===pid)ui.anDos=null;save();renderAll();toast('Dossier supprimé');}
  else if(a==='adopen')anOpen(pid,b.dataset.v);
  else if(a==='advnew')anVerNew(pid,b.dataset.tk);
  else if(a==='adrm'){const p=S.prj.an.find(x=>x.id===pid);if(!p)return;const tk=b.dataset.tk,n=p.versions.filter(v=>v.data&&v.data.tk===tk).length;
    if(!confirm(`Retirer ${(S.an.assets[tk]||{}).t||tk} du dossier « ${anDosName(p)} » (${n} version${n>1?'s':''}) ?`))return;
    p.versions=p.versions.filter(v=>!(v.data&&v.data.tk===tk));const o=anOpenVer();if(!o||o.p.id===pid&&ui.tk===tk){ui.anOpen=false;}if(!p.versions.find(v=>v.id===p.cur))p.cur=p.versions.length?p.versions[p.versions.length-1].id:null;save();renderAll();}
  else if(a==='adadd')anAddTk(pid);
  else if(a==='adprint')anPrint(pid,b.dataset.tk);
  else if(a==='adclose'){anKeep();ui.anOpen=false;save();renderAll();}
  else if(a==='adsave'){const s=document.getElementById('ad-to'),p=s&&S.prj.an.find(x=>x.id===s.value);if(!p)return;const v=anAddVer(p,ui.tk);ui.prj_an=p.id;ui.anDos=p.id;p.cur=v.id;save();renderAll();toast(`Enregistré dans « ${anDosName(p)} » (${v.label})`);}
},true);
document.addEventListener('keydown',e=>{const t=e.target;if(e.key==='Enter'&&t&&t.id&&t.id.startsWith('ad-in-'))anAddTk(t.dataset.p);});
/* Une analyse ouverte depuis le mapping ou une fiche s'affiche (hors dossier tant qu'elle n'est pas enregistrée) */
{const _fo=ficheOpen;ficheOpen=function(){ui.anOpen=true;return _fo.apply(this,arguments);};}
/* Le bouton « Nouveau projet » des anciennes barres crée désormais un dossier */
{const _pa=prjAct;prjAct=function(act,mod,b){if(mod==='an'&&act==='prjnew'){anNewDos();return;}if(mod==='an'&&!anOpenVer()&&['versave','vernew'].includes(act)){toast('Choisissez d\'abord le dossier où enregistrer cette analyse');return;}return _pa.apply(this,arguments);};}

/* ---------- styles ---------- */
{const st=document.createElement('style');st.textContent=`
.ad{border:1px solid var(--line,#27272A);border-radius:8px;margin-bottom:8px;background:rgba(255,255,255,.015)}
.ad.on{border-color:var(--line2,#52525B)}
.ad-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 10px}
.ad-t{background:none;border:0;color:var(--hi,#FAFAFA);font:inherit;cursor:pointer;display:flex;align-items:center;gap:6px;padding:2px 0}
.ad-t .car{width:12px;color:var(--mute,#71717A)}
.ad-b{border-top:1px solid var(--line,#27272A);padding:8px 10px 10px}
.ad-s{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:7px 8px;border-radius:6px;margin-bottom:4px}
.ad-s.on{background:rgba(255,255,255,.05)}
.ad-n{flex:1 1 260px;min-width:0;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}.ad-n span:not(.meta){overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:320px}.ad-n b{color:var(--hi,#FAFAFA)}
.ad-v{display:flex;gap:6px;flex-wrap:wrap}
.fx-v-b{background:var(--raised,#18181B);border:1px solid var(--line2,#3F3F46);color:var(--text,#D4D4D8);border-radius:999px;padding:3px 10px;font:12px var(--sans,inherit);cursor:pointer}
.fx-v-b.on{background:var(--hi,#FAFAFA);color:#09090B;border-color:var(--hi,#FAFAFA)}
.ad-add{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}.ad-add .f{max-width:320px}
@media print{#fx-an{display:none!important}}`;document.head.appendChild(st);}

/* ============ v8.38 : Sélecteur & mapping : sociétés cotées et non cotées ============
   - Deux onglets : « Sociétés cotées » (univers mondial : 44 031 sociétés, 75 industries) et « Sociétés non cotées » (vos dossiers).
   - Cotées : mapping des 75 industries (filtre par secteur, pays, place, taille) ; un clic sur une industrie affiche ses sociétés, un clic sur une société ouvre son analyse.
   - Non cotées : le secteur cible affiche aussi les sociétés cotées comparables de ses industries (clic : analyse). */
const SC38_IND={saas:[55,54],fintech:[29,25,26],health:[31,32,30],energy:[73,42,70],cyber:[55,54,52],edtech:[10,55],agri:[16,15],logi:[46,47,48,49]};
const sc38Cards=G=>[...G.querySelectorAll(':scope>.card')];
const sc38Title=c=>((c.querySelector('h2')||{}).textContent||'').trim();
function sc38Peers(){const sk=ui.secTarget,ids=new Set(SC38_IND[sk]||[]);if(!ids.size||typeof UNIV!=='object')return'';
  const rows=UNIV.rows.filter(r=>ids.has(r[2])&&r[5]<=2).sort((a,b)=>a[5]-b[5]).slice(0,30),tot=UNIV.rows.filter(r=>ids.has(r[2])).length;
  const inds=[...ids].map(i=>`<button class="chip" data-act="sc38ind" data-id="${i}" title="Voir les ${UNIV.rows.filter(r=>r[2]===i).length.toLocaleString('fr-FR')} sociétés cotées">${esc(UNIV.ind[i].fi)}</button>`).join('');
  return`<div class="sc38p"><h3 class="h3">Sociétés cotées comparables <span class="meta">${tot.toLocaleString('fr-FR')} sociétés dans ${ids.size} industrie${ids.size>1?'s':''} · grandes capitalisations affichées</span></h3>
    <div class="chips" style="margin:4px 0 8px">${inds}</div>
    <div class="tw"><table class="tbl uvt"><thead><tr><th>Société</th><th>Ticker</th><th>Pays</th><th>Industrie</th><th>Taille</th></tr></thead><tbody>
    ${rows.map(r=>`<tr class="uvr" data-act="uvco" data-id="${esc(r[0])}" tabindex="0"><td><b>${esc(r[1])}</b></td><td>${esc(r[0])}</td><td>${esc(uvC(UNIV.cty[r[3]]))}</td><td class="meta">${esc(UNIV.ind[r[2]].fi)}</td><td class="meta">${esc(UNIV.caps[r[5]].split(' (')[0])}</td></tr>`).join('')}</tbody></table></div>
    <p class="note">Univers : ${esc(UNIV.src)}. Un clic ouvre l'analyse financière de la société (comptes publiés).</p></div>`;}
function sc38(){const P=document.getElementById('p-sc'),G=P&&(P.querySelector(':scope>.grid')||P);if(!G||typeof UNIV!=='object')return;const mode=ui.scMap||'cot',U=uvS();
  const seg=`<div class="card s12 noprint sc38seg"><div class="seg" role="tablist" aria-label="Type de sociétés">
      <button role="tab" data-act="scmap" data-id="cot" aria-selected="${mode==='cot'}">Sociétés cotées <span class="meta">${UNIV.rows.length.toLocaleString('fr-FR')} · ${UNIV.ind.length} industries</span></button>
      <button role="tab" data-act="scmap" data-id="nc" aria-selected="${mode==='nc'}">Sociétés non cotées <span class="meta">vos dossiers · ${(S.sc.list||[]).length}</span></button></div></div>`;
  const C=sc38Cards(G),first=C.find(c=>/^(I\. Tamis|II\. Mapping 1)/.test(sc38Title(c)))||C[0];
  if(mode==='cot'){C.forEach(c=>{if(/^(I\. Tamis|II\. Mapping 1|Mapping 2|Dossiers class|Paramètres)/.test(sc38Title(c))||c.querySelector('[data-act=scper], select.scper'))c.remove();});
    const per=[...G.querySelectorAll(':scope>.card')].find(c=>/Période d'analyse/.test(c.textContent));if(per)per.remove();
    const body=`<div class="card s12 sc38cot"><div class="mmgrid">${uvFilters()}<div class="mmmain"><div class="grid">${U.view==='cos'&&U.sel?uvCosHTML():uvSecHTML()}</div></div></div></div>`;
    G.insertAdjacentHTML('afterbegin',seg+body);}
  else{if(first)first.insertAdjacentHTML('beforebegin',seg);else G.insertAdjacentHTML('afterbegin',seg);
    const m2=sc38Cards(G).find(c=>/^Mapping 2/.test(sc38Title(c)));if(m2)m2.insertAdjacentHTML('beforeend',sc38Peers());}}
if(typeof renderSC==='function'){const _rs=renderSC;renderSC=function(){const r=_rs.apply(this,arguments);try{sc38();}catch(e){console.error('sc38',e);}return r;};}
/* Les actions du mapping de l'univers rafraîchissent aussi le volet Sélecteur */
if(typeof renderAnMap==='function'){const _rm=renderAnMap;renderAnMap=function(){const r=_rm.apply(this,arguments);if(ui.tab==='sc'){try{renderSC();}catch(e){console.error(e);}}return r;};}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='scmap'){ui.scMap=b.dataset.id;save();renderAll();}
  else if(a==='sc38ind'){const U=uvS();U.sel=b.dataset.id;U.view='cos';U.page=0;U.q='';ui.scMap='cot';save();renderAll();const m=document.getElementById('main');if(m)m.scrollTop=0;}});
/* Ouverture d'une société de l'univers hors de l'application Claude : lecture directe des comptes publiés (serveur) */
if(typeof uvOpenCo==='function'){const _uo=uvOpenCo;uvOpenCo=async function(sym){
  const cov=Object.keys(S.an.assets).find(k=>{const r=uvFind(k);return r&&r[0]===sym;});
  if(cov||(typeof ficheGet==='function'&&ficheGet(sym))||(typeof AI==='object'&&AI.mcp))return _uo.apply(this,arguments);
  const r=UNIV.rows.find(x=>x[0]===sym);toast(`${r?r[1]:sym} : lecture des comptes publiés…`);
  try{const b=await ficheFetch(sym);if(!b||!b.y)throw new Error('comptes introuvables');const a=ficheOpen(sym,b);toast(`${a.n} : analyse ouverte (hors dossier, enregistrez-la dans un dossier)`);}
  catch(e){toast(`${r?r[1]:sym} : lecture impossible (${e.message||e})`);}};}
{const st=document.createElement('style');st.textContent=`.sc38seg{padding:10px 12px}.sc38seg .seg button{display:flex;gap:8px;align-items:baseline}.sc38cot{padding:12px}.sc38p{margin-top:14px;border-top:1px solid var(--line,#27272A);padding-top:10px}`;document.head.appendChild(st);}

/* ============ v8.38 : Commodities ============
   - Les deux vues « Pression & approvisionnement » et « Confirmation & corrélations » s'affichent ensemble par défaut (onglet « Tout »).
   - Chaque vue ne montre que ses actifs : taux directeurs, inflation, dollar et propulsion or/argent seulement dans Or / Argent ;
     stocks de brut, WASDE et graphique Brent/WTI seulement dans Brent / WTI ; la matrice cross-asset (tous actifs mélangés) est retirée. */
if(!ui.cmT||ui.cmT==='t')ui.cmT='all';
const CM38_HIDE={gold:[/^Stocks de brut/,/^WASDE/,/^Matrice cross-asset/,/Brent/],brent:[/^Taux directeurs/,/^Inflation & politique monétaire/,/^Sensibilité & propulsion/,/^WASDE/,/^Matrice cross-asset/,/^Répartition des signaux Or/,/(^|\s)Or\s·/,/Argent/]};
const cm38T=c=>((c.querySelector('h2')||{}).textContent||'').trim();
{const _rc=renderCM;renderCM=function(){const all=ui.cmT==='all'||!ui.cmT,a=ui.cmA||'brent';let conf=[];
  try{if(typeof mktX==='function'&&typeof MKT_TO_CMA==='object'){const X=mktX(),v=MKT_TO_CMA[X.main];if(v&&v!==a&&!(a==='gold'&&v==='silver'))X.main=a;}}catch(e){}
  if(all){ui.cmT='c';try{_rc.apply(this,arguments);const P=document.getElementById('p-cm');
      conf=[...P.querySelectorAll(':scope>.grid>.card')].filter(c=>/Tableau de confirmation/.test(cm38T(c))).map(c=>{c.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));return c.outerHTML;});}
    catch(e){console.error('cm38 confirmation',e);}finally{ui.cmT='t';}}
  try{_rc.apply(this,arguments);}finally{if(all)ui.cmT='all';}
  try{const P=document.getElementById('p-cm'),G=P&&P.querySelector(':scope>.grid');if(!G)return;
    const cards=[...G.querySelectorAll(':scope>.card')];
    if(conf.length){const chron=cards.filter(c=>/Tableau chronologique/.test(cm38T(c))),last=chron[chron.length-1];if(last)last.insertAdjacentHTML('afterend',conf.join(''));else G.insertAdjacentHTML('beforeend',conf.join(''));}
    const H=CM38_HIDE[a]||[];[...G.querySelectorAll(':scope>.card')].forEach(c=>{const t=cm38T(c);if(!t)return;
      if(/^Graphique principal/.test(t))return;   /* le graphique suit l'actif de la vue */
      if(H.some(r=>r.test(t))){c.remove();return;}
      if(/^Seuils de mise en conditionnelle/.test(t))c.querySelectorAll('tbody tr').forEach(tr=>{const l=((tr.querySelector('td')||{}).textContent||'');if(a==='gold'?/Brent|WTI/.test(l):/\bOr\b|Argent/.test(l))tr.remove();});});
    const sh=G.querySelector('.symhead .sh-n');if(sh&&all)sh.textContent='Pression, approvisionnement, confirmation et corrélations';}
  catch(e){console.error('cm38',e);}};}
/* Barre du haut : « Tout » (par défaut) puis les deux vues séparées */
{const _cx=ctxHTML;ctxHTML=function(){const h=_cx.apply(this,arguments);if(ui.tab!=='cm')return h;const t=ui.cmT||'all';
  return h.replace(/<div class="seg" role="tablist" aria-label="Vue">[\s\S]*?<\/div>/,`<div class="seg" role="tablist" aria-label="Vue">${[['all','Tout'],['t','Pression & approvisionnement'],['c','Confirmation & corrélations']].map(([k,l])=>`<button role="tab" data-act="cmt" data-id="${k}" aria-selected="${t===k}">${l}</button>`).join('')}</div>`);};}
