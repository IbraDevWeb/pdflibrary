import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

async function buildEpub(){
 const zip=new JSZip();
 zip.file('mimetype','application/epub+zip',{compression:'STORE'});
 zip.file('META-INF/container.xml','<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
 zip.file('OEBPS/content.opf',[
  '<?xml version="1.0" encoding="utf-8"?>',
  '<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bookid">',
  '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">',
  '<dc:title>Essai de lecture EPUB</dc:title><dc:creator>Folio</dc:creator>',
  '<dc:language>fr</dc:language><dc:identifier id="bookid">urn:uuid:45454-aaaa-folio</dc:identifier></metadata>',
  '<manifest><item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
  '<item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>',
  '<item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/></manifest>',
  '<spine toc="toc"><itemref idref="chapter1"/><itemref idref="chapter2"/></spine></package>'
 ].join(''));
 zip.file('OEBPS/toc.ncx',[
  '<?xml version="1.0" encoding="utf-8"?>',
  '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">',
  '<head><meta name="dtb:uid" content="urn:uuid:45454-aaaa-folio"/></head>',
  '<docTitle><text>Essai de lecture EPUB</text></docTitle><navMap>',
  '<navPoint id="ch1" playOrder="1"><navLabel><text>Introduction</text></navLabel><content src="chapter1.xhtml"/></navPoint>',
  '<navPoint id="ch2" playOrder="2"><navLabel><text>Sciences</text></navLabel><content src="chapter2.xhtml"/></navPoint>',
  '</navMap></ncx>'
 ].join(''));
 zip.file('OEBPS/chapter1.xhtml','<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Introduction</title></head><body><h1>Introduction</h1><p>Bonjour, bienvenue sur Folio, application de lecture.</p></body></html>');
 zip.file('OEBPS/chapter2.xhtml','<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Sciences</title></head><body><h1>Sciences</h1><p>La science du hadith transmet des connaissances et de la sagesse.</p></body></html>');
 return zip.generateAsync({type:'base64',compression:'DEFLATE'});
}

test('EPUB : recherche dans les chapitres et typographie persistante',async ({page})=>{
 const encoded=await buildEpub();
 await page.goto('/');
 await page.evaluate(async base64=>{
  const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  const db=await new Promise((resolve,reject)=>{
   const r=indexedDB.open('folio-library',1);
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('books','readwrite');
   tx.objectStore('books').put({
    id:'e2e-epub-reading',title:'Essai de lecture EPUB',author:'Folio',
    kind:'epub',status:'to-read',theme:'light',zoom:1,
    file:new Blob([bytes],{type:'application/epub+zip'}),
    page:1,totalPages:null,createdAt:Date.now(),annotations:[],bookmarks:[]
   });
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });db.close();
 },encoded);
 await page.reload();
 await page.locator('[data-action="read"][data-id="e2e-epub-reading"]').click();
 await expect(page.locator('#readerContent iframe')).toBeVisible({timeout:20000});
 await page.locator('#readerFontButton').click();
 await expect(page.locator('#readerFontFamily')).toBeEnabled();
 await page.locator('#readerFontFamily').selectOption('readable');
 await page.locator('#readerLineHeight').evaluate(node=>{
  node.value='2.0';node.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.locator('#readerFontSize').evaluate(node=>{
  node.value='130';node.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await expect(page.locator('#readerFontSizeLabel')).toHaveText('130 %');
 await page.locator('#readerFontClose').click();
 await page.locator('#readerFindButton').click();
 await page.locator('#readerFindInput').fill('hadith');
 await page.locator('#readerFindForm button[type="submit"]').click();
 await expect(page.locator('#readerFindResults .reader-find-result')).toHaveCount(1,{timeout:25000});
 await page.locator('#readerFindResults .reader-find-result').click();
 await expect(page.locator('#readerFindPanel')).toBeHidden();
 await page.locator('#closeReader').click();
 await expect.poll(()=>page.evaluate(async()=>{
  const db=await new Promise(resolve=>{const r=indexedDB.open('folio-library',1);r.onsuccess=()=>resolve(r.result);});
  const b=await new Promise(resolve=>{const r=db.transaction('books','readonly').objectStore('books').get('e2e-epub-reading');r.onsuccess=()=>resolve(r.result);});
  db.close();return [b.fontFamily,b.lineHeight,b.zoom].join(':');
 })).toBe('readable:2:1.3');
});
