import {test,expect} from '@playwright/test';

function pdfOfTwoPages(){
 const bodyA='BT /F1 22 Tf 35 300 Td (Page one Folio) Tj ET';
 const bodyB='BT /F1 22 Tf 35 300 Td (Page two Folio) Tj ET';
 const objects=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Length '+bodyA.length+' >>\nstream\n'+bodyA+'\nendstream',
  '<< /Length '+bodyB.length+' >>\nstream\n'+bodyB+'\nendstream'
 ];
 let pdf='%PDF-1.4\n';const offsets=[0];
 for(let i=0;i<objects.length;i++){offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const start=pdf.length;
 pdf+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n';
 for(const offset of offsets.slice(1))pdf+=String(offset).padStart(10,'0')+' 00000 n \n';
 pdf+='trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
 return pdf;
}
async function swipe(page,{left=true,tap=false}={}){
 await page.locator('#readerContent').evaluate(async(node,{left,tap})=>{
  const TouchClass=node.ownerDocument.defaultView.Touch;
  const TouchEventClass=node.ownerDocument.defaultView.TouchEvent;
  const from=left?250:85,to=tap?from:left?85:250;
  const start=new TouchClass({identifier:19,target:node,clientX:from,clientY:200});
  const end=new TouchClass({identifier:19,target:node,clientX:to,clientY:201});
  node.dispatchEvent(new TouchEventClass('touchstart',{touches:[start],targetTouches:[start],changedTouches:[start],bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,105));
  node.dispatchEvent(new TouchEventClass('touchend',{touches:[],targetTouches:[],changedTouches:[end],bubbles:true,cancelable:true}));
 },{left,tap});
}
test('PDF zoomé : panoramique horizontal puis swipe au bord pour changer de page',async({page})=>{
 await page.goto('/');
 const pdf=pdfOfTwoPages();
 await page.evaluate(async(pdf)=>{
  const req=indexedDB.open('folio-library',1),db=await new Promise((resolve,reject)=>{
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('books','readwrite');
   tx.objectStore('books').put({
    id:'e2e-zoom-two-pages',title:'Lecture PDF agrandie',author:'Folio',kind:'pdf',
    status:'reading',zoom:2,createdAt:Date.now(),file:new Blob([pdf],{type:'application/pdf'}),
    page:1,totalPages:2,annotations:[],bookmarks:[]
   });
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });db.close();
 },pdf);
 await page.reload();
 await page.locator('[data-action="read"][data-id="e2e-zoom-two-pages"]').click();
 await expect(page.locator('#readerContent canvas')).toBeVisible();
 await expect(page.locator('#readerPage')).toHaveValue('1');
 const host=page.locator('#readerContent');
 await expect.poll(()=>host.evaluate(x=>x.scrollWidth-x.clientWidth)).toBeGreaterThan(80);
 await host.evaluate(x=>x.scrollLeft=(x.scrollWidth-x.clientWidth)/2);
 await swipe(page,{left:true});
 await expect(page.locator('#readerPage')).toHaveValue('1');
 await host.evaluate(x=>x.scrollLeft=x.scrollWidth-x.clientWidth);
 await swipe(page,{left:true});
 await expect(page.locator('#readerPage')).toHaveValue('2');
 await expect(page.locator('#readerContent canvas')).toBeVisible();
 await host.evaluate(x=>x.scrollLeft=0);
 await swipe(page,{left:false});
 await expect(page.locator('#readerPage')).toHaveValue('1');
 await expect.poll(()=>host.evaluate(x=>Math.round(x.scrollLeft))).toBeGreaterThan(30);
});
test('plein écran : toucher affiche et masque les commandes, sans quitter la lecture',async({page})=>{
 await page.goto('/');
 const pdf=pdfOfTwoPages();
 await page.evaluate(async(pdf)=>{
  const req=indexedDB.open('folio-library',1),db=await new Promise((resolve,reject)=>{
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('books','readwrite');
   tx.objectStore('books').put({
    id:'e2e-immersive-two-pages',title:'Immersion PDF',author:'Folio',kind:'pdf',
    status:'reading',zoom:1,createdAt:Date.now(),file:new Blob([pdf],{type:'application/pdf'}),
    page:1,totalPages:2,annotations:[],bookmarks:[]
   });
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });db.close();
 },pdf);
 await page.reload();
 await page.locator('[data-action="read"][data-id="e2e-immersive-two-pages"]').click();
 await expect(page.locator('#readerContent canvas')).toBeVisible();
 await page.locator('#readerFullscreen').click();
 await expect(page.locator('#reader')).toHaveAttribute('data-immersive','true');
 await expect(page.locator('.reader-bar')).toBeHidden();
 await expect(page.locator('#readerImmersiveControls')).toBeVisible();
 await swipe(page,{tap:true});
 await expect(page.locator('#readerImmersiveControls')).toBeHidden();
 await expect(page.locator('#reader')).toHaveAttribute('data-immersive','true');
 await swipe(page,{tap:true});
 await expect(page.locator('#readerImmersiveControls')).toBeVisible();
 await page.locator('#readerImmersiveNext').click();
 await expect(page.locator('#readerPage')).toHaveValue('2');
 await page.setViewportSize({width:800,height:400});
 await expect(page.locator('#readerContent canvas')).toBeVisible();
 await page.locator('#readerExitFullscreen').click();
 await expect(page.locator('#reader')).toHaveAttribute('data-immersive','false');
 await expect(page.locator('.reader-bar')).toBeVisible();
 await expect(page.locator('#readerImmersiveControls')).toBeHidden();
});
