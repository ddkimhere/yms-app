/* YMS teacher home actions + lightweight ordering */
(function(){
  'use strict';
  const u=window.YMS_Auth?.getUser?.();
  const isTeacher=!!u&&(String(u.role||'').toUpperCase()==='TEACHER'||window.YMS_Auth?.hasRole?.('TEACHER',u));
  if(!isTeacher||!(location.pathname||'').endsWith('/teacher-home.html'))return;

  if(!document.getElementById('yms-teacher-att-modal-fix-style')){
    const s=document.createElement('style');
    s.id='yms-teacher-att-modal-fix-style';
    s.textContent=`
      body.yms-att-modal-open #teacherMobileNav{display:none!important}
      body.yms-att-modal-open{overflow:hidden!important;padding-bottom:0!important}
      #attModal{z-index:100001!important}
      #attModal .modal-sheet{max-height:calc(100dvh - 12px)!important;overflow-y:auto!important;overscroll-behavior:contain!important;padding-bottom:calc(24px + env(safe-area-inset-bottom))!important}
      #attModalDate{margin:-4px 0 8px;padding:8px 10px;border-radius:10px;background:#F4F7FD;color:#526080;font-size:12px;font-weight:800}
      @media(max-width:700px){
        #attModal{align-items:flex-end!important;padding:0!important}
        #attModal .modal-sheet{width:100%!important;max-width:560px!important;border-radius:24px 24px 0 0!important}
      }
    `;
    document.head.appendChild(s);
  }

  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  function gradeKey(cls){
    const s=[cls?.grade,cls?.className,cls?.name,cls?.levelCode].filter(Boolean).join(' ');
    let m;
    m=s.match(/초중학교\s*([4-6])\s*(?:학년)?/i); if(m)return 100+Number(m[1]);
    m=s.match(/(?:초등학교|초등|초)\s*([1-6])\s*(?:학년)?/i); if(m)return 100+Number(m[1]);
    m=s.match(/(?:중학교|중등|중)\s*([1-3])\s*(?:학년)?/i); if(m)return 200+Number(m[1]);
    m=s.match(/(?:고등학교|고등|고)\s*([1-3])\s*(?:학년)?/i); if(m)return 300+Number(m[1]);
    return 999;
  }
  function sortTeacherClasses(){
    try{
      if(typeof _myClasses==='undefined'||!Array.isArray(_myClasses)||_myClasses.length<2)return;
      _myClasses.sort((a,b)=>gradeKey(a)-gradeKey(b)||clean(a?.className||a?.name).localeCompare(clean(b?.className||b?.name),'ko',{numeric:true,sensitivity:'base'}));
    }catch{}
  }

  function formatToday(){
    const d=new Date();
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `📅 ${y}. ${m}. ${day}.`;
  }

  function ensureAttDate(){
    const modal=document.getElementById('attModal');
    if(!modal)return;
    let el=document.getElementById('attModalDate');
    if(!el){
      el=document.createElement('div');el.id='attModalDate';
      const label=document.getElementById('attModalClassLabel');
      if(label)label.before(el);
      else modal.querySelector('.modal-title')?.after(el);
    }
    el.textContent=formatToday();
  }

  function syncAttModal(){
    const modal=document.getElementById('attModal');
    const open=!!modal&&!modal.classList.contains('hidden');
    const bodyOpen=document.body.classList.contains('yms-att-modal-open');
    if(open!==bodyOpen) document.body.classList.toggle('yms-att-modal-open',open);
    if(open) ensureAttDate();
  }

  function classIdFrom(btn){
    const raw=btn?.getAttribute('onclick')||'';
    const m=raw.match(/(?:showAttModal|showHwRegModal)\(['"]([^'"]*)['"]\)/);
    if(m)return m[1];
    return btn?.dataset?.classId||'';
  }

  function run(btn){
    if(!btn||!btn.closest('.class-actions'))return false;
    const text=String(btn.textContent||'');
    const cid=classIdFrom(btn);
    try{
      if(text.includes('출결')){
        if(typeof showAttModal==='function'){
          showAttModal(cid);
          requestAnimationFrame(syncAttModal);
          return true;
        }
        location.href='attendance.html?mode=teacher';return true;
      }
      if(text.includes('숙제')){
        if(typeof showHwRegModal==='function'){showHwRegModal(cid);return true;}
        location.href='homework.html?mode=teacher';return true;
      }
    }catch(e){
      console.error('[YMS] 선생님 홈 빠른 버튼 오류',e);
      location.href=text.includes('출결')?'attendance.html?mode=teacher':'homework.html?mode=teacher';
      return true;
    }
    return false;
  }

  document.addEventListener('click',function(e){
    const btn=e.target?.closest?.('.class-actions button');
    if(btn){
      e.preventDefault();e.stopImmediatePropagation();run(btn);return;
    }

    const quick=e.target?.closest?.('.teacher-quick-nav a');
    if(quick&&/attendance\.html(?:$|[?#])/.test(quick.getAttribute('href')||'')){
      e.preventDefault();e.stopImmediatePropagation();location.href='attendance.html?mode=teacher';return;
    }

    const widget=e.target?.closest?.('#ymsHomeWidgets .yms-widget-card');
    if(widget&&String(widget.querySelector('.yms-widget-label')?.textContent||'').includes('출결')){
      e.preventDefault();e.stopImmediatePropagation();location.href='attendance.html?mode=teacher';return;
    }

    if(e.target?.closest?.('#attModal')) setTimeout(syncAttModal,0);
  },true);

  function normalize(){
    document.getElementById('adminShortcut')?.remove();
    document.querySelectorAll('.class-actions button').forEach(btn=>{
      const cid=classIdFrom(btn);
      if(cid)btn.dataset.classId=cid;
      btn.removeAttribute('onclick');
    });
    document.querySelectorAll('.teacher-quick-nav a[href^="attendance.html"]').forEach(a=>a.href='attendance.html?mode=teacher');
    document.querySelectorAll('.teacher-quick-nav a[href^="homework.html"]').forEach(a=>a.href='homework.html?mode=teacher');
    syncAttModal();
  }

  // teacher-home.html already loads and scopes classes/students itself. Wrap its
  // single render so ordering happens before cards are painted, with no polling,
  // extra Firestore read, MutationObserver, or second render.
  const baseRender=typeof window.renderTeacherHome==='function'?window.renderTeacherHome:null;
  if(baseRender&&!baseRender.__ymsTeacherOrdered){
    const wrapped=function(){sortTeacherClasses();const r=baseRender.apply(this,arguments);normalize();return r;};
    wrapped.__ymsTeacherOrdered=true;
    window.renderTeacherHome=wrapped;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(normalize,0),{once:true});
  else setTimeout(normalize,0);
  window.addEventListener('load',()=>setTimeout(normalize,120),{once:true});
})();
