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
function pdfDocument(){
 const text='BT /F1 20 Tf 35 330 Td (Folio Windows PDF) Tj ET';
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
   epubIframe:host?.querySelector('iframe')?.getBoundingClientRect().toJSON()
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
   assert.equal(result.readerHidden,false,'Le lecteur '+type+' doit être visible');
   assert.ok(result.url.startsWith('folio://app/'),'Le livre ne doit pas naviguer hors de Folio');
   assert.notEqual(result.barDisplay,'none','La barre de navigation doit rester visible');
   assert.ok(type==='pdf'?result.pdfCanvas?.width>10:result.epubIframe?.width>10,
     'Le livre '+type+' doit afficher une page visible');
   await page.locator('#closeReader').click();
   assert.equal((await snapshot(page,'after-close-'+type)).readerHidden,true);
  }
  assert.equal(errors.length,0,'Aucune erreur JavaScript dans la fenêtre du lecteur');
  console.log('DÉMARRAGE ET LECTURE PDF/EPUB ELECTRON : SUCCÈS');
 }finally{await app.close();}
}
main().catch(error=>{console.error('DIAGNOSTIC_WINDOWS_FAILED:',error.stack||error);process.exitCode=1;});
