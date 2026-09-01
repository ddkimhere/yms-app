/* YMS admin class management: show active student count instead of subject */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  let students=[];
  let loaded=false;
  let loading=null;
  let patchScheduled=false;

  async function loadStudents(){
    if(loaded) return students;
    if(loading) return loading;
    loading=(async()=>{
      try{
        if(typeof _allStudents!=='undefined'&&Array.isArray(_allStudents)&&_allStudents.length){
          students=[..._allStudents];
        }else{
          const r=await _tFetch('tables/students?limit=1000');
          if(r.ok) students=(await r.json()).data||[];
        }
      }catch(e){console.warn('[YMS] class student count load failed',e);}
      loaded=true;loading=null;return students;
    })();
    return loading;
  }

  function activeCount(cls){
    return students.filter(s=>s&&s.isActive!==false&&(
      (cls?.id&&String(s.classId||'')===String(cls.id)) ||
      (cls?.className&&String(s.className||'')===String(cls.className))
    )).length;
  }

  function hideSubjectField(){
    const input=document.getElementById('clsSubject');
    if(!input) return;
    const group=input.closest('.form-group');
    if(group&&group.style.display!=='none') group.style.display='none';
  }

  function patchHeader(){
    const tbody=document.getElementById('classMgmtBody');
    const table=tbody?.closest('table');
    const th=table?.querySelector('thead tr th:nth-child(2)');
    if(th&&th.textContent!=='학생 수') th.textContent='학생 수';
  }

  function patchRows(){
    const tbody=document.getElementById('classMgmtBody');
    if(!tbody||typeof _classList==='undefined'||!Array.isArray(_classList)) return;
    const rows=[...tbody.querySelectorAll('tr')];
    rows.forEach((tr,i)=>{
      const cells=tr.children;
      if(cells.length<2) return;
      const cls=_classList[i];
      if(!cls) return;
      const wanted=`${activeCount(cls)}명`;
      if(cells[1].textContent.trim()!==wanted){
        cells[1].textContent=wanted;
        cells[1].style.fontWeight='700';
      }
    });
  }

  function schedulePatch(){
    if(patchScheduled) return;
    patchScheduled=true;
    requestAnimationFrame(()=>{
      patchScheduled=false;
      patchHeader();
      patchRows();
    });
  }

  async function refresh(){
    hideSubjectField();
    patchHeader();
    await loadStudents();
    schedulePatch();
  }

  function observe(){
    const tbody=document.getElementById('classMgmtBody');
    if(!tbody||tbody.dataset.ymsCountObserver==='1') return;
    tbody.dataset.ymsCountObserver='1';
    new MutationObserver(schedulePatch).observe(tbody,{childList:true,subtree:true});
  }

  function install(){
    hideSubjectField();patchHeader();observe();refresh();
    document.addEventListener('click',e=>{
      if(e.target.closest('#nav-classes-mgmt')||e.target.closest('#nav-classes')) setTimeout(refresh,100);
      if(e.target.closest('[onclick*="showClassForm"]')||e.target.closest('[onclick*="editClass"]')) setTimeout(hideSubjectField,0);
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
