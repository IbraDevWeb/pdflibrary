'use strict';
/** Reproduction Electron vraie fenêtre (xvfb Linux).
 * Couverture du défaut: à l'ouverture d'un livre, la fenêtre ne doit
 * jamais naviguer vers une page blanche ni perdre les commandes Folio.
 */
const { _electron }=require('playwright');
const electronExecutable=require('electron');
const JSZip=require('jszip');
const assert=require('node:assert/strict');
const fs=require('node:fs');
function pdfDocument(rasterOnly=false){
 const text=rasterOnly?'0 0 0 rg 40 125 220 50 re f':'BT /F1 20 Tf 35 330 Td (Folio Windows PDF) Tj ET';
 const objs=[
 '<< /Type /Catalog /Pages 2 0 R >>',
 '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
 '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
 '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
 '<< /Length '+text.length+' >>\nstream\n'+text+'\nendstream'
 ];
 let data='%PDF-1.4\n';const offsets=[0];
 for(let i=0;i<objs.length;i++){offsets.push(data.length);data+=(i+1)+' 0 obj\n'+objs[i]+'\nendobj\n';}
 const start=data.length;
 data+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n';
 for(const o of offsets.slice(1))data+=String(o).padStart(10,'0')+' 00000 n \n';
 data+='trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
 return Buffer.from(data).toString('base64');
}
async function epubDocument(){
 const zip=new JSZip();
 zip.file('mimetype','application/epub+zip',{compression:'STORE'});
 zip.file('META-INF/container.xml','<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
 zip.file('OEBPS/content.opf','<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Folio Windows EPUB</dc:title><dc:language>fr</dc:language><dc:identifier id="id">urn:uuid:folio-test</dc:identifier></metadata><manifest><item id="chap" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chap"/></spine></package>');
 zip.file('OEBPS/chapter.xhtml','<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapitre</title></head><body><h1>Folio Windows</h1><p>Test de lecture Windows EPUB.</p></body></html>');
 return zip.generateAsync({type:'base64'});
}
async function snapshot(page,label){
 const data=await page.evaluate(()=>{
  const reader=document.getElementById('reader');
  const host=document.getElementById('readerContent');
  const bar=document.querySelector('.reader-bar');
  return {
   url:location.href,title:document.title,
   bodyText:document.body?.innerText?.slice(0,350),
   bodyHeight:document.body?.scrollHeight,
   bookGridDisplay:getComputedStyle(document.getElementById('booksGrid')).display,
   booksParentDisplay:getComputedStyle(document.getElementById('booksGrid').parentElement).display,
   homeSlotHidden:document.getElementById('homeBookSlot')?.hidden,
   mainHTML:document.querySelector('main')?.innerText?.slice(0,220),
   readerHidden:reader?.hidden,readerDisplay:reader?getComputedStyle(reader).display:null,
   readerBox:reader?.getBoundingClientRect().toJSON(),barDisplay:bar?getComputedStyle(bar).display:null,
   bookText:host?.innerText?.slice(0,200),
   pdfCanvas:host?.querySelector('canvas')?.getBoundingClientRect().toJSON(),
   pdfInkPixels:(()=>{
     const canvas=host?.querySelector('canvas');
     if(!canvas)return null;
     const context=canvas.getContext('2d',{willReadFrequently:true});
     const w=Math.min(canvas.width,1200),h=Math.min(canvas.height,800);
     if(!w||!h)return 0;
     const pixels=context.getImageData(0,0,w,h).data;
     let dark=0;
     for(let y=0;y<h;y+=3){
       for(let x=0;x<w;x+=3){
         const index=(y*w+x)*4;
         if(pixels[index+3]>180&&pixels[index]<130&&pixels[index+1]<130&&pixels[index+2]<130)dark++;
       }
     }
     return dark;
   })(),
   epubIframe:host?.querySelector('iframe')?.getBoundingClientRect().toJSON(),
   epubText:host?.querySelector('iframe')?.contentDocument?.body?.innerText?.slice(0,200)
  };
 }).catch(error=>({error:String(error),url:page.url()}));
 console.log(label,JSON.stringify(data));
 return data;
}
async function main(){
 const app=await _electron.launch({executablePath:electronExecutable,args:['.'],timeout:45000});
 const page=await app.firstWindow({timeout:30000});
 const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR:',e.message);});
 page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE_ERROR:',m.text().slice(0,700));});
 page.on('requestfailed',r=>console.log('REQUEST_FAILURE:',r.url(),r.failure()?.errorText));
 page.on('framenavigated',f=>console.log('NAVIGATION:',f.url()));
 try{
  await page.waitForSelector('#booksGrid',{state:'attached',timeout:30000});
  const initial=await snapshot(page,'initial');
  const brand=await page.evaluate(()=>({
    desktop:document.documentElement.dataset.folioDesktop==='true',
    sidebarBackground:getComputedStyle(document.querySelector('.sidebar')).backgroundImage,
    introBackground:getComputedStyle(document.querySelector('.intro')).backgroundImage,
    introGraphic:getComputedStyle(document.querySelector('.intro-illustration')).backgroundImage,
    logoLoaded:(()=>{const img=document.querySelector('.brand-emblem');return img?.complete&&img?.naturalWidth>20;})(),
    introButtons:document.querySelectorAll('.intro-actions button').length,
    searchShortcut:document.getElementById('searchShortcut').textContent,
  }));
  console.log('BRANDING_FOLIO_WINDOWS:',JSON.stringify(brand));
  assert.equal(brand.desktop,true,'Le thème Windows doit être activé via folio://app');
  assert.match(brand.sidebarBackground,/gradient/,'Barre latérale sans nouveau style');
  assert.match(brand.introBackground,/gradient/,'Accueil sans nouveau style');
  assert.match(brand.introGraphic,/folio-library-hero/,'Illustration Folio non chargée');
  assert.equal(brand.logoLoaded,true,'Logo Folio non chargé');
  assert.equal(brand.introButtons,2,'Actions accueil incomplètes');
  assert.equal(brand.searchShortcut,'Ctrl K');
  fs.mkdirSync('desktop-previews',{recursive:true});
  await page.screenshot({path:'desktop-previews/01-accueil.png',fullPage:true});
  assert.ok(initial.url.startsWith('folio://app/'),'L’application doit démarrer depuis folio://app');
  for(const type of ['pdf','epub']){
   const encoded=type==='pdf'?pdfDocument():await epubDocument();
   const id='e2e-desktop-'+type;
   await page.evaluate(async({encoded,id,type})=>{
    const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    const db=await new Promise((resolve,reject)=>{
     const req=indexedDB.open('folio-library',1);
     req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    await new Promise((resolve,reject)=>{
     const tx=db.transaction('books','readwrite');
     tx.objectStore('books').put({id,title:'Test Windows '+type,author:'Folio',kind:type,
       status:'to-read',page:1,zoom:1,createdAt:Date.now(),favorite:false,
       annotations:[],bookmarks:[],file:new Blob([bytes],{type:type==='pdf'?'application/pdf':'application/epub+zip'})});
     tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });db.close();
   },{encoded,id,type});
   await page.reload();
   await page.locator('[data-action="read"][data-id="'+id+'"]').click();
   await page.waitForTimeout(3000);
   const result=await snapshot(page,'after-opening-'+type);
   await page.screenshot({path:'desktop-previews/02-lecteur-'+type+'.png'});
   assert.equal(result.readerHidden,false,'Le lecteur '+type+' doit être visible');
   assert.ok(result.url.startsWith('folio://app/'),'Le livre ne doit pas naviguer hors de Folio');
   assert.notEqual(result.barDisplay,'none','La barre de navigation doit rester visible');
   assert.ok(type==='pdf'?result.pdfCanvas?.width>10:result.epubIframe?.width>10,
     'Le livre '+type+' doit afficher une page visible');
   if(type==='pdf')assert.ok(result.pdfInkPixels>10,'PDF rendu blanc : aucun texte dessiné dans le canvas ('+result.pdfInkPixels+')');
   if(type==='pdf'){
     const textMetrics=await page.locator('#readerContent .pdf-text-layer').evaluate(layer=>{
       const span=layer.querySelector('span');
       const rect=span?.getBoundingClientRect();
       return {
         spanCount:layer.querySelectorAll('span').length,
         width:rect?.width||0,height:rect?.height||0,
         scale:getComputedStyle(layer).getPropertyValue('--scale-factor'),
         viewport:document.getElementById('readerContent').getBoundingClientRect().toJSON()
       };
     });
     console.log('PDF_TEXT_LAYER:',JSON.stringify(textMetrics));
     assert.ok(textMetrics.spanCount>0&&textMetrics.width>3&&textMetrics.height>3,
       'Le PDF dessine du texte mais son calque sélectionnable est invisible/décalé');
     assert.ok(Number(textMetrics.scale)>0,'Variable de mise à l’échelle PDF.js absente');
     await page.locator('#readerHighlight').click();
     await page.locator('#readerContent .pdf-text-layer span').first().evaluate(span=>{
       const selection=window.getSelection(),range=document.createRange();
       range.selectNodeContents(span);selection.removeAllRanges();selection.addRange(range);
       span.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'mouse'}));
     });
     await page.waitForSelector('#readerContent .pdf-highlight-rect',{timeout:7000});
     const mark=await page.locator('#readerContent .pdf-highlight-rect').first().evaluate(node=>{
       const p=node.getBoundingClientRect(),base=node.closest('.pdf-page').getBoundingClientRect();
       return {width:p.width,height:p.height,left:p.left,right:p.right,pageLeft:base.left,pageRight:base.right};
     });
     console.log('PDF_HIGHLIGHT:',JSON.stringify(mark));
     assert.ok(mark.width>3&&mark.height>3,'Le surlignage ne couvre aucun texte');
     assert.ok(mark.left>=mark.pageLeft-.5&&mark.right<=mark.pageRight+.5,'Surlignage déplacé hors de la page');
     await page.screenshot({path:'desktop-previews/03-surlignage-pdf.png'});
     const pageBefore=await page.locator('#readerContent .pdf-page').evaluate(node=>node.getBoundingClientRect().toJSON());
     const modeBefore=await page.locator('#readerFit').innerText();
     await page.locator('#readerFit').click();
     await page.waitForTimeout(950);
     const pageAfter=await page.locator('#readerContent .pdf-page').evaluate(node=>node.getBoundingClientRect().toJSON());
     const modeAfter=await page.locator('#readerFit').innerText();
     console.log('PDF_FIT:',JSON.stringify({modeBefore,modeAfter,before:pageBefore.width,after:pageAfter.width}));
     assert.notEqual(modeBefore,modeAfter,'Le mode adapter page / largeur doit changer');
     assert.ok(Math.abs(pageBefore.width-pageAfter.width)>15,'Le mode ajustement ne modifie pas réellement le rendu');
     await page.locator('#readerZoomIn').click();
     await page.waitForTimeout(950);
     const geom=await page.locator('#readerContent').evaluate(host=>{
       const p=host.querySelector('.pdf-page').getBoundingClientRect(),r=host.getBoundingClientRect();
       return {pageWidth:p.width,hostWidth:r.width,scrollWidth:host.scrollWidth,scrollLeft:host.scrollLeft};
     });
     assert.ok(geom.pageWidth>0&&geom.scrollWidth>=geom.hostWidth,'Le zoom PDF doit rester défilable');
     await page.waitForTimeout(600);
   }
   else {
     assert.ok(result.epubText?.includes('Folio Windows'),'EPUB affiché sans contenu lisible');
     const framing=await page.locator('#readerContent').evaluate(host=>{
       const outer=host.getBoundingClientRect();
       const inner=host.querySelector('iframe')?.getBoundingClientRect();
       return {left:outer.left,right:outer.right,top:outer.top,bottom:outer.bottom,
               frameLeft:inner?.left,frameRight:inner?.right,frameTop:inner?.top,frameBottom:inner?.bottom};
     });
     console.log('EPUB_FRAMING:',JSON.stringify(framing));
     assert.ok(framing.frameLeft>=framing.left-1&&framing.frameRight<=framing.right+1,
       'Colonne EPUB décalée : l’iframe déborde hors de son lecteur');
     assert.ok(framing.frameTop>=framing.top-1&&framing.frameBottom<=framing.bottom+1,
       'Page EPUB rognée verticalement dans la liseuse');
     await page.locator('#readerZoomIn').click();
     await page.waitForTimeout(800);
     assert.ok((await snapshot(page,'epub-after-zoom')).epubText?.includes('Folio Windows'),
       'Le texte EPUB doit rester visible après changement de taille');
     await page.locator('#readerHighlight').click();
     await page.locator('#readerContent iframe').evaluate(iframe=>{
       const doc=iframe.contentDocument;
       const element=doc.querySelector('p');
       const range=doc.createRange();range.selectNodeContents(element);
       const selection=doc.getSelection();
       selection.removeAllRanges();selection.addRange(range);
       doc.dispatchEvent(new Event('selectionchange',{bubbles:true}));
       element.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
     });
     await page.waitForTimeout(900);
     const epubMarks=await page.locator('#readerNotesList [data-go-annotation]').count();
     console.log('EPUB_SELECTION_MARKS:',epubMarks);
     assert.ok(epubMarks>=1,'Le surlignage EPUB par sélection doit enregistrer une annotation');
   }
   await page.locator('#closeReader').click();
   assert.equal((await snapshot(page,'after-close-'+type)).readerHidden,true);
   if(type==='pdf'){
     await page.reload();
     await page.locator('[data-action="read"][data-id="'+id+'"]').click();
     await page.waitForSelector('#readerContent .pdf-highlight-rect',{timeout:10000});
     console.log('PDF_HIGHLIGHT_PERSISTENCE: OK');
     await page.locator('#closeReader').click();
   }
  }
  // Les livres scannés n'ont pas de calque OCR : ils doivent néanmoins
  // permettre de tracer un surlignage rectangulaire sur l'image de la page.
  const scanId='e2e-desktop-scanned-pdf';
  await page.evaluate(async({encoded,id})=>{
    const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open('folio-library',1);
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('books','readwrite');
      tx.objectStore('books').put({id,title:'PDF scanné exemple',author:'Folio',kind:'pdf',
        status:'to-read',page:1,zoom:1,createdAt:Date.now(),annotations:[],bookmarks:[],
        file:new Blob([bytes],{type:'application/pdf'})});
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });
    db.close();
  },{encoded:pdfDocument(true),id:scanId});
  await page.reload();
  await page.locator('[data-action="read"][data-id="'+scanId+'"]').click();
  await page.waitForSelector('#readerContent canvas',{timeout:20000});
  await page.waitForTimeout(600);
  await page.locator('#readerHighlight').click();
  const rect=await page.locator('#readerContent canvas').boundingBox();
  await page.mouse.move(rect.x+rect.width*.24,rect.y+rect.height*.4);
  await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.63,rect.y+rect.height*.49,{steps:8});
  await page.mouse.up();
  await page.waitForSelector('#readerContent .pdf-highlight-rect',{timeout:6000});
  console.log('PDF_SCANNED_HIGHLIGHT: OK');
  await page.screenshot({path:'desktop-previews/04-pdf-scan-annotation.png'});
  await page.locator('#closeReader').click();

  assert.equal(errors.length,0,'Aucune erreur JavaScript dans la fenêtre du lecteur');
  console.log('DÉMARRAGE ET LECTURE PDF/EPUB ELECTRON : SUCCÈS');
 }finally{await app.close();}
}
main().catch(error=>{console.error('DIAGNOSTIC_WINDOWS_FAILED:',error.stack||error);process.exitCode=1;});
