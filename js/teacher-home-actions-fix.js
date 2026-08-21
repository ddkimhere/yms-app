/* YMS teacher home actions + ordering + homework targeting */
(function(){
  'use strict';
  const u=window.YMS_Auth?.getUser?.();
  const isTeacher=!!u&&(String(u.role||'').toUpperCase()==='TEACHER'||window.YMS_Auth?.hasRole?.('TEACHER',u));
  if(!isTeacher||!(location.pathname||'').endsWith('/teacher-home.html'))return;

  if(!document.getElementById('yms-teacher-home-action-style')){
    const s=document.createElement('style');
    s.id='yms-teacher-home-action-style';
    s.textContent=`
      body.yms-att-modal-open #teacherMobileNav,
      body.yms-hw-modal-open #teacherMobileNav{display:none!important}
      body.yms-att-modal-open,
      body.yms-hw-modal-open{overflow:hidden!important;padding-bottom:0!important}
      #attModal{z-index:100001!important}
      #hwRegModal{z-index:100000!important}
      #attModal .modal-sheet{max-height:calc(100dvh - 12px)!important;overflow-y:auto!important;overscroll-behavior:contain!important;padding-bottom:calc(24px + env(safe-area-inset-bottom))!important}
      #attModalDate{margin:-4px 0 8px;padding:8px 10px;border-radius:10px;background:#F4F7FD;color:#526080;font-size:12px;font-weight:800}
      #hwRegModal .yms-hw-mobile-sheet{overflow-y:auto!important;overscroll-behavior:contain!important}
      #hwRegModal .yms-hw-sticky-actions{position:sticky!important;bottom:0!important;z-index:20!important;background:#fff!important;padding:12px 0 calc(10px + env(safe-area-inset-bottom))!important;margin-top:8px!important;border-top:1px solid #E3E8F4!important;box-shadow:0 -8px 18px rgba(30,50,120,.06)!important}
      #hwRegModal .yms-hw-sticky-actions .btn{min-height:50px!important}
      @media(max-width:700px){
        #attModal,#hwRegModal{align-items:flex-end!important;padding:0!important}
        #attModal .modal-sheet,#hwRegModal .modal-sheet{width:100%!important;max-width:560px!important;max-height:calc(100dvh - 12px)!important;border-radius:24px 24px 0 0!important}
        #hwRegModal .modal-sheet{padding:18px 20px 0!important}
        #hwRegModal .hw-register-form{padding-bottom:0!important}
      }
    `;
    document.head.appendChild(s);
  }

  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  function gradeKey(cls){
    const s=[cls?.grade,cls?.className,cls?.name,cls?.levelCode].filter(Boolean).join(' ');
    let m;
    m=s.match(/초중학교\s*([4-6])\s*(?:학년)?/i); if(m)return 100+Number(m[1]);
    m=s.match(/(?:초등학교|초등|초)\s*([1-6])\s*(?:학년)?/i); if(m)return 100+Number(m[1]);
    m=s.match(/(?:중학교|중등|중)\s*([1-3])\s*(?:학년)?/i); if(m)return 200+Number(m[1]);
    m=s.match(/(?:고등학교|고등|고)\s*([1-3])\s*(?:학년)?/i); if(m)return 300+Number(m[1]);
    return 999;
  }
  function sortTeacherClasses(){
    try{
      if(typeof _myClasses==='undefined'||!Array.isArray(_myClasses)||_myClasses.length<2)return;
      _myClasses.sort((a,b)=>gradeKey(a)-gradeKey(b)||clean(a?.className||a?.name).localeCompare(clean(b?.className||b?.name),'ko',{numeric:true,sensitivity:'base'}));
    }catch{}
  }

  function todayKey(){
    const d=new Date();
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function formatToday(){
    const [y,m,day]=todayKey().split('-');
    return `📅 ${y}. ${m}. ${day}.`;
  }
  function ensureAttDate(){
    const modal=document.getElementById('attModal');
    if(!modal)return;
    let el=document.getElementById('attModalDate');
    if(!el){
      el=document.createElement('div');el.id='attModalDate';
      const label=document.getElementById('attModalClassLabel');
      if(label)label.before(el); else modal.querySelector('.modal-title')?.after(el);
    }
    el.textContent=formatToday();
  }
  function syncAttModal(){
    const modal=document.getElementById('attModal');
    const open=!!modal&&!modal.classList.contains('hidden');
    document.body.classList.toggle('yms-att-modal-open',open);
    if(open)ensureAttDate();
  }

  function classById(classId){
    const list=(typeof _myClasses!=='undefined'&&Array.isArray(_myClasses))?_myClasses:[];
    return list.find(c=>String(c.id||c.classId||'')===String(classId||''))||null;
  }
  async function restoreAttendanceState(classId){
    const cls=classById(classId);
    if(!cls)return;
    try{
      const res=await _tFetch('tables/attendance?limit=1000',{cache:'no-store'});
      if(!res.ok)return;
      const json=await res.json();
      const map={};
      (json.data||[]).forEach(r=>{
        const sameDate=String(r.date||'')===todayKey();
        const sameClass=(cls.id&&String(r.classId||'')===String(cls.id)) || (cls.className&&String(r.className||'')===String(cls.className));
        if(sameDate&&sameClass&&r.studentId)map[String(r.studentId)]={id:r.id,status:String(r.status||'PRESENT').toUpperCase()};
      });
      document.querySelectorAll('#attStudentList .att-student-row').forEach(row=>{
        const sid=String(row.dataset.studentId||'');
        const saved=map[sid];
        const status=saved?.status||'PRESENT';
        if(typeof attStatus!=='undefined')attStatus[sid]=status;
        if(saved?.id)row.dataset.existingId=saved.id;
        row.querySelectorAll('.att-toggle').forEach(btn=>btn.classList.toggle('active',String(btn.dataset.status||'').toUpperCase()===status));
      });
      const dateEl=document.getElementById('attModalDate');
      if(dateEl&&Object.keys(map).length)dateEl.textContent=formatToday()+' · 저장된 출결 불러옴';
    }catch(e){
      console.warn('[YMS] 저장된 출결 불러오기 실패',e);
    }
  }

  function currentClass(){
    const list=(typeof _myClasses!=='undefined'&&Array.isArray(_myClasses))?_myClasses:[];
    return list.find(c=>String(c.id||c.classId||'')===String(window.currentClassId||currentClassId||''))||null;
  }
  function studentsForCurrentClass(){
    const cls=currentClass();
    const list=(typeof _myStudents!=='undefined'&&Array.isArray(_myStudents))?_myStudents:[];
    const cid=String(window.currentClassId||currentClassId||'');
    const cname=String(cls?.className||'');
    return list.filter(s=>s.isActive!==false&&((cid&&String(s.classId||'')===cid)||(cname&&String(s.className||'')===cname)))
      .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko'));
  }
  function toggleHwTarget(){
    const personal=document.getElementById('teacherHwTargetType')?.value==='STUDENT';
    document.getElementById('teacherHwStudentWrap')?.classList.toggle('hidden',!personal);
  }
  function installHomeworkForm(){
    const form=document.getElementById('hwRegForm');
    if(!form)return;
    document.getElementById('hwTextbook')?.closest('.form-group')?.remove();

    if(!document.getElementById('teacherHwTargetType')){
      const titleRow=document.getElementById('hwTitle')?.closest('.form-group');
      const target=document.createElement('div');
      target.className='form-group';target.style.marginBottom='0';
      target.innerHTML=`<label class="form-label" for="teacherHwTargetType">숙제 대상</label><select class="form-input form-select" id="teacherHwTargetType"><option value="CLASS">반 전체</option><option value="STUDENT">개별 학생</option></select>`;
      const student=document.createElement('div');
      student.className='form-group hidden';student.id='teacherHwStudentWrap';student.style.marginBottom='0';
      student.innerHTML=`<label class="form-label" for="teacherHwStudentId">학생 선택</label><select class="form-input form-select" id="teacherHwStudentId"></select>`;
      if(titleRow){form.insertBefore(target,titleRow);form.insertBefore(student,titleRow);}else{form.prepend(student);form.prepend(target);}
      target.querySelector('select')?.addEventListener('change',toggleHwTarget);
    }

    const sel=document.getElementById('teacherHwStudentId');
    if(sel){
      const students=studentsForCurrentClass();
      sel.innerHTML='<option value="">— 학생 선택 —</option>'+students.map(s=>`<option value="${String(s.id||'').replace(/"/g,'&quot;')}">${String(s.name||'학생')}${s.grade?' · '+String(s.grade):''}</option>`).join('');
    }
    const target=document.getElementById('teacherHwTargetType');
    if(target&&!target.value)target.value='CLASS';
    toggleHwTarget();
    document.getElementById('hwRegSubmitBtn')?.parentElement?.classList.add('yms-hw-sticky-actions');
    document.querySelector('#hwRegModal .modal-sheet')?.classList.add('yms-hw-mobile-sheet');
  }

  function classIdFrom(btn){
    const raw=btn?.getAttribute('onclick')||'';
    const m=raw.match(/(?:showAttModal|showHwRegModal)\(['"]([^'"]*)['"]\)/);
    if(m)return m[1];
    return btn?.dataset?.classId||'';
  }
  function run(btn){
    if(!btn||!btn.closest('.class-actions'))return false;
    const text=String(btn.textContent||'');
    const cid=classIdFrom(btn);
    try{
      if(text.includes('출결')){
        if(typeof showAttModal==='function'){showAttModal(cid);requestAnimationFrame(syncAttModal);return true;}
        location.href='attendance.html?mode=teacher';return true;
      }
      if(text.includes('숙제')){
        if(typeof showHwRegModal==='function'){showHwRegModal(cid);return true;}
        location.href='homework.html?mode=teacher';return true;
      }
    }catch(e){
      console.error('[YMS] 선생님 홈 빠른 버튼 오류',e);
      location.href=text.includes('출결')?'attendance.html?mode=teacher':'homework.html?mode=teacher';
      return true;
    }
    return false;
  }

  document.addEventListener('click',function(e){
    const btn=e.target?.closest?.('.class-actions button');
    if(btn){e.preventDefault();e.stopImmediatePropagation();run(btn);return;}
    const quick=e.target?.closest?.('.teacher-quick-nav a');
    if(quick&&/attendance\.html(?:$|[?#])/.test(quick.getAttribute('href')||'')){e.preventDefault();e.stopImmediatePropagation();location.href='attendance.html?mode=teacher';return;}
    const widget=e.target?.closest?.('#ymsHomeWidgets .yms-widget-card');
    if(widget&&String(widget.querySelector('.yms-widget-label')?.textContent||'').includes('출결')){e.preventDefault();e.stopImmediatePropagation();location.href='attendance.html?mode=teacher';return;}
    if(e.target?.closest?.('#attModal'))setTimeout(syncAttModal,0);
    if(e.target?.closest?.('#hwRegModal'))setTimeout(()=>document.body.classList.toggle('yms-hw-modal-open',!document.getElementById('hwRegModal')?.classList.contains('hidden')),0);
  },true);

  function normalize(){
    document.getElementById('adminShortcut')?.remove();
    document.querySelectorAll('.class-actions button').forEach(btn=>{const cid=classIdFrom(btn);if(cid)btn.dataset.classId=cid;btn.removeAttribute('onclick');});
    document.querySelectorAll('.teacher-quick-nav a[href^="attendance.html"]').forEach(a=>a.href='attendance.html?mode=teacher');
    document.querySelectorAll('.teacher-quick-nav a[href^="homework.html"]').forEach(a=>a.href='homework.html?mode=teacher');
    syncAttModal();
    installHomeworkForm();
  }

  const baseRender=typeof window.renderTeacherHome==='function'?window.renderTeacherHome:null;
  if(baseRender&&!baseRender.__ymsTeacherOrdered){
    const wrapped=function(){sortTeacherClasses();const r=baseRender.apply(this,arguments);normalize();return r;};
    wrapped.__ymsTeacherOrdered=true;window.renderTeacherHome=wrapped;
  }

  const baseShowAtt=typeof window.showAttModal==='function'?window.showAttModal:null;
  if(baseShowAtt&&!baseShowAtt.__ymsPersistedAttendance){
    const wrapped=async function(classId){
      const r=await baseShowAtt.apply(this,arguments);
      syncAttModal();
      await restoreAttendanceState(classId);
      return r;
    };
    wrapped.__ymsPersistedAttendance=true;
    window.showAttModal=wrapped;
  }

  const baseShowHw=typeof window.showHwRegModal==='function'?window.showHwRegModal:null;
  if(baseShowHw&&!baseShowHw.__ymsTargeting){
    const wrapped=function(classId){const r=baseShowHw.apply(this,arguments);const target=document.getElementById('teacherHwTargetType');if(target)target.value='CLASS';installHomeworkForm();document.body.classList.add('yms-hw-modal-open');const sheet=document.querySelector('#hwRegModal .modal-sheet');if(sheet)sheet.scrollTop=0;return r;};
    wrapped.__ymsTargeting=true;window.showHwRegModal=wrapped;
  }
  const baseCloseHw=typeof window.closeHwRegModal==='function'?window.closeHwRegModal:null;
  if(baseCloseHw&&!baseCloseHw.__ymsTargeting){
    const wrapped=function(){document.body.classList.remove('yms-hw-modal-open');return baseCloseHw.apply(this,arguments);};
    wrapped.__ymsTargeting=true;window.closeHwRegModal=wrapped;
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
        classId:String(window.currentClassId||currentClassId||cls?.id||cls?.classId||''),
        className:cls?.className||'',subject:cls?.subject||'영어',teacherId:u?.id||u?.uid||'',teacherName:u?.name||'',
        title:document.getElementById('hwTitle')?.value.trim()||'',content:document.getElementById('hwContent')?.value.trim()||'',
        dueAt:due?new Date(due+'T21:00:00+09:00').toISOString():null,isVisible:true,targetType,
        targetStudentId:student?.id||'',targetStudentName:student?.name||''
      };
      if(!payload.title)throw new Error('숙제 제목을 입력해주세요.');
      const res=await _tFetch('tables/homework',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!res.ok)throw new Error('숙제 저장에 실패했습니다.');
      window.closeHwRegModal();
      window.YMS_UI?.toast?.(targetType==='STUDENT'?'개별 숙제가 등록되었습니다! 👤':'숙제가 등록되었습니다! 📚');
    }catch(err){
      console.error('[YMS] 숙제 등록 실패',err);
      window.YMS_UI?.toast?.('❌ '+(err?.message||'등록 실패'));
    }finally{
      if(btn){btn.disabled=false;btn.textContent='등록하기';}
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(normalize,0),{once:true});
  else setTimeout(normalize,0);
  window.addEventListener('load',()=>setTimeout(normalize,120),{once:true});
})();
