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
  const dk=1-clamp(+b.privDisc||0,0,90)/100,bfrD=y=>y.bal.bfr/y.rev*365,sWc=SF.wc/100*365,arr1=b.clients1*b.arpu*12,vImpl=SF.evs*dk*arr1,vS=SF.evs*dk*Hy.rev,vE=Hy.ebitda>0?SF.eve*dk*Hy.ebitda:NaN;
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
      <tr><td>Valorisation moyenne : VE / CA</td><td class="n">${nf(SF.evs,2)}×</td><td class="n">${big(vS)} sur le CA A${H}</td><td class="meta">valeurs du projet après décote de taille et d'illiquidité de ${pct((1-dk)*100,0)} · valeur implicite sur l'ARR fin A1 : ${big(vImpl)} · pre-money visé ${big(+b.preMoney)}${+b.preMoney>2*vImpl?' : plus de 2 fois la valeur implicite':''}</td></tr>
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
  const dk=1-clamp(+b.privDisc||0,0,90)/100,bear=bpWith(bpScenMod((b.scen||DEF.bp.scen).bear)),bfrD=Hy.bal.bfr/Hy.rev*365,sWc=SF.wc/100*365,arr1=b.clients1*b.arpu*12,vImpl=SF.evs*dk*arr1,post=(+b.preMoney)+(+b.raise),vH=SF.evs*dk*Hy.rev,mult=post>0?vH/post:NaN,irr=isFinite(mult)&&mult>0&&H>1?(mult**(1/(H-1))-1)*100:NaN;
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
    {l:'Scénario défavorable',w:8,s:bear.min.cash>=0?1:bear.min.cash>=r.min.cash-Math.abs(+b.raise||0)*0.2?.5:0,v:`point bas ${big(bear.min.cash)}`,pos:'le plan reste financé si prix, rétention, acquisition et croissance se dégradent ensemble',neg:'le plan n\'est plus financé en scénario défavorable : marge de sécurité insuffisante'},
    {l:'ROI investisseur',w:10,s:mult>=5?1:mult>=3?.5:0,v:isFinite(mult)?`${nf(mult,1)}× en A${H}${isFinite(irr)?', TRI '+pct(irr,0):''}`:'—',pos:'multiple de sortie élevé au multiple VE/CA du secteur après décote',neg:'multiple de sortie insuffisant pour le risque pris'}];
  const tw=sum(C.map(c=>c.w)),score=Math.round(sum(C.map(c=>c.w*c.s))/tw*100);
  const verdict=ko.length?['ko','NO-GO','Points bloquants à lever avant tout engagement']:score>=70&&bear.min.cash<0?['am','GO SOUS CONDITIONS',`Score de ${score}/100, mais le plan n'est plus financé en scénario défavorable (besoin de ${big(-bear.min.cash)}) : sécuriser cette marge avant d'investir`]:score>=70?['ok','GO','Le dossier réunit les conditions d\'un investissement']:score>=50?['am','GO SOUS CONDITIONS','Investissable si les réserves ci-dessous sont levées']:['ko','NO-GO','Le couple rendement-risque ne justifie pas l\'investissement'];
  return{C,score,verdict,ko,mult,irr,vH,post,bear};}
function bpGoCard(r,AL,SF){const b=S.bp,G=bpGo(r,AL,SF),pos=G.C.filter(c=>c.s>=1),neg=G.C.filter(c=>c.s<1);
  return`<div class="card s12 gocard ${G.verdict[0]}"><div class="go-h">
      <div class="go-v"><span class="lb">Verdict d'arbitrage</span><b>${G.verdict[1]}</b><span>${G.verdict[2]}</span></div>
      ${gauge({l:'Score global du terminal',v:G.score,ref:70,max:100,fmt:v=>nf(v,0)+' / 100',refL:'',sub:'seuil GO à 70'})}
      <div class="go-k"><div><span>ROI implicite</span><b>${isFinite(G.mult)?nf(G.mult,1)+'×':'—'}</b><em>valeur A${r.H} (VE/CA secteur après décote) ÷ post-money ${big(G.post)}</em></div><div><span>TRI implicite</span><b>${isFinite(G.irr)?pct(G.irr,0):'—'}</b><em>entrée en A1, sortie en A${r.H}</em></div><div><span>Points bloquants</span><b class="${G.ko.length?'down':''}">${G.ko.length}</b><em>issus des contrôles du modèle</em></div></div></div>
    <div class="grid" style="margin-top:8px">
      <div class="s6" style="min-width:0"><h3 class="h3 up">Pourquoi on y va</h3><ul class="gol">${pos.map(c=>`<li><b>${c.l}</b> · ${c.v} : ${c.pos}.</li>`).join('')||'<li class="meta">Aucun critère pleinement validé.</li>'}
        ${String(b.edge||'').trim()?`<li><b>Edge</b> · ${esc(b.edge)}</li>`:''}</ul></div>
      <div class="s6" style="min-width:0"><h3 class="h3 down">Pourquoi on n'y va pas</h3><ul class="gol">${G.ko.map(a=>`<li><span class="tag ko">Bloquant</span> ${a.t}</li>`).join('')}${neg.map(c=>`<li><b>${c.l}</b> · ${c.v} : ${c.neg}.</li>`).join('')||(G.ko.length?'':'<li class="meta">Aucune réserve sur les critères du terminal.</li>')}</ul></div></div>
    <div class="tw" style="margin-top:6px"><table class="tbl"><thead><tr><th>Critère</th><th>Mesure</th><th class="n">Poids</th><th>Note</th></tr></thead><tbody>${G.C.map(c=>`<tr><td>${c.l}</td><td>${c.v}</td><td class="n">${c.w}</td><td><span class="tag ${c.s>=1?'ok':c.s>0?'am':'ko'}">${c.s>=1?'validé':c.s>0?'partiel':'non validé'}</span></td></tr>`).join('')}</tbody></table></div>
    <div class="lb" style="margin-top:10px">Avis de l'analyste</div>${fld('bp.goNote','a',{rows:3,al:"Avis de l'analyste",ph:'Conclusion argumentée : thèse, conditions préalables, prochaines étapes'})}
    <p class="note">Score pondéré sur 12 critères issus du modèle, du tamis OVERRIDE et des repères sectoriels. Tout point bloquant entraîne un NO-GO ; un besoin de financement en scénario défavorable plafonne le verdict à GO SOUS CONDITIONS. Le ROI implicite valorise le CA de l'année ${r.H} au multiple VE/CA du secteur après décote de taille et d'illiquidité, sans dette nette ni dilution ultérieure : ordre de grandeur ; la valorisation détaillée figure au-dessus.</p></div>`;}

/* ---- Bascule du BP sur une autre zone (nouvelle version datée) ---- */
function bpZoneDup(newKey){const mod='bp',p=prjCur(mod),v=verCur(mod),old=geoAgg(S.bp.scope||'K:France').lab,nl=geoAgg(newKey).lab;
  if(prjDirty(mod))v.data=prjSnap(mod);
  S.bp.scope=newKey;const n={id:uid('v'),label:nextLabel(p,mod)+' · '+nl,date:new Date().toISOString(),note:'Bascule de '+old+' vers '+nl,data:prjSnap(mod)};n.dd=n.date.slice(0,10);
  p.versions.push(n);p.cur=n.id;ui.zoneDup=false;save();renderAll();toast('Nouvelle version sur '+nl+' : comparez-la dans « Gérer et comparer »');}

/* ============ v7.1 (audit) : valorisation du projet, scénarios et sensibilités ============ */
const bpDisc=()=>1-clamp(+S.bp.privDisc||0,0,90)/100;
/* Recalcule le modèle sur une copie modifiée de S.bp, sans toucher à l'état courant */
function bpWith(mod){const keep=S.bp;S.bp=clone(keep);try{mod(S.bp);return bpCalc();}finally{S.bp=keep;}}
/* DCF (flux disponibles d'exploitation) + méthode VC + dilution */
function bpVal(r){const b=S.bp,SF=DAMO[b.sector]||DAMO.saas,H=r.H,Y=r.Y,Hy=Y[H-1],k=bpDisc(),rt=(+b.dcfRate||30)/100,t=(+b.tax||25)/100;
  const F=Y.map(y=>{const taxN=Math.max(0,y.ebit)*t,fcf=y.ebitda-taxN-y.capex-y.dBFR,df=1/(1+rt)**y.t;return{t:y.t,ebitda:y.ebitda,taxN,capex:y.capex,dBFR:y.dBFR,fcf,df,pv:fcf*df};});
  const tvBasis=Hy.ebitda>0?['VE/EBITDA',SF.eve*k,Hy.ebitda]:['VE/CA',SF.evs*k,Hy.rev],tv=tvBasis[1]*tvBasis[2],pvTv=tv/(1+rt)**H;
  const ev=sum(F.map(f=>f.pv))+pvTv,pre=ev;
  const raise=+b.raise||0,dil=clamp(+b.futDil||0,0,90)/100,postVC=tv*(1-dil)/(1+rt)**H,preVC=postVC-raise;
  const post=(+b.preMoney||0)+raise,inv=post>0?raise/post:NaN;
  return{F,tv,tvBasis,pvTv,ev,pre,preVC,postVC,rt,dil,post,inv,k,share:ev?pvTv/ev:NaN};}
function bpValCard(r){const b=S.bp,V=bpVal(r),H=r.H,pm=+b.preMoney||0,ct=b.capTable||[],gap=pm&&isFinite(V.pre)?pm/V.pre-1:NaN,gapVC=pm&&isFinite(V.preVC)?pm/V.preVC-1:NaN;
  const row=(l,a,c='')=>`<tr class="${c}"><td>${l}</td>${a.map(v=>`<td class="n${v<-0.5?' down':''}">${typeof v==='string'?v:kk(v)}</td>`).join('')}</tr>`;
  return`<div class="card s12"><h2><span>Valorisation du projet <span class="meta">DCF des flux disponibles et méthode VC, rapprochées du pre-money visé</span></span></h2>
    <div class="stats">
      <div class="stat"><div class="k">Valeur DCF (pre-money)</div><div class="x">${big(V.pre)}</div><div class="d">dont valeur terminale ${pct(V.share*100,0)}</div></div>
      <div class="stat"><div class="k">Pre-money méthode VC</div><div class="x">${big(V.preVC)}</div><div class="d">post-money ${big(V.postVC)} − levée ${big(+b.raise)}</div></div>
      <div class="stat"><div class="k">Pre-money visé</div><div class="x ${gap>0.5?'amb':''}">${big(pm)}</div><div class="d">${isFinite(gap)?sgn(gap*100,0)+' vs DCF · '+sgn(gapVC*100,0)+' vs VC':'—'}</div></div>
      <div class="stat"><div class="k">Part de l'investisseur</div><div class="x">${pct(V.inv*100,1)}</div><div class="d">levée ÷ post-money visé ${big(V.post)}</div></div></div>
    <div class="grid" style="margin-top:6px"><div class="s7" style="min-width:0">${ftable(r.Y.map(y=>'A'+y.t),[
      ['EBITDA',V.F.map(f=>f.ebitda)],['IS normatif sur le résultat d\'exploitation',V.F.map(f=>f.taxN?-f.taxN:0)],['Investissements',V.F.map(f=>-f.capex)],['Variation du BFR',V.F.map(f=>-f.dBFR)],
      ['Flux disponible',V.F.map(f=>f.fcf),'tot',1],['Facteur d\'actualisation',V.F.map(f=>nf(f.df,3))],['Flux actualisé',V.F.map(f=>f.pv),'',1]])}
      <p class="note">Valeur terminale fin A${H} : ${V.tvBasis[0]} du secteur après décote (${nf(V.tvBasis[1],2)}×) × ${big(V.tvBasis[2])} = ${big(V.tv)}, actualisée ${big(V.pvTv)}. Trésorerie de départ et dettes non incluses : valeur des capitaux propres avant levée.</p></div>
      <div class="s5" style="min-width:0"><div class="fields">${F('Taux d\'actualisation (rendement exigé)','bp.dcfRate','n',{u:'%'})}${F('Dilution des tours futurs','bp.futDil','n',{u:'%'})}</div>
        <p class="note">Repères de rendement exigé par le capital-risque : 40 à 60 % en amorçage, 30 à 40 % en série A, 20 à 30 % pour une société rentable (fourchettes usuelles de la littérature, à adapter au stade et au risque).</p>
        ${ct.length?`<h3 class="h3">Table de capitalisation après la levée</h3><div class="tw"><table class="tbl"><thead><tr><th>Associé</th><th class="n">Avant</th><th class="n">Après</th></tr></thead><tbody>${ct.map(c=>`<tr><td>${esc(c.n)}</td><td class="n">${pct(+c.pct,1)}</td><td class="n">${pct((+c.pct)*(1-(isFinite(V.inv)?V.inv:0)),1)}</td></tr>`).join('')}<tr class="tot"><td>Nouvel investisseur</td><td class="n">—</td><td class="n">${pct(V.inv*100,1)}</td></tr></tbody></table></div>`:''}</div></div></div>`;}
/* Scénarios défavorable / central / favorable */
function bpScenMod(sc){return B=>{B.arpu=(+B.arpu)*(1+sc.arpu/100);B.churn=(+B.churn)*(1+sc.churn/100);(B.channels||[]).forEach(c=>c.cac=(+c.cac)*(1+sc.cac/100));B.g=(B.g||[]).map(g=>(+g)*(1+sc.g/100));B.clients1=(+B.clients1)*(1+sc.g/100);};}
function bpScen(){const b=S.bp,sc=b.scen||DEF.bp.scen;return[['Défavorable',sc.bear,'bear'],['Central',null,'base'],['Favorable',sc.bull,'bull']].map(([l,m,k])=>{const r=m?bpWith(bpScenMod(m)):bpCalc(),Hy=r.Y[r.H-1];
  return{l,k,m,r,rev:Hy.rev,eb:Hy.ebitda,em:Hy.em,min:r.min.cash,be:r.be?r.be.t:null,ltv:r.ratio,val:bpVal(r).pre};});}
function bpScenCard(r){const L=bpScen(),H=r.H,P=(k,f,lab)=>`${fld(`bp.scen.${k}.${f}`,'n',{al:lab})}`;
  return`<div class="card s7"><h2><span>Scénarios <span class="meta">chocs combinés sur le prix, la rétention, l'acquisition et la croissance</span></span></h2>
    <div class="tw"><table class="tbl"><thead><tr><th></th>${L.map(x=>`<th class="n">${x.l}</th>`).join('')}</tr></thead><tbody>
      <tr><td>Prix moyen (ARPU)</td><td class="n">${P('bear','arpu','ARPU défavorable')} %</td><td class="n">—</td><td class="n">${P('bull','arpu','ARPU favorable')} %</td></tr>
      <tr><td>Churn</td><td class="n">${P('bear','churn','Churn défavorable')} %</td><td class="n">—</td><td class="n">${P('bull','churn','Churn favorable')} %</td></tr>
      <tr><td>CAC</td><td class="n">${P('bear','cac','CAC défavorable')} %</td><td class="n">—</td><td class="n">${P('bull','cac','CAC favorable')} %</td></tr>
      <tr><td>Clients A1 et croissance du parc</td><td class="n">${P('bear','g','Croissance défavorable')} %</td><td class="n">—</td><td class="n">${P('bull','g','Croissance favorable')} %</td></tr>
      <tr class="sec"><td colspan="4">Résultats</td></tr>
      <tr><td>CA A${H}</td>${L.map(x=>`<td class="n">${big(x.rev)}</td>`).join('')}</tr>
      <tr><td>EBITDA A${H}</td>${L.map(x=>`<td class="n ${x.eb<0?'down':''}">${big(x.eb)} <span class="meta">${pct(x.em,0)}</span></td>`).join('')}</tr>
      <tr><td>Point mort EBITDA</td>${L.map(x=>`<td class="n ${x.be?'':'down'}">${x.be?'A'+x.be:'non atteint'}</td>`).join('')}</tr>
      <tr><td>Point bas de trésorerie</td>${L.map(x=>`<td class="n ${x.min<0?'down':''}">${big(x.min)}</td>`).join('')}</tr>
      <tr><td>LTV / CAC</td>${L.map(x=>`<td class="n ${x.ltv<3?'amb':''}">${nf(x.ltv,1)}×</td>`).join('')}</tr>
      <tr><td>Valeur DCF</td>${L.map(x=>`<td class="n">${big(x.val)}</td>`).join('')}</tr></tbody></table></div>
    <p class="note">${L[0].min<0?`<b class="down">En scénario défavorable, il manque ${big(-L[0].min)} de financement</b> : prévoir une marge de sécurité dans la levée ou un plan de réduction des coûts déclenchable.`:'Le plan reste financé en scénario défavorable.'}</p></div>`;}
/* Sensibilités univariées (tornade) */
const BP_SENS=[['Prix moyen (ARPU)',(B,d)=>B.arpu*=1+d*.2,'± 20 %'],['Churn mensuel',(B,d)=>B.churn*=1+d*.5,'± 50 %'],['CAC',(B,d)=>(B.channels||[]).forEach(c=>c.cac*=1+d*.25),'± 25 %'],
  ['Croissance du parc',(B,d)=>B.g=(B.g||[]).map(g=>g*(1+d*.25)),'± 25 %'],['Clients en année 1',(B,d)=>B.clients1*=1+d*.25,'± 25 %'],['Marge brute',(B,d)=>B.gm=clamp(+B.gm+d*10,0,100),'± 10 pts'],['Salaire chargé',(B,d)=>B.salary*=1+d*.1,'± 10 %'],['Délai clients (DSO)',(B,d)=>B.dso=Math.max(0,+B.dso*(1+d*.5)),'± 50 %']];
const BP_OUT={cash:['Point bas de trésorerie',r=>r.min.cash],eb:['EBITDA de la dernière année',r=>r.Y[r.H-1].ebitda],val:['Valeur DCF',r=>bpVal(r).pre]};
function bpTornCard(r){const k=BP_OUT[ui.tornK]?ui.tornK:'cash',[lab,f]=BP_OUT[k],base=f(r);
  const T=BP_SENS.map(([l,m,rg])=>{const lo=f(bpWith(B=>m(B,-1))),hi=f(bpWith(B=>m(B,1)));return{l,rg,lo,hi,sw:Math.abs(hi-lo)};}).sort((a,c)=>c.sw-a.sw);
  const mx=Math.max(1,...T.map(x=>Math.max(Math.abs(x.lo-base),Math.abs(x.hi-base))));
  const bar=(v)=>{const d=v-base,w=Math.abs(d)/mx*50;return d<0?`left:${50-w}%;width:${w}%`:`left:50%;width:${w}%`;};
  return`<div class="card s5"><h2><span>Sensibilités <span class="meta">une variable à la fois</span></span><span class="seg noprint" role="tablist">${Object.entries(BP_OUT).map(([x,[l]])=>`<button role="tab" data-act="tornk" data-id="${x}" aria-selected="${x===k}">${l.split(' ')[0]==='Point'?'Trésorerie':l.split(' ')[0]}</button>`).join('')}</span></h2>
    <p class="note" style="margin:0 0 8px">${lab} en central : <b class="num">${big(base)}</b>. Barre gauche : variable dégradée ou réduite ; droite : augmentée.</p>
    <div class="torn">${T.map(x=>`<div class="torn-r"><span class="torn-l">${x.l} <em>${x.rg}</em></span><div class="torn-t"><i class="mid"></i><b class="${x.lo<base?'neg':'pos'}" style="${bar(x.lo)}"></b><b class="${x.hi<base?'neg':'pos'}" style="${bar(x.hi)}"></b></div><span class="torn-v num">${big(x.lo)} · ${big(x.hi)}</span></div>`).join('')}</div>
    <p class="note">Classées par amplitude d'impact : les premières lignes sont les hypothèses à documenter en priorité.</p></div>`;}

/* ============ v7.2 : suivi du réalisé et analyse des écarts ============ */
const RA_F=[['rev','CA réalisé (€ HT)'],['cl','Clients actifs (fin de mois)'],['ebitda','EBITDA réalisé (€)'],['cash','Trésorerie fin de mois (€)']];
function raKey(r,m){const y0=+S.bp.startY||2027,d=new Date(y0,m-1,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function raRows(r){const A=S.bp.actuals||(S.bp.actuals={});return r.M.map(x=>{const k=raKey(r,x.m),a=A[k]||{},has=f=>a[f]!==null&&a[f]!==''&&a[f]!==undefined&&isFinite(+a[f]);
  const o={m:x.m,t:x.t,k,plan:x,a,has:has('rev')||has('ebitda')||has('cash')||has('cl')};
  if(has('rev')){o.dRev=+a.rev-x.rev;o.pRev=x.rev?o.dRev/x.rev*100:NaN;}
  if(has('rev')&&has('cl')&&+a.cl>0&&x.cl>0){const ap=S.bp.arpu,ar=+a.rev/+a.cl;o.vol=(+a.cl-x.cl)*ap;o.price=(ar-ap)*(+a.cl);o.arpuR=ar;}
  if(has('ebitda'))o.dEb=+a.ebitda-x.ebitda;if(has('cash'))o.dCash=+a.cash-x.cash;return o;});}
function raCard(r){const R=raRows(r),done=R.filter(x=>x.has),H=r.H,y0=+S.bp.startY||2027,ty=Math.min(H,Math.max(1,+ui.raY||(done.length?done[done.length-1].t:1))),RY=R.filter(x=>x.t===ty),A=S.bp.actuals;
  RY.forEach(x=>{if(!A[x.k])A[x.k]={};});
  const cum=done.filter(x=>x.dRev!==undefined),cP=sum(cum.map(x=>x.plan.rev)),cR=sum(cum.map(x=>+x.a.rev)),cE=done.filter(x=>x.dEb!==undefined),eP=sum(cE.map(x=>x.plan.ebitda)),eR=sum(cE.map(x=>+x.a.ebitda));
  const lastC=[...done].reverse().find(x=>x.dCash!==undefined),vol=sum(done.map(x=>x.vol||0)),prc=sum(done.map(x=>x.price||0));
  const al=[];if(cum.length&&cR<cP*0.9)al.push(['ko',`CA cumulé inférieur de ${pct((1-cR/cP)*100,0)} au plan sur ${cum.length} mois : reprévoir le plan et la trésorerie.`]);
  else if(cum.length&&cR<cP*0.97)al.push(['am',`CA cumulé en retard de ${pct((1-cR/cP)*100,1)} sur le plan.`]);
  if(lastC&&lastC.dCash<0)al.push([lastC.a.cash<0?'ko':'am',`Trésorerie réelle de ${big(+lastC.a.cash)} fin ${lastC.k}, ${big(lastC.dCash)} sous le plan.`]);
  const neg3=[...cum].slice(-3);if(neg3.length===3&&neg3.every(x=>x.dRev<0))al.push(['am','Trois mois consécutifs sous le plan de CA : écart structurel probable plutôt que décalage ponctuel.']);
  const cell=(x,f)=>fld(`bp.actuals.${x.k}.${f}`,'nn',{empty:'—',al:RA_F.find(z=>z[0]===f)[1]+' '+x.k});
  return`<div class="card s12"><h2><span>Suivi du réalisé <span class="meta">saisie mensuelle et écarts avec le prévisionnel</span></span><span class="row noprint"><select class="f" data-ui="raY" aria-label="Année suivie" style="width:auto">${r.Y.map(y=>`<option value="${y.t}"${y.t===ty?' selected':''}>Année ${y.t} (${y0+y.t-1})</option>`).join('')}</select><button class="btn sm" data-act="raimp">Importer un CSV</button></span></h2>
    <div class="stats">
      <div class="stat"><div class="k">Mois renseignés</div><div class="x">${done.length}</div><div class="d">sur ${r.M.length} mois du plan</div></div>
      <div class="stat"><div class="k">CA cumulé réel / plan</div><div class="x ${cP&&cR<cP*0.9?'down':cP&&cR>=cP?'up':''}">${cum.length?pct(cR/cP*100,1):'—'}</div><div class="d">${cum.length?big(cR)+' pour '+big(cP)+' prévus':'aucun CA saisi'}</div></div>
      <div class="stat"><div class="k">Écart de CA : effet volume</div><div class="x ${vol<0?'down':vol>0?'up':''}">${done.some(x=>x.vol!==undefined)?big(vol):'—'}</div><div class="d">clients réels − prévus, au prix du plan</div></div>
      <div class="stat"><div class="k">Écart de CA : effet prix</div><div class="x ${prc<0?'down':prc>0?'up':''}">${done.some(x=>x.price!==undefined)?big(prc):'—'}</div><div class="d">ARPU réel − ARPU du plan, sur les clients réels</div></div>
      <div class="stat"><div class="k">EBITDA cumulé : écart</div><div class="x ${eR-eP<0?'down':eR-eP>0?'up':''}">${cE.length?big(eR-eP):'—'}</div><div class="d">${cE.length?big(eR)+' réalisé':''}</div></div>
      <div class="stat"><div class="k">Trésorerie : écart</div><div class="x ${lastC&&lastC.dCash<0?'down':''}">${lastC?big(lastC.dCash):'—'}</div><div class="d">${lastC?'fin '+lastC.k:''}</div></div></div>
    ${al.length?`<div class="dec" style="grid-template-columns:1fr;margin-top:6px">${al.map(([l,t])=>`<div class="dc"><span class="dot ${l}"></span><div><b>${l==='ko'?'Écart critique':'Écart à surveiller'}</b><span>${t}</span></div></div>`).join('')}</div>`:''}
    <div class="tw" style="margin-top:8px"><table class="tbl fin"><thead><tr><th>Mois</th><th class="n">CA prévu</th><th class="n">CA réel</th><th class="n">Écart</th><th class="n">Clients prévus</th><th class="n">Clients réels</th><th class="n">Effet volume</th><th class="n">Effet prix</th><th class="n">EBITDA prévu</th><th class="n">EBITDA réel</th><th class="n">Trésorerie prévue</th><th class="n">Trésorerie réelle</th></tr></thead><tbody>
      ${RY.map(x=>`<tr><td>${x.k}</td><td class="n">${nf(x.plan.rev,0)}</td><td class="n">${cell(x,'rev')}</td><td class="n ${x.dRev<0?'down':x.dRev>0?'up':''}">${x.dRev!==undefined?nf(x.dRev,0)+' <span class="meta">'+sgn(x.pRev,0)+'</span>':'—'}</td>
        <td class="n">${nf(x.plan.cl,0)}</td><td class="n">${cell(x,'cl')}</td><td class="n">${x.vol!==undefined?nf(x.vol,0):'—'}</td><td class="n">${x.price!==undefined?nf(x.price,0):'—'}</td>
        <td class="n">${nf(x.plan.ebitda,0)}</td><td class="n">${cell(x,'ebitda')}</td><td class="n">${nf(x.plan.cash,0)}</td><td class="n">${cell(x,'cash')}</td></tr>`).join('')}</tbody></table></div>
    <div class="grid" style="margin-top:6px"><div class="s7" style="min-width:0">${colChart(RY.map(x=>x.k.slice(5)),RY.map(x=>x.plan.rev/1e3),{h:180,fmt:v=>nf(v,0)+' k€',title:'CA prévu et réalisé',vlab:v=>nf(v,0),line:{same:true,vals:RY.map(x=>x.dRev!==undefined?+x.a.rev/1e3:NaN),fmt:v=>nf(v,0)}})}
      <div class="legend"><span><i style="background:var(--c-bar)"></i>CA prévu (k€)</span><span><i style="background:var(--hi)"></i>CA réalisé (k€)</span></div></div>
      <div class="s5" style="min-width:0"><p class="note">Tableau en euros (graphique en k€) ; saisie au crayon ou import CSV (colonnes <code>mois;ca;clients;ebitda;tresorerie</code>, mois au format AAAA-MM). L'écart de CA se décompose en effet volume (clients réels − prévus, au prix du plan) et effet prix (ARPU réel − ARPU du plan, sur les clients réels) ; la somme des deux égale l'écart total quand les clients sont saisis.</p>
        <p class="note">Les réalisés sont enregistrés avec la version du business plan : une nouvelle version figée avant chaque comité garde la trace du plan sur lequel les écarts ont été mesurés.</p></div></div></div>`;}
function raImport(txt){const L=txt.replace(/\r/g,'').split('\n').filter(x=>x.trim());if(L.length<2)return 0;const sep=L[0].includes(';')?';':',',h=L[0].split(sep).map(x=>x.trim().toLowerCase());
  const ix=(...k)=>h.findIndex(x=>k.some(y=>x.startsWith(y))),I={m:ix('mois','month','date'),rev:ix('ca','chiffre','revenue','rev'),cl:ix('client'),ebitda:ix('ebitda','ebe'),cash:ix('treso','trésorerie','cash')};
  const num=v=>{v=String(v||'').replace(/\s/g,'').replace(/€/g,'');if(/\d,\d/.test(v)&&v.includes('.'))v=v.replace(/\./g,'');return parseFloat(v.replace(',','.'));};
  let n=0;S.bp.actuals=S.bp.actuals||{};L.slice(1).forEach(l=>{const c=l.split(sep),m=String(c[I.m]||'').trim().match(/^(\d{4})-(\d{1,2})/)||String(c[I.m]||'').trim().match(/^(\d{1,2})\/(\d{4})$/);if(!m)return;
    const k=m[0].includes('/')?`${m[2]}-${m[1].padStart(2,'0')}`:`${m[1]}-${m[2].padStart(2,'0')}`,o=S.bp.actuals[k]||{};['rev','cl','ebitda','cash'].forEach(f=>{if(I[f]>=0){const v=num(c[I[f]]);if(isFinite(v))o[f]=v;}});S.bp.actuals[k]=o;n++;});return n;}
