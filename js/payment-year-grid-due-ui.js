/* YMS annual tuition grid — due day column + sticky student name */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  const STYLE_ID='yms-year-grid-due-ui-style';

  function installStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #section-payments .yp-table th.name,
      #section-payments .yp-table td.name{
        position:sticky !important;
        left:0 !important;
      }
      #section-payments .yp-table th.name{
        z-index:20 !important;
        background:#163CA9 !important;
        box-shadow:3px 0 6px rgba(20,36,90,.14);
      }
      #section-payments .yp-table td.name{
        z-index:10 !important;
        background:#fff !important;
        box-shadow:3px 0 6px rgba(20,36,90,.08);
      }
      #section-payments .yp-table th.yp-due-head{
        min-width:76px;
      }
      #section-payments .yp-table td.yp-due-cell{
        min-width:76px;
        text-align:center;
        white-space:nowrap;
        font-weight:800;
        color:#1E3278;
        background:#F8FAFE;
      }
    `;
    document.head.appendChild(s);
  }

  function getStudents(){
    try{
      if(typeof _allStudents!=='undefined' && Array.isArray(_allStudents)) return _allStudents;
    }catch{}
    return [];
  }

  function dueLabelByName(name){
    const list=getStudents();
    const matches=list.filter(s=>String(s?.name||'').trim()===String(name||'').trim());
    if(!matches.length) return '-';
    const s=matches[0];
    const d=Number(s?.tuitionDueDay||0);
    return d>=1&&d<=31 ? `매월 ${d}일` : '-';
  }

  function enhance(){
    installStyle();
    const table=document.querySelector('#section-payments .yp-table');
    if(!table) return;
    const headRow=table.querySelector('thead tr');
    if(headRow && !headRow.querySelector('.yp-due-head')){
      const th=document.createElement('th');
      th.className='info yp-due-head';
      th.textContent='납부일';
      const baseTh=headRow.children[3];
      if(baseTh) headRow.insertBefore(th,baseTh);
      else headRow.appendChild(th);
    }

    table.querySelectorAll('tbody tr').forEach(tr=>{
      if(tr.querySelector('.yp-empty')){
        const empty=tr.querySelector('.yp-empty');
        const span=Number(empty.getAttribute('colspan')||0);
        if(span>0 && !empty.dataset.dueSpan){
          empty.setAttribute('colspan',String(span+1));
          empty.dataset.dueSpan='1';
        }
        return;
      }
      if(tr.querySelector('.yp-due-cell')) return;
      const nameCell=tr.querySelector('td.name');
      if(!nameCell) return;
      const td=document.createElement('td');
      td.className='info yp-due-cell';
      const name=(nameCell.textContent||'').trim();
      td.textContent=dueLabelByName(name);
      const baseTd=tr.children[3];
      if(baseTd) tr.insertBefore(td,baseTd);
      else tr.appendChild(td);
    });
  }

  function loadPaymentGuide(){
    if(document.querySelector('script[data-yms-payment-guide]')) return;
    const s=document.createElement('script');
    s.src='js/admin-payment-guide-type.js?v=4.27.13';
    s.dataset.ymsPaymentGuide='1';
    document.body.appendChild(s);
  }

  let scheduled=false;
  function schedule(){
    if(scheduled) return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;enhance();});
  }

  const observer=new MutationObserver(schedule);
  function start(){
    installStyle();
    loadPaymentGuide();
    const sec=document.getElementById('section-payments');
    if(sec) observer.observe(sec,{childList:true,subtree:true});
    schedule();
    setTimeout(schedule,150);
    setTimeout(schedule,500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
  else start();
  window.addEventListener('load',()=>setTimeout(schedule,300));
})();
