const CACHE='kuanguan-v1.2.0';const ASSETS=['./','./index.html','./styles.css','./app.js','./core.js','./filters.js','./records.js','./xlsx.js','./vendor/jszip.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kuanguan-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).then(res=>res).catch(()=>caches.match(e.request).then(r=>r||Response.error())))});
