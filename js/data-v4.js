/* ============ Version 4.0 : paramètres des nouveaux volets ============ */
/* Business model explicite (fiche de renseignements) */
const BM_TYPES={saas:'Éditeur de logiciel SaaS',cyber:'Cybersécurité (logiciel ou services managés)',maint:'Maintenance sous contrat récurrent',depan:"Dépannage et intervention à l'acte",conseil:'Conseil et prestation intellectuelle',integ:'Intégration et services informatiques',negoce:'Négoce et distribution',ecom:'E-commerce',market:'Place de marché',indus:'Industrie et fabrication',sante:'Santé et medtech',energie:'Énergie et infrastructures',immo:'Immobilier',retail:'Commerce de détail et restauration',formation:'Formation',autre:'Autre (à préciser dans « Ce que l\'on vend »)'};
const REV_TYPES={abo:'Abonnement récurrent (mensuel ou annuel)',licence:'Licence et maintenance annuelle',acte:"Facturation à l'acte ou à l'intervention",forfait:'Forfait par projet',regie:'Régie (temps passé)',commission:'Commission sur transaction',vente:'Vente de produits avec marge',pub:'Publicité',mixte:'Modèle mixte'};
const STAGES={idee:'Idée, aucun client',proto:'Prototype en test',pilote:'Pilotes ou premiers clients payants',traction:'Traction commerciale (CA récurrent)',crois:'Croissance, recherche de scale'};
/* Spécifications de contrat MT5 les plus répandues. Elles varient selon le courtier :
   vérifier dans MT5, clic droit sur le symbole puis « Spécification ».
   Levier particulier maximal : ESMA, mesures d'intervention sur les CFD (2018), reprises par l'AMF. */
const PC_SPECS={
  XAUUSD:{l:'Or (XAU/USD)',cs:100,u:'onces',q:'USD',dig:2,lev:20,ref:'gold'},
  XAGUSD:{l:'Argent (XAG/USD)',cs:5000,u:'onces',q:'USD',dig:3,lev:10,ref:'silver'},
  UKOIL:{l:'Brent (UKOIL / XBRUSD)',cs:1000,u:'barils',q:'USD',dig:2,lev:10,ref:'brent'},
  USOIL:{l:'WTI (USOIL / XTIUSD)',cs:1000,u:'barils',q:'USD',dig:2,lev:10,ref:'wti'},
  EURUSD:{l:'EUR/USD',cs:100000,u:'euros',q:'USD',dig:5,lev:30},
  GBPUSD:{l:'GBP/USD',cs:100000,u:'livres',q:'USD',dig:5,lev:30},
  US500:{l:'S&P 500 (US500)',cs:1,u:'indice × 1 USD',q:'USD',dig:2,lev:20},
  NAS100:{l:'Nasdaq 100 (NAS100)',cs:1,u:'indice × 1 USD',q:'USD',dig:2,lev:20},
  GER40:{l:'DAX (GER40)',cs:1,u:'indice × 1 EUR',q:'EUR',dig:2,lev:20}
};
const PC_SRC="Leviers : ESMA, décision (UE) 2018/796 sur les CFD, reprise par l'AMF (30:1 paires majeures, 20:1 or et indices majeurs, 10:1 autres matières premières). Tailles de contrat : standard MT5 le plus courant, à vérifier chez votre courtier.";
const JR_SESS=[['pre','Analyse du jour'],['asie','Asie'],['londres','Londres'],['ny','New York']];
const JR_SETUPS=['Cassure','Retournement','Pullback','Range','Fondamental','News','Autre'];
const JR_EMO=['Calme','Confiant','Impatient','Peur','Frustré','Euphorique'];

Object.assign(DEF.bp,{
  scope:'K:France',
  fiche:{porteur:'Claire M.',forme:'SAS',ville:'Lyon',created:'2027-01',stade:'pilote',bmType:'saas',revType:'abo',
    forWho:"Les ETI industrielles françaises de 1 à 10 sites (agroalimentaire, chimie, plasturgie) : l'acheteur est le responsable maintenance, le décideur le directeur d'usine.",
    besoin:"Levée d'amorçage de 1,2 M€ pour industrialiser le produit et ouvrir trois régions."}
});
DEF.bp.mkt.base='K:France';
DEF.prj={bp:[],an:[]};
DEF.pc={sym:'XAUUSD',side:'Achat',cap:10000,risk:0.5,ccy:'EUR',entry:null,sl:null,tp:null,step:0.01,cs:{},lev:{},
  plan:{acct:10000,rpt:0.5,tot:5,day:2,maxT:5},mc:{wr:45,rr:2,n:100,sims:1000}};
DEF.jr={trades:[],days:{}};
DEF.mt5={linked:false,login:'',server:'',broker:'',type:'Réel',ccy:'EUR',mode:'import',token:'',acctId:'',region:'new-york',lastSync:null,file:'',info:null,deposits:0,withdrawals:0};
DEF.sc.per={mode:'all',m:'2026-10',y:'2026',from:'2026-01-01',to:'2026-10-27'};
/* Date d'entrée de chaque dossier du Sélecteur (dossiers de démonstration) */
(()=>{const D=['2026-10-14','2026-09-22','2026-07-08','2026-05-19','2026-03-03','2026-01-27','2025-11-12','2025-09-30','2025-06-16','2025-03-11'];let i=0;
  DEF.sc.list.forEach(c=>{if(!c.dt)c.dt=c.lead?'':D[(i++)%D.length];});})();
DEF.bp.mkt.cities=[];
