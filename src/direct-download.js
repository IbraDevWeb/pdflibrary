import { FileTransfer } from '@capacitor/file-transfer';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { native, bookBlob, inspectFile, idForBook } from './storage.js';
import { validateExternalUrl } from './catalog.js';

const MAX_SIZE = 120 * 1024 * 1024;
export async function downloadToLibrary({url,format,title},report=()=>{}){
  const safeUrl=validateExternalUrl(url);
  const kind=format==='epub'?'epub':format==='pdf'?'pdf':null;
  if(!kind)throw new Error('Seuls les formats PDF et EPUB sont acceptés.');
  const id=idForBook(),filename=(String(title||'Livre').trim()||'Livre')+'.'+kind;
  if(native){
    const filePath='library/'+id+'.'+kind;
    let attempted=false,listener=null;
    try{
      await Filesystem.mkdir({path:'library',directory:Directory.Data,recursive:true}).catch(e=>{
        if(!/exist/i.test(String(e?.message||e)))throw e;
      });
      const uri=await Filesystem.getUri({path:filePath,directory:Directory.Data});
      listener=await FileTransfer.addListener('progress',event=>{
        if(event.contentLength>0){
          const percentage=Math.max(0,Math.min(100,Math.round(event.bytes/event.contentLength*100)));
          report(percentage);
        }else report(null);
      });
      attempted=true;
      await FileTransfer.downloadFile({url:safeUrl,path:uri.uri,progress:true,connectTimeout:20000,readTimeout:60000});
      const stat=await Filesystem.stat({path:filePath,directory:Directory.Data});
      if(stat.size<5||stat.size>MAX_SIZE)throw new Error('Taille du fichier non prise en charge (maximum 120 Mo).');
      const stored={id,kind,filePath,fileSize:stat.size};
      const blob=await bookBlob(stored);
      const file=new File([blob],filename,{type:kind==='pdf'?'application/pdf':'application/epub+zip'});
      await inspectFile(file);
      report(100);
      return {stored, file};
    }catch(e){
      if(attempted)await Filesystem.deleteFile({path:filePath,directory:Directory.Data}).catch(()=>{});
      throw e;
    }finally{await listener?.remove();}
  }
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
  try{
    const response=await fetch(safeUrl,{mode:'cors',signal:controller.signal});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const size=Number(response.headers.get('content-length')||0);
    if(size>MAX_SIZE)throw new Error('Fichier trop volumineux (maximum 120 Mo).');
    const blob=await response.blob();
    if(blob.size<5||blob.size>MAX_SIZE)throw new Error('Taille du fichier non prise en charge (maximum 120 Mo).');
    const file=new File([blob],filename,{type:kind==='pdf'?'application/pdf':'application/epub+zip'});
    await inspectFile(file);
    report(100);
    return {stored:{id,kind,file,fileSize:file.size},file};
  }catch(e) {
    if(e.name==='AbortError')throw new Error('Délai de téléchargement dépassé.');
    if(e instanceof TypeError)throw new Error('Le site bloque le téléchargement depuis la PWA (CORS). Utilisez la version Android.');
    throw e;
  }finally{clearTimeout(timer);}
}
