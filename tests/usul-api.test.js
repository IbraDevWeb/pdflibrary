import test from 'node:test';
import assert from 'node:assert/strict';
import {usulSearchUrl,normalizeUsulBook,parseUsulSearch,usulBookLink,usulAuthorLink} from '../src/usul-api.js';

const fixture={
 type:'book',id:'0378IbnKhalafJubayri.Tawassut',
 slug:'al-tawassut-bayna-malik-wa-b.-al-qasim',
 primaryName:'Al-Tawassuṭ bayna Mālik wa-b. al-Qāsim',
 secondaryName:'التوسط بين مالك وابن القاسم',
 author:{primaryName:'Abū ʿUbayd al-Jubayrī',secondaryName:'أبو عبيد الجبيري',slug:'ibn-khalaf-jubayri'},
 advancedGenreIds:['maliki-jurisprudence','comparative-jurisprudence-and-controversial-issues'],
 versions:[{source:'openiti',id:'ab'},{source:'pdf',publicationDetails:{publisher:'دار ابن حزم',publicationYear:'1428',editionNumber:'الأولى'}}]
};
test('le lien de recherche Usul ne permet que les paramètres connus et bornés',()=>{
 const url=new URL(usulSearchUrl('  المدونة  ',{page:2,limit:15,locale:'ar'}));
 assert.equal(url.origin,'https://api.usul.ai');
 assert.equal(url.pathname,'/search/books');
 assert.equal(url.searchParams.get('q'),'المدونة');
 assert.equal(url.searchParams.get('page'),'2');
 assert.equal(url.searchParams.get('locale'),'ar');
 assert.throws(()=>usulSearchUrl('a'));
 const bounded=new URL(usulSearchUrl('malik',{page:9999,limit:999}));
 assert.equal(bounded.searchParams.get('page'),'100');
 assert.equal(bounded.searchParams.get('limit'),'20');
});
test('normalisation du résultat Usul : métadonnées véridiques et titre original',()=>{
 const book=normalizeUsulBook(fixture);
 assert.equal(book.arabicTitle,'التوسط بين مالك وابن القاسم');
 assert.equal(book.author,'Abū ʿUbayd al-Jubayrī');
 assert.equal(book.publisher,'دار ابن حزم');
 assert.equal(book.publicationYear,'1428');
 assert.equal(book.versionCount,2);
 assert.deepEqual(book.genreIds,['maliki-jurisprudence','comparative-jurisprudence-and-controversial-issues']);
 assert.equal(usulBookLink(book),'https://usul.ai/t/al-tawassut-bayna-malik-wa-b.-al-qasim');
 assert.equal(usulAuthorLink(book),'https://usul.ai/author/ibn-khalaf-jubayri');
});
test('pagination Usul et exclusion des objets qui ne sont pas des livres',()=>{
 const parsed=parseUsulSearch({
  results:{page:2,found:120,hits:[fixture,{type:'author',primaryName:'not a book'}]},
  pagination:{totalRecords:120,totalPages:8,currentPage:2,hasNext:true}
 });
 assert.equal(parsed.books.length,1);
 assert.equal(parsed.currentPage,2);
 assert.equal(parsed.total,120);
 assert.equal(parsed.hasNext,true);
});
test('liens non fiables ignorés et aucun PDF n’est exposé au téléchargement',()=>{
 assert.equal(usulBookLink({slug:'../../admin'}),'https://usul.ai/texts');
 assert.equal(usulAuthorLink({authorSlug:'https://evil.test'}),'https://usul.ai/texts');
 assert.equal(normalizeUsulBook({type:'author',primaryName:'Someone'}),null);
 const b=normalizeUsulBook(fixture);
 assert.equal(b.downloadUrl,undefined);
 assert.equal(b.pdfUrl,undefined);
});
