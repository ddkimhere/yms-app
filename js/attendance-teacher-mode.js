/* YMS attendance: teacher mode + unified mobile layout */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/attendance.html')) return;
  const auth=window.YMS_Auth;
  if(!auth?.getUser) return;
  const originalGetUser=auth.getUser.bind(auth);
  const current=originalGetUser();
  const roles=Array.isArray(current?.roles)?current.roles.map(r=>String(r).toUpperCase()):[];
  const hasTeacher=String(current?.role||'').toUpperCase()==='TEACHER'||roles.includes('TEACHER');
  if(!hasTeacher) return;

  auth.getUser=function(){
    const u=originalGetUser();
    if(!u) return u;
    return {...u,role:'TEACHER',roles:Array.isArray(u.roles)?u.roles:['TEACHER']};
  };

  if(typeof window.ymsRenderTabBar!=='function') window.ymsRenderTabBar=function(){return null;};

  if(!document.getElementById('yms-attendance-teacher-style')){
    const s=document.createElement('style');
    s.id='yms-attendance-teacher-style';
    s.textContent=`
      .app-wrapper{max-width:560px!important;background:#F4F7FD!important;padding-bottom:124px!important}
      .app-bar{height:64px!important;min-height:64px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:0 16px!important;margin:0!important;background:#fff!important;border:0!important;border-bottom:1px solid #E3E8F4!important;box-shadow:none!important;position:sticky!important;top:0!important;z-index:500!important}
      .app-bar-left,.app-bar-right{display:flex!important;align-items:center!important;gap:10px!important;min-width:0!important}
      .app-bar-left>span{color:#14245A!important;font-size:19px!important;font-weight:900!important;letter-spacing:-.5px!important;line-height:1.2!important;white-space:nowrap!important}
      .app-bar .icon-btn{width:38px!important;height:38px!important;min-width:38px!important;display:grid!important;place-items:center!important;padding:0!important;margin:0!important;border:0!important;border-radius:12px!important;background:#EEF3FB!important;color:#1E3278!important;font-size:19px!important;line-height:1!important;box-shadow:none!important}
      #roleChip{display:none!important}
      #teacherView{padding:18px 16px calc(116px + env(safe-area-inset-bottom))!important}
      #teacherView .date-select-bar{padding:0!important;margin:0 0 14px!important;display:grid!important;grid-template-columns:1fr!important;gap:8px!important}
      #teacherView .date-select-bar label{font-size:12px!important;font-weight:800!important;color:#7A87A8!important;margin-left:2px!important}
      #teacherView .date-select-bar input[type=date]{width:100%!important;min-height:52px!important;padding:0 16px!important;border:1px solid #D7DEEC!important;border-radius:16px!important;background:#fff!important;color:#1A2340!important;font-size:15px!important;font-weight:700!important;box-shadow:0 3px 12px rgba(30,50,120,.05)!important}
      #teacherView .class-tab-row{padding:0!important;margin:0 0 14px!important;gap:8px!important}
      #teacherView .class-tab{min-height:42px!important;padding:0 16px!important;border:1px solid #D7DEEC!important;border-radius:999px!important;background:#fff!important;color:#7A87A8!important;font-size:12px!important;font-weight:800!important;box-shadow:none!important}
      #teacherView .class-tab.active{background:#1E3278!important;border-color:#1E3278!important;color:#fff!important}
      #teacherView .page-content{padding:0!important}
      #teacherView .section-header{margin:4px 2px 10px!important;display:flex!important;align-items:center!important;justify-content:space-between!important}
      #teacherView .section-title{font-size:16px!important;font-weight:900!important;color:#14245A!important}
      #teacherView .card{border:1px solid #E3E8F4!important;border-radius:18px!important;background:#fff!important;box-shadow:0 3px 12px rgba(30,50,120,.05)!important;padding:8px 14px!important}
      #teacherView #saveAttBtn{min-height:50px!important;border-radius:14px!important;margin-top:12px!important;margin-bottom:24px!important}
      #tabBar.tab-bar{display:none!important}
      @media(max-width:700px){body{padding-bottom:calc(104px + env(safe-area-inset-bottom))!important}}
    `;
    document.head.appendChild(s);
  }

  const str=v=>String(v||'').trim();
  const norm=v=>str(v).toLowerCase();
  function assigned(u){return (Array.isArray(u?.teacherClasses)?u.teacherClasses:String(u?.teacherClasses||'').split(',')).map(str).filter(Boolean);}
  function strict(classes,u){
    const a=assigned(u),uid=str(u?.id||u?.uid),name=norm(u?.name);
    if(a.length){const set=new Set(a);return classes.filter(c=>set.has(str(c.id||c.classId))||set.has(str(c.className)));}
    if(uid){const byId=classes.filter(c=>str(c.teacherId)===uid);if(byId.length)return byId;}
    return name?classes.filter(c=>norm(c.teacherName)===name):[];
  }

  async function rescope(){
    try{
      if(typeof _allClasses==='undefined'||typeof _allStudents==='undefined')return;
      const u=originalGetUser();if(!u)return;
      const r=await _tFetch('tables/classes?limit=200',{cache:'no-store'});if(!r.ok)return;
      const classes=(await r.json()).data||[];
      const mine=strict(classes,u);
      _allClasses.splice(0,_allClasses.length,...mine);
      const ids=new Set(mine.map(c=>str(c.id||c.classId)).filter(Boolean));
      const names=new Set(mine.map(c=>str(c.className)).filter(Boolean));
      const sr=await _tFetch('tables/students?limit=500',{cache:'no-store'});
      if(sr.ok){const students=(await sr.json()).data||[];_allStudents.splice(0,_allStudents.length,...students.filter(s=>ids.has(str(s.classId))||names.has(str(s.className))));}
      if(typeof renderClassTabs==='function')renderClassTabs();
    }catch(e){console.warn('[YMS] 출결 담당 반 필터 실패',e);}
  }

  function clean(){
    const roleChip=document.getElementById('roleChip');if(roleChip) roleChip.style.display='none';
    const right=document.querySelector('.app-bar-right');if(right && !right.querySelector('button:not(.hidden),a:not(.hidden)')) right.style.display='none';
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',clean); else clean();
  window.addEventListener('load',()=>{clean();setTimeout(rescope,150);setTimeout(rescope,700);});
})();