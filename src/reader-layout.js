/** Géométrie de lecture : un seul modèle pour PDF, zoom, recentrage et rectangles. */
export const PDF_MAX_PIXELS=16_000_000;
export const PDF_MAX_SIDE=8192;
export const PDF_MARGIN=24;
export function fitPDFPage({pageWidth,pageHeight,hostWidth,hostHeight,zoom=1,fit='width'}={}){
 const w=Number(pageWidth),h=Number(pageHeight);
 if(!(w>0&&h>0))throw new Error('Dimensions de page PDF invalides');
 const hw=Math.max(140,Number(hostWidth)||600),hh=Math.max(140,Number(hostHeight)||750);
 const margin=hw<500?16:PDF_MARGIN;
 const width=Math.max(100,hw-margin*2);
 const height=Math.max(100,hh-margin*2);
 const widthFit=width/w;
 const base=fit==='page'?Math.min(widthFit,height/h):widthFit;
 // Ne jamais créer une page CSS gigantesque pour un PDF aux dimensions atypiques.
 const scale=Math.min(base*Math.max(.5,Math.min(4,Number(zoom)||1)),16000/Math.max(w,h));
 return {scale,width:w*scale,height:h*scale,fitWidth:width,fitHeight:height};
}
export function safeCanvasRatio(width,height,deviceRatio=1){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
 const max=Math.min(2,Math.max(1,Number(deviceRatio)||1));
 return Math.max(.1,Math.min(max,Math.sqrt(PDF_MAX_PIXELS/(w*h)),PDF_MAX_SIDE/w,PDF_MAX_SIDE/h));
}
export function rectsFromSelection(rects,pageBounds){
 if(!pageBounds||!(pageBounds.width>0&&pageBounds.height>0))return [];
 const output=[];
 for(const rect of rects||[]){
  const left=Math.max(pageBounds.left,rect.left);
  const top=Math.max(pageBounds.top,rect.top);
  const right=Math.min(pageBounds.right,rect.right);
  const bottom=Math.min(pageBounds.bottom,rect.bottom);
  if(right-left<1||bottom-top<1)continue;
  const x=(left-pageBounds.left)/pageBounds.width;
  const y=(top-pageBounds.top)/pageBounds.height;
  const w=(right-left)/pageBounds.width;
  const h=(bottom-top)/pageBounds.height;
  if(!Number.isFinite(x+y+w+h)||w<=0||h<=0)continue;
  const duplicate=output.some(p=>Math.abs(p.x-x)<.001&&Math.abs(p.y-y)<.001&&Math.abs(p.w-w)<.001&&Math.abs(p.h-h)<.001);
  if(!duplicate)output.push({x,y,w,h});
 }
 return output;
}
export function pdfTextStatus(items=[]){
 const text=(items||[]).filter(x=>typeof x.str==='string').map(x=>x.str).join('').trim();
 return text.length?'selectable':'image-only';
}
