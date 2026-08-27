/* YMS admin payment guide type restore — CASH / OTHER */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  let pending=null;
  const original=()=>window.YMS_setMonthPayStatus;

  function ensureStyle(){
    if(document.getElementById('yms-pay-guide-css')) return;
    const s=document.createElement('style');
    s.id='yms-pay-guide-css';
    s.textContent=`
      #ymsPayGuideModal{position:fixed;inset:0;z-index:120000;background:rgba(15,25,55,.45);display:flex;align-items:center;justify-content:center;padding:20px}
      #ymsPayGuideModal.hidden{display:none!important}
      #ymsPayGuideModal .pg-box{width:min(100%,430px);background:#fff;border:1px solid #DCE3F0;border-radius:20px;padding:22px;box-shadow:0 22px 60px rgba(20,36,90,.25)}
      #ymsPayGuideModal .pg-title{font-size:18px;font-weight:900;color:#14245A;margin-bottom:6px}
      #ymsPayGuideModal .pg-sub{font-size:11px;color:#7A87A8;line-height:1.5;margin-bottom:16px}
      #ymsPayGuideModal .pg-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      #ymsPayGuideModal .pg-btn{min-height:74px;border:1.5px solid #C8D1E8;border-radius:14px;background:#fff;color:#26365B;font:inherit;font-size:12px;font-weight:900;cursor:pointer;padding:10px}
      #ymsPayGuideModal .pg-btn:hover{border-color:#7492D5;background:#EEF3FB}
      #ymsPayGuideModal .pg-btn strong{display:block;font-size:14px;margin-bottom:4px;color:#1E3278}
      #ymsPayGuideModal .pg-cancel{width:100%;margin-top:12px;min-height:40px;border:0;border-radius:11px;background:#F1F3F8;color:#68748C;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
      @media(max-width:520px){#ymsPayGuideModal{align-items:flex-end;padding:0}#ymsPayGuideModal .pg-box{border-radius:22px 22px 0 0;padding:20px 16px calc(20px + env(safe-area-inset-bottom))}#ymsPayGuideModal .pg-options{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function ensureModal(){
    if(document.getElementById('ymsPayGuideModal')) return;
    const m=document.createElement('div');
    m.id='ymsPayGuideModal';m.className='hidden';
    m.innerHTML=`<div class="pg-box"><div class="pg-title">결제 방법 선택</div><div class="pg-sub">납입 처리할 결제 안내 방식을 선택하세요.</div><div class="pg-options"><button type="button" class="pg-btn" data-guide="CASH"><strong>💵 현금결제</strong>현금결제 전용 계좌 안내</button><button type="button" class="pg-btn" data-guide="OTHER"><strong>💳 그 외 결제</strong>계좌이체 · 익산 다이로움 QR 포함</button></div><button type="button" class="pg-cancel">취소</button></div>`;
    document.body.appendChild(m);
    m.querySelectorAll('[data-guide]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.guide)));
    m.querySelector('.pg-cancel').addEventListener('click',close);
    m.addEventListener('click',e=>{if(e.target===m)close();});
  }

  function open(args){ensureStyle();ensureModal();pending=args;document.getElementById('ymsPayGuideModal').classList.remove('hidden');}
  function close(){pending=null;document.getElementById('ymsPayGuideModal')?.classList.add('hidden');}

  async function choose(guideType){
    const args=pending;if(!args)return;close();
    const baseFetch=window._tFetch;
    let restored=false;
    const restore=()=>{if(!restored&&window._tFetch===wrapped){restored=true;window._tFetch=baseFetch;}};
    const wrapped=async function(path,opt={}){
      const method=String(opt?.method||'GET').toUpperCase();
      if(String(path).startsWith('tables/payments')&&(method==='POST'||method==='PATCH'||method==='PUT')){
        try{
          const body=typeof opt.body==='string'?JSON.parse(opt.body):(opt.body||{});
          body.guideType=guideType;
          body.payMethod=guideType==='CASH'?'CASH':'OTHER';
          opt={...opt,body:JSON.stringify(body)};
        }catch{}
      }
      return baseFetch(path,opt);
    };
    window._tFetch=wrapped;
    try{await args.fn(...args.callArgs);}
    finally{restore();}
  }

  function install(){
    ensureStyle();ensureModal();
    const fn=original();
    if(typeof fn!=='function'||fn.__ymsGuideWrapped) return false;
    const wrappedStatus=async function(btn,studentId,targetMonth,nextStatus){
      if(nextStatus==='PAID'){
        open({fn,callArgs:[btn,studentId,targetMonth,nextStatus]});
        return;
      }
      return fn(btn,studentId,targetMonth,nextStatus);
    };
    wrappedStatus.__ymsGuideWrapped=true;
    window.YMS_setMonthPayStatus=wrappedStatus;
    return true;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(install,0);setTimeout(install,300);},{once:true});
  else{setTimeout(install,0);setTimeout(install,300);}
  window.addEventListener('load',()=>setTimeout(install,200),{once:true});
})();
