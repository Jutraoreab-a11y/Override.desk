/* ============ v8.13 : stocks de brut américains, API (mardi soir) contre EIA (mercredi 16 h 30), suivi sur 5 semaines ============
   Variation hebdomadaire des stocks commerciaux de brut (hors réserve stratégique), en millions de barils.
   EIA : Weekly Petroleum Status Report (source officielle, eia.gov). API : Weekly Statistical Bulletin de l'American Petroleum Institute,
   diffusé le mardi à 16 h 30 heure de New York (22 h 30 à Paris). Prévisions : consensus du calendrier économique Investing.com. */
const OIL_STK={at:'2026-11-18T20:40:00+01:00',
  src:{eia:'https://www.eia.gov/petroleum/supply/weekly/',eiaLvl:'https://www.eia.gov/dnav/pet/pet_stoc_wstk_dcu_nus_w.htm',inv:'https://www.investing.com/economic-calendar/eia-crude-oil-inventories-75',api:'https://www.investing.com/economic-calendar/api-weekly-crude-stock-656'},
  /* semaine close le vendredi ; api/eia : [date de publication, heure de Paris, réel, prévision] ; lvl : stock commercial EIA en fin de semaine (Mb) */
  w:[
    {wk:'2026-10-09',api:['2026-10-14','22:30',-11.120,1.900],eia:['2026-10-15','18:00',-8.557,0.200],lvl:415.577},
    {wk:'2026-10-16',api:['2026-10-20','22:30',-4.930,-1.300],eia:['2026-10-21','16:30',-3.060,-0.100],lvl:412.517},
    {wk:'2026-10-23',api:['2026-10-27','22:30',-2.031,0.800],eia:['2026-10-28','16:30',-1.892,0.100],lvl:410.625},
    {wk:'2026-10-30',api:['2026-11-03','22:30',-5.267,2.100],eia:['2026-11-04','16:30',-0.865,-1.700],lvl:409.760},
    {wk:'2026-11-06',api:['2026-11-10','22:30',9.000,-1.000],eia:['2026-11-12','18:00',4.657,-0.600],lvl:414.417},
    {wk:'2026-11-13',api:['2026-11-17','22:30',5.300,-0.500],eia:['2026-11-18','16:30',3.380,0.400],lvl:417.797}],
  next:{api:'2026-11-24T22:30:00+01:00',eia:'2026-11-25T16:30:00+01:00'}};
const oilFd=d=>{if(!d)return 'date non publiée';const x=new Date(d+'T12:00:00');return isNaN(x)?d:x.toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'});};
const oilM=v=>v===null||v===undefined||!isFinite(v)?'non publié':(v>0?'+':'')+nf(v,2)+' Mb';
/* lecture du chiffre : un stock qui monte plus que prévu pèse sur le prix du brut, une baisse plus forte que prévu le soutient */
function oilRead(r){if(!r||!isFinite(r[2]))return['','en attente'];const s=isFinite(r[3])?r[2]-r[3]:NaN;
  if(!isFinite(s))return[r[2]>0?'down':'up',r[2]>0?'hausse des stocks':'baisse des stocks'];
  if(Math.abs(s)<0.5)return['','conforme au consensus'];return s>0?['down',`stocks au-dessus du consensus (${oilM(s)}) : baissier pour le brut`]:['up',`stocks sous le consensus (${oilM(s)}) : haussier pour le brut`];}

/* petit graphique : 5 dernières semaines, barres API et EIA côte à côte, trait du consensus EIA, valeurs écrites */
function oilChart(W5){const w=Math.min(640,window.innerWidth-60),h=200,L=34,R=8,T=16,B=34,iw=w-L-R,ih=h-T-B;
  const vals=W5.flatMap(x=>[x.api&&x.api[2],x.eia&&x.eia[2],x.eia&&x.eia[3]]).filter(isFinite);let mx=Math.max(1,...vals.map(Math.abs));mx=Math.ceil(mx*1.15);
  const Y=v=>T+(mx-v)/(2*mx)*ih,gw=iw/W5.length,bw=Math.min(26,gw/3.2);
  let s=`<svg class="oilc" viewBox="0 0 ${w} ${h}" role="img" aria-label="Variation hebdomadaire des stocks de brut US, API et EIA, 5 dernières semaines">`;
  [-mx,-mx/2,0,mx/2,mx].forEach(v=>s+=`<line x1="${L}" x2="${L+iw}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v===0?TVC.mute:TVC.grid}"/><text x="${L-4}" y="${Y(v)+3}" fill="${TVC.mute}" font-size="9.5" text-anchor="end">${v>0?'+':''}${nf(v,v%1?1:0)}</text>`);
  W5.forEach((x,i)=>{const cx=L+gw*i+gw/2;[[x.api,cx-bw-2,'#A1A1AA','API'],[x.eia,cx+2,null,'EIA']].forEach(([r,x0,col,k])=>{if(!r||!isFinite(r[2]))return;const v=r[2],c=col||(v>0?TVC.down:TVC.up),y0=Y(Math.max(v,0)),hh=Math.max(1,Math.abs(Y(v)-Y(0)));
      s+=`<rect x="${x0}" y="${y0}" width="${bw}" height="${hh}" fill="${c}" opacity="${k==='API'?.75:1}"><title>${k} ${oilM(v)}</title></rect><text x="${x0+bw/2}" y="${v>=0?y0-3:y0+hh+10}" fill="${TVC.text}" font-size="9.5" text-anchor="middle">${v>0?'+':''}${nf(v,1)}</text>`;});
    if(x.eia&&isFinite(x.eia[3]))s+=`<line x1="${cx}" x2="${cx+bw+4}" y1="${Y(x.eia[3])}" y2="${Y(x.eia[3])}" stroke="${TVC.amber}" stroke-width="2"><title>Consensus EIA ${oilM(x.eia[3])}</title></line>`;
    s+=`<text x="${cx}" y="${h-18}" fill="${TVC.mute}" font-size="10" text-anchor="middle">sem. ${new Date(x.wk+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</text>`;});
  s+=`<g font-size="10" fill="${TVC.mute}"><rect x="${L}" y="${h-11}" width="9" height="8" fill="#A1A1AA" opacity=".75"/><text x="${L+13}" y="${h-4}">API (mardi)</text><rect x="${L+90}" y="${h-11}" width="9" height="8" fill="${TVC.down}"/><rect x="${L+100}" y="${h-11}" width="9" height="8" fill="${TVC.up}"/><text x="${L+113}" y="${h-4}">EIA (mercredi) : hausse / baisse</text><line x1="${L+300}" x2="${L+312}" y1="${h-7}" y2="${h-7}" stroke="${TVC.amber}" stroke-width="2"/><text x="${L+316}" y="${h-4}">consensus EIA</text></g></svg>`;
  return s;}

function oilCard(){const W=OIL_STK.w.slice(-5),Lw=W[W.length-1],now=new Date(),nA=new Date(OIL_STK.next.api),nE=new Date(OIL_STK.next.eia);
  const ra=oilRead(Lw.api),re=oilRead(Lw.eia),gap=isFinite(Lw.api[2])&&isFinite(Lw.eia[2])?Lw.eia[2]-Lw.api[2]:NaN,cum=W.reduce((s,x)=>s+(x.eia[2]||0),0);
  const k=(t,v,d,c)=>`<div class="stat"><div class="k">${t}</div><div class="x ${c||''}">${v}</div><div class="d">${d}</div></div>`;
  const nx=d=>d.toLocaleString('fr-FR',{weekday:'long',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  return`<div class="card s12 oilk" id="oilk"><h2><span>Stocks de brut US : API puis EIA <span class="meta">variation hebdomadaire des stocks commerciaux (hors réserve stratégique), en millions de barils · mise à jour du ${new Date(OIL_STK.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span></span>
    <button class="btn sm noprint" data-act="oilref" title="Relit les calendriers API et EIA (Investing.com) dans votre navigateur">${ui.oilBusy?'Lecture…':'Mettre à jour'}</button></h2>
    <div class="oil-k">${k(`API, publié ${oilFd(Lw.api[0])} ${Lw.api[1]}`,oilM(Lw.api[2]),`consensus ${oilM(Lw.api[3])} · ${ra[1]}`,ra[0])}
      ${k(`EIA, publié ${oilFd(Lw.eia[0])} ${Lw.eia[1]}`,oilM(Lw.eia[2]),`consensus ${oilM(Lw.eia[3])} · ${re[1]}`,re[0])}
      ${k('Écart EIA − API (la veille)',isFinite(gap)?oilM(gap):'en attente',isFinite(gap)?(Math.sign(Lw.api[2])===Math.sign(Lw.eia[2])?'même sens : l\'API avait annoncé la direction':'sens opposés : l\'API a induit en erreur cette semaine'):'l\'EIA confirme ou infirme l\'API')}
      ${k('Stock commercial EIA',nf(Lw.lvl,1)+' Mb',`${cum>0?'+':''}${nf(cum,1)} Mb sur 5 semaines`,cum>0?'down':'up')}</div>
    <div class="oil-g"><div>${oilChart(W)}</div>
      <div class="tw"><table class="tbl"><thead><tr><th>Semaine close le</th><th class="n">API réel</th><th class="n">API prévu</th><th class="n">EIA réel</th><th class="n">EIA prévu</th><th class="n">Surprise EIA</th><th class="n">Stock EIA</th></tr></thead><tbody>
      ${[...W].reverse().map(x=>{const s=x.eia[2]-x.eia[3];return`<tr><td>${oilFd(x.wk)}</td><td class="n ${x.api[2]>0?'down':'up'}" title="publié ${oilFd(x.api[0])} ${x.api[1]}">${oilM(x.api[2])}</td><td class="n meta">${oilM(x.api[3])}</td><td class="n ${x.eia[2]>0?'down':'up'}" title="publié ${oilFd(x.eia[0])} ${x.eia[1]}">${oilM(x.eia[2])}</td><td class="n meta">${oilM(x.eia[3])}</td><td class="n ${isFinite(s)?(s>0?'down':'up'):''}">${oilM(s)}</td><td class="n">${nf(x.lvl,1)}</td></tr>`;}).join('')}</tbody></table></div></div>
    <p class="note">Prochaines publications : API ${nx(nA)} (heure de Paris), EIA ${nx(nE)}. Lecture : un stock qui monte plus que prévu est baissier pour le WTI et le Brent, une baisse plus forte que prévu est haussière ; l'API sort la veille au soir et sert d'avant-goût, l'EIA (source officielle) fait foi. Conseil d'exécution : être devant le M15 quelques minutes avant 16 h 30 sans prendre position avant le chiffre (spreads élargis, mèches), puis lire la réaction du prix au chiffre réel.${nE<now?' <b>La publication EIA prévue est passée : cliquez « Mettre à jour ».</b>':''}</p>
    <p class="note">Sources : <a href="${OIL_STK.src.eia}" target="_blank" rel="noopener">EIA, Weekly Petroleum Status Report</a> et <a href="${OIL_STK.src.eiaLvl}" target="_blank" rel="noopener">stocks hebdomadaires</a> ; API et prévisions : calendrier <a href="${OIL_STK.src.api}" target="_blank" rel="noopener">Investing.com (API)</a> et <a href="${OIL_STK.src.inv}" target="_blank" rel="noopener">Investing.com (EIA)</a>. Le stock de la dernière semaine est calculé : stock EIA de la semaine précédente + variation publiée.</p></div>`;}

/* mise à jour : lecture des deux calendriers dans le navigateur de l'utilisateur, sans IA */
function oilParse(txt){const o=[],re=/([A-Z][a-z]{2} \d{1,2}, \d{4})(?:\s*\([A-Z][a-z]{2}\))?\s+(\d{1,2}:\d{2})\s+(-?\d+\.\d+)M\s+(-?\d+\.\d+)M?/g;let m;
  while((m=re.exec(txt)))o.push({d:new Date(m[1]+' 12:00').toISOString().slice(0,10),a:+m[3],f:+m[4]});return o;}
const oilWk=d=>{const x=new Date(d+'T12:00:00'),back=((x.getDay()-5+7)%7)||7;x.setDate(x.getDate()-back);return x.toISOString().slice(0,10);};
async function oilRefresh(){if(typeof AI!=='object'||!AI.mcp){toast("Mise à jour : ouvrez FOMO.DESK dans l'application Claude (navigateur intégré ou Firecrawl)");return;}
  ui.oilBusy=true;renderAll();let n=0;
  try{const E=oilParse(await aiPage(OIL_STK.src.inv)),A=oilParse(await aiPage(OIL_STK.src.api));const map=new Map(OIL_STK.w.map(x=>[x.wk,x]));
    E.forEach(r=>{const wk=oilWk(r.d);let x=map.get(wk);if(!x){const prev=[...map.values()].sort((p,q)=>p.wk<q.wk?1:-1)[0];x={wk,api:[null,'22:30',NaN,NaN],eia:[r.d,'16:30',NaN,NaN],lvl:prev&&isFinite(prev.lvl)?prev.lvl+r.a:NaN};map.set(wk,x);n++;}x.eia[0]=r.d;x.eia[2]=r.a;x.eia[3]=r.f;});
    A.forEach(r=>{const x=map.get(oilWk(r.d));if(x){x.api[0]=r.d;x.api[2]=r.a;x.api[3]=r.f;}});
    OIL_STK.w=[...map.values()].sort((p,q)=>p.wk<q.wk?-1:1);OIL_STK.at=new Date().toISOString();
    const L=OIL_STK.w[OIL_STK.w.length-1];if(L&&L.eia[0]>=OIL_STK.next.eia.slice(0,10)){const a=new Date(OIL_STK.next.api),e=new Date(OIL_STK.next.eia);a.setDate(a.getDate()+7);e.setDate(e.getDate()+7);OIL_STK.next={api:a.toISOString(),eia:e.toISOString()};}
    try{localStorage.setItem('fomo.oil',JSON.stringify(OIL_STK));}catch(e){}
    toast(E.length?`Stocks de brut à jour${n?` : ${n} nouvelle(s) semaine(s)`:''}`:'Calendrier illisible : données précédentes conservées');}
  catch(e){toast('Mise à jour impossible : '+(e.message||e));}
  ui.oilBusy=false;renderAll();}
try{const s=JSON.parse(localStorage.getItem('fomo.oil')||'null');if(s&&s.at>OIL_STK.at&&Array.isArray(s.w))Object.assign(OIL_STK,s);}catch(e){}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act=oilref]');if(b&&!ui.oilBusy)oilRefresh();});
{const _r=renderCM;renderCM=function(){_r.apply(this,arguments);try{const P=document.getElementById('p-cm');if(!P||P.querySelector('#oilk')||(ui.cmA&&ui.cmA!=='brent'))return;   /* v8.37 : stocks de brut seulement dans la vue Brent / WTI */
  const sig=[...P.querySelectorAll('.card')].find(c=>/^Signaux du jour/.test((c.querySelector('h2')||{}).textContent||''));const d=document.createElement('div');d.innerHTML=oilCard();
  if(sig)sig.after(d.firstElementChild);else(P.querySelector('.grid')||P).prepend(d.firstElementChild);}catch(e){console.error('stocks',e);}};}
