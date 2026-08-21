/* YMS homework monthly calendar: always show homework for selected due date */
(function(){
  'use strict';
  if((location.pathname.split('/').pop()||'')!=='homework.html') return;

  const pad=n=>String(n).padStart(2,'0');
  const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  let selectedDate=dateKey(new Date());
  let viewDate=new Date();
  viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth(),1);

  const dueKey=hw=>{
    const raw=hw?.dueAt||'';
    if(!raw)return '';
    const d=new Date(raw);
    if(Number.isNaN(d.getTime()))return String(raw).slice(0,10);
    return dateKey(d);
  };

  function installStyle(){
    if(document.getElementById('yms-homework-calendar-style'))return;
    const s=document.createElement('style');
    s.id='yms-homework-calendar-style';
    s.textContent=`
      .yms-hw-calendar{margin:14px 16px 4px;padding:16px;border:1px solid #E3E8F4;border-radius:20px;background:#fff;box-shadow:0 3px 12px rgba(30,50,120,.05)}
      .yms-hw-cal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
      .yms-hw-cal-title{font-size:17px;font-weight:900;color:#14245A;letter-spacing:-.3px}
      .yms-hw-cal-nav{display:flex;align-items:center;gap:6px}
      .yms-hw-cal-btn{width:34px;height:34px;border:0;border-radius:10px;background:#EEF3FB;color:#1E3278;font:inherit;font-size:18px;font-weight:900;cursor:pointer}
      .yms-hw-cal-week,.yms-hw-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
      .yms-hw-cal-week{margin-bottom:5px}
      .yms-hw-cal-week span{text-align:center;color:#9AA5BD;font-size:10px;font-weight:800;padding:2px 0}
      .yms-hw-cal-day{position:relative;min-height:43px;border:0;border-radius:12px;background:#F8FAFE;color:#3D4A6B;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
      .yms-hw-cal-day.empty{visibility:hidden;pointer-events:none}
      .yms-hw-cal-day.today{box-shadow:inset 0 0 0 1.5px #A8BDE8;color:#1E3278}
      .yms-hw-cal-day.selected{background:#1E3278;color:#fff}
      .yms-hw-cal-day.has-hw:not(.selected){background:#EEF3FB;color:#1E3278}
      .yms-hw-cal-count{position:absolute;right:5px;top:4px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#7492D5;color:#fff;font-size:9px;line-height:16px;text-align:center}
      .yms-hw-cal-day.selected .yms-hw-cal-count{background:#fff;color:#1E3278}
      .yms-hw-selected{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 20px 0;color:#526080;font-size:12px;font-weight:800}
      .yms-hw-selected strong{color:#14245A}
      @media(max-width:430px){.yms-hw-calendar{margin:12px 12px 4px;padding:14px}.yms-hw-cal-day{min-height:40px}.yms-hw-selected{margin-left:16px;margin-right:16px}}
    `;
    document.head.appendChild(s);
  }

  function selectFirstOfView(){
    selectedDate=`${viewDate.getFullYear()}-${pad(viewDate.getMonth()+1)}-01`;
  }

  function ensureCalendar(){
    let cal=document.getElementById('ymsHomeworkCalendar');
    if(cal)return cal;
    installStyle();
    cal=document.createElement('section');
    cal.id='ymsHomeworkCalendar';
    cal.className='yms-hw-calendar';
    cal.innerHTML=`
      <div class="yms-hw-cal-head">
        <div class="yms-hw-cal-title" id="ymsHwCalTitle"></div>
        <div class="yms-hw-cal-nav">
          <button class="yms-hw-cal-btn" type="button" id="ymsHwPrev" aria-label="이전 달">‹</button>
          <button class="yms-hw-cal-btn" type="button" id="ymsHwNext" aria-label="다음 달">›</button>
        </div>
      </div>
      <div class="yms-hw-cal-week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
      <div class="yms-hw-cal-grid" id="ymsHwCalGrid"></div>`;
    const filter=document.getElementById('filterRow');
    if(filter)filter.insertAdjacentElement('afterend',cal);
    else document.getElementById('hwListWrap')?.before(cal);

    const selected=document.createElement('div');
    selected.id='ymsHwSelectedDate';
    selected.className='yms-hw-selected';
    cal.insertAdjacentElement('afterend',selected);

    document.getElementById('ymsHwPrev').onclick=()=>{
      viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1);
      selectFirstOfView();renderCalendar();renderList();
    };
    document.getElementById('ymsHwNext').onclick=()=>{
      viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1);
      selectFirstOfView();renderCalendar();renderList();
    };
    return cal;
  }

  function source(){
    try{return Array.isArray(allHomework)?allHomework:[];}catch{return Array.isArray(window.allHomework)?window.allHomework:[];}
  }

  function counts(){
    const map=new Map();
    source().forEach(hw=>{const k=dueKey(hw);if(k)map.set(k,(map.get(k)||0)+1);});
    return map;
  }

  function renderCalendar(){
    ensureCalendar();
    const y=viewDate.getFullYear(),m=viewDate.getMonth();
    document.getElementById('ymsHwCalTitle').textContent=`${y}년 ${m+1}월`;
    const first=new Date(y,m,1).getDay();
    const days=new Date(y,m+1,0).getDate();
    const today=dateKey(new Date());
    const map=counts();
    const cells=[];
    for(let i=0;i<first;i++)cells.push('<button class="yms-hw-cal-day empty" type="button"></button>');
    for(let d=1;d<=days;d++){
      const k=`${y}-${pad(m+1)}-${pad(d)}`;
      const count=map.get(k)||0;
      const cls=['yms-hw-cal-day',k===today?'today':'',k===selectedDate?'selected':'',count?'has-hw':''].filter(Boolean).join(' ');
      cells.push(`<button class="${cls}" type="button" data-date="${k}">${d}${count?`<span class="yms-hw-cal-count">${count}</span>`:''}</button>`);
    }
    const grid=document.getElementById('ymsHwCalGrid');
    grid.innerHTML=cells.join('');
    grid.querySelectorAll('[data-date]').forEach(btn=>btn.onclick=()=>{
      selectedDate=btn.dataset.date||selectedDate;
      renderCalendar();renderList();
    });
    const label=document.getElementById('ymsHwSelectedDate');
    if(label) label.innerHTML=`<span><strong>${Number(selectedDate.slice(5,7))}월 ${Number(selectedDate.slice(8,10))}일</strong> 마감 숙제</span><span>${source().filter(hw=>dueKey(hw)===selectedDate).length}개</span>`;
  }

  const baseRender=typeof window.renderHomework==='function'?window.renderHomework:null;
  function renderList(list){
    const src=Array.isArray(list)?list:source();
    const filtered=src.filter(hw=>dueKey(hw)===selectedDate);
    if(baseRender)return baseRender(filtered);
  }

  if(baseRender&&!baseRender.__ymsCalendar){
    const wrapped=function(list){
      ensureCalendar();renderCalendar();
      return renderList(Array.isArray(list)?list:source());
    };
    wrapped.__ymsCalendar=true;
    window.renderHomework=wrapped;
  }

  ensureCalendar();renderCalendar();
  setTimeout(()=>{renderCalendar();renderList();},120);
})();
