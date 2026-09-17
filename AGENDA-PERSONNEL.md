# Agenda personnel
L’onglet Agenda permet à chaque utilisateur connecté de :
1. Renseigner son âge et cocher les disciplines souhaitées.
2. Consulter les clubs correspondants, leurs publics, horaires, tarifs et adresses.
3. Ajouter ou retirer des clubs de son agenda.
4. Ouvrir un itinéraire Google Maps vers l’adresse fournie.

Les préférences sont stockées dans sportsensemble.users.agenda :
age (entier 1–120), sports (disciplines), selectedIds (identifiants de clubs).
L’API POST /api/auth/agenda utilise uniquement le compte de la session.
Les mises à jour vérifient l’origine, l’âge, les disciplines et les identifiants.
Aucune date de naissance n’est demandée. L’âge se met à jour manuellement.

Les anciennes données d’événements du navigateur ne sont pas supprimées.
L’âge et les sélections ne sont pas conservés dans localStorage.

## Limites des données
Les horaires et prix restent ceux du classeur fourni, sans validation de disponibilité.
Les règles d’âge explicites et non ambiguës permettent d’écarter les clubs incompatibles.
Les estimations et descriptions complexes sont signalées « à confirmer ».
Les propositions ne constituent pas des créneaux réservables ni un calendrier daté :
les données ne lient pas systématiquement chaque horaire et chaque tarif à une tranche d’âge.
Les prix de plusieurs publics restent affichés avec leur texte d’origine.
Les clubs avec des horaires ou tarifs renseignés sont prioritaires à âge comparable.
Un club choisi reste dans l’agenda quand les préférences changent ; il peut être retiré.
Le bouton d’itinéraire transmet seulement l’adresse publique du club à Google Maps.
L’adresse peut être le siège du club ; consulter la fiche pour le lieu de pratique.

## Vérification
Tests d’isolation de deux comptes dans MongoDB, de persistance après redémarrage,
de rejet des sessions absentes, origines tierces, âges, disciplines et IDs invalides.
Tests des bornes d’âge et de l’encodage du lien Google Maps.
Interface vérifiée avec un profil fictif sur un serveur de test isolé.
