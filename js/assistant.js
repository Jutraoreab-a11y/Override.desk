/* ============ v8.32 : assistant IA (bulle ronde en bas à droite) ============
   Chaque question devient une demande « chat » dans la file FOMO.DESK ; le serveur réveille la routine Claude, qui lit l'instantané
   du bureau (fomo_desk), répond en français et peut proposer des actions. C'est toujours Claude qui répond (abonnement de l'utilisateur).
   Une action ne s'applique qu'après un clic sur « Appliquer ». */
const CHAT_K='fomo.chat',CHAT_PEND_K='fomo.chatpend';
const chatLoad=()=>{try{return JSON.parse(localStorage.getItem(CHAT_K)||'[]');}catch(e){return[];}};
const chatSave=m=>{try{localStorage.setItem(CHAT_K,JSON.stringify(m.slice(-60)));}catch(e){}};
const chatPend=()=>{try{return JSON.parse(localStorage.getItem(CHAT_PEND_K)||'[]');}catch(e){return[];}};
const chatPendSet=p=>{try{localStorage.setItem(CHAT_PEND_K,JSON.stringify(p));}catch(e){}};
let CHAT_OPEN=false,CHAT_TIMER=null;
const CHAT_TABS={bp:'Business plan',an:'Analyse financière',sc:'Sélecteur & mapping',lbo:'Dossier LBO',pf:'Suivi & placements',cm:'Commodities & flows',pc:'Calculateur de position',jr:'Journal de trading'};

/* --- styles --- */
if(!document.getElementById('fd-chat-css')){const st=document.createElement('style');st.id='fd-chat-css';st.textContent=`
#fdChatBtn{position:fixed;right:22px;bottom:46px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;z-index:900;display:grid;place-items:center;
  background:radial-gradient(circle at 30% 30%,#F7B955,#D97757 70%);box-shadow:0 6px 24px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.08) inset;transition:transform .15s}
#fdChatBtn:hover{transform:scale(1.06)}#fdChatBtn:focus-visible{outline:2px solid #FAFAFA;outline-offset:3px}
#fdChatBtn svg{width:26px;height:26px}
#fdChatBtn.busy::after{content:'';position:absolute;inset:-5px;border-radius:50%;border:2px solid transparent;border-top-color:#F7B955;animation:fdspin 1s linear infinite}
#fdChatBtn .dot{position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;background:#10B981;border:2px solid #09090B;display:none}
#fdChatBtn.new .dot{display:block}
@keyframes fdspin{to{transform:rotate(360deg)}}
#fdChat{position:fixed;right:22px;bottom:112px;width:min(400px,calc(100vw - 32px));height:min(560px,calc(100vh - 150px));z-index:901;display:none;flex-direction:column;
  background:#111113;border:1px solid #27272A;border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.55);overflow:hidden;font-size:14px;color:#D4D4D8}
#fdChat.on{display:flex}
#fdChat header{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #27272A;background:#18181B}
#fdChat header b{color:#FAFAFA;font-size:14px}#fdChat header .meta{font-size:12px;color:#A1A1AA}
#fdChat header button{margin-left:auto;background:none;border:0;color:#A1A1AA;cursor:pointer;font-size:18px;line-height:1;padding:4px}
#fdChat header button:hover{color:#FAFAFA}
#fdChatLog{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
.fdm{max-width:88%;padding:9px 12px;border-radius:10px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}
.fdm.u{align-self:flex-end;background:#27272A;color:#FAFAFA;border-bottom-right-radius:3px}
.fdm.a{align-self:flex-start;background:#18181B;border:1px solid #27272A;border-bottom-left-radius:3px}
.fdm.a.err{border-color:#7F1D1D}
.fdm.wait{color:#A1A1AA;font-style:italic}
.fdm .src{margin-top:6px;font-size:12px;color:#A1A1AA}.fdm .src a{color:#A1A1AA}
.fdm .acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.fdm .acts button{font-family:inherit;font-size:12px;font-weight:600;padding:5px 10px;border-radius:6px;border:1px solid #3F3F46;background:#27272A;color:#FAFAFA;cursor:pointer}
.fdm .acts button:hover{border-color:#F7B955}.fdm .acts button:disabled{opacity:.5;cursor:default}
#fdChat form{display:flex;gap:8px;padding:10px;border-top:1px solid #27272A;background:#0C0C0E}
#fdChat textarea{flex:1;resize:none;height:44px;max-height:120px;background:#18181B;border:1px solid #27272A;border-radius:8px;color:#FAFAFA;padding:10px;font:inherit}
#fdChat textarea:focus{outline:none;border-color:#52525B}
#fdChat form button{border:0;border-radius:8px;padding:0 14px;background:#FAFAFA;color:#09090B;font-weight:700;cursor:pointer}
#fdChat form button:disabled{opacity:.5;cursor:default}
.fdhint{font-size:12px;color:#71717A;padding:0 14px 8px}
@media print{#fdChatBtn,#fdChat{display:none!important}}`;document.head.appendChild(st);}

/* --- DOM --- */
const CHAT_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="#fff"/></svg>';
function chatEnsure(){if(document.getElementById('fdChatBtn'))return;
  const b=document.createElement('button');b.id='fdChatBtn';b.type='button';b.setAttribute('aria-label','Ouvrir l\'assistant Claude');b.title='Assistant Claude';b.innerHTML=CHAT_ICON+'<span class="dot"></span>';
  b.onclick=()=>chatToggle();document.body.appendChild(b);
  const p=document.createElement('div');p.id='fdChat';p.setAttribute('role','dialog');p.setAttribute('aria-label','Assistant Claude');
  p.innerHTML=`<header><span style="display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#F7B955,#D97757 70%)">${CHAT_ICON.replace('<svg','<svg width="15" height="15"')}</span><div><b>Assistant Claude</b><div class="meta">Vos chiffres, vos questions, vos ordres</div></div>
    <button type="button" data-chat="clear" title="Effacer la conversation" aria-label="Effacer la conversation">⌫</button><button type="button" data-chat="close" aria-label="Fermer">×</button></header>
    <div id="fdChatLog" aria-live="polite"></div><div class="fdhint" id="fdChatHint"></div>
    <form id="fdChatForm"><textarea id="fdChatIn" placeholder="Ex. : quelle est la dette nette de LVMH ? · mets le WACC d'Apple à 8,5 % · ouvre Commodities" aria-label="Votre message"></textarea><button type="submit" id="fdChatGo">Envoyer</button></form>`;
  document.body.appendChild(p);
  p.addEventListener('click',e=>{const t=e.target.closest('[data-chat]');if(!t)return;const a=t.dataset.chat;
    if(a==='close')chatToggle(false);else if(a==='clear'){chatSave([]);chatRender();}
    else if(a==='act'){const m=chatLoad()[+t.dataset.m],act=m&&m.actions&&m.actions[+t.dataset.i];if(act){const r=chatApply(act);t.disabled=true;t.textContent=(r===true?'✓ ':'✗ ')+t.textContent;if(r!==true)toast(r);}}});
  const f=p.querySelector('#fdChatForm'),inp=p.querySelector('#fdChatIn');
  f.onsubmit=e=>{e.preventDefault();chatSend(inp.value);inp.value='';};
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();f.requestSubmit();}});}
function chatToggle(v){chatEnsure();CHAT_OPEN=v===undefined?!CHAT_OPEN:v;document.getElementById('fdChat').classList.toggle('on',CHAT_OPEN);
  document.getElementById('fdChatBtn').classList.remove('new');if(CHAT_OPEN){chatRender();setTimeout(()=>{const i=document.getElementById('fdChatIn');if(i)i.focus();},50);}}
const chatMd=t=>esc(String(t||'')).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
function chatRender(){const L=document.getElementById('fdChatLog');if(!L)return;const M=chatLoad(),P=chatPend();
  L.innerHTML=(M.length?'':`<div class="fdm a">Bonjour${typeof prenom==='function'&&prenom()?' '+esc(prenom()):''} ! Posez-moi une question sur vos chiffres ou sur les marchés, ou donnez-moi un ordre (« mets tout à jour », « ouvre le dossier LBO », « mets le WACC d'Apple à 8,5 % »). C'est Claude qui répond.</div>`)+
  M.map((m,i)=>`<div class="fdm ${m.r==='u'?'u':'a'}${m.err?' err':''}">${chatMd(m.t)}${(m.src||[]).length?`<div class="src">Sources : ${m.src.slice(0,4).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc((s.url||'').replace(/^https?:\/\/(www\.)?/,'').split('/')[0])}</a>`).join(' · ')}</div>`:''}${(m.actions||[]).length?`<div class="acts">${m.actions.map((a,j)=>`<button type="button" data-chat="act" data-m="${i}" data-i="${j}"${(m.done||[]).includes(j)?' disabled':''}>Appliquer : ${esc(chatActLabel(a))}</button>`).join('')}</div>`:''}</div>`).join('')+
  (P.length?`<div class="fdm a wait">Claude réfléchit… (réveil et lecture de vos données, 20 à 60 s)</div>`:'');
  L.scrollTop=L.scrollHeight;const h=document.getElementById('fdChatHint');
  if(h)h.textContent=!setSess()?'Connectez-vous pour utiliser l\'assistant.':!jobsOn()?'Créez une clé dans Paramètres › Connecteur Claude pour activer l\'assistant.':'';
  const go=document.getElementById('fdChatGo');if(go)go.disabled=!!P.length;
  const b=document.getElementById('fdChatBtn');if(b)b.classList.toggle('busy',!!P.length);}
function chatActLabel(a){if(!a)return'';if(a.label)return String(a.label).slice(0,80);
  if(a.type==='tab')return'ouvrir '+(CHAT_TABS[a.id]||a.id);if(a.type==='update')return'tout mettre à jour';if(a.type==='recalc')return'recalculer';
  if(a.type==='set')return a.path+' = '+a.value;return a.type;}

/* --- contexte : champs modifiables (chemin = valeur actuelle) --- */
function chatFields(){const out=[],prim=(o,pre,max)=>{let n=0;if(!o||typeof o!=='object')return;for(const[k,v]of Object.entries(o)){if(n>=max)break;
    if(['number','string','boolean'].includes(typeof v)&&String(v).length<60){out.push(`${pre}.${k}=${JSON.stringify(v)}`);n++;}}};
  try{prim(S.bp,'bp',30);}catch(e){}
  try{const k=ui.tk;if(S.an.assets[k])prim(S.an.assets[k],'an.assets.'+k,30);Object.keys(S.an.assets).forEach(x=>{if(x!==k)['wacc','g','price'].forEach(f=>{const v=S.an.assets[x][f];if(typeof v==='number')out.push(`an.assets.${x}.${f}=${v}`);});});}catch(e){}
  try{const L=S.lbo&&S.lbo.list||[],i=L.findIndex(d=>d.id===S.lbo.cur);if(i>=0)prim(L[i].p,'lbo.list.'+i+'.p',25);}catch(e){}
  try{prim(S.cm&&S.cm.p,'cm.p',12);}catch(e){}
  try{prim(S.pf,'pf',10);}catch(e){}
  let s='';for(const l of out){if((s+l).length>2100)break;s+=l+'\n';}return s;}
function chatInstr(q){const tab=CHAT_TABS[ui.tab]||ui.tab,a=S.an&&S.an.assets&&S.an.assets[ui.tk];
  return(`ASSISTANT FOMO.DESK — question de l'utilisateur : « ${String(q).slice(0,900)} »
Contexte : volet affiché « ${tab} »${a?` ; titre affiché ${a.t||ui.tk} (${a.n||''}, clé ${ui.tk})`:''} ; date ${new Date().toISOString().slice(0,16)} UTC.
Pour les chiffres de l'utilisateur, lis d'abord fomo_desk (section "all"). ${(typeof I18N_LANG==='function'&&I18N_LANG()==='en')?'Réponds EN ANGLAIS (l\'utilisateur a choisi l\'anglais), clairement et brièvement.':'Réponds en français, clairement et brièvement.'} Tout chiffre externe : cite sa source (url + extrait) dans "sources". Question générale : réponds normalement.
Ordre de modification : propose des actions dans "actions", parmi {"type":"set","path":"...","value":...,"label":"..."} (path EXACTEMENT parmi les champs ci-dessous, valeur du même type ; un pourcentage s'écrit comme la valeur actuelle), {"type":"tab","id":"bp|an|sc|lbo|pf|cm|pc|jr"}, {"type":"update"} (tout mettre à jour), {"type":"recalc"}. L'utilisateur validera chaque action. N'invente pas de chemin.
Champs modifiables (chemin=valeur actuelle) :
${chatFields()}`).slice(0,3990);}

/* --- envoi --- */
async function chatSend(q){q=String(q||'').trim();if(!q)return;chatEnsure();const M=chatLoad();M.push({r:'u',t:q,at:Date.now()});chatSave(M);
  if(!setSess()){M.push({r:'a',t:'Connectez-vous à votre compte pour que Claude puisse répondre.',err:1});chatSave(M);return chatRender();}
  if(!jobsOn()){M.push({r:'a',t:'L\'assistant passe par votre connecteur Claude : créez d\'abord une clé dans Paramètres › Connecteur Claude.',err:1});chatSave(M);return chatRender();}
  chatRender();
  try{await liveApi('/api/v1/desk',{method:'POST',body:{state:deskSnap()}});}catch(e){}
  let r;try{r=await liveApi('/api/v1/jobs',{method:'POST',body:{module:'chat',subject:'chat-'+Date.now().toString(36),instructions:chatInstr(q),
      schema:'{"answer":"réponse en français","actions":[{"type":"set|tab|update|recalc","path":"","value":null,"id":"","label":""}],"sources":[{"url":"","quote":""}]}'}});}
  catch(e){M.push({r:'a',t:'Envoi impossible : '+e.message,err:1});chatSave(M);return chatRender();}
  chatPendSet([...chatPend(),{id:r.id,at:Date.now()}]);chatRender();
  try{await jobWake();}catch(e){}
  chatPoll();}

/* --- réception --- */
async function chatPoll(){clearTimeout(CHAT_TIMER);let P=chatPend();if(!P.length||!setSess())return;
  try{const[d,er]=await Promise.all([liveApi('/api/v1/jobs?status=done'),liveApi('/api/v1/jobs?status=error')]);
    const ids=new Set(P.map(p=>p.id)),got=[...(d.jobs||[]),...(er.jobs||[])].filter(j=>ids.has(j.id));
    if(got.length){const M=chatLoad();
      for(const j of got){const res=j.result&&typeof j.result==='object'?j.result:null;
        if(res)M.push({r:'a',t:res.answer||'(réponse vide)',actions:Array.isArray(res.actions)?res.actions.filter(a=>a&&a.type).slice(0,6):[],src:Array.isArray(res.sources)?res.sources.filter(s=>s&&/^https?:/.test(s.url||'')):[]});
        else M.push({r:'a',t:'Claude n\'a pas pu répondre : '+(j.error||'erreur inconnue'),err:1});}
      chatSave(M);P=P.filter(p=>!got.some(j=>j.id===p.id));chatPendSet(P);
      try{await liveApi('/api/v1/jobs',{method:'POST',body:{action:'ack',ids:got.map(j=>j.id)}});}catch(e){}
      if(!CHAT_OPEN){const b=document.getElementById('fdChatBtn');if(b)b.classList.add('new');toast('L\'assistant Claude a répondu');}}
    P=P.filter(p=>Date.now()-p.at<20*60e3);chatPendSet(P);}catch(e){}
  chatRender();if(chatPend().length)CHAT_TIMER=setTimeout(chatPoll,4000);}

/* --- actions (toujours validées par un clic) --- */
const CHAT_PATH=/^(bp|cm\.p|pf|an\.assets\.[A-Za-z0-9_.\-]+?|lbo\.list\.\d+\.p)\.([A-Za-z0-9_]+)$/;
function chatApply(a){try{
  if(a.type==='tab'){if(!CHAT_TABS[a.id])return'Volet inconnu : '+a.id;ui.tab=a.id;save();renderAll();return true;}
  if(a.type==='update'){const b=document.querySelector('[data-act="afall"]');if(b)b.click();else if(typeof afRun==='function')afRun(true);return true;}
  if(a.type==='recalc'){recalc();return true;}
  if(a.type==='set'){const p=String(a.path||'');if(!CHAT_PATH.test(p))return'Chemin non autorisé : '+p;
    const parts=p.split('.'),key=parts.pop();let o=S;
    if(parts[0]==='an'&&parts[1]==='assets'){o=S.an.assets[parts.slice(2).join('.')];}else for(const k of parts){o=o&&o[k];}
    if(!o||typeof o!=='object'||!(key in o))return'Champ introuvable : '+p;
    const cur=o[key];let v=a.value;if(typeof cur==='number'){v=+String(v).replace(',','.');if(!isFinite(v))return'Valeur non numérique pour '+p;}
    else if(typeof cur==='boolean')v=v===true||v==='true';else if(typeof cur==='string')v=String(v);else return'Type non modifiable : '+p;
    o[key]=v;save();recalc('Assistant : '+p+' = '+v);return true;}
  return'Action inconnue : '+a.type;}catch(e){return'Action impossible : '+e.message;}}

/* --- affichage : bulle visible une fois connecté --- */
function chatSync(){const on=typeof setSess==='function'&&setSess();chatEnsure();const b=document.getElementById('fdChatBtn');if(b)b.style.display=on?'grid':'none';if(!on&&CHAT_OPEN)chatToggle(false);}
{const _r=renderAll;renderAll=function(){const r=_r.apply(this,arguments);try{chatSync();}catch(e){}return r;};}
setTimeout(()=>{chatSync();if(chatPend().length)chatPoll();},1500);
