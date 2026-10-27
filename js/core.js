
/* ============ État ============ */
const clone=o=>JSON.parse(JSON.stringify(o));
let S=clone(DEF);
let ui={ty:1,tab:'bp',edit:false,tk:'MC',sel:'helio',secTarget:'energy',geo:'W',cmA:'brent',cmT:'t',cmAll:false,plan:'pack',qmsg:'',pfSel:0};
const pending=new Set();
const STORE='override-desk-v9';
try{const raw=localStorage.getItem(STORE);if(raw){const d=JSON.parse(raw);if(d.S&&d.S.bp&&d.S.an&&d.S.sc&&d.S.pf)S=d.S;if(d.ui)ui=Object.assign(ui,d.ui,{edit:false});}}catch(e){}
Object.keys(DEF).forEach(k=>{if(!S[k])S[k]=clone(DEF[k]);});
Object.keys(DEF).forEach(m=>{Object.keys(DEF[m]).forEach(k=>{if(S[m][k]===undefined)S[m][k]=clone(DEF[m][k]);});});
if(!['bp','an','sc','pf','cm','ab'].includes(ui.tab))ui.tab='bp';
if(!ui.geo)ui.geo='W';
function save(){try{localStorage.setItem(STORE,JSON.stringify({S,ui}))}catch(e){}}

/* ============ Utilitaires ============ */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const getP=(o,p)=>p.split('.').reduce((a,k)=>a==null?undefined:a[k],o);
function setP(o,p,v){const k=p.split('.');let a=o;for(let i=0;i<k.length-1;i++)a=a[k[i]];a[k[k.length-1]]=v;}
const nf=(n,d)=>(n!==null&&n!==''&&isFinite(n))?(+n).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const auto=n=>(n===null||n===''||!isFinite(n))?'—':Number.isInteger(+n)?nf(n,0):Math.abs(n)<1?nf(n,3):Math.abs(n)<100?nf(n,2):nf(n,1);
const pct=(n,d=1)=>isFinite(n)&&n!==null?nf(n,d)+' %':'—';
const sgn=(n,d=1)=>isFinite(n)&&n!==null?(n>=0?'+':'')+nf(n,d)+' %':'—';
function big(n,c='€'){if(n===null||!isFinite(n))return'—';const a=Math.abs(n);if(a>=1e9)return nf(n/1e9,1)+' Md'+c;if(a>=1e6)return nf(n/1e6,1)+' M'+c;if(a>=1e3)return nf(n/1e3,0)+' k'+c;return nf(n,0)+' '+c;}
const mm=(n,c)=>{if(n===null||!isFinite(n))return'—';return Math.abs(n)>=1000?nf(n/1000,1)+' Md'+(c?' '+c:''):nf(n,0)+' M'+(c?' '+c:'');};
const cls=(v,good=true)=>v>=0===good?'up':'down';
const median=a=>{const s=a.filter(x=>x!==null&&isFinite(x)).sort((x,y)=>x-y);if(!s.length)return NaN;const m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sum=a=>a.reduce((x,y)=>x+(+y||0),0);

function fld(p,t='n',o={}){
  const v=getP(S,p),d=getP(DEF,p),ov=JSON.stringify(v)!==JSON.stringify(d)?' ovr':'';
  const isN=t==='n'||t==='nn';
  if(!ui.edit){
    if(t==='a')return `<p class="v txt${ov}">${esc(v)||'—'}</p>`;
    const txt=isN?((v===null||v===''||v===undefined)?(o.empty||'—'):o.raw?String(v):o.d!==undefined?nf(+v,o.d):auto(Number(v))):t==='s'?(o.opts[v]??v):v;
    return `<span class="v${isN?' num':''}${ov}">${esc(txt)||'—'}</span>`;
  }
  if(t==='s')return `<select class="f${ov}" data-k="${p}" data-t="s" aria-label="${esc(o.al||p)}">${Object.entries(o.opts).map(([k,l])=>`<option value="${esc(k)}"${String(k)===String(v)?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
  if(t==='a')return `<textarea class="f${ov}" data-k="${p}" data-t="a" rows="${o.rows||3}" aria-label="${esc(o.al||p)}">${esc(v)}</textarea>`;
  return `<input class="f${isN?' num':''}${ov}" data-k="${p}" data-t="${t}" type="${isN?'number':'text'}" ${isN?'step="any" inputmode="decimal"':''} value="${esc(v??'')}" ${o.ph?`placeholder="${esc(o.ph)}"`:''} aria-label="${esc(o.al||p)}">`;
}
const F=(label,p,t='n',o={})=>`<label class="fld"><span class="lb">${label}</span><span class="fv">${fld(p,t,Object.assign({al:label},o))}${o.u?`<em class="u">${o.u}</em>`:''}</span></label>`;
const srcTag=(v,lab)=>(v||'').trim()?`<span class="tag ok">Sourcé</span>`:`<span class="tag am">${lab||'À sourcer'}</span>`;

/* ============ Graphiques SVG ============ */
function scatter(pts,o){
  const W=360,H=272,L=34,R=10,T=10,B=34,iw=W-L-R,ih=H-T-B;
  const cl=v=>Math.max(0,Math.min(100,v));
  const X=v=>L+cl(v)/100*iw,Y=v=>T+ih-cl(v)/100*ih;
  let s=`<svg class="sc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title)}">`;
  if(o.hi!==false)s+=`<rect x="${X(50)}" y="${T}" width="${iw/2}" height="${ih/2}" class="qhi"/>`;
  s+=`<rect x="${L}" y="${T}" width="${iw}" height="${ih}" class="frame"/>`;
  s+=`<line x1="${X(50)}" y1="${T}" x2="${X(50)}" y2="${T+ih}" class="mid"/><line x1="${L}" y1="${Y(50)}" x2="${L+iw}" y2="${Y(50)}" class="mid"/>`;
  const q=o.q;
  s+=`<text x="${L+6}" y="${T+14}" class="ql">${q[0]}</text><text x="${L+iw-6}" y="${T+14}" class="ql" text-anchor="end">${q[1]}</text><text x="${L+6}" y="${T+ih-6}" class="ql">${q[2]}</text><text x="${L+iw-6}" y="${T+ih-6}" class="ql" text-anchor="end">${q[3]}</text>`;
  [0,50,100].forEach(v=>{s+=`<text x="${X(v)}" y="${T+ih+13}" class="ax" text-anchor="middle">${v}</text><text x="${L-5}" y="${Y(v)+3}" class="ax" text-anchor="end">${v}</text>`;});
  s+=`<text x="${L+iw/2}" y="${H-4}" class="at" text-anchor="middle">${o.xl}</text><text transform="translate(10 ${T+ih/2}) rotate(-90)" class="at" text-anchor="middle">${o.yl}</text>`;
  const placed=pts.map(p=>({x0:X(p.x)-6,w:12,ly:Y(p.y)+3}));
  pts.map(p=>({p,cx:X(p.x),cy:Y(p.y)})).sort((a,b)=>a.cy-b.cy).forEach(({p,cx,cy})=>{
    const r=p.r||4,right=cx>W-90,lx=right?cx-r-4:cx+r+4,w=p.label.length*4.6;let ly=cy+3;
    const x0=right?lx-w:lx,hit=()=>placed.find(q=>Math.abs(q.ly-ly)<10&&x0<q.x0+q.w&&q.x0<x0+w);
    for(let n=0;n<8&&hit();n++)ly+=9;placed.push({x0,w,ly});
    const lead=Math.abs(ly-(cy+3))>1?`<line x1="${cx}" y1="${cy}" x2="${right?lx+2:lx-2}" y2="${ly-3}" stroke="var(--line2)" stroke-width=".6"/>`:'';
    const shape=p.sq?`<rect x="${cx-r}" y="${cy-r}" width="${2*r}" height="${2*r}" rx="1"/>`:`<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
    s+=`<g class="pt ${p.cls||''}"${p.id?` data-act="${p.act||'pick'}" data-id="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.label)}"`:''}>${lead}${shape}<text x="${lx}" y="${ly}" text-anchor="${right?'end':'start'}">${esc(p.label)}</text></g>`;});
  return s+'</svg>';
}
function bars(yrs,labels){
  const W=360,H=200,L=44,R=8,T=12,B=26,iw=W-L-R,ih=H-T-B;
  const vals=yrs.flatMap(y=>[y.rev,y.ebitda]);const mx=Math.max(1,...vals),mn=Math.min(0,...vals);
  const Y=v=>T+(mx-v)/(mx-mn)*ih;const gw=iw/yrs.length,bw=gw*.28;
  let s=`<svg class="sc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Chiffre d'affaires et EBITDA">`;
  [mx,(mx+mn)/2,mn].forEach(v=>{s+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" class="mid"/><text x="${L-5}" y="${Y(v)+3}" class="ax" text-anchor="end">${big(v,'')}</text>`;});
  yrs.forEach((y,i)=>{const x0=L+gw*i+gw/2;
    s+=`<rect x="${x0-bw-2}" y="${Math.min(Y(y.rev),Y(0))}" width="${bw}" height="${Math.abs(Y(y.rev)-Y(0))}" fill="var(--c-bar)"/>`;
    s+=`<rect x="${x0+2}" y="${Math.min(Y(y.ebitda),Y(0))}" width="${bw}" height="${Math.max(1,Math.abs(Y(y.ebitda)-Y(0)))}" fill="${y.ebitda>=0?'var(--up)':'var(--down)'}"/>`;
    s+=`<text x="${x0}" y="${H-8}" class="ax" text-anchor="middle">${labels?esc(labels[i]):'Année '+(i+1)}</text>`;});
  return s+'</svg>';
}
/* Barres mensuelles / annuelles génériques (valeurs positives ou négatives), ligne optionnelle sur axe secondaire */
function colChart(labels,vals,o={}){
  const W=o.w||560,H=o.h||190,L=46,R=o.line?46:10,T=14,B=24,iw=W-L-R,ih=H-T-B,n=vals.length;
  const mx=Math.max(0,...vals.filter(isFinite)),mn=Math.min(0,...vals.filter(isFinite)),rng=(mx-mn)||1;
  const Y=v=>T+(mx-v)/rng*ih,gw=iw/n,bw=Math.max(3,gw*.62);
  let s=`<svg class="sc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title||'Graphique')}">`;
  const st=niceStep(rng/4);for(let v=Math.ceil(mn/st)*st;v<=mx+1e-9;v+=st)s+=`<line x1="${L}" x2="${L+iw}" y1="${Y(v)}" y2="${Y(v)}" class="mid"/><text x="${L-6}" y="${Y(v)+3}" class="ax" text-anchor="end">${o.fmt?o.fmt(v):nf(v,0)}</text>`;
  vals.forEach((v,i)=>{if(!isFinite(v))return;const x=L+gw*i+(gw-bw)/2;const col=o.colors?o.colors[i]:(v>=0?(o.pos||'var(--c-bar)'):'var(--down)');
    s+=`<rect x="${x}" y="${Math.min(Y(v),Y(0))}" width="${bw}" height="${Math.max(1,Math.abs(Y(v)-Y(0)))}" fill="${col}"><title>${esc(labels[i])} : ${o.fmt?o.fmt(v):nf(v,0)}</title></rect>`;
    if(o.vlab)s+=`<text x="${x+bw/2}" y="${(v>=0?Y(v)-4:Y(v)+11)}" class="ax" text-anchor="middle">${o.vlab(v,i)}</text>`;
    s+=`<text x="${L+gw*i+gw/2}" y="${H-7}" class="ax" text-anchor="middle">${esc(labels[i])}</text>`;});
  if(o.line){const lv=o.line.vals,lmx=Math.max(...lv.filter(isFinite)),lmn=Math.min(0,...lv.filter(isFinite)),Yl=v=>T+(lmx-v)/((lmx-lmn)||1)*ih;
    s+=`<polyline points="${lv.map((v,i)=>isFinite(v)?`${L+gw*i+gw/2},${Yl(v)}`:'').filter(Boolean).join(' ')}" fill="none" stroke="${o.line.c||'var(--hi)'}" stroke-width="1.6"/>`;
    lv.forEach((v,i)=>{if(isFinite(v))s+=`<circle cx="${L+gw*i+gw/2}" cy="${Yl(v)}" r="2.6" fill="${o.line.c||'var(--hi)'}"/>`;});
    [lmx,lmn].forEach(v=>{s+=`<text x="${L+iw+6}" y="${Yl(v)+3}" class="ax">${o.line.fmt?o.line.fmt(v):nf(v,0)}</text>`;});}
  s+=`<line x1="${L}" x2="${L+iw}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line2)"/>`;
  return s+'</svg>';
}
/* Petites séries historiques (5 ans) */
function spark(labels,vals,o={}){
  const W=240,H=96,L=6,R=6,T=16,B=16,iw=W-L-R,ih=H-T-B,n=vals.length;
  const ok=vals.filter(v=>v!==null&&isFinite(v));if(!ok.length)return'<p class="note">Non disponible</p>';
  const mx=Math.max(0,...ok),mn=Math.min(0,...ok),rng=(mx-mn)||1,Y=v=>T+(mx-v)/rng*ih,gw=iw/n,bw=gw*.56;
  let s=`<svg class="sc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title||'')}">`;
  s+=`<line x1="${L}" x2="${W-R}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line2)"/>`;
  if(o.type==='line'){s+=`<polyline points="${vals.map((v,i)=>isFinite(v)&&v!==null?`${L+gw*i+gw/2},${Y(v)}`:'').filter(Boolean).join(' ')}" fill="none" stroke="var(--hi)" stroke-width="1.6"/>`;
    vals.forEach((v,i)=>{if(v!==null&&isFinite(v))s+=`<circle cx="${L+gw*i+gw/2}" cy="${Y(v)}" r="2.4" fill="var(--hi)"/>`;});}
  else vals.forEach((v,i)=>{if(v===null||!isFinite(v))return;s+=`<rect x="${L+gw*i+(gw-bw)/2}" y="${Math.min(Y(v),Y(0))}" width="${bw}" height="${Math.max(1,Math.abs(Y(v)-Y(0)))}" fill="${v>=0?(i===n-1?'var(--hi)':'var(--c-bar)'):'var(--down)'}"/>`;});
  vals.forEach((v,i)=>{s+=`<text x="${L+gw*i+gw/2}" y="${H-3}" class="ax" text-anchor="middle">${esc(String(labels[i]).replace('FY20',"'"))}</text>`;});
  const last=vals[n-1];s+=`<text x="${W-R}" y="11" class="ax" text-anchor="end" style="fill:var(--hi)">${o.fmt?o.fmt(last):auto(last)}</text>`;
  return s+'</svg>';
}
/* Quadrant centré sur zéro (suivi de portefeuille) */
function quadChart(pts,o){
  const W=420,H=300,L=40,R=12,T=12,B=34,iw=W-L-R,ih=H-T-B;
  const xm=Math.max(10,...pts.map(p=>Math.abs(p.x)))*1.15,ym=Math.max(10,...pts.map(p=>Math.abs(p.y)))*1.15;
  const X=v=>L+(v+xm)/(2*xm)*iw,Y=v=>T+(ym-v)/(2*ym)*ih;
  let s=`<svg class="sc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title)}">`;
  s+=`<rect x="${X(0)}" y="${T}" width="${iw/2}" height="${ih/2}" fill="rgba(16,185,129,.05)"/><rect x="${L}" y="${Y(0)}" width="${iw/2}" height="${ih/2}" fill="rgba(220,38,38,.05)"/>`;
  s+=`<rect x="${L}" y="${T}" width="${iw}" height="${ih}" class="frame"/><line x1="${X(0)}" x2="${X(0)}" y1="${T}" y2="${T+ih}" stroke="var(--line2)"/><line x1="${L}" x2="${L+iw}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line2)"/>`;
  const q=o.q;s+=`<text x="${L+6}" y="${T+13}" class="ql">${q[0]}</text><text x="${L+iw-6}" y="${T+13}" class="ql" text-anchor="end">${q[1]}</text><text x="${L+6}" y="${T+ih-6}" class="ql">${q[2]}</text><text x="${L+iw-6}" y="${T+ih-6}" class="ql" text-anchor="end">${q[3]}</text>`;
  [-ym,0,ym].forEach(v=>{s+=`<text x="${L-5}" y="${Y(v)+3}" class="ax" text-anchor="end">${(v>0?'+':'')+nf(v,0)} %</text>`;});
  [-xm,0,xm].forEach(v=>{s+=`<text x="${X(v)}" y="${T+ih+12}" class="ax" text-anchor="middle">${(v>0?'+':'')+nf(v,0)}</text>`;});
  s+=`<text x="${L+iw/2}" y="${H-4}" class="at" text-anchor="middle">${o.xl}</text><text transform="translate(10 ${T+ih/2}) rotate(-90)" class="at" text-anchor="middle">${o.yl}</text>`;
  pts.forEach(p=>{const cx=X(p.x),cy=Y(p.y),right=cx>W-80;
    s+=`<g class="pt ${p.cls||''}" data-act="${p.act||'pfsel'}" data-id="${p.id}" tabindex="0" role="button" aria-label="${esc(p.label)}"><circle cx="${cx}" cy="${cy}" r="${p.r||5}"/><text x="${right?cx-9:cx+9}" y="${cy+3}" text-anchor="${right?'end':'start'}">${esc(p.label)}</text></g>`;});
  return s+'</svg>';
}

/* ============ Moteur graphique (TradingView Lightweight Charts) ============ */
const ICON={
  bp:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12h5M10 15h5M10 18h3"/>',
  an:'<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/><circle cx="18" cy="6" r="2"/>',
  sc:'<path d="M4 4v16h16"/><circle cx="9" cy="14.5" r="1.7"/><circle cx="14" cy="9" r="2.6"/><circle cx="18.5" cy="13.5" r="1.3"/>',
  pf:'<path d="M3 7h18v12H3z"/><path d="M8 7V5h8v2"/><path d="M3 12h18"/><path d="M11 12v2h2v-2"/>',
  ab:'<rect x="3" y="6" width="18" height="13" rx="1.5"/><path d="M3 10h18M7 15h4"/>',
  cm:'<path d="M3 19h18"/><path d="M5 19l1.6-5h5.8l1.6 5"/><path d="M10.6 19l1.6-5h5.8L19.6 19"/><path d="M8 14l1.6-5h5.8L17 14"/>',
  pen:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  calc:'<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  dl:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'
};
const ic=(k,c='')=>`<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const TVC={up:'#10B981',down:'#DC2626',accent:'#E4E4E7',amber:'#D97706',text:'#D4D4D8',mute:'#71717A',grid:'rgba(39,39,42,.7)',line:'#27272A',bar:'#52525B'};
const CH={},CHQ={};
function queueChart(id,make,fb){CHQ[id]={make,fb};}
function mountCharts(){
  for(const id of Object.keys(CHQ)){const q=CHQ[id];delete CHQ[id];
    if(CH[id]){try{CH[id].remove();}catch(e){}delete CH[id];}
    const el=document.getElementById(id);if(!el)continue;
    if(typeof LightweightCharts==='undefined'){el.classList.add('fb');el.innerHTML=q.fb?q.fb():'';continue;}
    try{CH[id]=q.make(el);}catch(e){el.classList.add('fb');el.innerHTML=q.fb?q.fb():'';}
  }
}
function lwBase(el,fmt){
  const L=LightweightCharts;
  return L.createChart(el,{autoSize:true,
    layout:{background:{type:'solid',color:'transparent'},textColor:TVC.mute,fontSize:11,fontFamily:getComputedStyle(document.body).fontFamily},
    grid:{vertLines:{color:TVC.grid},horzLines:{color:TVC.grid}},
    rightPriceScale:{borderColor:TVC.line,scaleMargins:{top:.1,bottom:.1}},
    timeScale:{borderColor:TVC.line,fixLeftEdge:true,fixRightEdge:true,lockVisibleTimeRangeOnResize:true},
    crosshair:{mode:L.CrosshairMode.Normal,vertLine:{color:'#71717A',labelBackgroundColor:'#3F3F46'},horzLine:{color:'#71717A',labelBackgroundColor:'#3F3F46'}},
    localization:{locale:'fr-FR',priceFormatter:fmt||(p=>nf(p,2))},
    handleScroll:{mouseWheel:false,pressedMouseMove:true,horzTouchDrag:true,vertTouchDrag:false},
    handleScale:{mouseWheel:false,pinch:true,axisPressedMouseMove:true}});
}
const kfmt=p=>Math.abs(p)>=1e6?nf(p/1e6,2)+' M':nf(p/1000,0)+' k';
function niceStep(r){const p=10**Math.floor(Math.log10(r||1)),n=r/p;return(n<1.5?1:n<3?2:n<7?5:10)*p;}
function levelsChart(L,cur){
  const ok=L.filter(x=>isFinite(x.v)&&x.v>0);if(ok.length<2)return'<p class="note">Niveaux non calculables avec ces hypothèses.</p>';
  let mn=Math.min(...ok.map(x=>x.v)),mx=Math.max(...ok.map(x=>x.v));const pad=(mx-mn)*.16||mx*.1;mn=Math.max(0,mn-pad);mx+=pad;
  const W=window.innerWidth<700?440:820,H=window.innerWidth<700?280:300,R=84,T=6,B=6,iw=W-R,ih=H-T-B,Y=v=>T+(mx-v)/(mx-mn)*ih,g=k=>(ok.find(x=>x.key===k)||{}).v;
  let s=`<svg class="lv" viewBox="0 0 ${W} ${H}" role="img" aria-label="Zones d'intervention sur l'axe des prix">`;
  const st=niceStep((mx-mn)/6);for(let v=Math.ceil(mn/st)*st;v<=mx;v+=st)s+=`<line x1="0" x2="${iw}" y1="${Y(v)}" y2="${Y(v)}" stroke="${TVC.grid}"/><text x="${iw+8}" y="${Y(v)+4}" fill="${TVC.mute}" font-size="11">${nf(v,st<1?2:0)}</text>`;
  const zone=(y1,y2,fill,lab,col)=>{if(!(isFinite(y1)&&isFinite(y2)))return;const a=Math.max(T,Math.min(y1,y2)),b=Math.min(H-B,Math.max(y1,y2));if(b-a<2)return;
    s+=`<rect x="0" y="${a}" width="${iw}" height="${b-a}" fill="${fill}"/>`;if(b-a>16)s+=`<text x="10" y="${a+15}" fill="${col}" font-size="11" font-weight="600">${lab}</text>`;};
  zone(Y(g('sl')),H-B,'rgba(220,38,38,.07)','Invalidation',TVC.down);
  zone(Y(g('buy')),Y(g('sl')),'rgba(16,185,129,.08)',"Zone d'achat",TVC.up);
  zone(T,Y(g('tp')),'rgba(217,119,6,.07)','Prise de profit',TVC.amber);
  s+=`<line x1="${iw}" x2="${iw}" y1="0" y2="${H}" stroke="${TVC.line}"/>`;
  const tags=ok.map(x=>({...x,y:Y(x.v)})).sort((a,b)=>a.y-b.y);
  for(let i=1;i<tags.length;i++)if(tags[i].y-(tags[i-1].ty??tags[i-1].y)<19)tags[i].ty=(tags[i-1].ty??tags[i-1].y)+19;
  tags.forEach(t=>{const ty=t.ty??t.y,isP=t.key==='px',fg=isP?'#09090B':'#fff';
    s+=`<line x1="0" x2="${iw}" y1="${t.y}" y2="${t.y}" stroke="${t.c}" stroke-width="${isP?1.5:1}" ${isP?'':'stroke-dasharray="5 4"'}/>`;
    s+=`<text x="${iw-8}" y="${t.y-5}" fill="${t.c}" font-size="11" text-anchor="end" font-weight="${isP?700:500}">${t.k}</text>`;
    s+=`<rect x="${iw+1}" y="${ty-9}" width="${R-2}" height="18" rx="2" fill="${t.c}"/><text x="${iw+R/2}" y="${ty+4}" fill="${fg}" font-size="11" font-weight="600" text-anchor="middle">${nf(t.v,2)}</text>`;});
  return s+'</svg>';
}
