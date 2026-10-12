import { CapacitorHttp } from '@capacitor/core';
import { native } from './storage.js';

const requireHTTPS = (value, base) => {
  const url = new URL(value,base);
  if(url.protocol!=='https:' || url.username || url.password) throw new Error('Une adresse HTTPS est requise.');
  return url.href;
};
async function loadRemote(url, accept) {
  if(native) {
    const response=await CapacitorHttp.get({
      url, responseType:'text',connectTimeout:14000,readTimeout:22000,headers:{Accept:accept}
    });
    if(response.status<200||response.status>=300)throw new Error('Le catalogue répond HTTP '+response.status);
    return typeof response.data==='string'?response.data:JSON.stringify(response.data);
  }
  const response=await fetch(url,{mode:'cors',headers:{Accept:accept}});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const size=Number(response.headers.get('content-length')||0);
  if(size>3500000)throw new Error('Réponse trop grande.');
  const text=await response.text();
  if(text.length>3500000)throw new Error('Réponse trop grande.');
  return text;
}
const titleOr = (value,fallback='Sans titre') => String(value||fallback).trim().slice(0,200);

export async function loadGutenberg(url) {
  const input=new URL(requireHTTPS(url));
  if(input.hostname!=='gutendex.com' || !input.pathname.startsWith('/books'))
    throw new Error('Adresse Gutenberg incorrecte.');
  const json=JSON.parse(await loadRemote(input.href,'application/json'));
  if(!Array.isArray(json.results))throw new Error('Format Gutenberg inconnu.');
  const files=[];
  for(const book of json.results){
    const formats=book.formats||{};
    const epub=Object.entries(formats).find(([mime,href])=>mime.startsWith('application/epub+zip')&&typeof href==='string');
    const pdf=Object.entries(formats).find(([mime,href])=>mime.startsWith('application/pdf')&&typeof href==='string');
    const choice=epub||pdf;
    if(!choice)continue;
    let href;
    try{href=requireHTTPS(choice[1]);}catch{continue;}
    files.push({title:titleOr(book.title),url:href,format:choice===epub?'epub':'pdf',author:titleOr(book.authors?.map(a=>a.name).join(', ')||'', ''),source:'Project Gutenberg',sourceGroup:'general'});
  }
  const links=[];
  if(json.next){
    try{const href=requireHTTPS(json.next);if(new URL(href).hostname==='gutendex.com')links.push({url:href,title:'Page suivante →'});}catch{}
  }
  return {title:'Project Gutenberg · '+(input.searchParams.get('search')?'Résultats pour « '+input.searchParams.get('search')+' »':'Livres populaires'),files,links,sourceType:'gutendex',total:Number(json.count)||files.length};
}

const directChildren=(node,name)=>Array.from(node?.children||[]).filter(e=>e.localName===name);
const firstText=(node,name)=>directChildren(node,name)[0]?.textContent?.trim()||'';

export async function loadOPDS(url) {
  const input=new URL(requireHTTPS(url));
  if(!['www.ebooksgratuits.com','ebooksgratuits.com'].includes(input.hostname)||!input.pathname.startsWith('/opds/'))
    throw new Error('Adresse OPDS non reconnue.');
  const xml=await loadRemote(input.href,'application/atom+xml,application/xml,text/xml;q=0.9');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror'))throw new Error('Réponse OPDS invalide (le site a peut-être changé).');
  const root=doc.documentElement;
  if(root.localName!=='feed')throw new Error('Le catalogue ne fournit pas de flux OPDS.');
  const files=[],links=[],seen=new Set();
  const title=firstText(root,'title')||'Ebooks libres et gratuits · OPDS';
  for(const item of Array.from(root.children).filter(el=>el.localName==='entry').slice(0,300)){
    const label=titleOr(firstText(item,'title'));
    const authorName=Array.from(item.children).filter(el=>el.localName==='author').map(a=>firstText(a,'name')).filter(Boolean).join(', ');
    const linksForItem=Array.from(item.children).filter(el=>el.localName==='link');
    const downloads=linksForItem.filter(l=>/acquisition/i.test(l.getAttribute('rel')||'')&&/application\/(?:epub\+zip|pdf)/i.test(l.getAttribute('type')||''));
    if(downloads.length){
      for(const link of downloads){
        const mime=link.getAttribute('type')||'';
        const format=mime.includes('epub')?'epub':'pdf';
        let href;try{href=requireHTTPS(link.getAttribute('href'),input.href);}catch{continue;}
        if(seen.has(href))continue;
        seen.add(href);
        files.push({title:label,url:href,format,author:authorName,source:'Ebooks libres et gratuits',sourceGroup:'general'});
      }
    }else{
      for(const link of linksForItem){
        if(!/application\/(?:atom\+xml|opds)/i.test(link.getAttribute('type')||''))continue;
        let href;try{href=requireHTTPS(link.getAttribute('href'),input.href);}catch{continue;}
        if(new URL(href).hostname!==input.hostname||!new URL(href).pathname.startsWith('/opds/'))continue;
        if(seen.has(href))continue;
        seen.add(href);links.push({title:label,url:href});
        break;
      }
    }
  }
  for(const link of Array.from(root.children).filter(el=>el.localName==='link')){
    const relation=link.getAttribute('rel')||'';
    if(!/(?:next|start|subsection)/i.test(relation))continue;
    let href;try{href=requireHTTPS(link.getAttribute('href'),input.href);}catch{continue;}
    if(new URL(href).hostname!==input.hostname||!new URL(href).pathname.startsWith('/opds/'))continue;
    if(seen.has(href))continue;
    seen.add(href);links.push({title:relation.includes('next')?'Page suivante →':'Autres ouvrages',url:href});
  }
  return {title,files,links,sourceType:'opds'};
}
