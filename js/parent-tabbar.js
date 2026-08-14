/* YMS parent 5-tab navigation */
(function(){
  'use strict';
  const user=window.YMS_Auth?.getUser?.();
  if(String(user?.role||'').toUpperCase()!=='PARENT') return;
  window.ymsRenderTabBar=function(active){
    const bar=document.getElementById('tabBar');
    if(!bar) return;
    const tabs=[
      ['parent-home.html','⌂','홈'],
      ['homework.html','▣','숙제'],
      ['notices.html','●','공지'],
      ['parent-payment.html','💳','수강료'],
      ['counseling.html','💬','상담']
    ];
    bar.style.gridTemplateColumns='repeat(5,1fr)';
    bar.innerHTML=tabs.map(([href,icon,label])=>`<button type="button" class="parent-tab ${active===href?'active':''}" onclick="_ymsGo('${href}')"><span>${icon}</span><small>${label}</small></button>`).join('');
  };
})();
