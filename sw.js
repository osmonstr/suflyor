const V='suflyor-3',CORE=['./','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-180.png','asr/worker.js','asr/tap.js','asr/vosk-wasm.js'];
const FONT=/fonts\.(googleapis|gstatic)\.com$/;
addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>skipWaiting())));
addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('suflyor-')&&x!==V&&x!=='suflyor-asr-v1').map(x=>caches.delete(x)))).then(()=>clients.claim())));
addEventListener('fetch',e=>{const q=e.request,u=new URL(q.url);if(q.method!=='GET')return;
  if(FONT.test(u.hostname)){e.respondWith(caches.match(q).then(r=>r||fetch(q).then(n=>{const c=n.clone();caches.open(V).then(x=>x.put(q,c));return n})));return}
  if(u.origin!==location.origin||u.pathname.includes('/asr/model'))return;
  if(q.mode==='navigate'){e.respondWith((async()=>{const ctl=new AbortController,t=setTimeout(()=>ctl.abort(),3000);
      try{const n=await fetch(q.url.split('#')[0],{signal:ctl.signal});clearTimeout(t);if(n.ok){const c=n.clone();(await caches.open(V)).put('./',c)}return n}
      catch(er){return (await caches.match('./'))||Response.error()}})());return}
  e.respondWith(caches.match(q,{ignoreSearch:true}).then(r=>r||fetch(q).then(n=>{if(n.ok){const c=n.clone();caches.open(V).then(x=>x.put(q,c))}return n})))});
