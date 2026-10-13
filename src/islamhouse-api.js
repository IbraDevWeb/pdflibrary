/** IslamHouse v3 : API publique officielle, recherche locale des titres récupérés.
 * La clé URL est publiée dans la documentation de l'éditeur.
 */
import { CapacitorHttp } from '@capacitor/core';
import { native } from './storage.js';
import { normalizeSearch } from './islamic-library.js';

export const IH_BASE='https://api3.islamhouse.com/v3/paV29H2gm56kvLP';
export const IH_PAGE_SIZE=50;
const validLang=lang=>lang==='ar'?'ar':'fr';
const maxPage=n=>Math.min(150,Math.max(1,Math.floor(Number(n)||1)));

export function islamhouseListUrl(language='fr',page=1){
 const lang=validLang(language);
 return IH_BASE+'/main/books/'+lang+'/'+lang+'/'+maxPage(page)+'/'+IH_PAGE_SIZE+'/json';
}
export function islamhouseDetailsUrl(id,language='fr'){
 const value=String(id);
 if(!/^\d{1,12}$/.test(value))throw new Error('Identifiant d’ouvrage invalide.');
 return IH_BASE+'/main/get-item/'+value+'/'+validLang(language)+'/json';
}
export function verifiedAPIUrl(url){
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||parsed.hostname!=='api3.islamhouse.com'||!parsed.pathname.startsWith('/v3/paV29H2gm56kvLP/'))
  throw new Error('Adresse API IslamHouse non autorisée.');
 return parsed.href;
}
export async function fetchIslamhouseJSON(url){
 const safe=verifiedAPIUrl(url);
 let data;
 if(native){
  const response=await CapacitorHttp.get({url:safe,responseType:'json',connectTimeout:12000,readTimeout:18000,headers:{Accept:'application/json'}});
  if(response.status<200||response.status>=300)throw new Error('Service indisponible (HTTP '+response.status+').');
  data=response.data;
 }else{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),18000);
  try{
   const response=await fetch(safe,{headers:{Accept:'application/json'},signal:controller.signal});
   if(!response.ok)throw new Error('Service indisponible (HTTP '+response.status+').');
   data=await response.json();
  }finally{clearTimeout(timeout);}
 }
 if(typeof data==='string')data=JSON.parse(data);
 if(!data||typeof data!=='object')throw new Error('Réponse du catalogue invalide.');
 return data;
}
const safeText=(value,length=400)=>String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,length);
export function islamhouseAuthor(item){
 const authors=Array.isArray(item?.prepared_by)?item.prepared_by:[];
 const match=authors.find(p=>p.type==='author'&&p.kind!=='publisher'&&p.kind!=='translator')
  ||authors.find(p=>p.kind==='author')
  ||authors.find(p=>p.type==='author'&&p.kind!=='publisher');
 return safeText(match?.title||'',160);
}
export function islamhouseBook(item,language='fr'){
 if(!item||!String(item.id||'').match(/^\d{1,12}$/)||!safeText(item.title))return null;
 return {
  id:String(item.id),
  title:safeText(item.title,240),
  author:islamhouseAuthor(item),
  description:safeText(item.description||item.shortdescription||item.full_description||'',400),
  language:validLang(language),
  count:Number(item.num_attachments)||0,
  image:typeof item.image==='string'&&item.image.startsWith('https://')?item.image:null,
  sourceUrl:'https://islamhouse.com/'+validLang(language)+'/books/',
  raw:item
 };
}
export function islamhouseList(json,language='fr'){
 const data=Array.isArray(json)?json:Array.isArray(json?.data)?json.data:Array.isArray(json?.result)?json.result:[];
 return data.map(v=>islamhouseBook(v,language)).filter(Boolean);
}
export function attachmentFormat(att){
 const ext=String(att?.extension_type||att?.format||'').toLowerCase().replace(/^\./,'');
 if(ext==='pdf'||ext==='epub')return ext;
 try{
  const p=new URL(String(att?.url||'')).pathname.toLowerCase();
  return /\.pdf$/.test(p)?'pdf':/\.epub$/.test(p)?'epub':null;
 }catch{return null;}
}
export function islamhouseAttachments(json,book){
 const item=Array.isArray(json?.data)?json.data[0]:json?.data&&typeof json.data==='object'?json.data:json;
 const files=Array.isArray(item?.attachments)?item.attachments:[];
 const seen=new Set();
 return files.flatMap((attachment,index)=>{
  const format=attachmentFormat(attachment);
  if(!format||!attachment.url)return [];
  let url;
  try{
   url=new URL(attachment.url);
   if(url.protocol!=='https:'||!url.hostname.includes('.')||url.hostname==='localhost'||url.username||url.password)return [];
  }catch{return [];}
  if(seen.has(url.href))return [];
  seen.add(url.href);
  return [{url:url.href,format,title:book.title,author:book.author,source:'IslamHouse',sourceGroup:'islam',
   description:safeText(attachment.title||attachment.description||'',130),
   fileLabel:format.toUpperCase()+' · '+safeText(attachment.size||'',30),
   originalId:String(book.id),index}];
 });
}
export function matchesIslamhouse(book,query){
 const tokens=normalizeSearch(query).split(/\s+/).filter(Boolean);
 if(!tokens.length)return true;
 const haystack=normalizeSearch([book.title,book.author,book.description].join(' '));
 return tokens.every(token=>haystack.includes(token));
}
export async function islamhouseSearchPages({
 language='fr',query='',startPage=1,pages=8,onProgress=()=>{},cancelled=()=>false,fetcher=fetchIslamhouseJSON
}={}){
 let page=maxPage(startPage),scanned=0,exhausted=false;
 const items=[],seen=new Set(),batch=Math.max(1,Math.min(20,Math.floor(pages)||8));
 for(let step=0;step<batch;step++,page++){
  if(cancelled())return {items,scanned,nextPage:page,exhausted:false,cancelled:true};
  const list=islamhouseList(await fetcher(islamhouseListUrl(language,page)),language);
  scanned+=list.length;
  for(const book of list){
   if(seen.has(book.id))continue;
   seen.add(book.id);
   if(matchesIslamhouse(book,query))items.push(book);
  }
  onProgress({page,scanned,found:items.length});
  if(list.length<IH_PAGE_SIZE){exhausted=true;page++;break;}
 }
 return {items,scanned,nextPage:Math.min(150,page),exhausted};
}
