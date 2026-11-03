/* ============ v7.2 : sous-secteurs et multiples d'industrie (comparables de l'analyse financière) ============ */
/* Multiples Damodaran, sociétés américaines, janvier 2026 (pages.stern.nyu.edu/~adamodar, fichiers vebitda et pedata) :
   eve = VE/EBITDA des sociétés à EBITDA positif ; pe = capitalisation / résultat net des sociétés bénéficiaires. */
const AN_DAMO={
  'Aerospace/Defense':{eve:21.58,pe:35.27,n:79},'Apparel':{eve:10.30,pe:27.09,n:35},'Beverage (Soft)':{eve:16.90,pe:26.25,n:27},
  'Computers/Peripherals':{eve:25.42,pe:34.33,n:36},'Household Products':{eve:13.17,pe:19.66,n:110},'Oil/Gas (Integrated)':{eve:8.16,pe:19.02,n:4},
  'Retail (Special Lines)':{eve:11.47,pe:24.91,n:94},'Semiconductor':{eve:34.75,pe:48.81,n:66},'Semiconductor Equip':{eve:24.74,pe:34.18,n:31},
  'Software (System & Application)':{eve:24.48,pe:37.52,n:309},'Total Market':{eve:19.73,pe:26.56,n:5994}};
const AN_SUB={
  AAPL:{key:'hw',l:'Matériel informatique et électronique grand public',damo:'Computers/Peripherals'},
  MSFT:{key:'sw',l:'Logiciels',damo:'Software (System & Application)'},SAP:{key:'sw',l:'Logiciels',damo:'Software (System & Application)'},
  NVDA:{key:'semi',l:'Semi-conducteurs',damo:'Semiconductor'},INTC:{key:'semi',l:'Semi-conducteurs',damo:'Semiconductor'},
  ASML:{key:'semieq',l:'Équipements pour semi-conducteurs',damo:'Semiconductor Equip'},
  MC:{key:'lux',l:'Luxe',damo:'Apparel',note:'pas d\'industrie « luxe » chez Damodaran : Apparel est une approximation basse ; ajoutez Hermès, Kering ou Richemont comme comparables saisis'},
  OR:{key:'beauty',l:'Cosmétiques et soins',damo:'Household Products'},
  KO:{key:'bev',l:'Boissons sans alcool',damo:'Beverage (Soft)'},
  AIR:{key:'aero',l:'Aéronautique et défense',damo:'Aerospace/Defense'},
  TTE:{key:'oil',l:'Pétrole et gaz intégrés',damo:'Oil/Gas (Integrated)',note:'industrie Damodaran limitée à 4 sociétés'}};
/* Sous-secteur d'un titre : table ci-dessus, sinon champ « sub » de la fiche, sinon grand secteur */
function anSub(k){const a=(S.an.assets||{})[k]||{};if(a.sub&&AN_SUB[a.sub])return AN_SUB[a.sub];return AN_SUB[k]||{key:'sec:'+(a.sec||k),l:a.sec||'Non classé',damo:'Total Market',note:'sous-secteur non classé : référence marché total'};}
