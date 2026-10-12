import test from 'node:test';
import assert from 'node:assert/strict';
import {searchText,searchPDFPages,searchEPUBSections,normalizeTypography,safeHighlightColor,HIGHLIGHT_COLORS,FONT_OPTIONS} from '../src/reader-features.js';
test('recherche sensible aux mots mais pas à la casse',()=>{
 const list=searchText('Bonjour le monde. Et bonjour à vous.','bonjour');
 assert.equal(list.length,2);
 assert.ok(list[0].snippet.toLowerCase().includes('bonjour'));
 assert.deepEqual(searchText('Bonjour','x'),[]);
});
test('recherche PDF sur plusieurs pages avec position et limites',async()=>{
 const pages=['Un essai philosophique','Je cherche une occurrence et une autre occurrence','Rien'];
 let cleanup=0,updated=0;
 const pdf={numPages:pages.length,async getPage(n){
  return {async getTextContent(){return {items:[{str:pages[n-1]}]};},cleanup(){cleanup++;}};
 }};
 const found=await searchPDFPages(pdf,'occurrence',{onProgress:()=>updated++});
 assert.deepEqual(found.matches.map(x=>x.position),[2,2]);
 assert.equal(found.scanned,3);assert.equal(cleanup,3);assert.ok(updated>=1);
 const shortened=await searchPDFPages(pdf,'occurrence',{limit:1});
 assert.equal(shortened.matches.length,1);assert.equal(shortened.truncated,true);
});
test('recherche EPUB avec CFI et libération des chapitres',async()=>{
 let load=0,unload=0;
 const sections=[0,1,2].map(n=>({
  async load(){load++;},
  find(query){return n===1?[{cfi:'epubcfi(/6/4!/4/2:7)',excerpt:'...'+query+'...'}]:[];},
  unload(){unload++;}
 }));
 const book={spine:{spineItems:sections},load:async()=>{}};
 const found=await searchEPUBSections(book,'science');
 assert.equal(found.matches.length,1);
 assert.equal(found.matches[0].kind,'epub');
 assert.ok(found.matches[0].position.startsWith('epubcfi('));
 assert.equal(load,3);assert.equal(unload,3);
});
test('styles EPUB et anciennes couleurs sont sûrs',()=>{
 assert.equal(normalizeTypography({fontFamily:'__inject__',lineHeight:7}).fontFamily,'publisher');
 assert.equal(normalizeTypography({lineHeight:7}).lineHeight,2.2);
 assert.equal(normalizeTypography({lineHeight:0}).lineHeight,1.6);
 assert.equal(safeHighlightColor('notallowed'),'yellow');
 assert.ok(Object.keys(HIGHLIGHT_COLORS).length>=4);
 assert.match(FONT_OPTIONS.readable,/Verdana/);
});
