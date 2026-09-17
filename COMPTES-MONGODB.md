# Comptes utilisateurs et MongoDB

## Démarrer dans VS Code

Ouvrir le dossier `SportsEnsemble`, puis son terminal :

```powershell
npm install
npm start
```

Ouvrir **http://localhost:9010/#inscription** pour créer un compte, ou **http://localhost:9010/#connexion** pour se connecter. Ne pas ouvrir directement `index.html` : les comptes nécessitent le serveur Node.js.

MongoDB Server doit fonctionner sur votre ordinateur si vous utilisez la configuration locale. Vous pouvez aussi connecter le projet à MongoDB Atlas : voir [ATLAS.md](ATLAS.md). Compass est l'interface permettant d'explorer la base, pas le serveur lui-même. La connexion locale par défaut est `mongodb://127.0.0.1:27017`. Aucun compte préconfiguré ni mot de passe partagé n'est fourni.

Si le port 9010 est occupé, arrêter l'ancien serveur avec Ctrl+C. Utiliser toujours `localhost:9010`, pas `127.0.0.1:9010` : l'origine doit correspondre à la configuration et le stockage des articles dépend de cette adresse.

## Voir les comptes dans Compass

1. Ouvrir la connexion qui pointe vers `mongodb://127.0.0.1:27017`.
2. Actualiser la liste des bases.
3. Ouvrir **sportsensemble → users**.
4. Après une inscription, un document contient `name`, `email`, `passwordHash` et `createdAt`.

Le champ `passwordHash` est une empreinte scrypt avec un sel aléatoire. Le mot de passe n'est jamais enregistré en clair. Ne modifiez pas ce champ manuellement.

La collection **sessions** contient l'identifiant du compte, l'empreinte du jeton de session et sa date d'expiration. Elle ne contient pas le cookie brut. Les sessions expirent après 7 jours et sont invalidées immédiatement à la déconnexion. MongoDB supprime progressivement les sessions expirées ; l'API refuse leur utilisation dès l'expiration.

Les bases `local`, `admin` et `config` sont réservées au fonctionnement de MongoDB et ne sont pas utilisées par le site.

## Configuration facultative

Les valeurs locales fonctionnent sans fichier `.env`. Pour changer de connexion : copier `.env.example` vers `.env`, puis modifier les valeurs.

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=sportsensemble
PORT=9010
APP_ORIGIN=http://localhost:9010
```

Ne jamais envoyer `.env` sur GitHub si une URI contient des identifiants. Ce fichier et `node_modules` sont ignorés par Git. Chaque membre du groupe installe les dépendances et configure son propre accès MongoDB. `127.0.0.1` désigne sa propre machine, pas celle de l'hôte.

## Périmètre de la fonctionnalité

- Inscription avec nom, e-mail unique normalisé et mot de passe de 12 à 128 caractères.
- Connexion, écran de compte et déconnexion.
- Sessions MongoDB persistantes, cookie HttpOnly et SameSite=Strict, Secure si APP_ORIGIN est HTTPS.
- Vérification de l'origine pour les requêtes de modification, validation côté serveur et limitation des tentatives (20 par adresse IP en 15 minutes, compteur remis à zéro au redémarrage).
- Les API ne retournent jamais les empreintes de mots de passe ou de jetons.

**Les articles restent dans le navigateur et ne sont pas associés aux comptes.** La connexion conditionne l'accès à l'interface de gestion, mais n'est pas une protection des données localStorage contre une personne ayant accès au navigateur. Tous les comptes connectés sur ce navigateur voient les mêmes articles locaux. Il n'y a pas encore de rôles administrateur/lecteur, de permissions serveur pour les articles, de validation d'e-mail ni de récupération du mot de passe.

Le serveur reste limité à cet ordinateur. Pour une utilisation publique, il faudra notamment configurer HTTPS, le serveur MongoDB avec authentification, un stockage partagé des articles et les permissions correspondantes.

## Tests

```powershell
npm run check
npm test
```

Les tests utilisent MongoDB local (ou `TEST_MONGODB_URI`) et une base temporaire nommée `sportsensemble_test_<identifiant aléatoire>`. Ils suppriment seulement cette base de test à la fin. La base `sportsensemble` n'est jamais vidée par les tests.

Les contrôles couvrent l'inscription, l'unicité des e-mails, les injections, les cookies, l'expiration, le redémarrage du serveur, la déconnexion, les origines étrangères, les tentatives excessives et la non-exposition des fichiers sensibles.
