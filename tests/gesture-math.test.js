import test from 'node:test';
import assert from 'node:assert/strict';
import {swipeDirection,pinchRatio,nextZoom,zoomedSwipeAction} from '../src/gesture-math.js';
test('balayer à gauche fait avancer',()=>assert.equal(swipeDirection({x:300,y:200},{x:190,y:216},290,390),'next'));
test('balayer à droite fait reculer',()=>assert.equal(swipeDirection({x:70,y:200},{x:205,y:190},240,390),'previous'));
test('défilement vertical ne tourne pas la page',()=>assert.equal(swipeDirection({x:90,y:100},{x:145,y:250},200,390),null));
test('micro-déplacement ignoré',()=>assert.equal(swipeDirection({x:110,y:50},{x:133,y:54},200,390),null));
test('bord réservé au geste retour Android',()=>assert.equal(swipeDirection({x:11,y:50},{x:150,y:55},200,390),null));
test('glissement lent ignoré',()=>assert.equal(swipeDirection({x:70,y:50},{x:180,y:52},1500,390),null));
test('zoom pince borné',()=>{assert.equal(pinchRatio(100,200),1.85);assert.equal(pinchRatio(100,50),.65);assert.equal(pinchRatio(0,100),1);});
test('zoom utilisateur borné',()=>{assert.equal(nextZoom(2.9,1.5),3);assert.equal(nextZoom(.7,.5),.65);assert.equal(nextZoom(1.3,1.25),1.63);});

test('PDF agrandi : glisser dans la page avant d’atteindre le bord ne la tourne pas',()=>{
 assert.equal(zoomedSwipeAction({zoom:2,scrollWidth:1300,clientWidth:400,scrollLeft:300,direction:'next'}),'pan');
 assert.equal(zoomedSwipeAction({zoom:2,scrollWidth:1300,clientWidth:400,scrollLeft:300,direction:'previous'}),'pan');
});
test('PDF agrandi : au bord, un nouveau swipe tourne la page',()=>{
 assert.equal(zoomedSwipeAction({zoom:2,scrollWidth:1300,clientWidth:400,scrollLeft:900,direction:'next'}),'turn');
 assert.equal(zoomedSwipeAction({zoom:2,scrollWidth:1300,clientWidth:400,scrollLeft:0,direction:'previous'}),'turn');
 assert.equal(zoomedSwipeAction({zoom:2,scrollWidth:1300,clientWidth:400,scrollLeft:895,direction:'next'}),'turn');
});
test('PDF non agrandi ou sans débordement : gestes normaux conservés',()=>{
 assert.equal(zoomedSwipeAction({zoom:1,scrollWidth:1300,clientWidth:400,scrollLeft:300,direction:'next'}),'turn');
 assert.equal(zoomedSwipeAction({zoom:1.6,scrollWidth:400,clientWidth:400,scrollLeft:0,direction:'next'}),'turn');
});
