/* ============ v8.33 : confort de lecture ============
   - La page ne remonte plus en haut quand les données arrivent : la position de lecture est conservée.
   - Graphiques : réticule en pointillés, légende qui suit le curseur avec la valeur de chaque courbe dans sa couleur,
     déplacement libre à gauche et à droite (glisser), double-clic pour tout revoir.
   - Commodities : toutes les matières premières par catégorie dans le panneau de droite, camembert de répartition des signaux,
     sources en grille horizontale. */

/* ---------- styles ---------- */
if(!document.getElementById('fd-plus-css')){const st=document.createElement('style');st.id='fd-plus-css';st.textContent=`
.lwleg{position:absolute;top:6px;left:8px;z-index:3;pointer-events:none;display:none;flex-wrap:wrap;gap:4px 12px;max-width:calc(100% - 90px);
  padding:5px 9px;border-radius:6px;background:rgba(9,9,11,.82);border:1px solid #27272A;font:12px/1.35 var(--mono,ui-monospace,monospace);color:#D4D4D8}
.lwleg b{color:#FAFAFA;font-weight:600;margin-right:4px}.lwleg span{white-space:nowrap}.lwleg i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:0}
.lwhint{position:absolute;right:92px;bottom:30px;z-index:3;pointer-events:none;font-size:11px;color:#52525B}
table.srcg,table.srcg tbody{display:block;width:100%}
table.srcg tbody{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:0 20px}
table.srcg tr{display:block;border-bottom:1px solid var(--line,#27272A);padding:10px 0}
table.srcg td{display:block;border:0!important;padding:2px 0!important;white-space:normal}
table.srcg td:first-child{color:var(--hi,#FAFAFA);font-weight:600;font-size:12.5px;text-transform:none}
.sigpie{display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:4px 2px}
.sigpie svg{flex:none}.sigpie ul{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:13px;min-width:160px;flex:1}
.sigpie li{display:flex;align-items:center;gap:8px}.sigpie li i{width:10px;height:10px;border-radius:2px;flex:none}.sigpie li b{margin-left:auto;color:var(--hi,#FAFAFA);font-variant-numeric:tabular-nums}
.sigtop{margin-top:12px;border-top:1px solid var(--line,#27272A);padding-top:8px;font-size:12.5px}
.sigtop div{display:flex;justify-content:space-between;gap:8px;padding:3px 0;color:var(--mute,#A1A1AA)}.sigtop div b{color:var(--text,#D4D4D8);font-weight:500}
.cmb-g{padding:8px 12px 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute,#71717A);border-top:1px solid var(--line,#27272A);margin-top:4px}
.cmb-r{display:grid;grid-template-columns:minmax(0,1fr) 78px 58px;align-items:center;gap:8px;padding:5px 12px;font-size:12.5px}
.cmb-r:hover{background:rgba(255,255,255,.03)}
.cmb-r .n{display:flex;flex-direction:column;min-width:0}.cmb-r .n b{color:var(--hi,#FAFAFA);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cmb-r .n small{color:var(--mute,#71717A);font-size:10.5px}
.cmb-r .p{text-align:right;font-variant-numeric:tabular-nums;color:var(--text,#D4D4D8)}.cmb-r .c{text-align:right;font-variant-numeric:tabular-nums}
.cmb-r .c.up{color:#10B981}.cmb-r .c.dn{color:#DC2626}.cmb-r .c.fl{color:var(--mute,#71717A)}
.cmb-note{padding:8px 12px 14px;font-size:11px;color:var(--mute,#71717A)}`;document.head.appendChild(st);}

/* ---------- graphiques : légende colorée au curseur, double-clic pour recadrer ---------- */
function lwPlus(ch,el){try{
  if(getComputedStyle(el).position==='static')el.style.position='relative';
  const leg=document.createElement('div');leg.className='lwleg';el.appendChild(leg);
  const hint=document.createElement('div');hint.className='lwhint';hint.textContent='glisser pour déplacer · double-clic pour tout revoir';el.appendChild(hint);
  const SER=[];['addLineSeries','addAreaSeries','addHistogramSeries','addBaselineSeries','addCandlestickSeries'].forEach(m=>{if(typeof ch[m]!=='function')return;const o=ch[m].bind(ch);
    ch[m]=function(opt){const s=o(opt);SER.push(s);return s;};});
  const fmtT=t=>{if(typeof t==='string')return fd(t);if(t&&t.year)return fd(`${t.year}-${String(t.month).padStart(2,'0')}-${String(t.day).padStart(2,'0')}`);
    if(typeof t==='number')return new Date(t*1000).toLocaleDateString('fr-FR');return'';};
  ch.subscribeCrosshairMove(p=>{if(!p||!p.time||!p.seriesData||!p.point){leg.style.display='none';return;}
    const items=[];SER.forEach(s=>{const v=p.seriesData.get(s);if(!v)return;const val=v.value!==undefined?v.value:v.close;if(!isFinite(val))return;
      const o=s.options(),c=v.color||o.color||o.lineColor||'#E4E4E7',t=o.title||'';
      items.push(`<span><i style="background:${c}"></i>${esc(t)} <b style="color:${c}">${nf(val,Math.abs(val)<10?3:2)}</b></span>`);});
    if(!items.length){leg.style.display='none';return;}
    leg.innerHTML=`<span><b>${fmtT(p.time)}</b></span>`+items.join('');leg.style.display='flex';});
  el.addEventListener('dblclick',()=>{try{ch.timeScale().fitContent();}catch(e){}});
}catch(e){console.error('lwPlus',e);}return ch;}

/* ---------- toutes les matières premières (panneau de droite) ---------- */
const CMB={d:null,at:0,busy:false,err:''};
async function cmBoardLoad(){if(CMB.busy)return;CMB.busy=true;
  try{const base=typeof liveBase==='function'&&liveBase()||'';const r=await fetch(base+'/api/v1/commodities');const j=await r.json();
    if(!r.ok)throw new Error(j.error||('HTTP '+r.status));CMB.d=j;CMB.err='';}catch(e){CMB.err=e.message||String(e);}
  CMB.at=Date.now();CMB.busy=false;
  /* panneau de droite seul : la page ne bouge pas */
  try{if(typeof ui==='object'&&ui.tab==='cm'&&typeof sideHTML==='function'){const sd=document.getElementById('side'),y=sd?sd.scrollTop:0;if(sd){sd.innerHTML=sideHTML();sd.scrollTop=y;}}else{const el=document.getElementById('cmBoard');if(el)el.innerHTML=cmBoardInner();}}catch(e){}}
function cmBoardInner(){const D=CMB.d;
  if(!D)return`<div class="sideh" style="margin-top:8px">Toutes les matières premières</div><div class="cmb-note">${CMB.err?'Cours momentanément indisponibles ('+esc(CMB.err)+') : nouvel essai dans 5 minutes.':'Chargement des cours…'}</div>`;
  const t=new Date(D.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  return`<div class="sideh" style="margin-top:8px">Toutes les matières premières <span class="meta">${t}</span></div>`+
    D.groups.map(g=>`<div class="cmb-g">${esc(g.g)}</div>`+g.items.map(x=>{const ok=x.c!==null&&isFinite(x.c),ch=x.ch;
      return`<div class="cmb-r" title="${esc(x.t)} · ${esc(x.u)}"><span class="n"><b>${esc(x.l)}</b><small>${esc(x.u)}</small></span><span class="p">${ok?nf(x.c,x.c<10?3:2):'<span class="meta">indisponible</span>'}</span><span class="c ${!isFinite(ch)||ch===null?'fl':ch>0?'up':ch<0?'dn':'fl'}">${ch!==null&&isFinite(ch)?(ch>0?'+':'')+nf(ch,2)+' %':''}</span></div>`;}).join('')).join('')+
    `<div class="cmb-note">Premier contrat à terme de chaque marché, cours différé d'environ 10 min, source TradingView. Variation : séance en cours.</div>`;}
function cmBoardHTML(){if(!CMB.busy&&Date.now()-CMB.at>60e3)setTimeout(cmBoardLoad,0);return`<div id="cmBoard">${cmBoardInner()}</div>`;}
setInterval(()=>{if(typeof ui==='object'&&ui.tab==='cm'&&document.visibilityState==='visible')cmBoardLoad();},60e3);

/* ---------- camembert : répartition des signaux sur les 60 dernières séances ---------- */
function cmSigPie(R,a){try{const key=a==='gold'?'sigGold':a==='silver'?'sigSilver':'sigChine',name=a==='gold'?'Or':a==='silver'?'Argent':'Brent';
  const rows=R.slice(-60),cnt={ok:0,ko:0,am:0},lab={};let nod=0;
  rows.forEach(r=>{const sg=r[key];if(!sg||/NO DATA/.test(String(sg).toUpperCase())){nod++;return;}const c=cmCls(sg)||'am';cnt[c]++;const l=cmStrip(sg).split(' : ')[0];lab[l]=(lab[l]||0)+1;});
  const tot=cnt.ok+cnt.ko+cnt.am;const C={ok:'#10B981',ko:'#DC2626',am:'#D97706'},L={ok:'Achat / haussier',ko:'Vente / baissier',am:'Neutre / attention'};
  let svg='';if(tot){let a0=-Math.PI/2;const R0=62,R1=40,cx=70,cy=70;
    for(const k of ['ok','am','ko']){const v=cnt[k];if(!v)continue;const a1=a0+v/tot*2*Math.PI,lg=(a1-a0)>Math.PI?1:0;
      if(v===tot){svg+=`<circle cx="${cx}" cy="${cy}" r="${(R0+R1)/2}" fill="none" stroke="${C[k]}" stroke-width="${R0-R1}"/>`;}
      else{const p=(r,t)=>`${(cx+r*Math.cos(t)).toFixed(2)} ${(cy+r*Math.sin(t)).toFixed(2)}`;
        svg+=`<path d="M ${p(R0,a0)} A ${R0} ${R0} 0 ${lg} 1 ${p(R0,a1)} L ${p(R1,a1)} A ${R1} ${R1} 0 ${lg} 0 ${p(R1,a0)} Z" fill="${C[k]}" stroke="#111113" stroke-width="1.5"/>`;}
      a0=a1;}
    svg+=`<text x="70" y="66" text-anchor="middle" fill="#FAFAFA" font-size="20" font-weight="700">${tot}</text><text x="70" y="84" text-anchor="middle" fill="#71717A" font-size="10.5">séances</text>`;}
  const top=Object.entries(lab).sort((x,y)=>y[1]-x[1]).slice(0,4);
  return`<div class="card s4"><h2>Répartition des signaux <span class="meta">${name} · 60 dernières séances</span></h2>
    ${tot?`<div class="sigpie"><svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="Répartition des signaux ${name}">${svg}</svg>
      <ul>${['ok','am','ko'].map(k=>`<li><i style="background:${C[k]}"></i>${L[k]}<b>${cnt[k]} · ${Math.round(cnt[k]/tot*100)} %</b></li>`).join('')}${nod?`<li><i style="background:#3F3F46"></i>Séances sans cours<b>${nod}</b></li>`:''}</ul></div>
      <div class="sigtop">${top.map(([l,n])=>`<div><b>${esc(l)}</b><span>${n} séance${n>1?'s':''}</span></div>`).join('')}</div>`
    :'<p class="note">Aucun signal calculé sur les 60 dernières séances.</p>'}</div>`;}catch(e){console.error('cmSigPie',e);return'';}}

/* ---------- la page reste où elle est quand les données arrivent ---------- */
let KEEP_CLICK=0;document.addEventListener('pointerdown',()=>{KEEP_CLICK=Date.now();},true);document.addEventListener('keydown',()=>{KEEP_CLICK=Date.now();},true);
if(typeof renderAll==='function'){const _r=renderAll;renderAll=function(){
  const m=document.getElementById('main'),tab=typeof ui==='object'?ui.tab:null,y=m?m.scrollTop:0,wy=window.scrollY,
    tw=m?[...m.querySelectorAll('.tw')].map(e=>e.scrollLeft):[];
  const r=_r.apply(this,arguments);
  const restore=()=>{if((typeof ui==='object'?ui.tab:null)!==tab)return;const m2=document.getElementById('main');
    if(m2&&Math.abs(m2.scrollTop-y)>2){m2.style.scrollBehavior='auto';m2.scrollTop=y;m2.style.scrollBehavior='';}
    if(Math.abs(window.scrollY-wy)>2)window.scrollTo({top:wy,behavior:'instant'});
    if(m2)[...m2.querySelectorAll('.tw')].forEach((e,i)=>{if(tw[i])e.scrollLeft=tw[i];});};
  restore();
  /* une mise à jour en arrière-plan (pas un clic de l'utilisateur) ne doit jamais faire bouger la page */
  if(Date.now()-KEEP_CLICK>600)requestAnimationFrame(()=>{restore();setTimeout(restore,120);});
  return r;};}
