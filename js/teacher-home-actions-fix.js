/* YMS teacher home class action click hard-fix */
(function(){
  'use strict';
  const u=window.YMS_Auth?.getUser?.();
  const isTeacher=!!u&&(String(u.role||'').toUpperCase()==='TEACHER'||String(u.role||'').toUpperCase()==='ADMIN'||window.YMS_Auth?.hasRole?.('TEACHER',u));
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
    document.body.classList.toggle('yms-att-modal-open',open);
    if(open){
      ensureAttDate();
      const sheet=modal.querySelector('.modal-sheet');
      if(sheet&&sheet.scrollTop<0)sheet.scrollTop=0;
    }
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
          showAttModal(cid);setTimeout(syncAttModal,0);return true;
        }
        location.href='attendance.html?mode=teacher';return true;
      }
      if(text.includes('숙제')){
        if(typeof showHwRegModal==='function'){showHwRegModal(cid);return true;}
        location.href='homework.html';return true;
      }
    }catch(e){
      console.error('[YMS] 선생님 홈 빠른 버튼 오류',e);
      if(text.includes('출결')) location.href='attendance.html?mode=teacher';
      else if(text.includes('숙제')) location.href='homework.html';
      return true;
    }
    return false;
  }

  document.addEventListener('click',function(e){
    const btn=e.target?.closest?.('.class-actions button');
    if(btn){e.preventDefault();e.stopImmediatePropagation();run(btn);return;}

    const quick=e.target?.closest?.('.teacher-quick-nav a');
    if(quick&&/attendance\.html(?:$|[?#])/.test(quick.getAttribute('href')||'')){
      e.preventDefault();e.stopImmediatePropagation();location.href='attendance.html?mode=teacher';return;
    }

    const widget=e.target?.closest?.('#ymsHomeWidgets .yms-widget-card');
    if(widget&&String(widget.querySelector('.yms-widget-label')?.textContent||'').includes('출결')){
      e.preventDefault();e.stopImmediatePropagation();location.href='attendance.html?mode=teacher';
    }
  },true);

  function normalize(){
    document.querySelectorAll('.class-actions button').forEach(btn=>{
      const cid=classIdFrom(btn);if(cid)btn.dataset.classId=cid;btn.removeAttribute('onclick');
    });
    document.querySelectorAll('.teacher-quick-nav a[href^="attendance.html"]').forEach(a=>a.href='attendance.html?mode=teacher');
    ensureAttDate();syncAttModal();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(normalize,0));
  else setTimeout(normalize,0);
  const observer=new MutationObserver(()=>{normalize();syncAttModal();});
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
