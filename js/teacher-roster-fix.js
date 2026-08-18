/* YMS teacher roster repair: robust class/student matching */
(function(){
  'use strict';
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(!['teacher-home.html','attendance.html'].includes(page)) return;

  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,'');
  const val=v=>String(v||'').trim();
  const user=window.YMS_Auth?.getUser?.();
  if(!user) return;

  function classMatchesStudent(cls,s){
    const cid=val(cls?.id||cls?.classId), sid=val(s?.classId);
    if(cid&&sid&&cid===sid) return true;
    const cn=norm(cls?.className||cls?.name), sn=norm(s?.className);
    return !!cn&&!!sn&&cn===sn;
  }

  function teacherOwnsClass(c){
    const uid=val(user.id||user.uid), name=norm(user.name);
    const assigned=Array.isArray(user.teacherClasses)?user.teacherClasses:String(user.teacherClasses||'').split(',').map(v=>v.trim()).filter(Boolean);
    const cid=val(c.id||c.classId), cname=val(c.className||c.name);
    return String(user.role||'').toUpperCase()==='ADMIN' ||
      (uid&&val(c.teacherId)===uid) ||
      (name&&norm(c.teacherName)===name) ||
      assigned.some(x=>val(x)===cid||norm(x)===norm(cname));
  }

  async function fetchData(path){
    try{const r=await _tFetch(path,{cache:'no-store'});if(!r.ok)return [];const j=await r.json();return j.data||[];}catch{return [];}
  }

  async function repairTeacherHome(){
    if(page!=='teacher-home.html') return;
    try{
      const [classes,students]=await Promise.all([fetchData('tables/classes?limit=300'),fetchData('tables/students?limit=1000')]);
      const mine=classes.filter(teacherOwnsClass);
      const roster=students.filter(s=>s.isActive!==false&&mine.some(c=>classMatchesStudent(c,s)));
      if(typeof _myClasses!=='undefined'&&Array.isArray(_myClasses)) _myClasses.splice(0,_myClasses.length,...mine);
      if(typeof _myStudents!=='undefined'&&Array.isArray(_myStudents)) _myStudents.splice(0,_myStudents.length,...roster);
      if(typeof renderTeacherHome==='function') renderTeacherHome();
    }catch(e){console.warn('[YMS] 선생님 명단 보정 실패',e);}
  }

  async function repairAttendance(){
    if(page!=='attendance.html') return;
    try{
      const [classes,students]=await Promise.all([fetchData('tables/classes?limit=300'),fetchData('tables/students?limit=1000')]);
      const mine=classes.filter(teacherOwnsClass);
      if(typeof _allClasses!=='undefined'&&Array.isArray(_allClasses)) _allClasses.splice(0,_allClasses.length,...mine);
      if(typeof _allStudents!=='undefined'&&Array.isArray(_allStudents)) _allStudents.splice(0,_allStudents.length,...students);
      if(typeof renderClassTabs==='function') renderClassTabs();
    }catch(e){console.warn('[YMS] 출결 명단 보정 실패',e);}
  }

  function run(){
    if(page==='teacher-home.html') repairTeacherHome();
    else repairAttendance();
  }
  window.addEventListener('load',()=>setTimeout(run,500));
  setTimeout(run,1200);
})();
