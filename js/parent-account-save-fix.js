/* Ensure parent account child selection is always loaded and saved correctly */
(function(){
  'use strict';

  async function ensureStudentOptions(){
    const sel=document.getElementById('acctChildSelect');
    if(!sel) return;
    try{
      const r=await _tFetch('tables/students?limit=500');
      if(!r.ok) return;
      const json=await r.json();
      const students=(json.data||[]).filter(s=>s.isActive!==false)
        .sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko'));
      const existing=new Set(Array.from(sel.selectedOptions||[]).map(o=>o.value));
      const hiddenIds=String(document.getElementById('acctChildIds')?.value||'')
        .split(',').map(v=>v.trim()).filter(Boolean);
      hiddenIds.forEach(id=>existing.add(id));
      sel.innerHTML=students.length
        ? students.map(s=>`<option value="${String(s.id).replace(/"/g,'&quot;')}">${s.name||'-'}${s.grade?' ('+s.grade+')':''}${s.className?' · '+s.className:''}</option>`).join('')
        : '<option value="" disabled>등록된 학생이 없습니다</option>';
      Array.from(sel.options).forEach(o=>{o.selected=existing.has(o.value);});
    }catch(err){
      console.warn('[YMS] 학부모 자녀 목록 로드 실패',err);
    }
  }

  function syncSelectedChildren(){
    const role=String(document.getElementById('acctRole')?.value||'').toUpperCase();
    if(role!=='PARENT') return;
    const sel=document.getElementById('acctChildSelect');
    const hidden=document.getElementById('acctChildIds');
    if(!sel||!hidden) return;
    const ids=Array.from(sel.selectedOptions).map(o=>o.value).filter(Boolean);
    hidden.value=ids.join(',');
  }

  document.addEventListener('submit',function(e){
    if(e.target?.id==='acctForm') syncSelectedChildren();
  },true);

  document.addEventListener('change',function(e){
    if(e.target?.id==='acctRole' && String(e.target.value).toUpperCase()==='PARENT'){
      setTimeout(ensureStudentOptions,0);
    }
    if(e.target?.id==='acctChildSelect') syncSelectedChildren();
  },true);

  document.addEventListener('click',function(e){
    const t=e.target;
    if(!t) return;
    if(t.closest?.('[onclick*="showAddAcctPanel"]')) setTimeout(ensureStudentOptions,50);
    if(t.closest?.('[onclick*="openEditAcct"]')) setTimeout(ensureStudentOptions,80);
  },true);

  window.addEventListener('load',()=>{
    if(location.pathname.endsWith('/admin.html')) setTimeout(ensureStudentOptions,900);
  });
})();
