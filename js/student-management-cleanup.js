/* YMS student management cleanup: view-only student list + one-time test data removal */
(function(){
  'use strict';

  function makeStudentSectionViewOnly(){
    const section=document.getElementById('section-students');
    if(!section) return;

    // 학생 관리에서는 신규 등록하지 않는다. 신규 학생은 계정 관리에서만 생성.
    section.querySelectorAll('button').forEach(btn=>{
      const onclick=btn.getAttribute('onclick')||'';
      if(onclick.includes('showAddStudentPanel')) btn.remove();
    });

    const addPanel=document.getElementById('studentAddPanel');
    if(addPanel) addPanel.remove();
  }

  async function removeOneTimeTestStudent(){
    const marker='yms_cleanup_test_student_leejaein_v1';
    if(localStorage.getItem(marker)==='done') return;
    if(typeof window._tFetch!=='function') return;

    try{
      const res=await _tFetch('tables/students?limit=500');
      if(!res.ok) return;
      const json=await res.json();
      const targets=(json.data||[]).filter(s=>String(s.name||'').trim()==='이재인');

      if(targets.length){
        const results=await Promise.all(targets.map(s=>_tFetch(`tables/students/${s.id}`,{method:'DELETE'})));
        if(results.some(r=>!r.ok)) return;
        if(Array.isArray(window._allStudents)) {
          window._allStudents=window._allStudents.filter(s=>String(s.name||'').trim()!=='이재인');
        }
      }

      localStorage.setItem(marker,'done');
      if(typeof window.renderStudentTable==='function') window.renderStudentTable();
    }catch(err){
      console.warn('[YMS] test student cleanup failed',err);
    }
  }

  window.addEventListener('load',()=>{
    if(!location.pathname.endsWith('/admin.html')) return;
    makeStudentSectionViewOnly();
    removeOneTimeTestStudent();
  });
})();
