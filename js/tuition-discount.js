/* YMS tuition discount fields */
(function(){
  'use strict';

  function money(n){return Number(n||0).toLocaleString('ko-KR')+'원';}

  function installFields(){
    const amount=document.getElementById('at_amount');
    if(!amount) return;

    if(!document.getElementById('at_discountAmount')){
      const group=amount.closest('.form-group');
      const baseWrap=document.createElement('div');
      baseWrap.className='form-group';
      baseWrap.style.margin='0';
      baseWrap.innerHTML='<label class="form-label">기본 교육비</label><input type="number" class="form-input" id="at_baseAmount" min="0" placeholder="기본 교육비">';
      group.before(baseWrap);

      group.querySelector('.form-label').textContent='최종 교육비';
      amount.readOnly=true;
      amount.style.background='#F6F8FC';

      const discountWrap=document.createElement('div');
      discountWrap.style='display:grid;grid-template-columns:1fr 1fr;gap:12px;';
      discountWrap.innerHTML='<div class="form-group" style="margin:0;"><label class="form-label">할인 사유</label><input type="text" class="form-input" id="at_discountReason" placeholder="예) 형제 할인"></div><div class="form-group" style="margin:0;"><label class="form-label">할인 금액</label><input type="number" class="form-input" id="at_discountAmount" min="0" value="0" placeholder="0"></div>';
      group.before(discountWrap);

      const summary=document.createElement('div');
      summary.id='at_discountSummary';
      summary.style='padding:11px 13px;border-radius:12px;background:#EEF3FB;color:#1E3278;font-size:12px;font-weight:700;';
      summary.textContent='할인 없음';
      group.after(summary);

      const calc=()=>{
        const base=Math.max(0,Number(document.getElementById('at_baseAmount')?.value)||0);
        const discount=Math.max(0,Number(document.getElementById('at_discountAmount')?.value)||0);
        const applied=Math.min(base,discount);
        const finalAmount=Math.max(0,base-applied);
        amount.value=finalAmount;
        summary.textContent=applied?`기본 ${money(base)} - 할인 ${money(applied)} = 최종 ${money(finalAmount)}`:`최종 교육비 ${money(finalAmount)}`;
      };
      document.getElementById('at_baseAmount').addEventListener('input',calc);
      document.getElementById('at_discountAmount').addEventListener('input',calc);
      calc();
    }

    if(!document.getElementById('at_guideType')){
      const status=document.getElementById('at_status');
      const statusGroup=status?.closest('.form-group');
      if(statusGroup){
        const wrap=document.createElement('div');
        wrap.className='form-group';
        wrap.style.margin='0';
        wrap.innerHTML='<label class="form-label">결제 안내 방식</label><select class="form-input form-select" id="at_guideType"><option value="CASH">현금결제</option><option value="OTHER">그 외 결제 · 다이로움 QR 포함</option></select>';
        statusGroup.before(wrap);
      }
    }
  }

  const oldStudentChange=window.onAdminTuitionStudentChange;
  window.onAdminTuitionStudentChange=function(){
    if(typeof oldStudentChange==='function') oldStudentChange();
    installFields();
    const amount=document.getElementById('at_amount');
    const base=document.getElementById('at_baseAmount');
    if(base&&amount){
      base.value=amount.value||0;
      const dis=document.getElementById('at_discountAmount');if(dis)dis.value=0;
      base.dispatchEvent(new Event('input'));
    }
  };

  const oldShow=window.showAdminAddTuition;
  window.showAdminAddTuition=function(){
    const r=typeof oldShow==='function'?oldShow.apply(this,arguments):undefined;
    setTimeout(installFields,50);
    setTimeout(installFields,300);
    return r;
  };

  window.submitAdminTuition=async function(e){
    e.preventDefault();
    installFields();
    const btn=document.getElementById('at_submitBtn');
    if(btn){btn.disabled=true;btn.textContent='등록 중...';}
    const sel=document.getElementById('at_student');
    const opt=sel?.options?.[sel.selectedIndex];
    const studentId=sel?.value||'';
    if(!studentId){YMS_UI.toast('학생을 선택해주세요');if(btn){btn.disabled=false;btn.textContent='등록하기';}return;}

    const status=document.getElementById('at_status')?.value||'UNPAID';
    const method=status==='PAID'?(document.getElementById('at_method')?.value||''):'';
    if(status==='PAID'&&!method){YMS_UI.toast('결제 수단을 선택해주세요');if(btn){btn.disabled=false;btn.textContent='등록하기';}return;}

    const guideType=document.getElementById('at_guideType')?.value||'OTHER';
    const baseAmount=Math.max(0,Number(document.getElementById('at_baseAmount')?.value)||0);
    const discountAmount=Math.min(baseAmount,Math.max(0,Number(document.getElementById('at_discountAmount')?.value)||0));
    const discountReason=(document.getElementById('at_discountReason')?.value||'').trim();
    const amount=Math.max(0,baseAmount-discountAmount);
    if(discountAmount>0&&!discountReason){YMS_UI.toast('할인 사유를 입력해주세요');if(btn){btn.disabled=false;btn.textContent='등록하기';}return;}

    const newPay={
      studentId,
      studentName:opt?.dataset?.name||'',
      className:document.getElementById('at_class')?.value||'',
      month:document.getElementById('at_month')?.value||'',
      type:'TUITION',
      baseAmount,
      discountAmount,
      discountReason,
      amount,
      guideType,
      paidAmount:status==='PAID'?amount:0,
      status,
      payMethod:method,
      paidAt:status==='PAID'?new Date().toISOString():null,
      dueDate:document.getElementById('at_due')?.value||'',
      memo:document.getElementById('at_memo')?.value||'',
      addedBy:'ADMIN'
    };

    try{
      const res=await _tFetch('tables/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newPay)});
      if(!res.ok) throw new Error('수강료 저장 실패');
      document.getElementById('adminAddTuitionModal').style.display='none';
      document.getElementById('adminTuitionForm')?.reset();
      document.getElementById('at_methodWrap')?.classList.add('hidden');
      YMS_UI.toast(discountAmount>0?`수강료가 등록되었습니다 · 할인 ${money(discountAmount)}`:'수강료가 등록되었습니다! 💳');
      if(typeof _adminPayList!=='undefined') _adminPayList=null;
      if(typeof renderPayTable==='function') renderPayTable();
      if(typeof fetchAdminPayments==='function') fetchAdminPayments();
    }catch(err){console.error('[YMS] tuition save',err);YMS_UI.toast('❌ '+(err?.message||'저장 실패'));}
    finally{if(btn){btn.disabled=false;btn.textContent='등록하기';}}
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installFields);else installFields();
  window.addEventListener('load',()=>setTimeout(installFields,300));
})();
