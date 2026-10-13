export const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export function swipeDirection(start,end,duration,width){
  if(!start||!end||duration>800||duration<30)return null;
  const dx=end.x-start.x,dy=end.y-start.y;
  if(start.x<28||start.x>width-28)return null; // laisser Android gérer son geste retour latéral
  if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.35)return null;
  return dx<0?'next':'previous';
}
export function pinchRatio(initialDistance,currentDistance){
  return initialDistance>12&&currentDistance>0?clamp(currentDistance/initialDistance,.65,1.85):1;
}
export function touchDistance(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);}
export function nextZoom(zoom,factor){return Math.round(clamp((Number(zoom)||1)*factor,.65,3)*100)/100;}

/** En zoom PDF, un balayage explore le document jusqu'au bord.
 * Pour changer de page, le geste doit COMMENCER au bord dans la direction voulue.
 * Le sens 'next' physique = balayage vers la gauche, donc bord droit du document.
 */
export function zoomedSwipeAction({zoom=1,scrollWidth=0,clientWidth=0,scrollLeft=0,direction}={}){
 if(zoom<=1.08||scrollWidth<=clientWidth+6)return 'turn';
 const limit=Math.max(0,scrollWidth-clientWidth);
 const x=clamp(Number(scrollLeft)||0,0,limit);
 if(direction==='next')return x>=limit-7?'turn':'pan';
 if(direction==='previous')return x<=7?'turn':'pan';
 return 'pan';
}
