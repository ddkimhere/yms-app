/* YMS class ordering: elementary -> middle -> high, grade ascending */
(function(){
  'use strict';

  function gradeKey(value){
    const s=String(value||'').replace(/\s+/g,' ').trim();
    let m;
    m=s.match(/(?:초등학교|초등|초)\s*([1-6])\s*(?:학년)?/i); if(m)return 100+Number(m[1]);
    m=s.match(/(?:중학교|중등|중)\s*([1-3])\s*(?:학년)?/i); if(m)return 200+Number(m[1]);
    m=s.match(/(?:고등학교|고등|고)\s*([1-3])\s*(?:학년)?/i); if(m)return 300+Number(m[1]);
    return 999;
  }

  function classText(c){
    return [c?.grade,c?.className,c?.name,c?.levelCode].filter(Boolean).join(' ');
  }
  function className(c){return String(c?.className||c?.name||'').trim();}
  function compare(a,b){
    const ka=gradeKey(classText(a)),kb=gradeKey(classText(b));
    if(ka!==kb)return ka-kb;
    return className(a).localeCompare(className(b),'ko',{numeric:true,sensitivity:'base'});
  }
  window.YMS_ClassSort={gradeKey,compare,sort:list=>Array.isArray(list)?list.slice().sort(compare):[]};

  function sortGlobalClasses(){
    try{
      if(Array.isArray(window._allClasses)) window._allClasses.sort(compare);
    }catch{}
  }

  function sortSelect(sel){
    if(!sel)return;
    const options=Array.from(sel.options||[]);
    if(options.length<2)return;
    const fixed=options.filter(o=>!o.value||/^—|전체/.test(o.textContent.trim()));
    const movable=options.filter(o=>!fixed.includes(o));
    const current=sel.value;
    movable.sort((a,b)=>{
      const ka=gradeKey(a.textContent),kb=gradeKey(b.textContent);
      if(ka!==kb)return ka-kb;
      return a.textContent.localeCompare(b.textContent,'ko',{numeric:true,sensitivity:'base'});
    });
    [...fixed,...movable].forEach(o=>sel.appendChild(o));
    sel.value=current;
  }

  function findClassForElement(el){
    const list=Array.isArray(window._allClasses)?window._allClasses:[];
    const text=String(el?.textContent||'').replace(/\s+/g,' ').trim();
    const dataId=el?.dataset?.id||el?.dataset?.classId||el?.getAttribute?.('data-class-id')||'';
    if(dataId){
      const byId=list.find(c=>String(c?.id||c?.classId||'')===String(dataId));
      if(byId)return byId;
    }
    return list.find(c=>{
      const n=className(c);
      return n&&text.includes(n);
    })||null;
  }

  function sortContainer(container){
    if(!container)return;
    const kids=Array.from(container.children).filter(el=>el.nodeType===1);
    if(kids.length<2)return;
    kids.sort((a,b)=>{
      const ca=findClassForElement(a),cb=findClassForElement(b);
      const ka=ca?gradeKey(classText(ca)):gradeKey(a.textContent);
      const kb=cb?gradeKey(classText(cb)):gradeKey(b.textContent);
      if(ka!==kb)return ka-kb;
      const na=ca?className(ca):String(a.textContent||'').trim();
      const nb=cb?className(cb):String(b.textContent||'').trim();
      return na.localeCompare(nb,'ko',{numeric:true,sensitivity:'base'});
    }).forEach(el=>container.appendChild(el));
  }

  function apply(){
    sortGlobalClasses();
    document.querySelectorAll('select').forEach(sel=>{
      const hint=((sel.id||'')+' '+(sel.name||'')+' '+(sel.closest('.form-group')?.textContent||'')).toLowerCase();
      if(/class|반 선택|수강 반|담당 반/.test(hint)) sortSelect(sel);
    });
    document.querySelectorAll('.classes-grid,.teacher-class-grid,#classesGrid,#classGrid,#classMgmtGrid,#classesMgmtGrid').forEach(sortContainer);
  }

  const oldPopulate=window._populateAcctClassDropdown;
  if(typeof oldPopulate==='function'&&!oldPopulate.__ymsGradeSort){
    const wrapped=function(){sortGlobalClasses();const r=oldPopulate.apply(this,arguments);setTimeout(apply,0);return r;};
    wrapped.__ymsGradeSort=true;window._populateAcctClassDropdown=wrapped;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  window.addEventListener('load',()=>{apply();setTimeout(apply,250);setTimeout(apply,800);});
  const obs=new MutationObserver(()=>{clearTimeout(window.__ymsClassSortTimer);window.__ymsClassSortTimer=setTimeout(apply,50);});
  if(document.documentElement)obs.observe(document.documentElement,{subtree:true,childList:true});
})();
