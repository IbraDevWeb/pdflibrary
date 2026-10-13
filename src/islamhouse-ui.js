import {islamhouseListUrl,islamhouseDetailsUrl,fetchIslamhouseJSON,islamhouseList,islamhouseAttachments,
 matchesIslamhouse,IH_PAGE_SIZE} from './islamhouse-api.js';
import {openLibraryWebsite} from './catalog-browser.js';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let onImport=async()=>{},activeRequest=0,query='',language='fr',nextPage=1,exhausted=false,mode='latest';
let books=[],shown=0,scanned=0;
const cache=new Map(),detailCache=new Map(),fileLists=new Map();
const active=token=>token===activeRequest;
function status(text,error=false){
 const target=$('ihStatus');target.textContent=text;target.classList.toggle('error',error);
}
const key=(lang,page)=>lang+':'+page;
async function fetchPage(lang,page){
 const k=key(lang,page);
 if(cache.has(k))return cache.get(k);
 const items=islamhouseList(await fetchIslamhouseJSON(islamhouseListUrl(lang,page)),lang);
 cache.set(k,items);
 return items;
}
function render(){
 const container=$('ihBooks');
 const current=books.slice(0,shown);
 container.innerHTML=current.map(book=>{
  const files=fileLists.get(book.id),filesPanel=files?(
   files.length?'<div class="ih-files">'+files.map((file,i)=>
    '<button type="button" class="ih-download" data-ih-download="'+esc(book.id)+'" data-ih-file="'+i+'">⬇ Télécharger '+esc(file.format.toUpperCase())+' dans Folio'+(file.description?' · '+esc(file.description):'')+'</button>'
   ).join('')+'</div>':
   '<div class="ih-no-file">Aucun PDF/EPUB accessible via cette fiche. Vous pouvez consulter la source officielle.</div>'
  ):'';
  return '<article class="ih-book" data-ih-book="'+esc(book.id)+'">'+
   '<div class="ih-book-cover">📖</div><div class="ih-book-main">'+
   '<h4 dir="auto">'+esc(book.title)+'</h4>'+
   '<p class="ih-book-author">'+esc(book.author||'Auteur non renseigné')+' · '+(book.language==='ar'?'Arabe':'Français')+'</p>'+
   (book.description?'<p class="ih-book-summary">'+esc(book.description.slice(0,210))+'</p>':'')+
   '<div class="ih-book-actions">'+
   '<button type="button" class="ih-formats" data-ih-detail="'+esc(book.id)+'" aria-expanded="'+Boolean(files)+'">'+(files?'Formats disponibles':'Voir les PDF / EPUB')+'</button>'+
   '<button type="button" class="ih-visit" data-ih-visit="'+esc(book.id)+'">Voir la fiche officielle ↗</button></div>'+
   filesPanel+'</div></article>';
 }).join('');
 if(!current.length&&scanned&&!$('ihSearchSubmit').disabled)
  container.innerHTML='<p class="ih-empty">Aucun ouvrage trouvé parmi les '+scanned+' titres examinés. Essayez un mot plus court, une autre langue ou poursuivez la recherche.</p>';
 $('ihContinue').hidden=!(!exhausted&&nextPage<=150||shown<books.length);
 $('ihContinue').textContent=shown<books.length?'Afficher '+Math.min(25,books.length-shown)+' ouvrages supplémentaires':'Chercher dans les pages suivantes →';
}
async function search(reset=true){
 const token=++activeRequest;
 if(reset){
  query=$('ihQuery').value.trim().slice(0,130);
  language=$('ihLanguage').value==='ar'?'ar':'fr';
  mode=query?'search':'latest';
  nextPage=1;exhausted=false;books=[];shown=0;scanned=0;
  fileLists.clear();render();
 }
 $('ihSearchSubmit').disabled=true;
 $('ihContinue').disabled=true;
 const pages=mode==='latest'?1:language==='ar'?8:10;
 let read=0;
 try{
  for(let step=0;step<pages&&nextPage<=150;step++){
   if(!active(token))return;
   const page=nextPage++;
   status((query?'Recherche':'Chargement')+' · '+(read+1)+' / '+pages+' pages · '+scanned+' titres analysés…');
   const items=await fetchPage(language,page);
   if(!active(token))return;
   read++;scanned+=items.length;
   const existing=new Set(books.map(b=>b.id));
   for(const book of items){
    if(existing.has(book.id)||!matchesIslamhouse(book,query))continue;
    existing.add(book.id);books.push(book);
   }
   if(items.length<IH_PAGE_SIZE){exhausted=true;break;}
   // Laisser la WebView rafraîchir les résultats entre deux pages.
   if(step%2===1){shown=Math.min(Math.max(shown,25),books.length);render();await new Promise(r=>setTimeout(r,0));}
  }
  shown=Math.min(Math.max(shown,25),books.length);
  status(books.length+' ouvrage(s) correspondant(s) parmi '+scanned+' titres examinés'+(exhausted?' · catalogue parcouru jusqu’à la fin':' · recherche partielle, continuez pour explorer davantage')+'.');
 }catch(e){
  if(!active(token))return;
  status('Le catalogue structuré est temporairement inaccessible : '+e.message+'. Vous pouvez ouvrir IslamHouse dans le navigateur ou réessayer.',true);
 }finally{
  if(active(token)){$('ihSearchSubmit').disabled=false;$('ihContinue').disabled=false;render();}
 }
}
async function showDetails(id){
 const book=books.find(b=>b.id===id);
 if(!book)return;
 if(fileLists.has(id)){fileLists.delete(id);render();return;}
 const token=activeRequest;
 const button=$('ihBooks').querySelector('[data-ih-detail="'+id+'"]');
 if(button){button.disabled=true;button.textContent='Recherche des fichiers…';}
 try{
  const k=book.language+':'+book.id;
  if(!detailCache.has(k)){
   const response=await fetchIslamhouseJSON(islamhouseDetailsUrl(book.id,book.language));
   detailCache.set(k,response);
  }
  if(!active(token))return;
  fileLists.set(id,islamhouseAttachments(detailCache.get(k),book));
  render();
 }catch(e){
  status('Impossible de récupérer les formats de ce livre : '+e.message+'. Consultez la fiche officielle.',true);
  if(button){button.disabled=false;button.textContent='Réessayer les formats';}
 }
}
function officialUrl(book){
 if(!book)return 'https://islamhouse.com/fr/books/fr/1';
 // L’URL de fiche publique n’est pas garantie : ouvrir la liste correspondant à la langue.
 return book.language==='ar'?'https://islamhouse.com/ar/books/ar/1':'https://islamhouse.com/fr/books/fr/1';
}
export function prepareIslamhouse({onDownload}){
 onImport=onDownload;
 $('ihSearchForm').addEventListener('submit',e=>{e.preventDefault();search(true);});
 $('ihLatest').addEventListener('click',()=>{
  $('ihQuery').value='';search(true);
 });
 document.querySelectorAll('[data-ih-query]').forEach(button=>button.addEventListener('click',()=>{
  $('ihQuery').value=button.dataset.ihQuery;
  if(button.dataset.ihLang)$('ihLanguage').value=button.dataset.ihLang;
  search(true);
 }));
 $('ihContinue').addEventListener('click',()=>{
  if(shown<books.length){shown+=25;render();return;}
  search(false);
 });
 $('ihOpenSite').addEventListener('click',()=>openLibraryWebsite(officialUrl({language:$('ihLanguage').value})).catch(e=>status(e.message,true)));
 $('ihBooks').addEventListener('click',async e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.ihDetail){await showDetails(button.dataset.ihDetail);return;}
  if(button.dataset.ihVisit){
   const book=books.find(b=>b.id===button.dataset.ihVisit);
   if(book)await openLibraryWebsite(officialUrl(book)).catch(err=>status(err.message,true));
   return;
  }
  if(button.dataset.ihDownload){
   const file=fileLists.get(button.dataset.ihDownload)?.[Number(button.dataset.ihFile)];
   if(!file)return;
   button.disabled=true;button.textContent='Téléchargement en cours…';
   try{
    await onImport(file,p=>status('Téléchargement « '+file.title+' »'+(p==null?'…':' · '+p+' %')));
    status('« '+file.title+' » est ajouté à votre bibliothèque et accessible hors ligne.');
    button.textContent='✓ Ajouté à Folio';
   }catch(err){
    status('Téléchargement impossible : '+err.message+'. Essayez un autre fichier PDF ou le site officiel.',true);
    button.disabled=false;button.textContent='Réessayer le téléchargement';
   }
  }
 });
}
export function showIslamhouseSearch({prefill=null,lang=null,loadLatest=false}={}){
 const panel=$('islamhouseSearchSection');
 if(prefill!==null)$('ihQuery').value=prefill;
 if(lang)$('ihLanguage').value=lang;
 panel.scrollIntoView({behavior:'smooth',block:'start'});
 if(loadLatest||prefill?.trim())search(true);
 else $('ihQuery').focus();
}
