/* YMS teacher mobile UI — match parent payment chrome exactly */
(function(){
  'use strict';

  const u=window.YMS_Auth?.getUser?.();
  const isTeacher=!!u && (
    String(u.role||'').toUpperCase()==='TEACHER' ||
    window.YMS_Roles?.has?.(u,'TEACHER') ||
    (Array.isArray(u.roles) && u.roles.map(r=>String(r).toUpperCase()).includes('TEACHER'))
  );
  if(!isTeacher) return;

  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  const info={
    'homework.html':   {icon:'▣', title:'숙제'},
    'notices.html':    {icon:'●', title:'공지사항'},
    'counseling.html': {icon:'💬', title:'상담'},
    'attendance.html': {icon:'✅', title:'출결'}
  }[page];
  if(!info) return;

  if(!document.getElementById('yms-teacher-mobile-ui-style')){
    const s=document.createElement('style');
    s.id='yms-teacher-mobile-ui-style';
    s.textContent=`
      @media(max-width:700px){
        body{margin:0!important;background:#F4F7FD!important;padding-bottom:88px!important}
        .app-wrapper{max-width:560px!important;margin:0 auto!important;min-height:100vh!important;background:#F4F7FD!important;padding-bottom:88px!important}

        .app-bar{
          height:68px!important;min-height:68px!important;
          display:flex!important;align-items:center!important;justify-content:space-between!important;
          gap:12px!important;padding:0 18px!important;margin:0!important;
          background:#fff!important;border:0!important;border-bottom:1px solid #E3E8F4!important;
          box-shadow:none!important;position:sticky!important;top:0!important;z-index:500!important;
        }
        .app-bar-left{display:flex!important;align-items:center!important;gap:12px!important;min-width:0!important;flex:1!important}
        .app-bar-right{display:flex!important;align-items:center!important;gap:8px!important;flex:0 0 auto!important}
        .app-bar .icon-btn{
          border:0!important;background:#EEF3FB!important;width:40px!important;height:40px!important;min-width:40px!important;
          border-radius:12px!important;font-size:18px!important;color:#14245A!important;
          display:grid!important;place-items:center!important;padding:0!important;margin:0!important;box-shadow:none!important;
        }
        .app-bar .yms-teacher-page-icon{font-size:18px!important;line-height:1!important;flex:0 0 auto!important}
        .app-bar-left>span:not(.yms-teacher-page-icon){font-size:18px!important;font-weight:900!important;color:#14245A!important;letter-spacing:0!important;line-height:1.2!important;white-space:nowrap!important}
        #roleChip{display:none!important}

        /* Keep each page's original content/function layout. */
        .filter-scroll{padding-top:18px!important}
        #teacherView{padding-top:18px!important}

        /* Attendance needs extra room above the fixed teacher bottom navigation. */
        body.yms-teacher-attendance{padding-bottom:calc(150px + env(safe-area-inset-bottom))!important}
        body.yms-teacher-attendance .app-wrapper{padding-bottom:calc(150px + env(safe-area-inset-bottom))!important}
        body.yms-teacher-attendance #teacherView{padding-bottom:calc(120px + env(safe-area-inset-bottom))!important}
        body.yms-teacher-attendance #teacherView .page-content{padding-bottom:calc(112px + env(safe-area-inset-bottom))!important}
        body.yms-teacher-attendance #saveAttBtn{margin-bottom:22px!important}

        /* Do not move the homework write FAB into the header. */
        .app-bar .fab{position:fixed!important}
        #tabBar.tab-bar{display:none!important}
      }
    `;
    document.head.appendChild(s);
  }

  function setup(){
    if(page==='attendance.html') document.body.classList.add('yms-teacher-attendance');

    const bar=document.querySelector('.app-bar');
    const left=bar?.querySelector('.app-bar-left');
    if(!bar||!left) return;

    const role=document.getElementById('roleChip');
    if(role) role.style.display='none';

    const title=[...left.querySelectorAll('span')].find(el=>!el.classList.contains('yms-teacher-page-icon'));
    if(title) title.textContent=info.title;

    if(!left.querySelector('.yms-teacher-page-icon')){
      const icon=document.createElement('span');
      icon.className='yms-teacher-page-icon';
      icon.textContent=info.icon;
      if(title) left.insertBefore(icon,title);
      else left.appendChild(icon);
    }

    const right=bar.querySelector('.app-bar-right');
    if(right){
      const roleEl=right.querySelector('#roleChip');
      if(roleEl) roleEl.style.display='none';
      if(!right.querySelector('button:not(#roleChip):not(.hidden),a:not(.hidden)')) right.style.display='none';
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup);
  else setup();
  window.addEventListener('load',setup);
  setTimeout(setup,100);
  setTimeout(setup,500);
})();
