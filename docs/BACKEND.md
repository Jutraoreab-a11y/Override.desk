# OVERRIDE.DESK : backend « Plug & Play » (v7)

Le front reste une page statique. Sans backend joignable, il tourne en **mode simulation** (badge 🔴 « Déconnecté (mode simulation) ») avec les données d'exemple et les saisies locales. Dès qu'un backend répond et qu'une session est ouverte, il passe en **flux live** (badge 🟢 « Connecté (flux live) ») : comptes de trading, positions, liquidités, PnL et séries macro remontent automatiquement au chargement, puis à chaque clic sur « Recalculer » ou « Actualiser les flux ».

Architecture : fonctions serveur Vercel (Node 20, TypeScript) dans `api/v1/`, base Supabase (Postgres + Auth + RLS), tâches planifiées Vercel.

## 1. Mise en service

1. **Supabase** : créer un projet, puis exécuter dans l'ordre les scripts de `supabase/migrations/` (éditeur SQL ou `supabase db push`) : `20261103000000_override_desk.sql`, puis `20261103180000_instruments_universe.sql` (instruments du sélecteur universel), puis `20261103200000_team_versions_nav.sql` (espaces partagés, rôles, versions signées, journal d'audit, valorisations quotidiennes). Les scripts sont rejouables.
2. **Auth** : Supabase > Authentication > Providers > Email activé (connexion par lien magique). Ajouter l'URL du site dans *Redirect URLs*.
3. **Vercel** : importer le dépôt GitHub, framework « Other », aucune commande de build. Renseigner les variables d'environnement ci-dessous, puis déployer.
4. **Front** : ouvrir le site déployé, cliquer sur le badge en haut à droite, saisir son e-mail, suivre le lien reçu. Si le front est hébergé ailleurs que le backend, renseigner « Adresse du backend » dans ce même panneau et définir `ALLOWED_ORIGIN` côté Vercel.

En local : `npm install`, `npm run typecheck`, `npm test`.

## 2. Variables d'environnement

| Variable | Rôle | Obligatoire |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Projet Supabase (la clé anon est publique et transmise au navigateur par `/api/v1/status`) | oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Écritures des connecteurs. **Secrète**, uniquement sur Vercel | oui |
| `ENCRYPTION_KEY` | Chiffrement AES-256-GCM des identifiants courtiers (32 octets en base64 : `openssl rand -base64 32`). Ne jamais la changer sans rechiffrer | oui |
| `CRON_SECRET` | Authentifie les tâches planifiées Vercel | oui |
| `SIGNING_KEY` | Signature HMAC-SHA256 des versions validées (32 caractères minimum). La changer invalide la vérification des signatures existantes | pour la validation |
| `EIA_API_KEY` | Brent, WTI spot et futures WTI M1 à M3 (EIA v2) | pour la macro |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Parseur IA de pages de marché | pour l'IA |
| `STT_API_BASE`, `STT_API_TOKEN` | API SocialTraderTools (mode « pull ») | optionnel |
| `IBKR_FLEX_BASE` | Hôte du Flex Web Service IBKR | optionnel |
| `ALLOWED_ORIGIN` | Origine autorisée en CORS si le front est servi ailleurs | optionnel |

## 3. Points d'accès

Authentification : jeton Supabase de l'utilisateur (`Authorization: Bearer <access_token>`), sauf mention contraire. Toutes les tables sont protégées par RLS (`user_id = auth.uid()`).

| Méthode et chemin | Rôle |
|---|---|
| `GET /api/v1/status` | État du backend et des connecteurs (public, sans secret) |
| `GET/POST/DELETE /api/v1/trading/accounts` | Comptes MT4, MT5 ou STT. Le POST renvoie **une seule fois** la clé d'EA (seul son hachage SHA-256 est stocké) |
| `POST /api/v1/trading/mt-sync` | Webhook de l'EA MetaTrader. En-tête `X-Override-Key`. Met à jour `trading_accounts`, remplace `active_trades`, ajoute à `trade_history` |
| `POST /api/v1/trading/stt-sync` | Webhook SocialTraderTools (même clé `X-Override-Key`) |
| `GET /api/v1/trading/stt-sync` | Lecture « pull » de l'API SocialTraderTools (utilisateur ou tâche planifiée) |
| `GET /api/v1/integrations/brokers?action=catalog` | Catalogue des courtiers et des champs requis (public) |
| `GET/POST/DELETE /api/v1/integrations/brokers` | Liste des connexions (jamais les identifiants), enregistrement chiffré + synchronisation (`action: save` ou `sync`), suppression |
| `GET /api/v1/portfolio/pnl?start_date=AAAA-MM-JJ&end_date=AAAA-MM-JJ` | PnL latent et réalisé en EUR par portefeuille et par classe, risque (SL, TP, RR) |
| `GET /api/v1/macro/commodities?from=…&to=…&series=…` | Séries alignées : prix, spread Brent-WTI, base, Z-score 60 j, corrélation CNH-Brent 20 j, ratio or/argent |
| `POST /api/v1/macro/commodities` | Ajout de cotations pour tout instrument du sélecteur universel : `BRENT`, `WTI`, `GOLD`, `SILVER`, `COPPER`, `NATGAS`, `EURUSD`, `GBPUSD`, `USDJPY`, `USDCNH`, `AUDUSD`, `USDCAD`, `SPX`, `NDX`, `DJI`, `DAX`, `CAC`, `NKX`, et les actions sous la forme `STK:<ticker>` (ex. `STK:AAPL`). Elles remontent automatiquement dans le graphique du volet 5 |
| `GET/POST /api/v1/team/workspaces` | Espaces partagés : création, invitation par e-mail (rattachée à la connexion de la personne), rôles admin / analyste / valideur / lecteur, au moins un administrateur |
| `GET/POST /api/v1/team/versions` | Versions partagées : création (empreinte SHA-256 du JSON canonique), soumission, validation signée (HMAC serveur) ou rejet, vérification d'intégrité. Règle des quatre yeux : l'auteur ne valide jamais sa version ; une version validée est figée en base |
| `GET/POST /api/v1/team/audit` | Journal d'audit serveur en ajout seul (forçages, changements de statut, membres) |
| `GET/POST /api/v1/portfolio/nav` | Valorisations quotidiennes et apports / retraits, base du TWR et du MWR |
| `POST /api/v1/ai/market-parser` | Lecture d'une page par l'IA. Chaque valeur est stockée dans `ai_sources` avec `source_url`, `source_name`, `timestamp_retrieved`, `confidence_score` |

Tâches planifiées (`vercel.json`, en-tête `Authorization: Bearer $CRON_SECRET`) : ingestion macro du lundi au vendredi à 21 h 30 UTC (EIA, plus EUR/USD, GBP/USD, USD/JPY, AUD/USD et USD/CAD déduits des taux de référence BCE), resynchronisation de tous les courtiers chaque jour à 6 h UTC.

## 4. MetaTrader 4 et 5

1. Dans OVERRIDE.DESK, volet Suivi > Comptes de trading > « Lier mon compte de trading » : saisir le numéro de compte et le serveur, puis « Générer la clé d'EA ». Copier la clé (elle ne sera plus affichée).
2. Télécharger `mt/OverrideSync.mq5` (ou `.mq4`), le copier dans `MQL5/Experts` (ou `MQL4/Experts`) et le compiler dans MetaEditor.
3. MetaTrader > Outils > Options > Expert Advisors : cocher « Autoriser WebRequest » et ajouter l'adresse du site.
4. Attacher l'EA à n'importe quel graphique, renseigner `InpUrl` (`https://<site>/api/v1/trading/mt-sync`) et `InpKey`. L'EA envoie le compte, les positions et l'historique récent toutes les 30 s (`InpIntervalSec`), avec 30 jours d'historique (`InpHistoryDays`).

Les heures transmises sont celles du serveur du courtier, pas l'UTC.

## 5. Courtiers

| Courtier | Méthode | Identifiants |
|---|---|---|
| Binance | API REST signée HMAC-SHA256 | clé et secret API **en lecture seule** |
| Kraken | API REST signée HMAC-SHA512 | clé et secret API (droit « Query Funds ») |
| OKX | API v5 signée | clé, secret, passphrase (lecture seule) |
| Coinbase | Advanced Trade, jeton JWT ES256 | nom de clé CDP et clé privée EC |
| Saxo | OpenAPI | jeton OAuth (expire en 24 h : prévoir le rafraîchissement) |
| Interactive Brokers | Flex Web Service | jeton Flex et n° de requête |
| Ledger | API publique Blockstream | adresses BTC publiques |
| Passerelle personnalisée | GET JSON | adresse et jeton |
| XTB, Trade Republic, DEGIRO, Boursorama… | pas d'API publique | import de relevé CSV |

Les identifiants sont chiffrés côté serveur avant stockage. La colonne `credentials_enc` n'est lisible par aucun utilisateur (droits SQL retirés) : seule la clé de service y accède.

Format attendu d'une passerelle personnalisée :

```json
{ "positions": [ { "sym": "IWDA", "name": "iShares MSCI World", "cls": "ETF", "qty": 100, "pru": 80, "px": 95, "ccy": "EUR", "sl": 85, "tp": 110 } ],
  "cash": [ { "currency": "EUR", "amount": 3500 } ] }
```

## 6. Override et données live

Le crayon ✏️ force une valeur partout dans l'interface. Quand le flux live renvoie une valeur pour une ligne forcée, la valeur live la remplace et un message l'indique (« 1 valeur forcée remplacée par les données live »). Pour garder une valeur figée, repasser la ligne en saisie manuelle.

## 7. Tests

- `npm test` : 15 tests unitaires (chiffrement, signatures Binance et Kraken comparées aux exemples officiels de leur documentation, signatures OKX et Coinbase, adaptateurs Binance, Kraken et IBKR, séries macro, validation du webhook MetaTrader, correspondance SocialTraderTools, score de confiance IA, risque RR, paires de devises déduites de la BCE).
- Test d'intégration des espaces partagés (21 contrôles) : invitation, rôles, quatre yeux, signature et vérification, version validée figée même pour la clé de service, écriture directe refusée au navigateur, journal en ajout seul, valorisations isolées par utilisateur, dernier administrateur protégé.
- Test d'intégration effectué contre Postgres 16 et PostgREST 12 : isolation RLS entre utilisateurs, identifiants non lisibles, clé d'EA invalide refusée (403), conversions EUR, plage de dates invalide refusée (400), appels sans session refusés (401).

Non testé en conditions réelles : compilation des EA dans MetaTrader, API SocialTraderTools, comptes Saxo, IBKR, Coinbase et OKX réels.
