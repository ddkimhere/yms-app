/* YMS parent billing — mirror admin automatic monthly charge */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/parent-payment.html')) return;

  const currentYm=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
  const startYm=s=>String(s?.startDate||s?.classStartDate||'').slice(0,7);
  const activeFees=(fees,ym)=>fees.filter(f=>String(f.billingMonth||f.month||f.registeredAt||'').slice(0,7)===ym&&String(f.status||'REGISTERED')!=='CANCELLED');
  const feeTotal=(fees,ym)=>activeFees(fees,ym).reduce((sum,f)=>sum+Number(f.amount||0),0);
  const autoTuition=s=>{
    const base=Math.max(0,Number(s?.tuitionBaseAmount||0));
    const discount=Math.min(base,Math.max(0,Number(s?.tuitionDiscountAmount||0)));
    return {base,discount,amount:Math.max(0,base-discount)};
  };
  const esc2=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money2=n=>Number(n||0).toLocaleString('ko-KR')+'원';

  function availableMonths(){
    if(typeof selected==='undefined'||!selected) return [];
    const set=new Set();
    const now=currentYm();
    const start=startYm(selected);
    if(!start||now>=start) set.add(now);
    try{(pays||[]).forEach(p=>{const m=String(p.month||'').slice(0,7);if(m)set.add(m);});}catch{}
    try{(bookFees||[]).forEach(f=>{const m=String(f.billingMonth||f.month||f.registeredAt||'').slice(0,7);if(m)set.add(m);});}catch{}
    return [...set].filter(m=>!start||m>=start).sort().reverse();
  }

  function statusInfo(p){
    if(!p)return {code:'UNPAID',text:'청구중'};
    const code=String(p.status||'UNPAID').toUpperCase();
    return {code,text:{PAID:'납부완료',UNPAID:'미납',OVERDUE:'연체'}[code]||code};
  }

  function renderAuto(){
    const area=document.getElementById('paymentArea');
    if(!area||typeof selected==='undefined'||!selected)return;
    const months=availableMonths();
    if(!months.length){area.innerHTML='<div class="empty">청구된 교육비가 없습니다.</div>';return;}

    const ym=months[0];
    const p=(pays||[]).find(x=>String(x.month||'').slice(0,7)===ym)||null;
    const fees=activeFees(bookFees||[],ym);
    const t=autoTuition(selected);
    const tuitionAmount=p?Number(p.amount||t.amount):t.amount;
    const base=p?Number(p.baseAmount??t.base):t.base;
    const discount=p?Number(p.discountAmount??t.discount):t.discount;
    const bookTotal=feeTotal(bookFees||[],ym);
    const grand=tuitionAmount+bookTotal;
    const st=statusInfo(p);
    const type=p?.guideType||(p?.payMethod==='CASH'?'CASH':'OTHER');
    const cash=typeof CASH!=='undefined'?CASH:{bank:'카카오뱅크',account:'3333-36-6373135',holder:'김소라'};
    const other=typeof OTHER!=='undefined'?OTHER:{bank:'카카오뱅크',account:'7942-28-56906',holder:'황유진'};
    const acct=type==='CASH'?cash:other;
    const discountReason=p?.discountReason||selected.tuitionDiscountReason||'';

    const feeHtml=fees.length?`<div class="bookbox"><div class="booktitle">📘 추가 교육비 / 교재비</div>${fees.map(f=>`<div class="bookrow"><span class="bookname">${esc2(f.bookName||f.itemName||'교육비')}</span><span class="bookamt">${money2(f.amount)}</span></div>`).join('')}</div>`:'';
    const payGuide=grand>0?`<div class="paybox"><div style="font-size:12px;font-weight:800;color:#1E3278">${type==='CASH'?'현금결제 계좌':'결제 안내'}</div><div class="acct">${esc2(acct.bank)} ${esc2(acct.account)}</div><div class="muted">예금주 ${esc2(acct.holder)}</div>${type==='CASH'?'':`<img class="qr" src="images/dairoom-pay-qr.svg" alt="익산 다이로움 결제 QR"><div class="muted" style="text-align:center;font-weight:700;color:#1E3278">익산 다이로움 QR 결제</div>`}</div>`:'';

    area.innerHTML=`<div class="card"><div class="month">${esc2(ym)} 교육비</div><div class="name">${esc2(selected.name)} 학생</div><div class="row"><span class="label">기본 교육비</span><span class="value">${money2(base)}</span></div>${discount?`<div class="row"><span class="label">할인</span><span class="value">${esc2(discountReason||'할인')} · -${money2(discount)}</span></div>`:''}<div class="row"><span class="label">수강료</span><span class="value total">${money2(tuitionAmount)}</span></div>${feeHtml}<div class="grand"><span>청구합계</span><strong>${money2(grand)}</strong></div><div class="row"><span class="label">상태</span><span class="status ${st.code}">${st.text}</span></div>${p?.dueDate?`<div class="row"><span class="label">납부 기한</span><span class="value">${esc2(p.dueDate)}</span></div>`:''}${payGuide}</div>`;
  }

  function install(){
    if(typeof render==='function'&&!render.__ymsAutoParent){
      const f=function(){renderAuto();};
      f.__ymsAutoParent=true;
      try{render=f;}catch{}
    }
    setTimeout(renderAuto,150);
    setTimeout(renderAuto,700);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.addEventListener('load',install);
})();
