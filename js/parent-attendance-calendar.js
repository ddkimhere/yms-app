/* YMS parent/student monthly attendance calendar */
(function(){
  'use strict';
  const me=window.YMS_Auth?.getUser?.();
  const role=String(me?.role||'').toUpperCase();
  if(role!=='PARENT'&&role!=='STUDENT')return;

  let monthRecords=[];
  let selectedDay='';

  function ensureUi(){
    if(document.getElementById('ymsAttCalendar'))return;
    const parent=document.getElementById('parentView');
    const page=parent?.querySelector('.page-content');
    if(!parent||!page)return;
    const style=document.createElement('style');
    style.id='yms-att-calendar-style';
    style.textContent=`
      .yms-att-cal-wrap{margin:0 20px 14px;background:#fff;border:1px solid #E3E8F4;border-radius:18px;padding:14px;box-shadow:0 1px 4px rgba(30,50,120,.06)}
      .yms-att-week,.yms-att-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
      .yms-att-week{margin-bottom:6px}.yms-att-week div{text-align:center;font-size:10px;font-weight:800;color:#8A96B2}
      .yms-att-day{min-height:52px;border:1px solid #EDF0F7;border-radius:11px;background:#fff;padding:6px 4px;text-align:center;cursor:pointer;color:#3D4A6B;font:inherit}
      .yms-att-day.empty{border:0;background:transparent;cursor:default}.yms-att-day.selected{outline:2px solid #1E3278;outline-offset:-1px}.yms-att-num{font-size:12px;font-weight:800}
      .yms-att-dot{width:8px;height:8px;border-radius:50%;margin:5px auto 0}.yms-att-dot.present{background:#2E9E6B}.yms-att-dot.late{background:#E8A020}.yms-att-dot.absent{background:#E04040}
      .yms-att-day.today .yms-att-num{color:#1E3278}.yms-att-legend{display:flex;justify-content:center;gap:14px;margin-top:10px;font-size:10px;color:#6E7A94}.yms-att-legend span::before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;vertical-align:1px}.yms-att-legend .p::before{background:#2E9E6B}.yms-att-legend .l::before{background:#E8A020}.yms-att-legend .a::before{background:#E04040}
    `;
    document.head.appendChild(style);
    const box=document.createElement('div');
    box.className='yms-att-cal-wrap';
    box.innerHTML=`<div class="yms-att-week"><div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div></div><div id="ymsAttCalendar" class="yms-att-grid"></div><div class="yms-att-legend"><span class="p">출석</span><span class="l">지각</span><span class="a">결석</span></div>`;
    page.before(box);
    const title=page.querySelector('.section-title');
    if(title)title.textContent='📋 선택한 날짜';
  }

  function dateKey(r){return String(r?.date||'').slice(0,10)}
  function statusClass(status){return status==='PRESENT'?'present':status==='LATE'?'late':status==='ABSENT'?'absent':''}

  function renderDayDetails(){
    const list=document.getElementById('attRecordList');
    if(!list)return;
    const rows=monthRecords.filter(r=>dateKey(r)===selectedDay);
    list.innerHTML='';
    if(!selectedDay){list.innerHTML=YMS_UI.renderEmpty('달력에서 날짜를 선택해 주세요');return;}
    if(!rows.length){list.innerHTML=YMS_UI.renderEmpty('이 날짜의 출결 기록이 없습니다');return;}
    rows.forEach(r=>{
      const item=document.createElement('div');item.className='att-record-item';
      item.innerHTML=`<div class="att-class-info"><div class="att-class-name">${r.className||'수업'}</div><div class="att-class-time">${r.date}${r.memo?' · '+r.memo:''}</div></div>${YMS_UI.attBadge(r.status)}`;
      list.appendChild(item);
    });
  }

  function renderCalendar(){
    ensureUi();
    const grid=document.getElementById('ymsAttCalendar');if(!grid)return;
    const y=window.currentYear??new Date().getFullYear();
    const m=window.currentMonth??new Date().getMonth();
    const first=new Date(y,m,1).getDay();
    const days=new Date(y,m+1,0).getDate();
    const today=new Date();
    const byDate=new Map();
    monthRecords.forEach(r=>{const k=dateKey(r);if(k&&!byDate.has(k))byDate.set(k,r);});
    if(!selectedDay||!selectedDay.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)){
      const todayKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      selectedDay=(today.getFullYear()===y&&today.getMonth()===m)?todayKey:'';
    }
    let html='';
    for(let i=0;i<first;i++)html+='<div class="yms-att-day empty"></div>';
    for(let d=1;d<=days;d++){
      const key=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const rec=byDate.get(key),cls=statusClass(rec?.status);
      const isToday=today.getFullYear()===y&&today.getMonth()===m&&today.getDate()===d;
      html+=`<button type="button" class="yms-att-day${selectedDay===key?' selected':''}${isToday?' today':''}" data-date="${key}"><div class="yms-att-num">${d}</div>${cls?`<div class="yms-att-dot ${cls}"></div>`:''}</button>`;
    }
    grid.innerHTML=html;
    grid.querySelectorAll('.yms-att-day[data-date]').forEach(btn=>btn.addEventListener('click',()=>{selectedDay=btn.dataset.date;renderCalendar();renderDayDetails();}));
    renderDayDetails();
  }

  const base=window.renderParentRecords;
  if(typeof base==='function'){
    window.renderParentRecords=function(records){
      monthRecords=Array.isArray(records)?records:[];
      document.getElementById('presentCnt').textContent=monthRecords.filter(r=>r.status==='PRESENT').length;
      document.getElementById('lateCnt').textContent=monthRecords.filter(r=>r.status==='LATE').length;
      document.getElementById('absentCnt').textContent=monthRecords.filter(r=>r.status==='ABSENT').length;
      renderCalendar();
    };
  }

  const oldChange=window.changeMonth;
  if(typeof oldChange==='function')window.changeMonth=function(dir){selectedDay='';return oldChange.call(this,dir);};
  window.addEventListener('load',()=>setTimeout(ensureUi,100));
})();
