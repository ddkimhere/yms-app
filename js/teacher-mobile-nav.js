/* YMS teacher mobile bottom navigation */
(function(){
  'use strict';
  const u=window.YMS_Auth?.getUser?.();
  const isTeacher=!!u&&(String(u.role||'').toUpperCase()==='TEACHER'||window.YMS_Roles?.has?.(u,'TEACHER'));
  if(!isTeacher)return;

  const path=location.pathname.split('/').pop()||'';
  const active=path==='teacher-home.html'?'teacher-home.html':path;

  if(!document.getElementById('yms-teacher-mobile-nav-style')){
    const s=document.createElement('style');
    s.id='yms-teacher-mobile-nav-style';
    s.textContent=`
      #teacherMobileNav{display:none}
      @media(max-width:700px){
        body{padding-bottom:calc(78px + env(safe-area-inset-bottom))!important}
        .teacher-page,.app-wrapper{padding-bottom:80px!important}
        #teacherMobileNav{position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:min(100%,560px);height:72px;padding:7px 8px calc(7px + env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:rgba(255,255,255,.98);border-top:1px solid #E3E8F4;box-shadow:0 -4px 18px rgba(30,50,120,.08);z-index:99999;backdrop-filter:blur(12px)}
        #teacherMobileNav .tmn-btn{appearance:none;-webkit-appearance:none;border:0;background:transparent;color:#8A96B2;text-decoration:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:4px 0;margin:0;min-width:0;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans KR','Segoe UI',sans-serif;font-weight:750}
        #teacherMobileNav .tmn-btn .ico{font-size:20px;line-height:1}
        #teacherMobileNav .tmn-btn small{font-size:10px;line-height:1.1;color:inherit;white-space:nowrap}
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
