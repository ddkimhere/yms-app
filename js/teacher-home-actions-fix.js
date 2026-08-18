/* YMS teacher home class action click hard-fix */
(function(){
  'use strict';
  const u=window.YMS_Auth?.getUser?.();
  const isTeacher=!!u&&(String(u.role||'').toUpperCase()==='TEACHER'||String(u.role||'').toUpperCase()==='ADMIN'||window.YMS_Auth?.hasRole?.('TEACHER',u));
  if(!isTeacher||!(location.pathname||'').endsWith('/teacher-home.html'))return;

  function classIdFrom(btn){
    const raw=btn?.getAttribute('onclick')||'';
    const m=raw.match(/(?:showAttModal|showHwRegModal)\(['"]([^'"]*)['"]\)/);
    if(m)return m[1];
    return btn?.dataset?.classId||'';
  }

  function run(btn){
    if(!btn||!btn.closest('.class-actions'))return false;
    const text=String(btn.textContent||'');
    const cid=classIdFrom(btn);
    try{
      if(text.includes('출결')){
        if(typeof showAttModal==='function'){showAttModal(cid);return true;}
        location.href='attendance.html';return true;
      }
      if(text.includes('숙제')){
        if(typeof showHwRegModal==='function'){showHwRegModal(cid);return true;}
        location.href='homework.html';return true;
      }
    }catch(e){
      console.error('[YMS] 선생님 홈 빠른 버튼 오류',e);
      if(text.includes('출결')) location.href='attendance.html';
      else if(text.includes('숙제')) location.href='homework.html';
      return true;
    }
    return false;
  }

  document.addEventListener('click',function(e){
    const btn=e.target?.closest?.('.class-actions button');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    run(btn);
  },true);

  function normalize(){
    document.querySelectorAll('.class-actions button').forEach(btn=>{
      const cid=classIdFrom(btn);
      if(cid)btn.dataset.classId=cid;
      btn.removeAttribute('onclick');
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(normalize,0));
  else setTimeout(normalize,0);
  new MutationObserver(normalize).observe(document.documentElement,{childList:true,subtree:true});
})();