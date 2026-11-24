/* ============ v8.17 : Paramètres (barre latérale) : profil, accueil « Bonjour », connecteur Claude, clés ============
   - Profil : prénom (accueil), e-mail et mot de passe du compte (Supabase Auth quand le serveur a sa base de comptes).
   - Connecteur Claude : clé personnelle, adresse du serveur MCP de FOMO.DESK, marche à suivre dans Claude et message à lui donner.
     Claude traite alors les demandes du SaaS (études de marché, LBO, comptes, cours) avec l'abonnement de l'utilisateur, sans clé API Anthropic.
   - Les recherches lancées hors de l'application Claude, compte connecté et connecteur créé, partent dans la file des demandes ;
     le résultat déposé par Claude est appliqué automatiquement à l'ouverture suivante (ou dans la minute si la page est ouverte). */
const SITE='https://override-desk.vercel.app';
const setBase=()=>(typeof liveBase==='function'&&liveBase())||(/^https?:$/.test(location.protocol)&&!/(^|\.)(claude\.ai|claudeusercontent\.com)$/.test(location.hostname)?location.origin:SITE);
const setSrv=()=>typeof liveReachable==='function'&&liveReachable();
const setSess=()=>typeof FLUX==='object'&&!!FLUX.session;
const setAcct=()=>typeof FLUX==='object'&&!!FLUX.sb;
function prof(){S.profile=S.profile||{prenom:'',nom:''};return S.profile;}
const prenom=()=>{const p=prof(),m=setSess()&&FLUX.session.user&&FLUX.session.user.user_metadata;return(p.prenom||(m&&m.prenom)||'').trim();};
function helloHTML(){return prenom()?`<b class="hello">Bonjour ${esc(prenom())}</b>`:'<button class="lnk hello" data-act="tab" data-id="set">Bonjour : indiquez votre prénom</button>';}
const SETK={keys:null,newKey:null,jobs:null,busy:false,err:'',show:false};
/* v8.24 : la clé créée reste visible et copiable dans ce navigateur (le serveur n'en garde que l'empreinte). */
const setKeyStore=()=>{try{const u=FLUX.session&&FLUX.session.user&&FLUX.session.user.id;return u?'fomo.mcpkey.'+u:'';}catch(_){return'';}};
const setKeyGet=()=>{const k=setKeyStore();if(!k)return'';try{return localStorage.getItem(k)||'';}catch(_){return'';}};
const setKeySet=v=>{const k=setKeyStore();if(!k)return;try{v?localStorage.setItem(k,v):localStorage.removeItem(k);}catch(_){}};
const setErrFr=m=>/row-level security|permission denied|42501/i.test(m||'')?'la base refuse l\'écriture : sur Vercel, SUPABASE_SERVICE_ROLE_KEY doit être la clé secrète (sb_secret_… ou service_role) du projet Supabase partagé, puis redéployez.':/fomodesk_keys|does not exist|42P01|schema cache/i.test(m||'')?'table fomodesk_keys absente : exécutez supabase/fomodesk/setup_fomodesk.sql dans ce projet Supabase.':(m||'erreur inconnue');
ICON.set='<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" fill="none" stroke="currentColor" stroke-width="1.4"/>';
if(!PANELS.includes('set'))PANELS.push('set');
const setMsg=url=>`Tu es connecté à mon SaaS FOMO.DESK par le connecteur « FOMO.DESK ». À chaque fois que je te le demande (« traite mes demandes FOMO.DESK ») :
1. Appelle fomo_next_job pour lire la prochaine demande en attente.
2. Fais la recherche demandée sur le web en ouvrant les pages sources : jamais de chiffre de mémoire, uniquement des chiffres lus et datés.
3. Renvoie exactement le JSON demandé avec fomo_submit_job, en citant pour chaque chiffre l'adresse de la page et l'extrait mot pour mot.
4. Recommence jusqu'à la réponse « aucune demande », puis fais-moi un résumé en français de ce que tu as déposé.
Pour toute question sur mes dossiers (titres analysés, business plan, LBO, portefeuille), lis d'abord fomo_desk. Pour des comptes ou des cours à jour, utilise fomo_company_fiche et fomo_public_data.
Adresse du connecteur : ${url}`;
async function setCopy(t){try{await navigator.clipboard.writeText(t);toast('Copié dans le presse-papiers');}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast('Copié');}catch(x){toast('Copie impossible : sélectionnez le texte');}a.remove();}}
async function setLoadKeys(){if(!setSess())return;try{const r=await liveApi('/api/v1/keys');SETK.keys=r.keys||[];}catch(e){SETK.keys=null;SETK.err=e.message;}try{const j=await liveApi('/api/v1/jobs?status=pending');SETK.jobs=(j.jobs||[]).length;}catch(e){}if(ui.tab==='set')renderAll();}

function renderSET(){const P=document.getElementById('p-set');if(!P||ui.tab!=='set')return;const p=prof(),acct=setAcct(),sess=setSess(),url=setBase()+'/api/v1/mcp',em=sess?(FLUX.session.user.email||''):'';
  const keys=SETK.keys||[],stK=SETK.newKey||setKeyGet(),stOk=stK&&(!SETK.keys||keys.some(k=>!k.revoked_at&&stK.startsWith(k.prefix))),keyUrl=stOk?`${url}?key=${stK}`:null;
  P.innerHTML=`<div class="grid">
  <div class="card s12"><h2><span>Paramètres <span class="meta">${prenom()?'Bonjour '+esc(prenom())+' · ':''}profil, connecteur Claude et clés</span></span></h2>
    <p class="note">Tout ce qui est saisi ici reste dans votre navigateur, sauf l'e-mail, le mot de passe et les clés, conservés par le serveur de comptes de FOMO.DESK.</p>
    <div class="btns" style="margin-top:8px">${sess?`<span class="meta" style="align-self:center">Connecté : <b>${esc(em)}</b></span><button class="btn sm" data-act="setlogout" id="setLogoutTop">Se déconnecter</button>`:`<span class="meta" style="align-self:center">Bureau ouvert sans compte</span><button class="btn sm" data-act="setlogout" id="setLogoutTop">Se déconnecter</button>`}</div></div>
  <div class="card s6"><h2><span>Profil</span></h2>
    <div class="set-g"><label class="set-f"><span class="lb">Prénom</span><input id="setPrenom" value="${esc(p.prenom||'')}" placeholder="Votre prénom" autocomplete="given-name"></label>
      <label class="set-f"><span class="lb">Nom</span><input id="setNom" value="${esc(p.nom||'')}" placeholder="Votre nom" autocomplete="family-name"></label></div>
    <button class="btn sm pri" data-act="setprof">Enregistrer le profil</button>
    <h3 class="h3">Compte</h3>
    ${!acct?`<p class="note">${setSrv()?'Le serveur de comptes n\'est pas encore activé sur ce site : la base de données doit être branchée (voir le README, section v8.17). Le prénom fonctionne déjà ; l\'e-mail et le mot de passe seront modifiables dès l\'activation.':'Ouvrez FOMO.DESK sur '+SITE+' pour gérer votre compte (e-mail, mot de passe, clés).'}</p>`
    :!sess?`<div class="set-g"><label class="set-f"><span class="lb">E-mail</span><input id="setEm" type="email" autocomplete="email"></label><label class="set-f"><span class="lb">Mot de passe</span><input id="setPw" type="password" autocomplete="current-password"></label></div>
      <div class="btns"><button class="btn sm pri" data-act="setlogin">Se connecter</button><button class="btn sm" data-act="setsignup">Créer le compte</button><button class="btn sm" data-act="setotp">Recevoir un lien par e-mail</button></div>`
    :`<p class="meta">Connecté : <b>${esc(em)}</b></p>
      <div class="set-g"><label class="set-f"><span class="lb">Nouvel e-mail</span><input id="setEm2" type="email" placeholder="${esc(em)}" autocomplete="email"></label>
        <label class="set-f"><span class="lb">Nouveau mot de passe</span><input id="setPw2" type="password" autocomplete="new-password" placeholder="10 caractères au moins"></label>
        <label class="set-f"><span class="lb">Confirmation</span><input id="setPw3" type="password" autocomplete="new-password"></label></div>
      <div class="btns"><button class="btn sm pri" data-act="setacct">Mettre à jour le compte</button><button class="btn sm" data-act="setlogout">Se déconnecter</button></div>
      <p class="note">Un changement d'e-mail est confirmé par un lien envoyé à la nouvelle adresse.</p>`}
  </div>
  <div class="card s6"><h2><span>Connecteur Claude <span class="meta">Claude répond aux demandes de FOMO.DESK avec votre abonnement, sans clé API Anthropic</span></span></h2>
    <ol class="set-steps"><li>${sess?'Créez une clé personnelle ci-dessous.':'Connectez-vous à votre compte (à gauche), puis créez une clé personnelle.'} Sans clé, le connecteur ne donne accès qu'aux données publiques (changes, cours, comptes, stocks de brut).</li>
      <li>Dans Claude : <b>Paramètres › Connecteurs › Ajouter un connecteur personnalisé</b>. Nom : <b>FOMO.DESK</b>. Adresse : celle ci-dessous.</li>
      <li>Dans une conversation, activez le connecteur FOMO.DESK et collez le message à donner à Claude.</li></ol>
    ${sess?`<div class="btns"><button class="btn sm pri" data-act="setnewkey" ${SETK.busy?'disabled':''}>Créer une clé</button>${SETK.jobs!==null&&SETK.jobs!==undefined?`<span class="meta">${SETK.jobs} demande(s) en attente de Claude</span>`:''}</div>`:''}
    ${SETK.err?`<p class="note" style="color:var(--down)"><b>Création impossible :</b> ${esc(SETK.err)}</p>`:''}
    ${keyUrl?`<label class="set-f"><span class="lb">Votre clé personnelle</span><div class="set-cp"><input readonly value="${esc(SETK.show?stK:stK.slice(0,10)+'•'.repeat(18))}" id="setKey"><button class="btn sm" data-act="setshowkey">${SETK.show?'Masquer':'Afficher'}</button><button class="btn sm" data-act="setcpkey">Copier</button></div></label>
    <p class="note">La clé reste visible dans ce navigateur. Sur un autre appareil, créez une nouvelle clé ; révoquez celles que vous n'utilisez plus.</p>`:(sess&&keys.some(k=>!k.revoked_at)?`<p class="note">Une clé active existe mais elle a été créée sur un autre navigateur : créez-en une nouvelle ici pour l'afficher.</p>`:'')}
    <label class="set-f"><span class="lb">Adresse du connecteur${keyUrl?' (avec votre clé, à coller dans Claude)':''}</span><div class="set-cp"><input readonly value="${esc(keyUrl||url)}" id="setUrl"><button class="btn sm" data-act="setcpurl">Copier</button></div></label>
    ${keys.length?`<div class="tw"><table class="tbl"><thead><tr><th>Clé</th><th>Créée le</th><th>Dernier usage</th><th></th></tr></thead><tbody>${keys.map(k=>`<tr><td>${esc(k.label)} <span class="meta">${esc(k.prefix)}…</span></td><td>${fdate(String(k.created_at).slice(0,10))}</td><td>${k.last_used_at?fdate(String(k.last_used_at).slice(0,10)):'<span class="meta">jamais</span>'}</td><td>${k.revoked_at?'<span class="tag ko">révoquée</span>':`<button class="btn sm" data-act="setrevoke" data-id="${esc(k.id)}">Révoquer</button>`}</td></tr>`).join('')}</tbody></table></div>`:''}
    <label class="set-f"><span class="lb">Message à donner à Claude</span><textarea id="setMsg" rows="9" readonly>${esc(setMsg(keyUrl||url))}</textarea></label>
    <button class="btn sm" data-act="setcpmsg">Copier le message</button>
  </div>
  <div class="card s12"><h2><span>Clés et connecteurs</span></h2><div class="tw"><table class="tbl"><thead><tr><th>Élément</th><th>État</th><th>À quoi il sert</th></tr></thead><tbody>
    <tr><td>Application Claude</td><td>${typeof AI==='object'&&AI.mcp?'<span class="tag ok">active</span>':'<span class="tag">non détectée ici</span>'}</td><td>Ouverte dans Claude, la page lit les sources avec votre abonnement (navigateur intégré, Firecrawl).</td></tr>
    <tr><td>Connecteur Claude (MCP)</td><td>${keys.some(k=>!k.revoked_at)?'<span class="tag ok">clé active</span>':'<span class="tag">aucune clé</span>'}</td><td>Claude traite la file des demandes du site web et lit vos dossiers.</td></tr>
    <tr><td>Serveur FOMO.DESK</td><td>${setSrv()?'<span class="tag ok">joignable</span>':'<span class="tag">hors ligne ici</span>'}</td><td>Données publiques sans IA (BCE, cours, EIA) pour « Tout mettre à jour ».</td></tr>
    <tr><td>Base de comptes</td><td>${acct?'<span class="tag ok">activée</span>':'<span class="tag am">à activer</span>'}</td><td>Comptes, clés du connecteur, file des demandes, instantané du bureau.</td></tr>
    <tr><td>Clé API Anthropic</td><td><span class="tag">facultative</span></td><td>Inutile avec Claude ou le connecteur ; seulement pour une IA côté serveur.</td></tr>
    <tr><td>Courtiers et plateformes</td><td><button class="btn sm" data-act="tab" data-id="pf">Ouvrir</button></td><td>Synchronisation des positions (onglet Suivi & placements).</td></tr></tbody></table></div></div>
  </div>`;}

/* actions */
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,v=id=>((document.getElementById(id)||{}).value||'').trim();
  if(a==='setprof'){const p=prof();p.prenom=v('setPrenom').slice(0,40);p.nom=v('setNom').slice(0,60);save();if(setSess())FLUX.sb.auth.updateUser({data:{prenom:p.prenom,nom:p.nom}}).catch(()=>{});toast(p.prenom?`Profil enregistré. Bonjour ${p.prenom} !`:'Profil enregistré');renderAll();}
  else if(a==='setlogin'||a==='setsignup'){if(!setAcct())return;const em=v('setEm'),pw=v('setPw');if(!em||pw.length<10){toast('E-mail et mot de passe (10 caractères au moins) requis');return;}
    const r=a==='setlogin'?await FLUX.sb.auth.signInWithPassword({email:em,password:pw}):await FLUX.sb.auth.signUp({email:em,password:pw,options:{data:{prenom:prof().prenom||''},emailRedirectTo:location.href.split('#')[0]}});
    toast(r.error?(r.error.message||'Échec'):a==='setlogin'?'Connecté':'Compte créé : confirmez votre e-mail si un lien vous est envoyé');if(!r.error)setTimeout(setLoadKeys,400);}
  else if(a==='setotp'){if(!setAcct())return;const em=v('setEm');if(!em){toast('Saisissez votre e-mail');return;}const r=await FLUX.sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:location.href.split('#')[0]}});toast(r.error?'Envoi impossible : '+r.error.message:'Lien de connexion envoyé à '+em);}
  else if(a==='setacct'){if(!setSess())return;const em=v('setEm2'),pw=v('setPw2'),pw2=v('setPw3'),u={};if(em)u.email=em;
    if(pw){if(pw.length<10){toast('Mot de passe : 10 caractères au moins');return;}if(pw!==pw2){toast('Les deux mots de passe diffèrent');return;}u.password=pw;}
    if(!Object.keys(u).length){toast('Rien à modifier');return;}const r=await FLUX.sb.auth.updateUser(u);toast(r.error?'Mise à jour impossible : '+r.error.message:(u.email?'Lien de confirmation envoyé à '+u.email+(u.password?' ; mot de passe changé':''):'Mot de passe changé'));renderAll();}
  else if(a==='setlogout'){if(setSess()&&FLUX.sb)await FLUX.sb.auth.signOut();FLUX.session=null;FLUX.on=false;SETK.keys=null;toast('Déconnecté');renderAll();}
  else if(a==='setnewkey'){if(!setSess())return;SETK.busy=true;renderAll();try{const r=await liveApi('/api/v1/keys',{method:'POST',body:{label:'Claude '+new Date().toLocaleDateString('fr-FR')}});SETK.newKey=r.key;SETK.err='';setKeySet(r.key);try{localStorage.setItem('fomo.mcp','1');}catch(x){}toast('Clé créée : copiez l\'adresse du connecteur');}catch(x){SETK.err=setErrFr(x.message);toast('Création impossible : '+SETK.err);}SETK.busy=false;await setLoadKeys();renderAll();}
  else if(a==='setrevoke'){if(!confirm('Révoquer cette clé ? Claude ne pourra plus se connecter avec elle.'))return;try{await liveApi('/api/v1/keys?id='+encodeURIComponent(b.dataset.id),{method:'DELETE'});toast('Clé révoquée');}catch(x){toast('Révocation impossible : '+x.message);}setLoadKeys();}
  else if(a==='setshowkey'){SETK.show=!SETK.show;renderAll();}
  else if(a==='setcpkey')setCopy(SETK.newKey||setKeyGet());
  else if(a==='setcpurl')setCopy(v('setUrl'));else if(a==='setcpmsg')setCopy(((document.getElementById('setMsg')||{}).value)||'');
  else if(a==='tab'&&b.dataset.id==='set'&&setSess()&&SETK.keys===null)setLoadKeys();});

/* rail, en-tête et panneau */
{const _c=ctxHTML;ctxHTML=function(){if(ui.tab==='set')return`<span class="ctx-t">Paramètres</span><span class="ctx-s">${prenom()?'Bonjour '+esc(prenom()):'Profil, connecteur Claude et clés'}</span>`;return _c.apply(this,arguments);};}
{const _s=sideHTML;sideHTML=function(){if(ui.tab==='set')return'';return _s.apply(this,arguments);};}
{const _r=renderAll;renderAll=function(){if(!document.getElementById('p-set')){const m=document.getElementById('main'),s=document.createElement('section');s.className='panel';s.id='p-set';(m||document.body).appendChild(s);}
  _r.apply(this,arguments);try{const R=document.getElementById('rail');if(R&&!R.querySelector('[data-id=set]')){const x=document.createElement('button');x.className='rb';x.dataset.act='tab';x.dataset.id='set';x.title='Paramètres';if(ui.tab==='set')x.setAttribute('aria-current','page');x.innerHTML=`${ic('set')}<span>Paramètres</span>`;R.appendChild(x);}
    const pb=document.getElementById('pdfBtn');if(pb&&!document.getElementById('setTopBtn')){const t=document.createElement('button');t.className='btn';t.id='setTopBtn';t.dataset.act='tab';t.dataset.id='set';t.title='Paramètres : compte, déconnexion, connecteur Claude';t.innerHTML=`${ic('set')}<span class="lbl">Paramètres</span>`;pb.parentNode.insertBefore(t,pb);}
    renderSET();if(typeof afBar==='function')afBar();}catch(e){console.error('parametres',e);}};}

/* accueil : « Bonjour Prénom » à l'arrivée */
setTimeout(()=>{const n=prenom();toast(n?`Bonjour ${n} !`:'Bonjour ! Indiquez votre prénom dans Paramètres');},900);

/* file des demandes : hors application Claude, compte connecté et connecteur créé, une recherche devient une demande pour Claude */
const JOBRES={};
const JOB_SPEC={
  an:s=>({instructions:`Comptes annuels publiés de la société cotée ${s} (cinq derniers exercices, colonnes « FY », jamais TTM), cours de clôture et date. Ouvre les pages publiques (rapport annuel, stockanalysis.com, MarketScreener).`,
    schema:'{"name":"","sector":"","currency":"EUR","fiscal_years":[2021],"revenue":[],"ebitda":[],"ebitda_margin_pct":[],"net_income":[],"eps":[],"fcf":[],"net_debt":[],"roe_pct":[],"shares":nombre,"price":nombre,"price_date":"AAAA-MM-JJ","sources":[{"url":"","quote":"","figure":""}]}'}),
  cm:s=>({instructions:`Dernier cours de clôture du ${({brent:'Brent (ICE)',wti:'WTI (NYMEX)',gold:'Or',silver:'Argent'})[s]||s} en dollars, recoupé sur deux sites (TradingView, Investing.com).`,
    schema:'{"instrument":"'+s+'","rows":[{"date":"AAAA-MM-JJ","close":nombre}],"checked":true,"by":["TradingView","Investing.com"],"sources":[{"url":"","quote":""}]}'})};
const JOB_EVERY=12*3600e3,jobAtKey=k=>'fomo.jobat.'+k;
const jobDue=k=>{try{return Date.now()-(+localStorage.getItem(jobAtKey(k))||0)>JOB_EVERY;}catch(e){return true;}};
const jobMark=k=>{try{localStorage.setItem(jobAtKey(k),String(Date.now()));}catch(e){}};
const jobsOn=()=>setSess()&&!(typeof rsClaude==='function'&&rsClaude())&&(()=>{try{return localStorage.getItem('fomo.mcp')==='1';}catch(e){return false;}})();
if(typeof rsRun==='function'){const _rr=rsRun;rsRun=async function(mod,subject,inapp,server,trigger){const k=mod+'|'+subject;
  if(JOBRES[k]){const p=JOBRES[k];delete JOBRES[k];RS.last[mod]={how:'claude',at:new Date().toISOString(),err:[],via:'connecteur'};return{p,how:'claude'};}
  if(jobsOn()){const sp=(server&&server.instr)?{instructions:server.instr,schema:server.schema}:(JOB_SPEC[mod]?JOB_SPEC[mod](subject):null);
    /* v8.25 : la mise à jour au chargement envoie aussi la demande à Claude (au plus une fois toutes les 12 h par volet et sujet),
       sans bloquer la lecture de la base ; Recalculer et « Lancer la recherche » l'envoient à chaque clic */
    if(sp&&(trigger!=='init'||jobDue(k))){try{const r=await liveApi('/api/v1/jobs',{method:'POST',body:{module:mod,subject,query:server&&server.query||null,...sp}});jobMark(k);
        toast(`${RS_MOD[mod]||mod} : demande ${r.queued?'transmise':'déjà en attente'} à Claude. Dans Claude, dites « traite mes demandes FOMO.DESK » : le résultat s'appliquera ici.`);
        if(trigger!=='init')return null;}
      catch(e){toast('File des demandes indisponible : '+e.message);}}}
  return _rr.apply(this,arguments);};}
async function jobsPoll(){if(!setSess())return;let r;try{r=await liveApi('/api/v1/jobs?status=done');}catch(e){return;}const J=r.jobs||[];if(!J.length)return;const ids=[];
  for(const j of J){if(!j.result||typeof j.result!=='object'){ids.push(j.id);continue;}JOBRES[j.module+'|'+j.subject]=j.result;ids.push(j.id);
    try{if(j.module==='bp')await rsMarket('job');else if(j.module==='lbo')await rsLbo('job');
      else if(j.module==='an'){const k=Object.keys(S.an.assets).find(x=>S.an.assets[x].t===j.subject);if(k)await rsAn('job',k);}
      else if(j.module==='cm'){const o=ui.cmA;ui.cmA=j.subject;await rsCm('job');ui.cmA=o;}}catch(e){console.error('job',e);}}
  try{await liveApi('/api/v1/jobs',{method:'POST',body:{action:'ack',ids}});}catch(e){}toast(`${J.length} résultat(s) de Claude appliqué(s)`);}
setTimeout(jobsPoll,4000);setInterval(jobsPoll,60000);

/* instantané du bureau pour Claude (lecture par fomo_desk), envoyé au plus toutes les 30 secondes après un changement */
let deskT=null,deskLast='';
function deskSnap(){const A={};Object.entries(S.an.assets).forEach(([k,a])=>{A[k]={t:a.t,n:a.n,sec:a.sec,cur:a.cur,price:a.price,pxDate:a.pxDate,y:a.y,rev:a.rev,ebitda:a.ebitda,ni:a.ni,eps:a.eps,fcf:a.fcf,nd:a.nd,roe:a.roe,roic:a.roic,g:a.g,wacc:a.wacc,est:a.est};
  try{const R=anCalc(k);A[k].decision={valeur_ref:R.ref,achat:R.buy,stop:R.sl,objectif:R.tp,positif:R.positive};}catch(e){}});
  return{an:A,bp:{nom:S.bp.name,secteur:S.bp.sector,zone:S.bp.zone,marche:S.bp.mkt,tamOv:S.bp.tamOv,cagrOv:S.bp.cagrOv},lbo:S.lbo&&S.lbo.list,pf:{lignes:S.hold,positions:S.pf&&S.pf.positions},
    cm:typeof OIL_STK==='object'?{stocks_brut:OIL_STK.w.slice(-5)}:null,profil:{prenom:prenom()},maj:new Date().toISOString()};}
{const _sv=save;save=function(){_sv.apply(this,arguments);if(!setSess())return;clearTimeout(deskT);deskT=setTimeout(async()=>{try{const st=deskSnap(),js=JSON.stringify(st);if(js===deskLast)return;await liveApi('/api/v1/desk',{method:'POST',body:{state:st}});deskLast=js;}catch(e){}},30000);};}
