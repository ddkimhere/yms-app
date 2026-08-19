/* One-time ADMIN cleanup: 양지수 (2026-08-19) */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;
  const me=window.YMS_Auth?.getUser?.();
  if(!me || String(me.role||'').toUpperCase()!=='ADMIN' || !window._tFetch) return;

  const MARKER_ID='cleanup-yang-jisu-20260819-v1';
  const TARGET_NAME='양지수';
  const norm=v=>String(v||'').trim().replace(/\s+/g,'');
  const upper=v=>String(v||'').trim().toUpperCase();

  async function list(col,limit=1000){
    try{
      const r=await _tFetch(`tables/${col}?limit=${limit}`,{cache:'no-store'});
      return r.ok?((await r.json()).data||[]):[];
    }catch{return [];}
  }
  async function del(col,id){
    if(!id) return false;
    const r=await _tFetch(`tables/${col}/${encodeURIComponent(id)}`,{method:'DELETE'});
    return !!r.ok;
  }
  async function patch(col,id,payload){
    if(!id) return false;
    const r=await _tFetch(`tables/${col}/${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    return !!r.ok;
  }
  function childIdsOf(u){
    return Array.isArray(u?.childIds)?u.childIds.map(String):String(u?.childIds||'').split(',').map(v=>v.trim()).filter(Boolean);
  }

  async function alreadyDone(){
    try{const r=await _tFetch(`tables/maintenance/${MARKER_ID}`,{cache:'no-store'});return r.ok;}catch{return false;}
  }
  async function markDone(summary){
    try{
      await _tFetch(`tables/maintenance/${MARKER_ID}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({done:true,targetName:TARGET_NAME,completedAt:new Date().toISOString(),completedBy:me.name||'ADMIN',summary})});
    }catch{}
  }

  async function run(){
    if(await alreadyDone()) return;

    const [students,users]=await Promise.all([list('students'),list('users')]);
    const matches=students.filter(s=>norm(s.name)===norm(TARGET_NAME));
    if(matches.length===0) return;
    if(matches.length!==1){
      console.warn(`[YMS CLEANUP] ${TARGET_NAME} 동명이인 ${matches.length}명 — 자동 삭제 중단`);
      window.YMS_UI?.toast?.(`⚠️ ${TARGET_NAME} 동명이인이 ${matches.length}명이라 삭제를 중단했습니다.`);
      return;
    }

    const student=matches[0];
    const sid=String(student.id||'');
    const linkedUid=String(student.userId||'');
    if(!sid) return;

    const linkedUsers=users.filter(u=>{
      const uid=String(u.id||u.uid||'');
      const role=upper(u.role);
      return (linkedUid&&uid===linkedUid)
        || String(u.studentId||'')===sid
        || (role==='STUDENT'&&norm(u.name)===norm(TARGET_NAME));
    });
    const linkedUserIds=new Set(linkedUsers.map(u=>String(u.id||u.uid||'')).filter(Boolean));

    const summary={studentId:sid,attendance:0,counseling:0,payments:0,bookFees:0,personalHomework:0,homeworkStatus:0,otherStudentRecords:0,parentLinks:0,userProfiles:0,studentProfiles:0};

    // Parent accounts stay; only remove this child link.
    for(const u of users){
      if(upper(u.role)!=='PARENT') continue;
      const ids=childIdsOf(u);
      if(!ids.includes(sid)) continue;
      const next=ids.filter(id=>id!==sid);
      if(await patch('users',u.id,{childIds:Array.isArray(u.childIds)?next:next.join(',')})) summary.parentLinks++;
    }

    // Known student-owned collections.
    for(const col of ['attendance','counseling','payments','bookFees']){
      const rows=await list(col);
      for(const row of rows){
        const byId=String(row.studentId||'')===sid;
        const byName=!row.studentId && norm(row.studentName)===norm(TARGET_NAME);
        if(!(byId||byName)) continue;
        if(await del(col,row.id)){
          if(col==='attendance')summary.attendance++;
          else if(col==='counseling')summary.counseling++;
          else if(col==='payments')summary.payments++;
          else if(col==='bookFees')summary.bookFees++;
        }
      }
    }

    // Homework: delete only personal homework for this student; preserve class homework and remove only this student's status.
    const homework=await list('homework');
    for(const hw of homework){
      const personal=upper(hw.targetType)==='STUDENT'||!!hw.targetStudentId||!!hw.targetStudentName;
      const mine=String(hw.targetStudentId||'')===sid || (!hw.targetStudentId&&norm(hw.targetStudentName)===norm(TARGET_NAME));
      if(personal&&mine){
        if(await del('homework',hw.id)) summary.personalHomework++;
        continue;
      }
      const map=hw.incompleteByStudent;
      if(map&&typeof map==='object'&&!Array.isArray(map)&&Object.prototype.hasOwnProperty.call(map,sid)){
        const next={...map}; delete next[sid];
        if(await patch('homework',hw.id,{incompleteByStudent:next})) summary.homeworkStatus++;
      }
    }

    // Extra student-record collections, if present in this project.
    for(const col of ['homeworkSubmissions','homeworkStatus','testResults','reports','progress']){
      const rows=await list(col);
      for(const row of rows){
        if(String(row.studentId||'')===sid || (!row.studentId&&norm(row.studentName)===norm(TARGET_NAME))){
          if(await del(col,row.id)) summary.otherStudentRecords++;
        }
      }
    }

    // Delete Firestore student profile and login profile last.
    if(await del('students',sid)) summary.studentProfiles++;
    for(const uid of linkedUserIds){if(await del('users',uid)) summary.userProfiles++;}

    await markDone(summary);
    console.log('[YMS CLEANUP] 양지수 데이터 정리 완료',summary);
    window.YMS_UI?.toast?.('✅ 양지수 학생 데이터 정리가 완료되었습니다.');
    setTimeout(()=>{try{window.YMS_syncStudentUsers?.();}catch{}},300);
  }

  window.addEventListener('load',()=>setTimeout(()=>run().catch(e=>console.error('[YMS CLEANUP] 실패',e)),1400),{once:true});
})();
