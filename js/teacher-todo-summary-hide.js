/* YMS teacher home — hide duplicate todo summary card */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/teacher-home.html')) return;

  function hideDuplicateTodoSummary(){
    const value=document.getElementById('summaryTasks');
    const card=value?.closest('.teacher-summary-card');
    if(card){
      card.style.display='none';
      card.setAttribute('aria-hidden','true');
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',hideDuplicateTodoSummary,{once:true});
  }else{
    hideDuplicateTodoSummary();
  }

  // teacher-todo-calendar.js may touch the card after load; keep it hidden.
  setTimeout(hideDuplicateTodoSummary,0);
  setTimeout(hideDuplicateTodoSummary,300);
})();
