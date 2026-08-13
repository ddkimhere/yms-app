/* YMS homework audience filter */
(function(){
  let visible=[];
  let active='ALL';
  const me=()=>window.YMS_Auth?.getUser?.()||null;

  function badge(dueAt){
    if(!dueAt)return'NEW';
    const d=(new Date(dueAt)-Date.now())/86400000;
    if(d<0)return'OVERDUE';if(d<1)return'D-1';if(d<3)return'D-3';return'NEW';
  }

  async function linkedStudent(){
    const u=me();if(!u)return null;
    let sid='';
    if(u.role==='STUDENT')sid=u.studentId||'';
    if(u.role==='PARENT'){
      const ids=Array.isArray(u.childIds)?u.childIds:String(u.childIds||'').split(',').map(v=>v.trim()).filter(Boolean);
      sid=ids[0]||'';
    }
    if(!sid)return null;
    try{const r=await _tFetch('tables/students/'+sid);return r.ok?await r.json():null;}catch(e){return null;}
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
      const r=await _tFetch('tables/homework?limit=200');if(!r.ok)return;
      const j=await r.json();
      let list=(j.data||[]).map(h=>({...h,badge:badge(h.dueAt)}));
      if(u.role==='STUDENT'||u.role==='PARENT'){
        const s=await linkedStudent();
        list=s?list.filter(h=>h.targetStudentId?h.targetStudentId===s.id:h.className===s.className):[];
      }else{
        list=list.map(h=>h.targetStudentId?{...h,className:'👤 '+(h.targetStudentName||'개인')+(h.className?' · '+h.className:'')}:h);
      }
      visible=list;draw();
    }catch(e){console.warn('[YMS] 숙제 대상 필터 실패',e);}
  }

  window.YMS_refreshHomeworkAudience=refresh;
  setTimeout(refresh,500);
})();