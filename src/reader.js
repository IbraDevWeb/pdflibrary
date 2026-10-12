import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'pdfjs-dist/web/pdf_viewer.css';
import ePub from 'epubjs';
import { bookBlob,kindOf,saveBook } from './storage.js';
import { attachReadingGestures } from './reading-gestures.js';
import { nextZoom } from './gesture-math.js';

pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=null;
let saveTimer=null;

async function persist(){
  const current=state;
  if(!current)return;
  current.book.updatedAt=Date.now();
  current.book.lastReadAt=Date.now();
  try{await saveBook(current.book);current.onUpdate?.();}
  catch(e){console.error('Progression non sauvegardée',e);}
}
export function persistReaderNow(){
  clearTimeout(saveTimer);
  return persist();
}
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(persist,450);
}
function applyTheme(){
  if(!state)return;
  $('reader').dataset.theme=state.book.theme||'light';
  $('readerTheme').textContent=state.book.theme==='dark'?'Nuit':state.book.theme==='sepia'?'Sépia':'Jour';
  if(state.kind==='epub'&&state.rendition){
    const settings={
      light:{color:'#2d322e',background:'#ffffff'},
      sepia:{color:'#503b27',background:'#f3ead7'},
      dark:{color:'#e3e7e1',background:'#19231f'}
    };
    const choice=settings[state.book.theme||'light'];
    state.rendition.themes.override('color',choice.color);
    state.rendition.themes.override('background',choice.background);
  }
}
function updateFooter(){
  if(!state)return;
  const book=state.book;
  $('readerPage').hidden=state.kind==='epub';
  $('readerTotal').textContent=state.kind==='pdf'?' / '+(book.totalPages||'?') : Math.round(book.progress||0)+' %';
  if(state.kind==='pdf')$('readerPage').value=book.page||1;
}
function bookmarkLabel(book){
  return state.kind==='pdf'?'Page '+(book.page||1):'Emplacement EPUB';
}
function currentPosition(){
  return state.kind==='pdf'?(state.book.page||1):(state.book.position||state.rendition?.currentLocation()?.start?.cfi||null);
}
function drawPanel(){
  if(!state)return;
  const {book}=state;
  const bookmarks=book.bookmarks||[];
  const annotations=book.annotations||[];
  const list=[
    '<div class="reader-side-heading">Signets ('+bookmarks.length+')</div>',
    ...bookmarks.map(b=>'<button class="reader-side-item" data-go-bookmark="'+esc(b.id)+'"><span>🔖 '+esc(b.label||'Marque-page')+'</span><small>'+esc(b.kind==='pdf'?'Page '+b.position:'EPUB')+'</small></button>'),
    '<div class="reader-side-heading">Surlignages & notes ('+annotations.length+')</div>',
    ...annotations.map(a=>'<button class="reader-side-item" data-go-annotation="'+esc(a.id)+'"><span>'+esc((a.text||'Surlignage').slice(0,130))+'</span><small>'+esc(a.note||'Appuyer pour consulter / supprimer')+'</small></button>')
  ];
  $('readerNotesList').innerHTML=list.join('');
  const contents=state.chapters||[];
  $('readerChaptersList').innerHTML=contents.length?contents.map((item,i)=>'<button class="reader-side-item" data-chapter="'+i+'">'+esc(item.label||'Chapitre')+'</button>').join(''):'<p class="reader-side-muted">Sommaire non disponible pour ce document.</p>';
}
async function showPosition(position){
  if(!state)return;
  if(state.kind==='pdf'){
    let page=Number(position);
    if(!Number.isFinite(page))return;
    page=Math.max(1,Math.min(state.book.totalPages||1,Math.floor(page)));
    state.book.page=page;
    state.book.progress=Math.round(page/(state.book.totalPages||1)*100);
    await renderPDFPage();
  }else if(position){
    try{await state.rendition.display(position);}catch(e){console.warn('Emplacement EPUB introuvable',e);}
  }
  updateFooter();scheduleSave();
}
function drawPDFMarks(){
  if(!state||state.kind!=='pdf')return;
  const target=$('pdfMarks');
  if(!target)return;
  target.replaceChildren();
  for(const ann of state.book.annotations||[]){
    if(ann.kind!=='pdf'||ann.page!==state.book.page)continue;
    for(const r of ann.rects||[]){
      const box=document.createElement('div');
      box.className='pdf-highlight-rect';
      box.style.cssText='left:'+r.x*100+'%;top:'+r.y*100+'%;width:'+r.w*100+'%;height:'+r.h*100+'%';
      target.append(box);
    }
  }
}
async function renderPDFPage({keepScroll=false}={}){
  const s=state;
  if(!s||s.kind!=='pdf')return;
  const ticket=++s.ticket;
  s.renderTask?.cancel();
  const page=await s.pdf.getPage(s.book.page||1);
  if(s!==state||ticket!==s.ticket)return;
  const host=$('readerContent');
  const oldScroll=keepScroll?{
    x:(host.scrollLeft+host.clientWidth/2)/Math.max(1,host.scrollWidth),
    y:(host.scrollTop+host.clientHeight/2)/Math.max(1,host.scrollHeight)
  }:null;
  host.replaceChildren();
  const orig=page.getViewport({scale:1});
  const availableWidth=Math.max(220,host.clientWidth-25);
  const scale=(availableWidth/orig.width)*(s.book.zoom||1);
  const viewport=page.getViewport({scale});
  const wrapper=document.createElement('div');
  wrapper.className='pdf-page';
  wrapper.style.width=viewport.width+'px';
  wrapper.style.height=viewport.height+'px';
  const canvas=document.createElement('canvas');
  const ratio=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.ceil(viewport.width*ratio);
  canvas.height=Math.ceil(viewport.height*ratio);
  canvas.style.width=viewport.width+'px';
  canvas.style.height=viewport.height+'px';
  wrapper.append(canvas);
  const marks=document.createElement('div');
  marks.id='pdfMarks';marks.className='pdf-marks';
  wrapper.append(marks);
  const layer=document.createElement('div');
  layer.className='textLayer pdf-text-layer';
  wrapper.append(layer);host.append(wrapper);
  s.renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:ratio!==1?[ratio,0,0,ratio,0,0]:null});
  try{await s.renderTask.promise;}
  catch(e){if(e.name!=='RenderingCancelledException')throw e;return;}
  if(s!==state||ticket!==s.ticket)return;
  try{
    const textLayer=new pdfjs.TextLayer({textContentSource:page.streamTextContent(),container:layer,viewport});
    await textLayer.render();
  }catch(e){console.warn('Couche de sélection de texte indisponible',e);}
  if(s!==state||ticket!==s.ticket)return;
  drawPDFMarks();updateFooter();
  if(oldScroll){
    host.scrollLeft=Math.max(0,oldScroll.x*host.scrollWidth-host.clientWidth/2);
    host.scrollTop=Math.max(0,oldScroll.y*host.scrollHeight-host.clientHeight/2);
  }else{host.scrollTop=0;host.scrollLeft=0;}
}
function initializePDFSelection(){
  const host=$('readerContent');
  const capture=()=>{
    if(!state||state.kind!=='pdf'||!state.highlightMode)return;
    setTimeout(()=>{
      const selection=window.getSelection();
      if(!selection||selection.isCollapsed||!selection.toString().trim())return;
      const page=$('readerContent').querySelector('.pdf-page');
      if(!page||!page.contains(selection.anchorNode)||!page.contains(selection.focusNode))return;
      const bounds=page.getBoundingClientRect();
      const rects=Array.from(selection.getRangeAt(0).getClientRects())
        .filter(r=>r.width>0&&r.height>0)
        .map(r=>({x:Math.max(0,(r.left-bounds.left)/bounds.width),y:Math.max(0,(r.top-bounds.top)/bounds.height),w:Math.min(1,r.width/bounds.width),h:Math.min(1,r.height/bounds.height)}))
        .filter(r=>r.x<1&&r.y<1);
      if(!rects.length)return;
      const text=selection.toString().slice(0,4000).trim();
      selection.removeAllRanges();
      addHighlight({kind:'pdf',page:state.book.page,rects,text});
    },80);
  };
  host.addEventListener('pointerup',capture);
  host.addEventListener('touchend',capture,{passive:true});
}
function addHighlight(partial){
  if(!state)return;
  const note=window.prompt('Note liée à ce passage (facultatif) :','');
  if(note===null)return;
  const annotation={id:crypto.randomUUID(),note:note.slice(0,10000),createdAt:Date.now(),...partial};
  state.book.annotations??=[];
  state.book.annotations.push(annotation);
  if(partial.kind==='pdf')drawPDFMarks();
  else state.rendition.annotations.highlight(partial.cfi,{},()=>{},'folio-epub-highlight');
  drawPanel();scheduleSave();
}
function setZoom(factor){
  const current=state;
  if(!current||!Number.isFinite(factor)||factor<=0)return;
  current.book.zoom=nextZoom(current.book.zoom,factor);
  $('readerZoomValue').textContent=Math.round(current.book.zoom*100)+' %';
  if(current.kind==='pdf')renderPDFPage({keepScroll:true}).catch(e=>console.warn('Zoom PDF',e));
  else current.rendition?.themes.fontSize(Math.round(current.book.zoom*100)+'%');
  scheduleSave();
}
function previewZoom(factor){
  if(!state)return;
  const value=nextZoom(state.book.zoom,factor);
  $('readerZoomValue').textContent=Math.round(value*100)+' %';
  if(state.kind==='pdf'){
    const page=$('readerContent').querySelector('.pdf-page');
    if(page){
      page.style.transform=factor===1?'': 'scale('+factor+')';
      page.style.transformOrigin='center top';
    }
  }
}
function attachGestures(target){
  return attachReadingGestures(target,{
    disabled:()=>!state||state.highlightMode||!$('readerSidebar').hidden||!!document.querySelector('dialog[open]'),
    onSwipe:direction=>{
      const isRtl=state?.book?.readingDirection==='rtl';
      navigatePrevNext(isRtl?direction==='previous':direction==='next');
    },
    onPinch:factor=>setZoom(factor),
    onPinchPreview:previewZoom,
    onDoubleTap:()=>{
      if(!state)return;
      setZoom(state.book.zoom>1.35 ? 1/state.book.zoom : 1.75/state.book.zoom);
    }
  });
}
function navigatePrevNext(next){
  if(!state)return;
  if(state.kind==='pdf')showPosition((state.book.page||1)+(next?1:-1));
  else state.rendition?.[next?'next':'prev']?.();
}
function closeReader(){
  clearTimeout(saveTimer);
  if(state){
    const s=state;
    persist().catch(()=>{});
    s.ticket++;
    s.resizeObserver?.disconnect();
    clearTimeout(s.resizeTimer);
    for(const dispose of s.gestureCleanup||[])try{dispose();}catch(e){}
    try{s.renderTask?.cancel();}catch(e){}
    try{s.pdf?.destroy();}catch(e){}
    try{s.rendition?.destroy();}catch(e){}
    try{s.epub?.destroy();}catch(e){}
    state=null;
  }
  $('readerSidebar').hidden=true;
  $('readerMenu').setAttribute('aria-expanded','false');
  $('reader').hidden=true;
  document.body.style.overflow='';
  $('readerContent').replaceChildren();
}
export function backInReader(){
  if($('reader').hidden)return false;
  if(!$('readerSidebar').hidden){
    $('readerSidebar').hidden=true;
    $('readerMenu').setAttribute('aria-expanded','false');
    return true;
  }
  closeReader();
  return true;
}
function onEPUBLocation(location){
  if(!state||state.kind!=='epub'||!location?.start)return;
  state.book.position=location.start.cfi;
  if(state.epub?.locations?.length()&&location.start.cfi){
    const pct=state.epub.locations.percentageFromCfi(location.start.cfi);
    if(Number.isFinite(pct))state.book.progress=Math.max(0,Math.min(100,Math.round(pct*100)));
  }
  updateFooter();scheduleSave();
}
async function readEPUB(s,blob){
  const array=await blob.arrayBuffer();
  if(s!==state)return;
  const epub=ePub(array);
  s.epub=epub;
  await epub.ready;
  if(s!==state)return;
  const rendition=epub.renderTo($('readerContent'),{width:'100%',height:'100%',flow:'paginated',spread:'none',allowScriptedContent:false});
  s.rendition=rendition;
  const readingOrder=epub.packaging?.metadata?.direction||epub.package?.metadata?.direction||'ltr';
  if(!s.book.readingDirection&&readingOrder==='rtl')s.book.readingDirection='rtl';
  if(s.book.readingDirection==='rtl'&&typeof rendition.direction==='function')rendition.direction('rtl');
  $('readerDirection').textContent=s.book.readingDirection==='rtl'?'RTL':'LTR';
  rendition.on('relocated',location=>{if(s===state)onEPUBLocation(location);});
  rendition.on('selected',(cfi,contents)=>{
    if(!s.highlightMode||s!==state)return;
    const text=contents.window.getSelection()?.toString().trim()||'Passage sélectionné';
    contents.window.getSelection()?.removeAllRanges();
    addHighlight({kind:'epub',cfi,text:text.slice(0,4000)});
  });
  const boundDocuments=new WeakSet();
  rendition.on('rendered',(_section,view)=>{
    if(s!==state)return;
    const document=view?.contents?.document||view?.document;
    if(document&&!boundDocuments.has(document)){
      boundDocuments.add(document);
      s.gestureCleanup.push(attachGestures(document.documentElement));
    }
    for(const ann of s.book.annotations||[])if(ann.kind==='epub'&&ann.cfi){
      try{rendition.annotations.highlight(ann.cfi,{},()=>{},'folio-epub-highlight');}catch(e){}
    }
  });
  s.chapters=flatten(epub.navigation.toc||[]).map(t=>({label:t.label,href:t.href}));
  drawPanel();
  applyTheme();
  rendition.themes.fontSize(Math.round((s.book.zoom||1)*100)+'%');
  await rendition.display(s.book.position||undefined);
  epub.locations.generate(1200).then(()=>{
    if(s===state){const location=rendition.currentLocation();if(location)onEPUBLocation(location);}
  }).catch(()=>{});
}
function flatten(items){return items.flatMap(item=>[item,...flatten(item.subitems||[])]);}
async function readPDF(s,blob){
  const data=new Uint8Array(await blob.arrayBuffer());
  if(s!==state)return;
  s.pdf=await pdfjs.getDocument({data,isEvalSupported:false}).promise;
  if(s!==state)return;
  s.book.totalPages=s.pdf.numPages;
  s.book.page=Math.max(1,Math.min(s.book.page||1,s.pdf.numPages));
  try{
    const outline=await s.pdf.getOutline();
    const list=flattenPDFOutline(outline||[]);
    s.chapters=await Promise.all(list.map(async item=>{
      let destination=item.dest;
      if(typeof destination==='string')destination=await s.pdf.getDestination(destination);
      const page=Array.isArray(destination)&&destination[0] ? await s.pdf.getPageIndex(destination[0])+1 : null;
      return {label:item.title,page};
    }));
  }catch(e){console.warn('Sommaire PDF absent',e);}
  drawPanel();
  await renderPDFPage();
  scheduleSave();
}
function flattenPDFOutline(list){return list.flatMap(item=>[item,...flattenPDFOutline(item.items||[])]);}
async function open(book,callbacks={}){
  closeReader();
  const kind=kindOf(book);
  book.kind=kind;
  book.status=book.status==='to-read'?'reading':book.status;
  book.annotations??=[];book.bookmarks??=[];
  book.zoom??=1;book.theme??='light';
  // Le sens peut être sélectionné manuellement pour les livres PDF en arabe.
  if(kind==='pdf')book.readingDirection??='ltr';
  state={book,kind,pdf:null,epub:null,rendition:null,chapters:[],ticket:0,highlightMode:false,gestureCleanup:[],onUpdate:callbacks.onUpdate,onEdit:callbacks.onEdit,onDownload:callbacks.onDownload};
  const s=state;
  $('readerTitle').textContent=book.title;
  $('readerAuthor').textContent=book.author||'';
  $('reader').hidden=false;document.body.style.overflow='hidden';
  $('readerSidebar').hidden=true;
  $('readerMenu').setAttribute('aria-expanded','false');
  $('readerContent').replaceChildren();
  $('readerContent').textContent='Chargement du livre…';
  $('readerHighlight').classList.remove('active');
  $('readerHighlight').setAttribute('aria-pressed','false');
  $('readerZoomValue').textContent=Math.round(book.zoom*100)+' %';
  $('readerDirection').textContent=book.readingDirection==='rtl'?'RTL':'LTR';
  $('readerPage').hidden=kind==='epub';
  $('readerTip').textContent='Glissez pour tourner · Pincez pour zoomer · Double-tapez pour agrandir · 🖍 pour annoter';
  $('reader').dataset.kind=kind;
  applyTheme();
  try{
    const blob=await bookBlob(book);
    if(s!==state)return;
    $('readerContent').replaceChildren();
    if(kind==='pdf'){
      s.gestureCleanup.push(attachGestures($('readerContent')));
      await readPDF(s,blob);
    }else await readEPUB(s,blob);
  }catch(e){
    if(s===state){$('readerContent').textContent='Impossible d’ouvrir ce livre : '+e.message;console.error(e);}
  }
  if(s===state){
    const host=$('readerContent');
    s.resizeObserver=new ResizeObserver(()=>{
      if(s!==state)return;
      clearTimeout(s.resizeTimer);
      s.resizeTimer=setTimeout(()=>{
        if(s!==state)return;
        if(s.kind==='pdf'&&s.pdf)renderPDFPage({keepScroll:true}).catch(console.warn);
        if(s.kind==='epub'&&s.rendition){
          s.rendition.resize(host.clientWidth,host.clientHeight);
        }
      },200);
    });
    s.resizeObserver.observe(host);
  }
  updateFooter();
}
function removeAnnotation(id){
  if(!state)return;
  const ann=state.book.annotations.find(a=>a.id===id);
  if(!ann)return;
  const edit=window.prompt('Modifier la note ; saisissez SUPPRIMER pour effacer le surlignage :',ann.note||'');
  if(edit===null)return;
  if(edit==='SUPPRIMER'){
    state.book.annotations=state.book.annotations.filter(a=>a.id!==id);
    if(ann.kind==='epub')state.rendition?.annotations.remove(ann.cfi,'highlight');
    else drawPDFMarks();
  }else ann.note=edit.slice(0,10000);
  drawPanel();scheduleSave();
}
function setup(){
  initializePDFSelection();
  $('closeReader').addEventListener('click',closeReader);
  $('readerPrev').addEventListener('click',()=>navigatePrevNext(false));
  $('readerNext').addEventListener('click',()=>navigatePrevNext(true));
  $('readerPage').addEventListener('change',e=>showPosition(e.target.value));
  $('readerHighlight').addEventListener('click',()=>{
    if(!state)return;
    state.highlightMode=!state.highlightMode;
    $('readerHighlight').classList.toggle('active',state.highlightMode);
    $('readerHighlight').setAttribute('aria-pressed',String(state.highlightMode));
    $('readerTip').textContent=state.highlightMode?'Sélectionnez un passage pour le surligner. Désactivez 🖍 pour tourner les pages par gestes.':'Glissez pour tourner · Pincez pour zoomer · Double-tapez pour agrandir';
    $('readerHighlight').title=state.highlightMode?'Sélectionnez un passage pour le surligner':'Activer le surlignage';
  });
  $('readerBookmark').addEventListener('click',()=>{
    if(!state)return;
    const position=currentPosition();
    if(!position)return;
    const label=window.prompt('Nom du marque-page :',bookmarkLabel(state.book));
    if(label===null)return;
    state.book.bookmarks.push({id:crypto.randomUUID(),kind:state.kind,position,label:label.slice(0,140),createdAt:Date.now()});
    drawPanel();scheduleSave();
  });
  $('readerDirection').addEventListener('click',()=>{
    if(!state)return;
    state.book.readingDirection=state.book.readingDirection==='rtl'?'ltr':'rtl';
    $('readerDirection').textContent=state.book.readingDirection==='rtl'?'RTL':'LTR';
    if(state.kind==='epub'&&typeof state.rendition?.direction==='function')
      state.rendition.direction(state.book.readingDirection);
    scheduleSave();
  });
  $('readerTheme').addEventListener('click',()=>{
    if(!state)return;
    const themes=['light','sepia','dark'];
    state.book.theme=themes[(themes.indexOf(state.book.theme||'light')+1)%themes.length];
    applyTheme();scheduleSave();
  });
  for(const [id,multiplier] of [['readerZoomIn',1.15],['readerZoomOut',1/1.15]]){
    $(id).addEventListener('click',()=>setZoom(multiplier));
  }
  $('readerMenu').addEventListener('click',()=>{
    const side=$('readerSidebar');
    side.hidden=!side.hidden;
    $('readerMenu').setAttribute('aria-expanded',String(!side.hidden));
  });
  $('readerSideClose').addEventListener('click',()=>{
    $('readerSidebar').hidden=true;
    $('readerMenu').setAttribute('aria-expanded','false');
  });
  $('readerChaptersList').addEventListener('click',e=>{
    const button=e.target.closest('[data-chapter]');
    if(!button||!state)return;
    const chapter=state.chapters[Number(button.dataset.chapter)];
    if(state.kind==='pdf'&&chapter.page)showPosition(chapter.page);
    if(state.kind==='epub'&&chapter.href)state.rendition.display(chapter.href);
  });
  $('readerNotesList').addEventListener('click',e=>{
    if(!state)return;
    const bookmark=e.target.closest('[data-go-bookmark]');
    if(bookmark){
      const mark=state.book.bookmarks.find(a=>a.id===bookmark.dataset.goBookmark);
      if(mark)showPosition(mark.position);
    }
    const annButton=e.target.closest('[data-go-annotation]');
    if(annButton){
      const ann=state.book.annotations.find(a=>a.id===annButton.dataset.goAnnotation);
      if(ann){
        showPosition(ann.kind==='pdf'?ann.page:ann.cfi).then(()=>removeAnnotation(ann.id));
      }
    }
  });
  $('readerEdit').addEventListener('click',()=>state?.onEdit?.(state.book.id));
  $('readerDownload').addEventListener('click',()=>state?.onDownload?.(state.book.id));
  window.addEventListener('resize',()=>{
    if(state?.kind==='pdf'&&state.pdf){
      clearTimeout(state.resizeTimer);
      state.resizeTimer=setTimeout(()=>renderPDFPage({keepScroll:true}).catch(console.warn),180);
    }
  });
  window.addEventListener('keydown',e=>{
    if($('reader').hidden||document.querySelector('dialog[open]'))return;
    if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
    if(e.key==='ArrowRight')navigatePrevNext(true);
    if(e.key==='ArrowLeft')navigatePrevNext(false);
    if(e.key==='Escape')closeReader();
  });
}
setup();
export const Reader={open,close:closeReader,back:backInReader,isOpen:()=>!$('reader').hidden,persistNow:persistReaderNow};
export async function generateCover(file,kind){
  try{
    if(kind==='pdf'){
      const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;
      const page=await pdf.getPage(1),base=page.getViewport({scale:1});
      const viewport=page.getViewport({scale:Math.min(1,260/base.width)});
      const canvas=document.createElement('canvas');
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      const result=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      await pdf.destroy();
      return result;
    }
    const epub=ePub(await file.arrayBuffer());
    await epub.ready;
    const url=await epub.coverUrl();
    if(!url){epub.destroy();return null;}
    const res=await fetch(url),blob=await res.blob();
    epub.destroy();
    if(blob.type==='image/png')return blob;
    const image=await createImageBitmap(blob);
    const canvas=document.createElement('canvas');
    const scale=Math.min(1,280/image.width);
    canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    image.close();
    return await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  }catch(e){console.warn('Couverture non générée',e);return null;}
}
export async function epubMetadata(file){
  try{
    const book=ePub(await file.arrayBuffer());await book.ready;
    const meta=book.packaging?.metadata||{};
    book.destroy();
    return {title:meta.title||'',author:meta.creator||''};
  }catch(e){return {};}
}
