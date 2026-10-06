// Solo file pubblici: token, account, chat e risposte API non entrano nella cache.
const CACHE='humana-life-194';
const SHELL=['/boot.js','/loader.js','/','/app.js','/ui/style.css','/ui/living.js','/ui/hud.js','/ui/hud.css','/ui/city.js','/ui/arena.js','/ui/jobs.js','/ui/editor.js','/ui/phone.js','/audio/calls.js','/world/renderer.js','/world/crowd.js','/player/controls.js','/player/pointer.js','/networking/api.js','/audio/voice.js','/audio/ambient.js','/shared/world.js','/shared/district.js','/shared/catalog.js','/shared/looks.js','/shared/art.js','/manifest.webmanifest',...['buildings','avatar','gulf','props','paving','residences','living','social-poses','icon-192','icon-512'].map(n=>'/assets/'+n+'.png')];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('message',e=>{if(e.data?.type==='APPLY_UPDATE')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('humana-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!SHELL.includes(u.pathname))return;
 // L'applicazione si apre offline, ma l'accesso al mondo resta online e autorevole.
 e.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(e.request);return cached||fetch(e.request);}));
});
