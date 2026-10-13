import {test,expect} from "@playwright/test";
import JSZip from "jszip";
import {readFile} from "node:fs/promises";

async function seed(page){
 await page.goto("/");
 await page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open("folio-library",1);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  const books=[
   {id:"test-fiqh-01",title:"الْفِقْهُ الْمَالِكِيّ",author:"Ibn Rushd",category:"Sciences islamiques/Archives",
    islamic:{enabled:true,discipline:"fiqh",madhhab:"maliki",language:"ar",authorArabic:"ابن رشد",authorDeathHijri:"595 H",publisher:"Exemple de maison d'édition"},
    annotations:[{kind:"pdf",page:1,text:"Les contrats",note:"Relecture"}]},
   {id:"test-hadith-02",title:"Recueil de hadith",author:"Auteur témoin",category:"Sciences islamiques/IslamHouse"},
   {id:"test-general-03",title:"Mathématiques",author:"Auteur X",category:"Essais"}
  ];
  await new Promise((resolve,reject)=>{
   const tx=db.transaction("books","readwrite");
   for(const book of books)tx.objectStore("books").put({
    ...book,kind:"pdf",status:"to-read",createdAt:Date.now(),updatedAt:Date.now(),
    progress:0,rating:0,favorite:false,notes:"",tags:[],
    file:new Blob(["%PDF-1.4\n%%EOF"],{type:"application/pdf"}),
    cover:new Blob(["cover"],{type:"image/png"}),
    bookmarks:[],annotations:book.annotations||[]
   });
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
  db.close();
 });
 await page.reload();
}
test("sciences islamiques : disciplines, recherche arabe, écoles et notices auteurs",async({page})=>{
 await seed(page);
 await page.locator("#islamicMobile").click();
 await expect(page.locator("#islamicLibrary")).toBeVisible();
 await expect(page.locator("#islamicCountBooks")).toHaveText("2");
 await expect(page.locator("#islamicCountClassified")).toHaveText("1");
 await expect(page.locator(".islamic-book")).toHaveCount(2);
 await page.locator('[data-islamic-discipline="fiqh"]').click();
 await expect(page.locator(".islamic-book")).toHaveCount(1);
 await expect(page.locator(".islamic-book h4")).toContainText("الْفِقْهُ");
 await page.locator("#islamicSchool").selectOption("maliki");
 await expect(page.locator(".islamic-book")).toHaveCount(1);
 await page.locator("#islamicSearch").fill("الفقه");
 await expect(page.locator(".islamic-book")).toHaveCount(1);
 await page.locator("#islamicSearch").fill("غير موجود");
 await expect(page.locator(".islamic-book")).toHaveCount(0);
 await page.locator("#islamicClear").click();
 await expect(page.locator(".islamic-book")).toHaveCount(2);
 await page.getByRole("button",{name:/Ibn Rushd.*notice/i}).click();
 await expect(page.locator("#islamicAuthorDialog")).toBeVisible();
 await expect(page.locator("#islamicAuthorDialogContent")).toContainText("595 H");
 await expect(page.locator("#islamicAuthorDialogContent")).toContainText("الْفِقْهُ");
 await page.locator("#islamicAuthorClose").click();
 await page.locator("#islamicClose").click();
 await expect(page.locator("#islamicLibrary")).toBeHidden();
});
test("sciences islamiques : éditer la fiche, conserver les champs dans une sauvegarde ZIP",async({page})=>{
 await seed(page);
 await page.locator("#islamicMobile").click();
 await page.locator('[data-islamic-edit="test-hadith-02"]').click();
 await expect(page.locator("#editDialog")).toBeVisible();
 await expect(page.locator("#editIslamicEnabled")).toBeChecked();
 await page.locator("#editIslamicDiscipline").selectOption("hadith");
 await page.locator("#editIslamicLanguage").selectOption("fr");
 await page.locator("#editIslamicOriginalTitle").fill("كتاب الحديث");
 await page.locator("#editIslamicAuthorArabic").fill("مؤلف تجريبي");
 await page.locator("#editIslamicPublisher").fill("Éditeur test");
 await page.locator("#editIslamicPublicationYear").fill("2026");
 await page.locator("#editForm button[type=submit]").click();
 await expect(page.locator("#editDialog")).toBeHidden();
 await expect(page.locator("#islamicCountClassified")).toHaveText("2");
 await expect(page.locator('[data-islamic-book="test-hadith-02"]')).toContainText("كتاب الحديث");
 await page.locator("#islamicClose").click();
 await page.locator("#settingsTop").click();
 const downloadPromise=page.waitForEvent("download");
 await page.locator("#backupExport").click();
 const download=await downloadPromise;
 const zip=await JSZip.loadAsync(await readFile(await download.path()));
 const manifest=JSON.parse(await zip.file("library.json").async("string"));
 const record=manifest.books.find(b=>b.id==="test-hadith-02");
 expect(record.islamic.enabled).toBe(true);
 expect(record.islamic.discipline).toBe("hadith");
 expect(record.islamic.originalTitle).toBe("كتاب الحديث");
 expect(record.islamic.publisher).toBe("Éditeur test");
 await page.locator("#settingsDialog .close-dialog").click();
 await page.locator("#islamicMobile").click();
 await page.locator('[data-islamic-edit="test-fiqh-01"]').click();
 await page.locator("#editIslamicEnabled").uncheck();
 await page.locator("#editForm button[type=submit]").click();
 await expect(page.locator("#islamicCountBooks")).toHaveText("1");
});
