# Annuaire sportif d’Aix
Source : clubs_sportifs_aix_en_provence_ajouts.xlsx, importé le 15 septembre 2026.
546 fiches : 379 lignes de clubs / structures privées et 167 lignes de lieux / équipements.
Chaque ligne est conservée, y compris les activités différentes d’une même structure.
Les champs d’origine, onglet et numéro de ligne restent disponibles dans chaque fiche.
Les informations et estimations du classeur ne sont pas revérifiées individuellement.
Les fiches sont partagées avec le code dans clubs-data.js, sans dépendance au stockage du navigateur.
Les contenus de clubs ajoutés manuellement continuent à apparaître dans l’annuaire.

## Visuels
Illustrations SVG originales par famille de sport dans assets/clubs.
Elles illustrent une discipline et ne représentent pas une photo des installations.
Logos officiels destinés à identifier les clubs ; droits conservés par leurs propriétaires :
- Provence Rugby : https://www.provencerugby.com/ (wp-content/uploads/2023/07/Logo.svg)
- Pays d’Aix Natation : https://pays-aix-natation.com/contact/
- PAUC : https://www.pauc-handball.com/presentation

## Modification
Modifier les fiches dans clubs-data.js : name, discipline, fields, image.
Les identifiants doivent rester uniques et stables pour conserver les liens.
Pour ajouter une image locale, la placer dans assets/clubs avec un nom en minuscules
(lettres, chiffres et tirets), au format png, jpg, webp ou svg.
Les sites web sont affichés à partir du classeur ; les textes qui ne sont pas des URL
restent du texte. Les adresses servent à construire un lien de recherche sur une carte.
