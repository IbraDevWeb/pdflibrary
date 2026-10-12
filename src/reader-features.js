/** Index de lecture sans requête réseau : le contenu reste sur l'appareil. */
export const HIGHLIGHT_COLORS=Object.freeze({
 yellow:'rgba(242,204,59,.38)',
 green:'rgba(111,191,130,.40)',
 blue:'rgba(118,166,232,.42)',
 pink:'rgba(231,163,192,.44)'
});
export const FONT_OPTIONS=Object.freeze({
 publisher:'inherit',
 serif:'Georgia, "Times New Roman", serif',
 sans:'Arial, Helvetica, sans-serif',
 readable:'Verdana, Geneva, sans-serif'
});
export function safeHighlightColor(value){return Object.hasOwn(HIGHLIGHT_COLORS,value)?value:'yellow';}
export function normalizeTypography(book){
 return {
  fontFamily:Object.hasOwn(FONT_OPTIONS,book?.fontFamily)?book.fontFamily:'publisher',
  lineHeight:Math.max(1.2,Math.min(2.2,Math.round((Number(book?.lineHeight)||1.6)*10)/10))
 };
}
export function searchText(text,query,max=8){
 const words=String(text||'');
 const q=String(query||'').trim();
 if(q.length<2||!words)return [];
 const low=words.toLocaleLowerCase(),needle=q.toLocaleLowerCase(),hits=[];
 let pos=-1;
 while(hits.length<max&&(pos=low.indexOf(needle,pos+1))!==-1){
  const from=Math.max(0,pos-62),to=Math.min(words.length,pos+needle.length+100);
  hits.push({index:pos,snippet:(from?'…':'')+words.slice(from,to).replace(/\s+/g,' ').trim()+(to<words.length?'…':'')});
 }
 return hits;
}
export async function searchPDFPages(pdf,query,{cancelled=()=>false,onProgress=()=>{},limit=100}={}){
 const matches=[],total=pdf.numPages;
 for(let n=1;n<=total;n++){
  if(cancelled())return {matches,cancelled:true,scanned:n-1,total};
  const page=await pdf.getPage(n);
  const content=await page.getTextContent();
  const text=content.items.map(item=>item.str||'').join(' ');
  for(const hit of searchText(text,query,Math.max(0,limit-matches.length))){
   matches.push({kind:'pdf',position:n,title:'Page '+n,snippet:hit.snippet,matchIndex:hit.index});
  }
  if(n===1||n%12===0||n===total)onProgress(n,total,matches.length);
  page.cleanup?.();
  if(matches.length>=limit)return {matches,truncated:true,scanned:n,total};
  if(n%12===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 return {matches,scanned:total,total};
}
export async function searchEPUBSections(book,query,{cancelled=()=>false,onProgress=()=>{},limit=100}={}){
 const matches=[];
 const sections=book.spine?.spineItems||[];
 const loader=book.load.bind(book);
 for(let n=0;n<sections.length;n++){
  if(cancelled())return {matches,cancelled:true,scanned:n,total:sections.length};
  const section=sections[n];
  try{
   await section.load(loader);
   const hits=section.find(query);
   for(const match of hits.slice(0,limit-matches.length)){
    matches.push({kind:'epub',position:match.cfi,title:'Chapitre '+(n+1),snippet:match.excerpt||query});
   }
  }catch(error){console.warn('Chapitre EPUB non analysable',n,error);}
  finally{section.unload?.();}
  if(n===0||n%4===0||n===sections.length-1)onProgress(n+1,sections.length,matches.length);
  if(matches.length>=limit)return {matches,truncated:true,scanned:n+1,total:sections.length};
  if(n%4===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 return {matches,scanned:sections.length,total:sections.length};
}
