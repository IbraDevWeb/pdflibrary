import test from 'node:test';
import assert from 'node:assert/strict';
import { readingPalette,clampTone,interpolateHex } from '../src/reading-appearance.js';

test('chaleur graduelle conserve un papier clair lisible',()=>{
  assert.equal(readingPalette('light',0,100).paper,'#ffffff');
  assert.equal(readingPalette('light',100,100).paper,'#f3dab7');
  assert.notEqual(readingPalette('light',50,100).paper,readingPalette('light',0,100).paper);
});
test('mode sépia et nuit ont des papiers distincts',()=>{
  assert.notEqual(readingPalette('sepia',70).paper,readingPalette('dark',70).paper);
  assert.equal(readingPalette('dark',0,100).paper,'#19231f');
});
test('luminosité et teinte sont encadrées',()=>{
  assert.equal(clampTone(-100),0);
  assert.equal(clampTone(250),100);
  assert.equal(clampTone(20,100,60,100),60);
  assert.ok(readingPalette('light',100,60).pdfDimmerOpacity>0);
  assert.equal(readingPalette('light',0,100).pdfTintOpacity,0);
});
test('couleurs calculées restent des codes hexadécimaux',()=>{
  assert.match(interpolateHex('#ffffff','#19231f',.5),/^#[0-9a-f]{6}$/);
});
