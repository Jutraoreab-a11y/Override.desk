/* ============ v8.9 : date et heure de mise à jour en tête de chaque volet, mapping des sociétés cotées visible dans Analyse financière ============ */
const MAJ_AN_PX='2026-11-12T17:30:00Z';   // cours des 11 titres recoupés Google Finance / TradingView, 12/11/2026 12 h 30 à New York (18 h 30 à Paris)
const majFmt=iso=>{const d=new Date(iso);return isNaN(d)?String(iso):d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})+' à '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});};
const majMax=a=>a.filter(Boolean).map(x=>new Date(x)).filter(d=>!isNaN(d)).sort((x,y)=>y-x)[0];
const majFr=s=>{const m=String(s||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:null;};
function majInfo(tab){const C=typeof CM_1112==='object'?CM_1112.meta:null,L=typeof LIVE_1112==='object'?LIVE_1112:null,ecb='BCE : EUR/USD '+nf(FX_EURUSD,4)+' du '+FX_DATE+' (fixing de 14 h 15)';
  if(tab==='cm')return[C&&C.at,`marchés : futurs ICE, NYMEX, COMEX et comptant or / argent en séance ; Brent daté et WTI Cushing EIA publiés jusqu'au ${C?fdate(C.fredLast):'—'} ; WASDE du ${fdate(MACRO.wasde.date)} ; ${ecb}`];
  if(tab==='an'){const t=majMax([MAJ_AN_PX,RS.last.an&&RS.last.an.at]);return[t,`cours des ${Object.keys(S.an.assets).length} titres recoupés (Google Finance et TradingView) ; comptes annuels publiés (MarketScreener, stockanalysis) ; mapping : ETF et cryptos à ${L?new Date(L.etfAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—'}`];}
  if(tab==='sc')return[L&&L.etfAt,`ETF Yahoo Finance et cryptos CoinGecko en séance ; zones et repères sectoriels Damodaran (janvier 2026)`];
  if(tab==='bp'){const p=typeof prjCur==='function'&&S.prj&&S.prj.bp.length?prjCur('bp'):null,v=p&&p.versions.find(x=>x.id===p.cur);return[majMax([S.bp.mktAI&&S.bp.mktAI.at,v&&v.date]),S.bp.mktAI?`étude de marché recherchée (${S.bp.mktAI.how==='claude'?'Claude':'API'}) ; saisie du dossier`:`saisie du dossier (version « ${v?esc(v.label):'—'} ») ; repères sectoriels Damodaran (janvier 2026) ; lancez la recherche pour sourcer le marché`];}
  if(tab==='lbo'){const d=typeof lboCur==='function'?lboCur():null,e=majFr(LBO_SRC.euribor.d);return[majMax([d&&d.rsAI&&d.rsAI.at,e&&e+'T10:00:00Z']),`Euribor 3 mois ${nf(LBO_SRC.euribor.v,3)} % (fixing EMMI du ${LBO_SRC.euribor.d}, 11 h) ; ${ecb}`];}
  if(tab==='pf')return[majMax([typeof FLUX==='object'&&FLUX.at,majFr(FX_DATE)&&majFr(FX_DATE)+'T15:00:00Z']),typeof FLUX==='object'&&FLUX.on?'flux courtiers synchronisés':'mode simulation : positions saisies, valorisées avec les derniers cours ; '+ecb];
  if(tab==='pc')return[majFr(FX_DATE)&&majFr(FX_DATE)+'T15:00:00Z',`${ecb} ; leviers maximaux ESMA (2018)`];
  if(tab==='jr'){const T=(S.jr&&S.jr.trades)||[],d=T.map(t=>t.d).filter(Boolean).sort().pop();return[d?d+'T'+(T.find(t=>t.d===d).t||'00:00')+':00':null,d?`${T.length} opérations ; dernière saisie ou synchronisation`:'aucune opération saisie'];}
  return null;}
function majBar(){const tab=ui.tab,P=document.getElementById('p-'+tab);if(!P)return;let el=P.querySelector(':scope>.majbar');const I=majInfo(tab);
  if(!I){if(el)el.remove();return;}if(!el){el=document.createElement('div');el.className='majbar noprint';P.insertBefore(el,P.firstChild);}
  el.innerHTML=`<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg><b>Mise à jour : ${I[0]?majFmt(I[0]):'aucune donnée datée'}</b><span class="meta">${I[1]}</span>`;}
/* Mapping des sociétés cotées, affiché directement dans Analyse financière (le mapping complet reste dans la fenêtre dédiée) */
function anMmCard(){const P=document.getElementById('p-an');if(!P||ui.tab!=='an'||ui.anX)return;let el=P.querySelector(':scope>.anmm');
  if(!el){el=document.createElement('div');el.className='card anmm noprint';const ref=P.querySelector(':scope>.rsbar')||P.querySelector(':scope>.majbar');ref?ref.after(el):P.insertBefore(el,P.firstChild);}
  let Q;try{Q=mmQuad('stk');}catch(e){el.innerHTML='';return;}
  const out=Q.In.filter(r=>r.q==='out').map(r=>r.l),hot=Q.In.filter(r=>r.hot).map(r=>r.l),off=Q.rows.filter(r=>!Q.In.includes(r)&&mmPass(r,'stk')[0]);
  const svg=mmScatter(Q.pts,{title:'Mapping des sociétés cotées',xl:Q.xl+(Q.inv?' (inversé : plus faible à droite)':'')+' · '+Q.xu,yl:Q.yl+' · '+Q.yu,inv:Q.inv,tx:Q.tx,ty:Q.ty}).replace(/data-act="mmpt"/g,'data-act="mmpt" data-cls="stk"');
  el.innerHTML=`<h2><span>Mapping des sociétés cotées <span class="meta">${esc(Q.yl)} × ${esc(Q.xl)} · ${Q.In.length} titres · cliquez un point pour ouvrir son analyse</span></span><button class="btn sm pri" data-act="anmopen">Mapping complet : filtres, ETF, cryptos, commodities</button></h2>
    <div class="anmm-g"><div class="mmwrap">${svg}</div><div class="anmm-s"><p><span class="dot ok"></span><b>Surperformeurs</b><br><span class="meta">${out.length?out.map(esc).join(', '):'aucun titre dans ce quadrant'}</span></p>
      <p><span class="dot am"></span><b>Alerte anti-FOMO</b><br><span class="meta">${hot.length?hot.map(esc).join(', ')+' : performance obtenue avec un multiple élevé':'aucun titre en zone de risque'}</span></p>
      ${off.length?`<p><span class="dot"></span><b>Hors quadrant</b><br><span class="meta">${off.map(r=>esc(r.l)+(!isFinite(r.m[Q.xk])?' : '+esc(Q.xl)+' non significatif (résultat négatif)':'')).join(' ; ')}</span></p>`:''}
      <p class="meta">Seuils : médianes de l'univers (${esc(Q.xl)} ${nf(Q.tx,1)}, ${esc(Q.yl)} ${nf(Q.ty,1)}).</p></div></div>`;}
/* Aucune case vide : un tiret ou une cellule vide devient un libellé explicite */
function majFill(){const P=document.getElementById('p-'+ui.tab);if(!P)return;
  P.querySelectorAll('td, .card span, .card b, .card div, .kv span, .kv b').forEach(e=>{if(e.children.length||e.closest('.tv-lightweight-charts, svg, .rsbar, .majbar'))return;const t=e.textContent.trim();
    if(t==='n.d.'){e.textContent='non calculable';e.classList.add('meta');e.title='Donnée source absente ou négative : indicateur non calculable';return;}
    if(!(t==='—'||t==='–'||(t===''&&e.tagName==='TD'&&e.closest('tbody')&&e.parentElement.textContent.trim()!=='')))return;
    const tr=e.closest('tr'),lab=tr?(tr.cells[0]||{}).textContent||'':'',first=tr&&[...tr.cells].slice(1).find(c=>c.textContent.trim()!=='')===undefined;
    const isFirstNum=tr&&[...tr.cells].indexOf(e)===1;
    e.textContent=/croissance|variation|évolution/i.test(lab)&&isFirstNum?'base':/consensus/i.test(lab)?'non publié':'non renseigné';
    e.classList.add('meta');e.title=e.textContent==='base'?'Première année : pas d\'année précédente pour calculer une croissance':'Valeur à saisir au crayon ou à collecter : elle n\'est pas fournie par la source';});}
{const _r=renderAll;renderAll=function(){_r.apply(this,arguments);try{majBar();majFill();}catch(e){console.error('maj',e);}};}
if(typeof rsBar==='function'){const _b=rsBar;rsBar=function(){_b.apply(this,arguments);try{majBar();}catch(e){}};}
