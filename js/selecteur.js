/* ============ Volet 3 : Sélecteur & double mapping ============ */
function attr(c){const w=S.sc.w,sw=w.cat+w.conc+w.tam+w.team+w.bm||1;return(c.cat*w.cat+c.conc*w.conc+c.tam*w.tam+c.team*w.team+c.bm*w.bm)/sw*10;}
const FKEYS=['liq','cat','conc','tam'];
const passes=c=>FKEYS.every(k=>c[k]>=S.sc.min);
/* Zone géographique du mapping 1 : monde, continent, UE ou pays */
function geoMembers(key){if(key==='EU27')return GEO.filter(c=>c[6]);if(key.startsWith('C:'))return GEO.filter(c=>c[1]===key.slice(2));if(key.startsWith('K:'))return GEO.filter(c=>c[0]===key.slice(2));return GEO;}
function geoAgg(key){key=key||'W';const M=geoMembers(key),gdp=key==='W'?GEO_WORLD.gdp:sum(M.map(c=>c[2]));
  const gw=M.filter(c=>c[4]!==null),g=key==='W'?GEO_WORLD.g:sum(gw.map(c=>c[2]*c[4]))/sum(gw.map(c=>c[2])),depth=sum(M.map(c=>c[2]*GEO_DEPTH[c[5]]))/sum(M.map(c=>c[2]));
  const lab=key==='W'?'Monde':key==='EU27'?'Union européenne (27)':key.startsWith('C:')?GEO_CONT[key.slice(2)]:key.slice(2);
  return{key,lab,n:M.length,gdp,share:gdp/GEO_WORLD.gdp,g,depth,cls:M.length===1?M[0][5]:null,yr:M.length===1?M[0][3]:null};}
let GEO_W=null;
function secInGeo(k,G){const s=SECT[k],p=S.sc.sectors[k]||{cat:5,liq:5};GEO_W=GEO_W||geoAgg('W');
  const tam=s.tam*G.share,cagr=Math.max(-5,s.cagr+(G.g-GEO_WORLD.g)),liq=clamp((+p.liq)*G.depth/GEO_W.depth,0,10);
  const tamS=clamp((Math.log10(Math.max(tam,1)/1e6)-2)*2.2,0,10);
  return{tam,cagr,liq,cat:+p.cat,attr:10*(0.4*clamp(cagr/2,0,10)+0.35*(+p.cat)+0.25*tamS)};}
function secAttr(k){return secInGeo(k,geoAgg(ui.geo)).attr;}
function geoSelect(){const v=ui.geo||'W',o=(k,l)=>`<option value="${esc(k)}"${k===v?' selected':''}>${esc(l)}</option>`;
  let h=`<select class="f noprint" style="width:auto;max-width:230px;height:28px" data-ui="geo" aria-label="Zone géographique du mapping">${o('W','Monde')}<optgroup label="Continents et régions">${Object.entries(GEO_CONT).map(([k,l])=>o('C:'+k,l)).join('')}${o('EU27','Union européenne (27)')}</optgroup>`;
  Object.entries(GEO_CONT).forEach(([k,l])=>{h+=`<optgroup label="${esc(l)}">${GEO.filter(c=>c[1]===k).map(c=>c[0]).sort((a,b)=>a.localeCompare(b,'fr')).map(n=>o('K:'+n,n)).join('')}</optgroup>`;});
  return h+'</select>';}
function coFlags(c){const prem=c.pre/(c.arr*c.mult)-1,a=attr(c);
  return{prem,a,gem:!c.lead&&a>=65&&prem<=0,end:!c.lead&&(a<55||(prem>0.3&&c.gr<40))};}
function scPer(){const P=S.sc.per||(S.sc.per=clone(DEF.sc.per)),mo=P.mode;
  const inP=c=>{if(c.lead||mo==='all')return true;const d=String(c.dt||'');if(!d)return false;
    if(mo==='month')return d.slice(0,7)===P.m;if(mo==='year')return d.slice(0,4)===String(P.y);return(!P.from||d>=P.from)&&(!P.to||d<=P.to);};
  const ml=m=>{const[y,mm]=String(m).split('-');return y&&mm?MONTHS[+mm-1]+' '+y:'—';};
  const lab=mo==='all'?'toutes les dates':mo==='month'?ml(P.m):mo==='year'?'année '+P.y:`du ${fdate(P.from)} au ${fdate(P.to)}`;
  return{P,inP,lab};}
function perBar(){const{P,lab}=scPer(),L=S.sc.list.filter(c=>!c.lead),n=L.filter(scPer().inP).length,yrs=[...new Set(L.map(c=>String(c.dt||'').slice(0,4)).filter(Boolean).concat([String(new Date().getFullYear())]))].sort().reverse();
  return`<div class="card s12 noprint"><div class="row" style="gap:12px;flex-wrap:wrap;align-items:center"><span class="lb" style="margin:0">Période d'analyse</span>
    ${lin('sc.per.mode','s',{opts:{all:'Toutes les dates',month:'Un mois précis',year:'Une année complète',custom:'Période personnalisée'},style:'width:auto',al:'Type de période'})}
    ${P.mode==='month'?lin('sc.per.m','m',{style:'width:170px',al:'Mois'}):''}
    ${P.mode==='year'?lin('sc.per.y','s',{opts:Object.fromEntries(yrs.map(y=>[y,y])),style:'width:auto',al:'Année'}):''}
    ${P.mode==='custom'?`<span class="meta">du</span>${lin('sc.per.from','d',{style:'width:160px',al:'Début'})}<span class="meta">au</span>${lin('sc.per.to','d',{style:'width:160px',al:'Fin'})}`:''}
    <span class="meta" style="margin-left:auto">${n} dossier${n>1?'s':''} sur ${L.length} datés ${esc(lab)} · le filtre s'applique au tamis, au Mapping 2 et au tableau ; le Mapping 1 repose sur les données sectorielles FMI 2026 et Damodaran janvier 2026</span></div></div>`;}
function renderSC(){
  const L=S.sc.list,E=ui.edit,min=S.sc.min,PER=scPer(),D=L.filter(c=>!c.lead&&PER.inP(c));
  if(!SECT[ui.secTarget])ui.secTarget='energy';
  if(!L.find(c=>c.id===ui.sel)&&D.length)ui.sel=D[0].id;
  const secKeys=Object.keys(SECT);
  /* Tamis : passage successif des filtres */
  let cur=D;const steps=[['Dossiers',D.length,'']];
  FKEYS.forEach((k,i)=>{cur=cur.filter(c=>c[k]>=min);steps.push([FQ[i][0],cur.length,FQ[i][1]]);});
  const G=geoAgg(ui.geo),SG=Object.fromEntries(secKeys.map(k=>[k,secInGeo(k,G)]));
  const m1=secKeys.map(k=>{const q=SG[k];return{x:q.liq*10,y:q.attr,label:SECT[k].l,id:k,act:'pickSec',r:3+clamp((Math.log10(q.tam/1e6)-2)*1.6,0,8),cls:(q.attr>=50&&q.liq>=5?'ok':'ko')+(k===ui.secTarget?' sel':'')};});
  const inSec=L.filter(c=>c.sec===ui.secTarget&&PER.inP(c));
  const m2=inSec.map(c=>{const f=coFlags(c);return{x:c.liq*10,y:f.a,label:c.n+(c.lead?'':f.gem?' (pépite)':f.end?' (fin de course)':''),id:c.id,r:3+clamp(Math.log10((+c.arr||0)+1)*2.2,0,7),sq:!!c.lead,cls:(c.lead?'lead':f.gem?'gem':f.end?'end':passes(c)?'ok':'ko')+(c.id===ui.sel?' sel':'')};});
  const q2=['Pari illiquide','Cibles prioritaires','À écarter','Liquide, peu attractif'];
  const ci=L.findIndex(c=>c.id===ui.sel),c=L[ci],P=k=>`sc.list.${ci}.${k}`;
  const rows=[...D].sort((x,y)=>attr(y)-attr(x));
  const secLead=inSec.find(x=>x.lead);
  let detail='';
  if(c){const f=coFlags(c),implied=c.arr*c.mult,ok=passes(c),cl=L.find(x=>x.lead&&x.sec===c.sec),mult=c.tgt&&c.pre?c.tgt/c.pre:NaN;
    const tile=(i,k,txt)=>`<div class="tm ${c[k]>=min?'ok':'ko'}"><div class="tm-h"><b>${FQ[i][0]}</b><span class="num">${fld(P(k),'n',{al:FQ[i][0]})}<span class="meta"> /10</span></span></div><div class="meter${c[k]<min?' lo':''}"><b style="width:${clamp(c[k],0,10)*10}%"></b></div><p class="tm-q">${FQ[i][1]}</p>${fld(P(txt),'a',{rows:2,al:FQ[i][0]})}</div>`;
    detail=`<div class="card s12"><h2><span>${esc(c.n)} <span class="meta">${esc((SECT[c.sec]||{}).l||c.sec)}${c.fromBP?', issu du business plan':''}</span></span><span class="tag ${c.lead?'':ok?'ok':'ko'}">${c.lead?'Leader de référence':ok?'Retenu par le tamis':'Écarté par le tamis'}</span></h2>
      ${E?`<div class="fields" style="max-width:520px;margin-bottom:10px">${F('Nom',P('n'),'t')}${F('Date du dossier',P('dt'),'t',{ph:'AAAA-MM-JJ'})}${F('Secteur',P('sec'),'s',{opts:Object.fromEntries(secKeys.map(k=>[k,SECT[k].l]))})}</div>`:''}
      <h3 class="h3">I. Tamis d'entrée</h3>
      <div class="tamis four">${tile(0,'liq','liqTxt')}${tile(1,'cat','catTxt')}${tile(2,'conc','faille')}${tile(3,'tam','tamTxt')}</div>
      <h3 class="h3">III. Grille d'analyse fondamentale et equity story</h3>
      <div class="dd">
        <div><h3>1. Positionnement concurrentiel</h3><div class="lb">Leader du secteur</div><p class="v txt">${esc(cl?cl.n:'—')}</p><div class="lb" style="margin-top:6px">Forces du leader</div>${fld(P('leader'),'a',{rows:1})}<div class="lb" style="margin-top:6px">Avantage injuste (edge)</div>${fld(P('pos'),'a',{rows:2})}</div>
        <div><h3>2. Modèle économique <span class="meta">note ${fld(P('bm'))}/10</span></h3>${fld(P('bmTxt'),'a',{rows:2})}
          <div class="fields" style="margin-top:8px">${F('Croissance du CA',P('gr'),'n',{u:'%/an'})}${F('Marge EBITDA',P('ebm'),'n',{u:'%'})}${F('Besoin de financement',P('need'),'n',{u:'M€'})}${F('Financement',P('fund'),'s',{opts:{'Autofinancé':'Autofinancé','Capital-risque':'Capital-risque','Mixte':'Mixte','Coté':'Coté'}})}</div>
          <p class="note">${c.ebm>=0?'Rentable':'Non rentable'} ; ${c.fund==='Autofinancé'?'pas de dépendance au capital-risque':c.need>0?`dépend d'une levée de ${nf(+c.need,1)} M€`:'financement en place'}.</p></div>
        <div><h3>3. Équipe <span class="meta">note ${fld(P('team'))}/10</span></h3>${fld(P('teamTxt'),'a',{rows:3})}
          <div class="fields" style="margin-top:8px">${F('Fondateurs ayant déjà créé une société',P('serial'),'s',{opts:{'1':'Oui','0':'Non'}})}</div></div>
        <div><h3>4. Equity story</h3>${fld(P('equity'),'a',{rows:2})}
          <div class="fields" style="margin-top:8px">${F('Valorisation cible à 5 ans',P('tgt'),'n',{u:'M€'})}</div>
          <div class="stats" style="margin-top:8px;grid-template-columns:1fr 1fr"><div class="stat"><div class="k">Multiple visé</div><div class="x">${isFinite(mult)?'×'+nf(mult,1):'—'}</div><div class="d">vs dernière valorisation</div></div><div class="stat"><div class="k">Lecture</div><div class="x" style="font-size:14px">${!isFinite(mult)?'—':mult>=10?'×10 visé':mult>=5?'×5 visé':'Inférieur à ×5'}</div><div class="d">${!isFinite(mult)?'':mult>=5?'à étayer par le plan':'profil de rendement limité'}</div></div></div></div>
        <div><h3>5. Syndicat d'investisseurs</h3>${fld(P('syndic'),'a',{rows:2})}<div class="fields" style="margin-top:8px">${F('Qualité du syndicat',P('tier'),'t')}</div></div>
        <div><h3>6. Valorisation</h3><div class="fields">${F('CA récurrent (ARR)',P('arr'),'n',{u:'M€'})}${F('Multiple VE/CA du secteur',P('mult'),'n',{u:'×'})}${F('Dernière levée (pre-money)',P('pre'),'n',{u:'M€'})}</div>
          <div class="stats" style="margin-top:8px;grid-template-columns:1fr 1fr"><div class="stat"><div class="k">Valeur par comparables</div><div class="x">${nf(implied,1)} M€</div><div class="d">VE/CA ${nf(c.pre/c.arr,1)}× vs ${nf(+c.mult,1)}× secteur</div></div><div class="stat"><div class="k">Dernière levée vs secteur</div><div class="x ${f.prem>0?'down':''}">${sgn(f.prem*100,0)}</div><div class="d">${f.prem>0.25?'Surcote : négocier':f.prem<0?'Décote de sécurité':'Dans la norme'}</div></div></div>
          ${c.ebm>0?`<p class="note">VE/EBITDA implicite : ${nf(c.pre/(c.arr*c.ebm/100),1)}×.</p>`:''}</div>
      </div></div>`;}
  $('#p-sc').innerHTML=`
  <div class="grid">
    ${perBar()}
    <div class="card s12"><h2><span>I. Tamis d'entrée <span class="meta">chaque dossier doit franchir les 4 filtres, note minimale ${fld('sc.min')}/10</span></span><span class="meta">${steps[4][1]} retenu${steps[4][1]>1?'s':''} sur ${D.length}</span></h2>
      <div class="funnel5">${steps.map((s,i)=>`<div class="fs"><div class="fs-n">${s[1]}</div><div class="fs-b"><b style="width:${D.length?s[1]/D.length*100:0}%"></b></div><div class="fs-l">${i?`Filtre ${i} : ${s[0]}`:'Dossiers étudiés'}</div>${i?`<p class="tm-q">${s[2]}</p>`:''}</div>`).join('')}</div></div>
    <div class="card s6"><h2><span>II. Mapping 1 : marché global <span class="meta">secteurs, ${esc(G.lab)}</span></span>${geoSelect()}</h2>
      ${scatter(m1,{title:'Mapping des secteurs : '+G.lab,xl:'Liquidité du secteur dans la zone',yl:'Attractivité macro (CAGR, catalyseur, taille)',q:['Pari illiquide','Secteurs prioritaires','À écarter','Liquide, peu attractif']})}
      <div class="legend"><span>Taille du point : TAM dans la zone</span><span><i style="background:none;border:2px solid var(--hi)"></i>Secteur cible (cliquer un point)</span></div>
      <div class="geo">
        <div><span>PIB ${G.yr?G.yr:'2026'}</span><b>${nf(G.gdp/1e3,G.gdp>=1e5?0:1)} Md$</b></div>
        <div><span>Part du PIB mondial</span><b>${pct(G.share*100,G.share<.01?2:1)}</b></div>
        <div><span>Croissance 2026</span><b class="${G.g<0?'down':''}">${pct(G.g,1)}</b><small>monde ${pct(GEO_WORLD.g,1)}</small></div>
        <div><span>Profondeur de marché</span><b>${G.cls?GEO_DLAB[G.cls]:nf(G.depth*100,0)+' / 100'}</b><small>${G.n>1?G.n+' pays':''}</small></div>
      </div>
      <p class="note">Dans la zone : TAM = TAM mondial × part du PIB ; CAGR = CAGR sectoriel + écart de croissance de la zone avec le monde ; liquidité ajustée selon la profondeur du marché financier. Sources : ${GEO_SRC.map(x=>x[1]).join(' ; ')}.</p></div>
    <div class="card s6"><h2><span>Mapping 2 : secteur cible <span class="meta">entreprises du secteur</span></span>
      <select class="f noprint" style="width:auto;max-width:200px;height:28px" data-ui="secTarget" aria-label="Secteur cible">${secKeys.map(k=>`<option value="${k}"${k===ui.secTarget?' selected':''}>${esc(SECT[k].l)}</option>`).join('')}</select></h2>
      ${inSec.length?scatter(m2,{title:'Mapping du secteur cible',xl:'Liquidité',yl:'Attractivité',q:q2}):`<p class="note">Aucun dossier dans ce secteur. Ajoutez-en un ou envoyez votre business plan depuis le volet 1.</p>`}
      <div class="legend"><span><i style="background:#71717A;border-radius:1px"></i>Leader de référence</span><span><i style="background:var(--up)"></i>Pépite sous-évaluée</span><span><i style="background:var(--down)"></i>Fin de course</span><span><i style="background:#A1A1AA"></i>Autres</span></div>
      <p class="note">${secLead?`Leader : ${esc(secLead.n)}. `:''}Pépite : attractivité ≥ 65 et dernière levée sans surcote. Fin de course : attractivité < 55, ou surcote > 30 % avec une croissance < 40 %.</p></div>
    <div class="card s8"><h2>Dossiers <span class="meta">classés par attractivité</span></h2>
      <div class="tw"><table class="tbl"><thead><tr><th>Entreprise</th><th>Secteur</th>${['Liq.','Cat.','Conc.','Taille'].map((l,i)=>`<th class="n" title="${FQ[i][0]}">${l}</th>`).join('')}<th>Date</th><th class="n">Attract.</th><th class="n">Surcote</th><th>Tamis</th></tr></thead><tbody>
      ${rows.map(x=>{const f=coFlags(x);return`<tr class="click${x.id===ui.sel?' hl':''}" data-act="pick" data-id="${esc(x.id)}"><td><b>${esc(x.n)}</b>${f.gem?' <span class="tag ok">Pépite</span>':f.end?' <span class="tag ko">Fin de course</span>':''}</td><td>${esc((SECT[x.sec]||{}).l||x.sec)}</td>${FKEYS.map(k=>`<td class="n ${x[k]<min?'down':''}">${auto(x[k])}</td>`).join('')}<td>${fdate(x.dt)}</td><td class="n">${nf(f.a,0)}</td><td class="n ${f.prem>0?'down':''}">${sgn(f.prem*100,0)}</td><td><span class="tag ${passes(x)?'ok':'ko'}">${passes(x)?'Retenu':'Écarté'}</span></td></tr>`;}).join('')}
      </tbody></table></div>
      ${E?'<div class="row" style="margin-top:8px"><button class="btn sm" data-act="addco">Ajouter un dossier</button></div>':''}</div>
    <div class="card s4"><h2>Paramètres</h2>
      <p class="sub">Secteur cible : ${esc(SECT[ui.secTarget].l)}</p>
      <div class="fields">${F('Liquidité du secteur',`sc.sectors.${ui.secTarget}.liq`,'n',{u:'/10'})}${F('Catalyseur du secteur',`sc.sectors.${ui.secTarget}.cat`,'n',{u:'/10'})}</div>
      <div class="kv" style="padding:8px 0"><span>TAM mondial / CAGR</span><b>${big(SECT[ui.secTarget].tam)} / ${pct(SECT[ui.secTarget].cagr)}</b></div>
      <div class="kv" style="padding:8px 0"><span>TAM / CAGR, ${esc(G.lab)}</span><b>${big(SG[ui.secTarget].tam)} / ${pct(SG[ui.secTarget].cagr)}</b></div>
      <div class="kv" style="padding:8px 0"><span>Attractivité du secteur, ${esc(G.lab)}</span><b>${nf(SG[ui.secTarget].attr,0)}/100</b></div>
      ${fld(`sc.sectors.${ui.secTarget}.note`,'a',{rows:2,al:'Note sectorielle'})}
      <p class="sub" style="margin:14px 0 6px">Pondération de l'attractivité des entreprises</p>
      <div class="fields">${F('Catalyseur','sc.w.cat','n',{u:'%'})}${F('Concurrence','sc.w.conc','n',{u:'%'})}${F('Taille de marché','sc.w.tam','n',{u:'%'})}${F('Équipe','sc.w.team','n',{u:'%'})}${F('Business model','sc.w.bm','n',{u:'%'})}</div>
      <p class="note">Attractivité sectorielle : 40 % CAGR, 35 % catalyseur, 25 % taille du TAM dans la zone choisie, d'après les mêmes références que le business plan. Liquidité et catalyseur sectoriels : appréciation de l'analyste.</p></div>
    ${detail}
  </div>`;
}
