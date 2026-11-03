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

/* ============ v4.1 : business plan en 3 parties et étude de marché approfondie ============ */
Object.assign(DEF.bp,{
  sectorQ:{
    regl:"Logiciel non réglementé en soi, mais déployé sur des sites industriels : directive NIS2 (cybersécurité des entités essentielles et importantes, transposée en droit français), RGPD si des données de personnes sont traitées, exigences contractuelles de cybersécurité des clients (segmentation des réseaux machines, IEC 62443).",
    fisc:"Éligibilité à vérifier au crédit d'impôt recherche (CIR) et au crédit d'impôt innovation (CII) sur les dépenses de R&D ; statut de jeune entreprise innovante (JEI) possible pendant les premières années ; TVA à 20 % sur les abonnements.",
    sante:"Marché en croissance à deux chiffres sur 5 ans (voir historique) porté par le coût des arrêts non planifiés et la pénurie de techniciens. Perspectives : poursuite de la croissance tant que l'investissement industriel européen se maintient.",
    innov:"Modèles prédictifs entraînés sur données multi-signaux, capteurs sans fil à bas coût, edge computing sur site, intégration native aux GMAO, IA générative pour l'assistance au diagnostic.",
    seasTxt:"Marché saisonnier : décisions concentrées en septembre-décembre (budgets annuels), creux en juillet-août (fermetures estivales des usines)."
  },
  dem:{
    zone:"France métropolitaine, priorité aux trois premières régions industrielles (Auvergne-Rhône-Alpes, Hauts-de-France, Grand Est), à moins de 3 heures d'un site pilote.",
    habits:"Achats de maintenance sous contrat annuel, pièces en urgence, recours aux tableurs et à la GMAO ; décisions validées par le directeur d'usine puis le groupe.",
    revenus:"ETI de 50 à 1 500 M€ de chiffre d'affaires, 1 à 10 sites, budget maintenance annuel de 2 à 5 % de la valeur du parc machines.",
    age:"Acheteurs : responsables maintenance de 35 à 50 ans ; décideurs : directeurs d'usine de 45 à 60 ans.",
    besoins:"Réduire les arrêts non planifiés, planifier les interventions, compenser le départ des techniciens expérimentés, prouver les économies d'énergie.",
    motiv:"Coût d'un arrêt de ligne (souvent plusieurs milliers d'euros par heure), pression du groupe sur la disponibilité, reporting énergétique obligatoire.",
    pref:"Déploiement rapide sans projet informatique lourd, abonnement plutôt qu'investissement, preuves chiffrées sur leurs propres machines avant signature.",
    percep:"Le leader est jugé fiable mais lent et cher ; les challengers produisent trop de fausses alertes ; les intégrateurs ERP sont perçus comme généralistes.",
    amelio:"Délai de mise en service, taux de fausses alertes, intégration aux GMAO existantes, accompagnement terrain des techniciens."
  },
  etude:{
    quanti:{src:"Historique de marché à sourcer (étude sectorielle ou fédération professionnelle), enquête prix auprès de 64 sites qualifiés.",n:64,txt:"Taille et croissance du marché, distribution des prix acceptables (Van Westendorp), part des sites déjà équipés."},
    quali:{n:14,profil:"Responsables maintenance et directeurs d'usine d'ETI agroalimentaires, chimiques et plasturgie",txt:"Les arrêts non planifiés sont le premier irritant ; la confiance passe par une preuve sur leurs propres données ; refus des projets supérieurs à 3 mois."},
    docs:[{t:"Rapport sectoriel maintenance prédictive (à acquérir)",src:"À préciser",date:""},{t:"Statistiques de l'industrie manufacturière",src:"INSEE",date:""},{t:"Textes NIS2 et transposition française",src:"ANSSI, Légifrance",date:""}],
    concl:"Le marché est en croissance, la demande est identifiée et validée par des pilotes payants, et le leader laisse un angle mort sur les ETI de moins de 10 sites. L'opportunité est confirmée sous réserve de sourcer l'historique de marché."
  },
  strat:{
    com:"Vente directe aux ETI des trois régions prioritaires, appuyée sur les sites pilotes comme références ; partenariats avec deux intégrateurs GMAO à partir de l'année 2.",
    appro:"Hébergement cloud européen (contrat annuel), connecteurs GMAO développés en interne, aucun capteur propriétaire : utilisation des données machines existantes ; capteurs tiers proposés via un partenaire si nécessaire.",
    moyens:"Équipe de 4 personnes au démarrage (direction, technique, commercial, data), bureaux à Lyon, postes et licences de développement ; recrutements selon le plan de l'année 2.",
    prod:"Déploiement en 4 semaines : connexion aux données (semaine 1), calibrage du modèle (semaines 2-3), formation des techniciens et mise en service (semaine 4) ; support à distance ensuite."
  },
  milestones:[{d:'2027-01',t:'Immatriculation de la société et ouverture du compte bancaire'},{d:'2027-03',t:'Signature des 3 pilotes en contrats annuels'},{d:'2027-06',t:'Encaissement de la levée d\'amorçage'},{d:'2027-09',t:'Ouverture commerciale des trois régions prioritaires'},{d:'2028-03',t:'Premier partenariat intégrateur GMAO'}],
  motiv:"Les fondateurs ont vécu de l'intérieur le coût des arrêts non planifiés et le départ des techniciens expérimentés ; ils veulent rendre la maintenance prédictive accessible aux ETI que les solutions actuelles délaissent.",
  capTable:[{n:'Claire M.',r:'Présidente, cofondatrice',ap:40000,pct:40},{n:'Hugo D.',r:'Cofondateur',ap:35000,pct:35},{n:'Samir K.',r:'Cofondateur',ap:25000,pct:25}],
  gouv:"SAS présidée par Claire M. ; décisions stratégiques en comité des associés ; pacte d'associés avec clauses de bonne et mauvaise sortie, préemption et inaliénabilité de 3 ans.",
  cmt:{cr:'',bilan:'',fin:'',treso:'',inv:'',bfr:'',seuil:''}
});
DEF.bp.comp.forEach(c=>Object.assign(c,{ca:null,eff:null,impl:'',prix:'',polcom:'',distrib:'',cible:''}));
Object.assign(DEF.bp.comp[0],{impl:'National, siège en Île-de-France',prix:'Projet de 9 mois, licence annuelle élevée',polcom:'Contrats-cadres pluriannuels avec les groupes',distrib:'Vente directe et intégrateurs certifiés',cible:'Grands groupes multi-sites'});
Object.assign(DEF.bp.comp[1],{impl:'National',prix:'Abonnement, remises agressives',polcom:'Marketing digital intensif, essais gratuits',distrib:'Vente directe en ligne',cible:'PME et ETI'});
Object.assign(DEF.bp.comp[2],{impl:'National et européen',prix:'Module inclus dans les projets ERP',polcom:'Vente via la DSI',distrib:'Réseau d\'intégrateurs',cible:'DSI des ETI et groupes'});

/* ============ v4.1 : dossier LBO ============ */
const LBO_SRC={euribor:{v:2.676,d:'30/10/2026',s:'euribor-rates.eu'},tax:{v:25,s:'Code général des impôts, taux normal de l\'impôt sur les sociétés'}};
DEF.lbo={list:[],cur:null};

/* v5 : seuils de mise en conditionnelle des matières premières (classeur TRADING_Dashboard) */
DEF.cm.p.th={sp:[0,3,6,10,15],bB:[0,1,3,6],bBr:[1.5,3.5,6],bS:[-0.15,0,0.08],bG:[-8,0,4]};
