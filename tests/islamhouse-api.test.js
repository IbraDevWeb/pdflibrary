import test from 'node:test';
import assert from 'node:assert/strict';
import {islamhouseListUrl,islamhouseDetailsUrl,verifiedAPIUrl,islamhouseList,islamhouseAttachments,
 matchesIslamhouse,islamhouseSearchPages} from '../src/islamhouse-api.js';
const one={id:2807064,title:'Les 40 Hadiths',type:'books',num_attachments:1,
 prepared_by:[{type:'author',kind:'author',title:'An Nawawi'},{type:'author',kind:'translator',title:'Traducteur'}],
 description:'Un livre sur les hadiths.'};
test('API v3 authentique, URLs HTTPS uniquement, aucun site arbitraire',()=>{
 assert.match(islamhouseListUrl('fr',1),/\/main\/books\/fr\/fr\/1\/50\/json$/);
 assert.match(islamhouseListUrl('ar',2),/\/main\/books\/ar\/ar\/2\/50\/json$/);
 assert.match(islamhouseDetailsUrl('2807064'),/get-item\/2807064\/fr\/json$/);
 assert.throws(()=>islamhouseDetailsUrl('../../admin'));
 assert.throws(()=>verifiedAPIUrl('https://evil.example/main/books/fr'));
});
test('fiches d’ouvrages, auteurs et recherche en français ou arabe',()=>{
 const items=islamhouseList({data:[one,{id:2,title:'الْفِقْهُ الْمَالِكِيّ'}]});
 assert.equal(items[0].title,'Les 40 Hadiths');
 assert.equal(items[0].author,'An Nawawi');
 assert.equal(items.length,2);
 assert.ok(matchesIslamhouse(items[0],'Nawawi'));
 assert.ok(matchesIslamhouse(items[0],'hadiths'));
 assert.ok(matchesIslamhouse(items[1],'الفقه المالكي'));
 assert.ok(!matchesIslamhouse(items[0],'titre introuvable'));
});
test('seulement les véritables pièces jointes PDF et EPUB',()=>{
 const book=islamhouseList({data:[one]})[0];
 const details={attachments:[
  {extension_type:'PDF',url:'https://d1.islamhouse.com/files/hadith.pdf',title:'Version complète'},
  {extension_type:'EPUB',url:'https://d1.islamhouse.com/files/hadith',title:'Numérique'},
  {extension_type:'mp3',url:'https://d1.islamhouse.com/files/hadith.mp3'},
  {extension_type:'PDF',url:'https://d1.islamhouse.com/files/hadith.pdf'},
  {extension_type:'PDF',url:'http://evil.test/not-secure.pdf'}
 ]};
 const files=islamhouseAttachments(details,book);
 assert.equal(files.length,2);
 assert.equal(files[0].format,'pdf');
 assert.equal(files[1].format,'epub');
 assert.equal(files[0].sourceGroup,'islam');
});
test('pagination intelligente et annulation sans faux résultats',async()=>{
 const seen=[];
 const fetcher=async url=>{
  seen.push(url);
  return {data:seen.length===1?Array.from({length:50},(_,i)=>({...one,id:i+1})):[]};
 };
 const r=await islamhouseSearchPages({query:'hadith',pages:5,fetcher});
 assert.equal(r.items.length,50);
 assert.equal(r.scanned,50);
 assert.equal(r.exhausted,true);
 assert.equal(seen.length,2);
 const c=await islamhouseSearchPages({query:'hadith',cancelled:()=>true,fetcher});
 assert.equal(c.cancelled,true);
});
