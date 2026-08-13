/* YMS Master Track — Service Worker v3.15.0 */
const CACHE_NAME='yms-v3.15.0';
const APP_SHELL=['./login.html','./student-home.html','./parent-home.html','./homework.html','./css/style.css','./js/app.js','./js/admin-multirole-fix.js','./js/admin-account-fix.js','./js/account-id-migration.js','./js/student-dashboard.js','./js/admin-structure-fix.js','./js/admin-menu-cleanup.js','./js/student-select-options.js','./js/homework-personal.js','./js/homework-filter.js','./js/parent-home-fix.js','./js/parent-link-repair.js','./js/parent-account-save-fix.js','./manifest.json','./images/icon-source.svg','./images/icon-192.png','./images/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>Promise.all(APP_SHELL.map(u=>c.add(u).catch(()=>null)))));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
async function patchHtml(req,res){
  try{
    if(!res.ok||!(res.headers.get('content-type')||'').includes('text/html'))return res;
    const url=new URL(req.url);let html=await res.text();let scripts=[];
    if(url.pathname.endsWith('/admin.html'))scripts=['js/admin-multirole-fix.js','js/admin-account-fix.js','js/account-id-migration.js','js/student-dashboard.js','js/admin-structure-fix.js','js/admin-menu-cleanup.js','js/student-select-options.js','js/parent-link-repair.js','js/parent-account-save-fix.js'];
    if(url.pathname.endsWith('/homework.html'))scripts=['js/homework-personal.js','js/homework-filter.js'];
    if(url.pathname.endsWith('/parent-home.html'))scripts=['js/parent-home-fix.js'];
    const missing=scripts.filter(s=>!html.includes(s));if(missing.length)html=html.replace('</body>',missing.map(s=>`<script src="${s}"></script>`).join('')+'</body>');
    const h=new Headers(res.headers);h.delete('content-length');return new Response(html,{status:res.status,statusText:res.statusText,headers:h});
  }catch{return res;}
}
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);if(u.origin!==self.location.origin||r.method!=='GET')return;
  if(r.mode==='navigate'||r.headers.get('accept')?.includes('text/html')){e.respondWith(fetch(r).then(async res=>{if(res.ok)caches.open(CACHE_NAME).then(c=>c.put(r,res.clone()));return patchHtml(r,res);}).catch(async()=>patchHtml(r,(await caches.match(r))||(await caches.match('./login.html')))));return;}
  e.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(res=>{if(res.ok)caches.open(CACHE_NAME).then(c=>c.put(r,res.clone()));return res;})));
});