/* YMS teacher book fee registration: individual + class bulk */
(function(){
  'use strict';
  const user=window.YMS_Auth?.getUser?.();
  const isTeacher=!!user&&(String(user.role||'').toUpperCase()==='TEACHER'||window.YMS_Roles?.has?.(user,'TEACHER')||(Array.isArray(user.roles)&&user.roles.map(r=>String(r).toUpperCase()).includes('TEACHER'))||String(user.role||'').toUpperCase()==='ADMIN');
  if(!isTeacher||!location.pathname.endsWith('/teacher-home.html')) return;

  let students=[],classes=[],mode='STUDENT';
  const norm=v=>String(v||'').trim().toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));

  async function loadScope(){
    try{
      const [sr,cr]=await Promise.all([_tFetch('tables/students?limit=500'),_tFetch('tables/classes?limit=200')]);
      const allStudents=sr.ok?((await sr.json()).data||[]):[];
      const allClasses=cr.ok?((await cr.json()).data||[]):[];
      const uid=String(user.id||user.uid||''),un=norm(user.name);
      const assigned=Array.isArray(user.teacherClasses)?user.teacherClasses:String(user.teacherClasses||'').split(',').map(x=>x.trim()).filter(Boolean);
      let mine=allClasses.filter(c=>(uid&&String(c.teacherId||'')===uid)||(un&&norm(c.teacherName)===un)||assigned.includes(String(c.id||''))||assigned.includes(String(c.className||'')));
      if(!mine.length&&String(user.role||'').toUpperCase()==='ADMIN') mine=allClasses;
      classes=mine;
      const ids=new Set(mine.map(c=>String(c.id||'')).filter(Boolean));
      const names=new Set(mine.map(c=>String(c.className||'')).filter(Boolean));
      students=allStudents.filter(s=>s.isActive!==false&&(ids.has(String(s.classId||''))||names.has(String(s.className||''))));
      if(!students.length&&String(user.role||'').toUpperCase()==='ADMIN') students=allStudents.filter(s=>s.isActive!==false);
    }catch(e){students=[];classes=[];}
  }

  function ensureStyle(){
    if(document.getElementById('yms-bookfee-style')) return;
    const s=document.createElement('style');s.id='yms-bookfee-style';s.textContent=`
      @media(min-width:821px){.teacher-quick-nav{grid-template-columns:repeat(5,minmax(0,1fr))!important}}
      @media(max-width:820px){.teacher-quick-nav{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      #bookFeeModal{z-index:100500!important}
      #bookFeeModal .modal-sheet{width:min(100%,520px)!important}
      #bookFeeModal .bf-mode{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:4px;background:#EEF3FB;border-radius:14px;margin-bottom:16px}
      #bookFeeModal .bf-mode button{border:0;border-radius:11px;min-height:42px;background:transparent;color:#7A87A8;font-weight:800}
      #bookFeeModal .bf-mode button.active{background:#fff;color:#1E3278;box-shadow:0 2px 8px rgba(30,50,120,.08)}
      #bookFeeModal .bf-help{font-size:11px;color:#7A87A8;margin:-4px 0 12px;line-height:1.5}
      #bookFeeModal .bookfee-actions{display:flex;gap:8px;margin-top:4px}
      #bookFeeModal .bookfee-actions .btn{min-height:48px}
      @media(max-width:700px){#bookFeeModal{align-items:flex-end!important;padding:0!important}#bookFeeModal .modal-sheet{max-height:92dvh!important;border-radius:24px 24px 0 0!important;padding:20px!important;padding-bottom:calc(20px + env(safe-area-inset-bottom))!important}}
    `;document.head.appendChild(s);
  }

  function ensureQuickLink(){
    const nav=document.querySelector('.teacher-quick-nav');
    if(!nav) return;
    let a=document.getElementById('bookFeeQuickLink');
    if(!a){
      a=document.createElement('a');a.id='bookFeeQuickLink';a.className='teacher-quick-link';a.href='#';a.innerHTML='<span>📘</span><span>교재비 등록</span>';
      nav.appendChild(a);
    }
    if(a.dataset.bookFeeBound!=='1'){
      a.addEventListener('click',e=>{e.preventDefault();openModal();});
      a.dataset.bookFeeBound='1';
    }
  }

  function ensureModal(){
    if(document.getElementById('bookFeeModal')) return;
    const el=document.createElement('div');el.id='bookFeeModal';el.className='modal-overlay hidden';
    el.innerHTML=`<div class="modal-sheet"><div class="modal-handle"></div><div class="modal-title">📘 교재비 등록</div>
      <div class="bf-mode"><button type="button" id="bfModeStudent" class="active">개별 학생</button><button type="button" id="bfModeClass">반 일괄</button></div>
      <form id="bookFeeForm">
        <div class="form-group" id="bfStudentGroup"><label class="form-label">학생</label><select class="form-input form-select" id="bfStudent"><option value="">— 학생 선택 —</option></select></div>
        <div class="form-group hidden" id="bfClassGroup"><label class="form-label">반</label><select class="form-input form-select" id="bfClass"><option value="">— 반 선택 —</option></select></div>
        <div id="bfClassHelp" class="bf-help hidden">선택한 반의 재원생 전체에게 같은 교재비가 등록됩니다.</div>
        <div class="form-group"><label class="form-label">교재명</label><input class="form-input" id="bfBook" type="text" placeholder="예) Reading it 200-1" required></div>
        <div class="form-group"><label class="form-label">금액</label><input class="form-input" id="bfAmount" type="number" min="0" step="100" inputmode="numeric" placeholder="예) 18000" required></div>
        <div class="form-group"><label class="form-label">메모</label><input class="form-input" id="bfMemo" type="text" placeholder="선택 입력"></div>
        <div class="bookfee-actions"><button type="button" class="btn btn-ghost" style="flex:1" id="bfCancel">취소</button><button type="submit" class="btn btn-primary" style="flex:2" id="bfSave">교재비 등록</button></div>
      </form></div>`;
    document.body.appendChild(el);
    document.getElementById('bfCancel').onclick=closeModal;
    document.getElementById('bfModeStudent').onclick=()=>setMode('STUDENT');
    document.getElementById('bfModeClass').onclick=()=>setMode('CLASS');
    document.getElementById('bookFeeForm').onsubmit=save;
  }

  function setMode(next){
    mode=next;
    document.getElementById('bfModeStudent')?.classList.toggle('active',mode==='STUDENT');
    document.getElementById('bfModeClass')?.classList.toggle('active',mode==='CLASS');
    document.getElementById('bfStudentGroup')?.classList.toggle('hidden',mode!=='STUDENT');
    document.getElementById('bfClassGroup')?.classList.toggle('hidden',mode!=='CLASS');
    document.getElementById('bfClassHelp')?.classList.toggle('hidden',mode!=='CLASS');
    const btn=document.getElementById('bfSave');if(btn) btn.textContent=mode==='CLASS'?'반 전체 교재비 등록':'교재비 등록';
  }

  async function openModal(){
    ensureModal();await loadScope();
    const ss=document.getElementById('bfStudent'),cs=document.getElementById('bfClass');
    ss.innerHTML='<option value="">— 학생 선택 —</option>'+students.slice().sort((a,b)=>(a.className||'').localeCompare(b.className||'','ko')||(a.name||'').localeCompare(b.name||'','ko')).map(s=>`<option value="${esc(s.id)}">${esc(s.name)}${s.className?' · '+esc(s.className):''}</option>`).join('');
    cs.innerHTML='<option value="">— 반 선택 —</option>'+classes.slice().sort((a,b)=>(a.className||'').localeCompare(b.className||'','ko')).map(c=>`<option value="${esc(c.id||c.className)}">${esc(c.className||c.name||'이름 없는 반')}</option>`).join('');
    setMode('STUDENT');document.getElementById('bookFeeModal').classList.remove('hidden');document.getElementById('teacherMobileNav')?.style.setProperty('display','none','important');
  }
  function closeModal(){document.getElementById('bookFeeModal')?.classList.add('hidden');document.getElementById('bookFeeForm')?.reset();setMode('STUDENT');document.getElementById('teacherMobileNav')?.style.removeProperty('display');}

  function payloadFor(stu,book,amount,memo,batchId=''){
    return {studentId:stu.id,studentName:stu.name||'',classId:stu.classId||'',className:stu.className||'',bookName:book,amount,memo,teacherId:user.id||user.uid||'',teacherName:user.name||'',registeredAt:new Date().toISOString(),status:'REGISTERED',registrationType:batchId?'CLASS_BULK':'INDIVIDUAL',batchId};
  }

  async function save(e){
    e.preventDefault();const btn=document.getElementById('bfSave');btn.disabled=true;btn.textContent='등록 중...';
    try{
      const book=document.getElementById('bfBook').value.trim(),amount=Number(document.getElementById('bfAmount').value||0),memo=document.getElementById('bfMemo').value.trim();
      if(!book) throw new Error('교재명을 입력해주세요.');if(!(amount>0)) throw new Error('금액을 입력해주세요.');
      if(mode==='STUDENT'){
        const sid=document.getElementById('bfStudent').value,stu=students.find(s=>String(s.id)===String(sid));if(!stu) throw new Error('학생을 선택해주세요.');
        const r=await _tFetch('tables/bookFees',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payloadFor(stu,book,amount,memo))});if(!r.ok) throw new Error('교재비 저장에 실패했습니다.');
        closeModal();window.YMS_UI?.toast?.('교재비가 등록되었습니다! 📘');
      }else{
        const key=document.getElementById('bfClass').value;if(!key) throw new Error('반을 선택해주세요.');
        const cls=classes.find(c=>String(c.id||c.className)===String(key));if(!cls) throw new Error('반 정보를 찾을 수 없습니다.');
        const targets=students.filter(s=>String(s.classId||'')===String(cls.id||'')||String(s.className||'')===String(cls.className||''));if(!targets.length) throw new Error('등록할 재원생이 없습니다.');
        const batchId='BF-'+Date.now();let ok=0;
        for(const stu of targets){const r=await _tFetch('tables/bookFees',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payloadFor(stu,book,amount,memo,batchId))});if(r.ok) ok++;}
        if(ok!==targets.length) throw new Error(`${targets.length}명 중 ${ok}명만 등록되었습니다.`);
        closeModal();window.YMS_UI?.toast?.(`${ok}명 교재비가 일괄 등록되었습니다! 📘`);
      }
    }catch(err){window.YMS_UI?.toast?.('❌ '+(err?.message||'교재비 등록 실패'));}
    finally{btn.disabled=false;btn.textContent=mode==='CLASS'?'반 전체 교재비 등록':'교재비 등록';}
  }

  ensureStyle();ensureQuickLink();ensureModal();
})();
