import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import JSZip from 'jszip';
import { Share } from '@capacitor/share';

const DB = 'folio-library', STORE = 'books';
export const native = Capacitor.isNativePlatform();
let db;
export async function initStorage() {
  db = await new Promise((resolve,reject) => {
    const request = indexedDB.open(DB,1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE,{keyPath:'id'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
const transaction = (mode,callback) => new Promise((resolve,reject) => {
  const tx=db.transaction(STORE,mode), request=callback(tx.objectStore(STORE));
  let result;
  if (request) request.onsuccess=()=>{ result=request.result; };
  tx.oncomplete=()=>resolve(result);
  tx.onerror=()=>reject(tx.error);
  tx.onabort=()=>reject(tx.error||new Error('Transaction interrompue'));
});
export const allBooks=()=>transaction('readonly',store=>store.getAll());
export const saveBook=book=>transaction('readwrite',store=>store.put(book));
export const removeBookRecord=id=>transaction('readwrite',store=>store.delete(id));
export const kindOf=book=>book.kind||(book.filePath?.endsWith('.epub')?'epub':'pdf');
export const idForBook=()=>crypto.randomUUID();
export const bytesLabel=n=>n>1048576?(n/1048576).toFixed(1)+' Mo':(n/1024).toFixed(0)+' Ko';

function toBase64(buffer) {
  const bytes=new Uint8Array(buffer),blocks=[];
  for(let i=0;i<bytes.length;i+=8192)blocks.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
  return btoa(blocks.join(''));
}
function fromBase64(data,type){
  const raw=atob(data),blocks=[];
  for(let i=0;i<raw.length;i+=8192){
    const slice=raw.slice(i,i+8192),bytes=new Uint8Array(slice.length);
    for(let j=0;j<slice.length;j++)bytes[j]=slice.charCodeAt(j);
    blocks.push(bytes);
  }
  return new Blob(blocks,{type});
}
export async function inspectFile(file){
  const ext=/\.epub$/i.test(file.name||'')?'epub':/\.pdf$/i.test(file.name||'')?'pdf':null;
  const bytes=new Uint8Array(await file.slice(0,64).arrayBuffer());
  const pdf=String.fromCharCode(...bytes).includes('%PDF-');
  const zip=bytes[0]===80&&bytes[1]===75&&[3,5,7].includes(bytes[2]);
  if(ext==='pdf'&&pdf)return 'pdf';
  if(ext==='epub'&&zip)return 'epub';
  throw new Error('Ce fichier n’est pas un PDF ou EPUB valide : '+(file.name||'fichier'));
}
export async function storeFile(id,file,kind){
  if(!native)return {file,fileSize:file.size,kind};
  const filePath='library/'+id+'.'+kind;
  await Filesystem.writeFile({path:filePath,directory:Directory.Data,recursive:true,data:toBase64(await file.arrayBuffer())});
  return {filePath,fileSize:file.size,kind};
}
export async function bookBlob(book){
  if(book.file)return book.file;
  if(!book.filePath)throw new Error('Fichier absent de ce livre.');
  const result=await Filesystem.readFile({path:book.filePath,directory:Directory.Data});
  return typeof result.data==='string'?fromBase64(result.data,kindOf(book)==='epub'?'application/epub+zip':'application/pdf'):result.data;
}
export async function saveOrShare(blob, filename) {
  if (native) {
    const path = 'share/' + filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const encoded = toBase64(await blob.arrayBuffer());
    await Filesystem.writeFile({ path, data: encoded, directory: Directory.Cache, recursive: true });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    await Share.share({ title: filename, url: uri, dialogTitle: 'Enregistrer ou partager ce fichier' });
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function deleteBookFile(book){
  if(native&&book.filePath){
    try {await Filesystem.deleteFile({path:book.filePath,directory:Directory.Data});}
    catch(e){console.warn('Fichier déjà absent',e);}
  }
}
function normalize(info){
  return {
    id:info.id,title:String(info.title||'Sans titre').slice(0,200),
    author:String(info.author||'').slice(0,150),
    category:String(info.category||'').slice(0,150),
    tags:Array.isArray(info.tags)?info.tags.slice(0,40).map(x=>String(x).slice(0,60)):[],
    rating:Math.max(0,Math.min(5,Number(info.rating)||0)),
    favorite:info.favorite===true,
    status:['reading','finished','to-read'].includes(info.status)?info.status:'to-read',
    notes:String(info.notes||'').slice(0,50000),
    kind:info.kind==='epub'?'epub':'pdf',
    page:Math.max(1,Number(info.page)||1),
    totalPages:Number(info.totalPages)||null,
    position:typeof info.position==='string'?info.position:null,
    progress:Math.max(0,Math.min(100,Number(info.progress)||0)),
    bookmarks:Array.isArray(info.bookmarks)?info.bookmarks.slice(0,300):[],
    annotations:Array.isArray(info.annotations)?info.annotations.slice(0,3000):[],
    theme:['light','sepia','dark'].includes(info.theme)?info.theme:'light',
    zoom:Math.min(3,Math.max(.6,Number(info.zoom)||1)),
    readingDirection:info.readingDirection==='rtl'?'rtl':'ltr',
    createdAt:Number(info.createdAt)||Date.now(),updatedAt:Date.now(),
    lastReadAt:Number(info.lastReadAt)||null,
    sourceUrl:typeof info.sourceUrl==='string'?info.sourceUrl.slice(0,2000):null,
    sourceName:typeof info.sourceName==='string'?info.sourceName.slice(0,200):null
  };
}
export async function exportZip(books){
  if(!books.length)throw new Error('Aucun livre à sauvegarder.');
  const zip=new JSZip(),manifest=[];
  for(const book of books){
    const kind=kindOf(book),filePath='books/'+book.id+'.'+kind;
    zip.file(filePath,await bookBlob(book));
    const {file,cover,filePath:originalPath,...meta}=book;
    let coverPath=null;
    if(cover instanceof Blob){coverPath='covers/'+book.id+'.png';zip.file(coverPath,cover);}
    manifest.push({...meta,kind,filePath,coverPath});
  }
  zip.file('library.json',JSON.stringify({format:'folio-backup',version:2,books:manifest}));
  return zip.generateAsync({type:'blob',compression:'STORE',streamFiles:true});
}
export async function restoreZip(file,ids=new Set()){
  const zip=await JSZip.loadAsync(file,{checkCRC32:true});
  const entry=zip.file('library.json');
  if(!entry)throw new Error('Fichier library.json manquant.');
  const text=await entry.async('string');
  if(text.length>10000000)throw new Error('Sauvegarde trop volumineuse.');
  const data=JSON.parse(text);
  if(data.format!=='folio-backup'||![1,2].includes(data.version)||!Array.isArray(data.books)||data.books.length>10000)throw new Error('Sauvegarde Folio non reconnue.');
  let added=0,skipped=0;
  for(const info of data.books){
    if(!info||typeof info.id!=='string'||!/^[\w-]{1,100}$/.test(info.id)||typeof info.title!=='string')throw new Error('Livre invalide dans l’archive.');
    if(ids.has(info.id)){skipped++;continue;}
    const kind=info.kind==='epub'?'epub':'pdf',path='books/'+info.id+'.'+kind;
    if(info.filePath!==path)throw new Error('Chemin source invalide.');
    const content=zip.file(path);
    if(!content)throw new Error('Fichier manquant pour '+info.title);
    const bytes=await content.async('uint8array');
    const bookFile=new File([bytes],info.title+'.'+kind,{type:kind==='epub'?'application/epub+zip':'application/pdf'});
    await inspectFile(bookFile);
    const saved=await storeFile(info.id,bookFile,kind);
    const book={...normalize(info),...saved};
    const expectedCover='covers/'+info.id+'.png';
    if(info.coverPath===expectedCover&&zip.file(expectedCover)){
      book.cover=new Blob([await zip.file(expectedCover).async('uint8array')],{type:'image/png'});
    }
    await saveBook(book);ids.add(info.id);added++;
  }
  return {added,skipped};
}
