/* ============ v7.1 (audit) : risque du patrimoine, traçabilité des forçages, fraîcheur des données, avertissement ============ */
/* ---- Concentration, exposition devises, contrepartie et stress tests (dashboard consolidé) ---- */
const STRESS_DEF={Actions:-25,ETF:-22,Crypto:-50,Commodities:-25,'Indices (CFD)':-25,'Devises (CFD)':-5,'Trading (CFD)':-20,Obligations:-5,'VMP / OPCVM':-15,'Private equity':-30,Options:-70,usd:-10};
function stressP(){if(!S.stress)S.stress=clone(STRESS_DEF);Object.keys(STRESS_DEF).forEach(k=>{if(S.stress[k]===undefined)S.stress[k]=STRESS_DEF[k];});return S.stress;}
function pfRisk(L){const P=stressP(),inv=L.filter(l=>l.cls!=='Cash'),V=sum(L.map(l=>l.val||0)),Vi=sum(inv.map(l=>l.val||0));
  /* Concentration : poids par actif (lignes regroupées par symbole) */
  const bySym={};inv.forEach(l=>{bySym[l.sym]=(bySym[l.sym]||0)+(l.val||0);});const W=Object.entries(bySym).map(([k,v])=>[k,Vi?v/Vi:0]).sort((a,b)=>b[1]-a[1]);
  const hhi=sum(W.map(([,w])=>w*w)),top5=sum(W.slice(0,5).map(([,w])=>w)),over10=W.filter(([,w])=>w>0.10);
  /* Devises */
  const byCcy={};L.forEach(l=>{const c=l.ccy||(l.pf==='Trading'?(S.mt5.ccy||'EUR'):'EUR');byCcy[c]=(byCcy[c]||0)+(l.val||0);});
  /* Contrepartie : encours par plateforme, repères de garantie FGDR (espèces 100 000 €, titres 70 000 € par établissement ; crypto non couverte) */
  const byBr={};L.forEach(l=>{const b=l.br||'Non affecté';byBr[b]=byBr[b]||{cash:0,sec:0,cry:0};if(l.cls==='Cash')byBr[b].cash+=l.val||0;else if(l.cls==='Crypto')byBr[b].cry+=l.val||0;else byBr[b].sec+=l.val||0;});
  /* Stress : choc par classe ; positions de trading chocées sur leur exposition notionnelle et dans leur sens */
  const st=L.map(l=>{if(l.cls==='Cash')return 0;const sh=(+P[l.cls]||0)/100;let d;
    if(l.pf==='Trading'&&isFinite(l.expo)){const dir=/^Vente/.test(l.name||'')?-1:1;d=l.expo*sh*dir;}else d=(l.val||0)*sh;
    if((l.ccy==='USD')&&l.pf!=='Trading')d+=((l.val||0)+d)*(+P.usd||0)/100;return d;});
  const loss=sum(st);return{V,Vi,W,hhi,eff:hhi?1/hhi:NaN,top5,over10,byCcy,byBr,loss,lossPct:V?loss/V*100:NaN,st};}
function pfRiskCard(L){const R=pfRisk(L),P=stressP(),cls=[...new Set(L.filter(l=>l.cls!=='Cash').map(l=>l.cls))];
  const brRows=Object.entries(R.byBr).filter(([,x])=>x.cash+x.sec+x.cry>0).map(([b,x])=>{const fl=[];if(x.cash>100000)fl.push('espèces > 100 000 €');if(x.sec>70000)fl.push('titres > 70 000 €');if(x.cry>0)fl.push('crypto non couverte');return`<tr><td>${esc(b)}</td><td class="n">${big(x.cash)}</td><td class="n">${big(x.sec)}</td><td class="n">${big(x.cry)}</td><td>${fl.length?`<span class="tag am">${fl.join(' · ')}</span>`:'<span class="tag ok">dans les plafonds</span>'}</td></tr>`;}).join('');
  return`<div class="card s6"><h2><span>Concentration et devises <span class="meta">lignes investies, trading inclus (marge)</span></span></h2>
    <div class="stats" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat"><div class="k">Nombre effectif de lignes</div><div class="x ${R.eff<8?'amb':''}">${nf(R.eff,1)}</div><div class="d">1 / HHI · ${R.W.length} lignes détenues</div></div>
      <div class="stat"><div class="k">Poids des 5 premières</div><div class="x ${R.top5>.6?'amb':''}">${pct(R.top5*100,0)}</div><div class="d">${R.W.slice(0,3).map(([k])=>esc(k)).join(', ')}…</div></div>
      <div class="stat"><div class="k">Lignes au-delà de 10 %</div><div class="x ${R.over10.length?'down':'up'}">${R.over10.length}</div><div class="d">${R.over10.map(([k,w])=>esc(k)+' '+pct(w*100,0)).join(', ')||'aucune'}</div></div></div>
    <h3 class="h3">Exposition par devise</h3>${hbars(Object.entries(R.byCcy).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>({l:k,v:R.V?v/R.V*100:0,hl:i===0})),{fmt:v=>pct(v,1)})}
    <p class="note">Repère de diversification : règle 5/10/40 des OPCVM coordonnés (une ligne au plus à 10 %, les lignes de plus de 5 % ne dépassant pas 40 % ensemble). Un nombre effectif de lignes inférieur à 8 signale un portefeuille concentré.</p></div>
  <div class="card s6"><h2><span>Stress test <span class="meta">choc instantané et simultané, hypothèses modifiables</span></span><span class="x ${R.loss<0?'down':''}" style="font:600 15px var(--sans)">${big(R.loss)} · ${pct(R.lossPct,1)}</span></h2>
    <div class="tw"><table class="tbl"><thead><tr><th>Classe</th><th class="n">Choc</th><th class="n">Impact</th></tr></thead><tbody>
      ${cls.map(c=>{const imp=sum(L.map((l,i)=>l.cls===c?R.st[i]:0));return`<tr><td>${esc(c)}</td><td class="n">${fld('stress.'+c,'n',{al:'Choc '+c+' (%)'})} %</td><td class="n ${imp<0?'down':''}">${big(imp)}</td></tr>`;}).join('')}
      <tr><td>Dollar contre euro (lignes en USD)</td><td class="n">${fld('stress.usd','n',{al:'Choc USD (%)'})} %</td><td class="n">inclus ci-dessus</td></tr></tbody></table></div>
    <p class="note">Hypothèses par défaut de l'ordre des corrections sévères observées historiquement, à adapter. Les positions de trading sont chocées sur leur exposition notionnelle (une vente gagne quand le marché baisse) : la perte peut dépasser la marge engagée.</p>
    <h3 class="h3">Risque de contrepartie</h3><div class="tw"><table class="tbl"><thead><tr><th>Plateforme</th><th class="n">Espèces</th><th class="n">Titres</th><th class="n">Crypto</th><th>Garantie FGDR</th></tr></thead><tbody>${brRows||'<tr><td colspan="5" class="meta">Aucun encours.</td></tr>'}</tbody></table></div>
    <p class="note">Plafonds du Fonds de garantie des dépôts et de résolution pour un établissement français : 100 000 € d'espèces et 70 000 € de titres par client. Un courtier étranger relève du système de son pays ; les actifs crypto ne sont pas couverts.</p></div>`;}

/* ---- Journal des forçages (piste d'audit) ---- */
const AUD_OLD={};
function auditLog(k,old,nw,how){if(JSON.stringify(old)===JSON.stringify(nw))return;S.audit=S.audit||[];
  const el=document.querySelector(`[data-k="${CSS.escape(k)}"],[data-lk="${CSS.escape(k)}"]`),lab=el&&el.getAttribute('aria-label')||k;
  S.audit.unshift({at:new Date().toISOString(),tab:ui.tab,k,l:lab,o:old,n:nw,h:how});if(S.audit.length>1000)S.audit.length=1000;save();}
document.addEventListener('focusin',e=>{const el=e.target,k=el&&el.dataset&&(el.dataset.k||el.dataset.lk);if(k&&AUD_OLD[k]===undefined)AUD_OLD[k]=clone(getP(S,k)??null);});
document.addEventListener('change',e=>{const el=e.target,k=el&&el.dataset&&(el.dataset.k||el.dataset.lk);if(!k||AUD_OLD[k]===undefined)return;const o=AUD_OLD[k];delete AUD_OLD[k];
  setTimeout(()=>auditLog(k,o,clone(getP(S,k)??null),el.dataset.pen?'crayon':ui.edit?'mode Override':'saisie'),0);});
document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('[data-act="penreset"]');if(!b)return;const k=b.dataset.k,o=clone(getP(S,k)??null);
  setTimeout(()=>auditLog(k,o,clone(getP(S,k)??null),'valeur de référence rétablie'),0);},true);
const audFmt=v=>v===null||v===undefined||v===''?'—':typeof v==='object'?JSON.stringify(v).slice(0,60):String(v).slice(0,80);
const MODN={bp:'Business plan',an:'Analyse financière',sc:'Sélecteur',lbo:'Dossier LBO',pf:'Suivi & placements',cm:'Commodities',pc:'Calculateur',jr:'Journal'};

/* ---- Fraîcheur des données ---- */
function dataFresh(){const t=new Date(),age=d=>{const x=new Date(String(d).slice(0,10)+'T00:00:00');return isNaN(x)?NaN:Math.round((t-x)/864e5);},R=[];
  if(typeof CMD==='object'){const extra=Object.values((S.cm.add||{}).brent||{}).length?Object.keys(S.cm.add.brent).sort().pop():null,d=[CMD.d[CMD.d.length-1],extra].filter(Boolean).sort().pop();R.push(['Commodities (Brent, WTI, Or, Argent)',d,age(d),7,'Importer un export ou lancer la collecte IA']);}
  const px=Object.values(S.an.assets||{}).map(a=>{const m=String(a.pxDate||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:String(a.pxDate||'').slice(0,10);}).filter(x=>/^\d{4}/.test(x)).sort();
  if(px.length)R.push(['Cours des titres analysés (le plus ancien)',px[0],age(px[0]),7,'Collecte IA du cours ou saisie au crayon']);
  if(typeof LBO_SRC==='object'&&LBO_SRC.euribor){const m=String(LBO_SRC.euribor.d||'').match(/(\d{2})\/(\d{2})\/(\d{4})/),d=m?`${m[3]}-${m[2]}-${m[1]}`:'';if(d)R.push(['Euribor 3 mois',d,age(d),31,'Collecte IA (euribor-rates.eu)']);}
  if(typeof FX_DATE==='string'){const m=FX_DATE.match(/(\d{2})\/(\d{2})\/(\d{4})/),d=m?`${m[3]}-${m[2]}-${m[1]}`:'';if(d)R.push(['EUR/USD (BCE)',d,age(d),7,'Collecte IA (BCE) ou flux live']);}
  R.push(['Repères sectoriels (Damodaran)','2026-01-05',age('2026-01-05'),400,'Mise à jour annuelle en janvier']);
  return R;}
function renderQA(){const el=document.getElementById('qa');if(!el)return;if(!ui.qaOpen){el.hidden=true;return;}el.hidden=false;const A=S.audit||[],tab=ui.qaT||'fresh',F=dataFresh();
  el.innerHTML=`<div class="ai-box" role="dialog" aria-label="Contrôle qualité"><div class="ai-h"><b>Contrôle qualité</b><span class="seg" role="tablist"><button role="tab" data-act="qat" data-id="fresh" aria-selected="${tab==='fresh'}">Fraîcheur des données</button><button role="tab" data-act="qat" data-id="log" aria-selected="${tab==='log'}">Journal des forçages (${A.length})</button></span><button class="btn sm" data-act="qaclose">Fermer</button></div>
    ${tab==='fresh'?`<div class="tw"><table class="tbl"><thead><tr><th>Donnée</th><th>Date</th><th class="n">Âge</th><th>État</th><th>Mise à jour</th></tr></thead><tbody>${F.map(([l,d,a,lim,how])=>`<tr><td>${l}</td><td>${fdate(d)}</td><td class="n">${isFinite(a)?a+' j':'—'}</td><td><span class="tag ${a>lim*4?'ko':a>lim?'am':'ok'}">${a>lim*4?'périmée':a>lim?'à actualiser':'à jour'}</span></td><td class="meta">${how}</td></tr>`).join('')}</tbody></table></div>
      <p class="note">Seuils : 7 jours pour les cours et changes, 31 jours pour les taux, un an pour les repères sectoriels. Une donnée périmée reste utilisée telle quelle : vérifiez-la avant toute décision.</p>`
    :`<div class="row" style="margin-bottom:8px"><button class="btn sm" data-act="qacopy"${A.length?'':' disabled'}>Copier au format CSV</button><button class="btn sm" data-act="qaclear"${A.length?'':' disabled'}>Vider le journal</button><span class="meta">les 1 000 dernières modifications, conservées dans ce navigateur</span></div>
      ${A.length?`<div class="tw" style="max-height:60vh;overflow:auto"><table class="tbl"><thead><tr><th>Date</th><th>Volet</th><th>Variable</th><th>Avant</th><th>Après</th><th>Mode</th></tr></thead><tbody>${A.slice(0,300).map(x=>`<tr><td class="num">${new Date(x.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</td><td>${MODN[x.tab]||x.tab}</td><td>${esc(x.l)}<div class="meta" style="font-size:10.5px">${esc(x.k)}</div></td><td class="num">${esc(audFmt(x.o))}</td><td class="num">${esc(audFmt(x.n))}</td><td class="meta">${esc(x.h)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="note">Aucune modification enregistrée depuis l\'activation du journal.</p>'}`}</div>`;}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;
  switch(b.dataset.act){case 'qaopen':ui.qaOpen=true;renderQA();break;case 'qaclose':ui.qaOpen=false;renderQA();break;case 'qat':ui.qaT=b.dataset.id;renderQA();break;
    case 'qaclear':if(confirm('Vider le journal des forçages ?')){S.audit=[];save();renderQA();}break;
    case 'qacopy':{const q=v=>'"'+String(v).replace(/"/g,'""')+'"',csv=['date;volet;variable;chemin;avant;après;mode',...(S.audit||[]).map(x=>[x.at,MODN[x.tab]||x.tab,x.l,x.k,audFmt(x.o),audFmt(x.n),x.h].map(q).join(';'))].join('\n');
      (navigator.clipboard?navigator.clipboard.writeText(csv):Promise.reject()).then(()=>toast('Journal copié (CSV)'),()=>toast('Copie impossible dans ce navigateur'));break;}}});

/* ---- Avertissement réglementaire et accès au contrôle qualité, ajoutés après chaque rendu ---- */
const DISCLAIMER="Outil d'aide à la décision. Les analyses, scores et verdicts ne constituent ni un conseil en investissement ni une recommandation personnalisée ; ils dépendent des hypothèses saisies et des sources citées, à vérifier avant toute décision.";
function qaDecorate(){const st=document.getElementById('status');if(st&&!st.querySelector('.qa-b')){const b=document.createElement('button');b.className='qa-b noprint';b.dataset.act='qaopen';
    const F=dataFresh(),bad=F.filter(([, ,a,lim])=>a>lim).length;b.innerHTML=`<span class="dot ${bad?'am':'ok'}"></span>Contrôle qualité${bad?` · ${bad} donnée${bad>1?'s':''} à actualiser`:''}`;st.appendChild(b);}
  const m=document.getElementById('main');if(m&&!m.querySelector('.disc')){const d=document.createElement('p');d.className='disc';d.textContent=DISCLAIMER;m.appendChild(d);}
  renderQA();}
if(typeof renderAll==='function'){const _ra=renderAll;renderAll=function(){_ra.apply(this,arguments);qaDecorate();};qaDecorate();}
