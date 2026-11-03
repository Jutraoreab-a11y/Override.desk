# OVERRIDE.DESK

Station d'analyse institutionnelle en 8 volets, en une seule page HTML autonome (`index.html`). Version 4.1.

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
js/app.js                     navigation, panneau latéral, événements, abonnement
```
