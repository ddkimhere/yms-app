/* YMS individual homework */
(function(){
  let students=[];

  async function loadStudents(){
    try{
      const r=await _tFetch('tables/students?limit=500');
      students=r.ok?((await r.json()).data||[]):[];
    }catch(e){ students=[]; }
  }

  function installFields(){
    const form=document.getElementById('hwRegForm');
    const classRow=document.getElementById('hwClassId')?.closest('.form-group');
    if(!form||!classRow||document.getElementById('hwTargetType')) return;

    const target=document.createElement('div');
    target.className='form-group';
    target.style.margin='0';
    target.innerHTML='<label class="form-label">숙제 대상</label><select class="form-input form-select" id="hwTargetType"><option value="CLASS">반 전체</option><option value="STUDENT">개별 학생</option></select>';
    classRow.before(target);

    const studentRow=document.createElement('div');
    studentRow.id='hwStudentRow';
    studentRow.className='form-group hidden';
    studentRow.style.margin='0';
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
    const sel=document.getElementById('hwStudentId');
    if(!sel) return;
    const list=students.filter(s=>s.isActive!==false).sort((a,b)=>(a.className||'').localeCompare(b.className||'','ko')||(a.name||'').localeCompare(b.name||'','ko'));
    sel.innerHTML='<option value="">— 학생 선택 —</option>'+list.map(s=>'<option value="'+s.id+'">'+(s.name||'-')+(s.className?' · '+s.className:'')+'</option>').join('');
  }

  async function prepare(){
    installFields();
    await loadStudents();
    fillStudents();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',prepare);
  else prepare();
})();