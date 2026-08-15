/* YMS admin sidebar + mobile navigation cleanup */
(function(){
  'use strict';

  function hideAttendanceMenu(){
    const sidebar=document.getElementById('adminSidebar');
    if(!sidebar) return;
    sidebar.querySelectorAll('a,button,.admin-nav-item').forEach(el=>{
      const text=(el.textContent||'').replace(/\s+/g,' ').trim();
      const onclick=el.getAttribute('onclick')||'';
      const id=el.id||'';
      if(text.includes('출결 현황') || onclick.includes("switchSection('attendance'") || id==='nav-attendance') el.remove();
    });
  }

  function mobileOnly(){
    return window.matchMedia('(max-width: 767px)').matches;
  }

  function ensureLogoutButton(){
    const topbar=document.querySelector('.admin-topbar');
    if(!topbar) return;
    let btn=document.getElementById('adminMobileLogoutBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.id='adminMobileLogoutBtn';
      btn.type='button';
      btn.innerHTML='<span aria-hidden="true">🚪</span><span>로그아웃</span>';
      btn.addEventListener('click',()=>window.YMS_Auth?.logout?.());
      topbar.appendChild(btn);
    }
    btn.style.setProperty('display',mobileOnly()?'inline-flex':'none','important');
    btn.style.setProperty('align-items','center','important');
    btn.style.setProperty('justify-content','center','important');
    btn.style.setProperty('gap','5px','important');
    btn.style.setProperty('margin-left','auto','important');
    btn.style.setProperty('min-height','38px','important');
    btn.style.setProperty('padding','0 12px','important');
    btn.style.setProperty('border','1px solid #D7DEEC','important');
    btn.style.setProperty('border-radius','12px','important');
    btn.style.setProperty('background','#fff','important');
    btn.style.setProperty('color','#1E3278','important');
    btn.style.setProperty('font-size','12px','important');
    btn.style.setProperty('font-weight','800','important');
    btn.style.setProperty('box-shadow','none','important');
    btn.style.setProperty('white-space','nowrap','important');
    btn.style.setProperty('cursor','pointer','important');
    btn.style.setProperty('z-index','5','important');
  }

  function fixMobileAdmin(){
    hideAttendanceMenu();
    ensureLogoutButton();
    if(!mobileOnly()) return;

    const overlay=document.getElementById('sidebarOverlay');
    if(overlay){
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden','true');
      overlay.style.setProperty('display','none','important');
      overlay.style.setProperty('opacity','0','important');
      overlay.style.setProperty('visibility','hidden','important');
      overlay.style.setProperty('pointer-events','none','important');
      overlay.style.setProperty('background','transparent','important');
      overlay.style.setProperty('backdrop-filter','none','important');
      overlay.style.setProperty('-webkit-backdrop-filter','none','important');
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
      sidebar.style.setProperty('height','calc(72px + env(safe-area-inset-bottom))','important');
      sidebar.style.setProperty('opacity','1','important');
      sidebar.style.setProperty('visibility','visible','important');
      sidebar.style.setProperty('filter','none','important');
      sidebar.style.setProperty('transform','none','important');
      sidebar.style.setProperty('background','rgba(255,255,255,.98)','important');
      sidebar.style.setProperty('border','0','important');
      sidebar.style.setProperty('border-top','1px solid #DDE4F2','important');
      sidebar.style.setProperty('box-shadow','0 -8px 24px rgba(30,50,120,.10)','important');
      sidebar.style.setProperty('overflow-x','auto','important');
      sidebar.style.setProperty('overflow-y','hidden','important');
      sidebar.style.setProperty('z-index','1000','important');
    }

    const nav=sidebar?.querySelector('.admin-nav');
    if(nav){
      nav.style.setProperty('display','flex','important');
      nav.style.setProperty('align-items','center','important');
      nav.style.setProperty('gap','2px','important');
      nav.style.setProperty('width','max-content','important');
      nav.style.setProperty('min-width','100%','important');
      nav.style.setProperty('height','100%','important');
      nav.style.setProperty('padding','6px 7px calc(5px + env(safe-area-inset-bottom))','important');
    }

    sidebar?.querySelectorAll('.admin-sidebar-header,.admin-nav-section').forEach(el=>{
      el.style.setProperty('display','none','important');
    });

    sidebar?.querySelectorAll('.admin-nav-item').forEach(item=>{
      item.style.setProperty('display','flex','important');
      item.style.setProperty('flex-direction','column','important');
      item.style.setProperty('align-items','center','important');
      item.style.setProperty('justify-content','center','important');
      item.style.setProperty('gap','2px','important');
      item.style.setProperty('flex','0 0 72px','important');
      item.style.setProperty('width','72px','important');
      item.style.setProperty('min-width','72px','important');
      item.style.setProperty('min-height','58px','important');
      item.style.setProperty('margin','0','important');
      item.style.setProperty('padding','5px 3px','important');
      item.style.setProperty('white-space','nowrap','important');
      item.style.setProperty('font-size','10px','important');
      item.style.setProperty('line-height','1.15','important');
      item.style.setProperty('text-align','center','important');
      item.style.setProperty('color','#657290','important');
      item.style.setProperty('border-radius','12px','important');
    });

    sidebar?.querySelectorAll('.admin-nav-item .nav-icon').forEach(icon=>{
      icon.style.setProperty('font-size','20px','important');
      icon.style.setProperty('width','auto','important');
      icon.style.setProperty('flex','none','important');
    });

    const main=document.querySelector('.admin-main');
    const content=document.querySelector('.admin-content');
    const layout=document.getElementById('adminLayout');
    [document.documentElement,document.body,layout,main,content].forEach(el=>{
      if(!el) return;
      el.style.setProperty('opacity','1','important');
      el.style.setProperty('filter','none','important');
      el.style.setProperty('visibility','visible','important');
      el.style.setProperty('transform','none','important');
    });
    if(main) main.style.setProperty('margin-left','0','important');
    if(content){
      content.style.setProperty('padding','14px 12px 96px','important');
      content.style.setProperty('background','transparent','important');
    }
    document.body.style.setProperty('padding-bottom','calc(76px + env(safe-area-inset-bottom))','important');
    document.body.style.setProperty('overflow-x','hidden','important');

    const toggle=document.getElementById('menuToggle');
    if(toggle) toggle.style.setProperty('display','none','important');

    window.toggleSidebar=function(){ fixMobileAdmin(); };
    window.closeSidebar=function(){ fixMobileAdmin(); };
  }

  function run(){
    fixMobileAdmin();
    setTimeout(fixMobileAdmin,120);
    setTimeout(fixMobileAdmin,500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run);
  else run();
  window.addEventListener('load',run);
  window.addEventListener('resize',run);
  window.addEventListener('pageshow',run);
})();
