/* YMS individual homework */
(function(){
  let students=[];
  const authUser=()=>window.YMS_Auth?.getUser?.()||null;

  async function loadStudents(){
    try{const r=await _tFetch('tables/students?limit=500');students=r.ok?((await r.json()).data||[]):[];}catch(e){students=[];}
  }

  function installFields(){
    const form=document.getElementById('hwRegForm');
    const classRow=document.getElementById('hwClassId')?.closest('.form-group');
    if(!form||!classRow||document.getElementById('hwTargetType')) return;
    const target=document.createElement('div');
    target.className='form-group';target.style.margin='0';
    target.innerHTML='<label class="form-label">숙제 대상</label><select class="form-input form-select" id="hwTargetType"><option value="CLASS">반 전체</option><option value="STUDENT">개별 학생</option></select>';
    classRow.before(target);
    const studentRow=document.createElement('div');
    studentRow.id='hwStudentRow';studentRow.className='form-group hidden';studentRow.style.margin='0';
    studentRow.innerHTML='<label class="form-label">학생 선택</label><select class="form-input form-select" id="hwStudentId"><option value="">— 학생 선택 —</option></select>';
    classRow.after(studentRow);
    document.getElementById('hwTargetType').addEventListener('change',toggleTarget);
  }

  function toggleTarget(){
    const personal=document.getElementById('hwTargetType')?.value==='STUDENT';
    document.getElementById('hwStudentRow')?.classList.toggle('hidden',!personal);
    document.getElementById('hwClassId')?.closest('.form-group')?.classList.toggle('hidden',personal);
  }

  function fillStudents(){
    const sel=document.getElementById('hwStudentId');if(!sel)return;
    const list=students.filter(s=>s.isActive!==false).sort((a,b)=>(a.className||'').localeCompare(b.className||'','ko')||(a.name||'').localeCompare(b.name||'','ko'));
    sel.innerHTML='<option value="">— 학생 선택 —</option>'+list.map(s=>'<option value="'+s.id+'">'+(s.name||'-')+(s.className?' · '+s.className:'')+'</option>').join('');
  }

  const oldShow=window.showHwRegModal;
  window.showHwRegModal=async function(){
    if(typeof oldShow==='function') oldShow();
    installFields();await loadStudents();fillStudents();
    const t=document.getElementById('hwTargetType');if(t)t.value='CLASS';toggleTarget();
  };

  window.submitHomework=async function(e){
    e.preventDefault();
    const btn=document.getElementById('hwRegBtn');if(btn){btn.disabled=true;btn.textContent='등록 중...';}
    try{
      const type=document.getElementById('hwTargetType')?.value||'CLASS';
      const classSel=document.getElementById('hwClassId');
      const stuSel=document.getElementById('hwStudentId');
      const student=type==='STUDENT'?students.find(s=>s.id===stuSel?.value):null;
      if(type==='STUDENT'&&!student) throw new Error('학생을 선택해주세요.');
      const classOpt=classSel?.options[classSel.selectedIndex];
      const dueDate=document.getElementById('hwDueDate')?.value||'';
      const dueAt=dueDate?new Date(dueDate+'T21:00:00+09:00').toISOString():null;
      const u=authUser();
      const payload={
        title:document.getElementById('hwTitle')?.value.trim()||'',
        content:document.getElementById('hwContent')?.value.trim()||'',
        subject:document.getElementById('hwSubject')?.value.trim()||'영어',
        className:student?.className||classOpt?.dataset.name||'',
        levelCode:student?.levelCode||classOpt?.dataset.level||'',
        teacherId:u?.id||u?.uid||'',teacherName:u?.name||'',dueAt,isVisible:true,
        targetType:type,targetStudentId:student?.id||'',targetStudentName:student?.name||''
      };
      const r=await _tFetch('tables/homework',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok) throw new Error('숙제 저장에 실패했습니다.');
      YMS_UI.toast(type==='STUDENT'?'개인 숙제가 등록되었습니다! 👤':'숙제가 등록되었습니다! 📚');
      document.getElementById('hwRegModal')?.classList.add('hidden');
      document.getElementById('hwRegForm')?.reset();
      setTimeout(()=>window.location.reload(),250);
    }catch(err){YMS_UI.toast('❌ '+(err?.message||'숙제 등록 실패'));}
    finally{if(btn){btn.disabled=false;btn.textContent='등록하기';}}
  };

  installFields();
  if(!document.querySelector('script[src$="js/homework-filter.js"]')){
    const s=document.createElement('script');s.src='js/homework-filter.js';document.body.appendChild(s);
  }
})();