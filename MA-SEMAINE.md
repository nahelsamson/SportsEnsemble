# Ma semaine
Onglet #semaine : grille lundi–dimanche, heures verticales et séances cliquables.
Il s’agit d’une semaine type récurrente, pas d’un calendrier de réservations datées.
Les flèches changent les dates affichées ; les séances se répètent toutes les semaines.

- Choisir uniquement un club ajouté avec « Ajouter à mon agenda ». Cocher une discipline ne sélectionne pas tous ses clubs.
- Choisir une plage avec jour, début et fin identifiés dans les horaires du fichier.
- Le jour, le début et la fin sont ceux du créneau choisi, sans saisie libre ni modification de durée.
- Sans créneau complet (jour, début et fin) : saisir un créneau confirmé avec le club. Si les créneaux connus sont tous incompatibles avec l’âge, aucun ajout libre n’est proposé.
- Confirmer l’adéquation du créneau au cours et à l’âge.
- Retirer une séance en cliquant sur son bloc dans la grille.
- Google Maps utilise l’adresse du fichier (parfois siège du club).

Les chevauchements partiels, inclusions et doublons sont refusés dans l’interface
et par le serveur. Deux séances qui se touchent sans se chevaucher sont permises :
le temps de trajet doit être prévu par l’utilisateur.
Les plages d’ouverture ne sont pas présentées comme des cours confirmés.
Les tranches d’âge numériques explicites présentes dans le libellé d’un créneau
sont contrôlées. Les autres publics restent à confirmer.

## Stockage
users.weeklyPlan : revision et sessions.
Une séance contient id, clubId, day (lundi=0), start/end (minutes depuis minuit),
source et soit proposalKey soit confirmed.
Le serveur valide jours, heures, clubs, propositions et conflits.
Le compte est déterminé par la session ; aucune identité envoyée par le client n’est utilisée.
La révision est vérifiée avec une mise à jour atomique MongoDB :
deux onglets ne peuvent pas écraser silencieusement leur planning.
Les préférences de sports et le planning sont stockés séparément :
modifier ses sports ne supprime pas les séances déjà planifiées.

Les week-cores sont partagés entre navigateur et serveur.
Tests : conflits, limites, propositions, âge, isolation, sauvegarde,
redémarrage et concurrence. Interface vérifiée dans un environnement fictif isolé.

Les séances déjà enregistrées restent conservées et peuvent être retirées, même si le club est ensuite désélectionné. Les nouvelles séances doivent respecter la sélection actuelle et les horaires exacts. Ces règles sont imposées dans le navigateur et sur le serveur.
