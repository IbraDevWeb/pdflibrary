import test from "node:test";
import assert from "node:assert/strict";
import {DISCIPLINES,MADHAHIB,isIslamicBook,normalizeIslamicMetadata,normalizeSearch,filterIslamicBooks,groupIslamicAuthors,islamicStatistics,bookBibDescription} from "../src/islamic-library.js";

const books=[
 {id:"a",title:"الْفِقْهُ الْمَالِكِيّ",author:"Ibn Rushd",notes:"Étude du droit et du raisonnement",category:"Sciences islamiques/Ouvrages",
  islamic:{enabled:true,discipline:"fiqh",madhhab:"maliki",language:"ar",authorArabic:"ابن رشد",authorDeathHijri:"595 H",originalTitle:"بداية المجتهد",publisher:"Édition test"},annotations:[{text:"Débat sur les contrats",note:"À comparer"}]},
 {id:"b",title:"Hadiths et commentaires",author:"Ibn Rushd",category:"Sciences islamiques/Test",islamic:{enabled:true,discipline:"hadith",language:"fr"},notes:""},
 {id:"c",title:"Essai de mathématiques",author:"Auteur X",category:"Sciences",islamic:{enabled:false,discipline:"fiqh",madhhab:"maliki"}},
 {id:"d",title:"Tafsir du Coran",author:"Traducteur",category:"Sciences islamiques/IslamHouse"}
];
test("taxonomie couvrant le fiqh et les autres sciences, sans inférence bibliographique",()=>{
 assert.ok(DISCIPLINES.some(x=>x.id==="fiqh"));
 assert.ok(DISCIPLINES.some(x=>x.id==="usul"));
 assert.ok(MADHAHIB.some(x=>x.id==="maliki"));
 const data=normalizeIslamicMetadata({enabled:true,discipline:"inconnue",madhhab:"maliki",authorEra:"Époque vérifiée",authorDeathHijri:""});
 assert.equal(data.discipline,"");
 assert.equal(data.madhhab,"maliki");
 assert.equal(data.authorDeathHijri,"");
});
test("source islamique historique reconnue, mais désactivation explicite prioritaire",()=>{
 assert.equal(isIslamicBook(books[3]),true);
 assert.equal(isIslamicBook(books[2]),false);
 assert.equal(isIslamicBook({category:"Sciences islamiques/IslamHouse",islamic:{enabled:false}}),false);
});
test("recherche arabe tolérant harakat et variantes alif, recherche notes et métadonnées",()=>{
 assert.equal(normalizeSearch("الْفِقْهُ"),normalizeSearch("الفقه"));
 assert.equal(normalizeSearch("إِسْلَام"),normalizeSearch("اسلام"));
 assert.deepEqual(filterIslamicBooks(books,{query:"الفقه"}).map(x=>x.id),["a"]);
 assert.deepEqual(filterIslamicBooks(books,{query:"ابن رشد"}).map(x=>x.id),["a"]);
 assert.deepEqual(filterIslamicBooks(books,{query:"contrats"}).map(x=>x.id),["a"]);
 assert.deepEqual(filterIslamicBooks(books,{query:"Édition test"}).map(x=>x.id),["a"]);
 assert.deepEqual(filterIslamicBooks(books,{query:"Édition inexistante"}),[]);
});
test("filtres science, langue, école et auteur se combinent correctement",()=>{
 assert.deepEqual(filterIslamicBooks(books,{discipline:"fiqh",madhhab:"maliki",language:"ar"}).map(x=>x.id),["a"]);
 assert.deepEqual(filterIslamicBooks(books,{discipline:"fiqh",madhhab:"hanafi"}),[]);
 assert.deepEqual(filterIslamicBooks(books,{author:"Ibn Rushd"}).map(x=>x.id),["a","b"]);
});
test("regroupement des auteurs et statistiques ne fabriquent pas de biographie",()=>{
 const authors=groupIslamicAuthors(books);
 assert.equal(authors.find(x=>x.name==="Ibn Rushd").books.length,2);
 assert.equal(authors.find(x=>x.name==="Ibn Rushd").deathHijri,"595 H");
 assert.equal(islamicStatistics(books).books,3);
 assert.equal(islamicStatistics(books).classified,2);
 assert.equal(islamicStatistics(books).authors,2);
 const bibliography=bookBibDescription(books[0]);
 assert.match(bibliography,/595 H/);
 assert.match(bibliography,/Édition test/);
 assert.doesNotMatch(bibliography,/1900/);
});
test("champs libres bornés et entrées invalides rejetées",()=>{
 const obj=normalizeIslamicMetadata({enabled:true,originalTitle:"T".repeat(500),discipline:"unknown",madhhab:"garbage",language:"invalid",authorArabic:"اسم"});
 assert.equal(obj.originalTitle.length,240);
 assert.equal(obj.discipline,"");
 assert.equal(obj.madhhab,"");
 assert.equal(obj.language,"");
 assert.equal(obj.authorArabic,"اسم");
});
