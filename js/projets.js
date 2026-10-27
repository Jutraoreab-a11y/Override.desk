/* ============ Dossiers projets et versions (Business plan, Analyse financière) ============ */
const today=()=>new Date().toISOString().slice(0,10);
const fdate=d=>d?new Date(d.length<=10?d+'T00:00:00':d).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function prjSnap(mod){return mod==='bp'?clone(S.bp):{tk:ui.tk,asset:clone(S.an.assets[ui.tk]),crit:clone(S.an.crit)};}
function prjApply(mod,data){if(mod==='bp'){S.bp=clone(data);}else{S.an.assets[data.tk]=clone(data.asset);S.an.crit=clone(data.crit);ui.tk=data.tk;}}
function prjInit(){
  if(!S.prj)S.prj={bp:[],an:[]};
  if(!S.prj.bp.length){const v={id:uid('v'),label:'Version A',date:new Date().toISOString(),note:'Scénario de référence',data:clone(S.bp)};
    S.prj.bp.push({id:uid('p'),name:S.bp.name||'Projet',folder:'Industrie',created:today(),versions:[v],cur:v.id});}
  if(!S.prj.an.length){const tk=S.an.assets[ui.tk]?ui.tk:Object.keys(S.an.assets)[0];
    const v={id:uid('v'),label:'Analyse '+(S.an.assets[tk].t||tk),date:new Date().toISOString(),note:'Première analyse',data:{tk,asset:clone(S.an.assets[tk]),crit:clone(S.an.crit)}};
    S.prj.an.push({id:uid('p'),name:'Analyses '+new Date().getFullYear(),folder:'Titres cotés',created:today(),versions:[v],cur:v.id});}
  ['bp','an'].forEach(m=>{S.prj[m].forEach(p=>p.versions.forEach(x=>{if(!x.dd)x.dd=x.date.slice(0,10);}));const k='prj_'+m;if(!S.prj[m].find(p=>p.id===ui[k]))ui[k]=S.prj[m][0].id;});
}
function prjCur(mod){return S.prj[mod].find(p=>p.id===ui['prj_'+mod])||S.prj[mod][0];}
function verCur(mod){const p=prjCur(mod);return p.versions.find(v=>v.id===p.cur)||p.versions[p.versions.length-1];}
function prjDirty(mod){const v=verCur(mod);if(!v)return true;const s=prjSnap(mod);return mod==='bp'?JSON.stringify(s)!==JSON.stringify(v.data):JSON.stringify(s.asset)!==JSON.stringify(v.data.asset)||s.tk!==v.data.tk||JSON.stringify(s.crit)!==JSON.stringify(v.data.crit);}
function sameTk(mod){if(mod==='bp')return true;const v=verCur(mod);return v&&v.data.tk===ui.tk;}
function nextLabel(p,mod){if(mod==='an')return'Analyse '+(S.an.assets[ui.tk].t||ui.tk);const L='ABCDEFGHIJKLMNOPQRSTUVWXYZ',used=p.versions.map(v=>v.label);for(const c of L)if(!used.includes('Version '+c))return'Version '+c;return'Version '+(p.versions.length+1);}
/* Résumé chiffré d'une version (sans toucher à l'état courant) */
function verSummary(mod,v){
  const keep=mod==='bp'?S.bp:{a:S.an.assets[v.data.tk],c:S.an.crit};
  try{
    if(mod==='bp'){S.bp=v.data;const r=bpCalc(),AL=bpAlerts(r),ko=AL.filter(a=>a.l==='ko').length,Hy=r.Y[r.H-1];
      return{rows:[['CA année 1',big(r.Y[0].rev)],['CA année '+r.H,big(Hy.rev)],['EBITDA année '+r.H,big(Hy.ebitda)],['Marge EBITDA A'+r.H,pct(Hy.em,0)],['Point mort EBITDA',r.be?'Année '+r.be.t:'Non atteint'],['Point bas de trésorerie',big(r.min.cash)],['Financements mobilisés',big(r.funding)],['LTV / CAC',nf(r.ratio,1)+'×'],['Prix moyen mensuel',nf(+v.data.arpu,0)+' €'],['Clients année 1',nf(+v.data.clients1,0)],['Statut',ko?'Non viable en l\'état':AL.length?'Cohérent sous réserves':'Cohérent']]};}
    S.an.assets[v.data.tk]=v.data.asset;S.an.crit=v.data.crit;const r=anCalc(v.data.tk),a=v.data.asset;
    return{rows:[['Titre',esc(a.t)+' · '+esc(a.n)],['Cours retenu',nf(+a.price,2)+' '+esc(a.cur)],['Date du cours',esc(a.pxDate||'—')],['Valeur de référence',nf(r.ref,2)],['Potentiel',isFinite(r.up)?sgn(r.up*100,0):'—'],['Prix d\'achat cible',nf(r.buy,2)],['Stop-loss',nf(r.sl,2)],['Take-profit',nf(r.tp,2)],['Décision',r.positive?'POSITIVE':'NÉGATIVE']]};
  }catch(e){return{rows:[['Calcul',"impossible sur cette version"]]};}
  finally{if(mod==='bp')S.bp=keep;else{S.an.assets[v.data.tk]=keep.a;S.an.crit=keep.c;}}
}
function prjBar(mod){
  prjInit();const P=S.prj[mod],p=prjCur(mod),v=verCur(mod),dirty=prjDirty(mod),open=ui['prjOpen_'+mod],pi=P.indexOf(p);
  const folders=[...new Set(P.map(x=>x.folder||'Sans dossier'))].sort((a,b)=>a.localeCompare(b,'fr'));
  const sel=`<select class="f" style="width:auto;max-width:240px" data-prj="${mod}" aria-label="Projet">${folders.map(f=>`<optgroup label="${esc(f)}">${P.filter(x=>(x.folder||'Sans dossier')===f).map(x=>`<option value="${x.id}"${x.id===p.id?' selected':''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  const vsel=`<select class="f" style="width:auto;max-width:260px" data-ver="${mod}" aria-label="Version">${p.versions.map(x=>`<option value="${x.id}"${x.id===(v&&v.id)?' selected':''}>${esc(x.label)} · ${fdate(x.dd||x.date.slice(0,10))}</option>`).join('')}</select>`;
  let body='';
  if(open){
    const cmp=p.versions.map(x=>({x,s:verSummary(mod,x)}));
    body=`<div class="grid" style="margin-top:10px">
      <div class="s5" style="min-width:0"><h3 class="h3" style="margin-top:0">Projet</h3><div class="fields">${LF('Nom du projet',`prj.${mod}.${pi}.name`,'t')}${LF('Dossier',`prj.${mod}.${pi}.folder`,'t',{ph:'ex. Industrie, Luxe'})}</div>
        <p class="note">Créé le ${fdate(p.created)} · ${p.versions.length} version${p.versions.length>1?'s':''}</p>
        <div class="row"><button class="btn sm" data-act="prjdup" data-id="${mod}">Dupliquer le projet</button><button class="btn sm" data-act="prjdel" data-id="${mod}"${P.length<2?' disabled':''}>Supprimer le projet</button></div></div>
      <div class="s7" style="min-width:0"><h3 class="h3" style="margin-top:0">Versions</h3><div class="tw"><table class="tbl"><thead><tr><th>Nom de la version</th><th>Date</th><th>Note</th><th></th></tr></thead><tbody>
        ${p.versions.map((x,i)=>`<tr${x.id===v.id?' class="on"':''}><td>${lin(`prj.${mod}.${pi}.versions.${i}.label`,'t',{al:'Nom de la version'})}</td><td style="width:150px">${lin(`prj.${mod}.${pi}.versions.${i}.dd`,'d',{al:'Date de la version'})}</td><td>${lin(`prj.${mod}.${pi}.versions.${i}.note`,'t',{al:'Note'})}</td><td style="white-space:nowrap"><button class="btn sm" data-act="verload" data-id="${mod}" data-v="${x.id}">Ouvrir</button> <button class="btn sm" data-act="verdel" data-id="${mod}" data-v="${x.id}"${p.versions.length<2?' disabled':''}>Supprimer</button></td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="s12" style="min-width:0"><h3 class="h3">Comparaison des versions</h3><div class="tw"><table class="tbl fin"><thead><tr><th>Indicateur</th>${cmp.map(c=>`<th class="n">${esc(c.x.label)}<br><span class="meta">${fdate(c.x.dd||c.x.date.slice(0,10))}</span></th>`).join('')}</tr></thead><tbody>
        ${(cmp[0]?cmp[0].s.rows:[]).map((r,ri)=>`<tr><td>${r[0]}</td>${cmp.map(c=>`<td class="n">${(c.s.rows[ri]||['',''])[1]}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div><p class="note">Chaque colonne est recalculée à partir de la version enregistrée${dirty?" ; les modifications en cours ne sont pas encore dans la version ouverte":''}.</p></div>
    </div>`;
  }
  return`<div class="card s12 prj noprint"><div class="prj-h">
    <span class="prj-l">${ic('fold')}<b>Dossier projet</b></span>${sel}<span class="prj-l">Version</span>${vsel}
    ${!sameTk(mod)?`<span class="tag am">${esc((S.an.assets[ui.tk]||{}).t||ui.tk)} : analyse non enregistrée dans ce projet</span>`:dirty?'<span class="tag am">Modifications non enregistrées</span>':'<span class="tag ok">Enregistré</span>'}
    <span class="row" style="margin-left:auto">
      <button class="btn sm${dirty?' pri':''}" data-act="versave" data-id="${mod}">Enregistrer</button>
      <button class="btn sm" data-act="vernew" data-id="${mod}">Nouvelle version</button>
      ${dirty&&sameTk(mod)?`<button class="btn sm" data-act="verrevert" data-id="${mod}">Annuler les modifications</button>`:''}
      <button class="btn sm" data-act="prjnew" data-id="${mod}">Nouveau projet</button>
      <button class="btn sm" data-act="prjopen" data-id="${mod}" aria-expanded="${!!open}">${open?'Fermer':'Gérer et comparer'}</button>
    </span></div>${body}</div>`;
}
function prjAct(act,mod,b){
  const p=prjCur(mod),v=verCur(mod);
  switch(act){
    case 'versave':if(!sameTk(mod)){prjAct('vernew',mod,b);return;}v.data=prjSnap(mod);v.date=new Date().toISOString();v.dd=v.date.slice(0,10);if(mod==='bp')p.name=p.name||S.bp.name;toast('Version « '+v.label+' » enregistrée');break;
    case 'vernew':{const n={id:uid('v'),label:nextLabel(p,mod),date:new Date().toISOString(),note:'',data:prjSnap(mod)};n.dd=n.date.slice(0,10);
      if(prjDirty(mod)===false&&mod==='bp')n.note='Copie de '+v.label;p.versions.push(n);p.cur=n.id;toast('Nouvelle version créée : '+n.label);break;}
    case 'verrevert':prjApply(mod,v.data);toast('Version « '+v.label+' » rechargée');break;
    case 'verload':{if(prjDirty(mod)&&sameTk(mod))v.data=prjSnap(mod);const n=p.versions.find(x=>x.id===b.dataset.v);if(n){p.cur=n.id;prjApply(mod,n.data);toast('Version ouverte : '+n.label);}break;}
    case 'verdel':{if(p.versions.length<2)break;const i=p.versions.findIndex(x=>x.id===b.dataset.v);const was=p.versions[i];p.versions.splice(i,1);if(was.id===p.cur){p.cur=p.versions[p.versions.length-1].id;prjApply(mod,verCur(mod).data);}toast('Version supprimée');break;}
    case 'prjnew':{if(prjDirty(mod)&&sameTk(mod))v.data=prjSnap(mod);
      const data=mod==='bp'?Object.assign(clone(DEF.bp),{name:'Nouveau projet'}):prjSnap('an');
      const n={id:uid('v'),label:mod==='bp'?'Version A':nextLabel(p,mod),date:new Date().toISOString(),note:'',data};
      const np={id:uid('p'),name:mod==='bp'?'Nouveau projet':'Nouvelles analyses',folder:p.folder||'',created:today(),versions:[n],cur:n.id};
      S.prj[mod].push(np);ui['prj_'+mod]=np.id;ui['prjOpen_'+mod]=true;prjApply(mod,data);toast('Projet créé : renseignez son nom et son dossier');break;}
    case 'prjdup':{if(prjDirty(mod)&&sameTk(mod))v.data=prjSnap(mod);const np=clone(p);np.id=uid('p');np.name=p.name+' (copie)';np.created=today();np.versions.forEach(x=>x.id=uid('v'));np.cur=np.versions[np.versions.length-1].id;S.prj[mod].push(np);ui['prj_'+mod]=np.id;toast('Projet dupliqué');break;}
    case 'prjdel':{if(S.prj[mod].length<2)break;S.prj[mod]=S.prj[mod].filter(x=>x.id!==p.id);ui['prj_'+mod]=S.prj[mod][0].id;prjApply(mod,verCur(mod).data);toast('Projet supprimé');break;}
    case 'prjopen':ui['prjOpen_'+mod]=!ui['prjOpen_'+mod];break;
  }
  renderAll();save();
}
function prjSwitch(mod,id,isVer){
  const p=prjCur(mod),v=verCur(mod);if(prjDirty(mod)&&sameTk(mod))v.data=prjSnap(mod);
  if(isVer){p.cur=id;}else{ui['prj_'+mod]=id;}
  prjApply(mod,verCur(mod).data);renderAll();save();
}
