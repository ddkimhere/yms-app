/* YMS teacher student-management monthly counseling table */
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
  let classOrder=new Map();

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const root=()=>document.querySelector('.app-wrapper')||document.querySelector('.student-app')||document.body;

  function css(){
    if(document.getElementById('yms-teacher-student-mgmt-css'))return;
    const s=document.createElement('style');s.id='yms-teacher-student-mgmt-css';s.textContent=`
      body{background:#F4F7FD!important}.tsm-page{max-width:920px;margin:0 auto;padding:18px 16px 110px}.tsm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}.tsm-title{font-size:20px;font-weight:900;color:#14245A}.tsm-sub{font-size:11px;color:#7A87A8;margin-top:4px;line-height:1.5}.tsm-month{height:38px;border:1px solid #C8D1E8;border-radius:10px;background:#fff;padding:0 10px;font:inherit;color:#273453}.tsm-summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.tsm-pill{background:#fff;border:1px solid #E1E6F0;border-radius:999px;padding:7px 11px;font-size:11px;color:#56637E}.tsm-pill strong{color:#17284F}.tsm-wrap{overflow:auto;border:1px solid #DCE3F0;border-radius:14px;background:#fff;max-height:70vh}.tsm-table{width:100%;border-collapse:separate;border-spacing:0;min-width:640px;font-size:12px}.tsm-table th{position:sticky;top:0;z-index:3;background:#1E4FD7;color:#fff;padding:11px 10px;border-right:1px solid rgba(255,255,255,.2);text-align:center;white-space:nowrap}.tsm-table td{padding:9px 10px;border-right:1px solid #E5EAF3;border-bottom:1px solid #E5EAF3;background:#fff;vertical-align:middle}.tsm-table th.name,.tsm-table td.name{position:sticky;left:0}.tsm-table th.name{z-index:5;background:#163CA9}.tsm-table td.name{z-index:1;font-weight:900;color:#243356;min-width:130px;box-shadow:2px 0 5px rgba(30,50,120,.05)}.tsm-class{display:block;font-size:10px;color:#8793AA;font-weight:700;margin-top:2px}.tsm-check{text-align:center;min-width:120px}.tsm-check input{width:20px;height:20px;accent-color:#1E4FD7;cursor:pointer}.tsm-note{width:100%;min-width:280px;min-height:42px;border:1px solid #D2DAEA;border-radius:9px;padding:8px 9px;resize:vertical;font:inherit;font-size:12px;color:#273453;background:#fff}.tsm-note:focus{outline:none;border-color:#7492D5;box-shadow:0 0 0 2px rgba(116,146,213,.14)}.tsm-saving{opacity:.55;pointer-events:none}.tsm-empty{padding:34px;text-align:center;color:#8793AA}.tsm-status{font-size:10px;color:#6E7A96;margin-top:4px;text-align:center}@media(max-width:600px){.tsm-page{padding:14px 10px 100px}.tsm-title{font-size:18px}.tsm-table{min-width:590px}.tsm-note{min-width:240px}}
    `;document.head.appendChild(s);
  }

  function recordFor(sid){
    return records.filter(r=>String(r.studentId||'')===String(sid)&&String(r.month||String(r.repliedAt||r.updatedAt||r.createdAt||'').slice(0,7))===month&&String(r.recordType||'')==='MONTHLY_TEACHER').sort((a,b)=>String(b.updatedAt||b.repliedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.repliedAt||a.createdAt||'')))[0]||null;
  }

  function render(){
    css();const host=root();if(!host)return;
    const done=students.filter(s=>recordFor(s.id)?.status==='REPLIED').length;
    host.innerHTML=`<div class="tsm-page"><div class="tsm-head"><div><div class="tsm-title">👥 학생 관리</div><div class="tsm-sub">담당 반 순서대로 학생을 확인하고, 월 상담 체크와 특이사항을 기록합니다.</div></div><input type="month" class="tsm-month" id="tsmMonth" value="${esc(month)}"></div><div class="tsm-summary"><span class="tsm-pill">담당 학생 <strong>${students.length}명</strong></span><span class="tsm-pill">상담 완료 <strong>${done}명</strong></span><span class="tsm-pill">미완료 <strong>${students.length-done}명</strong></span></div><div class="tsm-wrap"><table class="tsm-table"><thead><tr><th class="name">학생 이름</th><th>상담 체크</th><th>특이사항</th></tr></thead><tbody>${students.length?students.map(s=>{const r=recordFor(s.id),isDone=r?.status==='REPLIED',note=r?.specialNote||r?.notes||r?.reply||'';return `<tr data-sid="${esc(s.id)}"><td class="name">${esc(s.name||'-')}<span class="tsm-class">${esc(s.className||'')}</span></td><td class="tsm-check"><input type="checkbox" ${isDone?'checked':''} onchange="YMS_teacherStudentCheck('${String(s.id).replace(/'/g,"\\'")}',this.checked)"><div class="tsm-status">${isDone?'완료':'미완료'}</div></td><td><textarea class="tsm-note" placeholder="특이사항 입력" onblur="YMS_teacherStudentNote('${String(s.id).replace(/'/g,"\\'")}',this.value)">${esc(note)}</textarea></td></tr>`}).join(''):`<tr><td colspan="3" class="tsm-empty">담당 학생이 없습니다. 반 배정을 확인해주세요.</td></tr>`}</tbody></table></div></div>`;
    document.getElementById('tsmMonth').onchange=e=>{month=e.target.value||new Date().toISOString().slice(0,7);render();};
    try{window.ymsRenderTeacherNav?.('counseling.html')}catch{}
  }

  async function load(){
    css();const host=root();if(host)host.innerHTML='<div class="tsm-page"><div class="tsm-empty">학생 명단을 불러오는 중...</div></div>';
    try{
      const [cr,sr,rr]=await Promise.all([_tFetch('tables/classes?limit=300'),_tFetch('tables/students?limit=1000'),_tFetch('tables/counseling?limit=1000')]);
      const classes=cr.ok?((await cr.json()).data||[]):[];
      const allStudents=sr.ok?((await sr.json()).data||[]):[];
      records=rr.ok?((await rr.json()).data||[]):[];
      const assigned=Array.isArray(me.teacherClasses)?me.teacherClasses:String(me.teacherClasses||'').split(',').map(x=>x.trim()).filter(Boolean);
      const mine=classes.filter(c=>String(c.teacherId||'')===uid||String(c.teacherName||'')===String(me.name||'')||assigned.includes(String(c.id||''))||assigned.includes(String(c.className||'')));
      classOrder=new Map();mine.forEach((c,i)=>{if(c.id)classOrder.set('id:'+String(c.id),i);if(c.className)classOrder.set('name:'+String(c.className),i)});
      const ids=new Set(mine.map(c=>String(c.id||'')).filter(Boolean));const names=new Set(mine.map(c=>String(c.className||'')).filter(Boolean));
      students=allStudents.filter(s=>s.isActive!==false&&(ids.has(String(s.classId||''))||names.has(String(s.className||''))||String(s.teacherId||'')===uid||String(s.teacherName||'')===String(me.name||''))).sort((a,b)=>{
        const ai=classOrder.get('id:'+String(a.classId||''))??classOrder.get('name:'+String(a.className||''))??9999;
        const bi=classOrder.get('id:'+String(b.classId||''))??classOrder.get('name:'+String(b.className||''))??9999;
        return ai-bi||String(a.name||'').localeCompare(String(b.name||''),'ko');
      });
    }catch(e){console.error('[YMS] teacher student management load',e);students=[];records=[];}
    render();
  }

  async function saveState(studentId,{status,note}){
    const s=students.find(x=>String(x.id)===String(studentId));if(!s)return;
    const existing=recordFor(studentId);const now=new Date().toISOString();
    const currentNote=note!==undefined?String(note).trim():(existing?.specialNote||existing?.notes||existing?.reply||'');
    const nextStatus=status!==undefined?status:(existing?.status||'PENDING');
    const payload={recordType:'MONTHLY_TEACHER',month,studentId:s.id,studentName:s.name||'',classId:s.classId||'',className:s.className||'',teacherId:uid,teacherName:me.name||s.teacherName||'',requesterId:uid,requesterRole:'TEACHER',requesterName:me.name||'',status:nextStatus,specialNote:currentNote,reply:currentNote,repliedAt:nextStatus==='REPLIED'?(existing?.repliedAt||now):'',updatedAt:now,createdAt:existing?.createdAt||now,category:'월상담',title:`${month} 월 상담`,content:currentNote||(nextStatus==='REPLIED'?'월 상담 완료':''),isRead:true};
    const row=document.querySelector(`tr[data-sid="${CSS.escape(String(studentId))}"]`);row?.classList.add('tsm-saving');
    try{
      const r=existing?await _tFetch('tables/counseling/'+encodeURIComponent(existing.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}):await _tFetch('tables/counseling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok){const msg=await r.text().catch(()=>String(r.status));throw new Error(`저장 실패 (${r.status}) ${msg.slice(0,100)}`)}
      const saved=await r.json().catch(()=>({}));if(existing)Object.assign(existing,payload,saved);else records.push({id:saved.id,...payload,...saved});render();
    }catch(e){console.error('[YMS] teacher student management save',e);window.YMS_UI?.toast?.('❌ '+(e?.message||'저장에 실패했습니다'));render();}
  }

  window.YMS_teacherStudentCheck=async function(studentId,checked){await saveState(studentId,{status:checked?'REPLIED':'PENDING'});};
  window.YMS_teacherStudentNote=async function(studentId,value){const existing=recordFor(studentId);const old=existing?.specialNote||existing?.notes||existing?.reply||'';if(String(value).trim()===String(old).trim())return;await saveState(studentId,{note:value});window.YMS_UI?.toast?.('특이사항을 저장했습니다');};

  function boot(){setTimeout(load,0);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
