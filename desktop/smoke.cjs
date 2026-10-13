'use strict';
/** Exécuté par GitHub Actions sous Windows pour vérifier l'installabilité fonctionnelle. */
const assert=require('node:assert/strict');
const { _electron }=require('playwright');
const electronPath=require('electron');
const id='windows-smoke-book';
async function boot(){
 const electron=await _electron.launch({
  executablePath:electronPath,args:['.'],timeout:60000
 });
 const page=await electron.firstWindow();
 page.on('pageerror',error=>console.warn('Fenêtre Folio :',error.message));
 await page.waitForSelector('#booksGrid',{timeout:40000});
 const origin=await page.evaluate(()=>location.origin);
 assert.equal(origin,'folio://app','Origine locale sécurisée de Folio');
 return {electron,page};
}
async function main(){
 let launch=await boot();
 try{
  await launch.page.evaluate(async id=>{
   const req=indexedDB.open('folio-library',1);
   const db=await new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
   });
   const tx=db.transaction('books','readwrite');
   tx.objectStore('books').put({
    id,title:'Essai de lecture Windows',author:'Test de compilation',
    kind:'pdf',status:'to-read',page:1,zoom:1,
    createdAt:Date.now(),updatedAt:Date.now(),
    favorite:true,annotations:[],bookmarks:[],
    // PDF de 1 page : la couche de texte et le canvas sont chargés sans réseau.
    file:new Blob(['%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n'],{type:'application/pdf'})
   });
   await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
   db.close();
  },id);
  await launch.page.reload();
  await launch.page.locator('[data-action="read"][data-id="'+id+'"]').click();
  await launch.page.waitForSelector('#readerContent canvas',{timeout:30000});
  await launch.page.locator('#closeReader').click();
  console.log('Ouverture du PDF et lecture hors ligne : OK');
 }finally{await launch.electron.close();}
 launch=await boot();
 try{
  const result=await launch.page.evaluate(async id=>{
   const req=indexedDB.open('folio-library',1);
   const db=await new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   });
   const tx=db.transaction('books','readwrite');
   const r=tx.objectStore('books').get(id);
   const found=await new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
   tx.objectStore('books').delete(id);
   await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
   db.close();return found;
  },id);
  assert.equal(result?.title,'Essai de lecture Windows','La bibliothèque doit survivre à la fermeture du PC');
  assert.equal(result?.favorite,true);
  assert.ok(result?.file?.size>0,'Le fichier PDF doit être conservé.');
  console.log('IndexedDB et livres conservés après fermeture/réouverture : OK');
 }finally{await launch.electron.close();}
}
main().catch(error=>{console.error('ÉCHEC du test Windows',error);process.exitCode=1;});
