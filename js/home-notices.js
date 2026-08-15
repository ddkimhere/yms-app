/* YMS home recent notices: student / teacher / parent */
(function(){
  'use strict';
  const path=location.pathname;
  const isStudent=path.endsWith('/student-home.html');
  const isTeacher=path.endsWith('/teacher-home.html');
  const isParent=path.endsWith('/parent-home.html');
  if(!(isStudent||isTeacher||isParent)||!window._tFetch) return;

  const user=window.YMS_Auth?.getUser?.();
  if(!user) return;
  const csv=v=>Array.isArray(v)?v:String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hasTeacher=String(user.role||'').toUpperCase()==='TEACHER'||window.YMS_Roles?.has?.(user,'TEACHER')||csv(user.roles).map(x=>String(x).toUpperCase()).includes('TEACHER');
  const effectiveRole=isTeacher&&hasTeacher?'TEACHER':isStudent?'STUDENT':isParent?'PARENT':String(user.role||'').toUpperCase();
  let classNames=new Set();

  function installStyle(){
    if(document.getElementById('yms-home-notice-style')) return;
    const s=document.createElement('style');s.id='yms-home-notice-style';s.textContent=`
      .yms-home-notices{margin-top:16px;margin-bottom:22px}
      .yms-home-notice-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 2px 10px}
      .yms-home-notice-title{font-size:16px;font-weight:900;color:#14245A}
      .yms-home-notice-more{border:0;background:none;color:#7492D5;font-size:11px;font-weight:800;text-decoration:none;padding:4px;cursor:pointer}
      .yms-home-notice-card{overflow:hidden;border:1px solid #E3E8F4;border-radius:18px;background:#fff;box-shadow:0 3px 12px rgba(30,50,120,.05)}
      .yms-home-notice-item{width:100%;display:flex;align-items:center;gap:11px;border:0;border-bottom:1px solid #EEF1F7;background:#fff;padding:13px 14px;text-align:left;cursor:pointer;font:inherit}
      .yms-home-notice-item:last-child{border-bottom:0}
      .yms-home-notice-icon{width:34px;height:34px;display:grid;place-items:center;flex:0 0 auto;border-radius:11px;background:#EEF3FB;font-size:16px}
      .yms-home-notice-main{min-width:0;flex:1}
      .yms-home-notice-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#1A2340;font-size:13px;font-weight:850}
      .yms-home-notice-meta{margin-top:4px;color:#8A96B2;font-size:10px;font-weight:650}
      .yms-home-notice-arrow{color:#A0ABC2;font-size:18px}
      .yms-home-notice-empty{padding:20px 14px;text-align:center;color:#8A96B2;font-size:12px}
      .teacher-main>.yms-home-notices{margin-top:0;margin-bottom:28px}
      .teacher-main>.yms-home-notices .yms-home-notice-title{font-size:19px}
      .student-app .yms-home-notices{margin-top:0;margin-bottom:16px}
      .student-app .yms-home-notice-head{margin:4px 2px 10px}
      .student-app .yms-home-notice-title{font-size:15px}
      .app-wrapper .yms-home-notices{margin-top:18px}
      @media(max-width:700px){.teacher-main>.yms-home-notices{margin-bottom:22px}.teacher-main>.yms-home-notices .yms-home-notice-title{font-size:16px}}
    `;document.head.appendChild(s);
  }

  async function loadScope(){
    try{
      if(effectiveRole==='TEACHER'){
        const r=await _tFetch('tables/classes?limit=300',{cache:'no-store'});
        if(r.ok){const rows=(await r.json()).data||[],assigned=csv(user.teacherClasses);rows.filter(c=>String(c.teacherId||'')===String(user.id||user.uid||'')||String(c.teacherName||'')===String(user.name||'')||assigned.includes(String(c.id||''))||assigned.includes(String(c.className||''))).forEach(c=>c.className&&classNames.add(c.className));}
      }else if(effectiveRole==='STUDENT'){
        let s=null;const sid=user.studentId||user._tableId;
        if(sid){const r=await _tFetch('tables/students/'+encodeURIComponent(sid),{cache:'no-store'});if(r.ok)s=await r.json();}
        if(!s){const r=await _tFetch('tables/students?limit=500',{cache:'no-store'});if(r.ok)s=((await r.json()).data||[]).find(x=>String(x.userId||'')===String(user.id||user.uid||'')||String(x.name||'')===String(user.name||''));}
        if(s?.className)classNames.add(s.className);
      }else if(effectiveRole==='PARENT'){
        for(const id of csv(user.childIds)){const r=await _tFetch('tables/students/'+encodeURIComponent(id),{cache:'no-store'});if(r.ok){const s=await r.json();if(s?.className)classNames.add(s.className);}}
      }
    }catch(e){console.warn('[YMS] home notice scope',e)}
  }

  function visible(n){
    if(n.isActive===false) return false;
    const t=String(n.targetType||'ALL').toUpperCase();
    if(t==='ALL') return true;
    if(t==='ROLE') return String(n.targetRole||'').toUpperCase()===effectiveRole;
    if(t==='CLASS') return classNames.has(String(n.targetClassName||''));
    return false;
  }
  function noticeDate(n){const raw=n.publishedAt||n.createdAt||n.updatedAt||'';if(!raw)return'';const d=new Date(raw);if(Number.isNaN(d.getTime()))return String(raw).slice(0,10);return d.toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'});}
  function sortTime(n){const d=new Date(n.publishedAt||n.createdAt||n.updatedAt||0);return Number.isNaN(d.getTime())?0:d.getTime();}

  function ensureArea(){
    if(isParent){
      const old=document.getElementById('noticeList');
      if(old){
        const section=old.closest('.card')?.parentElement;
        if(section) section.dataset.ymsHomeNotice='1';
        return old;
      }
    }
    let wrap=document.getElementById('ymsHomeNoticeSection');
    if(!wrap){
      wrap=document.createElement('section');wrap.id='ymsHomeNoticeSection';wrap.className='yms-home-notices';
      wrap.innerHTML='<div class="yms-home-notice-head"><div class="yms-home-notice-title">📢 공지사항</div><a class="yms-home-notice-more" href="notices.html">전체보기</a></div><div class="yms-home-notice-card"><div id="ymsHomeNoticeList" class="yms-home-notice-empty">공지를 불러오는 중...</div></div>';
      if(isTeacher){const nav=document.querySelector('.teacher-quick-nav');if(nav)nav.insertAdjacentElement('afterend',wrap);else document.querySelector('.teacher-main')?.appendChild(wrap);}
      else if(isStudent){const main=document.querySelector('.student-app main.content');const oldBanner=document.getElementById('unreadNoticeBanner');if(oldBanner)oldBanner.insertAdjacentElement('beforebegin',wrap);else main?.appendChild(wrap);}
    }
    return document.getElementById('ymsHomeNoticeList');
  }

  function render(list){
    const area=ensureArea();if(!area)return;
    const latest=list.filter(visible).sort((a,b)=>sortTime(b)-sortTime(a)).slice(0,3);
    if(!latest.length){area.className='yms-home-notice-empty';area.innerHTML='등록된 공지사항이 없습니다.';return;}
    area.className='';
    area.innerHTML=latest.map(n=>`<button class="yms-home-notice-item" type="button" onclick="location.href='notices.html'"><span class="yms-home-notice-icon">📢</span><span class="yms-home-notice-main"><span class="yms-home-notice-name">${esc(n.title||'공지사항')}</span><span class="yms-home-notice-meta">${noticeDate(n)}${n.authorName?' · '+esc(n.authorName):''}</span></span><span class="yms-home-notice-arrow">›</span></button>`).join('');
    if(isStudent){const old=document.getElementById('unreadNoticeBanner');if(old)old.style.display='none';}
  }

  async function init(){
    installStyle();ensureArea();await loadScope();
    try{const r=await _tFetch('tables/notices?limit=100',{cache:'no-store'});if(!r.ok)throw new Error('notice load');const j=await r.json();render(j.data||[]);}catch(e){const a=ensureArea();if(a){a.className='yms-home-notice-empty';a.textContent='공지사항을 불러오지 못했습니다.';}console.warn('[YMS] home notices',e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
