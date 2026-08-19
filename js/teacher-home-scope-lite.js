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

  function gradeKey(c){
    const s=[c?.grade,c?.className,c?.name,c?.levelCode].filter(Boolean).join(' ');
    let m;
    m=s.match(/초중학교\s*([4-6])\s*(?:학년)?/i); if(m)return 100+Number(m[1]);
    m=s.match(/(?:초등학교|초등|초)\s*([1-6])\s*(?:학년)?/i); if(m)return 100+Number(m[1]);
    m=s.match(/(?:중학교|중등|중)\s*([1-3])\s*(?:학년)?/i); if(m)return 200+Number(m[1]);
    m=s.match(/(?:고등학교|고등|고)\s*([1-3])\s*(?:학년)?/i); if(m)return 300+Number(m[1]);
    return 999;
  }
  function sortClasses(list){
    return list.slice().sort((a,b)=>gradeKey(a)-gradeKey(b)||String(a?.className||a?.name||'').localeCompare(String(b?.className||b?.name||''),'ko',{numeric:true,sensitivity:'base'}));
  }

  let done=false;
  function apply(){
    if(done) return true;
    try{
      if(typeof _myClasses==='undefined'||!Array.isArray(_myClasses)||typeof _myStudents==='undefined'||!Array.isArray(_myStudents)) return false;
      const count=document.getElementById('todayClassCount');
      if(count&&String(count.textContent||'').includes('불러오는 중')) return false;

      const filtered=sortClasses(_myClasses.filter(mine));
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

      // Render only once after scoping/sorting. No MutationObserver or repeated resorting on teacher home.
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
    if(apply()||tries>=12) clearInterval(timer);
  },120);
})();
