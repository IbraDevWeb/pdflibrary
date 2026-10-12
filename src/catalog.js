import { CapacitorHttp } from '@capacitor/core';
import { native } from './storage.js';
import './catalog.css';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const HOME = 'https://beq.ebooksgratuits.com/';
const BLOCKED = /^(?:127|10|0|169\.254|192\.168)\.|^172\.(?:1[6-9]|2\d|3[01])\./;
let current=HOME,history=[],page=null,bookLimit=70,pageLimit=35,requestId=0,importBook;
export function validateExternalUrl(input) {
  const url=new URL(input),host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||!host.includes('.')||host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||BLOCKED.test(host)||host==='[::1]')
    throw new Error('Adresse HTTPS publique nécessaire.');
  return url.href;
}
const formatOf=url=>{try{const p=new URL(url).pathname.toLowerCase();return p.endsWith('.pdf')?'pdf':p.endsWith('.epub')?'epub':null;}catch{return null;}};
const clean=s=>String(s||'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').replace(/^[\s•–—:|]+|[\s•–—:|]+$/g,'').trim().slice(0,170);
function titleFor(anchor,url){
  const fallback=clean(decodeURIComponent(new URL(url).pathname.split('/').pop()||'Livre').replace(/\.(pdf|epub)$/i,'').replace(/[_-]+/g,' '));
  const own=clean(anchor.textContent||anchor.getAttribute('title'));
  if(own.length>5&&!/^(?:télécharger|download|fichier|format|pdf|epub)$/i.test(own))return own;
  for(let node=anchor.nextSibling,n=0;node&&n<4;node=node.nextSibling,n++){const t=clean(node.textContent);if(t.length>5&&t.length<160)return t.replace(/♥/g,'').trim();}
  for(const element of [anchor.closest('tr'),anchor.closest('li'),anchor.closest('p'),anchor.parentElement]){
    const value=clean(element?.textContent);
    if(value.length>5&&value.length<170&&value!==own)return value;
  }
  return fallback||'Livre numérique';
}
function parseCatalog(html,url){
  const doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form').forEach(el=>el.remove());
  const title=clean(doc.title||doc.querySelector('h1,h2')?.textContent)||new URL(url).hostname;
  const files=[],links=[],seen=new Set();
  for(const a of Array.from(doc.querySelectorAll('a[href]')).slice(0,10000)){
    const raw=a.getAttribute('href');
    if(!raw||/^(?:#|javascript:|data:|mailto:|tel:)/i.test(raw))continue;
    let href;
    try{href=validateExternalUrl(new URL(raw,url).href);}catch{continue;}
    if(seen.has(href)||href===url)continue;
    const type=formatOf(href);
    if(type){files.push({url:href,format:type,title:titleFor(a,href)});seen.add(href);continue;}
    if(/\.(?:png|jpe?g|svg|gif|css|js|zip|mobi|docx?|mp3|mp4|woff|ico)$/i.test(new URL(href).pathname))continue;
    const label=clean(a.textContent||a.querySelector('img')?.alt||a.getAttribute('title'));
    if(label.length<2||label.length>150)continue;
    links.push({url:href,title:label});seen.add(href);
  }
  return {title,files,links};
}
async function fetchCatalog(url){
  if(native){
    const response=await CapacitorHttp.get({url,responseType:'text',connectTimeout:15000,readTimeout:20000,headers:{Accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.2'}});
    if(response.status<200||response.status>=300)throw new Error('HTTP '+response.status);
    if(typeof response.data!=='string'||response.data.length>4000000)throw new Error('Format HTML non pris en charge.');
    return response.data;
  }
  const response=await fetch(url,{mode:'cors'});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const text=await response.text();
  if(text.length>4000000)throw new Error('Page trop volumineuse.');
  return text;
}
function feedback(message,error=false){
  const el=$('catalogFeedback');el.textContent=message;el.hidden=!message;el.classList.toggle('catalog-error',error);
}
const filtered=()=>{const q=$('catalogSearch').value.trim().toLocaleLowerCase();return {files:page.files.filter(x=>x.title.toLocaleLowerCase().includes(q)||x.url.toLowerCase().includes(q)),links:page.links.filter(x=>x.title.toLocaleLowerCase().includes(q))};};
function render(){
  if(!page)return;
  const {files,links}=filtered();
  $('catalogPageTitle').textContent=page.title;
  $('catalogCount').textContent=page.files.length+' fichiers PDF/EPUB · '+page.links.length+' autres liens';
  $('catalogFilesCount').textContent=files.length;
  $('catalogPagesCount').textContent=links.length;
  $('catalogBooks').innerHTML=files.length?files.slice(0,bookLimit).map((b,i)=>
    '<article class="catalog-book"><span class="catalog-cover">'+b.format.toUpperCase()+'</span><span class="catalog-book-info"><strong>'+esc(b.title)+'</strong><small>'+b.format.toUpperCase()+' · '+esc(new URL(b.url).hostname)+'</small></span><button class="catalog-download-button" data-catalog-file="'+i+'" title="Ajouter directement dans Folio">Ajouter ↓</button></article>'
  ).join(''):'<p class="catalog-nothing">Aucun fichier PDF ou EPUB repéré ici. Explorez les collections.</p>';
  $('catalogPages').innerHTML=links.length?links.slice(0,pageLimit).map((l,i)=>
    '<button class="catalog-page-link" data-catalog-page="'+i+'"><span>'+esc(l.title)+'</span><small>›</small></button>'
  ).join(''):'<p class="catalog-nothing">Aucune autre rubrique trouvée.</p>';
  $('catalogMore').hidden=files.length<=bookLimit;
  $('catalogMorePages').hidden=links.length<=pageLimit;
}
async function download(item){
  if(!importBook)return;
  feedback('Téléchargement de « '+item.title+' »…');
  document.querySelectorAll('[data-catalog-file]').forEach(b=>b.disabled=true);
  try{
    await importBook(item,p=>feedback('Téléchargement de « '+item.title+' »'+(p===null?'…':' : '+p+' %')));
    feedback('« '+item.title+' » est dans votre bibliothèque. Lecture hors ligne disponible.');
  }catch(e){feedback('Téléchargement impossible : '+e.message,true);}
  finally{document.querySelectorAll('[data-catalog-file]').forEach(b=>b.disabled=false);}
}
async function navigate(input,back=false){
  let url;
  try{url=validateExternalUrl(input);}catch(e){feedback(e.message,true);return;}
  if(formatOf(url)){await download({url,format:formatOf(url),title:clean(decodeURIComponent(new URL(url).pathname.split('/').pop()).replace(/\.(pdf|epub)$/i,''))});return;}
  const id=++requestId;
  $('catalogLoaded').hidden=true;feedback('Chargement du catalogue…');
  try{
    const html=await fetchCatalog(url);
    if(id!==requestId)return;
    const parsed=parseCatalog(html,url);
    if(!back&&url!==current)history.push(current);
    current=url;page=parsed;bookLimit=70;pageLimit=35;
    $('catalogUrlInput').value=url;$('catalogLocation').textContent=new URL(url).hostname+' · '+new URL(url).pathname;
    $('catalogBack').disabled=!history.length;
    $('catalogSearch').value='';$('catalogLoaded').hidden=false;
    feedback(parsed.files.length||parsed.links.length?'':'Aucun lien PDF/EPUB ni rubrique détecté ici.');
    render();
  }catch(e){if(id===requestId)feedback('Impossible de charger cette page'+(native?'': ' (restriction CORS possible dans la PWA)')+' : '+e.message,true);}
}
function open(){
  $('catalog').hidden=false;document.body.style.overflow='hidden';
  if(!page)navigate(HOME);else render();
}
function close(){requestId++;$('catalog').hidden=true;document.body.style.overflow='';}
export function setupCatalog({onImport}){
  importBook=onImport;
  $('catalogOpen').addEventListener('click',open);
  $('catalogSide').addEventListener('click',open);
  $('catalogClose').addEventListener('click',close);
  $('catalogUrlForm').addEventListener('submit',e=>{e.preventDefault();navigate($('catalogUrlInput').value);});
  $('catalogSearch').addEventListener('input',()=>{bookLimit=70;pageLimit=35;render();});
  $('catalogMore').addEventListener('click',()=>{bookLimit+=70;render();});
  $('catalogMorePages').addEventListener('click',()=>{pageLimit+=35;render();});
  $('catalogBack').addEventListener('click',()=>{if(history.length)navigate(history.pop(),true);});
  $('catalog').addEventListener('click',e=>{
    const quick=e.target.closest('[data-catalog-url]');
    if(quick){history=[];navigate(quick.dataset.catalogUrl);return;}
    const book=e.target.closest('[data-catalog-file]');
    if(book&&page){const item=filtered().files[Number(book.dataset.catalogFile)];if(item)download(item);return;}
    const link=e.target.closest('[data-catalog-page]');
    if(link&&page){const item=filtered().links[Number(link.dataset.catalogPage)];if(item)navigate(item.url);}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('catalog').hidden&&!document.querySelector('dialog[open]'))close();});
}
