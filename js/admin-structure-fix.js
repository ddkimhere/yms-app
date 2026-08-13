/* YMS admin structure: navigation groups + student account visibility */
(function(){
  'use strict';

  function isStudentUser(u){
    const role=String(u?.role||'').toUpperCase();
    const roles=Array.isArray(u?.roles)?u.roles.map(r=>String(r).toUpperCase()):[];
    return u?.isActive!==false&&(role==='STUDENT'||roles.includes('STUDENT'));
  }

  function mergeStudentUsers(){
    try{
      if(typeof _allUsers==='undefined'||typeof _allStudents==='undefined') return;
      if(!Array.isArray(_allUsers)||!Array.isArray(_allStudents)) return;
      _allUsers.filter(isStudentUser).forEach(u=>{
        const exists=_allStudents.some(s=>s.userId===u.id||(u.studentId&&s.id===u.studentId));
        if(exists) return;
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
          _virtualStudent:true
        });
      });
    }catch(err){console.warn('[YMS] 학생 목록 병합 실패',err);}
  }

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
      mergeStudentUsers();
      makeStudentsViewOnly();
      if(typeof window.renderStudentTable==='function') window.renderStudentTable();
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
