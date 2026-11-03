/* ============ Business plan v7 : zone unique, TAM/SAM/SOM granulaires, repères sectoriels visuels,
   cartographie d'acquisition et verdict d'arbitrage Go / No-Go ============ */
const skey=k=>String(k).replace(/[^A-Za-z0-9]/g,'_');
/* Migration v7 appliquée à l'état et aux valeurs de référence (sinon tout paraîtrait « forcé ») */
function bpGeoMigrate(b){if(b.zone===undefined||b.geo7)return;const s=SECT[b.sector]||SECT.saas,old=s.tam*((ZONE[b.zone]||ZONE.eu).s),nw=secInGeo(SECT[b.sector]?b.sector:'saas',geoAgg(b.scope||'K:France')).tam;
  if(!(b.tamOv>0)&&old>0&&nw>0)b.samPct=+Math.min(100,(+b.samPct)*old/nw).toPrecision(3);b.geo7=1;delete b.zone;}
function bpChanInit(b){(b.channels||[]).forEach(c=>{if(c.fam===undefined)c.fam=chanFam(c.n);if(c.zone===undefined)c.zone='';});}
function bpV7Init(){const b=S.bp;bpChanInit(b);if(DEF.bp.scope===undefined)DEF.bp.scope='K:France';bpGeoMigrate(DEF.bp);bpChanInit(DEF.bp);['tamLv','samLv','somLv'].forEach(k=>{if(!b[k]||typeof b[k]!=='object')b[k]={};});
  if(!b.cible)b.cible={firmo:'',budget:null,trig:''};
}
function chanFam(n){const s=String(n||'').toLowerCase();return/salon|événement|evenement|conférence/.test(s)?'Salons':/inbound|contenu|seo|référencement|webinar|blog/.test(s)?'Inbound':/digital|ads|linkedin|social|google|emailing|campagne/.test(s)?'Digital':'Outbound';}
const CHAN_FAM={Inbound:'Inbound',Outbound:'Outbound',Salons:'Salons',Digital:'Digital'};

/* ---- Zone unique : niveaux pays d'exercice, continent, monde ---- */
function bpLevels(){const sc=S.bp.scope||'K:France',L=[];
  if(sc.startsWith('K:')){const c=GEO.find(x=>x[0]===sc.slice(2));L.push(["Pays d'exercice",sc]);if(c)L.push(['Continent','C:'+c[1]]);}
  else if(sc!=='W')L.push(["Zone d'exercice",sc]);
  L.push(['Monde','W']);return L;}
/* Matrice TAM / SAM / SOM : échelle géographique × années du prévisionnel */
function bpTam(r){bpV7Init();const b=S.bp,sec=SECT[b.sector]?b.sector:'saas',sc=b.scope||'K:France';
  return bpLevels().map(([lev,key])=>{const G=geoAgg(key),gi=secInGeo(sec,G),main=key===sc,k=skey(key);
    const ovT=isNum(b.tamLv[k])&&+b.tamLv[k]>0,tam0=main?r.tam:ovT?+b.tamLv[k]*1e6:gi.tam,cagr=main?r.cagr:gi.cagr;
    const sp=main?+b.samPct:isNum(b.samLv[k])?+b.samLv[k]:+b.samPct,op=main?+b.somPct:isNum(b.somLv[k])?+b.somLv[k]:+b.somPct;
    const years=r.Y.map(y=>{const tam=tam0*(1+cagr/100)**(y.t-1),sam=tam*sp/100,som=sam*op/100;return{t:y.t,tam,sam,som,rev:y.rev,cap:som?y.rev/som*100:NaN};});
    return{lev,key,k,lab:G.lab,main,tam0,cagr,sp,op,years,ovT};});}
function bpTamCard(r){const b=S.bp,T=bpTam(r),H=r.H,sel=Math.min(T.length-1,Math.max(0,+ui.tamLv||0)),L=T[sel],y0=(+b.startY||2027);
  const cell=(row,f)=>row.main?f.main:f.other;
  const geo=`<div class="tw"><table class="tbl"><thead><tr><th>Échelle</th><th>Zone</th><th class="n">TAM A1</th><th class="n">CAGR</th><th class="n">TAM A${H}</th><th class="n">SAM (% TAM)</th><th class="n">SAM A1</th><th class="n">SOM (% SAM)</th><th class="n">SOM A1</th><th class="n">CA A${H} / SOM A${H}</th></tr></thead><tbody>
    ${T.map(x=>{const yH=x.years[H-1];return`<tr${x.main?' class="hl"':''}><td>${x.lev}</td><td><b>${esc(x.lab)}</b>${x.main?' <span class="tag ok">zone du modèle</span>':''}</td>
      <td class="n">${cell(x,{main:penV('bp.tamOv',big(x.tam0),{t:'n',al:'TAM forcé (M€, 0 = auto)'}),other:penV('bp.tamLv.'+x.k,big(x.tam0),{t:'nn',al:'TAM '+x.lab+' (M€, vide = auto)'})})}${!x.main&&!x.ovT?'<span class="meta"> auto</span>':''}</td>
      <td class="n">${pct(x.cagr)}</td><td class="n">${big(yH.tam)}</td>
      <td class="n">${cell(x,{main:penV('bp.samPct',pct(x.sp,2),{al:'SAM en % du TAM'}),other:penV('bp.samLv.'+x.k,pct(x.sp,2),{t:'nn',al:'SAM '+x.lab+' (% du TAM, vide = valeur de la zone du modèle)'})})}</td><td class="n">${big(x.years[0].sam)}</td>
      <td class="n">${cell(x,{main:penV('bp.somPct',pct(x.op,1),{al:'SOM en % du SAM'}),other:penV('bp.somLv.'+x.k,pct(x.op,1),{t:'nn',al:'SOM '+x.lab+' (% du SAM, vide = valeur de la zone du modèle)'})})}</td><td class="n">${big(x.years[0].som)}</td>
      <td class="n ${yH.cap>100?'down':yH.cap>50?'amb':''}">${pct(yH.cap,yH.cap<1?2:1)}</td></tr>`;}).join('')}</tbody></table></div>`;
  const chrono=`<div class="tw"><table class="tbl fin"><thead><tr><th>${esc(L.lab)}</th>${L.years.map(y=>`<th class="n">A${y.t} · ${y0+y.t-1}</th>`).join('')}</tr></thead><tbody>
    <tr><td>TAM</td>${L.years.map(y=>`<td class="n">${big(y.tam)}</td>`).join('')}</tr>
    <tr><td>SAM</td>${L.years.map(y=>`<td class="n">${big(y.sam)}</td>`).join('')}</tr>
    <tr><td><b>SOM</b></td>${L.years.map(y=>`<td class="n"><b>${big(y.som)}</b></td>`).join('')}</tr>
    <tr><td>CA du prévisionnel</td>${L.years.map(y=>`<td class="n">${big(y.rev)}</td>`).join('')}</tr>
    <tr><td>Part du SOM captée</td>${L.years.map(y=>`<td class="n ${y.cap>100?'down':y.cap>50?'amb':''}">${pct(y.cap,y.cap<1?2:1)}</td>`).join('')}</tr></tbody></table></div>`;
  const fw=[100,Math.max(2,r.sam/r.tam*100),Math.max(1,r.som/r.tam*100)];
  return`<div class="card s12"><h2><span>Marché adressable : TAM, SAM, SOM <span class="meta">secteur ${esc(r.s.l)} × poids de la zone dans le PIB mondial (FMI), CAGR ajusté de la croissance de la zone</span></span><span class="meta">${b.tamOv>0||b.cagrOv>0?'valeurs forcées':'calcul automatique'}</span></h2>
    <div class="stats">
      <div class="stat"><div class="k">TAM ${esc(T[0].lab)}</div><div class="x">${big(r.tam)}</div><div class="d">${b.tamOv>0?'forcé':'secteur × part de zone'}</div></div>
      <div class="stat"><div class="k">SAM</div><div class="x">${big(r.sam)}</div><div class="d">${pct(+b.samPct,2)} du TAM</div></div>
      <div class="stat"><div class="k">SOM</div><div class="x amb">${big(r.som)}</div><div class="d">${pct(+b.somPct,1)} du SAM</div></div>
      <div class="stat"><div class="k">CAGR retenu</div><div class="x">${pct(r.cagr)}</div><div class="d">${b.cagrOv>0?'forcé':'secteur ajusté de la zone'}</div></div>
      <div class="stat"><div class="k">CA A${H} / SOM</div><div class="x ${r.somShare>100?'down':r.somShare>50?'amb':''}">${pct(r.somShare,1)}</div><div class="d">SOM de l'année de base</div></div></div>
    <div class="funnel">${[['TAM',r.tam],['SAM',r.sam],['SOM',r.som]].map((x,i)=>`<div class="fr"><span>${x[0]}</span><div class="track"><div class="fill" style="width:${fw[i]}%"></div></div><span class="num">${big(x[1])}</span></div>`).join('')}</div>
    <h3 class="h3" style="margin-top:14px">1. Ventilation par échelle géographique</h3>${geo}
    <p class="note">Le modèle financier s'appuie sur la zone du modèle (sélecteur unique de la fiche). Les autres échelles sont calculées automatiquement ; le crayon force un TAM ou un taux de pénétration propre à chaque échelle.</p>
    <h3 class="h3" style="margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">2. Projection année par année <span class="seg noprint" role="tablist" aria-label="Échelle">${T.map((x,i)=>`<button role="tab" data-act="tamlv" data-id="${i}" aria-selected="${i===sel}">${esc(x.lev)}</button>`).join('')}</span></h3>
    <div class="grid"><div class="s7" style="min-width:0">${chrono}</div>
      <div class="s5" style="min-width:0">${colChart(L.years.map(y=>'A'+y.t),L.years.map(y=>y.som/1e6),{h:190,fmt:v=>nf(v,v<10?1:0)+' M€',title:'SOM et CA du prévisionnel, '+L.lab,vlab:v=>nf(v,v<10?1:0),line:{vals:L.years.map(y=>y.rev/1e6),fmt:v=>nf(v,1)}})}
        <div class="legend"><span><i style="background:var(--c-bar)"></i>SOM (M€)</span><span><i style="background:var(--hi)"></i>CA du prévisionnel (M€)</span></div></div></div>
    <div class="fields" style="margin-top:10px">${F('CAGR forcé (0 = auto)','bp.cagrOv','n',{u:'%'})}</div></div>`;}

/* ---- Jauges et histogrammes sectoriels ---- */
function gauge(o){const mn=o.min??0,mx=o.max,f=v=>clamp((v-mn)/(mx-mn),0,1),pt=(fr,rad)=>[60-rad*Math.cos(Math.PI*fr),60-rad*Math.sin(Math.PI*fr)];
  const v=+o.v,ref=+o.ref,okV=isFinite(v),okR=isFinite(ref);
  const st=!okV||!okR?'':o.good==='low'?(v<=ref?'ok':v<=ref*1.5?'am':'ko'):o.good==='band'?(v<ref-(o.tol||20)?'am':v<=ref+(o.tol||20)?'ok':'am'):(v>=ref?'ok':v>=ref*0.7?'am':'ko');
  const col=st==='ok'?'var(--up)':st==='ko'?'var(--down)':st==='am'?'var(--amber)':'var(--mute)';
  const [x1,y1]=pt(okV?f(v):0,46),[r1x,r1y]=pt(okR?f(ref):0,38),[r2x,r2y]=pt(okR?f(ref):0,56);
  return`<figure class="gauge" role="img" aria-label="${esc(o.l)} : ${okV?o.fmt(v):'non disponible'}, ${o.refL===''?'repère':(o.refL||'secteur')} ${okR?o.fmt(ref):'non publié'}">
    <svg viewBox="0 0 120 70"><path d="M14 60 A46 46 0 0 1 106 60" fill="none" stroke="var(--line2)" stroke-width="8" stroke-linecap="round"/>
      ${okV?`<path d="M14 60 A46 46 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round"/>`:''}
      ${okR?`<line x1="${r1x.toFixed(2)}" y1="${r1y.toFixed(2)}" x2="${r2x.toFixed(2)}" y2="${r2y.toFixed(2)}" stroke="var(--hi)" stroke-width="2"/>`:''}</svg>
    <div class="gv" style="color:${col}">${okV?o.fmt(v):'—'}</div><figcaption><b>${esc(o.l)}</b><span>${o.refL===''?'':(o.refL||'secteur')+' '+(okR?o.fmt(ref):'non publié')}${o.sub?(o.refL===''?'':' · ')+o.sub:''}</span></figcaption></figure>`;}
function cmpBars(rows,o={}){const all=rows.flatMap(r=>r.v.map(x=>Math.abs(+x)).filter(isFinite)),ref=Math.max(1e-9,...rows.map(r=>Math.abs(+r.v[0])).filter(isFinite),...rows.map(r=>Math.abs(+r.v[r.v.length-1])).filter(isFinite));
  /* Échelle commune bornée : une valeur hors norme (ex. première année de lancement) est tronquée et signalée par une flèche */
  const mx=Math.max(1e-9,...all.filter(v=>v<=ref*3));
  return`<div class="cmpb">${rows.map(r=>`<div class="cmpb-r"><span class="cmpb-l">${esc(r.l)}</span><div class="cmpb-v">${r.v.map((x,j)=>{const ok=isFinite(+x);const cut=ok&&Math.abs(+x)>mx;return`<div class="cmpb-b"><i class="c${r.v.length===1?2:j}${cut?' cut':''}" style="width:${ok?Math.max(1,Math.min(100,Math.abs(+x)/mx*100)):0}%;${ok&&+x<0?'background:var(--down)':''}"></i><span class="num">${ok?o.fmt(+x):'—'}</span></div>`;}).join('')}</div></div>`).join('')}</div>
    <div class="legend">${(o.series||[]).map((s,j)=>`<span><i class="c${j}"></i>${esc(s)}</span>`).join('')}</div>`;}
/* Bloc unique des repères sectoriels : aucune de ces métriques n'est répétée ailleurs dans la plateforme */
function bpSectorCard(r,SF){const b=S.bp,Y=r.Y,H=r.H,Hy=Y[H-1],y1=Y[0],FR=y=>(y.bal.capital+y.bal.grant+y.bal.retained+y.bal.debt-y.bal.fixed)/y.rev*365;
  const bfrD=y=>y.bal.bfr/y.rev*365,sWc=SF.wc/100*365,arr1=b.clients1*b.arpu*12,vImpl=SF.evs*arr1,vS=SF.evs*Hy.rev,vE=Hy.ebitda>0?SF.eve*Hy.ebitda:NaN;
  const sh=+b.shares,eps=y=>sh>0?y.net/sh:NaN,perP=Hy.net>0?(+b.preMoney)/Hy.net:NaN,frS=isNum(b.frng)?+b.frng:NaN;
  const g=[gauge({l:`Taux d'EBITDA A${H}`,v:Hy.em,ref:SF.ebm,max:Math.max(60,SF.ebm*2,Hy.em||0),min:Math.min(0,Hy.em||0),fmt:v=>pct(v,1),good:'band',tol:20,sub:'A1 '+pct(y1.em,0)}),
    gauge({l:`Marge nette A${H}`,v:Hy.net/Hy.rev*100,ref:SF.nm,max:Math.max(40,SF.nm*2),min:Math.min(0,Hy.net/Hy.rev*100||0),fmt:v=>pct(v,1)}),
    gauge({l:`BFR A${H} (jours de CA)`,v:bfrD(Hy),ref:sWc,max:Math.max(120,sWc*2.5,bfrD(Hy)||0),min:Math.min(0,bfrD(Hy)||0),fmt:v=>nf(v,0)+' j',good:'low'}),
    gauge({l:'Pre-money vs valeur implicite',v:+b.preMoney/1e6,ref:vImpl/1e6,max:Math.max(+b.preMoney,vImpl)*2/1e6||1,fmt:v=>nf(v,1)+' M€',good:'low',sub:'VE/CA × ARR fin A1'})];
  return`<div class="card s12"><h2><span>Repères financiers du secteur <span class="meta">${esc(SF.ind)}, ${SF.firms} sociétés cotées · projet comparé au secteur</span></span><span class="tag ok">Sourcé</span></h2>
    <div class="gauges">${g.join('')}</div>
    <div class="grid" style="margin-top:8px">
      <div class="s6" style="min-width:0"><h3 class="h3">Structure de marge</h3>${cmpBars([{l:"Taux d'EBITDA",v:[SF.ebm,y1.em,Hy.em]},{l:'Marge opérationnelle',v:[SF.opm,y1.ebit/y1.rev*100,Hy.ebit/Hy.rev*100]},{l:'Marge nette',v:[SF.nm,y1.net/y1.rev*100,Hy.net/Hy.rev*100]}],{fmt:v=>pct(v,1),series:['Secteur','Projet A1','Projet A'+H]})}</div>
      <div class="s6" style="min-width:0"><h3 class="h3">Fonds de roulement (jours de CA)</h3>${cmpBars([{l:'BFR',v:[sWc,bfrD(y1),bfrD(Hy)]},{l:'FRNG / FRNC',v:[frS,FR(y1),FR(Hy)]}],{fmt:v=>nf(v,0)+' j',series:['Secteur','Projet A1','Projet A'+H]})}
        <p class="note" style="margin-top:4px">FRNC du secteur : ${fld('bp.frng','nn',{empty:'non publié',al:'FRNG / FRNC moyen du secteur (jours de CA)'})} jours (à saisir avec sa source si disponible).</p></div></div>
    <div class="tw" style="margin-top:8px"><table class="tbl"><thead><tr><th>Valorisation et bénéfice par action</th><th class="n">Secteur</th><th class="n">Projet</th><th>Lecture</th></tr></thead><tbody>
      <tr><td>Valorisation moyenne : VE / CA</td><td class="n">${nf(SF.evs,2)}×</td><td class="n">${big(vS)} sur le CA A${H}</td><td class="meta">valeur implicite sur l'ARR fin A1 : ${big(vImpl)} · pre-money visé ${big(+b.preMoney)}${+b.preMoney>2*vImpl?' : plus de 2 fois la valeur implicite':''}</td></tr>
      <tr><td>Valorisation moyenne : VE / EBITDA</td><td class="n">${nf(SF.eve,1)}× <span class="meta">(${nf(SF.eveP,1)}× si EBITDA positif)</span></td><td class="n">${isFinite(vE)?big(vE)+' sur l\'EBITDA A'+H:'EBITDA A'+H+' négatif'}</td><td></td></tr>
      <tr><td>PER sectoriel</td><td class="n">${nf(SF.pe,1)}× <span class="meta">(prévisionnel ${nf(SF.fpe,1)}×)</span></td><td class="n">${isFinite(perP)?nf(perP,1)+'×':'résultat A'+H+' négatif'}</td><td class="meta">projet : pre-money ÷ résultat net A${H}</td></tr>
      <tr><td>BPA moyen</td><td class="n">${pct(100/SF.pe,1)} du cours</td><td class="n">${sh>0?`A1 ${nf(eps(y1),2)} € · A${H} ${nf(eps(Hy),2)} €`:'—'}</td><td class="meta">secteur : rendement bénéficiaire (1 / PER), un BPA en euros n'étant pas comparable entre sociétés. Projet : résultat net ÷ ${fld('bp.shares','nn',{empty:'nombre d\'actions à saisir',al:'Nombre d\'actions'})} actions.</td></tr>
    </tbody></table></div>
    <p class="note">Source : Aswath Damodaran (NYU Stern), données de janvier 2026 sur les sociétés cotées américaines (marges, PER, multiples de valeur, BFR). Taux d'EBITDA dérivé : VE/CA divisé par VE/EBITDA. Le FRNG / FRNC moyen n'est pas publié par cette source. Jauge : trait blanc = secteur ; vert = conforme, orange = écart à justifier, rouge = défavorable. ${SF.note||''}</p></div>`;}

/* ---- Cartographie d'acquisition : bassins × familles de canaux ---- */
function bpBasins(){const m=S.bp.mkt,t=+m.targets,out=[];
  [...(m.regions||[])].sort((a,c)=>c.sh-a.sh).slice(0,4).forEach(x=>out.push({n:x.n,type:'Région',v:t>0?nf(t*x.sh/100,0)+' clients':pct(+x.sh,0)+' du marché'}));
  (m.cities||[]).forEach(x=>out.push({n:x.n,type:'Ville',v:isNum(x.c)?nf(+x.c,0)+' clients':'—'}));
  (m.intl||[]).filter(x=>!/hors/i.test(String(x.ph))).forEach(x=>out.push({n:x.n,type:'Pays',v:isNum(x.v)?nf(+x.v,0)+' M€ · '+esc(x.ph||''):esc(x.ph||'')}));
  return out;}
function bpAcqCard(r){bpV7Init();const b=S.bp,ch=b.channels||[],tot=sum(ch.map(c=>+c.sh||0))||1,B=bpBasins();
  const fam=Object.keys(CHAN_FAM).map(f=>{const L=ch.filter(c=>c.fam===f),s=sum(L.map(c=>+c.sh||0));return{f,L,s:s/tot*100,cac:s?sum(L.map(c=>(+c.sh||0)*(+c.cac||0)))/s:NaN};});
  const hit=(c,bn)=>{const z=String(c.zone||'').trim().toLowerCase();return!z||z==='tous'||z.split(/[,;]/).map(x=>x.trim()).some(x=>x&&bn.toLowerCase().includes(x));};
  return`<div class="card s12"><h2><span>Bassins de clients et cartographie d'acquisition <span class="meta">où sont les clients cibles, et par quels canaux les aller chercher</span></span></h2>
    <div class="grid"><div class="s5" style="min-width:0"><h3 class="h3">Poids des familles de canaux</h3>
      ${cmpBars(fam.map(x=>({l:x.f,v:[x.s]})),{fmt:v=>pct(v,0)})}
      <div class="tw"><table class="tbl"><thead><tr><th>Famille</th><th>Canaux</th><th class="n">Part</th><th class="n">CAC pondéré</th></tr></thead><tbody>${fam.map(x=>`<tr><td>${x.f}</td><td>${x.L.length?x.L.map(c=>esc(c.n)).join(', '):'<span class="meta">aucun canal</span>'}</td><td class="n">${pct(x.s,0)}</td><td class="n">${isFinite(x.cac)?big(x.cac):'—'}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="s7" style="min-width:0"><h3 class="h3">Bassins ciblés × familles de canaux</h3>
      ${B.length?`<div class="tw"><table class="tbl heat"><thead><tr><th>Bassin</th><th>Type</th><th class="n">Potentiel</th>${Object.keys(CHAN_FAM).map(f=>`<th>${f}</th>`).join('')}</tr></thead><tbody>
        ${B.map(x=>`<tr><td><b>${esc(x.n)}</b></td><td>${x.type}</td><td class="n">${x.v}</td>${Object.keys(CHAN_FAM).map(f=>{const L=ch.filter(c=>c.fam===f&&hit(c,x.n));return`<td class="hc ${L.length?'ok':''}"><span>${L.length?L.map(c=>esc(c.n)).join(', '):'—'}</span></td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`
      :'<p class="note">Aucun bassin : renseignez les régions, villes clés et pays d\'extension dans l\'étude de marché (section 03).</p>'}
      <p class="note">Bassins repris de l'étude de marché (régions, villes clés, pays d'extension), sans ressaisie. Un canal dont la colonne « Bassins ciblés » est vide couvre tous les bassins ; sinon, listez les bassins séparés par des virgules.</p></div></div></div>`;}
function bpTargetCard(r){bpV7Init();const b=S.bp,c=b.cible,price=b.arpu*12,bud=+c.budget;
  return`<div class="card s12"><h2><span>Fiche d'identité du client cible <span class="meta">firmographie, budget et déclencheurs d'achat</span></span></h2><div class="qgrid">
    <div><h3>Qui sont-ils (firmographie et démographie)</h3>${fld('bp.cible.firmo','a',{rows:4,al:'Firmographie',ph:'Secteur, taille (effectif, CA), localisation, décideur et prescripteurs'})}</div>
    <div><h3>Budget moyen consacré au besoin</h3><span class="fv">${fld('bp.cible.budget','nn',{empty:'à renseigner',al:'Budget moyen annuel (€)'})}<em class="u">€ par an</em></span>
      <p class="note">${bud>0?`Notre prix annuel (${big(price)}) représente <b>${pct(price/bud*100,0)}</b> de ce budget${price>bud?' : au-delà du budget, il faut déplacer une autre ligne de dépense':''}.`:`Notre prix annuel : ${big(price)}. Saisissez le budget observé (avec sa source) pour mesurer l'effort demandé au client.`}</p></div>
    <div><h3>Déclencheurs d'achat</h3>${fld('bp.cible.trig','a',{rows:4,al:"Déclencheurs d'achat",ph:'Événements qui ouvrent la fenêtre d\'achat : panne, audit, renouvellement, réglementation, levée de fonds…'})}</div>
  </div><p class="note">Besoins fondamentaux et motivations : voir « Caractéristiques de la clientèle visée » ci-dessus. Localisation des bassins et canaux : section « Stratégie commerciale ».</p></div>`;}

/* ---- Diagnostic financier et verdict d'arbitrage ---- */
function bpGo(r,AL,SF){const b=S.bp,H=r.H,Hy=r.Y[H-1],k=r.mk,ko=AL.filter(a=>a.l==='ko');
  const bfrD=Hy.bal.bfr/Hy.rev*365,sWc=SF.wc/100*365,arr1=b.clients1*b.arpu*12,vImpl=SF.evs*arr1,post=(+b.preMoney)+(+b.raise),vH=SF.evs*Hy.rev,mult=post>0?vH/post:NaN,irr=isFinite(mult)&&mult>0&&H>1?(mult**(1/(H-1))-1)*100:NaN;
  const C=[
    {l:'Taille du marché',w:12,s:tamScore(r.tam)>=5?1:tamScore(r.tam)>=3?.5:0,v:`TAM ${big(r.tam)} (${esc(bpScope().G.lab)})`,pos:'marché adressable suffisant',neg:'TAM trop faible pour porter un acteur de taille'},
    {l:'Croissance du marché',w:8,s:r.cagr>=8?1:r.cagr>=3?.5:0,v:`CAGR ${pct(r.cagr)}`,pos:'marché porteur',neg:'croissance du marché trop faible'},
    {l:'Unit economics',w:14,s:r.ratio>=3?1:r.ratio>=1?.5:0,v:`LTV/CAC ${nf(r.ratio,1)}×`,pos:'chaque client rapporte plus de 3 fois son coût d\'acquisition',neg:'LTV/CAC sous 3× : acquisition trop chère ou rétention insuffisante'},
    {l:'Remboursement du CAC',w:5,s:r.payback<=18?1:r.payback<=24?.5:0,v:`${nf(r.payback,0)} mois`,pos:'CAC remboursé rapidement',neg:'CAC remboursé trop lentement'},
    {l:'Point mort EBITDA',w:10,s:r.be&&r.be.t<=3?1:r.be?.5:0,v:r.be?'année '+r.be.t:'non atteint',pos:'rentabilité opérationnelle rapide',neg:r.be?'point mort tardif':'EBITDA négatif sur tout l\'horizon'},
    {l:'Trésorerie',w:14,s:r.min.cash>=0?1:0,v:`point bas ${big(r.min.cash)}`,pos:'plan intégralement financé',neg:`financement manquant de ${big(-r.min.cash)}`},
    {l:'BFR',w:6,s:bfrD<=sWc?1:bfrD<=sWc*1.5?.5:0,v:`${nf(bfrD,0)} j de CA (secteur ${nf(sWc,0)} j)`,pos:'BFR maîtrisé',neg:'BFR trop lourd par rapport au secteur'},
    {l:'Marge EBITDA',w:6,s:Hy.em>SF.ebm+20?.5:Hy.em>=SF.ebm?1:Hy.em>=SF.ebm*.5?.5:0,v:`${pct(Hy.em,0)} en A${H} (secteur ${pct(SF.ebm,0)})`,pos:'marge au niveau du secteur',neg:Hy.em>SF.ebm+20?'marge très supérieure au secteur : hypothèse à démontrer':'marge inférieure au secteur'},
    {l:'Capture du SOM',w:8,s:r.somShare<=50?1:r.somShare<=100?.5:0,v:`${pct(r.somShare,1)} du SOM en A${H}`,pos:'objectif de CA réaliste au regard du marché obtenable',neg:'objectif de CA trop agressif au regard du marché obtenable'},
    {l:'Tamis OVERRIDE',w:7,s:k.passN/4,v:`${k.passN}/4 filtres`,pos:'liquidité, catalyseur et marge de sécurité validés',neg:'un ou plusieurs filtres amont non franchis'},
    {l:'ROI investisseur',w:10,s:mult>=5?1:mult>=3?.5:0,v:isFinite(mult)?`${nf(mult,1)}× en A${H}${isFinite(irr)?', TRI '+pct(irr,0):''}`:'—',pos:'multiple de sortie élevé au multiple VE/CA du secteur',neg:'multiple de sortie insuffisant pour le risque pris'}];
  const tw=sum(C.map(c=>c.w)),score=Math.round(sum(C.map(c=>c.w*c.s))/tw*100);
  const verdict=ko.length?['ko','NO-GO','Points bloquants à lever avant tout engagement']:score>=70?['ok','GO','Le dossier réunit les conditions d\'un investissement']:score>=50?['am','GO SOUS CONDITIONS','Investissable si les réserves ci-dessous sont levées']:['ko','NO-GO','Le couple rendement-risque ne justifie pas l\'investissement'];
  return{C,score,verdict,ko,mult,irr,vH,post};}
function bpGoCard(r,AL,SF){const b=S.bp,G=bpGo(r,AL,SF),pos=G.C.filter(c=>c.s>=1),neg=G.C.filter(c=>c.s<1);
  return`<div class="card s12 gocard ${G.verdict[0]}"><div class="go-h">
      <div class="go-v"><span class="lb">Verdict d'arbitrage</span><b>${G.verdict[1]}</b><span>${G.verdict[2]}</span></div>
      ${gauge({l:'Score global du terminal',v:G.score,ref:70,max:100,fmt:v=>nf(v,0)+' / 100',refL:'',sub:'seuil GO à 70'})}
      <div class="go-k"><div><span>ROI implicite</span><b>${isFinite(G.mult)?nf(G.mult,1)+'×':'—'}</b><em>valeur A${r.H} (VE/CA secteur) ÷ post-money ${big(G.post)}</em></div><div><span>TRI implicite</span><b>${isFinite(G.irr)?pct(G.irr,0):'—'}</b><em>entrée en A1, sortie en A${r.H}</em></div><div><span>Points bloquants</span><b class="${G.ko.length?'down':''}">${G.ko.length}</b><em>issus des contrôles du modèle</em></div></div></div>
    <div class="grid" style="margin-top:8px">
      <div class="s6" style="min-width:0"><h3 class="h3 up">Pourquoi on y va</h3><ul class="gol">${pos.map(c=>`<li><b>${c.l}</b> · ${c.v} : ${c.pos}.</li>`).join('')||'<li class="meta">Aucun critère pleinement validé.</li>'}
        ${String(b.edge||'').trim()?`<li><b>Edge</b> · ${esc(b.edge)}</li>`:''}</ul></div>
      <div class="s6" style="min-width:0"><h3 class="h3 down">Pourquoi on n'y va pas</h3><ul class="gol">${G.ko.map(a=>`<li><span class="tag ko">Bloquant</span> ${a.t}</li>`).join('')}${neg.map(c=>`<li><b>${c.l}</b> · ${c.v} : ${c.neg}.</li>`).join('')||(G.ko.length?'':'<li class="meta">Aucune réserve sur les critères du terminal.</li>')}</ul></div></div>
    <div class="tw" style="margin-top:6px"><table class="tbl"><thead><tr><th>Critère</th><th>Mesure</th><th class="n">Poids</th><th>Note</th></tr></thead><tbody>${G.C.map(c=>`<tr><td>${c.l}</td><td>${c.v}</td><td class="n">${c.w}</td><td><span class="tag ${c.s>=1?'ok':c.s>0?'am':'ko'}">${c.s>=1?'validé':c.s>0?'partiel':'non validé'}</span></td></tr>`).join('')}</tbody></table></div>
    <div class="lb" style="margin-top:10px">Avis de l'analyste</div>${fld('bp.goNote','a',{rows:3,al:"Avis de l'analyste",ph:'Conclusion argumentée : thèse, conditions préalables, prochaines étapes'})}
    <p class="note">Score pondéré sur 11 critères issus du modèle, du tamis OVERRIDE et des repères sectoriels. Tout point bloquant entraîne un NO-GO. Le ROI implicite valorise le CA de l'année ${r.H} au multiple VE/CA du secteur, sans dette nette ni dilution ultérieure : ordre de grandeur, pas une valorisation.</p></div>`;}

/* ---- Bascule du BP sur une autre zone (nouvelle version datée) ---- */
function bpZoneDup(newKey){const mod='bp',p=prjCur(mod),v=verCur(mod),old=geoAgg(S.bp.scope||'K:France').lab,nl=geoAgg(newKey).lab;
  if(prjDirty(mod))v.data=prjSnap(mod);
  S.bp.scope=newKey;const n={id:uid('v'),label:nextLabel(p,mod)+' · '+nl,date:new Date().toISOString(),note:'Bascule de '+old+' vers '+nl,data:prjSnap(mod)};n.dd=n.date.slice(0,10);
  p.versions.push(n);p.cur=n.id;ui.zoneDup=false;save();renderAll();toast('Nouvelle version sur '+nl+' : comparez-la dans « Gérer et comparer »');}
