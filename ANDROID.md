# SportsEnsemble Agenda — Android

## Télécharger l’application

Page permanente et QR code :
**https://nahelsamson.github.io/SportsEnsemble/application/**

APK courant :
**https://github.com/nahelsamson/SportsEnsemble/releases/latest/download/SportsEnsemble-Agenda.apk**

Le QR code (`application/qr-code.png`, avec une version SVG pour l’impression) contient
uniquement l’adresse de la page permanente. Il n’a pas de date d’expiration. Il reste
utilisable tant que le dépôt et GitHub Pages conservent cette adresse. Le bouton de
la page télécharge l’APK de la dernière version GitHub publiée avec ce nom de fichier.
Ne pas remplacer le QR à chaque version : conserver la page et mettre le fichier à jour.

L’application nécessite **Android 8 ou plus récent**. Ouvrir l’APK téléchargé sur le
téléphone et, si Android le demande, autoriser ce navigateur à installer l’application.
La distribution se fait hors du Play Store. Aucun compte GitHub n’est nécessaire.

## Utilisation

- Serveur préconfiguré : `https://sportsensemble-api.onrender.com`.
- Se connecter avec le même e-mail et mot de passe que sur le site.
- Consulter **Ma semaine** et **Mes sports**, puis les adresses, tarifs et itinéraires Maps.
- Modifier les sports et séances sur le site ; **Actualiser** récupère ces changements.
- Le PC de développement peut être éteint : Render et Atlas assurent la connexion.
- Après une période d’inactivité, le serveur Render gratuit peut prendre environ une
  minute pour se réveiller ; l’application attend jusqu’à 90 secondes pour la réponse.

Les séances reprennent la semaine type choisie sur le site, à l’heure d’Aix-en-Provence
(Europe/Paris). L’application ne réserve pas de cours et ne gère pas automatiquement
les vacances ou les annulations.

### Mise à jour depuis l’ancienne application

Installer le nouvel APK par-dessus l’ancien. L’identifiant de l’application et sa clé
de signature restent identiques. La version 0.2.0 remplace automatiquement une ancienne
adresse `*.trycloudflare.com` par Render. Elle efface la session et la copie associées
à cet ancien serveur et demande de se reconnecter. Le planning enregistré dans Atlas
est conservé. Une session de l’ancien serveur n’est jamais transmise au nouveau.

### Sans réseau et confidentialité

Après une première synchronisation, la dernière copie téléchargée reste consultable,
avec sa date. Elle peut être ancienne. Le planning et la session sont chiffrés sur le
téléphone (AES-GCM et Android Keystore). Le mot de passe n’est jamais enregistré.
La déconnexion efface la copie. Une session expirée demande une nouvelle connexion.
Aucune connexion MongoDB ni clé du serveur n’est incorporée dans l’APK.

L’application passe par HTTPS, refuse les redirections et utilise une session contrôlée
par le serveur. Les certificats sont vérifiés normalement. Aucun suivi ni publicité.
Maps reçoit l’adresse du club uniquement après un appui sur **Itinéraire**.

## Compiler et vérifier

Le dossier `android` est un projet Android Studio. La licence SDK a été acceptée pour
les outils de ce projet. Outils : JDK 25, Gradle 9.1.0, Android Gradle Plugin 9.0.0,
SDK Android 36 et Build Tools 36.0.0.

Depuis la racine du projet :

```powershell
.\android\Compiler-Android.ps1
```

Le script teste le contrat du client Java (HTTPS, ancienne adresse, session, redirections,
délai de réveil), construit **assembleRelease**, lance **lintRelease** et copie le fichier
vers `android/SportsEnsemble-Agenda.apk`. Le débogage est désactivé dans l’APK public.
Le fichier local `mobile-server-url.txt` n’est plus utilisé par cette compilation.
Une autre origine HTTPS peut être passée explicitement avec `-ServerUrl` pour un test.

La clé historique `.private/android-debug.keystore` reste utilisée pour permettre les
mises à jour des installations existantes. **Conserver cette clé privée et sa sauvegarde ;
ne pas la publier.** Elle ne se trouve ni dans le dépôt ni dans l’APK. Une publication
Play Store nécessiterait une préparation distincte. Les outils, caches et APK restent
ignorés par Git ; le binaire public est joint à une version GitHub, pas ajouté au code.

### Publier une prochaine version

1. Augmenter `versionCode` et `versionName` dans `android/app/build.gradle`, et le numéro
   affiché dans `MainActivity.java` et sur la page de téléchargement.
2. Compiler, vérifier Android Lint et la signature avec `apksigner`.
3. Pousser les sources et créer une version GitHub liée à ce commit.
4. Joindre l’APK sous le nom exact **SportsEnsemble-Agenda.apk**, plus son empreinte SHA-256.
5. Publier la version comme dernière version, puis vérifier le téléchargement public.

La page et son QR restent identiques. Une mise à jour de l’APK n’est pas installée
automatiquement sur le téléphone : l’utilisateur télécharge et ouvre le nouvel APK.

## Vérifications de cette version

- Compilation Release et contrôles Java du client réussis.
- Android Lint : zéro erreur ; un avertissement sur une version Gradle plus récente.
- Signature v2 vérifiée, même certificat que l’ancienne application.
- QR relu automatiquement à plusieurs tailles, y compris la taille affichée sur la page.
- L’exécution complète sur un vrai téléphone reste à vérifier après installation.

## Ancien accès temporaire (développement)

Les scripts `npm run mobile:remote` et `Demarrer-Agenda-Android.ps1` sont conservés pour
les anciens essais. Ils nécessitent le PC allumé et créent un tunnel temporaire ; ils
ne sont plus nécessaires pour télécharger ou utiliser l’application distribuée ici.

## Avis partagés (version 0.3.0)

L’onglet **Avis** permet de lire les expériences de tous les utilisateurs et de publier
une note entière de **0 à 10** accompagnée d’un commentaire de **1 à 2 000 caractères**.
Les avis concernent SportsEnsemble et sont communs au site et à l’application.
Une connexion est nécessaire pour publier. Le serveur ajoute le nom du compte et la
date ; l’e-mail n’est jamais rendu public. Aucun compte ne peut modifier ou supprimer
un avis depuis l’application ou l’API. Il reste possible de publier un nouvel avis.

Une connexion Internet est nécessaire pour les avis. **Actualiser les avis** récupère
les nouvelles publications. Les anciennes pages sont accessibles avec **Voir les avis
précédents**. Après une erreur réseau, réessayer le même envoi ne crée pas de doublon.
La version 0.3.0 s’installe par-dessus la précédente et conserve sa connexion à Render.
