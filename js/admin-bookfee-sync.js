/* YMS Admin — sync teacher book-fee edits/deletes into billing view */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  let lastRefreshAt=0;
  let refreshing=false;
  const MIN_REFRESH_GAP=8000;

  function paymentVisible(){
    const sec=document.getElementById('section-payments');
    return !!sec && !sec.classList.contains('hidden');
  }

  async function refreshBilling(reason,force=false){
    if(!paymentVisible()||refreshing) return;
    const now=Date.now();
    if(!force && now-lastRefreshAt<MIN_REFRESH_GAP) return;
    refreshing=true;
    try{
      if(typeof window.YMS_clearReadCache==='function') window.YMS_clearReadCache();
      if(typeof window.initPayments==='function') await window.initPayments();
      lastRefreshAt=Date.now();
      if(reason==='change') window.YMS_UI?.toast?.('✅ 교재비 변경이 수납관리에 반영되었습니다');
    }catch(e){
      console.warn('[YMS] admin book fee sync',e);
    }finally{refreshing=false;}
  }

  window.addEventListener('storage',e=>{
    if(e.key==='yms_bookfee_changed'&&e.newValue) refreshBilling('change',true);
  });
  window.addEventListener('yms:bookfee-changed',()=>refreshBilling('change',true));
  try{
    const ch=new BroadcastChannel('yms-bookfees');
    ch.onmessage=()=>refreshBilling('change',true);
  }catch{}

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible') refreshBilling('resume',false);
  });
  window.addEventListener('focus',()=>refreshBilling('resume',false));

  document.addEventListener('click',e=>{
    if(e.target.closest('#nav-payments')) setTimeout(()=>refreshBilling('open',true),120);
  },true);
})();