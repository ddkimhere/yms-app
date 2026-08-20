/* YMS admin teacher-management compatibility patch */
(function(){
'use strict';
if(!(location.pathname||'').endsWith('/admin.html'))return;

const has=(u,r)=>window.YMS_Roles?.has?YMS_Roles.has(u,r):[u?.role,...(Array.isArray(u?.roles)?u.roles:[])].map(x=>String(x||'').toUpperCase()).includes(r);

window.addEventListener('load',()=>{
  try{
    if(typeof renderTeacherTable==='function')window.renderTeacherTable=function(){
      const tb=document.getElementById('teacherTableBody');
      if(!tb)return;
      const ts=_allUsers.filter(u=>has(u,'TEACHER'));
      if(!ts.length){
        tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--gray-mid);">등록된 선생님이 없습니다</td></tr>';
        return;
      }
      tb.innerHTML=ts.map(t=>{
        const cs=_allClasses.filter(c=>c.teacherName===t.name||c.teacherId===t.id);
        const cl=cs.length?cs.map(c=>c.className).join(', '):(Array.isArray(t.teacherClasses)?t.teacherClasses.join(', '):(t.teacherClasses||'-'));
        return `<tr><td><strong>${t.name||'-'}</strong></td><td><code style="font-size:11px;background:#f5f5f5;padding:2px 6px;border-radius:4px;">${t.loginId||'-'}</code></td><td>${t.phone||'-'}</td><td>${cl}</td><td><span class="chip chip-green">활성</span></td></tr>`;
      }).join('');
    };

    if(typeof populateTeacherDropdown==='function')window.populateTeacherDropdown=function(){
      const s=document.getElementById('clsTeacherSelect');
      if(!s)return;
      const ts=_allUsers.filter(u=>has(u,'TEACHER'));
      s.innerHTML='<option value="">— 선생님 선택 —</option>'+ts.map(t=>`<option value="${t.name||''}" data-id="${t.id||''}">${t.name||'-'}${t.phone?' ('+t.phone+')':''}</option>`).join('');
    };

    if(typeof submitClassForm==='function')window.submitClassForm=async function(e){
      e.preventDefault();
      const id=document.getElementById('classEditId').value;
      const name=document.getElementById('clsName').value.trim();
      if(!name){YMS_UI.toast('❌ 반 이름을 입력해주세요');return;}
      const p={
        className:name,
        subject:document.getElementById('clsSubject').value.trim(),
        teacherName:document.getElementById('clsTeacher').value.trim(),
        teacherId:document.getElementById('clsTeacherId').value.trim(),
        startTime:document.getElementById('clsStart').value,
        endTime:document.getElementById('clsEnd').value,
        tuitionFee:Number(document.getElementById('clsFee').value)||0,
        isActive:true
      };
      const btn=document.querySelector('#classMgmtForm button[type="submit"]');
      if(btn){btn.disabled=true;btn.textContent='저장 중...';}
      try{
        const r=await _tFetch(id?`tables/classes/${id}`:'tables/classes',{
          method:id?'PATCH':'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(p)
        });
        if(!r.ok)throw new Error('HTTP '+r.status);
        YMS_UI.toast(id?'✅ 반 정보가 수정되었습니다':'✅ 반이 추가되었습니다');
        document.getElementById('classMgmtPanel').classList.add('hidden');
        document.getElementById('classMgmtForm').reset();
        await loadClassesMgmt();
        if(typeof loadAllData==='function')await loadAllData();
      }catch(err){
        YMS_UI.toast('❌ 저장 실패: '+(err?.message||'오류'));
      }finally{
        if(btn){btn.disabled=false;btn.textContent='저장';}
      }
    };

    const refresh=()=>{
      const e=document.getElementById('dashTeachers');
      if(e&&typeof _allUsers!=='undefined')e.textContent=_allUsers.filter(u=>has(u,'TEACHER')).length;
    };
    setTimeout(refresh,400);
  }catch(e){
    console.warn('[YMS] admin teacher-management patch failed',e);
  }
},{once:true});
})();
