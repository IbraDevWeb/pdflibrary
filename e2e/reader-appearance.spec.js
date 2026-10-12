import { test, expect } from '@playwright/test';

test('lecture : teinte persistante, luminosité et plein écran réversible',async ({page})=>{
  await page.goto('/');
  await page.evaluate(async()=>{
    const body='BT /F1 18 Tf 35 330 Td (Bonjour depuis Folio) Tj ET';
    const objects=[
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Length '+body.length+' >>\nstream\n'+body+'\nendstream'
    ];
    let pdf='%PDF-1.4\n',offsets=[0];
    for(let i=0;i<objects.length;i++){
      offsets.push(pdf.length);
      pdf+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';
    }
    const start=pdf.length;
    pdf+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n';
    for(const offset of offsets.slice(1))pdf+=String(offset).padStart(10,'0')+' 00000 n \n';
    pdf+='trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
    const db=await new Promise((resolve,reject)=>{
      const request=indexedDB.open('folio-library',1);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('books','readwrite');
      tx.objectStore('books').put({
        id:'e2e-reading-appearance',title:'Essai de lecture',author:'Auteur exemple',
        kind:'pdf',status:'to-read',theme:'light',zoom:1,warmth:0,dimmer:100,
        file:new Blob([pdf],{type:'application/pdf'}),
        page:1,totalPages:1,createdAt:Date.now(),annotations:[],bookmarks:[]
      });
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await page.locator('[data-action="read"][data-id="e2e-reading-appearance"]').click();
  await expect(page.locator('#reader')).toBeVisible();
  await expect(page.locator('#readerContent canvas')).toBeVisible();
  await page.locator('#readerToneButton').click();
  await expect(page.locator('#readerTonePanel')).toBeVisible();
  await page.locator('#readerWarmth').evaluate(node=>{
    node.value='70';node.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await expect(page.locator('#readerWarmthValue')).toHaveText('70 %');
  await page.locator('#readerDimmer').evaluate(node=>{
    node.value='85';node.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await expect(page.locator('#readerDimmerValue')).toHaveText('85 %');
  await page.locator('[data-reader-preset="sepia"]').click();
  await expect(page.locator('#reader')).toHaveAttribute('data-theme','sepia');
  await page.locator('#readerToneClose').click();
  await page.locator('#readerFullscreen').click();
  await expect(page.locator('#reader')).toHaveAttribute('data-immersive','true');
  await expect(page.locator('.reader-bar')).toBeHidden();
  await expect(page.locator('#readerExitFullscreen')).toBeVisible();
  await page.locator('#readerExitFullscreen').click();
  await expect(page.locator('#reader')).toHaveAttribute('data-immersive','false');
  await expect(page.locator('.reader-bar')).toBeVisible();
  await page.locator('#closeReader').click();
  await expect.poll(()=>page.evaluate(async()=>{
    const db=await new Promise(resolve=>{const r=indexedDB.open('folio-library',1);r.onsuccess=()=>resolve(r.result);});
    const saved=await new Promise(resolve=>{const tx=db.transaction('books','readonly');const r=tx.objectStore('books').get('e2e-reading-appearance');r.onsuccess=()=>resolve(r.result);});
    db.close();
    return [saved.warmth,saved.dimmer,saved.theme].join(':');
  })).toBe('70:85:sepia');
});
