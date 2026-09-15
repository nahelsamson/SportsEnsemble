# Aix Sport Local — site local fonctionnel

## Ouvrir

Double-cliquez sur **Demarrer.cmd**, gardez sa fenêtre ouverte, puis visitez **http://localhost:9010**. Node.js doit être installé (déjà détecté sur ce PC). Ce serveur ne modifie pas Penpot, qui utilise le port 9001.

Alternative : ouvrir index.html directement. Le stockage lié aux fichiers locaux dépend du navigateur. Préférez le lanceur et utilisez toujours la même adresse (localhost:9010) et le même navigateur pour retrouver vos données.

## Fonctions

- Navigation entre accueil, actualités, agenda, résultats, clubs, fiches détaillées et gestion.
- Filtres par sport, recherche, liens externes vers une source.
- Création, modification, aperçu, brouillon, affichage et suppression de contenus.
- Photos JPEG/PNG/WebP réduites automatiquement, dates, lieux, clubs et scores.
- Sauvegarde dans le navigateur. Export/import JSON depuis « Gérer les contenus ».
- Affichage adapté aux téléphones et ordinateurs.

Les trois articles initiaux sont des exemples. Aucun résultat sportif réel n'est inventé.

## Limites importantes

Ce code est un site autonome, pas une extension de Penpot. Les SVG restent des maquettes séparées.

Les données sont conservées avec localStorage dans ce navigateur : pas de base partagée, de synchronisation entre ordinateurs ni de connexion utilisateur. L'administration n'a pas de mot de passe. « Rendre visible » signifie visible dans cette copie locale, pas publié sur Internet. N'exposez pas cette version comme un espace de gestion protégé. Pour collaborer sur les mêmes données, il faudra une version serveur avec authentification et stockage partagé.

Le navigateur a un quota de stockage. Exportez régulièrement une sauvegarde, surtout avant un import ou une suppression. Effacer les données du navigateur efface aussi les contenus. L'import remplace les contenus après confirmation.

## Personnaliser

- index.html : logo et navigation.
- style.css : couleurs et mise en page.
- app.js : pages, champs et textes. La page Contact est à compléter.
- core.js : sports, validations, exemples et format de sauvegarde.
- server.cjs : petit serveur local sans dépendances supplémentaires.

Les boutons de catégories, d'administration et de navigation fonctionnent. Les liens de source apparaissent seulement si vous renseignez une URL valide.
