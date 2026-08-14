/* YMS Master Track — Service Worker v3.35.0 */
const CACHE_NAME='yms-v3.35.0';
const APP_SHELL=['./login.html','./student-home.html','./parent-home.html','./parent-payment.html','./homework.html','./teacher-home.html','./attendance.html','./notices.html','./counseling.html','./css/style.css','./js/app.js','./js/admin-multirole-fix.js','./js/admin-account-fix.js','./js/account-id-migration.js','./js/student-dashboard.js','./js/admin-structure-fix.js','./js/admin-menu-cleanup.js','./js/student-select-options.js','./js/tuition-discount.js','./js/tuition-jpg.js','./js/payment-year-grid.js','./js/homework-personal.js','./js/homework-filter.js','./js/notice-role.js','./js/parent-home-fix.js','./js/parent-tabbar.js','./js/parent-topbar.js','./js/parent-payment-data.js','./js/parent-link-repair.js','./js/parent-account-save-fix.js','./js/student-mobile-ui.js','./js/teacher-mobile-nav.js','./js/teacher-homework-form-fix.js','./js/attendance-teacher-mode.js','./manifest.json','./images/dairoom-pay-qr.svg','./images/icon-source.svg','./images/icon-192.png','./images/icon-512.png'];
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

const ATTENDANCE_CSS=`<style id="yms-attendance-hardfix">
.app-wrapper{max-width:560px!important;background:#F4F7FD!important;padding-bottom:84px!important}
.app-bar{height:64px!important;min-height:64px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:0 16px!important;margin:0!important;background:#fff!important;border:0!important;border-bottom:1px solid #E3E8F4!important;box-shadow:none!important;position:sticky!important;top:0!important;z-index:500!important}
.app-bar-left,.app-bar-right{display:flex!important;align-items:center!important;gap:10px!important;min-width:0!important}
.app-bar-left>span{color:#14245A!important;font-size:19px!important;font-weight:900!important;letter-spacing:-.5px!important;line-height:1.2!important;white-space:nowrap!important}
.app-bar .icon-btn{width:38px!important;height:38px!important;min-width:38px!important;display:grid!important;place-items:center!important;padding:0!important;margin:0!important;border:0!important;border-radius:12px!important;background:#EEF3FB!important;color:#1E3278!important;font-size:19px!important;line-height:1!important;box-shadow:none!important}
#roleChip{display:none!important}
#teacherView{padding:18px 16px 0!important}
#teacherView .date-select-bar{padding:0!important;margin:0 0 14px!important;display:grid!important;grid-template-columns:1fr!important;gap:8px!important}
#teacherView .date-select-bar label{font-size:12px!important;font-weight:800!important;color:#7A87A8!important;margin-left:2px!important}
#teacherView .date-select-bar input[type=date]{width:100%!important;min-height:52px!important;padding:0 16px!important;border:1px solid #D7DEEC!important;border-radius:16px!important;background:#fff!important;color:#1A2340!important;font-size:15px!important;font-weight:700!important;box-shadow:0 3px 12px rgba(30,50,120,.05)!important}
#teacherView .class-tab-row{padding:0!important;margin:0 0 14px!important;gap:8px!important}
#teacherView .class-tab{min-height:42px!important;padding:0 16px!important;border:1px solid #D7DEEC!important;border-radius:999px!important;background:#fff!important;color:#7A87A8!important;font-size:12px!important;font-weight:800!important;box-shadow:none!important}
#teacherView .class-tab.active{background:#1E3278!important;border-color:#1E3278!important;color:#fff!important}
#teacherView .page-content{padding:0!important}
#teacherView .section-header{margin:4px 2px 10px!important;display:flex!important;align-items:center!important;justify-content:space-between!important}
#teacherView .section-title{font-size:16px!important;font-weight:900!important;color:#14245A!important}
#teacherView .card{border:1px solid #E3E8F4!important;border-radius:18px!important;background:#fff!important;box-shadow:0 3px 12px rgba(30,50,120,.05)!important;padding:8px 14px!important}
#teacherView #saveAttBtn{min-height:50px!important;border-radius:14px!important;margin-top:12px!important;margin-bottom:18px!important}
#tabBar.tab-bar{display:none!important}
@media(max-width:700px){body{padding-bottom:calc(78px + env(safe-area-inset-bottom))!important}}
</style>`;

async function patchHtml(req,res){try{
if(!res.ok||!(res.headers.get('content-type')||'').includes('text/html'))return res;
const url=new URL(req.url);let html=await res.text(),pre=[],end=[];
if(url.pathname.endsWith('/admin.html'))end=['js/admin-multirole-fix.js','js/admin-account-fix.js','js/account-id-migration.js','js/student-dashboard.js','js/admin-structure-fix.js','js/admin-menu-cleanup.js','js/student-select-options.js','js/tuition-discount.js','js/tuition-jpg.js','js/payment-year-grid.js','js/parent-link-repair.js','js/parent-account-save-fix.js'];
if(url.pathname.endsWith('/teacher-home.html'))end=['js/admin-multirole-fix.js','js/teacher-mobile-nav.js','js/teacher-homework-form-fix.js'];
if(url.pathname.endsWith('/attendance.html'))pre=['js/attendance-teacher-mode.js','js/teacher-mobile-nav.js'];
if(url.pathname.endsWith('/homework.html'))pre=['js/parent-tabbar.js','js/parent-topbar.js','js/student-mobile-ui.js','js/teacher-mobile-nav.js'];
if(url.pathname.endsWith('/notices.html'))pre=['js/notice-role.js','js/parent-tabbar.js','js/parent-topbar.js','js/student-mobile-ui.js','js/teacher-mobile-nav.js'];
if(url.pathname.endsWith('/counseling.html'))pre=['js/parent-tabbar.js','js/parent-topbar.js','js/student-mobile-ui.js','js/teacher-mobile-nav.js'];
if(url.pathname.endsWith('/parent-home.html'))pre=['js/parent-home-fix.js','js/notice-role.js','js/parent-tabbar.js'];
if(url.pathname.endsWith('/parent-payment.html'))pre=['js/parent-payment-data.js','js/parent-tabbar.js','js/parent-topbar.js'];
if(url.pathname.endsWith('/student-home.html'))pre=['js/notice-role.js','js/student-mobile-ui.js'];
const isParentPage=['/homework.html','/notices.html','/counseling.html','/parent-home.html','/parent-payment.html'].some(p=>url.pathname.endsWith(p));
if(isParentPage&&!html.includes('yms-parent-tabbar-hardfix'))html=html.replace('</head>',PARENT_TAB_CSS+'</head>');
if(url.pathname.endsWith('/attendance.html')&&!html.includes('yms-attendance-hardfix'))html=html.replace('</head>',ATTENDANCE_CSS+'</head>');
const appTag='<script src="js/app.js"></script>';
const pm=pre.filter(s=>!html.includes(s));
if(pm.length)html=html.includes(appTag)?html.replace(appTag,appTag+pm.map(s=>`<script src="${s}?v=3.35.0"></script>`).join('')):html.replace('</body>',pm.map(s=>`<script src="${s}?v=3.35.0"></script>`).join('')+'</body>');
const em=end.filter(s=>!html.includes(s));
if(em.length)html=html.replace('</body>',em.map(s=>`<script src="${s}?v=3.35.0"></script>`).join('')+'</body>');
const h=new Headers(res.headers);h.delete('content-length');return new Response(html,{status:res.status,statusText:res.statusText,headers:h});
}catch{return res;}}
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(u.origin!==self.location.origin||r.method!=='GET')return;if(r.mode==='navigate'||r.headers.get('accept')?.includes('text/html')){e.respondWith(fetch(r).then(async res=>{if(res.ok)caches.open(CACHE_NAME).then(c=>c.put(r,res.clone()));return patchHtml(r,res);}).catch(async()=>patchHtml(r,(await caches.match(r))||(await caches.match('./login.html')))));return;}e.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(res=>{if(res.ok)caches.open(CACHE_NAME).then(c=>c.put(r,res.clone()));return res;})));});