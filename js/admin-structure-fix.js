/* YMS admin structure: navigation groups + student account visibility */
(function(){
  'use strict';

  const norm=v=>String(v||'').trim().toLowerCase();
  const normName=v=>norm(v).replace(/[\s·._-]+/g,'');
  function roleList(u){
    const primary=String(u?.role||'').toUpperCase();
    const raw=u?.roles;
    const extras=Array.isArray(raw)
      ? raw
      : String(raw||'').split(',').map(v=>v.trim()).filter(Boolean);
    return [...new Set([primary,...extras.map(v=>String(v).toUpperCase())].filter(Boolean))];
  }
  function isStudentUser(u){
    return u?.isActive!==false && roleList(u).includes('STUDENT');
  }

  function sameStudent(s,u){
    if(!s||!u) return false;
    if(u.id && String(s.userId||'')===String(u.id)) return true;
    if(u.studentId && String(s.id||'')===String(u.studentId)) return true;
    if(s.id && String(u.studentId||'')===String(s.id)) return true;
    // Older records sometimes lost the ids but kept the same student name.
    const sn=normName(s.name),un=normName(u.name);
    if(sn && un && sn===un) return true;
    return false;
  }

  function mergeStudentUsers(users){
    try{
      if(typeof _allStudents==='undefined'||!Array.isArray(_allStudents)) return;
      const source=Array.isArray(users)?users:(typeof _allUsers!=='undefined'&&Array.isArray(_allUsers)?_allUsers:[]);
      const studentUsers=source.filter(isStudentUser);

      studentUsers.forEach(u=>{
        const idx=_allStudents.findIndex(s=>sameStudent(s,u));
        if(idx>=0){
          const old=_allStudents[idx]||{};
          // An active STUDENT login must remain visible even if an old students doc was inactive.
          _allStudents[idx]={
            ...old,
            userId:u.id||old.userId||'',
            id:old.id||u.studentId||('user-'+u.id),
            name:old.name||u.name||u.loginId||'학생',
            grade:old.grade||u.grade||'',
            schoolName:old.schoolName||u.schoolName||'',
            className:old.className||u.className||'',
            teacherName:old.teacherName||u.teacherName||'',
            classId:old.classId||u.classId||'',
            isActive:true,
            _accountStudent:true
          };
          return;
        }
        _allStudents.push({
          id:u.studentId||('user-'+u.id),
          userId:u.id,
          name:u.name||u.loginId||'학생',
          grade:u.grade||'',
          schoolName:u.schoolName||'',
          className:u.className||'',
          teacherName:u.teacherName||'',
          classId:u.classId||'',
          isActive:true,
          _virtualStudent:true,
          _accountStudent:true
        });
      });

      // Remove accidental duplicate rows after id/name recovery, preferring the first merged row.
      const seenUsers=new Set(),seenStudents=new Set(),seenNames=new Set(),deduped=[];
      _allStudents.forEach(s=>{
        const uk=String(s.userId||'').trim();
        const sk=String(s.id||'').trim();
        const nk=normName(s.name);
        if(uk&&seenUsers.has(uk)) return;
        if(sk&&seenStudents.has(sk)) return;
        if(!uk&&!sk&&nk&&seenNames.has(nk)) return;
        if(uk)seenUsers.add(uk);
        if(sk)seenStudents.add(sk);
        if(nk)seenNames.add(nk);
        deduped.push(s);
      });
      _allStudents.splice(0,_allStudents.length,...deduped);
    }catch(err){console.warn('[YMS] 학생 목록 병합 실패',err);}
  }

  async function syncStudentUsers(){
    try{
      const [ur,sr]=await Promise.all([
        _tFetch('tables/users?limit=1000',{cache:'no-store'}),
        _tFetch('tables/students?limit=1000',{cache:'no-store'})
      ]);
      const users=ur.ok?((await ur.json()).data||[]):[];
      const students=sr.ok?((await sr.json()).data||[]):[];

      if(typeof _allUsers!=='undefined'&&Array.isArray(_allUsers)&&ur.ok){
        _allUsers.splice(0,_allUsers.length,...users);
      }
      if(typeof _allStudents!=='undefined'&&Array.isArray(_allStudents)&&sr.ok){
        _allStudents.splice(0,_allStudents.length,...students);
      }
      mergeStudentUsers(users);
      if(typeof window.renderStudentTable==='function') window.renderStudentTable();
      return true;
    }catch(err){
      console.warn('[YMS] 학생/계정 동기화 실패',err);
      mergeStudentUsers();
      if(typeof window.renderStudentTable==='function') window.renderStudentTable();
      return false;
    }
  }
  window.YMS_syncStudentUsers=syncStudentUsers;

  function makeStudentsViewOnly(){
    const section=document.getElementById('section-students');
    if(!section) return;
    section.querySelectorAll('button').forEach(btn=>{
      const onclick=btn.getAttribute('onclick')||'';
      if(onclick.includes('showAddStudentPanel')) btn.remove();
    });
    document.getElementById('studentAddPanel')?.remove();
  }

  function groupTitle(text){
    const el=document.createElement('div');
    el.className='admin-nav-section';
    el.textContent=text;
    return el;
  }

  function organizeSidebar(){
    const nav=document.querySelector('#adminSidebar .admin-nav');
    if(!nav||nav.dataset.organized==='1') return;

    const dashboard=document.getElementById('nav-dashboard');
    const students=document.getElementById('nav-students');
    const oldClasses=document.getElementById('nav-classes');
    const realClasses=document.getElementById('nav-classes-mgmt');
    const teachers=document.getElementById('nav-teachers');
    const notices=document.getElementById('nav-notices');
    const attendance=document.getElementById('nav-attendance');
    const payments=document.getElementById('nav-payments');
    const counseling=document.getElementById('nav-counseling');
    const accounts=document.getElementById('nav-accounts');

    attendance?.remove();
    oldClasses?.remove();
    if(realClasses){
      realClasses.innerHTML='<span class="nav-icon">🏫</span> 반 관리';
      realClasses.setAttribute('onclick',"switchSection('classes-mgmt',this)");
    }
    if(notices){
      notices.innerHTML='<span class="nav-icon">📢</span> 공지 관리';
      notices.setAttribute('onclick',"_ymsGo('notices.html')");
    }

    nav.innerHTML='';
    if(dashboard) nav.appendChild(dashboard);
    nav.appendChild(groupTitle('수업 관리'));
    [students,realClasses,teachers].forEach(el=>{if(el) nav.appendChild(el);});
    nav.appendChild(groupTitle('운영 관리'));
    [notices,payments,counseling,accounts].forEach(el=>{if(el) nav.appendChild(el);});
    nav.dataset.organized='1';
  }

  function wrapStudentInit(){
    if(typeof window.initStudents!=='function'||window.initStudents.__structureWrapped) return;
    const original=window.initStudents;
    const wrapped=async function(){
      const result=await original.apply(this,arguments);
      await syncStudentUsers();
      makeStudentsViewOnly();
      return result;
    };
    wrapped.__structureWrapped=true;
    window.initStudents=wrapped;
  }

  function run(){
    if(!location.pathname.endsWith('/admin.html')) return;
    organizeSidebar();
    makeStudentsViewOnly();
    mergeStudentUsers();
    wrapStudentInit();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run);
  else run();
  window.addEventListener('load',()=>{run();setTimeout(run,400);});
})();
