/* YMS teacher mobile UI — unified with parent payment style */
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
  const pageInfo={
    'homework.html':   {icon:'▣', title:'숙제'},
    'notices.html':    {icon:'●', title:'공지사항'},
    'counseling.html': {icon:'💬', title:'상담'},
    'attendance.html': {icon:'✅', title:'출결'}
  }[page];
  if(!pageInfo) return;

  if(!document.getElementById('yms-teacher-mobile-ui-style')){
    const s=document.createElement('style');
    s.id='yms-teacher-mobile-ui-style';
    s.textContent=`
      @media(max-width:700px){
        body{background:#F4F7FD!important;padding-bottom:calc(90px + env(safe-area-inset-bottom))!important}
        .app-wrapper{max-width:560px!important;min-height:100vh!important;background:#F4F7FD!important;padding-bottom:96px!important}

        /* payment-style header */
        .app-bar{
          height:116px!important;min-height:116px!important;
          display:flex!important;align-items:center!important;justify-content:space-between!important;
          gap:14px!important;padding:0 30px!important;margin:0!important;
          background:#fff!important;border:0!important;border-bottom:1px solid #E3E8F4!important;
          box-shadow:none!important;position:sticky!important;top:0!important;z-index:900!important;
        }
        .app-bar-left{display:flex!important;align-items:center!important;gap:18px!important;min-width:0!important;flex:1!important}
        .app-bar-right{display:flex!important;align-items:center!important;gap:8px!important;flex:0 0 auto!important}
        .app-bar .icon-btn{
          width:68px!important;height:68px!important;min-width:68px!important;
          display:grid!important;place-items:center!important;padding:0!important;margin:0!important;
          border:0!important;border-radius:22px!important;background:#EEF3FB!important;
          color:#14245A!important;font-size:31px!important;font-weight:500!important;line-height:1!important;
          box-shadow:none!important;
        }
        .app-bar .yms-teacher-page-icon{font-size:27px!important;line-height:1!important;flex:0 0 auto!important}
        .app-bar-left>span:not(.yms-teacher-page-icon){
          color:#1E3278!important;font-size:29px!important;font-weight:900!important;
          letter-spacing:-1px!important;line-height:1.1!important;white-space:nowrap!important;
        }
        #roleChip{display:none!important}

        /* top action instead of floating FAB */
        .app-bar .yms-teacher-top-action{
          position:static!important;inset:auto!important;transform:none!important;
          width:50px!important;height:50px!important;min-width:50px!important;
          display:grid!important;place-items:center!important;padding:0!important;margin:0!important;
          border:0!important;border-radius:16px!important;background:#1E3278!important;color:#fff!important;
          box-shadow:none!important;font-size:21px!important;z-index:auto!important;
        }
        .app-bar .yms-teacher-top-action:hover{transform:none!important}

        /* content rhythm like the tuition page */
        .filter-scroll{padding:26px 28px 4px!important;gap:12px!important}
        .filter-chip,.class-tab{
          min-height:54px!important;padding:0 22px!important;border:1px solid #D8DFEE!important;
          border-radius:999px!important;background:#fff!important;color:#7A87A8!important;
          font-size:14px!important;font-weight:800!important;box-shadow:0 1px 4px rgba(30,50,120,.03)!important;
        }
        .filter-chip.active,.class-tab.active{background:#1E3278!important;border-color:#1E3278!important;color:#fff!important}
        .page-content{padding-left:28px!important;padding-right:28px!important}

        /* attendance follows the same header/content spacing */
        #teacherView{padding:26px 28px 0!important}
        #teacherView .date-select-bar{padding:0!important;margin:0 0 18px!important;display:grid!important;grid-template-columns:1fr!important;gap:9px!important}
        #teacherView .date-select-bar label{font-size:13px!important;font-weight:800!important;color:#7A87A8!important;margin:0 0 0 2px!important}
        #teacherView .date-select-bar input[type=date]{
          width:100%!important;min-height:58px!important;padding:0 18px!important;
          border:1px solid #D8DFEE!important;border-radius:18px!important;background:#fff!important;
          color:#1A2340!important;font-size:16px!important;font-weight:700!important;box-shadow:none!important;
        }
        #teacherView .class-tab-row{padding:0!important;margin:0 0 18px!important;gap:10px!important}
        #teacherView .page-content{padding:0!important}
        #teacherView .section-header{margin:4px 2px 12px!important}
        #teacherView .section-title{font-size:18px!important;font-weight:900!important;color:#14245A!important}
        #teacherView .card{border:1px solid #E3E8F4!important;border-radius:20px!important;background:#fff!important;box-shadow:0 2px 10px rgba(30,50,120,.04)!important}
        #teacherView #saveAttBtn{min-height:52px!important;border-radius:16px!important;margin-bottom:18px!important}
        #tabBar.tab-bar{display:none!important}
      }
    `;
    document.head.appendChild(s);
  }

  function setupHeader(){
    const bar=document.querySelector('.app-bar');
    const left=bar?.querySelector('.app-bar-left');
    if(!bar||!left) return;

    const role=document.getElementById('roleChip');
    if(role) role.style.display='none';

    const back=left.querySelector('.icon-btn');
    const oldTitle=[...left.querySelectorAll('span')].find(el=>!el.classList.contains('yms-teacher-page-icon'));
    if(oldTitle) oldTitle.textContent=pageInfo.title;

    if(!left.querySelector('.yms-teacher-page-icon')){
      const icon=document.createElement('span');
      icon.className='yms-teacher-page-icon';
      icon.textContent=pageInfo.icon;
      if(oldTitle) left.insertBefore(icon,oldTitle);
      else left.appendChild(icon);
    }

    if(back) back.setAttribute('aria-label','뒤로가기');

    const right=bar.querySelector('.app-bar-right') || (()=>{const r=document.createElement('div');r.className='app-bar-right';bar.appendChild(r);return r;})();

    /* Move teacher write/register FAB into the header. */
    const fab=document.getElementById('fabBtn') || document.querySelector('button.fab');
    if(fab && !right.contains(fab)){
      fab.classList.add('yms-teacher-top-action');
      fab.title=fab.title||'작성';
      right.appendChild(fab);
    }

    /* Existing write/action buttons use the same compact style. */
    [...right.querySelectorAll('button')].forEach(btn=>{
      if(btn.id!=='roleChip') btn.classList.add('yms-teacher-top-action');
    });
  }

  function keepHeaderSynced(){
    setupHeader();
    const fab=document.getElementById('fabBtn');
    if(fab){
      const obs=new MutationObserver(setupHeader);
      obs.observe(fab,{attributes:true,attributeFilter:['class','style']});
    }
    setTimeout(setupHeader,50);
    setTimeout(setupHeader,250);
    setTimeout(setupHeader,800);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',keepHeaderSynced);
  else keepHeaderSynced();
  window.addEventListener('load',setupHeader);
})();
