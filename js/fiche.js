/* ============ v8.12 : fiche complète en cache, métriques institutionnelles, estimations N+1 à N+3, scénarios, sensibilité, trajectoire prévisionnelle, catalyseurs ============
   Une fiche = tout ce qu'il faut pour l'analyse, collecté en une fois puis gardé en cache :
   comptes 5 ans (CA, EBITDA, EBIT, intérêts, impôt, résultat, BPA, FCF, capex, capitaux propres, actif, dette nette),
   consensus N+1 à N+3, cours 12 mois, agenda (résultats, dividende) et objectifs de cours des analystes.
   Source des comptes et du consensus N+1 : S&P Global Market Intelligence, via stockanalysis.com. N+2 et N+3 : MarketScreener quand la page les publie,
   sinon extrapolation explicite (croissance N+1 ramenée vers la croissance attendue de l'industrie, Damodaran janvier 2026). */
const FICHE_V=2;
const FX_ECB={d:'12/11/2026',s:'BCE, taux de change de référence du 12/11/2026',
  r:{EUR:1,USD:1.1081,JPY:176.96,CZK:24.379,DKK:7.4754,GBP:0.83595,HUF:364.98,PLN:4.4088,RON:5.3473,SEK:11.0628,CHF:0.9232,ISK:136.60,NOK:10.5630,TRY:55.6906,AUD:1.6246,BRL:6.2241,CAD:1.5789,CNY:7.3891,HKD:8.6928,IDR:20225.76,ILS:3.5495,INR:104.2118,KRW:1478.32,MXN:20.7113,MYR:4.5194,NZD:1.9942,PHP:70.616,SGD:1.4249,THB:37.470,ZAR:18.5219,SAR:1.1081*3.75}};
const fxConv=(from,to)=>{if(!from||!to||from===to)return 1;const R=FX_ECB.r;return R[from]&&R[to]?R[to]/R[from]:NaN;};
/* devise de cotation par place (suffixe du ticker) ; GBX, ZAc et ILA sont cotés en centièmes */
const FI_CUR={US:'USD',PA:'EUR',AS:'EUR',BR:'EUR',MC:'EUR',MI:'EUR',DE:'EUR',F:'EUR',LS:'EUR',HE:'EUR',VI:'EUR',IR:'EUR',AT:'EUR',L:'GBP',SW:'CHF',TO:'CAD',V:'CAD',AX:'AUD',T:'JPY',KS:'KRW',KQ:'KRW',TW:'TWD',HK:'HKD',SS:'CNY',SZ:'CNY',SR:'SAR',ST:'SEK',CO:'DKK',OL:'NOK',NS:'INR',BO:'INR',SA:'BRL',MX:'MXN',JO:'ZAR',SI:'SGD',WA:'PLN',IS:'TRY',JK:'IDR',BK:'THB',KL:'MYR',TA:'ILS',NZ:'NZD'};
const FI_CENT={L:100,JO:100,TA:100};
const FI_ALIAS={ASML:'ASML.AS',SAP:'SAP.DE'};
const fiSfx=tk=>(String(tk).match(/\.([A-Z]+)$/)||[])[1]||'US';

/* ---------- cache : fiches livrées avec l'application + fiches lues depuis (localStorage) ---------- */
const FI_LS='od.fiche.v2';
function fiStore(){if(fiStore.m)return fiStore.m;let m={};try{m=JSON.parse(localStorage.getItem(FI_LS)||'{}')||{};}catch(e){m={};}return fiStore.m=m;}
function fiSave(){try{localStorage.setItem(FI_LS,JSON.stringify(fiStore.m||{}));}catch(e){/* quota : le cache reste en mémoire pour la session */}}
function ficheGet(tk){if(!tk)return null;const k=String(tk).toUpperCase(),L=fiStore()[k],B=typeof FICHE_DATA==='object'?FICHE_DATA.d[k]:null;
  if(L&&B)return (L.at||'')>=(FICHE_DATA.at||'')?L:B;return L||B||null;}
function ficheKeyOf(id){const a=S.an.assets[id];if(!a)return null;const t=String(a.t||id).toUpperCase();if(ficheGet(t))return t;if(FI_ALIAS[t]&&ficheGet(FI_ALIAS[t]))return FI_ALIAS[t];
  const r=typeof uvFind==='function'?uvFind(id):null;return r&&ficheGet(r[0])?r[0]:null;}

/* ---------- estimations N+1 à N+3 : consensus quand il existe, sinon dérivé ou extrapolé (signalé) ---------- */
function ficheEst(b,indG){const L=b.y.length-1,last=+b.y[L],Y=[1,2,3].map(k=>String(last+k)),ms=b.ms||null,e=b.e||{};
  const v=(arr,i)=>arr&&arr[i]!==null&&arr[i]!==undefined&&isFinite(arr[i])?+arr[i]:null;
  const out={y:Y,rev:[],ebitda:[],ebit:[],eps:[],fcf:[],ni:[],src:[]},lastH=k=>v(b[k],L);
  const da=isFinite(lastH('ebitda'))&&isFinite(lastH('ebit'))?lastH('ebitda')-lastH('ebit'):null,fcfM=lastH('fcf')!==null&&lastH('rev')?lastH('fcf')/lastH('rev'):null;
  const gT=clamp(isFinite(indG)?indG/100:0.04,-0.02,0.06);
  Y.forEach((y,i)=>{const mi=ms?ms.y.indexOf(y):-1,ei=e.y?e.y.indexOf(y):-1;let s='';
    const pick=k=>{if(mi>=0&&v(ms[k],mi)!==null){s=s||'ms';return v(ms[k],mi);}if(ei>=0&&v(e[k],ei)!==null){s=s||'sa';return v(e[k],ei);}return null;};
    let rev=pick('rev'),eps=pick('eps'),ebit=pick('ebit'),ni=pick('ni'),fcf=pick('fcf'),ebitda=mi>=0?v(ms.ebitda,mi):null,der=false;
    if(ebitda===null&&ebit!==null&&da!==null){ebitda=ebit+da;der=true;}
    if(fcf===null&&rev!==null&&fcfM!==null){fcf=rev*fcfM;der=true;}
    if(rev===null&&i>0&&out.rev[i-1]!==null){/* extrapolation : croissance N+1 ramenée vers la croissance de l'industrie */
      const p=i===1?(out.rev[0]&&lastH('rev')?out.rev[0]/lastH('rev')-1:gT):(out.rev[1]&&out.rev[0]?out.rev[1]/out.rev[0]-1:gT),g=i===1?(2*p+gT)/3:(p+2*gT)/3,k=1+clamp(g,-0.3,0.5);
      rev=out.rev[i-1]*k;const kk=x=>out[x][i-1]!==null?out[x][i-1]*k:null;eps=eps??kk('eps');ebit=ebit??kk('ebit');ni=ni??kk('ni');ebitda=ebitda??kk('ebitda');fcf=fcf??kk('fcf');s='ex';}
    out.rev.push(rev);out.eps.push(eps);out.ebit.push(ebit);out.ni.push(ni);out.ebitda.push(ebitda);out.fcf.push(fcf);out.src.push(s?(s+(der&&s!=='ex'?'+d':'')):'');});
  out.n=e.n?e.n[0]:null;out.msSrc=ms?ms.src:null;return out;}
const FI_SRC_L={ms:'consensus MarketScreener','ms+d':'consensus MarketScreener (EBITDA ou FCF dérivé)',sa:'consensus S&P Global','sa+d':'consensus S&P Global (EBITDA ou FCF dérivé : marge de N-1)',ex:'extrapolation : croissance ramenée vers celle de l\'industrie'};

/* ---------- application d'une fiche à un titre ---------- */
function ficheApply(a,b,tk,isNew){const sx=fiSfx(tk),cur=FI_CUR[sx]||b.cur||'USD',cent=FI_CENT[sx]||1,z=k=>(b[k]||[]).map(x=>x===null||x===undefined||!isFinite(x)?null:+x),L=b.y.length-1;
  const eq=z('eq'),ni=z('ni'),roe=ni.map((v,i)=>{const e0=i&&eq[i-1]>0?(eq[i]+eq[i-1])/2:eq[i];return v!==null&&e0>0?Math.round(v/e0*1000)/10:null;});
  const row=UNIV.rows.find(r=>r[0]===tk),ind=row?UNIV.ind[row[2]]:null,fx=fxConv(b.cur,cur);
  const pt=b.pt&&isFinite(b.pt.avg)?{n:b.pt.numPriceTargets,avg:b.pt.avg,low:b.pt.low,high:b.pt.high,med:b.pt.median,cur:b.pt.currency}:null;
  if(pt&&/^(GBX|GBp|ZAc|ILA)$/.test(pt.cur||'')){['avg','low','high','med'].forEach(k=>pt[k]=pt[k]/100);pt.cur=cur;}
  Object.assign(a,{n:a.n&&!isNew?a.n:(row?row[1]:tk),cur,rcur:b.cur,fx:isFinite(fx)?Math.round(fx*1e6)/1e6:1,fxNote:b.cur!==cur?(isFinite(fx)?`${b.cur} → ${cur} : ${FX_ECB.s}`:`taux ${b.cur}/${cur} non publié par la BCE : conversion à vérifier`):'',
    y:b.y.map(y=>'FY'+y),rev:z('rev'),ebitda:z('ebitda'),ni,eps:z('eps'),fcf:z('fcf'),nd:z('nd'),roe,shares:z('sh')[L]||a.shares,
    ebit:z('ebit'),int:z('int'),tax:z('tax'),eq,assets:z('assets'),capex:z('capex'),cfo:z('cfo'),dps:z('dps'),
    est:ficheEst(b,ind?ind.g5:NaN),hist:(b.h||[]).map(([d,p])=>[d,p/cent]),ed:b.ed||null,edTxt:b.edTxt||'',xd:b.xd||null,pt,beta:b.beta||null,cal:b.cal||[],
    src:'https://stockanalysis.com'+b.sa+'/financials/',sa:b.sa.replace(/^\//,''),srcNote:'Comptes S&P Global Market Intelligence (stockanalysis.com)',fv:FICHE_V,ficheAt:b.at||FICHE_DATA.at});
  if(isFinite(b.px)&&b.px>0&&!a.pxManual){a.price=Math.round(b.px/cent*100)/100;a.pxDate=fdate(b.pxd);a.pxSrc=`stockanalysis.com, clôture du ${fdate(b.pxd)}`;}
  const E=a.est;if(E.eps[0]!==null)a.epsE=Math.round(E.eps[0]*1000)/1000;
  const P=fiPlus(a);if(P.roic[L]!==null&&(a.roic===null||a.roic===''||a.roicAuto)){a.roic=Math.round(P.roic[L]*10)/10;a.roicAuto=true;}
  if(isNew){const g1=E.rev[0]&&a.rev[L]?(E.rev[0]/a.rev[L]-1)*100:NaN,ge=E.eps[0]&&a.eps[L]>0?(E.eps[0]/a.eps[L]-1)*100:NaN,gi=ind?ind.g5:NaN;
    Object.assign(a,{sec:ind?ind.fs:'Non classé',sub:null,g:isFinite(g1)?Math.round(clamp(g1,0,15)*10)/10:5,tg:2.5,wacc:8.5,
      cat:isFinite(ge)?(ge>=15?8:ge>=8?7:ge>=3?6:ge>=0?5:3):5,catTxt:`Règle automatique sur le consensus : BPA ${isFinite(ge)?sgn(ge,1):'non publié'} et CA ${isFinite(g1)?sgn(g1,1):'non publié'} attendus en ${E.y[0]}${a.ed?' ; prochaine publication : '+a.ed:''}.`,
      tamS:isFinite(gi)?(gi>=15?8:gi>=10?7:gi>=5?6:5):5,tamTxt:`Règle automatique : croissance du BPA attendue à 5 ans de l'industrie ${ind?ind.fi:''} ${isFinite(gi)?nf(gi,1)+' %':'non publiée'} (Damodaran, janvier 2026).`,peers:[]});}
  return a;}

/* ---------- métriques institutionnelles ---------- */
function fiPlus(a,R){const n=(a.y||[]).length,L=n-1,arr=k=>(a[k]&&a[k].length===n)?a[k]:Array(n).fill(null),ok=v=>v!==null&&v!==undefined&&isFinite(v);
  const ebit=arr('ebit'),tax=arr('tax'),eq=arr('eq'),nd=a.nd||[],rev=a.rev||[],int=arr('int'),capex=arr('capex'),assets=arr('assets');
  const roic=ebit.map((e,i)=>{const t=ok(tax[i])?clamp(tax[i],0,40):25,ic=ok(eq[i])&&ok(nd[i])?eq[i]+nd[i]:NaN;return ok(e)&&ic>0?e*(1-t/100)/ic*100:null;});
  const capexPct=capex.map((c,i)=>ok(c)&&rev[i]?c/rev[i]*100:null),conv=(a.fcf||[]).map((f,i)=>ok(f)&&a.ebitda&&a.ebitda[i]>0?f/a.ebitda[i]*100:null);
  const cover=ebit.map((e,i)=>ok(e)&&ok(int[i])&&int[i]!==0?e/Math.abs(int[i]):null);
  const dup=i=>ok(a.ni[i])&&rev[i]&&ok(assets[i])&&assets[i]>0&&ok(eq[i])&&eq[i]>0?{nm:a.ni[i]/rev[i]*100,at:rev[i]/assets[i],lev:assets[i]/eq[i],roe:a.ni[i]/eq[i]*100}:null;
  return{roic,capexPct,conv,cover,du:[L>0?dup(L-1):null,dup(L)],spread:ok(roic[L])?roic[L]-a.wacc:null,taxAssumed:!ok(tax[L])};}
/* DCF identique à anCalc, paramétrable pour la table de sensibilité */
function fiDcf(a,w,tg){const L=a.nd.length-1,base=avg(a.fcf.slice(-3)),g=a.g/100;w/=100;tg/=100;if(!(base>0)||w<=tg)return NaN;let pv=0,f=base;
  for(let t=1;t<=5;t++){f*=1+g;pv+=f/(1+w)**t;}const tv=f*(1+tg)/(w-tg),ev=pv+tv/(1+w)**5;return(ev-a.nd[L])/a.shares*a.fx;}
function fiScen(a,R){const c=S.an.crit,ref=R.ref;if(!isFinite(ref))return null;
  const bear=ref*(1+c.scBm/100)*(1+c.scBg/100),bull=ref*(1+c.scUm/100)*(1+c.scUg/100);return{bear,base:ref,bull};}

/* ---------- trajectoire prévisionnelle : 12 mois de cours puis cône vers les 3 scénarios ---------- */
function fanChart(a,R,sc){const H0=(a.hist||[]).filter(x=>isFinite(x[1])),px=+a.price,today=new Date(),T1=+today+365*864e5;
  const hist=H0.length?H0.map(([d,p])=>[+new Date(d),p]):[[+today,px]];if(hist[hist.length-1][1]!==px)hist.push([+today,px]);
  const lv=[['Take-profit',R.tp,TVC.amber],['Valeur de référence',R.ref,'#A1A1AA'],['Achat cible',R.buy,TVC.up],['Stop-loss',R.sl,TVC.down]].filter(x=>isFinite(x[1])&&x[1]>0);
  const ys=hist.map(x=>x[1]).concat(lv.map(x=>x[1]),sc?[sc.bear,sc.bull]:[]).filter(v=>isFinite(v)&&v>0);if(!ys.length||!(px>0))return'<p class="note">Trajectoire non calculable : cours ou niveaux absents.</p>';let mn=Math.min(...ys),mx=Math.max(...ys);const pd=(mx-mn)*.08||mx*.05;mn=Math.max(0,mn-pd);mx+=pd;
  const W=window.innerWidth<700?460:860,H=window.innerWidth<700?280:320,Lm=8,Rm=118,T=10,B=24,iw=W-Lm-Rm,ih=H-T-B,t0=hist[0][0],X=t=>Lm+(t-t0)/(T1-t0)*iw,Y=v=>T+(mx-v)/(mx-mn)*ih,xn=X(+today);
  let s=`<svg class="fan" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trajectoire prévisionnelle du cours sur 24 mois">`;
  const st=niceStep((mx-mn)/5);for(let v=Math.ceil(mn/st)*st;v<=mx;v+=st)s+=`<line x1="${Lm}" x2="${Lm+iw}" y1="${Y(v)}" y2="${Y(v)}" stroke="${TVC.grid}"/><text x="${Lm+4}" y="${Y(v)-3}" fill="${TVC.mute}" font-size="10">${nf(v,st<1?2:0)}</text>`;
  s+=`<rect x="${xn}" y="${T}" width="${Lm+iw-xn}" height="${ih}" fill="rgba(255,255,255,.025)"/><line x1="${xn}" x2="${xn}" y1="${T}" y2="${T+ih}" stroke="${TVC.line}" stroke-dasharray="2 3"/>`;
  [[t0,'il y a 12 mois'],[+today,"aujourd'hui"],[T1,'dans 12 mois']].forEach(([t,l],i)=>s+=`<text x="${X(t)}" y="${H-6}" fill="${TVC.mute}" font-size="10" text-anchor="${['start','middle','end'][i]}">${l}</text>`);
  if(sc)s+=`<polygon points="${xn},${Y(px)} ${X(T1)},${Y(sc.bull)} ${X(T1)},${Y(sc.bear)}" fill="rgba(161,161,170,.10)"/>`;
  lv.forEach(([k,v,c])=>s+=`<line x1="${Lm}" x2="${Lm+iw}" y1="${Y(v)}" y2="${Y(v)}" stroke="${c}" stroke-width="1" stroke-dasharray="6 4" opacity=".85"/>`);
  s+=`<polyline points="${hist.map(([t,p])=>X(t).toFixed(1)+','+Y(p).toFixed(1)).join(' ')}" fill="none" stroke="#FAFAFA" stroke-width="1.6"/>`;
  if(sc)[['Bull',sc.bull,TVC.up],['Base',sc.base,'#A1A1AA'],['Bear',sc.bear,TVC.down]].forEach(([k,v,c])=>s+=`<line x1="${xn}" y1="${Y(px)}" x2="${X(T1)}" y2="${Y(v)}" stroke="${c}" stroke-width="1.6" stroke-dasharray="4 3"/><circle cx="${X(T1)}" cy="${Y(v)}" r="3" fill="${c}"/>`);
  s+=`<circle cx="${xn}" cy="${Y(px)}" r="3.5" fill="#FAFAFA"/>`;
  /* étiquettes à droite, sans chevauchement */
  const tags=[...lv.map(([k,v,c])=>({k:k==='Valeur de référence'?'Référence':k,v,c})),...(sc?[{k:'Bull 12 m',v:sc.bull,c:TVC.up},{k:'Bear 12 m',v:sc.bear,c:TVC.down}]:[]),{k:'Cours',v:px,c:'#FAFAFA'}].map(o=>({...o,y:Y(o.v)})).sort((p,q)=>p.y-q.y);
  for(let i=1;i<tags.length;i++)if(tags[i].y-tags[i-1].y<13)tags[i].y=tags[i-1].y+13;
  tags.forEach(o=>s+=`<text x="${Lm+iw+6}" y="${o.y+3}" fill="${o.c}" font-size="10.5">${esc(o.k)} ${nf(o.v,o.v<100?2:0)}</text>`);
  s+=`<text x="${xn-6}" y="${Y(px)-8}" fill="#FAFAFA" font-size="10.5" text-anchor="end">${nf(px,px<100?2:0)}</text></svg>`;
  return s;}

/* ---------- risques d'invalidation : règles sur les données (pas d'opinion) ---------- */
function fiRisks(a,R,P){const L=a.y.length-1,o=[],B=R.B,E=a.est;
  const ndE=B.ndE[L];if(isFinite(ndE)&&ndE>2.5)o.push([3,'Levier financier',`dette nette de ${nf(ndE,1)}× l'EBITDA : un recul des résultats réduirait vite la marge de manœuvre (refinancement, dividende).`]);
  const cv=P.cover[L];if(cv!==null&&cv<4)o.push([3,'Couverture des intérêts',`EBIT égal à ${nf(cv,1)}× les intérêts : sensibilité forte à une hausse des taux.`]);
  const em=B.em,dm=isFinite(em[L])&&isFinite(em[L-2])?em[L]-em[L-2]:NaN;if(isFinite(dm)&&dm<-2)o.push([2.5,'Érosion des marges',`marge EBITDA en recul de ${nf(-dm,1)} point(s) en deux exercices : pression concurrentielle ou coûts non répercutés.`]);
  if(isFinite(B.per)&&isFinite(R.medPE)&&B.per>R.medPE*1.3)o.push([2.5,'Valorisation exigeante',`PER de ${nf(B.per,1)}× contre ${nf(R.medPE,1)}× pour la référence : une déception sur la croissance comprimerait le multiple.`]);
  const g1=E&&E.eps[0]!==null&&a.eps[L]>0?(E.eps[0]/a.eps[L]-1)*100:NaN;if(isFinite(g1)&&g1<0)o.push([2.5,'Révision des bénéfices',`le consensus attend un BPA en baisse de ${nf(-g1,1)} % en ${E.y[0]}.`]);
  if(isFinite(g1)&&g1>25)o.push([2,'Exécution de la croissance',`le consensus intègre un BPA en hausse de ${nf(g1,0)} % en ${E.y[0]} : tout retard d'exécution pèserait sur le cours.`]);
  if(P.spread!==null&&P.spread<0)o.push([2.5,'Destruction de valeur',`ROIC de ${nf(P.roic[L],1)} % inférieur au WACC de ${nf(a.wacc,1)} % : la croissance ne crée pas de valeur à ce stade.`]);
  if(a.fcf[L]<0)o.push([3,'Free cash flow négatif',`l'exercice ${a.y[L]} consomme de la trésorerie : dépendance au financement externe.`]);
  if(a.pt&&isFinite(a.pt.low)&&+a.price>0&&a.pt.low<a.price*0.75)o.push([1.5,'Dispersion des analystes',`objectif le plus bas à ${nf(a.pt.low,2)} ${a.cur}, soit ${sgn((a.pt.low/a.price-1)*100,0)} : le consensus n'est pas unanime.`]);
  if(a.rcur&&a.rcur!==a.cur)o.push([1.5,'Change',`comptes en ${a.rcur}, cotation en ${a.cur} : le cours dépend aussi de la parité.`]);
  if(isFinite(a.beta)&&a.beta>1.4)o.push([1.5,'Volatilité',`bêta de ${nf(a.beta,2)} : le titre amplifie les mouvements du marché.`]);
  if(o.length<3)o.push([1,'Cycle et demande',`hypothèse de croissance de ${nf(a.g,1)} % par an du FCF : un ralentissement de la demande remettrait en cause la valeur de référence.`]);
  if(o.length<3)o.push([1,'Taux',`WACC retenu de ${nf(a.wacc,1)} % : +1 point de taux réduit la valeur intrinsèque (voir la table de sensibilité).`]);
  return o.sort((x,y)=>y[0]-x[0]).slice(0,3);}
function fiCats(a){const o=[],pd=s=>{const d=new Date(s);return isNaN(d)?null:d;},now=new Date();
  if(a.ed){const d=pd(a.ed);o.push([d,`Publication des résultats${/estimated|estim/i.test(a.edTxt||'')?' (date estimée par S&P Global)':''}`,d&&d>=now?'à venir':'dernière publication']);}
  if(a.xd){const d=pd(a.xd);o.push([d,'Détachement du dividende',d&&d>=now?'à venir':'dernier détachement']);}
  (a.cal||[]).forEach(([d,t])=>{const dd=d==='Today'?now:pd(d);if(dd&&dd>=new Date(+now-2*864e5)&&!/ex-dividend/i.test(t))o.push([dd,t.replace(/Earnings release/i,'Résultats').replace(/Annual General Meeting/i,'Assemblée générale').replace(/Earnings presentation/i,'Présentation des résultats'),'agenda MarketScreener']);});
  if(a.est&&a.est.y)o.push([null,`Consensus ${a.est.y[0]} : CA ${a.est.rev[0]!==null?mm(a.est.rev[0],a.rcur):'non publié'}, BPA ${a.est.eps[0]!==null?nf(a.est.eps[0],2)+' '+a.rcur:'non publié'}${a.est.n?` (${a.est.n} analystes)`:''}`,'catalyseur de résultats']);
  if(a.pt)o.push([null,`Objectif de cours moyen des analystes : ${nf(a.pt.avg,2)} ${a.pt.cur||a.cur} (fourchette ${nf(a.pt.low,2)} à ${nf(a.pt.high,2)}, ${a.pt.n} analystes)`,sgn((a.pt.avg/a.price-1)*100,0)+' vs cours']);
  return o.sort((x,y)=>(x[0]?+x[0]:9e15)-(y[0]?+y[0]:9e15));}

/* ---------- rendu : enrichissement des sections 3, 5 et 6, nouveaux blocs ---------- */
function fiEnrich(){if(ui.tab!=='an'||ui.anX)return;const id=ui.tk,a=S.an.assets[id],P0=document.getElementById('p-an');if(!a||!P0)return;let R;try{R=anCalc(id);}catch(e){return;}
  const P=fiPlus(a,R),L=a.y.length-1,E=a.est,cards=[...P0.querySelectorAll(':scope .grid>.card')],cardOf=re=>cards.find(c=>re.test((c.querySelector('h2')||{}).textContent||''));
  const c3=cardOf(/^3\. /),c5=cardOf(/^5\. /),c6=cardOf(/^6\. /),c7=cardOf(/^7\. /),c8=cardOf(/^8\. /),f1=v=>v===null||!isFinite(v)?'':nf(v,1);
  const cell=(v,fmt,c)=>`<td class="n ${c||''}">${v===null||v===undefined||!isFinite(v)?'<span class="meta">non publié</span>':fmt(v)}</td>`;
  /* Section 3 : colonnes estimées et lignes institutionnelles */
  const tb=c3&&c3.querySelector('table.fin');
  if(tb&&!tb.dataset.fi){tb.dataset.fi=1;const hr=tb.querySelector('thead tr');
    if(E){E.y.forEach((y,i)=>{const th=document.createElement('th');th.className='n est';th.innerHTML=`FY${y} (E)`;th.title=FI_SRC_L[E.src[i]]||'';hr.appendChild(th);});
      const em=E.ebitda.map((v,i)=>v!==null&&E.rev[i]?v/E.rev[i]*100:null),rg=E.rev.map((v,i)=>v!==null?v/(i?E.rev[i-1]:a.rev[L])*100-100:null),eg=E.eps.map((v,i)=>v!==null?(i?(E.eps[i-1]?v/E.eps[i-1]*100-100:null):(a.eps[L]?(v-a.eps[L])/Math.abs(a.eps[L])*100:null)):null);
      const map={"Chiffre d'affaires":[E.rev,v=>nf(v,0)],'Croissance du CA':[rg,v=>sgn(v)],'EBITDA':[E.ebitda,v=>nf(v,0)],'Marge EBITDA':[em,v=>pct(v,1)],'Résultat net':[E.ni,v=>nf(v,0)],'Croissance du BPA':[eg,v=>sgn(v)],'Free cash flow':[E.fcf,v=>nf(v,0)]};
      tb.querySelectorAll('tbody tr').forEach(tr=>{const lab=(tr.cells[0]||{}).textContent||'',k=Object.keys(map).find(x=>lab===x)||(/^BPA \(/.test(lab)?'BPA':null),m=k==='BPA'?[E.eps,v=>nf(v,2)]:map[k];
        E.y.forEach((y,i)=>{const td=document.createElement('td');td.className='n est';if(m&&m[0][i]!==null&&isFinite(m[0][i])){td.innerHTML=m[1](m[0][i]);td.title=FI_SRC_L[E.src[i]]||'';if(E.src[i]==='ex')td.classList.add('ex');}else td.innerHTML='<span class="meta">non estimé</span>';tr.appendChild(td);});});}
    const ncol=a.y.length+(E?3:0),add=(lab,arr,fmt,tip,colr)=>{const tr=document.createElement('tr');tr.className='fi-r';tr.innerHTML=`<td title="${esc(tip)}">${lab}</td>`+arr.map(v=>cell(v,fmt,colr?colr(v):'')).join('')+(E?'<td class="n est"><span class="meta">historique</span></td>'.repeat(3):'');tb.querySelector('tbody').appendChild(tr);};
    add('EBIT',a.ebit||[],v=>nf(v,0),'Résultat opérationnel publié');
    add('Capex (% du CA)',P.capexPct,v=>pct(v,1),'Intensité capitalistique : investissements / chiffre d\'affaires');
    add('Conversion FCF (FCF / EBITDA)',P.conv,v=>pct(v,0),'Part de l\'EBITDA convertie en free cash flow');
    add('Couverture des intérêts (EBIT / intérêts)',P.cover,v=>nf(v,1)+'×','EBIT divisé par la charge d\'intérêts ; non publié si la société ne présente pas de charge d\'intérêts séparée',v=>v<4?'down':'');
    add('ROIC (NOPAT / (capitaux propres + dette nette))',P.roic,v=>pct(v,1),'NOPAT = EBIT × (1 − taux d\'impôt effectif)',v=>v>=a.wacc?'up':'down');
    add('Création de valeur (ROIC − WACC)',P.roic.map(v=>v===null?null:v-a.wacc),v=>(v>=0?'+':'')+nf(v,1)+' pt',`WACC retenu : ${nf(a.wacc,1)} %`,v=>v>=0?'up':'down');}
  if(c3){const lb=[...c3.querySelectorAll('.lb')].find(x=>/^ROIC N-1/.test(x.textContent));if(lb)lb.textContent=a.roicAuto?'ROIC N-1 (calculé, modifiable)':'ROIC N-1';
    if(!c3.querySelector('.fi-du')&&(P.du[1]||P.roic[L]!==null)){const d=P.du,sp=P.spread,box=document.createElement('div');box.className='fi-du';
      const dl=(k,f)=>d[0]&&d[1]?`<span class="${d[1][k]>=d[0][k]?'up':'down'}">${d[1][k]>=d[0][k]?'▲':'▼'} ${f(Math.abs(d[1][k]-d[0][k]))}</span>`:'';
      const drv=d[0]&&d[1]?[['marge nette',(d[1].nm/d[0].nm)],['rotation des actifs',(d[1].at/d[0].at)],['levier',(d[1].lev/d[0].lev)]].map(([k,r])=>[k,Math.log(r)]).sort((x,y)=>Math.abs(y[1])-Math.abs(x[1]))[0]:null;
      box.innerHTML=`<div class="fi-vc ${sp===null?'':sp>=0?'ok':'ko'}"><span class="k">Création de valeur ${esc(a.y[L])}</span><b>${sp===null?'non calculable':(sp>=0?'+':'')+nf(sp,1)+' pt'}</b><span class="meta">ROIC ${P.roic[L]!==null?pct(P.roic[L],1):'non calculable'} − WACC ${pct(a.wacc,1)}${P.taxAssumed?' · impôt supposé à 25 %':''}</span></div>
        ${d[1]?`<div class="fi-dp"><span class="k">Décomposition DuPont du ROE ${esc(a.y[L])}</span><div class="fi-eq"><span><b>${pct(d[1].nm,1)}</b><em>marge nette</em>${dl('nm',v=>nf(v,1)+' pt')}</span><i>×</i><span><b>${nf(d[1].at,2)}</b><em>rotation des actifs</em>${dl('at',v=>nf(v,2))}</span><i>×</i><span><b>${nf(d[1].lev,2)}</b><em>levier (actif / capitaux propres)</em>${dl('lev',v=>nf(v,2))}</span><i>=</i><span><b>${pct(d[1].roe,1)}</b><em>ROE (fin d'exercice)</em>${dl('roe',v=>nf(v,1)+' pt')}</span></div>
        ${drv?`<p class="meta">Moteur principal de la variation sur un an : <b>${drv[0]}</b> (${drv[1]>=0?'amélioration':'dégradation'}).</p>`:''}</div>`:''}`;
      const anchor=c3.querySelector(':scope>.fields');if(anchor)anchor.before(box);else c3.appendChild(box);}}
  /* Section 5 : multiples prospectifs, scénarios et sensibilité */
  const sc=fiScen(a,R);
  if(c5&&!c5.dataset.fi){c5.dataset.fi=1;const mt=c5.querySelector('table tbody');const B=R.B,ev=B.evR;
    if(mt&&E){const fE=i=>E.ebitda[i]>0?ev/E.ebitda[i]:NaN,fP=i=>E.eps[i]>0?a.price/(E.eps[i]*a.fx):NaN;
      [[`VE / EBITDA ${E.y[0]} (E)`,fE(0),R.medEvE,'×'],[`VE / EBITDA ${E.y[1]} (E)`,fE(1),R.medEvE,'×'],[`PER ${E.y[0]} (E)`,fP(0),R.medPE,'×'],[`PER ${E.y[1]} (E)`,fP(1),R.medPE,'×']].forEach(([l,v,ref])=>{const tr=document.createElement('tr');
        tr.innerHTML=`<td>${l}</td><td class="n">${isFinite(v)?nf(v,1)+'×':'non calculable'}</td><td class="n">${isFinite(ref)?nf(ref,1)+'× (N-1)':'non publié'}</td><td class="n ${isFinite(v)&&isFinite(ref)?cls(ref-v):''}">${isFinite(v)&&isFinite(ref)?sgn((v/ref-1)*100,0):'non calculable'}</td>`;mt.appendChild(tr);});}
    const c=S.an.crit,W=[-1,-.5,0,.5,1].map(d=>a.wacc+d),G=[-1,-.5,0,.5,1].map(d=>a.tg+d),base=fiDcf(a,a.wacc,a.tg);
    const box=document.createElement('div');box.className='fi-sc';
    box.innerHTML=`<h3 class="h3">Objectifs de cours à 12 mois : trois scénarios</h3>
      ${sc?`<div class="fi-3">${[['Bear',sc.bear,'ko',`multiple ${sgn(c.scBm,0)}, marges ${sgn(c.scBg,0)}`],['Base',sc.base,'',`valeur de référence pondérée`],['Bull',sc.bull,'ok',`re-rating ${sgn(c.scUm,0)}, marges ${sgn(c.scUg,0)}`]].map(([k,v,t,h])=>`<div class="stat fi-s ${t}"><div class="k">${k} case</div><div class="x">${nf(v,2)} <small>${esc(a.cur)}</small></div><div class="d">${sgn((v/a.price-1)*100,0)} vs cours · ${h}</div></div>`).join('')}</div>`:'<p class="note">Scénarios non calculables : valeur de référence absente.</p>'}
      <div class="fields fi-pp">${F('Bear : multiple','an.crit.scBm','n',{u:'%'})}${F('Bear : marges','an.crit.scBg','n',{u:'%'})}${F('Bull : multiple','an.crit.scUm','n',{u:'%'})}${F('Bull : marges','an.crit.scUg','n',{u:'%'})}</div>
      ${a.pt?`<p class="note">Repère externe : objectifs des analystes de ${nf(a.pt.low,2)} à ${nf(a.pt.high,2)} ${esc(a.pt.cur||a.cur)}, moyenne ${nf(a.pt.avg,2)} (${a.pt.n} analystes, S&P Global).</p>`:''}
      <h3 class="h3">Sensibilité de la valeur DCF par action <span class="meta">WACC en colonnes, croissance terminale en lignes · ${esc(a.cur)}</span></h3>
      ${isFinite(base)?`<div class="tw"><table class="tbl fi-sens"><thead><tr><th>g terminal \\ WACC</th>${W.map(w=>`<th class="n${w===a.wacc?' hl':''}">${nf(w,1)} %</th>`).join('')}</tr></thead><tbody>
      ${G.map(g=>`<tr><td>${nf(g,1)} %</td>${W.map(w=>{const v=fiDcf(a,w,g),r=v/a.price-1;return`<td class="n ${w===a.wacc&&g===a.tg?'hl':''} ${isFinite(v)?(r>=0?'up':'down'):''}">${isFinite(v)?nf(v,v<100?2:0):'non définie'}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="note">Case centrale : hypothèses du dossier (WACC ${nf(a.wacc,1)} %, croissance terminale ${nf(a.tg,1)} %, FCF +${nf(a.g,1)} %/an sur 5 ans). Vert : au-dessus du cours de ${nf(+a.price,2)}.</p>`:'<p class="note">Sensibilité non calculable : FCF normalisé négatif ou nul.</p>'}`;
    c5.appendChild(box);}
  /* Section 6 : trajectoire prévisionnelle sur 24 mois */
  if(c6&&!c6.dataset.fi){c6.dataset.fi=1;const old=c6.querySelector('svg.lv');const w=document.createElement('div');w.className='fi-fan';
    w.innerHTML=fanChart(a,R,sc)+`<p class="note">À gauche : cours de clôture hebdomadaire sur 12 mois${(a.hist||[]).length?' (stockanalysis.com)':' (historique non chargé : relancez la collecte)'}. À droite : cône vers les objectifs Bear, Base et Bull à 12 mois. Lignes horizontales : niveaux d'exécution de la grille de décision.${isFinite(R.buy)&&isFinite(R.sl)&&isFinite(R.tp)?` Rendement / risque depuis l'achat cible : ${nf((R.tp-R.buy)/Math.max(1e-9,R.buy-R.sl),1)} pour 1.`:''}</p>`;
    if(old)old.replaceWith(w);else c6.querySelector('h2').after(w);const h=c6.querySelector('h2');if(h)h.textContent="6. Zones d'intervention et trajectoire prévisionnelle (24 mois)";}
  /* Catalyseurs et risques */
  if(c7&&!P0.querySelector('.fi-cr')){const cats=fiCats(a),risks=fiRisks(a,R,P),box=document.createElement('div');box.className='card s12 fi-cr';
    box.innerHTML=`<h2><span>Calendrier des catalyseurs et risques asymétriques <span class="meta">dates publiées ; risques déduits des chiffres du dossier</span></span></h2><div class="fi-cr-g">
      <div><h3 class="h3">Prochains catalyseurs</h3>${cats.length?`<table class="tbl"><tbody>${cats.map(([d,t,s])=>`<tr><td class="n" style="width:96px">${d?d.toLocaleDateString('fr-FR'):'<span class="meta">consensus</span>'}</td><td>${esc(t)}</td><td class="meta">${esc(s)}</td></tr>`).join('')}</tbody></table>`:'<p class="note">Aucun événement daté publié pour ce titre.</p>'}</div>
      <div><h3 class="h3">Trois risques majeurs d'invalidation de la thèse</h3><ol class="fi-rk">${risks.map(([w,k,t])=>`<li><b>${esc(k)}</b> : ${esc(t)}</li>`).join('')}</ol></div></div>`;
    c7.before(box);}
  /* Sources */
  if(c8&&!c8.dataset.fi&&a.fv){c8.dataset.fi=1;const tb8=c8.querySelector('tbody');if(tb8){const add=(l,s,t,c)=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${l}</td><td>${s}</td><td><span class="tag ${c}">${t}</span></td>`;tb8.appendChild(tr);};
    add('EBIT, intérêts, impôt, capitaux propres, actif, capex, cours 12 mois, agenda',`<a href="${esc(a.src)}" target="_blank" rel="noopener">stockanalysis.com</a> (S&P Global Market Intelligence), fiche du ${fdate((a.ficheAt||'').slice(0,10))}`,'Publié','ok');
    if(E)add(`Estimations ${E.y.join(', ')}`,E.src.map((s,i)=>E.y[i]+' : '+(FI_SRC_L[s]||'non estimé')).join(' ; ')+(E.msSrc?` (<a href="${esc(E.msSrc)}" target="_blank" rel="noopener">MarketScreener</a>)`:''),E.src.includes('ex')?'Extrapolé':'Consensus',E.src.includes('ex')?'am':'ok');
    add('ROIC, conversion FCF, couverture, DuPont, scénarios, sensibilité','Calculés à partir des comptes ci-dessus ; paramètres des scénarios modifiables','Calcul','ok');
    if(a.fxNote)add('Conversion des comptes en devise de cotation',esc(a.fxNote),'Publié','ok');
    [...tb8.querySelectorAll('tr')].forEach(tr=>{if(/^ROIC$/.test((tr.cells[0]||{}).textContent||'')&&a.roicAuto){tr.cells[1].textContent='Calculé : EBIT × (1 − impôt) / (capitaux propres + dette nette)';tr.cells[2].innerHTML='<span class="tag ok">Calcul</span>';}});}}}

/* ---------- lecture complète d'une société inconnue, sans IA : les données JSON des pages publiques ---------- */
function fiDecode(j){const n=(j.nodes||[]).find(x=>x&&x.type==='data');if(!n)throw new Error('format');const D=n.data,memo=new Map();
  const R=i=>{if(i===-1)return undefined;if(memo.has(i))return memo.get(i);const v=D[i];let o;if(Array.isArray(v)){o=[];memo.set(i,o);v.forEach(k=>o.push(R(k)));}else if(v&&typeof v==='object'){o={};memo.set(i,o);for(const k in v)o[k]=R(v[k]);}else o=v;return o;};return R(0);}
async function fiReadJson(url){const t=await aiPage(url);const m=String(t).match(/\{[\s\S]*\}/);if(!m)throw new Error('page vide');return fiDecode(JSON.parse(m[0]));}
async function ficheFetch(tk){const m=String(tk).match(/^(.+)\.([A-Z]+)$/),EX={SS:'sha',SZ:'she',AS:'ams',L:'lon',MC:'bme',AX:'asx',PA:'epa',TW:'tpe',T:'tyo',SW:'swx',TO:'tsx',KS:'krx',KQ:'kosdaq',SR:'tadawul',F:'etr',DE:'etr',HK:'hkg',MI:'bit',BR:'ebr',ST:'sto',CO:'cph',HE:'hel',OL:'osl',NS:'nse',BO:'bom',SA:'bvmf',MX:'bmv',JO:'jse',SI:'sgx',V:'tsxv',VI:'vie',WA:'wse',IR:'ise',NZ:'nzx',IS:'ist',TA:'tase',JK:'idx',BK:'set',KL:'klse',LS:'eli',AT:'athex'};
  const p=m?(EX[m[2]]?`/quote/${EX[m[2]]}/${m[2]==='HK'?String(+m[1]):m[1]}`:null):'/stocks/'+tk.toLowerCase().replace('-','.');if(!p)throw new Error('place de cotation non couverte');
  const U=s=>`https://stockanalysis.com${p}${s}/__data.json?x-sveltekit-invalidated=001`,M6=v=>typeof v==='number'?Math.round(v/1e4)/100:null;
  const inc=await fiReadJson(U('/financials/income-statement')),f=inc.financialData;if(!f)throw new Error('comptes absents');
  const fy=[...new Set(f.fiscalYear.slice(1))].sort().slice(-5),g=(F,k,cv)=>fy.map(y=>{const i=F&&F.fiscalYear?F.fiscalYear.lastIndexOf(y):-1,v=i>=0&&F[k]?F[k][i]:null;return typeof v==='number'?(cv?cv(v):v):null;});
  const b={sa:p,cur:'USD',y:fy,rev:g(f,'revenue',M6),ebitda:g(f,'ebitda',M6),ebit:g(f,'ebit',M6),int:g(f,'interestExpense',M6),ebt:g(f,'pretax',M6),tax:g(f,'taxrate',v=>Math.round(v*1000)/10),ni:g(f,'netinc',M6),eps:g(f,'epsdil',v=>Math.round(v*1000)/1000),dps:g(f,'dps',v=>Math.round(v*1000)/1000),sh:g(f,'sharesDiluted',M6),fcf:g(f,'fcf',M6),at:new Date().toISOString()};
  const tryJ=async s=>{try{return await fiReadJson(U(s));}catch(e){return null;}};
  const [bal,cf,fo,fc,st,hi]=[await tryJ('/financials/balance-sheet'),await tryJ('/financials/cash-flow-statement'),await tryJ('/financials'),await tryJ('/forecast'),await tryJ('/statistics'),await tryJ('/history')];
  if(fo&&fo.details&&fo.details.currency)b.cur=fo.details.currency;
  const bf=bal&&bal.financialData,cff=cf&&cf.financialData;if(bf){b.assets=g(bf,'assets',M6);b.eq=g(bf,'equity',M6);b.nd=g(bf,'netcash',v=>-M6(v));}if(cff){b.capex=g(cff,'capex',v=>-M6(v));b.cfo=g(cff,'ncfo',M6);}
  const A=fc&&fc.estimates&&fc.estimates.table&&fc.estimates.table.annual;if(A){const nx=[1,2,3].map(k=>String(+fy[fy.length-1]+k)),pk=(k,cv)=>nx.map(y=>{const i=A.fiscalYear.indexOf(y),v=i>=0&&A[k]?A[k][i]:null;return typeof v==='number'?(cv?cv(v):v):null;});
    b.e={y:nx,rev:pk('revenue',M6),eps:pk('eps',v=>Math.round(v*1000)/1000),ebit:pk('operatingIncome',M6),ni:pk('netIncome',M6),fcf:pk('freeCashFlow',M6),n:pk('analysts')};b.pt=fc.priceTargets||null;}
  if(st&&st.dates){const d=st.dates.data||[];b.ed=(d.find(x=>x.id==='earningsdate')||{}).value||null;b.edTxt=st.dates.text||'';b.xd=(d.find(x=>x.id==='exdivdate')||{}).value||null;const sp=(st.stockPrice&&st.stockPrice.data)||[];b.beta=+((sp.find(x=>x.id==='beta')||{}).hover)||null;}
  const H=hi&&hi.data&&hi.data.data;if(Array.isArray(H)&&H.length){const s=[...H].sort((x,y)=>x.t<y.t?-1:1);b.px=s[s.length-1].c;b.pxd=s[s.length-1].t;b.h=s.filter((x,i)=>i%5===0||i===s.length-1).map(x=>[x.t,x.c]);}
  if(!b.rev.some(v=>v!==null))throw new Error('comptes illisibles');
  fiStore()[String(tk).toUpperCase()]=b;fiSave();return b;}

/* ---------- ouverture depuis le mapping : cache d'abord (instantané), sinon lecture complète puis mise en cache ---------- */
function ficheOpen(sym,b){const k=sym.replace(/[^A-Z0-9]/gi,'').toUpperCase().slice(0,12)||sym;let key=k;while(S.an.assets[key]&&String(S.an.assets[key].t).toUpperCase()!==sym.toUpperCase())key+='_';
  const a=S.an.assets[key]||(S.an.assets[key]={t:sym,n:sym,roic:null,ovNote:'',peers:[]});ficheApply(a,b,sym,true);
  ui.tk=key;ui.tab='an';ui.anX=null;ui.anmOpen=false;recalc&&recalc();save();renderAll();const m=document.getElementById('main');if(m)m.scrollTop=0;return a;}
if(typeof uvOpenCo==='function'){const _uo=uvOpenCo;uvOpenCo=async function(sym){
  const cov=Object.keys(S.an.assets).find(k=>{const r=uvFind(k);return r&&r[0]===sym;});if(cov)return _uo.apply(this,arguments);
  const b=ficheGet(sym);if(b){const a=ficheOpen(sym,b);toast(`${a.n} : fiche complète chargée depuis le cache (${fdate((b.at||FICHE_DATA.at).slice(0,10))})`);return;}
  if(typeof AI==='object'&&AI.mcp){const r=UNIV.rows.find(x=>x[0]===sym);toast(`${r?r[1]:sym} : lecture complète des comptes, estimations et cours…`);
    try{const nb=await ficheFetch(sym);const a=ficheOpen(sym,nb);toast(`${a.n} : fiche complète chargée et mise en cache`);return;}catch(e){toast(`Lecture directe impossible (${e.message||e}) : Claude prend le relais`);}}
  return _uo.apply(this,arguments);};}

/* ---------- mise à niveau des titres couverts (une fois par version de fiche) et paramètres par défaut ---------- */
function fiMigrate(){const c=S.an.crit,dc=DEF.an.crit;[['scBm',-20],['scBg',-10],['scUm',15],['scUg',5]].forEach(([k,v])=>{if(dc[k]===undefined)dc[k]=v;if(c[k]===undefined)c[k]=v;});
  Object.keys(S.an.assets).forEach(id=>{const a=S.an.assets[id];if(a.fv===FICHE_V)return;const k=ficheKeyOf(id),b=k&&ficheGet(k);if(!b)return;
    const keep={n:a.n,sec:a.sec,sub:a.sub,g:a.g,tg:a.tg,wacc:a.wacc,cat:a.cat,catTxt:a.catTxt,tamS:a.tamS,tamTxt:a.tamTxt,peers:a.peers,ovNote:a.ovNote,t:a.t};
    ficheApply(a,b,k,false);Object.assign(a,keep);const D=DEF.an.assets[id];if(D&&D.fv!==FICHE_V){const kd={n:D.n,sec:D.sec,sub:D.sub,g:D.g,tg:D.tg,wacc:D.wacc,cat:D.cat,catTxt:D.catTxt,tamS:D.tamS,tamTxt:D.tamTxt,peers:D.peers,ovNote:D.ovNote,t:D.t};ficheApply(D,b,k,false);Object.assign(D,kd);}});}
try{fiMigrate();}catch(e){console.error('fiche',e);}
try{if(typeof recalc==='function')recalc();}catch(e){}
{const _r=renderAN;renderAN=function(){_r.apply(this,arguments);try{fiEnrich();}catch(e){console.error('fiche',e);}};}
try{renderAll();}catch(e){console.error('fiche',e);}
