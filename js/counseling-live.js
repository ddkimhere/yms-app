/* YMS counseling: live Firestore data + role scoped access */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/counseling.html')) return;

  const me=window.YMS_Auth?.getUser?.();
  if(!me||!window._tFetch) return;
  const role=String(me.role||'').toUpperCase();
  const roles=Array.isArray(me.roles)?me.roles.map(r=>String(r).toUpperCase()):[];
  const isAdmin=role==='ADMIN';
  const isTeacher=role==='TEACHER'||roles.includes('TEACHER');
  const isStudent=role==='STUDENT';
  const isParent=role==='PARENT';
  const uid=String(me.id||me.uid||'');
  let myStudents=[];
  let teacherClassIds=[];

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const decodeVal=v=>{
    if(!v||typeof v!=='object')return null;
    if('stringValue'in v)return v.stringValue;
    if('integerValue'in v)return Number(v.integerValue);
    if('doubleValue'in v)return Number(v.doubleValue);
    if('booleanValue'in v)return v.booleanValue;
    if('timestampValue'in v)return v.timestampValue;
    if('nullValue'in v)return null;
    return null;
  };
  const decodeDoc=doc=>{
    const out={id:String(doc?.name||'').split('/').pop()};
    Object.entries(doc?.fields||{}).forEach(([k,v])=>out[k]=decodeVal(v));
    return out;
  };

  async function runQuery(field,value){
    const token=window.YMS_Auth?.getToken?.();
    const cfg=window.YMS_FIREBASE_CONFIG||{projectId:'yms-app-bb735'};
    if(!token) throw new Error('로그인이 필요합니다.');
    const url=`https://firestore.googleapis.com/v1/projects/${cfg.projectId||'yms-app-bb735'}/databases/(default)/documents:runQuery`;
    const body={structuredQuery:{from:[{collectionId:'counseling'}],where:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:{stringValue:String(value)}}},limit:300}};
    const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok) throw new Error('상담 내역을 불러오지 못했습니다.');
    return (await r.json()).filter(x=>x.document).map(x=>decodeDoc(x.document));
  }

  async function getStudent(id){
    if(!id)return null;
    const r=await _tFetch('tables/students/'+encodeURIComponent(id),{cache:'no-store'});
    return r.ok?await r.json():null;
  }

  async function loadScope(){
    myStudents=[];teacherClassIds=[];
    if(isStudent){
      let sid=me.studentId||'';
      if(sid){const s=await getStudent(sid);if(s)myStudents=[s];}
    }else if(isParent){
      const ids=Array.isArray(me.childIds)?me.childIds:String(me.childIds||'').split(',').map(x=>x.trim()).filter(Boolean);
      for(const id of ids){const s=await getStudent(id);if(s)myStudents.push(s);}
    }else if(isTeacher&&!isAdmin){
      const r=await _tFetch('tables/classes?limit=300',{cache:'no-store'});
      if(r.ok){
        const list=(await r.json()).data||[];
        const assigned=Array.isArray(me.teacherClasses)?me.teacherClasses:String(me.teacherClasses||'').split(',').map(x=>x.trim()).filter(Boolean);
        teacherClassIds=list.filter(c=>String(c.teacherId||'')===uid||String(c.teacherName||'')===String(me.name||'')||assigned.includes(String(c.id||''))||assigned.includes(String(c.className||''))).map(c=>String(c.id||'')).filter(Boolean);
      }
    }
  }

  function fillStudentPicker(){
    const wrap=document.getElementById('studentSelectWrap'),sel=document.getElementById('csStudentId');
    if(!sel)return;
    if(isParent){
      wrap?.classList.remove('hidden');
      sel.innerHTML=myStudents.length?myStudents.map(s=>`<option value="${esc(s.id)}">${esc(s.name||'학생')}${s.grade?' ('+esc(s.grade)+')':''}</option>`).join(''):'<option value="">연결된 자녀 없음</option>';
    }else{
      wrap?.classList.add('hidden');
    }
  }

  async function fetchLive(){
    let list=[];
    if(isAdmin){
      const r=await _tFetch('tables/counseling?limit=500',{cache:'no-store'});
      if(r.ok)list=(await r.json()).data||[];
    }else if(isTeacher){
      const chunks=await Promise.all(teacherClassIds.map(id=>runQuery('classId',id).catch(()=>[])));
      list=chunks.flat();
    }else if(isStudent){
      const sid=myStudents[0]?.id||me.studentId||'';
      if(sid)list=await runQuery('studentId',sid);
    }else if(isParent){
      const chunks=await Promise.all(myStudents.map(s=>runQuery('studentId',s.id).catch(()=>[])));
      list=chunks.flat();
    }
    const seen=new Set();
    return list.filter(x=>x&&x.id&&!seen.has(x.id)&&seen.add(x.id)).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  }

  window.loadList=async function(){
    const wrap=document.getElementById('csList');
    if(wrap)wrap.innerHTML='<div class="empty-state"><div class="empty-msg">상담 내역을 불러오는 중...</div></div>';
    try{
      await loadScope();fillStudentPicker();
      window.allCs=await fetchLive();
      try{allCs=window.allCs}catch{}
      const list=window.allCs||[];
      const pending=list.filter(c=>c.status==='PENDING').length,replied=list.filter(c=>c.status==='REPLIED').length;
      const p=document.getElementById('pendingCount'),r=document.getElementById('repliedCount'),t=document.getElementById('totalCount');
      if(p)p.textContent=pending;if(r)r.textContent=replied;if(t)t.textContent=list.length;
      if(typeof window.renderList==='function')window.renderList(list);
    }catch(e){
      console.error('[YMS] counseling load',e);
      if(wrap)wrap.innerHTML=window.YMS_UI?.renderEmpty?.('상담 내역을 불러오지 못했습니다')||'<div>상담 내역을 불러오지 못했습니다.</div>';
    }
  };

  window.showWriteModal=async function(){
    await loadScope();fillStudentPicker();
    if(isStudent&&!myStudents.length){YMS_UI?.toast?.('학생 정보 연결을 확인해주세요');return;}
    if(isParent&&!myStudents.length){YMS_UI?.toast?.('연결된 자녀가 없습니다');return;}
    const date=document.getElementById('csPrefDate');if(date&&!date.value)date.value=new Date().toISOString().slice(0,10);
    document.getElementById('writeModal')?.classList.remove('hidden');
  };

  window.submitCounseling=async function(e){
    e.preventDefault();
    const btn=document.getElementById('writeSubmitBtn');if(btn){btn.disabled=true;btn.textContent='신청 중...';}
    try{
      await loadScope();fillStudentPicker();
      let stu=null;
      if(isStudent)stu=myStudents[0]||null;
      else if(isParent){const sid=document.getElementById('csStudentId')?.value||'';stu=myStudents.find(s=>String(s.id)===String(sid))||null;}
      if(!stu)throw new Error('학생 정보를 찾을 수 없습니다.');
      const title=document.getElementById('csTitle')?.value.trim()||'',content=document.getElementById('csContent')?.value.trim()||'';
      if(!title||!content)throw new Error('제목과 내용을 입력해주세요.');
      const payload={
        studentId:stu.id,
        studentName:stu.name||me.name||'',
        classId:stu.classId||'',
        className:stu.className||'',
        teacherName:stu.teacherName||'',
        requesterId:uid,
        requesterRole:isStudent?'STUDENT':'PARENT',
        requesterName:me.name||'',
        parentName:isParent?(me.name||''):'',
        category:(typeof selectedCategory!=='undefined'?selectedCategory:'학습'),
        title,content,
        preferredDate:document.getElementById('csPrefDate')?.value||'',
        status:'PENDING',reply:'',repliedAt:'',createdAt:new Date().toISOString(),isRead:false
      };
      const r=await _tFetch('tables/counseling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok)throw new Error('상담 신청 저장에 실패했습니다.');
      document.getElementById('writeModal')?.classList.add('hidden');
      document.getElementById('writeForm')?.reset();
      if(typeof selectedCategory!=='undefined')selectedCategory='학습';
      document.querySelectorAll('.category-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
      YMS_UI?.toast?.('상담이 신청되었습니다 💬');
      await window.loadList();
    }catch(err){YMS_UI?.toast?.('❌ '+(err?.message||'상담 신청 실패'));}
    finally{if(btn){btn.disabled=false;btn.textContent='신청하기';}}
  };

  window.submitReply=async function(){
    const text=document.getElementById('replyText')?.value.trim()||'';
    if(!text){YMS_UI?.toast?.('답변 내용을 입력해주세요');return;}
    const id=typeof currentCsId!=='undefined'?currentCsId:window.currentCsId;
    if(!id){YMS_UI?.toast?.('상담 내역을 찾을 수 없습니다');return;}
    try{
      const payload={status:'REPLIED',reply:text,repliedAt:new Date().toISOString(),teacherId:uid,teacherName:me.name||'',isRead:true};
      const r=await _tFetch('tables/counseling/'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok)throw new Error('답변 저장에 실패했습니다.');
      document.getElementById('csDetailModal')?.classList.add('hidden');
      YMS_UI?.toast?.('답변이 등록되었습니다 ✅');
      await window.loadList();
    }catch(err){YMS_UI?.toast?.('❌ '+(err?.message||'답변 저장 실패'));}
  };

  function boot(){
    if(isTeacher||isAdmin){document.getElementById('writeBtn')?.classList.add('hidden');}
    else document.getElementById('writeBtn')?.classList.remove('hidden');
    setTimeout(()=>window.loadList(),0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
