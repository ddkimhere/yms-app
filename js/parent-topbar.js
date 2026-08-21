/* YMS parent screens — unified top bar */
(function(){
  'use strict';
  const user=window.YMS_Auth?.getUser?.();
  if(String(user?.role||'').toUpperCase()!=='PARENT') return;

  const style=document.createElement('style');
  style.id='yms-parent-topbar-style';
  style.textContent=`
    .app-wrapper{background:#F4F7FD!important}
    .app-bar{
      height:64px!important;min-height:64px!important;
      display:flex!important;align-items:center!important;justify-content:space-between!important;
      padding:0 16px!important;margin:0!important;
      background:#fff!important;border:0!important;border-bottom:1px solid #E3E8F4!important;
      box-shadow:none!important;position:sticky!important;top:0!important;z-index:500!important;
    }
    .app-bar-left,.app-bar-right{display:flex!important;align-items:center!important;gap:10px!important;min-width:0!important}
    .app-bar-left>span{
      color:#14245A!important;font-size:19px!important;font-weight:900!important;
      letter-spacing:-.5px!important;line-height:1.2!important;white-space:nowrap!important;
    }
    .app-bar .icon-btn{
      width:38px!important;height:38px!important;min-width:38px!important;
      display:grid!important;place-items:center!important;padding:0!important;margin:0!important;
      border:0!important;border-radius:12px!important;background:#EEF3FB!important;
      color:#1E3278!important;font-size:19px!important;line-height:1!important;box-shadow:none!important;
    }
    .app-bar #roleChip{display:none!important}

    .top{
      height:64px!important;min-height:64px!important;display:flex!important;align-items:center!important;
      gap:10px!important;padding:0 16px!important;background:#fff!important;
      border-bottom:1px solid #E3E8F4!important;position:sticky!important;top:0!important;z-index:500!important;
    }
    .top .back{
      width:38px!important;height:38px!important;min-width:38px!important;border:0!important;
      border-radius:12px!important;background:#EEF3FB!important;color:#1E3278!important;
      font-size:19px!important;display:grid!important;place-items:center!important;padding:0!important;
    }
    .top .title{font-size:19px!important;font-weight:900!important;color:#14245A!important;letter-spacing:-.5px!important}
  `;
  if(!document.getElementById(style.id)) document.head.appendChild(style);

  function goParentHome(){
    if(typeof window._ymsGo==='function') window._ymsGo('parent-home.html');
    else location.href='parent-home.html';
  }

  function bindBack(btn){
    if(!btn||btn.dataset.ymsParentBack==='1') return;
    const text=(btn.textContent||'').trim();
    const inline=btn.getAttribute('onclick')||'';
    if(text!=='←'&&!inline.includes('history.back')) return;
    btn.removeAttribute('onclick');
    btn.dataset.ymsParentBack='1';
    btn.setAttribute('aria-label','학부모 홈으로');
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      goParentHome();
    });
  }

  function clean(){
    const roleChip=document.getElementById('roleChip');
    if(roleChip) roleChip.style.display='none';

    const right=document.querySelector('.app-bar-right');
    if(right && !right.querySelector('button:not(.hidden),a:not(.hidden)')) right.style.display='none';

    // Parent pages always return to the parent home instead of browser history.
    document.querySelectorAll('.app-bar .icon-btn,.top .back').forEach(bindBack);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',clean);
  else clean();
  window.addEventListener('load',clean);
  window.addEventListener('pageshow',clean);
})();
