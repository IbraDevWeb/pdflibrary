'use strict';
/** Folio pour Windows : les livres sont conservés dans IndexedDB du profil Electron.
 * Le schéma stable folio://app est indispensable pour ne jamais perdre la
 * bibliothèque à cause d'un port serveur aléatoire.
 */
const {app,BrowserWindow,protocol,shell}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {assetPath,mimeFor,isExternalHTTP}=require('./paths.cjs');

protocol.registerSchemesAsPrivileged([{
 scheme:'folio',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}
}]);

const ORIGIN='folio://app';
const WINDOWS_ID='fr.folio.lecteurpersonnel';
let mainWindow=null;

function external(url){
 if(!isExternalHTTP(url))return;
 shell.openExternal(url).catch(error=>console.warn('Ouverture du navigateur externe',error));
}
function registerAssets(){
 const root=path.join(app.getAppPath(),'dist');
 protocol.handle('folio',async request=>{
  const filepath=assetPath(root,request.url);
  if(!filepath)return new Response('Adresse locale interdite',{status:403,headers:{'Content-Type':'text/plain'}});
  try{
   const data=await fs.readFile(filepath);
   return new Response(data,{status:200,headers:{'Content-Type':mimeFor(filepath),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }catch(error){
   if(error.code!=='ENOENT')console.warn('Ressource Folio inaccessible',error);
   return new Response('Ressource introuvable',{status:404,headers:{'Content-Type':'text/plain'}});
  }
 });
}
function createWindow(){
 const win=new BrowserWindow({
  title:'Folio — Ma bibliothèque',
  width:1290,height:850,minWidth:610,minHeight:520,
  backgroundColor:'#f8f9f5',show:false,
  autoHideMenuBar:true,
  webPreferences:{
   sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,
   webviewTag:false,backgroundThrottling:false
  }
 });
 mainWindow=win;
 win.once('ready-to-show',()=>win.show());
 win.on('closed',()=>{if(mainWindow===win)mainWindow=null;});
 win.webContents.setWindowOpenHandler(({url})=>{
  external(url);return {action:'deny'};
 });
 win.webContents.on('will-navigate',(event,url)=>{
  if(!url.startsWith(ORIGIN+'/')){
   event.preventDefault();external(url);
  }
 });
 win.webContents.on('will-redirect',(event,url)=>{
  if(!url.startsWith(ORIGIN+'/')){event.preventDefault();external(url);}
 });
 win.webContents.on('render-process-gone',(_event,details)=>console.warn('Processus de lecture interrompu :',details.reason));
 win.loadURL(ORIGIN+'/index.html').catch(error=>console.error('Impossible de charger Folio',error));
}
if(!app.requestSingleInstanceLock()){
 app.quit();
}else{
 app.on('second-instance',()=>{
  if(!mainWindow)return;
  if(mainWindow.isMinimized())mainWindow.restore();
  mainWindow.focus();
 });
 app.whenReady().then(()=>{
  if(process.platform==='win32')app.setAppUserModelId(WINDOWS_ID);
  registerAssets();
  // Jamais de permissions navigateur superflues pour des livres locaux.
  createWindow();
 }).catch(error=>{console.error('Démarrage de Folio impossible',error);app.quit();});
 app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});
 app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
}
