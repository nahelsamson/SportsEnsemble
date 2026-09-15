# SportsEnsemble — Aix Sport Local

Premier site local d'informations sportives pour Aix-en-Provence et le Pays d'Aix. Interface en français, adaptée aux ordinateurs et aux téléphones.

## Démarrer

Prérequis : Node.js 22 ou supérieur. Aucune bibliothèque supplémentaire à installer.

```sh
npm start
```

Ouvrir **http://localhost:9010**. Garder le terminal ouvert. Sur Windows, vous pouvez aussi double-cliquer sur **Demarrer.cmd**. Pour arrêter : Ctrl+C dans le terminal.

## Fonctionnalités

- Accueil, actualités, agenda, résultats, clubs et fiches détaillées.
- Filtres par sport et recherche.
- Ajout et modification des contenus, brouillons, aperçu et suppression avec confirmation.
- Photos JPEG, PNG et WebP, réduites automatiquement.
- Liens externes vers les sources.
- Sauvegarde dans le navigateur, export et import JSON.

Les trois articles initiaux sont des exemples, pas des actualités réelles.

## Organisation des fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Structure, en-tête et pied de page |
| `style.css` | Présentation et adaptation aux petits écrans |
| `app.js` | Pages, navigation et gestion des contenus |
| `core.js` | Validations, sports et exemples |
| `server.cjs` | Serveur local, sans dépendances externes |
| `Demarrer.cmd` | Lanceur Windows |
| `LISEZ-MOI.md` | Guide d'utilisation détaillé |

## Importer dans votre organisation GitHub

Créer un dépôt dans l'organisation choisie, puis ajouter **le contenu de ce dossier à la racine du dépôt**. Les autres membres pourront récupérer ce code et lancer `npm start` sur leur ordinateur. Rien n'est envoyé à GitHub automatiquement et aucun déploiement n'est configuré.

## Limites de cette première version

Les contenus sont stockés dans `localStorage`, propre à chaque navigateur et à chaque adresse. **GitHub partage le code, pas les articles saisis dans le navigateur.** Les articles et photos personnels ne sont pas inclus dans ce dossier. Pour les transférer, utilisez « Gérer les contenus → Exporter une sauvegarde », puis importez le fichier dans l'autre navigateur.

L'espace de gestion n'est pas protégé par un mot de passe. Ce projet n'a pas encore de serveur de données partagé ni d'authentification. Il faut les ajouter pour une gestion collective des articles. Le serveur fourni écoute uniquement sur l'ordinateur local. Cette version ne doit pas être présentée comme une administration sécurisée en ligne.

Exporter régulièrement une sauvegarde : effacer les données du navigateur supprime également les contenus locaux. L'import remplace les contenus après confirmation.

Le site fonctionne séparément de Penpot. Aucune clé Docker, configuration Penpot, base de données ou information de connexion n'est incluse.

Avant une publication publique, compléter la page Contact, les mentions légales, la politique de confidentialité et choisir une licence adaptée au projet.
