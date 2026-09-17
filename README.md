# SportsEnsemble — Aix Sport Local

Site d'informations sportives pour Aix-en-Provence et le Pays d'Aix. Interface en français, adaptée aux ordinateurs et téléphones.

## Démarrer dans VS Code

Prérequis : Node.js 22 ou supérieur (avec npm) et une connexion MongoDB (serveur local ou cluster Atlas). Avec Atlas, **MongoDB Server et Compass n'ont pas besoin d'être installés sur le PC**. Le module Node.js `mongodb` reste nécessaire pour communiquer avec Atlas ; il est installé avec les autres dépendances du projet.

Ouvrir le dossier du projet, puis lancer dans son terminal :

```powershell
npm ci
npm start
```

Ouvrir **http://localhost:9010**. Garder le terminal ouvert. Pour arrêter : Ctrl+C. Sous Windows, **Demarrer.cmd** installe automatiquement les dépendances absentes ou incompatibles, puis démarre le serveur. Internet est nécessaire pour cette installation.

### Premier lancement sur un autre PC avec Atlas

1. Extraire le projet téléchargé depuis GitHub, puis ouvrir le dossier qui contient `package.json` et `Demarrer.cmd`.
2. Copier `.env.example` vers `.env`. Le modèle contient déjà l'adresse de Cluster0 et le nom de base `sportsensemble`. Dans `.env`, remplacer `<UTILISATEUR_ATLAS>` et `<MOT_DE_PASSE_ENCODE>` par les identifiants autorisés pour ce développeur (encoder les caractères spéciaux du mot de passe pour une URI), ou remplacer `MONGODB_URI` par sa chaîne Atlas complète. Les signes `< >` ne doivent pas rester dans la connexion finale. Les vrais identifiants restent uniquement dans `.env`.
3. Dans Atlas, autoriser l'adresse IP publique de ce PC dans **Network Access**. Utiliser un utilisateur de base de données limité à `readWrite` sur `sportsensemble`.
4. Double-cliquer sur **Demarrer.cmd**, ou exécuter `npm ci` puis `npm start` depuis ce dossier.

GitHub distribue le code, sans `node_modules` ni `.env`. Le réglage Atlas effectué sur le PC de l'hôte ne configure donc pas automatiquement les autres PC. Voir [ATLAS.md](ATLAS.md).

Pour simplement consulter le site sans installer Node.js ni configurer Atlas sur chaque ordinateur, il faut héberger aussi le serveur web et partager son adresse HTTPS. Atlas héberge uniquement la base de données.

### Partager un lien de test

Sur le PC configuré avec Atlas et Cloudflare, lancer **`npm run site:remote`** ou **`Partager-Site.ps1`**, puis transmettre l'adresse HTTPS affichée. Les autres ouvrent ce lien et utilisent leur compte SportsEnsemble, sans installation. Le PC hôte doit rester allumé. Voir [SITE-PUBLIC.md](SITE-PUBLIC.md) pour les étapes et les limites.

## Fonctions

- Accueil, actualités, agenda, résultats, clubs et fiches détaillées.
- Filtres par sport et recherche.
- Ajout, modification, brouillons, aperçu, photos et suppression de contenus.
- Export/import JSON des articles.
- Inscription, connexion et déconnexion ; comptes et sessions dans MongoDB.

Les trois articles initiaux sont des exemples. Aucun mot de passe partagé ni compte préconfiguré n'est fourni.

## Comptes et Compass

La connexion par défaut est mongodb://127.0.0.1:27017. Le serveur prépare la base **sportsensemble** et ses collections **users** et **sessions**. Après une inscription, actualiser Compass pour voir le compte. Le mot de passe est stocké sous forme d'empreinte scrypt, jamais en clair.

Voir [COMPTES-MONGODB.md](COMPTES-MONGODB.md) pour la configuration, les limites et les tests. Le fichier `.env.example` fournit le modèle Atlas à compléter dans `.env`, qui est ignoré par Git. Sans connexion configurée, le serveur essaie toujours MongoDB local.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| index.html | Structure, en-tête et pied de page |
| style.css | Présentation et affichage mobile |
| app.js | Pages et gestion des articles locaux |
| core.js | Validation, sports et exemples |
| auth.js | Écrans de connexion, inscription et compte |
| auth.cjs | API d'authentification, mots de passe et sessions |
| server.cjs | Serveur Node.js et connexion MongoDB |
| tests/auth.test.cjs | Tests avec une base MongoDB temporaire |
| maquettes/ | Dessins SVG et aperçus PNG |

## Travail en groupe et limites

GitHub partage le code. Les comptes sont stockés dans le serveur MongoDB configuré. Si chaque personne utilise 127.0.0.1, elle utilise sa propre base locale.

**Les articles et photos restent dans localStorage, dans chaque navigateur.** Ils ne sont pas encore associés aux comptes ni synchronisés entre ordinateurs. L'interface de gestion demande une connexion, mais les données locales restent accessibles à une personne ayant accès au navigateur. Tous les comptes de ce navigateur voient les mêmes articles locaux. La gestion de rôles et les permissions serveur sur les articles restent à développer.

Exportez régulièrement vos articles. Effacer les données du navigateur efface aussi ces contenus. L'import remplace les contenus après confirmation. Les mots de passe et sessions ne sont jamais inclus dans ces exports.

Le serveur est limité à cet ordinateur. Avant une mise en ligne, prévoir HTTPS, une base protégée, le stockage partagé des articles, les permissions, la récupération de mot de passe et les mentions légales. La page Contact reste à compléter.

Le site fonctionne séparément de Penpot. Aucun secret, fichier de base de données ou identifiant de connexion n'est destiné à GitHub. node_modules et .env sont ignorés.

## Vérifications

```powershell
npm run check
npm test
```

Les tests nécessitent MongoDB et utilisent une base temporaire isolée. Ils ne vident pas la base sportsensemble.

## Annuaire des clubs et lieux sportifs
L’onglet Clubs intègre les 546 fiches du classeur fourni : 379 fiches de clubs et 167 de lieux/équipements. Recherche sans accents, filtres, pagination, coordonnées et visuels locaux sont inclus. Les activités multiples d’une structure sont conservées. Les informations du fichier ne sont pas revérifiées individuellement.

Les données partagées sont dans `clubs-data.js`, les visuels dans `assets/clubs/`. Voir `ANNUAIRE.md` pour les sources et la modification des fiches. Cet annuaire fait partie du code du site ; les comptes restent dans MongoDB et les articles ajoutés manuellement restent dans le navigateur.

## Carte interactive
L’onglet **Carte** utilise Leaflet et OpenStreetMap, avec recherche locale et filtres
par type, catégorie et discipline. Les positions précises et approximatives sont
distinguées ; les adresses non résolues restent dans la liste. Voir [CARTE.md](CARTE.md)
pour les limites et la mise à jour des coordonnées. Exécuter npm install après
récupération de cette version, puis npm start.

## Agenda personnel par compte
L’onglet Agenda remplace la liste d’événements par les préférences et clubs de
l’utilisateur connecté. Âge, disciplines et clubs choisis sont enregistrés dans MongoDB.
Voir [AGENDA-PERSONNEL.md](AGENDA-PERSONNEL.md) pour les règles d’âge et les limites
des horaires et tarifs du fichier fourni.

## Ma semaine
L’onglet **Ma semaine** propose une grille hebdomadaire récurrente, des séances
issues des horaires du fichier ou confirmées par l’utilisateur, et un contrôle
des chevauchements côté navigateur et serveur. Le planning est privé et sauvegardé
dans MongoDB. Voir [MA-SEMAINE.md](MA-SEMAINE.md).

## Application Android — Agenda
L’application Android permet de consulter les clubs choisis et le planning du compte,
avec les prix, adresses et itinéraires. Elle conserve une copie chiffrée pour lire le
planning hors connexion. Sources dans `android`, installation et accès à distance
expliqués dans [ANDROID.md](ANDROID.md).
