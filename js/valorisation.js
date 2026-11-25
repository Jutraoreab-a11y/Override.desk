/* ============ v8.21 : valorisation multi-méthodes (Analyse financière) ============
   Quatre méthodes, chacune calculée avec ses propres métriques, toutes modifiables, puis un prix unique = moyenne des méthodes applicables.
   1. DCF : flux de trésorerie disponibles actualisés au WACC, valeur terminale de Gordon.
   2. Multiples : VE/EBITDA et PER des comparables appliqués aux agrégats de la société.
   3. Gordon-Shapiro : dividende de l'année suivante / (coût des fonds propres − croissance perpétuelle).
   4. Bénéfices résiduels : capitaux propres par action × (ROE − g) / (coût des fonds propres − g), c'est-à-dire la valeur créée au-delà du coût du capital.
   Valeurs par défaut : données publiées du titre (S&P Global via stockanalysis.com, comparables), hypothèses du titre (croissance, WACC).
   Une métrique modifiée est conservée dans a.val et marquée « modifiée » ; « Réinitialiser » revient aux valeurs par défaut. */
const VAL_ANG={
  dcf:"Très sensible au WACC et à la croissance terminale (souvent plus de la moitié de la valeur) ; peu fiable si les flux de trésorerie sont négatifs ou très irréguliers.",
  mult:"Reproduit l'humeur du marché : si tout le secteur est cher, la société paraît bien valorisée ; dépend du choix des comparables.",
  gs:"Ne voit que le dividende : inutilisable pour une société qui ne distribue pas ou qui rachète ses actions ; explose quand la croissance approche le coût des fonds propres.",
  ri:"Repose sur des capitaux propres comptables (rachats d'actions, écarts d'acquisition, dépréciations les déforment) et suppose un ROE durable."
};
const VAL_LAB={dcf:'DCF (flux actualisés)',mult:'Multiples des comparables',gs:'Gordon-Shapiro (dividendes)',ri:'Bénéfices résiduels'};
const valNum=v=>v!==null&&v!==''&&v!==undefined&&isFinite(v);
function anVal(a,X){
  const V=a.val||{},L=X.L,fx=+a.fx||1,sh=+a.shares,lastOk=arr=>{if(!Array.isArray(arr))return NaN;for(let i=arr.length-1;i>=0;i--)if(valNum(arr[i]))return +arr[i];return NaN;};
  const pick=(k,d)=>valNum(V[k])?+V[k]:d,ov=k=>valNum(V[k]);
  /* 1. DCF */
  const fcf0=pick('fcf',X.base),g=pick('g',+a.g),w=pick('wacc',+a.wacc),tg=pick('tg',+a.tg);
  let dcf=NaN,tvw=NaN;if(fcf0>0&&w>tg&&sh>0){let pv=0,f=fcf0;for(let t=1;t<=5;t++){f*=1+g/100;pv+=f/(1+w/100)**t;}const tv=f*(1+tg/100)/(w/100-tg/100),pvtv=tv/(1+w/100)**5;tvw=pvtv/(pv+pvtv);dcf=(pv+pvtv-(+a.nd[L]))/sh*fx;}
  /* 2. Multiples */
  const evm=pick('evm',X.medEvE),pem=pick('pem',X.medPE),eb=pick('ebitda',+a.ebitda[L]),eps=pick('eps',+a.eps[L]);
  const pEv=evm>0&&eb>0&&sh>0?(evm*eb-(+a.nd[L]))/sh*fx:NaN,pPe=pem>0&&eps>0?pem*eps*fx:NaN,okm=[pEv,pPe].filter(v=>isFinite(v)&&v>0),mult=okm.length?sum(okm)/okm.length:NaN;
  /* 3. Gordon-Shapiro */
  const ke=pick('ke',+a.wacc),gg=pick('gg',+a.tg),d0=pick('dps',lastOk(a.dps));
  const gs=d0>0&&ke>gg?d0*(1+gg/100)/(ke/100-gg/100)*fx:NaN;
  /* 4. Bénéfices résiduels */
  const eq=lastOk(a.eq),bv0=sh>0&&eq>0?eq/sh:NaN,roeA=Array.isArray(a.roe)?a.roe.slice(-3).filter(valNum).map(Number):[],roe0=roeA.length?sum(roeA)/roeA.length:NaN;
  const bv=pick('bvps',bv0),roe=pick('roe',roe0),kr=pick('keri',ke),gr=pick('gri',+a.tg);
  const ri=bv>0&&isFinite(roe)&&kr>gr?bv*(roe/100-gr/100)/(kr/100-gr/100)*fx:NaN;
  const m=[
    {k:'dcf',l:VAL_LAB.dcf,v:dcf,why:fcf0>0?(w>tg?'':'WACC inférieur ou égal à la croissance terminale'):'FCF de base négatif ou nul',f:[
      ['fcf','FCF de base',fcf0,'M '+(a.rcur||''),ov('fcf'),'moyenne des 3 derniers exercices'],['g','Croissance des FCF sur 5 ans',g,'%',ov('g'),'hypothèse du titre'],
      ['wacc','WACC',w,'%',ov('wacc'),'hypothèse du titre'],['tg','Croissance terminale',tg,'%',ov('tg'),'hypothèse du titre']],x:isFinite(tvw)?`valeur terminale : ${nf(tvw*100,0)} % de la valeur`:''},
    {k:'mult',l:VAL_LAB.mult,v:mult,why:'multiples ou agrégats négatifs',f:[
      ['evm','VE / EBITDA retenu',evm,'×',ov('evm'),'médiane des comparables'],['ebitda','EBITDA de référence',eb,'M '+(a.rcur||''),ov('ebitda'),'dernier exercice publié'],
      ['pem','PER retenu',pem,'×',ov('pem'),'médiane des comparables'],['eps','BPA de référence',eps,a.rcur||'',ov('eps'),'dernier exercice publié']],
      x:[isFinite(pEv)&&pEv>0?`par VE/EBITDA : ${nf(pEv,2)}`:'',isFinite(pPe)&&pPe>0?`par PER : ${nf(pPe,2)}`:''].filter(Boolean).join(' · ')},
    {k:'gs',l:VAL_LAB.gs,v:gs,why:d0>0?'coût des fonds propres inférieur ou égal à la croissance':'aucun dividende publié',f:[
      ['dps','Dividende par action (dernier)',d0,a.rcur||'',ov('dps'),'dernier exercice publié'],['ke','Coût des fonds propres',ke,'%',ov('ke'),'par défaut : WACC du titre'],
      ['gg','Croissance perpétuelle du dividende',gg,'%',ov('gg'),'par défaut : croissance terminale']],x:isFinite(a.beta)?`bêta publié : ${nf(a.beta,2)}`:''},
    {k:'ri',l:VAL_LAB.ri,v:ri,why:bv>0?'coût des fonds propres inférieur ou égal à la croissance':'capitaux propres non publiés ou négatifs',f:[
      ['bvps','Capitaux propres par action',bv,a.rcur||'',ov('bvps'),'dernier bilan publié'],['roe','ROE durable',roe,'%',ov('roe'),'moyenne des 3 derniers exercices'],
      ['keri','Coût des fonds propres',kr,'%',ov('keri'),'par défaut : WACC du titre'],['gri','Croissance perpétuelle',gr,'%',ov('gri'),'par défaut : croissance terminale']],
      x:isFinite(bv)&&bv>0&&isFinite(roe)?`P/B justifié : ${nf((roe-gr)/(kr-gr),2)}×`:''}
  ];
  m.forEach(x=>{x.ok=isFinite(x.v)&&x.v>0;});
  /* v8.40 : prix cible unique = moyenne des 3 méthodes de valeur (DCF, multiples, bénéfices résiduels) ; Gordon-Shapiro reste affiché à titre indicatif */
  m.forEach(x=>{x.inAvg=x.k!=='gs';});const ok=m.filter(x=>x.ok&&x.inAvg).map(x=>x.v),avgV=ok.length?sum(ok)/ok.length:NaN;
  return{m,avg:avgV,n:ok.length,min:ok.length?Math.min(...ok):NaN,max:ok.length?Math.max(...ok):NaN,tvw};
}
function anValHTML(a,R,cur){const VM=R.VM;if(!VM)return'';const px=+a.price,up=isFinite(VM.avg)&&px>0?(VM.avg/px-1)*100:NaN,disp=VM.n>1&&VM.avg>0?(VM.max-VM.min)/VM.avg*100:NaN;
  const inp=(k,f)=>{const v=f[2];return`<label class="fld vl-f${f[4]?' vl-ov':''}"><span class="lb">${esc(f[1])}${f[4]?' <span class="tag am">modifiée</span>':''}</span><span class="fv"><input class="vl-in" type="number" step="any" data-vk="${f[0]}" value="${valNum(v)?Math.round(v*1000)/1000:''}" placeholder="non publié"><small>${esc(f[3])}</small></span><span class="meta vl-d">${esc(f[5])}</span></label>`;};
  return`<div class="card s12 vl-card"><h2><span>7. Valorisation multi-méthodes <span class="meta">un prix cible unique : la moyenne des trois méthodes de valeur</span></span>
      <button class="btn sm" data-act="valreset" data-k="all">Réinitialiser toutes les métriques</button></h2>
    <div class="vl-sum">
      <div class="stat vl-target"><div class="k">Prix cible</div><div class="x">${isFinite(VM.avg)?nf(VM.avg,2)+' '+esc(cur):'non calculable'}</div><div class="d">moyenne de ${VM.n} méthode${VM.n>1?'s':''} sur 3 (DCF, multiples, bénéfices résiduels)</div></div>
      <div class="stat"><div class="k">Cours</div><div class="x">${nf(px,2)} ${esc(cur)}</div><div class="d">${esc(a.pxDate||'')}</div></div>
      <div class="stat"><div class="k">Potentiel</div><div class="x ${isFinite(up)?(up>=0?'up':'down'):''}">${isFinite(up)?sgn(up,1):'—'}</div><div class="d">prix cible / cours − 1</div></div>
    </div>
    <div class="vl-grid">${VM.m.map(m=>`<div class="vl-m${m.ok?'':' vl-na'}">
      <div class="vl-h"><b>${esc(m.l)}${m.inAvg?'':' <span class="tag am">indicatif, hors moyenne</span>'}</b><span class="vl-v">${m.ok?nf(m.v,2)+' '+esc(cur):'non applicable'}</span></div>
      ${m.ok?(isFinite(px)&&px>0?`<div class="meta">${sgn((m.v/px-1)*100,1)} vs cours${m.x?' · '+esc(m.x):''}</div>`:''):`<div class="meta">${esc(m.why)}</div>`}
      <div class="vl-fs">${m.f.map(f=>inp(m.k,f)).join('')}</div>
      <p class="vl-ang"><b>Angle mort :</b> ${esc(VAL_ANG[m.k])}</p>
      <button class="lnk" data-act="valreset" data-k="${m.k}">Réinitialiser cette méthode</button></div>`).join('')}</div>
    <p class="note">Chaque méthode corrige l'angle mort des autres : le DCF capte la génération de trésorerie, les multiples le prix du marché, Gordon-Shapiro le rendement versé à l'actionnaire, les bénéfices résiduels la création de valeur au-delà du coût du capital. Le prix cible est la moyenne simple du DCF, des multiples et des bénéfices résiduels quand ils sont applicables (Gordon-Shapiro, souvent hors d'échelle pour les sociétés qui rachètent leurs actions, est affiché à titre indicatif) ; il sert de valeur de référence pour les zones d'intervention et la décision. Montants en ${esc(a.rcur||cur)}, convertis en ${esc(cur)} au taux du titre.</p>
  </div>`;}
const VAL_KEYS={dcf:['fcf','g','wacc','tg'],mult:['evm','ebitda','pem','eps'],gs:['dps','ke','gg'],ri:['bvps','roe','keri','gri']};
document.addEventListener('change',e=>{const t=e.target;if(!t.classList||!t.classList.contains('vl-in'))return;const a=S.an.assets[ui.tk];if(!a)return;
  a.val=a.val||{};const k=t.dataset.vk,v=t.value.trim();if(v===''||!isFinite(+v.replace(',','.')))delete a.val[k];else a.val[k]=+v.replace(',','.');
  save();renderAll();},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act="valreset"]');if(!b)return;const a=S.an.assets[ui.tk];if(!a||!a.val)return;
  const k=b.dataset.k;if(k==='all')a.val={};else(VAL_KEYS[k]||[]).forEach(x=>delete a.val[x]);save();renderAll();toast(k==='all'?'Métriques de valorisation réinitialisées':'Méthode réinitialisée : '+VAL_LAB[k]);},true);
