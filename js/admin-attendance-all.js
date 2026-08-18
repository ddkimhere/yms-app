/* YMS admin attendance: all classes, continuous grade-sorted view */
(function(){
  'use strict';
  if((location.pathname.split('/').pop()||'')!=='attendance.html') return;
  const params=new URLSearchParams(location.search);
  const authUser=window.YMS_Auth?.getUser?.();
  const isAdmin=String(authUser?.role||'').toUpperCase()==='ADMIN';
  const adminMode=params.get('mode')==='admin' || (isAdmin && params.get('mode')!=='teacher');
  if(!isAdmin || !adminMode) return;

  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,'');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let allClasses=[], allStudents=[], allAttendance=[];
  let state=new Map(); // key studentId|classId -> {status, existingId, originalStatus}

  function gradeRank(cls){
    const text=`${cls?.grade||''} ${cls?.className||cls?.name||''}`;
    let m=text.match(/초(?:등학교)?\s*([1-6])/); if(m) return 100+Number(m[1]);
    m=text.match(/중(?:학교)?\s*([1-3])/); if(m) return 200+Number(m[1]);
    m=text.match(/고(?:등학교)?\s*([1-3])/); if(m) return 300+Number(m[1]);
    return 999;
  }
  function sortClasses(list){
    return [...list].sort((a,b)=>gradeRank(a)-gradeRank(b)||String(a.className||a.name||'').localeCompare(String(b.className||b.name||''),'ko'));
  }
  function classStudents(cls){
    const cid=String(cls.id||cls.classId||''), cn=norm(cls.className||cls.name);
    return allStudents.filter(s=>s.isActive!==false && ((cid&&String(s.classId||'')===cid)||(cn&&norm(s.className)===cn)))
      .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko'));
  }
  function keyFor(studentId,classId){return `${studentId}|${classId}`;}
  function selectedDate(){return document.getElementById('attDateInput')?.value || new Date().toISOString().slice(0,10);}

  function ensureStyle(){
    if(document.getElementById('yms-admin-att-all-style')) return;
    const s=document.createElement('style');s.id='yms-admin-att-all-style';s.textContent=`
      #classTabRow{display:none!important}
      #teacherView>.page-content{display:none!important}
      #adminAttendanceAll{padding:0 16px calc(40px + env(safe-area-inset-bottom));}
      .aaa-head{display:flex;align-items:end;justify-content:space-between;gap:10px;margin:4px 2px 12px}
      .aaa-title{font-size:17px;font-weight:900;color:#14245A}.aaa-sub{margin-top:3px;font-size:11px;color:#7A87A8}.aaa-count{font-size:11px;font-weight:800;color:#1E3278;background:#EEF3FB;border-radius:999px;padding:6px 10px;white-space:nowrap}
      .aaa-class{margin:0 0 14px;border:1px solid #E3E8F4;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 3px 12px rgba(30,50,120,.05)}
      .aaa-class-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;background:#F8FAFE;border-bottom:1px solid #E8ECF5}
      .aaa-class-name{font-size:14px;font-weight:900;color:#14245A}.aaa-class-meta{margin-top:3px;font-size:10px;color:#8A96B2}.aaa-class-cnt{font-size:11px;font-weight:800;color:#526080;white-space:nowrap}
      .aaa-empty{padding:18px;text-align:center;color:#9AA5BD;font-size:12px}
      .aaa-row{display:grid;grid-template-columns:38px minmax(90px,1fr) auto;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid #EEF1F7}.aaa-row:last-child{border-bottom:0}
      .aaa-avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#EEF3FB;color:#1E3278;font-size:12px;font-weight:900}
      .aaa-name{font-size:13px;font-weight:800;color:#1A2340}.aaa-school{margin-top:2px;font-size:10px;color:#8A96B2}
      .aaa-actions{display:flex;gap:4px}.aaa-btn{min-height:31px;padding:0 8px;border:1px solid #D7DEEC;border-radius:9px;background:#fff;color:#7A87A8;font-size:10px;font-weight:850}.aaa-btn.present.active{background:#E8F7EF;border-color:#91D1AE;color:#23774F}.aaa-btn.late.active{background:#FFF7E5;border-color:#F0C46B;color:#A86C00}.aaa-btn.absent.active{background:#FFF0F0;border-color:#F0A5A5;color:#C73535}
      .aaa-unset{font-size:9px;color:#A5AEC0;margin-top:3px}.aaa-save{width:100%;min-height:52px;margin-top:4px;border:0;border-radius:14px;background:#1E3278;color:#fff;font-size:14px;font-weight:900}.aaa-save:disabled{opacity:.6}
      @media(max-width:520px){.aaa-row{grid-template-columns:34px 1fr;padding:10px 12px}.aaa-actions{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr)}.aaa-btn{min-height:34px}.aaa-unset{grid-column:1/-1;margin-left:44px}}
    `;document.head.appendChild(s);
  }

  function ensureHost(){
    const tv=document.getElementById('teacherView');if(!tv)return null;
    let host=document.getElementById('adminAttendanceAll');
    if(!host){host=document.createElement('div');host.id='adminAttendanceAll';tv.appendChild(host);}
    return host;
  }

  async function fetchAll(path){try{const r=await _tFetch(path,{cache:'no-store'});if(!r.ok)return [];const j=await r.json();return j.data||[];}catch(e){console.warn('[YMS] admin attendance fetch',e);return [];}}

  function rebuildState(){
    state=new Map();
    const date=selectedDate();
    allClasses.forEach(c=>{
      const cid=String(c.id||c.classId||'');
      classStudents(c).forEach(st=>{
        const rec=allAttendance.find(a=>a.date===date && String(a.studentId||'')===String(st.id||'') && ((cid&&String(a.classId||'')===cid)||norm(a.className)===norm(c.className||c.name)));
        state.set(keyFor(st.id,cid),{status:rec?.status||'',originalStatus:rec?.status||'',existingId:rec?.id||'',student:st,cls:c});
      });
    });
  }

  function statusButtons(k,item){
    const st=item.status||'';
    return `<div class="aaa-actions" data-key="${esc(k)}">
      <button type="button" class="aaa-btn present ${st==='PRESENT'?'active':''}" data-status="PRESENT">출석</button>
      <button type="button" class="aaa-btn late ${st==='LATE'?'active':''}" data-status="LATE">지각</button>
      <button type="button" class="aaa-btn absent ${st==='ABSENT'?'active':''}" data-status="ABSENT">결석</button>
    </div>${st?'':'<div class="aaa-unset">미입력</div>'}`;
  }

  function render(){
    const host=ensureHost();if(!host)return;
    const classes=sortClasses(allClasses.filter(c=>c.isActive!==false));
    host.innerHTML=`<div class="aaa-head"><div><div class="aaa-title">전체 반 출결</div><div class="aaa-sub">초등부터 고등까지 한 화면에서 확인합니다.</div></div><div class="aaa-count">${classes.length}개 반</div></div>`+
      classes.map(c=>{
        const students=classStudents(c),cid=String(c.id||c.classId||'');
        return `<section class="aaa-class"><div class="aaa-class-head"><div><div class="aaa-class-name">${esc(c.className||c.name||'반 이름 없음')}</div><div class="aaa-class-meta">${esc(c.grade||'')}${c.teacherName?' · '+esc(c.teacherName):''}</div></div><div class="aaa-class-cnt">${students.length}명</div></div>`+
          (students.length?students.map(st=>{const k=keyFor(st.id,cid),item=state.get(k)||{status:''};return `<div class="aaa-row"><div class="aaa-avatar">${esc((st.name||'?')[0])}</div><div><div class="aaa-name">${esc(st.name||'-')}</div><div class="aaa-school">${esc([st.grade,st.schoolName].filter(Boolean).join(' · '))}</div></div>${statusButtons(k,item)}</div>`;}).join(''):'<div class="aaa-empty">등록된 학생이 없습니다.</div>')+
          `</section>`;
      }).join('')+`<button type="button" class="aaa-save" id="aaaSaveBtn">변경한 출결 저장하기</button>`;

    host.querySelectorAll('.aaa-actions').forEach(group=>group.addEventListener('click',e=>{
      const btn=e.target.closest('.aaa-btn');if(!btn)return;
      const item=state.get(group.dataset.key);if(!item)return;
      item.status=btn.dataset.status;
      group.querySelectorAll('.aaa-btn').forEach(b=>b.classList.toggle('active',b===btn));
      const unset=group.parentElement.querySelector('.aaa-unset');if(unset)unset.remove();
    }));
    document.getElementById('aaaSaveBtn')?.addEventListener('click',saveChanges);
  }

  async function saveChanges(){
    const btn=document.getElementById('aaaSaveBtn');if(btn){btn.disabled=true;btn.textContent='저장 중...';}
    const date=selectedDate();let ok=0,fail=0;
    for(const item of state.values()){
      if(!item.status || item.status===item.originalStatus) continue;
      const cls=item.cls,st=item.student;
      try{
        let r;
        if(item.existingId){
          r=await _tFetch(`tables/attendance/${item.existingId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:item.status})});
        }else{
          r=await _tFetch('tables/attendance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId:st.id,studentName:st.name||'',classId:cls.id||cls.classId||'',className:cls.className||cls.name||'',date,status:item.status,teacherId:authUser.id||authUser.uid||'',teacherName:authUser.name||'',memo:''})});
          if(r.ok){const created=await r.json().catch(()=>({}));item.existingId=created?.id||item.existingId;}
        }
        if(!r.ok)throw new Error('HTTP '+r.status);
        item.originalStatus=item.status;ok++;
      }catch{fail++;}
    }
    if(btn){btn.disabled=false;btn.textContent='변경한 출결 저장하기';}
    window.YMS_UI?.toast?.(fail?`⚠️ ${ok}건 저장 · ${fail}건 실패`:`✅ ${ok}건 출결이 저장되었습니다`);
    await load();
  }

  async function load(){
    ensureStyle();
    const host=ensureHost();if(host)host.innerHTML='<div class="loading-row">전체 반 출결을 불러오는 중...</div>';
    [allClasses,allStudents,allAttendance]=await Promise.all([
      fetchAll('tables/classes?limit=300'),fetchAll('tables/students?limit=1000'),fetchAll('tables/attendance?limit=2000')
    ]);
    rebuildState();render();
  }

  function bindDate(){
    const input=document.getElementById('attDateInput');if(!input||input.dataset.adminAllBound==='1')return;
    input.dataset.adminAllBound='1';
    input.addEventListener('change',()=>setTimeout(load,0));
  }

  function start(){ensureStyle();bindDate();load();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,50));else setTimeout(start,50);
  window.addEventListener('load',()=>setTimeout(start,300));
})();
