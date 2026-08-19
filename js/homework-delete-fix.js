/* YMS homework safe delete: delete exactly one document and refresh authoritative list */
(function(){
  'use strict';

  async function refreshHomework(){
    try{
      if(typeof window.YMS_refreshHomeworkAudience==='function'){
        await window.YMS_refreshHomeworkAudience();
        return;
      }
      if(typeof window.loadHomework==='function'){
        await window.loadHomework();
        return;
      }
      location.reload();
    }catch(e){
      console.warn('[YMS] 숙제 목록 새로고침 실패',e);
      location.reload();
    }
  }

  window.deleteHomework=async function(hwId){
    const id=String(hwId||'').trim();
    if(!id){
      window.YMS_UI?.toast?.('❌ 삭제할 숙제 정보가 없습니다.');
      return;
    }
    if(!confirm('이 숙제 1개만 삭제할까요?')) return;

    try{
      const res=await window._tFetch(`tables/homework/${encodeURIComponent(id)}`,{method:'DELETE'});
      if(!res?.ok){
        let detail='';
        try{detail=(await res?.json?.())?.error||'';}catch{}
        throw new Error(detail||`HTTP ${res?.status||'ERROR'}`);
      }
      window.YMS_UI?.toast?.('✅ 선택한 숙제 1개를 삭제했습니다.');
      await refreshHomework();
    }catch(e){
      console.error('[YMS] 숙제 삭제 실패',e);
      window.YMS_UI?.toast?.('❌ 숙제를 삭제하지 못했습니다. 다시 시도해주세요.');
      await refreshHomework();
    }
  };
})();
