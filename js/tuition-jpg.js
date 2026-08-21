/* YMS tuition JPG exporter */
(function(){
  'use strict';

  const CASH={bank:'카카오뱅크',account:'3333-36-6373135',holder:'김소라'};
  const OTHER={bank:'카카오뱅크',account:'7942-28-56906',holder:'황유진'};
  const QR_SRC='images/dairoom-pay-qr.svg';

  const money=n=>Number(n||0).toLocaleString('ko-KR')+'원';
  const text=(ctx,v,x,y,size=34,weight=500,color='#1A2340',align='left')=>{
    ctx.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,"Noto Sans KR","Segoe UI",sans-serif`;
    ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(String(v??''),x,y);
  };
  const round=(ctx,x,y,w,h,r,fill,stroke)=>{
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
  };
  const loadImg=src=>new Promise((ok,fail)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=fail;i.src=src;});
  const monthLabel=m=>{const s=String(m||'');const p=s.split('-');return p.length===2?`${p[0]}년 ${Number(p[1])}월`:s;};
  const guideType=p=>p.guideType||(p.payMethod==='CASH'?'CASH':'OTHER');

  async function getPayment(id){
    try{
      if(typeof _adminPayList!=='undefined'&&Array.isArray(_adminPayList)){
        const found=_adminPayList.find(p=>String(p.id)===String(id));if(found)return found;
      }
    }catch{}
    const r=await _tFetch(`tables/payments/${encodeURIComponent(id)}`);
    if(!r.ok) throw new Error('수납 정보를 불러오지 못했습니다.');
    return await r.json();
  }

  async function makeJpg(p){
    const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
    ctx.fillStyle='#F4F7FD';ctx.fillRect(0,0,W,H);

    round(ctx,55,50,970,1250,38,'#FFFFFF','#E3E8F4');
    round(ctx,55,50,970,220,38,'#1E3278');
    ctx.fillRect(55,220,970,50);
    text(ctx,'YMS 부송관 영어',110,135,44,800,'#FFFFFF');
    text(ctx,'교육비 납부 안내',110,205,60,900,'#FFFFFF');

    text(ctx,p.studentName||'학생',110,340,48,900,'#14245A');
    text(ctx,`${monthLabel(p.month)} 교육비`,970,335,30,700,'#7492D5','right');
    if(p.className) text(ctx,p.className,110,385,27,600,'#7A87A8');

    round(ctx,95,430,890,345,26,'#F8FAFE','#E3E8F4');
    const base=Number(p.baseAmount??p.tuitionAmount??p.amount??0);
    const extra=Number(p.extraAmount||0);
    const discount=Number(p.discountAmount||0);
    const final=Number(p.amount??Math.max(0,base-discount)+extra);
    text(ctx,'기본 수강료',135,500,30,650,'#65718B'); text(ctx,money(base),935,500,32,750,'#1A2340','right');
    text(ctx,'추가 교육비 / 교재비',135,565,30,650,'#65718B'); text(ctx,money(extra),935,565,32,750,extra?'#1E3278':'#1A2340','right');
    text(ctx,'할인 금액',135,630,30,650,'#65718B'); text(ctx,discount?'- '+money(discount):'0원',935,630,32,750,discount?'#E04040':'#1A2340','right');
    if(p.discountReason) text(ctx,`할인: ${p.discountReason}`,135,675,24,600,'#7A87A8');
    ctx.strokeStyle='#DCE4F3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(135,700);ctx.lineTo(935,700);ctx.stroke();
    text(ctx,'최종 청구합계',135,755,34,800,'#14245A'); text(ctx,money(final),935,755,46,900,'#1E3278','right');

    const type=guideType(p),acct=type==='CASH'?CASH:OTHER;
    text(ctx,type==='CASH'?'현금결제 안내':'그 외 결제 안내',110,835,36,850,'#14245A');
    round(ctx,95,870,890,type==='CASH'?225:320,26,'#EEF3FB');
    text(ctx,acct.bank,135,940,30,750,'#1E3278');
    text(ctx,acct.account,135,1005,42,900,'#14245A');
    text(ctx,`예금주 ${acct.holder}`,135,1060,27,650,'#65718B');

    if(type!=='CASH'){
      try{
        const img=await loadImg(QR_SRC);
        ctx.fillStyle='#FFFFFF';ctx.fillRect(720,900,205,205);ctx.drawImage(img,730,910,185,185);
        text(ctx,'익산 다이로움 결제',822,1130,23,700,'#1E3278','center');
      }catch(e){console.warn('[YMS] QR load failed',e);}
      text(ctx,'계좌이체 또는 다이로움 QR로 결제해 주세요.',135,1155,25,600,'#526080');
    }else{
      text(ctx,'현금결제 대상자는 위 계좌로 입금해 주세요.',135,1125,25,600,'#526080');
    }

    const due=p.dueDate?`납부기한 ${p.dueDate}`:'납부기한은 학원 안내를 확인해 주세요.';
    text(ctx,due,540,1240,24,600,'#8A96B2','center');
    text(ctx,'YMS 부송관 영어 · 문의 063-832-0219',540,1285,23,650,'#8A96B2','center');

    return c.toDataURL('image/jpeg',0.94);
  }

  async function savePayload(p){
    const url=await makeJpg(p),a=document.createElement('a');
    const safe=String(p.studentName||'학생').replace(/[\\/:*?"<>|]/g,'');
    a.href=url;a.download=`${safe}_${String(p.month||'교육비')}_수강료안내.jpg`;document.body.appendChild(a);a.click();a.remove();
  }

  window.downloadTuitionJpg=async function(id){
    try{
      YMS_UI?.toast?.('JPG 안내장을 만들고 있습니다…');
      const p=await getPayment(id);await savePayload(p);
      YMS_UI?.toast?.('JPG 안내장이 저장되었습니다.');
    }catch(e){console.error('[YMS] tuition jpg',e);YMS_UI?.toast?.('❌ '+(e?.message||'JPG 저장 실패'));}
  };

  window.downloadTuitionJpgPayload=async function(payload){
    try{
      YMS_UI?.toast?.('JPG 안내장을 만들고 있습니다…');
      await savePayload(payload||{});
      YMS_UI?.toast?.('JPG 안내장이 저장되었습니다.');
    }catch(e){console.error('[YMS] tuition jpg payload',e);YMS_UI?.toast?.('❌ '+(e?.message||'JPG 저장 실패'));}
  };

  function addButtons(){
    const body=document.getElementById('payTableBody');if(!body)return;
    body.querySelectorAll('tr').forEach(row=>{
      if(row.querySelector('.tuition-jpg-btn'))return;
      const action=[...row.querySelectorAll('button[onclick]')].find(b=>/adminMark(Paid|Unpaid)\(/.test(b.getAttribute('onclick')||''));
      if(!action)return;
      const m=(action.getAttribute('onclick')||'').match(/adminMark(?:Paid|Unpaid)\('([^']+)'/);if(!m)return;
      const btn=document.createElement('button');btn.type='button';btn.className='tuition-jpg-btn';btn.textContent='🖼 JPG';
      btn.style='margin-left:5px;padding:4px 10px;background:#1E3278;color:#fff;border:0;border-radius:9999px;font-size:11px;font-weight:700;cursor:pointer;';
      btn.onclick=()=>window.downloadTuitionJpg(m[1]);action.parentElement?.appendChild(btn);
    });
  }

  const old=window.renderPayTable;
  if(typeof old==='function')window.renderPayTable=function(){const r=old.apply(this,arguments);setTimeout(addButtons,0);return r;};
  const obs=new MutationObserver(()=>addButtons());
  function start(){const b=document.getElementById('payTableBody');if(b){obs.observe(b,{childList:true,subtree:true});addButtons();}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.addEventListener('load',()=>setTimeout(start,500));
})();
