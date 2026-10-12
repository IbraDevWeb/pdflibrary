# Folio 2 — Lecteur PDF & EPUB privé (Android et PWA)

Folio est une bibliothèque personnelle en français qui lit des livres **PDF** et **EPUB** sans compte, sans backend, sans analytique et sans synchronisation cloud. Le code de l'application est dans ce dépôt ; les **livres ne sont jamais envoyés sur GitHub**.

## Fonctionnalités

- Import PDF / EPUB depuis le téléphone, ou URL directe si le serveur autorise CORS.
- Lecteur PDF.js avec texte sélectionnable, position sauvegardée à chaque changement de page, sommaire PDF (si disponible), marque-pages, zoom, mode clair/sépia/nuit.
- Lecteur EPUB.js : pagination, reprise via CFI, chapitres, changement de police (zoom), thèmes, sélection de passages.
- Surlignage de sélections et notes liées aux passages ; le mode 🖍 doit être activé avant la sélection.
- Couverture produite à partir de la première page du PDF ; couverture de l'EPUB si disponible (sinon couverture typographique).
- Bibliothèque avec catégories imbriquées séparées par `/`, ex. `Histoire/Moyen Âge`.
- Favoris, évaluations, fiches éditables, recherche et filtres auteur / thème / note / statut / format.
- Sauvegarde ZIP complète (PDF, EPUB, métadonnées, couvertures, notes et signets), et restauration des anciennes archives Folio v1.
- Navigation hors ligne après installation ; le JavaScript, ses dépendances et les icônes sont compilés dans l'application.

## Découvrir des livres sans les télécharger préalablement

Sur Android, Folio dispose désormais d'un espace **Découvrir**, accessible depuis la bibliothèque. Il présente les pages de collections de la [Bibliothèque électronique du Québec](https://beq.ebooksgratuits.com/) et permet de consulter les liens PDF/EPUB, puis de toucher **Ajouter ↓** : le fichier est téléchargé directement dans le stockage privé de Folio.

1. Ouvrir Folio puis **Découvrir**.
2. Choisir **BEQ · Accueil**, **Classiques du monde**, **Littérature québécoise** ou **Incontournables**.
3. Ouvrir une collection, chercher un titre avec le champ de recherche (recherche dans la page affichée).
4. Toucher **Ajouter ↓** à côté du PDF ou de l'EPUB.
5. Retourner à la bibliothèque : le document est conservé localement sous `Téléchargements/BEQ`.

L'explorateur accepte également une **adresse HTTPS publique** de catalogue ou un lien direct vers un fichier se terminant par `.pdf` ou `.epub`. Le catalogue distant est lu comme texte et les liens sont extraits sans exécuter ses scripts. L'application ne contourne pas les protections d'accès et ne fournit aucun catalogue hébergé par Folio.

- **APK Android :** `CapacitorHttp` charge les pages HTML ; `@capacitor/file-transfer` télécharge les livres sur le disque privé. Le navigateur ne sert pas d'intermédiaire et les restrictions CORS ordinaires de la WebView ne s'appliquent pas à ces requêtes natives.
- **PWA web :** les téléchargements depuis les domaines tiers restent soumis aux restrictions **CORS**. Préférez l'APK pour les sites anciens comme BEQ.
- **Hors connexion :** une connexion est nécessaire pour consulter et télécharger les livres depuis un site tiers, mais pas pour lire les livres déjà importés.
- **Limites :** seules les URL directes `.pdf` / `.epub` sont reconnues automatiquement ; les boutons de téléchargement en JavaScript, formulaires nécessitant une session, DRM, captchas et certains sites dynamiques ne sont pas pris en charge. Les gros fichiers sont limités à 120 Mo pour protéger la mémoire du téléphone. Les sites tiers peuvent changer de structure.
- **Droits d'auteur :** vérifiez le domaine public ou la licence du livre dans votre pays avant de le conserver. La mention « domaine public » sur un site ne garantit pas la situation juridique de chaque œuvre dans tous les pays.

## Annuaire intégré : 22 catalogues et bibliothèques

L'espace **Découvrir** dispose maintenant d'un annuaire consultable depuis l'APK Android :

- **Sciences islamiques** : IslamHouse (livres français, tafsîr, hadith), HadeethEnc (hadiths en PDF), Al-Waqfeya (bibliothèque arabe, catégories de fiqh, tafsîr, ouvrages malikites et usûl al-fiqh), Al-Maktaba al-Shamela (consultation), QuranEnc (consultation), Safahat/Hindawi (ouvrages arabes, histoire islamique).
- **Littérature et recherche** : Bibliothèque électronique du Québec, Ebooks libres et gratuits, son **flux OPDS**, Project Gutenberg via **Gutendex**, Bibliothèque numérique romande, NosLivres, Wikisource, Gallica et OpenEdition.
- Filtres par **discipline**, **langue**, type de source, recherche dans les fiches, et **favoris de catalogues**, enregistrés localement.
- Un bouton **Parcourir la bibliothèque** permet de consulter chaque catalogue pris en charge. Quand des liens PDF/EPUB directs sont détectés, **Ajouter ↓** télécharge le fichier dans Folio et le classe automatiquement : `Sciences islamiques/<source>` ou `Téléchargements/<source>`.
- Pour **Gutenberg**, sélectionner le catalogue puis utiliser **Rechercher** (titre/auteur). L'API Gutendex fournit les métadonnées de livres du Project Gutenberg, et leur lien EPUB quand disponible. L'API est externe : connexion nécessaire à la recherche, mais pas à la lecture.
- Le **flux OPDS** d'Ebooks libres et gratuits affiche les entrées et leurs formats téléchargeables ; il offre un accès plus structuré que l'analyse HTML.
- Les bibliothèques **Shamela, QuranEnc, Wikisource, Gallica et OpenEdition** sont indiquées en *Consultation* : le bouton ouvre le site source, mais Folio ne prétend pas importer automatiquement des fichiers non proposés par ce site.

**Limitations importantes :** l'annuaire n'héberge aucun ouvrage. Les sites dynamiques, liens temporaires, identifications obligatoires, pages avec DRM ou téléchargements sans lien direct .pdf/.epub peuvent ne pas être importables automatiquement. Une page de catalogue peut nécessiter d'ouvrir la **fiche du livre** pour trouver son téléchargement. Certaines ressources gratuites ne sont pas dans le domaine public : vérifiez toujours les conditions de diffusion et le droit applicable. Les sources externes peuvent modifier leurs liens. Ni la disponibilité de chaque document ni le fonctionnement de chaque site sur tout téléphone ne sont garantis.

### Utilisation

1. Installer l'APK Android le plus récent (voir la procédure ci-dessous).
2. Dans Folio, appuyer sur **Découvrir**.
3. Choisir **Sciences islamiques** ou **Littérature & recherche**, puis un sujet comme **Fiqh malikite**, **Hadith**, **Tafsîr**, **Coran**, **Arabe**, **Usûl al-fiqh** ou **Histoire**.
4. Toucher **Parcourir la bibliothèque** pour consulter les rubriques et fichiers de la source.
5. Utiliser **Ajouter ↓** lorsqu'un PDF/EPUB direct est proposé.
6. Retrouver le livre sous une catégorie liée à la source, accessible ensuite hors connexion.

## Installation PERSONNELLE sur Android, sans Play Store

### Méthode GitHub Actions (APK, sans Android Studio)

1. Ouvrir **GitHub → [Actions](https://github.com/IbraDevWeb/pdflibrary/actions)**.
2. Cliquer sur le workflow **Construire l'APK personnel Android**.
3. Cliquer **Run workflow** sur `main`, puis attendre la fin du build.
4. Dans le workflow terminé, télécharger l'artifact **folio-android-debug-apk** (ZIP).
5. Extraire le fichier `app-debug.apk` et le copier sur votre téléphone Android.
6. Ouvrir le fichier APK avec l'application Fichiers Android et autoriser, si demandé, l'installation d'applications depuis **cette source**.
7. Ouvrir Folio, importer un PDF/EPUB depuis le stockage du téléphone, puis l'utiliser sans réseau.

**Attention pour les mises à jour :** le workflow génère un APK de debug signé avec une clé éphémère sur chaque exécution. Il peut être impossible de l'installer *par-dessus* une version produite par un autre run. Dans ce cas, **exporter une sauvegarde ZIP avant de désinstaller**, réinstaller le nouvel APK puis restaurer. Une clé de signature stable serait nécessaire pour des mises à jour sans désinstallation.

Le projet Android est généré pendant le workflow par `npx cap add android` ; les sources Android générées ne sont pas enregistrées dans le dépôt.

### Méthode ordinateur Windows / macOS / Linux (développement)

Pré-requis : Node 22+, Android Studio récent et SDK Android, Java 21 (Android Studio peut le fournir), un téléphone en USB ou un émulateur.

```bash
git clone https://github.com/IbraDevWeb/pdflibrary.git
cd pdflibrary
npm install
npm run android:init
npx cap open android
```

Dans Android Studio : sélectionner votre appareil, puis **Run**. Pour créer un APK : **Build → Build APK(s)**.

### Alternative PWA

```bash
npm install
npm run build
npm run preview
```

Publier uniquement le dossier `dist/` sur un hébergement HTTPS statique (ou GitHub Pages avec le bon chemin). Depuis Chrome Android : **menu ⋮ → Installer l'application**.

La PWA stocke les PDF/EPUB dans **IndexedDB**, propriété du navigateur. L'APK Android stocke les **fichiers** dans `Directory.Data` de Capacitor (stockage privé de l'application) et les **fiches** en IndexedDB dans la WebView. Le stockage reste local dans les deux cas.

## Sauvegarde et réinstallation

1. Paramètres → **Exporter ma bibliothèque (.zip)**.
2. Sauvegarder le ZIP dans un emplacement personnel (par exemple le dossier Téléchargements, puis une copie USB).
3. Après réinstallation, Paramètres → **Restaurer une sauvegarde**.

**La désinstallation de l'APK efface son stockage privé.** Ne la faites jamais avant la sauvegarde. Les PDF/EPUB volumineux consomment de la mémoire pendant l'import, l'export et l'ouverture ; tester d'abord avec de petits fichiers.

Une bibliothèque installée en PWA et une autre installée en APK sont **deux stockages distincts** : utilisez le ZIP pour transférer les livres. Il n'existe pas de synchronisation automatique.

## Architecture

| Fichier | Rôle |
|---|---|
| `src/main.js` | Bibliothèque, import, catégories, filtres, édition |
| `src/catalog.js`, `src/catalog.css` | Parcours des catalogues et annuaire responsive |
| `src/catalog-sources.js` | Métadonnées des 22 bibliothèques et filtres thématiques |
| `src/catalog-providers.js` | Recherche Gutendex et exploration XML OPDS |
| `src/direct-download.js` | Téléchargement direct Android dans le stockage privé |
| `src/reader.js` | PDF.js, EPUB.js, couverture, thèmes, lecture et annotations |
| `src/storage.js` | IndexedDB, fichiers Android natifs, export/restauration ZIP |
| `src/reader.css`, `styles.css` | Interface responsive et lecture |
| `vite.config.js` | Bundle Vite et cache PWA pour les ressources statiques |
| `capacitor.config.json` | Identité Android et assets préembarqués |
| `.github/workflows/android-apk.yml` | Build APK manuel |
| `.github/workflows/check.yml` | Compilation automatique |

Bibliothèques utilisées : PDF.js (Mozilla), epub.js, Capacitor Filesystem, JSZip, Vite et vite-plugin-pwa. Tous les scripts sont empaquetés localement ; **aucun CDN n'est nécessaire pendant la lecture**.

## Limites connues

- Les surlignages sont stockés par Folio. Ils ne modifient pas le PDF / EPUB original. La sélection de PDF scannés sans couche de texte n'est pas possible sans OCR (non fourni).
- Les annotations PDF utilisent des rectangles relatifs sur la page, sans ancrage sémantique ; elles peuvent être légèrement décalées si le document change.
- Sur certains EPUB complexes, chapitres, sélections et couvertures peuvent varier selon la mise en page.
- Import depuis un lien Internet uniquement avec réseau et configuration CORS compatible ; **les lectures déjà importées sont hors ligne**.
- Les EPUB protégés par DRM ne sont pas pris en charge.
- Le lecteur actuel rend une page PDF à la fois ; aucun défilement continu des pages PDF.
- Les fichiers ne sont pas chiffrés ; le stockage est privé à l'application Android mais accessible sur un téléphone déverrouillé ou compromis.
- La sauvegarde ZIP n'est pas chiffrée ; gardez-la dans un lieu sûr.
- Le dépôt GitHub est actuellement **public** : cela expose le **code**, pas les livres personnels importés dans l'application.

## Vérification

Le workflow *Vérifier Folio* compile le projet automatiquement à chaque commit sur `main`. Cette vérification de build ne remplace pas un test manuel sur un véritable téléphone Android.
