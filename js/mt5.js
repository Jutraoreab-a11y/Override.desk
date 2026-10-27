/* ============ Liaison MetaTrader 5 (volet 4) ============ */
/* Deux modes : import du rapport d'historique MT5 (immédiat, sans serveur)
   ou synchronisation par l'API MetaApi (lecture seule, jeton personnel). */
const MT5_REG={'new-york':'New York','london':'Londres','singapore':'Singapour','vint-hill':'Vint Hill'};
function mt5Stats(){const T=S.jr.trades.filter(t=>t.src==='MT5'||t.src==='MetaApi'),st=jrStats(T),M=S.mt5,info=M.info||{};
  const d30=new Date(Date.now()-30*864e5).toISOString().slice(0,10),p30=sum(T.filter(t=>t.d>=d30).map(jrPnl).filter(isFinite));
  return{T,st,info,p30};}
function mt5Card(){
  const M=S.mt5,{T,st,info,p30}=mt5Stats(),K=pfCalc(),open=ui.mt5Open||!M.linked,u=M.ccy||'EUR';
  const pfPerf=K.V&&K.C?(K.V/K.C-1)*100:NaN;
  const div=M.linked&&T.length&&isFinite(pfPerf)?(st.tot<0&&pfPerf>0?['am',`Le compte MT5 perd ${nf(-st.tot,0)} ${u} alors que le portefeuille de titres progresse de ${sgn(pfPerf,1)} : la perte vient de l'exécution, pas des actifs suivis.`]:st.tot>0&&pfPerf<0?['am',`Le compte MT5 gagne ${nf(st.tot,0)} ${u} mais le portefeuille de titres recule de ${sgn(pfPerf,1)} : vérifier que les gains de trading ne masquent pas des positions de fond à couper.`]:['ok','Compte MT5 et portefeuille de titres évoluent dans le même sens.']):null;
  return`<div class="card s12"><h2><span>Compte MetaTrader 5 <span class="meta">${M.linked?`${esc(M.login||'compte')} · ${esc(M.server||M.broker||'serveur à préciser')} · ${esc(M.type)}`:'non lié'}</span></span>
      <span class="row noprint"><span class="tag ${M.linked?'ok':''}">${M.linked?'Lié · '+(M.lastSync?'synchronisé le '+new Date(M.lastSync).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'jamais synchronisé'):'Non lié'}</span>
      ${M.linked?`<button class="btn sm" data-act="${M.mode==='metaapi'?'mt5sync':'mt5imp'}">${M.mode==='metaapi'?'Synchroniser':'Importer un nouveau rapport'}</button>`:''}
      <button class="btn sm${M.linked?'':' pri'}" data-act="mt5open">${M.linked?(ui.mt5Open?'Fermer':'Paramètres de liaison'):'Lier mon compte MT5'}</button></span></h2>
    ${M.linked?`<div class="stats">
      <div class="stat"><div class="k">Solde</div><div class="x">${info.balance!=null?nf(info.balance,2)+' '+u:'—'}</div><div class="d">${info.balance!=null?'source : '+(M.mode==='metaapi'?'MetaApi':'rapport '+esc(M.file||'MT5')):'non fourni par la source'}</div></div>
      <div class="stat"><div class="k">Fonds propres</div><div class="x">${info.equity!=null?nf(info.equity,2)+' '+u:'—'}</div><div class="d">${info.equity!=null&&info.balance!=null?'flottant '+nf(info.equity-info.balance,2):''}</div></div>
      <div class="stat"><div class="k">Résultat des trades clôturés</div><div class="x ${cls(st.tot)}">${nf(st.tot,2)} ${u}</div><div class="d">${st.n} trades · 30 derniers jours ${nf(p30,2)}</div></div>
      <div class="stat"><div class="k">Taux de réussite</div><div class="x">${isFinite(st.wr)?pct(st.wr*100,1):'—'}</div><div class="d">profit factor ${isFinite(st.pf)?nf(st.pf,2):'—'}</div></div>
      <div class="stat"><div class="k">Drawdown maximal</div><div class="x ${st.dd>0?'down':''}">${nf(st.dd,2)} ${u}</div><div class="d">sur l'historique importé</div></div>
      <div class="stat"><div class="k">Portefeuille de titres</div><div class="x ${cls(pfPerf)}">${sgn(pfPerf,1)}</div><div class="d">performance latente</div></div>
    </div>${div?`<div class="dec" style="margin-top:8px"><div class="dc"><span class="dot ${div[0]}"></span><div><b>Lecture croisée</b><span>${esc(div[1])}</span></div></div></div>`:''}`:'<p class="note">Liez votre compte MetaTrader 5 pour comparer la performance réelle du compte de trading à celle du portefeuille de titres, et alimenter automatiquement le journal (volet 7).</p>'}
    ${open?`<div class="grid" style="margin-top:10px">
      <div class="s6" style="min-width:0"><h3 class="h3" style="margin-top:0">Identification du compte</h3><div class="fields">${LF('Numéro de compte','mt5.login','t',{ph:'ex. 51234567'})}${LF('Serveur','mt5.server','t',{ph:'ex. ICMarketsEU-Live'})}${LF('Courtier','mt5.broker','t')}${LF('Type','mt5.type','s',{opts:{'Réel':'Réel','Démo':'Démo','Prop firm':'Prop firm'}})}${LF('Devise du compte','mt5.ccy','s',{opts:{EUR:'EUR',USD:'USD',GBP:'GBP',CHF:'CHF'}})}${LF('Mode de synchronisation','mt5.mode','s',{opts:{import:'Import du rapport MT5',metaapi:'API MetaApi (temps réel)'}})}</div>
        <p class="note">Aucun mot de passe n'est demandé : OVERRIDE.DESK ne passe jamais d'ordre et n'accède qu'en lecture.</p></div>
      <div class="s6" style="min-width:0">${S.mt5.mode==='metaapi'?`<h3 class="h3" style="margin-top:0">Synchronisation MetaApi</h3><div class="fields">${LF('Jeton d\'accès MetaApi','mt5.token','t',{ph:'jeton personnel (lecture seule)'})}${LF('Identifiant du compte MetaApi','mt5.acctId','t')}${LF('Région','mt5.region','s',{opts:MT5_REG})}</div>
        <p class="note">Créez le compte sur metaapi.cloud avec le mot de passe investisseur (lecture seule), puis collez ici le jeton et l'identifiant. Le jeton reste dans ce navigateur. Pour un usage en équipe, placer l'appel derrière un serveur (fonction Supabase) afin de ne jamais exposer le jeton.</p>
        <div class="row"><button class="btn pri sm" data-act="mt5sync">Synchroniser maintenant</button>${M.linked?'<button class="btn sm" data-act="mt5unlink">Délier</button>':''}</div>`
        :`<h3 class="h3" style="margin-top:0">Import du rapport MT5</h3><ol class="note" style="margin:0 0 8px 18px;padding:0"><li>Dans MetaTrader 5 : Boîte à outils, onglet Historique.</li><li>Clic droit, Rapport, format HTML ; choisir la période.</li><li>Importer le fichier ici : solde, fonds propres et positions clôturées sont lus et envoyés au journal.</li></ol>
        <div class="row"><button class="btn pri sm" data-act="mt5imp">Importer le rapport MT5</button>${M.linked?'<button class="btn sm" data-act="mt5unlink">Délier</button>':''}</div>${M.file?`<p class="note">Dernier fichier : ${esc(M.file)}</p>`:''}`}</div>
    </div>`:''}</div>`;
}
async function mt5Sync(){
  const M=S.mt5;if(!M.token||!M.acctId){toast('Renseignez le jeton et l\'identifiant MetaApi');ui.mt5Open=true;renderAll();return;}
  const base=`https://mt-client-api-v1.${M.region||'new-york'}.agiliumtrade.ai/users/current/accounts/${encodeURIComponent(M.acctId)}`,h={headers:{'auth-token':M.token,'Accept':'application/json'}};
  toast('Synchronisation MetaApi en cours…');
  try{
    const ai=await fetch(base+'/account-information',h);if(!ai.ok)throw new Error('HTTP '+ai.status);const a=await ai.json();
    M.info={balance:a.balance,equity:a.equity,margin:a.margin,freeMargin:a.freeMargin,leverage:a.leverage};M.ccy=a.currency||M.ccy;if(a.login)M.login=String(a.login);if(a.server)M.server=a.server;if(a.broker)M.broker=a.broker;
    const end=new Date().toISOString(),start=new Date(Date.now()-90*864e5).toISOString();
    const hd=await fetch(`${base}/history-deals/time/${start}/${end}`,h);const deals=hd.ok?await hd.json():[];
    const pos={};(Array.isArray(deals)?deals:[]).forEach(d=>{if(!d.positionId)return;(pos[d.positionId]=pos[d.positionId]||[]).push(d);});
    const have=new Set(S.jr.trades.map(t=>t.id));let n=0;
    Object.entries(pos).forEach(([id,D])=>{const i=D.find(x=>x.entryType==='DEAL_ENTRY_IN'),o=D.filter(x=>x.entryType==='DEAL_ENTRY_OUT'||x.entryType==='DEAL_ENTRY_OUT_BY');if(!i||!o.length||have.has('mt5-'+id))return;
      const last=o[o.length-1],dt=String(last.time||last.brokerTime||'').replace(' ','T'),net=sum(D.map(x=>(+x.profit||0)+(+x.commission||0)+(+x.swap||0)));
      S.jr.trades.push({id:'mt5-'+id,pos:id,d:dt.slice(0,10),t:dt.slice(11,16),sym:String(i.symbol||'').toUpperCase(),side:/BUY/.test(i.type)?'Achat':'Vente',vol:+i.volume,entry:+i.price,exit:+last.price,sl:i.stopLoss||null,tp:i.takeProfit||null,fees:-sum(D.map(x=>(+x.commission||0)+(+x.swap||0))),pnl:net,setup:'',emo:'',plan:'oui',note:'',src:'MetaApi'});n++;});
    M.linked=true;M.lastSync=new Date().toISOString();save();renderAll();toast(`MetaApi : compte synchronisé, ${n} nouvelle${n>1?'s':''} position${n>1?'s':''} clôturée${n>1?'s':''}`);
  }catch(e){toast('Synchronisation impossible ('+e.message+') : vérifier le jeton, l\'identifiant et la région, ou utiliser l\'import du rapport');}
}
