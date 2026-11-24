import {chromium} from 'playwright';
const root=process.argv[2]||new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const er=[];p.on('pageerror',e=>er.push(e.message));
await p.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.fulfill({status:200,body:''}));
await p.goto('file://'+root+'/index.html');await p.waitForTimeout(900);
p.on('dialog',d=>d.accept(globalThis.__ans||''));
const r=await p.evaluate(async()=>{const out={};landShow=()=>{};landHide();
  ui.tab='an';renderAll();out.vide=!!document.querySelector('#fx-an')&&!document.querySelector('#p-an .symhead');
  window.prompt=()=>'Sociétés cotées · stratégie long';document.querySelector('[data-act=adnew]').click();
  const p=S.prj.an[0];out.dossier=p&&p.name;
  // ajout de deux titres via le cache des fiches
  ficheFetch=async tk=>{const b=ficheGet(tk);if(!b)throw new Error('absent');return b;};
  for(const tk of ['AAPL','MC.PA']){document.getElementById('ad-in-'+p.id).value=tk;await anAddTk(p.id);}
  out.titres=anStocks(p).map(([k,L])=>k+':'+L.map(v=>v.label).join('/'));
  out.ouvert=ui.anOpen&&!!document.querySelector('#p-an .symhead');
  // nouvelle version sur AAPL
  const aapl=anStocks(p).find(([k])=>/AAPL/.test(k))[0];anVerNew(p.id,aapl);S.an.assets[ui.tk].g=+S.an.assets[ui.tk].g+1;
  document.querySelector('[data-act=versave][data-id=an]').click();
  out.apresV2=anStocks(p).map(([k,L])=>k+':'+L.map(v=>v.label).join('/'));
  out.barre=document.querySelector('.prj .prj-l').innerText;
  // fermer le dossier -> aucune analyse
  document.querySelector('[data-act=adtog][data-p="'+p.id+'"]').click();
  out.fermeSansAnalyse=!document.querySelector('#p-an .symhead')&&!!document.querySelector('#fx-an');
  out.doublonDossier=!!document.querySelector('[data-act=fxfold]');
  return out;});
console.log(r,er.slice(0,3));await b.close();
