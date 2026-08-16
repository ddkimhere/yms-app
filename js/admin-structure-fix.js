/* YMS admin structure: navigation groups + student account visibility */
(function(){
  'use strict';

  const norm=v=>String(v||'').trim().toLowerCase();
  const normName=v=>norm(v).replace(/[\s·._-]+/g,'');
  const normRole=v=>{
    const r=String(v||'').trim().toUpperCase();
    if(r==='학생') return 'STUDENT';
    if(r==='학부모') return 'PARENT';
    if(r==='선생님'||r==='교사') return 'TEACHER';
    if(r==='관리자') return 'ADMIN';
    return r;
  };
  function roleList(u){
    const primary=normRole(u?.role);
    const raw=u?.roles;
    const extras=Array.isArray(raw)
      ? raw
      : String(raw||'').split(',').map(v=>v.trim()).filter(Boolean);
    return [...new Set([primary,...extras.map(normRole)].filter(Boolean))];
  }
  function isStudentUser(u){
    return u?.isActive!==false && roleList(u).includes('STUDENT');
  }

  function matchStudent(s,u){
    if(!s||!u) return '';
    const sid=String(s.id||'').trim();
    const suid=String(s.userId||'').trim();
    const uid=String(u.id||u.uid||'').trim();
    const linked=String(u.studentId||'').trim();
    const sn=normName(s.name),un=normName(u.name);

    // userId is the strongest ownership link.
    if(uid && suid===uid) return 'USER_ID';

    // A studentId link is trusted only when names do not contradict each other.
    // This prevents a stale hidden linkedStudentId from making a new account disappear
    // into somebody else's students document.
    if(linked && sid===linked){
      if(!sn || !un || sn===un) return 'STUDENT_ID';
      return '';
    }

    // Legacy records may have lost ids but kept the same student name.
    if(sn && un && sn===un) return 'NAME';
    return '';
  }

  function mergeStudentUsers(users){
    try{
      if(typeof _allStudents==='undefined'||!Array.isArray(_allStudents)) return;
      const source=Array.isArray(users)?users:(typeof _allUsers!=='undefined'&&Array.isArray(_allUsers)?_allUsers:[]);
      const studentUsers=source.filter(isStudentUser);

      studentUsers.forEach(u=>{
        let idx=-1,match='';
        for(let i=0;i<_allStudents.length;i++){
          const m=matchStudent(_allStudents[i],u);
          if(m){idx=i;match=m;break;}
        }

        if(idx>=0){
          const old=_allStudents[idx]||{};
          _allStudents[idx]={
            ...old,
            userId:u.id||u.uid||old.userId||'',
            id:old.id||u.studentId||('account-'+(u.id||u.uid||Date.now())),
            // Account name wins for an exact user ownership link so a stale student
            // document cannot keep showing another student's old name.
            name:(match==='USER_ID' ? (u.name||old.name) : (old.name||u.name)) || u.loginId || '학생',
            grade:old.grade||u.grade||'',
            schoolName:old.schoolName||u.schoolName||'',
            className:old.className||u.className||'',
            teacherName:old.teacherName||u.teacherName||'',
            classId:old.classId||u.classId||'',
            isActive:true,
            _accountStudent:true,
            _accountMatch:match
          };
          return;
        }

        // Keep a unique virtual id even when u.studentId incorrectly points at another
        // student's document. The real document remains visible and this STUDENT account
        // gets its own row instead of being deduplicated away.
        const uid=String(u.id||u.uid||'').trim();
        _allStudents.push({
          id:'account-'+(uid||Math.random().toString(36).slice(2)),
          linkedStudentId:u.studentId||'',
          userId:uid,
          name:u.name||u.loginId||'학생',
          grade:u.grade||'',
          schoolName:u.schoolName||'',
          className:u.className||'',
          teacherName:u.teacherName||'',
          classId:u.classId||'',
          isActive:true,
          _virtualStudent:true,
          _accountStudent:true,
          _linkNeedsRepair:!!u.studentId
        });
      });

      const seenUsers=new Set(),seenStudents=new Set(),deduped=[];
      _allStudents.forEach(s=>{
        const uk=String(s.userId||'').trim();
        const sk=String(s.id||'').trim();
        if(uk&&seenUsers.has(uk)) return;
        if(sk&&seenStudents.has(sk)) return;
        if(uk)seenUsers.add(uk);
        if(sk)seenStudents.add(sk);
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
