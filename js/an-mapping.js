/* ============ Analyse financière : double mapping (secteur puis titre) ============ */
/* Mapping 1 : uniquement des secteurs (aucune société individuelle), attractivité × liquidité.
   Mapping 2 : les sociétés du secteur retenu, qualité × liquidité, pour repérer les anomalies et valider l'entrée.
   Les notes sectorielles sont calculées à partir des comptes publiés des titres couverts et des données Damodaran ;
   chacune peut être forcée au crayon. */
function anSectors(){const A=S.an.assets,by={};
  Object.keys(A).forEach(k=>{const s=anSub(k);(by[s.key]=by[s.key]||{key:s.key,l:s.l,damo:s.damo,note:s.note,tk:[]}).tk.push(k);});
  const TM=AN_DAMO['Total Market'];
  return Object.values(by).map(s=>{const B=s.tk.map(k=>anBase(A[k])),D=AN_DAMO[s.damo]||TM;
    const g=median(B.map(b=>b.revG[b.L])),m=median(B.map(b=>b.em[b.L])),cap=median(B.map(b=>b.capEUR));
    /* Attractivité (0-100) : croissance du CA 40 %, marge EBITDA 30 %, valorisation de l'industrie face au marché 30 % (moins cher = plus attractif) */
    const sG=clamp(50+g*2.5,0,100),sM=clamp(m*2,0,100),sV=clamp(50+(TM.eve/D.eve-1)*100,0,100),aAuto=Math.round(0.4*sG+0.3*sM+0.3*sV);
    /* Liquidité (0-100) : profondeur de l'industrie (nombre de sociétés cotées) 50 %, capitalisation médiane des titres couverts 50 % */
    const sN=clamp((Math.log10(D.n||1)-0.5)/2*100,0,100),sC=clamp((Math.log10((cap||1)/1e3)+0.5)/3*100,0,100),lAuto=Math.round(0.5*sN+0.5*sC);
    const o=(S.an.secMap||{})[s.key]||{},att=isFinite(+o.attr)&&o.attr!==''&&o.attr!==null?+o.attr:aAuto,liq=isFinite(+o.liq)&&o.liq!==''&&o.liq!==null?+o.liq:lAuto;
    return Object.assign(s,{g,m,cap,D,aAuto,lAuto,att,liq,ovA:att!==aAuto,ovL:liq!==lAuto,prio:att>=50&&liq>=50});});}
/* Exposition actuelle du portefeuille par sous-secteur (dilution du risque) */
function anExposure(){const L=typeof perfLines==='function'?perfLines():[],tot=sum(L.map(l=>l.val)),by={};
  L.forEach(l=>{const k=String(l.sym||'').toUpperCase().replace(/\.(PA|AS|DE|US)$/,''),s=S.an.assets[k]?anSub(k).key:'autre';by[s]=(by[s]||0)+l.val;});return{tot,by};}
function anMapHTML(){const id=ui.tk,A=S.an.assets,a=A[id];if(!a)return'';const R=anCalc(id),me=anSub(id),SEC=anSectors();
  if(!S.an.secMap)S.an.secMap={};if(S.an.secMax===undefined)S.an.secMax=25;
  const tgt=SEC.find(s=>s.key===(ui.anmSec||me.key))||SEC.find(s=>s.key===me.key);
  const SH={hw:'Matériel info',sw:'Logiciels',semi:'Semi-conducteurs',semieq:'Équip. semi',lux:'Luxe',beauty:'Cosmétiques',bev:'Boissons',aero:'Aéro & défense',oil:'Pétrole & gaz'};
  const m1=SEC.map(s=>({x:s.liq,y:s.att,label:SH[s.key]||s.l,id:s.key,act:'anmsec',r:4+clamp(Math.log10(s.cap||1)-3,0,5),cls:(s.prio?'ok':'ko')+(s.key===tgt.key?' sel':'')}));
  const wide=ui.anmWide||(tgt.tk.length<2),members=wide?Object.keys(A).filter(k=>A[k].sec===A[tgt.tk[0]].sec):tgt.tk;
  const mk=k=>{const r=k===id?R:anCalc(k),b=anBase(A[k]),liq=(r.filt.find(f=>f[0]==='Liquidité')||[0,0])[1]*10,rel=isFinite(b.evE)&&isFinite(r.medEvE)?b.evE/r.medEvE-1:NaN;
    const flag=isFinite(rel)&&rel<-0.2&&r.score>=60?'gem':(isFinite(rel)&&rel>0.3)||r.score<40?'end':'';
    return{k,r,b,liq,rel,flag,p:{x:liq,y:r.score,label:A[k].t+(flag==='gem'?' (décote)':flag==='end'?' (surcote ou fragile)':''),id:k,act:'anmtk',sq:k===id,r:4+clamp(Math.log10((b.capEUR||1)/1e3),0,5),cls:(flag||(r.positive?'ok':'ko'))+(k===id?' sel':'')}};};
  const pts=members.map(mk),mine=pts.find(x=>x.k===id)||mk(id),E=anExposure(),cur=E.tot?(E.by[me.key]||0)/E.tot*100:0,max=+S.an.secMax||25;
  const meSec=SEC.find(s=>s.key===me.key);
  const chk=[['Secteur dans le quadrant prioritaire (mapping 1)',meSec.prio,`${esc(meSec.l)} : attractivité ${nf(meSec.att,0)}/100, liquidité ${nf(meSec.liq,0)}/100`],
    ['Titre dans le quadrant des cibles (mapping 2)',mine.p.x>=50&&mine.p.y>=50,`qualité ${R.score}/100, liquidité ${nf(mine.p.x,0)}/100`],
    ['Valorisation face aux comparables',!(isFinite(mine.rel)&&mine.rel>0.3),isFinite(mine.rel)?`VE/EBITDA ${sgn(mine.rel*100,0)} vs référence des comparables`:'VE/EBITDA non significatif'],
    ['Dilution du risque sectoriel',cur<max,`exposition actuelle du portefeuille au secteur : ${pct(cur,1)} pour un plafond de ${pct(max,0)}`],
    ['Tamis de l\'analyse',R.fPass===4,`${R.fPass}/4 filtres franchis`]];
  const okN=chk.filter(c=>c[1]).length,val=okN===chk.length&&R.positive?['ok','Entrée validée']:R.positive?['am','Décision positive, entrée à revoir']:['ko','Décision négative'];
  return`<div class="ai-box anm" role="dialog" aria-label="Mapping sectoriel et du titre"><div class="ai-h"><b>Mapping sectoriel & stock · ${esc(a.n)} (${esc(a.t)})</b><span class="tag ${val[0]}" style="margin:0 auto 0 14px">${val[1]}</span><button class="btn sm" data-act="anmclose">Fermer</button></div>
    <div class="grid">
      <div class="card s6" style="min-width:0"><h2><span>Mapping 1 : le marché <span class="meta">secteurs uniquement</span></span></h2>
        ${scatter(m1,{dom:{x:[Math.min(40,Math.floor(Math.min(...m1.map(p=>p.x))/10)*10-10),100],y:[Math.min(30,Math.floor(Math.min(...m1.map(p=>p.y))/10)*10-10),Math.max(80,Math.ceil(Math.max(...m1.map(p=>p.y))/10)*10+10)]},title:'Mapping des secteurs',xl:'Liquidité du secteur',yl:'Attractivité du secteur',q:['Pari illiquide','Secteurs prioritaires','À écarter','Liquide, peu attractif']})}
        <p class="note">Axes resserrés sur la zone occupée ; les quadrants restent centrés sur 50. Aucune société sur ce mapping : on choisit d'abord le terrain. Cliquer un secteur l'ouvre dans le mapping 2. Taille du point : capitalisation médiane des titres couverts.</p></div>
      <div class="card s6" style="min-width:0"><h2><span>Mapping 2 : ${esc(tgt.l)} <span class="meta">${wide?'secteur élargi : '+esc(A[tgt.tk[0]].sec):'sous-secteur'}</span></span>
        ${tgt.tk.length>=2?`<button class="chip" data-act="anmwide" aria-pressed="${!!ui.anmWide}">Secteur élargi</button>`:''}</h2>
        ${scatter(pts.map(x=>x.p),{title:'Mapping des sociétés du secteur',xl:'Liquidité du titre',yl:'Qualité (score de l\'analyse)',q:['Pari illiquide','Cibles prioritaires','À écarter','Liquide, peu attractif']})}
        <div class="legend"><span><i style="background:var(--up)"></i>Décision positive</span><span><i style="background:var(--down)"></i>Décision négative</span><span><i style="background:none;border:2px solid var(--hi);border-radius:1px"></i>Titre analysé</span></div>
        <p class="note">${wide&&tgt.tk.length<2?'Moins de deux sociétés couvertes dans ce sous-secteur : affichage du secteur élargi. ':''}Anomalies : « décote » si le VE/EBITDA est inférieur de plus de 20 % à la référence des comparables avec une qualité d'au moins 60 ; « surcote ou fragile » au-delà de +30 % ou sous 40 de qualité. Cliquer une société ouvre son analyse.</p></div>
      <div class="card s7" style="min-width:0"><h2>Validation de l'entrée sur ${esc(a.t)}</h2><div class="dec" style="grid-template-columns:1fr">${chk.map(c=>`<div class="dc"><span class="dot ${c[1]?'ok':'ko'}"></span><div><b>${c[0]}</b><span>${c[2]}</span></div></div>`).join('')}</div>
        <p class="note">Décision de l'analyse : <b class="${R.positive?'up':'down'}">${R.positive?'positive (🟢)':'négative (🔴)'}</b>. L'entrée n'est validée que si les cinq contrôles sont verts et la décision positive. Plafond d'exposition par secteur : ${fld('an.secMax','n',{al:'Plafond par secteur (%)'})} % du portefeuille.</p></div>
      <div class="card s5" style="min-width:0"><h2>Notes sectorielles <span class="meta">crayon pour forcer</span></h2><div class="tw"><table class="tbl"><thead><tr><th>Secteur</th><th class="n">Attract.</th><th class="n">Liquid.</th><th class="n">Expo.</th></tr></thead><tbody>
        ${SEC.sort((x,y)=>y.att-x.att).map(s=>{S.an.secMap[s.key]=S.an.secMap[s.key]||{};const ex=E.tot?(E.by[s.key]||0)/E.tot*100:0;return`<tr${s.key===me.key?' class="hl"':''}><td>${esc(s.l)}<div class="meta">${s.tk.join(', ')} · ${esc(s.damo)}</div></td><td class="n">${penV('an.secMap.'+s.key+'.attr',nf(s.att,0),{t:'nn',al:'Attractivité '+s.l+' (vide = calcul)'})}</td><td class="n">${penV('an.secMap.'+s.key+'.liq',nf(s.liq,0),{t:'nn',al:'Liquidité '+s.l+' (vide = calcul)'})}</td><td class="n ${ex>=max?'down':''}">${pct(ex,0)}</td></tr>`;}).join('')}</tbody></table></div>
        <p class="note">Attractivité : croissance du CA médiane (40 %), marge EBITDA médiane (30 %) des titres couverts, et VE/EBITDA de l'industrie face au marché total (30 %, Damodaran janvier 2026). Liquidité : nombre de sociétés cotées de l'industrie (50 %) et capitalisation médiane des titres couverts (50 %). Notes à affiner avec la couverture : un secteur couvert par un seul titre reste une estimation.</p></div>
    </div></div>`;}
function renderAnMap(){const el=document.getElementById('anmap');if(!el)return;if(!ui.anmOpen||ui.tab!=='an'){el.hidden=true;return;}el.hidden=false;el.innerHTML=anMapHTML();}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='anmopen'){ui.anmOpen=true;ui.anmSec=null;renderAnMap();}
  else if(a==='anmclose'){ui.anmOpen=false;renderAnMap();}
  else if(a==='anmsec'){ui.anmSec=b.dataset.id;ui.anmWide=false;renderAnMap();}
  else if(a==='anmwide'){ui.anmWide=!ui.anmWide;renderAnMap();}
  else if(a==='anmtk'){ui.tk=b.dataset.id;ui.anmSec=anSub(ui.tk).key;save();renderAll();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.anmOpen){ui.anmOpen=false;renderAnMap();}});
if(typeof renderAll==='function'){const _r=renderAll;renderAll=function(){_r.apply(this,arguments);renderAnMap();};}
