/* Repair and harden parent-child linkage in admin account management */
(function(){
  'use strict';

  function parseIds(v){
    if(Array.isArray(v)) return v.map(String).map(s=>s.trim()).filter(Boolean);
    return String(v||'').split(',').map(s=>s.trim()).filter(Boolean);
  }

  async function repairExistingLinks(){
    if(!location.pathname.endsWith('/admin.html')) return;
    try{
      if(typeof loadAllData==='function') await loadAllData();
      if(typeof _allUsers==='undefined' || typeof _allStudents==='undefined') return;

      const parents=(_allUsers||[]).filter(u=>String(u.role||'').toUpperCase()==='PARENT');
      let repaired=0;
      for(const p of parents){
        const ids=parseIds(p.childIds);
        if(!ids.length) continue;
        for(const sid of ids){
          const s=(_allStudents||[]).find(x=>x.id===sid);
          if(!s || s.parentId===p.id) continue;
          const r=await _tFetch(`tables/students/${encodeURIComponent(sid)}`,{
            method:'PATCH',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({parentId:p.id})
          });
          if(r.ok){ s.parentId=p.id; repaired++; }
        }
      }
      if(repaired) console.log(`[YMS] 부모-학생 연결 ${repaired}건 자동 보정`);
    }catch(err){
      console.warn('[YMS] 부모-학생 연결 자동 보정 실패',err);
    }
  }

  window.addEventListener('load',()=>{
    if(!location.pathname.endsWith('/admin.html')) return;

    // Always derive childIds from the actual multi-select immediately before save.
    const wrapSubmit=()=>{
      if(typeof window.submitAcctForm!=='function' || window.submitAcctForm.__parentLinkWrapped) return;
      const original=window.submitAcctForm;
      const wrapped=async function(e){
        try{
          const role=String(document.getElementById('acctRole')?.value||'').toUpperCase();
          if(role==='PARENT'){
            const sel=document.getElementById('acctChildSelect');
            const ids=sel ? Array.from(sel.selectedOptions).map(o=>o.value).filter(Boolean) : [];
            const hidden=document.getElementById('acctChildIds');
            if(hidden) hidden.value=ids.join(',');
          }
        }catch{}
        const result=await original(e);
        setTimeout(repairExistingLinks,600);
        return result;
      };
      wrapped.__parentLinkWrapped=true;
      window.submitAcctForm=wrapped;
    };

    setTimeout(wrapSubmit,300);
    setTimeout(wrapSubmit,1000);
    setTimeout(repairExistingLinks,1200);
  });
})();
