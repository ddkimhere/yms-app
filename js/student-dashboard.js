/* YMS student management overview: class filter + attendance + homework misses + monthly scores */
(function(){
  'use strict';
  let attendanceRows=[];
  let currentClassFilter='ALL';
  const currentMonth=()=>new Date().toISOString().slice(0,7);

  function esc(v){
    return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function studentAttendance(student){
    const rows=attendanceRows.filter(a=>
      (a.studentId && a.studentId===student.id) ||
      (!a.studentId && a.studentName && a.studentName===student.name)
    );
    if(!rows.length) return {rate:null,total:0,attended:0};
    const attended=rows.filter(a=>a.status==='PRESENT'||a.status==='LATE').length;
    return {rate:Math.round(attended/rows.length*100),total:rows.length,attended};
  }
  function homeworkMisses(student,month=currentMonth()){
    if(student.homeworkMisses && typeof student.homeworkMisses==='object') return Number(student.homeworkMisses[month]||0);
    return Number(student.homeworkMissCount||0);
  }
  function monthlyScore(student,month=currentMonth()){
    if(student.monthlyScores && typeof student.monthlyScores==='object'){
      const v=student.monthlyScores[month];
      return (v===0||v)?Number(v):null;
    }
    return (student.monthlyScore===0||student.monthlyScore)?Number(student.monthlyScore):null;
  }
  function attendanceChip(stat){
    if(stat.rate===null) return '<span class="student-metric-muted">기록 없음</span>';
    const cls=stat.rate>=90?'good':stat.rate>=80?'warn':'bad';
    return `<div class="student-rate ${cls}"><strong>${stat.rate}%</strong><small>${stat.attended}/${stat.total}</small></div>`;
  }
  function scoreChip(score){
    if(score===null) return '<span class="student-metric-muted">미입력</span>';
    const cls=score>=80?'good':score>=60?'warn':'bad';
    return `<span class="student-score ${cls}">${score}점</span>`;
  }

  function installStyle(){
    if(document.getElementById('studentOverviewStyle')) return;
    const style=document.createElement('style');
    style.id='studentOverviewStyle';
    style.textContent=`
      .student-overview-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 16px}
      .student-overview-card{padding:15px 16px;background:#fff;border:1px solid var(--beige);border-radius:14px;box-shadow:var(--shadow-sm)}
      .student-overview-label{font-size:10px;color:var(--gray-mid);font-weight:750}
      .student-overview-value{margin-top:5px;font-size:21px;font-weight:900;color:var(--navy-dark)}
      .student-filter-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;width:100%}
      .student-filter-row .search-input-wrap{flex:1 1 240px}
      .student-class-filter{min-height:40px;min-width:170px;padding:8px 11px;border:1.5px solid #D8E0EF;border-radius:11px;background:#fff;color:var(--charcoal);font-size:12px}
      .student-rate{display:inline-flex;align-items:baseline;gap:5px}.student-rate strong{font-size:14px}.student-rate small{font-size:9px;color:var(--gray-mid)}
      .student-rate.good,.student-score.good{color:#23774F}.student-rate.warn,.student-score.warn{color:#B77700}.student-rate.bad,.student-score.bad{color:#C73535}
      .student-score{display:inline-flex;padding:4px 8px;border-radius:999px;background:#F4F6FB;font-size:11px;font-weight:850}
      .student-metric-muted{font-size:11px;color:#9AA5BD}
      .student-miss{display:inline-flex;min-width:28px;justify-content:center;padding:4px 8px;border-radius:999px;background:#FFF0F0;color:#C73535;font-size:11px;font-weight:850}
      .student-miss.zero{background:#EAF7F1;color:#23774F}
      #studentOverviewModal{position:fixed;inset:0;z-index:1300;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(20,36,90,.45);backdrop-filter:blur(3px)}
      #studentOverviewModal.hidden{display:none!important}.student-overview-modal-card{width:min(100%,520px);max-height:88vh;overflow:auto;background:#fff;border-radius:20px;padding:22px;box-shadow:var(--shadow-lg)}
      .student-overview-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.student-overview-field{padding:12px;border-radius:12px;background:#F7F9FD}.student-overview-field label{display:block;font-size:10px;color:var(--gray-mid);font-weight:750;margin-bottom:6px}.student-overview-field input{width:100%;min-height:40px;border:1px solid #D8E0EF;border-radius:9px;padding:8px 10px}
      @media(max-width:800px){.student-overview-summary{grid-template-columns:1fr 1fr}.student-filter-row{align-items:stretch}.student-class-filter{flex:1 1 160px}}
      @media(max-width:520px){.student-overview-summary{gap:8px}.student-overview-card{padding:12px}.student-overview-value{font-size:18px}.student-overview-grid{grid-template-columns:1fr}.admin-table.student-overview-table{min-width:760px}}
    `;
    document.head.appendChild(style);
  }

  function upgradeStudentSection(){
    const section=document.getElementById('section-students');
    const header=section?.querySelector('.admin-table-header');
    const table=section?.querySelector('.admin-table');
    if(!section||!header||!table) return;

    if(!document.getElementById('studentOverviewSummary')){
      const summary=document.createElement('div');
      summary.id='studentOverviewSummary';
      summary.className='student-overview-summary';
      summary.innerHTML=`
        <div class="student-overview-card"><div class="student-overview-label">현재 학생</div><div class="student-overview-value" id="studentSumCount">-</div></div>
        <div class="student-overview-card"><div class="student-overview-label">평균 출석률</div><div class="student-overview-value" id="studentSumAttendance">-</div></div>
        <div class="student-overview-card"><div class="student-overview-label">${currentMonth().slice(5)}월 숙제 미제출</div><div class="student-overview-value" id="studentSumHomework">-</div></div>
        <div class="student-overview-card"><div class="student-overview-label">${currentMonth().slice(5)}월 월평 입력</div><div class="student-overview-value" id="studentSumScores">-</div></div>`;
      section.insertBefore(summary,header);
    }

    const searchWrap=document.getElementById('studentSearch')?.closest('.search-input-wrap');
    if(searchWrap && !document.getElementById('studentClassFilter')){
      const row=document.createElement('div');
      row.className='student-filter-row';
      header.insertBefore(row,header.firstChild);
      row.appendChild(searchWrap);
      const sel=document.createElement('select');
      sel.id='studentClassFilter';
      sel.className='student-class-filter';
      sel.onchange=()=>{currentClassFilter=sel.value;window.renderStudentTable?.();};
      row.appendChild(sel);
    }

    table.classList.add('student-overview-table');
    const tr=table.querySelector('thead tr');
    if(tr) tr.innerHTML='<th>학생</th><th>반</th><th>출석률</th><th>숙제 미제출</th><th>월평</th><th>관리</th>';
  }

  function ensureModal(){
    if(document.getElementById('studentOverviewModal')) return;
    const modal=document.createElement('div');
    modal.id='studentOverviewModal';
    modal.className='hidden';
    modal.innerHTML=`<div class="student-overview-modal-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;">
        <div><div style="font-size:18px;font-weight:900;color:var(--navy-dark);" id="studentOvName">학생</div><div style="margin-top:4px;font-size:11px;color:var(--gray-mid);" id="studentOvMeta"></div></div>
        <button class="btn btn-ghost btn-sm" type="button" onclick="document.getElementById('studentOverviewModal').classList.add('hidden')">닫기</button>
      </div>
      <input type="hidden" id="studentOvId">
      <div class="student-overview-grid">
        <div class="student-overview-field"><label>전체 출석률</label><div id="studentOvAttendance" style="font-size:19px;font-weight:900;">-</div></div>
        <div class="student-overview-field"><label>기준 월</label><div style="font-size:16px;font-weight:850;">${currentMonth()}</div></div>
        <div class="student-overview-field"><label>이번 달 숙제 미제출 횟수</label><input type="number" min="0" step="1" id="studentOvMisses"></div>
        <div class="student-overview-field"><label>이번 달 월평 점수</label><input type="number" min="0" max="100" step="1" id="studentOvScore" placeholder="0~100"></div>
      </div>
      <div style="font-size:11px;color:var(--gray-mid);line-height:1.6;margin-top:12px;">숙제 미제출과 월평 점수는 월별로 저장됩니다. 출석률은 출결 입력 기록에서 자동 계산됩니다.</div>
      <div style="display:flex;gap:8px;margin-top:16px;"><button class="btn btn-primary" type="button" style="flex:1" onclick="saveStudentOverview()">저장</button><button class="btn btn-ghost" type="button" onclick="editStudentFromOverview()">학생 정보 수정</button></div>
    </div>`;
    modal.addEventListener('click',e=>{if(e.target===modal) modal.classList.add('hidden');});
    document.body.appendChild(modal);
  }

  function populateClassFilter(){
    const sel=document.getElementById('studentClassFilter');
    if(!sel) return;
    const classes=[...new Set((_allClasses||[]).map(c=>c.className).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
    sel.innerHTML='<option value="ALL">전체 반</option>'+classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    sel.value=classes.includes(currentClassFilter)?currentClassFilter:'ALL';
    currentClassFilter=sel.value;
  }

  async function loadAttendance(){
    try{
      const r=await _tFetch('tables/attendance?limit=1000');
      attendanceRows=r.ok?(await r.json()).data||[]:[];
    }catch{attendanceRows=[];}
  }

  function visibleStudents(){
    const search=(document.getElementById('studentSearch')?.value||'').trim().toLowerCase();
    const list=(_allStudents||[]).filter(s=>s.isActive!==false);
    return list.filter(s=>{
      const classOk=currentClassFilter==='ALL'||s.className===currentClassFilter;
      const searchOk=!search||[s.name,s.grade,s.schoolName,s.className].some(v=>String(v||'').toLowerCase().includes(search));
      return classOk&&searchOk;
    }).sort((a,b)=>{
      const c=(a.className||'').localeCompare(b.className||'','ko');
      return c||(a.name||'').localeCompare(b.name||'','ko');
    });
  }

  function updateSummary(students){
    const stats=students.map(studentAttendance).filter(x=>x.rate!==null);
    const avg=stats.length?Math.round(stats.reduce((a,b)=>a+b.rate,0)/stats.length):null;
    const misses=students.reduce((sum,s)=>sum+homeworkMisses(s),0);
    const scored=students.filter(s=>monthlyScore(s)!==null).length;
    const put=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    put('studentSumCount',`${students.length}명`);
    put('studentSumAttendance',avg===null?'-':`${avg}%`);
    put('studentSumHomework',`${misses}회`);
    put('studentSumScores',`${scored}/${students.length}명`);
  }

  window.renderStudentTable=function(){
    const tbody=document.getElementById('studentTableBody');
    if(!tbody) return;
    const students=visibleStudents();
    updateSummary(students);
    if(!students.length){
      tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--gray-mid);">조건에 맞는 학생이 없습니다.</td></tr>';
      return;
    }
    tbody.innerHTML=students.map(s=>{
      const att=studentAttendance(s);
      const misses=homeworkMisses(s);
      const score=monthlyScore(s);
      return `<tr>
        <td><strong>${esc(s.name||'-')}</strong><div style="font-size:10px;color:var(--gray-mid);margin-top:3px;">${esc(s.grade||'-')} · ${esc(s.schoolName||'-')}</div></td>
        <td>${esc(s.className||'미지정')}<div style="font-size:10px;color:var(--gray-mid);margin-top:3px;">${esc(s.teacherName||'담당 없음')}</div></td>
        <td>${attendanceChip(att)}</td>
        <td><span class="student-miss ${misses===0?'zero':''}">${misses}회</span></td>
        <td>${scoreChip(score)}</td>
        <td><button class="btn btn-outline btn-sm" type="button" onclick="openStudentOverview('${esc(s.id)}')">한눈에 보기</button></td>
      </tr>`;
    }).join('');
  };

  window.filterStudents=function(){ window.renderStudentTable(); };

  window.initStudents=async function(){
    await loadAllData();
    upgradeStudentSection();
    ensureModal();
    populateClassFilter();
    await loadAttendance();
    window.renderStudentTable();
    if(typeof checkAutoGradeUpNotice==='function') checkAutoGradeUpNotice();
    const sel=document.getElementById('stuClass');
    if(sel){
      sel.innerHTML='<option value="">— 반 선택 —</option>'+(_allClasses||[]).map(c=>`<option value="${esc(c.id)}" data-name="${esc(c.className||'')}" data-teacher="${esc(c.teacherName||'')}" data-level="${esc(c.levelCode||'')}">${esc(c.className||'-')}${c.teacherName?' ('+esc(c.teacherName)+')':''}</option>`).join('');
    }
  };

  window.openStudentOverview=function(id){
    const s=(_allStudents||[]).find(x=>x.id===id);
    if(!s) return;
    const att=studentAttendance(s);
    document.getElementById('studentOvId').value=s.id;
    document.getElementById('studentOvName').textContent=s.name||'학생';
    document.getElementById('studentOvMeta').textContent=`${s.grade||'-'} · ${s.schoolName||'-'} · ${s.className||'반 미지정'}`;
    document.getElementById('studentOvAttendance').textContent=att.rate===null?'기록 없음':`${att.rate}% (${att.attended}/${att.total})`;
    document.getElementById('studentOvMisses').value=homeworkMisses(s);
    const score=monthlyScore(s);
    document.getElementById('studentOvScore').value=score===null?'':score;
    document.getElementById('studentOverviewModal').classList.remove('hidden');
  };

  window.saveStudentOverview=async function(){
    const id=document.getElementById('studentOvId').value;
    const s=(_allStudents||[]).find(x=>x.id===id);
    if(!s) return;
    const month=currentMonth();
    const misses=Math.max(0,Number(document.getElementById('studentOvMisses').value)||0);
    const raw=document.getElementById('studentOvScore').value;
    const score=raw===''?null:Math.max(0,Math.min(100,Number(raw)));
    const homeworkMap={...(s.homeworkMisses&&typeof s.homeworkMisses==='object'?s.homeworkMisses:{}),[month]:misses};
    const scoreMap={...(s.monthlyScores&&typeof s.monthlyScores==='object'?s.monthlyScores:{})};
    if(score===null) delete scoreMap[month]; else scoreMap[month]=score;
    try{
      const r=await _tFetch(`tables/students/${id}`,{
        method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({homeworkMisses:homeworkMap,monthlyScores:scoreMap})
      });
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      s.homeworkMisses=homeworkMap;s.monthlyScores=scoreMap;
      YMS_UI.toast('✅ 학생 학습 현황이 저장되었습니다');
      document.getElementById('studentOverviewModal').classList.add('hidden');
      window.renderStudentTable();
    }catch(err){YMS_UI.toast('❌ 저장 실패: '+(err?.message||''));}
  };

  window.editStudentFromOverview=function(){
    const id=document.getElementById('studentOvId').value;
    document.getElementById('studentOverviewModal').classList.add('hidden');
    if(typeof openEditStudent==='function') openEditStudent(id);
  };

  window.addEventListener('load',()=>{
    if(!location.pathname.endsWith('/admin.html')) return;
    installStyle();
    upgradeStudentSection();
    ensureModal();
  });
})();
