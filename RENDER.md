# GitHub Pages + Render + Atlas

Le site public reste à https://nahelsamson.github.io/SportsEnsemble/. Render héberge son API Node.js ; Atlas conserve les comptes, leurs sports, séances et sessions. Aucun ordinateur personnel ne doit rester allumé.

## Configuration de Render

Créer un Web Service Node gratuit, région Frankfurt, dépôt `https://github.com/nahelsamson/SportsEnsemble`, branche `main` :

- Installation : `npm ci --omit=dev --no-audit --no-fund`.
- Démarrage : `npm start`.
- Vérification de disponibilité : `/healthz` (contrôle aussi la connexion MongoDB).
- Variables : `NODE_VERSION=24.14.1`, `NODE_ENV=production`, `MONGODB_DB=sportsensemble`, `FRONTEND_ORIGINS=https://nahelsamson.github.io`.
- `MONGODB_URI` : chaîne Atlas complète, exclusivement dans les variables privées du service. Ne pas ajouter `.env` à GitHub.
- Ne pas renseigner le `PORT=9010` ni l'adresse locale `APP_ORIGIN` : Render fournit son port et son adresse HTTPS. Le serveur écoute sur `0.0.0.0` sur Render et conserve son accès local habituel sur le PC.

Ajouter les plages IP sortantes du service Render dans Atlas > Network Access. Elles sont indiquées dans Render > Connect > Outbound. Les IP des visiteurs ne doivent pas être ajoutées. Les autres règles Atlas restent utiles pour les outils locaux.

Dans `site-config.js`, renseigner uniquement l'adresse HTTPS publique du service Render, sans barre finale. Aucune clé ou connexion MongoDB dans ce fichier : il est téléchargé par les navigateurs. GitHub Pages conserve ses fichiers et son adresse ; les autres accès au site continuent d'utiliser leur propre serveur.

## Connexion des utilisateurs

Les appels depuis GitHub Pages sont autorisés pour cette origine précise. Ils utilisent une session dans l'onglet du navigateur, transmise dans un en-tête HTTPS, pour fonctionner lorsque les cookies tiers sont bloqués. L'actualisation conserve la connexion ; fermer l'onglet peut demander de se reconnecter. Se déconnecter invalide la session dans Atlas. Les accès locaux et l'application Android conservent leurs cookies habituels.

L'API vérifie le compte à chaque requête. Les sessions distantes sont limitées à l'origine autorisée. Les mots de passe sont hachés ; les jetons de session sont stockés sous forme d'empreinte dans Atlas.

## Mises à jour et limites

Un push dans `main` met à jour GitHub Pages selon ses réglages de publication. Pour Render, le workflow `.github/workflows/render.yml` installe les dépendances, vérifie le code, exécute les tests avec une base MongoDB temporaire puis demande le déploiement du commit exact. Le déclencheur est conservé dans le secret GitHub Actions `RENDER_DEPLOY_HOOK_URL`, jamais dans les fichiers publics. Suivre les résultats dans GitHub > Actions puis Render > Deploys. Un test échoué empêche le déploiement du serveur ; GitHub Pages possède sa propre publication.

L'offre Render gratuite se met en veille après 15 minutes sans trafic et peut prendre environ une minute pour redémarrer. Le navigateur attend jusqu'à 90 secondes avant de proposer de réessayer. Les comptes et plannings restent sauvegardés dans Atlas lors d'un redémarrage ou déploiement. Les articles et photos saisis restent propres à chaque navigateur : cet hébergement n'en fait pas un stockage partagé.

La bibliothèque Leaflet et sa licence sont livrées dans `vendor/` pour que la carte fonctionne aussi dans le sous-dossier GitHub Pages. Les tests vérifient la connexion sans cookies tiers, l'isolation des comptes, la sauvegarde du planning, les origines refusées et la déconnexion.

Documentation : [Render et Atlas](https://render.com/docs/connect-to-mongodb-atlas), [limites gratuites](https://render.com/docs/free).

## Service du projet

- API : https://sportsensemble-api.onrender.com
- Identifiant Render : `srv-dam2537qj5pc73bidpdg`.
- Plages sortantes constatées lors de la configuration : `74.220.51.0/24` et `74.220.59.0/24`. Ces réseaux sont partagés par les services Render de la région ; vérifier la liste actuelle dans Render avant un changement.
