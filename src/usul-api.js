/** Usul.ai — découverte de notices publiques, sans import automatique des textes.
 * L'API externe et ses droits d'utilisation restent contrôlés par Usul.
 * Aucun token, cookie, contenu intégral ou PDF n'est stocké par Folio.
 */
import {CapacitorHttp} from '@capacitor/core';
import {native} from './storage.js';

export const USUL_SEARCH_BASE='https://api.usul.ai/search/books';
const MAX_QUERY=140;
export function usulSearchUrl(query,{page=1,limit=15,locale='en'}={}){
 const q=String(query||'').trim().slice(0,MAX_QUERY);
 if(q.length<2)throw new Error('Entrez au moins deux caractères pour rechercher un ouvrage.');
 const url=new URL(USUL_SEARCH_BASE);
 url.searchParams.set('q',q);
 url.searchParams.set('page',String(Math.min(100,Math.max(1,Math.floor(Number(page)||1)))));
 url.searchParams.set('limit',String(Math.min(20,Math.max(1,Math.floor(Number(limit)||15)))));
 url.searchParams.set('locale',['fr','ar','en'].includes(locale)?locale:'en');
 return url.href;
}
const str=(v,max=250)=>String(v??'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const slug=value=>{
 const v=String(value||'').trim();
 return v&&!v.includes('/')&&!v.includes('\\')&&!v.includes('..')&&v.length<200?v:null;
};
export function usulBookLink(book){
 const s=slug(book?.slug);
 return s?'https://usul.ai/t/'+encodeURIComponent(s):'https://usul.ai/texts';
}
export function usulAuthorLink(book){
 const s=slug(book?.authorSlug);
 return s?'https://usul.ai/author/'+encodeURIComponent(s):'https://usul.ai/texts';
}
export function normalizeUsulBook(hit){
 if(!hit||hit.type!=='book')return null;
 const name=str(hit.primaryName,260)||str(hit.secondaryName,260);
 if(!name)return null;
 const versions=Array.isArray(hit.versions)?hit.versions:[];
 const published=versions.find(v=>v?.publicationDetails&&Object.keys(v.publicationDetails).length)||{};
 const edition=published.publicationDetails||{};
 return {
  id:str(hit.id||hit.slug,210),title:name,
  arabicTitle:str(hit.secondaryName,260),
  author:str(hit.author?.primaryName,170),
  arabicAuthor:str(hit.author?.secondaryName,170),
  slug:slug(hit.slug),authorSlug:slug(hit.author?.slug),
  genreIds:Array.isArray(hit.advancedGenreIds)?hit.advancedGenreIds.filter(x=>typeof x==='string').slice(0,7):[],
  publisher:str(edition.publisher,130),publicationYear:str(edition.publicationYear,45),
  edition:str(edition.editionNumber,80),
  versionCount:versions.length,
  source:'Usul.ai'
 };
}
export function parseUsulSearch(data){
 const payload=data?.results;
 const hits=Array.isArray(payload?.hits)?payload.hits:[];
 const books=hits.map(normalizeUsulBook).filter(Boolean);
 const pagination=data?.pagination||{};
 return {
  books,
  total:Number(pagination.totalRecords??payload?.found??books.length)||0,
  currentPage:Math.max(1,Number(pagination.currentPage??payload?.page)||1),
  totalPages:Math.max(1,Number(pagination.totalPages)||1),
  hasNext:Boolean(pagination.hasNext),
 };
}
export async function searchUsul(query,options={}){
 const url=usulSearchUrl(query,options),host=new URL(url);
 if(host.hostname!=='api.usul.ai'||host.protocol!=='https:')throw new Error('Hôte Usul invalide.');
 let data;
 if(native){
  const response=await CapacitorHttp.get({url,responseType:'json',connectTimeout:12000,readTimeout:18000,headers:{Accept:'application/json'}});
  if(response.status===401||response.status===403||response.status===429)throw new Error('Accès au service restreint par Usul. Consultez les livres sur son site officiel.');
  if(response.status<200||response.status>=300)throw new Error('Service Usul indisponible (HTTP '+response.status+').');
  data=response.data;
 }else{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),18000);
  try{
   const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
   if(response.status===401||response.status===403||response.status===429)throw new Error('Accès API Usul restreint. Utilisez le site officiel.');
   if(!response.ok)throw new Error('Service Usul indisponible (HTTP '+response.status+').');
   data=await response.json();
  }catch(e){
   if(e instanceof TypeError)throw new Error('Usul limite l’accès à son API depuis les navigateurs externes. Ouvrez Usul.ai ; la recherche intégrée fonctionne uniquement lorsque le service l’autorise.');
   throw e;
  }finally{clearTimeout(timeout);}
 }
 if(typeof data==='string')data=JSON.parse(data);
 if(!data?.results||!Array.isArray(data.results.hits))throw new Error('Structure de la réponse Usul non reconnue.');
 return parseUsulSearch(data);
}
