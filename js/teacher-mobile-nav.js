/* YMS teacher mobile bottom navigation */
(function(){
  'use strict';
  const u=window.YMS_Auth?.getUser?.();
  const isTeacher=!!u&&(String(u.role||'').toUpperCase()==='TEACHER'||window.YMS_Roles?.has?.(u,'TEACHER')||(Array.isArray(u.roles)&&u.roles.map(r=>String(r).toUpperCase()).includes('TEACHER')));
  if(!isTeacher)return;

  const path=location.pathname.split('/').pop()||'';
  const active=path==='teacher-home.html'?'teacher-home.html':path;

  if(!document.getElementById('yms-teacher-mobile-nav-style')){
    const s=document.createElement('style');
    s.id='yms-teacher-mobile-nav-style';
    s.textContent=`
      #teacherMobileNav{display:none}
      @media(max-width:700px){
        body{padding-bottom:calc(94px + env(safe-area-inset-bottom))!important}
        .teacher-page,.app-wrapper{padding-bottom:96px!important}
        #teacherMobileNav{
          position:fixed;left:50%;bottom:0;transform:translateX(-50%);
          width:min(100%,560px);height:88px;
          padding:10px 18px calc(9px + env(safe-area-inset-bottom));
          display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:stretch;
          background:#fff;border-top:1px solid #E3E8F4;box-shadow:none;
          z-index:99999;
        }
        #teacherMobileNav .tmn-btn{
          appearance:none;-webkit-appearance:none;border:0;background:transparent;color:#94A0B8;text-decoration:none;
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;
          padding:5px 0;margin:0;min-width:0;
          font-family:-apple-system,BlinkMacSystemFont,'Noto Sans KR','Segoe UI',sans-serif;font-weight:800;
        }
        #teacherMobileNav .tmn-btn .ico{font-size:25px;line-height:1;font-weight:700}
        #teacherMobileNav .tmn-btn small{font-size:12px;line-height:1;color:inherit;white-space:nowrap;font-weight:850}
        #teacherMobileNav .tmn-btn.active{color:#1E3278}
      }
    `;
    document.head.appendChild(s);
  }

  let nav=document.getElementById('teacherMobileNav');
  if(!nav){nav=document.createElement('nav');nav.id='teacherMobileNav';document.body.appendChild(nav);}
  const tabs=[
    ['teacher-home.html','⌂','홈'],
    ['homework.html','▣','숙제'],
    ['notices.html','●','공지'],
    ['counseling.html','💬','상담']
  ];
  nav.innerHTML=tabs.map(([href,icon,label])=>`<a class="tmn-btn ${active===href?'active':''}" href="${href}"><span class="ico">${icon}</span><small>${label}</small></a>`).join('');
})();
