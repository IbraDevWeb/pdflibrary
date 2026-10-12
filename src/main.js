import './reader.css';
import { initStorage,allBooks,saveBook,removeBookRecord,storeFile,bookBlob,deleteBookFile,inspectFile,kindOf,idForBook,exportZip,restoreZip,native,saveOrShare } from './storage.js';
import { Reader,generateCover,epubMetadata } from './reader.js';
import { setupCatalog,validateExternalUrl } from './catalog.js';
import { downloadToLibrary } from './direct-download.js';

const $=id=>document.getElementById(id);
const icon=name=>'<svg class="icon" aria-hidden="true"><use href="#i-'+name+'"/></svg>';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=[['#284d48','#17352e'],['#a66e53','#764b3c'],['#466a7a','#263e57'],['#7d6587','#4e405d'],['#9e8260','#6b573b'],['#5e765a','#374c38'],['#aa6963','#773f48']];
let books=[],view='all',layout=localStorage.getItem('folio-layout')==='list'?'list':'grid';
let editingId=null,editingRating=0,query='',toastTimer,installPrompt=null,editingRead=null,loaded=false;
const coverURLs=new Map();
const findBook=id=>books.find(book=>book.id===id);

function toast(message,error=false){
  const t=$('toast');t.textContent=message;t.className='toast show'+(error?' error':'');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.className='toast',4500);
}
function palette(book){
  let hash=0;for(const char of book.title||'')hash=(hash*31+char.charCodeAt(0))|0;
  return colors[Math.abs(hash)%colors.length];
}
function coverUrl(book){
  if(!(book.cover instanceof Blob))return null;
  if(!coverURLs.has(book.id))coverURLs.set(book.id,URL.createObjectURL(book.cover));
  return coverURLs.get(book.id);
}
function statusText(s){return s==='finished'?'Terminé':s==='reading'?'En cours':'À lire';}
function stars(score){
  const n=Math.max(0,Math.min(5,Number(score)||0));
  return '★'.repeat(n)+'<span class="dim">'+'☆'.repeat(5-n)+'</span>';
}
function categoryMatch(bookCategory,selected){
  if(!selected)return true;
  return bookCategory===selected||bookCategory?.startsWith(selected+'/');
}
function pct(book){
  if(book.status==='finished')return 100;
  const manual=Number(book.progress)||0;
  const pdf=Number(book.totalPages)>0?Math.floor(((Number(book.page)||1)/Number(book.totalPages))*100):0;
  return Math.min(100,Math.max(0,Math.max(manual,pdf)));
}
function filtered(){
  const author=$('filterAuthor').value,cat=$('filterCategory').value,
    rating=Number($('filterRating').value)||0,progress=$('filterProgress').value,kind=$('filterKind').value;
  return books.filter(book=>{
    if(view==='favorites'&&!book.favorite)return false;
    if(view==='reading'&&book.status!=='reading')return false;
    if(view==='finished'&&book.status!=='finished')return false;
    if(view.startsWith('category:')&&!categoryMatch(book.category,view.slice(9)))return false;
    if(author&&book.author!==author)return false;
    if(cat&&!categoryMatch(book.category,cat))return false;
    if(kind&&kindOf(book)!==kind)return false;
    if(rating&&(Number(book.rating)||0)<rating)return false;
    const percentage=pct(book);
    if(progress==='not-started'&&(book.status!=='to-read'))return false;
    if(progress==='in-progress'&&book.status!=='reading')return false;
    if(progress==='completed'&&book.status!=='finished'&&percentage<100)return false;
    const text=[book.title,book.author,book.category,...(book.tags||[]),book.notes,...(book.annotations||[]).map(a=>a.text||'')].join(' ').toLocaleLowerCase();
    return text.includes(query.toLocaleLowerCase());
  }).sort((a,b)=>{
    const sort=$('sortSelect').value;
    if(sort==='title')return (a.title||'').localeCompare(b.title||'','fr');
    if(sort==='author')return (a.author||'').localeCompare(b.author||'','fr');
    if(sort==='rating')return (Number(b.rating)||0)-(Number(a.rating)||0)||b.createdAt-a.createdAt;
    return (b.createdAt||0)-(a.createdAt||0);
  });
}
function card(book){
  const colors=palette(book),id=escape(book.id),cover=coverUrl(book);
  const style=cover?"background-image:url('"+cover+"');background-size:cover;background-position:center":
    'background:linear-gradient(145deg,'+colors[0]+','+colors[1]+')';
  const progress=pct(book);
  return '<article class="book-card"><button class="cover-button" data-action="read" data-id="'+id+'" aria-label="Lire '+escape(book.title)+'">'+
    '<div class="book-cover '+(cover?'with-cover':'')+'" style="'+style+'"><div class="cover-inner">'+
    '<span class="cover-small">FOLIO · '+kindOf(book).toUpperCase()+'</span><span class="cover-line"></span><span class="cover-title">'+escape(book.title)+'</span><span class="cover-line"></span><span class="cover-author">'+escape(book.author||'BIBLIOTHÈQUE PRIVÉE')+'</span></div></div></button>'+
    '<button class="book-fav'+(book.favorite?' active':'')+'" data-action="favorite" data-id="'+id+'" aria-label="'+(book.favorite?'Retirer des favoris':'Ajouter aux favoris')+'">'+icon('heart')+'</button>'+
    '<div class="book-data"><span class="book-category">'+escape(book.category||'Non classé')+' · '+kindOf(book).toUpperCase()+'</span>'+
    '<button class="book-title-link" data-action="edit" data-id="'+id+'"><span class="book-title">'+escape(book.title)+'</span></button>'+
    '<p class="book-author">'+escape(book.author||'Auteur inconnu')+'</p>'+
    '<div class="book-meta"><span class="status '+escape(book.status||'to-read')+'">'+statusText(book.status)+'</span><span class="rating-display">'+stars(book.rating)+'</span></div>'+
    (book.status==='reading'?'<div class="book-progress"><span style="width:'+progress+'%"></span></div>':'')+
    '</div></article>';
}
function restoreOptions(select,items){
  const previous=select.value;
  const prefix=select.options[0].outerHTML;
  select.innerHTML=prefix+items.map(x=>'<option value="'+escape(x)+'">'+escape(x)+'</option>').join('');
  if(items.includes(previous))select.value=previous;
}
function refreshFilters(){
  const authors=[...new Set(books.map(x=>x.author).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
  const categories=[...new Set(books.map(x=>x.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
  restoreOptions($('filterAuthor'),authors);
  restoreOptions($('filterCategory'),categories);
  $('categorySuggestions').innerHTML=categories.map(c=>'<option value="'+escape(c)+'"></option>').join('');
}
function makeCollections(){
  const categories=new Set();
  for(const book of books){
    const bits=(book.category||'').split('/').map(x=>x.trim()).filter(Boolean);
    bits.forEach((_,i)=>categories.add(bits.slice(0,i+1).join('/')));
  }
  const sorted=[...categories].sort((a,b)=>a.localeCompare(b,'fr'));
  $('collectionNav').innerHTML=sorted.map(c=>{
    const depth=c.split('/').length-1,selected=view==='category:'+c;
    return '<button class="nav-link'+(selected?' active':'')+'" style="padding-left:'+(13+Math.min(depth,3)*10)+'px" data-view="category:'+escape(c)+'"><span class="collection-dot"></span>'+
      escape(c.split('/').pop())+'<span class="nav-count">'+books.filter(b=>categoryMatch(b.category,c)).length+'</span></button>';
  }).join('');
}
function render(){
  if(!loaded)return;
  const reading=books.filter(x=>x.status==='reading'),finished=books.filter(x=>x.status==='finished'),favs=books.filter(x=>x.favorite);
  const numbers={all:books.length,reading:reading.length,finished:finished.length,favorites:favs.length};
  for(const [key,value] of Object.entries(numbers)){
    $('stat'+key[0].toUpperCase()+key.slice(1)).textContent=value;
    $('count-'+key).textContent=value;
  }
  refreshFilters();makeCollections();
  document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  document.querySelectorAll('[data-layout]').forEach(el=>el.classList.toggle('active',el.dataset.layout===layout));
  const title=view.startsWith('category:')?view.slice(9):({all:'Tous mes livres',reading:'Lectures en cours',finished:'Livres terminés',favorites:'Mes favoris'}[view]||'Ma bibliothèque');
  $('sectionTitle').firstChild.textContent=title+' ';
  const shown=filtered();
  $('resultCount').textContent=shown.length;
  $('booksGrid').className='books-grid'+(layout==='list'?' list-layout':'');
  $('booksGrid').innerHTML=shown.map(card).join('');
  $('emptyState').hidden=shown.length>0;
  $('emptyTitle').textContent=books.length?'Aucun résultat':'Votre bibliothèque vous attend';
  $('emptyDescription').textContent=books.length?'Essayez un autre filtre ou une autre recherche.':'Ajoutez un PDF ou un EPUB pour commencer votre collection.';
  $('emptyAction').hidden=books.length>0;
  const last=[...reading].filter(b=>b.lastReadAt).sort((a,b)=>b.lastReadAt-a.lastReadAt)[0];
  $('resumeSection').hidden=!last;
  if(last){
    const c=palette(last),cover=coverUrl(last),style=cover?"background:url('"+cover+"') center / cover":'background:linear-gradient(145deg,'+c[0]+','+c[1]+')';
    $('resumeContent').innerHTML='<div class="resume-content"><div class="resume-cover" style="'+style+'"></div><div class="resume-detail"><strong>'+escape(last.title)+'</strong><span>'+escape(last.author||'Auteur inconnu')+' · '+pct(last)+' %</span><div class="resume-progress"><span style="width:'+pct(last)+'%"></span></div></div><button class="button button-primary resume-button" data-action="read" data-id="'+escape(last.id)+'">Continuer '+icon('arrow')+'</button></div>';
  }
}
async function reload(){
  for(const url of coverURLs.values())URL.revokeObjectURL(url);
  coverURLs.clear();
  books=await allBooks();loaded=true;render();updateStorage();
}
function progressRefresh(){ render(); }
async function createCoverMissing(){
  for(const book of books){
    if(book.cover||!book.file&&!book.filePath)continue;
    try{
      const cover=await generateCover(await bookBlob(book),kindOf(book));
      if(cover){book.cover=cover;await saveBook(book);const url=coverURLs.get(book.id);if(url){URL.revokeObjectURL(url);coverURLs.delete(book.id);}render();}
    }catch(e){console.warn('Couverture non disponible',book.title,e);}
  }
}
async function importFiles(files){
  const items=Array.from(files||[]);
  if(!items.length)return;
  let added=0,errors=[];
  for(const file of items){
    let stored;
    try{
      const kind=await inspectFile(file);
      const id=idForBook(),now=Date.now();
      const baseName=(file.name||'Livre').replace(/\.(pdf|epub)$/i,'').replace(/[_-]+/g,' ').trim()||'Livre';
      const meta=kind==='epub'?await epubMetadata(file):{};
      stored=await storeFile(id,file,kind);
      const cover=await generateCover(file,kind);
      const book={
        id,title:meta.title||baseName,author:meta.author||'',category:'',tags:[],rating:0,favorite:false,
        status:'to-read',notes:'',page:1,totalPages:null,position:null,progress:0,bookmarks:[],annotations:[],
        theme:'light',zoom:1,createdAt:now,updatedAt:now,lastReadAt:null,cover,...stored
      };
      await saveBook(book);added++;
    }catch(e){errors.push((file.name||'Livre')+' : '+e.message);}
  }
  $('importDialog').close();
  await reload();
  toast(errors.length?errors[0]:added+' livre(s) ajouté(s).',errors.length>0);
  if(added&&navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
}
let remoteBusy=false;
async function importRemoteBook(item,report=()=>{}){
  if(!loaded)throw new Error('Le stockage local est indisponible.');
  if(remoteBusy)throw new Error('Un autre téléchargement est déjà en cours.');
  if(books.some(book=>book.sourceUrl===item.url))throw new Error('Ce livre a déjà été téléchargé dans Folio.');
  remoteBusy=true;
  let data=null;
  try {
    const url=validateExternalUrl(item.url);
    const parsed=new URL(url),kind=item.format==='epub'?'epub':'pdf';
    const filename=decodeURIComponent(parsed.pathname.split('/').pop()||'Livre');
    const tentative=String(item.title||filename.replace(/\.(pdf|epub)$/i,'').replace(/[_-]+/g,' ')).trim().slice(0,180)||'Livre';
    data=await downloadToLibrary({url,format:kind,title:tentative},report);
    const meta=kind==='epub'?await epubMetadata(data.file):{};
    const cover=await generateCover(data.file,kind);
    const now=Date.now();
    const fromBEQ=/^(?:www\.)?beq\.ebooksgratuits\.com$/i.test(parsed.hostname);
    const book={
      id:data.stored.id,title:meta.title||tentative,author:meta.author||'',
      category:fromBEQ?'Téléchargements/BEQ':'Téléchargements',
      tags:[],rating:0,favorite:false,status:'to-read',notes:'',page:1,totalPages:null,
      position:null,progress:0,bookmarks:[],annotations:[],theme:'light',zoom:1,
      createdAt:now,updatedAt:now,lastReadAt:null,
      sourceUrl:url,sourceName:parsed.hostname,cover,...data.stored
    };
    await saveBook(book);
    await reload();
    toast('« '+book.title+' » a été ajouté à Folio.');
    return book;
  }catch(e){
    if(data?.stored?.filePath)await deleteBookFile(data.stored);
    throw e;
  }finally{remoteBusy=false;}
}
async function importLink(e){
  e.preventDefault();
  const button=$('urlForm').querySelector('button[type="submit"]');
  button.disabled=true;button.textContent='Téléchargement en cours…';
  try {
    const url=validateExternalUrl($('pdfUrl').value.trim());
    const pathname=new URL(url).pathname;
    const format=/\.epub$/i.test(pathname)?'epub':/\.pdf$/i.test(pathname)?'pdf':null;
    if(!format)throw new Error('Saisissez un lien direct se terminant par .pdf ou .epub, ou ouvrez « Découvrir » pour explorer un site.');
    const title=decodeURIComponent(pathname.split('/').pop()).replace(/\.(pdf|epub)$/i,'').replace(/[_-]+/g,' ');
    await importRemoteBook({url,format,title});
    $('importDialog').close();$('pdfUrl').value='';
  }catch(error){toast('Import impossible : '+error.message,true);}
  finally{button.disabled=false;button.textContent='Importer le livre';}
}
function openEdit(id){
  const book=findBook(id);if(!book)return;
  editingId=id;editingRating=Number(book.rating)||0;
  const fields={editTitle:book.title,editAuthor:book.author||'',editCategory:book.category||'',editTags:(book.tags||[]).join(', '),editNotes:book.notes||'',editStatus:book.status||'to-read',editPage:book.page||'',editTotal:book.totalPages||''};
  for(const [name,value] of Object.entries(fields))$(name).value=value;
  drawRating();
  $('editDialog').showModal();
}
function drawRating(){
  $('editRating').innerHTML=[1,2,3,4,5].map(n=>'<button type="button" class="'+(n<=editingRating?'selected':'')+'" data-rate="'+n+'" aria-label="'+n+' étoiles">'+icon('star')+'</button>').join('')+'<button type="button" data-rate="0" class="reset-rating">Effacer</button>';
}
async function saveEdit(e){
  e.preventDefault();const book=findBook(editingId);
  if(!book)return;
  const title=$('editTitle').value.trim();
  if(!title)return;
  Object.assign(book,{
    title,author:$('editAuthor').value.trim(),category:$('editCategory').value.split('/').map(s=>s.trim()).filter(Boolean).join('/'),
    tags:$('editTags').value.split(',').map(s=>s.trim()).filter(Boolean).slice(0,40),
    status:$('editStatus').value,rating:editingRating,notes:$('editNotes').value,
    page:Math.max(1,Math.floor(Number($('editPage').value)||1)),
    totalPages:Math.max(0,Math.floor(Number($('editTotal').value)||0))||null,updatedAt:Date.now()
  });
  if(book.status==='finished')book.progress=100;
  await saveBook(book);$('editDialog').close();await reload();toast('Fiche enregistrée.');
  if(!$('reader').hidden){$('readerTitle').textContent=book.title;$('readerAuthor').textContent=book.author||'';}
}
async function deleteBook(){
  const book=findBook(editingId);
  if(!book||!confirm('Supprimer définitivement « '+book.title+' » de cet appareil ?'))return;
  Reader.close();await deleteBookFile(book);await removeBookRecord(book.id);
  $('editDialog').close();await reload();toast('Livre supprimé.');
}
async function favorite(id){
  const book=findBook(id);if(!book)return;
  book.favorite=!book.favorite;book.updatedAt=Date.now();
  await saveBook(book);render();
}
async function download(id){
  const book=findBook(id);if(!book)return;
  try {
    const file=await bookBlob(book);
    const filename=(book.title||'livre').replace(/[\\/:*?"<>|]/g,'-').slice(0,110)+'.'+kindOf(book);
    await saveOrShare(file,filename);
  } catch(e){toast('Export impossible : '+e.message,true);}
}
async function openBook(id){
  const book=findBook(id);
  if(!book)return;
  Reader.open(book,{onUpdate:progressRefresh,onEdit:openEdit,onDownload:download});
}
async function updateStorage(){
  if(native){
    $('storageInfo').textContent='Android : PDF et EPUB dans le répertoire privé de Folio, fiches en IndexedDB.';
    $('persistStorage').hidden=true;
    $('installApp').textContent='Folio est déjà une application Android';
    $('installApp').disabled=true;
    return;
  }
  try{
    const usage=await navigator.storage?.estimate?.();
    $('storageInfo').textContent=usage?.usage!=null?'Stockage navigateur : '+(usage.usage/1048576).toFixed(1)+' Mo utilisés (estimation).':'Fichiers conservés sur cet appareil.';
  }catch(e){$('storageInfo').textContent='Stockage local du navigateur.';}
}
async function backup(){
  const btn=$('backupExport');
  btn.disabled=true;btn.textContent='Préparation de la sauvegarde…';
  try{
    const blob=await exportZip(books);
    await saveOrShare(blob,'folio-'+new Date().toISOString().slice(0,10)+'.zip');
    toast('Sauvegarde ZIP créée. Conservez-la dans un dossier sûr.');
  }catch(e){toast('Erreur de sauvegarde : '+e.message,true);}
  finally{btn.disabled=false;btn.textContent='Exporter ma bibliothèque (.zip)';}
}
async function restore(file){
  try{
    const result=await restoreZip(file,new Set(books.map(b=>b.id)));
    $('settingsDialog').close();await reload();toast(result.added+' livre(s) restauré(s), '+result.skipped+' déjà présent(s).');
  }catch(e){toast('Import ZIP impossible : '+e.message,true);}
}
function changeView(next){view=next;query='';$('searchInput').value='';render();window.scrollTo({top:0,behavior:'smooth'});}
function events(){
  setupCatalog({onImport:importRemoteBook});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-open-import]')){$('importDialog').showModal();return;}
    const button=e.target.closest('[data-view]');
    if(button){changeView(button.dataset.view);return;}
    const lay=e.target.closest('[data-layout]');
    if(lay){layout=lay.dataset.layout;localStorage.setItem('folio-layout',layout);render();return;}
    const tab=e.target.closest('[data-import-tab]');
    if(tab){const url=tab.dataset.importTab==='url';$('filePanel').hidden=url;$('urlForm').hidden=!url;$('fileTab').classList.toggle('active',!url);$('urlTab').classList.toggle('active',url);return;}
    const rate=e.target.closest('[data-rate]');
    if(rate){editingRating=Number(rate.dataset.rate);drawRating();return;}
    const action=e.target.closest('[data-action]');
    if(action){
      if(action.dataset.action==='read')openBook(action.dataset.id);
      if(action.dataset.action==='edit')openEdit(action.dataset.id);
      if(action.dataset.action==='favorite')favorite(action.dataset.id);
      return;
    }
    if(e.target.closest('.close-dialog'))e.target.closest('dialog').close();
  });
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();}));
  $('searchInput').addEventListener('input',e=>{query=e.target.value.trim();render();});
  $('sortSelect').addEventListener('change',render);
  for(const id of ['filterAuthor','filterCategory','filterRating','filterProgress','filterKind'])$(id).addEventListener('change',render);
  $('resetFilters').addEventListener('click',()=>{for(const id of ['filterAuthor','filterCategory','filterRating','filterProgress','filterKind'])$(id).value='';render();});
  $('pdfFiles').addEventListener('change',e=>{importFiles(e.target.files);e.target.value='';});
  const drop=$('dropZone');
  drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover');});
  drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));
  drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragover');importFiles(e.dataTransfer.files);});
  $('urlForm').addEventListener('submit',importLink);
  $('editForm').addEventListener('submit',saveEdit);
  $('deleteBook').addEventListener('click',deleteBook);
  for(const id of ['settingsTop','settingsSide'])$(id).addEventListener('click',()=>{updateStorage();$('settingsDialog').showModal();});
  $('persistStorage').addEventListener('click',async()=>{const granted=await navigator.storage?.persist?.();toast(granted?'Stockage persistant autorisé.':'Stockage persistant non accordé.');});
  $('backupExport').addEventListener('click',backup);
  $('backupImport').addEventListener('change',e=>{if(e.target.files[0])restore(e.target.files[0]);e.target.value='';});
  $('installApp').addEventListener('click',async()=>{
    if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();}
    else alert('Depuis Chrome Android : menu ⋮ → Installer l’application / Ajouter à l’écran d’accueil.');
  });
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('searchInput').focus();}});
}
async function start(){
  events();
  try{await initStorage();await reload();createCoverMissing();}
  catch(e){console.error(e);$('emptyState').hidden=false;$('emptyTitle').textContent='Stockage indisponible';$('emptyDescription').textContent=e.message;toast('Impossible d’ouvrir le stockage local.',true);}
}
start();
