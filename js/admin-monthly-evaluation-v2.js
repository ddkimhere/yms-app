/* YMS Admin — monthly evaluation v2: listening / reading / vocabulary / grammar + 6 month trend */
(function(){
  'use strict';
  if((location.pathname.split('/').pop()||'')!=='admin.html') return;

  const AREAS=[['listening','듣기'],['reading','독해'],['vocabulary','어휘'],['grammar','문법']];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nowMonth=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
  let monthRecords=[];

  function style(){
    if(document.getElementById('yms-eval-v2-style'))return;
    const s=document.createElement('style');s.id='yms-eval-v2-style';s.textContent=`
      #monthlyScorePanel{margin-top:18px;background:#fff;border:1px solid #E3E8F4;border-radius:18px;padding:18px;box-shadow:0 3px 14px rgba(30,50,120,.06)}
      .yev-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}.yev-title{font-size:16px;font-weight:900;color:#14245A}.yev-sub{font-size:11px;color:#7A87A8;margin-top:3px}.yev-tools{display:flex;gap:8px;flex-wrap:wrap}.yev-tools input,.yev-tools select{height:36px;border:1px solid #D8DFED;border-radius:10px;padding:0 10px;background:#fff;color:#1A2340;font:inherit;font-size:12px}
      .yev-wrap{overflow:auto;border:1px solid #E7EBF4;border-radius:12px}.yev-table{width:100%;border-collapse:collapse;min-width:760px}.yev-table th{padding:9px 8px;background:#F6F8FC;color:#526080;font-size:11px;text-align:center;border-bottom:1px solid #E7EBF4}.yev-table th:first-child,.yev-table td:first-child{text-align:left}.yev-table td{padding:8px;border-bottom:1px solid #EEF1F7;font-size:12px;text-align:center}.yev-input{width:70px;height:34px;border:1px solid #D8DFED;border-radius:9px;padding:0 7px;font-weight:800;text-align:center}.yev-avg{font-weight:900;color:#1E3278}.yev-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
      .yev-name-btn{appearance:none;border:0;background:none;padding:0;color:#14245A;font:inherit;font-weight:900;cursor:pointer;text-decoration:underline;text-decoration-color:#A8BDE8;text-underline-offset:3px}.yev-name-btn:hover{color:#1E4FD7}
      #yevTrendModal{position:fixed;inset:0;z-index:1600;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(20,36,90,.45);backdrop-filter:blur(3px)}#yevTrendModal.hidden{display:none!important}.yev-card{width:min(760px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:20px;padding:20px;box-shadow:0 14px 45px rgba(20,36,90,.25)}.yev-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:#526080;margin:10px 0}.yev-dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:4px}.yev-mini{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px}.yev-mini th,.yev-mini td{padding:7px;border-bottom:1px solid #EEF1F7;text-align:center}.yev-mini th:first-child,.yev-mini td:first-child{text-align:left}
      @media(max-width:620px){#monthlyScorePanel{padding:12px}.yev-tools{width:100%}.yev-tools input,.yev-tools select{flex:1}.yev-input{width:58px}.yev-actions .btn{flex:1}}
    `;document.head.appendChild(s);
  }

  function decodeVal(v){if(!v||typeof v!=='object')return null;if('stringValue'in v)return v.stringValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return Number(v.doubleValue);if('booleanValue'in v)return v.booleanValue;if('timestampValue'in v)return v.timestampValue;if('nullValue'in v)return null;return null;}
  function decodeDoc(d){const o={id:String(d?.name||'').split('/').pop()};Object.entries(d?.fields||{}).forEach(([k,v])=>o[k]=decodeVal(v));return o;}
  async function runQuery(where,limit=5000){
    const token=window.YMS_Auth?.getToken?.();if(!token)throw new Error('로그인이 필요합니다.');
    const q={from:[{collectionId:'monthlyScores'}],limit};if(where)q.where=where;
    const r=await fetch('https://firestore.googleapis.com/v1/projects/yms-app-bb735/databases/(default)/documents:runQuery',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({structuredQuery:q})});
    if(!r.ok)throw new Error(`월말평가 조회 실패 (HTTP ${r.status})`);
    return (await r.json()).filter(x=>x.document).map(x=>decodeDoc(x.document));
  }
  const monthWhere=m=>({fieldFilter:{field:{fieldPath:'month'},op:'EQUAL',value:{stringValue:String(m)}}});
  const studentWhere=id=>({fieldFilter:{field:{fieldPath:'studentId'},op:'EQUAL',value:{stringValue:String(id)}}});

  function ensurePanel(){
    const section=document.getElementById('section-students');if(!section)return;
    let btn=document.getElementById('openMonthlyScoresBtn');
    if(!btn){const header=section.querySelector('.admin-table-header');const box=header?.querySelector('div[style*="display:flex"]')||header;if(box){btn=document.createElement('button');btn.id='openMonthlyScoresBtn';btn.type='button';btn.className='btn btn-sm';btn.style.cssText='background:#EEF3FB;color:#1E3278;border:1px solid #A8BDE8;font-size:12px';box.appendChild(btn);}}
    if(btn){btn.textContent='📊 월말평가';btn.onclick=togglePanel;}
    let p=document.getElementById('monthlyScorePanel');
    if(!p){p=document.createElement('div');p.id='monthlyScorePanel';p.className='hidden';const wrap=section.querySelector('.admin-table-wrap');wrap?.insertAdjacentElement('afterend',p);}
    p.innerHTML=`<div class="yev-head"><div><div class="yev-title">📊 월말평가 점수 관리</div><div class="yev-sub">듣기 · 독해 · 어휘 · 문법 점수를 월별로 입력합니다. 학생 이름을 누르면 최근 6개월 추이를 볼 수 있습니다.</div></div><div class="yev-tools"><input type="month" id="yevMonth" value="${nowMonth()}"><select id="yevClass"><option value="">전체 반</option></select><button type="button" class="btn btn-sm btn-ghost" id="yevReload">조회</button></div></div><div class="yev-wrap"><table class="yev-table"><thead><tr><th>학생</th><th>학년</th><th>반</th>${AREAS.map(x=>`<th>${x[1]}</th>`).join('')}<th>평균</th></tr></thead><tbody id="yevBody"><tr><td colspan="8" style="text-align:center;padding:24px;color:#8A96B2">조회 버튼을 눌러주세요.</td></tr></tbody></table></div><div class="yev-actions"><button type="button" class="btn btn-primary" id="yevSave">점수 저장</button></div>`;
    p.querySelector('#yevReload').onclick=loadMonth;p.querySelector('#yevMonth').onchange=loadMonth;p.querySelector('#yevClass').onchange=renderMonth;p.querySelector('#yevSave').onclick=saveMonth;
    populateClasses();
  }

  function populateClasses(){const sel=document.getElementById('yevClass');if(!sel)return;const prev=sel.value;const list=[...(window._allClasses||[])].sort((a,b)=>String(a.className||'').localeCompare(String(b.className||''),'ko'));sel.innerHTML='<option value="">전체 반</option>'+list.map(c=>`<option value="${esc(c.id)}">${esc(c.className||'반')}</option>`).join('');if([...sel.options].some(o=>o.value===prev))sel.value=prev;}
  async function togglePanel(){ensurePanel();const p=document.getElementById('monthlyScorePanel');if(!p)return;const opening=p.classList.contains('hidden');p.classList.toggle('hidden');if(opening){await loadMonth();p.scrollIntoView({behavior:'smooth',block:'start'});}}
  function studentsForPanel(){const cid=document.getElementById('yevClass')?.value||'';return [...(window._allStudents||[])].filter(s=>s.isActive!==false&&(!cid||String(s.classId||'')===String(cid))).sort((a,b)=>String(a.className||'').localeCompare(String(b.className||''),'ko')||String(a.name||'').localeCompare(String(b.name||''),'ko'));}
  const val=(r,k)=>{const n=Number(r?.[k]);return Number.isFinite(n)?n:'';};
  function avgOf(r){const nums=AREAS.map(([k])=>Number(r?.[k])).filter(Number.isFinite);return nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length*10)/10:'';}
  function renderMonth(){
    populateClasses();const body=document.getElementById('yevBody');if(!body)return;const month=document.getElementById('yevMonth')?.value||nowMonth();const rec=new Map(monthRecords.filter(r=>r.month===month).map(r=>[String(r.studentId||''),r]));const list=studentsForPanel();
    if(!list.length){body.innerHTML='<tr><td colspan="8" style="text-align:center;padding:24px;color:#8A96B2">학생이 없습니다.</td></tr>';return;}
    body.innerHTML=list.map(s=>{const r=rec.get(String(s.id))||{};return `<tr data-student-id="${esc(s.id)}" data-record-id="${esc(r.id||'')}"><td><button type="button" class="yev-name-btn" onclick="YMS_openEvalTrend('${esc(s.id)}')">${esc(s.name||'-')}</button></td><td>${esc(s.grade||'-')}</td><td>${esc(s.className||'-')}</td>${AREAS.map(([k])=>`<td><input class="yev-input" data-area="${k}" type="number" min="0" max="100" step="1" value="${val(r,k)}" placeholder="-"></td>`).join('')}<td class="yev-avg">${avgOf(r)===''?'-':avgOf(r)}</td></tr>`;}).join('');
    body.querySelectorAll('.yev-input').forEach(i=>i.addEventListener('input',e=>{let n=Number(e.target.value);if(e.target.value!==''&&(n<0||n>100))e.target.value=Math.min(100,Math.max(0,n));const tr=e.target.closest('tr');const nums=[...tr.querySelectorAll('.yev-input')].map(x=>x.value===''?null:Number(x.value)).filter(x=>x!==null&&Number.isFinite(x));tr.querySelector('.yev-avg').textContent=nums.length?(Math.round(nums.reduce((a,b)=>a+b,0)/nums.length*10)/10):'-';}));
  }
  async function loadMonth(){const body=document.getElementById('yevBody');if(body)body.innerHTML='<tr><td colspan="8" style="text-align:center;padding:24px;color:#8A96B2">불러오는 중...</td></tr>';try{monthRecords=await runQuery(monthWhere(document.getElementById('yevMonth')?.value||nowMonth()));renderMonth();}catch(e){console.error(e);if(body)body.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:24px;color:#C62828">${esc(e.message)}</td></tr>`;}}
  async function saveMonth(){
    const month=document.getElementById('yevMonth')?.value||nowMonth();const rows=[...document.querySelectorAll('#yevBody tr[data-student-id]')];let ok=0,fail=0;
    for(const tr of rows){const inputs=[...tr.querySelectorAll('.yev-input')];if(!inputs.some(i=>i.value!==''))continue;const sid=tr.dataset.studentId;const s=(window._allStudents||[]).find(x=>String(x.id)===String(sid));const payload={studentId:sid,studentName:s?.name||'',classId:s?.classId||'',className:s?.className||'',month,updatedAt:new Date().toISOString()};inputs.forEach(i=>payload[i.dataset.area]=i.value===''?null:Number(i.value));const nums=AREAS.map(([k])=>payload[k]).filter(Number.isFinite);payload.score=nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length*10)/10:null;const rid=tr.dataset.recordId;try{const r=await _tFetch(rid?`tables/monthlyScores/${encodeURIComponent(rid)}`:'tables/monthlyScores',{method:rid?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,...(!rid?{createdAt:new Date().toISOString()}: {})})});if(!r.ok)throw new Error('HTTP '+r.status);const saved=await r.json().catch(()=>({}));if(!rid&&saved.id)tr.dataset.recordId=saved.id;ok++;}catch(e){console.error('[YMS] eval save',sid,e);fail++;}}
    window.YMS_UI?.toast?.(fail?`⚠️ ${ok}명 저장 · ${fail}명 실패`:`✅ 월말평가 ${ok}명 저장 완료`);await loadMonth();
  }

  function ensureTrendModal(){if(document.getElementById('yevTrendModal'))return;const m=document.createElement('div');m.id='yevTrendModal';m.className='hidden';m.innerHTML='<div class="yev-card"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div id="yevTrendName" style="font-size:19px;font-weight:900;color:#14245A">학생</div><div style="font-size:11px;color:#7A87A8;margin-top:3px">최근 6개월 월말평가 추이</div></div><button type="button" class="btn btn-sm btn-ghost" onclick="document.getElementById(\'yevTrendModal\').classList.add(\'hidden\')">닫기</button></div><div id="yevTrendContent" style="margin-top:14px"></div></div>';m.addEventListener('click',e=>{if(e.target===m)m.classList.add('hidden')});document.body.appendChild(m);}
  function trendSvg(rows){
    const W=700,H=330,L=48,R=18,T=24,B=48,innerW=W-L-R,innerH=H-T-B;const colors=['#315FD5','#22A06B','#E59A24','#8C5BD6'];const xs=rows.map((_,i)=>L+(rows.length===1?innerW/2:i*innerW/(rows.length-1)));const y=n=>T+(100-Number(n))*innerH/100;let svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="최근 6개월 월말평가 그래프" style="background:#FBFCFF;border:1px solid #E7EBF4;border-radius:14px">`;
    [0,25,50,75,100].forEach(v=>{const yy=y(v);svg+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#E5EAF3" stroke-width="1"/><text x="${L-8}" y="${yy+4}" text-anchor="end" font-size="10" fill="#7A87A8">${v}</text>`});
    rows.forEach((r,i)=>{svg+=`<text x="${xs[i]}" y="${H-18}" text-anchor="middle" font-size="10" fill="#65718B">${esc(String(r.month||'').slice(2).replace('-','.'))}</text>`});
    AREAS.forEach(([k],ai)=>{const pts=rows.map((r,i)=>Number.isFinite(Number(r[k]))?`${xs[i]},${y(r[k])}`:null);let seg=[];pts.forEach((p,i)=>{if(p)seg.push(p);if((!p||i===pts.length-1)&&seg.length){if(seg.length>1)svg+=`<polyline points="${seg.join(' ')}" fill="none" stroke="${colors[ai]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;seg=[];}});rows.forEach((r,i)=>{if(Number.isFinite(Number(r[k])))svg+=`<circle cx="${xs[i]}" cy="${y(r[k])}" r="4" fill="${colors[ai]}"/>`})});
    return svg+'</svg>';
  }
  window.YMS_openEvalTrend=async function(studentId){ensureTrendModal();const modal=document.getElementById('yevTrendModal'),content=document.getElementById('yevTrendContent'),s=(window._allStudents||[]).find(x=>String(x.id)===String(studentId));document.getElementById('yevTrendName').textContent=s?.name||'학생';content.innerHTML='<div style="padding:30px;text-align:center;color:#8A96B2">불러오는 중...</div>';modal.classList.remove('hidden');try{let rows=await runQuery(studentWhere(studentId),120);rows=rows.filter(r=>/^\d{4}-\d{2}$/.test(String(r.month||''))).sort((a,b)=>String(a.month).localeCompare(String(b.month)));const byMonth=new Map();rows.forEach(r=>byMonth.set(r.month,r));rows=[...byMonth.values()].slice(-6);if(!rows.length){content.innerHTML='<div style="padding:30px;text-align:center;color:#8A96B2">아직 월말평가 기록이 없습니다.</div>';return;}const colors=['#315FD5','#22A06B','#E59A24','#8C5BD6'];content.innerHTML=`<div class="yev-legend">${AREAS.map((a,i)=>`<span><span class="yev-dot" style="background:${colors[i]}"></span>${a[1]}</span>`).join('')}</div>${trendSvg(rows)}<table class="yev-mini"><thead><tr><th>월</th>${AREAS.map(a=>`<th>${a[1]}</th>`).join('')}<th>평균</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.month)}</td>${AREAS.map(([k])=>`<td>${Number.isFinite(Number(r[k]))?Number(r[k]):'-'}</td>`).join('')}<td>${avgOf(r)===''?'-':avgOf(r)}</td></tr>`).join('')}</tbody></table>`;}catch(e){content.innerHTML=`<div style="padding:30px;text-align:center;color:#C62828">${esc(e.message)}</div>`;}}

  function enhanceStudentNames(){const body=document.getElementById('studentTableBody');if(!body)return;body.querySelectorAll('tr').forEach(tr=>{const strong=tr.querySelector('td:first-child strong');if(!strong||strong.dataset.yev==='1')return;const name=strong.textContent.trim(),s=(window._allStudents||[]).find(x=>String(x.name||'')===name);if(!s)return;const b=document.createElement('button');b.type='button';b.className='yev-name-btn';b.textContent=name;b.onclick=()=>window.YMS_openEvalTrend(s.id);strong.replaceWith(b);});}
  function patchStudentRender(){const old=window.renderStudentTable;if(typeof old==='function'&&!old.__yevPatched){const f=function(){const r=old.apply(this,arguments);setTimeout(enhanceStudentNames,0);return r};f.__yevPatched=true;window.renderStudentTable=f;}}
  const obs=new MutationObserver(()=>enhanceStudentNames());
  function init(){style();ensurePanel();ensureTrendModal();patchStudentRender();const body=document.getElementById('studentTableBody');if(body)obs.observe(body,{childList:true,subtree:true});enhanceStudentNames();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();window.addEventListener('load',()=>setTimeout(init,400));
})();
