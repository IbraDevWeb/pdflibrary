/** Folio | Sciences islamiques : référentiel local, sans biographies inventées.
 * Les métadonnées d'auteurs, dates, madhhab et édition sont saisies par le lecteur.
 */
export const DISCIPLINES=Object.freeze([
 {id:"quran",label:"Coran & tafsîr",arabic:"القرآن والتفسير",detail:"Tafsîr, qirâ'ât, sciences coraniques"},
 {id:"hadith",label:"Hadith & Sunna",arabic:"الحديث والسنة",detail:"Recueils, commentaires, sciences du hadith"},
 {id:"fiqh",label:"Fiqh",arabic:"الفقه",detail:"Jurisprudence, écoles et questions juridiques"},
 {id:"usul",label:"Usûl al-fiqh",arabic:"أصول الفقه",detail:"Fondements du droit et règles juridiques"},
 {id:"aqida",label:"ʿAqîda",arabic:"العقيدة",detail:"Croyance et théologie"},
 {id:"sira",label:"Sîra & biographie",arabic:"السيرة",detail:"Vie prophétique et biographies"},
 {id:"arabic",label:"Langue arabe",arabic:"اللغة العربية",detail:"Grammaire, morphologie et balâgha"},
 {id:"history",label:"Histoire islamique",arabic:"التاريخ الإسلامي",detail:"Histoire, géographie et civilisations"},
 {id:"akhlaq",label:"Akhlâq & spiritualité",arabic:"الأخلاق والتزكية",detail:"Éthique, comportement et éducation de l'âme"},
 {id:"other",label:"Autres sciences",arabic:"علوم أخرى",detail:"Autres domaines de recherche"}
]);
export const MADHAHIB=Object.freeze([
 {id:"maliki",label:"Mâlikite"},{id:"hanafi",label:"Hanafite"},
 {id:"shafii",label:"Shâfiʿite"},{id:"hanbali",label:"Hanbalite"},
 {id:"comparative",label:"Comparatif"},{id:"unspecified",label:"Non précisé"}
]);
export const LANGUAGES=Object.freeze([
 {id:"ar",label:"Arabe"},{id:"fr",label:"Français"},{id:"en",label:"Anglais"},
 {id:"other",label:"Autre"}
]);
const STR_FIELDS=Object.freeze({
 discipline:24,subdiscipline:100,madhhab:24,language:16,
 originalTitle:240,authorArabic:180,authorEra:90,authorDeathHijri:40,
 authorDeathGregorian:40,translator:160,publisher:160,edition:120,
 publicationYear:40,volume:40,sourceNotes:500
});
const hasOwn=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const short=(value,length)=>String(value??"").trim().slice(0,length);
export function normalizeIslamicMetadata(value={}){
 const v=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
 const normalized={enabled:v.enabled===true};
 for(const [key,length] of Object.entries(STR_FIELDS))normalized[key]=short(v[key],length);
 if(!DISCIPLINES.some(d=>d.id===normalized.discipline))normalized.discipline="";
 if(!MADHAHIB.some(d=>d.id===normalized.madhhab))normalized.madhhab="";
 if(!LANGUAGES.some(d=>d.id===normalized.language))normalized.language="";
 return normalized;
}
export function isIslamicBook(book){
 return book?.islamic?.enabled===true||/^sciences islamiques(?:\/|$)/i.test(String(book?.category||""));
}
export function islamicMetadata(book){return normalizeIslamicMetadata({...book?.islamic,enabled:isIslamicBook(book)});}
export function disciplineName(id){return DISCIPLINES.find(x=>x.id===id)?.label||"À classer";}
export function madhhabName(id){return MADHAHIB.find(x=>x.id===id)?.label||"Non précisé";}
export function languageName(id){return LANGUAGES.find(x=>x.id===id)?.label||"Non précisée";}
export function normalizeSearch(input){
 return String(input||"").normalize("NFKD")
  .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,"")
  .replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ؤ/g,"و").replace(/ئ/g,"ي")
  .replace(/œ/g,"oe").replace(/æ/g,"ae").toLocaleLowerCase().replace(/[\u2018\u2019ʻʿ]/g,"").replace(/\s+/g," ").trim();
}
export function searchTokens(query){return normalizeSearch(query).split(/\s+/).filter(Boolean).slice(0,12);}
export function searchableBookText(book){
 const meta=islamicMetadata(book);
 const parts=[
  book.title,book.author,book.category,book.notes,book.sourceName,
  ...(book.tags||[]),
  ...Object.values(meta).filter(v=>typeof v==="string"),
  disciplineName(meta.discipline),madhhabName(meta.madhhab),languageName(meta.language),
  ...(book.annotations||[]).flatMap(a=>[a.text,a.note]),
  ...(book.bookmarks||[]).map(b=>b.label)
 ];
 return normalizeSearch(parts.join(" "));
}
export function filterIslamicBooks(books,{query="",discipline="",madhhab="",language="",author=""}={}){
 const tokens=searchTokens(query);
 return (books||[]).filter(book=>{
  if(!isIslamicBook(book))return false;
  const meta=islamicMetadata(book);
  if(discipline&&meta.discipline!==discipline)return false;
  if(madhhab&&meta.madhhab!==madhhab)return false;
  if(language&&meta.language!==language)return false;
  if(author&&normalizeSearch(book.author||meta.authorArabic)!==normalizeSearch(author))return false;
  if(tokens.length&&!tokens.every(t=>searchableBookText(book).includes(t)))return false;
  return true;
 });
}
export function groupIslamicAuthors(books){
 const groups=new Map();
 for(const book of books||[]){
  if(!isIslamicBook(book))continue;
  const meta=islamicMetadata(book),label=short(book.author||meta.authorArabic,150);
  if(!label)continue;
  const key=normalizeSearch(label);
  if(!groups.has(key))groups.set(key,{name:label,arabic:meta.authorArabic||"",era:meta.authorEra||"",deathHijri:meta.authorDeathHijri||"",deathGregorian:meta.authorDeathGregorian||"",books:[],key});
  const group=groups.get(key);
  group.books.push(book);
  for(const field of ["arabic","era","deathHijri","deathGregorian"]){
   const v=field==="arabic"?meta.authorArabic:field==="era"?meta.authorEra:field==="deathHijri"?meta.authorDeathHijri:meta.authorDeathGregorian;
   if(!group[field]&&v)group[field]=v;
  }
 }
 return [...groups.values()].sort((a,b)=>b.books.length-a.books.length||a.name.localeCompare(b.name,"fr"));
}
export function islamicStatistics(books){
 const collection=(books||[]).filter(isIslamicBook);
 return {books:collection.length,authors:groupIslamicAuthors(collection).length,
  classified:collection.filter(b=>Boolean(islamicMetadata(b).discipline)).length,
  disciplines:Object.fromEntries(DISCIPLINES.map(d=>[d.id,collection.filter(b=>islamicMetadata(b).discipline===d.id).length]))};
}
export function bookBibDescription(book){
 const m=islamicMetadata(book);
 return [book.title,m.originalTitle&&"Titre original : "+m.originalTitle,book.author&&"Auteur : "+book.author,
  m.authorArabic&&"Nom arabe : "+m.authorArabic,m.authorEra&&"Époque : "+m.authorEra,
  m.authorDeathHijri&&"Décès (H) : "+m.authorDeathHijri,
  "Discipline : "+disciplineName(m.discipline),
  m.subdiscipline&&"Sous-discipline : "+m.subdiscipline,
  m.madhhab&&"École : "+madhhabName(m.madhhab),
  m.language&&"Langue : "+languageName(m.language),
  m.translator&&"Traduction : "+m.translator,
  m.publisher&&"Éditeur : "+m.publisher,
  m.edition&&"Édition : "+m.edition,
  m.publicationYear&&"Année : "+m.publicationYear,
  m.volume&&"Volume : "+m.volume,
  m.sourceNotes&&"Référence : "+m.sourceNotes].filter(Boolean).join("\n");
}
