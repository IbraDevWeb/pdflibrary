import { Browser } from '@capacitor/browser';
import { native } from './storage.js';

/** Navigation native : Chrome Custom Tabs côté Android, sans iframe ni popup bloquée. */
export async function openLibraryWebsite(safeHttpsUrl) {
  const url=new URL(safeHttpsUrl);
  if(url.protocol!=='https:'||url.username||url.password)throw new Error('Adresse HTTPS invalide.');
  if(native){
    await Browser.open({url:url.href});
    return;
  }
  const tab=window.open(url.href,'_blank','noopener,noreferrer');
  if(!tab)window.location.assign(url.href);
}
