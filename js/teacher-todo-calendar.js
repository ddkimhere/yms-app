/* YMS teacher personal todo calendar */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/teacher-home.html')) return;
  const me=window.YMS_Auth?.getUser?.();
  const role=String(me?.role||'').toUpperCase();
  const roles=Array.isArray(me?.roles)?me.roles.map(r=>String(r).toUpperCase()):[];
  if(!(role==='TEACHER'||roles.includes('TEACHER'))||!window._tFetch) return;

  const uid=String(me.id||me.uid||'');
  let todos=[];
  let selectedDate=localDate(new Date());
  let viewYear=new Date().getFullYear();
  let viewMonth=new Date().getMonth();

  function localDate(d){
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function token(){return window.YMS_Auth?.getToken?.()||'';}
  function cfg(){return window.YMS_FIREBASE_CONFIG||{projectId:'yms-app-bb735'};}
  function byDate(date){return todos.filter(t=>t.date===date).sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));}

  function decodeVal(v){
    if(!v||typeof v!=='object')return null;
    if('stringValue'in v)return v.stringValue;
    if('integerValue'in v)return Number(v.integerValue);
    if('doubleValue'in v)return Number(v.doubleValue);
    if('booleanValue'in v)return v.booleanValue;
    if('timestampValue'in v)return v.timestampValue;
    if('nullValue'in v)return null;
    return null;
  }
  function decodeDoc(doc){
    const out={id:String(doc?.name||'').split('/').pop()};
    Object.entries(doc?.fields||{}).forEach(([k,v])=>out[k]=decodeVal(v));
    return out;
  }

  async function fetchTodos(){
    const tk=token();if(!tk)throw new Error('로그인이 필요합니다.');
    const project=cfg().projectId||'yms-app-bb735';
    const url=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery`;
    const body={structuredQuery:{from:[{collectionId:'teacherTodos'}],where:{fieldFilter:{field:{fieldPath:'teacherId'},op:'EQUAL',value:{stringValue:uid}}},limit:500}};
    const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok){const msg=await r.text().catch(()=>String(r.status));throw new Error(`할 일 조회 실패 (${r.status}) ${msg.slice(0,80)}`);}
    todos=(await r.json()).filter(x=>x.document).map(x=>decodeDoc(x.document));
  }

  function injectCss(){
    if(document.getElementById('yms-teacher-todo-css'))return;
    const s=document.createElement('style');s.id='yms-teacher-todo-css';s.textContent=`
      #summaryTasksCard{cursor:pointer;transition:.15s ease}#summaryTasksCard:hover{transform:translateY(-1px);box-shadow:var(--shadow-md)}
      .tt-home{margin:-8px 0 26px;border:1px solid var(--beige);border-radius:18px;background:#fff;box-shadow:var(--shadow-sm);overflow:hidden}
      .tt-home-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--beige)}
      .tt-home-title{font-size:13px;font-weight:900;color:var(--charcoal)}.tt-home-open{border:0;background:var(--periwinkle-bg);color:var(--navy);font:inherit;font-size:11px;font-weight:800;border-radius:999px;padding:7px 10px;cursor:pointer}
      .tt-home-list{padding:6px 16px 10px}.tt-home-row{display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid #EEF1F6;font-size:12px;color:var(--gray-dark)}.tt-home-row:last-child{border-bottom:0}.tt-home-row.done{text-decoration:line-through;color:#9AA4B8}.tt-dot{width:7px;height:7px;border-radius:50%;background:var(--navy);margin-top:5px;flex:0 0 auto}.tt-home-empty{padding:14px 0;color:var(--gray-mid);font-size:12px;text-align:center}
      .tt-modal{position:fixed;inset:0;z-index:20000;background:rgba(15,25,55,.48);display:flex;align-items:center;justify-content:center;padding:16px}.tt-modal.hidden{display:none}.tt-sheet{width:min(100%,760px);max-height:92vh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 24px 70px rgba(20,36,90,.28);padding:20px}
      .tt-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.tt-title{font-size:19px;font-weight:900;color:var(--charcoal)}.tt-close{border:0;background:#F0F3F8;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px}
      .tt-cal-head{display:flex;align-items:center;justify-content:center;gap:12px;margin:4px 0 12px}.tt-nav{width:34px;height:34px;border:1px solid var(--beige);background:#fff;border-radius:10px;cursor:pointer}.tt-month{min-width:120px;text-align:center;font-size:15px;font-weight:900;color:var(--navy-dark)}
      .tt-week,.tt-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.tt-week div{text-align:center;color:var(--gray-mid);font-size:10px;font-weight:800;padding:4px}.tt-day{position:relative;min-height:54px;border:1px solid transparent;border-radius:11px;background:#F8FAFD;color:var(--charcoal);font:inherit;font-size:12px;cursor:pointer}.tt-day:hover{border-color:var(--periwinkle-lt)}.tt-day.muted{opacity:.35}.tt-day.today{border-color:var(--periwinkle);font-weight:900}.tt-day.selected{background:var(--navy);color:#fff}.tt-day .cnt{position:absolute;right:5px;bottom:4px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#E7ECFA;color:var(--navy);font-size:9px;font-weight:900;display:grid;place-items:center}.tt-day.selected .cnt{background:rgba(255,255,255,.2);color:#fff}
      .tt-detail{margin-top:16px;padding-top:16px;border-top:1px solid var(--beige)}.tt-date-label{font-size:14px;font-weight:900;color:var(--charcoal);margin-bottom:10px}.tt-add{display:flex;gap:8px;margin-bottom:10px}.tt-input{flex:1;min-width:0;height:40px;border:1px solid var(--beige-dark);border-radius:10px;padding:0 11px;font:inherit;font-size:12px}.tt-add-btn{height:40px;border:0;border-radius:10px;background:var(--navy);color:#fff;padding:0 14px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.tt-list{display:flex;flex-direction:column;gap:7px}.tt-item{display:grid;grid-template-columns:24px 1fr auto;align-items:center;gap:8px;padding:9px 10px;border:1px solid #E5EAF3;border-radius:11px}.tt-item.done .tt-text{text-decoration:line-through;color:#9AA4B8}.tt-item input[type=checkbox]{width:18px;height:18px;accent-color:var(--navy)}.tt-text{font-size:12px;color:var(--gray-dark);line-height:1.4}.tt-del{border:0;background:transparent;color:#A5AFC3;cursor:pointer;font-size:14px;padding:4px}.tt-empty{text-align:center;color:var(--gray-mid);font-size:12px;padding:18px 0}
      @media(max-width:600px){.tt-sheet{padding:16px;border-radius:18px}.tt-day{min-height:46px}.tt-add{flex-direction:column}.tt-add-btn{width:100%}}
    `;document.head.appendChild(s);
  }

  function ensureHome(){
    const val=document.getElementById('summaryTasks');if(!val)return;
    const card=val.closest('.teacher-summary-card');if(card){card.id='summaryTasksCard';card.setAttribute('role','button');card.setAttribute('tabindex','0');card.onclick=openModal;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openModal();}};}
    let box=document.getElementById('teacherTodoHome');
    if(!box){box=document.createElement('section');box.id='teacherTodoHome';box.className='tt-home';const grid=document.querySelector('.teacher-summary-grid');grid?.insertAdjacentElement('afterend',box);}
    renderHome();
  }

  function renderHome(){
    const today=localDate(new Date()),list=byDate(today),open=list.filter(x=>!x.isDone);
    const val=document.getElementById('summaryTasks');if(val)val.textContent=list.length?`${open.length}/${list.length}개`:'0개';
    const box=document.getElementById('teacherTodoHome');if(!box)return;
    box.innerHTML=`<div class="tt-home-head"><div class="tt-home-title">✅ 오늘의 할 일</div><button class="tt-home-open" type="button">달력 열기</button></div><div class="tt-home-list">${list.length?list.slice(0,4).map(t=>`<div class="tt-home-row ${t.isDone?'done':''}"><span class="tt-dot"></span><span>${esc(t.text||'')}</span></div>`).join(''):`<div class="tt-home-empty">오늘 등록된 할 일이 없습니다.</div>`}${list.length>4?`<div class="tt-home-row" style="color:var(--gray-mid)">외 ${list.length-4}개 더 있음</div>`:''}</div>`;
    box.querySelector('.tt-home-open')?.addEventListener('click',openModal);
  }

  function ensureModal(){
    let modal=document.getElementById('teacherTodoModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='teacherTodoModal';modal.className='tt-modal hidden';modal.innerHTML=`<div class="tt-sheet"><div class="tt-head"><div class="tt-title">📅 할 일 달력</div><button class="tt-close" type="button" aria-label="닫기">×</button></div><div id="ttCalendar"></div><div id="ttDetail" class="tt-detail"></div></div>`;
    document.body.appendChild(modal);modal.querySelector('.tt-close').onclick=()=>modal.classList.add('hidden');modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hidden')});return modal;
  }

  function renderCalendar(){
    const host=document.getElementById('ttCalendar');if(!host)return;
    const first=new Date(viewYear,viewMonth,1),start=new Date(viewYear,viewMonth,1-first.getDay());
    const cells=[];
    for(let i=0;i<42;i++){
      const d=new Date(start);d.setDate(start.getDate()+i);const ds=localDate(d),count=byDate(ds).length;
      cells.push(`<button class="tt-day ${d.getMonth()!==viewMonth?'muted':''} ${ds===localDate(new Date())?'today':''} ${ds===selectedDate?'selected':''}" type="button" data-date="${ds}">${d.getDate()}${count?`<span class="cnt">${count}</span>`:''}</button>`);
    }
    host.innerHTML=`<div class="tt-cal-head"><button class="tt-nav" id="ttPrev" type="button">‹</button><div class="tt-month">${viewYear}년 ${viewMonth+1}월</div><button class="tt-nav" id="ttNext" type="button">›</button></div><div class="tt-week"><div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div></div><div class="tt-grid">${cells.join('')}</div>`;
    host.querySelector('#ttPrev').onclick=()=>{viewMonth--;if(viewMonth<0){viewMonth=11;viewYear--;}renderCalendar();};
    host.querySelector('#ttNext').onclick=()=>{viewMonth++;if(viewMonth>11){viewMonth=0;viewYear++;}renderCalendar();};
    host.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{selectedDate=b.dataset.date;const d=new Date(selectedDate+'T12:00:00');viewYear=d.getFullYear();viewMonth=d.getMonth();renderCalendar();renderDetail();});
  }

  function renderDetail(){
    const host=document.getElementById('ttDetail');if(!host)return;const list=byDate(selectedDate);const d=new Date(selectedDate+'T12:00:00');const label=`${d.getMonth()+1}월 ${d.getDate()}일 (${['일','월','화','수','목','금','토'][d.getDay()]})`;
    host.innerHTML=`<div class="tt-date-label">${label}</div><div class="tt-add"><input class="tt-input" id="ttNewText" type="text" maxlength="120" placeholder="할 일을 입력하세요"><button class="tt-add-btn" id="ttAddBtn" type="button">추가</button></div><div class="tt-list">${list.length?list.map(t=>`<div class="tt-item ${t.isDone?'done':''}" data-id="${esc(t.id)}"><input type="checkbox" ${t.isDone?'checked':''}><div class="tt-text">${esc(t.text||'')}</div><button class="tt-del" type="button" title="삭제">✕</button></div>`).join(''):`<div class="tt-empty">이 날짜에는 할 일이 없습니다.</div>`}</div>`;
    const input=host.querySelector('#ttNewText'),add=host.querySelector('#ttAddBtn');add.onclick=()=>addTodo(input.value);input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addTodo(input.value);}};
    host.querySelectorAll('.tt-item').forEach(row=>{const id=row.dataset.id;row.querySelector('input').onchange=e=>toggleTodo(id,e.target.checked);row.querySelector('.tt-del').onclick=()=>deleteTodo(id);});
  }

  async function addTodo(text){
    text=String(text||'').trim();if(!text)return;
    const now=new Date().toISOString(),payload={teacherId:uid,teacherName:me.name||'',date:selectedDate,text,isDone:false,createdAt:now,updatedAt:now};
    try{const r=await _tFetch('tables/teacherTodos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok){const msg=await r.text().catch(()=>String(r.status));throw new Error(`저장 실패 (${r.status}) ${msg.slice(0,80)}`)}const saved=await r.json().catch(()=>({}));todos.push({id:saved.id,...payload,...saved});renderCalendar();renderDetail();renderHome();}
    catch(e){console.error('[YMS] todo add',e);window.YMS_UI?.toast?.('❌ '+(e.message||'할 일 저장 실패'));}
  }
  async function toggleTodo(id,done){
    const t=todos.find(x=>x.id===id);if(!t)return;const old=t.isDone;t.isDone=!!done;renderDetail();renderHome();
    try{const r=await _tFetch('tables/teacherTodos/'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({isDone:!!done,updatedAt:new Date().toISOString(),teacherId:uid})});if(!r.ok)throw new Error(`HTTP ${r.status}`);}
    catch(e){t.isDone=old;renderDetail();renderHome();window.YMS_UI?.toast?.('❌ 완료 상태 저장 실패');}
  }
  async function deleteTodo(id){
    const t=todos.find(x=>x.id===id);if(!t)return;if(!confirm('이 할 일을 삭제할까요?'))return;
    try{const r=await _tFetch('tables/teacherTodos/'+encodeURIComponent(id),{method:'DELETE'});if(!r.ok)throw new Error(`HTTP ${r.status}`);todos=todos.filter(x=>x.id!==id);renderCalendar();renderDetail();renderHome();}
    catch(e){window.YMS_UI?.toast?.('❌ 할 일 삭제 실패');}
  }

  function openModal(){const now=new Date();selectedDate=localDate(now);viewYear=now.getFullYear();viewMonth=now.getMonth();const m=ensureModal();m.classList.remove('hidden');renderCalendar();renderDetail();}

  async function boot(){
    injectCss();ensureModal();
    try{await fetchTodos();}catch(e){console.error('[YMS] todo load',e);window.YMS_UI?.toast?.('할 일 데이터를 불러오지 못했습니다');}
    ensureHome();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,120),{once:true});else setTimeout(boot,120);
})();
