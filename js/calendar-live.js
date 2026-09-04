/* YMS live calendar bridge: prevents demo crash and loads real homework deadlines */
(function(){
  'use strict';
  window.YMS_DEMO=window.YMS_DEMO||{};
  if(!Array.isArray(window.YMS_DEMO.calendarEvents)) window.YMS_DEMO.calendarEvents=[];
  if(!Array.isArray(window.YMS_DEMO.teacherClasses)) window.YMS_DEMO.teacherClasses=[];
  if(typeof window.ymsRenderTabBar!=='function') window.ymsRenderTabBar=function(){};

  const upper=v=>String(v||'').trim().toUpperCase();
  const str=v=>String(v||'').trim();
  const norm=v=>str(v).toLowerCase().replace(/[\s·._-]+/g,'');
  const me=()=>window.YMS_Auth?.getUser?.()||null;

  async function getStudent(id){
    if(!id)return null;
    try{const r=await _tFetch('tables/students/'+encodeURIComponent(id));return r.ok?await r.json():null;}catch{return null;}
  }

  async function viewerStudents(u){
    const role=upper(u?.role);
    if(role==='STUDENT'){
      const ids=[u?.studentId,u?._tableId].map(str).filter(Boolean);
      for(const id of ids){const s=await getStudent(id);if(s)return [s];}
      try{
        const r=await _tFetch('tables/students?limit=1000');
        if(r.ok){
          const list=(await r.json()).data||[],uid=str(u?.id||u?.uid);
          const s=list.find(x=>(uid&&str(x.userId)===uid)||(norm(x.name)&&norm(x.name)===norm(u?.name)));
          return s?[s]:[];
        }
      }catch{}
    }
    if(role==='PARENT'){
      const ids=Array.isArray(u?.childIds)?u.childIds:String(u?.childIds||'').split(',').map(v=>v.trim()).filter(Boolean);
      const out=[];for(const id of ids){const s=await getStudent(id);if(s)out.push(s);}return out;
    }
    return [];
  }

  function homeworkMatchesStudent(h,s){
    if(!s)return false;
    const personal=upper(h?.targetType)==='STUDENT'||!!str(h?.targetStudentId)||!!str(h?.targetStudentName);
    if(personal){
      if(str(h.targetStudentId)) return [s.id,s.studentId,s.userId].map(str).filter(Boolean).includes(str(h.targetStudentId));
      return norm(h.targetStudentName)&&norm(h.targetStudentName)===norm(s.name);
    }
    if(h.classId&&s.classId)return str(h.classId)===str(s.classId);
    return !!h.className&&!!s.className&&norm(h.className)===norm(s.className);
  }

  async function teacherScope(u,classes){
    const uid=str(u?.id||u?.uid),name=norm(u?.name);
    const assigned=Array.isArray(u?.teacherClasses)?u.teacherClasses.map(str):String(u?.teacherClasses||'').split(',').map(v=>v.trim()).filter(Boolean);
    const mine=classes.filter(c=>(uid&&str(c.teacherId)===uid)||(name&&norm(c.teacherName)===name)||assigned.includes(str(c.id||c.classId))||assigned.includes(str(c.className||c.name)));
    return {ids:new Set(mine.map(c=>str(c.id||c.classId)).filter(Boolean)),names:new Set(mine.map(c=>str(c.className||c.name)).filter(Boolean))};
  }

  function dueDate(iso){
    if(!iso)return'';
    try{return new Date(iso).toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});}catch{return str(iso).slice(0,10);}
  }

  async function loadLiveCalendar(){
    const u=me();if(!u||!window._tFetch)return;
    try{
      const [hr,cr]=await Promise.all([_tFetch('tables/homework?limit=500'),_tFetch('tables/classes?limit=500')]);
      let homework=hr.ok?((await hr.json()).data||[]):[];
      const classes=cr.ok?((await cr.json()).data||[]):[];
      window.YMS_DEMO.teacherClasses=classes.map(c=>({classId:c.id||c.classId,className:c.className||c.name||''}));
      const role=upper(u.role),roles=Array.isArray(u.roles)?u.roles.map(upper):[];
      if(role==='ADMIN'){
        // academy-wide
      }else if(role==='TEACHER'||roles.includes('TEACHER')){
        const scope=await teacherScope(u,classes),uid=str(u.id||u.uid);
        homework=homework.filter(h=>(h.classId&&scope.ids.has(str(h.classId)))||(h.className&&scope.names.has(str(h.className)))||(uid&&str(h.teacherId)===uid));
      }else if(role==='STUDENT'||role==='PARENT'){
        const students=await viewerStudents(u);
        homework=homework.filter(h=>students.some(s=>homeworkMatchesStudent(h,s)));
      }else homework=[];

      window.YMS_DEMO.calendarEvents=homework.filter(h=>h.isVisible!==false&&h.dueAt).map(h=>({
        id:h.id,
        type:'homework',
        title:h.title||'숙제 마감',
        date:dueDate(h.dueAt),
        time:'21:00',
        classId:h.classId||'',
        className:h.className||''
      })).filter(e=>e.date);

      if(typeof window.renderByView==='function')window.renderByView();
      else if(typeof window.renderCalendar==='function')window.renderCalendar();
    }catch(e){console.warn('[YMS] 캘린더 실데이터 로드 실패',e);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(loadLiveCalendar,0));
  else setTimeout(loadLiveCalendar,0);
})();