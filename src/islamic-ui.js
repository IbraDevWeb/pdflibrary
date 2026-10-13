import {DISCIPLINES,MADHAHIB,LANGUAGES,isIslamicBook,islamicMetadata,disciplineName,madhhabName,languageName,
 filterIslamicBooks,groupIslamicAuthors,islamicStatistics,bookBibDescription} from "./islamic-library.js";

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let getBooks=()=>[],onRead=()=>{},onEdit=()=>{},onFind=()=>{},onBrowse=()=>{};
let discipline="",bookLimit=80,authorGroups=[];
function selectValues(){
 const fill=(id,items,blank)=>{
  const control=$(id),current=control.value;
  control.innerHTML='<option value="">'+esc(blank)+'</option>'+items.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.label)+'</option>').join('');
  if([...control.options].some(o=>o.value===current))control.value=current;
 };
 fill("islamicSchool",MADHAHIB.filter(x=>x.id!=="unspecified"),"Toutes les écoles");
 fill("islamicLanguage",LANGUAGES,"Toutes les langues");
}
const activeFilters=()=>({
 query:$("islamicSearch").value,
 discipline,
 madhhab:$("islamicSchool").value,
 language:$("islamicLanguage").value,
 author:$("islamicAuthor").value
});
function authorNames(){
 const current=$("islamicAuthor").value;
 authorGroups=groupIslamicAuthors(getBooks());
 $("islamicAuthor").innerHTML='<option value="">Tous les auteurs</option>'+authorGroups.map(g=>'<option value="'+esc(g.name)+'">'+esc(g.name)+'</option>').join("");
 if(authorGroups.some(g=>g.name===current))$("islamicAuthor").value=current;
}
function renderDisciplines(books){
 const stats=islamicStatistics(books);
 $("islamicDisciplines").innerHTML=DISCIPLINES.map(d=>
  '<button class="islamic-discipline'+(discipline===d.id?' active':'')+'" data-islamic-discipline="'+d.id+'" type="button" aria-pressed="'+String(d.id===discipline)+'">'+
  '<span class="islamic-arabic" lang="ar" dir="rtl">'+esc(d.arabic)+'</span><strong>'+esc(d.label)+'</strong><small>'+stats.disciplines[d.id]+' ouvrage(s)</small></button>'
 ).join("");
 $("islamicClear").disabled=!discipline&&!activeFilters().query&&!activeFilters().madhhab&&!activeFilters().language&&!activeFilters().author;
}
function renderAuthors(){
 const books=filterIslamicBooks(getBooks(),{...activeFilters(),author:""});
 const keys=new Set(books.map(b=>b.id));
 const authors=authorGroups.filter(g=>g.books.some(book=>keys.has(book.id)));
 $("islamicAuthorCount").textContent=authors.length+" auteur(s)";
 $("islamicAuthorCards").innerHTML=authors.length
  ?authors.slice(0,100).map((g,i)=>
   '<button type="button" class="islamic-author" data-islamic-author-profile="'+i+'">'+
   '<strong>'+esc(g.name)+'</strong>'+
   (g.arabic?'<span class="islamic-arabic" lang="ar" dir="auto">'+esc(g.arabic)+'</span>':'')+
   (g.era?'<small>'+esc(g.era)+'</small>':'')+
   (g.deathHijri?'<small>Décès (H) : '+esc(g.deathHijri)+'</small>':'')+
   '<small>'+g.books.length+' ouvrage(s) · Voir la notice</small></button>').join("")
  :'<p class="islamic-empty">Aucun auteur renseigné pour ce filtre.</p>';
 const fullList=authors.slice(0,100);
 $("islamicAuthorCards").onclick=e=>{
  const button=e.target.closest("[data-islamic-author-profile]");
  if(!button)return;
  const group=fullList[Number(button.dataset.islamicAuthorProfile)];
  if(group)showAuthor(group);
 };
}
function showAuthor(author){
 const dialog=$("islamicAuthorDialog");
 const data=$("islamicAuthorDialogContent");
 data.replaceChildren();
 const heading=document.createElement("h3");heading.textContent=author.name;data.append(heading);
 for(const [key,value] of [["Nom arabe",author.arabic],["Époque",author.era],["Décès (H)",author.deathHijri],["Décès (ère commune)",author.deathGregorian]]){
  if(!value)continue;
  const p=document.createElement("p");p.textContent=key+" : "+value;if(key==="Nom arabe"){p.lang="ar";p.dir="auto";p.className="islamic-arabic";}
  data.append(p);
 }
 const label=document.createElement("p");label.textContent="Ouvrages enregistrés dans Folio :";data.append(label);
 const list=document.createElement("ol");
 for(const book of author.books){
  const li=document.createElement("li");li.textContent=book.title+" — "+disciplineName(islamicMetadata(book).discipline);list.append(li);
 }
 data.append(list);
 dialog.showModal();
}
function renderBooks(){
 const all=getBooks();
 const matching=filterIslamicBooks(all,activeFilters());
 const stats=islamicStatistics(all);
 $("islamicCountBooks").textContent=stats.books;
 $("islamicCountAuthors").textContent=stats.authors;
 $("islamicCountClassified").textContent=stats.classified;
 $("islamicResultCount").textContent=matching.length+" ouvrage(s)";
 const limited=matching.slice(0,bookLimit);
 $("islamicResults").innerHTML=limited.map(book=>{
  const m=islamicMetadata(book),id=esc(book.id);
  const details=[m.authorEra,m.publicationYear&&"Éd. "+m.publicationYear,m.publisher].filter(Boolean).join(" · ");
  const school=m.madhhab&&m.madhhab!=="unspecified"?madhhabName(m.madhhab):"";
  return '<article class="islamic-book" data-islamic-book="'+id+'">'+
   '<div class="islamic-book-meta"><span class="islamic-book-tag">'+esc(disciplineName(m.discipline))+'</span>'+
   (school?'<span class="islamic-book-tag">'+esc(school)+'</span>':'')+
   (m.language?'<span class="islamic-book-tag">'+esc(languageName(m.language))+'</span>':'')+'</div>'+
   '<h4>'+esc(book.title)+'</h4>'+
   (m.originalTitle?'<p class="islamic-original" dir="auto" lang="ar">'+esc(m.originalTitle)+'</p>':'')+
   '<p>'+esc(book.author||"Auteur non renseigné")+'</p>'+
   (m.authorArabic?'<p lang="ar" dir="auto">'+esc(m.authorArabic)+'</p>':'')+
   (details?'<span class="islamic-books-data">'+esc(details)+'</span>':'')+
   (m.subdiscipline?'<span class="islamic-books-data">'+esc(m.subdiscipline)+'</span>':'')+
   '<div class="islamic-book-actions">'+
    '<button type="button" data-islamic-read="'+id+'">Lire</button>'+
    '<button type="button" data-islamic-edit="'+id+'">Fiche</button>'+
    ($("islamicSearch").value.trim().length>=2?'<button type="button" data-islamic-find="'+id+'">Dans le texte</button>':'')+
   '</div></article>';
 }).join("");
 if(matching.length>bookLimit){
  $("islamicResults").insertAdjacentHTML("beforeend",'<button type="button" class="islamic-export-more" id="islamicMore">Afficher '+Math.min(80,matching.length-bookLimit)+' autres ouvrages</button>');
 }
 $("islamicEmpty").hidden=matching.length!==0;
}
export function refreshIslamicLibrary(){
 if(!$("islamicLibrary"))return;
 const all=getBooks();
 authorNames();renderDisciplines(all);renderBooks();renderAuthors();
}
export function openIslamicLibrary(){
 $("islamicLibrary").hidden=false;
 document.body.dataset.islamicOpen="true";
 bookLimit=80;
 refreshIslamicLibrary();
 $("islamicLibrary").scrollTop=0;
}
export function closeIslamicLibrary(){
 $("islamicLibrary").hidden=true;
 delete document.body.dataset.islamicOpen;
}
export function backInIslamicLibrary(){
 if($("islamicLibrary").hidden)return false;
 const authorDialog=$("islamicAuthorDialog");
 if(authorDialog.open){authorDialog.close();return true;}
 closeIslamicLibrary();return true;
}
export function setupIslamicLibrary({books,read,edit,find,browse}){
 getBooks=books;onRead=read;onEdit=edit;onFind=find;onBrowse=browse;
 selectValues();
 const dialog=document.createElement("dialog");dialog.id="islamicAuthorDialog";dialog.className="modal islamic-author-dialog";
 dialog.innerHTML='<div class="modal-head"><strong>Notice d’auteur</strong><button type="button" id="islamicAuthorClose" class="icon-button" aria-label="Fermer la notice">×</button></div><div id="islamicAuthorDialogContent" class="islamic-author-profile"></div>';
 document.body.append(dialog);
 $("islamicAuthorClose").addEventListener("click",()=>dialog.close());
 dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
 for(const id of ["islamicOpen","islamicSide","islamicMobile"])$(id).addEventListener("click",openIslamicLibrary);
 $("islamicClose").addEventListener("click",closeIslamicLibrary);
 $("islamicCatalog").addEventListener("click",onBrowse);
 $("islamicDisciplines").addEventListener("click",e=>{
  const button=e.target.closest("[data-islamic-discipline]");if(!button)return;
  discipline=discipline===button.dataset.islamicDiscipline?"":button.dataset.islamicDiscipline;
  bookLimit=80;refreshIslamicLibrary();
 });
 $("islamicClear").addEventListener("click",()=>{
  discipline="";bookLimit=80;
  $("islamicSearch").value="";
  for(const id of ["islamicSchool","islamicLanguage","islamicAuthor"])$(id).value="";
  refreshIslamicLibrary();
 });
 $("islamicSearch").addEventListener("input",()=>{bookLimit=80;refreshIslamicLibrary();});
 for(const id of ["islamicSchool","islamicLanguage","islamicAuthor"])
  $(id).addEventListener("change",()=>{bookLimit=80;refreshIslamicLibrary();});
 $("islamicResults").addEventListener("click",e=>{
  if(e.target.closest("#islamicMore")){bookLimit+=80;refreshIslamicLibrary();return;}
  for(const [attribute,action] of [["data-islamic-read",onRead],["data-islamic-edit",onEdit],["data-islamic-find",id=>onFind(id,$("islamicSearch").value.trim())]]){
   const button=e.target.closest("["+attribute+"]");
   if(button){action(button.getAttribute(attribute));return;}
  }
 });
 document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!$("islamicLibrary").hidden&&$("reader").hidden&&$("catalog").hidden&&!dialog.open&&!document.querySelector("dialog[open]")){backInIslamicLibrary();}
 });
}
