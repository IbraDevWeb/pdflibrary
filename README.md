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

## Folio 2.7 — Pages de bibliothèque, PDF zoomé et plein écran

### Pages indépendantes des collections

Sur téléphone, **Livres**, **En cours**, **Favoris** et **Terminés** ouvrent désormais une page propre avec son titre, son nombre d'ouvrages, sa liste et un bouton **← Ma bibliothèque**. La grande bannière et les statistiques de l'accueil ne sont plus répétées sur ces pages. La barre de navigation mobile reste disponible pour passer directement d'une page à l'autre. Depuis l'accueil, des **cartes de collections** donnent accès aux catégories et à leurs sous-collections ; sur tablette ou ordinateur, la navigation latérale reste disponible.

Le retour Android, y compris le geste système depuis le bord, revient depuis ces pages vers **Tous mes livres**, sans quitter Folio. Aucune catégorie ni donnée locale n'est déplacée : seule la vue change.

### Gestes PDF avec zoom

Pour un PDF à l'échelle normale, glisser horizontalement tourne les pages comme avant. Lorsque le **PDF est agrandi et déborde sur les côtés**, glisser horizontalement fait d'abord défiler **la page actuelle**. Une fois au bord droit, **un nouveau balayage vers la gauche** passe à la page suivante ; depuis le bord gauche, **un nouveau balayage vers la droite** revient à la page précédente. En mode RTL, le sens logique des pages est inversé. Au changement de page vers la précédente, la nouvelle page s'affiche du côté approprié. Les gestes de retour système depuis l'extrême bord du téléphone restent prioritaires.

### Lecture plein écran

Le bouton **⛶** active le mode lecture immersive. Il masque les barres Folio, et sur Android demande aussi de masquer les barres système. Les commandes flottantes sont montrées brièvement au départ, puis disparaissent. **Un toucher simple** sur la page les montre ou les masque **sans quitter le plein écran**. Elles permettent page précédente, page suivante et **Quitter ⛶**. Le bouton/geste Retour Android quitte le mode immersif avant de fermer le livre. Les commandes reviennent automatiquement lorsque le mode immersif se termine.

Le changement de dimensions (orientation, entrée/sortie du plein écran) déclenche une remise en page du PDF/EPUB pour éviter les pages tronquées. Les réglages de zoom et la position de lecture restent enregistrés par livre. Le test de rotation Chrome se fait après la sortie de son API Fullscreen, car Chrome interdit le changement de taille de la fenêtre tant que le mode fullscreen navigateur est actif ; cela ne simule pas toutes les variantes de barres natives Android.

**Vérifications à faire sur un téléphone physique** : gestes de navigation sur PDF zoomé (en particulier près des bords système), contrôle flottant après plusieurs minutes en plein écran, rotation portrait/paysage, lecture EPUB en mode RTL et retour depuis une fiche ouverte à partir de Découvrir. La compilation et les tests automatisés ne remplacent pas cette validation matérielle.

## Folio 2.6 — Recherche Usul.ai dans Découvrir

L'espace **Sciences islamiques** propose un raccourci **Rechercher dans les textes d'Usul.ai**. Dans **Découvrir**, choisissez l'onglet **Usul.ai — notices et lecture sur Usul**, ou la source **Usul.ai — recherche de textes islamiques**.

1. Entrer le titre arabe ou translittéré, ou le nom d'un auteur, dans la recherche Usul.
2. Voir les **livres**, **titres arabes**, **auteurs**, **disciplines**, **éditeurs** et **années d'édition** renvoyés par Usul.
3. Avancer ou reculer dans les pages de résultats.
4. Toucher **Lire sur Usul ↗** pour ouvrir la fiche correspondante dans le navigateur intégré d'Android.

**Aucun livre Usul n'est importé dans Folio** : la recherche ne télécharge ni PDF, ni EPUB, ni textes intégraux. Même si une notice référence une édition PDF, un lien détectable techniquement ne constitue pas une licence de téléchargement ni d'import. La lecture, les éventuels abonnements et les droits d'accès restent du ressort d'Usul.ai.

Le fournisseur utilise, pour rechercher des **métadonnées**, l'endpoint public `https://api.usul.ai/search/books` avec `q`, `limit=15`, `page` et `locale`. Son accessibilité a été vérifiée depuis une exécution réseau GitHub Actions, y compris la pagination. **Usul réserve l'usage de son API dans certaines offres payantes**, et l'endpoint est configuré pour n'accepter que son propre site comme origine de navigateur (CORS). L'intégration utilise les requêtes HTTP natives sur Android quand le service l'autorise ; elle peut devenir indisponible sans préavis, et ne contourne aucune authentification. Dans la PWA web, si la requête est bloquée, Folio indique le problème et propose **Ouvrir Usul.ai ↗**. Les termes cherchés sont transmis à l'API Usul pour renvoyer les résultats.

Usul.ai est une plateforme tierce indépendante de Folio. La fonction est une découverte bibliographique : elle ne crée pas automatiquement de livres dans votre bibliothèque privée. Les tests unitaires garantissent le format des notices, les liens vers les fiches officielles, la pagination et l'absence de bouton de téléchargement ; les tests d'interface couvrent également les indisponibilités.

## Folio 2.5 — Trouver et télécharger les livres islamiques

**Pourquoi le catalogue a changé :** la première version analysait simplement les liens HTML de bibliothèques externes ; elle présentait les centaines de liens de navigation d'IslamHouse comme des « pages/collections », sans véritable lien PDF sur les listes. Cela ne constituait pas une recherche de livres.

### Mode d'emploi : IslamHouse (recherche et téléchargement dans Folio)

1. **Découvrir → Trouver un livre à télécharger** en haut de la page (ou sélectionner « IslamHouse — livres français → Rechercher des livres »).
2. Taper le **titre** ou le **nom de l'auteur**, sélectionner **Français** ou **Arabe**, puis **Rechercher**. Les exemples sont des recherches locales dans les données récupérées, pas des suggestions préinstallées.
3. Lire les cartes **livre / auteur**, toucher **Voir les PDF / EPUB**. Folio récupère la fiche détaillée de l'ouvrage depuis **l'API publique IslamHouse v3** et affiche uniquement les véritables pièces jointes PDF/EPUB, pas les 505 liens de navigation des pages HTML.
4. Appuyer sur **Télécharger PDF dans Folio** pour importer le fichier en local dans la bibliothèque. Le bouton et la ligne d'état indiquent l'avancement et la réussite ou l'erreur. L'ouvrage reste lisible hors ligne après import.

L'API IslamHouse dispose d'une pagination par 50 titres. Folio recherche parmi les titres récupérés, jusqu'à dix pages par passe en français et huit en arabe. Ce n'est **pas une recherche sur toutes les ressources du site en un seul appel** ; le bouton **Chercher dans les pages suivantes** permet de poursuivre. Le nombre de titres réellement examinés est indiqué à l'écran. Le mode « livres récents » charge une seule page initialement.

Les fiches sont récupérées à la demande ; les formats PDF et EPUB ne sont jamais affichés tant que l'API n'a pas confirmé le fichier. La recherche distante nécessite Internet, mais les livres téléchargés restent privés. L'API publique est documentée sur https://github.com/islamhouse-dev/islamhouse-api ; endpoint de liste `main/books/{lang}/{lang}/{page}/50/json`, détail `main/get-item/{id}/{lang}/json`, fichier `attachments[].url`. La disponibilité peut changer indépendamment de Folio.

### Al-Waqfeya, Shamela et autres sources sans catalogue exploitable

Les bibliothèques islamiques qui n'ont pas d'API de livres PDF vérifiée sont **ouvertes sur leur vrai site**, et ne sont plus présentées dans le navigateur interne comme des centaines de liens techniques. Sur le site externe, recherchez un ouvrage, **téléchargez le PDF/EPUB sur le téléphone**, puis revenez dans Folio : **Ajouter → Depuis mon appareil** (ou le bouton **Importer mon PDF/EPUB** affiché dans Découvrir).

Le lecteur ne contourne ni les droits d'auteur ni les protections de téléchargement. Un site peut retirer un ouvrage, changer d'adresse ou demander une navigation manuelle.

### Validations

Les tests unitaires couvrent la forme de l'API IslamHouse, les auteurs, les formats, la pagination et la normalisation arabe. Les tests sur navigateur mobile reproduisent recherche → fiche PDF → ajout local, et vérifient qu'une ancienne URL IslamHouse ne produit plus les liens techniques. Une vérification réseau GitHub Actions teste l'accès en direct à l'API IslamHouse ainsi que les pièces jointes d'un ouvrage réel. **Cela ne remplace pas un test de téléchargement sur un téléphone Android physique.**

## Folio 2.4 — Espace personnel des sciences islamiques

La bibliothèque Folio comporte un espace **Sciences islamiques** accessible depuis la barre de navigation mobile, la barre supérieure ou le menu latéral. Il fonctionne sans compte et sans serveur ; vos PDF/EPUB et notices restent dans le stockage local.

### Disciplines et écoles

Les ouvrages peuvent être organisés dans dix familles : Coran/tafsîr, hadith/Sunna, fiqh, usûl al-fiqh, ʿaqîda, sîra/biographies, langue arabe, histoire islamique, akhlâq/spiritualité, autres sciences. On peut filtrer par discipline, école juridique (mâlikite, hanafite, shâfiʿite, hanbalite, comparative), langue ou auteur. Les ouvrages sont comptés dans un tableau de bord ; les ouvrages sans discipline sont indiqués comme **À classer**.

**Aucune affiliation ou biographie n'est déduite automatiquement** du titre : les disciplines, écoles, dates et éditions sont enregistrées seulement lorsqu'elles sont saisies par l'utilisateur. Les ouvrages importés depuis les catalogues islamiques sont automatiquement proposés dans cet espace comme *ouvrages à classer*, sans inventer leur matière.

### Fiches bibliographiques et notices d'auteurs

Ouvrez la **Fiche** d'un livre, puis **Sciences islamiques — fiche bibliographique**, et cochez *Classer ce livre*. Vous pouvez renseigner le domaine, sous-discipline, école, langue, titre original, nom arabe de l'auteur, époque, dates de décès (H / calendrier grégorien), traducteur, éditeur, édition, année, tome et provenance bibliographique. Les champs vides ne sont pas remplis par supposition.

L'**Index des auteurs** regroupe les livres par nom d'auteur connu et permet de consulter une fiche réunissant les informations déjà saisies et les ouvrages présents dans Folio. Aucune biographie externe n'est chargée.

### Recherche hors ligne

La recherche dans l'espace islamique porte sur les **titres, auteurs, noms arabes, disciplines, écoles, notes, signets, annotations et champs bibliographiques**. L'arabe est normalisé pour ignorer les voyelles courtes et certaines variantes d'alif ; la recherche latine tolère les accents. Les filtres se combinent. Pour chercher un terme dans le texte intégral d'un ouvrage, cliquez sur **Dans le texte** : Folio ouvre son lecteur et cherche dans ce PDF/EPUB sur l'appareil (le texte d'un PDF scanné nécessite un OCR non intégré). Il n'existe pas encore d'index plein texte permanent de *toute* la bibliothèque.

### Données et compatibilité

- Les livres déjà classés dans une collection `Sciences islamiques/...` sont reconnus, sauf si vous les excluez explicitement depuis leur fiche.
- Le champ `islamic` est conservé avec le reste des métadonnées du livre et dans l'export/restauration ZIP. Les anciennes sauvegardes restent prises en charge.
- Les catalogues en ligne sont des portes d'entrée vers des sites tiers : cet espace n'inclut aucun ouvrage téléchargeable supplémentaire et ne valide pas automatiquement leurs métadonnées.
- Les tests unitaires couvrent la taxonomie, les recherches arabes/françaises, les écoles, auteurs et exclusions ; des tests mobiles simulent le classement, la recherche, les notices et la sauvegarde ZIP.

## Folio 2.3 — Lecteur perfectionné : recherche, typographie et annotations

Dans le lecteur PDF/EPUB, la barre de commande propose des fonctions supplémentaires :

- **⌕ Rechercher dans le livre** : saisir un mot ou une expression de deux caractères minimum. Folio analyse le texte *localement*, affiche les résultats avec des extraits et permet de toucher un résultat pour ouvrir directement la page PDF ou l'emplacement EPUB correspondant. Les résultats sont limités à 100 pour préserver la réactivité. Un PDF scanné sans couche texte **n'est pas interrogeable** sans OCR, qui n'est pas intégré. L'analyse des gros livres peut prendre du temps.
- **Aa Typographie EPUB** : choisir la police d'origine, Georgia, Arial ou Verdana ; régler la taille du texte et l'interligne. Les préférences sont enregistrées **par livre**, et incluses dans les sauvegardes ZIP. Les polices et l'interligne ne peuvent pas être changés dans un PDF à mise en page fixe.
- **Navigation** : une barre de progression sous le lecteur permet de sauter directement à une page du PDF. Pour les EPUB, une barre en pourcentage devient active lorsque les emplacements internes du livre sont indexés. Le sommaire et les signets restent disponibles.
- **Annotations** : choisir le jaune, vert, bleu ou rose dans le panneau **Sommaire** avant de sélectionner une citation ; les annotations existantes sans couleur conservent le jaune. Les notes sont consultables depuis le carnet. **Exporter les annotations (.txt)** télécharge ou partage un fichier texte contenant les signets et les passages annotés, sans envoyer le contenu à un service distant.
- **Compatibilité** : un EPUB peut imposer certaines polices ou styles ; Folio s'efforce de respecter le réglage sans garantir qu'il prévale sur tous les livres. La recherche EPUB s'appuie sur les CFI des chapitres et reste hors ligne.

La fonction de recherche ne télécharge aucun contenu externe. Les essais automatisés contrôlent la recherche PDF/EPUB, les positions, les réglages, la persistance et les cas de documents sans résultats.

## Folio 2.2 — Mode lecture plein écran et teinte personnalisée

Depuis la liseuse PDF ou EPUB, les boutons **⛶** et **☀ Teinte** ouvrent deux nouveaux réglages :

- **⛶ Plein écran** : la barre de commandes de Folio et le pied de page disparaissent. Dans l'APK Android, Folio masque aussi temporairement les barres de statut et de navigation à l'aide de Capacitor SystemBars. Appuyer au centre du livre ou sur **Afficher les commandes** pour retrouver le mode normal. Un geste système Android peut également faire réapparaître temporairement les barres.
- **☀ Teinte** : trois modes **Blanc / Sépia / Nuit**, un curseur **Teinte chaude (0–100 %)** et un curseur **Luminosité du livre (60–100 %)**. Ces réglages affectent le rendu du livre, **pas** la luminosité physique du téléphone. Leurs valeurs sont sauvegardées par livre et comprises dans le ZIP de sauvegarde.
- **PDF** : la teinte est un filtre de lecture superposé au rendu, sans changer le PDF d'origine ni ses annotations. Le résultat dépend des couleurs du PDF.
- **EPUB** : Folio adapte les couleurs du texte et du fond de lecture. Les livres ayant des règles de style imposées peuvent rendre les réglages moins homogènes.
- Les commandes restent accessibles sur Android, dans le navigateur et en PWA ; si un navigateur refuse la véritable API plein écran, Folio peut tout de même masquer ses propres barres.

Les tests automatisés contrôlent la plage de couleur, le stockage des valeurs, et les transitions plein écran dans un navigateur mobile simulé. Les barres Android natives restent à vérifier sur un appareil physique.

## Folio 2.1 — Ergonomie Android et gestes de lecture

- **Barres de notifications Android** : intégration Capacitor 8 SystemBars avec `insetsHandling: native` et marges CSS `safe-area-inset-top/bottom` ; les en-têtes, fenêtres et barres basses sont adaptés aux encoches, barres de navigation et orientations du téléphone.
- **Retour Android** : geste de retour natif depuis le bord de l'écran (ou touche Retour) : ferme d'abord une fenêtre de dialogue, retourne à la page précédente du catalogue, ferme le sommaire, ferme la liseuse, ou revient à « Tous les livres ». Au niveau principal, réduit l'application. Sur PWA, un glissement depuis le bord gauche est prévu.
- **PDF et EPUB** : balayage vers la gauche pour la page suivante, vers la droite pour revenir, *sauf* lorsque le sens **RTL** est sélectionné (lectures arabes), dans ce cas les directions s'inversent. Les bords extrêmes restent réservés aux gestes du système Android.
- **Zoom tactile** : pincer deux doigts pour augmenter/réduire le zoom, double-taper pour agrandir/revenir, ou utiliser les boutons +/- ; zoom sauvegardé pour chaque livre. Pour EPUB, cela ajuste la taille du texte, pour PDF cela agrandit la page. Lorsque le PDF est agrandi au-delà de sa largeur disponible, le balayage horizontal sert à explorer la page plutôt qu'à la changer ; les flèches restent disponibles pour passer à la page suivante.
- **Annotations sans conflits** : lorsqu'on active 🖍 pour sélectionner des passages, les balayages de pagination sont suspendus. Désactiver 🖍 pour retrouver la navigation gestuelle.
- **Mise en page** : outils sur une barre horizontalement défilante, grandes zones tactiles, adaptation portrait/paysage, sommaire et boutons accessibles ; le document garde son espace de lecture.
- **Continuité** : lecture sauvegardée en arrière-plan, au changement de page et quand la liseuse se ferme ; réajustement automatique en cas de rotation.

### Tests à faire sur le téléphone Android

Les contrôles automatisés valident les décisions de gestes, les boutons existants, la compilation et la génération de l'APK. Les versions matérielles diffèrent : effectuer une validation sur votre appareil avant d'importer une grosse bibliothèque.

1. Téléphone **en portrait**, puis **en paysage** : le titre de la liseuse ne passe ni sous les notifications ni sous la barre Android du bas.
2. **Retour depuis les bords** : retourner du lecteur à la bibliothèque, fermer le sommaire, revenir dans les pages de catalogue et fermer les dialogues.
3. PDF : balayer depuis le **milieu** de l'écran vers la gauche/droite, pincer pour zoomer, faire défiler une grande page agrandie, double-taper.
4. EPUB : tourner les pages, faire varier la taille des caractères, activer RTL sur un EPUB arabe et tester les gestes inversés.
5. Sélectionner une phrase, l'annoter avec 🖍, fermer/réouvrir : vérifier la persistance.
6. Exporter un ZIP, fermer et rouvrir l'application, vérifier la progression. Tester la restauration du ZIP sur une **bibliothèque de test** avant toute réinstallation.

### Mises à jour APK sans désinstallation (recommandé)

Les APK `debug` de GitHub Actions sont signés avec une **clé temporaire différente à chaque exécution** : ce n'est pas un canal durable de mise à jour. Pour éviter la réinstallation et donc les pertes de données, le workflow sait produire un **APK release avec une clé personnelle stable**, **uniquement si vous créez les quatre secrets GitHub** suivants. Ne mettez jamais la clé ni le mot de passe dans le dépôt (il est public).

1. Sur votre ordinateur personnel avec Java/JDK, créez une clé conservée **hors du dépôt** :
   ```bash
   keytool -genkeypair -v -keystore folio-release.jks -storetype PKCS12 -alias folio -keyalg RSA -keysize 3072 -validity 10000
   ```
   Choisissez les mots de passe et conservez en lieu sûr le fichier `folio-release.jks`.
2. Encodez-le en Base64 sur Linux/macOS : `base64 -w 0 folio-release.jks` (sur macOS : `base64 -i folio-release.jks | tr -d '\\n'`). Sur Windows PowerShell : `[Convert]::ToBase64String([IO.File]::ReadAllBytes('folio-release.jks'))`.
3. Dans **GitHub → Settings → Secrets and variables → Actions → New repository secret**, créez :
   - `FOLIO_KEYSTORE_BASE64` : contenu Base64 du fichier.
   - `FOLIO_KEYSTORE_PASSWORD` : mot de passe du magasin de clés.
   - `FOLIO_KEY_ALIAS` : `folio`.
   - `FOLIO_KEY_PASSWORD` : mot de passe de la clé (souvent identique à celui du magasin PKCS12).
4. Lancez le workflow **Construire l'APK personnel Android** depuis Actions. Une archive `folio-android-signed-apk` apparaît en plus du debug. Installez **toujours cette version signée** pour les mises à jour ultérieures.
5. Si vous aviez installé la version debug précédente, sauvegardez la bibliothèque en ZIP, désinstallez l'ancienne **une seule fois**, installez la version signée, restaurez le ZIP. Pour les mises à jour suivantes, gardez **exactement la même clé** et le même identifiant d'application.

La procédure optionnelle de signature n'est pas activée tant que ces secrets ne sont pas configurés. La clé ne doit jamais être publiée, et sa perte empêcherait les futures mises à jour de l'application installée avec elle.

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
