/* Class Note Admin — monthly evaluation on student-name click + 6 month trend + full history Excel */
(function(){
  'use strict';
  if((location.pathname.split('/').pop()||'')!=='admin.html') return;

  const AREAS=[['listening','듣기'],['reading','독해'],['vocabulary','어휘'],['grammar','문법']];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nowMonth=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
  let activeStudentId='';
  let historyRows=[];

  function style(){
    if(document.getElementById('cn-eval-style'))return;
    const s=document.createElement('style');s.id='cn-eval-style';s.textContent=`
      .yev-name-btn{appearance:none;border:0;background:none;padding:0;color:#14245A;font:inherit;font-weight:900;cursor:pointer;text-decoration:underline;text-decoration-color:#A8BDE8;text-underline-offset:3px}.yev-name-btn:hover{color:#1E4FD7}
      #yevTrendModal{position:fixed;inset:0;z-index:1600;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(20,36,90,.45);backdrop-filter:blur(3px)}#yevTrendModal.hidden{display:none!important}
      .yev-card{width:min(820px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:20px;padding:20px;box-shadow:0 14px 45px rgba(20,36,90,.25)}
      .yev-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.yev-name{font-size:20px;font-weight:900;color:#14245A}.yev-meta{font-size:11px;color:#7A87A8;margin-top:4px}.yev-actions-top{display:flex;gap:7px;flex-wrap:wrap}
      .yev-entry{margin-top:16px;padding:16px;border:1px solid #E3E8F4;border-radius:16px;background:#FBFCFF}.yev-entry-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}.yev-entry-title{font-size:14px;font-weight:900;color:#14245A}.yev-month{height:36px;border:1px solid #D8DFED;border-radius:10px;padding:0 10px;background:#fff;font:inherit;font-size:12px}
      .yev-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.yev-field label{display:block;font-size:10px;color:#6E7A96;font-weight:800;margin-bottom:5px}.yev-field input{width:100%;height:40px;border:1px solid #D8DFED;border-radius:10px;padding:0 10px;font:inherit;font-weight:850;text-align:center;background:#fff}.yev-save-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}.yev-average{font-size:12px;color:#65718B}.yev-average strong{font-size:18px;color:#1E3278;margin-left:5px}
      .yev-trend-title{font-size:14px;font-weight:900;color:#14245A;margin:18px 0 8px}.yev-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:#526080;margin:8px 0}.yev-dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:4px}.yev-mini{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px}.yev-mini th,.yev-mini td{padding:7px;border-bottom:1px solid #EEF1F7;text-align:center}.yev-mini th:first-child,.yev-mini td:first-child{text-align:left}.yev-empty{padding:28px;text-align:center;color:#8A96B2;font-size:12px}
      @media(max-width:620px){.yev-card{padding:14px}.yev-fields{grid-template-columns:1fr 1fr}.yev-actions-top{width:100%}.yev-actions-top .btn{flex:1}.yev-save-row{align-items:stretch;flex-direction:column}.yev-save-row .btn{width:100%}}
    `;document.head.appendChild(s);
  }

  function decodeVal(v){if(!v||typeof v!=='object')return null;if('stringValue'in v)return v.stringValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return Number(v.doubleValue);if('booleanValue'in v)return v.booleanValue;if('timestampValue'in v)return v.timestampValue;if('nullValue'in v)return null;return null;}
  function decodeDoc(d){const o={id:String(d?.name||'').split('/').pop()};Object.entries(d?.fields||{}).forEach(([k,v])=>o[k]=decodeVal(v));return o;}
  async function runStudentQuery(studentId){
    const token=window.YMS_Auth?.getToken?.();if(!token)throw new Error('로그인이 필요합니다.');
    const q={from:[{collectionId:'monthlyScores'}],where:{fieldFilter:{field:{fieldPath:'studentId'},op:'EQUAL',value:{stringValue:String(studentId)}}}};
    const r=await fetch('https://firestore.googleapis.com/v1/projects/yms-app-bb735/databases/(default)/documents:runQuery',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({structuredQuery:q})});
    if(!r.ok)throw new Error(`월말평가 조회 실패 (HTTP ${r.status})`);
    const rows=(await r.json()).filter(x=>x.document).map(x=>decodeDoc(x.document)).filter(r=>/^\d{4}-\d{2}$/.test(String(r.month||'')));
    const byMonth=new Map();rows.sort((a,b)=>String(a.month).localeCompare(String(b.month))).forEach(r=>byMonth.set(r.month,r));
    return [...byMonth.values()];
  }
  function avgOf(r){const nums=AREAS.map(([k])=>Number(r?.[k])).filter(Number.isFinite);return nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length*10)/10:null;}
  function studentById(id){return (window._allStudents||[]).find(s=>String(s.id)===String(id));}

  function removeOldPanel(){
    document.getElementById('monthlyScorePanel')?.remove();
    document.getElementById('openMonthlyScoresBtn')?.remove();
  }

  function ensureModal(){
    if(document.getElementById('yevTrendModal'))return;
    const m=document.createElement('div');m.id='yevTrendModal';m.className='hidden';
    m.innerHTML=`<div class="yev-card"><div class="yev-top"><div><div id="yevTrendName" class="yev-name">학생</div><div id="yevTrendMeta" class="yev-meta"></div></div><div class="yev-actions-top"><button type="button" class="btn btn-sm btn-outline" id="yevExcel">📥 전체 Excel</button><button type="button" class="btn btn-sm btn-ghost" id="yevClose">닫기</button></div></div><div class="yev-entry"><div class="yev-entry-head"><div class="yev-entry-title">월말평가 입력</div><input type="month" id="yevEditMonth" class="yev-month" value="${nowMonth()}"></div><div class="yev-fields">${AREAS.map(([k,label])=>`<div class="yev-field"><label>${label}</label><input id="yev_${k}" data-area="${k}" type="number" min="0" max="100" step="1" placeholder="0~100"></div>`).join('')}</div><div class="yev-save-row"><div class="yev-average">평균 <strong id="yevEditAvg">-</strong></div><button type="button" class="btn btn-primary" id="yevSaveOne">이 달 점수 저장</button></div></div><div class="yev-trend-title">최근 6개월 추이</div><div id="yevTrendContent"><div class="yev-empty">학생 이름을 눌러주세요.</div></div></div>`;
    m.addEventListener('click',e=>{if(e.target===m)m.classList.add('hidden')});
    document.body.appendChild(m);
    document.getElementById('yevClose').onclick=()=>m.classList.add('hidden');
    document.getElementById('yevEditMonth').onchange=fillEntryForMonth;
    document.querySelectorAll('#yevTrendModal .yev-field input').forEach(i=>i.addEventListener('input',updateEntryAverage));
    document.getElementById('yevSaveOne').onclick=saveOneMonth;
    document.getElementById('yevExcel').onclick=downloadFullExcel;
  }

  function fillEntryForMonth(){
    const month=document.getElementById('yevEditMonth')?.value||nowMonth();
    const r=historyRows.find(x=>String(x.month)===month)||{};
    AREAS.forEach(([k])=>{const el=document.getElementById('yev_'+k);const n=Number(r[k]);if(el)el.value=Number.isFinite(n)?n:'';});
    updateEntryAverage();
  }
  function updateEntryAverage(){
    const nums=AREAS.map(([k])=>document.getElementById('yev_'+k)?.value).filter(v=>v!==''&&Number.isFinite(Number(v))).map(Number);
    const avg=nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length*10)/10:null;
    const el=document.getElementById('yevEditAvg');if(el)el.textContent=avg===null?'-':avg+'점';
  }

  async function saveOneMonth(){
    const s=studentById(activeStudentId);if(!s)return;
    const month=document.getElementById('yevEditMonth')?.value||nowMonth();
    const current=historyRows.find(r=>String(r.month)===month);
    const payload={studentId:String(s.id),studentName:s.name||'',classId:s.classId||'',className:s.className||'',month,updatedAt:new Date().toISOString()};
    AREAS.forEach(([k])=>{const raw=document.getElementById('yev_'+k)?.value||'';payload[k]=raw===''?null:Math.max(0,Math.min(100,Number(raw)));});
    const nums=AREAS.map(([k])=>payload[k]).filter(Number.isFinite);payload.score=nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length*10)/10:null;
    if(!nums.length){window.YMS_UI?.toast?.('⚠️ 점수를 하나 이상 입력해 주세요.');return;}
    const btn=document.getElementById('yevSaveOne');btn.disabled=true;
    try{
      const r=await _tFetch(current?.id?`tables/monthlyScores/${encodeURIComponent(current.id)}`:'tables/monthlyScores',{method:current?.id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,...(!current?.id?{createdAt:new Date().toISOString()}: {})})});
      if(!r.ok)throw new Error(`저장 실패 (HTTP ${r.status})`);
      window.YMS_UI?.toast?.('✅ 월말평가 점수를 저장했습니다.');
      historyRows=await runStudentQuery(activeStudentId);fillEntryForMonth();renderTrend();
    }catch(e){console.error('[Class Note] monthly evaluation save',e);window.YMS_UI?.toast?.('❌ '+(e?.message||'저장 실패'));}
    finally{btn.disabled=false;}
  }

  function trendSvg(rows){
    const W=700,H=320,L=46,R=18,T=22,B=45,innerW=W-L-R,innerH=H-T-B;const colors=['#315FD5','#22A06B','#E59A24','#8C5BD6'];const xs=rows.map((_,i)=>L+(rows.length===1?innerW/2:i*innerW/(rows.length-1)));const y=n=>T+(100-Number(n))*innerH/100;let svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="최근 6개월 월말평가 그래프" style="background:#FBFCFF;border:1px solid #E7EBF4;border-radius:14px">`;
    [0,25,50,75,100].forEach(v=>{const yy=y(v);svg+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#E5EAF3"/><text x="${L-7}" y="${yy+4}" text-anchor="end" font-size="10" fill="#7A87A8">${v}</text>`});
    rows.forEach((r,i)=>svg+=`<text x="${xs[i]}" y="${H-16}" text-anchor="middle" font-size="10" fill="#65718B">${esc(String(r.month||'').slice(2).replace('-','.'))}</text>`);
    AREAS.forEach(([k],ai)=>{const valid=rows.map((r,i)=>Number.isFinite(Number(r[k]))?{x:xs[i],y:y(r[k])}:null);let seg=[];valid.forEach((p,i)=>{if(p)seg.push(`${p.x},${p.y}`);if((!p||i===valid.length-1)&&seg.length){if(seg.length>1)svg+=`<polyline points="${seg.join(' ')}" fill="none" stroke="${colors[ai]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;seg=[];}});valid.forEach(p=>{if(p)svg+=`<circle cx="${p.x}" cy="${p.y}" r="4" fill="${colors[ai]}"/>`;});});
    return svg+'</svg>';
  }
  function renderTrend(){
    const content=document.getElementById('yevTrendContent');if(!content)return;
    const rows=historyRows.slice(-6);if(!rows.length){content.innerHTML='<div class="yev-empty">아직 월말평가 기록이 없습니다.</div>';return;}
    const colors=['#315FD5','#22A06B','#E59A24','#8C5BD6'];
    content.innerHTML=`<div class="yev-legend">${AREAS.map((a,i)=>`<span><span class="yev-dot" style="background:${colors[i]}"></span>${a[1]}</span>`).join('')}</div>${trendSvg(rows)}<table class="yev-mini"><thead><tr><th>월</th>${AREAS.map(a=>`<th>${a[1]}</th>`).join('')}<th>평균</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.month)}</td>${AREAS.map(([k])=>`<td>${Number.isFinite(Number(r[k]))?Number(r[k]):'-'}</td>`).join('')}<td>${avgOf(r)??'-'}</td></tr>`).join('')}</tbody></table>`;
  }

  function xmlEsc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function downloadFullExcel(){
    const s=studentById(activeStudentId);if(!s)return;
    if(!historyRows.length){window.YMS_UI?.toast?.('저장된 월말평가 기록이 없습니다.');return;}
    const header=['월','듣기','독해','어휘','문법','평균','반'];
    const rows=historyRows.map(r=>[r.month,...AREAS.map(([k])=>Number.isFinite(Number(r[k]))?Number(r[k]):''),avgOf(r)??'',r.className||'']);
    const all=[header,...rows];
    const table=all.map((row,ri)=>`<Row>${row.map(v=>`<Cell><Data ss:Type="${typeof v==='number'?'Number':'String'}">${xmlEsc(v)}</Data></Cell>`).join('')}</Row>`).join('');
    const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="월말평가"><Table>${table}</Table></Worksheet></Workbook>`;
    const blob=new Blob(['\ufeff'+xml],{type:'application/vnd.ms-excel;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${String(s.name||'학생').replace(/[\\/:*?"<>|]/g,'')}_월말평가_전체.xls`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  window.YMS_openEvalTrend=async function(studentId){
    ensureModal();activeStudentId=String(studentId||'');const s=studentById(activeStudentId);if(!s)return;
    document.getElementById('yevTrendName').textContent=s.name||'학생';document.getElementById('yevTrendMeta').textContent=`${s.grade||'-'} · ${s.schoolName||'-'} · ${s.className||'반 미지정'}`;
    document.getElementById('yevEditMonth').value=nowMonth();document.getElementById('yevTrendContent').innerHTML='<div class="yev-empty">불러오는 중...</div>';document.getElementById('yevTrendModal').classList.remove('hidden');
    try{historyRows=await runStudentQuery(activeStudentId);fillEntryForMonth();renderTrend();}catch(e){historyRows=[];fillEntryForMonth();document.getElementById('yevTrendContent').innerHTML=`<div class="yev-empty" style="color:#C62828">${esc(e.message)}</div>`;}
  };

  function rowStudentId(tr){
    const btn=tr.querySelector('button[onclick*="openStudentOverview"],button[onclick*="openEditStudent"]');const raw=btn?.getAttribute('onclick')||'';const m=raw.match(/(?:openStudentOverview|openEditStudent)\(['"]([^'"]+)/);return m?.[1]||'';
  }
  function enhanceStudentNames(){
    const body=document.getElementById('studentTableBody');if(!body)return;
    body.querySelectorAll('tr').forEach(tr=>{const first=tr.querySelector('td:first-child');if(!first||first.querySelector('.yev-name-btn'))return;const strong=first.querySelector('strong');if(!strong)return;const sid=rowStudentId(tr);if(!sid)return;const b=document.createElement('button');b.type='button';b.className='yev-name-btn';b.textContent=strong.textContent.trim();b.onclick=()=>window.YMS_openEvalTrend(sid);strong.replaceWith(b);});
  }
  function patchStudentRender(){const old=window.renderStudentTable;if(typeof old==='function'&&!old.__yevPatched){const f=function(){const r=old.apply(this,arguments);setTimeout(enhanceStudentNames,0);return r};f.__yevPatched=true;window.renderStudentTable=f;}}
  const obs=new MutationObserver(()=>enhanceStudentNames());
  function init(){style();removeOldPanel();ensureModal();patchStudentRender();const body=document.getElementById('studentTableBody');if(body)obs.observe(body,{childList:true,subtree:true});enhanceStudentNames();setTimeout(removeOldPanel,500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();window.addEventListener('load',()=>setTimeout(init,400),{once:true});
})();
