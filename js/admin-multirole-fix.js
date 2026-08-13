/* YMS admin compatibility patches */
(function(){
  'use strict';
  const hasRole=(u,role)=>{
    if(window.YMS_Roles?.has) return window.YMS_Roles.has(u,role);
    const primary=String(u?.role||'').toUpperCase();
    const extras=Array.isArray(u?.roles)?u.roles.map(r=>String(r||'').toUpperCase()):[];
    return [primary,...extras].includes(String(role||'').toUpperCase());
  };

  window.addEventListener('load',()=>{
    if(!location.pathname.endsWith('/admin.html')) return;

    try {
      if(typeof renderTeacherTable==='function') {
        window.renderTeacherTable=function(){
          const tbody=document.getElementById('teacherTableBody');
          if(!tbody) return;
          const teachers=_allUsers.filter(u=>hasRole(u,'TEACHER'));
          if(!teachers.length){
            tbody.innerHTML=`<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--gray-mid);">등록된 선생님이 없습니다</td></tr>`;
            return;
          }
          tbody.innerHTML=teachers.map(t=>{
            const myClasses=_allClasses.filter(c=>c.teacherName===t.name||c.teacherId===t.id);
            const clsLabel=myClasses.length?myClasses.map(c=>c.className).join(', '):(Array.isArray(t.teacherClasses)?t.teacherClasses.join(', '):(t.teacherClasses||'-'));
            const dual=hasRole(t,'ADMIN')&&hasRole(t,'TEACHER')?'<span class="chip chip-blue" style="font-size:10px;margin-left:6px;">관리자 겸임</span>':'';
            return `<tr>
              <td><strong>${t.name||'-'}</strong>${dual}</td>
              <td><code style="font-size:11px;background:#f5f5f5;padding:2px 6px;border-radius:4px;">${t.loginId||'-'}</code></td>
              <td style="font-size:12px;">${t.phone||'-'}</td>
              <td style="font-size:12px;">${clsLabel}</td>
              <td><span class="chip chip-green" style="font-size:11px;">활성</span></td>
            </tr>`;
          }).join('');
        };
      }

      if(typeof populateTeacherDropdown==='function') {
        window.populateTeacherDropdown=function(){
          const sel=document.getElementById('clsTeacherSelect');
          if(!sel) return;
          const teachers=_allUsers.filter(u=>hasRole(u,'TEACHER'));
          sel.innerHTML='<option value="">— 선생님 선택 —</option>'+teachers.map(t=>
            `<option value="${t.name||''}" data-id="${t.id||''}">${t.name||'-'}${t.phone?' ('+t.phone+')':''}</option>`
          ).join('');
        };
      }

      // admin.html의 기존 반 저장 함수는 GitHub Pages의 상대 URL
      // fetch('tables/classes')를 호출하고 있어 실패한다.
      // Firebase 호환 레이어인 _tFetch()를 사용하도록 교체한다.
      if(typeof submitClassForm==='function') {
        window.submitClassForm=async function(e){
          e.preventDefault();
          const editId=document.getElementById('classEditId').value;
          const isEdit=!!editId;
          const className=document.getElementById('clsName').value.trim();
          if(!className){YMS_UI.toast('❌ 반 이름을 입력해주세요');return;}

          const payload={
            className,
            subject:document.getElementById('clsSubject').value.trim(),
            teacherName:document.getElementById('clsTeacher').value.trim(),
            teacherId:document.getElementById('clsTeacherId').value.trim(),
            startTime:document.getElementById('clsStart').value,
            endTime:document.getElementById('clsEnd').value,
            tuitionFee:Number(document.getElementById('clsFee').value)||0,
            isActive:true,
          };

          const btn=document.querySelector('#classMgmtForm button[type="submit"]');
          if(btn){btn.disabled=true;btn.textContent='저장 중...';}
          try{
            const url=isEdit?`tables/classes/${editId}`:'tables/classes';
            const method=isEdit?'PATCH':'POST';
            const res=await _tFetch(url,{
              method,
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify(payload),
            });
            if(!res.ok){
              const detail=await res.text().catch(()=>`HTTP ${res.status}`);
              throw new Error(`HTTP ${res.status}${detail?` · ${detail}`:''}`);
            }
            YMS_UI.toast(isEdit?'✅ 반 정보가 수정되었습니다':'✅ 반이 추가되었습니다');
            document.getElementById('classMgmtPanel').classList.add('hidden');
            document.getElementById('classMgmtForm').reset();
            await loadClassesMgmt();
            if(typeof loadAllData==='function') await loadAllData();
          }catch(err){
            console.error('[YMS] 반 저장 실패:',err);
            YMS_UI.toast('❌ 저장 실패: '+(err?.message||'알 수 없는 오류'));
          }finally{
            if(btn){btn.disabled=false;btn.textContent='저장';}
          }
        };
      }

      const refreshTeacherCount=()=>{
        try{
          const el=document.getElementById('dashTeachers');
          if(el&&typeof _allUsers!=='undefined') el.textContent=_allUsers.filter(u=>hasRole(u,'TEACHER')).length;
        }catch{}
      };
      setTimeout(refreshTeacherCount,500);
      setTimeout(refreshTeacherCount,1500);
    } catch(err) {
      console.warn('[YMS] admin compatibility patch failed',err);
    }
  });
})();
