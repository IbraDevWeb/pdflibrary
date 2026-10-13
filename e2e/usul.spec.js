import {test,expect} from '@playwright/test';

const book=(id,title,arabic,slug)=>({
 type:'book',id,primaryName:title,secondaryName:arabic,slug,
 author:{primaryName:'Mālik b. Anas',secondaryName:'مالك بن أنس',slug:'malik-ibn-anas'},
 advancedGenreIds:['maliki-jurisprudence'],
 versions:[{source:'pdf',publicationDetails:{publisher:'Édition exemple',publicationYear:'1440'}}]
});
const response=(page)=>({
 results:{found:31,page,hits:page===1?[
   book('muwatta1','Al-Muwaṭṭaʾ','الموطأ','al-muwatta'),
   book('risala2','Risāla','الرسالة','risala')
 ]:[book('tawassut3','Al-Tawassuṭ','التوسط','al-tawassut')]},
 pagination:{totalRecords:31,totalPages:2,currentPage:page,hasNext:page<2}
});

test('Usul.ai : recherche réelle en forme de fiches, affichage arabe et ouverture de la source',async({page})=>{
 await page.addInitScript(()=>{
  window.__openedSites=[];
  window.open=url=>{window.__openedSites.push(url);return {closed:false};};
 });
 await page.route('https://api.usul.ai/search/books**',route=>{
  const n=Number(new URL(route.request().url()).searchParams.get('page')||1);
  return route.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(response(n))});
 });
 await page.goto('/');
 await page.locator('#catalogOpen').click();
 await expect(page.locator('#catalogProviderTabs')).toBeVisible();
 await page.locator('[data-source-open="usul"]').click();
 await expect(page.locator('#usulSearchSection')).toBeVisible();
 await expect(page.locator('#islamhouseSearchSection')).toBeHidden();
 await page.locator('#usulQuery').fill('مالك');
 await page.locator('#usulSearchForm button[type="submit"]').click();
 await expect(page.locator('.usul-card')).toHaveCount(2);
 await expect(page.locator('.usul-card').first()).toContainText('الموطأ');
 await expect(page.locator('.usul-card').first()).toContainText('Mālik b. Anas');
 await expect(page.locator('.usul-card').first()).toContainText('Fiqh mâlikite');
 await expect(page.locator('#usulStatus')).toContainText('31 ouvrage');
 await page.locator('[data-usul-book="muwatta1"]').click();
 await expect.poll(()=>page.evaluate(()=>window.__openedSites.length)).toBe(1);
 await expect.poll(()=>page.evaluate(()=>window.__openedSites[0])).toBe('https://usul.ai/t/al-muwatta');
 await page.locator('#usulNext').click();
 await expect(page.locator('.usul-card')).toHaveCount(1);
 await expect(page.locator('#usulPage')).toHaveText('Page 2 / 2');
 await page.locator('#usulPrev').click();
 await expect(page.locator('.usul-card')).toHaveCount(2);
 await page.locator('[data-provider="islamhouse"]').click();
 await expect(page.locator('#islamhouseSearchSection')).toBeVisible();
 await expect(page.locator('#usulSearchSection')).toBeHidden();
});

test('Usul.ai : en cas de refus du fournisseur, accès au site officiel et aucun bouton PDF',async({page})=>{
 await page.addInitScript(()=>{
  window.__openedSites=[];
  window.open=url=>{window.__openedSites.push(url);return {closed:false};};
 });
 await page.route('https://api.usul.ai/search/books**',route=>route.fulfill({
  status:403,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'{"message":"Forbidden"}'
 }));
 await page.goto('/');
 await page.locator('#catalogOpen').click();
 await page.locator('[data-provider="usul"]').click();
 await page.locator('#usulQuery').fill('hadith');
 await page.locator('#usulSearchForm button[type="submit"]').click();
 await expect(page.locator('#usulStatus')).toContainText('restreint');
 await expect(page.locator('#usulVisit')).toBeVisible();
 await page.locator('#usulVisit').click();
 await expect.poll(()=>page.evaluate(()=>window.__openedSites[0])).toBe('https://usul.ai/texts');
 await expect(page.locator('#usulResults')).not.toContainText('Télécharger PDF');
});
