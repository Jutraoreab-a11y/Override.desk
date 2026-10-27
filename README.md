# OVERRIDE.DESK

Station d'analyse institutionnelle en 7 volets, en une seule page HTML autonome (`index.html`). Version 4.0.

## Volets
1. **Business plan** :
   - fiche de renseignements obligatoire, avec un indicateur de complétude ;
   - executive summary qui dit explicitement ce que l'on vend, à qui, le business model exact et l'avantage injuste ;
   - étude de marché avec un périmètre au choix (pays, continent, UE ou monde) : historique sur 5 ans, saisonnalité, repères financiers du secteur, clients cibles par région et par ville ;
   - 4P, prix psychologique, concurrence, Porter, PESTEL et SWOT ;
   - prévisionnel mensuel et alertes de cohérence.
2. **Analyse financière** : rapport sur un titre coté avec une décision POSITIVE ou NÉGATIVE.
3. **Sélecteur & mapping** :
   - filtre temporel : un mois, une année ou une période sur mesure ;
   - tamis des 4 filtres et double mapping ;
   - grille fondamentale et equity story.
4. **Suivi & placements** :
   - comparaison des résultats publiés avec la performance des lignes ;
   - liaison du compte MetaTrader 5, par import du rapport ou par l'API MetaApi ;
   - lecture croisée entre le compte MT5 et le portefeuille.
5. **Commodities & flows** : Brent et WTI réunis, Or, Argent. Deux vues : pression et approvisionnement, puis confirmation macro.
6. **Calculateur de position** :
   - taille en lots selon le risque, la distance au stop, la taille du contrat et le change ;
   - marge au levier réglementaire ESMA ;
   - contrôles du plan de risque ;
   - simulation de Monte-Carlo.
7. **Journal de trading** :
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
js/app.js                     navigation, panneau latéral, événements, abonnement
```
