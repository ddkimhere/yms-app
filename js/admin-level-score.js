/* YMS Admin — A to Z levels + monthly evaluation scores */
(function(){
  'use strict';
  if((location.pathname.split('/').pop()||'')!=='admin.html') return;

  const LEVELS=[
    ['A','Alphabet'],['B','Begin'],['C','Connect'],['D','Decode'],['E','Explore'],['F','Foundation'],
    ['G','Grow'],['H','Habit'],['I','Imagine'],['J','Jump'],['K','Knowledge'],['L','Launch'],
    ['M','Meaning'],['N','Navigate'],['O','Organize'],['P','Progress'],['Q','Quest'],['R','Rise'],
    ['S','Structure'],['T','Think'],['U','Upgrade'],['V','Vision'],['W','Wisdom'],['X','X-Factor'],
    ['Y','Young Scholar'],['Z','Zenith']
  ];
  const LEVEL_MAP=Object.fromEntries(LEVELS);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const monthNow=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
  let scoreRecords=[],scoreLoading=false;

  function ensureStyle(){
    if(document.getElementById('yms-level-score-style')) return;
    const s=document.createElement('style');s.id='yms-level-score-style';s.textContent=`
      #monthlyScorePanel{margin-top:18px;background:#fff;border:1px solid var(--beige,#E3E8F4);border-radius:18px;padding:18px;box-shadow:0 3px 14px rgba(30,50,120,.06)}
      .yms-score-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}.yms-score-title{font-size:16px;font-weight:900;color:#14245A}.yms-score-sub{font-size:11px;color:#7A87A8;margin-top:3px}.yms-score-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.yms-score-tools input,.yms-score-tools select{height:36px;border:1px solid #D8DFED;border-radius:10px;padding:0 10px;background:#fff;color:#1A2340;font-family:inherit;font-size:12px}
      .yms-score-table-wrap{overflow:auto;border:1px solid #E7EBF4;border-radius:12px}.yms-score-table{width:100%;border-collapse:collapse;min-width:680px}.yms-score-table th{padding:9px 10px;background:#F6F8FC;color:#526080;font-size:11px;text-align:left;border-bottom:1px solid #E7EBF4}.yms-score-table td{padding:9px 10px;border-bottom:1px solid #EEF1F7;font-size:12px}.yms-score-table tr:last-child td{border-bottom:0}.yms-score-input{width:78px;height:34px;border:1px solid #D8DFED;border-radius:9px;padding:0 8px;font-weight:800;text-align:center}.yms-level-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 8px;background:#EEF3FB;color:#1E3278;font-size:11px;font-weight:800}.yms-score-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px;flex-wrap:wrap}
      @media(max-width:620px){#monthlyScorePanel{padding:14px}.yms-score-tools{width:100%}.yms-score-tools input,.yms-score-tools select{flex:1;min-width:120px}.yms-score-actions .btn{flex:1}}
    `;document.head.appendChild(s);
  }

  function levelLabel(code){return code&&LEVEL_MAP[code]?`${code} · ${LEVEL_MAP[code]}`:(code||'-');}

  function ensureClassLevelField(){
    const form=document.getElementById('classMgmtForm');
    if(!form||document.getElementById('clsLevel')) return;
    const grid=form.querySelector('div[style*="grid-template-columns"]');
    if(!grid) return;
    const wrap=document.createElement('div');wrap.className='form-group';wrap.style.margin='0';
    wrap.innerHTML=`<label class="form-label">YMS A to Z 레벨</label><select class="form-input form-select" id="clsLevel"><option value="">— 레벨 선택 —</option>${LEVELS.map(([c,n])=>`<option value="${c}">${c} · ${n}</option>`).join('')}</select><div style="font-size:10px;color:var(--gray-mid,#7A87A8);margin-top:4px;">반 레벨을 바꾸면 소속 학생 레벨도 함께 변경됩니다.</div>`;
    const subject=document.getElementById('clsSubject')?.closest('.form-group');
    if(subject?.nextSibling) grid.insertBefore(wrap,subject.nextSibling); else grid.appendChild(wrap);
  }

  async function syncClassStudents(classId,className,levelCode){
    const list=(window._allStudents||[]).filter(s=>String(s.classId||'')===String(classId||'')||(!classId&&String(s.className||'')===String(className||''))||String(s.className||'')===String(className||''));
    if(!list.length) return {ok:0,fail:0};
    let ok=0,fail=0;
    for(const s of list){
      if(String(s.levelCode||'')===String(levelCode||'')) continue;
      try{
        const r=await _tFetch(`tables/students/${s.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({levelCode:levelCode||''})});
        if(!r.ok) throw new Error(); s.levelCode=levelCode||'';ok++;
      }catch{fail++;}
    }
    return {ok,fail};
  }

  function patchClassFunctions(){
    ensureClassLevelField();
    const oldOpen=window.openEditClass;
    if(typeof oldOpen==='function'&&!oldOpen.__ymsLevelPatched){
      const wrapped=function(id){oldOpen(id);setTimeout(()=>{const c=(window._classList||[]).find(x=>x.id===id);const el=document.getElementById('clsLevel');if(el&&c)el.value=c.levelCode||'';},0);};
      wrapped.__ymsLevelPatched=true;window.openEditClass=wrapped;
    }
    const oldShow=window.showAddClassPanel;
    if(typeof oldShow==='function'&&!oldShow.__ymsLevelPatched){
      const wrapped=function(){oldShow();setTimeout(()=>{ensureClassLevelField();const id=document.getElementById('classEditId')?.value;if(!id){const el=document.getElementById('clsLevel');if(el)el.value='';}},0);};
      wrapped.__ymsLevelPatched=true;window.showAddClassPanel=wrapped;
    }
    if(typeof window.submitClassForm==='function'&&!window.submitClassForm.__ymsLevelPatched){
      const wrapped=async function(e){
        e.preventDefault();
        const editId=document.getElementById('classEditId').value,isEdit=!!editId;
        const className=document.getElementById('clsName').value.trim();
        if(!className){window.YMS_UI?.toast?.('❌ 반 이름을 입력해주세요');return;}
        const levelCode=document.getElementById('clsLevel')?.value||'';
        const payload={className,subject:document.getElementById('clsSubject').value.trim(),levelCode,teacherName:document.getElementById('clsTeacher').value.trim(),teacherId:document.getElementById('clsTeacherId').value.trim(),startTime:document.getElementById('clsStart').value,endTime:document.getElementById('clsEnd').value,tuitionFee:Number(document.getElementById('clsFee').value)||0,isActive:true};
        const btn=document.querySelector('#classMgmtForm button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='저장 중...';}
        try{
          const r=await _tFetch(isEdit?`tables/classes/${editId}`:'tables/classes',{method:isEdit?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
          if(!r.ok)throw new Error('HTTP '+r.status);
          const saved=await r.json().catch(()=>({}));const classId=editId||saved.id||'';
          const synced=await syncClassStudents(classId,className,levelCode);
          document.getElementById('classMgmtPanel').classList.add('hidden');document.getElementById('classMgmtForm').reset();
          if(typeof window.loadClassesMgmt==='function')await window.loadClassesMgmt();
          if(typeof window.loadAllData==='function')await window.loadAllData().catch(()=>{});
          window.YMS_UI?.toast?.(`✅ 반 정보 저장${synced.ok?` · 학생 ${synced.ok}명 레벨 동기화`:''}${synced.fail?` · ${synced.fail}명 실패`:''}`);
        }catch(err){console.error('[YMS] class level save',err);window.YMS_UI?.toast?.('❌ 저장 실패: '+err.message);}
        if(btn){btn.disabled=false;btn.textContent='저장';}
      };
      wrapped.__ymsLevelPatched=true;window.submitClassForm=wrapped;
    }
    const oldRender=window.renderClassesMgmt;
    if(typeof oldRender==='function'&&!oldRender.__ymsLevelPatched){
      const wrapped=function(){oldRender();const body=document.getElementById('classMgmtBody');if(!body)return;[...(window._classList||[])].forEach((c,i)=>{const row=body.rows[i];if(row&&row.cells[2])row.cells[2].innerHTML=`<span class="yms-level-chip">${esc(levelLabel(c.levelCode))}</span>`;});};
      wrapped.__ymsLevelPatched=true;window.renderClassesMgmt=wrapped;
    }
  }

  function decodeVal(v){if(!v||typeof v!=='object')return null;if('stringValue'in v)return v.stringValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return Number(v.doubleValue);if('booleanValue'in v)return v.booleanValue;if('timestampValue'in v)return v.timestampValue;if('nullValue'in v)return null;return null;}
  function decodeDoc(doc){const out={id:String(doc?.name||'').split('/').pop()};Object.entries(doc?.fields||{}).forEach(([k,v])=>out[k]=decodeVal(v));return out;}
  async function queryScores(month){
    const token=window.YMS_Auth?.getToken?.();if(!token)return [];
    const url='https://firestore.googleapis.com/v1/projects/yms-app-bb735/databases/(default)/documents:runQuery';
    const structuredQuery={from:[{collectionId:'monthlyScores'}],limit:5000};
    if(month)structuredQuery.where={fieldFilter:{field:{fieldPath:'month'},op:'EQUAL',value:{stringValue:String(month)}}};
    const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({structuredQuery})});
    if(!r.ok)throw new Error('HTTP '+r.status);
    return (await r.json()).filter(x=>x.document).map(x=>decodeDoc(x.document));
  }

  function ensureScorePanel(){
    const section=document.getElementById('section-students');if(!section)return;
    const header=section.querySelector('.admin-table-header');
    const btnWrap=header?.querySelector('div[style*="display:flex"]');
    if(btnWrap&&!document.getElementById('openMonthlyScoresBtn')){
      const b=document.createElement('button');b.type='button';b.className='btn btn-sm';b.id='openMonthlyScoresBtn';b.style.cssText='background:#EEF3FB;color:#1E3278;border:1px solid #A8BDE8;font-size:12px';b.textContent='📊 월평 점수';b.onclick=toggleScorePanel;btnWrap.insertBefore(b,btnWrap.firstChild);
    }
    if(document.getElementById('monthlyScorePanel'))return;
    const panel=document.createElement('div');panel.id='monthlyScorePanel';panel.className='hidden';
    panel.innerHTML=`<div class="yms-score-head"><div><div class="yms-score-title">📊 월평 점수 관리</div><div class="yms-score-sub">월과 반을 선택해 점수를 입력하고 누적 결과를 Excel로 저장할 수 있습니다.</div></div><div class="yms-score-tools"><input type="month" id="scoreMonth" value="${monthNow()}"><select id="scoreClass"><option value="">전체 반</option></select><button type="button" class="btn btn-sm btn-ghost" id="scoreReloadBtn">조회</button></div></div><div class="yms-score-table-wrap"><table class="yms-score-table"><thead><tr><th>학생</th><th>학년</th><th>학교</th><th>반</th><th>레벨</th><th>점수 / 100</th></tr></thead><tbody id="scoreTableBody"><tr><td colspan="6" style="text-align:center;padding:24px;color:#8A96B2">월평 점수를 불러오세요.</td></tr></tbody></table></div><div class="yms-score-actions"><button type="button" class="btn btn-ghost" id="scoreExportMonthBtn">📥 선택 월 Excel</button><button type="button" class="btn btn-ghost" id="scoreExportAllBtn">📥 전체 누적 Excel</button><button type="button" class="btn btn-primary" id="scoreSaveBtn">점수 저장</button></div>`;
    const tableWrap=section.querySelector('.admin-table-wrap');tableWrap?.insertAdjacentElement('afterend',panel);
    panel.querySelector('#scoreReloadBtn').onclick=loadScores;
    panel.querySelector('#scoreMonth').onchange=loadScores;
    panel.querySelector('#scoreClass').onchange=renderScores;
    panel.querySelector('#scoreSaveBtn').onclick=saveScores;
    panel.querySelector('#scoreExportMonthBtn').onclick=()=>exportScores(false);
    panel.querySelector('#scoreExportAllBtn').onclick=()=>exportScores(true);
  }

  function populateScoreClasses(){
    const sel=document.getElementById('scoreClass');if(!sel)return;
    const prev=sel.value;sel.innerHTML='<option value="">전체 반</option>'+[...(window._allClasses||[])].sort((a,b)=>String(a.className||'').localeCompare(String(b.className||''),'ko')).map(c=>`<option value="${esc(c.id)}">${esc(c.className||'반')} · ${esc(levelLabel(c.levelCode))}</option>`).join('');if([...sel.options].some(o=>o.value===prev))sel.value=prev;
  }

  async function toggleScorePanel(){
    ensureScorePanel();const p=document.getElementById('monthlyScorePanel');if(!p)return;
    const opening=p.classList.contains('hidden');p.classList.toggle('hidden');if(opening){populateScoreClasses();await loadScores();p.scrollIntoView({behavior:'smooth',block:'start'});}
  }

  async function loadScores(){
    if(scoreLoading)return;scoreLoading=true;const body=document.getElementById('scoreTableBody');if(body)body.innerHTML='<tr><td colspan="6" style="text-align:center;padding:24px;color:#8A96B2">불러오는 중...</td></tr>';
    try{scoreRecords=await queryScores(document.getElementById('scoreMonth')?.value||monthNow());renderScores();}
    catch(e){console.error('[YMS] monthly scores load',e);if(body)body.innerHTML='<tr><td colspan="6" style="text-align:center;padding:24px;color:#C62828">점수를 불러오지 못했습니다.</td></tr>';}
    finally{scoreLoading=false;}
  }

  function currentStudents(){
    const cid=document.getElementById('scoreClass')?.value||'';
    return [...(window._allStudents||[])].filter(s=>s.isActive!==false&&(!cid||String(s.classId||'')===String(cid))).sort((a,b)=>String(a.className||'').localeCompare(String(b.className||''),'ko')||String(a.name||'').localeCompare(String(b.name||''),'ko'));
  }
  function renderScores(){
    populateScoreClasses();const body=document.getElementById('scoreTableBody');if(!body)return;const month=document.getElementById('scoreMonth')?.value||monthNow();const recMap=new Map(scoreRecords.filter(r=>r.month===month).map(r=>[String(r.studentId||''),r]));const list=currentStudents();
    if(!list.length){body.innerHTML='<tr><td colspan="6" style="text-align:center;padding:24px;color:#8A96B2">해당 반에 등록된 학생이 없습니다.</td></tr>';return;}
    body.innerHTML=list.map(s=>{const r=recMap.get(String(s.id));const cls=(window._allClasses||[]).find(c=>String(c.id)===String(s.classId||''));const lv=s.levelCode||cls?.levelCode||'';return `<tr data-student-id="${esc(s.id)}" data-record-id="${esc(r?.id||'')}"><td><strong>${esc(s.name||'-')}</strong></td><td>${esc(s.grade||'-')}</td><td>${esc(s.schoolName||'-')}</td><td>${esc(s.className||cls?.className||'-')}</td><td><span class="yms-level-chip">${esc(levelLabel(lv))}</span></td><td><input class="yms-score-input" type="number" min="0" max="100" step="1" inputmode="numeric" value="${r?.score??''}" placeholder="-"></td></tr>`;}).join('');
  }

  async function saveScores(){
    const month=document.getElementById('scoreMonth')?.value||monthNow();const rows=[...document.querySelectorAll('#scoreTableBody tr[data-student-id]')];const btn=document.getElementById('scoreSaveBtn');if(btn){btn.disabled=true;btn.textContent='저장 중...';}let ok=0,fail=0;
    for(const row of rows){const input=row.querySelector('.yms-score-input');if(!input||input.value==='')continue;const score=Number(input.value);if(!Number.isFinite(score)||score<0||score>100){input.focus();window.YMS_UI?.toast?.('❌ 점수는 0~100 사이로 입력해주세요');fail++;break;}const sid=row.dataset.studentId;const s=(window._allStudents||[]).find(x=>String(x.id)===String(sid));if(!s)continue;const cls=(window._allClasses||[]).find(c=>String(c.id)===String(s.classId||''));const lv=s.levelCode||cls?.levelCode||'';const payload={month,studentId:s.id,studentName:s.name||'',grade:s.grade||'',schoolName:s.schoolName||'',classId:s.classId||'',className:s.className||cls?.className||'',levelCode:lv,levelName:LEVEL_MAP[lv]||'',score,updatedAt:new Date().toISOString()};try{const rid=row.dataset.recordId;const r=await _tFetch(rid?`tables/monthlyScores/${rid}`:'tables/monthlyScores',{method:rid?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error('HTTP '+r.status);if(!rid){const created=await r.json().catch(()=>({}));row.dataset.recordId=created.id||'';}ok++;}catch(e){console.warn('[YMS] monthly score save',e);fail++;}}
    if(btn){btn.disabled=false;btn.textContent='점수 저장';}window.YMS_UI?.toast?.(fail?`⚠️ ${ok}명 저장 · ${fail}명 실패`:`✅ ${ok}명 월평 점수 저장 완료`);await loadScores();
  }

  function makeExcel(rows,fileName){
    const headers=['월','학생명','학년','학교','반','YMS 레벨','레벨명','점수'];
    const html=`<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.month||'')}</td><td>${esc(r.studentName||'')}</td><td>${esc(r.grade||'')}</td><td>${esc(r.schoolName||'')}</td><td>${esc(r.className||'')}</td><td>${esc(r.levelCode||'')}</td><td>${esc(r.levelName||LEVEL_MAP[r.levelCode]||'')}</td><td>${esc(r.score??'')}</td></tr>`).join('')}</tbody></table></body></html>`;
    const blob=new Blob(['\ufeff',html],{type:'application/vnd.ms-excel;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fileName;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }
  async function exportScores(all){
    try{const month=document.getElementById('scoreMonth')?.value||monthNow();const rows=all?await queryScores(''):await queryScores(month);if(!rows.length){window.YMS_UI?.toast?.('저장된 월평 점수가 없습니다');return;}rows.sort((a,b)=>String(a.month||'').localeCompare(String(b.month||''))||String(a.className||'').localeCompare(String(b.className||''),'ko')||String(a.studentName||'').localeCompare(String(b.studentName||''),'ko'));makeExcel(rows,all?`YMS_월평점수_전체_${new Date().toISOString().slice(0,10)}.xls`:`YMS_월평점수_${month}.xls`);window.YMS_UI?.toast?.('✅ Excel 파일을 저장했습니다');}catch(e){console.error('[YMS] score export',e);window.YMS_UI?.toast?.('❌ Excel 저장 실패');}
  }

  function patchStudentTableLevel(){
    const table=document.querySelector('#section-students .admin-table');if(!table)return;const head=table.tHead?.rows?.[0];if(head&&!head.querySelector('[data-yms-level-head]')){const th=document.createElement('th');th.dataset.ymsLevelHead='1';th.textContent='YMS 레벨';head.insertBefore(th,head.cells[4]||null);}
    const old=window.renderStudentTable;if(typeof old==='function'&&!old.__ymsLevelPatched){const wrapped=function(filter=''){old(filter);const rows=[...document.querySelectorAll('#studentTableBody tr')];const list=(window._allStudents?.length?window._allStudents:(window._allUsers||[]).filter(u=>u.role==='STUDENT')).filter(s=>!filter||(s.name||'').includes(filter)).slice().sort((a,b)=>{const cls=(a.className||'').localeCompare(b.className||'','ko');if(cls)return cls;const tch=(a.teacherName||'').localeCompare(b.teacherName||'','ko');if(tch)return tch;return(a.name||'').localeCompare(b.name||'','ko');});if(!list.length)return;rows.forEach((row,i)=>{const s=list[i];if(!s||row.cells.length<7)return;const cls=(window._allClasses||[]).find(c=>String(c.id)===String(s.classId||''));const td=document.createElement('td');td.innerHTML=`<span class="yms-level-chip">${esc(levelLabel(s.levelCode||cls?.levelCode||''))}</span>`;row.insertBefore(td,row.cells[4]||null);});};wrapped.__ymsLevelPatched=true;window.renderStudentTable=wrapped;window.renderStudentTable(document.getElementById('studentSearch')?.value||'');}
  }

  function start(){ensureStyle();ensureClassLevelField();ensureScorePanel();patchClassFunctions();patchStudentTableLevel();setTimeout(()=>{populateScoreClasses();patchClassFunctions();patchStudentTableLevel();},700);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
