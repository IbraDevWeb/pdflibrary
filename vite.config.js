import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
 base:'./',
 plugins:[VitePWA({
  registerType:'autoUpdate',
  strategies:'generateSW',
  includeAssets:['icons/icon.svg','icons/icon-192.png','icons/icon-512.png'],
  manifest:{ name:'Folio — Ma bibliothèque privée',short_name:'Folio',lang:'fr',display:'standalone',start_url:'./',scope:'./',background_color:'#f8f9f5',theme_color:'#18352f',icons:[{src:'./icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'./icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]},
  workbox:{globPatterns:['**/*.{js,css,html,svg,png,woff2,mjs}'],maximumFileSizeToCacheInBytes:10*1024*1024,cleanupOutdatedCaches:true,navigateFallback:'index.html'}
 })],
 build:{target:'es2022'}
});
