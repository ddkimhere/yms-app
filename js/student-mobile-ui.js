/* YMS student shared mobile UI */
(function(){
  'use strict';
  const u=window.YMS_Auth?.getUser?.();
  if(String(u?.role||'').toUpperCase()!=='STUDENT') return;

  const current=()=>location.pathname.split('/').pop()||'student-home.html';

  // 학생 계정에서는 상담 기능을 사용하지 않음
  if(current()==='counseling.html'){
    location.replace('student-home.html');
    return;
  }

  if(!document.getElementById('yms-student-mobile-style')){
    const s=document.createElement('style');s.id='yms-student-mobile-style';
    s.textContent=`
      body{padding-bottom:calc(80px + env(safe-area-inset-bottom))!important;background:#F4F7FD!important}
      .app-wrapper{max-width:560px!important;margin:0 auto!important;min-height:100vh!important;padding-bottom:82px!important;background:#F4F7FD!important}
      .app-bar{height:64px!important;min-height:64px!important;padding:0 16px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;background:#fff!important;border-bottom:1px solid #E3E8F4!important;box-shadow:none!important;position:sticky!important;top:0!important;z-index:60!important}
      .app-bar-left{display:flex!important;align-items:center!important;gap:10px!important}.app-bar-right{display:flex!important;align-items:center!important;gap:8px!important}
      .app-bar .icon-btn{width:38px!important;height:38px!important;border:0!important;border-radius:11px!important;background:#EEF3FB!important;color:#14245A!important;display:grid!important;place-items:center!important;font-size:18px!important;padding:0!important;box-shadow:none!important}
      .app-bar-left>span{font-size:19px!important;font-weight:900!important;color:#14245A!important;letter-spacing:-.4px!important}
      #roleChip{display:none!important}
      #tabBar.tab-bar{position:fixed!important;left:50%!important;bottom:0!important;top:auto!important;transform:translateX(-50%)!important;width:min(100%,560px)!important;height:72px!important;padding:7px 10px calc(7px + env(safe-area-inset-bottom))!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;background:rgba(255,255,255,.98)!important;border:0!important;border-top:1px solid #E3E8F4!important;box-shadow:0 -4px 18px rgba(30,50,120,.07)!important;z-index:99999!important;backdrop-filter:blur(12px)!important}
      #tabBar .student-tab{appearance:none!important;-webkit-appearance:none!important;border:0!important;background:transparent!important;color:#8A96B2!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important;padding:4px 0!important;margin:0!important;width:100%!important;height:100%!important;font:inherit!important;text-decoration:none!important;box-shadow:none!important}
      #tabBar .student-tab>span{font-size:20px!important;line-height:1!important}#tabBar .student-tab>small{font-size:10px!important;font-weight:750!important;color:inherit!important;line-height:1.1!important}.student-tab.active{color:#1E3278!important}
    `;document.head.appendChild(s);
  }

  window.ymsRenderTabBar=function(active){
    let bar=document.getElementById('tabBar');if(!bar){bar=document.createElement('nav');bar.id='tabBar';document.body.appendChild(bar);}bar.className='tab-bar';
    const tabs=[['student-home.html','⌂','홈'],['homework.html','▣','숙제'],['notices.html','●','공지']];
    bar.innerHTML=tabs.map(([h,i,l])=>`<button type="button" class="student-tab ${(active||current())===h?'active':''}" onclick="_ymsGo('${h}')"><span>${i}</span><small>${l}</small></button>`).join('');
  };

  function sharedTop(){
    const page=current();if(!['homework.html','notices.html'].includes(page))return;
    const bar=document.querySelector('.app-bar');if(!bar)return;
    const title={ 'homework.html':'숙제','notices.html':'공지사항'}[page];
    const left=bar.querySelector('.app-bar-left');if(left){const span=left.querySelector('span');if(span)span.textContent=title;}
    const write=document.getElementById('writeBtn');
    if(page==='notices.html'&&write){write.classList.add('hidden');write.style.display='none';}
    if(page==='homework.html'){const rc=document.getElementById('roleChip');if(rc)rc.style.display='none';}
  }

  function homeNav(){
    if(current()!=='student-home.html')return;
    const old=document.querySelector('.bottom-nav');if(!old)return;
    old.className='tab-bar';old.id='tabBar';old.innerHTML='';
    window.ymsRenderTabBar('student-home.html');
  }

  function run(){sharedTop();homeNav();if(current()!=='student-home.html')window.ymsRenderTabBar(current());}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  setTimeout(run,150);
})();
