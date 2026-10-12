import {swipeDirection,pinchRatio,touchDistance} from './gesture-math.js';

/**
 * Gestes non intrusifs : balayage horizontal uniquement s'il est rapide,
 * ni sur la zone réservée à Android Back ni pendant une sélection de texte.
 * Les gestes EPUB sont attachés au document de son iframe.
 */
export function attachReadingGestures(target,callbacks={}){
  let start=null,pinch=null,lastTap=0,tapTimer=null,unmounted=false;
  const inControl=node=>node instanceof Element && !!node.closest('button,a,input,textarea,select,[contenteditable="true"]');
  const selectionExists=()=>{
    const doc=target.ownerDocument;
    const sel=doc.getSelection?.() || doc.defaultView?.getSelection?.();
    return !!sel && !sel.isCollapsed && !!sel.toString().trim();
  };
  const reset=()=>{
    if(pinch?.previewed)callbacks.onPinchPreview?.(1);
    start=null;pinch=null;
  };
  const onStart=e=>{
    if(unmounted||callbacks.disabled?.()||inControl(e.target)) {reset();return;}
    if(e.touches.length===2){
      const distance=touchDistance(e.touches[0],e.touches[1]);
      pinch={distance,ratio:1,previewed:false};
      start=null;return;
    }
    if(e.touches.length!==1){reset();return;}
    start={x:e.touches[0].clientX,y:e.touches[0].clientY,time:Date.now(),moved:false};
  };
  const onMove=e=>{
    if(!pinch&&e.touches.length>=2){
      pinch={distance:touchDistance(e.touches[0],e.touches[1]),ratio:1,previewed:false};
      start=null;
    }
    if(pinch&&e.touches.length>=2){
      pinch.ratio=pinchRatio(pinch.distance,touchDistance(e.touches[0],e.touches[1]));
      pinch.previewed=true;
      callbacks.onPinchPreview?.(pinch.ratio);
      if(e.cancelable)e.preventDefault();
      return;
    }
    if(start&&e.touches.length===1){
      const dx=e.touches[0].clientX-start.x;
      const dy=e.touches[0].clientY-start.y;
      if(Math.abs(dx)>12||Math.abs(dy)>12)start.moved=true;
    }
  };
  const onEnd=e=>{
    if(unmounted)return;
    if(pinch){
      if(e.touches.length===0){
        const ratio=pinch.ratio;
        callbacks.onPinchPreview?.(1);
        pinch=null;start=null;
        if(Math.abs(ratio-1)>.07)callbacks.onPinch?.(ratio);
      }
      return;
    }
    if(!start||e.touches.length>0)return;
    if(callbacks.disabled?.()||selectionExists()){start=null;return;}
    const t=e.changedTouches[0];
    if(!t){start=null;return;}
    const targetWindow=target.ownerDocument.defaultView||window;
    const dir=swipeDirection(start,{x:t.clientX,y:t.clientY},Date.now()-start.time,targetWindow.innerWidth);
    const wasMoved=start.moved;
    start=null;
    if(dir){
      if(e.cancelable)e.preventDefault();
      callbacks.onSwipe?.(dir);
      return;
    }
    if(!wasMoved){
      const now=Date.now();
      if(now-lastTap<290){
        lastTap=0;
        clearTimeout(tapTimer);
        tapTimer=null;
        callbacks.onDoubleTap?.();
      }else{
        lastTap=now;
        clearTimeout(tapTimer);
        tapTimer=setTimeout(()=>{
          if(!unmounted)callbacks.onTap?.();
          tapTimer=null;
        },310);
      }
    }
  };
  const onCancel=()=>reset();
  target.addEventListener('touchstart',onStart,{passive:true});
  target.addEventListener('touchmove',onMove,{passive:false});
  target.addEventListener('touchend',onEnd,{passive:false});
  target.addEventListener('touchcancel',onCancel,{passive:true});
  return ()=>{
    unmounted=true;clearTimeout(tapTimer);reset();
    target.removeEventListener('touchstart',onStart);
    target.removeEventListener('touchmove',onMove);
    target.removeEventListener('touchend',onEnd);
    target.removeEventListener('touchcancel',onCancel);
  };
}
