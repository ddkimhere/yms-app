/* YMS teacher book fee registration */
(function(){
  'use strict';
  const user=window.YMS_Auth?.getUser?.();
  const isTeacher=!!user&&(String(user.role||'').toUpperCase()==='TEACHER'||window.YMS_Roles?.has?.(user,'TEACHER')||(Array.isArray(user.roles)&&user.roles.map(r=>String(r).toUpperCase()).includes('TEACHER'))||String(user.role||'').toUpperCase()==='ADMIN');
  if(!isTeacher||!location.pathname.endsWith('/teacher-home.html')) return;

  let students=[];
  const norm=v=>String(v||'').trim().toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function loadStudents(){
    try{
      const [sr,cr]=await Promise.all([_tFetch('tables/students?limit=500'),_tFetch('tables/classes?limit=200')]);
      const allStudents=sr.ok?((await sr.json()).data||[]):[];
      const allClasses=cr.ok?((await cr.json()).data||[]):[];
      const uid=String(user.id||user.uid||''),un=norm(user.name);
      const assigned=Array.isArray(user.teacherClasses)?user.teacherClasses:String(user.teacherClasses||'').split(',').map(x=>x.trim()).filter(Boolean);
      const mine=allClasses.filter(c=>(uid&&String(c.teacherId||'')===uid)||(un&&norm(c.teacherName)===un)||assigned.includes(String(c.id||''))||assigned.includes(String(c.className||'')));
      const ids=new Set(mine.map(c=>String(c.id||'')).filter(Boolean));
      const names=new Set(mine.map(c=>String(c.className||'')).filter(Boolean));
      students=allStudents.filter(s=>s.isActive!==false&&(ids.has(String(s.classId||''))||names.has(String(s.className||''))));
      if(!students.length&&String(user.role||'').toUpperCase()==='ADMIN') students=allStudents.filter(s=>s.isActive!==false);
    }catch(e){students=[];}
  }

  function ensureStyle(){
    if(document.getElementById('yms-bookfee-style')) return;
    const s=document.createElement('style');s.id='yms-bookfee-style';s.textContent=`
      @media(min-width:821px){.teacher-quick-nav{grid-template-columns:repeat(5,minmax(0,1fr))!important}}
      @media(max-width:820px){.teacher-quick-nav{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      #bookFeeModal{z-index:100500!important}
      #bookFeeModal .modal-sheet{width:min(100%,520px)!important}
      #bookFeeModal .bookfee-actions{display:flex;gap:8px;margin-top:4px}
      #bookFeeModal .bookfee-actions .btn{min-height:48px}
      @media(max-width:700px){
        #bookFeeModal{align-items:flex-end!important;padding:0!important}
        #bookFeeModal .modal-sheet{max-height:92dvh!important;border-radius:24px 24px 0 0!important;padding:20px!important;padding-bottom:calc(20px + env(safe-area-inset-bottom))!important}
      }
    `;document.head.appendChild(s);
  }

  function ensureQuickLink(){
    const nav=document.querySelector('.teacher-quick-nav');
    if(!nav||document.getElementById('bookFeeQuickLink')) return;
    const a=document.createElement('a');a.id='bookFeeQuickLink';a.className='teacher-quick-link';a.href='#';
    a.innerHTML='<span>📘</span><span>교재비 등록</span>';
    a.addEventListener('click',e=>{e.preventDefault();openModal();});
    nav.appendChild(a);
  }

  function ensureModal(){
    if(document.getElementById('bookFeeModal')) return;
    const el=document.createElement('div');el.id='bookFeeModal';el.className='modal-overlay hidden';
    el.innerHTML=`<div class="modal-sheet"><div class="modal-handle"></div><div class="modal-title">📘 교재비 등록</div>
      <form id="bookFeeForm">
        <div class="form-group"><label class="form-label">학생</label><select class="form-input form-select" id="bfStudent" required><option value="">— 학생 선택 —</option></select></div>
        <div class="form-group"><label class="form-label">교재명</label><input class="form-input" id="bfBook" type="text" placeholder="예) Reading it 200-1" required></div>
        <div class="form-group"><label class="form-label">금액</label><input class="form-input" id="bfAmount" type="number" min="0" step="100" inputmode="numeric" placeholder="예) 18000" required></div>
        <div class="form-group"><label class="form-label">메모</label><input class="form-input" id="bfMemo" type="text" placeholder="선택 입력"></div>
        <div class="bookfee-actions"><button type="button" class="btn btn-ghost" style="flex:1" id="bfCancel">취소</button><button type="submit" class="btn btn-primary" style="flex:2" id="bfSave">교재비 등록</button></div>
      </form></div>`;
    document.body.appendChild(el);
    document.getElementById('bfCancel').onclick=closeModal;
    document.getElementById('bookFeeForm').onsubmit=save;
  }

  async function openModal(){
    ensureModal();await loadStudents();
    const sel=document.getElementById('bfStudent');
    sel.innerHTML='<option value="">— 학생 선택 —</option>'+students.sort((a,b)=>(a.className||'').localeCompare(b.className||'','ko')||(a.name||'').localeCompare(b.name||'','ko')).map(s=>`<option value="${esc(s.id)}">${esc(s.name)}${s.className?' · '+esc(s.className):''}</option>`).join('');
    document.getElementById('bookFeeModal').classList.remove('hidden');
    document.getElementById('teacherMobileNav')?.style.setProperty('display','none','important');
  }
  function closeModal(){document.getElementById('bookFeeModal')?.classList.add('hidden');document.getElementById('bookFeeForm')?.reset();document.getElementById('teacherMobileNav')?.style.removeProperty('display');}

  async function save(e){
    e.preventDefault();const btn=document.getElementById('bfSave');btn.disabled=true;btn.textContent='등록 중...';
    try{
      const sid=document.getElementById('bfStudent').value,stu=students.find(s=>String(s.id)===String(sid));
      const book=document.getElementById('bfBook').value.trim(),amount=Number(document.getElementById('bfAmount').value||0),memo=document.getElementById('bfMemo').value.trim();
      if(!stu) throw new Error('학생을 선택해주세요.');if(!book) throw new Error('교재명을 입력해주세요.');if(!(amount>0)) throw new Error('금액을 입력해주세요.');
      const payload={studentId:stu.id,studentName:stu.name||'',classId:stu.classId||'',className:stu.className||'',bookName:book,amount,memo,teacherId:user.id||user.uid||'',teacherName:user.name||'',registeredAt:new Date().toISOString(),status:'REGISTERED'};
      const r=await _tFetch('tables/bookFees',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok) throw new Error('교재비 저장에 실패했습니다.');
      closeModal();window.YMS_UI?.toast?.('교재비가 등록되었습니다! 📘');
    }catch(err){window.YMS_UI?.toast?.('❌ '+(err?.message||'교재비 등록 실패'));}
    finally{btn.disabled=false;btn.textContent='교재비 등록';}
  }

  ensureStyle();ensureQuickLink();ensureModal();
})();
