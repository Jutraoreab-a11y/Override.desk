/* ============ v7.2 : équipe, rôles, validation des versions (quatre yeux) et empreinte d'intégrité ============ */
/* Mode local (sans backend) : le circuit brouillon → soumise → validée s'applique dans ce navigateur, avec une empreinte
   SHA-256 de la version validée ; la séparation des rôles y est déclarative. En flux live, le même circuit passe par
   l'API : rôles contrôlés par le serveur, règle des quatre yeux, signature HMAC du serveur, journal d'audit partagé. */
const ROLE_L={admin:'Administrateur',analyste:'Analyste',valideur:'Valideur',lecteur:'Lecteur'};
const VST={brouillon:['','Brouillon'],soumise:['am','Soumise à validation'],validee:['ok','Validée'],rejetee:['ko','Rejetée']};
function team(){if(!S.team)S.team={me:{name:'',role:'admin'},members:[]};return S.team;}
function canonJ(v){if(v===null||typeof v!=='object')return JSON.stringify(v===undefined?null:v);if(Array.isArray(v))return'['+v.map(canonJ).join(',')+']';return'{'+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonJ(v[k])).join(',')+'}';}
async function sha256Hex(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
const meName=()=>(team().me.name||'').trim()||'Utilisateur local';
const can=(r,...a)=>a.includes(r);
function verStatus(v){return VST[v&&v.status]?v.status:'brouillon';}
function verTag(v){const st=verStatus(v),[c,l]=VST[st];return`<span class="tag ${c}" title="${v.valBy?'Validée par '+esc(v.valBy)+' le '+new Date(v.valAt).toLocaleString('fr-FR'):''}">${l}${v.remote?' · partagée':''}</span>`;}
function verActs(mod,v){const st=verStatus(v),r=team().me.role,me=meName(),b=(a,l,p)=>`<button class="btn sm${p?' pri':''}" data-act="${a}" data-id="${mod}" data-v="${v.id}">${l}</button>`;let h='';
  if(can(st,'brouillon','rejetee')&&can(r,'admin','analyste'))h+=b('versub','Soumettre');
  if(st==='soumise'&&can(r,'admin','valideur'))h+=(v.author&&v.author===me?`<span class="meta" title="Règle des quatre yeux">auteur : validation par un tiers</span>`:b('verval','Valider',1)+b('verrej','Rejeter'));
  if(st==='validee')h+=b('verchk','Vérifier l\'intégrité');
  return h;}
/* Contrôles locaux */
async function verLocal(act,mod,vid){const p=prjCur(mod),v=p.versions.find(x=>x.id===vid);if(!v)return;const r=team().me.role,me=meName(),now=new Date().toISOString();
  if(act==='versub'){if(!can(r,'admin','analyste')){toast('Rôle insuffisant : analyste ou administrateur requis');return;}
    if(v.id===p.cur&&prjDirty(mod))v.data=prjSnap(mod);v.author=v.author||me;v.status='soumise';v.subAt=now;v.hash=await sha256Hex(canonJ(v.data));
    auditLog(`prj.${mod}.${v.label}`,'brouillon','soumise','soumission');toast('Version soumise à validation');}
  if(act==='verval'||act==='verrej'){if(!can(r,'admin','valideur')){toast('Rôle insuffisant : valideur ou administrateur requis');return;}
    if(v.author===me){toast('Règle des quatre yeux : l\'auteur ne peut pas valider sa propre version');return;}
    const h=await sha256Hex(canonJ(v.data));if(act==='verval'&&h!==v.hash){toast('Les données ont changé depuis la soumission : soumettre à nouveau');v.status='brouillon';save();renderAll();return;}
    const c=prompt(act==='verval'?'Commentaire de validation (facultatif)':'Motif du rejet','')??'';
    if(act==='verval'){v.status='validee';v.valBy=me;v.valAt=now;v.comment=c;}else{v.status='rejetee';v.comment=c;}
    auditLog(`prj.${mod}.${v.label}`,'soumise',v.status,act==='verval'?'validation':'rejet'+(c?' : '+c:''));toast(act==='verval'?'Version validée, empreinte enregistrée':'Version rejetée');}
  if(act==='verchk'){const h=await sha256Hex(canonJ(v.data));toast(h===v.hash?`Version intègre : empreinte ${h.slice(0,12)}… identique à celle validée le ${new Date(v.valAt).toLocaleDateString('fr-FR')}`:'Alerte : la version a été modifiée après validation');}
  save();renderAll();}
/* ---- Flux live : espaces, versions partagées, journal et valorisations ---- */
const TEAM={ws:null,mine:[],members:[],versions:[],err:'',loaded:false};
async function teamLoad(){if(!(typeof FLUX==='object'&&FLUX.on))return;try{const r=await liveApi('/api/v1/team/workspaces');TEAM.mine=r.workspaces||[];TEAM.members=r.members||[];TEAM.me=r.me;
    if(!TEAM.ws||!TEAM.mine.some(w=>w.id===TEAM.ws))TEAM.ws=(TEAM.mine[0]||{}).id||null;
    if(TEAM.ws){const v=await liveApi('/api/v1/team/versions?workspace_id='+TEAM.ws);TEAM.versions=v.versions||[];}TEAM.err='';TEAM.loaded=true;}catch(e){TEAM.err=e.message;}if(ui.qaOpen)renderQA();}
const wsRole=()=>{const w=TEAM.mine.find(x=>x.id===TEAM.ws);return w?w.role:null;};
async function teamAct(a,el){try{const ws=TEAM.ws,B=(o)=>liveApi('/api/v1/team/'+o.ep,{method:'POST',body:o.b});
    if(a==='wscreate'){const n=(document.getElementById('wsName')||{}).value;if(!n){toast('Nom de l\'espace requis');return;}const r=await B({ep:'workspaces',b:{action:'create',name:n}});TEAM.ws=r.id;}
    if(a==='wsinvite'){await B({ep:'workspaces',b:{action:'invite',workspace_id:ws,email:document.getElementById('wsMail').value,role:document.getElementById('wsRole').value}});toast('Invitation enregistrée : elle s\'applique à la prochaine connexion de la personne');}
    if(a==='wsrole')await B({ep:'workspaces',b:{action:'role',workspace_id:ws,user_id:el.dataset.u,role:el.value}});
    if(a==='wspub'){const mod=el.dataset.id,p=prjCur(mod),v=verCur(mod);if(prjDirty(mod))v.data=prjSnap(mod);const r=await B({ep:'versions',b:{action:'create',workspace_id:ws,module:mod,project:p.name,label:v.label,data:v.data}});v.remote=r.id;v.hash=r.content_hash;toast('Version publiée dans l\'espace');}
    if(a==='rvsub')await B({ep:'versions',b:{action:'submit',id:el.dataset.v}});
    if(a==='rvval'||a==='rvrej'){const c=prompt(a==='rvval'?'Commentaire de validation (facultatif)':'Motif du rejet','')??'';const r=await B({ep:'versions',b:{action:a==='rvval'?'validate':'reject',id:el.dataset.v,comment:c}});toast(a==='rvval'?'Version validée et signée par le serveur':'Version rejetée');}
    if(a==='rvchk'){const r=await liveApi('/api/v1/team/versions?action=verify&id='+el.dataset.v);toast(r.intact&&r.signed?'Version intègre, signature du serveur valide':r.intact?'Données intègres, signature absente ou invalide':'Alerte : données modifiées depuis la création');}
    if(a==='rvopen'){const r=await liveApi('/api/v1/team/versions?id='+el.dataset.v),mod=r.module;if(mod!=='bp'&&mod!=='an'){toast('Ouverture prévue pour le business plan et l\'analyse');return;}
      const p=prjCur(mod),n={id:uid('v'),label:r.label+' (espace)',date:new Date().toISOString(),note:'Copie de la version partagée '+r.id.slice(0,8),data:r.data,remote:r.id,status:r.status==='validee'?'validee':'brouillon',hash:r.content_hash,valAt:r.validated_at};n.dd=n.date.slice(0,10);p.versions.push(n);p.cur=n.id;prjApply(mod,n.data);toast('Version ouverte en local');}
    save();await teamLoad();renderAll();}catch(e){toast('Opération refusée : '+e.message);}}
/* Envoi du journal et des valorisations au serveur (par lots) */
let AUD_Q=[];
function auditPush(e){if(typeof FLUX==='object'&&FLUX.on)AUD_Q.push(e);}
setInterval(async()=>{if(!AUD_Q.length||!(typeof FLUX==='object'&&FLUX.on))return;const b=AUD_Q.splice(0,200);try{await liveApi('/api/v1/team/audit',{method:'POST',body:{workspace_id:TEAM.ws,events:b}});}catch(_){AUD_Q=b.concat(AUD_Q).slice(0,2000);}},10000);
async function navSync(){if(!(typeof FLUX==='object'&&FLUX.on)||!S.nav)return;try{const d=today(),x=S.nav[d];if(x)await liveApi('/api/v1/portfolio/nav',{method:'POST',body:{date:d,value:x.v,flow:+x.f||0}});
  const r=await liveApi('/api/v1/portfolio/nav');(r.nav||[]).forEach(n=>{S.nav[n.nav_date]=Object.assign({},S.nav[n.nav_date]||{},{v:+n.value_eur,f:+n.flow_eur||0});});}catch(_){}}
/* Onglet « Équipe et validation » du contrôle qualité */
function teamTab(){const T=team(),live=typeof FLUX==='object'&&FLUX.on;
  const local=`<h3 class="h3" style="margin-top:0">Profil ${live?'local (hors espace partagé)':'dans ce navigateur'}</h3>
    <div class="fields" style="max-width:640px"><label class="mkt-f"><span>Nom</span><input class="f" data-team="name" value="${esc(T.me.name)}" placeholder="Prénom Nom"></label>
      <label class="mkt-f"><span>Rôle</span><select class="f" data-team="role">${Object.entries(ROLE_L).map(([k,l])=>`<option value="${k}"${k===T.me.role?' selected':''}>${l}</option>`).join('')}</select></label></div>
    <p class="note">Circuit : l'analyste soumet une version, un valideur différent de l'auteur la valide (règle des quatre yeux) ; une version validée reçoit une empreinte SHA-256 et ne se modifie plus (tout enregistrement crée une nouvelle version). ${live?'':'<b>Sans backend, les rôles sont déclaratifs</b> : n\'importe qui peut changer de profil dans ce navigateur. La séparation des rôles et la signature ne sont garanties qu\'en flux live, par le serveur.'}</p>`;
  if(!live)return local;
  const R=wsRole(),mem=TEAM.members.filter(m=>m.workspace_id===TEAM.ws);
  return`${TEAM.err?`<p class="note down">${esc(TEAM.err)}</p>`:''}
    <div class="row" style="align-items:flex-end;gap:10px;flex-wrap:wrap"><label class="mkt-f"><span>Espace de travail</span><select class="f" data-team="ws">${TEAM.mine.map(w=>`<option value="${w.id}"${w.id===TEAM.ws?' selected':''}>${esc(w.name)} · ${ROLE_L[w.role]}</option>`).join('')||'<option>aucun espace</option>'}</select></label>
      <label class="mkt-f"><span>Nouvel espace</span><span class="row" style="gap:4px"><input class="f" id="wsName" placeholder="ex. Comité d'investissement" style="width:220px"><button class="btn sm" data-act="wscreate">Créer</button></span></label></div>
    ${TEAM.ws?`<h3 class="h3">Membres</h3><div class="tw"><table class="tbl"><thead><tr><th>Membre</th><th>Rôle</th></tr></thead><tbody>${mem.map(m=>`<tr><td>${esc(m.email||m.user_id.slice(0,8))}</td><td>${R==='admin'?`<select class="f" data-team="role-of" data-u="${m.user_id}" style="width:auto">${Object.entries(ROLE_L).map(([k,l])=>`<option value="${k}"${k===m.role?' selected':''}>${l}</option>`).join('')}</select>`:ROLE_L[m.role]}</td></tr>`).join('')}</tbody></table></div>
      ${R==='admin'?`<div class="row" style="margin-top:6px;align-items:flex-end;gap:6px"><input class="f" id="wsMail" type="email" placeholder="email@cabinet.fr" style="width:220px"><select class="f" id="wsRole" style="width:auto">${Object.entries(ROLE_L).map(([k,l])=>`<option value="${k}"${k==='analyste'?' selected':''}>${l}</option>`).join('')}</select><button class="btn sm" data-act="wsinvite">Inviter</button></div>`:''}
      <h3 class="h3">Versions partagées <span class="meta">votre rôle : ${ROLE_L[R]||'—'}</span></h3><div class="row" style="gap:6px;margin-bottom:6px">${can(R,'admin','analyste')?`<button class="btn sm" data-act="wspub" data-id="bp">Publier la version courante du BP</button><button class="btn sm" data-act="wspub" data-id="an">Publier l'analyse courante</button>`:''}</div>
      <div class="tw" style="max-height:40vh;overflow:auto"><table class="tbl"><thead><tr><th>Version</th><th>Module</th><th>Statut</th><th>Empreinte</th><th></th></tr></thead><tbody>${TEAM.versions.map(v=>{const mine=TEAM.me&&v.author_id===TEAM.me.id;return`<tr><td>${esc(v.project)} · ${esc(v.label)}<div class="meta">${new Date(v.created_at).toLocaleString('fr-FR')}</div></td><td>${v.module.toUpperCase()}</td><td><span class="tag ${VST[v.status][0]}">${VST[v.status][1]}</span>${v.comment?`<div class="meta">${esc(v.comment)}</div>`:''}</td><td class="num">${v.content_hash.slice(0,12)}…</td>
        <td style="white-space:nowrap"><button class="btn sm" data-act="rvopen" data-v="${v.id}">Ouvrir</button>${['brouillon','rejetee'].includes(v.status)&&(mine||R==='admin')?`<button class="btn sm" data-act="rvsub" data-v="${v.id}">Soumettre</button>`:''}${v.status==='soumise'&&can(R,'admin','valideur')&&!mine?`<button class="btn sm pri" data-act="rvval" data-v="${v.id}">Valider et signer</button><button class="btn sm" data-act="rvrej" data-v="${v.id}">Rejeter</button>`:''}${v.status==='validee'?`<button class="btn sm" data-act="rvchk" data-v="${v.id}">Vérifier</button>`:''}</td></tr>`;}).join('')||'<tr><td colspan="5" class="meta">Aucune version partagée.</td></tr>'}</tbody></table></div>`:''}
    <p class="note">Les règles sont appliquées par le serveur : rôles, quatre yeux, signature HMAC, version validée figée en base, journal d'audit en ajout seul.</p>`;}
document.addEventListener('change',e=>{const el=e.target;if(!el.dataset||!el.dataset.team)return;const T=team();
  if(el.dataset.team==='name'){T.me.name=el.value.trim();save();}
  else if(el.dataset.team==='role'){const o=T.me.role;T.me.role=el.value;auditLog('team.me.role',o,el.value,'changement de profil local');save();renderAll();}
  else if(el.dataset.team==='ws'){TEAM.ws=el.value;teamLoad();}
  else if(el.dataset.team==='role-of')teamAct('wsrole',el);});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(['versub','verval','verrej','verchk'].includes(a))verLocal(a,b.dataset.id,b.dataset.v);
  if(['wscreate','wsinvite','wspub','rvsub','rvval','rvrej','rvchk','rvopen'].includes(a))teamAct(a,b);});
/* Rattachement aux flux live */
if(typeof liveRefresh==='function'){const _lr=liveRefresh;liveRefresh=async function(){const r=await _lr.apply(this,arguments);await teamLoad();await navSync();return r;};}
