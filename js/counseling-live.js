/* YMS counseling — standalone live Firestore flow */
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
  const categoryIcons={학습:'📖',진도:'📈',수업시간:'🕐',숙제:'📝',교재:'📚',기타:'💬'};
  let selectedCategory='학습';
  let filter='ALL';
  let all=[];
  let myStudents=[];
  let teacherClassIds=[];
  let currentId='';

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fromNow=v=>{try{return window.YMS_Date?.fromNow?.(v)||new Date(v).toLocaleDateString('ko-KR')}catch{return ''}};
  function empty(msg){return window.YMS_UI?.renderEmpty?.(msg)||`<div class="empty-state"><div class="empty-msg">${esc(msg)}</div></div>`;}
  function decodeVal(v){if(!v||typeof v!=='object')return null;if('stringValue'in v)return v.stringValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return Number(v.doubleValue);if('booleanValue'in v)return v.booleanValue;if('timestampValue'in v)return v.timestampValue;if('nullValue'in v)return null;return null;}
  function decodeDoc(doc){const out={id:String(doc?.name||'').split('/').pop()};Object.entries(doc?.fields||{}).forEach(([k,v])=>out[k]=decodeVal(v));return out;}

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

  async function getStudent(id){if(!id)return null;const r=await _tFetch('tables/students/'+encodeURIComponent(id),{cache:'no-store'});return r.ok?await r.json():null;}

  async function loadScope(){
    myStudents=[];teacherClassIds=[];
    if(isStudent){
      const sid=me.studentId||'';
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

  function fillPicker(){
    const wrap=document.getElementById('studentSelectWrap'),sel=document.getElementById('csStudentId');if(!sel)return;
    if(isParent){wrap?.classList.remove('hidden');sel.innerHTML=myStudents.length?myStudents.map(s=>`<option value="${esc(s.id)}">${esc(s.name||'학생')}${s.grade?' ('+esc(s.grade)+')':''}</option>`).join(''):'<option value="">연결된 자녀 없음</option>';}else wrap?.classList.add('hidden');
  }

  async function fetchLive(){
    let list=[];
    if(isAdmin){const r=await _tFetch('tables/counseling?limit=500',{cache:'no-store'});if(r.ok)list=(await r.json()).data||[];}
    else if(isTeacher){const chunks=await Promise.all(teacherClassIds.map(id=>runQuery('classId',id).catch(()=>[])));list=chunks.flat();}
    else if(isStudent){const sid=myStudents[0]?.id||me.studentId||'';if(sid)list=await runQuery('studentId',sid);}
    else if(isParent){const chunks=await Promise.all(myStudents.map(s=>runQuery('studentId',s.id).catch(()=>[])));list=chunks.flat();}
    const seen=new Set();
    return list.filter(x=>x?.id&&!seen.has(x.id)&&seen.add(x.id)).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  }

  function render(){
    const wrap=document.getElementById('csList');if(!wrap)return;
    const list=filter==='ALL'?all:all.filter(c=>c.status===filter);
    const pending=all.filter(c=>c.status==='PENDING').length,replied=all.filter(c=>c.status==='REPLIED').length;
    if(document.getElementById('pendingCount'))document.getElementById('pendingCount').textContent=pending;
    if(document.getElementById('repliedCount'))document.getElementById('repliedCount').textContent=replied;
    if(document.getElementById('totalCount'))document.getElementById('totalCount').textContent=all.length;
    if(!list.length){wrap.innerHTML=empty(filter==='PENDING'?'답변 대기 상담이 없습니다':'상담 내역이 없습니다');return;}
    wrap.innerHTML=list.map(cs=>{
      const status=cs.status==='REPLIED';
      return `<div class="cs-card${!status&&isTeacher?' unread':''}" data-csid="${esc(cs.id)}">
        <div class="cs-card-header"><div class="cs-card-title">${esc(cs.title||'제목 없음')}</div><span class="chip ${status?'cs-status-replied':'cs-status-pending'}" style="font-size:10px;padding:3px 8px;white-space:nowrap;">${status?'✅ 답변 완료':'⏳ 답변 대기'}</span></div>
        <div class="cs-card-preview">${esc(cs.content||'')}</div>
        <div class="cs-card-meta"><span class="chip chip-mustard" style="font-size:10px;">${categoryIcons[cs.category]||'💬'} ${esc(cs.category||'기타')}</span><span style="font-size:11px;color:var(--gray-mid);">학생: ${esc(cs.studentName||'')}</span><span style="font-size:11px;color:var(--gray-mid);">${esc(fromNow(cs.createdAt))}</span></div>
      </div>`;
    }).join('');
    wrap.querySelectorAll('[data-csid]').forEach(el=>el.addEventListener('click',()=>openDetail(el.dataset.csid)));
  }

  function openDetail(id){
    const cs=all.find(x=>x.id===id);if(!cs)return;currentId=id;
    const status=cs.status==='REPLIED';
    const content=document.getElementById('csDetailContent');
    if(content)content.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;"><span class="chip chip-mustard">${categoryIcons[cs.category]||'💬'} ${esc(cs.category||'기타')}</span><span class="chip ${status?'cs-status-replied':'cs-status-pending'}">${status?'✅ 답변 완료':'⏳ 답변 대기'}</span></div><h2 style="font-size:19px;font-weight:800;line-height:1.35;">${esc(cs.title||'')}</h2><div style="font-size:12px;color:var(--gray-mid);margin:8px 0 14px;">학생: <strong>${esc(cs.studentName||'')}</strong>${cs.className?' · '+esc(cs.className):''}${cs.preferredDate?' · 희망일 '+esc(cs.preferredDate):''}</div><div style="background:var(--cream);border-radius:var(--radius-md);padding:14px 16px;font-size:14px;line-height:1.7;">${esc(cs.content||'')}</div>${status&&cs.reply?`<div class="reply-bubble" style="margin-top:14px;"><div class="reply-bubble-label">💬 ${esc(cs.teacherName||'선생님')} 답변</div><div class="reply-bubble-text">${esc(cs.reply)}</div></div>`:'<div style="margin-top:14px;padding:12px;background:var(--cream);border-radius:var(--radius-md);text-align:center;color:var(--gray-mid);font-size:13px;">아직 답변이 등록되지 않았습니다</div>'}`;
    const reply=document.getElementById('replyArea');if(reply)reply.classList.toggle('hidden',!(isTeacher&&!status));
    document.getElementById('csDetailModal')?.classList.remove('hidden');
  }

  window.setFilter=function(el,f){document.querySelectorAll('.filter-chip').forEach(c=>{c.classList.remove('active');c.style.background='var(--warm-white)';c.style.color='var(--gray-mid)';c.style.borderColor='var(--beige-dark)';});if(el){el.classList.add('active');el.style.background='var(--orange)';el.style.color='#fff';el.style.borderColor='var(--orange)';}filter=f;render();};
  window.selectCat=function(el){document.querySelectorAll('.category-btn').forEach(b=>b.classList.remove('active'));el?.classList.add('active');selectedCategory=el?.dataset.cat||'학습';};

  window.loadList=async function(){
    const wrap=document.getElementById('csList');if(wrap)wrap.innerHTML=empty('상담 내역을 불러오는 중...');
    try{await loadScope();fillPicker();all=await fetchLive();render();}
    catch(e){console.error('[YMS] counseling load',e);if(wrap)wrap.innerHTML=empty('상담 내역을 불러오지 못했습니다');}
  };

  window.showWriteModal=async function(){await loadScope();fillPicker();if(isStudent&&!myStudents.length){YMS_UI?.toast?.('학생 정보 연결을 확인해주세요');return;}if(isParent&&!myStudents.length){YMS_UI?.toast?.('연결된 자녀가 없습니다');return;}const d=document.getElementById('csPrefDate');if(d&&!d.value)d.value=new Date().toISOString().slice(0,10);document.getElementById('writeModal')?.classList.remove('hidden');};

  window.submitCounseling=async function(e){
    e.preventDefault();const btn=document.getElementById('writeSubmitBtn');if(btn){btn.disabled=true;btn.textContent='신청 중...';}
    try{
      await loadScope();fillPicker();let stu=null;if(isStudent)stu=myStudents[0]||null;else if(isParent){const sid=document.getElementById('csStudentId')?.value||'';stu=myStudents.find(s=>String(s.id)===String(sid))||null;}if(!stu)throw new Error('학생 정보를 찾을 수 없습니다.');
      const title=document.getElementById('csTitle')?.value.trim()||'',content=document.getElementById('csContent')?.value.trim()||'';if(!title||!content)throw new Error('제목과 내용을 입력해주세요.');
      const payload={studentId:stu.id,studentName:stu.name||me.name||'',classId:stu.classId||'',className:stu.className||'',teacherName:stu.teacherName||'',requesterId:uid,requesterRole:isStudent?'STUDENT':'PARENT',requesterName:me.name||'',parentName:isParent?(me.name||''):'',category:selectedCategory,title,content,preferredDate:document.getElementById('csPrefDate')?.value||'',status:'PENDING',reply:'',repliedAt:'',createdAt:new Date().toISOString(),isRead:false};
      const r=await _tFetch('tables/counseling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j?.error?'상담 저장 권한을 확인해주세요.':'상담 신청 저장에 실패했습니다.');}
      document.getElementById('writeModal')?.classList.add('hidden');document.getElementById('writeForm')?.reset();selectedCategory='학습';document.querySelectorAll('.category-btn').forEach((b,i)=>b.classList.toggle('active',i===0));YMS_UI?.toast?.('상담이 신청되었습니다 💬');await window.loadList();
    }catch(err){console.error('[YMS] counseling submit',err);YMS_UI?.toast?.('❌ '+(err?.message||'상담 신청 실패'));}
    finally{if(btn){btn.disabled=false;btn.textContent='신청하기';}}
  };

  window.submitReply=async function(){const text=document.getElementById('replyText')?.value.trim()||'';if(!text){YMS_UI?.toast?.('답변 내용을 입력해주세요');return;}if(!currentId){YMS_UI?.toast?.('상담 내역을 찾을 수 없습니다');return;}try{const r=await _tFetch('tables/counseling/'+encodeURIComponent(currentId),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'REPLIED',reply:text,repliedAt:new Date().toISOString(),teacherId:uid,teacherName:me.name||'',isRead:true})});if(!r.ok)throw new Error('답변 저장에 실패했습니다.');document.getElementById('csDetailModal')?.classList.add('hidden');YMS_UI?.toast?.('답변이 등록되었습니다 ✅');await window.loadList();}catch(err){YMS_UI?.toast?.('❌ '+(err?.message||'답변 저장 실패'));}};

  function boot(){
    const stats=document.getElementById('teacherStats');if(stats){stats.classList.toggle('hidden',!(isTeacher||isAdmin));stats.style.display=(isTeacher||isAdmin)?'flex':'none';}
    document.getElementById('writeBtn')?.classList.toggle('hidden',isTeacher||isAdmin);
    try{window.ymsRenderTabBar?.('counseling.html')}catch{}
    window.loadList();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
