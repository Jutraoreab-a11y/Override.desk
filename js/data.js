/* ============ Référentiels ============ */
const SECT={
  saas:{l:'Logiciel B2B / SaaS',tam:320e9,cagr:12.5,src:'Gartner, IDC : dépenses logicielles des entreprises',gm:75},
  fintech:{l:'Fintech & paiements',tam:340e9,cagr:16,src:'BCG Global Payments, rapports McKinsey',gm:55},
  health:{l:'Santé numérique',tam:290e9,cagr:15,src:'OMS, Grand View Research',gm:60},
  energy:{l:'Énergie & cleantech',tam:620e9,cagr:9,src:'AIE : World Energy Investment',gm:30},
  cyber:{l:'Cybersécurité',tam:200e9,cagr:11,src:'Gartner : Information Security Spending',gm:70},
  edtech:{l:'Éducation (EdTech)',tam:170e9,cagr:13,src:'HolonIQ, UNESCO',gm:60},
  agri:{l:'Agro & foodtech',tam:260e9,cagr:8,src:'FAO, AgFunder',gm:35},
  logi:{l:'Logistique & mobilité',tam:280e9,cagr:7,src:'Transport Intelligence, Eurostat',gm:30}
};
const ZONE={
  fr:{l:'France',s:.035,src:'INSEE, Banque de France'},
  eu:{l:'Union européenne',s:.21,src:'Eurostat, BCE'},
  na:{l:'Amérique du Nord',s:.38,src:'BEA, FMI World Economic Outlook'},
  ww:{l:'Monde',s:1,src:'FMI World Economic Outlook, Banque mondiale'}
};
const MONTHS=['Janv.','Févr.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'];
const FX_EURUSD=1.1219,FX_DATE='20/10/2026',FX_SRC='poundsterlinglive.com (clôture EUR/USD)';

/* Titres cotés : données publiées (MarketScreener, consultation du 21/10/2026). Montants en millions de la devise de reporting. */
const A=(o)=>Object.assign({roic:null,ovNote:''},o);
const MS='https://www.marketscreener.com/quote/stock/';
const UNIVERSE={
  AAPL:A({t:'AAPL',n:'Apple',sec:'Technologie',cur:'USD',rcur:'USD',fx:1,price:342.00,pxDate:'19/10/2026',fy:'septembre',shares:14840.39,epsE:8.82,
    y:['FY2021','FY2022','FY2023','FY2024','FY2025'],rev:[365817,394328,383285,391035,416161],ebitda:[120233,130541,125820,134661,144495],ni:[94680,99803,96995,93736,112010],eps:[5.61,6.11,6.13,6.08,7.46],fcf:[92953,111443,99584,108807,98767],nd:[-65797,-49040,-51011,-50021,-33763],roe:[147.44,175.46,171.95,157.41,171.42],
    g:7,tg:2.5,wacc:8.5,cat:6,catTxt:"Renouvellement du parc lié à l'IA embarquée ; croissance des services.",tamS:8,tamTxt:'Smartphones et services numériques : marchés matures mais très larges.',src:MS+'APPLE-INC-4849/finances/'}),
  MSFT:A({t:'MSFT',n:'Microsoft',sec:'Technologie',cur:'USD',rcur:'USD',fx:1,price:533.52,pxDate:'19/10/2026',fy:'juin',shares:7428.435,epsE:19.73,
    y:['FY2022','FY2023','FY2024','FY2025','FY2026'],rev:[198270,211915,245122,281724,331839],ebitda:[97843,103555,131720,162681,198685],ni:[72738,72361,88136,101832,133749],eps:[9.65,9.68,11.8,13.64,17.95],fcf:[65149,59475,74071,71611,66987],nd:[-54976,-64025,-30606,-51414,-36549],roe:[47.15,38.82,37.13,33.28,34.04],
    g:10,tg:3,wacc:8.5,cat:9,catTxt:"Adoption de l'IA générative et du cloud par les entreprises.",tamS:9,tamTxt:'Logiciel et cloud d’entreprise : marché large en croissance.',src:MS+'MICROSOFT-CORPORATION-4835/finances/'}),
  NVDA:A({t:'NVDA',n:'Nvidia',sec:'Technologie',cur:'USD',rcur:'USD',fx:1,price:217.09,pxDate:'19/10/2026',fy:'janvier',shares:24299,epsE:9.999,
    y:['FY2022','FY2023','FY2024','FY2025','FY2026'],rev:[26914,26974,60922,130497,215938],ebitda:[11215,5768,34480,83317,140143],ni:[9752,4368,29760,72880,120067],eps:[0.385,0.174,1.193,2.94,4.9],fcf:[8132,3808,27021,60853,96676],nd:[-10262,-2343,-16275,-43210,-54088],roe:[51.76,34.35,99.3,121.44,98.89],
    g:20,tg:3,wacc:10,cat:10,catTxt:'Investissements des hyperscalers dans les centres de données IA.',tamS:9,tamTxt:'Calcul accéléré et centres de données : marché en forte expansion.',src:MS+'NVIDIA-CORPORATION-57355629/finances/'}),
  INTC:A({t:'INTC',n:'Intel',sec:'Technologie',cur:'USD',rcur:'USD',fx:1,price:91.69,pxDate:'20/10/2026',fy:'décembre',shares:4770,epsE:-2.309,
    y:['FY2021','FY2022','FY2023','FY2024','FY2025'],rev:[74718,63054,54228,53101,52853],ebitda:[32505,19045,12514,11125,14622],ni:[19868,8014,1689,-18756,-267],eps:[4.86,1.94,0.4,-4.38,-0.06],fcf:[11258,-9411,-14279,-15656,-4949],nd:[9688,13713,24232,27949,9169],roe:[25.34,7.72,4.27,-0.55,1.81],
    g:5,tg:2,wacc:10,cat:7,catTxt:'Plans publics de relocalisation des semi-conducteurs ; activité de fonderie.',tamS:8,tamTxt:'Processeurs et fonderie : marché large mais concurrentiel.',src:'https://uk.marketscreener.com/quote/stock/INTEL-CORPORATION-4829/finances/'}),
  ASML:A({t:'ASML',n:'ASML Holding',sec:'Technologie',cur:'EUR',rcur:'EUR',fx:1,price:1455.40,pxDate:'20/10/2026',fy:'décembre',shares:386.196,epsE:null,
    y:['FY2021','FY2022','FY2023','FY2024','FY2025'],rev:[18611,21173,27558,28263,32667],ebitda:[7007,7084,9782,9941,12327],ni:[5883,5624,7839,7572,9393],eps:[14.34,14.13,19.89,19.24,24.71],fcf:[9945,7205,3288,9099,11085],nd:[-3515,-3862,-2379,-9064,-10613],roe:[49.01,59.35,70.42,47.43,49.32],
    g:12,tg:2.5,wacc:9,cat:8,catTxt:'Position unique sur la lithographie EUV ; hausse des capacités des fondeurs.',tamS:7,tamTxt:'Équipements de lithographie : niche très profitable.',src:'https://uk.marketscreener.com/quote/stock/ASML-HOLDING-N-V-36717939/finances/'}),
  SAP:A({t:'SAP',n:'SAP',sec:'Technologie',cur:'EUR',rcur:'EUR',fx:1,price:200.08,pxDate:'19/10/2026',fy:'décembre',shares:1164.6,epsE:7.019,
    y:['FY2021','FY2022','FY2023','FY2024','FY2025'],rev:[27842,30871,31207,34176,36800],ebitda:[10005,9929,10094,9433,11730],ni:[5383,1714,3564,3124,7492],eps:[4.46,1.96,3.05,2.65,6.28],fcf:[5010,4348,5530,4113,8239],nd:[3914,4509,-1792,-1695,-3381],roe:[24.3,11.52,14.03,11.93,15.89],
    g:10,tg:2.5,wacc:8.5,cat:7,catTxt:'Migration de la base installée vers le cloud.',tamS:7,tamTxt:'Progiciels de gestion : marché large, croissance modérée.',src:MS+'SAP-SE-436555/finances/'}),
  MC:A({t:'MC.PA',n:'LVMH',sec:'Consommation & luxe',cur:'EUR',rcur:'EUR',fx:1,price:386.75,pxDate:'20/10/2026',fy:'décembre',shares:495.126,epsE:22.3,
    y:['FY2021','FY2022','FY2023','FY2024','FY2025'],rev:[64215,79184,86153,84683,80807],ebitda:[22981,27281,29979,27367,25756],ni:[12036,14084,15174,12550,10878],eps:[23.89,28.03,30.33,25.12,21.85],fcf:[13531,10113,8104,10478,11333],nd:[9607,27847,30671,31143,27567],roe:[28.48,27.55,26.13,27.88,16.12],
    g:5,tg:2.5,wacc:8.5,cat:4,catTxt:'Demande de luxe en ralentissement depuis 2024 ; pas de catalyseur identifié à court terme.',tamS:7,tamTxt:'Luxe mondial : marché large, croissance de long terme.',src:MS+'LVMH-MOET-HENNESSY-LOUIS--29752146/finances/'}),
  OR:A({t:'OR.PA',n:"L'Oréal",sec:'Consommation & luxe',cur:'EUR',rcur:'EUR',fx:1,price:403.95,pxDate:'20/10/2026',fy:'décembre',shares:533.205,epsE:13.04,
    y:['FY2021','FY2022','FY2023','FY2024','FY2025'],rev:[32288,38261,41182,43487,44052],ebitda:[7941,8993,9858,10543,10709],ni:[4597,5707,6184,6409,6127],eps:[8.21,10.61,11.52,11.95,11.44],fcf:[5653,4944,6129,6658,7167],nd:[-1033,3033,4404,4443,2051],roe:[17.49,22.48,21.99,20.6,18.83],
    g:6,tg:2.5,wacc:7.5,cat:5,catTxt:'Croissance structurelle de la beauté et premiumisation.',tamS:6,tamTxt:'Cosmétique mondiale : croissance régulière.',src:MS+'L-OREAL-4666/finances/'}),
  KO:A({t:'KO',n:'Coca-Cola',sec:'Consommation & luxe',cur:'USD',rcur:'USD',fx:1,price:93.42,pxDate:'19/10/2026',fy:'décembre',shares:4301.609,epsE:3.357,
    y:['FY2021','FY2022','FY2023','FY2024','FY2025'],rev:[38658,43046,45784,46897,48062],ebitda:[12561,13605,14464,15160,16063],ni:[9771,9542,10714,10631,13107],eps:[2.25,2.19,2.47,2.46,3.04],fcf:[11258,9534,9747,4741,5296],nd:[30136,27518,28401,29951,29686],roe:[47.69,40.51,46.6,49.07,45.45],
    g:5,tg:2.5,wacc:7,cat:4,catTxt:'Pouvoir de prix établi ; catalyseur limité.',tamS:6,tamTxt:'Boissons non alcoolisées : marché mature.',src:'https://in.marketscreener.com/quote/stock/THE-COCA-COLA-COMPANY-4819/finances/'}),
  AIR:A({t:'AIR.PA',n:'Airbus',sec:'Industrie & énergie',cur:'EUR',rcur:'EUR',fx:1,price:193.58,pxDate:'20/10/2026',fy:'décembre',shares:789.38,epsE:7.42,
    y:['FY2021','FY2022','FY2023','FY2024','FY2025'],rev:[52149,58763,65446,69230,73420],ebitda:[7190,8343,8080,8207,10261],ni:[4213,4247,3789,4232,5221],eps:[5.36,5.4,4.8,5.36,6.6],fcf:[3515,3824,4386,4463,4031],nd:[-7643,-5477,-4974,11753,-12171],roe:[42.7,37.89,28.83,21.4,23.79],
    g:10,tg:2.5,wacc:8.5,cat:8,catTxt:'Carnet de commandes pluriannuel et montée des cadences de production.',tamS:7,tamTxt:'Aviation commerciale : duopole mondial.',ovNote:'Dette nette 2024 publiée positive par la source alors que les autres années sont en trésorerie nette : valeur à vérifier.',src:MS+'AIRBUS-SE-4637/finances/'}),
  TTE:A({t:'TTE.PA',n:'TotalEnergies',sec:'Industrie & énergie',cur:'EUR',rcur:'USD',fx:+(1/FX_EURUSD).toFixed(4),price:80.04,pxDate:'20/10/2026',fy:'décembre',shares:2143.949,epsE:12.09,
    y:['FY2021','FY2022','FY2023','FY2024','FY2025'],rev:[184634,263310,218945,195610,182344],ebitda:[38740,71578,50030,43143,40555],ni:[16032,20526,21384,15758,13127],eps:[5.92,7.85,8.67,6.69,5.78],fcf:[18067,31677,22957,15945,10390],nd:[43205,18994,16220,10930,20215],roe:[16.77,32.4,20.29,15.57,11.28],
    g:1,tg:1.5,wacc:8.5,cat:5,catTxt:'Prix des hydrocarbures volatils ; développement de l’électricité intégrée.',tamS:8,tamTxt:'Énergie mondiale : marché très large, croissance faible.',src:MS+'TOTALENERGIES-SE-4717/finances/'})
};

const co=(id,n,sec,liq,cat,conc,tam,team,bm,gr,need,arr,pre,mult,x,t)=>Object.assign({id,n,sec,liq,cat,conc,tam,team,bm,gr,need,arr,pre,mult,
  liqTxt:t[0],catTxt:t[1],leader:t[2],faille:t[3],tamTxt:t[4],pos:t[5],bmTxt:t[6],teamTxt:t[7],equity:t[8],syndic:t[9]},x);

const DEF={
  bp:{
    name:"Atelier Nova",sector:"saas",zone:"eu",h:"5",startY:2027,
    summary:"Atelier Nova édite un logiciel de maintenance prédictive pour les sites industriels de taille intermédiaire. Le projet sollicite une levée d'amorçage pour industrialiser le produit et ouvrir trois régions françaises.",
    edge:"Accès exclusif aux données de maintenance de 40 sites industriels via le réseau des fondateurs : le modèle prédictif est entraîné avant que la concurrence n'ait accès au terrain.",
    team:[
      {n:"Claire M.",r:"CEO",p:"12 ans en direction d'usine (agroalimentaire) ; a piloté un plan de maintenance sur 6 sites."},
      {n:"Hugo D.",r:"CTO",p:"Docteur en apprentissage statistique ; ex-lead data d'un éditeur industriel, 2 produits mis en production."},
      {n:"Samir K.",r:"Directeur commercial",p:"Ex-ingénieur d'affaires chez un intégrateur ERP ; portefeuille de 30 comptes ETI."}
    ],
    teamTxt:"Complémentarité terrain, technique et vente. Point faible assumé : aucun profil finance, d'où un DAF à temps partagé prévu en année 2. Les fondateurs ont déjà traversé une restructuration industrielle.",
    macro:"Investissement industriel européen en croissance modérée ; inflation salariale de 3 à 4 % par an sur les profils data ; taux d'emprunt bancaire autour de 4 à 5 %.",
    drivers:"Coût croissant des arrêts non planifiés ; obligations de reporting énergétique ; pénurie de techniciens de maintenance.",
    constraints:"Cycle de vente de 6 à 9 mois ; exigences de cybersécurité des sites ; intégration obligatoire aux GMAO existantes.",
    pestel:{
      p:"Plans publics de réindustrialisation (France 2030) et aides à la modernisation des sites.",
      e:"Coût du capital élevé qui freine les capex ; arbitrage favorable aux solutions en abonnement (opex).",
      s:"Départs en retraite des techniciens expérimentés : perte du savoir-faire de diagnostic.",
      t:"Maturité des modèles prédictifs et baisse du coût du stockage des données machine.",
      env:"Réduction des consommations d'énergie et des rebuts : argument direct de la maintenance prédictive.",
      l:"CSRD et reporting extra-financier ; directive NIS2 sur la cybersécurité des sites industriels."
    },
    mkt:{
      label:"Maintenance prédictive des sites industriels, France",unitQ:"sites équipés",src:"",
      hist:[{y:2021,v:210,q:3900},{y:2022,v:236,q:4350},{y:2023,v:268,q:4900},{y:2024,v:301,q:5450},{y:2025,v:338,q:6050}],
      seas:[8.5,8,9,8.5,9,7.5,4,4.5,9.5,10,11,10.5],seasApply:true,srcSeas:"",
      regions:[{n:"Auvergne-Rhône-Alpes",sh:14},{n:"Hauts-de-France",sh:11},{n:"Grand Est",sh:10},{n:"Île-de-France",sh:9},{n:"Pays de la Loire",sh:8},{n:"Normandie",sh:7}],
      intl:[
        {n:"Allemagne",v:1450,ph:"Phase 2 (A3)",note:"Premier parc industriel européen ; références locales exigées"},
        {n:"Italie",v:620,ph:"Phase 2 (A4)",note:"Tissu dense d'ETI manufacturières dans le Nord"},
        {n:"Espagne",v:380,ph:"Phase 3",note:"Agroalimentaire et automobile"},
        {n:"Benelux",v:310,ph:"Phase 3",note:"Chimie et logistique portuaire"},
        {n:"Pologne",v:240,ph:"Veille",note:"Croissance rapide, prix bas"},
        {n:"Amérique du Nord",v:3900,ph:"Hors horizon",note:"Marché le plus large, concurrence très financée"}
      ],srcGeo:""
    },
    segments:"Cœur de cible : ETI industrielles de 1 à 10 sites (agroalimentaire, chimie, plasturgie). Hors cible : grands groupes (cycles supérieurs à 18 mois) et TPE (budget insuffisant).",
    personas:[
      {n:"Responsable maintenance",who:"Ingénieur ou technicien senior, 35 à 50 ans, site de 100 à 500 salariés, encadre 3 à 8 techniciens.",spend:"Maintenance curative sous contrat, pièces détachées en urgence, heures supplémentaires ; tableurs et GMAO de base.",when:"Budget opex voté en novembre-décembre, consommé dès janvier ; achats ponctuels après une panne majeure.",why:"Déclencheur : arrêt de ligne coûteux ou audit de l'assureur. Besoin : anticiper les pannes. Gain attendu : moins d'astreintes, disponibilité mesurable.",fears:"Fausses alertes, surcharge pour ses équipes, outil imposé par la direction, dépendance à un éditeur jeune.",where:"Salons de maintenance industrielle, groupes LinkedIn métiers, distributeurs de pièces, intégrateurs GMAO."},
      {n:"Directeur d'usine",who:"Directeur de site, 45 à 60 ans, responsable du compte de résultat du site, rend compte au groupe.",spend:"Projets d'amélioration continue, conseil lean, capex machines.",when:"Arbitrages d'investissement en septembre-octobre pour l'année suivante.",why:"Déclencheur : objectif de TRS ou de coûts fixé par le groupe. Gain attendu : 3 à 5 points de TRS, moins de non-qualité.",fears:"Retour sur investissement non démontré, projet qui s'enlise, exposition devant le groupe.",where:"Clubs de dirigeants industriels, CCI, cabinets de conseil, recommandations de pairs."},
      {n:"DSI groupe",who:"DSI ou RSSI d'ETI multi-sites.",spend:"Licences ERP et GMAO, cybersécurité, hébergement.",when:"Fenêtres de référencement annuelles ; validation en comité informatique.",why:"Déclencheur : demande des usines. Besoin : intégration propre et sécurisée.",fears:"Faille de sécurité sur les réseaux machines, outils non maîtrisés, réversibilité des données.",where:"Questionnaires de sécurité, intégrateurs ERP, événements de cybersécurité industrielle."}
    ],
    demand:"Demande validée par 3 pilotes payants et 14 entretiens de découverte ; 9 sites ont signé une lettre d'intention.",
    valueProp:"Prédire les pannes critiques 2 à 3 semaines à l'avance, déployé en moins de 4 semaines sans capteur supplémentaire.",
    ptypes:[
      {n:"Prestations de maintenance conditionnelle",sv:38,sq:30},
      {n:"Licences logicielles sur site + maintenance",sv:27,sq:12},
      {n:"Abonnements logiciels (SaaS)",sv:20,sq:33},
      {n:"Capteurs avec logiciel inclus",sv:15,sq:25}
    ],srcPt:"",
    vw:{tc:350,ch:700,ex:1600,te:2500},priceRec:1200,srcVw:"",
    offers:[
      {n:"Essentiel",p:800,seg:"PME, 1 site",d:"Une ligne de production, alertes et tableau de bord"},
      {n:"Site",p:1400,seg:"ETI 1 à 3 sites (cœur de cible)",d:"Site complet, intégration GMAO"},
      {n:"Multi-sites",p:2200,seg:"ETI 4 à 10 sites",d:"Consolidation groupe, API, support dédié"}
    ],
    posStmt:"Pour les ETI industrielles de 1 à 10 sites qui subissent des arrêts non planifiés, Atelier Nova est la maintenance prédictive déployée en 4 semaines sans capteur supplémentaire, là où le leader demande 9 mois de projet.",
    fcs:"Taux de détection prouvé sur données réelles avant signature\nDéploiement en moins de 4 semaines\nIntégration native aux principales GMAO\nRéférences publiques dans chaque région ciblée\nSécurité des réseaux machines certifiée",
    barriers:"Base de pannes propriétaire ; coûts de changement élevés une fois intégré à la GMAO ; certifications cybersécurité industrielles.",
    tamis:{liq:6,liqTxt:"Rachats réguliers d'éditeurs industriels par les équipementiers et éditeurs ERP : sortie industrielle crédible à 5-7 ans.",cat:8,catTxt:"Reporting énergétique (CSRD), pénurie de techniciens, aides à la modernisation.",conc:7,concTxt:"Le leader délaisse les ETI de moins de 10 sites et déploie en 9 mois."},
    channels:[{n:"Vente directe",sh:50,cac:6000},{n:"Partenaires intégrateurs",sh:30,cac:3500},{n:"Salons et inbound",sh:20,cac:2500}],
    penetration:"Pénétration région par région (Auvergne-Rhône-Alpes, Hauts-de-France, Grand Est) en s'appuyant sur les pilotes comme références. Paiement annuel d'avance proposé avec 8 % de remise.",
    revModel:"Abonnement mensuel par site, facturé annuellement. Les prestations d'intégration sont refacturées à prix coûtant et exclues du modèle.",
    tamOv:0,cagrOv:0,samPct:0.5,somPct:5,
    arpu:1200,clients1:25,g:[160,100,60,40],churn:1,gm:78,
    hc:[4,7,10,13,16],salary:62000,other1:120000,otherG:10,
    capex:[60000,40000,50000,60000,70000],amortY:3,dso:60,dpo:30,tax:25,
    equity:100000,grant:50000,loan:200000,rate:4.5,loanY:5,defer:6,raise:1200000,raiseM:6,preMoney:4000000,
    just:{
      arpu:"Moyenne pondérée de la grille tarifaire (mix 30/50/20), prix validé par les 3 pilotes payants.",
      clients1:"9 lettres d'intention et 25 % de conversion sur un pipeline de 64 sites qualifiés.",
      g:"2 commerciaux recrutés en A2 ; productivité de 20 à 25 nouveaux clients par commercial et par an.",
      churn:"Benchmark SaaS B2B vertical : 8 à 15 % de churn annuel ; aucun départ sur les pilotes.",
      gm:"Hébergement et support : 22 % du CA, conforme au benchmark SaaS.",
      cac:"CAC par canal mesuré sur les 3 premiers contrats et sur les devis partenaires.",
      hc:"Plan de recrutement nominatif ; salaire chargé moyen issu des grilles du marché data et industrie.",
      bfr:"Paiement à 60 jours usuel chez les ETI industrielles ; fournisseurs cloud à 30 jours."
    },
    px:55,py:85,
    comp:[
      {n:"Leader historique",x:85,y:50,sv:34,sq:22,f:"Base installée, contrats-cadres avec les groupes, marque reconnue",k:"Produit vieillissant, déploiement en 9 mois, prix élevé",z:"Délaisse les ETI de moins de 10 sites ; support lent hors grands comptes ; interface obsolète",a:"Cibler ses clients ETI à l'échéance du contrat : migration offerte, déploiement en 4 semaines, prix inférieur de 30 %"},
      {n:"Challenger financé",x:60,y:70,sv:12,sq:15,f:"Levée récente, marketing agressif, interface moderne",k:"Aucune donnée terrain, modèles génériques",z:"Taux de fausses alertes élevé, peu d'experts métier",a:"Démonstration comparative sur les données réelles du prospect ; engagement sur le taux de détection"},
      {n:"Intégrateurs ERP",x:70,y:25,sv:18,sq:14,f:"Relation directe avec la DSI",k:"Aucune spécialisation métier",z:"Projets longs et coûteux ; module maintenance secondaire",a:"Partenariat : devenir leur brique prédictive plutôt que les affronter"},
      {n:"Éditeurs de niche",x:45,y:60,sv:21,sq:24,f:"Expertise d'un signal (vibration, thermographie)",k:"Mono-technologie",z:"Pas d'intégration GMAO, pas de vue d'ensemble du site",a:"Plateforme multi-signaux intégrée à la GMAO"},
      {n:"Solutions internes (tableurs)",x:8,y:10,sv:15,sq:25,f:"Coût marginal nul",k:"Non scalable, erreurs fréquentes",z:"Dépend d'une seule personne ; aucun historique exploitable",a:"Offre Essentiel à bas prix pour remplacer le tableur sans projet informatique"}
    ],
    leadWhy:"Premier entrant du marché, contrats-cadres pluriannuels avec les groupes et réseau d'intégrateurs certifiés.",
    swot:{
      s:"Données terrain propriétaires\nÉquipe fondatrice issue de l'industrie\nDéploiement en moins de 4 semaines",
      w:"Marque inconnue des grands comptes\nCycle de vente long\nDépendance à 3 clients pilotes",
      o:"Obligations de reporting énergétique\nVieillissement du parc industriel européen\nAides France 2030",
      t:"Réaction tarifaire du leader\nRalentissement de l'investissement industriel\nArrivée d'acteurs IA généralistes"
    },
    advice:"Tenir un comité mensuel réalisé contre prévisionnel. Ne déclencher les recrutements de l'année 2 qu'après la signature de la levée. Exiger des pilotes une référence publique avant tout renouvellement.",
    srcDate:"Octobre 2026"
  },
  an:{
    crit:{ebitda:20,roe:15,roic:12,nd:2.5,growth:3,min:65,mos:25,sl:12,tp:15,wDcf:50,wEv:25,wPe:25,fmin:5},
    assets:UNIVERSE
  },
  sc:{
    w:{cat:25,conc:20,tam:25,team:15,bm:15},min:5,
    sectors:{
      saas:{liq:8,cat:6,note:"Nombreux acquéreurs stratégiques et fonds de rachat."},
      fintech:{liq:7,cat:5,note:"Marché liquide, valorisations sous pression depuis 2022."},
      health:{liq:4,cat:7,note:"Sorties longues ; catalyseur réglementaire (remboursement)."},
      energy:{liq:6,cat:9,note:"Transition énergétique et obligations de flexibilité réseau."},
      cyber:{liq:8,cat:9,note:"NIS2 et consolidation active du secteur."},
      edtech:{liq:4,cat:5,note:"Peu de sorties depuis 2022."},
      agri:{liq:3,cat:8,note:"Cadre légal favorable, marché secondaire quasi inexistant."},
      logi:{liq:5,cat:6,note:"Zones à faibles émissions, consolidation lente."}
    },
    srcSect:"",
    list:[
      co('helio','Heliostore','energy',6,9,7,8,8,6,120,18,6.5,85,10,{ebm:-8,fund:'Capital-risque',serial:1,tier:'Tier-1 et stratégique',tgt:450},["Secondaire actif sur les infrastructures énergie ; acquéreurs industriels identifiés","Obligation de flexibilité réseau et appels d'offres stockage","Intégrateur coté positionné sur les grands projets","Le leader délaisse le segment 1 à 10 MW (tertiaire, PME)","Stockage stationnaire tertiaire en Europe, croissance > 20 %/an","Batteries tertiaires livrées avec logiciel d'arbitrage intégré","Matériel + abonnement logiciel (30 % du CA récurrent) ; BFR élevé","Ex-dirigeants d'un fabricant de batteries et du gestionnaire de réseau ; CEO déjà fondateur d'une société revendue","Devenir l'opérateur de flexibilité du tertiaire européen ; sortie vers une utility","Lead : fonds infra européen. Co-investisseurs : Bpifrance, CVC d'un énergéticien"]),
      co('grid','Gridsense','energy',7,8,5,7,7,7,65,6,8,70,9,{ebm:-2,fund:'Capital-risque',serial:0,tier:'Spécialiste',tgt:320},["Plusieurs rachats récents dans la gestion de réseau","Plans d'investissement réseau des GRD européens","Éditeur historique de SCADA","Interface vieillissante, pas d'IA native","Logiciels de pilotage réseau, marché de taille moyenne","Jumeau numérique du réseau basse tension","SaaS pur, marge brute 82 %, proche du break-even","Fondateurs ingénieurs réseau, COO ex-éditeur SaaS","Brique logicielle stratégique pour les grands équipementiers","Lead : VC climat. Business angels sectoriels"]),
      co('medi','Medisens','health',4,7,6,7,7,5,85,12,3.2,48,9,{ebm:-25,fund:'Capital-risque',serial:0,tier:'Spécialiste',tgt:220},["Peu de transactions secondaires, sortie longue","Remboursement des dispositifs de télésurveillance","Groupe medtech diversifié","Offre non connectée aux logiciels hospitaliers","Télésurveillance des maladies chroniques","Capteur + plateforme de suivi pour les cardiologues","Dépendance au remboursement ; cycle de vente hospitalier","Cardiologue fondateur, CEO ex-industrie pharma","Plateforme de référence de suivi cardiaque à domicile","Lead : fonds santé spécialisé. Bpifrance"]),
      co('bio','BioSeq Labs','health',5,6,7,8,9,4,40,25,4,90,9,{ebm:-60,fund:'Capital-risque',serial:1,tier:'Tier-1',tgt:600},["Liquidité via licensing avec les laboratoires","Médecine de précision, plans nationaux génomiques","Leader mondial du séquençage","Coût par analyse élevé, peu adapté aux labos moyens","Diagnostic génomique, marché large et en croissance","Kits de séquençage ciblé pour laboratoires régionaux","Forte intensité R&D, besoin de capital élevé","Équipe scientifique de premier plan, 40 brevets ; CSO déjà cofondateur d'une biotech","Démocratiser le diagnostic génomique","Lead : fonds deeptech. Fonds de fonds européen"]),
      co('cyber','Vaultline','cyber',8,8,5,8,8,8,70,8,11,140,11,{ebm:5,fund:'Capital-risque',serial:1,tier:'Tier-1 et souverain',tgt:1100},["Secteur très consolidé, nombreux acquéreurs stratégiques","Directive NIS2 : obligations élargies à des milliers d'entités","Plateforme américaine dominante","Prix élevé et hébergement hors UE","Sécurité des PME et ETI européennes","Plateforme XDR souveraine, hébergée en Europe","SaaS, NRR 125 %, marge brute 78 %","Fondateurs ex-agence nationale de cybersécurité ; deuxième création","Champion souverain de la cybersécurité ETI","Lead : fonds growth européen. Fonds souverain"]),
      co('soc','Sentinelle','cyber',6,7,8,6,6,7,50,4,3.5,30,10,{ebm:8,fund:'Autofinancé',serial:0,tier:'Business angels',tgt:120},["Rachats fréquents de SOC régionaux","NIS2 et exigences des assureurs cyber","Grands intégrateurs de services","Pas d'offre adaptée aux collectivités","SOC managé pour collectivités et PME","SOC mutualisé, tarif forfaitaire par poste","Services récurrents, marge brute 55 %","Équipe opérationnelle solide, CEO à renforcer","Consolidateur du SOC pour le secteur public local","Business angels, fonds régional"]),
      co('fin','Finora','fintech',7,5,4,7,6,6,55,15,9,120,8,{ebm:-35,fund:'Capital-risque',serial:1,tier:'Tier-1',tgt:700},["Fintech liquide mais valorisations sous pression","Open banking, réglementation stable","Néobanques établies","Faible service aux indépendants à revenus variables","Services financiers aux indépendants","Compte pro + lissage automatique des revenus","Revenus d'interchange + abonnement ; burn élevé","Ex-dirigeants de banque en ligne","Banque de référence des indépendants européens","Lead : fonds fintech US. Fonds européens"]),
      co('pay','Payvia','fintech',8,6,5,8,7,7,90,7,5,60,8,{ebm:2,fund:'Capital-risque',serial:0,tier:'Spécialiste',tgt:400},["Rachats fréquents par les acteurs du paiement","Instant payment obligatoire en zone euro","Grands PSP internationaux","Frais élevés sur les virements B2B","Paiements B2B en zone euro","Paiement B2B instantané intégré aux ERP","Commission par transaction, effet de levier volume","Équipe produit forte, ex-PSP","Infrastructure de paiement B2B instantané","Lead : VC fintech. Business angels"]),
      co('norv','Norvia','logi',5,6,6,6,7,5,60,10,7.5,50,5,{ebm:4,fund:'Mixte',serial:0,tier:'Fonds à impact',tgt:150},["Consolidation lente du secteur","ZFE et décarbonation du dernier kilomètre","Grands groupes de messagerie","Rigidité opérationnelle en centre-ville","Logistique urbaine bas carbone","Micro-hubs + flotte électrique mutualisée","Asset-heavy, marges faibles, BFR important","Fondateurs opérationnels expérimentés","Réseau de référence des micro-hubs urbains","Lead : fonds impact. Bpifrance"]),
      co('agri','Agrivolta','agri',3,8,8,6,6,4,140,9,1.8,22,7,{ebm:-15,fund:'Autofinancé',serial:0,tier:'Business angels',tgt:90},["Marché secondaire quasi inexistant","Agrivoltaïsme encadré par la loi, tarifs garantis","Développeurs solaires généralistes","Aucune expertise agronomique","Agrivoltaïsme, marché émergent","Ombrières pilotées selon les besoins des cultures","Revenu de projet + maintenance, capex lourd","Agronomes + ingénieurs solaire, peu d'expérience de levée","Tiers de confiance entre agriculteurs et énergéticiens","Business angels, fonds régional agricole"]),
      co('L-energy','Intégrateur coté (leader)','energy',9,9,3,9,7,7,15,0,900,9000,10,{lead:1,ebm:9,fund:'Coté',serial:0,tier:'Marché',tgt:0},["Titre coté liquide","Transition énergétique","—","Délaisse le tertiaire et les petits projets","Stockage d'énergie mondial","Grands projets réseau","Intégration matériel","Équipe de direction expérimentée","Leader établi","Actionnariat coté"]),
      co('L-cyber','Plateforme américaine (leader)','cyber',9,9,3,9,8,8,25,0,3000,45000,15,{lead:1,ebm:22,fund:'Coté',serial:0,tier:'Marché',tgt:0},["Titre coté liquide","Menace cyber croissante","—","Prix élevé, hébergement hors UE","Cybersécurité mondiale","Plateforme XDR de référence","SaaS rentable","Direction expérimentée","Leader établi","Actionnariat coté"]),
      co('L-health','Groupe medtech (leader)','health',9,7,3,8,7,6,6,0,5000,40000,8,{lead:1,ebm:24,fund:'Coté',serial:0,tier:'Marché',tgt:0},["Titre coté liquide","Vieillissement de la population","—","Offres peu connectées","Dispositifs médicaux","Portefeuille diversifié","Industriel rentable","Direction expérimentée","Leader établi","Actionnariat coté"]),
      co('L-fintech','Néobanque établie (leader)','fintech',8,5,3,8,7,7,30,0,2500,25000,10,{lead:1,ebm:15,fund:'Capital-risque',serial:0,tier:'Tier-1',tgt:0},["Secondaires actifs","Open banking","—","Service faible aux indépendants","Banque en ligne","Compte grand public","Interchange et abonnements","Direction expérimentée","Leader établi","Fonds de croissance"]),
      co('L-logi','Groupe de messagerie (leader)','logi',9,6,3,8,6,5,3,0,8000,30000,4,{lead:1,ebm:11,fund:'Coté',serial:0,tier:'Marché',tgt:0},["Titre coté liquide","ZFE","—","Rigidité en centre-ville","Messagerie et colis","Réseau national","Asset-heavy","Direction expérimentée","Leader établi","Actionnariat coté"]),
      co('L-agri','Développeur solaire (leader)','agri',8,8,3,7,6,6,12,0,600,6000,10,{lead:1,ebm:60,fund:'Coté',serial:0,tier:'Marché',tgt:0},["Titre coté liquide","Objectifs renouvelables","—","Aucune expertise agronomique","Solaire au sol","Grands parcs","Production d'électricité","Direction expérimentée","Leader établi","Actionnariat coté"])
    ]
  },
  pf:{
    positions:[
      {tk:'INTC',q:100,pru:100.00,d:'2026-03-12',qd:'',qeps:null,qepsP:null,qrev:null,qrevP:null},
      {tk:'MC',q:20,pru:520.00,d:'2025-06-18',qd:'',qeps:null,qepsP:null,qrev:null,qrevP:null},
      {tk:'MSFT',q:15,pru:420.00,d:'2025-02-04',qd:'',qeps:null,qepsP:null,qrev:null,qrevP:null},
      {tk:'TTE',q:150,pru:62.00,d:'2024-11-20',qd:'',qeps:null,qepsP:null,qrev:null,qrevP:null},
      {tk:'AIR',q:30,pru:170.00,d:'2025-09-09',qd:'',qeps:null,qepsP:null,qrev:null,qrevP:null}
    ],
    eurusd:FX_EURUSD
  }
};
