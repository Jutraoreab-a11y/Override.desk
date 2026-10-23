# OVERRIDE.DESK

Terminal institutionnel 3-en-1 + suivi de portefeuille, en une seule page HTML autonome (`index.html`).

## Volets
1. **Business plan** : structure canonique en 10 sections, étude de marché (historique 5 ans, saisonnalité, géographie, personas), concurrence et parts de marché, prix psychologique (Van Westendorp), PESTEL / SWOT, prévisionnel mensuel (compte de résultat, bilan, plan de financement, budget de trésorerie), alertes de cohérence.
2. **Analyse financière** : rapport sur un titre coté (historique 5 ans, scoring, tamis 4 filtres, DCF + multiples, zones d'achat / stop-loss / take-profit) avec décision POSITIVE ou NÉGATIVE.
3. **Sélecteur** : tamis des 4 filtres, double mapping (secteurs puis entreprises du secteur cible), grille fondamentale et equity story.
4. **Suivi & placements** : compare les résultats publiés à la performance des lignes du portefeuille.

Mode **Override** sur tous les volets, recalcul, export PDF.

## Données
- Titres cotés : comptes publiés MarketScreener (exercices 2021-2025), cours des 19-20/10/2026. ROIC non fourni par la source.
- Business plan, dossiers du Sélecteur et portefeuille : données d'exemple, à remplacer.

## Lancer
Ouvrir `index.html` dans un navigateur, ou déployer le dossier tel quel (Vercel, Netlify, GitHub Pages). Graphiques : TradingView Lightweight Charts 4.1.3 (jsDelivr).

## Structure du code
```
index.html                    coquille de l'application (barre, menu, panneaux)
css/style.css                 thème sombre, mise en page, impression PDF
js/data.js                    référentiels, 11 titres cotés (comptes publiés), données d'exemple
js/core.js                    état, sauvegarde locale, champs Override, graphiques SVG et Lightweight Charts
js/business-plan.js           volet 1 : moteur prévisionnel mensuel, étude de marché, alertes de cohérence
js/analyse-financiere.js      volet 2 : scoring, tamis, DCF, multiples, décision POSITIVE / NÉGATIVE
js/selecteur.js               volet 3 : tamis 4 filtres, double mapping, grille fondamentale
js/suivi-portefeuille.js      volet 4 : résultats publiés vs performance des lignes
js/app.js                     navigation, panneau latéral, barre d'état, événements, abonnement
```
Les scripts sont chargés dans cet ordre, sans étape de build.
# Override.desk
