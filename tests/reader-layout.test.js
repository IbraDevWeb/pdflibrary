import test from 'node:test';
import assert from 'node:assert/strict';
import {fitPDFPage,safeCanvasRatio,rectsFromSelection,pdfTextStatus,PDF_MAX_PIXELS,PDF_MAX_SIDE} from '../src/reader-layout.js';
test('A4 portrait ajusté à la fenêtre sans dépasser ni horizontalement ni verticalement',()=>{
 const result=fitPDFPage({pageWidth:595,pageHeight:842,hostWidth:1100,hostHeight:680,fit:'page'});
 assert.ok(result.width<=1100&&result.height<=680);
 assert.ok(result.scale>0&&result.width>100);
});
test('Adapter à la largeur convient aux documents paysage, même en fenêtre réduite',()=>{
 const r=fitPDFPage({pageWidth:1200,pageHeight:480,hostWidth:450,hostHeight:700,fit:'width'});
 assert.ok(r.width<=450);
 const z=fitPDFPage({pageWidth:1200,pageHeight:480,hostWidth:450,hostHeight:700,fit:'width',zoom:2});
 assert.ok(z.width>r.width*1.9);
});
test('Page longue et Retina: jamais d’allocation canvas démesurée',()=>{
 for(const [w,h,dpr] of [[1100,19000,3],[19000,1200,2],[1000,1500,4]]){
  const ratio=safeCanvasRatio(w,h,dpr);
  assert.ok(w*ratio<=PDF_MAX_SIDE+1);
  assert.ok(h*ratio<=PDF_MAX_SIDE+1);
  assert.ok(w*h*ratio*ratio<=PDF_MAX_PIXELS+10);
 }
});
test('surlignages normalisés: borne de page, doublons supprimés',()=>{
 const page={left:100,top:40,right:700,bottom:940,width:600,height:900};
 const rects=rectsFromSelection([
  {left:130,top:90,right:260,bottom:112},
  {left:130,top:90,right:260,bottom:112},
  {left:80,top:100,right:160,bottom:127},
  {left:800,top:100,right:900,bottom:140}
 ],page);
 assert.equal(rects.length,2);
 assert.ok(rects.every(r=>r.x>=0&&r.y>=0&&r.w>0&&r.h>0&&r.x+r.w<=1.00001));
});
test('PDF scanné ne prétend pas contenir du texte sélectionnable',()=>{
 assert.equal(pdfTextStatus([{str:' '},{str:''}]),'image-only');
 assert.equal(pdfTextStatus([{str:'الكتاب'},{str:' arabe'}]),'selectable');
});
