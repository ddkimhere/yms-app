/* YMS homework missing submission + parent-visible note */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/homework.html')) return;

  const upper=v=>String(v||'').trim().toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const user=()=>window.YMS_Auth?.getUser?.()||null;
  const role=()=>upper(user()?.role);
  const isTeacher=()=>role()==='TEACHER'||role()==='ADMIN'||window.YMS_Auth?.hasRole?.('TEACHER',user());
  let currentHw=null;

  function dataMap(hw){
    const m=hw?.submissionByStudent;
    return m&&typeof m==='object'&&!Array.isArray(m)?m:{};
  }

  function css(){
    if(document.getElementById('yms-hw-missing-note-css')) return;
    const s=document.createElement('style');
    s.id='yms-hw-missing-note-css';
    s.textContent=`
      .yms-missing-extra{margin-top:9px;padding:10px;border:1px solid #E3E8F4;border-radius:11px;background:#FAFBFE}
      .yms-missing-line{display:flex;align-items:center;gap:8px;margin-bottom:8px}
      .yms-missing-line input{width:18px;height:18px;accent-color:#D84A4A}
      .yms-missing-line label{font-size:12px;font-weight:900;color:#C73535;cursor:pointer}
      .yms-missing-note{width:100%;min-height:40px;border:1px solid #DCE3F0;border-radius:9px;padding:9px 10px;font:inherit;font-size:12px;color:#273453;background:#fff;resize:vertical;outline:none}
      .yms-missing-note:focus{border-color:#7492D5;box-shadow:0 0 0 2px rgba(116,146,213,.12)}
      .yms-parent-missing{margin-top:10px;padding:11px 12px;border:1px solid #F0B4B4;border-radius:11px;background:#FFF4F4;color:#A92F2F;font-size:12px;line-height:1.55}
      .yms-parent-missing strong{font-weight:900}
    `;
    document.head.appendChild(s);
  }

  function teacherAugment(hw){
    const holder=document.getElementById('ymsHwCompletionBlock');
    if(!holder||!isTeacher()) return;
    const map=dataMap(hw);
    holder.querySelectorAll('.yms-incomplete-check[data-student]').forEach(ch=>{
      const sid=String(ch.dataset.student||'');
      if(!sid) return;
      const studentBlock=ch.closest('div[style*="border-bottom"]');
      if(!studentBlock||studentBlock.querySelector(`.yms-missing-extra[data-student="${CSS.escape(sid)}"]`)) return;
      const rec=map[sid]&&typeof map[sid]==='object'?map[sid]:{};
      const extra=document.createElement('div');
      extra.className='yms-missing-extra';
      extra.dataset.student=sid;
      extra.innerHTML=`<div class="yms-missing-line"><input type="checkbox" class="yms-missing-check" id="ymsMissing_${esc(sid)}" data-student="${esc(sid)}" ${rec.missing?'checked':''}><label for="ymsMissing_${esc(sid)}">숙제 미제출</label></div><textarea class="yms-missing-note" data-student="${esc(sid)}" maxlength="250" placeholder="안 한 숙제나 부모님께 전달할 내용을 적어주세요.">${esc(rec.note||'')}</textarea>`;
      studentBlock.appendChild(extra);
    });
    const btn=document.getElementById('ymsSaveHwStatus');
    if(btn&&!btn.dataset.missingBound){
      btn.dataset.missingBound='1';
      btn.addEventListener('click',()=>saveMissing(hw));
    }
  }

  async function saveMissing(hw){
    try{
      const map={};
      document.querySelectorAll('.yms-missing-extra[data-student]').forEach(box=>{
        const sid=String(box.dataset.student||'');
        if(!sid) return;
        const missing=!!box.querySelector('.yms-missing-check')?.checked;
        const note=String(box.querySelector('.yms-missing-note')?.value||'').trim();
        map[sid]={missing,note};
      });
      const payload={submissionByStudent:map,submissionUpdatedAt:new Date().toISOString(),submissionUpdatedBy:user()?.name||''};
      const r=await _tFetch(`tables/homework/${encodeURIComponent(hw.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      Object.assign(hw,payload);
      if(Array.isArray(window.allHomework)){
        const found=window.allHomework.find(x=>String(x.id)===String(hw.id));
        if(found) Object.assign(found,payload);
      }
    }catch(e){
      console.error('[YMS] 숙제 미제출 저장 실패',e);
      window.YMS_UI?.toast?.('❌ 미제출 내용 저장에 실패했습니다.');
    }
  }

  async function viewerStudents(hw){
    const u=user();
    try{
      if(role()==='STUDENT'){
        const sid=String(u?.studentId||'').trim();
        if(sid){const r=await _tFetch(`tables/students/${encodeURIComponent(sid)}`,{cache:'no-store'});return r.ok?[await r.json()]:[];}
      }
      if(role()==='PARENT'){
        const ids=Array.isArray(u?.childIds)?u.childIds:String(u?.childIds||'').split(',').map(x=>x.trim()).filter(Boolean);
        const out=[];
        for(const id of ids){const r=await _tFetch(`tables/students/${encodeURIComponent(id)}`,{cache:'no-store'});if(r.ok)out.push(await r.json());}
        return out.filter(s=>String(hw?.targetType||'').toUpperCase()==='STUDENT'?String(s.id||'')===String(hw?.targetStudentId||''):((hw?.classId&&String(s.classId||'')===String(hw.classId))||(hw?.className&&String(s.className||'')===String(hw.className))));
      }
    }catch(e){console.warn('[YMS] 미제출 부모 표시 학생 조회 실패',e);}
    return [];
  }

  async function viewerAugment(hw){
    if(!(role()==='PARENT'||role()==='STUDENT')) return;
    const holder=document.getElementById('ymsHwCompletionBlock');
    if(!holder||holder.querySelector('.yms-parent-missing')) return;
    const mine=await viewerStudents(hw),map=dataMap(hw);
    const messages=[];
    mine.forEach(s=>{
      const rec=map[String(s.id)]&&typeof map[String(s.id)]==='object'?map[String(s.id)]:null;
      if(rec&&(rec.missing||String(rec.note||'').trim())) messages.push({name:s.name||'학생',missing:!!rec.missing,note:String(rec.note||'').trim()});
    });
    if(!messages.length) return;
    const wrap=document.createElement('div');
    wrap.innerHTML=messages.map(x=>`<div class="yms-parent-missing"><div><strong>${x.missing?'⚠️ 숙제 미제출':'📝 선생님 전달사항'}</strong>${mine.length>1?` · ${esc(x.name)}`:''}</div>${x.note?`<div style="margin-top:5px;">${esc(x.note)}</div>`:''}</div>`).join('');
    holder.append(...Array.from(wrap.children));
  }

  function augment(hw){
    currentHw=hw;
    setTimeout(()=>{if(isTeacher())teacherAugment(hw);else viewerAugment(hw);},80);
    setTimeout(()=>{if(isTeacher())teacherAugment(hw);else viewerAugment(hw);},300);
  }

  function wrapOpenDetail(){
    const original=window.openDetail;
    if(typeof original!=='function'||original.__ymsMissingNote) return;
    const wrapped=function(hw){const r=original.apply(this,arguments);augment(hw);return r;};
    wrapped.__ymsMissingNote=true;
    window.openDetail=wrapped;
  }

  function boot(){css();wrapOpenDetail();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('load',()=>setTimeout(boot,120));
})();