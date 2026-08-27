/* YMS admin dashboard — remove legacy counseling widgets */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  function removeByText(selector,text){
    document.querySelectorAll(selector).forEach(el=>{
      if((el.textContent||'').includes(text)) el.remove();
    });
  }

  function cleanup(){
    const dash=document.getElementById('section-dashboard');
    if(!dash) return;

    // Remove the legacy "상담 대기" summary card.
    removeByText('#section-dashboard .admin-stat-card','상담 대기');

    // Remove the legacy counseling shortcut that opens the old inquiry list.
    removeByText('#section-dashboard a, #section-dashboard button, #section-dashboard .quick-card, #section-dashboard .dashboard-quick-card','상담 목록');
  }

  const run=()=>{cleanup();setTimeout(cleanup,150);setTimeout(cleanup,600);};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();

  const dash=document.getElementById('section-dashboard');
  if(dash){
    new MutationObserver(cleanup).observe(dash,{childList:true,subtree:true});
  }
})();
