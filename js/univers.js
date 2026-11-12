/* ============ v8.11 : mapping par secteur sur l'univers complet des sociétés cotées ============
   Niveau 1 : secteurs, groupes ou industries (repères Damodaran), filtrables par pays, place de cotation et taille.
   Niveau 2 : clic sur un secteur → toutes les sociétés cotées de ce secteur (données FinanceDatabase) et le quadrant des titres déjà analysés.
   Niveau 3 : clic sur une société → Analyse financière (ouverte directement si elle est couverte, sinon comptes recherchés par Claude). */
const UV_FR={'United States':'États-Unis','China':'Chine','India':'Inde','Japan':'Japon','Canada':'Canada','Taiwan':'Taïwan','South Korea':'Corée du Sud','Australia':'Australie','United Kingdom':'Royaume-Uni','Hong Kong':'Hong Kong','Germany':'Allemagne','France':'France','Sweden':'Suède','Thailand':'Thaïlande','Malaysia':'Malaisie','Indonesia':'Indonésie','Brazil':'Brésil','Israel':'Israël','Switzerland':'Suisse','Italy':'Italie','Singapore':'Singapour','Turkey':'Turquie','Poland':'Pologne','Norway':'Norvège','Spain':'Espagne','Netherlands':'Pays-Bas','Denmark':'Danemark','Mexico':'Mexique','Saudi Arabia':'Arabie saoudite','Vietnam':'Viêt Nam','Philippines':'Philippines','South Africa':'Afrique du Sud','Finland':'Finlande','Belgium':'Belgique','Greece':'Grèce','Austria':'Autriche','Ireland':'Irlande','Chile':'Chili','Luxembourg':'Luxembourg','New Zealand':'Nouvelle-Zélande','Argentina':'Argentine','Bermuda':'Bermudes','Cayman Islands':'Îles Caïmans','Portugal':'Portugal','Egypt':'Égypte','United Arab Emirates':'Émirats arabes unis','Qatar':'Qatar','Kuwait':'Koweït','Russia':'Russie','Peru':'Pérou','Colombia':'Colombie','Pakistan':'Pakistan','Jersey':'Jersey','Guernsey':'Guernesey','Czech Republic':'République tchèque','Hungary':'Hongrie','Iceland':'Islande','Cyprus':'Chypre','Morocco':'Maroc','Nigeria':'Nigeria','Kenya':'Kenya','Non précisé':'Non précisé'};
const uvC=c=>UV_FR[c]||c;
function uvS(){if(!S.uv)S.uv={};const U=S.uv;U.view=U.view||'sec';U.lvl='ind';U.sec=U.sec||'';U.x=U.x||'eve';U.y=U.y||'opm';U.caps=Array.isArray(U.caps)?U.caps:[0,1,2,3,4,5,6];U.cty=U.cty??'';U.mkt=U.mkt??'';U.q=U.q||'';U.page=U.page||0;return U;}
const UV_AX={x:{eve:['VE / EBITDA (sociétés à EBITDA positif)','×'],pe:['PER (sociétés bénéficiaires)','×']},y:{opm:['Marge opérationnelle','%'],g5:['Croissance attendue du BPA à 5 ans','%'],nm:['Marge nette','%']}};
/* Filtre des sociétés : pays, place, taille */
function uvRows(){const U=uvS(),ci=U.cty===''?-1:UNIV.cty.indexOf(U.cty),mi=U.mkt===''?-1:UNIV.mkt.indexOf(U.mkt),caps=new Set(U.caps);
  return UNIV.rows.filter(r=>(ci<0||r[3]===ci)&&(mi<0||r[4]===mi)&&caps.has(r[5]));}
/* Agrégation au niveau choisi : moyenne des industries pondérée par le nombre de sociétés Damodaran */
function uvItems(rows){const U=uvS(),key=i=>U.lvl==='sec'?UNIV.ind[i].s:U.lvl==='grp'?UNIV.ind[i].g:String(i),G={};
  UNIV.ind.forEach((d,i)=>{const k=key(i);(G[k]=G[k]||{key:k,ids:[],lab:U.lvl==='sec'?d.fs:U.lvl==='grp'?d.fg:d.fi,sec:d.fs}).ids.push(i);});
  const cnt={},big={};rows.forEach(r=>{const k=key(r[2]);cnt[k]=(cnt[k]||0)+1;if(r[5]<=1)big[k]=(big[k]||0)+1;});
  return Object.values(G).map(g=>{const L=g.ids.map(i=>UNIV.ind[i]),w=k=>{const v=L.filter(d=>d[k]!==null&&isFinite(d[k]));const s=sum(v.map(d=>d.n));return s?sum(v.map(d=>d[k]*d.n))/s:NaN;};
    return Object.assign(g,{eve:w('eve'),pe:w('pe'),opm:w('opm'),nm:w('nm'),g5:w('g5'),n:cnt[g.key]||0,big:big[g.key]||0,damo:[...new Set(L.flatMap(d=>d.src))]});});}
function uvSecHTML(){const U=uvS(),rows=uvRows(),All=uvItems(rows).filter(x=>x.n>0),It=All.filter(x=>!U.sec||UNIV.ind[x.ids[0]].s===U.sec),ax=UV_AX.x[U.x],ay=UV_AX.y[U.y];
  const secs={};All.forEach(x=>{const d=UNIV.ind[x.ids[0]];(secs[d.s]=secs[d.s]||{l:d.fs,n:0,k:0}).n+=x.n;secs[d.s].k++;});
  const chips=`<div class="uvchips" role="tablist" aria-label="Secteurs"><button data-act="uvsecf" data-id="" aria-selected="${!U.sec}">Tous les secteurs <em>${All.length}</em></button>${Object.entries(secs).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`<button data-act="uvsecf" data-id="${esc(k)}" aria-selected="${U.sec===k}" title="${v.n.toLocaleString('fr-FR')} sociétés, ${v.k} industries">${esc(v.l)} <em>${v.k}</em></button>`).join('')}</div>`;
  const In=It.filter(x=>isFinite(x[U.x])&&x[U.x]>0&&x[U.x]<150&&isFinite(x[U.y])),tx=mmMed(In.map(x=>x[U.x])),ty=mmMed(In.map(x=>x[U.y]));
  const pts=In.map(x=>({x:x[U.x],y:x[U.y],id:x.key,label:x.lab.length>26?x.lab.slice(0,25)+'…':x.lab,aria:`${x.lab} : ${ax[0]} ${nf(x[U.x],1)}, ${ay[0]} ${nf(x[U.y],1)} %, ${x.n} sociétés`,r:3+clamp(Math.log10(x.n||1)*1.6,0,6),cls:(x[U.x]<=tx&&x[U.y]>=ty?'ok':x[U.y]>=ty?'am':x[U.x]<=tx?'':'ko')}));
  const svg=mmScatter(pts,{title:'Mapping des secteurs cotés',xl:ax[0]+' (inversé : moins cher à droite)',yl:ay[0]+' · %',inv:true,tx,ty,sparse:pts.length>15}).replace(/data-act="mmpt"/g,'data-act="uvsec"');
  const off=It.filter(x=>!In.includes(x));const sort=[...It].sort((a,b)=>b.n-a.n);
  return`<div class="card s12 mmq"><h2><span>Mapping ${U.sec?'du secteur '+esc(secs[U.sec]?secs[U.sec].l:''):'des secteurs cotés'} <span class="meta">${(U.sec?It.reduce((s,x)=>s+x.n,0):rows.length).toLocaleString('fr-FR')} sociétés · ${It.length} industries · taille du point : nombre de sociétés cotées</span></span></h2>
      <p class="note uvhow">Un <b>secteur</b> est une grande famille (11 au total, nomenclature GICS) ; il regroupe plusieurs <b>industries</b>, c'est-à-dire des métiers comparables (75 au total). Choisissez un secteur pour n'afficher que ses industries, puis cliquez une industrie pour voir ses sociétés et ouvrir leur analyse.</p>${chips}
      <div class="mmwrap">${svg}</div>
      <p class="note">Seuils : médianes des industries affichées (${ax[0]} ${nf(tx,1)}×, ${ay[0]} ${nf(ty,1)} %). Repères Damodaran (janvier 2026, sociétés américaines) appliqués à chaque industrie mondiale ; le nombre de sociétés suit vos filtres de pays, de place et de taille.${off.length?` Hors quadrant (multiple non pertinent, banques et assurances notamment) : ${off.map(x=>esc(x.lab)).join(', ')} ; ouverts depuis le tableau.`:''}</p></div>
    <div class="card s12"><h2><span>${U.sec?'Industries du secteur':'Toutes les industries'} <span class="meta">classées par nombre de sociétés cotées</span></span></h2><div class="tw"><table class="tbl uvt"><thead><tr><th>Industrie</th><th>Secteur</th><th class="n">Sociétés</th><th class="n">dont grandes</th><th class="n">VE / EBITDA</th><th class="n">PER</th><th class="n">Marge op.</th><th class="n">Croiss. BPA 5 ans</th></tr></thead><tbody>
      ${sort.map(x=>`<tr class="uvr" data-act="uvsec" data-id="${esc(x.key)}" tabindex="0"><td><b>${esc(x.lab)}</b></td><td class="meta">${esc(x.sec)}</td><td class="n">${x.n.toLocaleString('fr-FR')}</td><td class="n">${x.big.toLocaleString('fr-FR')}</td><td class="n">${isFinite(x.eve)?nf(x.eve,1)+'×':'non pertinent'}</td><td class="n">${isFinite(x.pe)?nf(x.pe,1)+'×':'non pertinent'}</td><td class="n">${isFinite(x.opm)?nf(x.opm,1)+' %':'non pertinent'}</td><td class="n">${isFinite(x.g5)?nf(x.g5,1)+' %':'non publié'}</td></tr>`).join('')}</tbody></table></div></div>`;}
/* Correspondance entre un titre analysé et l'univers (ticker exact, puis racine du ticker et pays) */
function uvFind(k){const a=S.an.assets[k];if(!a)return null;const t=String(a.t||k).toUpperCase(),b=t.split('.')[0];
  return UNIV.rows.find(r=>r[0]===t)||UNIV.rows.find(r=>r[0]===b)||UNIV.rows.find(r=>r[0].split('.')[0]===b&&r[5]<=2)||null;}
function uvCosHTML(){const U=uvS(),It=uvItems([]),g=It.find(x=>x.key===U.sel);if(!g){U.view='sec';return uvSecHTML();}
  const ids=new Set(g.ids),q=U.q.trim().toLowerCase();
  let rows=uvRows().filter(r=>ids.has(r[2]));const tot=rows.length;
  if(q)rows=rows.filter(r=>r[0].toLowerCase().includes(q)||r[1].toLowerCase().includes(q));
  const per=100,pages=Math.max(1,Math.ceil(rows.length/per));U.page=clamp(U.page,0,pages-1);const page=rows.slice(U.page*per,U.page*per+per);
  const cov={};Object.keys(S.an.assets).forEach(k=>{const r=uvFind(k);if(r)cov[r[0]]=k;});
  const mine=Object.entries(cov).filter(([sym])=>{const r=UNIV.rows.find(x=>x[0]===sym);return r&&ids.has(r[2]);}).map(([,k])=>k);
  let quad='<p class="note">Aucune société de cette industrie n\'est encore analysée : cliquez une société du tableau pour ouvrir son analyse financière.</p>';
  if(mine.length){const Q=mmQuad('stk'),P=Q.pts.filter(p=>mine.includes(p.id));if(P.length)quad=mmScatter(P,{title:'Sociétés analysées de l\'industrie',xl:Q.xl+(Q.inv?' (inversé : plus faible à droite)':'')+' · '+Q.xu,yl:Q.yl+' · '+Q.yu,inv:Q.inv,tx:Q.tx,ty:Q.ty}).replace(/data-act="mmpt"/g,'data-act="mmpt" data-cls="stk"');}
  const D=g.damo.join(', ');
  return`<div class="card s12"><h2><span><button class="btn sm" data-act="uvback">← Industries</button> ${esc(g.lab)} <span class="meta">secteur ${esc(g.sec)} · ${tot.toLocaleString('fr-FR')} sociétés cotées${U.cty?' · '+esc(uvC(U.cty)):''}${U.mkt?' · '+esc(U.mkt):''} · repères Damodaran : ${esc(D)}</span></span></h2>
      <div class="stats uvk"><div><span>VE / EBITDA</span><b>${isFinite(g.eve)?nf(g.eve,1)+'×':'non pertinent'}</b></div><div><span>PER</span><b>${isFinite(g.pe)?nf(g.pe,1)+'×':'non pertinent'}</b></div><div><span>Marge opérationnelle</span><b>${isFinite(g.opm)?nf(g.opm,1)+' %':'non pertinent'}</b></div><div><span>Croissance du BPA à 5 ans</span><b>${isFinite(g.g5)?nf(g.g5,1)+' %':'non publié'}</b></div></div>
      <div class="mmwrap">${quad}</div></div>
    <div class="card s12"><h2><span>Sociétés de l'industrie <span class="meta">${rows.length.toLocaleString('fr-FR')} affichées · « Fiche prête » : ouverture instantanée depuis le cache ; « Lancer » : lecture complète puis mise en cache</span></span>${typeof ficheFetch==='function'?'<button class="btn sm" data-act="uvpre" title="Lit et met en cache les comptes complets des 10 premières sociétés affichées">Précharger 10 fiches</button>':''}<input class="uvq" data-uv="q" type="search" placeholder="Nom ou ticker" value="${esc(U.q)}" aria-label="Rechercher une société"></h2>
      <div class="tw"><table class="tbl uvt"><thead><tr><th>Société</th><th>Ticker</th><th>Pays</th><th>Place de cotation</th><th>Taille</th><th>Industrie</th><th>Analyse</th></tr></thead><tbody>
      ${page.map(r=>{const k=cov[r[0]];return`<tr class="uvr" data-act="uvco" data-id="${esc(r[0])}" tabindex="0"><td><b>${esc(r[1])}</b></td><td>${esc(r[0])}</td><td>${esc(uvC(UNIV.cty[r[3]]))}</td><td class="meta">${esc(UNIV.mkt[r[4]])}</td><td class="meta">${esc(UNIV.caps[r[5]].split(' (')[0])}</td><td class="meta">${esc(UNIV.ind[r[2]].fi)}</td><td>${k?'<span class="tag ok">Analysée</span>':typeof ficheGet==='function'&&ficheGet(r[0])?'<span class="tag ok">Fiche prête</span>':'<span class="tag">Lancer</span>'}</td></tr>`;}).join('')||'<tr><td colspan="7" class="meta">Aucune société pour ces filtres.</td></tr>'}</tbody></table></div>
      ${pages>1?`<div class="uvpg"><button class="btn sm" data-act="uvpg" data-id="${U.page-1}"${U.page?'':' disabled'}>Précédent</button><span class="meta">page ${U.page+1} sur ${pages}</span><button class="btn sm" data-act="uvpg" data-id="${U.page+1}"${U.page<pages-1?'':' disabled'}>Suivant</button></div>`:''}</div>`;}
function uvFilters(){const U=uvS(),all=UNIV.rows,cc={},mc={};all.forEach(r=>{cc[r[3]]=(cc[r[3]]||0)+1;mc[r[4]]=(mc[r[4]]||0)+1;});
  const ctys=UNIV.cty.map((c,i)=>[c,cc[i]||0]).sort((a,b)=>b[1]-a[1]),mkts=UNIV.mkt.map((m,i)=>[m,mc[i]||0]).sort((a,b)=>b[1]-a[1]);
  return`<div class="mmside uvside"><b>Univers coté</b><p class="meta">${all.length.toLocaleString('fr-FR')} sociétés actives (cotation principale), ${UNIV.cty.length} pays, ${UNIV.mkt.length} places de cotation, 11 secteurs, 75 industries.</p>
    <label class="uvlab">Pays<select data-uv="cty"><option value="">Tous les pays</option>${ctys.map(([c,n])=>`<option value="${esc(c)}"${U.cty===c?' selected':''}>${esc(uvC(c))} (${n.toLocaleString('fr-FR')})</option>`).join('')}</select></label>
    <label class="uvlab">Place de cotation<select data-uv="mkt"><option value="">Toutes les places</option>${mkts.map(([m,n])=>`<option value="${esc(m)}"${U.mkt===m?' selected':''}>${esc(m)} (${n.toLocaleString('fr-FR')})</option>`).join('')}</select></label>
    <b>Taille</b><div class="uvcaps">${UNIV.caps.map((c,i)=>`<label><input type="checkbox" data-uv="cap" value="${i}"${U.caps.includes(i)?' checked':''}> ${esc(c)}</label>`).join('')}</div>
    ${U.view==='sec'?`    <label class="uvlab">Axe horizontal<select data-uv="x">${Object.entries(UV_AX.x).map(([k,v])=>`<option value="${k}"${U.x===k?' selected':''}>${v[0]}</option>`).join('')}</select></label>
    <label class="uvlab">Axe vertical<select data-uv="y">${Object.entries(UV_AX.y).map(([k,v])=>`<option value="${k}"${U.y===k?' selected':''}>${v[0]}</option>`).join('')}</select></label>`:''}
    <p class="meta">Sources : ${esc(UNIV.src)}.</p></div>`;}
function uvHTML(){const U=uvS();
  return`<div class="ai-box anm mm" role="dialog" aria-label="Mapping multi-actifs"><div class="ai-h"><b>Mapping multi-actifs</b>${mmBar()}<button class="btn sm" data-act="anmclose">Fermer</button></div>
    <div class="seg uvtabs" role="tablist">${[['sec','Mapping par secteur'],['cos','Sociétés'],['quad','Titres analysés (fondamentaux)']].map(([k,l])=>`<button role="tab" data-act="uvview" data-id="${k}" aria-selected="${U.view===k}"${k==='cos'&&!U.sel?' disabled':''}>${l}</button>`).join('')}</div>
    <div class="mmgrid">${uvFilters()}<div class="mmmain"><div class="grid">${U.view==='cos'?uvCosHTML():uvSecHTML()}</div></div></div></div>`;}
/* Branchement dans la fenêtre de mapping : classe « Actions » → mapping par secteur, sauf l'onglet des titres analysés */
if(typeof mmHTML==='function'){const _mm=mmHTML;mmHTML=function(){const M=mmS(),U=uvS();if(M.cls!=='stk'||U.view==='quad'){const h=_mm.apply(this,arguments);return M.cls==='stk'?h.replace('<div class="mmgrid">',`<div class="seg uvtabs" role="tablist">${[['sec','Mapping par secteur'],['cos','Sociétés'],['quad','Titres analysés (fondamentaux)']].map(([k,l])=>`<button role="tab" data-act="uvview" data-id="${k}" aria-selected="${U.view===k}"${k==='cos'&&!U.sel?' disabled':''}>${l}</button>`).join('')}</div><div class="mmgrid">`):h;}return uvHTML();};}
async function uvOpenCo(sym){const cov=Object.keys(S.an.assets).find(k=>{const r=uvFind(k);return r&&r[0]===sym;});ui.anmOpen=false;
  if(cov){ui.tk=cov;ui.anX=null;ui.tab='an';save();renderAll();renderAnMap();toast(`Analyse financière de ${S.an.assets[cov].n}`);return;}
  renderAnMap();const r=UNIV.rows.find(x=>x[0]===sym);toast(`${r?r[1]:sym} : Claude recherche les comptes publiés…`);await uxCreate(sym);}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,U=uvS();
  if(a==='uvsec'){U.sel=b.dataset.id;U.view='cos';U.page=0;U.q='';save();renderAnMap();}
  else if(a==='uvback'){U.view='sec';save();renderAnMap();}
  else if(a==='uvview'){U.view=b.dataset.id;save();renderAnMap();}
  else if(a==='uvsecf'){U.sec=b.dataset.id;save();renderAnMap();}
  else if(a==='uvpre')uvPrefetch();
  else if(a==='uvpg'){U.page=+b.dataset.id;renderAnMap();}
  else if(a==='uvco')uvOpenCo(b.dataset.id);});
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.uv)return;const U=uvS(),k=t.dataset.uv;
  if(k==='cap'){const v=+t.value;U.caps=t.checked?[...new Set(U.caps.concat(v))]:U.caps.filter(x=>x!==v);}else if(k!=='q')U[k]=t.value;U.page=0;save();renderAnMap();});
let uvT=null;document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||t.dataset.uv!=='q')return;clearTimeout(uvT);uvT=setTimeout(()=>{const U=uvS();U.q=t.value;U.page=0;renderAnMap();const i=document.querySelector('input[data-uv="q"]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},250);});
document.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const r=e.target.closest&&e.target.closest('tr.uvr');if(r)r.click();});

/* Préchargement explicite : comptes complets des 10 premières sociétés affichées, sans IA, mis en cache pour une ouverture instantanée */
async function uvPrefetch(){if(typeof AI!=='object'||!AI.mcp){toast("Préchargement : ouvrez OVERRIDE.DESK dans l'application Claude (navigateur intégré)");return;}
  const L=[...document.querySelectorAll('#anmap tr.uvr[data-act=uvco]')].map(r=>r.dataset.id).filter(t=>!ficheGet(t)).slice(0,10);if(!L.length){toast('Les sociétés affichées ont déjà leur fiche');return;}
  let ok=0;for(const t of L){toast(`Préchargement ${ok+1}/${L.length} : ${t}`);try{await ficheFetch(t);ok++;renderAnMap();}catch(e){}}toast(`${ok} fiche(s) complète(s) mise(s) en cache sur ${L.length}`);}
