'use strict';
const path=require('node:path');
const MIME=Object.freeze({
 '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
 '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
 '.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2',
 '.ttf':'font/ttf','.wasm':'application/wasm','.pdf':'application/pdf','.txt':'text/plain; charset=utf-8'
});
function assetPath(distRoot,requestURL){
 try{
  const url=new URL(requestURL);
  if(url.protocol!=='folio:'||url.hostname!=='app'||url.username||url.password||url.port)return null;
  // Vérifier le chemin tel qu'il a été demandé, AVANT la normalisation des segments .. par URL.
  const input=String(requestURL);
  const firstSlash=input.indexOf('/',input.indexOf('://')+3);
  const original=firstSlash>=0?input.slice(firstSlash).split(/[?#]/,1)[0]:'/';
  const decodedOriginal=decodeURIComponent(original);
  if(decodedOriginal.split('/').some(p=>p==='.'||p==='..'||p.startsWith('.')))return null;
  const raw=decodeURIComponent(url.pathname);
  if(/\\/.test(raw)||raw.includes('\0'))return null;
  const local=raw==='/'?'/index.html':raw;
  if(local.split('/').some(p=>p==='..'||p==='.'||p.startsWith('.')))return null;
  const output=path.resolve(distRoot,'.'+local);
  const relative=path.relative(path.resolve(distRoot),output);
  if(relative.startsWith('..')||path.isAbsolute(relative))return null;
  return output;
 }catch{return null;}
}
function mimeFor(filepath){return MIME[path.extname(filepath).toLowerCase()]||'application/octet-stream';}
function isExternalHTTP(url){
 try{
  const u=new URL(url);
  return ['https:','http:'].includes(u.protocol)&&!!u.hostname&&
   !u.username&&!u.password&&u.hostname!=='localhost'&&u.hostname!=='127.0.0.1'&&u.hostname!=='[::1]';
 }catch{return false;}
}
module.exports={assetPath,mimeFor,isExternalHTTP};
