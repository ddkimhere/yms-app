/* One-time cleanup: remove counseling records created before 2026-08-28 00:07 KST */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;
  const me=window.YMS_Auth?.getUser?.();
  const role=String(me?.role||'').toUpperCase();
  const roles=Array.isArray(me?.roles)?me.roles.map(r=>String(r).toUpperCase()):[];
  if(!(role==='ADMIN'||roles.includes('ADMIN'))||!window._tFetch) return;

  const CUTOFF=Date.parse('2026-08-27T15:07:00.000Z');
  const DONE_KEY='yms_counseling_reset_before_20260828_0007_done';

  function recordTime(r){
    const raw=r?.createdAt||r?.created_at||r?.repliedAt||r?.updatedAt||r?.updated_at||'';
    const t=Date.parse(String(raw||''));
    return Number.isFinite(t)?t:null;
  }

  async function run(){
    if(localStorage.getItem(DONE_KEY)==='1') return;
    try{
      const res=await _tFetch('tables/counseling?limit=1000',{cache:'no-store',ymsNoCache:true});
      if(!res.ok) throw new Error(`상담 기록 조회 실패 (HTTP ${res.status})`);
      const list=((await res.json()).data||[]);
      const targets=list.filter(r=>{const t=recordTime(r);return t===null||t<=CUTOFF;});
      let deleted=0,failed=0;
      for(const r of targets){
        if(!r?.id){failed++;continue;}
        const d=await _tFetch('tables/counseling/'+encodeURIComponent(r.id),{method:'DELETE'});
        if(d.ok)deleted++;else failed++;
      }
      if(failed===0){
        localStorage.setItem(DONE_KEY,'1');
        window.YMS_clearReadCache?.();
        window.YMS_UI?.toast?.(`✅ 이전 상담기록 ${deleted}건을 삭제했습니다`);
      }else{
        window.YMS_UI?.toast?.(`⚠️ 상담기록 ${deleted}건 삭제, ${failed}건 실패`);
      }
    }catch(e){
      console.error('[YMS] counseling reset failed',e);
      window.YMS_UI?.toast?.('❌ 이전 상담기록 삭제에 실패했습니다');
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,700),{once:true});
  else setTimeout(run,700);
})();
