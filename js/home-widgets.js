/* YMS role-aware home dashboard widgets */
(function(){
  'use strict';

  const path=location.pathname.split('/').pop()||'';
  const allowed=['admin.html','teacher-home.html','student-home.html','parent-home.html'];
  if(!allowed.includes(path)) return;

  const user=window.YMS_Auth?.getUser?.();
  if(!user) return;

  const role=String(user.role||'').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').trim().toLowerCase();
  const arr=v=>Array.isArray(v)?v:String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
  const today=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;};
  const month=()=>today().slice(0,7);
  // Dashboard data may be slightly stale for a short period; never bypass the shared read cache here.
  const read=async p=>{try{const r=await _tFetch(p);if(!r.ok)return null;const j=await r.json();return Array.isArray(j?.data)?j.data:j;}catch{return null;}};

  function style(){
    if(document.getElementById('yms-home-widget-style'))return;
    const s=document.createElement('style');s.id='yms-home-widget-style';s.textContent=`
      .yms-widget-wrap{margin:18px 0 24px}
      .yms-widget-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:0 2px 10px}
      .yms-widget-title{font-size:15px;font-weight:900;color:#14245A;letter-spacing:-.3px}
      .yms-widget-sub{font-size:10px;color:#8A96B2;margin-top:3px}
      .yms-widget-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .yms-widget-card{appearance:none;-webkit-appearance:none;width:100%;min-width:0;border:1px solid #E3E8F4;border-radius:17px;background:#fff;padding:14px;text-align:left;box-shadow:0 5px 18px rgba(30,50,120,.06);cursor:pointer;font-family:inherit;transition:.15s ease}
      .yms-widget-card:hover{transform:translateY(-1px);border-color:#C8D1E8;box-shadow:0 8px 22px rgba(30,50,120,.10)}
      .yms-widget-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .yms-widget-icon{width:34px;height:34px;border-radius:11px;background:#EEF3FB;display:grid;place-items:center;font-size:16px}
      .yms-widget-arrow{color:#A3AEC4;font-size:18px;line-height:1}
      .yms-widget-value{margin-top:13px;color:#14245A;font-size:22px;font-weight:950;line-height:1;letter-spacing:-.5px}
      .yms-widget-label{margin-top:6px;color:#526080;font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .yms-widget-note{margin-top:3px;color:#9AA5BD;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .yms-widget-card[data-tone="warn"] .yms-widget-icon{background:#FFF5DF}.yms-widget-card[data-tone="warn"] .yms-widget-value{color:#B77700}
      .yms-widget-card[data-tone="good"] .yms-widget-icon{background:#EAF7F1}.yms-widget-card[data-tone="good"] .yms-widget-value{color:#23774F}
      .yms-widget-card[data-tone="alert"] .yms-widget-icon{background:#FFF0F0}.yms-widget-card[data-tone="alert"] .yms-widget-value{color:#C73535}
      @media(max-width:760px){.yms-widget-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.yms-widget-wrap{margin:14px 0 20px}}
    `;document.head.appendChild(s);
  }

  function host(){
    if(path==='teacher-home.html') return document.querySelector('.teacher-main');
    if(path==='parent-home.html') return document.querySelector('.greeting-section')?.parentElement||document.querySelector('.app-wrapper');
    if(path==='student-home.html') return document.querySelector('.greeting-section')?.parentElement||document.querySelector('.app-wrapper');
    if(path==='admin.html') return document.getElementById('section-dashboard');
    return null;
  }

  function insertPoint(h){
    if(path==='teacher-home.html') return h.querySelector('.teacher-hero')?.nextElementSibling||h.firstElementChild;
    if(path==='parent-home.html'||path==='student-home.html') return h.querySelector('.student-selector')?.nextElementSibling||h.querySelector('.page-content');
    if(path==='admin.html') return h.querySelector('.admin-stats-grid')?.nextElementSibling||h.firstElementChild;
    return null;
  }

  function make(){
    const h=host();if(!h||document.getElementById('ymsHomeWidgets'))return null;
    style();
    const wrap=document.createElement('section');wrap.id='ymsHomeWidgets';wrap.className='yms-widget-wrap';
    wrap.innerHTML=`<div class="yms-widget-head"><div><div class="yms-widget-title">오늘 한눈에 보기</div><div class="yms-widget-sub">필요한 항목을 누르면 바로 이동합니다</div></div></div><div class="yms-widget-grid" id="ymsWidgetGrid"></div>`;
    const p=insertPoint(h);
    if(path==='teacher-home.html'&&p) p.before(wrap);
    else if((path==='parent-home.html'||path==='student-home.html')&&p) p.before(wrap);
    else if(path==='admin.html'&&p) p.before(wrap);
    else h.prepend(wrap);
    return wrap;
  }

  function cards(items){
    const grid=document.getElementById('ymsWidgetGrid');if(!grid)return;
    grid.innerHTML=items.map((x,i)=>`<button type="button" class="yms-widget-card" data-tone="${x.tone||''}" data-i="${i}"><div class="yms-widget-top"><div class="yms-widget-icon">${x.icon}</div><div class="yms-widget-arrow">›</div></div><div class="yms-widget-value">${esc(x.value)}</div><div class="yms-widget-label">${esc(x.label)}</div><div class="yms-widget-note">${esc(x.note||'')}</div></button>`).join('');
    grid.querySelectorAll('.yms-widget-card').forEach(b=>b.onclick=()=>{const x=items[Number(b.dataset.i)];if(x?.href)_ymsGo(x.href);});
  }

  async function adminWidgets(){
    const [students,attendance,payments,counseling]=await Promise.all([
      read('tables/students?limit=1000'),read('tables/attendance?limit=1000'),read('tables/payments?limit=1000'),read('tables/counseling?limit=500')
    ]);
    const active=Array.isArray(students)?students.filter(s=>s.isActive!==false).length:'확인';
    const present=Array.isArray(attendance)?attendance.filter(a=>a.date===today()&&(a.status==='PRESENT'||a.status==='LATE')).length:'확인';
    const unpaid=Array.isArray(payments)?payments.filter(p=>String(p.month||p.billingMonth||p.payMonth||'').startsWith(month())&&p.status!=='PAID').length:'확인';
    const pending=Array.isArray(counseling)?counseling.filter(c=>c.status==='PENDING').length:'확인';
    cards([
      {icon:'🎓',value:active,label:'재원생',note:'학생 관리',href:'admin.html#students',tone:'good'},
      {icon:'✅',value:present,label:'오늘 출석',note:'출결 현황',href:'attendance.html',tone:'good'},
      {icon:'💳',value:unpaid,label:'이번 달 미납',note:'수납 관리',href:'admin.html#payments',tone:unpaid&&unpaid!=='확인'?'alert':''},
      {icon:'💬',value:pending,label:'상담 대기',note:'상담 관리',href:'counseling.html',tone:pending&&pending!=='확인'?'warn':''}
    ]);
  }

  async function teacherWidgets(){
    const [classes,homework,counseling,attendance]=await Promise.all([
      read('tables/classes?limit=300'),read('tables/homework?limit=500'),read('tables/counseling?limit=500'),read('tables/attendance?limit=1000')
    ]);
    const uid=String(user.id||user.uid||'');
    const mine=Array.isArray(classes)?classes.filter(c=>c.isActive!==false&&(String(c.teacherId||'')===uid||norm(c.teacherName)===norm(user.name))):[];
    const classIds=new Set(mine.map(c=>String(c.id||''))),classNames=new Set(mine.map(c=>norm(c.className)));
    const hw=Array.isArray(homework)?homework.filter(h=>String(h.teacherId||'')===uid||norm(h.teacherName)===norm(user.name)||classIds.has(String(h.classId||''))||classNames.has(norm(h.className))):null;
    const cs=Array.isArray(counseling)?counseling.filter(c=>(classIds.has(String(c.classId||''))||classNames.has(norm(c.className)))&&c.status==='PENDING'):null;
    const att=Array.isArray(attendance)?attendance.filter(a=>a.date===today()&&(classIds.has(String(a.classId||''))||classNames.has(norm(a.className)))):null;
    cards([
      {icon:'🏫',value:mine.length,label:'담당 반',note:'오늘 수업 확인',href:'teacher-home.html',tone:'good'},
      {icon:'✅',value:att===null?'확인':att.length,label:'오늘 출결 기록',note:'출결 입력/확인',href:'attendance.html',tone:'good'},
      {icon:'📚',value:hw===null?'확인':hw.length,label:'내 숙제',note:'담당 반 숙제',href:'homework.html'},
      {icon:'💬',value:cs===null?'확인':cs.length,label:'상담 대기',note:'내 반 상담',href:'counseling.html',tone:cs?.length?'warn':''}
    ]);
  }

  async function resolveStudent(){
    let sid=user.studentId||user._tableId||'';
    if(sid){const s=await read('tables/students/'+encodeURIComponent(sid));if(s&& !Array.isArray(s))return s;}
    return {id:sid,name:user.name||'',classId:user.classId||'',className:user.className||'',grade:user.grade||''};
  }

  async function studentWidgets(){
    const s=await resolveStudent();
    const [homework,notices]=await Promise.all([read('tables/homework?limit=500'),read('tables/notices?limit=300')]);
    const hw=Array.isArray(homework)?homework.filter(h=>h.isVisible!==false&&(h.targetStudentId?String(h.targetStudentId)===String(s.id):(h.classId?String(h.classId)===String(s.classId):norm(h.className)===norm(s.className)))):[];
    const now=Date.now(),soon=hw.filter(h=>{const t=new Date(h.dueAt||'').getTime();return Number.isFinite(t)&&t>=now&&t-now<=2*86400000;});
    const nt=Array.isArray(notices)?notices.filter(n=>n.isActive!==false&&(n.targetType==='ALL'||!n.targetType||norm(n.targetClassName)===norm(s.className))):[];
    cards([
      {icon:'📚',value:hw.length,label:'내 숙제',note:'전체 숙제 보기',href:'homework.html'},
      {icon:'⏰',value:soon.length,label:'마감 임박',note:'48시간 이내',href:'homework.html',tone:soon.length?'warn':''},
      {icon:'📢',value:nt.length,label:'공지사항',note:'내 반 공지',href:'notices.html'},
      {icon:'💬',value:'바로가기',label:'상담 신청',note:'선생님께 상담 요청',href:'counseling.html'}
    ]);
  }

  async function parentStudent(){
    const ids=arr(user.childIds);if(!ids.length)return null;
    const s=await read('tables/students/'+encodeURIComponent(ids[0]));return s&&!Array.isArray(s)?s:null;
  }

  async function parentWidgets(){
    const s=await parentStudent();
    if(!s){cards([{icon:'🎓',value:'연결 필요',label:'자녀 정보',note:'관리자에게 문의',href:'parent-home.html'}]);return;}
    const [homework,attendance,payments]=await Promise.all([read('tables/homework?limit=500'),read('tables/attendance?limit=1000'),read('tables/payments?limit=500')]);
    const hw=Array.isArray(homework)?homework.filter(h=>h.isVisible!==false&&(h.targetStudentId?String(h.targetStudentId)===String(s.id):(h.classId?String(h.classId)===String(s.classId):norm(h.className)===norm(s.className)))):[];
    const todayAtt=Array.isArray(attendance)?attendance.find(a=>String(a.studentId||'')===String(s.id)&&a.date===today()):null;
    const attLabel=todayAtt?({PRESENT:'출석',LATE:'지각',ABSENT:'결석'}[todayAtt.status]||'확인'):(Array.isArray(attendance)?'미기록':'확인');
    const due=Array.isArray(payments)?payments.filter(p=>String(p.studentId||'')===String(s.id)&&String(p.month||p.billingMonth||p.payMonth||'').startsWith(month())&&p.status!=='PAID').reduce((sum,p)=>sum+Number(p.amount||p.tuitionAmount||0),0):null;
    cards([
      {icon:'✅',value:attLabel,label:'오늘 출석',note:s.name||'자녀',href:'attendance.html',tone:attLabel==='출석'?'good':attLabel==='결석'?'alert':''},
      {icon:'📚',value:hw.length,label:'최근 숙제',note:'자녀 숙제 확인',href:'homework.html'},
      {icon:'💳',value:due===null?'확인':due?`${due.toLocaleString('ko-KR')}원`:'납부 완료',label:'이번 달 원비',note:'수강료/교재비',href:'parent-payment.html',tone:due?'warn':'good'}
    ]);
  }

  async function run(){
    if(!make())return;
    const count=path==='parent-home.html'&&role==='PARENT'?3:4;
    cards(Array.from({length:count},()=>({icon:'•',value:'…',label:'불러오는 중',note:''})));
    if(path==='admin.html'&&role==='ADMIN') return adminWidgets();
    if(path==='teacher-home.html'&&(role==='TEACHER'||window.YMS_Auth?.hasRole?.('TEACHER'))) return teacherWidgets();
    if(path==='student-home.html'&&role==='STUDENT') return studentWidgets();
    if(path==='parent-home.html'&&role==='PARENT') return parentWidgets();
    document.getElementById('ymsHomeWidgets')?.remove();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0));
  else setTimeout(run,0);
})();
