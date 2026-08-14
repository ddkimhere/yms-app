/* YMS teacher quick homework form: textbook + mobile-safe submit actions */
(function(){
  'use strict';

  const u=window.YMS_Auth?.getUser?.();
  if(!u || !(window.YMS_Auth?.hasRole?.('TEACHER',u) || String(u.role||'').toUpperCase()==='ADMIN')) return;

  function setModalOpen(open){
    document.body.classList.toggle('yms-hw-modal-open',!!open);
  }

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

  if(!document.getElementById('yms-teacher-homework-form-style')){
    const style=document.createElement('style');
    style.id='yms-teacher-homework-form-style';
    style.textContent=`
      body.yms-hw-modal-open #teacherMobileNav{display:none!important}
      body.yms-hw-modal-open{padding-bottom:0!important;overflow:hidden!important}
      #hwRegModal{z-index:100000!important}
      #hwRegModal .yms-hw-mobile-sheet{overflow-y:auto!important;overscroll-behavior:contain!important}
      #hwRegModal .yms-hw-sticky-actions{position:sticky!important;bottom:0!important;z-index:20!important;background:#fff!important;padding:12px 0 calc(10px + env(safe-area-inset-bottom))!important;margin-top:8px!important;border-top:1px solid #E3E8F4!important;box-shadow:0 -8px 18px rgba(30,50,120,.06)!important}
      #hwRegModal .yms-hw-sticky-actions .btn{min-height:50px!important}
      @media(max-width:700px){
        #hwRegModal{align-items:flex-end!important;padding:0!important}
        #hwRegModal .modal-sheet{width:100%!important;max-width:560px!important;max-height:calc(100dvh - 12px)!important;border-radius:24px 24px 0 0!important;padding:18px 20px 0!important}
        #hwRegModal .hw-register-form{padding-bottom:0!important}
      }
    `;
    document.head.appendChild(style);
  }

  const originalShow=window.showHwRegModal;
  if(typeof originalShow==='function'){
    window.showHwRegModal=function(classId){
      originalShow(classId);
      install();
      setModalOpen(true);
      const sheet=document.querySelector('#hwRegModal .modal-sheet');
      if(sheet) sheet.scrollTop=0;
    };
  }

  const originalClose=window.closeHwRegModal;
  window.closeHwRegModal=function(){
    setModalOpen(false);
    if(typeof originalClose==='function') return originalClose();
    document.getElementById('hwRegModal')?.classList.add('hidden');
    document.getElementById('hwRegForm')?.reset();
  };

  const modal=document.getElementById('hwRegModal');
  if(modal){
    new MutationObserver(()=>setModalOpen(!modal.classList.contains('hidden'))).observe(modal,{attributes:true,attributeFilter:['class']});
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
      window.closeHwRegModal();
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
