import { test, expect } from '@playwright/test';

test('accueil : les livres restent accessibles en faisant défiler la page mobile',async ({page})=>{
  await page.goto('/');
  await page.waitForFunction(()=>Boolean(document.getElementById('booksGrid')));
  await page.evaluate(async()=>{
    const open=()=>new Promise((resolve,reject)=>{
      const req=indexedDB.open('folio-library',1);
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    const db=await open();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('books','readwrite');
      for(let i=1;i<=18;i++)tx.objectStore('books').put({
        id:'e2e-scroll-'+i,title:'Livre de démonstration '+i,author:'Auteur test',
        category:'Tests',rating:0,favorite:false,status:'to-read',notes:'',
        page:1,totalPages:10,kind:'pdf',createdAt:Date.now()+i
      });
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator('.book-card')).toHaveCount(18);
  const main=page.locator('.app-shell > .main');
  await expect.poll(()=>main.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeGreaterThan(300);
  await page.mouse.move(190,650);
  await page.mouse.wheel(0,720);
  await expect.poll(()=>main.evaluate(el=>el.scrollTop)).toBeGreaterThan(100);
  await expect(page.locator('#booksGrid')).toBeVisible();
});

test('IslamHouse : rechercher titre/auteur → vraie fiche PDF → importer dans Folio',async ({page})=>{
 await page.addInitScript(()=>{
  window.__openedSites=[];
  window.open=url=>{window.__openedSites.push(url);return {closed:false};};
 });
 await page.route('https://api3.islamhouse.com/**',route=>{
  const url=route.request().url();
  const data=url.includes('/get-item/')
   ?{id:234567,title:'Les 40 hadiths de l’imam Nawawi',attachments:[
     {extension_type:'PDF',url:'https://d1.islamhouse.com/files/40hadiths.pdf',title:'PDF du livre'},
     {extension_type:'MP3',url:'https://d1.islamhouse.com/files/sound.mp3'}
    ]}
   :{data:[
     {id:234567,title:'Les 40 hadiths de l’imam Nawawi',type:'books',num_attachments:2,
      prepared_by:[{type:'author',kind:'author',title:'An Nawawi'}],description:'Compilation de hadiths'},
     {id:234568,title:'Apprendre l’arabe',type:'books',num_attachments:1,prepared_by:[]}
    ]};
  return route.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(data)});
 });
 await page.route('https://d1.islamhouse.com/files/40hadiths.pdf',route=>route.fulfill({
  status:200,headers:{'content-type':'application/pdf','access-control-allow-origin':'*'},
  body:'%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n'
 }));
 await page.goto('/');
 await page.locator('#catalogOpen').click();
 await expect(page.locator('#catalog')).toBeVisible();
 await expect(page.locator('#ihSearchForm')).toBeVisible();
 await page.locator('#ihQuery').fill('Nawawi');
 await page.locator('#ihSearchSubmit').click();
 await expect(page.locator('.ih-book')).toHaveCount(1);
 await expect(page.locator('.ih-book')).toContainText('Les 40 hadiths');
 await expect(page.locator('.ih-book')).toContainText('An Nawawi');
 await page.locator('[data-ih-detail="234567"]').click();
 await expect(page.locator('.ih-download')).toHaveCount(1);
 await expect(page.locator('.ih-download')).toContainText('Télécharger PDF dans Folio');
 await page.locator('.ih-download').click();
 await expect(page.locator('#ihStatus')).toContainText('accessible hors ligne');
 await page.locator('#catalogClose').click();
 await expect(page.locator('.book-card')).toHaveCount(1);
 await expect(page.locator('.book-card')).toContainText('Les 40 hadiths');
});

test('IslamHouse : l’ancienne URL ne montre plus les 505 liens de navigation',async ({page})=>{
 await page.goto('/');
 await page.locator('#catalogOpen').click();
 await expect(page.locator('#catalogPanel')).toBeHidden();
 await page.locator('#catalogSourceTabs [data-source-tab="general"]').click();
 await expect(page.locator('#catalogPanel')).toBeVisible();
 await page.locator('#catalogUrlInput').fill('https://islamhouse.com/fr/books/fr/1?sort=date');
 await page.locator('#catalogUrlForm button[type=submit]').click();
 await expect(page.locator('#ihSearchForm')).toBeVisible();
 await expect(page.locator('#catalogLoaded')).toBeHidden();
 await expect(page.locator('#catalogPages')).not.toContainText('API');
 await page.locator('#catalogSourceTabs [data-source-tab="islam"]').click();
 await expect(page.locator('[data-source-open="islamhouse-fr"]')).toBeVisible();
 await expect(page.locator('[data-source-open="waqfeya"]')).toHaveCount(0);
 await expect(page.locator('[data-source-visit="waqfeya"]')).toBeVisible();
});
