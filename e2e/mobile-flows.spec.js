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

test('catalogue : ouverture du site officiel dans le navigateur et exploration des PDF',async ({page})=>{
  await page.addInitScript(()=>{
    window.__openedSites=[];
    window.open=(url)=>{window.__openedSites.push(url);return {closed:false};};
  });
  await page.route('https://islamhouse.com/**',route=>route.fulfill({
    status:200,
    headers:{'content-type':'text/html; charset=utf-8','access-control-allow-origin':'*'},
    body:'<html><head><title>Bibliothèque test</title></head><body><a href="https://islamhouse.com/livres/ouvrage.pdf">Télécharger le livre PDF</a><a href="/fr/chapitre">Autre chapitre</a></body></html>'
  }));
  await page.goto('/');
  await page.locator('#catalogOpen').click();
  await expect(page.locator('#catalog')).toBeVisible();
  await expect(page.locator('[data-source-visit="islamhouse-fr"]')).toBeVisible();
  await page.locator('[data-source-visit="islamhouse-fr"]').click();
  await expect.poll(()=>page.evaluate(()=>window.__openedSites?.length)).toBe(1);
  await expect.poll(()=>page.evaluate(()=>window.__openedSites?.[0])).toContain('islamhouse.com');
  await page.locator('[data-source-open="islamhouse-fr"]').click();
  await expect(page.locator('#catalogLoaded')).toBeVisible();
  await expect(page.locator('#catalogBooks .catalog-book')).toHaveCount(1);
  await expect(page.locator('#catalogExternal')).toBeVisible();
  await expect.poll(()=>page.locator('#catalog').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeGreaterThan(0);
});
