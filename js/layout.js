/* ============ Panneaux redimensionnables : barre de navigation, zone de travail, colonne de synthèse ============ */
/* Deux poignées glissables. Largeurs mémorisées dans l'état (S.layout), double-clic pour revenir aux valeurs par défaut,
   flèches du clavier pour ajuster finement. Sous 1100 px de large, la mise en page mobile reprend la main. */
const LAYOUT_DEF={rw:56,sw:304};
const LAYOUT_LIM={rw:[56,240],sw:[220,620]};
function layoutGet(){const L=Object.assign({},LAYOUT_DEF,S.layout||{});
  L.rw=Math.min(LAYOUT_LIM.rw[1],Math.max(LAYOUT_LIM.rw[0],+L.rw||LAYOUT_DEF.rw));
  L.sw=Math.min(LAYOUT_LIM.sw[1],Math.max(LAYOUT_LIM.sw[0],+L.sw||LAYOUT_DEF.sw));return L;}
function layoutApply(){const app=document.getElementById('app');if(!app)return;const L=layoutGet();
  app.style.setProperty('--rw',L.rw+'px');app.style.setProperty('--sw',L.sw+'px');
  app.classList.toggle('wide-rail',L.rw>=128);
  const a=document.getElementById('spL'),b=document.getElementById('spR');
  if(a){a.setAttribute('aria-valuenow',L.rw);}if(b){b.setAttribute('aria-valuenow',L.sw);}}
function layoutSet(k,v,persist){S.layout=Object.assign({},layoutGet(),{[k]:Math.round(v)});layoutApply();if(persist)save();}
function layoutInit(){
  const app=document.getElementById('app');if(!app||document.getElementById('spL'))return;
  const mk=(id,k,label)=>{const d=document.createElement('div');d.id=id;d.className='splitter';d.setAttribute('role','separator');d.setAttribute('aria-orientation','vertical');
    d.setAttribute('aria-label',label);d.setAttribute('aria-valuemin',LAYOUT_LIM[k][0]);d.setAttribute('aria-valuemax',LAYOUT_LIM[k][1]);d.tabIndex=0;
    d.title=label+' : glisser pour redimensionner, double-clic pour réinitialiser';
    d.addEventListener('pointerdown',e=>{e.preventDefault();d.setPointerCapture(e.pointerId);app.classList.add('resizing');
      const x0=e.clientX,v0=layoutGet()[k];
      const mv=ev=>{const dx=ev.clientX-x0;layoutSet(k,k==='rw'?v0+dx:v0-dx,false);};
      const up=()=>{d.removeEventListener('pointermove',mv);d.removeEventListener('pointerup',up);d.removeEventListener('pointercancel',up);app.classList.remove('resizing');save();window.dispatchEvent(new Event('resize'));};
      d.addEventListener('pointermove',mv);d.addEventListener('pointerup',up);d.addEventListener('pointercancel',up);});
    d.addEventListener('dblclick',()=>{layoutSet(k,LAYOUT_DEF[k],true);window.dispatchEvent(new Event('resize'));});
    d.addEventListener('keydown',e=>{const st=e.shiftKey?40:10,cur=layoutGet()[k];let v=null;
      if(e.key==='ArrowLeft')v=k==='rw'?cur-st:cur+st;else if(e.key==='ArrowRight')v=k==='rw'?cur+st:cur-st;else if(e.key==='Home')v=LAYOUT_DEF[k];
      if(v!==null){e.preventDefault();layoutSet(k,v,true);window.dispatchEvent(new Event('resize'));}});
    app.appendChild(d);};
  mk('spL','rw','Largeur de la barre de navigation');mk('spR','sw','Largeur de la colonne de synthèse');layoutApply();}
