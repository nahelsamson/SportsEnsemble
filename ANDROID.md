# SportsEnsemble Agenda — Android

Application native Android (Android 8 minimum) reliée aux comptes MongoDB existants.
Elle sert à **consulter** les sports sélectionnés et les séances enregistrées dans
« Agenda » et « Ma semaine » sur le site. Elle ne crée pas de réservations.

## Sur le téléphone

1. Installer `android/SportsEnsemble-Agenda.apk` (version de test, hors Play Store).
   Le fichier est aussi accessible à l’adresse HTTPS du serveur suivie de
   `/download/agenda.apk`. Autoriser ce navigateur à installer cette application
   si Android le demande, puis retirer cette autorisation après l’installation.
2. Ouvrir **SportsEnsemble Agenda**. L’adresse temporaire du serveur est préremplie
   si l’application a été compilée pendant que l’accès distant fonctionnait.
3. Se connecter avec le **même e-mail et mot de passe** que sur le site.
4. Consulter **Ma semaine** (jour ou semaine entière) et **Mes sports**.
5. Ouvrir une séance pour consulter prix, adresse, public, horaires et itinéraire Maps.

Le compte se crée sur le site. Les ajouts et modifications du planning se font sur
le site, puis le bouton **Actualiser** récupère les changements dans l’application.
Une actualisation se fait aussi au retour dans l’application, au plus une fois par minute.
Les jours et horaires du planning correspondent à Aix-en-Provence (Europe/Paris).
Les semaines affichées répètent la semaine type ; les absences, vacances et annulations
ne sont pas gérées automatiquement.

### Sans réseau

La dernière copie téléchargée reste consultable, avec la date de dernière actualisation.
Elle peut donc être ancienne. La première connexion nécessite Internet et un serveur actif.
Le planning et le jeton de session sont chiffrés sur le téléphone par AES-GCM avec une
clé Android Keystore. Le mot de passe n’est jamais enregistré. La déconnexion efface
la copie locale. Si la session a expiré ou est révoquée, le prochain contact avec le
serveur demande une reconnexion et efface la copie.

## Accès à l’extérieur : essai temporaire

À partir du dossier SportsEnsemble :

```powershell
npm run mobile:remote
```

Ou lancer `Demarrer-Agenda-Android.ps1`. MongoDB doit fonctionner ; le site sur le
port 9010 peut rester ouvert. Le service mobile indépendant écoute sur **127.0.0.1:9012**.
L’adresse `https://…trycloudflare.com` est affichée et enregistrée dans le fichier
local ignoré par Git `mobile-server-url.txt`. **Garder le PC allumé et cette fenêtre
ouverte** pour actualiser l’application à distance. Ctrl+C ferme ce service et le tunnel.

L’adresse change au redémarrage du tunnel. Dans l’application : **Compte → Changer
d’adresse de serveur**, puis se reconnecter avec la nouvelle adresse.
Ne saisir que l’adresse du serveur fournie par la personne qui héberge SportsEnsemble.

[Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/)
est un service de test sans garantie de disponibilité. Il ne constitue pas un
hébergement permanent. Pour actualiser quand le PC est éteint, déployer ce service
et MongoDB sur un hébergement permanent avec HTTPS (ou déplacer la base vers un
service MongoDB hébergé). Un tunnel permanent résout le changement d’adresse, mais
nécessite toujours que le PC qui héberge le serveur reste allumé.

## Compiler / ouvrir dans Android Studio

Le dossier `android` est un projet Android Studio Gradle autonome.
Outils utilisés : JDK 25, Gradle 9.1.0, Android Gradle Plugin 9.0.0, SDK Android 36,
Build Tools 36.0.0. Aucun accès à MongoDB ni secret du serveur n’est incorporé dans l’APK.

Pour préparer les outils sur Windows, **après avoir lu et accepté** la
[licence Android SDK](https://developer.android.com/studio#terms-and-conditions) :

```powershell
node scripts/prepare-android.cjs --accept-sdk-license
```

Puis :

```powershell
.\android\Compiler-Android.ps1
```

Cela construit l’APK, vérifie le code avec Android Lint et copie le résultat dans
`android/SportsEnsemble-Agenda.apk`. Le script utilise un JDK installé accessible
via `java` (25 recommandé ; le script d’extraction nécessite la commande `jar --dir`).
Les outils et caches restent dans `.tools`, les clés locales dans `.private`.
La clé de test `.private/android-debug.keystore` permet d’installer les prochaines
versions par-dessus la précédente. **Ne pas la publier sur GitHub.** Cet APK est
signé pour le test ; une publication Play Store demande une signature de diffusion
privée et une préparation dédiée.

Après avoir accepté les [conditions Cloudflare](https://www.cloudflare.com/terms/),
son exécutable Windows peut être préparé par :

```powershell
node scripts/prepare-mobile-remote.cjs
```

Les téléchargements SDK, Gradle et Cloudflare ont une empreinte SHA-256 contrôlée.
Les APK, secrets, configurations locales et outils téléchargés sont ignorés par Git.
Le dépôt contient les sources et scripts nécessaires pour reproduire l’application.

## Service mobile et confidentialité

- Même `MONGODB_URI` et `MONGODB_DB` que le site dans `.env`.
- Port optionnel `MOBILE_PORT` (9012 par défaut), écoute locale uniquement.
- `GET /health` : disponibilité sans information personnelle.
- `GET /download/agenda.apk` : APK de test public, sans données personnelles.
- `POST /api/auth/login` : connexion existante, pas d’inscription distante.
- `POST /api/auth/logout` : révocation de la session courante.
- `GET /api/auth/mobile-agenda` : données de l’utilisateur authentifié seulement.
- Aucun envoi d’âge, d’e-mail, de mot de passe stocké ou de liste d’autres utilisateurs
  dans la réponse agenda. Les anciens clubs référencés par une séance restent lisibles.
- Accès Android par HTTPS uniquement, certificats standards vérifiés et redirections
  refusées. Aucun accès direct à MongoDB depuis le téléphone, aucun port à ouvrir sur la box.
- Le marqueur de client et l’origine mobile ne sont pas des secrets : c’est la session
  qui contrôle l’accès aux données. Pas de CORS ; les écritures du planning, l’inscription
  et les fichiers du site ne sont pas exposés par ce service.
- Cloudflare termine HTTPS et transporte les requêtes jusqu’au PC. La liaison locale
  Cloudflare/service utilise l’adresse de bouclage du PC.
- Aucun outil de suivi ou publicité dans l’application. Maps reçoit l’adresse du club
  uniquement lorsque l’utilisateur appuie sur **Itinéraire**.

## Vérification

`npm test` vérifie les comptes, l’isolation des agendas, l’export mobile et les routes
exposées. `Compiler-Android.ps1` construit l’application et exécute Android Lint.
Sur un téléphone, vérifier : connexion, même planning que le site, itinéraire,
mode avion après synchronisation, actualisation après changement sur le site et
suppression de la copie locale après déconnexion.

### Résultat de la vérification du 16 septembre 2026

- 35 tests Node réussis, dont isolation des comptes et contrat de lecture mobile.
- APK Android assemblé et signé, signature v2 vérifiée avec `apksigner`.
- Android Lint : 0 erreur ; 1 avertissement indiquant une version de Gradle plus récente.
- Android minimum 8 (API 26), cible Android 16 (API 36).
- Téléchargement HTTPS vérifié : empreinte SHA-256 identique au fichier local.
- SHA-256 de cet APK : `24db4eae98f414ea91303070e87d86f555ed40259192c4a7eb89854630aba74b`.
- Pas encore exécuté sur un téléphone ou un émulateur : l’essai sur appareil reste à faire.

### Renouvellement du 17 septembre 2026

QR code et adresse préremplie de l’application renouvelés. Compilation et Android
Lint réussis. Téléchargement HTTPS confirmé après le changement de réseau du PC.
SHA-256 du nouvel APK : `3f828a7a06e790686689d81a94df069b0ee06ee1be8977db2cc786f411555621`.
Pour une application déjà installée et connectée à l’ancienne adresse, utiliser
**Compte → Changer d’adresse de serveur**, puis saisir l’adresse actuelle contenue
dans `mobile-server-url.txt`. Si l’écran de connexion est affiché, modifier directement
le champ **Adresse du serveur**. Réinstaller par-dessus ne remplace pas une adresse
précédemment enregistrée sur le téléphone.

### Migration Atlas du 17 septembre 2026

Le site et le service Android utilisent désormais la base Atlas configurée dans
`.env` sur le PC de développement. MongoDB local n'est plus nécessaire pour ces
deux serveurs ; il est conservé pour la sauvegarde de départ et les tests locaux.
Voir [ATLAS.md](ATLAS.md). Le PC doit encore rester allumé pour le service Android.

La connexion et la lecture d'un planning via le service HTTPS ont été vérifiées
avec un compte temporaire, supprimé après le contrôle. Le tunnel a été relancé :
utiliser l'adresse actuelle dans `mobile-server-url.txt` avec **Compte → Changer
d'adresse de serveur** sur une application déjà installée.

APK et QR de téléchargement régénérés après cette bascule. Compilation et Android
Lint réussis ; téléchargement HTTPS identique au fichier local.
SHA-256 : `628a5f2c39eba359f1941aa286948c599b832855294e9df171e4cbb8d6441ed5`.
Le QR actuel est `android/Installer-Android.png` ; la copie datée de cette bascule
est `android/Installer-Android-Atlas-2026-09-17.png`. Ces fichiers restent locaux.
