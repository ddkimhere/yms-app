/* Class Note — admin payment grid: education fee excludes all book fees / ReadingN */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;
  const krw=n=>'₩'+Number(n||0).toLocaleString('ko-KR');
  function tuitionOf(s){
    let base=Math.max(0,Number(s?.tuitionCoreAmount||0));
    if(!base){
      base=Math.max(0,Number(s?.tuitionBaseAmount||0));
      // Legacy records sometimes stored ReadingN inside tuitionBaseAmount.
      if(s?.readingNUse===true && !Number(s?.tuitionCoreAmount||0)) base=Math.max(0,base-10000);
    }
    const disc=Math.min(base,Math.max(0,Number(s?.tuitionDiscountAmount||0)));
    return {base,disc,amount:Math.max(0,base-disc)};
  }
  function clean(){
    const body=document.getElementById('ypBody');
    if(!body) return;
    [...body.querySelectorAll('tr')].forEach(row=>{
      const name=(row.cells?.[0]?.textContent||'').trim();
      if(!name) return;
      const s=(window._allStudents||[]).find(x=>String(x.name||'').trim()===name);
      if(!s) return;
      const t=tuitionOf(s);
      row.querySelectorAll('.yp-total').forEach(box=>{
        const strong=box.querySelector('strong');
        if(strong) strong.textContent=krw(t.amount);
        const nodes=[...box.childNodes].filter(n=>n.nodeType===3);
        nodes.forEach(n=>{if(/청구|교재|교육|합계/.test(n.nodeValue||''))n.nodeValue='교육비 ';});
        box.querySelectorAll('*').forEach(el=>{
          if(el===strong) return;
          const txt=(el.textContent||'').trim();
          if(/교재비|ReadingN|리딩앤/.test(txt) && !el.classList.contains('yp-jpg-btn')) el.style.display='none';
        });
      });
    });
    const title=document.querySelector('#section-payments .yp-head > div > div:nth-child(2)');
    if(title) title.textContent='교육비는 순수 수강료만 표시되며, 교재비와 ReadingN은 교재비 내역서에서 별도로 관리됩니다.';
  }
  let queued=false;
  const obs=new MutationObserver(()=>{
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;clean();});
  });
  function start(){
    const sec=document.getElementById('section-payments');if(!sec)return;
    obs.observe(sec,{childList:true,subtree:true});clean();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('load',()=>setTimeout(start,500));
})();
