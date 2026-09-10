/* Class Note admin — separate school exam scores for middle/high school students */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isSecondary=s=>/^(중|고)\d/.test(String(s?.grade||''));
  const currentYear=()=>new Date().getFullYear();
  const examOrder={'1차고사':1,'중간고사':1,'2차고사':2,'기말고사':2,'수행평가':3,'기타':4};

  function installStyle(){
    if(document.getElementById('class-note-school-score-style'))return;
    const st=document.createElement('style');st.id='class-note-school-score-style';st.textContent=`
      .school-score-btn{border:0;background:#F3F6FB;color:#1E3278;border-radius:999px;padding:5px 9px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}.school-score-btn:hover{background:#E8EEF9}.school-score-empty{color:#9AA5BD;font-size:11px}
      #schoolScoreModal{position:fixed;inset:0;z-index:1650;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(20,36,90,.45);backdrop-filter:blur(3px)}#schoolScoreModal.hidden{display:none!important}.school-score-card{width:min(680px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:20px;padding:20px;box-shadow:0 14px 45px rgba(20,36,90,.25)}.school-score-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.school-score-field label{display:block;font-size:10px;font-weight:800;color:#65718B;margin-bottom:5px}.school-score-field input,.school-score-field select{width:100%;height:40px;border:1px solid #D8DFED;border-radius:10px;padding:0 10px;background:#fff;font:inherit}.school-score-history{width:100%;border-collapse:collapse;margin-top:16px;font-size:11px}.school-score-history th,.school-score-history td{padding:8px;border-bottom:1px solid #EEF1F7;text-align:center}.school-score-history th:first-child,.school-score-history td:first-child{text-align:left}@media(max-width:560px){.school-score-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(st);
  }

  function normalizeScores(s){
    if(Array.isArray(s?.schoolScores))return s.schoolScores.filter(x=>x&&typeof x==='object');
    if(s?.schoolScores&&typeof s.schoolScores==='object')return Object.values(s.schoolScores).filter(x=>x&&typeof x==='object');
    return [];
  }
  function sortScores(rows){
    return [...rows].sort((a,b)=>Number(b.year||0)-Number(a.year||0)||Number(b.semester||0)-Number(a.semester||0)||(examOrder[b.examType]||0)-(examOrder[a.examType]||0)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  }
  function latestScore(s){return sortScores(normalizeScores(s))[0]||null;}

  function ensureModal(){
    if(document.getElementById('schoolScoreModal'))return;
    const years=Array.from({length:5},(_,i)=>currentYear()+1-i);
    const m=document.createElement('div');m.id='schoolScoreModal';m.className='hidden';m.innerHTML=`<div class="school-score-card"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div id="schoolScoreName" style="font-size:19px;font-weight:900;color:#14245A">학생</div><div style="margin-top:3px;font-size:11px;color:#7A87A8">중·고등 내신 점수</div></div><button type="button" class="btn btn-sm btn-ghost" id="schoolScoreClose">닫기</button></div><input type="hidden" id="schoolScoreStudentId"><div class="school-score-grid" style="margin-top:16px"><div class="school-score-field"><label>연도</label><select id="schoolScoreYear">${years.map(y=>`<option value="${y}">${y}년</option>`).join('')}</select></div><div class="school-score-field"><label>학기</label><select id="schoolScoreSemester"><option value="1">1학기</option><option value="2">2학기</option></select></div><div class="school-score-field"><label>시험</label><select id="schoolScoreExam"><option>1차고사</option><option>2차고사</option><option>중간고사</option><option>기말고사</option><option>수행평가</option><option>기타</option></select></div><div class="school-score-field"><label>점수</label><input id="schoolScoreValue" type="number" min="0" max="100" step="0.1" placeholder="0~100"></div></div><div class="school-score-field" style="margin-top:10px"><label>메모</label><input id="schoolScoreMemo" type="text" placeholder="예) 영어 1차고사"></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="btn btn-primary" id="schoolScoreSave">내신 점수 저장</button></div><div id="schoolScoreHistory"></div></div>`;
    m.addEventListener('click',e=>{if(e.target===m)m.classList.add('hidden')});
    document.body.appendChild(m);
    m.querySelector('#schoolScoreClose').onclick=()=>m.classList.add('hidden');
    m.querySelector('#schoolScoreSave').onclick=saveScore;
  }

  function renderHistory(s){
    const host=document.getElementById('schoolScoreHistory');if(!host)return;
    const rows=sortScores(normalizeScores(s));
    if(!rows.length){host.innerHTML='<div style="padding:22px;text-align:center;color:#8A96B2">아직 내신 점수 기록이 없습니다.</div>';return;}
    host.innerHTML=`<table class="school-score-history"><thead><tr><th>시험</th><th>점수</th><th>메모</th><th></th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${esc(r.year)}년 ${esc(r.semester)}학기 · ${esc(r.examType||'시험')}</td><td><strong>${Number(r.score)}</strong></td><td>${esc(r.memo||'-')}</td><td><button type="button" class="btn btn-sm btn-ghost" onclick="ClassNote_deleteSchoolScore(${i})">삭제</button></td></tr>`).join('')}</tbody></table>`;
    host.dataset.sorted='1';
  }

  window.ClassNote_openSchoolScore=function(studentId){
    ensureModal();const s=(window._allStudents||[]).find(x=>String(x.id)===String(studentId));if(!s||!isSecondary(s))return;
    document.getElementById('schoolScoreStudentId').value=s.id;document.getElementById('schoolScoreName').textContent=s.name||'학생';document.getElementById('schoolScoreYear').value=String(currentYear());document.getElementById('schoolScoreSemester').value=new Date().getMonth()<7?'1':'2';document.getElementById('schoolScoreExam').value='1차고사';document.getElementById('schoolScoreValue').value='';document.getElementById('schoolScoreMemo').value='';renderHistory(s);document.getElementById('schoolScoreModal').classList.remove('hidden');
  };

  async function persist(s,rows){
    const r=await _tFetch(`tables/students/${encodeURIComponent(s.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({schoolScores:rows})});if(!r.ok)throw new Error(`HTTP ${r.status}`);s.schoolScores=rows;
  }

  async function saveScore(){
    const id=document.getElementById('schoolScoreStudentId').value,s=(window._allStudents||[]).find(x=>String(x.id)===String(id));if(!s)return;
    const score=Number(document.getElementById('schoolScoreValue').value);if(!Number.isFinite(score)||score<0||score>100){window.YMS_UI?.toast?.('❌ 0~100점 사이 점수를 입력해주세요');return;}
    const year=Number(document.getElementById('schoolScoreYear').value),semester=Number(document.getElementById('schoolScoreSemester').value),examType=document.getElementById('schoolScoreExam').value,memo=document.getElementById('schoolScoreMemo').value.trim();let rows=normalizeScores(s);
    const same=rows.findIndex(r=>Number(r.year)===year&&Number(r.semester)===semester&&String(r.examType||'')===examType);
    const rec={year,semester,examType,score:Math.round(score*10)/10,memo,updatedAt:new Date().toISOString()};if(same>=0)rows[same]={...rows[same],...rec};else rows.push({...rec,createdAt:new Date().toISOString()});
    try{await persist(s,rows);renderHistory(s);enhanceTable();window.YMS_UI?.toast?.('✅ 내신 점수를 저장했습니다');}catch(e){console.error('[Class Note] school score save',e);window.YMS_UI?.toast?.('❌ 내신 점수 저장 실패: '+e.message);}
  }

  window.ClassNote_deleteSchoolScore=async function(sortedIndex){
    const id=document.getElementById('schoolScoreStudentId').value,s=(window._allStudents||[]).find(x=>String(x.id)===String(id));if(!s)return;const target=sortScores(normalizeScores(s))[sortedIndex];if(!target)return;let removed=false;const rows=normalizeScores(s).filter(r=>{if(removed)return true;const same=Number(r.year)===Number(target.year)&&Number(r.semester)===Number(target.semester)&&String(r.examType||'')===String(target.examType||'')&&Number(r.score)===Number(target.score);if(same){removed=true;return false;}return true;});
    try{await persist(s,rows);renderHistory(s);enhanceTable();window.YMS_UI?.toast?.('내신 점수를 삭제했습니다');}catch(e){window.YMS_UI?.toast?.('❌ 삭제 실패: '+e.message);}
  };

  function enhanceTable(){
    const table=document.querySelector('#section-students .admin-table'),head=table?.tHead?.rows?.[0],body=document.getElementById('studentTableBody');if(!table||!head||!body)return;
    if(!head.querySelector('[data-school-score-head]')){const th=document.createElement('th');th.dataset.schoolScoreHead='1';th.textContent='내신';const manage=[...head.cells].find(c=>/관리/.test(c.textContent||''));head.insertBefore(th,manage||null);}
    const rows=[...body.rows],students=[...(window._allStudents||[])].filter(s=>s.isActive!==false).filter(s=>{const search=(document.getElementById('studentSearch')?.value||'').trim().toLowerCase();const cf=document.getElementById('studentClassFilter')?.value||'ALL';const classOk=cf==='ALL'||s.className===cf;const searchOk=!search||[s.name,s.grade,s.schoolName,s.className].some(v=>String(v||'').toLowerCase().includes(search));return classOk&&searchOk;}).sort((a,b)=>String(a.className||'').localeCompare(String(b.className||''),'ko')||String(a.name||'').localeCompare(String(b.name||''),'ko'));
    rows.forEach((tr,i)=>{if(tr.querySelector('td[data-school-score-cell]'))return;const s=students[i];if(!s)return;const td=document.createElement('td');td.dataset.schoolScoreCell='1';if(isSecondary(s)){const latest=latestScore(s);td.innerHTML=`<button type="button" class="school-score-btn" onclick="ClassNote_openSchoolScore('${esc(s.id)}')">${latest?`${Number(latest.score)}점`:'내신 입력'}</button>`;}else td.innerHTML='<span class="school-score-empty">-</span>';const manage=[...tr.cells].find(c=>c.querySelector('button')&&/한눈에 보기|계정 정보|관리/.test(c.textContent||''));tr.insertBefore(td,manage||tr.lastElementChild);});
  }

  function patchRender(){const old=window.renderStudentTable;if(typeof old==='function'&&!old.__schoolScorePatched){const f=function(){const r=old.apply(this,arguments);setTimeout(enhanceTable,0);return r};f.__schoolScorePatched=true;window.renderStudentTable=f;}}
  const obs=new MutationObserver(()=>enhanceTable());
  function init(){installStyle();ensureModal();patchRender();const body=document.getElementById('studentTableBody');if(body)obs.observe(body,{childList:true,subtree:true});enhanceTable();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();window.addEventListener('load',()=>setTimeout(init,500));
})();
