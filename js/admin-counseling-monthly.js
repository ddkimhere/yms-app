/* YMS admin monthly counseling tracker — registered students first */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  let students=[];
  let counseling=[];
  let month=new Date().toISOString().slice(0,7);
  let teacher='ALL';
  let status='ALL';
  let loading=false;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const section=()=>document.getElementById('section-counseling');

  function css(){
    if(document.getElementById('yms-admin-counseling-monthly-css')) return;
    const s=document.createElement('style');
    s.id='yms-admin-counseling-monthly-css';
    s.textContent=`
      .acm-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:16px}
      .acm-title{font-size:18px;font-weight:900;color:#14245A}.acm-sub{font-size:11px;color:#7A87A8;margin-top:4px}
      .acm-filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
      .acm-filters select,.acm-filters input{height:36px;border:1px solid #C8D1E8;border-radius:9px;background:#fff;padding:0 10px;font:inherit;font-size:12px;color:#273453}
      .acm-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.acm-pill{background:#fff;border:1px solid #E1E6F0;border-radius:999px;padding:7px 12px;font-size:11px;color:#56637E}.acm-pill strong{color:#17284F}
      .acm-table-wrap{overflow:auto;border:1px solid #DCE3F0;border-radius:14px;background:#fff;max-height:68vh}.acm-table{width:100%;border-collapse:separate;border-spacing:0;min-width:760px;font-size:12px}
      .acm-table th{position:sticky;top:0;background:#1E4FD7;color:#fff;padding:10px;border-right:1px solid rgba(255,255,255,.2);text-align:center;z-index:2}.acm-table td{padding:10px;border-right:1px solid #E6EAF2;border-bottom:1px solid #E6EAF2;text-align:center;background:#fff}
      .acm-table th.name,.acm-table td.name{position:sticky;left:0}.acm-table th.name{z-index:4;background:#163CA9}.acm-table td.name{z-index:1;text-align:left;font-weight:800;color:#243356;box-shadow:2px 0 5px rgba(30,50,120,.06)}
      .acm-done{display:inline-flex;align-items:center;gap:4px;padding:5px 9px;border-radius:999px;background:#E8F6EF;color:#237A53;border:1px solid #A9D9C1;font-weight:800}.acm-pending{display:inline-flex;align-items:center;gap:4px;padding:5px 9px;border-radius:999px;background:#FFF3E0;color:#C56B00;border:1px solid #FFD49B;font-weight:800}.acm-empty{padding:30px;text-align:center;color:#8793AA}
    `;
    document.head.appendChild(s);
  }

  function completedRecord(studentId){
    return counseling
      .filter(c=>String(c.studentId||'')===String(studentId))
      .filter(c=>String(c.status||'').toUpperCase()==='REPLIED')
      .filter(c=>String(c.repliedAt||c.updatedAt||c.createdAt||'').slice(0,7)===month)
      .sort((a,b)=>String(b.repliedAt||b.updatedAt||b.createdAt||'').localeCompare(String(a.repliedAt||a.updatedAt||a.createdAt||'')))[0]||null;
  }

  function teacherNameFor(s,record){return record?.teacherName||s.teacherName||'-';}
  function activeStudents(){return students.filter(s=>s&&s.isActive!==false&&String(s.name||'').trim());}

  function filteredRows(){
    return activeStudents()
      .map(s=>{const rec=completedRecord(s.id);return {s,rec,done:!!rec,teacher:teacherNameFor(s,rec)}})
      .filter(x=>teacher==='ALL'||x.teacher===teacher)
      .filter(x=>status==='ALL'||(status==='DONE'?x.done:!x.done))
      .sort((a,b)=>String(a.s.name||'').localeCompare(String(b.s.name||''),'ko'));
  }

  function render(){
    const el=section();if(!el)return;
    const active=activeStudents();
    const rows=filteredRows();
    const mapped=active.map(s=>({s,rec:completedRecord(s.id)}));
    const done=mapped.filter(x=>x.rec).length;
    const pending=active.length-done;
    const teachers=[...new Set(active.map(s=>s.teacherName).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));

    el.innerHTML=`
      <div class="acm-head"><div><div class="acm-title">상담 관리</div><div class="acm-sub">등록 학생 전체를 기준으로 월별 상담 여부를 확인합니다.</div></div></div>
      <div class="acm-filters">
        <span style="font-size:12px;color:#5C6880">월</span><input type="month" id="acmMonth" value="${esc(month)}">
        <span style="font-size:12px;color:#5C6880">선생님</span><select id="acmTeacher"><option value="ALL">전체</option>${teachers.map(t=>`<option value="${esc(t)}" ${teacher===t?'selected':''}>${esc(t)}</option>`).join('')}</select>
        <span style="font-size:12px;color:#5C6880">상태</span><select id="acmStatus"><option value="ALL" ${status==='ALL'?'selected':''}>전체</option><option value="DONE" ${status==='DONE'?'selected':''}>완료</option><option value="PENDING" ${status==='PENDING'?'selected':''}>미완료</option></select>
      </div>
      <div class="acm-summary"><span class="acm-pill">등록 학생 <strong>${active.length}명</strong></span><span class="acm-pill">상담 완료 <strong>${done}명</strong></span><span class="acm-pill">미완료 <strong>${pending}명</strong></span><span class="acm-pill">완료율 <strong>${active.length?Math.round(done/active.length*100):0}%</strong></span></div>
      <div class="acm-table-wrap"><table class="acm-table"><thead><tr><th class="name">학생</th><th>학교</th><th>학년</th><th>반</th><th>담당 선생님</th><th>${esc(month.replace('-','년 '))}월 상담</th><th>상담일</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td class="name">${esc(x.s.name||'-')}</td><td>${esc(x.s.schoolName||'-')}</td><td>${esc(x.s.grade||'-')}</td><td>${esc(x.s.className||'-')}</td><td>${esc(x.teacher||'-')}</td><td>${x.done?'<span class="acm-done">✓ 완료</span>':'<span class="acm-pending">○ 미완료</span>'}</td><td>${x.rec?esc(String(x.rec.repliedAt||x.rec.updatedAt||x.rec.createdAt||'').slice(0,10)):'-'}</td></tr>`).join(''):`<tr><td colspan="7" class="acm-empty">등록된 학생이 없습니다</td></tr>`}</tbody></table></div>`;

    document.getElementById('acmMonth').onchange=e=>{month=e.target.value||new Date().toISOString().slice(0,7);render();};
    document.getElementById('acmTeacher').onchange=e=>{teacher=e.target.value;render();};
    document.getElementById('acmStatus').onchange=e=>{status=e.target.value;render();};
  }

  async function load(force=false){
    if(loading&&!force)return;
    loading=true;
    const el=section();if(!el){loading=false;return;}
    try{
      const sr=await _tFetch('tables/students?limit=1000');
      if(sr.ok)students=(await sr.json()).data||[];
      else if(typeof _allStudents!=='undefined'&&Array.isArray(_allStudents))students=[..._allStudents];
      students=students.filter(Boolean);
      render();
      const cr=await _tFetch('tables/counseling?limit=1000');
      counseling=cr.ok?((await cr.json()).data||[]):[];
      render();
    }catch(e){
      console.error('[YMS] admin counseling monthly',e);
      if(typeof _allStudents!=='undefined'&&Array.isArray(_allStudents)){students=[..._allStudents];render();}
    }finally{loading=false;}
  }

  function install(){
    css();
    const old=window.switchSection;
    if(typeof old==='function'&&!old.__acmWrapped){
      const f=function(name,el){const r=old.apply(this,arguments);if(name==='counseling'){teacher='ALL';status='ALL';setTimeout(()=>load(true),50);setTimeout(()=>load(true),300);}return r;};
      f.__acmWrapped=true;window.switchSection=f;
    }
    document.addEventListener('click',e=>{if(e.target.closest('#nav-counseling')){teacher='ALL';status='ALL';setTimeout(()=>load(true),120);}},true);
    if(section()&&!section().classList.contains('hidden'))load(true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
