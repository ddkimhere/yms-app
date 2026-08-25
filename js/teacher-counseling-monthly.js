/* YMS teacher monthly counseling checklist */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/counseling.html')) return;
  const me=window.YMS_Auth?.getUser?.();
  const role=String(me?.role||'').toUpperCase();
  const roles=Array.isArray(me?.roles)?me.roles.map(r=>String(r).toUpperCase()):[];
  if(!(role==='TEACHER'||roles.includes('TEACHER'))||role==='ADMIN') return;
  if(!window._tFetch) return;

  const uid=String(me.id||me.uid||'');
  let month=new Date().toISOString().slice(0,7);
  let students=[];
  let records=[];
  let classIds=new Set();
  let classNames=new Set();

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const root=()=>document.querySelector('.app-wrapper')||document.querySelector('.student-app')||document.body;

  function css(){
    if(document.getElementById('yms-teacher-counseling-css'))return;
    const s=document.createElement('style');s.id='yms-teacher-counseling-css';s.textContent=`
      body{background:#F4F7FD!important}.tcm-page{max-width:760px;margin:0 auto;padding:18px 16px 100px}.tcm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}.tcm-title{font-size:20px;font-weight:900;color:#14245A}.tcm-sub{font-size:11px;color:#7A87A8;margin-top:4px;line-height:1.5}.tcm-month{height:38px;border:1px solid #C8D1E8;border-radius:10px;background:#fff;padding:0 10px;font:inherit;color:#273453}.tcm-summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.tcm-pill{background:#fff;border:1px solid #E1E6F0;border-radius:999px;padding:7px 11px;font-size:11px;color:#56637E}.tcm-pill strong{color:#17284F}.tcm-list{display:flex;flex-direction:column;gap:9px}.tcm-card{background:#fff;border:1px solid #E1E6F0;border-radius:16px;padding:14px;box-shadow:0 2px 10px rgba(30,50,120,.05)}.tcm-card.done{border-color:#A9D9C1;background:#FBFFFD}.tcm-top{display:flex;align-items:center;gap:10px}.tcm-name{font-size:14px;font-weight:900;color:#243356}.tcm-meta{font-size:10px;color:#7A87A8;margin-top:2px}.tcm-state{margin-left:auto;font-size:10px;font-weight:900;padding:5px 9px;border-radius:999px;background:#FFF3E0;color:#C56B00;border:1px solid #FFD49B}.tcm-card.done .tcm-state{background:#E8F6EF;color:#237A53;border-color:#A9D9C1}.tcm-note{width:100%;min-height:70px;margin-top:10px;border:1px solid #D7DEEC;border-radius:11px;padding:9px 10px;resize:vertical;font:inherit;font-size:12px;color:#273453;background:#fff}.tcm-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:8px}.tcm-btn{border:0;border-radius:10px;padding:8px 12px;font-size:11px;font-weight:900;cursor:pointer}.tcm-save{background:#1E3278;color:#fff}.tcm-cancel{background:#F1F3F8;color:#68748C}.tcm-empty{padding:36px;text-align:center;color:#8793AA;background:#fff;border:1px dashed #CDD6E8;border-radius:16px}@media(max-width:600px){.tcm-page{padding:14px 12px 92px}.tcm-title{font-size:18px}}
    `;document.head.appendChild(s);
  }

  function recordFor(sid){
    return records.filter(r=>String(r.studentId||'')===String(sid)&&String(r.month||String(r.repliedAt||r.updatedAt||r.createdAt||'').slice(0,7))===month&&String(r.recordType||'')==='MONTHLY_TEACHER').sort((a,b)=>String(b.updatedAt||b.repliedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.repliedAt||a.createdAt||'')))[0]||null;
  }

  function render(){
    css();const host=root();if(!host)return;
    const done=students.filter(s=>recordFor(s.id)?.status==='REPLIED').length;
    host.innerHTML=`<div class="tcm-page"><div class="tcm-head"><div><div class="tcm-title">💬 월 상담 체크</div><div class="tcm-sub">내 담당 학생의 월별 상담 여부를 체크하고 특이사항을 기록합니다. 저장 내용은 운영자 상담관리에 바로 반영됩니다.</div></div><input type="month" class="tcm-month" id="tcmMonth" value="${esc(month)}"></div><div class="tcm-summary"><span class="tcm-pill">담당 학생 <strong>${students.length}명</strong></span><span class="tcm-pill">완료 <strong>${done}명</strong></span><span class="tcm-pill">미완료 <strong>${students.length-done}명</strong></span></div><div class="tcm-list">${students.length?students.map(s=>{const r=recordFor(s.id),isDone=r?.status==='REPLIED',note=r?.specialNote||r?.notes||r?.reply||'';return `<div class="tcm-card ${isDone?'done':''}" data-sid="${esc(s.id)}"><div class="tcm-top"><div><div class="tcm-name">${esc(s.name||'-')}</div><div class="tcm-meta">${esc(s.schoolName||'')}${s.grade?' · '+esc(s.grade):''}${s.className?' · '+esc(s.className):''}</div></div><span class="tcm-state">${isDone?'✓ 상담 완료':'○ 미완료'}</span></div><textarea class="tcm-note" placeholder="특이사항을 입력하세요. (없으면 비워도 됩니다)">${esc(note)}</textarea><div class="tcm-actions">${isDone?`<button class="tcm-btn tcm-cancel" type="button" onclick="YMS_teacherCounselCancel('${String(s.id).replace(/'/g,"\\'")}')">완료 취소</button>`:''}<button class="tcm-btn tcm-save" type="button" onclick="YMS_teacherCounselSave('${String(s.id).replace(/'/g,"\\'")}')">${isDone?'특이사항 저장':'상담 완료'}</button></div></div>`}).join(''):'<div class="tcm-empty">담당 학생이 없습니다. 반 배정을 확인해주세요.</div>'}</div></div>`;
    document.getElementById('tcmMonth').onchange=e=>{month=e.target.value||new Date().toISOString().slice(0,7);render();};
    try{window.ymsRenderTeacherNav?.('counseling.html')}catch{}
  }

  async function load(){
    css();const host=root();if(host)host.innerHTML='<div class="tcm-page"><div class="tcm-empty">학생 명단을 불러오는 중...</div></div>';
    try{
      const [cr,sr,rr]=await Promise.all([_tFetch('tables/classes?limit=300'),_tFetch('tables/students?limit=1000'),_tFetch('tables/counseling?limit=1000')]);
      const classes=cr.ok?((await cr.json()).data||[]):[];
      const allStudents=sr.ok?((await sr.json()).data||[]):[];
      records=rr.ok?((await rr.json()).data||[]):[];
      const assigned=Array.isArray(me.teacherClasses)?me.teacherClasses:String(me.teacherClasses||'').split(',').map(x=>x.trim()).filter(Boolean);
      const mine=classes.filter(c=>String(c.teacherId||'')===uid||String(c.teacherName||'')===String(me.name||'')||assigned.includes(String(c.id||''))||assigned.includes(String(c.className||'')));
      classIds=new Set(mine.map(c=>String(c.id||'')).filter(Boolean));classNames=new Set(mine.map(c=>String(c.className||'')).filter(Boolean));
      students=allStudents.filter(s=>s.isActive!==false&&(classIds.has(String(s.classId||''))||classNames.has(String(s.className||''))||String(s.teacherId||'')===uid||String(s.teacherName||'')===String(me.name||''))).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko'));
    }catch(e){console.error('[YMS] teacher counseling load',e);students=[];records=[];}
    render();
  }

  async function throwDetailed(r,label){
    if(r.ok)return;
    let detail='';
    try{const j=await r.clone().json();detail=j?.error?.message||j?.error||j?.message||'';}catch{try{detail=await r.clone().text();}catch{}}
    throw new Error(`${label} (HTTP ${r.status}${detail?': '+detail:''})`);
  }

  window.YMS_teacherCounselSave=async function(studentId){
    const s=students.find(x=>String(x.id)===String(studentId));if(!s)return;
    const card=document.querySelector(`.tcm-card[data-sid="${CSS.escape(String(studentId))}"]`);const note=card?.querySelector('.tcm-note')?.value.trim()||'';
    const existing=recordFor(studentId);const now=new Date().toISOString();
    const payload={recordType:'MONTHLY_TEACHER',month,studentId:s.id,studentName:s.name||'',classId:s.classId||'',className:s.className||'',teacherId:uid,teacherName:me.name||s.teacherName||'',requesterId:uid,requesterRole:'TEACHER',requesterName:me.name||'',status:'REPLIED',specialNote:note,reply:note,repliedAt:existing?.repliedAt||now,updatedAt:now,createdAt:existing?.createdAt||now,category:'월상담',title:`${month} 월 상담`,content:note||'월 상담 완료',isRead:true};
    try{
      const r=existing?await _tFetch('tables/counseling/'+encodeURIComponent(existing.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}):await _tFetch('tables/counseling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      await throwDetailed(r,'상담 저장 실패');
      const saved=await r.json().catch(()=>({}));if(existing)Object.assign(existing,payload,saved);else records.push({id:saved.id,...payload,...saved});render();window.YMS_UI?.toast?.('✅ 상담 완료로 저장했습니다');
    }catch(e){console.error('[YMS] teacher counseling save',e);window.YMS_UI?.toast?.('❌ '+(e?.message||'상담 저장에 실패했습니다'));
    }
  };

  window.YMS_teacherCounselCancel=async function(studentId){const r=recordFor(studentId);if(!r)return;try{const payload={status:'PENDING',updatedAt:new Date().toISOString(),requesterId:uid,requesterRole:'TEACHER',requesterName:me.name||''};const res=await _tFetch('tables/counseling/'+encodeURIComponent(r.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});await throwDetailed(res,'상태 변경 실패');Object.assign(r,payload);render();window.YMS_UI?.toast?.('상담 완료를 취소했습니다');}catch(e){window.YMS_UI?.toast?.('❌ '+(e?.message||'상태 변경에 실패했습니다'));}};

  function boot(){setTimeout(load,0);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
