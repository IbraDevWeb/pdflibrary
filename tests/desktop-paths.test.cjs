'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {assetPath,mimeFor,isExternalHTTP}=require('../desktop/paths.cjs');
const root=path.resolve('dist');
test('Folio Windows : ressources au sein du répertoire de distribution',()=>{
 assert.equal(assetPath(root,'folio://app/'),path.join(root,'index.html'));
 assert.equal(assetPath(root,'folio://app/assets/reader-123.mjs'),path.join(root,'assets','reader-123.mjs'));
 assert.equal(assetPath(root,'folio://app/icons/icon.svg?unused=1'),path.join(root,'icons','icon.svg'));
});
test('Folio Windows : traversées interdites et autres protocoles rejetés',()=>{
 for(const url of [
  'file:///C:/Windows/system.ini','https://example.com/secret','folio://evil/index.html',
  'folio://app/%2Ehidden','folio://app/.env','folio://app/%2e%2e/secret',
  'folio://app/%5CWindows%5Csystem.ini','folio://app/assets/%00.txt'
 ])assert.equal(assetPath(root,url),null,url);
});
test('Folio Windows : types MIME nécessaires au lecteur PDF/EPUB',()=>{
 assert.match(mimeFor('reader.js'),/javascript/);
 assert.match(mimeFor('worker.min.mjs'),/javascript/);
 assert.equal(mimeFor('reader.css'),'text/css; charset=utf-8');
 assert.equal(mimeFor('library.epub'),'application/octet-stream');
 assert.equal(mimeFor('icon.png'),'image/png');
});
test('Windows : ouvrir seulement les liens web, jamais les URI locales ou scripts',()=>{
 assert.equal(isExternalHTTP('https://usul.ai/texts'),true);
 assert.equal(isExternalHTTP('https://islamhouse.com/fr/books/'),true);
 assert.equal(isExternalHTTP('javascript:alert(1)'),false);
 assert.equal(isExternalHTTP('file:///C:/Users/documents/secrets'),false);
 assert.equal(isExternalHTTP('http://localhost:5000/'),false);
 assert.equal(isExternalHTTP('https://user:pw@usul.ai'),false);
});
