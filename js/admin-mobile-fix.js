/* YMS admin mobile layout hardening */
(function(){
  'use strict';

  function applyMobileFix(){
    if(!location.pathname.endsWith('/admin.html')) return;
    if(!window.matchMedia('(max-width: 767px)').matches) return;

    const overlay=document.getElementById('sidebarOverlay');
    if(overlay){
      overlay.classList.remove('show');
      overlay.style.setProperty('display','none','important');
      overlay.style.setProperty('pointer-events','none','important');
      overlay.style.setProperty('opacity','0','important');
    }

    const sidebar=document.getElementById('adminSidebar');
    if(sidebar){
      sidebar.classList.remove('open');
      sidebar.style.setProperty('position','fixed','important');
      sidebar.style.setProperty('left','0','important');
      sidebar.style.setProperty('right','0','important');
      sidebar.style.setProperty('top','auto','important');
      sidebar.style.setProperty('bottom','0','important');
      sidebar.style.setProperty('width','100%','important');
      sidebar.style.setProperty('height','calc(70px + env(safe-area-inset-bottom))','important');
      sidebar.style.setProperty('opacity','1','important');
      sidebar.style.setProperty('filter','none','important');
      sidebar.style.setProperty('transform','none','important');
      sidebar.style.setProperty('z-index','1000','important');
    }

    const main=document.querySelector('.admin-main');
    const content=document.querySelector('.admin-content');
    const layout=document.getElementById('adminLayout');
    [main,content,layout,document.body].forEach(el=>{
      if(!el) return;
      el.style.setProperty('opacity','1','important');
      el.style.setProperty('filter','none','important');
      el.style.setProperty('visibility','visible','important');
    });
    if(main) main.style.setProperty('margin-left','0','important');
    document.body.style.setProperty('padding-bottom','calc(82px + env(safe-area-inset-bottom))','important');

    const menuToggle=document.getElementById('menuToggle');
    if(menuToggle) menuToggle.style.setProperty('display','none','important');
  }

  function lockCloseSidebar(){
    if(!window.matchMedia('(max-width: 767px)').matches) return;
    window.closeSidebar=function(){
      const overlay=document.getElementById('sidebarOverlay');
      const sidebar=document.getElementById('adminSidebar');
      if(overlay){overlay.classList.remove('show');overlay.style.setProperty('display','none','important');}
      if(sidebar){sidebar.classList.remove('open');sidebar.style.setProperty('bottom','0','important');sidebar.style.setProperty('top','auto','important');}
    };
    window.toggleSidebar=function(){ applyMobileFix(); };
  }

  const run=()=>{applyMobileFix();lockCloseSidebar();};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run);
  else run();
  window.addEventListener('load',run);
  window.addEventListener('resize',run);
  setTimeout(run,300);
  setTimeout(run,1200);
})();
