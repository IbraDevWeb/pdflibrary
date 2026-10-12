import { App } from '@capacitor/app';
import { native } from './storage.js';
import { Reader } from './reader.js';
import { backInCatalog } from './catalog.js';

let backBusy=false;

export function installNavigation({getView,changeView}){
  const back=async()=>{
    if(backBusy)return;
    backBusy=true;
    try{
      const dialog=Array.from(document.querySelectorAll('dialog[open]')).at(-1);
      if(dialog){dialog.close();return;}
      if(backInCatalog())return;
      if(Reader.back())return;
      if(getView()!=='all'){
        changeView('all');return;
      }
      if(native)await App.minimizeApp();
    }finally{backBusy=false;}
  };
  if(native){
    // Android : boutons Retour à 3 touches et retour par balayage système.
    App.addListener('backButton',()=>{back().catch(console.error);})
      .catch(error=>console.warn('Retour Android indisponible',error));
    App.addListener('pause',()=>{Reader.persistNow().catch(console.error);})
      .catch(console.error);
  }else{
    // Alternative PWA : geste depuis l'extrême bord gauche.
    let start=null;
    document.addEventListener('touchstart',event=>{
      if(event.touches.length!==1){start=null;return;}
      const t=event.touches[0];
      start=t.clientX<23?{x:t.clientX,y:t.clientY,time:Date.now()}:null;
    },{passive:true});
    document.addEventListener('touchend',event=>{
      if(!start||event.changedTouches.length!==1)return;
      const t=event.changedTouches[0];
      const dx=t.clientX-start.x,dy=t.clientY-start.y;
      if(dx>95&&Math.abs(dx)>Math.abs(dy)*1.5&&Date.now()-start.time<850)
        back().catch(console.error);
      start=null;
    },{passive:true});
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)Reader.persistNow().catch(console.error);
  });
  return back;
}
