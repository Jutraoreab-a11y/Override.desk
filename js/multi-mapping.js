/* ============ v8 : mapping multi-actifs, filtres quantitatifs et quadrants dynamiques (moteur anti-FOMO) ============ */
/* Quatre univers : actions (comptes publiés du volet Analyse financière), ETF (Tiingo), cryptos (CoinGecko),
   commodities et macro (cours du volet 5). Chaque point est cliquable : une action ouvre son analyse financière,
   un ETF, une crypto ou une commodity ouvre un panneau latéral. Rien n'est appelé au rendu : lecture des données locales, 0 jeton. */
const MM_CLS=[['stk','📈 Actions'],['etf','🌐 ETF'],['cry','⚡ Cryptos'],['cmd','🛢️ Commodities / Macro']];
const MM_H={stk:[1,3,5],etf:[1,2,5,10,20,30],cry:['30j','200j','1an'],cmd:[1,'max']};
/* Axes : inv = le risque ou la cherté se lit à gauche, pour que le quadrant supérieur droit regroupe les surperformeurs */
const MM_AX={
  stk:{x:{per:['PER',1,'×'],evE:['VE / EBITDA',1,'×'],evS:['VE / CA',1,'×'],pb:['Cours / actif net',1,'×']},y:{cagr:['Croissance du CA annualisée',0,'%'],em:['Marge EBITDA',0,'%'],nm:['Marge nette',0,'%'],fcfY:['Rendement FCF',0,'%'],score:["Score de l'analyse",0,'/100']}},
  etf:{x:{vol:['Volatilité annualisée',1,'%'],dd:['Pire perte (mois ou année)',1,'%']},y:{cagr:['Performance annualisée',0,'%']}},
  cry:{x:{dd:['Repli depuis le plus haut historique',1,'%'],fdvR:['FDV / capitalisation (dilution)',1,'×'],vel:['Vélocité (volume 24 h / capitalisation)',0,'%']},y:{p:['Performance sur la période',0,'%']}},
  cmd:{x:{vol:['Volatilité annualisée',1,'%']},y:{ret:['Performance annualisée',0,'%']}}};
function mmS(){if(!S.mm)S.mm={};const M=S.mm;M.cls=M.cls||'stk';M.f=M.f||{};MM_CLS.forEach(([k])=>{M.f[k]=M.f[k]||{};});
  M.h=M.h||{stk:3,etf:5,cry:'1an',cmd:1};M.x=M.x||{stk:'per',etf:'vol',cry:'dd',cmd:'vol'};M.y=M.y||{stk:'cagr',etf:'cagr',cry:'p',cmd:'ret'};M.th=M.th||{};return M;}
const mmNum=v=>v===''||v===null||v===undefined||!isFinite(+v)?null:+v;
const mmYrs=(a,b)=>(Date.parse(b)-Date.parse(a))/(365.25*864e5);

/* ---- Lignes par univers ---- */
function mmStocks(h){const A=S.an.assets;return Object.keys(A).map(k=>{const a=A[k],b=anBase(a),R=anCalc(k),L=b.L;
  const eq=a.roe&&a.roe[L]?a.ni[L]/(a.roe[L]/100):NaN,cg=n=>L>=n&&a.rev[L-n]>0?((a.rev[L]/a.rev[L-n])**(1/n)-1)*100:NaN;
  return{id:k,l:a.t,n:a.n,g:a.sec,m:{per:b.per,evE:b.evE,evS:b.evR/a.rev[L],pb:eq>0?b.capR/eq:NaN,cagr:cg(h),em:b.em[L],nm:a.ni[L]/a.rev[L]*100,fcfY:b.fcfY,score:R.score,
    cap:b.capEUR/1e3,adv:mmNum(a.adv)},note:L<h?`historique de ${L+1} exercices : croissance sur ${h} ans non calculable`:''};});}
function mmEtfPerf(e,h){const last=ETF_U.last,m=e.m||[],y0=e.y0,v=e.v;
  const mDate=i=>{const y=2024+Math.floor((9+i)/12),mo=(9+i)%12+1,dd=new Date(Date.UTC(y,mo,0)).getUTCDate();return`${y}-${String(mo).padStart(2,'0')}-${dd}`;};
  if(h<=2){const i0=h===1?12:0;if(m.length<26)return{};const yrs=mmYrs(mDate(i0),last),r=[];for(let i=i0+1;i<m.length;i++)r.push(m[i]/m[i-1]-1);
    return{cagr:((m[m.length-1]/m[i0])**(1/yrs)-1)*100,vol:macSd(r)*Math.sqrt(12)*100,dd:-Math.min(...r)*100,yrs,from:mDate(i0),n:r.length,base:'mensuel'};}
  const ys=2026-h,i=ys-y0;if(i<0)return{na:`historique depuis ${y0+1} seulement`};
  const yrs=mmYrs(`${ys}-12-31`,last),r=[];for(let j=i+1;j<v.length-1;j++)r.push(v[j]/v[j-1]-1);
  return{cagr:((v[v.length-1]/v[i])**(1/yrs)-1)*100,vol:r.length>2?macSd(r)*100:NaN,dd:r.length?-Math.min(...r)*100:NaN,yrs,from:`${ys}-12-31`,n:r.length,base:'annuel'};}
function mmEtfs(h){return Object.entries(ETF_U.d).map(([k,e])=>{const p=mmEtfPerf(e,h);return{id:k,l:k,n:e.n,g:e.th,geo:e.geo,grp:e.grp,m:{cagr:p.cagr,vol:p.vol,dd:p.dd},p,note:p.na||''};});}
function mmCryptos(h){const f=h==='30j'?'p30':h==='200j'?'p200':'p1y';return CRYPTO_U.d.map(c=>({id:c.sym,l:c.sym,n:c.name,g:c.nar,
  m:{p:c[f],dd:(1-c.px/c.ath)*100,fdvR:c.fdv/c.mc,vel:c.vol/c.mc*100,cap:c.mc/1e9},c}));}
function mmCmds(h){const s=cmSeries(),last=s.d[s.d.length-1],from=h===1?new Date(Date.parse(last)-365.25*864e5).toISOString().slice(0,10):s.d[0];
  const L={brent:'Brent daté',wti:'WTI Cushing',gold:'Or comptant',silver:'Argent comptant',cnh:'USD/CNH',spx:'S&P 500'};
  return Object.keys(L).map(k=>{const P=s.d.map((d,i)=>[d,s[k][i]]).filter(([d,v])=>d>=from&&nn(v));if(P.length<40)return null;
    const r=[];for(let i=1;i<P.length;i++)r.push(Math.log(P[i][1]/P[i-1][1]));const yrs=mmYrs(P[0][0],P[P.length-1][0]);
    return{id:k,l:L[k],n:L[k],g:k==='cnh'||k==='spx'?'Macro':'Commodity',m:{ret:((P[P.length-1][1]/P[0][1])**(1/yrs)-1)*100,vol:macSd(r)*Math.sqrt(252)*100},
      p:{from:P[0][0],to:P[P.length-1][0],n:P.length,yrs},note:P[P.length-1][0]<last?`série arrêtée au ${fdate(P[P.length-1][0])}`:''};}).filter(Boolean);}
function mmRows(cls){const M=mmS(),h=M.h[cls];return cls==='stk'?mmStocks(h):cls==='etf'?mmEtfs(h):cls==='cry'?mmCryptos(h):mmCmds(h);}

/* ---- Filtres (bornes min / max) ---- */
const MM_F={stk:[['evE','VE / EBITDA','×'],['per','PER','×'],['pb','Cours / actif net','×',1],['evS','VE / CA','×',1],['cagr','Croissance du CA','%',0,1],['em','Marge EBITDA','%',0,1],['nm','Marge nette','%',0,1],['fcfY','Rendement FCF','%',0,1],['cap','Capitalisation','Md€'],['adv','Volume moyen quotidien','M€',0,1]],
  etf:[['cagr','Performance annualisée','%',0,1],['vol','Volatilité annualisée','%',1]],
  cry:[['p','Performance','%',0,1],['cap','Capitalisation','Md$',0,1],['fdvR','FDV / capitalisation','×',1],['vel','Vélocité 24 h','%',0,1]],
  cmd:[['ret','Performance annualisée','%',0,1],['vol','Volatilité annualisée','%',1]]};
function mmPass(r,cls){const F=mmS().f[cls];for(const[k]of MM_F[cls]){const lo=mmNum(F[k+'Min']),hi=mmNum(F[k+'Max']),v=r.m[k];
    if(lo===null&&hi===null)continue;if(!isFinite(v)&&v!==0)return[false,k];if(lo!==null&&v<lo)return[false,k];if(hi!==null&&v>hi)return[false,k];}
  if(cls==='cry'&&F.nar&&F.nar.length&&!F.nar.includes(r.g))return[false,'nar'];if(cls==='etf'&&F.grp&&F.grp.length&&!F.grp.includes(r.grp))return[false,'grp'];return[true];}

/* ---- Quadrant dynamique en unités réelles ---- */
function mmScatter(P,o){const W=420,H=300,L=40,R=12,T=12,B=36,iw=W-L-R,ih=H-T-B;if(!P.length)return'<p class="note">Aucun actif ne passe les filtres.</p>';
  const xs=P.map(p=>p.x),ys=P.map(p=>p.y),pad=(a,b)=>{const d=(b-a)||Math.abs(a)||1;return[a-d*.08,b+d*.08];};
  const[x0,x1]=pad(Math.min(...xs,o.tx),Math.max(...xs,o.tx)),[y0,y1]=pad(Math.min(...ys,o.ty),Math.max(...ys,o.ty));
  const X=v=>o.inv?L+(x1-v)/(x1-x0)*iw:L+(v-x0)/(x1-x0)*iw,Y=v=>T+ih-(v-y0)/(y1-y0)*ih,tx=X(o.tx),ty=Y(o.ty);
  const tk=(a,b)=>{const st=Math.pow(10,Math.floor(Math.log10((b-a)/4||1))),k=[1,2,5,10].find(m=>(b-a)/(st*m)<=6)*st,o2=[];for(let v=Math.ceil(a/k)*k;v<=b;v+=k)o2.push(+v.toFixed(6));return o2;};
  let s=`<svg class="sc mm" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title)}"><rect x="${tx}" y="${T}" width="${L+iw-tx}" height="${ty-T}" class="qhi"/><rect x="${L}" y="${T}" width="${iw}" height="${ih}" class="frame"/>
    <line x1="${tx}" y1="${T}" x2="${tx}" y2="${T+ih}" class="mid"/><line x1="${L}" y1="${ty}" x2="${L+iw}" y2="${ty}" class="mid"/>
    <text x="${L+iw-6}" y="${T+13}" class="ql" text-anchor="end">Surperformeurs</text><text x="${L+6}" y="${T+13}" class="ql">Momentum risqué (FOMO ?)</text><text x="${L+6}" y="${T+ih-6}" class="ql">À écarter</text><text x="${L+iw-6}" y="${T+ih-6}" class="ql" text-anchor="end">Défensifs sans moteur</text>`;
  tk(x0,x1).forEach(v=>{s+=`<text x="${X(v)}" y="${T+ih+12}" class="ax" text-anchor="middle">${nf(v,Math.abs(v)<10&&v%1?1:0)}</text>`;});tk(y0,y1).forEach(v=>{s+=`<text x="${L-5}" y="${Y(v)+3}" class="ax" text-anchor="end">${nf(v,Math.abs(v)<10&&v%1?1:0)}</text>`;});
  s+=`<text x="${L+iw/2}" y="${H-4}" class="at" text-anchor="middle">${esc(o.xl)}</text><text transform="translate(10 ${T+ih/2}) rotate(-90)" class="at" text-anchor="middle">${esc(o.yl)}</text>`;
  const placed=[];P.map(p=>({p,cx:X(p.x),cy:Y(p.y)})).sort((a,b)=>a.cy-b.cy).forEach(({p,cx,cy})=>{const r=p.r||4,right=cx>W-80,lx=right?cx-r-4:cx+r+4,w=p.label.length*4.6;let ly=cy+3;
    const xa=right?lx-w:lx,hit=()=>placed.find(q=>Math.abs(q.ly-ly)<10&&xa<q.x0+q.w&&q.x0<xa+w);for(let n=0;n<8&&hit();n++)ly+=9;placed.push({x0:xa,w,ly});
    s+=`<g class="pt ${p.cls||''}" data-act="mmpt" data-id="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.aria||p.label)}"><circle cx="${cx}" cy="${cy}" r="${r}"/><text x="${lx}" y="${ly}" text-anchor="${right?'end':'start'}">${esc(p.label)}</text></g>`;});
  return s+'</svg>';}
const mmMed=a=>{const b=a.filter(isFinite).sort((x,y)=>x-y),n=b.length;return n?(n%2?b[(n-1)/2]:(b[n/2-1]+b[n/2])/2):NaN;};
function mmQuad(cls){const M=mmS(),ax=MM_AX[cls],xk=ax.x[M.x[cls]]?M.x[cls]:Object.keys(ax.x)[0],yk=ax.y[M.y[cls]]?M.y[cls]:Object.keys(ax.y)[0],[xl,inv,xu]=ax.x[xk],[yl,,yu]=ax.y[yk];
  const rows=mmRows(cls),pass=rows.map(r=>({r,ok:mmPass(r,cls)})),In=pass.filter(x=>x.ok[0]&&isFinite(x.r.m[xk])&&isFinite(x.r.m[yk])).map(x=>x.r);
  const T=M.th[cls]||{},tx=mmNum(T.x)??mmMed(In.map(r=>r.m[xk])),ty=mmNum(T.y)??mmMed(In.map(r=>r.m[yk]));
  const fav=r=>inv?r.m[xk]<=tx:r.m[xk]>=tx,top=r=>r.m[yk]>=ty,q3=mmMed(In.filter(top).map(r=>r.m[yk]));
  In.forEach(r=>{r.q=top(r)&&fav(r)?'out':top(r)?'fomo':fav(r)?'def':'off';r.hot=r.q==='fomo'&&r.m[yk]>=q3;});
  const sel=ui.mmSel&&ui.mmSel.cls===cls?ui.mmSel.id:null,me=cls==='stk'?ui.tk:null;
  const pts=In.map(r=>({x:r.m[xk],y:r.m[yk],id:r.id,label:r.l+(r.hot?' ⚠':''),aria:`${r.n} : ${xl} ${nf(r.m[xk],1)}, ${yl} ${nf(r.m[yk],1)}`,r:cls==='cry'||cls==='stk'?4+clamp(Math.log10(Math.max(r.m.cap||1,1)),0,4):4.5,
    cls:(r.q==='out'?'ok':r.q==='fomo'?'am':r.q==='off'?'ko':'')+(r.id===sel||r.id===me?' sel':'')}));
  return{rows,pass,In,xk,yk,xl,yl,xu,yu,inv,tx,ty,pts};}

/* ---- Rendu ---- */
function mmBar(){const M=mmS();return`<div class="seg mmbar" role="tablist" aria-label="Univers d'analyse">${MM_CLS.map(([k,l])=>`<button role="tab" data-act="mmcls" data-id="${k}" aria-selected="${M.cls===k}">${l}</button>`).join('')}</div>`;}
function mmFilters(cls){const M=mmS(),F=M.f[cls],ax=MM_AX[cls],hz=MM_H[cls];
  const inp=(k,lab,u,onlyMax,onlyMin)=>`<div class="mmf-r"><span>${lab} <em class="meta">${u}</em></span><span>${onlyMax?'':`<input class="f mmf" data-k="${k}Min" inputmode="decimal" placeholder="min" value="${F[k+'Min']??''}" aria-label="${esc(lab)} minimum">`}${onlyMin?'':`<input class="f mmf" data-k="${k}Max" inputmode="decimal" placeholder="max" value="${F[k+'Max']??''}" aria-label="${esc(lab)} maximum">`}</span></div>`;
  const sel=(w,o)=>`<select class="f mmax" data-w="${w}" aria-label="Axe ${w==='x'?'horizontal':'vertical'}">${Object.entries(o).map(([k,[l]])=>`<option value="${k}"${M[w][cls]===k?' selected':''}>${l}</option>`).join('')}</select>`;
  const chips=(lab,list,key)=>`<div class="mmf-g"><b>${lab}</b><div class="chips">${list.map(v=>`<button class="chip" data-act="mmtog" data-k="${key}" data-id="${esc(v)}" aria-pressed="${(F[key]||[]).includes(v)}">${esc(v)}</button>`).join('')}</div></div>`;
  return`<aside class="mmside"><div class="mmf-g"><b>Axes du quadrant</b><label class="mmf-r"><span>X</span>${sel('x',ax.x)}</label><label class="mmf-r"><span>Y</span>${sel('y',ax.y)}</label></div>
    <div class="mmf-g"><b>${cls==='stk'?'Horizon de croissance':'Bornage temporel'}</b><div class="chips">${hz.map(v=>`<button class="chip" data-act="mmh" data-id="${v}" aria-pressed="${String(M.h[cls])===String(v)}">${v==='max'?'Max':typeof v==='number'?v+' an'+(v>1?'s':''):v}</button>`).join('')}</div></div>
    <div class="mmf-g"><b>${cls==='stk'?'Multiples, santé et taille':'Filtres quantitatifs'}</b>${MM_F[cls].map(f=>inp(...f)).join('')}</div>
    ${cls==='cry'?chips('Narratifs',['L1','DeFi','RWA','AI'],'nar'):''}${cls==='etf'?chips('Familles',[...new Set(Object.values(ETF_U.d).map(e=>e.grp))],'grp'):''}
    <div class="mmf-g"><b>Seuils des quadrants</b><div class="mmf-r"><span>X <em class="meta">vide = médiane</em></span><span><input class="f mmth" data-w="x" inputmode="decimal" value="${(M.th[cls]||{}).x??''}" aria-label="Seuil X"></span></div><div class="mmf-r"><span>Y <em class="meta">vide = médiane</em></span><span><input class="f mmth" data-w="y" inputmode="decimal" value="${(M.th[cls]||{}).y??''}" aria-label="Seuil Y"></span></div></div>
    <button class="btn sm" data-act="mmreset">Réinitialiser les filtres</button></aside>`;}
function mmSide(cls,Q){const s=ui.mmSel;if(!s||s.cls!==cls)return'';const r=Q.rows.find(x=>x.id===s.id);if(!r)return'';
  const row=(l,v)=>`<div class="kv"><span>${l}</span><b>${v}</b></div>`;let body='',src='';
  if(cls==='etf'){const e=ETF_U.d[r.id],hs=MM_H.etf.map(h=>[h,mmEtfPerf(e,h)]);
    body=`<div class="meta">${esc(e.th)} · ${esc(e.geo)} · ${esc(e.grp)}</div>${row('Dernier cours ajusté',nf(e.v[e.v.length-1],2)+' USD')}
      <div class="tw"><table class="tbl"><thead><tr><th>Horizon</th><th class="n">Perf. ann.</th><th class="n">Vol.</th><th class="n">Pire</th></tr></thead><tbody>${hs.map(([h,p])=>`<tr><td>${h} an${h>1?'s':''}</td>${p.na?`<td colspan="3" class="meta">${esc(p.na)}</td>`:`<td class="n ${cls_(p.cagr)}">${sgn(p.cagr,1)}</td><td class="n">${nf(p.vol,1)} %</td><td class="n down">−${nf(p.dd,1)} %</td>`}</tr>`).join('')}</tbody></table></div>
      ${colChart(e.v.map((_,i)=>String(e.y0+i).slice(2)),e.v,{})}<p class="note">Clôtures de fin d'année ajustées des dividendes (dernière barre : ${fdate(ETF_U.last)}). Volatilité : écart-type des rendements mensuels annualisé (1-2 ans) ou des rendements annuels (5 ans et plus). « Pire » : pire mois (1-2 ans) ou pire année.</p>`;src=ETF_U.src;}
  else if(cls==='cry'){const c=r.c;body=`<div class="meta">Narratif ${esc(c.nar)}</div>${row('Cours',nf(c.px,c.px<1?4:2)+' USD')}${row('Capitalisation',nf(c.mc/1e9,2)+' Md$')}${row('FDV',nf(c.fdv/1e9,2)+' Md$ ('+nf(c.fdv/c.mc,2)+' ×)')}
      ${row('Volume 24 h',nf(c.vol/1e6,0)+' M$ · vélocité '+nf(c.vol/c.mc*100,2)+' %')}${row('Offre en circulation',nf(c.circ/1e6,1)+' M'+(c.max?' / max '+nf(c.max/1e6,1)+' M':' (pas de plafond)'))}
      ${row('Plus haut historique',nf(c.ath,c.ath<1?4:2)+' USD ('+fdate(c.athD)+') · '+sgn((c.px/c.ath-1)*100,1))}${row('30 j / 200 j / 1 an',`${sgn(c.p30,1)} · ${sgn(c.p200,1)} · ${sgn(c.p1y,1)}`)}
      <p class="note">FDV / capitalisation au-dessus de 1,5 : une part importante de l'offre reste à émettre (pression vendeuse potentielle). Vélocité : rotation quotidienne de la capitalisation, mesure de liquidité.</p>`;src=CRYPTO_U.src+', '+new Date(CRYPTO_U.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}
  else if(cls==='cmd'){body=`${row('Période',fdate(r.p.from)+' → '+fdate(r.p.to)+' ('+r.p.n+' séances)')}${row('Performance annualisée',sgn(r.m.ret,1))}${row('Volatilité annualisée',nf(r.m.vol,1)+' %')}${r.note?`<p class="note down">${esc(r.note)}</p>`:''}
      ${['brent','wti','gold','silver'].includes(r.id)?`<button class="btn sm pri" data-act="mmgocm" data-id="${r.id==='wti'?'brent':r.id}">Ouvrir dans Commodities & flows</button>`:''}`;src='Cours du volet 5 (classeur Investing.com, EODHD, FRED / EIA)';}
  return`<aside class="mmpanel" aria-label="Fiche ${esc(r.n)}"><div class="row" style="justify-content:space-between"><b>${esc(r.n)} <span class="meta">${esc(r.l)}</span></b><button class="btn sm" data-act="mmselx" aria-label="Fermer la fiche">×</button></div>${body}<p class="note">Source : ${esc(src)}</p></aside>`;}
const cls_=v=>isFinite(v)?(v>=0?'up':'down'):'';
function mmCmdTable(){const C=cmCalc(),r=C.R[C.N-1],E=gsEngine(C),last=k=>{for(let i=C.N-1;i>=0;i--)if(nn(C.R[i][k]))return C.R[i];return null;},P=cmP();
  const t=(l,k,dg,st)=>{const x=last(k);return`<tr><td>${l}</td><td class="n">${x?nf(x[k],dg):'—'}</td><td class="meta">${x?fdate(x.d):''}</td><td class="meta">${x&&st?esc(x[st]):''}</td></tr>`;};
  return`<div class="card s12"><h2><span>Spreads, basis et Z-scores <span class="meta">dernière valeur disponible de chaque indicateur</span></span></h2><div class="tw"><table class="tbl"><thead><tr><th>Indicateur</th><th class="n">Valeur</th><th>Séance</th><th>État</th></tr></thead><tbody>
    ${t('Spread Brent daté − WTI (USD)','spread',2,'spSt')}${t('Basis Brent spot − futur M1','bB',2,'bBSt')}${t('Basis or','bG',2,'bGSt')}${t('Basis argent','bS',3,'bSSt')}${t(`Z-score du spread ${P.zWin} j`,'zSp',2)}${t('Ratio or / argent','gs',1)}
    <tr><td>Z-score du ratio or / argent 20 j / 60 j</td><td class="n">${nf(E.L.z20,2)} / ${nf(E.L.z60,2)}</td><td class="meta">${fdate(E.L.d)}</td><td class="meta">${esc(E.lag[1])}</td></tr>
    <tr><td>Volatilité 20 j Brent / or (annualisée)</td><td class="n">${(()=>{const s=C.s,v=k=>{const a=s[k].map((x,i)=>i&&nn(x)&&nn(s[k][i-1])?Math.log(x/s[k][i-1]):null).filter(x=>x!==null).slice(-20);return a.length>5?nf(macSd(a)*Math.sqrt(252)*100,1)+' %':'—';};return v('brent')+' / '+v('gold');})()}</td><td class="meta"></td><td class="meta">écart-type des 20 dernières séances disponibles</td></tr>
  </tbody></table></div></div>`;}
function mmHTML(){const M=mmS(),cls=M.cls,Q=mmQuad(cls),ax=MM_AX[cls],h=M.h[cls];
  const out=Q.In.filter(r=>r.q==='out'),hot=Q.In.filter(r=>r.hot),ex=Q.pass.filter(x=>!x.ok[0]).length,na=Q.rows.length-Q.In.length-ex;
  const hl=cls==='stk'?`croissance sur ${h} an${h>1?'s':''}`:cls==='cry'?`période ${h}`:h==='max'?'historique complet':`${h} an${h>1?'s':''}`;
  const quad=`<div class="card s12 mmq"><h2><span>Quadrant dynamique : ${esc(Q.yl)} × ${esc(Q.xl)} <span class="meta">${hl} · ${Q.In.length} actif${Q.In.length>1?'s':''} affiché${Q.In.length>1?'s':''}${ex?` · ${ex} écarté${ex>1?'s':''} par les filtres`:''}${na>0?` · ${na} sans donnée`:''}</span></span></h2>
    <div class="mmwrap">${mmScatter(Q.pts,{title:'Quadrant '+Q.yl+' / '+Q.xl,xl:Q.xl+(Q.inv?' (inversé : plus faible à droite)':'')+' · '+Q.xu,yl:Q.yl+' · '+Q.yu,inv:Q.inv,tx:Q.tx,ty:Q.ty})}${mmSide(cls,Q)}</div>
    <div class="dec" style="grid-template-columns:1fr 1fr">
      <div class="dc"><span class="dot ok"></span><div><b>Surperformeurs (quadrant supérieur droit)</b><span>${out.length?out.map(r=>esc(r.l)).join(', '):'aucun avec ces filtres'}</span></div></div>
      <div class="dc"><span class="dot ${hot.length?'am':''}"></span><div><b>Alerte anti-FOMO</b><span>${hot.length?hot.map(r=>esc(r.l)).join(', ')+' : performance dans le quartier haut obtenue avec un '+(cls==='stk'?'multiple élevé':cls==='cry'?'profil de risque élevé':'risque élevé')+'. Ne pas acheter sur la seule performance.':'aucune performance extrême obtenue avec un risque excessif'}</span></div></div></div>
    <p class="note">Seuils des quadrants : X ${nf(Q.tx,1)} ${Q.xu}, Y ${nf(Q.ty,1)} ${Q.yu} (${(M.th[cls]||{}).x||(M.th[cls]||{}).y?'saisis':'médianes de l\'univers filtré'}). Le risque ou la cherté se lit à gauche, de sorte que le quadrant supérieur droit regroupe la meilleure performance pour le risque le plus faible. ⚠ : performance du quartier haut dans la zone risquée. ${cls==='stk'?'Cliquer une action ouvre son analyse financière, fondamentaux chargés.':'Cliquer un ETF ou une crypto ouvre son analyse financière ; une commodity ouvre sa fiche.'}</p></div>`;
  const tbl=`<div class="card s12"><h2><span>Univers ${MM_CLS.find(c=>c[0]===cls)[1].replace(/^\S+ /,'').toLowerCase()} <span class="meta">${cls==='stk'?'comptes publiés du volet Analyse financière':cls==='etf'?esc(ETF_U.src):cls==='cry'?esc(CRYPTO_U.src)+' · '+fdate(CRYPTO_U.at.slice(0,10)):'cours du volet 5'}</span></span></h2><div class="tw"><table class="tbl"><thead><tr><th>Actif</th><th>Groupe</th>${MM_F[cls].map(f=>`<th class="n">${f[1]}</th>`).join('')}<th>Quadrant</th></tr></thead><tbody>
    ${Q.rows.map(r=>{const p=Q.pass.find(x=>x.r===r).ok,qq=r.q==='out'?['ok','Surperformeur']:r.q==='fomo'?['am',r.hot?'FOMO ⚠':'Momentum risqué']:r.q==='def'?['','Défensif']:r.q==='off'?['ko','À écarter']:['','—'];
      return`<tr class="${p[0]?'':'mute'}"><td><button class="lnk" data-act="mmpt" data-cls="${cls}" data-id="${esc(r.id)}">${esc(r.l)}</button> <span class="meta">${esc(r.n)}</span>${r.note?`<div class="meta">${esc(r.note)}</div>`:''}</td><td class="meta">${esc(r.g||'')}</td>
      ${MM_F[cls].map(([k])=>`<td class="n">${k==='adv'?penV('an.assets.'+r.id+'.adv',isFinite(r.m.adv)&&r.m.adv!==null?nf(r.m.adv,1):'—',{t:'nn',al:'Volume moyen quotidien '+r.l+' (M€)'}):isFinite(r.m[k])?nf(r.m[k],Math.abs(r.m[k])<10?2:1):'—'}</td>`).join('')}
      <td>${p[0]?`<span class="tag ${qq[0]}">${qq[1]}</span>`:'<span class="meta">filtré</span>'}</td></tr>`;}).join('')}</tbody></table></div>
    ${cls==='stk'?'<p class="note">Volume moyen quotidien : non fourni par les comptes publiés, à saisir au crayon (M€) ; tant qu\'il est vide, le filtre correspondant écarte le titre. Croissance sur 5 ans : nécessite six exercices, non disponible avec l\'historique livré (cinq exercices).</p>':cls==='etf'?'<p class="note">Cours ajustés des dividendes et divisions. Un horizon plus long que l\'historique du fonds reste vide plutôt que d\'être raccourci.</p>':cls==='cry'?'<p class="note">Instantané de marché ; la volatilité historique n\'est pas collectée, le risque est mesuré par l\'écart au plus haut historique et la dilution (FDV).</p>':''}</div>`;
  const dm=cls==='stk'&&ui.tk&&S.an.assets[ui.tk]?(()=>{const h0=anMapHTML(),i=h0.indexOf('<div class="grid">');return i<0?'':`<div class="card s12 mmsub"><h2><span>Double mapping de ${esc(S.an.assets[ui.tk].n)} <span class="meta">secteur puis titre</span></span></h2></div>`+h0.slice(i,h0.lastIndexOf('</div>'));})():'';
  return`<div class="ai-box anm mm" role="dialog" aria-label="Mapping multi-actifs"><div class="ai-h"><b>Mapping multi-actifs</b>${mmBar()}<button class="btn sm" data-act="anmclose">Fermer</button></div>
    <div class="mmgrid">${mmFilters(cls)}<div class="mmmain"><div class="grid">${quad}${cls==='cmd'?mmCmdTable():''}${tbl}</div>${dm}</div></div></div>`;}
/* Remplace le rendu de l'overlay : accessible depuis tous les volets */
/* Le mapping n'existe que dans le volet Analyse financière (bouton « Mapping sectoriel & stock ») */
renderAnMap=function(){const el=document.getElementById('anmap');if(!el)return;if(ui.tab!=='an')ui.anmOpen=false;if(!ui.anmOpen){el.hidden=true;return;}el.hidden=false;
  const sc=el.scrollTop,fk=document.activeElement&&el.contains(document.activeElement)?document.activeElement.dataset.k||document.activeElement.dataset.w:null;
  if(fk!==null&&document.activeElement)document.activeElement.blur();try{el.innerHTML=mmHTML();}catch(e){console.error('mm',e);el.innerHTML=anMapHTML();}el.scrollTop=sc;};
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,M=mmS(),cls=b.dataset.cls||M.cls;
  if(a==='mmcls'){M.cls=b.dataset.id;ui.mmSel=null;save();renderAnMap();}
  else if(a==='mmh'){M.h[M.cls]=isNaN(+b.dataset.id)?b.dataset.id:+b.dataset.id;save();renderAnMap();}
  else if(a==='mmtog'){const F=M.f[M.cls],k=b.dataset.k,v=b.dataset.id;F[k]=F[k]||[];F[k]=F[k].includes(v)?F[k].filter(x=>x!==v):F[k].concat(v);save();renderAnMap();}
  else if(a==='mmreset'){M.f[M.cls]={};M.th[M.cls]={};save();renderAnMap();}
  else if(a==='mmselx'){ui.mmSel=null;renderAnMap();}
  else if(a==='mmgocm'){ui.cmA=b.dataset.id;ui.tab='cm';ui.anmOpen=false;save();renderAll();}
  else if(a==='mmpt'){const id=b.dataset.id;
    if(cls==='stk'&&S.an.assets[id]){ui.tk=id;ui.anmSec=anSub(id).key;ui.tab='an';ui.anmOpen=false;save();renderAll();toast(`Analyse financière de ${S.an.assets[id].n} chargée`);}
    else if(cls==='etf'||cls==='cry'){ui.anX={cls,id,tk0:ui.tk};ui.tab='an';ui.anmOpen=false;save();renderAll();$('#main').scrollTop=0;toast(`Analyse financière de ${id} chargée`);}
    else{ui.mmSel={cls,id};renderAnMap();}}});
document.addEventListener('change',e=>{const t=e.target;if(!t.classList)return;const M=mmS();
  if(t.classList.contains('mmf')){M.f[M.cls][t.dataset.k]=t.value.trim()===''?'':String(t.value).replace(',','.');save();renderAnMap();}
  else if(t.classList.contains('mmax')){M[t.dataset.w][M.cls]=t.value;save();renderAnMap();}
  else if(t.classList.contains('mmth')){M.th[M.cls]=M.th[M.cls]||{};M.th[M.cls][t.dataset.w]=t.value.trim()===''?'':String(t.value).replace(',','.');save();renderAnMap();}});
/* Chargement paresseux des flux live (live.js) : à l'ouverture d'un volet, ses données en base sont lues une fois (0 jeton) */
if(typeof renderAll==='function'&&typeof liveRefresh==='function'){const _r=renderAll;renderAll=function(){_r.apply(this,arguments);const m=LIVE_MOD[ui.tab];if(FLUX.on&&m&&!FLUX.busy&&(FLUX.loaded||{})[m]!==liveSubj(m))setTimeout(()=>liveRefresh(true,m),0);};}

/* ---- Analyse financière d'un ETF ou d'une crypto (bascule depuis le mapping, données injectées sans ressaisie) ---- */
function anxHTML(){const{cls,id}=ui.anX,Q=mmQuad(cls),r=Q.rows.find(x=>x.id===id);if(!r)return'';
  const k=(l,v,d,c)=>`<div class="stat"><div class="k">${l}</div><div class="x ${c||''}">${v}</div><div class="d">${d||''}</div></div>`;
  const q=Q.In.find(x=>x.id===id),qq=!q?['','hors quadrant (filtré ou sans donnée)']:q.q==='out'?['ok','Surperformeur : performance au-dessus de la médiane pour un risque inférieur']:q.hot?['am','Alerte FOMO : performance extrême obtenue avec un risque élevé']:q.q==='fomo'?['am','Momentum risqué : performance au-dessus de la médiane, risque au-dessus aussi']:q.q==='def'?['','Défensif : risque contenu, performance sous la médiane']:['ko','À écarter : performance sous la médiane et risque élevé'];
  const head=(t,n,sub,px,ccy)=>`<div class="card s12"><div class="symhead"><div class="sh-id"><div class="sh-t">${esc(t)}</div><div class="sh-n">${esc(n)}</div><div class="sh-m">${esc(sub)}</div></div>
    <div><div class="sh-px"><span class="v">${px}</span><em class="u">${ccy}</em></div></div><div class="badge ${qq[0]}">${esc(qq[1].split(' : ')[0].toUpperCase())}</div>
    <div class="row noprint" style="margin-left:auto;gap:6px"><button class="btn sm" data-act="anxmap">Mapping multi-actifs</button><button class="btn sm" data-act="anxclose">Retour à l'analyse de ${esc((S.an.assets[ui.tk]||{}).t||'')}</button></div></div></div>`;
  let body='';
  if(cls==='etf'){const e=ETF_U.d[id],H=MM_H.etf.map(h=>[h,mmEtfPerf(e,h)]),sp=ETF_U.d.SPY,HS=MM_H.etf.map(h=>mmEtfPerf(sp,h));
    const yr=e.v.slice(1).map((v,i)=>(v/e.v[i]-1)*100),yl=e.v.slice(1).map((_,i)=>String(e.y0+i+1).slice(2)),p5=H.find(x=>x[0]===5)[1];
    body=head(id,e.n,`${e.th} · ${e.geo} · ${e.grp} · cours ajusté du ${fdate(ETF_U.last)}`,nf(e.v[e.v.length-1],2),'USD')+
    `<div class="card s12"><div class="stats">${k('Performance 1 an',sgn(H[0][1].cagr,1),'depuis le '+fdate(H[0][1].from),cls_(H[0][1].cagr))}${k('Performance annualisée 5 ans',p5.na?'—':sgn(p5.cagr,1),p5.na||'depuis le '+fdate(p5.from),cls_(p5.cagr))}${k('Volatilité 2 ans',nf(H[1][1].vol,1)+' %','rendements mensuels annualisés')}${k('Rendement / risque 2 ans',nf(H[1][1].cagr/H[1][1].vol,2),'performance annualisée ÷ volatilité')}${k('Pire mois (2 ans)','−'+nf(H[1][1].dd,1)+' %','',"down")}</div></div>
    <div class="card s7"><h2>Performances par horizon <span class="meta">comparées au S&P 500 (SPY)</span></h2><div class="tw"><table class="tbl"><thead><tr><th>Horizon</th><th class="n">Perf. annualisée</th><th class="n">Volatilité</th><th class="n">Rendement / risque</th><th class="n">Écart vs SPY</th><th class="n">Pire période</th></tr></thead><tbody>
      ${H.map(([h,p],i)=>p.na?`<tr><td>${h} an${h>1?'s':''}</td><td colspan="5" class="meta">${esc(p.na)}</td></tr>`:`<tr><td>${h} an${h>1?'s':''} <span class="meta">(${nf(p.yrs,1)} ans)</span></td><td class="n ${cls_(p.cagr)}">${sgn(p.cagr,1)}</td><td class="n">${nf(p.vol,1)} %</td><td class="n">${nf(p.cagr/p.vol,2)}</td><td class="n ${cls_(p.cagr-HS[i].cagr)}">${HS[i].cagr!==undefined?sgn(p.cagr-HS[i].cagr,1).replace('%',' pt'):'—'}</td><td class="n down">−${nf(p.dd,1)} %</td></tr>`).join('')}</tbody></table></div>
      <p class="note">Horizons 1-2 ans : fins de mois ; 5 ans et plus : fins d'année jusqu'au dernier cours. Un horizon plus long que l'historique du fonds reste vide. Source : ${esc(ETF_U.src)}.</p></div>
    <div class="card s5"><h2>Rendements calendaires <span class="meta">${e.y0+1} à 2026 (année en cours)</span></h2>${colChart(yl,yr,{h:200})}<p class="note">Dernière barre : du 31/12/2025 au ${fdate(ETF_U.last)}.</p></div>`;}
  else{const c=r.c,P=CRYPTO_U.d.filter(x=>x.nar===c.nar),dil=c.fdv/c.mc,sup=c.max?c.circ/c.max*100:null;
    body=head(c.sym,c.name,`Narratif ${c.nar} · CoinGecko, ${new Date(CRYPTO_U.at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`,nf(c.px,c.px<1?4:2),'USD')+
    `<div class="card s12"><div class="stats">${k('Capitalisation',nf(c.mc/1e9,2)+' Md$','rang '+(CRYPTO_U.d.slice().sort((a,b)=>b.mc-a.mc).indexOf(c)+1)+' de l\'univers')}${k('FDV / capitalisation',nf(dil,2)+' ×',dil>1.5?'dilution importante à venir':dil>1.1?'dilution modérée':'offre quasi entièrement émise',dil>1.5?'down':'')}${k('Vélocité 24 h',nf(c.vol/c.mc*100,2)+' %','volume ÷ capitalisation')}${k('Repli depuis le plus haut','−'+nf((1-c.px/c.ath)*100,1)+' %','plus haut '+nf(c.ath,c.ath<1?3:0)+' $ le '+fdate(c.athD),'down')}${k('Performance 1 an',sgn(c.p1y,1),'30 j '+sgn(c.p30,1)+' · 200 j '+sgn(c.p200,1),cls_(c.p1y))}</div></div>
    <div class="card s7"><h2>Comparables du narratif ${esc(c.nar)}</h2><div class="tw"><table class="tbl"><thead><tr><th>Actif</th><th class="n">Capitalisation</th><th class="n">FDV / cap.</th><th class="n">Vélocité</th><th class="n">Repli / plus haut</th><th class="n">30 j</th><th class="n">1 an</th></tr></thead><tbody>
      ${P.map(x=>`<tr${x===c?' class="hl"':''}><td><b>${esc(x.sym)}</b> <span class="meta">${esc(x.name)}</span></td><td class="n">${nf(x.mc/1e9,2)} Md$</td><td class="n">${nf(x.fdv/x.mc,2)} ×</td><td class="n">${nf(x.vol/x.mc*100,2)} %</td><td class="n down">−${nf((1-x.px/x.ath)*100,0)} %</td><td class="n ${cls_(x.p30)}">${sgn(x.p30,1)}</td><td class="n ${cls_(x.p1y)}">${sgn(x.p1y,1)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card s5"><h2>Offre et dilution</h2>${sup!==null?`<div class="kv"><span>Offre émise / offre maximale</span><b>${nf(sup,1)} %</b></div><div class="track" style="height:8px;background:var(--line);border-radius:4px;margin:6px 0 10px"><div style="width:${clamp(sup,0,100)}%;height:100%;background:var(--accent);border-radius:4px"></div></div>`:'<p class="note">Pas d\'offre maximale : émission continue.</p>'}
      <div class="kv"><span>En circulation</span><b>${nf(c.circ/1e6,1)} M</b></div><div class="kv"><span>Offre totale</span><b>${nf(c.tot/1e6,1)} M</b></div><div class="kv"><span>Valeur restant à émettre</span><b>${nf((c.fdv-c.mc)/1e9,2)} Md$</b></div>
      <p class="note">Une FDV très supérieure à la capitalisation signale des déblocages futurs (pression vendeuse potentielle). Source : ${esc(CRYPTO_U.src)}.</p></div>`;}
  return`<div class="grid">${body}<div class="card s12 msg"><b>Position dans le mapping</b> : ${esc(qq[1])}. Lecture sur l'univers ${cls==='etf'?'ETF, horizon '+mmS().h.etf+' an(s)':'crypto, période '+mmS().h.cry} avec les filtres en cours. Pas de compte de résultat pour ${cls==='etf'?'un fonds indiciel':'un actif numérique'} : l'analyse porte sur la performance, le risque et la structure de marché.</div></div>`;}
if(typeof renderAN==='function'){const _ra=renderAN;renderAN=function(){if(ui.anX&&ui.anX.tk0!==ui.tk)ui.anX=null;_ra.apply(this,arguments);if(ui.anX){const el=document.getElementById('p-an');try{const h=anxHTML();if(h)el.innerHTML=h;else ui.anX=null;}catch(e){console.error('anx',e);ui.anX=null;}}};}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;
  if(b.dataset.act==='anxclose'){ui.anX=null;renderAll();}
  else if(b.dataset.act==='anxmap'){const x=ui.anX;mmS().cls=x.cls;ui.mmSel={cls:x.cls,id:x.id};ui.anmOpen=true;renderAnMap();}});
