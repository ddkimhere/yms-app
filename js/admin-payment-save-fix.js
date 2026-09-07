/* YMS Admin payment save hardening — never swallow Firestore write errors */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html') || !window._tFetch) return;

  const toast=m=>window.YMS_UI?.toast?.(m);
  const role=()=>String(window.YMS_Auth?.getUser?.()?.role||'').toUpperCase();

  async function refreshPayments(){
    try{ if(typeof window.YMS_clearReadCache==='function') window.YMS_clearReadCache(); }catch{}
    try{ if(typeof window.fetchAdminPayments==='function') await window.fetchAdminPayments(); }catch{}
    try{ if(typeof window.initPayments==='function') await window.initPayments(); }catch{}
  }

  window.submitAdminTuition=async function(e){
    e?.preventDefault?.();
    const btn=document.getElementById('at_submitBtn');
    const resetBtn=()=>{if(btn){btn.disabled=false;btn.textContent='등록하기';}};
    if(role()!=='ADMIN'){toast('❌ 관리자 계정에서만 수납 저장이 가능합니다');resetBtn();return;}

    const sel=document.getElementById('at_student');
    const opt=sel?.options?.[sel.selectedIndex];
    const studentId=sel?.value||'';
    if(!studentId){toast('학생을 선택해주세요');resetBtn();return;}
    const status=document.getElementById('at_status')?.value||'UNPAID';
    const method=status==='PAID'?(document.getElementById('at_method')?.value||''):'';
    if(status==='PAID'&&!method){toast('결제 수단을 선택해주세요');resetBtn();return;}
    const amount=Number(document.getElementById('at_amount')?.value||0);
    if(!(amount>=0)){toast('금액을 확인해주세요');resetBtn();return;}
    const month=document.getElementById('at_month')?.value||'';
    if(!month){toast('수납 월을 선택해주세요');resetBtn();return;}

    const payload={
      studentId,
      studentName:opt?.dataset?.name||opt?.textContent?.split('·')[0]?.trim()||'',
      className:document.getElementById('at_class')?.value||'',
      month,
      type:'TUITION',
      amount,
      paidAmount:status==='PAID'?amount:0,
      status,
      payMethod:method,
      paidAt:status==='PAID'?new Date().toISOString():null,
      dueDate:document.getElementById('at_due')?.value||'',
      memo:document.getElementById('at_memo')?.value||'',
      addedBy:'ADMIN',
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };

    if(btn){btn.disabled=true;btn.textContent='저장 중...';}
    try{
      const r=await _tFetch('tables/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok){
        let detail='';try{detail=await r.text();}catch{}
        throw new Error(`HTTP ${r.status}${detail?` · ${detail.slice(0,120)}`:''}`);
      }
      const modal=document.getElementById('adminAddTuitionModal');if(modal)modal.style.display='none';
      document.getElementById('adminTuitionForm')?.reset?.();
      document.getElementById('at_methodWrap')?.classList.add('hidden');
      if(typeof window._adminPayList!=='undefined') window._adminPayList=null;
      toast('✅ 수강료가 저장되었습니다');
      await refreshPayments();
    }catch(err){
      console.error('[YMS] admin tuition save failed',err);
      toast('❌ 수납 저장 실패: '+(err?.message||'알 수 없는 오류'));
    }finally{resetBtn();}
  };

  // Annual grid buttons: keep the existing UI but make failures visible and recover the button state.
  function patchGridSave(){
    const old=window.YMS_setMonthPayStatus;
    if(typeof old!=='function'||old.__ymsPaymentSaveFixed) return false;
    const wrapped=async function(btn,studentId,targetMonth,nextStatus){
      try{
        await old.apply(this,arguments);
      }catch(err){
        console.error('[YMS] month payment save uncaught',err);
        if(btn)btn.disabled=false;
        toast('❌ 수납 상태 저장 실패: '+(err?.message||'알 수 없는 오류'));
      }
    };
    wrapped.__ymsPaymentSaveFixed=true;
    window.YMS_setMonthPayStatus=wrapped;
    return true;
  }
  if(!patchGridSave()) setTimeout(patchGridSave,250);
  setTimeout(patchGridSave,800);
})();
