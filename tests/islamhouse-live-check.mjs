const base='https://api3.islamhouse.com/v3/paV29H2gm56kvLP';
async function request(path){
 const response=await fetch(base+path,{signal:AbortSignal.timeout(19000),headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error('HTTP '+response.status+' '+path);
 const json=await response.json();
 if(!json||typeof json!=='object')throw new Error('Réponse JSON invalide');
 return json;
}
const list=await request('/main/books/fr/fr/1/5/json');
const items=Array.isArray(list)?list:Array.isArray(list.data)?list.data:[];
console.log('Livres détectés :',items.length,items.slice(0,3).map(b=>({id:b.id,title:b.title})));
if(!items.length)throw new Error('Aucun livre dans la réponse API');
const id=items.find(i=>/^\d+$/.test(String(i.id)))?.id;
if(!id)throw new Error('Identifiant de livre manquant');
const detail=await request('/main/get-item/'+id+'/fr/json');
const item=Array.isArray(detail?.data)?detail.data[0]:detail?.data&&typeof detail.data==='object'?detail.data:detail;
const attachments=Array.isArray(item?.attachments)?item.attachments:[];
console.log('Premier ouvrage :',String(item.title||id),'Fichiers :',attachments.map(a=>({extension:a.extension_type,url:a.url?.slice(0,120)})));
if(!attachments.some(a=>String(a.extension_type||'').toLowerCase()==='pdf'||/\.pdf(?:\?|$)/i.test(a.url||''))){
 console.warn('Ce livre ne propose pas de PDF. Vérifier un autre livre dans l’application.');
}
console.log('API IslamHouse accessible depuis GitHub Actions.');
