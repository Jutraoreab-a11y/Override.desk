/* ============ v8.37 : vue Or / Argent unique, bloc macro rose, tableaux de décision, taux directeurs + DXY ============
   Données en direct lues par le serveur (/api/v1/rates) à la source officielle : Fed de New York, BCE, Banque d'Angleterre,
   Banque du Canada, BLS (CPI, PPI), TradingView (DXY, taux US 2 et 10 ans). Une valeur illisible reste vide : rien n'est estimé. */
let RATES=null,RATES_AT=0,RATES_BUSY=false;
try{const c=JSON.parse(localStorage.getItem('fomo.rates')||'null');if(c&&c.at){RATES=c;RATES_AT=0;}}catch(e){}
async function ratesLoad(force){if(RATES_BUSY||(!force&&Date.now()-RATES_AT<30*60e3))return;RATES_BUSY=true;
  try{const r=await fetch('/api/v1/rates');if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();RATES=j;RATES_AT=Date.now();
    try{localStorage.setItem('fomo.rates',JSON.stringify(j));}catch(e){}if(ui.tab==='cm')renderCM();}
  catch(e){console.warn('taux',e);RATES_AT=Date.now()-25*60e3;}finally{RATES_BUSY=false;}}
const v7n=(v,d=2)=>v===null||v===undefined||!isFinite(v)?'—':nf(v,d);
const v7p=v=>v===null||v===undefined||!isFinite(v)?'—':(v>0?'+':'')+nf(v,2)+' %';
const v7d=d=>d?fdate(String(d).slice(0,10)):'';
const v7ym=ym=>{if(!ym)return'';const[y,m]=ym.split('-');return['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'][+m-1]+' '+y;};

/* ---- Bloc rose : taux directeurs en vigueur, CPI, PPI (en tête de chaque vue) ---- */
function macPinkHTML(){const R=RATES,src=[];
  const cell=(l,v,e,t)=>`<div${t?` title="${esc(t)}"`:''}><span>${l}</span><b>${v}</b><em>${e||''}</em></div>`;
  let h='';
  if(R&&R.rates){const fed=R.rates.find(x=>x.bank==='Fed');
    if(fed){h+=cell('Fed : fourchette cible',fed.from!=null&&fed.to!=null?nf(fed.from,2)+' – '+nf(fed.to,2)+' %':'—',fed.d?'au '+v7d(fed.d):fed.err||'');
      h+=cell('Fed Funds effectif',fed.v!=null?nf(fed.v,2)+' %':'—',fed.d?'séance du '+v7d(fed.d):'');src.push([fed.url,'Fed de New York (EFFR)']);}
    R.rates.filter(x=>x.bank!=='Fed').forEach(x=>{h+=cell(x.bank+' : '+x.name,x.v!=null?nf(x.v,2)+' %':'—',x.v!=null?'en vigueur au '+v7d(x.d):'source illisible');src.push([x.url,x.bank]);});}
  else{const ff=macLast('ff');h+=cell('Fed Funds effectif',nf(ff.v,2)+' %',v7ym(ff.ym)+' (FRED, archivé)');}
  const inf=(o,k,l)=>{if(o&&o.ym){src.push([o.url,'BLS '+l]);const dv=o.yoy!=null&&o.prevYoy!=null?o.yoy-o.prevYoy:null;
      return cell(l+' glissement annuel',o.yoy!=null?nf(o.yoy,2)+' %':'—',o.yoy!=null?v7ym(o.ym)+(dv!=null?' · '+(dv>=0?'▲ ':'▼ ')+nf(Math.abs(dv),2)+' pt':''):v7ym(o.ym)+' : indice publié ('+nf(o.idx,3)+'), base de l\'an passé non publiée par le BLS',o.calc);}
    const m=macLast(k);return cell(l+' glissement annuel',nf(m.v,2)+' %',v7ym(m.ym)+' (FRED, archivé)');};
  h+=inf(R&&R.cpi,'cpi','CPI')+inf(R&&R.ppi,'ppi','PPI');
  const F=typeof MACRO==='object'&&MACRO.sep;if(F)h+=cell('Dernière décision Fed',esc(F.decision),'cible '+esc(F.target)+' · médiane FOMC fin 2026 '+nf(F.med['2026'],1)+' %');
  return`<div class="card s12 macpink" id="macpink"><h2><span>Taux directeurs, inflation et décisions <span class="meta">${R&&R.at?'lu le '+new Date(R.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'lecture en cours…'}</span></span>
    <button class="btn sm noprint" data-act="ratesref">Actualiser</button></h2><div class="mp">${h}</div>
    <p class="note" style="margin:8px 0 0">Sources lues en direct : ${src.filter(x=>x[0]).map(([u,l])=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a>`).join(' · ')||'—'}.</p></div>`;}

/* ---- Tableau des taux directeurs + performance du dollar (vue Or / Argent, remplace les stocks de brut) ---- */
function ratesDxyHTML(){const R=RATES,D=R&&R.dx;
  const rows=R&&R.rates?R.rates.map(x=>`<tr><td>${esc(x.bank)}</td><td>${esc(x.name)}${x.from!=null?` <span class="meta">(cible ${nf(x.from,2)} – ${nf(x.to,2)} %)</span>`:''}</td><td class="n"><b>${x.v!=null?nf(x.v,2)+' %':'—'}</b></td><td>${x.d?v7d(x.d):esc(x.err||'')}</td><td class="meta"><a href="${esc(x.url)}" target="_blank" rel="noopener">source</a>${x.quote?` · « ${esc(x.quote)} »`:''}</td></tr>`).join(''):'<tr><td colspan="5" class="meta">Lecture en cours…</td></tr>';
  const P=[['w','1 semaine'],['m1','1 mois'],['m3','3 mois'],['m6','6 mois'],['ytd','Depuis le 1er janv.'],['y1','1 an']];
  const perf=(o,l,inv)=>o?`<tr><td>${l}</td><td class="n"><b>${v7n(o.c,3)}</b></td><td class="n ${o.ch>0?(inv?'cf-dn':'cf-up'):o.ch<0?(inv?'cf-up':'cf-dn'):''}">${v7p(o.ch)}</td>${P.map(([k])=>`<td class="n ${o[k]>0?(inv?'cf-dn':'cf-up'):o[k]<0?(inv?'cf-up':'cf-dn'):''}">${v7p(o[k])}</td>`).join('')}</tr>`:'';
  return`<div class="card s12" id="ratesdxy"><h2><span>Taux directeurs en vigueur et performance du dollar <span class="meta">facteurs de décision de l'or et de l'argent</span></span></h2>
    <div class="tw"><table class="tbl"><thead><tr><th>Banque centrale</th><th>Taux</th><th class="n">Niveau</th><th>En vigueur au</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="tw" style="margin-top:10px"><table class="tbl"><thead><tr><th>Indicateur</th><th class="n">Dernier</th><th class="n">Séance</th>${P.map(([,l])=>`<th class="n">${l}</th>`).join('')}</tr></thead><tbody>
      ${D&&D.dxy?perf(D.dxy,'Dollar Index (DXY)',true)+perf(D.us10,'Taux US 10 ans (%)',true)+perf(D.us02,'Taux US 2 ans (%)',true):`<tr><td colspan="9" class="meta">${D&&D.err?'TradingView illisible : '+esc(D.err):'Lecture en cours…'}</td></tr>`}
    </tbody></table></div>
    <p class="note">Fond vert : le mouvement pousse l'or et l'argent à la hausse (dollar ou taux en baisse) ; rouge : il pèse sur les métaux. Performances lues sur <a href="${esc(D&&D.url||'https://www.tradingview.com/symbols/TVC-DXY/')}" target="_blank" rel="noopener">TradingView</a> (cours différé).</p></div>`;}

/* ---- Tableau de décision : chaque indicateur, sa lecture et son effet (fond vert = achat, rouge = vente) ---- */
function decTableHTML(a){const C=cmCalc(),{R,N}=C,r=R[N-1],P=cmP(),D=RATES&&RATES.dx,rows=[];
  const add=(ind,val,lec,b)=>rows.push({ind,val,lec,b});   // b : 1 achat, -1 vente, 0 neutre, null sans donnée
  const sig=t=>{const c=cmCls(t);return c==='ok'?1:c==='ko'?-1:c==='am'?0:null;};
  const lab=t=>esc(cmStrip(t||'')||'—');
  const cpi=RATES&&RATES.cpi,ppi=RATES&&RATES.ppi,ff=RATES&&RATES.rates&&RATES.rates.find(x=>x.bank==='Fed');
  if(a==='brent'){
    add('Signal principal (Brent / Yuan)',lab(r.sigChine).split(' : ')[0],lab(r.sigChine),sig(r.sigChine));
    if(r.sigStruct)add('Structure de marché',lab(r.sigStruct).split(' : ')[0],lab(r.sigStruct),sig(r.sigStruct));
    add('Spread Brent − WTI',v7n(r.spread),esc(r.spSt||''),sig(r.spRk));
    add('Basis Brent (spot − futur)',v7n(r.bB),esc(r.bBSt||''),sig(r.bBRk));
    add(`Z-score du spread ${P.zWin} j`,v7n(r.zSp),Math.abs(r.zSp)>P.zCrit?'critique':Math.abs(r.zSp)>P.zAlert?'alerte':'normal',nn(r.zSp)?(Math.abs(r.zSp)>P.zCrit?-1:0):null);
    if(typeof OIL_STK==='object'&&OIL_STK.w.length){const L=OIL_STK.w[OIL_STK.w.length-1],v=L.eia[2];add('Stocks de brut US (EIA, semaine)',isFinite(v)?(v>0?'+':'')+nf(v,2)+' M bbl':'—',isFinite(v)?(v<0?'déstockage : demande soutenue':'stockage : offre abondante'):'non publié',isFinite(v)?(v<0?1:-1):null);}
    if(D&&D.dxy)add('Dollar (DXY) sur 1 mois',v7p(D.dxy.m1),D.dxy.m1<0?'dollar en baisse : pétrole moins cher hors États-Unis':'dollar en hausse : pèse sur la demande',isFinite(D.dxy.m1)?(D.dxy.m1<0?1:-1):null);
  }else{
    add('Signal or (Yuan / or)',lab(r.sigGold).split(' : ')[0],lab(r.sigGold),sig(r.sigGold));
    if(r.sigGoldSt)add('Structure or',lab(r.sigGoldSt).split(' : ')[0],lab(r.sigGoldSt),sig(r.sigGoldSt));
    add('Basis or (spot − futur)',v7n(r.bG),esc(r.bGSt||''),sig(r.bGRk));
    add('Signal argent',lab(r.sigSilver).split(' : ')[0],lab(r.sigSilver),sig(r.sigSilver));
    add('Basis argent',v7n(r.bS,3),esc(r.bSSt||''),sig(r.bSRk));
    add('Ratio or / argent',v7n(r.gs,1),r.gs>P.gsRef?'zone refuge (> '+P.gsRef+') : demande de protection':'sous le seuil refuge',nn(r.gs)?(r.gs>P.gsRef?1:-1):null);
    try{const E=gsEngine(C),L=E.L;add('Silver Lead Indicator',v7n(L.lead),esc(E.lag[1]),nn(L.lead)?(L.lead>0?1:L.lead<0?-1:0):null);}catch(e){}
    add(`Z-score or ${P.zWin} j`,v7n(r.zG),Math.abs(r.zG)>P.zCrit?'excès : risque de retournement':'normal',nn(r.zG)?(Math.abs(r.zG)>P.zCrit?-1:0):null);
    if(D&&D.dxy)add('Dollar (DXY) sur 1 mois',v7p(D.dxy.m1),D.dxy.m1<0?'dollar en baisse : soutient les métaux':'dollar en hausse : pèse sur les métaux',isFinite(D.dxy.m1)?(D.dxy.m1<0?1:-1):null);
    if(D&&D.us10)add('Taux US 10 ans sur 1 mois',v7p(D.us10.m1),D.us10.m1<0?'taux en baisse : coût d\'opportunité de l\'or réduit':'taux en hausse : pénalise l\'or',isFinite(D.us10.m1)?(D.us10.m1<0?1:-1):null);
    const ry=macLast('ry');if(ry&&nn(ry.prev))add('Taux réel 10 ans (TIPS)',nf(ry.v,2)+' %',(ry.v<ry.prev?'en baisse':'en hausse')+' ('+v7ym(ry.ym)+', FRED)',ry.v<ry.prev?1:-1);
  }
  if(cpi&&cpi.yoy!=null&&cpi.prevYoy!=null)add('CPI US glissement annuel',nf(cpi.yoy,2)+' %',(cpi.yoy>cpi.prevYoy?'inflation en hausse':'inflation en baisse')+' ('+v7ym(cpi.ym)+')',a==='brent'?(cpi.yoy>cpi.prevYoy?1:0):(cpi.yoy>cpi.prevYoy?1:-1));
  else if(cpi&&cpi.ym)add('CPI US glissement annuel','—',v7ym(cpi.ym)+' : base de l\'an passé non publiée par le BLS',null);
  if(ppi&&ppi.yoy!=null&&ppi.prevYoy!=null)add('PPI US glissement annuel',nf(ppi.yoy,2)+' %',(ppi.yoy>ppi.prevYoy?'pression sur les prix en hausse':'pression en baisse')+' ('+v7ym(ppi.ym)+')',ppi.yoy>ppi.prevYoy?1:-1);
  if(ff&&ff.v!=null){const F=typeof MACRO==='object'&&MACRO.sep,m=F?F.med['2026']:null;add('Fed Funds effectif',nf(ff.v,2)+' %',m!=null?(m<ff.v?'baisse attendue par le FOMC (médiane fin 2026 '+nf(m,1)+' %)':'pas de baisse attendue (médiane fin 2026 '+nf(m,1)+' %)'):'',m!=null?(m<ff.v?1:-1):null);}
  const up=rows.filter(x=>x.b===1).length,dn=rows.filter(x=>x.b===-1).length,bias=up>dn+1?['cf-up','ACHAT']:dn>up+1?['cf-dn','VENTE']:['','NEUTRE'];
  return`<div class="card s12" id="dectab"><h2><span>Tableau de décision ${a==='brent'?'Brent / WTI':'or / argent'} <span class="meta">${rows.length} indicateurs · ${up} pour l'achat, ${dn} pour la vente</span></span><span class="tag ${bias[0]==='cf-up'?'ok':bias[0]==='cf-dn'?'ko':'am'}">Biais : ${bias[1]}</span></h2>
    <div class="tw"><table class="tbl dtab"><thead><tr><th>Indicateur</th><th class="n">Valeur</th><th>Lecture</th><th>Effet</th></tr></thead><tbody>
      ${rows.map(x=>`<tr><td>${x.ind}</td><td class="n">${x.val}</td><td class="wrap">${x.lec}</td><td class="bias ${x.b===1?'cf-up':x.b===-1?'cf-dn':''}">${x.b===1?'Achat':x.b===-1?'Vente':x.b===0?'Neutre':'Sans donnée'}</td></tr>`).join('')}
    </tbody></table></div><p class="note">Fond vert : l'indicateur pousse à l'achat ; rouge : à la vente. Biais = majorité d'au moins deux indicateurs. Aide à la décision, pas un conseil en investissement.</p></div>`;}

/* ---- Fonds conditionnels du bloc « Sensibilité & propulsion relative or / argent » ---- */
function gsColor(){const G=document.getElementById('gs-eng');if(!G)return;const P=cmP();
  G.querySelectorAll('.stat').forEach(st=>{const l=(st.querySelector('.k')||{}).textContent||'',v=parseFloat(((st.querySelector('.x')||{}).textContent||'').replace(/\s/g,'').replace(',','.'));if(!isFinite(v))return;let c=0;
    if(/^Ratio XAU/.test(l))c=v>P.gsRef?1:-1;else if(/^Z-score ratio/.test(l))c=v>1?1:v<-1?-1:0;else if(/^Impulsion/.test(l))c=v>0?1:v<0?-1:0;
    st.querySelector('.x').classList.remove('up','down');st.classList.remove('cf-up','cf-dn');if(c)st.classList.add(c>0?'cf-up':'cf-dn');});
  const d={0:macLast('cpi'),1:macLast('ppi'),2:macLast('ff'),3:macLast('ry')};
  G.querySelectorAll('table tbody tr').forEach((tr,i)=>{const m=d[i];if(!m||!nn(m.prev))return;const dv=m.v-m.prev;[1,2].forEach(j=>{const td=tr.children[j],b=parseFloat((td.textContent||'').replace(/\s/g,'').replace(',','.'));if(!isFinite(b)||!dv)return;
    td.classList.add(b*dv>0?'cf-up':'cf-dn');td.title='Bêta × dernière variation ('+(dv>0?'+':'')+nf(dv,2)+' pt) : '+(b*dv>0?'pousse à l\'achat':'pousse à la vente');});});}

/* ---- Rendu : vue unique Or / Argent (section argent reprise du rendu argent), bloc rose, décision, taux + DXY ---- */
{const _r=renderCM;renderCM=function(){
  if(ui.cmA==='silver')ui.cmA='gold';
  const gold=(ui.cmA||'brent')==='gold';let silv=[];
  if(gold){ui.cmSilverPass=true;ui.cmA='silver';const oT=ui.cmT;
    try{_r.apply(this,arguments);const P=document.getElementById('p-cm');
      silv=[...P.querySelectorAll(':scope>.grid>.card')].filter(c=>/^(Signaux du jour|Tableau chronologique|Tableau de confirmation)/.test(((c.querySelector('h2')||{}).textContent||'').trim())||c.querySelector('.stats')&&!c.querySelector('h2'))
        .map(c=>{c.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));const h=c.querySelector('h2');if(h){const sp=h.querySelector('span')||h;sp.insertAdjacentText('afterbegin','Argent · ');}else c.insertAdjacentHTML('afterbegin','<h2>Argent · indicateurs</h2>');return c.outerHTML;});}
    catch(e){console.error('argent',e);}finally{ui.cmSilverPass=false;ui.cmA='gold';ui.cmT=oT;}}
  _r.apply(this,arguments);
  try{const P=document.getElementById('p-cm'),G=P&&P.querySelector(':scope>.grid');if(!G)return;const a=ui.cmA||'brent';
    const head=G.querySelector(':scope>.card');if(head){head.insertAdjacentHTML('afterend',macPinkHTML()+decTableHTML(a));}
    if(gold){const t=[...G.querySelectorAll(':scope>.card')].find(c=>/^(Tableau chronologique|Tableau de confirmation)/.test(((c.querySelector('h2')||{}).textContent||'').trim()));
      if(t){t.querySelector('h2 span')&&t.querySelector('h2 span').insertAdjacentText('afterbegin','Or · ');t.insertAdjacentHTML('afterend',silv.join(''));}
      const sig=[...G.querySelectorAll(':scope>.card')].find(c=>/^Signaux du jour/.test(((c.querySelector('h2')||{}).textContent||'').trim()));
      if(sig){sig.querySelector('h2').textContent='Or · Signaux du jour';sig.insertAdjacentHTML('afterend',ratesDxyHTML());}else G.insertAdjacentHTML('beforeend',ratesDxyHTML());}
    gsColor();}catch(e){console.error('v837',e);}
  ratesLoad();};}
if(typeof MKT_TO_CMA==='object')MKT_TO_CMA.silver='gold';
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act=ratesref]');if(b)ratesLoad(true);});
setInterval(()=>{if(ui.tab==='cm'&&document.visibilityState==='visible')ratesLoad();},5*60e3);

/* ---- Mes analyses et Sélecteur vidés une fois (demande de l'utilisateur) : il crée ses propres dossiers à partir de données réelles ---- */
(()=>{try{if(S.v837clean)return;S.prj=S.prj||{bp:[],an:[]};S.prj.an=[];S.an.assets={};ui.tk=null;if(S.sc)S.sc.list=[];S.v837clean=new Date().toISOString();save();}catch(e){console.error('v837 clean',e);}})();
function anEmptyHTML(){return`<div class="grid"><div class="card s12" style="padding:28px"><h2>Mes analyses</h2>
  <p class="meta" style="margin:6px 0 14px">Aucune analyse. Entrez le ticker d'une société cotée (format Yahoo : AAPL, MSFT, MC.PA, ASML.AS, SAP.DE) : ses comptes sur 5 ans, ses estimations et son cours sont lus en direct sur stockanalysis.com, avec la source.</p>
  <div class="row" style="gap:8px;flex-wrap:wrap"><input id="an-new" class="inp" placeholder="Ticker, ex. AAPL ou MC.PA" style="min-width:240px" autocomplete="off">
  <button class="btn pri" data-act="annew"${ui.anNewBusy?' disabled':''}>${ui.anNewBusy?'Lecture des comptes…':'Créer l\'analyse'}</button></div>
  ${ui.anNewErr?`<p class="note" style="color:var(--down)">${esc(ui.anNewErr)}</p>`:''}</div></div>`;}
async function anNew(){const el=document.getElementById('an-new'),tk=(el&&el.value||'').trim().toUpperCase();if(!tk||ui.anNewBusy)return;
  ui.anNewBusy=true;ui.anNewErr='';renderAN();
  try{const b=await ficheFetch(tk);ui.anNewBusy=false;ficheOpen(tk,b);toast(`${tk} : analyse créée à partir des comptes publiés`);}
  catch(e){ui.anNewBusy=false;ui.anNewErr=`${tk} : ${e.message||e}`;renderAN();}}
{const _ra=renderAN;renderAN=function(){if(!Object.keys(S.an.assets||{}).length){const P=document.getElementById('p-an');if(P)P.innerHTML=anEmptyHTML();return;}return _ra.apply(this,arguments);};}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act=annew]');if(b)anNew();});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='an-new')anNew();});

/* ---- Business plan : tous les secteurs (+ « Autre » libre), tous les pays et régions du monde, plusieurs zones ---- */
const BP_SECTORS=['Agriculture et agroalimentaire','Aéronautique et défense','Assurance','Audiovisuel, médias et divertissement','Automobile et mobilité','Banque et services financiers','Bâtiment et travaux publics','Beauté et cosmétiques','Biotechnologies','Chimie','Commerce de détail','Commerce de gros et distribution','Conseil et services aux entreprises','Construction et matériaux','Cybersécurité','E-commerce','Éducation et formation (EdTech)','Électronique et semi-conducteurs','Énergie (pétrole et gaz)','Énergies renouvelables et cleantech','Environnement, eau et déchets','Fintech et paiements','Hôtellerie, restauration et tourisme','Immobilier','Industrie manufacturière','Intelligence artificielle et données','Jeux vidéo','Logiciel B2B / SaaS','Logistique et transport','Luxe et mode','Machines et équipements','Métaux et mines','Mode et textile','Pharmacie','Publicité et marketing','Recrutement et ressources humaines','Santé et dispositifs médicaux','Santé numérique','Services à la personne','Sport et loisirs','Télécommunications','Transport aérien et maritime','Économie sociale et associative'];
const BP_SEC_MAP={'Logiciel B2B / SaaS':'saas','Fintech et paiements':'fintech','Banque et services financiers':'fintech','Santé numérique':'health','Santé et dispositifs médicaux':'health','Énergies renouvelables et cleantech':'energy','Cybersécurité':'cyber','Éducation et formation (EdTech)':'edtech','Agriculture et agroalimentaire':'agri','Logistique et transport':'logi','Automobile et mobilité':'logi'};
const BP_REGIONS=['Monde','Afrique','Afrique du Nord','Afrique subsaharienne','Afrique de l\'Ouest','Afrique centrale','Afrique de l\'Est','Afrique australe','Amérique du Nord','Amérique latine','Amérique du Sud','Amérique centrale et Caraïbes','Europe','Union européenne','Europe de l\'Ouest','Europe de l\'Est','Asie','Asie du Sud-Est','Asie de l\'Est','Asie du Sud','Asie centrale','Moyen-Orient','Moyen-Orient et Afrique du Nord (MENA)','Pays du Golfe (CCG)','Océanie','Zone CEMAC','Zone UEMOA','Francophonie'];
const BP_ISO='AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NC NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RE RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW GP MQ GF YT PF'.split(' ');
const BP_COUNTRIES=(()=>{let dn=null;try{dn=new Intl.DisplayNames(['fr'],{type:'region'});}catch(e){}return BP_ISO.map(c=>dn?dn.of(c):c).sort((a,b)=>a.localeCompare(b,'fr'));})();
function bpZonesHTML(){const Z=ui.bpZones||(ui.bpZones=['France']);
  return`<div class="full bpz"><span class="lab">Zones du marché <span class="meta">(une ou plusieurs : chaque zone a ses chiffres dans l'étude)</span></span>
    <div class="chips" style="margin:6px 0">${Z.map((z,i)=>`<button type="button" class="chip" aria-pressed="true" data-act="bpzdel" data-id="${i}">${esc(z)} ✕</button>`).join('')||'<span class="meta">Aucune zone choisie</span>'}</div>
    <div class="row" style="gap:6px;flex-wrap:wrap"><input class="f" id="bpz-in" list="bpz-list" placeholder="Pays ou région, ex. Sénégal, Afrique de l'Ouest" style="min-width:260px" autocomplete="off">
      <datalist id="bpz-list">${BP_REGIONS.concat(BP_COUNTRIES).map(z=>`<option value="${esc(z)}">`).join('')}</datalist>
      <button type="button" class="btn sm" data-act="bpzadd">Ajouter</button></div>
    <div class="chips" style="margin-top:6px">${BP_REGIONS.slice(0,16).map(z=>`<button type="button" class="chip" data-act="bpzq" data-id="${esc(z)}" aria-pressed="${Z.includes(z)}">${esc(z)}</button>`).join('')}</div></div>`;}
bpEmptyHTML=function(){const P=(S.prj&&S.prj.bp)||[],f=ui.bpNew;
  return`<div class="card s12 bp0"><h2>Business plan</h2>
    <p>Aucun dossier lancé. Créez un dossier, renseignez son activité et ses zones, puis lancez la première étude : Claude recherche la taille du marché et sa croissance pour chaque zone, avec les sources citées.</p>
    ${f?`<form class="bp0f" id="bp0form" onsubmit="return false">
      <label class="full">Nom du projet<input class="f" name="name" required maxlength="80" placeholder="ex. Atelier Nova" value="${esc(ui.bpNf&&ui.bpNf.name||'')}"></label>
      <label>Secteur<select class="f" name="sector" id="bp0sec">${BP_SECTORS.map(v=>`<option${(ui.bpNf&&ui.bpNf.sector)===v?' selected':''}>${esc(v)}</option>`).join('')}<option value="__autre"${(ui.bpNf&&ui.bpNf.sector)==='__autre'?' selected':''}>Autre (préciser)</option></select></label>
      <label id="bp0autre"${(ui.bpNf&&ui.bpNf.sector)==='__autre'?'':' hidden'}>Secteur précis<input class="f" name="secOther" maxlength="80" placeholder="ex. Vélos cargo électriques" value="${esc(ui.bpNf&&ui.bpNf.secOther||'')}"></label>
      <label>Année de démarrage<input class="f" name="startY" type="number" min="2020" max="2040" value="${esc(ui.bpNf&&ui.bpNf.startY||new Date().getFullYear()+1)}"></label>
      <label>Dossier (classement)<input class="f" name="folder" maxlength="60" placeholder="ex. Industrie" value="${esc(ui.bpNf&&ui.bpNf.folder||'')}"></label>
      ${bpZonesHTML()}
      <label class="full">Activité en quelques lignes<textarea class="f" name="summary" maxlength="1200" placeholder="Ce que fait l'entreprise, pour qui, et ce qui la distingue.">${esc(ui.bpNf&&ui.bpNf.summary||'')}</textarea></label>
    </form>
    <div class="acts"><button class="btn pri" data-act="bp0go">Créer le dossier et lancer la première étude</button><button class="btn" data-act="bp0cancel">Annuler</button></div>`
    :`<div class="acts"><button class="btn pri" data-act="bp0new">Créer un dossier</button></div>`}
    ${P.length&&!f?`<div class="bp0l"><div class="meta">Ou rouvrir un dossier existant</div>${P.map(p=>`<button data-act="bp0open" data-id="${p.id}"><span>${esc(p.name)}</span><span class="meta">${esc(p.folder||'Sans dossier')} · ${p.versions.length} version${p.versions.length>1?'s':''}</span></button>`).join('')}</div>`:''}
  </div>`;};
function bpFormKeep(){const F=document.getElementById('bp0form');if(!F)return;const v=n=>F.elements[n]?F.elements[n].value:'';ui.bpNf={name:v('name'),sector:v('sector'),secOther:v('secOther'),startY:v('startY'),folder:v('folder'),summary:v('summary')};}
function bpZoneAdd(z){z=String(z||'').trim();if(!z)return;const Z=ui.bpZones||(ui.bpZones=[]);const hit=BP_REGIONS.concat(BP_COUNTRIES).find(x=>x.toLowerCase()===z.toLowerCase())||z;if(!Z.includes(hit))Z.push(hit);}
bpCreate=function(){const F=document.getElementById('bp0form');if(!F)return;const v=n=>(F.elements[n]&&F.elements[n].value||'').trim();
  const name=v('name');if(!name){toast('Donnez un nom au projet');F.elements.name.focus();return;}
  const sv=v('sector'),secLbl=sv==='__autre'?v('secOther'):sv;if(!secLbl){toast('Précisez le secteur');return;}
  const zones=(ui.bpZones||[]).slice();if(!zones.length){toast('Choisissez au moins une zone');return;}
  const zone=zones.length===1&&zones[0]==='France'?'fr':zones.every(z=>/^(Europe|Union européenne|Europe de l)/.test(z)||z==='France')?'eu':'world';
  prjInit();const D=clone(DEF.bp);Object.assign(D,{name,sector:BP_SEC_MAP[secLbl]||'saas',secLbl,zones,zone,startY:+v('startY')||new Date().getFullYear()+1,summary:v('summary'),edge:'',team:[]});
  delete D.mkt;D.mkt=clone(DEF.bp.mkt||{});if(D.mkt){D.mkt.label='';D.mkt.hist=[];}delete D.mktAI;delete D.tamOv;delete D.cagrOv;delete D.mktZones;
  const ver={id:uid('v'),label:'Version A',date:new Date().toISOString(),note:'Création du dossier',data:clone(D)};ver.dd=ver.date.slice(0,10);
  const p={id:uid('p'),name,folder:v('folder'),created:today(),versions:[ver],cur:ver.id};
  S.prj.bp.unshift(p);ui.prj_bp=p.id;S.bp=clone(D);S.bpStarted=true;ui.bpNew=false;ui.bpNf=null;ui.bpZones=null;ui.tab='bp';save();renderAll();
  toast(`Dossier créé : étude de marché (${zones.join(', ')}) transmise, Claude est réveillé automatiquement`);setTimeout(()=>{try{rsMarket('recalc');}catch(e){}},300);};
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='bpzadd'){bpFormKeep();const i=document.getElementById('bpz-in');bpZoneAdd(i&&i.value);renderBP();}
  else if(a==='bpzq'){bpFormKeep();const z=b.dataset.id,Z=ui.bpZones||(ui.bpZones=[]);const j=Z.indexOf(z);if(j>=0)Z.splice(j,1);else Z.push(z);renderBP();}
  else if(a==='bpzdel'){bpFormKeep();(ui.bpZones||[]).splice(+b.dataset.id,1);renderBP();}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='bpz-in'){e.preventDefault();bpFormKeep();bpZoneAdd(e.target.value);renderBP();setTimeout(()=>{const i=document.getElementById('bpz-in');if(i)i.focus();},30);}});
document.addEventListener('change',e=>{if(e.target&&e.target.id==='bp0sec'){const l=document.getElementById('bp0autre');if(l)l.hidden=e.target.value!=='__autre';}});
/* chiffres par zone dans l'étude de marché */
{const _rb=renderBP;renderBP=function(){_rb.apply(this,arguments);try{const P=document.getElementById('p-bp'),b=S.bp;if(!P||!bpStarted()||!Array.isArray(b.zones))return;
  const G=P.querySelector('.grid')||P,old=P.querySelector('#bpzones');if(old)old.remove();const Z=b.mktZones||[];
  const row=z=>{const m=Z.find(x=>x.zone.toLowerCase()===z.toLowerCase())||Z.find(x=>x.zone.toLowerCase().includes(z.toLowerCase())||z.toLowerCase().includes(x.zone.toLowerCase()));
    return`<tr><td>${esc(z)}</td><td class="n">${m&&m.tam!==null?nf(m.tam,m.tam<100?1:0)+' '+esc(m.unit)+' '+esc(m.cur):'—'}</td><td class="n">${m&&m.year?esc(m.year):''}</td><td class="n">${m&&m.cagr!==null?nf(m.cagr,1)+' %':'—'}</td><td>${m?esc(m.hz):''}</td><td class="wrap meta">${m?(m.src||[]).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc((s.url||'').replace(/^https?:\/\/(www\.)?/,'').split('/')[0])}</a>${s.quote?' « '+esc(String(s.quote).slice(0,140))+' »':''}`).join(' · ')+(m.note?' '+esc(m.note):''):'en attente de l\'étude'}</td></tr>`;};
  const h=`<div class="card s12" id="bpzones"><h2><span>Marché par zone <span class="meta">${esc(b.secLbl||'')} · ${b.zones.length} zone${b.zones.length>1?'s':''}</span></span><button class="btn sm pri noprint" data-act="rsbp">Relancer l'étude</button></h2>
    <div class="tw"><table class="tbl"><thead><tr><th>Zone</th><th class="n">Taille du marché</th><th class="n">Année</th><th class="n">Croissance annuelle</th><th>Horizon</th><th>Sources</th></tr></thead><tbody>${b.zones.map(row).join('')}</tbody></table></div>
    <p class="note">Chiffres lus par Claude sur des pages publiques, extrait cité pour chacun. Une zone sans chiffre publié reste vide.</p></div>`;
  const first=G.querySelector(':scope>.card');if(first)first.insertAdjacentHTML('afterend',h);else G.insertAdjacentHTML('afterbegin',h);}catch(e){console.error('bp zones',e);}};}
