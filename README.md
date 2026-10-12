# Folio — Ma bibliothèque PDF

Une Progressive Web App (PWA) **100 % statique**, en français, adaptée au téléphone. Elle permet de conserver une bibliothèque personnelle de PDF, **sans créer de compte**.

## Fonctionnalités
- Importer un ou plusieurs fichiers PDF depuis son appareil.
- Importer un PDF à partir de son URL directe **si le serveur autorise CORS**.
- Lire les PDF avec le lecteur intégré du navigateur, même sans Internet.
- Retrouver ses livres par titre, auteur, catégorie, étiquette ou note.
- Organiser des collections (catégories libres), des favoris et un statut (à lire, en cours, terminé).
- Noter les livres de 0 à 5 étoiles et y ajouter des notes personnelles.
- Enregistrer sa page de lecture **manuellement** et reprendre un livre.
- Télécharger à nouveau un PDF stocké localement.
- Exporter une **sauvegarde ZIP avec les PDF et leurs fiches**, puis la restaurer sur un autre appareil.
- Installer l'application sur l'écran d'accueil (Android et iOS selon le navigateur).

## Publication sur GitHub Pages
1. Ouvrez les paramètres du dépôt **Settings → Pages**.
2. Sous **Build and deployment**, sélectionnez **Deploy from a branch**.
3. Choisissez la branche **main**, dossier **/(root)** puis **Save**.
4. Une fois Pages activé, l'URL sera normalement `https://ibradevweb.github.io/pdflibrary/`.

Aucun build, npm, compte, API ni serveur applicatif n'est requis.

Pour démarrer localement, servez les fichiers en HTTP :
```bash
python3 -m http.server 8000
```
Puis ouvrez http://localhost:8000. Le mode PWA fonctionne sous **HTTPS** ou **localhost**, pas sous `file://`.

## Installer sur téléphone
- **Android (Chrome)** : ouvrez l'URL HTTPS puis menu → *Installer l'application* / *Ajouter à l'écran d'accueil*.
- **iPhone (Safari)** : ouvrez l'URL HTTPS puis *Partager* → *Sur l'écran d'accueil*.

## Données et vie privée
Les **PDF sont conservés dans IndexedDB sur l'appareil**, pas dans le dépôt GitHub et pas sur le serveur Pages. Les PDF privés ne sont jamais mis en cache par le service worker. Seuls les fichiers de l'interface sont préchargés pour le mode hors ligne.

**Important :** le stockage est propre à chaque navigateur/appareil. Il n'y a pas de compte ni de synchronisation en temps réel. Effacer les données du site, désinstaller l'application ou certaines politiques d'évacuation de stockage peuvent supprimer les livres. Utilisez régulièrement **Paramètres → Exporter ma bibliothèque (.zip)** pour en garder une copie et la transférer sur un autre appareil.

Le lecteur PDF utilise le moteur natif du navigateur : ses capacités et l'affichage dans un cadre varient selon iOS/Android. Le lien « ouvrez-le dans le lecteur de votre navigateur » sert de solution de repli. Les changements de page effectués par défilement dans le PDF **ne sont pas détectés automatiquement** ; saisissez la page courante dans la barre supérieure.

Les sauvegardes ZIP sont créées sans compression et supportent les archives classiques non-Zip64 (moins de 4 Go). L'importation attend une archive exportée par Folio.

## Structure
- `index.html` : interface
- `styles.css` : styles responsive
- `app.js` : stockage, bibliothèque, lecteur et sauvegardes ZIP
- `manifest.webmanifest` : installation PWA
- `sw.js` : cache hors ligne de l'interface
- `icons/` : icônes

## Limitations
- Pas de synchronisation cloud automatique.
- Les liens distants soumis aux restrictions CORS ne sont pas importables directement ; enregistrez alors le PDF sur le téléphone, puis importez le fichier.
- L'accès aux PDF dépend du navigateur et de son espace de stockage disponible.
- Importez uniquement des PDF que vous êtes autorisé à conserver.
