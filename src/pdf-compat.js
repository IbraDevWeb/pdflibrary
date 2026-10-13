/**
 * PDF.js 5 utilise Map.prototype.getOrInsertComputed (proposition ECMAScript
 * Collection Upsert), absente de plusieurs moteurs Electron/Chromium.
 *
 * Sans ce polyfill, l'ouverture d'un PDF dessine un canvas vide et journalise :
 * "this[#e].getOrInsertComputed is not a function".
 *
 * Installé avant de demander à PDF.js de rendre une page.
 * Implémentation non énumérable, sans remplacer une méthode native existante.
 */
export function installPdfCompatibility(){
  for(const Type of [Map,WeakMap]){
    const proto=Type.prototype;
    if(typeof proto.getOrInsert!=='function'){
      Object.defineProperty(proto,'getOrInsert',{
        configurable:true,writable:true,
        value:function(key,defaultValue){
          if(this.has(key))return this.get(key);
          this.set(key,defaultValue);
          return defaultValue;
        }
      });
    }
    if(typeof proto.getOrInsertComputed!=='function'){
      Object.defineProperty(proto,'getOrInsertComputed',{
        configurable:true,writable:true,
        value:function(key,callback){
          if(this.has(key))return this.get(key);
          if(typeof callback!=='function')throw new TypeError('callback doit être une fonction');
          const result=callback(key);
          this.set(key,result);
          return result;
        }
      });
    }
  }
}
installPdfCompatibility();
