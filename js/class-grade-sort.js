/* YMS class ordering: elementary -> middle -> high, grade ascending */
(function(){
  'use strict';

  function clean(v){return String(v||'').replace(/\s+/g,' ').trim();}

  function gradeKey(value){
    const s=clean(value);
    let m;

    // Some existing class names use "초중학교 6학년" for elementary grade 6.
    m=s.match(/초중학교\s*([4-6])\s*(?:학년)?/i); if(m)return 100+Number(m[1]);
    m=s.match(/(?:초등학교|초등|초)\s*([1-6])\s*(?:학년)?/i); if(m)return 100+Number(m[1]);
    m=s.match(/(?:중학교|중등|중)\s*([1-3])\s*(?:학년)?/i); if(m)return 200+Number(m[1]);
    m=s.match(/(?:고등학교|고등|고)\s*([1-3])\s*(?:학년)?/i); if(m)return 300+Number(m[1]);

    // Compact grade values such as 초1 / 중2 / 고3.
    m=s.match(/\b초\s*([1-6])\b/i); if(m)return 100+Number(m[1]);
    m=s.match(/\b중\s*([1-3])\b/i); if(m)return 200+Number(m[1]);
    m=s.match(/\b고\s*([1-3])\b/i); if(m)return 300+Number(m[1]);
    return 999;
  }

  function classText(c){return [c?.grade,c?.className,c?.name,c?.levelCode].filter(Boolean).join(' ');}
  function className(c){return clean(c?.className||c?.name||'');}
  function compare(a,b){
    const ka=gradeKey(classText(a)),kb=gradeKey(classText(b));
    if(ka!==kb)return ka-kb;
    return className(a).localeCompare(className(b),'ko',{numeric:true,sensitivity:'base'});
  }
  window.YMS_ClassSort={gradeKey,compare,sort:list=>Array.isArray(list)?list.slice().sort(compare):[]};

  function getKnownClasses(){
    try{
      if(Array.isArray(window._allClasses))return window._allClasses;
      if(typeof _allClasses!=='undefined'&&Array.isArray(_allClasses))return _allClasses;
      if(typeof _myClasses!=='undefined'&&Array.isArray(_myClasses))return _myClasses;
    }catch{}
    return [];
  }

  function sortGlobalClasses(){
    try{
      const list=getKnownClasses();
      if(Array.isArray(list)&&list.length>1)list.sort(compare);
    }catch{}
  }

  function sortSelect(sel){
    if(!sel)return;
    const options=Array.from(sel.options||[]);
    if(options.length<2)return;
    const fixed=options.filter(o=>!o.value||/^—|전체/.test(clean(o.textContent)));
    const movable=options.filter(o=>!fixed.includes(o));
    const before=movable.slice();
    movable.sort((a,b)=>{
      const ka=gradeKey(a.textContent),kb=gradeKey(b.textContent);
      if(ka!==kb)return ka-kb;
      return clean(a.textContent).localeCompare(clean(b.textContent),'ko',{numeric:true,sensitivity:'base'});
    });
    if(movable.every((o,i)=>o===before[i]))return;
    const current=sel.value;
    [...fixed,...movable].forEach(o=>sel.appendChild(o));
    sel.value=current;
  }

  function findClassForElement(el){
    const list=getKnownClasses();
    const text=clean(el?.textContent);
    const dataId=el?.dataset?.id||el?.dataset?.classId||el?.getAttribute?.('data-class-id')||'';
    if(dataId){
      const byId=list.find(c=>String(c?.id||c?.classId||'')===String(dataId));
      if(byId)return byId;
    }
    return list.find(c=>{const n=className(c);return n&&text.includes(n);})||null;
  }

  function elementCompare(a,b){
    const ca=findClassForElement(a),cb=findClassForElement(b);
    const ta=ca?classText(ca):clean(a.textContent),tb=cb?classText(cb):clean(b.textContent);
    const ka=gradeKey(ta),kb=gradeKey(tb);
    if(ka!==kb)return ka-kb;
    const na=ca?className(ca):clean(a.querySelector?.('td, .class-name, .class-admin-card-title')?.textContent||a.textContent);
    const nb=cb?className(cb):clean(b.querySelector?.('td, .class-name, .class-admin-card-title')?.textContent||b.textContent);
    return na.localeCompare(nb,'ko',{numeric:true,sensitivity:'base'});
  }

  function reorder(container,items){
    if(items.length<2)return;
    const sorted=items.slice().sort(elementCompare);
    if(sorted.every((el,i)=>el===items[i]))return;
    sorted.forEach(el=>container.appendChild(el));
  }

  function sortContainer(container){
    if(!container)return;
    reorder(container,Array.from(container.children).filter(el=>el.nodeType===1));
  }

  function sortClassTables(){
    document.querySelectorAll('table').forEach(table=>{
      const heads=Array.from(table.querySelectorAll('thead th')).map(th=>clean(th.textContent));
      if(!heads.some(h=>h.includes('반 이름')))return;
      const tbody=table.tBodies?.[0]||table.querySelector('tbody');
      if(!tbody)return;
      reorder(tbody,Array.from(tbody.rows||[]));
    });
  }

  function apply(){
    sortGlobalClasses();
    document.querySelectorAll('select').forEach(sel=>{
      const hint=((sel.id||'')+' '+(sel.name||'')+' '+(sel.closest('.form-group')?.textContent||'')).toLowerCase();
      if(/class|반 선택|수강 반|담당 반/.test(hint))sortSelect(sel);
    });
    document.querySelectorAll('.classes-grid,.teacher-class-grid,#classesGrid,#classGrid,#classMgmtGrid,#classesMgmtGrid').forEach(sortContainer);
    sortClassTables();
  }

  const oldPopulate=window._populateAcctClassDropdown;
  if(typeof oldPopulate==='function'&&!oldPopulate.__ymsGradeSort){
    const wrapped=function(){sortGlobalClasses();const r=oldPopulate.apply(this,arguments);setTimeout(apply,0);return r;};
    wrapped.__ymsGradeSort=true;window._populateAcctClassDropdown=wrapped;
  }

  let timer=0;
  function schedule(){clearTimeout(timer);timer=setTimeout(apply,80);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.addEventListener('load',()=>{apply();setTimeout(apply,300);},{once:true});
  const obs=new MutationObserver(schedule);
  if(document.documentElement)obs.observe(document.documentElement,{subtree:true,childList:true});
})();
