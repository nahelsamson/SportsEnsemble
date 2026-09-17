# Ouvrir le site depuis un autre appareil

Le site peut être partagé par un lien HTTPS temporaire. Les visiteurs ouvrent ce lien dans leur navigateur : ils n'installent ni Node.js, ni MongoDB, ni Compass. Ils se connectent avec leur compte **SportsEnsemble**, pas avec un compte Atlas.

## Sur le PC qui héberge le site

Les dépendances Node.js et la connexion Atlas dans `.env` doivent être configurées sur ce PC. Son adresse IP publique doit être autorisée dans Atlas. Les visiteurs n'ont pas à ajouter leur adresse IP dans Atlas.

Cloudflare doit être présent dans `.tools/cloudflared.exe`. Il est déjà installé sur le PC du projet. Sur un nouvel hôte, après acceptation des [conditions Cloudflare](https://www.cloudflare.com/terms/), le préparer avec `node scripts/prepare-mobile-remote.cjs`.

Lancer depuis le dossier du projet :

```powershell
npm run site:remote
```

Ou lancer `Partager-Site.ps1`. Le lien `https://…trycloudflare.com` apparaît dans le terminal et est enregistré dans `site-public-url.txt`. Partager ce lien aux membres du groupe. L'adresse du site local et le service Android continuent de fonctionner séparément.

Le serveur public écoute uniquement sur `127.0.0.1:9013` (port optionnel `SITE_PUBLIC_PORT`). Cloudflare transporte les requêtes HTTPS vers ce serveur. Le fichier `.env` reste sur le PC, et les pages utilisent l'API du site pour communiquer avec Atlas. Les cookies de connexion de cet accès sont `Secure`, `HttpOnly` et `SameSite=Strict` ; les modifications doivent venir de l'origine HTTPS créée pour ce lancement.

## Ce que les membres peuvent faire

- Consulter les actualités d'exemple, le répertoire des clubs et la carte.
- Créer un compte SportsEnsemble ou utiliser leur compte existant.
- Retrouver leurs sports, modifier leur agenda et leur planning hebdomadaire dans Atlas.

Les articles et photos ajoutés depuis « Gérer les contenus » sont encore stockés dans le navigateur. Ils ne deviennent pas partagés entre visiteurs par la création de ce lien. Les données locales du navigateur dépendent de l'adresse utilisée.

## Durée de l'accès

Garder le PC allumé, connecté à Internet et le processus ouvert. Ctrl+C ferme le site public. Relancer la commande crée généralement une autre adresse ; les membres doivent utiliser le nouveau lien et se reconnecter. Un démarrage échoué doit être résolu avant de partager l'adresse.

[Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/) est destiné aux tests, sans garantie de disponibilité. Pour un lien permanent utilisable PC éteint, il faut héberger aussi le serveur Node.js sur un hébergement permanent.

Les fichiers `.env`, `site-public-url.txt`, `.tools` et `.private` restent exclus de GitHub. Le navigateur et l'APK Android ne reçoivent pas les identifiants MongoDB.
