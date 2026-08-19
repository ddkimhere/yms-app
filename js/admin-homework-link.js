/* YMS admin homework navigation */
(function(){
  'use strict';
  function go(p){
    if(typeof window._ymsGo==='function') return window._ymsGo(p);
    location.href=p;
  }
  function install(){
    if(!location.pathname.endsWith('/admin.html')) return;
    const nav=document.querySelector('#adminSidebar .admin-nav');
    if(!nav||document.getElementById('nav-homework-admin')) return;
    const item=document.createElement('button');
    item.type='button';
    item.id='nav-homework-admin';
    item.className='admin-nav-item';
    item.innerHTML='<span class="nav-icon">📖</span> 숙제 관리';
    item.addEventListener('click',()=>go('homework.html'));
    const teacher=document.getElementById('nav-teachers');
    if(teacher&&teacher.parentNode===nav) nav.insertBefore(item,teacher);
    else {
      const groups=nav.querySelectorAll('.admin-nav-section');
      const op=groups.length>1?groups[1]:null;
      if(op) nav.insertBefore(item,op); else nav.appendChild(item);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.addEventListener('load',()=>setTimeout(install,250));
})();
