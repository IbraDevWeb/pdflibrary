import {searchUsul,usulBookLink} from './usul-api.js';
import {openLibraryWebsite} from './catalog-browser.js';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let query='',locale='en',page=1,token=0,result=null;
let onSwitch=()=>{};
const genreLabel=id=>{
 const names={
  'maliki-jurisprudence':'Fiqh mâlikite',
  'maliki-jurisprudence-and-its-principles':'Fiqh et usûl mâlikites',
  'hanafi-jurisprudence':'Fiqh hanafite',
  'hadith':'Hadith',
  'prophetic-biography':'Sîra',
  'quranic-sciences':'Sciences du Coran',
  'quranic-exegesis':'Tafsîr',
  'jurisprudence':'Fiqh'
 };
 return names[id]||id.replace(/-/g,' ').slice(0,55);
};
function report(value,error=false){
 $('usulStatus').textContent=value;
 $('usulStatus').classList.toggle('error',error);
}
function render(){
 const holder=$('usulResults');
 holder.replaceChildren();
 if(!result){$('usulPage').textContent='';$('usulNext').hidden=true;$('usulPrev').hidden=true;return;}
 const items=result.books;
 if(!items.length){
  const empty=document.createElement('p');
  empty.className='usul-empty';empty.textContent='Aucun ouvrage ne correspond à cette recherche. Essayez un titre arabe, une translittération ou le nom de l’auteur.';
  holder.append(empty);
 }
 for(const book of items){
  const card=document.createElement('article');card.className='usul-card';
  const title=document.createElement('h4');title.textContent=book.title;title.dir='auto';card.append(title);
  if(book.arabicTitle&&book.arabicTitle!==book.title){
   const arabic=document.createElement('p');arabic.className='usul-arabic';arabic.dir='auto';arabic.lang='ar';arabic.textContent=book.arabicTitle;card.append(arabic);
  }
  const author=document.createElement('p');author.className='usul-card-author';author.textContent=book.author?'Auteur : '+book.author:'Auteur non précisé';card.append(author);
  if(book.arabicAuthor){
   const ar=document.createElement('p');ar.className='usul-arabic-author';ar.lang='ar';ar.dir='auto';ar.textContent=book.arabicAuthor;card.append(ar);
  }
  const metadata=document.createElement('div');metadata.className='usul-meta';
  const labels=[
   ...book.genreIds.slice(0,2).map(genreLabel),
   book.publisher?'Éditeur : '+book.publisher:null,
   book.publicationYear?'Publication : '+book.publicationYear:null,
   book.versionCount?book.versionCount+' édition(s) référencée(s)':null
  ].filter(Boolean);
  for(const value of labels){
   const pill=document.createElement('span');pill.textContent=value;metadata.append(pill);
  }
  card.append(metadata);
  const visit=document.createElement('button');visit.type='button';
  visit.dataset.usulBook=book.id;visit.textContent='Lire sur Usul ↗';card.append(visit);
  holder.append(card);
 }
 $('usulPage').textContent='Page '+result.currentPage+' / '+result.totalPages;
 $('usulPrev').hidden=page<=1;
 $('usulNext').hidden=!result.hasNext||page>=100;
}
async function search(nextPage=1){
 const value=$('usulQuery').value.trim();
 if(value.length<2){report('Indiquez un titre ou un auteur de deux caractères au minimum.',true);return;}
 query=value;locale=$('usulLanguage').value;page=nextPage;
 const id=++token;
 result=null;render();
 $('usulSubmit').disabled=true;
 $('usulPrev').disabled=true;$('usulNext').disabled=true;
 report('Recherche des ouvrages sur Usul.ai…');
 try{
  const response=await searchUsul(query,{page,locale,limit:15});
  if(id!==token)return;
  result=response;render();
  report(response.total+' ouvrage(s) référencé(s) pour cette recherche · '+response.books.length+' affiché(s) sur la page '+response.currentPage+'.');
 }catch(error){
  if(id!==token)return;
  report('Recherche intégrée indisponible : '+error.message+' Vous pouvez poursuivre directement sur Usul.ai.',true);
 }finally{
  if(id===token){
   $('usulSubmit').disabled=false;$('usulPrev').disabled=false;$('usulNext').disabled=false;
  }
 }
}
export function setupUsulSearch({onSelectProvider=()=>{}}={}){
 onSwitch=onSelectProvider;
 $('usulSearchForm').addEventListener('submit',event=>{event.preventDefault();search(1);});
 document.querySelectorAll('[data-usul-example]').forEach(button=>button.addEventListener('click',()=>{
  $('usulQuery').value=button.dataset.usulExample;
  if(button.dataset.usulLocale)$('usulLanguage').value=button.dataset.usulLocale;
  search(1);
 }));
 $('usulPrev').addEventListener('click',()=>{if(page>1)search(page-1);});
 $('usulNext').addEventListener('click',()=>{if(result?.hasNext)search(page+1);});
 $('usulVisit').addEventListener('click',()=>openLibraryWebsite('https://usul.ai/texts').catch(e=>report('Impossible d’ouvrir Usul : '+e.message,true)));
 $('usulResults').addEventListener('click',async event=>{
  const button=event.target.closest('[data-usul-book]');
  if(!button||!result)return;
  const selected=result.books.find(book=>book.id===button.dataset.usulBook);
  if(!selected)return;
  try{await openLibraryWebsite(usulBookLink(selected));}
  catch(error){report('Ouverture impossible : '+error.message,true);}
 });
}
export function activateUsulSearch({prefill='',run=false}={}){
 $('usulSearchSection').hidden=false;
 $('islamhouseSearchSection').hidden=true;
 document.querySelectorAll('[data-provider]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.provider==='usul')));
 $('usulSearchSection').scrollIntoView({block:'start',behavior:'smooth'});
 if(prefill)$('usulQuery').value=prefill;
 if(run)search(1);
 else $('usulQuery').focus();
}
export function activateIslamhouseSearch(){
 token++;
 $('usulSearchSection').hidden=true;
 $('islamhouseSearchSection').hidden=false;
 document.querySelectorAll('[data-provider]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.provider==='islamhouse')));
}
