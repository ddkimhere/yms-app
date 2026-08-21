/* YMS attendance: teacher/admin mode + unified mobile layout */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/attendance.html')) return;
  const auth=window.YMS_Auth;
  if(!auth?.getUser) return;

  const params=new URLSearchParams(location.search);
  const requestedMode=String(params.get('mode')||'').toLowerCase();
  const originalGetUser=auth.getUser.bind(auth);
  const current=originalGetUser();
  const primary=String(current?.role||'').toUpperCase();
  const roles=Array.isArray(current?.roles)?current.roles.map(r=>String(r).toUpperCase()):[];
  const hasTeacher=primary==='TEACHER'||roles.includes('TEACHER');
  const isAdmin=primary==='ADMIN';
  const adminMode=requestedMode==='admin'||(isAdmin&&requestedMode!=='teacher');
  const teacherMode=!adminMode&&(requestedMode==='teacher'||primary==='TEACHER'||hasTeacher);

  if(teacherMode&&hasTeacher){
    auth.getUser=function(){
      const u=originalGetUser();
      if(!u) return u;
      return {...u,role:'TEACHER',roles:Array.isArray(u.roles)?u.roles:['TEACHER']};
    };
  }

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
  const norm=v=>str(v).toLowerCase().replace(/\s+/g,'');

  function assigned(u){
    return (Array.isArray(u?.teacherClasses)?u.teacherClasses:String(u?.teacherClasses||'').split(','))
      .map(str).filter(Boolean);
  }

  function strict(classes,u){
    const a=assigned(u),uid=str(u?.id||u?.uid),name=norm(u?.name);
    if(a.length){
      return classes.filter(c=>a.some(x=>str(x)===str(c.id||c.classId)||norm(x)===norm(c.className||c.name)));
    }
    if(uid){
      const byId=classes.filter(c=>str(c.teacherId)===uid);
      if(byId.length) return byId;
    }
    return name?classes.filter(c=>norm(c.teacherName)===name):[];
  }

  function classMatchesStudent(cls,s){
    const cid=str(cls?.id||cls?.classId),sid=str(s?.classId);
    if(cid&&sid&&cid===sid) return true;
    const cn=norm(cls?.className||cls?.name),sn=norm(s?.className);
    return !!cn&&!!sn&&cn===sn;
  }

  async function fetchData(path){
    try{
      const r=await _tFetch(path,{cache:'no-store'});
      if(!r.ok) return [];
      return (await r.json()).data||[];
    }catch{return [];}
  }

  let scoped=false;
  async function rescopeOnce(){
    if(!teacherMode||scoped) return;
    scoped=true;
    try{
      if(typeof _allClasses==='undefined'||typeof _allStudents==='undefined'){
        scoped=false;
        return;
      }
      const u=originalGetUser();
      if(!u) return;
      const [classes,students]=await Promise.all([
        fetchData('tables/classes?limit=300'),
        fetchData('tables/students?limit=1000')
      ]);
      const mine=strict(classes,u);
      const roster=students.filter(s=>s.isActive!==false&&mine.some(c=>classMatchesStudent(c,s)));
      _allClasses.splice(0,_allClasses.length,...mine);
      _allStudents.splice(0,_allStudents.length,...roster);
      if(typeof renderClassTabs==='function') renderClassTabs();
    }catch(e){
      scoped=false;
      console.warn('[YMS] 출결 담당 반 필터 실패',e);
    }
  }

  function clean(){
    const roleChip=document.getElementById('roleChip');
    if(roleChip) roleChip.style.display='none';
    const right=document.querySelector('.app-bar-right');
    if(right&&!right.querySelector('button:not(.hidden),a:not(.hidden)')) right.style.display='none';
  }

  function installVerifiedSave(){
    if(typeof window.submitTeacherAtt!=='function'||window.submitTeacherAtt.__ymsVerified) return;
    const verified=async function(){
      const saveBtn=document.getElementById('saveAttBtn');
      if(!saveBtn)return;
      saveBtn.disabled=true;
      saveBtn.textContent='저장 중...';

      try{
        const cls=(typeof _allClasses!=='undefined'&&Array.isArray(_allClasses))?_allClasses.find(c=>String(c.id||c.classId||'')===String(currentClassId||'')):null;
        if(!cls)throw new Error('반 정보를 찾을 수 없습니다.');
        const rows=Array.from(document.querySelectorAll('#teacherStudentList .att-student-row'));
        if(!rows.length)throw new Error('저장할 학생이 없습니다.');

        let success=0;
        for(const row of rows){
          const studentId=String(row.dataset.studentId||'');
          const existingId=String(row.dataset.existingId||'');
          const status=(typeof teacherAttStatus!=='undefined'&&teacherAttStatus[studentId])||'PRESENT';
          const stu=(typeof _allStudents!=='undefined'&&Array.isArray(_allStudents))?_allStudents.find(s=>String(s.id||'')===studentId):null;
          let res;
          if(existingId){
            res=await _tFetch(`tables/attendance/${encodeURIComponent(existingId)}`,{
              method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})
            });
          }else{
            res=await _tFetch('tables/attendance',{
              method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
                studentId,studentName:stu?.name||'',classId:cls.id||cls.classId||'',className:cls.className||'',
                date:selectedDate,status,teacherId:current?.id||current?.uid||'',teacherName:current?.name||'',memo:''
              })
            });
          }
          if(!res?.ok){
            let detail='';
            try{detail=(await res.text()).slice(0,180);}catch{}
            throw new Error(`서버 저장 실패${res?.status?' ('+res.status+')':''}${detail?' · '+detail:''}`);
          }
          if(!existingId){
            try{const created=await res.json();if(created?.id)row.dataset.existingId=created.id;}catch{}
          }
          success++;
        }
        document.getElementById('savedBadge')?.classList.remove('hidden');
        window.YMS_UI?.toast?.(`✅ ${success}명 출결이 실제로 저장되었습니다.`);
      }catch(e){
        console.error('[YMS] 출결 저장 실패',e);
        window.YMS_UI?.toast?.('❌ 출결 저장 실패: '+(e?.message||'권한 또는 네트워크를 확인해주세요.'));
      }finally{
        saveBtn.disabled=false;
        saveBtn.textContent='✅ 출결 저장하기';
      }
    };
    verified.__ymsVerified=true;
    window.submitTeacherAtt=verified;
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',clean,{once:true});
  else clean();
  window.addEventListener('load',()=>{
    clean();
    installVerifiedSave();
    if(teacherMode) setTimeout(rescopeOnce,180);
  },{once:true});
})();
