/* YMS teacher quick homework form: mobile-safe + individual targeting */
(function(){
  'use strict';

  const u=window.YMS_Auth?.getUser?.();
  if(!u || !(window.YMS_Auth?.hasRole?.('TEACHER',u) || String(u.role||'').toUpperCase()==='ADMIN')) return;

  function setModalOpen(open){
    document.body.classList.toggle('yms-hw-modal-open',!!open);
  }

  function currentClass(){
    const list=(typeof _myClasses!=='undefined'&&Array.isArray(_myClasses))?_myClasses:[];
    return list.find(c=>String(c.id||c.classId||'')===String(currentClassId||''))||null;
  }

  function studentsForCurrentClass(){
    const cls=currentClass();
    const list=(typeof _myStudents!=='undefined'&&Array.isArray(_myStudents))?_myStudents:[];
    const cid=String(currentClassId||'');
    const cname=String(cls?.className||'');
    return list.filter(s=>s.isActive!==false && ((cid&&String(s.classId||'')===cid)||(cname&&String(s.className||'')===cname)))
      .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko'));
  }

  function toggleTarget(){
    const personal=document.getElementById('teacherHwTargetType')?.value==='STUDENT';
    document.getElementById('teacherHwStudentWrap')?.classList.toggle('hidden',!personal);
  }

  function install(){
    const form=document.getElementById('hwRegForm');
    if(!form) return;

    document.getElementById('hwTextbook')?.closest('.form-group')?.remove();

    if(!document.getElementById('teacherHwTargetType')){
      const titleRow=document.getElementById('hwTitle')?.closest('.form-group');
      const target=document.createElement('div');
      target.className='form-group';
      target.style.marginBottom='0';
      target.innerHTML=`
        <label class="form-label" for="teacherHwTargetType">숙제 대상</label>
        <select class="form-input form-select" id="teacherHwTargetType">
          <option value="CLASS">반 전체</option>
          <option value="STUDENT">개별 학생</option>
        </select>`;
      const student=document.createElement('div');
      student.className='form-group hidden';
      student.id='teacherHwStudentWrap';
      student.style.marginBottom='0';
      student.innerHTML=`
        <label class="form-label" for="teacherHwStudentId">학생 선택</label>
        <select class="form-input form-select" id="teacherHwStudentId"></select>`;
      if(titleRow){form.insertBefore(target,titleRow);form.insertBefore(student,titleRow);}
      else{form.prepend(student);form.prepend(target);}
      target.querySelector('select')?.addEventListener('change',toggleTarget);
    }

    const sel=document.getElementById('teacherHwStudentId');
    if(sel){
      const students=studentsForCurrentClass();
      sel.innerHTML='<option value="">— 학생 선택 —</option>'+students.map(s=>`<option value="${String(s.id||'').replace(/"/g,'&quot;')}">${String(s.name||'학생')}${s.grade?' · '+String(s.grade):''}</option>`).join('');
    }

    const target=document.getElementById('teacherHwTargetType');
    if(target&&!target.value)target.value='CLASS';
    toggleTarget();

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
      const target=document.getElementById('teacherHwTargetType');
      if(target)target.value='CLASS';
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
      const cls=currentClass();
      if(!cls)throw new Error('반 정보를 찾을 수 없습니다.');
      const due=document.getElementById('hwDueDate')?.value||'';
      const targetType=document.getElementById('teacherHwTargetType')?.value||'CLASS';
      const studentId=document.getElementById('teacherHwStudentId')?.value||'';
      const student=targetType==='STUDENT'?studentsForCurrentClass().find(s=>String(s.id)===String(studentId)):null;
      if(targetType==='STUDENT'&&!student)throw new Error('학생을 선택해주세요.');

      const payload={
        classId:String(currentClassId||cls?.id||cls?.classId||''),
        className:cls?.className||'',
        subject:cls?.subject||'영어',
        teacherId:u?.id||u?.uid||'',
        teacherName:u?.name||'',
        title:document.getElementById('hwTitle')?.value.trim()||'',
        content:document.getElementById('hwContent')?.value.trim()||'',
        dueAt:due?new Date(due+'T21:00:00+09:00').toISOString():null,
        isVisible:true,
        targetType,
        targetStudentId:student?.id||'',
        targetStudentName:student?.name||''
      };
      if(!payload.title) throw new Error('숙제 제목을 입력해주세요.');
      const res=await _tFetch('tables/homework',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!res.ok) throw new Error('숙제 저장에 실패했습니다.');
      window.closeHwRegModal();
      window.YMS_UI?.toast?.(targetType==='STUDENT'?'개별 숙제가 등록되었습니다! 👤':'숙제가 등록되었습니다! 📚');
    }catch(err){
      console.error('[YMS] 숙제 등록 실패',err);
      window.YMS_UI?.toast?.('❌ '+(err?.message||'등록 실패'));
    }finally{
      if(btn){btn.disabled=false;btn.textContent='숙제 등록';}
    }
  };

  install();
})();