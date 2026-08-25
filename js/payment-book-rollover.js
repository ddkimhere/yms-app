/* YMS book fee billing rollover: use each student's tuition due day minus 2 days as cutoff */
(function(){
  'use strict';

  function getCycle(selectedMonth, dueDay){
    dueDay = Number(dueDay || 0);
    if(!selectedMonth || dueDay < 1 || dueDay > 31) return null;

    let [year, month] = selectedMonth.split('-').map(Number);
    let lastDay = new Date(year, month, 0).getDate();
    let actualDueDay = Math.min(dueDay, lastDay);
    const cutoff = new Date(year, month - 1, actualDueDay);
    cutoff.setDate(cutoff.getDate() - 2);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if(today > cutoff){
      month += 1;
      if(month > 12){ month = 1; year += 1; }
    }

    lastDay = new Date(year, month, 0).getDate();
    actualDueDay = Math.min(dueDay, lastDay);
    const monthStr = `${year}-${String(month).padStart(2,'0')}`;
    return {
      month: monthStr,
      dueDate: `${monthStr}-${String(actualDueDay).padStart(2,'0')}`
    };
  }

  function install(){
    const base = window._tFetch;
    if(typeof base !== 'function' || base.__ymsBookRolloverBase || window._ymsBookRolloverInstalled) return;
    window._ymsBookRolloverInstalled = true;

    const wrapped = async function(path, opt={}){
      const method = String(opt?.method || 'GET').toUpperCase();
      const isPaymentPost = String(path).replace(/^\//,'').startsWith('tables/payments') && method === 'POST';

      if(isPaymentPost && typeof opt.body === 'string'){
        try{
          const body = JSON.parse(opt.body);
          if(body?.type === 'BOOK' && body.studentId && body.month){
            let student = null;
            try{
              if(typeof _allStudents !== 'undefined' && Array.isArray(_allStudents)){
                student = _allStudents.find(s => s.id === body.studentId) || null;
              }
            }catch(_e){}

            if(!student?.tuitionDueDay){
              try{
                const r = await base(`tables/students/${encodeURIComponent(body.studentId)}`, {cache:'no-store'});
                if(r.ok) student = await r.json();
              }catch(_e){}
            }

            const cycle = getCycle(body.month, student?.tuitionDueDay);
            if(cycle){
              body.month = cycle.month;
              body.dueDate = cycle.dueDate;
              opt = {...opt, body: JSON.stringify(body)};
            }
          }
        }catch(_e){}
      }
      return base(path, opt);
    };

    wrapped.__ymsBookRolloverBase = true;
    window._tFetch = wrapped;
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  window.addEventListener('load', install);
})();
