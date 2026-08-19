/* YMS homework completion checklist: up to 5 items, checked = incomplete */
(function(){
  'use strict';
  const upper=v=>String(v||'').trim().toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const authUser=()=>window.YMS_Auth?.getUser?.()||window.user||null;
  const role=()=>upper(authUser()?.role);
  const canCheck=()=>role()==='TEACHER'||role()==='ADMIN'||window.YMS_Auth?.hasRole?.('TEACHER',authUser());
  let rosterCache=[];

  function homeworkItems(hw){
    const raw=Array.isArray(hw?.homeworkItems)?hw.homeworkItems:[];
    const items=raw.map(v=>String(v||'').trim()).filter(Boolean).slice(0,5);
    if(items.length) return items;
    const fallback=String(hw?.title||'').trim();
    return fallback?[fallback]:[];
  }

  function installRegisterFields(){
    const form=document.getElementById('hwRegForm');
    if(!form||document.getElementById('hwItemsBox')) return;
    const content=document.getElementById('hwContent')?.closest('.form-group');
    if(!content) return;
    const box=document.createElement('div');
    box.id='hwItemsBox';
    box.className='form-group';
    box.style.margin='0';
    box.innerHTML=`
      <label class="form-label">숙제 항목 <span style="font-weight:600;color:#8A96B2;">(최대 5개)</span></label>
      <div style="font-size:11px;color:#8A96B2;margin:-2px 0 8px;">각 항목별로 학생 미완료 여부를 체크할 수 있어요.</div>
      <div id="hwItemInputs" style="display:grid;gap:7px;">
        ${[1,2,3,4,5].map(i=>`<input type="text" class="form-input yms-hw-item" id="hwItem${i}" placeholder="${i}. ${i===1?'예) 단어 1~30번 암기':'숙제 항목 입력 (선택)'}">`).join('')}
      </div>`;
    content.after(box);
  }

  function collectItems(){
    return Array.from(document.querySelectorAll('.yms-hw-item')).map(el=>el.value.trim()).filter(Boolean).slice(0,5);
  }

  async function getRoster(hw){
    try{
      const r=await _tFetch('tables/students?limit=1000',{cache:'no-store'});
      if(!r.ok) return [];
      const all=(await r.json()).data||[];
      if(String(hw?.targetType||'').toUpperCase()==='STUDENT'){
        return all.filter(s=>String(s.id||'')===String(hw.targetStudentId||''));
      }
      return all.filter(s=>
        (hw?.classId&&String(s.classId||'')===String(hw.classId)) ||
        (hw?.className&&String(s.className||'')===String(hw.className))
      ).filter(s=>s.isActive!==false)
       .sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko'));
    }catch(e){ console.warn('[YMS] 숙제 학생 명단 로드 실패',e); return []; }
  }

  async function getViewerStudents(hw){
    const u=authUser();
    try{
      if(role()==='STUDENT'){
        const sid=String(u?.studentId||'').trim();
        if(sid){
          const r=await _tFetch(`tables/students/${encodeURIComponent(sid)}`,{cache:'no-store'});
          if(r.ok) return [await r.json()];
        }
        const r=await _tFetch('tables/students?limit=500',{cache:'no-store'});
        if(r.ok){
          const all=(await r.json()).data||[];
          const me=all.find(s=>String(s.userId||'')===String(u?.id||u?.uid||'') || String(s.name||'')===String(u?.name||''));
          return me?[me]:[];
        }
      }
      if(role()==='PARENT'){
        const ids=Array.isArray(u?.childIds)?u.childIds:String(u?.childIds||'').split(',').map(x=>x.trim()).filter(Boolean);
        const out=[];
        for(const id of ids){
          const r=await _tFetch(`tables/students/${encodeURIComponent(id)}`,{cache:'no-store'});
          if(r.ok){const s=await r.json(); if(s) out.push(s);}
        }
        return out.filter(s=>
          String(hw?.targetType||'').toUpperCase()==='STUDENT'
            ? String(s.id||'')===String(hw?.targetStudentId||'')
            : ((hw?.classId&&String(s.classId||'')===String(hw.classId))||(hw?.className&&String(s.className||'')===String(hw.className)))
        );
      }
    }catch(e){ console.warn('[YMS] 숙제 확인 학생 조회 실패',e); }
    return [];
  }

  function statusMap(hw){
    const m=hw?.incompleteByStudent;
    return m&&typeof m==='object'&&!Array.isArray(m)?m:{};
  }

  function teacherChecklistHtml(hw,students,items){
    const map=statusMap(hw);
    return `
      <div style="margin-top:16px;border-top:1px solid #E3E8F4;padding-top:16px;">
        <div style="font-size:15px;font-weight:900;color:#14245A;margin-bottom:4px;">숙제 미완료 체크</div>
        <div style="font-size:11px;color:#7A87A8;margin-bottom:12px;">안 한 숙제만 체크하세요. 체크하지 않은 항목은 완료로 표시됩니다.</div>
        ${students.length?students.map(s=>{
          const bad=new Set((Array.isArray(map[s.id])?map[s.id]:[]).map(Number));
          return `<div style="padding:12px 0;border-bottom:1px solid #EDF0F7;">
            <div style="font-size:13px;font-weight:850;color:#1A2340;margin-bottom:8px;">${esc(s.name||'학생')}</div>
            <div style="display:grid;gap:6px;">
              ${items.map((item,i)=>`<label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:10px;background:${bad.has(i)?'#FFF1F1':'#F7F9FD'};font-size:12px;line-height:1.4;cursor:pointer;">
                <input class="yms-incomplete-check" type="checkbox" data-student="${esc(s.id)}" data-item="${i}" ${bad.has(i)?'checked':''} style="margin-top:2px;width:17px;height:17px;accent-color:#D84A4A;">
                <span><strong style="color:${bad.has(i)?'#C73535':'#3D4A6B'};">${i+1}. ${esc(item)}</strong>${bad.has(i)?'<span style="margin-left:6px;color:#C73535;font-weight:800;">미완료</span>':''}</span>
              </label>`).join('')}
            </div>
          </div>`;
        }).join(''):'<div style="padding:14px;text-align:center;color:#8A96B2;background:#F7F9FD;border-radius:12px;">이 숙제의 학생 명단이 없습니다.</div>'}
        ${students.length?'<button id="ymsSaveHwStatus" type="button" class="btn btn-primary btn-full" style="margin-top:14px;">미완료 체크 저장</button>':''}
      </div>`;
  }

  function viewerStatusHtml(hw,students,items){
    const map=statusMap(hw);
    if(!students.length) return '';
    return `<div style="margin-top:16px;border-top:1px solid #E3E8F4;padding-top:16px;">
      <div style="font-size:15px;font-weight:900;color:#14245A;margin-bottom:10px;">숙제 확인</div>
      ${students.map(s=>{
        const bad=new Set((Array.isArray(map[s.id])?map[s.id]:[]).map(Number));
        return `<div style="padding:12px;border:1px solid #E3E8F4;border-radius:14px;background:#fff;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;">
            <strong style="font-size:13px;">${esc(s.name||'학생')}</strong>
            <span style="font-size:11px;font-weight:850;color:${bad.size?'#C73535':'#23774F'};background:${bad.size?'#FFF1F1':'#EAF7F1'};padding:5px 9px;border-radius:999px;">${bad.size?`미완료 ${bad.size}개`:'모두 완료'}</span>
          </div>
          <div style="display:grid;gap:6px;">
            ${items.map((item,i)=>`<div style="display:flex;align-items:flex-start;gap:7px;padding:7px 9px;border-radius:9px;background:${bad.has(i)?'#FFF4F4':'#F3FAF6'};font-size:12px;line-height:1.4;color:${bad.has(i)?'#C73535':'#23774F'};"><span>${bad.has(i)?'⚠️':'✅'}</span><span><strong>${i+1}. ${esc(item)}</strong> · ${bad.has(i)?'미완료':'완료'}</span></div>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  async function appendCompletion(hw){
    const holder=document.getElementById('hwDetailContent');
    if(!holder||!hw) return;
    holder.querySelector('#ymsHwCompletionBlock')?.remove();
    const items=homeworkItems(hw);
    if(!items.length) return;
    const block=document.createElement('div');block.id='ymsHwCompletionBlock';
    if(canCheck()){
      rosterCache=await getRoster(hw);
      block.innerHTML=teacherChecklistHtml(hw,rosterCache,items);
      holder.appendChild(block);
      document.getElementById('ymsSaveHwStatus')?.addEventListener('click',()=>saveStatus(hw,items));
    }else if(role()==='PARENT'||role()==='STUDENT'){
      const mine=await getViewerStudents(hw);
      block.innerHTML=viewerStatusHtml(hw,mine,items);
      holder.appendChild(block);
    }
  }

  async function saveStatus(hw,items){
    const btn=document.getElementById('ymsSaveHwStatus');
    if(btn){btn.disabled=true;btn.textContent='저장 중...';}
    try{
      const map={};
      rosterCache.forEach(s=>map[String(s.id)]=[]);
      document.querySelectorAll('.yms-incomplete-check:checked').forEach(ch=>{
        const sid=String(ch.dataset.student||''),idx=Number(ch.dataset.item);
        if(sid&&Number.isInteger(idx)&&idx>=0&&idx<items.length){
          if(!Array.isArray(map[sid])) map[sid]=[];
          map[sid].push(idx);
        }
      });
      Object.keys(map).forEach(k=>{map[k]=[...new Set(map[k])].sort((a,b)=>a-b);});
      const payload={homeworkItems:items,incompleteByStudent:map,statusUpdatedAt:new Date().toISOString(),statusUpdatedBy:authUser()?.name||''};
      const r=await _tFetch(`tables/homework/${encodeURIComponent(hw.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      Object.assign(hw,payload);
      if(Array.isArray(window.allHomework)){
        const found=window.allHomework.find(x=>String(x.id)===String(hw.id));if(found)Object.assign(found,payload);
      }
      YMS_UI.toast('✅ 숙제 미완료 체크를 저장했습니다.');
      await appendCompletion(hw);
    }catch(e){console.error(e);YMS_UI.toast('❌ 미완료 체크 저장에 실패했습니다.');}
    finally{if(btn){btn.disabled=false;btn.textContent='미완료 체크 저장';}}
  }

  function installSubmitOverride(){
    const original=window.submitHomework;
    if(typeof original!=='function'||original.__ymsCompletion) return;
    const wrapped=async function(e){
      // Existing homework-personal submit handles target/class; enrich the write by intercepting _tFetch once.
      const items=collectItems();
      const base=window._tFetch;
      let restored=false;
      window._tFetch=async function(path,opt={}){
        if(!restored && String(path)==='tables/homework' && String(opt?.method||'GET').toUpperCase()==='POST'){
          restored=true;window._tFetch=base;
          try{
            const body=typeof opt.body==='string'?JSON.parse(opt.body):(opt.body||{});
            body.homeworkItems=items.length?items:[String(body.title||'').trim()].filter(Boolean);
            body.incompleteByStudent={};
            opt={...opt,body:JSON.stringify(body)};
          }catch{}
        }
        return base(path,opt);
      };
      try{return await original.call(this,e);}finally{if(window._tFetch!==base)window._tFetch=base;}
    };
    wrapped.__ymsCompletion=true;
    window.submitHomework=wrapped;
  }

  function installDetailOverride(){
    const original=window.openDetail;
    if(typeof original!=='function'||original.__ymsCompletion) return;
    const wrapped=function(hw){
      const r=original.call(this,hw);
      setTimeout(()=>appendCompletion(hw),0);
      return r;
    };
    wrapped.__ymsCompletion=true;
    window.openDetail=wrapped;
  }

  function addCardStatus(){
    if(role()!=='PARENT'&&role()!=='STUDENT') return;
    // Detail view contains the authoritative per-student status; keep list cards uncluttered.
  }

  function boot(){
    installRegisterFields();
    installSubmitOverride();
    installDetailOverride();
    addCardStatus();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('load',()=>setTimeout(boot,100));
})();