// Assets indispensables au rendu de PDF anciens et non occidentaux.
// Sans standard_fonts/cmaps, certains PDF affichent des caractères manquants.
import {mkdir,cp,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=resolve('node_modules/pdfjs-dist');
const destination=resolve('dist/pdfjs');
for(const folder of ['standard_fonts','cmaps']){
 const src=resolve(base,folder);
 if(!(await stat(src).catch(()=>null)))throw new Error('Ressources PDF.js manquantes : '+src);
 await mkdir(resolve(destination,folder),{recursive:true});
 await cp(src,resolve(destination,folder),{recursive:true,force:true});
 console.log('PDF.js : ressources '+folder+' copiées dans dist/');
}
