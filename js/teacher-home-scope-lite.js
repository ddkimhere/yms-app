/* YMS teacher home: lightweight role/class scope without extra Firestore reads */
(function(){
  'use strict';
  if((location.pathname.split('/').pop()||'')!=='teacher-home.html') return;

  const user=window.YMS_Auth?.getUser?.();
  if(!user) return;

  const role=String(user.role||'').toUpperCase();
  const roles=Array.isArray(user.roles)?user.roles.map(r=>String(r||'').toUpperCase()):[];
  const isTeacher=role==='TEACHER'||roles.includes('TEACHER');
  if(!isTeacher) return;

  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,'');
  const val=v=>String(v||'').trim();
  const assigned=(Array.isArray(user.teacherClasses)?user.teacherClasses:String(user.teacherClasses||'').split(','))
    .map(val).filter(Boolean);

  function mine(c){
    const cid=val(c?.id||c?.classId), cname=norm(c?.className||c?.name);
    if(assigned.length){
      return assigned.some(x=>val(x)===cid||norm(x)===cname);
    }
    const uid=val(user.id||user.uid);
    if(uid&&val(c?.teacherId)===uid) return true;
    return !!norm(user.name)&&norm(c?.teacherName)===norm(user.name);
  }

  let done=false;
  function apply(){
    if(done) return true;
    try{
      if(typeof _myClasses==='undefined'||!Array.isArray(_myClasses)||typeof _myStudents==='undefined'||!Array.isArray(_myStudents)) return false;
      const count=document.getElementById('todayClassCount');
      if(count&&String(count.textContent||'').includes('불러오는 중')) return false;

      const filtered=_myClasses.filter(mine);
      const ids=new Set(filtered.map(c=>val(c.id||c.classId)).filter(Boolean));
      const names=new Set(filtered.map(c=>norm(c.className||c.name)).filter(Boolean));
      const students=_myStudents.filter(s=>ids.has(val(s.classId))||names.has(norm(s.className)));

      _myClasses.splice(0,_myClasses.length,...filtered);
      _myStudents.splice(0,_myStudents.length,...students);

      document.getElementById('adminShortcut')?.remove();
      const g=document.getElementById('greetName');
      const sub=document.getElementById('greetSub');
      if(g) g.textContent=(user.name||'선생님')+' 선생님, 안녕하세요 👋';
      if(sub) sub.textContent='내 담당 수업과 학생 현황만 보여드려요.';
      document.querySelectorAll('a[href="attendance.html"]').forEach(a=>a.href='attendance.html?mode=teacher');
      document.querySelectorAll('a[href="homework.html"]').forEach(a=>a.href='homework.html?mode=teacher');
      if(typeof renderTeacherHome==='function') renderTeacherHome();
      done=true;
      return true;
    }catch(e){
      console.warn('[YMS] lightweight teacher scope failed',e);
      return true;
    }
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(apply()||tries>=20) clearInterval(timer);
  },100);
})();
