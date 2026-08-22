/* YMS parent attendance linkage: fresh childIds + durable attendance history */
(function(){
  'use strict';
  if((location.pathname.split('/').pop()||'')!=='attendance.html')return;

  const auth=window.YMS_Auth;
  const me=auth?.getUser?.();
  if(String(me?.role||'').toUpperCase()!=='PARENT')return;
  const str=v=>String(v||'').trim();

  async function read(path){
    try{
      const r=await _tFetch(path,{cache:'no-store'});
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
        const r=await _tFetch('tables/attendance?limit=3000',{cache:'no-store'});
        if(r.ok){
          const j=await r.json();
          records=(j.data||[]).filter(x=>String(x.studentId||'')===String(selectedStudentId||'')&&String(x.date||'').startsWith(yyyyMM));
        }
      }catch(e){console.warn('[YMS] 부모 출결 조회 실패',e);}
      if(typeof renderParentRecords==='function')renderParentRecords(records);
    };
  }

  async function sync(){
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
