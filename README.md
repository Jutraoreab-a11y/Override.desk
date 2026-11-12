# OVERRIDE.DESK

Station d'analyse institutionnelle en 8 volets, en une seule page HTML autonome (`index.html`). Version 7.2.

Depuis la v7, un backend optionnel (Vercel + Supabase) branche les flux live : comptes MetaTrader 4 et 5 par EA, SocialTraderTools, courtiers par API chiffrée, PnL consolidé, séries macro EIA et BCE, parseur IA sourcé. Sans backend, la page fonctionne en mode simulation. Mise en service et liste des points d'accès : [docs/BACKEND.md](docs/BACKEND.md).

Nouveautés de l'interface v7.0 :
- **Panneaux redimensionnables** : poignées entre la barre de navigation, la zone de travail et la colonne de synthèse (glisser, double-clic pour réinitialiser, flèches du clavier). Au-delà de 128 px, la barre affiche les libellés en ligne. Les largeurs sont mémorisées.
- **Commodities, sélecteur universel** : permuter ou superposer sur le graphique principal Brent, WTI, Or, Argent, Cuivre, Gaz naturel, EUR/USD, GBP/USD, USD/JPY, USD/CNH, AUD/USD, USD/CAD, S&P 500, Nasdaq 100, Dow Jones, DAX 40, CAC 40, Nikkei 225 et toute action par ticker, avec option base 100. Les séries absentes du classeur se chargent par import CSV, par le navigateur de l'application Claude (page d'historique lue puis vérifiée) ou par le flux live.
- **Business plan** : zone géographique unique (fiche de renseignements) et duplication du BP sur une autre zone en nouvelle version ; TAM, SAM, SOM par pays d'exercice, continent et monde, projetés de A1 à A5 ; repères sectoriels en jauges et barres comparées (EBITDA, marges, BFR, FRNG / FRNC, PER, BPA, valorisation) ; fiche d'identité du client cible ; bassins de clients × familles de canaux (Inbound, Outbound, Salons, Digital) ; diagnostic financier et verdict d'arbitrage Go / No-Go.

Audit financier v7.1 :
- **Contrôles automatiques** : bilan équilibré, trésorerie égale à la somme des flux et tableau de financement cohérent, vérifiés sur 400 scénarios tirés au hasard.
- **LBO** : dette senior plafonnée au levier du covenant ; valorisation au VE/CA et aucune dette d'acquisition si l'EBITDA est négatif ; prime de contrôle appliquée à la valeur des titres ; décote de taille et d'illiquidité sur les multiples de sociétés cotées.
- **Business plan** :
  - taux réduit d'IS des PME (15 % jusqu'à 42 500 €) ;
  - valorisation DCF et méthode VC, avec table de capitalisation après levée ;
  - scénarios défavorable, central et favorable ;
  - sensibilités en tornade ;
  - verdict sur 12 critères, plafonné à GO SOUS CONDITIONS si le scénario défavorable n'est plus financé.
- **Patrimoine** : concentration (nombre effectif de lignes, règle 5/10/40), exposition par devise, stress test paramétrable, risque de contrepartie au regard des plafonds FGDR.
- **Contrôle qualité** : fraîcheur de chaque source de données et journal des forçages (avant, après, date, mode) exportable en CSV. Avertissement réglementaire sur chaque volet et dans l'export PDF.

Le menu sépare deux familles :
- **Finance d'entreprise** : Business plan, Analyse financière, Sélecteur & mapping, Dossier LBO, Suivi & placements ;
- **Finance de marché** : Commodities & flows, Calculateur de position, Journal de trading.

## Volets
1. **Business plan**, structuré en trois parties : le projet, le marché et la stratégie ; le porteur de projet et la structure ; le prévisionnel commenté (compte de résultat, bilan, trésorerie mensuelle, tableau de financement, tableau des investissements, BFR, seuil de rentabilité). Il comprend :
   - fiche de renseignements obligatoire, avec un indicateur de complétude ;
   - executive summary qui dit explicitement ce que l'on vend, à qui, le business model exact et l'avantage injuste ;
   - étude de marché avec un périmètre au choix (pays, continent, UE ou monde) : historique sur 5 ans, saisonnalité, repères financiers du secteur, clients cibles par région et par ville ;
   - étude de marché approfondie selon ses trois piliers : secteur et réglementation, demande, offre (fiche détaillée des concurrents) ; méthodologie quantitative, qualitative et documentaire ; contrôle des pièges à éviter et conclusion de l'étude ;
   - 4P (Produit, Prix, Distribution (Place), Promotion), prix psychologique, concurrence, Porter, PESTEL et SWOT ;
   - stratégie de lancement : approvisionnements, moyens, production, calendrier ; motivations, forme juridique et composition du capital ;
   - prévisionnel mensuel et alertes de cohérence.
2. **Analyse financière** : rapport sur un titre coté avec une décision POSITIVE ou NÉGATIVE.
3. **Sélecteur & mapping** :
   - filtre temporel : un mois, une année ou une période sur mesure ;
   - tamis des 4 filtres et double mapping ;
   - grille fondamentale et equity story.
4. **Dossier LBO** : généré en un clic depuis un dossier du Sélecteur, le business plan ou un titre coté. Cinq parties : executive summary et thèse, scoring macro et tamis, montage (sources et emplois, multiple VE/EBITDA, dette senior et mezzanine), modèle de remboursement (cash-flows, DSCR, levier, TRI, MoIC, sensibilité), plan de création de valeur (pont de valeur, synergies, feuille de route).
5. **Suivi & placements** :
   - comparaison des résultats publiés avec la performance des lignes ;
   - liaison du compte MetaTrader 5, par import du rapport ou par l'API MetaApi ;
   - lecture croisée entre le compte MT5 et le portefeuille.
6. **Commodities & flows** : Brent et WTI réunis, Or, Argent. Deux vues : pression et approvisionnement, puis confirmation macro.
7. **Calculateur de position** :
   - taille en lots selon le risque, la distance au stop, la taille du contrat et le change ;
   - marge au levier réglementaire ESMA ;
   - contrôles du plan de risque ;
   - simulation de Monte-Carlo.
8. **Journal de trading** :
   - saisie des trades et analyse par session ;
   - calendrier des résultats ;
   - statistiques : taux de réussite, profit factor, R moyen, drawdown, discipline ;
   - rétro-analyse ;
   - import des rapports MT5.

Le business plan et l'analyse financière se gèrent par dossiers projets, avec des versions datées et renommables, et un tableau de comparaison des versions.

Le mode **Override** est disponible sur tous les volets, avec le recalcul et l'export PDF.

## Données
- **Titres cotés** : comptes publiés par MarketScreener (exercices 2021-2025), cours des 19-20/10/2026.
- **Repères sectoriels** : Damodaran (NYU Stern), janvier 2026.
- **Zones géographiques** : FMI, World Economic Outlook.
- **Matières premières** : classeur TRADING_Dashboard (exports Investing.com).
- **Calculateur** :
  - leviers : ESMA, décision (UE) 2018/796 ;
  - EUR/USD : 1,1219 au 20/10/2026 ;
  - tailles de contrat : standard MT5, à vérifier chez le courtier.
- **Dossier LBO** : Euribor 3 mois 2,676 % au 30/10/2026 (euribor-rates.eu) ; marge bancaire, frais et part de dette à confirmer avec les banques.
- **Données d'exemple, à remplacer** : business plan, dossiers du Sélecteur et portefeuille.

## MetaTrader 5
- **Import** : dans MT5, ouvrir la Boîte à outils, onglet Historique, puis clic droit, Rapport, format HTML. Importer ensuite le fichier dans le volet 4 ou 7.
- **MetaApi** : jeton personnel et identifiant de compte créé avec le mot de passe investisseur (lecture seule). Pour un usage en équipe, faire passer l'appel par un serveur afin de ne pas exposer le jeton.

## Lancer
Ouvrir `index.html` dans un navigateur, ou déployer le dossier tel quel (Vercel, Netlify, GitHub Pages).

## Structure du code
```
index.html                    coquille de l'application
css/style.css                 thème, mise en page, impression PDF
js/data.js                    référentiels, titres cotés, données d'exemple
js/data-v4.js                 paramètres v4 : business models, contrats MT5, plan de risque, journal
js/core.js                    état, sauvegarde locale, champs, graphiques
js/projets.js                 dossiers projets et versions (BP, analyse financière)
js/business-plan.js           volet 1
js/analyse-financiere.js      volet 2
js/selecteur.js               volet 3 (dont filtre temporel)
js/suivi-portefeuille.js      volet 4
js/commodities-data.js        séries quotidiennes du classeur (01/2025 à 06/2026)
js/commodities.js             volet 5
js/calculateur.js             volet 6
js/journal.js                 volet 7 et lecture des rapports MT5
js/mt5.js                     liaison MetaTrader 5 (import, MetaApi)
js/lbo.js                     dossier d'acquisition LBO
js/collecte.js                collecte IA connectée et traçabilité
js/patrimoine.js              comptes de trading, courtiers, dashboard patrimonial
js/app.js                     navigation, panneau latéral, événements, abonnement
```

## Version 5.0
- **Petit crayon** : chaque valeur saisie (BP, analyse financière, sélecteur, suivi, seuils des commodities) porte un crayon. Un clic l'ouvre en édition, Entrée valide et recalcule tout le modèle en cascade, Échap annule, ↺ revient à la valeur de référence. La valeur forcée est marquée d'une pastille. Dans le LBO, le CA et l'EBITDA de chaque année se forcent aussi.
- **Scénarios LBO** : chaque dossier garde plusieurs scénarios nommés et datés. Un tableau compare leur TRI, MoIC, DSCR et levier, et chaque scénario se supprime en un clic.
- **Dette senior** : 55 % des emplois par défaut (fourchette demandée 50 à 60 %), modifiable.
- **Commodities** : les seuils de backwardation, contango et basis sont modifiables.
- **Collecte IA** (bouton en haut) : Claude ouvre les sources validées dans le navigateur intégré de l'application Claude, extrait la donnée et vérifie que l'extrait cité figure dans la page. Sources : Euribor (euribor-rates.eu), EUR/USD (BCE), cours Brent, WTI, Or, Argent (Investing.com), cours des titres (Google Finance). Chaque valeur conserve son URL et sa date de consultation, reprises dans les exports PDF. Ne fonctionne que dans l'application Claude sur ordinateur.

## Version 6.0
- **Suivi & placements**, en trois sous-onglets :
  - **Comptes de trading** : MetaTrader 4, MetaTrader 5 et SocialTraderTools. Liaison du compte (numéro, serveur, courtier, type, devise), import des rapports MT4 et MT5 (positions clôturées et ouvertes) ou synchronisation MetaApi. Indicateurs : solde, fonds propres, marge libre, drawdown maximal, profit net et exposition globale. Les webhooks SocialTraderTools demandent une fonction serveur ; en attendant, l'export CSV est accepté.
  - **Placements & courtiers** : recherche universelle de plateformes (XTB, Saxo, Trade Republic, Interactive Brokers, DEGIRO, Boursorama, Coinbase, Binance, Kraken, OKX, Ledger…) et plateformes personnalisées. Import CSV des positions (quantité, PRU, cours), saisie manuelle et modification au crayon. La lecture par API se branche côté serveur avec des clés en lecture seule.
  - **Dashboard patrimonial** : rentabilité par classe d'actifs, répartition et liquidité par plateforme (risque de contrepartie), latent et réalisé, écart aux hypothèses, alerte de divergence psychologique.
- **Commodities** :
  - puces de superposition en un clic : spread, basis, Z-score, corrélation USD/CNH, ratio Or/Argent ;
  - écran partagé ;
  - seuils modifiables au crayon directement sur la vue ;
  - matrice cross-asset Sain / Tendu / Critique ;
  - bouton « Run Diagnostics » : note IA en 3 puces, rédigée à partir des seuls indicateurs affichés.

## Version 6.1 : volet 4 automatisé
- **Comptes de trading** : remontée automatique des positions ouvertes (avec stop-loss et take-profit) à chaque ouverture de la page, puis toutes les 60 s via MetaApi. L'import des rapports MT4 et MT5 reste disponible.
- **Placements & courtiers** :
  - connecteurs en listes dépliantes : catalogue groupé par type, recherche universelle et plateformes personnalisées ;
  - le bouton « Ajouter une position » est supprimé ;
  - les positions, liquidités et cessions remontent automatiquement de la passerelle API de chaque plateforme à chaque ouverture, le relevé CSV servant de secours ;
  - crayon pour forcer une valeur.
- **Dashboard consolidé** :
  - répartitions par classe d'actifs, par actif (long terme et trading), du cash (par broker, par portefeuille, par classe de compte) et par contrepartie ;
  - TP, SL et Risk/Reward par actif et consolidé ;
  - cash investi contre cash disponible ;
  - PnL latent et réalisé, distincts et combinés, filtrés par période : jour, semaine, mois, 12 mois, YTD, tout ou dates libres.

### Format de la passerelle courtier (fonction serveur)
`GET` avec `Authorization: Bearer <jeton>`, réponse JSON :
`{"positions":[{"sym","name","cls","qty","pru","px","ccy","sl","tp"}],"cash":nombre,"realized":[{"d":"AAAA-MM-JJ","sym","pnl","ccy"}]}`.
Les clés API des courtiers restent sur le serveur. La page déployée (Vercel ou fichier local) appelle les passerelles et MetaApi ; dans l'aperçu Claude, les appels réseau directs peuvent être bloqués.


Version 7.2 :
- **Données actualisées au 3 novembre 2026** : cours de 10 titres, EUR/USD (BCE), Brent, WTI, or et argent jusqu'au 26-27 octobre, historiques de 50 séances (Apple, Nvidia, Coca-Cola, CAC 40) et de 20 séances (Microsoft, Intel, ASML). Chaque valeur est datée et sourcée ; une valeur forcée au crayon n'est jamais écrasée. Restent à compléter : Intel (cours du 19/10), USD/CNH et S&P 500 (17/06), séances de commodities du 18/06 au 25/09.
- **Business plan** : TVA dans la trésorerie et le BFR (collectée, déductible, reversée le mois suivant, crédit reporté, part du CA hors TVA) ; suivi du réalisé mois par mois avec écarts, effet volume et effet prix, alertes et import CSV.
- **Portefeuille** : rétro-calcul à composition constante (rendement, volatilité, Sharpe, Sortino, drawdown, VaR et CVaR historiques et paramétriques, bêta, corrélation, tracking error contre l'indice choisi) ; TWR et MWR réels à partir des valorisations quotidiennes et des apports / retraits.
- **Analyse financière** : comparables par sous-secteur, comparables saisis avec source, repli sur le multiple d'industrie Damodaran (janvier 2026) quand moins de deux pairs sont disponibles.
- **Équipe** : rôles (administrateur, analyste, valideur, lecteur), circuit brouillon → soumise → validée ou rejetée, règle des quatre yeux, empreinte SHA-256 et signature serveur, journal d'audit partagé en ajout seul. En local, les rôles sont déclaratifs ; ils sont garantis par le serveur en flux live.
Version 7.3 :
- **Double mapping dans l'analyse financière** : le bouton « Mapping sectoriel & stock », dans l'en-tête de chaque titre, ouvre deux mappings.
  - **Mapping 1 (le marché)** : uniquement des secteurs, aucune société, notés en attractivité et en liquidité.
  - **Mapping 2 (le secteur cible)** : les sociétés de ce secteur en qualité et en liquidité, avec les anomalies de valorisation.
  - **Validation de l'entrée** sur le titre par cinq contrôles : secteur prioritaire, titre parmi les cibles, valorisation, plafond d'exposition sectorielle du portefeuille (dilution du risque), tamis.
  - **Notes sectorielles** calculées à partir des comptes publiés et des données Damodaran, modifiables au crayon.

## Version 8.0 / 8.1 : mapping multi-actifs, moteur anti-FOMO, cache IA, macro et or / argent

**Mapping multi-actifs** (bouton « Mapping sectoriel & stock » du volet Analyse financière, seul point d'accès) : barre `Actions · ETF · Cryptos · Commodities / Macro`.
- Panneau de filtres : VE/EBITDA, PER, cours / actif net, VE/CA, croissance du CA (1 ou 3 ans ; 5 ans demande six exercices), marges EBITDA et nette, rendement FCF, capitalisation, volume moyen quotidien (saisi au crayon, non publié dans les comptes), bornage 1 / 2 / 5 / 10 / 20 / 30 ans pour les ETF.
- Quadrant dynamique en unités réelles, axes au choix. Le risque ou la cherté se lit à gauche, de sorte que le quadrant supérieur droit regroupe les surperformeurs ; seuils à la médiane de l'univers filtré ou saisis. Alerte anti-FOMO (⚠) : performance du quartier haut obtenue dans la zone risquée.
- Clic : une action ouvre son analyse financière, fondamentaux chargés ; un ETF, une crypto ou une commodity ouvre une fiche latérale. Le double mapping (secteur puis titre) reste sous le screener actions.
- Univers livré : 20 ETF (Tiingo, cours ajustés, fins d'année depuis la création et 26 fins de mois), 11 cryptos par narratif L1 / DeFi / RWA / AI (CoinGecko : capitalisation, FDV, volume, plus haut historique), commodities et macro du volet 5.

**Module 5 (V8.1)** : quatre puces supplémentaires sur le graphique principal, `CPI / PPI YoY`, `Fed Funds Rate` (avec le taux réel 10 ans), `WASDE Stock/Use Ratio`, `Beta XAU/XAG & Lead Impulse`.
- Moteur or / argent : ratio XAU/XAG et Z-scores 20 / 60 j, bêta glissant de l'argent sur l'or, Silver Lead Indicator (impulsion 20 j au-delà du bêta, en écarts-types), signal lead / lag, drapeau `🔴 Mouvement FOMO / Spéculatif Sans Support Fundamental` quand l'or ou l'argent sort de la borne statistique sans confirmation du cuivre ni du taux réel. Bornes modifiables au crayon.
- Sensibilité mensuelle de l'or et de l'argent aux surprises CPI / PPI, au Fed Funds et au taux réel (bêtas MCO, R², nombre de mois). Le consensus des économistes n'étant pas public, la surprise est la variation du chiffre publié ; c'est indiqué à l'écran.
- Cartes Inflation & politique monétaire (CPI, PPI, Fed Funds, taux réel, médianes FOMC de septembre 2026) et WASDE (stocks / emplois US et monde, révisions, rendements).
- Trou de données de l'été comblé : or et argent au comptant (EODHD) jusqu'au 09/11/2026, Brent daté et WTI Cushing (FRED / EIA) jusqu'au 03/11/2026. Les contrats à terme M1 passent dans leur colonne : les basis sont calculés du 28/09 au 27/10.

**Cache-first IA** : aucun appel à l'API Anthropic au chargement, au F5 ni au changement d'onglet. Chaque volet lit ses données en base à l'ouverture (0 jeton). « Recalculer » ne resynchronise que le volet affiché et n'appelle Claude que si l'extraction stockée est périmée (`POST /api/v1/ai/ingest`, un module par appel, JSON strict par outil forcé). La création d'un dossier déclenche l'ingestion « init ». Voyant `● Collecte IA` dans l'en-tête : vert si une passerelle est active.

Sources des données livrées (collecte du 10/11/2026) : FRED (CPIAUCSL, PPIFIS, FEDFUNDS, DFII10, PCOPPUSDM, DCOILBRENTEU, DCOILWTICO), EODHD (XAUUSD, XAGUSD), Tiingo, CoinGecko, USDA WASDE du 09/10/2026, Federal Reserve SEP du 16/09/2026. Restent à compléter : USD/CNH et S&P 500 après le 17/06, futurs M1 hors du 28/09–27/10, WASDE de novembre (non publié à la date de collecte).

## Version 8.2

- **Sélecteur universel du volet 5 entièrement alimenté** : EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD (FRED, taux H.10), gaz naturel Henry Hub (FRED), Nasdaq 100 et Nikkei 225 (FRED), DAX, Dow Jones et CAC 40 (EODHD), depuis janvier 2025 ; cuivre en moyenne mensuelle (FMI via FRED, pas de série quotidienne gratuite). USD/CNH et S&P 500 complétés après le 17/06/2026 (EODHD) : les corrélations CNH du volet 5 sont de nouveau calculées.
- **Clic ETF ou crypto → analyse financière** : la slide d'analyse affiche l'actif sans ressaisie. ETF : performances 1 à 30 ans, volatilité, rendement / risque, écart au S&P 500, rendements calendaires. Crypto : capitalisation, FDV et dilution, vélocité, repli depuis le plus haut, comparables du narratif. Boutons retour vers le mapping ou vers l'analyse du titre.
- Barre du mapping : 📈 Actions · 🌐 ETF · ⚡ Cryptos · 🛢️ Commodities / Macro ; sous-onglet « Comptes trading directs » du volet 4.
- Déjà en place depuis les versions 7 et 8 et conservés : trois panneaux redimensionnables, crayon d'override en cascade, bloc sectoriel du business plan (EBITDA, PER, BPA, valorisation, marge nette, BFR, FRNC en jauges et histogrammes), zone unique pays / région / monde, matrice TAM-SAM-SOM échelle × 5 ans, ciblage et bassins d'acquisition, verdict Go / No-Go, volet 4 en trois sous-onglets, macro / WASDE / or-argent, IA cache-first.

## Version 8.3 : prêt pour l'usage réel

- **Ajout d'une société en un clic** : Ctrl+K, taper le ticker, « Créer la fiche ». Backend connecté : les cinq derniers exercices (chiffre d'affaires, EBITDA, résultat net, BPA, FCF, dette nette, ROE, nombre d'actions) sont chargés depuis la SEC (XBRL des rapports 10-K, sans clé, 0 jeton), cours via Tiingo si la clé existe. Société non américaine : message explicite et ingestion IA à partir de l'URL d'une page de comptes.
- **Cours du soir automatiques** : la tâche planifiée de 21 h 30 UTC actualise cryptos (CoinGecko, sans clé), actions et ETF américains (Tiingo), actions européennes (EODHD) ; les fiches et les cryptos reprennent ces cours au chargement, sans écraser une saisie.
- **Données rafraîchies au 11/11/2026** (EODHD) : cours des 11 titres, volatilité 1 an et montant moyen échangé (mapping : nouvel axe et filtre « Volatilité 1 an », volume rempli automatiquement), volatilité 1 an des 11 cryptos (axe par défaut du mapping crypto).
- **Recherche universelle** (Ctrl+K ou /) : actions, ETF, cryptos, marchés, dossiers et volets, navigation au clavier.
- **Centre d'alertes** (cloche) : prix d'achat cible atteint, cours périmé (plus de 7 jours), mouvement FOMO or / argent, signal lead / lag ; notifications du navigateur sur demande.
- **Mode simple / expert** : en mode simple, chaque volet montre ses trois premières cartes, le détail se déplie au clic.
- **Guide de premier lancement** en trois étapes.
- **Intégration continue** (`.github/workflows/ci.yml`) : typage, 19 tests unitaires, test de bout en bout de l'interface (`npm run e2e`, 15 parcours) à chaque push.
- Le mapping des entreprises cotées ne s'ouvre que depuis l'Analyse financière.
