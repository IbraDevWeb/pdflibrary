import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../src/reader.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/mobile-polish.css',import.meta.url),'utf8');
const config=JSON.parse(readFileSync(new URL('../capacitor.config.json',import.meta.url),'utf8'));

test('aucune commande de lecture n’est absente ou dupliquée',()=>{
 for(const id of ['reader','readerContent','readerPrev','readerNext','readerDirection','readerHighlight','readerBookmark','readerZoomIn','readerZoomOut','readerZoomValue','readerMenu','readerSidebar','readerTip','closeReader','readerFullscreen','readerExitFullscreen','readerToneButton','readerTonePanel','readerWarmth','readerDimmer','readerToneReset']){
   const matches=[...html.matchAll(new RegExp('id="'+id+'"','g'))].length;
   assert.equal(matches,1,'contrôle '+id);
 }
});
test('Android edge-to-edge et viewport safe area',()=>{
 assert.equal(config.plugins.SystemBars.insetsHandling,'native');
 assert.match(html,/viewport-fit=cover/);
 assert.match(css,/safe-area-inset-top/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/height:100dvh/);
});
test('toutes les interactions principales sont raccordées',()=>{
 assert.match(js,/attachGestures\(\$\('readerContent'\)\)/);
 assert.match(js,/rendition\.on\('rendered'/);
 assert.match(js,/readerDirection.*addEventListener/);
 assert.match(js,/ResizeObserver/);
 assert.match(js,/export const Reader=/);
});

test('immersion et confort visuel connectés au lecteur',()=>{
 assert.match(js,/SystemBars\.hide/);
 assert.match(js,/SystemBars\.show/);
 assert.match(js,/readerToneButton.*addEventListener/);
 assert.match(js,/readerWarmth/);
 assert.match(js,/readerDimmer/);
});
