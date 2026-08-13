/* YMS individual homework */
(function(){
  let students=[],teacherClasses=[];
  const authUser=()=>window.YMS_Auth?.getUser?.()||null;
  const teacherMode=()=>new URLSearchParams(location.search).get('mode')==='teacher';
  const norm=v=>String(v||'').trim().toLowerCase();

  async function loadScope(){
    try{
      const u=authUser();
      const [sr,cr]=await Promise.all([_tFetch('tables/students?limit=500'),_tFetch('tables/classes?limit=200')]);
      const allStudents=sr.ok?((await sr.json()).data||[]):[];
      const allClasses=cr.ok?((await cr.json()).data||[]):[];
      if(!teacherMode()){students=allStudents;teacherClasses=allClasses;return;}
      const assigned=Array.isArray(u?.teacherClasses)?u.teacherClasses:String(u?.teacherClasses||'').split(',').map(x=>x.trim()).filter(Boolean);
      const uid=String(u?.id||u?.uid||''),un=norm(u?.name);
      teacherClasses=allClasses.filter(c=>(uid&&String(c.teacherId||'')===uid)||(un&&norm(c.teacherName)===un)||assigned.includes(String(c.id||''))||assigned.includes(String(c.className||'')));
      const ids=new Set(teacherClasses.map(c=>String(c.id||'')).filter(Boolean)),names=new Set(teacherClasses.map(c=>String(c.className||'')).filter(Boolean));
      students=allStudents.filter(s=>ids.has(String(s.classId||''))||names.has(String(s.className||'')));
    }catch(e){students=[];teacherClasses=[];}
  }

  function installFields(){
    const form=document.getElementById('hwRegForm');
    const classRow=document.getElementById('hwClassId')?.closest('.form-group');
    if(!form||!classRow||document.getElementById('hwTargetType')) return;
    const target=document.createElement('div');target.className='form-group';target.style.margin='0';
    target.innerHTML='<label class="form-label">숙제 대상</label><select class="form-input form-select" id="hwTargetType"><option value="CLASS">반 전체</option><option value="STUDENT">개별 학생</option></select>';
    classRow.before(target);
    const row=document.createElement('div');row.id='hwStudentRow';row.className='form-group hidden';row.style.margin='0';
    row.innerHTML='<label class="form-label">학생 선택</label><select class="form-input form-select" id="hwStudentId"><option value="">— 학생 선택 —</option></select>';
    classRow.after(row);document.getElementById('hwTargetType').addEventListener('change',toggleTarget);
  }

  function toggleTarget(){const p=document.getElementById('hwTargetType')?.value==='STUDENT';document.getElementById('hwStudentRow')?.classList.toggle('hidden',!p);document.getElementById('hwClassId')?.closest('.form-group')?.classList.toggle('hidden',p);}
  function fillStudents(){const s=document.getElementById('hwStudentId');if(!s)return;const list=students.filter(x=>x.isActive!==false).sort((a,b)=>(a.className||'').localeCompare(b.className||'','ko')||(a.name||'').localeCompare(b.name||'','ko'));s.innerHTML='<option value="">— 학생 선택 —</option>'+list.map(x=>'<option value="'+x.id+'">'+(x.name||'-')+(x.className?' · '+x.className:'')+'</option>').join('');}
  function fillClasses(){if(!teacherMode())return;const s=document.getElementById('hwClassId');if(!s)return;s.innerHTML=teacherClasses.map(c=>'<option value="'+c.id+'" data-name="'+(c.className||'')+'" data-level="'+(c.levelCode||'')+'">'+(c.className||'-')+'</option>').join('');}

  const oldShow=window.showHwRegModal;
  window.showHwRegModal=async function(){if(typeof oldShow==='function')oldShow();installFields();await loadScope();fillClasses();fillStudents();const t=document.getElementById('hwTargetType');if(t)t.value='CLASS';toggleTarget();};

  window.submitHomework=async function(e){
    e.preventDefault();const btn=document.getElementById('hwRegBtn');if(btn){btn.disabled=true;btn.textContent='등록 중...';}
    try{
      const type=document.getElementById('hwTargetType')?.value||'CLASS',classSel=document.getElementById('hwClassId'),stuSel=document.getElementById('hwStudentId');
      const student=type==='STUDENT'?students.find(s=>s.id===stuSel?.value):null;if(type==='STUDENT'&&!student)throw new Error('학생을 선택해주세요.');
      const opt=classSel?.options[classSel.selectedIndex];if(type==='CLASS'&&teacherMode()&&!opt)throw new Error('담당 반이 없습니다.');
      const due=document.getElementById('hwDueDate')?.value||'',u=authUser();
      const p={title:document.getElementById('hwTitle')?.value.trim()||'',content:document.getElementById('hwContent')?.value.trim()||'',subject:document.getElementById('hwSubject')?.value.trim()||'영어',className:student?.className||opt?.dataset.name||'',levelCode:student?.levelCode||opt?.dataset.level||'',teacherId:u?.id||u?.uid||'',teacherName:u?.name||'',dueAt:due?new Date(due+'T21:00:00+09:00').toISOString():null,isVisible:true,targetType:type,targetStudentId:student?.id||'',targetStudentName:student?.name||''};
      const r=await _tFetch('tables/homework',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});if(!r.ok)throw new Error('숙제 저장에 실패했습니다.');
      YMS_UI.toast(type==='STUDENT'?'개인 숙제가 등록되었습니다! 👤':'숙제가 등록되었습니다! 📚');document.getElementById('hwRegModal')?.classList.add('hidden');document.getElementById('hwRegForm')?.reset();setTimeout(()=>location.reload(),250);
    }catch(err){YMS_UI.toast('❌ '+(err?.message||'숙제 등록 실패'));}finally{if(btn){btn.disabled=false;btn.textContent='등록하기';}}
  };

  installFields();
  if(!document.querySelector('script[src$="js/homework-filter.js"]')){const s=document.createElement('script');s.src='js/homework-filter.js';document.body.appendChild(s);}
})();