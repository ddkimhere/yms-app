/* YMS teacher roster repair: attendance-only fallback */
(function(){
  'use strict';
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  // teacher-home is handled exclusively by admin-multirole-fix.js.
  // Running two independent class/student reload loops on teacher-home caused mobile freezes.
  if(page!=='attendance.html') return;

  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,'');
  const val=v=>String(v||'').trim();
  const user=window.YMS_Auth?.getUser?.();
  if(!user) return;
  const mode=new URLSearchParams(location.search).get('mode')||'';
  const primary=String(user.role||'').toUpperCase();
  const adminAttendance=mode==='admin'||(primary==='ADMIN'&&mode!=='teacher');
  if(adminAttendance) return;

  function classMatchesStudent(cls,s){
    const cid=val(cls?.id||cls?.classId),sid=val(s?.classId);
    if(cid&&sid&&cid===sid)return true;
    const cn=norm(cls?.className||cls?.name),sn=norm(s?.className);
    return !!cn&&!!sn&&cn===sn;
  }

  function assignedList(){
    return (Array.isArray(user.teacherClasses)?user.teacherClasses:String(user.teacherClasses||'').split(','))
      .map(val).filter(Boolean);
  }

  function ownedClasses(classes){
    const assigned=assignedList();
    const uid=val(user.id||user.uid),name=norm(user.name);
    if(assigned.length){
      const exact=new Set(assigned);
      return classes.filter(c=>exact.has(val(c.id||c.classId))||assigned.some(x=>norm(x)===norm(c.className||c.name)));
    }
    if(uid){
      const byId=classes.filter(c=>val(c.teacherId)===uid);
      if(byId.length)return byId;
    }
    if(primary==='ADMIN')return [];
    return name?classes.filter(c=>norm(c.teacherName)===name):[];
  }

  async function fetchData(path){
    try{const r=await _tFetch(path,{cache:'no-store'});if(!r.ok)return [];const j=await r.json();return j.data||[];}catch{return [];}
  }

  let running=false,done=false;
  async function repairAttendance(){
    if(running||done)return;
    running=true;
    try{
      const [classes,students]=await Promise.all([
        fetchData('tables/classes?limit=300'),fetchData('tables/students?limit=1000')
      ]);
      const mine=ownedClasses(classes);
      const roster=students.filter(s=>s.isActive!==false&&mine.some(c=>classMatchesStudent(c,s)));
      if(typeof _allClasses!=='undefined'&&Array.isArray(_allClasses))_allClasses.splice(0,_allClasses.length,...mine);
      if(typeof _allStudents!=='undefined'&&Array.isArray(_allStudents))_allStudents.splice(0,_allStudents.length,...roster);
      if(typeof renderClassTabs==='function')renderClassTabs();
      done=true;
    }catch(e){console.warn('[YMS] 출결 명단 보정 실패',e);}
    finally{running=false;}
  }

  window.addEventListener('load',()=>setTimeout(repairAttendance,250),{once:true});
})();
