/* YMS class ordering: elementary -> middle -> high, grade ascending */
(function(){
  'use strict';

  function gradeKey(value){
    const s=String(value||'').replace(/\s+/g,' ');
    let m;
    m=s.match(/(?:초등학교|초등|초)\s*([1-6])\s*(?:학년)?/i); if(m)return 100+Number(m[1]);
    m=s.match(/(?:중학교|중등|중)\s*([1-3])\s*(?:학년)?/i); if(m)return 200+Number(m[1]);
    m=s.match(/(?:고등학교|고등|고)\s*([1-3])\s*(?:학년)?/i); if(m)return 300+Number(m[1]);
    return 999;
  }

  function classText(c){
    return [c?.grade,c?.className,c?.name,c?.levelCode].filter(Boolean).join(' ');
  }
  function compare(a,b){
    const ka=gradeKey(classText(a)),kb=gradeKey(classText(b));
    if(ka!==kb)return ka-kb;
    return String(a?.className||a?.name||'').localeCompare(String(b?.className||b?.name||''),'ko',{numeric:true});
  }
  window.YMS_ClassSort={gradeKey,compare,sort:list=>Array.isArray(list)?list.slice().sort(compare):[]};

  function sortGlobalClasses(){
    try{
      if(Array.isArray(window._allClasses)) window._allClasses.sort(compare);
    }catch{}
  }

  function sortSelect(sel){
    if(!sel||sel.dataset.ymsGradeSorted==='1')return;
    const options=Array.from(sel.options||[]);
    if(options.length<3)return;
    const fixed=options.filter(o=>!o.value||/^—|전체/.test(o.textContent.trim()));
    const movable=options.filter(o=>!fixed.includes(o));
    if(!movable.some(o=>gradeKey(o.textContent)<999))return;
    const current=sel.value;
    movable.sort((a,b)=>{
      const ka=gradeKey(a.textContent),kb=gradeKey(b.textContent);
      if(ka!==kb)return ka-kb;
      return a.textContent.localeCompare(b.textContent,'ko',{numeric:true});
    });
    [...fixed,...movable].forEach(o=>sel.appendChild(o));
    sel.value=current;
    sel.dataset.ymsGradeSorted='1';
  }

  function sortContainer(container){
    if(!container)return;
    const kids=Array.from(container.children).filter(el=>el.nodeType===1);
    if(kids.length<2)return;
    if(!kids.some(el=>gradeKey(el.textContent)<999))return;
    kids.sort((a,b)=>{
      const ka=gradeKey(a.textContent),kb=gradeKey(b.textContent);
      if(ka!==kb)return ka-kb;
      return a.textContent.localeCompare(b.textContent,'ko',{numeric:true});
    }).forEach(el=>container.appendChild(el));
  }

  function apply(){
    sortGlobalClasses();
    document.querySelectorAll('select').forEach(sel=>{
      const hint=((sel.id||'')+' '+(sel.name||'')+' '+(sel.closest('.form-group')?.textContent||'')).toLowerCase();
      if(/class|반 선택|수강 반|담당 반/.test(hint)){
        sel.dataset.ymsGradeSorted='0';
        sortSelect(sel);
      }
    });
    document.querySelectorAll('.classes-grid,.teacher-class-grid,#classesGrid,#classGrid').forEach(sortContainer);
  }

  const oldPopulate=window._populateAcctClassDropdown;
  if(typeof oldPopulate==='function'&&!oldPopulate.__ymsGradeSort){
    const wrapped=function(){sortGlobalClasses();const r=oldPopulate.apply(this,arguments);setTimeout(apply,0);return r;};
    wrapped.__ymsGradeSort=true;window._populateAcctClassDropdown=wrapped;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  window.addEventListener('load',()=>{apply();setTimeout(apply,300);setTimeout(apply,1000);});
  const obs=new MutationObserver(()=>{clearTimeout(window.__ymsClassSortTimer);window.__ymsClassSortTimer=setTimeout(apply,60);});
  if(document.documentElement)obs.observe(document.documentElement,{subtree:true,childList:true});
})();
