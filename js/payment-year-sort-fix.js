/* YMS annual tuition grid — sort by each student's tuitionDueDay */
(function(){
  'use strict';
  let dueByName=new Map();
  let applying=false;

  async function loadDueDays(){
    try{
      let list=[];
      if(typeof _allStudents!=='undefined'&&Array.isArray(_allStudents)&&_allStudents.length) list=_allStudents;
      else if(typeof _tFetch==='function'){
        const r=await _tFetch('tables/students?limit=1000');
        if(r.ok) list=(await r.json()).data||[];
      }
      dueByName=new Map(list.map(s=>[String(s.name||'').trim(),Number(s.tuitionDueDay||0)]));
    }catch(e){console.warn('[YMS] due-day sort load',e);}
  }

  function rowName(row){return String(row?.querySelector('td.name,td:first-child')?.textContent||'').trim();}
  function dueOf(row){const n=dueByName.get(rowName(row));return n>=1&&n<=31?n:99;}

  function applySort(){
    if(applying)return;
    const body=document.getElementById('ypBody');
    const sel=document.getElementById('ypSort');
    if(!body||!sel)return;
    const rows=[...body.querySelectorAll(':scope > tr')];
    if(rows.length<2)return;
    applying=true;
    rows.sort((a,b)=>{
      const an=rowName(a),bn=rowName(b);
      if(sel.value==='NAME') return an.localeCompare(bn,'ko');
      const d=dueOf(a)-dueOf(b);
      return d!==0?d:an.localeCompare(bn,'ko');
    });
    const frag=document.createDocumentFragment();
    rows.forEach(r=>frag.appendChild(r));
    body.appendChild(frag);
    applying=false;
  }

  async function install(){
    const filters=document.querySelector('.yp-filters');
    if(!filters)return false;
    let sel=document.getElementById('ypSort');
    if(!sel){
      const label=document.createElement('span');label.id='ypSortLabel';label.textContent='정렬';label.style='font-size:12px;color:#5C6880';
      sel=document.createElement('select');sel.id='ypSort';sel.innerHTML='<option value="DUE">납부일순</option><option value="NAME">이름순</option>';
      const search=document.getElementById('ypSearch');
      if(search){filters.insertBefore(label,search);filters.insertBefore(sel,search);}else{filters.append(label,sel);}
    }
    if(sel.dataset.dueSortBound!=='1'){
      sel.addEventListener('change',applySort);sel.dataset.dueSortBound='1';
    }
    await loadDueDays();
    applySort();
    const body=document.getElementById('ypBody');
    if(body&&!body.__ymsDueObserver){
      const obs=new MutationObserver(()=>{if(!applying)setTimeout(applySort,0);});
      obs.observe(body,{childList:true});body.__ymsDueObserver=obs;
    }
    return true;
  }

  const timer=setInterval(async()=>{if(await install())clearInterval(timer);},200);
  setTimeout(()=>clearInterval(timer),10000);
  window.addEventListener('load',()=>setTimeout(install,300));
})();
