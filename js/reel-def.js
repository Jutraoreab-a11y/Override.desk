/* ============ v8.20 : lancement réel : aucune donnée fictive par défaut ============
   Chargé avant core.js. Retire du modèle par défaut :
   - le business plan de démonstration (société et équipe inventées) : le business plan démarre vierge ;
   - les dossiers fictifs du Sélecteur ;
   - le portefeuille d'exemple (quantités et prix de revient inventés).
   Restent : les données de marché réelles et sourcées (sociétés cotées, BCE, EIA, macro) et les paramètres légaux ou de calcul
   (horizon, taux d'IS, durée d'amortissement). */
const REEL_DEMO={bp:'Atelier Nova',sc:DEF.sc.list.map(c=>c.id),pf:DEF.pf.positions.map(p=>[p.tk,p.q,p.pru,p.d].join('|'))};
(()=>{
  const blank=v=>{if(v===null||v===undefined)return v;if(typeof v==='string')return'';if(typeof v==='boolean')return v;
    if(typeof v==='number')return 0;if(Array.isArray(v))return v.length&&typeof v[0]==='number'?v.map(()=>0):[];
    const o={};for(const k of Object.keys(v))o[k]=blank(v[k]);return o;};
  const keep={sector:DEF.bp.sector,zone:DEF.bp.zone,h:DEF.bp.h,startY:new Date().getFullYear()+1,tax:DEF.bp.tax,amortY:DEF.bp.amortY,
    scope:DEF.bp.scope,mkt:{seasApply:false,base:DEF.bp.mkt.base,cities:[],targets:null},fiche:{stade:'idee',bmType:DEF.bp.fiche.bmType,revType:DEF.bp.fiche.revType,forme:'SAS'}};
  const B=blank(DEF.bp);
  Object.assign(B,{sector:keep.sector,zone:keep.zone,h:keep.h,startY:keep.startY,tax:keep.tax,amortY:keep.amortY,scope:keep.scope,frng:null,name:''});
  /* Paramètres de méthode ou légaux conservés : TVA, décote d'illiquidité, taux d'actualisation capital-risque, dilution future, scénarios. */
  ['vat','vatExp','privDisc','dcfRate','futDil','scen','tamLv','samLv','somLv'].forEach(k=>{if(DEF.bp[k]!==undefined)B[k]=JSON.parse(JSON.stringify(DEF.bp[k]));});
  Object.assign(B.mkt,keep.mkt);Object.assign(B.fiche,keep.fiche);
  for(const k of Object.keys(DEF.bp))delete DEF.bp[k];Object.assign(DEF.bp,B);
  DEF.sc.list=[];
  DEF.pf.positions=[];
})();
/* Données d'exemple déjà enregistrées dans ce navigateur (versions précédentes) : retirées au chargement. */
function reelPurge(){if(typeof S!=='object')return false;let ch=false;
  if(S.bp&&S.bp.name===REEL_DEMO.bp){S.bp=clone(DEF.bp);ch=true;}
  if(S.prj&&S.prj.bp){const n=S.prj.bp.length;S.prj.bp=S.prj.bp.filter(p=>p.name!==REEL_DEMO.bp);if(S.prj.bp.length!==n)ch=true;}
  if(S.pf&&S.pf.positions){const n=S.pf.positions.length;S.pf.positions=S.pf.positions.filter(p=>!REEL_DEMO.pf.includes([p.tk,p.q,p.pru,p.d].join('|')));if(S.pf.positions.length!==n){ch=true;S.nav={};}}
  if(S.sc&&S.sc.list){const n=S.sc.list.length;S.sc.list=S.sc.list.filter(c=>!REEL_DEMO.sc.includes(c.id));if(S.sc.list.length!==n)ch=true;}
  return ch;}
