/* ============ v8.39 ============
   1. Mapping des sociétés d'une industrie : nuage de points en direct (multiples et performance lus sur TradingView par le serveur,
      jusqu'à 100 sociétés, les plus grandes capitalisations de l'industrie après filtres). Un clic ouvre l'analyse.
   2. Commodities : vue « Tout » ouverte par défaut (une fois, même si une autre vue avait été choisie) ;
      Brent / WTI sans taux directeurs, CPI, PPI ni Fed (données réservées à la vue Or / Argent). */

/* ---- 2. Commodities ---- */
try{if(!S.v839cm){ui.cmT='all';S.v839cm=new Date().toISOString();save();}}catch(e){}
{const _d=decTableHTML;decTableHTML=function(a){const h=_d.apply(this,arguments);if(a!=='brent')return h;
  const box=document.createElement('div');box.innerHTML=h;let n=0;
  box.querySelectorAll('tbody tr').forEach(tr=>{if(/^(CPI|PPI|Fed Funds)/.test((tr.cells[0]||{}).textContent||'')){tr.remove();n++;}});
  if(n){const rows=[...box.querySelectorAll('tbody tr')],up=rows.filter(r=>r.cells[3]&&r.cells[3].classList.contains('cf-up')).length,dn=rows.filter(r=>r.cells[3]&&r.cells[3].classList.contains('cf-dn')).length,
      b=up>dn+1?['ok','ACHAT']:dn>up+1?['ko','VENTE']:['am','NEUTRE'],m=box.querySelector('h2 .meta'),t=box.querySelector('h2 .tag');
    if(m)m.textContent=`${rows.length} indicateurs · ${up} pour l'achat, ${dn} pour la vente`;if(t){t.className='tag '+b[0];t.textContent='Biais : '+b[1];}}
  return box.innerHTML;};}

/* ---- 1. Mapping des sociétés d'une industrie ---- */
const UVQ={};   // cache par industrie et filtres : {at, pts, err}
const UVQ_X={per:['PER',1,'×'],evE:['VE / EBITDA',1,'×'],pb:['Cours / actif net',1,'×']},UVQ_Y={p1y:['Performance 1 an',0,'%'],p5y:['Performance 5 ans',0,'%']};
function uvqKey(){const U=uvS();return[U.sel,U.cty,U.mkt,(U.caps||[]).join('')].join('|');}
function uvqRows(){const U=uvS(),g=uvItems([]).find(x=>x.key===U.sel);if(!g)return[];const ids=new Set(g.ids);
  return uvRows().filter(r=>ids.has(r[2])&&/^[A-Za-z0-9.\-]{1,16}$/.test(r[0])).sort((a,b)=>a[5]-b[5]).slice(0,100);}
function uvqHTML(){const U=uvS(),k=uvqKey(),Q=UVQ[k],xk=UVQ_X[ui.uvqX]?ui.uvqX:'per',yk=UVQ_Y[ui.uvqY]?ui.uvqY:'p1y',[xl,inv,xu]=UVQ_X[xk],[yl,,yu]=UVQ_Y[yk];
  const sel=`<span class="row noprint" style="gap:6px"><select class="f" data-uvq="x" style="width:auto">${Object.entries(UVQ_X).map(([v,[l]])=>`<option value="${v}"${v===xk?' selected':''}>${l}</option>`).join('')}</select>
    <select class="f" data-uvq="y" style="width:auto">${Object.entries(UVQ_Y).map(([v,[l]])=>`<option value="${v}"${v===yk?' selected':''}>${l}</option>`).join('')}</select></span>`;
  let body;
  if(!Q||Q.busy)body='<p class="note">Lecture des multiples et performances des sociétés de l\'industrie (TradingView)…</p>';
  else if(Q.err)body=`<p class="note" style="color:var(--down)">Données de marché indisponibles : ${esc(Q.err)}</p>`;
  else{const P=Q.pts.filter(p=>isFinite(p[xk])&&p[xk]>0&&p[xk]<200&&isFinite(p[yk])),tx=mmMed(P.map(p=>p[xk])),ty=mmMed(P.map(p=>p[yk]));
    const pts=P.map(p=>({x:p[xk],y:p[yk],id:p.sym,label:p.n.length>22?p.n.slice(0,21)+'…':p.n,aria:`${p.n} (${p.sym}) : ${xl} ${nf(p[xk],1)}${xu}, ${yl} ${nf(p[yk],1)} %${isFinite(p.cap)?', capitalisation '+nf(p.cap/1e9,1)+' Md':''}`,
      r:3+clamp(Math.log10(Math.max(1,(p.cap||0)/1e8))*1.4,0,7),cls:(p[xk]<=tx&&p[yk]>=ty?'ok':p[yk]>=ty?'am':p[xk]<=tx?'':'ko')}));
    body=pts.length?mmScatter(pts,{title:'Mapping des sociétés de l\'industrie',xl:`${xl} (inversé : moins cher à droite) · ${xu}`,yl:`${yl} · ${yu}`,inv:true,tx,ty,sparse:pts.length>18}).replace(/data-act="mmpt"/g,'data-act="uvco"')
      +`<p class="note">${pts.length} sociétés placées sur ${Q.pts.length} lues (${Q.asked} demandées, les plus grandes capitalisations après filtres) ; hors graphique : multiple négatif ou non publié. Seuils : médianes (${xl} ${nf(tx,1)}${xu}, ${yl} ${nf(ty,1)} %). Taille du point : capitalisation. Source : <a href="https://www.tradingview.com/" target="_blank" rel="noopener">TradingView</a> (lu le ${new Date(Q.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}). Un clic ouvre l'analyse financière.</p>`
      :'<p class="note">Aucune société de l\'industrie avec ce multiple publié : changez l\'axe horizontal.</p>';}
  return`<div class="card s12" id="uvq"><h2><span>Mapping des sociétés de l'industrie <span class="meta">${esc((uvItems([]).find(x=>x.key===U.sel)||{}).lab||'')} · cotées</span></span>${sel}</h2><div class="mmwrap">${body}</div></div>`;}
async function uvqLoad(){const k=uvqKey();if(UVQ[k]&&(UVQ[k].busy||Date.now()-UVQ[k].at<15*60e3))return;const rows=uvqRows();if(!rows.length)return;
  UVQ[k]={busy:true,at:Date.now(),pts:[],asked:rows.length};
  try{const r=await fetch('/api/v1/mapping?stk='+encodeURIComponent(rows.map(x=>x[0]).join(',')));if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json(),M=j.stk||{};
    if(!Object.keys(M).length&&j.err&&j.err.stk)throw new Error(j.err.stk);
    UVQ[k]={at:Date.now(),asked:rows.length,pts:rows.filter(x=>M[x[0]]).map(x=>{const m=M[x[0]];return{sym:x[0],n:x[1],per:m.per,evE:m.evE,pb:m.pb,p1y:m.p1y,p5y:m.p5y,cap:m.cap};})};}
  catch(e){UVQ[k]={at:Date.now()-14*60e3,asked:rows.length,pts:[],err:String(e.message||e)};}
  if(ui.tab==='sc'||ui.tab==='an')uvqMount();}
function uvqMount(){const U=uvS();if(U.view!=='cos'||!U.sel)return;const box=[...document.querySelectorAll('#p-sc .card, #p-an .card')].find(c=>/^← Industries/.test(((c.querySelector('h2')||{}).textContent||'').trim()));if(!box)return;
  const old=document.getElementById('uvq');if(old)old.remove();const w=box.querySelector('.mmwrap');
  if(w){if(/Aucune société de cette industrie/.test(w.textContent))w.style.display='none';w.insertAdjacentHTML('afterend',uvqHTML().replace('<div class="card s12" id="uvq">','<div id="uvq" style="margin-top:12px">'));}
  else box.insertAdjacentHTML('afterend',uvqHTML());uvqLoad();}
{const _ra=renderAll;renderAll=function(){const r=_ra.apply(this,arguments);try{if(ui.tab==='sc'||ui.tab==='an')uvqMount();}catch(e){console.error('uvq',e);}return r;};}
document.addEventListener('change',e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.uvq)return;if(t.dataset.uvq==='x')ui.uvqX=t.value;else ui.uvqY=t.value;renderAll();});
/* les clics du mapping de l'univers ne passent pas par renderAll : on remonte aussi le nuage après renderSC et renderAnMap */
if(typeof renderSC==='function'){const _rs=renderSC;renderSC=function(){const r=_rs.apply(this,arguments);try{uvqMount();}catch(e){console.error('uvq',e);}return r;};}
if(typeof renderAnMap==='function'){const _rm=renderAnMap;renderAnMap=function(){const r=_rm.apply(this,arguments);try{uvqMount();}catch(e){console.error('uvq',e);}return r;};}
