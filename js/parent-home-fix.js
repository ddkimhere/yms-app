/* YMS parent home compatibility + mobile UI */
(function(){
  'use strict';

  window.YMS_UI = window.YMS_UI || {};
  if (!window.YMS_UI.renderEmpty) {
    window.YMS_UI.renderEmpty = message => `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-msg">${String(message||'내용이 없습니다')}</div></div>`;
  }
  if (!window.YMS_UI.subjectEmoji) {
    window.YMS_UI.subjectEmoji = subject => {
      const s=String(subject||'').toLowerCase();
      if(s.includes('영어')||s.includes('english')) return '🔤';
      if(s.includes('수학')||s.includes('math')) return '➗';
      if(s.includes('독서')||s.includes('reading')) return '📚';
      return '📖';
    };
  }

  window.YMS_Date = window.YMS_Date || {
    dueLabel(value){if(!value)return '-';const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value).slice(0,10);const diff=Math.ceil((d-Date.now())/86400000);if(diff<0)return '마감';if(diff===0)return '오늘 마감';if(diff===1)return '내일 마감';return `${d.getMonth()+1}/${d.getDate()} 마감`;},
    fromNow(value){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return '';const days=Math.floor((Date.now()-d.getTime())/86400000);if(days<=0)return '오늘';if(days===1)return '어제';if(days<7)return `${days}일 전`;return `${d.getMonth()+1}/${d.getDate()}`;}
  };

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function syncParentIdentity(){
    if(!location.pathname.endsWith('/parent-home.html')) return;
    const current=window.YMS_Auth?.getUser?.();
    if(!current) return;
    if(String(current.role||'').toUpperCase()!=='PARENT'){
      location.replace('login.html');
      return;
    }
    const greet=document.getElementById('greetName');
    if(greet) greet.textContent=`안녕하세요, ${current.name||'학부모'}님 👋`;
  }

  if (!window.renderHomeworkItem) {
    window.renderHomeworkItem=function(hw,onClick){
      const item=document.createElement('button');item.type='button';item.className='parent-list-item';
      item.innerHTML=`<div class="parent-list-icon">${window.YMS_UI.subjectEmoji(hw.subject)}</div><div class="parent-list-main"><div class="parent-list-title">${escapeHtml(hw.title||'숙제')}</div><div class="parent-list-meta">${escapeHtml(hw.className||'')} ${hw.dueAt?'· '+window.YMS_Date.dueLabel(hw.dueAt):''}</div></div><div class="parent-list-arrow">›</div>`;
      item.addEventListener('click',()=>onClick&&onClick(hw));return item;
    };
  }
  if (!window.renderNoticeItem) {
    window.renderNoticeItem=function(n,onClick){
      const item=document.createElement('button');item.type='button';item.className='parent-list-item';
      item.innerHTML=`<div class="parent-list-icon">📢</div><div class="parent-list-main"><div class="parent-list-title">${escapeHtml(n.title||'공지사항')}</div><div class="parent-list-meta">${escapeHtml(n.authorName||'YMS')} ${n.publishedAt?'· '+window.YMS_Date.fromNow(n.publishedAt):''}</div></div><div class="parent-list-arrow">›</div>`;
      item.addEventListener('click',()=>onClick&&onClick(n));return item;
    };
  }

  window.ymsRenderTabBar=function(active){
    const bar=document.getElementById('tabBar');if(!bar)return;
    const tabs=[['parent-home.html','⌂','홈'],['homework.html','▣','숙제'],['notices.html','●','공지'],['parent-payment.html','💳','수강료'],['counseling.html','💬','상담']];
    bar.innerHTML=tabs.map(([href,icon,label])=>`<button type="button" class="parent-tab ${active===href?'active':''}" onclick="_ymsGo('${href}')"><span>${icon}</span><small>${label}</small></button>`).join('');
  };

  const baseFetch=window._tFetch;
  if(baseFetch){
    window._tFetch=async function(path,opt={}){
      const u=window.YMS_Auth?.getUser?.();
      const role=String(u?.role||'').toUpperCase();
      if(role==='PARENT' && /^tables\/students\?/.test(String(path||''))){
        const raw=u?.childIds;
        const ids=Array.isArray(raw)?raw:(raw||'').split(',').map(v=>v.trim()).filter(Boolean);
        const rows=[];
        for(const id of ids){
          const r=await baseFetch(`tables/students/${encodeURIComponent(id)}`,opt);
          if(r.ok){const s=await r.json();if(s)rows.push(s);}
        }
        return {ok:true,status:200,json:async()=>({data:rows,total:rows.length}),text:async()=>JSON.stringify({data:rows,total:rows.length})};
      }
      if(role==='PARENT' && /^tables\/users\?/.test(String(path||''))){
        return {ok:true,status:200,json:async()=>({data:u?[u]:[],total:u?1:0}),text:async()=>JSON.stringify({data:u?[u]:[],total:u?1:0})};
      }
      return baseFetch(path,opt);
    };
  }

  const css=document.createElement('style');
  css.textContent=`
    body{background:#F4F7FD!important}.app-wrapper{max-width:560px!important;margin:0 auto!important;background:#F4F7FD!important;min-height:100vh!important;padding-bottom:86px!important}
    .app-bar{height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:#fff;border-bottom:1px solid #E3E8F4;position:sticky;top:0;z-index:50}.app-bar-title{font-size:18px;font-weight:900;color:#14245A;letter-spacing:-.4px}.app-bar-right{display:flex;gap:8px}.icon-btn{width:40px;height:40px;border:0;border-radius:12px;background:#EEF3FB;display:grid;place-items:center;font-size:18px;cursor:pointer}
    .greeting-section{padding:22px 20px 10px}.greeting-name{font-size:23px;font-weight:900;color:#14245A;letter-spacing:-.7px}.greeting-sub{margin-top:6px;font-size:13px;color:#7A87A8}
    .student-selector{display:flex;gap:8px;overflow:auto;padding:8px 20px 12px;scrollbar-width:none}.student-selector::-webkit-scrollbar{display:none}.student-chip{display:flex;align-items:center;gap:7px;white-space:nowrap;padding:8px 12px;border-radius:999px;border:1px solid #D7E0F1;background:#fff;color:#526080;font-size:12px;font-weight:700}.student-chip.active{background:#1E3278;color:#fff;border-color:#1E3278}.chip-avatar{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:#EEF3FB;color:#1E3278;font-weight:900}.student-chip.active .chip-avatar{background:rgba(255,255,255,.18);color:#fff}
    .page-content{padding:4px 16px 20px!important}.section-header{display:flex;justify-content:space-between;align-items:center;margin:18px 2px 9px}.section-title{font-size:15px;font-weight:850;color:#1A2340}.section-more{font-size:12px;color:#4962C8;text-decoration:none;font-weight:700}.card{background:#fff;border:1px solid #E3E8F4;border-radius:18px!important;box-shadow:0 5px 18px rgba(30,50,120,.07)}
    .parent-list-item{width:100%;display:flex;align-items:center;gap:12px;border:0;background:transparent;padding:12px 0;text-align:left;border-bottom:1px solid #EEF1F7;cursor:pointer}.parent-list-item:last-child{border-bottom:0}.parent-list-icon{width:38px;height:38px;border-radius:12px;background:#EEF3FB;display:grid;place-items:center;flex:0 0 auto;font-size:17px}.parent-list-main{min-width:0;flex:1}.parent-list-title{font-size:13px;font-weight:800;color:#1A2340;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.parent-list-meta{font-size:11px;color:#7A87A8;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.parent-list-arrow{font-size:24px;color:#A0ABC2}
    .empty-state{padding:24px 12px;text-align:center;color:#8A96B2}.empty-icon{font-size:28px;margin-bottom:6px}.empty-msg{font-size:12px}.tab-bar{position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:min(100%,560px);height:70px;padding:7px 8px calc(7px + env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,1fr);background:rgba(255,255,255,.97);border-top:1px solid #E3E8F4;z-index:100;backdrop-filter:blur(12px)}.parent-tab{border:0;background:transparent;color:#8A96B2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:18px;font-weight:700}.parent-tab small{font-size:9px}.parent-tab.active{color:#1E3278}
    .modal-overlay{position:fixed;inset:0;background:rgba(20,36,90,.45);z-index:1000;display:flex;align-items:flex-end;justify-content:center}.modal-overlay.hidden{display:none!important}.modal-sheet{width:min(100%,560px);max-height:88vh;overflow:auto;background:#fff;border-radius:24px 24px 0 0;padding:20px}.modal-handle{width:44px;height:4px;background:#D8DFEC;border-radius:99px;margin:0 auto 16px}.modal-title{font-size:18px;font-weight:900;color:#14245A;margin-bottom:16px}.btn{border:0;border-radius:12px;padding:11px 14px;font:inherit;font-weight:750;cursor:pointer}.btn-ghost{background:#F3F6FB;color:#34405F}.btn-full{width:100%}.divider{height:1px;background:#EEF1F7}.mt-12{margin-top:12px}.mt-16{margin-top:16px}.mt-4{margin-top:4px}.chip{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:11px;background:#F0F3F8;color:#53617F}.chip-orange{background:#EEF3FB;color:#1E3278}.chip-gray{background:#F2F4F8;color:#65718B}
    @media(max-width:480px){.greeting-name{font-size:21px}.page-content{padding-left:14px!important;padding-right:14px!important}.app-bar{padding-left:16px;padding-right:16px}}
  `;
  document.head.appendChild(css);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',syncParentIdentity);
  else syncParentIdentity();
  window.addEventListener('pageshow',syncParentIdentity);
})();
