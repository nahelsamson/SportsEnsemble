# Utiliser SportsEnsemble

1. Ouvrir ce dossier dans VS Code.
2. Dans le terminal du dossier, lancer `npm install`, puis `npm start`.
3. Ouvrir http://localhost:9010 et cliquer sur **Se connecter**, puis **Créer un compte**.
4. Après connexion, utiliser **Gérer les contenus**.

MongoDB Server doit fonctionner. La base **sportsensemble**, avec **users** et **sessions**, est préparée au démarrage. Les comptes apparaissent dans Compass après inscription.

Voir [COMPTES-MONGODB.md](COMPTES-MONGODB.md) pour le guide complet.

Les articles et photos restent dans le navigateur. Ils ne sont pas liés aux comptes ni synchronisés. Exporter une sauvegarde JSON régulièrement. L'ouverture directe de index.html ne permet pas la connexion ; utiliser le serveur Node.js.

Les trois actualités initiales sont des exemples. Le site est indépendant de Penpot.
