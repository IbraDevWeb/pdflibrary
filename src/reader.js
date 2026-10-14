import './pdf-compat.js';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'pdfjs-dist/web/pdf_viewer.css';
import ePub from 'epubjs';
import { bookBlob,kindOf,saveBook,saveOrShare } from './storage.js';
import { attachReadingGestures } from './reading-gestures.js';
import { nextZoom,zoomedSwipeAction } from './gesture-math.js';
import {fitPDFPage,safeCanvasRatio,rectsFromSelection,pdfTextStatus} from './reader-layout.js';
import { SystemBars } from '@capacitor/core';
import { native } from './storage.js';
import { readingPalette,clampTone } from './reading-appearance.js';
import { FONT_OPTIONS,HIGHLIGHT_COLORS,safeHighlightColor,normalizeTypography,searchPDFPages,searchEPUBSections } from './reader-features.js';

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
let barOperation=Promise.resolve();
function setNativeBarsHidden(hidden){
  if(!native)return;
  barOperation=barOperation.catch(()=>{}).then(()=>hidden?SystemBars.hide():SystemBars.show());
  barOperation.catch(error=>console.warn('Visibilité des barres système',error));
}
function showImmersiveControls(visible,{autoHide=false}={}){
 if(!state?.immersive)return;
 clearTimeout(state.immersiveTimer);
 $('readerImmersiveControls').hidden=!visible;
 if(visible&&autoHide){
   const current=state;
   current.immersiveTimer=setTimeout(()=>{
     if(state===current&&current.immersive)$('readerImmersiveControls').hidden=true;
   },3400);
 }
}
function setImmersive(enabled){
 if(!state)return;
 const current=state;
 current.immersive=Boolean(enabled);
 clearTimeout(current.immersiveTimer);
 const reader=$('reader');
 reader.dataset.immersive=String(current.immersive);
 $('readerFullscreen').setAttribute('aria-label',current.immersive?'Quitter le plein écran':'Activer le plein écran');
 $('readerFullscreen').setAttribute('aria-pressed',String(current.immersive));
 if(current.immersive){
   closeTonePanel();
   closeAdvancedPanels();
   $('readerSidebar').hidden=true;
   $('readerMenu').setAttribute('aria-expanded','false');
   showImmersiveControls(true,{autoHide:true});
 }else{
   $('readerImmersiveControls').hidden=true;
 }
 if(native)setNativeBarsHidden(current.immersive);
 else if(current.immersive){
   if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(error=>console.warn('Plein écran navigateur indisponible',error));
 }else if(document.fullscreenElement){
   document.exitFullscreen?.().catch(error=>console.warn('Sortie du plein écran',error));
 }
}
function closeAdvancedPanels(){
  if(state)state.searchToken++;
  const submit=$('readerFindForm').querySelector('button[type="submit"]');
  submit.disabled=false;
  $('readerFindPanel').hidden=true;$('readerFontPanel').hidden=true;
  $('readerFindButton').setAttribute('aria-expanded','false');$('readerFontButton').setAttribute('aria-expanded','false');
}
function closeTonePanel(){
  $('readerTonePanel').hidden=true;
  $('reader').dataset.toneOpen='false';
  $('readerToneButton').setAttribute('aria-expanded','false');
}
function updateToneControls(){
  if(!state)return;
  const book=state.book;
  const warmth=clampTone(book.warmth||0);
  const dimmer=clampTone(book.dimmer??100,100,60,100);
  $('readerWarmth').value=String(warmth);
  $('readerWarmthValue').textContent=warmth+' %';
  $('readerDimmer').value=String(dimmer);
  $('readerDimmerValue').textContent=dimmer+' %';
  document.querySelectorAll('[data-reader-preset]').forEach(button=>{
    const selected=button.dataset.readerPreset===(book.theme||'light');
    button.setAttribute('aria-pressed',String(selected));
  });
}
function applyTheme(){
  if(!state)return;
  const book=state.book;
  const theme=book.theme||'light';
  const reader=$('reader');
  reader.dataset.theme=theme;
  $('readerTheme').textContent=theme==='dark'?'Nuit':theme==='sepia'?'Sépia':'Jour';
  const palette=readingPalette(theme,book.warmth??0,book.dimmer??100);
  reader.style.setProperty('--reader-warm-alpha',String(palette.pdfTintOpacity));
  reader.style.setProperty('--reader-dim-alpha',String(palette.pdfDimmerOpacity));
  $('readerContent').style.backgroundColor=palette.paper;
  if(state.kind==='epub'&&state.rendition){
    state.rendition.themes.override('color',palette.ink);
    state.rendition.themes.override('background',palette.paper);
  }
  updateToneControls();
}
function updateFooter(){
  if(!state)return;
  const book=state.book;
  $('reader').classList.toggle('pdf-zoomed',state.kind==='pdf'&&Number(book.zoom)>1.08);
  $('readerPage').hidden=state.kind==='epub';
  $('readerTotal').textContent=state.kind==='pdf'?' / '+(book.totalPages||'?') : Math.round(book.progress||0)+' %';
  if(state.kind==='pdf')$('readerPage').value=book.page||1;
  updatePositionBar();
  $('readerImmersivePosition').textContent=state.kind==='pdf'?'Page '+(book.page||1)+' / '+(book.totalPages||'?'):Math.round(book.progress||0)+' %';
}
function updatePositionBar(){
 if(!state)return;
 const pdf=state.kind==='pdf',book=state.book,input=$('readerPosition');
 input.min=pdf?'1':'0';input.max=String(pdf?Math.max(1,book.totalPages||1):100);input.step='1';
 input.disabled=!pdf&&!state.epub?.locations?.length?.();
 input.value=String(pdf?Math.max(1,book.page||1):Math.round(book.progress||0));
 $('readerPositionLabel').textContent=pdf?'Page '+(book.page||1):Math.round(book.progress||0)+' %';
 $('readerPositionMax').textContent=pdf?String(book.totalPages||'?')+' p.':'100 %';
}
function updateFontControls(){
 if(!state)return;
 const {fontFamily,lineHeight}=normalizeTypography(state.book);
 $('readerFontFamily').value=fontFamily;
 $('readerLineHeight').value=String(lineHeight);
 $('readerLineHeightLabel').textContent=lineHeight.toFixed(1).replace('.',',');
 $('readerFontSize').value=String(Math.max(80,Math.min(220,Math.round((state.book.zoom||1)*10)*10)));
 $('readerFontSizeLabel').textContent=Math.round((state.book.zoom||1)*100)+' %';
 const enabled=state.kind==='epub';
 for(const id of ['readerFontFamily','readerLineHeight','readerFontSize','readerFontReset'])$(id).disabled=!enabled;
 $('readerFontNotice').textContent=enabled?'Choisissez une police, sa taille et un interligne confortable. Certains EPUB imposent des styles particuliers.':'Un PDF conserve sa mise en page et ses polices d’origine. Utilisez les boutons de zoom + et −.';
}
function applyTypography(){
 if(!state)return;
 updateFontControls();
 if(state.kind!=='epub'||!state.rendition)return;
 const {fontFamily,lineHeight}=normalizeTypography(state.book);
 state.rendition.themes.fontSize(Math.round((state.book.zoom||1)*100)+'%');
 state.rendition.themes.override('font-family',fontFamily==='publisher'?'':FONT_OPTIONS[fontFamily]);
 state.rendition.themes.override('line-height',lineHeight.toFixed(1));
}
function updateHighlightPalette(){
 if(!state)return;
 document.querySelectorAll('[data-highlight-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.highlightColor===safeHighlightColor(state.book.highlightColor))));
}
function applyEPUBHighlight(annotation){
 if(!state?.rendition||!annotation?.cfi)return;
 try{
  state.rendition.annotations.highlight(annotation.cfi,{},()=>{},'folio-epub-highlight',{fill:HIGHLIGHT_COLORS[safeHighlightColor(annotation.color)],'fill-opacity':'0.45'});
 }catch(e){console.warn('Surlignage EPUB indisponible',e);}
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
    ...annotations.map(a=>'<button class="reader-side-item" data-go-annotation="'+esc(a.id)+'"><span><i class="reader-annotation-color" style="--annotation-color:'+HIGHLIGHT_COLORS[safeHighlightColor(a.color)]+'"></i>'+esc((a.text||'Surlignage').slice(0,130))+'</span><small>'+esc(a.note||'Appuyer pour consulter / modifier')+'</small></button>')
  ];
  $('readerNotesList').innerHTML=list.join('');
  const contents=state.chapters||[];
  $('readerChaptersList').innerHTML=contents.length?contents.map((item,i)=>'<button class="reader-side-item" data-chapter="'+i+'">'+esc(item.label||'Chapitre')+'</button>').join(''):'<p class="reader-side-muted">Sommaire non disponible pour ce document.</p>';
}
async function showPosition(position,{initialHorizontalEdge='start'}={}){
  if(!state)return;
  if(state.kind==='pdf'){
    let page=Number(position);
    if(!Number.isFinite(page))return;
    page=Math.max(1,Math.min(state.book.totalPages||1,Math.floor(page)));
    state.book.page=page;
    state.book.progress=Math.round(page/(state.book.totalPages||1)*100);
    await renderPDFPage({initialHorizontalEdge});
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
      box.style.cssText='left:'+r.x*100+'%;top:'+r.y*100+'%;width:'+r.w*100+'%;height:'+r.h*100+'%;--annotation-color:'+HIGHLIGHT_COLORS[safeHighlightColor(ann.color)];
      target.append(box);
    }
  }
}
async function renderPDFPage({keepScroll=false,initialHorizontalEdge='start'}={}){
 const s=state;if(!s||s.kind!=='pdf'||!s.pdf)return;
 const ticket=++s.ticket;
 try{s.renderTask?.cancel();}catch{}
 const page=await s.pdf.getPage(s.book.page||1);
 if(s!==state||ticket!==s.ticket)return;
 const host=$('readerContent');
 const oldScroll=keepScroll?{x:(host.scrollLeft+host.clientWidth/2)/Math.max(1,host.scrollWidth),y:(host.scrollTop+host.clientHeight/2)/Math.max(1,host.scrollHeight)}:null;
 const orig=page.getViewport({scale:1});
 const fit=fitPDFPage({pageWidth:orig.width,pageHeight:orig.height,hostWidth:host.clientWidth,hostHeight:host.clientHeight,zoom:s.book.zoom||1,fit:s.book.pdfFit||'width'});
 const viewport=page.getViewport({scale:fit.scale});
 const wrapper=document.createElement('div');wrapper.className='pdf-page';
 wrapper.style.width=viewport.width+'px';wrapper.style.height=viewport.height+'px';
 wrapper.style.setProperty('--scale-factor',String(viewport.scale));wrapper.style.setProperty('--total-scale-factor',String(viewport.scale));
 const canvas=document.createElement('canvas');
 const ratio=safeCanvasRatio(viewport.width,viewport.height,window.devicePixelRatio||1);
 canvas.width=Math.max(1,Math.round(viewport.width*ratio));canvas.height=Math.max(1,Math.round(viewport.height*ratio));
 canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
 wrapper.append(canvas);
 const marks=document.createElement('div');marks.id='pdfMarks';marks.className='pdf-marks';wrapper.append(marks);
 const layer=document.createElement('div');layer.className='textLayer pdf-text-layer';
 layer.style.setProperty('--scale-factor',String(viewport.scale));layer.style.setProperty('--total-scale-factor',String(viewport.scale));wrapper.append(layer);
 // Conserver la page précédente pendant le dessin évite les flashes blancs.
 const task=page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport,transform:ratio!==1?[ratio,0,0,ratio,0,0]:null});
 s.renderTask=task;
 try{await task.promise;}catch(e){if(e?.name==='RenderingCancelledException'||s!==state||ticket!==s.ticket)return;throw e;}
 if(s!==state||ticket!==s.ticket)return;
 host.replaceChildren(wrapper);
 try{
  const text=await page.getTextContent({includeMarkedContent:false});
  if(s!==state||ticket!==s.ticket)return;
  s.pdfSelectable=pdfTextStatus(text.items)==='selectable';
  const textLayer=new pdfjs.TextLayer({textContentSource:text,container:layer,viewport});
  await textLayer.render();
 }catch(e){s.pdfSelectable=false;console.warn('Couche PDF indisponible : image de page conservée',e);}
 if(s!==state||ticket!==s.ticket)return;
 drawPDFMarks();updateFooter();
 if(s.highlightMode)$('readerTip').textContent=s.pdfSelectable?'Sélectionnez une phrase pour la surligner.':'PDF scanné : faites glisser la souris pour surligner une zone.';
 if(oldScroll){host.scrollLeft=Math.max(0,oldScroll.x*host.scrollWidth-host.clientWidth/2);host.scrollTop=Math.max(0,oldScroll.y*host.scrollHeight-host.clientHeight/2);}
 else{host.scrollTop=0;host.scrollLeft=initialHorizontalEdge==='end'?Math.max(0,host.scrollWidth-host.clientWidth):0;}
}
function initializePDFSelection(){
 const host=$('readerContent');
 let pending=null,pointerStart=null;
 host.addEventListener('pointerdown',event=>{
  if(event.button!==0||state?.kind!=='pdf'||!state.highlightMode||state.pdfSelectable!==false){pointerStart=null;return;}
  const page=event.target.closest('.pdf-page');
  pointerStart=page?{x:event.clientX,y:event.clientY,page,book:state.book.page}:null;
 });
 const capture=event=>{
  const down=pointerStart;pointerStart=null;
  if(down&&state?.kind==='pdf'&&state.highlightMode&&state.pdfSelectable===false&&down.book===state.book.page){
   const bound=down.page.getBoundingClientRect();
   const x1=Math.max(bound.left,Math.min(bound.right,down.x));
   const y1=Math.max(bound.top,Math.min(bound.bottom,down.y));
   const x2=Math.max(bound.left,Math.min(bound.right,event.clientX));
   const y2=Math.max(bound.top,Math.min(bound.bottom,event.clientY));
   if(Math.abs(x2-x1)>9&&Math.abs(y2-y1)>6){
    const rects=rectsFromSelection([{left:Math.min(x1,x2),top:Math.min(y1,y2),right:Math.max(x1,x2),bottom:Math.max(y1,y2)}],bound);
    if(rects.length){addHighlight({kind:'pdf',page:state.book.page,rects,text:'Zone surlignée (PDF scanné)'});return;}
   }
  }
  clearTimeout(pending);pending=setTimeout(()=>{
   if(!state||state.kind!=='pdf'||!state.highlightMode)return;
   const selection=window.getSelection();
   if(!selection||selection.isCollapsed||!selection.toString().trim()||!selection.rangeCount)return;
   const page=host.querySelector('.pdf-page'),range=selection.getRangeAt(0);
   if(!page||!page.contains(range.startContainer)||!page.contains(range.endContainer))return;
   const rects=rectsFromSelection(range.getClientRects(),page.getBoundingClientRect());
   if(!rects.length)return;
   const text=selection.toString().trim().slice(0,4000);
   selection.removeAllRanges();addHighlight({kind:'pdf',page:state.book.page,rects,text});
  },65);
 };
 host.addEventListener('pointerup',capture);
 host.addEventListener('pointercancel',()=>{pointerStart=null;});
 host.addEventListener('touchend',event=>{if(!pointerStart)capture(event);},{passive:true});
}
function addHighlight(partial){
 if(!state)return;
 // Pas de prompt au milieu de la sélection : la note reste éditable dans le carnet.
 const annotation={id:crypto.randomUUID(),note:'',createdAt:Date.now(),color:safeHighlightColor(state.book.highlightColor),...partial};
 state.book.annotations??=[];state.book.annotations.push(annotation);
 if(partial.kind==='pdf')drawPDFMarks();else applyEPUBHighlight(annotation);
 drawPanel();scheduleSave();
 $('readerTip').textContent='Passage surligné. Retrouvez-le dans Sommaire → Annotations pour ajouter une note.';
}
function setZoom(factor){
  const current=state;
  if(!current||!Number.isFinite(factor)||factor<=0)return;
  current.book.zoom=nextZoom(current.book.zoom,factor);
  $('reader').classList.toggle('pdf-zoomed',current.kind==='pdf'&&current.book.zoom>1.08);
  $('readerZoomValue').textContent=Math.round(current.book.zoom*100)+' %';
  if(current.kind==='pdf')renderPDFPage({keepScroll:true}).catch(e=>console.error('Zoom PDF',e));
  else applyTypography();
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
    disabled:()=>!state||state.highlightMode||!$('readerSidebar').hidden||!$('readerTonePanel').hidden||!$('readerFindPanel').hidden||!$('readerFontPanel').hidden||!!document.querySelector('dialog[open]'),
    getGestureContext:()=>{
      const host=$('readerContent');
      return {zoom:state?.book.zoom||1,scrollWidth:host.scrollWidth,clientWidth:host.clientWidth,scrollLeft:host.scrollLeft};
    },
    onSwipe:(direction,context)=>{
      if(state?.kind==='pdf'&&zoomedSwipeAction({...context,direction})==='pan')return;
      const isRtl=state?.book?.readingDirection==='rtl';
      navigatePrevNext(isRtl?direction==='previous':direction==='next',direction);
    },
    onPinch:factor=>setZoom(factor),
    onPinchPreview:previewZoom,
    onTap:()=>{if(state?.immersive)showImmersiveControls($('readerImmersiveControls').hidden,{autoHide:true});},
    onDoubleTap:()=>{
      if(!state)return;
      setZoom(state.book.zoom>1.35?1/state.book.zoom:1.75/state.book.zoom);
    }
  });
}
function navigatePrevNext(next,physicalDirection=null){
  if(!state)return;
  if(state.kind==='pdf'){
    const current=state.book.page||1,target=current+(next?1:-1);
    if(target<1||target>state.book.totalPages)return;
    showPosition(target,{initialHorizontalEdge:physicalDirection==='previous'?'end':'start'});
  }else state.rendition?.[next?'next':'prev']?.();
}
function closeReader(){
  clearTimeout(saveTimer);
  if(state?.immersive)setImmersive(false);
  if(state)clearTimeout(state.immersiveTimer);
  $('readerImmersiveControls').hidden=true;
  closeTonePanel();
  closeAdvancedPanels();
  if(state){
    const s=state;
    persist().catch(()=>{});
    s.ticket++;
    s.searchToken++;
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
  $('reader').classList.remove('pdf-zoomed');
  document.body.style.overflow='';
  $('readerContent').replaceChildren();
}
export function backInReader(){
  if($('reader').hidden)return false;
  if(!$('readerTonePanel').hidden){closeTonePanel();return true;}
  if(!$('readerFindPanel').hidden||!$('readerFontPanel').hidden){closeAdvancedPanels();return true;}
  if(state?.immersive){setImmersive(false);return true;}
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
      applyEPUBHighlight(ann);
    }
  });
  s.chapters=flatten(epub.navigation.toc||[]).map(t=>({label:t.label,href:t.href}));
  drawPanel();
  applyTheme();
  applyTypography();
  await rendition.display(s.book.position||undefined);
  epub.locations.generate(1200).then(()=>{
    if(s===state){const location=rendition.currentLocation();if(location)onEPUBLocation(location);updatePositionBar();}
  }).catch(()=>{});
}
function flatten(items){return items.flatMap(item=>[item,...flatten(item.subitems||[])]);}
function pdfDocumentOptions(data,book){
 const pdfBase=new URL('./pdfjs/',window.location.href).href;
 return {data,isEvalSupported:false,
  // Le rendu en contours ne dépend pas de @font-face/FontFace API dans Electron.
  disableFontFace:book.pdfFontMode==='outlines',
  useSystemFonts:book.pdfFontMode!=='outlines',
  cMapUrl:pdfBase+'cmaps/',cMapPacked:true,
  standardFontDataUrl:pdfBase+'standard_fonts/'};
}
function pdfFontButton(){
 const button=$('readerPdfFonts');if(!state||state.kind!=='pdf'){button.hidden=true;return;}
 button.hidden=false;
 const outlines=state.book.pdfFontMode==='outlines';
 button.textContent=outlines?'Polices : fidèles':'Polices : standard';
 button.setAttribute('aria-pressed',String(outlines));
 button.title=outlines?'Contours des polices du document. Cliquer pour le rendu navigateur.':'Rendu des polices par le navigateur. Cliquer pour les contours du PDF.';
}
async function changePdfFontMode(){
 const s=state;
 if(!s||s.kind!=='pdf'||!s.pdf)return;
 const button=$('readerPdfFonts');
 button.disabled=true;
 const previousMode=s.book.pdfFontMode;
 const previousPdf=s.pdf;
 let replacement=null;
 try{
  const blob=await bookBlob(s.book);
  if(s!==state)return;
  const data=new Uint8Array(await blob.arrayBuffer());
  s.book.pdfFontMode=previousMode==='outlines'?'browser':'outlines';
  replacement=await pdfjs.getDocument(pdfDocumentOptions(data,s.book)).promise;
  if(s!==state){await replacement.destroy();return;}
  s.ticket++;
  try{s.renderTask?.cancel();}catch{}
  s.pdf=replacement;
  await renderPDFPage({keepScroll:true});
  if(s!==state)return;
  await previousPdf.destroy();
  pdfFontButton();scheduleSave();
 }catch(error){
  console.error('Changement du rendu des polices PDF',error);
  if(s===state){
   s.pdf=previousPdf;
   s.book.pdfFontMode=previousMode;
   pdfFontButton();
   $('readerTip').textContent='Ce mode de rendu est indisponible pour ce PDF. Le mode précédent a été restauré.';
   renderPDFPage({keepScroll:true}).catch(console.error);
  }
  if(replacement&&replacement!==previousPdf)replacement.destroy().catch(()=>{});
 }finally{button.disabled=false;}
}
async function readPDF(s,blob){
  const data=new Uint8Array(await blob.arrayBuffer());
  if(s!==state)return;
  s.pdf=await pdfjs.getDocument(pdfDocumentOptions(data,s.book)).promise;
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
  book.warmth=clampTone(book.warmth??0);
  Object.assign(book,normalizeTypography(book));
  book.highlightColor=safeHighlightColor(book.highlightColor);
  book.dimmer=clampTone(book.dimmer??100,100,60,100);
  // Le sens peut être sélectionné manuellement pour les livres PDF en arabe.
  if(kind==='pdf'){
    book.readingDirection??='ltr';
    book.pdfFit??=location.protocol==='folio:'?'page':'width';
    book.pdfFontMode??=location.protocol==='folio:'?'outlines':'browser';
  }
  state={book,kind,pdf:null,epub:null,rendition:null,chapters:[],ticket:0,searchToken:0,searchResults:[],highlightMode:false,gestureCleanup:[],onUpdate:callbacks.onUpdate,onEdit:callbacks.onEdit,onDownload:callbacks.onDownload};
  const s=state;
  $('readerTitle').textContent=book.title;
  $('readerAuthor').textContent=book.author||'';
  $('reader').hidden=false;document.body.style.overflow='hidden';
  $('reader').dataset.immersive='false';
  $('readerImmersiveControls').hidden=true;
  closeTonePanel();
  closeAdvancedPanels();
  $('readerFindInput').value='';
  $('readerFindResults').replaceChildren();
  $('readerFindStatus').textContent='Cherchez un mot ou une expression dans le livre.';
  updateFontControls();
  updateHighlightPalette();
  $('readerSidebar').hidden=true;
  $('readerMenu').setAttribute('aria-expanded','false');
  $('readerContent').replaceChildren();
  $('readerContent').textContent='Chargement du livre…';
  $('readerHighlight').classList.remove('active');
  $('readerHighlight').setAttribute('aria-pressed','false');
  $('readerZoomValue').textContent=Math.round(book.zoom*100)+' %';
  $('readerFit').hidden=kind!=='pdf';
  $('readerFit').textContent=book.pdfFit==='page'?'Page entière':'Largeur';
  pdfFontButton();
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
    if(s===state){console.error('Erreur de lecture',e);const host=$('readerContent');if(!host.querySelector('.pdf-page')&&!host.querySelector('iframe'))host.textContent='Impossible d’afficher ce livre : '+e.message;$('readerTip').textContent='Erreur de lecture : essayez une autre page ou réinitialisez le zoom.';}
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

async function runBookSearch(query){
 const s=state;
 if(!s)return;
 const q=String(query||'').trim();
 if(q.length<2){$('readerFindStatus').textContent='Saisissez au moins 2 caractères.';return;}
 if(s.kind==='pdf'&&!s.pdf||s.kind==='epub'&&!s.epub){
   $('readerFindStatus').textContent='Le livre est encore en cours de chargement.';return;
 }
 const token=++s.searchToken;
 const action=$('readerFindForm').querySelector('button[type="submit"]');
 action.disabled=true;
 s.searchResults=[];
 $('readerFindResults').replaceChildren();
 $('readerFindStatus').textContent='Recherche en cours : les pages sont analysées sur cet appareil…';
 const report=(done,total,count)=>{
  if(s!==state||token!==s.searchToken)return;
  $('readerFindStatus').textContent=done+' / '+total+' '+(s.kind==='pdf'?'pages':'chapitres')+' · '+count+' résultats';
 };
 try{
  const result=s.kind==='pdf'
   ?await searchPDFPages(s.pdf,q,{cancelled:()=>s!==state||token!==s.searchToken,onProgress:report,limit:100})
   :await searchEPUBSections(s.epub,q,{cancelled:()=>s!==state||token!==s.searchToken,onProgress:report,limit:100});
  if(s!==state||token!==s.searchToken)return;
  s.searchResults=result.matches;
  $('readerFindStatus').textContent=result.matches.length
   ?result.matches.length+' résultat(s)'+(result.truncated?' (limite 100)':'')+' · '+result.scanned+' / '+result.total+' analysés'
   :'Aucune occurrence trouvée. Les PDF scannés sans texte nécessitent un OCR.';
  const container=$('readerFindResults');
  container.replaceChildren();
  for(let i=0;i<result.matches.length;i++){
   const hit=result.matches[i];
   const button=document.createElement('button');button.type='button';
   button.className='reader-find-result';button.dataset.searchIndex=String(i);
   const heading=document.createElement('strong');heading.textContent=hit.title;
   const snippet=document.createElement('span');snippet.textContent=hit.snippet;
   button.append(heading,snippet);container.append(button);
  }
 }catch(e){
  if(s===state&&token===s.searchToken)$('readerFindStatus').textContent='Recherche impossible : '+e.message;
 }finally{
  if(s===state&&token===s.searchToken)action.disabled=false;
 }
}
async function exportReaderNotes(){
 if(!state)return;
 const annotations=state.book.annotations||[],marks=state.book.bookmarks||[];
 if(!annotations.length&&!marks.length){window.alert('Aucun signet ni annotation à exporter.');return;}
 const text=[
  'Folio — '+state.book.title,
  'Auteur : '+(state.book.author||'Inconnu'),'',
  'SIGNETS',
  ...marks.map(m=>'- '+(m.label||'Signet')+' ('+(m.kind==='pdf'?'page '+m.position:'EPUB')+')'),
  '','SURLIGNAGES ET NOTES',
  ...annotations.map((a,i)=>[
   (i+1)+'. '+(a.kind==='pdf'?'Page '+a.page:'Emplacement EPUB')+' — '+safeHighlightColor(a.color),
   a.text||'Passage sans texte',
   a.note?'Note : '+a.note:''
  ].filter(Boolean).join('\n')),
  '','Exporté depuis Folio le '+new Date().toLocaleDateString('fr-FR')
 ].join('\n');
 try{
  const blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  await saveOrShare(blob,'Folio-annotations-'+state.book.id.slice(0,12)+'.txt');
 }catch(e){window.alert('Export impossible : '+e.message);}
}

function setup(){
  initializePDFSelection();
  $('closeReader').addEventListener('click',closeReader);
  $('readerPrev').addEventListener('click',()=>navigatePrevNext(false));
  $('readerNext').addEventListener('click',()=>navigatePrevNext(true));
  $('readerPage').addEventListener('change',e=>showPosition(e.target.value));
  $('readerPosition').addEventListener('input',e=>{
    if(!state)return;
    $('readerPositionLabel').textContent=state.kind==='pdf'?'Page '+e.target.value:e.target.value+' %';
  });
  $('readerPosition').addEventListener('change',async e=>{
    if(!state)return;
    const value=Number(e.target.value);
    if(state.kind==='pdf')await showPosition(value);
    else if(state.epub?.locations?.length?.()){
      const cfi=state.epub.locations.cfiFromPercentage(Math.max(0,Math.min(1,value/100)));
      if(cfi)await showPosition(cfi);
    }
    updatePositionBar();
  });
  $('readerFindButton').addEventListener('click',()=>{
    if(!state)return;
    const open=$('readerFindPanel').hidden;
    closeAdvancedPanels();closeTonePanel();
    $('readerFindPanel').hidden=!open;
    $('readerFindButton').setAttribute('aria-expanded',String(open));
    if(open)$('readerFindInput').focus();
  });
  $('readerFontButton').addEventListener('click',()=>{
    if(!state)return;
    const open=$('readerFontPanel').hidden;
    closeAdvancedPanels();closeTonePanel();
    $('readerFontPanel').hidden=!open;
    $('readerFontButton').setAttribute('aria-expanded',String(open));
    if(open)updateFontControls();
  });
  $('readerFindClose').addEventListener('click',closeAdvancedPanels);
  $('readerFontClose').addEventListener('click',closeAdvancedPanels);
  $('readerFindForm').addEventListener('submit',e=>{e.preventDefault();runBookSearch($('readerFindInput').value);});
  $('readerFindResults').addEventListener('click',e=>{
    const b=e.target.closest('[data-search-index]');
    if(!b||!state)return;
    const hit=state.searchResults[Number(b.dataset.searchIndex)];
    if(!hit)return;
    showPosition(hit.position).then(closeAdvancedPanels).catch(console.error);
  });
  $('readerFontFamily').addEventListener('change',e=>{
    if(state?.kind!=='epub')return;
    state.book.fontFamily=e.target.value;
    applyTypography();scheduleSave();
  });
  $('readerLineHeight').addEventListener('input',e=>{
    if(state?.kind!=='epub')return;
    state.book.lineHeight=Number(e.target.value);
    applyTypography();scheduleSave();
  });
  $('readerFontSize').addEventListener('input',e=>{
    if(state?.kind!=='epub')return;
    state.book.zoom=Number(e.target.value)/100;
    $('readerZoomValue').textContent=Math.round(state.book.zoom*100)+' %';
    applyTypography();scheduleSave();
  });
  $('readerFontReset').addEventListener('click',()=>{
    if(state?.kind!=='epub')return;
    state.book.fontFamily='publisher';state.book.lineHeight=1.6;state.book.zoom=1;
    $('readerZoomValue').textContent='100 %';
    applyTypography();scheduleSave();
  });
  document.querySelectorAll('[data-highlight-color]').forEach(b=>b.addEventListener('click',()=>{
    if(!state)return;
    state.book.highlightColor=safeHighlightColor(b.dataset.highlightColor);
    updateHighlightPalette();scheduleSave();
  }));
  $('readerExportNotes').addEventListener('click',exportReaderNotes);
  $('readerPdfFonts').addEventListener('click',()=>changePdfFontMode());
  $('readerFit').addEventListener('click',()=>{if(state?.kind!=='pdf')return;state.book.pdfFit=state.book.pdfFit==='page'?'width':'page';$('readerFit').textContent=state.book.pdfFit==='page'?'Page entière':'Largeur';state.book.zoom=1;$('readerZoomValue').textContent='100 %';renderPDFPage().catch(console.error);scheduleSave();});
  $('readerHighlight').addEventListener('click',()=>{
    if(!state)return;
    state.highlightMode=!state.highlightMode;
    $('readerHighlight').classList.toggle('active',state.highlightMode);
    $('readerHighlight').setAttribute('aria-pressed',String(state.highlightMode));
    $('readerTip').textContent=state.highlightMode?(state.kind==='pdf'&&!state.pdfSelectable?'PDF scanné : faites glisser la souris sur la zone à surligner. Pour copier le texte, un OCR sera nécessaire.':'Sélectionnez un passage : il sera surligné immédiatement. Ajoutez une note depuis Sommaire.'):'Glissez pour tourner · Pincez pour zoomer · Double-tapez pour agrandir';
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
  $('readerFullscreen').addEventListener('click',()=>{if(state)setImmersive(!state.immersive);});
  $('readerExitFullscreen').addEventListener('click',()=>{if(state)setImmersive(false);});
  $('readerImmersivePrev').addEventListener('click',()=>{navigatePrevNext(false);showImmersiveControls(true,{autoHide:true});});
  $('readerImmersiveNext').addEventListener('click',()=>{navigatePrevNext(true);showImmersiveControls(true,{autoHide:true});});
  $('readerToneButton').addEventListener('click',()=>{
    if(!state)return;
    closeAdvancedPanels();
    const visible=$('readerTonePanel').hidden;
    $('readerTonePanel').hidden=!visible;
    $('reader').dataset.toneOpen=String(visible);
    $('readerToneButton').setAttribute('aria-expanded',String(visible));
    if(visible)updateToneControls();
  });
  $('readerToneClose').addEventListener('click',closeTonePanel);
  document.querySelectorAll('[data-reader-preset]').forEach(button=>button.addEventListener('click',()=>{
    if(!state)return;
    state.book.theme=button.dataset.readerPreset;
    applyTheme();scheduleSave();
  }));
  for(const [control,field,min,max] of [['readerWarmth','warmth',0,100],['readerDimmer','dimmer',60,100]]){
    $(control).addEventListener('input',event=>{
      if(!state)return;
      state.book[field]=clampTone(event.target.value,field==='dimmer'?100:0,min,max);
      applyTheme();scheduleSave();
    });
  }
  $('readerToneReset').addEventListener('click',()=>{
    if(!state)return;
    state.book.theme='light';state.book.warmth=0;state.book.dimmer=100;
    applyTheme();scheduleSave();
  });
  document.addEventListener('fullscreenchange',()=>{
    if(!native&&state?.immersive&&!document.fullscreenElement)setImmersive(false);
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
    closeAdvancedPanels();closeTonePanel();
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
    if(e.key==='Escape'){backInReader();return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){
      e.preventDefault();$('readerFindButton').click();return;
    }
  });
}
setup();
export async function findInReader(query){
 if($('reader').hidden||!state)return;
 closeAdvancedPanels();closeTonePanel();
 $('readerFindPanel').hidden=false;
 $('readerFindButton').setAttribute('aria-expanded','true');
 $('readerFindInput').value=String(query||'').slice(0,100);
 if(String(query||'').trim().length>=2)await runBookSearch(query);
 else $('readerFindInput').focus();
}
export const Reader={open,close:closeReader,back:backInReader,isOpen:()=>!$('reader').hidden,persistNow:persistReaderNow,find:findInReader};
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
