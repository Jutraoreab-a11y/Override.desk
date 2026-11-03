/* ============ Couche « flux live » : backend Vercel + Supabase ============ */
/* Sans backend configuré, l'application reste en mode simulation (données d'exemple, imports et override).
   Avec backend et session, chaque actualisation interroge les endpoints /api/v1/... et remplace les données. */
const FLUX={on:false,status:null,sb:null,session:null,catalog:null,err:'',busy:false,at:null};
const CRED_LABELS={apiKey:'Clé API',apiSecret:'Secret API',passphrase:'Passphrase',keyName:'Nom de la clé (CDP)',privateKey:'Clé privée EC (PEM)',accessToken:'Jeton d\'accès OAuth',flexToken:'Jeton Flex',flexQueryId:'N° de requête Flex',addresses:'Adresses publiques BTC (une par ligne)',url:'Adresse de la passerelle',token:'Jeton de la passerelle'};
const liveBase=()=>(S.liveCfg&&S.liveCfg.base)||'';
/* Sans adresse de backend, la page ne sonde le même site que si elle est servie en http(s) hors de l'aperçu claude.ai. */
const liveReachable=()=>!!liveBase()||(/^https?:$/.test(location.protocol)&&!/(^|\.)(claude\.ai|claudeusercontent\.com)$/.test(location.hostname));
async function liveApi(path,opt={}){
  const h=Object.assign({'Content-Type':'application/json'},opt.headers||{});
  if(FLUX.session)h.Authorization='Bearer '+FLUX.session.access_token;
  const r=await fetch(liveBase()+path,Object.assign({},opt,{headers:h,body:opt.body?JSON.stringify(opt.body):undefined}));
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j;}
async function liveInit(){
  if(!liveReachable()){FLUX.status=null;FLUX.on=false;renderAll();return;}
  try{const st=await liveApi('/api/v1/status');FLUX.status=st;
    if(st.backend&&st.supabase&&window.supabase){FLUX.sb=window.supabase.createClient(st.supabase.url,st.supabase.anonKey);
      const{data}=await FLUX.sb.auth.getSession();FLUX.session=data.session;
      FLUX.sb.auth.onAuthStateChange((_e,s)=>{FLUX.session=s;FLUX.on=!!s;renderAll();if(s)liveRefresh(true);});}
    FLUX.on=!!(st.backend&&FLUX.session);
  }catch(e){FLUX.status=null;FLUX.on=false;FLUX.err='';}
  renderAll();if(FLUX.on)liveRefresh(true);
}
function liveBadge(){const on=FLUX.on;return`<span class="dot ${on?'ok':'ko'}"></span><span class="lbl">${on?'Connecté (flux live)':'Déconnecté (mode simulation)'}</span>`;}
/* Actualisation complète : synchronisation des courtiers, puis lecture des comptes, positions, liquidités et séries macro */
async function liveRefresh(silent){
  if(!FLUX.on||FLUX.busy)return;FLUX.busy=true;FLUX.err='';
  try{
    await liveApi('/api/v1/integrations/brokers',{method:'POST',body:{action:'sync'}}).catch(()=>null);
    const [tr,br,cm]=await Promise.all([liveApi('/api/v1/trading/accounts'),liveApi('/api/v1/integrations/brokers'),liveApi('/api/v1/macro/commodities').catch(()=>null)]);
    const n=liveMerge(tr,br,cm);FLUX.at=new Date().toISOString();save();renderAll();
    if(!silent||n.ovr)toast(`Flux live actualisés${n.ovr?` : ${n.ovr} valeur${n.ovr>1?'s':''} forcée${n.ovr>1?'s':''} remplacée${n.ovr>1?'s':''} par les données live`:''}`);
  }catch(e){FLUX.err=e.message;if(!silent)toast('Actualisation impossible : '+e.message);renderAll();}
  finally{FLUX.busy=false;}
}
/* Fusion dans l'état local. Les données live écrasent les valeurs forcées au crayon (comptées et signalées). */
function liveMerge(tr,br,cm){let ovr=0;pfInit();
  const a=(tr.accounts||[])[0];
  if(a){const M=S.mt5;Object.assign(M,{linked:true,live:true,platform:a.platform,login:a.login,server:a.server||'',broker:a.broker||'',type:a.account_type||M.type,ccy:a.currency,lastSync:a.last_sync_at,mode:'live',
      info:{balance:a.balance,equity:a.equity,margin:a.margin,freeMargin:a.free_margin,leverage:a.leverage},
      open:(tr.positions||[]).filter(p=>p.account_id===a.id).map(p=>({sym:p.symbol,side:p.side==='buy'?'Achat':'Vente',vol:+p.volume,price:+p.open_price,mkt:+p.current_price,pl:+p.profit+(+p.swap||0),sl:p.stop_loss,tp:p.take_profit}))});
    const have=new Set(S.jr.trades.map(t=>t.id));
    (tr.history||[]).forEach(h=>{const id='live-'+h.account_id+'-'+h.ticket;if(have.has(id))return;const d=String(h.closed_at||'');
      S.jr.trades.push({id,pos:h.ticket,d:d.slice(0,10),t:d.slice(11,16),sym:h.symbol,side:h.side==='buy'?'Achat':'Vente',vol:+h.volume,entry:h.open_price!=null?+h.open_price:null,exit:h.close_price!=null?+h.close_price:null,sl:h.stop_loss,tp:h.take_profit,fees:-((+h.commission||0)+(+h.swap||0)),pnl:(+h.profit)+(+h.commission||0)+(+h.swap||0),setup:'',emo:'',plan:'oui',note:'',src:a.platform});});}
  const conns=br.connections||[];
  conns.forEach(c=>{let b=S.brokers.find(x=>x.n===c.label);if(!b){const k=BROKERS.find(x=>x.n===c.label)||{t:'Plateforme connectée',m:['api']};b={n:c.label,t:k.t,m:k.m,d:today(),cash:null,api:{url:'',tok:''},sync:{}};S.brokers.push(b);}
    b.live={id:c.id,broker:c.broker,status:c.status,at:c.last_sync_at,err:c.last_error};
    const cash=(br.cash||[]).filter(x=>x.connection_id===c.id);b.cash=cash.length?sum(cash.map(x=>toEUR(+x.amount,x.currency))):b.cash;});
  const old=S.hold.filter(h=>h.src==='live'),key=h=>h.br+'|'+h.sym;
  const fresh=(br.positions||[]).map(p=>{const c=conns.find(x=>x.id===p.connection_id);return{br:c?c.label:'Plateforme',src:'live',cls:p.asset_class,sym:p.symbol,name:p.name||p.symbol,qty:+p.quantity,pru:p.avg_cost!=null?+p.avg_cost:null,px:p.last_price!=null?+p.last_price:null,ccy:p.currency,sl:p.stop_loss,tp:p.take_profit,real:null,realD:null};});
  fresh.forEach(f=>{const o=old.find(x=>key(x)===key(f));if(o&&['qty','pru','px','sl','tp'].some(k=>o.ov&&o.ov[k]))ovr++;});
  S.hold=S.hold.filter(h=>h.src!=='live').concat(fresh);
  if(cm&&Array.isArray(cm.prices)){const MAP={'BRENT:SPOT':'brent','BRENT:M1':'brentF','WTI:SPOT':'wti','GOLD:SPOT':'gold','GOLD:M1':'goldF','SILVER:SPOT':'silver','SILVER:M1':'silverF','USDCNH:SPOT':'cnh','SPX:SPOT':'spx'};
    S.cm.add=S.cm.add||{};cm.prices.forEach(p=>{const k=MAP[p.instrument+':'+p.contract]||(p.contract==='SPOT'?(/^STK:/.test(p.instrument)?'stk_'+p.instrument.slice(4):String(p.instrument).toLowerCase()):null);if(!k)return;if(/^stk_/.test(k)&&typeof mktStocks==='function'&&!mktStocks().includes(k.slice(4)))mktStocks().push(k.slice(4));(S.cm.add[k]=S.cm.add[k]||{})[p.price_date]=[+p.close,p.open!=null?+p.open:null,null];});}
  return{ovr};
}
/* Marquer une valeur forcée au crayon sur une ligne live, pour pouvoir signaler son remplacement */
function liveMarkOverride(path){const m=String(path).match(/^hold\.(\d+)\.(\w+)$/);if(m&&S.hold[+m[1]]&&S.hold[+m[1]].src==='live'){const h=S.hold[+m[1]];h.ov=h.ov||{};h.ov[m[2]]=true;}}
/* Panneau « Flux de données » */
function renderFlux(){
  const el=document.getElementById('flux');if(!el)return;el.hidden=!ui.fluxOpen;if(!ui.fluxOpen)return;
  const st=FLUX.status,c=st&&st.connectors||{},row=(l,ok,d)=>`<tr><td>${l}</td><td><span class="dot ${ok?'ok':'ko'}"></span> ${ok?'Connecté (flux live)':'Déconnecté (mode simulation)'}</td><td class="meta">${d}</td></tr>`;
  el.innerHTML=`<div class="ai-box" role="dialog" aria-label="Flux de données"><div class="ai-h"><b>Flux de données et connecteurs</b><button class="btn sm" data-act="fluxclose">Fermer</button></div>
    ${!st?`<p class="note">Aucun backend joignable depuis cette page${liveBase()?' ('+esc(liveBase())+')':''} : l'application fonctionne en <b>mode simulation</b> (données d'exemple, imports et override). Déployez le projet sur Vercel avec les variables du fichier .env.example, ou indiquez l'adresse du backend ci-dessous.</p>`
      :!st.backend?'<p class="note">Backend joignable mais Supabase non configuré (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : mode simulation.</p>'
      :FLUX.session?`<p class="note">Session ouverte : ${esc(FLUX.session.user.email||'')}. Dernière actualisation : ${FLUX.at?new Date(FLUX.at).toLocaleTimeString('fr-FR'):'—'}${FLUX.err?` · <span class="down">${esc(FLUX.err)}</span>`:''}</p><div class="row"><button class="btn pri sm" data-act="liverefresh">Actualiser les flux</button><button class="btn sm" data-act="logout">Se déconnecter</button></div>`
      :`<p class="note">Connectez-vous pour activer les flux live (lien de connexion envoyé par e-mail).</p><div class="row"><input class="f" id="liveEmail" type="email" placeholder="votre e-mail" style="max-width:260px"><button class="btn pri sm" data-act="login">Recevoir le lien</button></div>`}
    <div class="fields" style="margin-top:10px">${LF('Adresse du backend (vide = même site)','liveCfg.base','t',{ph:'https://override-desk.vercel.app'})}</div><div class="row" style="margin-top:6px"><button class="btn sm" data-act="liveinit">Tester la connexion au backend</button></div>
    <div class="tw" style="margin-top:10px"><table class="tbl"><thead><tr><th>Connecteur</th><th>Statut</th><th>Détail</th></tr></thead><tbody>
      ${row('Base de données (Supabase)',!!(st&&st.backend&&FLUX.session),st&&st.backend?'tables trading, placements, PnL, macro, sources IA':'non configurée')}
      ${row('MetaTrader 4 / 5 (EA → /api/v1/trading/mt-sync)',!!(FLUX.on&&S.mt5.live),S.mt5.live?'dernier envoi '+(S.mt5.lastSync?new Date(S.mt5.lastSync).toLocaleString('fr-FR'):'—'):'installer l\'EA OverrideSync avec la clé du compte')}
      ${row('SocialTraderTools',!!(FLUX.on&&c.stt),c.stt?'API configurée':'STT_API_BASE et STT_API_TOKEN à renseigner')}
      ${row('Courtiers (API chiffrées)',!!(FLUX.on&&c.encryption&&S.brokers.some(b=>b.live&&b.live.status==='live')),c.encryption?S.brokers.filter(b=>b.live).map(b=>b.n+' : '+b.live.status).join(', ')||'aucune connexion':'ENCRYPTION_KEY absente')}
      ${row('Macro EIA et BCE (tâche planifiée)',!!(FLUX.on&&c.eia),c.eia?'Brent, WTI spot et futures WTI M1 à M3, taux BCE':'EIA_API_KEY à renseigner')}
      ${row('IA connectée (/api/v1/ai/market-parser)',!!(FLUX.on&&c.ai),c.ai?'Claude, sources tracées avec score de confiance':'ANTHROPIC_API_KEY à renseigner')}
    </tbody></table></div></div>`;
}
/* Formulaire d'identifiants d'un courtier (envoyés une fois au serveur, chiffrés, jamais conservés dans le navigateur) */
function liveBrokerForm(b,i){
  if(!FLUX.on)return'';const cat=(FLUX.catalog||[]).find(x=>x.label===b.n),req=cat?cat.required:['url','token'];
  if(cat&&!cat.api)return`<p class="note">${esc(b.n)} ne propose pas d'API officielle de lecture : import du relevé CSV.</p>`;
  return`<h3 class="h3" style="margin-top:0">Identifiants API (chiffrés côté serveur) <span class="tag ${b.live&&b.live.status==='live'?'ok':b.live&&b.live.status==='error'?'ko':''}">${b.live?b.live.status==='live'?'Connecté (flux live)':b.live.status==='error'?'Erreur':'Simulation':'Non enregistré'}</span></h3>
    <div class="fields one" id="cred-${i}">${req.map(k=>`<label class="fld"><span class="lb">${CRED_LABELS[k]||k}</span><span class="fv">${k==='privateKey'||k==='addresses'?`<textarea class="f" data-cred="${k}" rows="3" autocomplete="off"></textarea>`:`<input class="f" data-cred="${k}" type="${/secret|passphrase|token/i.test(k)?'password':'text'}" autocomplete="off">`}</span></label>`).join('')}</div>
    ${b.live&&b.live.err?`<p class="note down">${esc(b.live.err)}</p>`:''}
    <div class="row"><button class="btn pri sm" data-act="credsave" data-id="${i}">Enregistrer et synchroniser</button></div>
    <p class="note">Utilisez des clés en lecture seule. Elles ne sont ni affichées ni stockées dans ce navigateur.</p>`;
}
async function liveCredSave(i){const b=S.brokers[i],box=document.getElementById('cred-'+i);if(!b||!box)return;
  const creds={};box.querySelectorAll('[data-cred]').forEach(el=>{const k=el.dataset.cred,v=el.value.trim();if(v)creds[k]=k==='addresses'?v.split(/\s+/).filter(Boolean):v;});
  const cat=(FLUX.catalog||[]).find(x=>x.label===b.n);
  try{const r=await liveApi('/api/v1/integrations/brokers',{method:'POST',body:{action:'save',label:b.n,broker:cat?cat.id:'gateway',credentials:creds}});
    box.querySelectorAll('[data-cred]').forEach(el=>el.value='');toast(r.sync&&r.sync.ok?`${b.n} connecté : ${r.sync.positions} position(s)`:`${b.n} enregistré${r.sync&&r.sync.error?' : '+r.sync.error:''}`);await liveRefresh(true);}
  catch(e){toast('Enregistrement impossible : '+e.message);}}
async function liveEaKey(){try{const M=S.mt5,r=await liveApi('/api/v1/trading/accounts',{method:'POST',body:{platform:M.platform||'MT5',login:M.login,server:M.server||null,broker:M.broker||null,account_type:M.type,currency:M.ccy||'EUR'}});ui.eaKey=r.ea_key;renderAll();}catch(e){toast('Création impossible : '+e.message);}}
setTimeout(async()=>{if(!liveReachable()){renderAll();return;}try{if(!FLUX.catalog){const c=await liveApi('/api/v1/integrations/brokers?action=catalog');FLUX.catalog=c.catalog;}}catch(_){}liveInit();},300);
