/* YMS teacher quick homework form: textbook + visible submit actions */
(function(){
  'use strict';

  const u=window.YMS_Auth?.getUser?.();
  if(!u || !(window.YMS_Auth?.hasRole?.('TEACHER',u) || String(u.role||'').toUpperCase()==='ADMIN')) return;

  function install(){
    const form=document.getElementById('hwRegForm');
    if(!form) return;

    if(!document.getElementById('hwTextbook')){
      const content=document.getElementById('hwContent')?.closest('.form-group');
      if(content){
        const row=document.createElement('div');
        row.className='form-group';
        row.style.marginBottom='0';
        row.innerHTML='<label class="form-label" for="hwTextbook">교재</label><input type="text" class="form-input" id="hwTextbook" placeholder="예) Reading it 200-1 / 워크북">';
        content.before(row);
      }
    }

    const submit=document.getElementById('hwRegSubmitBtn');
    const actions=submit?.parentElement;
    if(actions) actions.classList.add('yms-hw-sticky-actions');

    const sheet=document.querySelector('#hwRegModal .modal-sheet');
    if(sheet) sheet.classList.add('yms-hw-mobile-sheet');
  }

  const style=document.createElement('style');
  style.id='yms-teacher-homework-form-style';
  style.textContent=`
    #hwRegModal .yms-hw-mobile-sheet{padding-bottom:18px!important;overflow-y:auto!important}
    #hwRegModal .yms-hw-sticky-actions{position:sticky!important;bottom:-1px!important;z-index:5!important;background:#fff!important;padding:12px 0 2px!important;margin-top:6px!important;border-top:1px solid #EEF1F7!important}
    #hwRegModal .yms-hw-sticky-actions .btn{min-height:48px!important}
    @media(max-width:640px){
      #hwRegModal{align-items:flex-end!important;padding:0!important}
      #hwRegModal .modal-sheet{width:100%!important;max-width:560px!important;max-height:82vh!important;border-radius:24px 24px 0 0!important;padding:18px 20px calc(18px + env(safe-area-inset-bottom))!important}
      #hwRegModal .hw-register-form{padding-bottom:4px!important}
    }
  `;
  document.head.appendChild(style);

  const originalShow=window.showHwRegModal;
  if(typeof originalShow==='function'){
    window.showHwRegModal=function(classId){
      originalShow(classId);
      install();
    };
  }

  window.submitHomework=async function(e){
    e.preventDefault();
    const btn=document.getElementById('hwRegSubmitBtn');
    if(btn){btn.disabled=true;btn.textContent='등록 중...';}

    try{
      const cls=(typeof _myClasses!=='undefined' ? _myClasses : []).find(c=>c.id===currentClassId||c.classId===currentClassId);
      const due=document.getElementById('hwDueDate')?.value||'';
      const payload={
        classId:currentClassId||'',
        className:cls?.className||'',
        subject:cls?.subject||'',
        teacherId:u?.id||u?.uid||'',
        teacherName:u?.name||'',
        title:document.getElementById('hwTitle')?.value.trim()||'',
        textbook:document.getElementById('hwTextbook')?.value.trim()||'',
        content:document.getElementById('hwContent')?.value.trim()||'',
        dueAt:due?new Date(due+'T21:00:00+09:00').toISOString():null,
        isVisible:true
      };
      if(!payload.title) throw new Error('숙제 제목을 입력해주세요.');
      const res=await _tFetch('tables/homework',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!res.ok) throw new Error('숙제 저장에 실패했습니다.');
      if(typeof closeHwRegModal==='function') closeHwRegModal();
      else document.getElementById('hwRegModal')?.classList.add('hidden');
      window.YMS_UI?.toast?.('숙제가 등록되었습니다! 📚');
    }catch(err){
      console.error('[YMS] 숙제 등록 실패',err);
      window.YMS_UI?.toast?.('❌ '+(err?.message||'등록 실패'));
    }finally{
      if(btn){btn.disabled=false;btn.textContent='숙제 등록';}
    }
  };

  install();
})();
