/* YMS teacher mobile chrome: top bar + bottom navigation */
(function(){
  'use strict';

  const u=window.YMS_Auth?.getUser?.();
  const isTeacher=!!u&&(
    String(u.role||'').toUpperCase()==='TEACHER'||
    window.YMS_Roles?.has?.(u,'TEACHER')||
    (Array.isArray(u.roles)&&u.roles.map(r=>String(r).toUpperCase()).includes('TEACHER'))
  );
  if(!isTeacher)return;

  const path=(location.pathname.split('/').pop()||'').toLowerCase();
  const mode=String(new URLSearchParams(location.search).get('mode')||'').toLowerCase();
  const primary=String(u.role||'').toUpperCase();
  if(path==='attendance.html'&&(mode==='admin'||(primary==='ADMIN'&&mode!=='teacher')))return;

  const pageInfo={
    'homework.html':{icon:'▣',title:'숙제'},
    'notices.html':{icon:'●',title:'공지사항'},
    'counseling.html':{icon:'💬',title:'상담'},
    'attendance.html':{icon:'✅',title:'출결'}
  }[path]||null;

  if(!document.getElementById('yms-teacher-mobile-chrome-style')){
    const s=document.createElement('style');
    s.id='yms-teacher-mobile-chrome-style';
    s.textContent=`
      #teacherMobileNav{display:none}
      @media(max-width:700px){
        :root{--yms-teacher-nav-safe:calc(132px + env(safe-area-inset-bottom))}
        html{scroll-padding-bottom:var(--yms-teacher-nav-safe)!important}
        body{margin:0!important;background:#F4F7FD!important;padding-bottom:var(--yms-teacher-nav-safe)!important;min-height:100dvh!important}
        .teacher-page,.app-wrapper,.student-app{min-height:100dvh!important;padding-bottom:var(--yms-teacher-nav-safe)!important}
        .app-wrapper{max-width:560px!important;margin:0 auto!important;background:#F4F7FD!important}
        .teacher-main,.page-content,#teacherView,#parentView,main.content{scroll-margin-bottom:var(--yms-teacher-nav-safe)!important}
        .teacher-main> :last-child,.page-content> :last-child,#teacherView> :last-child,#parentView> :last-child,main.content> :last-child{margin-bottom:34px!important}

        .app-bar{height:68px!important;min-height:68px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:0 18px!important;margin:0!important;background:#fff!important;border:0!important;border-bottom:1px solid #E3E8F4!important;box-shadow:none!important;position:sticky!important;top:0!important;z-index:500!important}
        .app-bar-left{display:flex!important;align-items:center!important;gap:12px!important;min-width:0!important;flex:1!important}
        .app-bar-right{display:flex!important;align-items:center!important;gap:8px!important;flex:0 0 auto!important}
        .app-bar .icon-btn{border:0!important;background:#EEF3FB!important;width:40px!important;height:40px!important;min-width:40px!important;border-radius:12px!important;font-size:18px!important;color:#14245A!important;display:grid!important;place-items:center!important;padding:0!important;margin:0!important;box-shadow:none!important}
        .app-bar .yms-teacher-page-icon{font-size:18px!important;line-height:1!important;flex:0 0 auto!important}
        .app-bar-left>span:not(.yms-teacher-page-icon){font-size:18px!important;font-weight:900!important;color:#14245A!important;letter-spacing:0!important;line-height:1.2!important;white-space:nowrap!important}
        #roleChip{display:none!important}
        .filter-scroll,#teacherView{padding-top:18px!important}
        .app-bar .fab{position:fixed!important}
        #tabBar.tab-bar{display:none!important}

        body.yms-teacher-attendance{padding-bottom:calc(150px + env(safe-area-inset-bottom))!important}
        body.yms-teacher-attendance .app-wrapper{padding-bottom:calc(150px + env(safe-area-inset-bottom))!important}
        body.yms-teacher-attendance #teacherView{padding-bottom:calc(120px + env(safe-area-inset-bottom))!important}
        body.yms-teacher-attendance #teacherView .page-content{padding-bottom:calc(112px + env(safe-area-inset-bottom))!important}
        body.yms-teacher-attendance #saveAttBtn{margin-bottom:22px!important}

        #teacherMobileNav{box-sizing:border-box;position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:min(100%,560px);height:calc(82px + env(safe-area-inset-bottom));padding:8px 18px calc(8px + env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:stretch;background:#fff;border-top:1px solid #E3E8F4;box-shadow:0 -3px 14px rgba(30,50,120,.05);z-index:99999}
        #teacherMobileNav .tmn-btn{appearance:none;-webkit-appearance:none;border:0;background:transparent;color:#94A0B8;text-decoration:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:4px 0;margin:0;min-width:0;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans KR','Segoe UI',sans-serif;font-weight:800}
        #teacherMobileNav .tmn-btn .ico{font-size:23px;line-height:1;font-weight:700}
        #teacherMobileNav .tmn-btn small{font-size:11px;line-height:1;color:inherit;white-space:nowrap;font-weight:850}
        #teacherMobileNav .tmn-btn.active{color:#1E3278}
      }
    `;
    document.head.appendChild(s);
  }

  function setupPageChrome(){
    if(path==='attendance.html')document.body.classList.add('yms-teacher-attendance');
    if(!pageInfo)return;

    const bar=document.querySelector('.app-bar');
    const left=bar?.querySelector('.app-bar-left');
    if(!bar||!left)return;

    document.getElementById('roleChip')?.style.setProperty('display','none');
    const title=[...left.querySelectorAll('span')].find(el=>!el.classList.contains('yms-teacher-page-icon'));
    if(title)title.textContent=pageInfo.title;

    if(!left.querySelector('.yms-teacher-page-icon')){
      const icon=document.createElement('span');
      icon.className='yms-teacher-page-icon';
      icon.textContent=pageInfo.icon;
      if(title)left.insertBefore(icon,title);else left.appendChild(icon);
    }

    const right=bar.querySelector('.app-bar-right');
    if(right&&!right.querySelector('button:not(#roleChip):not(.hidden),a:not(.hidden)'))right.style.display='none';
  }

  function installNav(){
    let nav=document.getElementById('teacherMobileNav');
    if(!nav){nav=document.createElement('nav');nav.id='teacherMobileNav';document.body.appendChild(nav);}
    const active=path==='teacher-home.html'?'teacher-home.html':path;
    const tabs=[
      ['teacher-home.html','⌂','홈'],
      ['homework.html','▣','숙제'],
      ['notices.html','●','공지'],
      ['counseling.html','💬','상담']
    ];
    nav.innerHTML=tabs.map(([href,icon,label])=>`<a class="tmn-btn ${active===href?'active':''}" href="${href}"><span class="ico">${icon}</span><small>${label}</small></a>`).join('');
  }

  function setup(){setupPageChrome();installNav();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
  window.addEventListener('load',setup,{once:true});
})();
