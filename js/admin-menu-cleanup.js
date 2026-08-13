/* YMS admin sidebar cleanup */
(function(){
  'use strict';
  function hideAttendanceMenu(){
    const sidebar=document.getElementById('adminSidebar');
    if(!sidebar) return;
    const candidates=sidebar.querySelectorAll('a,button,.admin-nav-item');
    candidates.forEach(el=>{
      const text=(el.textContent||'').replace(/\s+/g,' ').trim();
      const onclick=el.getAttribute('onclick')||'';
      const id=el.id||'';
      if(text.includes('출결 현황') || onclick.includes("switchSection('attendance'") || id==='nav-attendance'){
        el.remove();
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',hideAttendanceMenu);
  else hideAttendanceMenu();
  window.addEventListener('load',hideAttendanceMenu);
})();
