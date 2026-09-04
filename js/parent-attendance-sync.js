/* YMS parent attendance linkage: scoped child attendance + cached history */
(function(){
  'use strict';
  if((location.pathname.split('/').pop()||'')!=='attendance.html')return;

  const auth=window.YMS_Auth;
  const me=auth?.getUser?.();
  if(String(me?.role||'').toUpperCase()!=='PARENT')return;
  const str=v=>String(v||'').trim();
  const ATT_TTL=2*60*1000;
  const attCache=new Map();
  let lastSyncAt=0;

  function decodeVal(v){
    if(!v||typeof v!=='object')return null;
    if('stringValue'in v)return v.stringValue;
    if('integerValue'in v)return Number(v.integerValue);
    if('doubleValue'in v)return Number(v.doubleValue);
    if('booleanValue'in v)return v.booleanValue;
    if('timestampValue'in v)return v.timestampValue;
    if('nullValue'in v)return null;
    if('arrayValue'in v)return (v.arrayValue.values||[]).map(decodeVal);
    return null;
  }
  function decodeDoc(doc){
    const out={id:String(doc?.name||'').split('/').pop()};
    Object.entries(doc?.fields||{}).forEach(([k,v])=>out[k]=decodeVal(v));
    return out;
  }

  async function read(path){
    try{
      const r=await _tFetch(path);
      if(!r.ok)return null;
      return await r.json();
    }catch{return null;}
  }

  async function freshParent(){
    const uid=str(me?.id||me?.uid);
    if(!uid)return me;
    const p=await read('tables/users/'+encodeURIComponent(uid));
    return p&&!Array.isArray(p)?{...me,...p}:me;
  }

  async function resolveChildren(){
    const p=await freshParent();
    const ids=Array.isArray(p?.childIds)?p.childIds.map(str).filter(Boolean):String(p?.childIds||'').split(',').map(str).filter(Boolean);
    const out=[];
    for(const id of ids){
      const s=await read('tables/students/'+encodeURIComponent(id));
      if(s&&!Array.isArray(s))out.push(s);
    }
    return out;
  }

  async function queryAttendance(studentId){
    const sid=str(studentId);if(!sid)return [];
    const cached=attCache.get(sid);
    if(cached&&Date.now()-cached.at<ATT_TTL)return cached.data;
    const token=auth?.getToken?.();
    if(!token)throw new Error('로그인이 필요합니다.');
    const url='https://firestore.googleapis.com/v1/projects/yms-app-bb735/databases/(default)/documents:runQuery';
    const body={structuredQuery:{
      from:[{collectionId:'attendance'}],
      where:{fieldFilter:{field:{fieldPath:'studentId'},op:'EQUAL',value:{stringValue:sid}}},
      limit:500
    }};
    const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error(`출결 조회 실패 (${r.status})`);
    const rows=(await r.json()).filter(x=>x.document).map(x=>decodeDoc(x.document));
    attCache.set(sid,{at:Date.now(),data:rows});
    return rows;
  }

  function renderSelector(children){
    const wrap=document.getElementById('attStudentSelector');
    if(!wrap)return;
    myChildren=children;
    wrap.innerHTML='';
    if(!children.length){
      selectedStudentId=null;
      wrap.innerHTML='<div style="font-size:13px;color:var(--gray-mid);padding:4px 0;">연결된 자녀 계정이 없습니다.<br>관리자에게 문의해 주세요.</div>';
      document.getElementById('attRecordList').innerHTML=window.YMS_UI?.renderEmpty?.('자녀 계정이 없습니다')||'자녀 계정이 없습니다';
      return;
    }
    children.forEach((s,i)=>{
      const chip=document.createElement('div');
      chip.className='student-chip'+(i===0?' active':'');
      chip.innerHTML=`<div class="chip-avatar">${(s.name||'?')[0]}</div>${s.name||''}`;
      chip.addEventListener('click',()=>{
        wrap.querySelectorAll('.student-chip').forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        selectedStudentId=s.id;
        const label=document.getElementById('currentStudentName');if(label)label.textContent=s.name||'';
        window.loadParentAttendance?.();
      });
      wrap.appendChild(chip);
    });
    selectedStudentId=children[0].id;
    const label=document.getElementById('currentStudentName');if(label)label.textContent=children[0].name||'';
  }

  function installDurableLoader(){
    window.loadParentAttendance=async function(){
      if(!selectedStudentId)return;
      const list=document.getElementById('attRecordList');
      if(list)list.innerHTML='<div class="loading-row">불러오는 중...</div>';
      const yyyyMM=`${currentYear}-${String(currentMonth+1).padStart(2,'0')}`;
      let records=[];
      try{
        const all=await queryAttendance(selectedStudentId);
        records=all.filter(x=>String(x.date||'').startsWith(yyyyMM));
      }catch(e){console.warn('[YMS] 부모 출결 조회 실패',e);}
      if(typeof renderParentRecords==='function')renderParentRecords(records);
    };
  }

  async function sync(){
    const now=Date.now();
    if(now-lastSyncAt<1000)return;
    lastSyncAt=now;
    try{
      installDurableLoader();
      const children=await resolveChildren();
      renderSelector(children);
      if(children.length){
        if(typeof renderMonth==='function')renderMonth();
        await window.loadParentAttendance();
      }
    }catch(e){console.warn('[YMS] 부모-자녀 출결 연결 동기화 실패',e);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,80),{once:true});
  else setTimeout(sync,80);
  window.addEventListener('pageshow',()=>setTimeout(sync,80));
})();
