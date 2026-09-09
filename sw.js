const CACHE='ragas-v6.0.0';
const APP_SHELL=['./','./index.html','./app.css','./app.js','./vendor/chart.umd.js'];
// Branding assets are now versioned (?v=<brandingVersion>) and cacheable, so
// they are served from cache instantly instead of being re-downloaded on every
// launch. Only the API stays uncacheable.
const isNeverCached=(url)=>url.pathname.startsWith('/api/')||url.pathname.endsWith('/manifest.webmanifest');
const isBranding=(url)=>url.pathname.startsWith('/branding/');
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>(key.startsWith('ragas-')||key.startsWith('vege-pwa-')||key.startsWith('whitelabel-pwa-'))&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request;const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==location.origin||isNeverCached(url))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy)).catch(()=>{});return response}).catch(()=>caches.match('./index.html')));
    return;
  }
  if(isBranding(url)){
    // Cache-first: the URL changes whenever the logo changes.
    event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{})}return response})));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});return response}).catch(()=>cached||Response.error())));
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
