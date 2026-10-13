import test from 'node:test';
import assert from 'node:assert/strict';
import {installPdfCompatibility} from '../src/pdf-compat.js';
test('polyfill PDF.js disponible sur Map et WeakMap',()=>{
 for(const T of [Map,WeakMap]){
  const dict=new T(),key=T===Map?'test':{};
  assert.equal(typeof dict.getOrInsertComputed,'function');
  assert.equal(typeof dict.getOrInsert,'function');
  let calls=0;
  assert.equal(dict.getOrInsertComputed(key,()=>{calls++;return 11;}),11);
  assert.equal(dict.getOrInsertComputed(key,()=>{calls++;return 99;}),11);
  assert.equal(calls,1);
  assert.equal(dict.getOrInsert(key,44),11);
  assert.equal(Object.keys(T.prototype).includes('getOrInsertComputed'),false);
 }
});
test('valeurs undefined conservées : ne pas relancer le calcul',()=>{
 const map=new Map([['k',undefined]]);
 assert.equal(map.getOrInsertComputed('k',()=>{throw Error('not called');}),undefined);
 assert.equal(map.getOrInsert('k',90),undefined);
});
test('idempotence et callback recevant bien sa clé',()=>{
 const before=Map.prototype.getOrInsertComputed;
 installPdfCompatibility();
 assert.equal(Map.prototype.getOrInsertComputed,before);
 const m=new Map();
 assert.equal(m.getOrInsertComputed('key',key=>key.length),3);
 assert.throws(()=>m.getOrInsertComputed('other',null),TypeError);
});
