/* ============ v8.15 : Dossier sourcing en fin d'étude de marché (Business plan) ============
   Chaque chiffre du dossier est rattaché à sa source : publication et lien, extrait cité, date de consultation,
   nature (publié, calcul, hypothèse, saisie de l'analyste) et statut (vérifié, à confirmer, non sourcé).
   Les extraits rapportés par la recherche Claude sont conservés en entier (plus seulement les 4 premiers),
   avec le chiffre qu'ils justifient. Le dossier s'imprime avec l'export PDF. */
const SRC_ST={ok:['ok','Vérifié'],am:['am','À confirmer'],ko:['ko','Non sourcé'],calc:['ok','Calcul']};
const srcHost=u=>{try{return new URL(u).hostname.replace(/^www\./,'');}catch(e){return '';}};
const srcLink=(u,t)=>/^https?:\/\//.test(u||'')?`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t||srcHost(u))}</a>`:esc(t||u||'');
/* registre structuré : b.mkt.sourcing = [{fig, val, unit, url, title, quote, pub, at, nat, st, how}] */
function srcRows(){const b=S.bp,r=bpCalc(),rows=[],M=b.mkt||{},seen=new Set();
  const add=o=>{const k=(o.fig||'')+'|'+(o.url||o.src||'');if(seen.has(k))return;seen.add(k);rows.push(o);};
  (M.sourcing||[]).forEach(x=>add({...x,grp:x.grp||'Étude de marché'}));
  const Q=(b.mktAI&&b.mktAI.quotes)||[];Q.forEach(q=>add({grp:'Étude de marché',fig:q.figure||'Taille et croissance du marché',url:q.url,quote:q.quote,at:b.mktAI.at,nat:'Publié',st:'ok',how:b.mktAI.how}));
  const first=(M.src||'').split(' ; ').filter(Boolean);
  add({grp:'Étude de marché',fig:'TAM retenu (zone du modèle)',val:big(r.tam),url:b.tamAI?first[0]:'',src:b.tamOv>0?(b.tamAI?'Recherche '+(b.mktAI&&b.mktAI.how==='claude'?'Claude':'IA'):'Saisie de l\'analyste'):`${r.s.src||'référence sectorielle intégrée'} × part de zone (${r.z.src||'référence intégrée'})`,
    nat:b.tamOv>0?(b.tamAI?'Publié':'Saisie'):'Calcul',st:b.tamOv>0?(b.tamAI?'ok':(b.just&&b.just.tam?'am':'ko')):'am',at:b.tamAI&&b.mktAI?b.mktAI.at:null});
  add({grp:'Étude de marché',fig:'Croissance annuelle du marché (CAGR)',val:pct(r.cagr),url:b.cagrAI?first[0]:'',src:b.cagrOv>0?(b.cagrAI?'Recherche '+(b.mktAI&&b.mktAI.how==='claude'?'Claude':'IA'):'Saisie de l\'analyste'):(r.s.src||'référence sectorielle intégrée'),
    nat:b.cagrOv>0?(b.cagrAI?'Publié':'Saisie'):'Référence',st:b.cagrOv>0&&b.cagrAI?'ok':'am',at:b.cagrAI&&b.mktAI?b.mktAI.at:null});
  if(Array.isArray(M.hist)&&M.hist.length)add({grp:'Étude de marché',fig:`Historique du marché (${M.hist[0].y} à ${M.hist[M.hist.length-1].y})`,val:M.hist.map(h=>h.y+' : '+nf(h.v,0)+' M€').join(' · '),src:first.join(' ; ')||'',url:first[0]||'',nat:first.length?'Publié':'Saisie',st:first.length?'am':'ko'});
  [['Saisonnalité des ventes',M.srcSeas,'Étude de marché'],['Répartition géographique',M.srcGeo,'Étude de marché'],['Prix de la concurrence',b.srcPt,'Concurrence'],['Étude quantitative',b.etude&&b.etude.quanti&&b.etude.quanti.src,'Demande']]
    .forEach(([f,s,g])=>add({grp:g,fig:f,src:s||'',url:(String(s||'').match(/https?:\/\/\S+/)||[''])[0],nat:s?'Publié':'Saisie',st:s?'am':'ko'}));
  add({grp:'Références sectorielles',fig:'Marché sectoriel mondial, marge brute de référence',val:big(r.s.tam)+' · '+pct(r.s.gm,0),src:r.s.src||'',nat:'Référence',st:'am'});
  add({grp:'Références sectorielles',fig:'Part de la zone '+r.z.l,val:pct(r.z.s*100),src:r.z.src||'',nat:'Référence',st:'am'});
  if(typeof REG==='object')REG.forEach(([lab,,k,ps])=>{const j=((b.just||{})[k]||'').trim();add({grp:'Hypothèses du modèle',fig:lab,src:j,url:(j.match(/https?:\/\/\S+/)||[''])[0],nat:'Hypothèse',st:!j?'ko':(DEF.bp.just&&j===DEF.bp.just[k]?'am':'am')});});
  return rows;}
function srcCard(){const rows=srcRows(),n=k=>rows.filter(x=>x.st===k).length,b=S.bp,G=[...new Set(rows.map(x=>x.grp))];
  const urls=[...new Set(rows.map(x=>x.url).filter(u=>/^https?:/.test(u||'')))];
  return`<section class="bps srcd" id="bp-sourcing"><div class="bph"><span class="bpn">SRC</span><h2>Dossier sourcing</h2></div><div class="grid">
    <div class="card s12"><h2><span>Origine de chaque chiffre <span class="meta">${rows.length} données · ${urls.length} source(s) en ligne · consultation : ${esc(b.srcDate||'non renseignée')}</span></span></h2>
      <div class="src-k"><span class="tag ok">${n('ok')} vérifiée(s)</span><span class="tag am">${n('am')} à confirmer</span><span class="tag ko">${n('ko')} non sourcée(s)</span></div>
      <p class="note">Vérifié : l'extrait cité a été retrouvé mot pour mot dans la page lue. À confirmer : la source est indiquée mais l'extrait n'a pas été contrôlé, ou il s'agit d'un ordre de grandeur. Non sourcé : aucune source ni justification ; à compléter au crayon avant diffusion.</p>
      ${G.map(g=>`<h3 class="h3">${esc(g)}</h3><div class="tw"><table class="tbl src-t"><thead><tr><th>Donnée</th><th>Valeur</th><th>Source</th><th>Extrait cité</th><th>Consultée le</th><th>Nature</th><th>Statut</th></tr></thead><tbody>
        ${rows.filter(x=>x.grp===g).map(x=>{const s=SRC_ST[x.st]||SRC_ST.am;return`<tr><td>${esc(x.fig)}</td><td class="n">${esc(x.val||'')||'<span class="meta">voir le dossier</span>'}</td>
          <td>${x.url?srcLink(x.url,x.title||srcHost(x.url)):''}${x.src&&!(x.url&&x.src===x.url)?`${x.url?'<br>':''}<span class="meta">${esc(x.src)}</span>`:''}${x.pub?`<br><span class="meta">publié le ${esc(x.pub)}</span>`:''}${!x.url&&!x.src?'<span class="meta">aucune</span>':''}</td>
          <td class="src-q">${x.quote?'« '+esc(x.quote)+' »':'<span class="meta">sans extrait</span>'}</td><td>${x.at?fdate(String(x.at).slice(0,10)):'<span class="meta">non datée</span>'}</td><td>${esc(x.nat||'')}</td><td><span class="tag ${s[0]}">${s[1]}</span></td></tr>`;}).join('')}</tbody></table></div>`).join('')}
      ${urls.length?`<h3 class="h3">Bibliographie</h3><ol class="src-b">${urls.map(u=>`<li>${srcLink(u,u)}</li>`).join('')}</ol>`:''}</div></div></section>`;}
{const _r=renderBP;renderBP=function(){_r.apply(this,arguments);try{const P=document.getElementById('p-bp');if(!P)return;const old=P.querySelector('#bp-sourcing');if(old)old.remove();
  const d=document.createElement('div');d.innerHTML=srcCard();P.appendChild(d.firstElementChild);}catch(e){console.error('sourcing',e);}};}
/* la recherche Claude garde désormais tous les extraits et le chiffre qu'ils justifient */
if(typeof rsMarket==='function'){const _m=rsMarket;rsMarket=async function(trigger){const before=JSON.stringify((S.bp.mktAI||{}).at||'');await _m.apply(this,arguments);const b=S.bp;
  if(b.mktAI&&JSON.stringify(b.mktAI.at)!==before){const at=b.mktAI.at,qs=(b.mktAI.quotesAll||b.mktAI.quotes||[]);b.mkt.sourcing=(b.mkt.sourcing||[]).filter(x=>x.how!=='claude'&&x.how!=='api'&&x.how!=='byok'&&x.how!=='infra'&&x.how!=='cache');
    qs.forEach(q=>b.mkt.sourcing.push({grp:'Étude de marché',fig:q.figure||'Taille et croissance du marché',url:q.url,quote:q.quote,at,nat:'Publié',st:'ok',how:b.mktAI.how}));save();renderAll();}};}
