/**
 * Sources publiques vérifiées manuellement (octobre 2026).
 * "direct" : analyse HTML et liens PDF/EPUB.
 * "opds"   : flux de livres structurés.
 * "gutendex": API de métadonnées Gutenberg avec lien EPUB.
 * "browse" : consultation externe uniquement si les liens ne sont pas exploitables.
 * Aucun livre n'est inclus ou copié dans l'APK.
 */
export const SOURCES = Object.freeze([
 {id:'beq',label:'Bibliothèque électronique du Québec',group:'general',language:'Français',icon:'📖',url:'https://beq.ebooksgratuits.com/',mode:'direct',topics:['Roman','Classiques','Québec'],desc:'Classiques de la littérature francophone en PDF et EPUB.'},
 {id:'elg',label:'Ebooks libres et gratuits',group:'general',language:'Français',icon:'📚',url:'https://www.ebooksgratuits.com/',mode:'direct',topics:['Romans','Essais'],desc:'Catalogue collaboratif et livres gratuits en plusieurs formats.'},
 {id:'opds',label:'Ebooks libres — catalogue OPDS',group:'general',language:'Français',icon:'⬇️',url:'https://www.ebooksgratuits.com/opds/',mode:'opds',topics:['EPUB','Classiques'],desc:'Catalogue numérique structuré avec les liens de téléchargement directs.'},
 {id:'gutenberg',label:'Project Gutenberg — recherche',group:'general',language:'Multilingue',icon:'📘',url:'https://gutendex.com/books/?languages=fr&copyright=false',mode:'gutendex',topics:['Romans','Classiques','Recherche'],desc:'Recherche par titre ou auteur dans les livres Gutenberg, avec import EPUB.'},
 {id:'bnr',label:'Bibliothèque numérique romande',group:'general',language:'Français',icon:'🏔️',url:'https://ebooks-bnr.com/',mode:'direct',topics:['Classiques','Romans'],desc:'Éditions francophones proposées en plusieurs formats.'},
 {id:'noslivres',label:'NosLivres.net',group:'general',language:'Français',icon:'🗂️',url:'https://www.noslivres.net/',mode:'direct',topics:['Classiques','Recherche'],desc:'Catalogue commun de bibliothèques de livres numériques gratuits.'},
 {id:'wikisource',label:'Wikisource en français',group:'general',language:'Français',icon:'📜',url:'https://fr.wikisource.org/wiki/Wikisource:Accueil',mode:'browse',topics:['Textes','Classiques'],desc:'Textes historiques et œuvres libres à consulter ; formats téléchargeables variables.'},
 {id:'gallica',label:'Gallica — BnF',group:'general',language:'Français',icon:'🏛️',url:'https://gallica.bnf.fr/',mode:'browse',topics:['Patrimoine','Histoire'],desc:'Bibliothèque patrimoniale française ; téléchargement selon les conditions BnF.'},
 {id:'openedition',label:'OpenEdition Books',group:'general',language:'Multilingue',icon:'🎓',url:'https://books.openedition.org/',mode:'browse',topics:['Recherche','Histoire'],desc:'Livres universitaires et sciences humaines ; l’accès aux formats varie.'},
 {id:'islamhouse-fr',label:'IslamHouse — livres français',group:'islam',language:'Français',icon:'🕌',url:'https://islamhouse.com/fr/books/fr/1?sort=date',mode:'direct',topics:['Islam','Fiqh','Tafsir','Hadith'],desc:'Livres de religion en français ; PDF disponibles sur les fiches de publication.'},
 {id:'islamhouse-tafsir',label:'IslamHouse — tafsîr',group:'islam',language:'Français',icon:'📖',url:'https://islamhouse.com/fr/category/728011/showall/showall/1/',mode:'direct',topics:['Coran','Tafsir','Sciences du Coran'],desc:'Rubrique d’exégèse et sciences coraniques.'},
 {id:'islamhouse-hadith',label:'IslamHouse — Sunna',group:'islam',language:'Français',icon:'📿',url:'https://islamhouse.com/fr/category/144409/showall/showall/1/',mode:'direct',topics:['Hadith','Sunna'],desc:'Études et recueils relatifs à la tradition prophétique.'},
 {id:'hadeethenc',label:'HadeethEnc — hadiths expliqués',group:'islam',language:'Français + arabe',icon:'✒️',url:'https://hadeethenc.com/fr/home',mode:'direct',topics:['Hadith','Sunna'],desc:'Encyclopédie bilingue : recueils de hadiths en PDF accessibles sur la page.'},
 {id:'waqfeya',label:'Al-Maktaba al-Waqfeya — bibliothèque',group:'islam',language:'Arabe',icon:'📚',url:'https://waqfeya.net/books',mode:'direct',topics:['Tafsir','Fiqh','Hadith','Manuscrits'],desc:'Ouvrages arabes et livres numérisés ; ouvrir les fiches pour accéder aux PDF.'},
 {id:'waqfeya-topics',label:'Al-Waqfeya — disciplines',group:'islam',language:'Arabe',icon:'🗃️',url:'https://waqfeya.net/categories',mode:'direct',topics:['Fiqh','Coran','Usul al-fiqh'],desc:'Classement par sciences et domaines de recherche.'},
 {id:'shamela',label:'Al-Maktaba al-Shamela',group:'islam',language:'Arabe',icon:'🪶',url:'https://shamela.ws/',mode:'browse',topics:['Fiqh','Tafsir','Hadith','Outils'],desc:'Bibliothèque textuelle consultable ; PDF non garanti pour chaque ouvrage.'},
 {id:'quranenc',label:'QuranEnc — traductions du Coran',group:'islam',language:'Multilingue',icon:'☪',url:'https://quranenc.com/',mode:'browse',topics:['Coran','Traductions'],desc:'Traductions et interprétations du Coran, formats selon les publications.'},
 {id:'safahat',label:'Safahat (ex-Hindawi) — bibliothèque arabe',group:'islam',language:'Arabe',icon:'📗',url:'https://www.safahat.org/books/',mode:'direct',topics:['Arabe','Histoire','Culture'],desc:'Bibliothèque littéraire et scientifique arabophone, dont l’histoire islamique.'},
 {id:'safahat-history',label:'Safahat — histoire islamique',group:'islam',language:'Arabe',icon:'🏺',url:'https://www.safahat.org/books/collections/28989898//',mode:'direct',topics:['Histoire','Sira','Culture'],desc:'Collection éditoriale sur l’histoire islamique.'}
]);
export const TOPICS = Object.freeze(['Tous','Coran','Tafsir','Hadith','Fiqh','Usul al-fiqh','Sira','Histoire','Arabe','Manuscrits','Classiques','Romans','Recherche']);
