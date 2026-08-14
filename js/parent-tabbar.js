/* YMS parent 5-tab navigation + mobile styling */
(function(){
  'use strict';
  const user=window.YMS_Auth?.getUser?.();
  if(String(user?.role||'').toUpperCase()!=='PARENT') return;

  if(!document.getElementById('yms-parent-tabbar-style')){
    const css=document.createElement('style');
    css.id='yms-parent-tabbar-style';
    css.textContent=`
      body{padding-bottom:calc(78px + env(safe-area-inset-bottom))!important}
      .app-wrapper{max-width:560px!important;margin:0 auto!important;padding-bottom:82px!important;min-height:100vh!important}
      .tab-bar{position:fixed!important;left:50%!important;bottom:0!important;transform:translateX(-50%)!important;width:min(100%,560px)!important;height:70px!important;padding:7px 8px calc(7px + env(safe-area-inset-bottom))!important;display:grid!important;grid-template-columns:repeat(5,1fr)!important;background:rgba(255,255,255,.98)!important;border-top:1px solid #E3E8F4!important;box-shadow:0 -4px 16px rgba(30,50,120,.06)!important;z-index:1000!important;backdrop-filter:blur(12px)!important}
      .parent-tab{appearance:none!important;border:0!important;background:transparent!important;color:#8A96B2!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;padding:3px 0!important;margin:0!important;font:inherit!important;cursor:pointer!important;min-width:0!important;box-shadow:none!important}
      .parent-tab>span{font-size:19px!important;line-height:1!important}.parent-tab>small{font-size:9px!important;font-weight:750!important;line-height:1.2!important;white-space:nowrap!important}.parent-tab.active{color:#1E3278!important}
    `;
    document.head.appendChild(css);
  }

  window.ymsRenderTabBar=function(active){
    let bar=document.getElementById('tabBar');
    if(!bar){bar=document.createElement('nav');bar.id='tabBar';bar.className='tab-bar';document.body.appendChild(bar);}
    const tabs=[
      ['parent-home.html','⌂','홈'],
      ['homework.html','▣','숙제'],
      ['notices.html','●','공지'],
      ['parent-payment.html','💳','수강료'],
      ['counseling.html','💬','상담']
    ];
    bar.className='tab-bar';
    bar.innerHTML=tabs.map(([href,icon,label])=>`<button type="button" class="parent-tab ${active===href?'active':''}" onclick="_ymsGo('${href}')"><span>${icon}</span><small>${label}</small></button>`).join('');
  };
})();
