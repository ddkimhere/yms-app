/* YMS admin multi-role compatibility */
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

      const refreshTeacherCount=()=>{
        try{
          const el=document.getElementById('dashTeachers');
          if(el&&typeof _allUsers!=='undefined') el.textContent=_allUsers.filter(u=>hasRole(u,'TEACHER')).length;
        }catch{}
      };
      setTimeout(refreshTeacherCount,500);
      setTimeout(refreshTeacherCount,1500);
    } catch(err) {
      console.warn('[YMS] multi-role admin patch failed',err);
    }
  });
})();
