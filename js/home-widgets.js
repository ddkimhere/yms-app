/* YMS role-aware home shortcuts — zero Firestore reads on home load */
(function(){
  'use strict';
  const path=location.pathname.split('/').pop()||'';
  if(!['admin.html','teacher-home.html','student-home.html','parent-home.html'].includes(path))return;
  const user=window.YMS_Auth?.getUser?.();if(!user)return;
  const role=String(user.role||'').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function style(){
    if(document.getElementById('yms-home-widget-style'))return;
    const s=document.createElement('style');s.id='yms-home-widget-style';s.textContent=`
      .yms-widget-wrap{margin:18px 0 24px}.yms-widget-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:0 2px 10px}.yms-widget-title{font-size:15px;font-weight:900;color:#14245A;letter-spacing:-.3px}.yms-widget-sub{font-size:10px;color:#8A96B2;margin-top:3px}.yms-widget-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.yms-widget-card{appearance:none;-webkit-appearance:none;width:100%;min-width:0;border:1px solid #E3E8F4;border-radius:17px;background:#fff;padding:14px;text-align:left;box-shadow:0 5px 18px rgba(30,50,120,.06);cursor:pointer;font-family:inherit;transition:.15s ease}.yms-widget-card:hover{transform:translateY(-1px);border-color:#C8D1E8;box-shadow:0 8px 22px rgba(30,50,120,.10)}.yms-widget-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.yms-widget-icon{width:34px;height:34px;border-radius:11px;background:#EEF3FB;display:grid;place-items:center;font-size:16px}.yms-widget-arrow{color:#A3AEC4;font-size:18px;line-height:1}.yms-widget-value{margin-top:13px;color:#14245A;font-size:14px;font-weight:900;line-height:1.25;letter-spacing:-.3px}.yms-widget-label{margin-top:6px;color:#526080;font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.yms-widget-note{margin-top:3px;color:#9AA5BD;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}@media(max-width:760px){.yms-widget-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.yms-widget-wrap{margin:14px 0 20px}}
    `;document.head.appendChild(s);
  }
  function host(){if(path==='teacher-home.html')return document.querySelector('.teacher-main');if(path==='parent-home.html'||path==='student-home.html')return document.querySelector('.greeting-section')?.parentElement||document.querySelector('.app-wrapper');if(path==='admin.html')return document.getElementById('section-dashboard');return null;}
  function insertPoint(h){if(path==='teacher-home.html')return h.querySelector('.teacher-hero')?.nextElementSibling||h.firstElementChild;if(path==='parent-home.html'||path==='student-home.html')return h.querySelector('.student-selector')?.nextElementSibling||h.querySelector('.page-content');if(path==='admin.html')return h.querySelector('.admin-stats-grid')?.nextElementSibling||h.firstElementChild;return null;}
  function make(){const h=host();if(!h||document.getElementById('ymsHomeWidgets'))return null;style();const wrap=document.createElement('section');wrap.id='ymsHomeWidgets';wrap.className='yms-widget-wrap';wrap.innerHTML='<div class="yms-widget-head"><div><div class="yms-widget-title">빠른 메뉴</div><div class="yms-widget-sub">홈에서는 데이터를 다시 읽지 않고 필요한 화면으로 바로 이동합니다</div></div></div><div class="yms-widget-grid" id="ymsWidgetGrid"></div>';const p=insertPoint(h);if(p)p.before(wrap);else h.prepend(wrap);return wrap;}
  function cards(items){const grid=document.getElementById('ymsWidgetGrid');if(!grid)return;grid.innerHTML=items.map((x,i)=>`<button type="button" class="yms-widget-card" data-i="${i}"><div class="yms-widget-top"><div class="yms-widget-icon">${x.icon}</div><div class="yms-widget-arrow">›</div></div><div class="yms-widget-value">${esc(x.value)}</div><div class="yms-widget-label">${esc(x.label)}</div><div class="yms-widget-note">${esc(x.note||'')}</div></button>`).join('');grid.querySelectorAll('.yms-widget-card').forEach(b=>b.onclick=()=>{const x=items[Number(b.dataset.i)];if(x?.href)_ymsGo(x.href);});}
  function items(){
    if(path==='admin.html'&&role==='ADMIN')return[
      {icon:'🎓',value:'학생 관리',label:'재원생 정보',note:'학생 조회·수정',href:'admin.html#students'},
      {icon:'✅',value:'출결 현황',label:'오늘 출결',note:'전체 반 출결 보기',href:'attendance.html'},
      {icon:'💳',value:'수납 관리',label:'수강료·교재비',note:'납부 현황 확인',href:'admin.html#payments'},
      {icon:'💬',value:'상담 관리',label:'상담 기록',note:'상담 현황 확인',href:'counseling.html'}];
    if(path==='teacher-home.html'&&(role==='TEACHER'||window.YMS_Auth?.hasRole?.('TEACHER')))return[
      {icon:'✅',value:'출결 입력',label:'담당 반 출결',note:'오늘 출결 기록',href:'attendance.html'},
      {icon:'📚',value:'숙제 관리',label:'숙제 등록·확인',note:'반/개별 숙제',href:'homework.html'},
      {icon:'👥',value:'학생 관리',label:'학생 정보',note:'담당 학생 확인',href:'counseling.html'},
      {icon:'📢',value:'공지',label:'반 공지',note:'공지 등록·확인',href:'notices.html'}];
    if(path==='student-home.html'&&role==='STUDENT')return[
      {icon:'📚',value:'숙제',label:'내 숙제',note:'숙제 확인',href:'homework.html'},
      {icon:'📢',value:'공지',label:'공지사항',note:'학원·반 공지',href:'notices.html'},
      {icon:'✅',value:'출석',label:'출결 기록',note:'내 출결 확인',href:'attendance.html'},
      {icon:'📅',value:'일정',label:'캘린더',note:'숙제 마감 일정',href:'calendar.html'}];
    if(path==='parent-home.html'&&role==='PARENT')return[
      {icon:'✅',value:'출석',label:'자녀 출결',note:'월별 출결 확인',href:'attendance.html'},
      {icon:'📚',value:'숙제',label:'자녀 숙제',note:'숙제 확인',href:'homework.html'},
      {icon:'💳',value:'수강료',label:'수납 내역',note:'수강료·교재비',href:'parent-payment.html'},
      {icon:'📢',value:'공지',label:'공지사항',note:'학원 공지 확인',href:'notices.html'}];
    return[];
  }
  function run(){if(!make())return;const list=items();if(list.length)cards(list);else document.getElementById('ymsHomeWidgets')?.remove();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
