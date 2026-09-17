# Carte Leaflet — Aix et alentours

Ouvrir http://localhost:9010/#carte après npm install puis npm start.
Leaflet 1.9.4 est installé localement et servi par le serveur du projet.

## Utilisation
- Recherche par nom, adresse ou discipline, sans distinction d’accents.
- Filtres combinables : type de structure, catégorie et discipline.
- Cliquer sur un repère ou « Repérer sur la carte » pour ouvrir les informations.
- Les fiches partageant une position sont regroupées dans un repère numéroté.
- « Ouvrir la fiche » donne accès aux coordonnées et informations de l’annuaire.
- « Voir les résultats » ajuste la vue aux résultats ; « Recentrer sur Aix » rétablit la vue initiale.
- Les résultats sans position restent consultables dans la liste.

## Localisation et limites
546 fiches sont prises en compte. Au 16 septembre 2026, 472 ont une position proposée
par l’IGN et 74 restent à préciser. Une position reconnue automatiquement ne constitue
pas une vérification sur place. Les positions par rue, quartier, commune ou équipement
sont signalées comme indicatives. Les adresses peuvent désigner le siège du club,
pas son lieu de pratique. Les informations de fermeture du classeur restent dans les fiches.
Les lignes qui correspondent à un réseau de plusieurs piscines ne désignent pas un lieu unique.

Le géocodage transmet uniquement les adresses publiques ou noms des structures au
service IGN. Aucun compte, e-mail, mot de passe ou position personnelle n’est transmis.
Les résultats sont enregistrés dans map-data.js : la recherche dans le site ne fait
aucun appel au géocodeur.

## Régénérer les positions
1. node scripts/geocode-clubs.cjs
2. node scripts/geocode-places.cjs
Les caches scripts/geocode-cache.json et scripts/poi-cache.json évitent les recherches
identiques. Les requêtes d’adresses sont nettoyées, limitées à trois traitements simultanés.
Les correspondances trop faibles ou incompatibles sont rejetées.
La seconde commande recherche les équipements nommés manquants dans la BD TOPO.
Vérifier les positions après modification des données.

Les clubs ajoutés manuellement restent présents dans la liste ; une adresse identique
à une adresse importée réutilise sa position. Une nouvelle adresse doit être intégrée
au fichier partagé et géocodée pour obtenir un repère.

## Sources et services
- Leaflet : https://leafletjs.com/ (licence BSD-2-Clause, fournie par le paquet npm).
- Géocodage IGN, BAN et BD TOPO : https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/geocodage/
- OpenStreetMap : https://www.openstreetmap.org/copyright
- Usage des tuiles : https://operations.osmfoundation.org/policies/tiles/

Le fond OpenStreetMap nécessite Internet et charge seulement les tuiles visibles,
sans téléchargement de masse ni préchargement hors ligne. Attribution visible,
politique de référent conservée. En cas d’indisponibilité, un message apparaît et
la liste reste utilisable. Le service public de tuiles ne garantit pas sa disponibilité.
