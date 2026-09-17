# Utiliser MongoDB Atlas avec SportsEnsemble

Atlas héberge la base MongoDB. Compass permet de consulter aussi bien cette base en ligne que l'ancienne base locale. Le site et le service Android utilisent déjà la même configuration MongoDB dans `.env`.

## Migration réalisée le 17 septembre 2026

Sur le PC de développement, la base locale a été copiée vers **Cluster0**, dans le projet Atlas **sportsensemble**, base **sportsensemble** : 2 comptes et 3 sessions, avec les préférences de l'agenda et les plannings. Les documents, types BSON et index ont été comparés après la copie. La base locale et une sauvegarde privée ont été conservées.

Le site et le service Android ont été redémarrés avec la connexion Atlas dans `.env`. Une inscription de vérification, la sauvegarde d'un agenda et d'une séance, puis la connexion et la lecture du planning via le service Android HTTPS ont réussi. Le compte de vérification et ses sessions ont ensuite été supprimés ; les deux comptes d'origine restent identiques.

La connexion Atlas et les sauvegardes sont privées et ne sont pas distribuées avec le dépôt. Sur une autre machine, il faut configurer sa propre connexion `.env` et son accès réseau à Atlas. L'utilisateur de base de données actuellement fourni possède le rôle `atlasAdmin` ; pour un déploiement durable, créer un utilisateur d'application limité à `readWrite` sur `sportsensemble`.

## Ce qui est enregistré dans MongoDB

- `sportsensemble.users` : comptes, empreintes de mots de passe, préférences de l'agenda et planning hebdomadaire.
- `sportsensemble.sessions` : sessions de connexion et leurs dates d'expiration.

Les articles et photos ajoutés via le site restent dans le navigateur (localStorage). L'annuaire des clubs et les coordonnées de la carte sont des fichiers du projet. Ils ne sont pas déplacés par une migration MongoDB.

## Préparer le cluster existant

1. Dans Atlas, ouvrir le projet et le cluster destinés à SportsEnsemble.
2. Utiliser un utilisateur **de base de données**, distinct du compte de connexion au site Atlas. Pour le serveur de l'application, le rôle `readWrite` sur la seule base `sportsensemble` suffit. Le mot de passe de cet utilisateur reste privé.
3. Dans **Network Access**, autoriser l'adresse IP publique de la machine qui héberge le serveur. Si cette adresse change (nouveau Wi-Fi, partage de connexion), mettre cette entrée à jour. Il n'est pas nécessaire d'autoriser les adresses IP des téléphones : ils se connectent au service Android, pas directement à MongoDB.
4. Dans **Connect → Drivers → Node.js**, récupérer la chaîne de connexion. Conserver TLS et la vérification des certificats. Ne pas utiliser une ouverture à toutes les adresses (`0.0.0.0/0`) pour résoudre un problème de connexion.

La documentation MongoDB demande le rôle `Atlas admin` pour une restauration avec `mongorestore`. Si cet outil est utilisé, le compte de migration doit être distinct du compte limité utilisé par l'application ; ses droits temporaires sont à retirer après migration.

## Migrer les données existantes

Changer uniquement l'adresse MongoDB ne transfère pas les comptes.

1. Tester l'accès au cluster et vérifier que la base cible `sportsensemble` est vide. Si elle contient déjà des données, préparer leur rapprochement avant toute copie ; ne pas les écraser.
2. Arrêter temporairement le serveur du site et le service Android pour éviter des modifications pendant la copie.
3. Vérifier la compatibilité des versions MongoDB source et cible (même version majeure ou même version de compatibilité). Sauvegarder uniquement `sportsensemble` avec `mongodump` (archive BSON compressée), puis restaurer cette archive avec la même version de `mongorestore`. Les bases système `admin`, `local` et `config` ne font pas partie du projet.
4. Conserver les identifiants BSON, les dates et les empreintes de mots de passe. Vérifier les documents ainsi que les index : e-mail unique, jeton de session unique et expiration automatique des sessions.
5. Une fois la copie vérifiée, configurer `.env` et redémarrer les deux serveurs. Vérifier la connexion d'un compte existant, son agenda et son planning.

Les sauvegardes privées sont à placer dans `.private/mongodb-backups/`, un dossier ignoré par Git. Elles contiennent des données personnelles et doivent rester privées. Ne pas supprimer la base locale après la copie. Si la base Atlas reçoit de nouvelles modifications, un retour vers l'ancienne base locale demande de récupérer ces changements au préalable.

## Configurer le projet

### Sur un nouveau PC

Le téléchargement GitHub ne contient ni les dépendances `node_modules`, ni le fichier privé `.env`. Installer Node.js 22 ou supérieur, puis lancer `Demarrer.cmd` : ce lanceur installe les dépendances absentes avant de démarrer le site. Dans un terminal ouvert dans le dossier contenant `package.json`, les commandes équivalentes sont `npm ci` puis `npm start`.

L'erreur **Cannot find module 'mongodb'** signifie que le pilote Node.js n'est pas installé. Elle survient avant toute tentative de connexion à Atlas. **MongoDB Server et Compass ne sont pas nécessaires avec Atlas**, mais le pilote installé par npm est nécessaire au serveur du site.

Chaque développeur doit aussi configurer sa propre connexion privée `.env` et faire autoriser l'adresse IP publique de son PC dans Atlas. Un visiteur d'un site hébergé n'a pas besoin de ces réglages : il utilise seulement son navigateur.

### Connexion privée

Copier `.env.example` dans `.env` si ce dernier n'existe pas. Dans `.env`, remplacer seulement `MONGODB_URI` par la connexion fournie par Atlas ; conserver :

```dotenv
MONGODB_DB=sportsensemble
PORT=9010
APP_ORIGIN=http://localhost:9010
```

Le nom de base reste `sportsensemble`, quel que soit le nom du cluster. Les caractères spéciaux du nom d'utilisateur ou du mot de passe doivent être encodés dans l'URI (encodage pour cent).

Ne jamais coller l'URI contenant le mot de passe dans le code, une conversation, le navigateur du site ou l'application Android. `.env` est ignoré par Git. Les variables déjà définies dans l'environnement du terminal ont priorité sur le fichier `.env` ; vérifier qu'une ancienne `MONGODB_URI` ne force pas encore la base locale.

Le serveur du site (`npm start`) et le service Android (`npm run mobile:start` ou `npm run mobile:remote`) chargent `.env` au démarrage. Il faut les redémarrer pour appliquer le changement. Relancer `mobile:remote` peut changer l'adresse temporaire Cloudflare ; dans ce cas mettre à jour l'adresse du serveur dans l'application et son QR de téléchargement.

## Consulter Atlas dans Compass

Ajouter une nouvelle connexion Compass avec la chaîne Atlas puis ouvrir `sportsensemble → users` ou `sessions`. Garder l'ancienne connexion locale permet de consulter la copie de départ. Compass peut être fermé : le site communique directement avec Atlas.

## Ce qui reste hébergé sur le PC

Atlas héberge uniquement la base. Le serveur du site et le service Android tournent toujours sur le PC. Pour que l'application fonctionne avec le PC éteint, il faut aussi héberger le serveur Node.js en ligne avec HTTPS.

Les tests du projet continuent d'utiliser la base MongoDB locale par défaut et une base temporaire isolée. Ne pas leur donner les identifiants de la base de production.

## Documentation officielle

- [Connexion à un cluster Atlas](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/)
- [Migration avec mongodump et mongorestore](https://www.mongodb.com/docs/atlas/import/mongorestore/)
- [Comportement et droits de mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/mongorestore-behavior-access-usage/)
