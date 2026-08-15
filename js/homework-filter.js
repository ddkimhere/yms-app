/* YMS homework audience filter */
(function(){
  'use strict';
  let visible=[];
  let active='ALL';
  const me=()=>window.YMS_Auth?.getUser?.()||null;
  const upper=v=>String(v||'').toUpperCase();
  const str=v=>String(v||'').trim();

  function badge(dueAt){
    if(!dueAt)return'NEW';
    const d=(new Date(dueAt)-Date.now())/86400000;
    if(d<0)return'OVERDUE';if(d<1)return'D-1';if(d<3)return'D-3';return'NEW';
  }

  async function freshProfile(u){
    const uid=u?.id||u?.uid||'';
    if(!uid)return u;
    try{
      const r=await _tFetch('tables/users/'+encodeURIComponent(uid),{cache:'no-store'});
      if(r.ok)return {...u,...await r.json()};
    }catch{}
    return u;
  }

  async function getStudent(id){
    if(!id)return null;
    try{
      const r=await _tFetch('tables/students/'+encodeURIComponent(id),{cache:'no-store'});
      return r.ok?await r.json():null;
    }catch{return null;}
  }

  async function linkedStudents(){
    let u=me();if(!u)return [];
    u=await freshProfile(u);
    const role=upper(u.role);
    if(role==='STUDENT'){
      const sid=u.studentId||u._tableId||'';
      const s=await getStudent(sid);
      return s?[s]:[];
    }
    if(role==='PARENT'){
      const ids=Array.isArray(u.childIds)?u.childIds:String(u.childIds||'').split(',').map(v=>v.trim()).filter(Boolean);
      const out=[];
      for(const id of ids){const s=await getStudent(id);if(s)out.push(s);}
      return out;
    }
    return [];
  }

  async function teacherScope(u){
    const uid=str(u?.id||u?.uid);
    const name=str(u?.name);
    const assigned=Array.isArray(u?.teacherClasses)
      ? u.teacherClasses.map(str).filter(Boolean)
      : String(u?.teacherClasses||'').split(',').map(v=>v.trim()).filter(Boolean);
    const ids=new Set(),names=new Set();
    try{
      const r=await _tFetch('tables/classes?limit=500',{cache:'no-store'});
      if(r.ok){
        const classes=(await r.json()).data||[];
        classes.forEach(c=>{
          const cid=str(c.id||c.classId), cname=str(c.className||c.name);
          const mine=(uid&&str(c.teacherId)===uid)
            ||(name&&str(c.teacherName)===name)
            ||assigned.includes(cid)
            ||assigned.includes(cname);
          if(mine){if(cid)ids.add(cid);if(cname)names.add(cname);}
        });
      }
    }catch(e){console.warn('[YMS] 담당 반 조회 실패',e);}
    assigned.forEach(v=>{ids.add(v);names.add(v);});
    return {ids,names};
  }

  function matchesStudentHomework(h,s){
    if(!s)return false;
    if(h.targetStudentId) return str(h.targetStudentId)===str(s.id);
    if(h.classId&&s.classId) return str(h.classId)===str(s.classId);
    return !!h.className&&!!s.className&&str(h.className)===str(s.className);
  }

  function matchesTeacherHomework(h,scope,u){
    const uid=str(u?.id||u?.uid);
    if(h.targetStudentId){
      if(h.classId&&scope.ids.has(str(h.classId)))return true;
      if(h.className&&scope.names.has(str(h.className)))return true;
      return !!uid&&str(h.teacherId)===uid;
    }
    if(h.classId&&scope.ids.has(str(h.classId)))return true;
    if(h.className&&scope.names.has(str(h.className)))return true;
    return !!uid&&str(h.teacherId)===uid;
  }

  function draw(){
    const list=active==='ALL'?visible:visible.filter(h=>h.badge===active);
    if(typeof window.renderHomework==='function')window.renderHomework(list);
  }

  window.setFilter=function(el,filter){
    document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
    el?.classList.add('active');active=filter;draw();
  };

  async function refresh(){
    let u=me();if(!u)return;
    try{
      u=await freshProfile(u);
      const r=await _tFetch('tables/homework?limit=500',{cache:'no-store'});if(!r.ok)return;
      const j=await r.json();
      let list=(j.data||[]).map(h=>({...h,badge:badge(h.dueAt)}));
      const role=upper(u.role);
      const roles=Array.isArray(u.roles)?u.roles.map(upper):[];
      const isAdmin=role==='ADMIN';
      const isTeacher=role==='TEACHER'||roles.includes('TEACHER');

      if(isAdmin){
        // 관리자는 전체 숙제를 본다.
      }else if(isTeacher){
        const scope=await teacherScope(u);
        list=list.filter(h=>matchesTeacherHomework(h,scope,u));
      }else if(role==='STUDENT'||role==='PARENT'){
        const students=await linkedStudents();
        list=list.filter(h=>students.some(s=>matchesStudentHomework(h,s)));
      }else{
        list=[];
      }

      list=list.map(h=>h.targetStudentId?{...h,className:'👤 '+(h.targetStudentName||'개인')+(h.className?' · '+h.className:'')}:h);
      visible=list;draw();
    }catch(e){console.warn('[YMS] 숙제 대상 필터 실패',e);}
  }

  window.YMS_refreshHomeworkAudience=refresh;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,250));
  else setTimeout(refresh,250);
})();
