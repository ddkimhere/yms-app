/* YMS homework audience filter */
(function(){
  'use strict';
  let visible=[];
  let active='ALL';
  const me=()=>window.YMS_Auth?.getUser?.()||null;
  const upper=v=>String(v||'').toUpperCase();

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

  async function linkedStudent(){
    let u=me();if(!u)return null;
    u=await freshProfile(u);
    const role=upper(u.role);
    let sid='';
    if(role==='STUDENT') sid=u.studentId||u._tableId||'';
    if(role==='PARENT'){
      const ids=Array.isArray(u.childIds)?u.childIds:String(u.childIds||'').split(',').map(v=>v.trim()).filter(Boolean);
      sid=ids[0]||'';
    }
    if(!sid)return null;
    try{
      const r=await _tFetch('tables/students/'+encodeURIComponent(sid),{cache:'no-store'});
      return r.ok?await r.json():null;
    }catch{return null;}
  }

  function matchesStudentHomework(h,s){
    if(!s)return false;
    if(h.targetStudentId) return String(h.targetStudentId)===String(s.id);
    if(h.classId&&s.classId) return String(h.classId)===String(s.classId);
    return !!h.className&&!!s.className&&String(h.className)===String(s.className);
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
    const u=me();if(!u)return;
    try{
      const r=await _tFetch('tables/homework?limit=200',{cache:'no-store'});if(!r.ok)return;
      const j=await r.json();
      let list=(j.data||[]).map(h=>({...h,badge:badge(h.dueAt)}));
      const role=upper(u.role);
      if(role==='STUDENT'||role==='PARENT'){
        const s=await linkedStudent();
        list=s?list.filter(h=>matchesStudentHomework(h,s)):[];
      }else{
        list=list.map(h=>h.targetStudentId?{...h,className:'👤 '+(h.targetStudentName||'개인')+(h.className?' · '+h.className:'')}:h);
      }
      visible=list;draw();
    }catch(e){console.warn('[YMS] 숙제 대상 필터 실패',e);}
  }

  window.YMS_refreshHomeworkAudience=refresh;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,250));
  else setTimeout(refresh,250);
})();
