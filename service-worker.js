/* YMS Master Track — Service Worker v3.68.0 */
const CACHE_NAME='yms-v3.68.0';
const APP_SHELL=['./login.html','./student-home.html','./parent-home.html','./parent-payment.html','./homework.html','./teacher-home.html','./attendance.html','./notices.html','./counseling.html','./css/style.css','./js/app.js','./js/admin-multirole-fix.js','./js/admin-account-fix.js','./js/admin-student-tuition-ui.js','./js/account-id-migration.js','./js/student-dashboard.js','./js/admin-structure-fix.js','./js/admin-menu-cleanup.js','./js/student-select-options.js','./js/class-grade-sort.js','./js/student-class-sync.js','./js/home-widgets.js','./js/student-homework-privacy.js','./js/tuition-discount.js','./js/tuition-jpg.js','./js/payment-year-grid.js','./js/homework-ui-compat.js','./js/homework-personal.js','./js/homework-filter.js','./js/notice-role.js','./js/home-notices.js','./js/parent-home-fix.js','./js/parent-tabbar.js','./js/parent-topbar.js','./js/parent-payment-data.js','./js/parent-link-repair.js','./js/parent-account-save-fix.js','./js/student-mobile-ui.js','./js/teacher-mobile-nav.js','./js/teacher-mobile-ui.js','./js/teacher-homework-form-fix.js','./js/teacher-home-actions-fix.js','./js/teacher-book-fee.js','./js/attendance-teacher-mode.js','./js/counseling-live.js','./manifest.json','./images/dairoom-pay-qr.svg','./images/icon-source.svg','./images/icon-192.png','./images/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>Promise.all(APP_SHELL.map(u=>c.add(u).catch(()=>null)))));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});

const PARENT_TAB_CSS=`<style id="yms-parent-tabbar-hardfix">
body{padding-bottom:calc(82px + env(safe-area-inset-bottom))!important}
#tabBar.tab-bar{position:fixed!important;left:50%!important;right:auto!important;bottom:0!important;top:auto!important;transform:translateX(-50%)!important;width:min(100%,560px)!important;height:72px!important;padding:7px 8px calc(7px + env(safe-area-inset-bottom))!important;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;align-items:stretch!important;background:rgba(255,255,255,.98)!important;border:0!important;border-top:1px solid #E3E8F4!important;box-shadow:0 -4px 18px rgba(30,50,120,.08)!important;z-index:99999!important;backdrop-filter:blur(12px)!important}
#tabBar .parent-tab{appearance:none!important;-webkit-appearance:none!important;border:0!important;border-radius:0!important;background:transparent!important;color:#8A96B2!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important;padding:4px 0!important;margin:0!important;width:100%!important;min-width:0!important;height:100%!important;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans KR','Segoe UI',sans-serif!important;box-shadow:none!important;outline:0!important}
#tabBar .parent-tab>span{display:block!important;font-size:20px!important;line-height:1!important;font-weight:700!important}
#tabBar .parent-tab>small{display:block!important;font-size:10px!important;line-height:1.1!important;font-weight:750!important;white-space:nowrap!important;color:inherit!important}
#tabBar .parent-tab.active{color:#1E3278!important}
.app-wrapper{padding-bottom:84px!important;min-height:100vh!important}
</style>`;

async function patchHtml(req,res){try{
if(!res.ok||!(res.headers.get('content-type')||'').includes('text/html'))return res;
const url=new URL(req.url);let html=await res.text(),pre=[],end=[];
if(url.pathname.endsWith('/admin.html'))end=['js/admin-multirole-fix.js','js/admin-account-fix.js','js/admin-student-tuition-ui.js','js/account-id-migration.js','js/student-dashboard.js','js/admin-structure-fix.js','js/admin-menu-cleanup.js','js/student-select-options.js','js/class-grade-sort.js','js/student-class-sync.js','js/tuition-discount.js','js/tuition-jpg.js','js/payment-year-grid.js','js/parent-link-repair.js','js/parent-account-save-fix.js','js/home-widgets.js'];
if(url.pathname.endsWith('/teacher-home.html')){
  end=['js/admin-multirole-fix.js','js/teacher-mobile-nav.js','js/teacher-homework-form-fix.js','js/teacher-home-actions-fix.js','js/teacher-book-fee.js','js/class-grade-sort.js','js/home-notices.js','js/home-widgets.js'];
  if(!html.includes('id="bookFeeQuickLink"')){
    const marker='<a class="teacher-quick-link" href="counseling.html"><span>💬</span><span>상담 관리</span></a>';
    html=html.replace(marker,marker+'<a class="teacher-quick-link" id="bookFeeQuickLink" href="#"><span>📘</span><span>교재비 등록</span></a>');
  }
}
if(url.pathname.endsWith('/attendance.html'))pre=['js/attendance-teacher-mode.js','js/teacher-mobile-nav.js','js/teacher-mobile-ui.js'];
if(url.pathname.endsWith('/homework.html'))pre=['js/homework-ui-compat.js','js/homework-personal.js','js/homework-filter.js','js/parent-tabbar.js','js/parent-topbar.js','js/student-mobile-ui.js','js/teacher-mobile-nav.js','js/teacher-mobile-ui.js'];
if(url.pathname.endsWith('/notices.html'))pre=['js/notice-role.js','js/parent-tabbar.js','js/parent-topbar.js','js/student-mobile-ui.js','js/teacher-mobile-nav.js','js/teacher-mobile-ui.js'];
if(url.pathname.endsWith('/counseling.html')){
  pre=['js/parent-tabbar.js','js/parent-topbar.js','js/student-mobile-ui.js','js/teacher-mobile-nav.js','js/teacher-mobile-ui.js'];
  const appScript='<script src="js/app.js"></script>';
  html=html.replace(/(<script src="js\/app\.js"><\/script>)\s*<script>[\s\S]*?<\/script>/,appScript);
  end=['js/counseling-live.js'];
}
if(url.pathname.endsWith('/parent-home.html')){pre=['js/parent-home-fix.js','js/notice-role.js','js/home-notices.js','js/parent-tabbar.js'];end=['js/home-widgets.js','js/student-homework-privacy.js'];}
if(url.pathname.endsWith('/parent-payment.html'))pre=['js/parent-payment-data.js','js/parent-tabbar.js','js/parent-topbar.js'];
if(url.pathname.endsWith('/student-home.html')){pre=['js/notice-role.js','js/home-notices.js','js/student-mobile-ui.js'];end=['js/home-widgets.js','js/student-homework-privacy.js'];}
const isParentPage=['/homework.html','/notices.html','/counseling.html','/parent-home.html','/parent-payment.html'].some(p=>url.pathname.endsWith(p));
if(isParentPage&&!html.includes('yms-parent-tabbar-hardfix'))html=html.replace('</head>',PARENT_TAB_CSS+'</head>');
const appTag='<script src="js/app.js"></script>';
const pm=pre.filter(s=>!html.includes(s));
if(pm.length)html=html.includes(appTag)?html.replace(appTag,appTag+pm.map(s=>`<script src="${s}?v=3.68.0"></script>`).join('')):html.replace('</body>',pm.map(s=>`<script src="${s}?v=3.68.0"></script>`).join('')+'</body>');
const em=end.filter(s=>!html.includes(s));
if(em.length)html=html.replace('</body>',em.map(s=>`<script src="${s}?v=3.68.0"></script>`).join('')+'</body>');
const h=new Headers(res.headers);h.delete('content-length');return new Response(html,{status:res.status,statusText:res.statusText,headers:h});
}catch{return res;}}
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(u.origin!==self.location.origin||r.method!=='GET')return;if(r.mode==='navigate'||r.headers.get('accept')?.includes('text/html')){e.respondWith(fetch(r).then(async res=>{if(res.ok)caches.open(CACHE_NAME).then(c=>c.put(r,res.clone()));return patchHtml(r,res);}).catch(async()=>patchHtml(r,(await caches.match(r))||(await caches.match('./login.html')))));return;}e.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(res=>{if(res.ok)caches.open(CACHE_NAME).then(c=>c.put(r,res.clone()));return res;})));});