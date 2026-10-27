/* ============ Volet 7 : Journal de trading ============ */
const JR_DRAFT=()=>({d:today(),t:'',sym:S.pc.sym||'XAUUSD',side:'Achat',vol:null,entry:null,sl:null,tp:null,exit:null,pnl:null,fees:null,setup:'Cassure',emo:'Calme',plan:'oui',note:''});
function jrInit(){if(!S.jr.trades)S.jr.trades=[];if(!S.jr.days)S.jr.days={};if(!S.jr.draft)S.jr.draft=JR_DRAFT();if(!ui.jrM)ui.jrM=today().slice(0,7);}
/* P&L calculé depuis les prix quand il n'est pas saisi */
function jrPnl(t){if(t.pnl!==null&&t.pnl!==''&&isFinite(+t.pnl))return+t.pnl;const sp=pcSpec(t.sym),fx=pcFx(sp.q,S.pc.ccy),dir=t.side==='Achat'?1:-1;
  if(![t.entry,t.exit,t.vol].every(v=>v!==null&&v!==''&&isFinite(+v)))return NaN;return(+t.exit-+t.entry)*dir*(+t.vol)*sp.cs*fx-(+t.fees||0);}
function jrR(t){const dir=t.side==='Achat'?1:-1;if(![t.entry,t.exit,t.sl].every(v=>v!==null&&v!==''&&isFinite(+v))||+t.entry===+t.sl)return NaN;return(+t.exit-+t.entry)*dir/Math.abs(+t.entry-+t.sl);}
function jrStats(T){
  T=[...T].sort((a,b)=>(a.d+(a.t||'')).localeCompare(b.d+(b.t||'')));const P=T.map(jrPnl).filter(isFinite),W=P.filter(x=>x>0),Lo=P.filter(x=>x<0),Rs=T.map(jrR).filter(isFinite);
  let eq=0,pk=0,dd=0,run=0,bw=0,bl=0;P.forEach(x=>{eq+=x;pk=Math.max(pk,eq);dd=Math.max(dd,pk-eq);run=x>0?Math.max(1,run+1):Math.min(-1,run-1);bw=Math.max(bw,run);bl=Math.min(bl,run);});
  const days={};T.forEach(t=>{const v=jrPnl(t);if(!days[t.d])days[t.d]={p:0,n:0};days[t.d].n++;if(isFinite(v))days[t.d].p+=v;});
  const grp=k=>{const o={};T.forEach(t=>{const g=t[k]||'—',v=jrPnl(t);o[g]=o[g]||{n:0,w:0,p:0};o[g].n++;if(v>0)o[g].w++;if(isFinite(v))o[g].p+=v;});return Object.entries(o).sort((a,b)=>b[1].p-a[1].p);};
  const disc=T.filter(t=>t.plan==='oui'),noDisc=T.filter(t=>t.plan==='non');
  return{T,n:T.length,P,tot:sum(P),wr:P.length?W.length/P.length:NaN,pf:Lo.length?sum(W)/-sum(Lo):W.length?Infinity:NaN,exp:P.length?sum(P)/P.length:NaN,avgW:W.length?sum(W)/W.length:NaN,avgL:Lo.length?sum(Lo)/Lo.length:NaN,
    avgR:Rs.length?sum(Rs)/Rs.length:NaN,avgRW:Rs.filter(r=>r>0).length?sum(Rs.filter(r=>r>0))/Rs.filter(r=>r>0).length:NaN,dd,bw,bl:-bl,days,bySym:grp('sym'),bySet:grp('setup'),byEmo:grp('emo'),
    discP:sum(disc.map(jrPnl).filter(isFinite)),noDiscP:sum(noDisc.map(jrPnl).filter(isFinite)),nDisc:disc.length,nNo:noDisc.length};
}
function jrCal(st){
  const[y,m]=ui.jrM.split('-').map(Number),first=new Date(y,m-1,1),nd=new Date(y,m,0).getDate(),off=(first.getDay()+6)%7;
  let h=`<div class="cal">${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=>`<div class="cal-h">${d}</div>`).join('')}`+'<div class="cal-d off"></div>'.repeat(off);
  for(let d=1;d<=nd;d++){const k=`${ui.jrM}-${String(d).padStart(2,'0')}`,D=st.days[k],note=S.jr.days[k]&&Object.values(S.jr.days[k]).some(s=>s&&(s.note||s.zone));
    h+=`<button class="cal-d${D?(D.p>=0?' up':' down'):''}${k===ui.jrDay?' sel':''}${k===today()?' now':''}" data-act="jrday" data-id="${k}"><span class="cal-n">${d}</span>${D?`<b>${(D.p>=0?'+':'')+nf(D.p,0)}</b><small>${D.n} trade${D.n>1?'s':''}</small>`:note?'<small>analyse</small>':''}</button>`;}
  return h+'</div>';
}
function jrDayPanel(){
  const k=ui.jrDay;if(!k)return'<p class="note">Cliquez un jour du calendrier pour saisir l\'analyse de la journée par session et retrouver les trades du jour.</p>';
  if(!S.jr.days[k])S.jr.days[k]={};const s=ui.jrSess||'pre';if(!S.jr.days[k][s])S.jr.days[k][s]={actif:'',sens:'Acheteur',zone:'',note:''};
  const T=S.jr.trades.filter(t=>t.d===k),P=`jr.days.${k}.${s}`;
  return`<div class="seg" role="tablist" style="margin-bottom:10px">${JR_SESS.map(([id,l])=>`<button role="tab" data-act="jrsess" data-id="${id}" aria-selected="${s===id}">${l}</button>`).join('')}</div>
    <div class="fields">${LF('Actif',P+'.actif','t',{ph:'Or, Brent, EUR/USD…'})}${LF('Biais',P+'.sens','s',{opts:{Acheteur:'Acheteur',Vendeur:'Vendeur',Neutre:'Neutre'}})}${LF('Zone d\'intérêt',P+'.zone','t',{ph:'ex. 2 410 – 2 418'})}</div>
    <div class="fld" style="margin-top:6px"><span class="lb">Mon analyse</span>${lin(P+'.note','a',{rows:3,ph:'Contexte, niveaux, scénario et invalidation'})}</div>
    <h3 class="h3">Résultat réel du ${fdate(k)}</h3>
    ${T.length?`<p class="sub">${T.length} trade${T.length>1?'s':''} · P&L ${nf(sum(T.map(jrPnl).filter(isFinite)),2)} ${S.pc.ccy} · ${T.filter(t=>jrPnl(t)>0).length} gagnant${T.filter(t=>jrPnl(t)>0).length>1?'s':''}${T.some(t=>t.plan==='non')?' · <span class="down">plan non respecté sur '+T.filter(t=>t.plan==='non').length+' trade(s)</span>':''}</p>`:'<p class="note">Aucun trade enregistré ce jour : l\'analyse reste sans comparaison.</p>'}`;
}
function renderJR(){
  jrInit();const st=jrStats(S.jr.trades),u=S.pc.ccy,D=S.jr.draft,Dp='jr.draft',[y,m]=ui.jrM.split('-').map(Number);
  const mT=S.jr.trades.filter(t=>t.d.slice(0,7)===ui.jrM),ms=jrStats(mT),fl=ui.jrSym||'',rows=[...S.jr.trades].filter(t=>!fl||t.sym===fl).sort((a,b)=>(b.d+(b.t||'')).localeCompare(a.d+(a.t||'')));
  const dPn=jrPnl(D),dR=jrR(D),syms=[...new Set(S.jr.trades.map(t=>t.sym))].sort();
  const daysSorted=Object.keys(st.days).sort(),cum=[];let c0=0;daysSorted.forEach(d=>{c0+=st.days[d].p;cum.push(c0);});
  const grpT=(title,G)=>`<div class="s4" style="min-width:0"><h3 class="h3" style="margin-top:0">${title}</h3><div class="tw"><table class="tbl"><thead><tr><th></th><th class="n">Trades</th><th class="n">Réussite</th><th class="n">P&L</th></tr></thead><tbody>${G.map(([k,v])=>`<tr><td>${esc(k)}</td><td class="n">${v.n}</td><td class="n">${pct(v.w/v.n*100,0)}</td><td class="n ${cls(v.p)}">${nf(v.p,0)}</td></tr>`).join('')||'<tr><td colspan="4" class="meta">—</td></tr>'}</tbody></table></div></div>`;
  $('#p-jr').innerHTML=`<div class="grid">
    <div class="card s12"><div class="stats">
      <div class="stat"><div class="k">Trades enregistrés</div><div class="x">${st.n}</div><div class="d">${S.jr.trades.filter(t=>t.src==='MT5').length} importés de MT5</div></div>
      <div class="stat"><div class="k">P&L total</div><div class="x ${cls(st.tot)}">${nf(st.tot,2)} ${u}</div><div class="d">ce mois : ${nf(ms.tot,2)} ${u}</div></div>
      <div class="stat"><div class="k">Taux de réussite</div><div class="x">${isFinite(st.wr)?pct(st.wr*100,1):'—'}</div><div class="d">gain moyen ${isFinite(st.avgW)?nf(st.avgW,0):'—'} · perte moyenne ${isFinite(st.avgL)?nf(st.avgL,0):'—'}</div></div>
      <div class="stat"><div class="k">Profit factor</div><div class="x ${st.pf>=1.5?'up':st.pf<1?'down':''}">${isFinite(st.pf)?nf(st.pf,2):st.pf===Infinity?'∞':'—'}</div><div class="d">espérance ${isFinite(st.exp)?nf(st.exp,2)+' '+u:'—'} par trade</div></div>
      <div class="stat"><div class="k">R moyen</div><div class="x">${isFinite(st.avgR)?nf(st.avgR,2)+' R':'—'}</div><div class="d">sur les trades avec stop renseigné</div></div>
      <div class="stat"><div class="k">Drawdown maximal</div><div class="x ${st.dd>0?'down':''}">${nf(st.dd,2)} ${u}</div><div class="d">séries : ${st.bw} gains · ${st.bl} pertes</div></div>
    </div>
    ${st.n?`<p class="lead" style="margin-bottom:0">Discipline : ${st.nDisc} trade${st.nDisc>1?'s':''} conformes au plan pour ${nf(st.discP,2)} ${u}, ${st.nNo} hors plan pour ${nf(st.noDiscP,2)} ${u}.${st.nNo&&st.noDiscP<0?' Les écarts au plan coûtent de l\'argent : à corriger en priorité.':''}</p>`:''}</div>
    <div class="card s7"><h2><span>Calendrier <span class="meta">${MONTHS[m-1]} ${y} · ${mT.length} trade${mT.length>1?'s':''}</span></span><span class="row noprint"><button class="btn sm" data-act="jrmon" data-id="-1">Mois précédent</button><button class="btn sm" data-act="jrmon" data-id="0">Aujourd'hui</button><button class="btn sm" data-act="jrmon" data-id="1">Mois suivant</button></span></h2>${jrCal(st)}</div>
    <div class="card s5"><h2>${ui.jrDay?'Fiche du '+fdate(ui.jrDay):'Fiche du jour'}</h2>${jrDayPanel()}</div>
    <div class="card s12"><h2><span>Nouveau trade</span><span class="row noprint"><button class="btn sm" data-act="mt5imp">Importer un rapport MT5</button></span></h2>
      <div class="fields">
        ${LF('Date',Dp+'.d','d')}${LF('Heure',Dp+'.t','t',{ph:'hh:mm'})}${LF('Instrument',Dp+'.sym','s',{opts:Object.fromEntries(Object.keys(PC_SPECS).concat(D.sym&&!PC_SPECS[D.sym]?[D.sym]:[]).map(k=>[k,k]))})}${LF('Sens',Dp+'.side','s',{opts:{Achat:'Achat',Vente:'Vente'}})}${LF('Volume',Dp+'.vol','nn',{u:'lots'})}${LF('Entrée',Dp+'.entry','nn')}
        ${LF('Stop-loss',Dp+'.sl','nn')}${LF('Take-profit',Dp+'.tp','nn')}${LF('Sortie',Dp+'.exit','nn')}${LF('Frais et swap',Dp+'.fees','nn',{u})}${LF('P&L réel',Dp+'.pnl','nn',{u,ph:isFinite(dPn)?nf(dPn,2):'calculé'})}${LF('Plan respecté',Dp+'.plan','s',{opts:{oui:'Oui',non:'Non'}})}
        ${LF('Configuration',Dp+'.setup','s',{opts:Object.fromEntries(JR_SETUPS.map(x=>[x,x]))})}${LF('État émotionnel',Dp+'.emo','s',{opts:Object.fromEntries(JR_EMO.map(x=>[x,x]))})}
      </div>
      <div class="fld" style="margin-top:6px"><span class="lb">Commentaire et leçon</span>${lin(Dp+'.note','a',{rows:2,ph:'Pourquoi ce trade, ce qui a fonctionné, ce qu\'il faut corriger'})}</div>
      <div class="row" style="margin-top:8px"><button class="btn pri sm" data-act="jradd">Enregistrer le trade</button><span class="meta">${isFinite(dPn)?`P&L ${D.pnl!==null&&D.pnl!==''?'saisi':'calculé'} : ${nf(dPn,2)} ${u}`:'Le P&L se calcule à partir de l\'entrée, de la sortie et du volume (taille de contrat du calculateur), ou se saisit directement.'}${isFinite(dR)?` · ${nf(dR,2)} R`:''}</span></div></div>
    <div class="card s12"><h2><span>Courbe de résultat <span class="meta">P&L par jour et cumul</span></span></h2>${daysSorted.length?colChart(daysSorted.map(d=>d.slice(8,10)+'/'+d.slice(5,7)),daysSorted.map(d=>st.days[d].p),{w:900,h:220,fmt:v=>nf(v,0),line:{vals:cum,fmt:v=>nf(v,0)},title:'Résultat quotidien'}):'<p class="note">La courbe apparaît dès le premier trade enregistré.</p>'}</div>
    <div class="card s12"><h2><span>Historique des trades <span class="meta">${rows.length} trade${rows.length>1?'s':''}</span></span><span class="row noprint">${syms.length?`<select class="f" style="width:auto" data-ui="jrSym" aria-label="Filtrer par instrument"><option value="">Tous les instruments</option>${syms.map(s=>`<option${s===fl?' selected':''}>${esc(s)}</option>`).join('')}</select>`:''}</span></h2>
      ${rows.length?`<div class="tw" style="max-height:520px;overflow:auto"><table class="tbl fin"><thead><tr><th>Date</th><th>Instrument</th><th>Sens</th><th class="n">Volume</th><th class="n">Entrée</th><th class="n">Stop</th><th class="n">Sortie</th><th class="n">R</th><th class="n">P&L</th><th>Configuration</th><th>Émotion</th><th>Plan</th><th>Commentaire</th><th>Source</th><th></th></tr></thead><tbody>
        ${rows.map(t=>{const p=jrPnl(t),r=jrR(t),dg=(PC_SPECS[t.sym]||{}).dig,px=v=>dg!==undefined?nf(+v,dg):auto(+v);return`<tr><td>${fdate(t.d)}${t.t?' '+esc(t.t):''}</td><td>${esc(t.sym)}</td><td>${esc(t.side)}</td><td class="n">${nf(+t.vol,2)}</td><td class="n">${px(t.entry)}</td><td class="n">${t.sl!==null&&t.sl!==''?px(t.sl):'—'}</td><td class="n">${px(t.exit)}</td><td class="n">${isFinite(r)?nf(r,2):'—'}</td><td class="n ${isFinite(p)?cls(p):''}">${isFinite(p)?nf(p,2):'—'}</td><td>${esc(t.setup||'')}</td><td>${esc(t.emo||'')}</td><td><span class="tag ${t.plan==='non'?'ko':'ok'}">${t.plan==='non'?'Hors plan':'Conforme'}</span></td><td class="wrap">${esc(t.note||'')}</td><td class="meta">${esc(t.src||'manuel')}</td><td><button class="btn sm noprint" data-act="jrdel" data-id="${esc(t.id)}">Supprimer</button></td></tr>`;}).join('')}
      </tbody></table></div>`:'<p class="note">Aucun trade : saisissez votre premier trade ci-dessus ou importez votre historique depuis MetaTrader 5 (Boîte à outils, onglet Historique, clic droit puis Rapport, format HTML).</p>'}</div>
    ${st.n?`<div class="card s12"><h2>Rétro-analyse</h2><div class="grid">${grpT('Par instrument',st.bySym)}${grpT('Par configuration',st.bySet)}${grpT('Par état émotionnel',st.byEmo)}</div></div>`:''}
  </div>`;
}
/* ---- Import d'un rapport d'historique MetaTrader 5 (HTML, UTF-16) ou CSV ---- */
function mtNum(v){v=String(v||'').replace(/ |\s/g,'');if(/^-?[\d.]+,\d+$/.test(v))v=v.replace(/\./g,'').replace(',','.');return parseFloat(v);}
function mtDate(v){const m=String(v).match(/(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})(?:\s+(\d{2}:\d{2}))?/);return m?{d:`${m[1]}-${m[2]}-${m[3]}`,t:m[4]||''}:null;}
function mt5Parse(txt){
  const out={trades:[],info:{}};
  if(/<table/i.test(txt)){
    const doc=new DOMParser().parseFromString(txt,'text/html'),body=doc.body.textContent||'';
    const grab=re=>{const m=body.match(re);return m?mtNum(m[1]):null;};
    out.info={balance:grab(/(?:Balance|Solde)\s*:\s*(-?[\d\s .,]+)/i),equity:grab(/(?:Equity|Fonds propres|Capitaux propres)\s*:\s*(-?[\d\s .,]+)/i),net:grab(/(?:Total Net Profit|Profit net total|Bénéfice net total)\s*:\s*(-?[\d\s .,]+)/i)};
    const acc=body.match(/(?:Account|Compte)\s*:\s*(\d+)\s*\(([A-Z]{3}),\s*([^,)]+)/i);if(acc){out.info.login=acc[1];out.info.ccy=acc[2];out.info.server=acc[3].trim();}
    let sec='';doc.querySelectorAll('tr').forEach(tr=>{
      const cells=[...tr.children].filter(td=>!/hidden/.test(td.className)).map(td=>td.textContent.trim());if(!cells.length)return;
      const j=cells.join(' ').trim();
      if(cells.length<=2&&/^(Positions|Orders|Ordres|Deals|Transactions|Results|Résultats|Open Positions|Positions ouvertes|Working Orders)$/i.test(j)){sec=j.toLowerCase();return;}
      if(sec!=='positions'||cells.length<13||/symbol|symbole/i.test(j))return;
      const o=mtDate(cells[0]),c=mtDate(cells[8]),side=/buy|achat/i.test(cells[3])?'Achat':/sell|vente/i.test(cells[3])?'Vente':null;if(!o||!side)return;
      const fees=(mtNum(cells[10])||0)+(mtNum(cells[11])||0),pr=mtNum(cells[12]);
      out.trades.push({id:'mt5-'+cells[1],pos:cells[1],d:(c||o).d,t:(c||o).t,sym:cells[2].toUpperCase(),side,vol:mtNum(String(cells[4]).split('/')[0]),entry:mtNum(cells[5]),sl:mtNum(cells[6])||null,tp:mtNum(cells[7])||null,exit:mtNum(cells[9]),fees:-fees,pnl:isFinite(pr)?pr+fees:null,setup:'',emo:'',plan:'oui',note:'',src:'MT5'});
    });
  }else{
    const L=txt.replace(/\r/g,'').split('\n').filter(x=>x.trim());if(L.length<2)return out;
    const sep=L[0].includes(';')?';':L[0].includes('\t')?'\t':',',h=L[0].split(sep).map(x=>x.trim().toLowerCase().replace(/"/g,'')),ix=(...k)=>h.findIndex(x=>k.some(y=>x.startsWith(y)));
    const I={d:ix('date','time','heure','open time'),sym:ix('symbol','symbole','instrument'),side:ix('type','side','sens'),vol:ix('volume','lots','size'),e:ix('entry','entrée','open price','prix d'),x:ix('exit','sortie','close price'),sl:ix('s/l','sl','stop'),p:ix('profit','p&l','pnl','résultat')};
    L.slice(1).forEach((l,n)=>{const c=l.split(sep).map(x=>x.trim().replace(/"/g,'')),o=mtDate(c[I.d]);if(!o||I.sym<0)return;
      out.trades.push({id:'csv-'+o.d+'-'+n,d:o.d,t:o.t,sym:String(c[I.sym]).toUpperCase(),side:/buy|achat|long/i.test(c[I.side])?'Achat':'Vente',vol:mtNum(c[I.vol]),entry:mtNum(c[I.e]),exit:mtNum(c[I.x]),sl:I.sl>=0?mtNum(c[I.sl])||null:null,tp:null,fees:null,pnl:I.p>=0?mtNum(c[I.p]):null,setup:'',emo:'',plan:'oui',note:'',src:'CSV'});});
  }
  return out;
}
function mt5Ingest(txt,name){
  const r=mt5Parse(txt),have=new Set(S.jr.trades.map(t=>t.id));let n=0;
  r.trades.forEach(t=>{if(!have.has(t.id)){S.jr.trades.push(t);n++;}});
  const M=S.mt5;M.file=name;M.lastSync=new Date().toISOString();M.info=Object.assign({},M.info||{},Object.fromEntries(Object.entries(r.info).filter(([k,v])=>v!==null&&v!==undefined)));
  if(r.info.login&&!M.login)M.login=r.info.login;if(r.info.server&&!M.server)M.server=r.info.server;if(r.info.ccy)M.ccy=r.info.ccy;
  if(r.trades.length||r.info.balance!=null)M.linked=true;
  return{n,tot:r.trades.length,info:r.info};
}
function readReport(file,cb){const rd=new FileReader();rd.onload=()=>{const b=new Uint8Array(rd.result);let txt;
  if(b[0]===0xFF&&b[1]===0xFE)txt=new TextDecoder('utf-16le').decode(b);else if(b[0]===0xFE&&b[1]===0xFF)txt=new TextDecoder('utf-16be').decode(b);else txt=new TextDecoder('utf-8').decode(b);cb(txt);};rd.readAsArrayBuffer(file);}
